import { Server as SocketIOServer, Socket } from 'socket.io';
import { dbStore } from '../db/store';
import { User, CodeFile, StudentStatus, PerformanceTag } from '@/types';

export function registerSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    let currentSessionId: string | null = null;
    let currentUser: User | null = null;

    // Student or Instructor joins session
    socket.on('join_session', ({ sessionId, user }: { sessionId: string; user: User }) => {
      currentSessionId = sessionId;
      currentUser = user;

      socket.join(`session:${sessionId}`);

      if (user.role === 'student') {
        const studentState = dbStore.initOrJoinStudent(sessionId, user);
        // Notify instructors in the room
        io.to(`session:${sessionId}`).emit('student_state_updated', studentState);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      } else if (user.role === 'instructor') {
        // Send initial full student states to the instructor
        socket.emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Student edits code (real-time live typing)
    socket.on('student_code_change', ({ sessionId, studentId, fileId, content }: {
      sessionId: string;
      studentId: string;
      fileId: string;
      content: string;
    }) => {
      const updated = dbStore.updateStudentCode(sessionId, studentId, fileId, content);
      if (updated) {
        // Broadcast immediately to instructors in the session
        socket.to(`session:${sessionId}`).emit('student_code_synced', {
          studentId,
          fileId,
          content,
          studentState: updated
        });
      }
    });

    // Student creates, renames or modifies files
    socket.on('student_files_update', ({ sessionId, studentId, files, activeFileId }: {
      sessionId: string;
      studentId: string;
      files: CodeFile[];
      activeFileId: string;
    }) => {
      const updated = dbStore.updateStudentFiles(sessionId, studentId, files, activeFileId);
      if (updated) {
        socket.to(`session:${sessionId}`).emit('student_state_updated', updated);
      }
    });

    // Student executes code -> broadcast terminal output to instructors
    socket.on('student_code_execution', ({ sessionId, studentId, output, status, durationMs }: {
      sessionId: string;
      studentId: string;
      output: string;
      status: 'success' | 'error';
      durationMs: number;
    }) => {
      const updated = dbStore.recordExecution(sessionId, studentId, output, status, durationMs);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Student toggles a task
    socket.on('student_task_toggle', ({ sessionId, studentId, taskId, completed }: {
      sessionId: string;
      studentId: string;
      taskId: string;
      completed: boolean;
    }) => {
      const updated = dbStore.toggleTask(sessionId, studentId, taskId, completed);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Student clicks "Need Help"
    socket.on('student_request_help', ({ sessionId, studentId, message }: {
      sessionId: string;
      studentId: string;
      message?: string;
    }) => {
      const updated = dbStore.requestHelp(sessionId, studentId, message);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
        io.to(`session:${sessionId}`).emit('new_help_request', updated.helpRequest);
      }
    });

    // Instructor resolves help
    socket.on('instructor_resolve_help', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      const updated = dbStore.resolveHelp(sessionId, studentId);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Instructor saves private note or performance tag
    socket.on('instructor_save_note', ({ sessionId, studentId, instructorId, tag, content }: {
      sessionId: string;
      studentId: string;
      instructorId: string;
      tag?: PerformanceTag;
      content?: string;
    }) => {
      const updated = dbStore.updateInstructorNote(sessionId, studentId, instructorId, tag, content);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Student submits assignment
    socket.on('student_submit_assignment', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      const updated = dbStore.submitAssignment(sessionId, studentId);
      if (updated) {
        io.to(`session:${sessionId}`).emit('student_state_updated', updated);
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Presence / Activity Heartbeat
    socket.on('student_heartbeat', ({ sessionId, studentId, status }: {
      sessionId: string;
      studentId: string;
      status: StudentStatus;
    }) => {
      const updated = dbStore.updateStudentStatus(sessionId, studentId, status);
      if (updated) {
        io.to(`session:${sessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(sessionId));
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentSessionId && currentUser && currentUser.role === 'student') {
        const updated = dbStore.updateStudentStatus(currentSessionId, currentUser.id, 'Disconnected');
        if (updated) {
          io.to(`session:${currentSessionId}`).emit('students_list_updated', dbStore.getStudentStatesForSession(currentSessionId));
        }
      }
    });
  });
}
