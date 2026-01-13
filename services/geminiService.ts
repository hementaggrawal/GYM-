
import { GoogleGenAI } from "@google/genai";
import { GymRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (records: GymRecord[]) => {
  const summary = {
    totalRecords: records.length,
    activeMembers: new Set(records.map(r => r.Member_ID)).size,
    trainers: Array.from(new Set(records.map(r => r.Trainer_Name))),
    classes: Array.from(new Set(records.map(r => r.Class_Name))),
    avgStay: (records.reduce((acc, r) => acc + (r.Stay_Duration || 0), 0) / (records.filter(r => r.Attendance_Status === 'Yes').length || 1)).toFixed(1)
  };

  return `You are Titan, the AI Intelligence of Test Gym. 
  You have access to the latest live dashboard data.
  
  Current Snapshot:
  - Records: ${summary.totalRecords}
  - Unique Members: ${summary.activeMembers}
  - Trainers: ${summary.trainers.join(', ')}
  - Classes: ${summary.classes.join(', ')}
  - Avg Workout: ${summary.avgStay} mins
  
  Instructions:
  - Answer specific queries about member performance, trainer workloads, and attendance trends.
  - Provide actionable insights (e.g., "Rahul Mehta's classes are the busiest").
  - Be professional, data-centric, and concise.`;
};

export const chatWithTitan = async (message: string, records: GymRecord[]) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: message,
      config: {
        systemInstruction: getSystemInstruction(records),
        temperature: 0.5,
      },
    });

    return response.text || "I'm sorry, I couldn't interpret the data for that request.";
  } catch (error) {
    console.error("Titan AI Error:", error);
    return "Operational error in Titan AI. Please retry.";
  }
};
