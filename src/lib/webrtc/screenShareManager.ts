import { RTC_CONFIGURATION } from './signalingClient';
import { SupabaseRealtimeSignalingService, SignalingLog } from './supabaseSignalingService';

export interface DiagnosticsState {
  sessionId: string;
  roomId: string;
  studentConnected: boolean;
  instructorConnected: boolean;
  offerSent: boolean;
  offerReceived: boolean;
  answerSent: boolean;
  answerReceived: boolean;
  iceCandidatesSent: number;
  iceCandidatesReceived: number;
  connectionState: RTCPeerConnectionState | 'new';
  iceState: RTCIceConnectionState | 'new';
  remoteStreamAttached: boolean;
  failedStage: string | null;
  errorMessage: string | null;
  activeTrackLabel?: string;
}

export type DiagnosticsUpdateCallback = (state: DiagnosticsState) => void;

/**
 * ScreenShareManager
 * Completely rebuilt, robust WebRTC screen-sharing manager.
 * Single source of truth derived directly from actual WebRTC MediaStreamTrack states.
 */
export class ScreenShareManager {
  public role: 'student' | 'instructor';
  public sessionId: string;
  public roomId: string;
  public clientId: string;
  public userName: string;

  private signaling: SupabaseRealtimeSignalingService;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map(); // studentId -> PC
  private remoteStreams: Map<string, MediaStream> = new Map(); // studentId -> Stream
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  private diagnostics: DiagnosticsState;
  private onDiagnosticsChange?: DiagnosticsUpdateCallback;
  private onRemoteStreamReceived?: (studentId: string, stream: MediaStream) => void;
  private onScreenSharingEnded?: () => void;

  constructor(options: {
    role: 'student' | 'instructor';
    sessionId: string;
    roomId: string;
    clientId: string;
    userName: string;
    onDiagnosticsChange?: DiagnosticsUpdateCallback;
    onRemoteStreamReceived?: (studentId: string, stream: MediaStream) => void;
    onScreenSharingEnded?: () => void;
    onLog?: (log: SignalingLog) => void;
  }) {
    this.role = options.role;
    this.sessionId = options.sessionId;
    this.roomId = options.roomId;
    this.clientId = options.clientId;
    this.userName = options.userName;
    this.onDiagnosticsChange = options.onDiagnosticsChange;
    this.onRemoteStreamReceived = options.onRemoteStreamReceived;
    this.onScreenSharingEnded = options.onScreenSharingEnded;

    this.diagnostics = {
      sessionId: this.sessionId,
      roomId: this.roomId,
      studentConnected: this.role === 'student',
      instructorConnected: this.role === 'instructor',
      offerSent: false,
      offerReceived: false,
      answerSent: false,
      answerReceived: false,
      iceCandidatesSent: 0,
      iceCandidatesReceived: 0,
      connectionState: 'new',
      iceState: 'new',
      remoteStreamAttached: false,
      failedStage: null,
      errorMessage: null
    };

    // Initialize Signaling
    this.signaling = new SupabaseRealtimeSignalingService({
      sessionId: this.sessionId,
      roomId: this.roomId,
      clientId: this.clientId,
      role: this.role,
      userName: this.userName,
      onLog: options.onLog,
      onPresenceChange: (presence) => {
        this.updateDiagnostics({
          studentConnected: presence.studentConnected,
          instructorConnected: presence.instructorConnected
        });
      }
    });

    this.setupSignalingListeners();
    this.notifyDiagnostics();
  }

  private updateDiagnostics(partial: Partial<DiagnosticsState>) {
    this.diagnostics = { ...this.diagnostics, ...partial };
    this.notifyDiagnostics();
  }

  private notifyDiagnostics() {
    this.onDiagnosticsChange?.({ ...this.diagnostics });
  }

  private setFailure(stage: string, error: string) {
    this.signaling.log(stage, error, 'error');
    this.updateDiagnostics({
      failedStage: stage,
      errorMessage: error
    });
  }

  private clearFailure() {
    if (this.diagnostics.failedStage) {
      this.updateDiagnostics({
        failedStage: null,
        errorMessage: null
      });
    }
  }

  // =========================================================================
  // SIGNALING EVENT LISTENERS
  // =========================================================================
  private setupSignalingListeners() {
    if (this.role === 'instructor') {
      // 1. Instructor receives offer from student
      this.signaling.on('webrtc_offer', async (data: any) => {
        const { studentId, studentName, offer } = data;
        if (!studentId || !offer) return;

        this.signaling.log('Offer Received', `Received WebRTC offer from student ${studentName || studentId}`, 'success');
        this.updateDiagnostics({ offerReceived: true });
        this.clearFailure();

        await this.handleIncomingOffer(studentId, studentName, offer);
      });
    }

    if (this.role === 'student') {
      // 2. Student receives answer from instructor
      this.signaling.on('webrtc_answer', async (data: any) => {
        const { studentId, targetId, answer } = data;
        if ((studentId && studentId !== this.clientId) && (targetId && targetId !== this.clientId)) {
          return;
        }

        this.signaling.log('Answer Received', 'Received WebRTC answer from instructor', 'success');
        this.updateDiagnostics({ answerReceived: true });
        this.clearFailure();

        const pc = this.peerConnections.get(this.clientId);
        if (pc && answer) {
          try {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              this.signaling.log('Handshake Complete', 'Remote description set with instructor answer', 'success');
              
              // Flush any pending ICE candidates
              const pending = this.pendingCandidates.get(this.clientId) || [];
              for (const cand of pending) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              this.pendingCandidates.delete(this.clientId);
            }
          } catch (err: any) {
            this.setFailure('Answer Processing', `Failed to apply remote description: ${err.message}`);
          }
        }
      });
    }

    // 3. Bidirectional ICE candidate exchange
    this.signaling.on('webrtc_ice_candidate', async (data: any) => {
      const { targetId, studentId, candidate, fromRole } = data;
      // Filter out messages not meant for us
      if (this.role === 'student' && fromRole === 'student') return;
      if (this.role === 'instructor' && fromRole === 'instructor') return;

      const peerKey = this.role === 'student' ? this.clientId : studentId;
      if (!peerKey || !candidate) return;

      this.updateDiagnostics({
        iceCandidatesReceived: this.diagnostics.iceCandidatesReceived + 1
      });

      const pc = this.peerConnections.get(peerKey);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          this.signaling.log('ICE Candidate Received', `Added candidate from ${fromRole}`, 'info');
        } catch (e: any) {
          console.warn('Could not add ICE candidate:', e);
        }
      } else {
        // Buffer candidate until remote description is set
        if (!this.pendingCandidates.has(peerKey)) {
          this.pendingCandidates.set(peerKey, []);
        }
        this.pendingCandidates.get(peerKey)!.push(candidate);
      }
    });

    // 4. Track state synchronization
    this.signaling.on('screen_track_state', (data: any) => {
      if (this.role === 'instructor') {
        const { studentId, isSharing } = data;
        if (!isSharing) {
          this.remoteStreams.delete(studentId);
          this.updateDiagnostics({ remoteStreamAttached: false });
        }
      }
    });
  }

  // =========================================================================
  // STUDENT FLOW: Start & Stop Screen Sharing
  // =========================================================================
  public async startScreenShare(): Promise<MediaStream> {
    if (this.role !== 'student') {
      throw new Error('Only student role can start screen sharing');
    }

    this.clearFailure();
    this.signaling.log('Media Capture', 'Requesting getDisplayMedia() screen capture...', 'info');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        } as any,
        audio: false
      });
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' ? 'Screen capture permission denied by user' : err.message;
      this.setFailure('Screen Capture', msg);
      throw new Error(msg);
    }

    this.localStream = stream;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      this.setFailure('Screen Capture', 'No video track found in captured stream');
      throw new Error('No video track found');
    }

    this.signaling.log(
      'Media Capture',
      `Screen captured successfully | Track: ${videoTrack.label} | ReadyState: ${videoTrack.readyState}`,
      'success'
    );
    this.updateDiagnostics({
      activeTrackLabel: videoTrack.label
    });

    // Handle native browser "Stop sharing" bar
    videoTrack.onended = () => {
      this.signaling.log('Media Ended', 'Screen share ended via browser chrome bar', 'warn');
      this.stopScreenShare();
      this.onScreenSharingEnded?.();
    };

    // Close any previous PeerConnection
    if (this.peerConnections.has(this.clientId)) {
      this.peerConnections.get(this.clientId)?.close();
      this.peerConnections.delete(this.clientId);
    }

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    this.peerConnections.set(this.clientId, pc);

    // Setup connection state tracking
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.updateDiagnostics({ connectionState: state });
      this.signaling.log('Connection State', `PeerConnection state changed to: ${state}`, state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info');

      if (state === 'failed') {
        this.setFailure('WebRTC Connection', 'ICE connection failed. Triggering ICE restart...');
        pc.restartIce();
      } else if (state === 'connected') {
        this.clearFailure();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      this.updateDiagnostics({ iceState: state });
      this.signaling.log('ICE State', `ICE connection state changed to: ${state}`, state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info');
    };

    // Candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.updateDiagnostics({
          iceCandidatesSent: this.diagnostics.iceCandidatesSent + 1
        });
        this.signaling.send('webrtc_ice_candidate', {
          roomId: this.roomId,
          studentId: this.clientId,
          candidate: event.candidate,
          fromRole: 'student'
        });
      }
    };

    // Add video track to PeerConnection
    pc.addTrack(videoTrack, stream);
    this.signaling.log('WebRTC Track', `Added video track to RTCPeerConnection: ${videoTrack.label}`, 'success');

    // Create SDP Offer
    try {
      this.signaling.log('Offer Creation', 'Creating SDP offer...', 'info');
      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);
      this.updateDiagnostics({ offerSent: true });
      this.signaling.log('Offer Sent', `Local SDP description set and offer dispatched for room ${this.roomId}`, 'success');

      // Send offer over Supabase Realtime
      await this.signaling.send('webrtc_offer', {
        roomId: this.roomId,
        studentId: this.clientId,
        studentName: this.userName,
        offer
      });

      // Update presence
      await this.signaling.updatePresence(true);
      await this.signaling.send('screen_track_state', {
        studentId: this.clientId,
        isSharing: true
      });
    } catch (err: any) {
      this.setFailure('Offer Creation', `Failed to create/send offer: ${err.message}`);
      throw err;
    }

    return stream;
  }

  public stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    const pc = this.peerConnections.get(this.clientId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(this.clientId);
    }

    this.updateDiagnostics({
      offerSent: false,
      answerReceived: false,
      connectionState: 'new',
      iceState: 'new',
      activeTrackLabel: undefined
    });

    this.signaling.send('screen_track_state', {
      studentId: this.clientId,
      isSharing: false
    });
    this.signaling.updatePresence(false);
    this.signaling.log('Media Stopped', 'Screen sharing stopped and tracks released', 'info');
  }

  // =========================================================================
  // INSTRUCTOR FLOW: Handle Incoming Student Offer & Answer
  // =========================================================================
  private async handleIncomingOffer(studentId: string, studentName: string, offer: RTCSessionDescriptionInit) {
    // Reset any old connection for this student
    if (this.peerConnections.has(studentId)) {
      this.peerConnections.get(studentId)?.close();
      this.peerConnections.delete(studentId);
    }

    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    this.peerConnections.set(studentId, pc);

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.updateDiagnostics({ connectionState: state });
      this.signaling.log('Connection State', `Instructor connection for student ${studentId}: ${state}`, state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info');
      if (state === 'connected') this.clearFailure();
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      this.updateDiagnostics({ iceState: state });
      this.signaling.log('ICE State', `Instructor ICE state for student ${studentId}: ${state}`, state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.updateDiagnostics({
          iceCandidatesSent: this.diagnostics.iceCandidatesSent + 1
        });
        this.signaling.send('webrtc_ice_candidate', {
          roomId: this.roomId,
          targetId: studentId,
          studentId,
          candidate: event.candidate,
          fromRole: 'instructor'
        });
      }
    };

    // ONTRACK: Exact WebRTC Remote Stream Acquisition!
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStreams.set(studentId, stream);

      const hasLiveTrack = stream.getVideoTracks().some(t => t.readyState === 'live');
      this.signaling.log(
        'Remote Stream Attached',
        `Acquired live WebRTC screen stream from student ${studentName || studentId}! Track readyState: ${event.track.readyState}`,
        'success'
      );

      this.updateDiagnostics({
        remoteStreamAttached: hasLiveTrack,
        activeTrackLabel: event.track.label
      });

      this.clearFailure();
      this.onRemoteStreamReceived?.(studentId, stream);
    };

    try {
      // 1. Set Remote Description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      this.signaling.log('Remote Description', `Applied remote offer from student ${studentName || studentId}`, 'info');

      // 2. Flush pending candidates for this student
      const pending = this.pendingCandidates.get(studentId) || [];
      for (const cand of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      }
      this.pendingCandidates.delete(studentId);

      // 3. Create SDP Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.updateDiagnostics({ answerSent: true });

      // 4. Send Answer back to student via Supabase Realtime
      await this.signaling.send('webrtc_answer', {
        roomId: this.roomId,
        targetId: studentId,
        studentId,
        answer
      });
      this.signaling.log('Answer Sent', `Created and dispatched SDP answer for student ${studentName || studentId}`, 'success');
    } catch (err: any) {
      this.setFailure('Answer Negotiation', `Failed to negotiate answer for student ${studentId}: ${err.message}`);
    }
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  public getRemoteStream(studentId: string): MediaStream | undefined {
    return this.remoteStreams.get(studentId);
  }

  public getDiagnostics(): DiagnosticsState {
    return { ...this.diagnostics };
  }

  public restartIce(studentId?: string) {
    const targetKey = studentId || this.clientId;
    const pc = this.peerConnections.get(targetKey);
    if (pc) {
      this.signaling.log('Restart ICE', `Triggering manual ICE restart on ${targetKey}`, 'warn');
      pc.restartIce();
    }
  }

  public destroy() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.signaling.destroy();
  }
}
