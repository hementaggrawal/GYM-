
import { GymRecord } from './types';

// The verified Sheet ID from the user
const SHEET_ID = '1nm-fh4Ny090Y1KqvF5hF64aPw3HqOZCpLf93-nW6xB4';

/**
 * Uses the Google Visualization API endpoint which is more stable for cross-origin fetches.
 * gid is the ID of the specific tab in the sheet.
 */
const getCsvUrl = (gid: number) => 
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

const normalizeHeader = (header: string): string => {
  return header
    .trim()
    .replace(/^\uFEFF/, '') 
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  result.push(currentField.trim());
  return result.map(v => v.replace(/^["']|["']$/g, ''));
};

/**
 * Fetches and parses a single tab by its GID.
 */
async function fetchSheetTab(gid: number): Promise<GymRecord[]> {
  const url = getCsvUrl(gid);
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    // If a secondary tab (gid > 0) fails, we just return empty rather than crashing
    if (gid === 0) throw new Error(`Status ${response.status}: Initial sync failed.`);
    return [];
  }

  const csvText = await response.text();
  
  // Basic check for HTML redirect (means private sheet)
  if (csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('google-signin')) {
    if (gid === 0) throw new Error("Private Access: Sheet must be set to 'Anyone with link can view'.");
    return [];
  }

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(h => normalizeHeader(h));
  
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: any = {};
    headers.forEach((header, index) => {
      let val: any = values[index] || '';
      const numericFields = ['Member_ID', 'Age', 'Class_ID', 'Trainer_ID', 'Session_Capacity', 'Stay_Duration'];
      if (numericFields.includes(header)) {
        const num = parseInt(val, 10);
        val = isNaN(num) ? 0 : num;
      }
      record[header] = val;
    });
    return record as GymRecord;
  });
}

/**
 * Fetches data from multiple potential tabs to aggregate "all sheets".
 * Common Google Sheet tab IDs are 0, 1, 2...
 */
export const fetchGymData = async (): Promise<{ records: GymRecord[], raw?: string }> => {
  try {
    console.log('[Cloud Hub] Aggregating all available sheet data...');
    
    // Attempt to fetch the first 3 potential tabs
    const results = await Promise.allSettled([
      fetchSheetTab(0),
      fetchSheetTab(1),
      fetchSheetTab(2)
    ]);

    const allRecords: GymRecord[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`[Cloud Hub] Tab ID ${idx} synced: ${result.value.length} records.`);
        allRecords.push(...result.value);
      }
    });

    if (allRecords.length === 0) {
      return { records: [], raw: "No data found across tabs 0, 1, or 2." };
    }

    return { records: allRecords };
  } catch (error: any) {
    console.error('[Cloud Hub Error]', error);
    throw error;
  }
};
