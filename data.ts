
import { GymRecord } from './types';

const SHEET_ID = '1nm-fh4Ny090Y1KqvF5hF64aPw3HqOZCpLf93-nW6xB4';

// Map of canonical keys to possible spreadsheet header variations
const HEADER_MAP: Record<string, string[]> = {
  Date: ['date', 'session_date', 'day_of_session'],
  Day: ['day', 'weekday', 'day_name'],
  Day_Type: ['day_type', 'weekend_weekday'],
  Member_ID: ['member_id', 'membership_id', 'id', 'mid', 'memberid'],
  Member_Name: ['member_name', 'name', 'fullname', 'client_name'],
  Age: ['age', 'years'],
  Gender: ['gender', 'sex'],
  Membership_Type: ['membership_type', 'type', 'plan', 'membership'],
  Class_ID: ['class_id', 'cid'],
  Class_Name: ['class_name', 'class', 'session_name', 'workout'],
  Trainer_ID: ['trainer_id', 'tid'],
  Trainer_Name: ['trainer_name', 'trainer', 'coach', 'instructor'],
  Scheduled_Start_Time: ['scheduled_start_time', 'start_time', 'time_in'],
  Scheduled_End_Time: ['scheduled_end_time', 'end_time', 'time_out'],
  Session_Capacity: ['session_capacity', 'capacity', 'max_slots'],
  Attendance_Status: ['attendance_status', 'attendance', 'status', 'present'],
  Late_Flag: ['late_flag', 'late'],
  Early_Exit_Flag: ['early_exit_flag', 'early_exit'],
  Exit_Reason: ['exit_reason', 'reason'],
  Stay_Duration: ['stay_duration', 'duration', 'minutes_stayed', 'stay_time']
};

const getCsvUrl = (gid: number) => 
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;

const canonicalizeHeader = (raw: string): string => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  for (const [canonical, aliases] of Object.entries(HEADER_MAP)) {
    if (normalized === canonical.toLowerCase() || aliases.includes(normalized)) {
      return canonical;
    }
  }
  return normalized;
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
  return result.map(v => v.replace(/^["']|["']$/g, '').trim());
};

async function fetchSheetTab(gid: number): Promise<GymRecord[]> {
  const url = getCsvUrl(gid);
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) return [];

  const csvText = await response.text();
  if (csvText.trim().startsWith('<!DOCTYPE')) return [];

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  
  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(h => canonicalizeHeader(h));
  
  const numericFields = ['Member_ID', 'Age', 'Class_ID', 'Trainer_ID', 'Session_Capacity', 'Stay_Duration'];

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: any = {};
    headers.forEach((header, index) => {
      let val: any = values[index] || '';
      if (numericFields.includes(header)) {
        const cleaned = val.toString().replace(/[^0-9]/g, '');
        const num = parseInt(cleaned, 10);
        val = isNaN(num) ? 0 : num;
      }
      record[header] = val;
    });
    return record as GymRecord;
  });
}

export const fetchGymData = async (): Promise<{ records: GymRecord[], raw?: string }> => {
  try {
    const gids = [0, 1, 2, 3, 4, 5, 10]; 
    const results = await Promise.allSettled(gids.map(gid => fetchSheetTab(gid)));

    const allRecords: GymRecord[] = [];
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allRecords.push(...result.value);
      }
    });

    return { records: allRecords };
  } catch (error: any) {
    console.error('[Gym Cloud Data Fetch Error]', error);
    throw error;
  }
};
