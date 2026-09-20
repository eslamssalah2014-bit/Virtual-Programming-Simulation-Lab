import { io, Socket } from 'socket.io-client';
import { SupabaseSignalingTransport } from './supabaseSignaling';

export interface WebRTCLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'webrtc' | 'signaling' | 'media' | 'ice';
  message: string;
  details?: any;
}

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

type EventListener = (data: any) => void;

export class UnifiedSignalingClient {
  public rawSessionId: string;
  public canonicalRoomId: string;
  public channelName: string;
  public clientId: string;
  public role: 'instructor' | 'student';

  private supabaseTransport: SupabaseSignalingTransport | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private socket: Socket | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastPolledTimestamp: number = Date.now() - 5000;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private onLogCallback?: (entry: WebRTCLogEntry) => void;

  constructor(
    sessionId: string,
    canonicalRoomId: string,
    clientId: string,
    role: 'instructor' | 'student',
    onLog?: (entry: WebRTCLogEntry) => void
  ) {
    this.rawSessionId = sessionId;
    this.canonicalRoomId = canonicalRoomId || sessionId;
    // Canonical channel name guaranteed to match between student and instructor
    this.channelName = `vlab_webrtc_${this.canonicalRoomId.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
    this.clientId = clientId;
    this.role = role;
    this.onLogCallback = onLog;

    this.init();
  }

  public setLogCallback(cb: (entry: WebRTCLogEntry) => void) {
    this.onLogCallback = cb;
  }

  public log(
    message: string,
    level: 'info' | 'warn' | 'error' | 'success' = 'info',
    category: 'webrtc' | 'signaling' | 'media' | 'ice' = 'signaling',
    details?: any
  ) {
    const entry: WebRTCLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      }),
      level,
      category,
      message,
      details
    };

    console.log(`[${category.toUpperCase()}] ${message}`, details || '');
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  private init() {
    this.log(
      `Signaling initialized | Role: ${this.role} | Room ID: ${this.canonicalRoomId} | Channel: ${this.channelName} | Client ID: ${this.clientId}`,
      'info',
      'signaling'
    );

    // 1. Supabase Realtime Transport
    try {
      this.supabaseTransport = new SupabaseSignalingTransport(
        this.channelName,
        this.clientId,
        (event, payload) => {
          this.handleIncomingRawMessage({ type: event, payload, from: payload.senderId }, 'supabase');
        },
        (entry) => this.onLogCallback?.(entry)
      );
    } catch (e: any) {
      this.log(`Supabase Realtime transport init exception: ${e.message}`, 'warn', 'signaling');
    }

    // 2. Browser BroadcastChannel (0ms local cross-tab signaling)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && e.data.from !== this.clientId) {
            this.handleIncomingRawMessage(e.data, 'broadcast');
          }
        };
        this.log(`BroadcastChannel connected: ${this.channelName}`, 'info', 'signaling');
      } catch (err: any) {
        this.log(`BroadcastChannel failed: ${err.message}`, 'warn', 'signaling');
      }
    }

    // 3. Socket.IO (Local development server)
    if (typeof window !== 'undefined') {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          timeout: 4000,
          reconnectionAttempts: 3
        });

        this.socket.on('connect', () => {
          this.log(`Socket.IO connected (${this.socket?.id})`, 'success', 'signaling');
          this.socket?.emit('join_session', {
            sessionId: this.canonicalRoomId,
            user: { id: this.clientId, role: this.role }
          });
        });

        const socketEvents = [
          'webrtc_offer',
          'webrtc_answer',
          'webrtc_ice_candidate',
          'student_screen_status',
          'student_raise_hand',
          'student_lower_hand'
        ];

        socketEvents.forEach(evt => {
          this.socket?.on(evt, (data) => {
            if (data && data.senderId !== this.clientId) {
              this.handleIncomingRawMessage({
                id: data.msgId || `${Date.now()}-${Math.random()}`,
                type: evt,
                from: data.senderId || data.studentId || 'unknown',
                payload: data
              }, 'socket');
            }
          });
        });
      } catch (e: any) {
        this.log(`Socket init exception: ${e.message}`, 'warn', 'signaling');
      }

      // 4. Next.js API /api/signaling Fast Polling (Supports Vercel serverless)
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    this.pollingTimer = setInterval(async () => {
      try {
        const url = `/api/signaling?sessionId=${encodeURIComponent(this.canonicalRoomId)}&clientId=${encodeURIComponent(this.clientId)}&role=${this.role}&since=${this.lastPolledTimestamp}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.serverTime) {
            this.lastPolledTimestamp = data.serverTime;
          }
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              this.handleIncomingRawMessage(msg, 'api_polling');
            }
          }
        }
      } catch (err) {}
    }, 650); // Polling every 650ms for responsive signaling
  }

  public handleIncomingRawMessage(msg: any, source: string) {
    if (!msg || !msg.type) return;

    // Deduplicate messages across transports
    const msgKey = msg.id || `${msg.type}_${msg.from}_${JSON.stringify(msg.payload || {}).slice(0, 30)}`;
    if (this.processedMessageIds.has(msgKey)) {
      return;
    }
    this.processedMessageIds.add(msgKey);

    if (this.processedMessageIds.size > 300) {
      const first = Array.from(this.processedMessageIds)[0];
      this.processedMessageIds.delete(first);
    }

    const eventName = msg.type;
    const payload = msg.payload || msg;

    // Log explicit WebRTC signaling milestones
    if (eventName === 'webrtc_offer' && this.role === 'instructor') {
      this.log(`[4. Offer received] Received WebRTC offer from student via ${source}`, 'success', 'signaling', {
        studentId: payload.studentId,
        sdpType: payload.offer?.type
      });
    } else if (eventName === 'webrtc_answer' && this.role === 'student') {
      this.log(`[7. Answer received] Received WebRTC answer from instructor via ${source}`, 'success', 'signaling', {
        sdpType: payload.answer?.type
      });
    } else if (eventName === 'webrtc_ice_candidate') {
      this.log(`[9. ICE candidate received] Received ICE candidate from peer via ${source}`, 'info', 'ice', {
        type: payload.candidate?.type || 'candidate'
      });
    }

    // Trigger registered event callbacks
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(payload);
        } catch (e: any) {
          this.log(`Listener error on ${eventName}: ${e.message}`, 'error', 'signaling');
        }
      });
    }
  }

  public on(event: string, callback: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventListener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  public send(type: string, to: string, payload: any) {
    const msgId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const enrichedPayload = {
      ...payload,
      msgId,
      senderId: this.clientId,
      senderRole: this.role,
      sessionId: this.canonicalRoomId,
      rawSessionId: this.rawSessionId
    };

    const envelope = {
      id: msgId,
      sessionId: this.canonicalRoomId,
      canonicalRoomId: this.canonicalRoomId,
      from: this.clientId,
      to,
      type,
      payload: enrichedPayload,
      timestamp: Date.now()
    };

    // Log explicit WebRTC sending milestones
    if (type === 'webrtc_offer') {
      this.log(`[3. Offer sent] WebRTC offer sent to instructor on channel ${this.channelName}`, 'success', 'signaling');
    } else if (type === 'webrtc_answer') {
      this.log(`[6. Answer sent] WebRTC answer sent to student on channel ${this.channelName}`, 'success', 'signaling');
    } else if (type === 'webrtc_ice_candidate') {
      this.log(`[8. ICE candidate generated] Sent local ICE candidate to peer`, 'info', 'ice');
    }

    // 1. Supabase Realtime Transport
    if (this.supabaseTransport) {
      this.supabaseTransport.send(type, enrichedPayload);
    }

    // 2. BroadcastChannel Transport (0ms local inter-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch (e) {}
    }

    // 3. Socket.IO Transport
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit(type, enrichedPayload);
      } catch (e) {}
    }

    // 4. Next.js API /api/signaling Transport
    fetch('/api/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    }).catch(() => {});
  }

  public getTransportStatus() {
    return {
      rawSessionId: this.rawSessionId,
      canonicalRoomId: this.canonicalRoomId,
      channelName: this.channelName,
      supabase: this.supabaseTransport?.getStatus() || 'NOT_CONFIGURED',
      broadcastChannel: this.broadcastChannel ? 'ACTIVE' : 'INACTIVE',
      socket: this.socket?.connected ? 'CONNECTED' : 'OFFLINE',
      apiPolling: this.pollingTimer ? 'ACTIVE' : 'INACTIVE'
    };
  }

  public destroy() {
    this.log('Tearing down signaling channel', 'info', 'signaling');
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.supabaseTransport) {
      this.supabaseTransport.destroy();
      this.supabaseTransport = null;
    }
    this.listeners.clear();
  }
}
