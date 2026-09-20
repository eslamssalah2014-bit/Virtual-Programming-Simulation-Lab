export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface LabSession {
  id: string;
  sessionCode: string;
  groupCode: string;
  groupName: string;
  sessionNumber: string | number;
  sessionTitle: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  status?: 'active' | 'closed' | string;
  instructorName?: string;
  createdAt: string;
  joinedCount?: number;
}

export type StudentLabStatus = 'Active' | 'Idle' | 'Left';

export interface HelpRequest {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  message: string;
  status: 'pending' | 'resolved';
  requestedAt: string;
  resolvedAt?: string;
}

export interface LabParticipant {
  studentId: string;
  studentName: string;
  studentRegistrationId: string;
  studentEmail?: string;
  avatarUrl?: string;
  status: StudentLabStatus;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  handRaisedAt?: string;
  helpRequest?: HelpRequest | null;
  joinTime: string;
  leaveTime?: string;
  timeInLabSeconds: number;
  screenShareDurationSeconds: number;
  lastActivity: string;
  lastActivityTime: string;
  mockScreenType?: 'ide' | 'browser' | 'terminal' | 'desktop' | 'document';
}

export interface AttendanceReportItem {
  sessionId: string;
  sessionName: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  joinTime: string;
  leaveTime: string;
  durationMinutes: number;
  screenSharingStatus: 'Active' | 'Inactive' | 'Stopped';
  screenSharingDurationMinutes: number;
  handsRaisedCount: number;
  helpRequested: string;
  notes?: string;
}

export interface WebRTCSignalPayload {
  sessionId: string;
  fromStudentId: string;
  toInstructorId?: string;
  type: 'offer' | 'answer' | 'candidate';
  payload: any;
}
