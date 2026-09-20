import { Server as SocketIOServer, Socket } from 'socket.io';
import { dbStore } from '../db/store';
import { User, LabParticipant } from '@/types';

export function registerSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    let currentSessionId: string | null = null;
    let currentUser: User | null = null;

    // Join Session Room
    socket.on('join_session', ({ sessionId, user }: { sessionId: string; user: User }) => {
      currentSessionId = sessionId;
      currentUser = user;

      socket.join(`session:${sessionId}`);

      // Broadcast updated participant list to everyone in the room
      io.to(`session:${sessionId}`).emit(
        'participants_list_updated',
        dbStore.getParticipants(sessionId)
      );
    });

    // WebRTC Signaling: Offer, Answer, ICE Candidate forwarding
    socket.on('webrtc_offer', (data: { sessionId: string; studentId: string; offer: any }) => {
      // Forward offer to instructor(s) in the session
      socket.to(`session:${data.sessionId}`).emit('webrtc_offer', data);
    });

    socket.on('webrtc_answer', (data: { sessionId: string; studentId: string; answer: any }) => {
      // Forward answer back to student
      socket.to(`session:${data.sessionId}`).emit('webrtc_answer', data);
    });

    socket.on('webrtc_ice_candidate', (data: { sessionId: string; studentId: string; candidate: any; fromRole: string }) => {
      // Forward candidate to peer
      socket.to(`session:${data.sessionId}`).emit('webrtc_ice_candidate', data);
    });

    // Screen Sharing Status change (start / pause / stop)
    socket.on('student_screen_status', ({ sessionId, studentId, isScreenSharing }: {
      sessionId: string;
      studentId: string;
      isScreenSharing: boolean;
    }) => {
      const updated = dbStore.updateScreenStatus(sessionId, studentId, isScreenSharing);
      if (updated) {
        io.to(`session:${sessionId}`).emit('participant_updated', updated);
        io.to(`session:${sessionId}`).emit(
          'participants_list_updated',
          dbStore.getParticipants(sessionId)
        );
      }
    });

    // Raise Hand
    socket.on('student_raise_hand', ({ sessionId, studentId, message }: {
      sessionId: string;
      studentId: string;
      message?: string;
    }) => {
      const updated = dbStore.raiseHand(sessionId, studentId, message);
      if (updated) {
        io.to(`session:${sessionId}`).emit('participant_updated', updated);
        io.to(`session:${sessionId}`).emit('hand_raised_alert', {
          studentId,
          studentName: updated.studentName,
          message: message || 'Student raised hand for assistance'
        });
        io.to(`session:${sessionId}`).emit(
          'participants_list_updated',
          dbStore.getParticipants(sessionId)
        );
      }
    });

    // Lower Hand / Resolve Help
    socket.on('student_lower_hand', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      const updated = dbStore.lowerHand(sessionId, studentId);
      if (updated) {
        io.to(`session:${sessionId}`).emit('participant_updated', updated);
        io.to(`session:${sessionId}`).emit(
          'participants_list_updated',
          dbStore.getParticipants(sessionId)
        );
      }
    });

    socket.on('instructor_resolve_help', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      const updated = dbStore.lowerHand(sessionId, studentId);
      if (updated) {
        io.to(`session:${sessionId}`).emit('participant_updated', updated);
        io.to(`session:${sessionId}`).emit(
          'participants_list_updated',
          dbStore.getParticipants(sessionId)
        );
      }
    });

    // Student Leaves Lab
    socket.on('student_leave_lab', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      const updated = dbStore.recordLeave(sessionId, studentId);
      if (updated) {
        io.to(`session:${sessionId}`).emit('participant_updated', updated);
        io.to(`session:${sessionId}`).emit(
          'participants_list_updated',
          dbStore.getParticipants(sessionId)
        );
      }
    });

    // Heartbeat
    socket.on('student_heartbeat', ({ sessionId, studentId }: {
      sessionId: string;
      studentId: string;
    }) => {
      dbStore.heartbeat(sessionId, studentId);
    });

    socket.on('disconnect', () => {
      if (currentSessionId && currentUser && currentUser.role === 'student') {
        const updated = dbStore.recordLeave(currentSessionId, currentUser.id);
        if (updated) {
          io.to(`session:${currentSessionId}`).emit('participant_updated', updated);
          io.to(`session:${currentSessionId}`).emit(
            'participants_list_updated',
            dbStore.getParticipants(currentSessionId)
          );
        }
      }
    });
  });
}
