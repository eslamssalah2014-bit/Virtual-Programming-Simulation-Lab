import {
  User,
  Course,
  Assignment,
  LabSession,
  LiveStudentState,
  ActivityLog,
  HelpRequest,
  InstructorNote,
  CodeFile,
  StudentStatus,
  PerformanceTag
} from '@/types';
import {
  SEED_USERS,
  SEED_COURSES,
  SEED_ASSIGNMENTS,
  SEED_SESSIONS,
  INITIAL_STUDENTS_STATE,
  INITIAL_ACTIVITY_LOGS
} from './seed';

class LabDataStore {
  private users: User[] = [...SEED_USERS];
  private courses: Course[] = [...SEED_COURSES];
  private assignments: Assignment[] = [...SEED_ASSIGNMENTS];
  private sessions: LabSession[] = [...SEED_SESSIONS];
  private studentStates: Record<string, Record<string, LiveStudentState>> = {
    'session-101': { ...INITIAL_STUDENTS_STATE }
  };
  private activityLogs: ActivityLog[] = [...INITIAL_ACTIVITY_LOGS];

  // --- Users ---
  getUsers(): User[] {
    return this.users;
  }

  getUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.users.push(user);
    return user;
  }

  // --- Courses ---
  getCourses(): Course[] {
    return this.courses;
  }

  createCourse(course: Course): Course {
    this.courses.push(course);
    return course;
  }

  // --- Assignments ---
  getAssignments(): Assignment[] {
    return this.assignments;
  }

  getAssignment(id: string): Assignment | undefined {
    return this.assignments.find(a => a.id === id);
  }

  createAssignment(assignment: Assignment): Assignment {
    this.assignments.push(assignment);
    return assignment;
  }

  // --- Sessions ---
  getSessions(): LabSession[] {
    return this.sessions;
  }

  getSession(id: string): LabSession | undefined {
    return this.sessions.find(s => s.id === id);
  }

  createSession(session: LabSession): LabSession {
    this.sessions.unshift(session);
    if (!this.studentStates[session.id]) {
      this.studentStates[session.id] = {};
    }
    return session;
  }

  // --- Live Student States ---
  getStudentStatesForSession(sessionId: string): LiveStudentState[] {
    if (!this.studentStates[sessionId]) {
      this.studentStates[sessionId] = {};
    }
    return Object.values(this.studentStates[sessionId]);
  }

  getStudentState(sessionId: string, studentId: string): LiveStudentState | undefined {
    return this.studentStates[sessionId]?.[studentId];
  }

  initOrJoinStudent(sessionId: string, student: User): LiveStudentState {
    if (!this.studentStates[sessionId]) {
      this.studentStates[sessionId] = {};
    }

    const session = this.getSession(sessionId);
    const assignment = session ? this.getAssignment(session.assignmentId) : undefined;
    const starterFiles = assignment ? JSON.parse(JSON.stringify(assignment.starterFiles)) : [
      { id: 'f-1', name: 'main.py', language: 'python', content: '# Welcome to Lab\nprint("Hello World!")\n' }
    ];

    if (!this.studentStates[sessionId][student.id]) {
      const newState: LiveStudentState = {
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        avatarUrl: student.avatarUrl,
        status: 'Active',
        currentFileId: starterFiles[0]?.id || 'f-1',
        files: starterFiles,
        terminalOutput: 'Lab session initialized. Ready to execute code.\n',
        lastActivity: 'Joined lab workspace',
        lastActivityTime: new Date().toISOString(),
        progressPercentage: 0,
        completedTaskIds: [],
        helpRequest: null,
        instructorNote: null,
        joinTime: new Date().toISOString(),
        timeInLabSeconds: 0
      };
      this.studentStates[sessionId][student.id] = newState;

      this.logActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sessionId,
        studentId: student.id,
        eventType: 'JOINED_LAB',
        description: `Joined lab session ${session?.sessionCode || ''}`,
        createdAt: new Date().toISOString()
      });
    } else {
      // Re-activate if was disconnected
      if (this.studentStates[sessionId][student.id].status === 'Disconnected') {
        this.studentStates[sessionId][student.id].status = 'Active';
        this.studentStates[sessionId][student.id].lastActivity = 'Re-joined lab session';
        this.studentStates[sessionId][student.id].lastActivityTime = new Date().toISOString();
      }
    }

    return this.studentStates[sessionId][student.id];
  }

  updateStudentCode(sessionId: string, studentId: string, fileId: string, content: string): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    const file = state.files.find(f => f.id === fileId);
    if (file) {
      file.content = content;
      state.status = 'Active';
      state.lastActivity = `Edited ${file.name}`;
      state.lastActivityTime = new Date().toISOString();
      // recalculate progress slightly
      state.progressPercentage = Math.min(90, Math.max(state.progressPercentage, 35));
    }
    return state;
  }

  updateStudentFiles(sessionId: string, studentId: string, files: CodeFile[], activeFileId: string): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    state.files = files;
    state.currentFileId = activeFileId;
    state.status = 'Active';
    state.lastActivity = 'Modified files in workspace';
    state.lastActivityTime = new Date().toISOString();
    return state;
  }

  recordExecution(
    sessionId: string,
    studentId: string,
    output: string,
    status: 'success' | 'error',
    durationMs: number
  ): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    state.terminalOutput = output;
    state.lastExecution = {
      timestamp: new Date().toISOString(),
      status,
      durationMs
    };
    state.status = 'Active';
    state.lastActivity = `Executed code (${status.toUpperCase()})`;
    state.lastActivityTime = new Date().toISOString();

    if (status === 'success') {
      state.progressPercentage = Math.min(95, Math.max(state.progressPercentage, 70));
    }

    this.logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sessionId,
      studentId,
      eventType: 'EXECUTED_CODE',
      description: `Executed code (${status === 'success' ? 'Success' : 'Error'}) in ${durationMs}ms`,
      createdAt: new Date().toISOString()
    });

    return state;
  }

  toggleTask(sessionId: string, studentId: string, taskId: string, completed: boolean): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    if (completed) {
      if (!state.completedTaskIds.includes(taskId)) {
        state.completedTaskIds.push(taskId);
      }
    } else {
      state.completedTaskIds = state.completedTaskIds.filter(id => id !== taskId);
    }

    const session = this.getSession(sessionId);
    const assignment = session ? this.getAssignment(session.assignmentId) : undefined;
    const totalTasks = assignment?.tasks.length || 1;
    state.progressPercentage = Math.round((state.completedTaskIds.length / totalTasks) * 100);

    return state;
  }

  requestHelp(sessionId: string, studentId: string, message?: string): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    const req: HelpRequest = {
      id: `help-${Date.now()}`,
      sessionId,
      studentId,
      studentName: state.studentName,
      status: 'pending',
      message: message || 'Student requested instructor assistance.',
      requestedAt: new Date().toISOString()
    };
    state.helpRequest = req;
    state.status = 'Active';
    state.lastActivity = 'Requested help';
    state.lastActivityTime = new Date().toISOString();

    this.logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sessionId,
      studentId,
      eventType: 'REQUESTED_HELP',
      description: `Requested Help: "${message || 'Assistance needed'}"`,
      createdAt: new Date().toISOString()
    });

    return state;
  }

  resolveHelp(sessionId: string, studentId: string): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state || !state.helpRequest) return undefined;

    state.helpRequest.status = 'resolved';
    state.helpRequest.resolvedAt = new Date().toISOString();
    state.helpRequest = null;
    state.lastActivity = 'Help request resolved by instructor';
    state.lastActivityTime = new Date().toISOString();

    return state;
  }

  updateInstructorNote(
    sessionId: string,
    studentId: string,
    instructorId: string,
    tag?: PerformanceTag,
    content?: string
  ): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    state.instructorNote = {
      id: `note-${sessionId}-${studentId}`,
      sessionId,
      studentId,
      instructorId,
      tag: tag || state.instructorNote?.tag || 'NORMAL',
      content: content !== undefined ? content : (state.instructorNote?.content || ''),
      updatedAt: new Date().toISOString()
    };

    return state;
  }

  submitAssignment(sessionId: string, studentId: string): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    state.status = 'Submitted';
    state.progressPercentage = 100;
    state.lastActivity = 'Submitted final assignment';
    state.lastActivityTime = new Date().toISOString();

    this.logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sessionId,
      studentId,
      eventType: 'SUBMITTED_ASSIGNMENT',
      description: 'Submitted completed assignment',
      createdAt: new Date().toISOString()
    });

    return state;
  }

  updateStudentStatus(sessionId: string, studentId: string, status: StudentStatus): LiveStudentState | undefined {
    const state = this.studentStates[sessionId]?.[studentId];
    if (!state) return undefined;

    state.status = status;
    if (status === 'Idle') {
      state.lastActivity = 'Inactivity detected (Idle)';
    } else if (status === 'Disconnected') {
      state.lastActivity = 'Disconnected from lab';
    }
    state.lastActivityTime = new Date().toISOString();
    return state;
  }

  // --- Activity Logs ---
  logActivity(log: ActivityLog): void {
    this.activityLogs.unshift(log);
  }

  getActivityLogs(sessionId: string, studentId?: string): ActivityLog[] {
    return this.activityLogs.filter(log => {
      if (log.sessionId !== sessionId) return false;
      if (studentId && log.studentId !== studentId) return false;
      return true;
    });
  }

  // Export attendance data
  getAttendanceReport(sessionId: string) {
    const session = this.getSession(sessionId);
    const students = this.getStudentStatesForSession(sessionId);

    return students.map(s => ({
      sessionId,
      sessionName: session?.name || '',
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      joinTime: s.joinTime,
      status: s.status,
      durationMinutes: Math.round(s.timeInLabSeconds / 60),
      progressPercentage: s.progressPercentage,
      tasksCompleted: s.completedTaskIds.length,
      helpRequested: s.helpRequest ? 'Yes' : 'No',
      instructorTag: s.instructorNote?.tag || 'NORMAL',
      instructorNotes: s.instructorNote?.content || ''
    }));
  }
}

// Global Singleton Store
export const dbStore = new LabDataStore();
