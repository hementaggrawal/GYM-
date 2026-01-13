
export interface GymRecord {
  Date: string;
  Day: string;
  Day_Type: string;
  Member_ID: number;
  Member_Name: string;
  Age: number;
  Gender: string;
  Membership_Type: string;
  Class_ID: number;
  Class_Name: string;
  Trainer_ID: number;
  Trainer_Name: string;
  Scheduled_Start_Time: string;
  Scheduled_End_Time: string;
  Session_Capacity: number;
  Attendance_Status: string;
  Late_Flag: string;
  Early_Exit_Flag: string;
  Exit_Reason: string;
  Stay_Duration: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  gymBranch: string;
  role: string;
}

export type DashboardModule = 'overview' | 'analytics' | 'members' | 'trainers' | 'attendance' | 'bookings' | 'ai-assistant';
