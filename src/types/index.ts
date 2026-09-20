export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  instructorId: string;
  createdAt: string;
}

export interface AssignmentTask {
  id: string;
  description: string;
  required: boolean;
  completed?: boolean;
}

export interface CodeFile {
  id: string;
  name: string;
  content: string;
  language: 'python' | 'javascript' | 'html' | 'css' | 'json';
}

export type SupportedLanguage = 'python' | 'javascript' | 'html';

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructionsMarkdown: string;
  language: SupportedLanguage;
  starterFiles: CodeFile[];
  tasks: AssignmentTask[];
  maxScore: number;
  createdAt: string;
}

export interface LabSession {
  id: string;
  assignmentId?: string;
  courseId?: string;
  name: string;
  sessionCode: string;
  groupCode: string;
  groupName: string;
  sessionNumber: string | number;
  sessionTitle: string;
  language: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  createdAt: string;
  joinedCount?: number;
}


export type StudentStatus = 'Active' | 'Idle' | 'Disconnected' | 'Submitted';

export type ActivityEventType =
  | 'JOINED_LAB'
  | 'OPENED_ASSIGNMENT'
  | 'STARTED_TYPING'
  | 'CREATED_FILE'
  | 'EDITED_FILE'
  | 'EXECUTED_CODE'
  | 'SUBMITTED_ASSIGNMENT'
  | 'REQUESTED_HELP'
  | 'LEFT_LAB';

export interface ActivityLog {
  id: string;
  sessionId: string;
  studentId: string;
  eventType: ActivityEventType;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export type HelpRequestStatus = 'pending' | 'in_review' | 'resolved' | 'cancelled';

export interface HelpRequest {
  id: string;
  sessionId: string;
  studentId: string;
  studentName?: string;
  status: HelpRequestStatus;
  message?: string;
  requestedAt: string;
  resolvedAt?: string;
}

export type PerformanceTag = 'EXCELLENT' | 'NEEDS_SUPPORT' | 'DID_NOT_PARTICIPATE' | 'NORMAL';

export interface InstructorNote {
  id: string;
  sessionId: string;
  studentId: string;
  instructorId: string;
  tag?: PerformanceTag;
  content: string;
  updatedAt: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  error?: string;
}

export interface LiveStudentState {
  studentId: string;
  studentName: string;
  studentRegistrationId?: string;
  studentEmail?: string;
  avatarUrl?: string;
  status: StudentStatus;
  currentFileId: string;
  currentFileName?: string;
  files: CodeFile[];
  terminalOutput: string;
  runCount?: number;
  lastExecution?: {
    timestamp: string;
    status: 'success' | 'error';
    durationMs: number;
  };
  lastActivity: string;
  lastActivityTime: string;
  progressPercentage: number;
  completedTaskIds: string[];
  helpRequest?: HelpRequest | null;
  instructorNote?: InstructorNote | null;
  joinTime: string;
  timeInLabSeconds: number;
}
