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

  createSession(sessionData: Partial<LabSession>): LabSession {
    const id = sessionData.id || `session-${Date.now()}`;
    const groupCode = sessionData.groupCode || 'GRP-1';
    const sessionNumber = sessionData.sessionNumber || '1';
    const sessionTitle = sessionData.sessionTitle || 'Interactive Programming Lab';
    const language = sessionData.language || 'python';
    const sessionCode = sessionData.sessionCode || `${groupCode.replace(/[^a-zA-Z0-9]/g, '')}-S${sessionNumber}`;

    const newSession: LabSession = {
      id,
      assignmentId: sessionData.assignmentId || 'assign-1',
      courseId: sessionData.courseId || 'course-1',
      name: `${groupCode} Session #${sessionNumber}: ${sessionTitle}`,
      sessionCode,
      groupCode,
      groupName: sessionData.groupName || 'General Group',
      sessionNumber,
      sessionTitle,
      language,
      startTime: sessionData.startTime || new Date().toISOString(),
      endTime: sessionData.endTime,
      isActive: sessionData.isActive !== undefined ? sessionData.isActive : true,
      createdAt: new Date().toISOString(),
      joinedCount: 0
    };

    this.sessions.unshift(newSession);
    if (!this.studentStates[id]) {
      this.studentStates[id] = {};
    }
    return newSession;
  }

  // Register or retrieve student by Name & Student ID
  registerStudent(
    sessionId: string,
    studentName: string,
    studentRegistrationId: string
  ): LiveStudentState {
    if (!this.studentStates[sessionId]) {
      this.studentStates[sessionId] = {};
    }

    const existing = Object.values(this.studentStates[sessionId]).find(
      s => s.studentRegistrationId === studentRegistrationId
    );
    if (existing) {
      existing.status = 'Active';
      existing.lastActivity = 'Rejoined lab session';
      existing.lastActivityTime = new Date().toISOString();
      return existing;
    }

    const session = this.getSession(sessionId);
    const lang = (session?.language || 'python').toLowerCase();

    let defaultFiles: CodeFile[] = [];
    if (lang === 'python') {
      defaultFiles = [
        {
          id: 'file-main',
          name: 'main.py',
          language: 'python',
          content: `# ${session?.sessionTitle || 'Lab Session'}\n# Student: ${studentName} (${studentRegistrationId})\n\ndef main():\n    print("Welcome to ${session?.groupName || 'Lab'}!")\n\nif __name__ == "__main__":\n    main()\n`
        }
      ];
    } else if (lang === 'javascript') {
      defaultFiles = [
        {
          id: 'file-main',
          name: 'index.js',
          language: 'javascript',
          content: `// ${session?.sessionTitle || 'Lab Session'}\n// Student: ${studentName} (${studentRegistrationId})\n\nfunction startLab() {\n  console.log("Welcome to ${session?.groupName || 'Lab'}!");\n}\n\nstartLab();\n`
        }
      ];
    } else if (lang === 'cpp') {
      defaultFiles = [
        {
          id: 'file-main',
          name: 'main.cpp',
          language: 'python' as any,
          content: `// ${session?.sessionTitle || 'Lab Session'}\n// Student: ${studentName} (${studentRegistrationId})\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Welcome to ${session?.groupName || 'Lab'}!" << endl;\n    return 0;\n}\n`
        }
      ];
    } else if (lang === 'java') {
      defaultFiles = [
        {
          id: 'file-main',
          name: 'Main.java',
          language: 'python' as any,
          content: `// ${session?.sessionTitle || 'Lab Session'}\n// Student: ${studentName} (${studentRegistrationId})\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to ${session?.groupName || 'Lab'}!");\n    }\n}\n`
        }
      ];
    } else {
      defaultFiles = [
        {
          id: 'file-main',
          name: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>${session?.sessionTitle || 'Lab'}</title>\n</head>\n<body>\n  <h1>${studentName}</h1>\n  <p>Student ID: ${studentRegistrationId}</p>\n</body>\n</html>`
        }
      ];
    }

    const studentId = `stud-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`;
    const newState: LiveStudentState = {
      studentId,
      studentName,
      studentRegistrationId,
      studentEmail: `${studentRegistrationId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`,
      status: 'Active',
      currentFileId: defaultFiles[0].id,
      currentFileName: defaultFiles[0].name,
      files: defaultFiles,
      terminalOutput: `Lab session initialized for ${studentName} (${studentRegistrationId}). Ready to write and run code.\n`,
      runCount: 0,
      lastActivity: 'Joined lab session',
      lastActivityTime: new Date().toISOString(),
      progressPercentage: 0,
      completedTaskIds: [],
      helpRequest: null,
      instructorNote: null,
      joinTime: new Date().toISOString(),
      timeInLabSeconds: 0
    };

    this.studentStates[sessionId][studentId] = newState;

    if (session) {
      session.joinedCount = Object.keys(this.studentStates[sessionId]).length;
    }

    this.logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sessionId,
      studentId,
      eventType: 'JOINED_LAB',
      description: `${studentName} (${studentRegistrationId}) joined session`,
      createdAt: new Date().toISOString()
    });

    return newState;
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
    const assignment = session?.assignmentId ? this.getAssignment(session.assignmentId) : undefined;
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
    state.runCount = (state.runCount || 0) + 1;
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
    const assignment = session?.assignmentId ? this.getAssignment(session.assignmentId) : undefined;
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
