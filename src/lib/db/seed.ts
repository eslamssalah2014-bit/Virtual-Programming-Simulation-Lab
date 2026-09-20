import { User, LabSession, LabParticipant } from '@/types';

export const SEED_USERS: User[] = [
  {
    id: 'inst-1',
    email: 'sarah.jenkins@university.edu',
    fullName: 'Dr. Sarah Jenkins',
    role: 'instructor',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-1',
    email: 'alex.chen@university.edu',
    fullName: 'Alex Chen',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-2',
    email: 'maya.patel@university.edu',
    fullName: 'Maya Patel',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-3',
    email: 'liam.davis@university.edu',
    fullName: 'Liam Davis',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-4',
    email: 'sofia.rodriguez@university.edu',
    fullName: 'Sofia Rodriguez',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'stud-5',
    email: 'marcus.taylor@university.edu',
    fullName: 'Marcus Taylor',
    role: 'student',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face'
  },
  {
    id: 'admin-1',
    email: 'admin@vlab.edu',
    fullName: 'Lab Administrator',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face'
  }
];

export const SEED_SESSIONS: LabSession[] = [
  {
    id: 'session-101',
    sessionCode: 'LAB-101',
    groupCode: 'CS101-G1',
    groupName: 'Computer Lab Room 302 (Morning)',
    sessionNumber: 4,
    sessionTitle: 'Computer Systems & Lab Exercise 4',
    startTime: new Date(Date.now() - 45 * 60000).toISOString(),
    endTime: new Date(Date.now() + 75 * 60000).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    joinedCount: 5
  },
  {
    id: 'session-102',
    sessionCode: 'LAB-204',
    groupCode: 'CS204-G3',
    groupName: 'Computer Lab Room 204 (Afternoon)',
    sessionNumber: 2,
    sessionTitle: 'Network Architecture Hands-on',
    startTime: new Date(Date.now() - 120 * 60000).toISOString(),
    endTime: new Date(Date.now() - 10 * 60000).toISOString(),
    isActive: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    joinedCount: 18
  }
];

export const INITIAL_PARTICIPANTS: Record<string, LabParticipant> = {
  'stud-1': {
    studentId: 'stud-1',
    studentName: 'Alex Chen',
    studentRegistrationId: '2024-0101',
    studentEmail: 'alex.chen@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    status: 'Active',
    isScreenSharing: true,
    isHandRaised: false,
    joinTime: new Date(Date.now() - 42 * 60000).toISOString(),
    timeInLabSeconds: 2520,
    screenShareDurationSeconds: 2480,
    lastActivity: 'Active on desktop',
    lastActivityTime: new Date(Date.now() - 2 * 60000).toISOString(),
    mockScreenType: 'ide'
  },
  'stud-2': {
    studentId: 'stud-2',
    studentName: 'Maya Patel',
    studentRegistrationId: '2024-0102',
    studentEmail: 'maya.patel@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=face',
    status: 'Active',
    isScreenSharing: true,
    isHandRaised: true,
    handRaisedAt: new Date(Date.now() - 3 * 60000).toISOString(),
    helpRequest: {
      id: 'help-2',
      sessionId: 'session-101',
      studentId: 'stud-2',
      studentName: 'Maya Patel',
      message: 'Can you check my screen? Getting an unhandled memory exception in the terminal.',
      status: 'pending',
      requestedAt: new Date(Date.now() - 3 * 60000).toISOString()
    },
    joinTime: new Date(Date.now() - 38 * 60000).toISOString(),
    timeInLabSeconds: 2280,
    screenShareDurationSeconds: 2200,
    lastActivity: 'Raised Hand • Need Help',
    lastActivityTime: new Date(Date.now() - 3 * 60000).toISOString(),
    mockScreenType: 'terminal'
  },
  'stud-3': {
    studentId: 'stud-3',
    studentName: 'Liam Davis',
    studentRegistrationId: '2024-0103',
    studentEmail: 'liam.davis@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop&crop=face',
    status: 'Idle',
    isScreenSharing: true,
    isHandRaised: false,
    joinTime: new Date(Date.now() - 35 * 60000).toISOString(),
    timeInLabSeconds: 2100,
    screenShareDurationSeconds: 2050,
    lastActivity: 'Idle on desktop (10m)',
    lastActivityTime: new Date(Date.now() - 10 * 60000).toISOString(),
    mockScreenType: 'browser'
  },
  'stud-4': {
    studentId: 'stud-4',
    studentName: 'Sofia Rodriguez',
    studentRegistrationId: '2024-0104',
    studentEmail: 'sofia.rodriguez@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face',
    status: 'Active',
    isScreenSharing: true,
    isHandRaised: false,
    joinTime: new Date(Date.now() - 40 * 60000).toISOString(),
    timeInLabSeconds: 2400,
    screenShareDurationSeconds: 2360,
    lastActivity: 'Active in database workbench',
    lastActivityTime: new Date(Date.now() - 1 * 60000).toISOString(),
    mockScreenType: 'document'
  },
  'stud-5': {
    studentId: 'stud-5',
    studentName: 'Marcus Taylor',
    studentRegistrationId: '2024-0105',
    studentEmail: 'marcus.taylor@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    status: 'Left',
    isScreenSharing: false,
    isHandRaised: false,
    joinTime: new Date(Date.now() - 44 * 60000).toISOString(),
    leaveTime: new Date(Date.now() - 12 * 60000).toISOString(),
    timeInLabSeconds: 1920,
    screenShareDurationSeconds: 1800,
    lastActivity: 'Left lab session',
    lastActivityTime: new Date(Date.now() - 12 * 60000).toISOString(),
    mockScreenType: 'desktop'
  }
};
