import {
  User,
  LabSession,
  LabParticipant,
  HelpRequest,
  AttendanceReportItem
} from '@/types';
import {
  SEED_USERS,
  SEED_SESSIONS,
  INITIAL_PARTICIPANTS
} from './seed';

class ClassroomMonitoringStore {
  private users: User[] = [...SEED_USERS];
  private sessions: LabSession[] = [...SEED_SESSIONS];
  private participants: Record<string, Record<string, LabParticipant>> = {
    'session-101': { ...INITIAL_PARTICIPANTS }
  };

  // --- Users ---
  getUsers(): User[] {
    return this.users;
  }

  getUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  // --- Sessions ---
  getSessions(): LabSession[] {
    return this.sessions.map(s => ({
      ...s,
      joinedCount: this.participants[s.id]
        ? Object.keys(this.participants[s.id]).length
        : s.joinedCount || 0
    }));
  }

  getSession(id: string): LabSession | undefined {
    const s = this.sessions.find(session => session.id === id || session.sessionCode === id);
    if (!s) return undefined;
    return {
      ...s,
      joinedCount: this.participants[s.id]
        ? Object.keys(this.participants[s.id]).length
        : s.joinedCount || 0
    };
  }

  createSession(data: Partial<LabSession>): LabSession {
    const id = data.id || `session-${Date.now()}`;
    const groupCode = data.groupCode || 'LAB-1';
    const sessionNumber = data.sessionNumber || '1';
    const sessionTitle = data.sessionTitle || 'Computer Lab Session';
    const sessionCode =
      data.sessionCode || `${groupCode.replace(/[^a-zA-Z0-9]/g, '')}-S${sessionNumber}`;

    const newSession: LabSession = {
      id,
      sessionCode,
      groupCode,
      groupName: data.groupName || 'General Student Lab',
      sessionNumber,
      sessionTitle,
      startTime: data.startTime || new Date().toISOString(),
      endTime: data.endTime,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date().toISOString(),
      joinedCount: 0
    };

    this.sessions.unshift(newSession);
    if (!this.participants[id]) {
      this.participants[id] = {};
    }
    return newSession;
  }

  // --- Participants ---
  getParticipants(sessionId: string): LabParticipant[] {
    if (!this.participants[sessionId]) {
      this.participants[sessionId] = {};
    }
    return Object.values(this.participants[sessionId]);
  }

  getParticipant(sessionId: string, studentId: string): LabParticipant | undefined {
    return this.participants[sessionId]?.[studentId];
  }

  registerStudent(
    sessionId: string,
    studentName: string,
    studentRegistrationId: string
  ): LabParticipant {
    if (!this.participants[sessionId]) {
      this.participants[sessionId] = {};
    }

    const existing = Object.values(this.participants[sessionId]).find(
      p => p.studentRegistrationId === studentRegistrationId
    );
    if (existing) {
      existing.status = 'Active';
      existing.leaveTime = undefined;
      existing.lastActivity = 'Rejoined classroom session';
      existing.lastActivityTime = new Date().toISOString();
      return existing;
    }

    const studentId = `stud-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`;
    const newParticipant: LabParticipant = {
      studentId,
      studentName,
      studentRegistrationId,
      studentEmail: `${studentRegistrationId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`,
      status: 'Active',
      isScreenSharing: false,
      isHandRaised: false,
      joinTime: new Date().toISOString(),
      timeInLabSeconds: 0,
      screenShareDurationSeconds: 0,
      lastActivity: 'Joined computer lab',
      lastActivityTime: new Date().toISOString(),
      mockScreenType: 'desktop'
    };

    this.participants[sessionId][studentId] = newParticipant;

    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.joinedCount = Object.keys(this.participants[sessionId]).length;
    }

    return newParticipant;
  }

  updateScreenStatus(sessionId: string, studentId: string, isScreenSharing: boolean): LabParticipant | undefined {
    const p = this.participants[sessionId]?.[studentId];
    if (!p) return undefined;

    p.isScreenSharing = isScreenSharing;
    p.status = 'Active';
    p.lastActivity = isScreenSharing ? 'Sharing screen' : 'Stopped screen share';
    p.lastActivityTime = new Date().toISOString();
    return p;
  }

  raiseHand(sessionId: string, studentId: string, message?: string): LabParticipant | undefined {
    const p = this.participants[sessionId]?.[studentId];
    if (!p) return undefined;

    p.isHandRaised = true;
    p.handRaisedAt = new Date().toISOString();
    p.status = 'Active';
    p.lastActivity = 'Raised Hand';
    p.lastActivityTime = new Date().toISOString();

    if (message) {
      p.helpRequest = {
        id: `help-${Date.now()}`,
        sessionId,
        studentId,
        studentName: p.studentName,
        message,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
    }
    return p;
  }

  lowerHand(sessionId: string, studentId: string): LabParticipant | undefined {
    const p = this.participants[sessionId]?.[studentId];
    if (!p) return undefined;

    p.isHandRaised = false;
    p.handRaisedAt = undefined;
    if (p.helpRequest) {
      p.helpRequest.status = 'resolved';
      p.helpRequest.resolvedAt = new Date().toISOString();
    }
    p.lastActivity = 'Hand acknowledged / lowered';
    p.lastActivityTime = new Date().toISOString();
    return p;
  }

  recordLeave(sessionId: string, studentId: string): LabParticipant | undefined {
    const p = this.participants[sessionId]?.[studentId];
    if (!p) return undefined;

    p.status = 'Left';
    p.isScreenSharing = false;
    p.isHandRaised = false;
    p.leaveTime = new Date().toISOString();
    p.lastActivity = 'Left lab session';
    p.lastActivityTime = new Date().toISOString();
    return p;
  }

  heartbeat(sessionId: string, studentId: string): void {
    const p = this.participants[sessionId]?.[studentId];
    if (p && p.status !== 'Left') {
      p.timeInLabSeconds += 15;
      if (p.isScreenSharing) {
        p.screenShareDurationSeconds += 15;
      }
    }
  }

  // --- Attendance & Reporting ---
  getAttendanceReport(sessionId: string): AttendanceReportItem[] {
    const session = this.getSession(sessionId);
    const participants = this.getParticipants(sessionId);

    return participants.map(p => {
      const durationMins = Math.round(p.timeInLabSeconds / 60);
      const screenMins = Math.round(p.screenShareDurationSeconds / 60);

      return {
        sessionId,
        sessionName: session?.sessionTitle || session?.groupCode || 'Lab Session',
        studentName: p.studentName,
        studentId: p.studentRegistrationId,
        studentEmail: p.studentEmail || '',
        joinTime: new Date(p.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        leaveTime: p.leaveTime
          ? new Date(p.leaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Still in session',
        durationMinutes: durationMins,
        screenSharingStatus: p.isScreenSharing ? 'Active' : p.screenShareDurationSeconds > 0 ? 'Stopped' : 'Inactive',
        screenSharingDurationMinutes: screenMins,
        handsRaisedCount: p.isHandRaised ? 1 : 0,
        helpRequested: p.helpRequest?.message ? `"${p.helpRequest.message.replace(/"/g, '""')}"` : 'None',
        notes: p.status === 'Left' ? 'Left early' : 'Present'
      };
    });
  }
}

export const dbStore = new ClassroomMonitoringStore();
