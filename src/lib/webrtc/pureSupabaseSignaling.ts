import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export const RTC_STUN_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export type StageName =
  | 'SCREEN_CAPTURE_STARTED'
  | 'TRACK_CAPTURED'
  | 'TRACK_ADDED_TO_PEER'
  | 'TRACKS_ADDED'
  | 'OFFER_CREATED'
  | 'OFFER_SENT'
  | 'OFFER_RECEIVED'
  | 'ANSWER_CREATED'
  | 'ANSWER_SENT'
  | 'ANSWER_RECEIVED'
  | 'ICE_SENT'
  | 'ICE_RECEIVED'
  | 'ICE_CONNECTED'
  | 'ONTRACK_FIRED'
  | 'VIDEO_ATTACHED';

export interface StageLog {
  id: string;
  stage: StageName;
  timestamp: string;
  role: 'student' | 'instructor';
  message: string;
  data?: any;
}

export interface AuditStageDetail {
  status: 'pending' | 'success' | 'failed';
  details?: string;
  timestamp?: string;
  extra?: any;
}

export interface MediaAuditState {
  trackCaptured: AuditStageDetail;
  trackAdded: AuditStageDetail;
  offerSent: AuditStageDetail;
  offerReceived: AuditStageDetail;
  answerSent: AuditStageDetail;
  answerReceived: AuditStageDetail;
  iceConnected: AuditStageDetail;
  onTrackFired: AuditStageDetail;
  videoAttached: AuditStageDetail;
  failingStage: { stage: string; reason: string } | null;
}

export interface DiagnosticsState {
  signalingStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  offerStatus: 'pending' | 'created' | 'sent' | 'received';
  answerStatus: 'pending' | 'created' | 'sent' | 'received';
  iceStatus: { sent: number; received: number; connectionState: string; iceState: string };
  remoteStreamStatus: 'none' | 'tracks_received' | 'attached';
  activeTrackLabel?: string;
  channelName: string;
  sessionId: string;
  audit: MediaAuditState;
  logs: StageLog[];
}

export class PureSupabaseSignaling {
  public sessionId: string;
  public channelName: string;
  public role: 'student' | 'instructor';
  public clientId: string;

  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private onLogCallback?: (log: StageLog) => void;
  private onDiagnosticsCallback?: (diag: DiagnosticsState) => void;

  private diagnostics: DiagnosticsState;

  constructor(options: {
    sessionId: string;
    role: 'student' | 'instructor';
    clientId: string;
    onLog?: (log: StageLog) => void;
    onDiagnostics?: (diag: DiagnosticsState) => void;
  }) {
    this.sessionId = options.sessionId;
    this.channelName = `session:${this.sessionId}`;
    this.role = options.role;
    this.clientId = options.clientId;
    this.onLogCallback = options.onLog;
    this.onDiagnosticsCallback = options.onDiagnostics;

    this.diagnostics = {
      signalingStatus: 'connecting',
      offerStatus: 'pending',
      answerStatus: 'pending',
      iceStatus: { sent: 0, received: 0, connectionState: 'new', iceState: 'new' },
      remoteStreamStatus: 'none',
      channelName: this.channelName,
      sessionId: this.sessionId,
      audit: {
        trackCaptured: { status: 'pending' },
        trackAdded: { status: 'pending' },
        offerSent: { status: 'pending' },
        offerReceived: { status: 'pending' },
        answerSent: { status: 'pending' },
        answerReceived: { status: 'pending' },
        iceConnected: { status: 'pending' },
        onTrackFired: { status: 'pending' },
        videoAttached: { status: 'pending' },
        failingStage: null
      },
      logs: []
    };
  }

  public logStage(stage: StageName, message: string, data?: any) {
    const entry: StageLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      stage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      }),
      role: this.role,
      message,
      data
    };

    console.log(`[WEBRTC_STAGE][${stage}] [${this.role.toUpperCase()}] ${message}`, data || '');

    this.diagnostics.logs = [entry, ...this.diagnostics.logs.slice(0, 199)];

    // Sync to 9-stage audit
    const nowTime = entry.timestamp;
    if (stage === 'TRACK_CAPTURED') {
      this.diagnostics.audit.trackCaptured = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'TRACK_ADDED_TO_PEER' || stage === 'TRACKS_ADDED') {
      this.diagnostics.audit.trackAdded = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'OFFER_SENT') {
      this.diagnostics.audit.offerSent = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'OFFER_RECEIVED') {
      this.diagnostics.audit.offerReceived = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'ANSWER_SENT') {
      this.diagnostics.audit.answerSent = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'ANSWER_RECEIVED') {
      this.diagnostics.audit.answerReceived = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'ICE_CONNECTED') {
      this.diagnostics.audit.iceConnected = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'ONTRACK_FIRED') {
      this.diagnostics.audit.onTrackFired = { status: 'success', details: message, timestamp: nowTime, extra: data };
    } else if (stage === 'VIDEO_ATTACHED') {
      this.diagnostics.audit.videoAttached = { status: 'success', details: message, timestamp: nowTime, extra: data };
      this.diagnostics.audit.failingStage = null;
    }

    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
    this.notifyDiagnostics();
  }

  public reportFailure(stageName: string, reason: string) {
    console.error(`[WEBRTC_AUDIT_FAILURE] ${stageName}: ${reason}`);
    this.diagnostics.audit.failingStage = { stage: stageName, reason };
    this.notifyDiagnostics();
  }

  public updateAudit(partial: Partial<MediaAuditState>) {
    this.diagnostics.audit = { ...this.diagnostics.audit, ...partial };
    this.notifyDiagnostics();
  }

  public updateDiagnostics(partial: Partial<DiagnosticsState>) {
    this.diagnostics = { ...this.diagnostics, ...partial };
    this.notifyDiagnostics();
  }

  private notifyDiagnostics() {
    this.onDiagnosticsCallback?.({ ...this.diagnostics });
  }

  public getDiagnostics(): DiagnosticsState {
    return { ...this.diagnostics };
  }

  /**
   * Connect to Supabase Realtime Channel
   */
  public async connect(): Promise<boolean> {
    this.supabase = getSupabaseClient();
    if (!this.supabase) {
      console.error('No Supabase client configured.');
      this.updateDiagnostics({ signalingStatus: 'error' });
      this.reportFailure('Signaling Transport', 'Supabase client is not configured or missing credentials');
      return false;
    }

    try {
      this.updateDiagnostics({ signalingStatus: 'connecting' });

      this.channel = this.supabase.channel(this.channelName, {
        config: {
          broadcast: { self: false, ack: true }
        }
      });

      return new Promise<boolean>((resolve) => {
        if (!this.channel) return resolve(false);

        this.channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.updateDiagnostics({ signalingStatus: 'connected' });
            console.log(`[Supabase Realtime] Subscribed to channel ${this.channelName}`);
            resolve(true);
          } else if (status === 'CHANNEL_ERROR') {
            this.updateDiagnostics({ signalingStatus: 'error' });
            console.error(`[Supabase Realtime] Error on channel ${this.channelName}`);
            this.reportFailure('Signaling Transport', `Channel subscription error on ${this.channelName}`);
            resolve(false);
          } else if (status === 'CLOSED') {
            this.updateDiagnostics({ signalingStatus: 'disconnected' });
          }
        });
      });
    } catch (err: any) {
      console.error('Supabase Realtime connect error:', err);
      this.updateDiagnostics({ signalingStatus: 'error' });
      this.reportFailure('Signaling Transport', err?.message || 'Failed to connect to Supabase channel');
      return false;
    }
  }

  public onOffer(handler: (data: { studentId: string; studentName?: string; offer: RTCSessionDescriptionInit }) => void) {
    this.channel?.on('broadcast', { event: 'webrtc_offer' }, ({ payload }) => {
      if (!payload || !payload.offer) return;
      this.logStage('OFFER_RECEIVED', `Received SDP offer from student ${payload.studentId}`, {
        sdpType: payload.offer.type,
        sdpLength: payload.offer.sdp?.length,
        hasVideo: payload.offer.sdp?.includes('m=video')
      });
      this.updateDiagnostics({ offerStatus: 'received' });
      handler(payload);
    });
  }

  public onAnswer(handler: (data: { studentId: string; targetId?: string; answer: RTCSessionDescriptionInit }) => void) {
    this.channel?.on('broadcast', { event: 'webrtc_answer' }, ({ payload }) => {
      if (!payload || !payload.answer) return;
      if (payload.targetId && payload.targetId !== this.clientId && payload.studentId !== this.clientId) {
        return;
      }
      this.logStage('ANSWER_RECEIVED', `Received SDP answer from instructor for student ${payload.studentId}`, {
        sdpType: payload.answer.type,
        hasVideo: payload.answer.sdp?.includes('m=video')
      });
      this.updateDiagnostics({ answerStatus: 'received' });
      handler(payload);
    });
  }

  public onIceCandidate(handler: (data: { studentId: string; targetId?: string; candidate: RTCIceCandidateInit; from: 'student' | 'instructor' }) => void) {
    this.channel?.on('broadcast', { event: 'webrtc_ice_candidate' }, ({ payload }) => {
      if (!payload || !payload.candidate) return;
      if (this.role === payload.from) return; // ignore self
      if (this.role === 'student' && payload.targetId && payload.targetId !== this.clientId) return;

      this.logStage('ICE_RECEIVED', `Received ICE candidate from ${payload.from}`, { candidateType: payload.candidate.candidate });
      this.updateDiagnostics({
        iceStatus: {
          ...this.diagnostics.iceStatus,
          received: this.diagnostics.iceStatus.received + 1
        }
      });
      handler(payload);
    });
  }

  public onRequestOffer(handler: () => void) {
    this.channel?.on('broadcast', { event: 'webrtc_request_offer' }, () => {
      console.log(`[Supabase Realtime] Received offer request from instructor on ${this.channelName}`);
      handler();
    });
  }

  public async sendOfferRequest() {
    if (!this.channel) return;
    console.log(`[Supabase Realtime] Requesting active student offers on channel ${this.channelName}`);
    await this.channel.send({
      type: 'broadcast',
      event: 'webrtc_request_offer',
      payload: { sessionId: this.sessionId, timestamp: Date.now() }
    });
  }

  public async sendOffer(studentId: string, studentName: string, offer: RTCSessionDescriptionInit) {
    if (!this.channel) return;
    this.logStage('OFFER_SENT', `Dispatching SDP offer to instructor on channel ${this.channelName}`, {
      sdpType: offer.type,
      hasVideo: offer.sdp?.includes('m=video')
    });
    this.updateDiagnostics({ offerStatus: 'sent' });

    await this.channel.send({
      type: 'broadcast',
      event: 'webrtc_offer',
      payload: {
        sessionId: this.sessionId,
        studentId,
        studentName,
        offer,
        timestamp: Date.now()
      }
    });
  }

  public async sendAnswer(studentId: string, answer: RTCSessionDescriptionInit) {
    if (!this.channel) return;
    this.logStage('ANSWER_SENT', `Dispatching SDP answer to student ${studentId} on channel ${this.channelName}`, {
      sdpType: answer.type,
      hasVideo: answer.sdp?.includes('m=video')
    });
    this.updateDiagnostics({ answerStatus: 'sent' });

    await this.channel.send({
      type: 'broadcast',
      event: 'webrtc_answer',
      payload: {
        sessionId: this.sessionId,
        studentId,
        targetId: studentId,
        answer,
        timestamp: Date.now()
      }
    });
  }

  public async sendIceCandidate(studentId: string, candidate: RTCIceCandidateInit, from: 'student' | 'instructor', targetId?: string) {
    if (!this.channel) return;
    this.logStage('ICE_SENT', `Dispatching ICE candidate from ${from}`, { candidate: candidate.candidate });
    this.updateDiagnostics({
      iceStatus: {
        ...this.diagnostics.iceStatus,
        sent: this.diagnostics.iceStatus.sent + 1
      }
    });

    await this.channel.send({
      type: 'broadcast',
      event: 'webrtc_ice_candidate',
      payload: {
        sessionId: this.sessionId,
        studentId,
        targetId: targetId || studentId,
        candidate,
        from,
        timestamp: Date.now()
      }
    });
  }

  public destroy() {
    if (this.channel) {
      try {
        this.channel.unsubscribe();
      } catch (e) {}
      this.channel = null;
    }
  }
}
