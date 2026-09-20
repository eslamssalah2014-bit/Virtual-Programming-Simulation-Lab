import { io, Socket } from 'socket.io-client';

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
  private sessionId: string;
  private clientId: string;
  private role: 'instructor' | 'student';
  private socket: Socket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastPolledTimestamp: number = Date.now();
  private listeners: Map<string, Set<EventListener>> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private isConnected: boolean = false;
  private onLogCallback?: (entry: WebRTCLogEntry) => void;

  constructor(
    sessionId: string,
    clientId: string,
    role: 'instructor' | 'student',
    onLog?: (entry: WebRTCLogEntry) => void
  ) {
    this.sessionId = sessionId;
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
      level,
      category,
      message,
      details
    };

    console.log(`[${entry.category.toUpperCase()}] ${entry.message}`, details || '');
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  private init() {
    this.log(`Initializing signaling channel for session: ${this.sessionId}, role: ${this.role}, clientId: ${this.clientId}`);

    // 1. Initialize Browser BroadcastChannel for instant local cross-tab signaling
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channelName = `vlab_sig_${this.sessionId}`;
        this.broadcastChannel = new BroadcastChannel(channelName);
        this.broadcastChannel.onmessage = (e) => {
          if (e.data && e.data.from !== this.clientId) {
            this.handleIncomingRawMessage(e.data, 'broadcast');
          }
        };
        this.log(`BroadcastChannel active: ${channelName}`, 'info', 'signaling');
      } catch (err: any) {
        this.log(`BroadcastChannel failed: ${err.message}`, 'warn', 'signaling');
      }
    }

    // 2. Initialize Socket.IO connection
    if (typeof window !== 'undefined') {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          timeout: 5000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.log(`Socket.IO connected (${this.socket?.id})`, 'success', 'signaling');
          this.socket?.emit('join_session', {
            sessionId: this.sessionId,
            user: { id: this.clientId, role: this.role }
          });
        });

        this.socket.on('connect_error', (err) => {
          this.log(`Socket.IO connect error: ${err.message} (using HTTP / Broadcast fallback)`, 'warn', 'signaling');
        });

        // Forward inbound socket events
        const socketEvents = [
          'webrtc_offer',
          'webrtc_answer',
          'webrtc_ice_candidate',
          'student_screen_status',
          'student_raise_hand',
          'student_lower_hand',
          'student_leave_lab',
          'participants_list_updated'
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

      // 3. Start Polling Fallback to /api/signaling (supports Vercel serverless)
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    this.pollingTimer = setInterval(async () => {
      try {
        const url = `/api/signaling?sessionId=${encodeURIComponent(this.sessionId)}&clientId=${encodeURIComponent(this.clientId)}&role=${this.role}&since=${this.lastPolledTimestamp}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.serverTime) {
            this.lastPolledTimestamp = data.serverTime;
          }
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              this.handleIncomingRawMessage(msg, 'polling');
            }
          }
        }
      } catch (err) {
        // Silent polling error handling
      }
    }, 1200);
  }

  private handleIncomingRawMessage(msg: any, source: string) {
    if (!msg || !msg.type) return;

    // Deduplicate messages across transports
    const msgKey = msg.id || `${msg.type}_${msg.from}_${JSON.stringify(msg.payload || {}).slice(0, 40)}`;
    if (this.processedMessageIds.has(msgKey)) {
      return;
    }
    this.processedMessageIds.add(msgKey);

    // Limit deduplication cache size
    if (this.processedMessageIds.size > 200) {
      const first = Array.from(this.processedMessageIds)[0];
      this.processedMessageIds.delete(first);
    }

    const eventName = msg.type;
    const payload = msg.payload || msg;

    this.log(`Received ${eventName} from ${msg.from || payload.studentId || 'peer'} via ${source}`, 'info', 'signaling');

    // Notify registered listeners
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(payload);
        } catch (e: any) {
          this.log(`Error in listener for ${eventName}: ${e.message}`, 'error', 'signaling');
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
      sessionId: this.sessionId
    };

    const envelope = {
      id: msgId,
      sessionId: this.sessionId,
      from: this.clientId,
      to,
      type,
      payload: enrichedPayload,
      timestamp: Date.now()
    };

    this.log(`Sending ${type} to ${to}`, 'info', 'signaling');

    // 1. Send via BroadcastChannel (local 0ms inter-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(envelope);
      } catch (e) {}
    }

    // 2. Send via Socket.IO if connected
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit(type, enrichedPayload);
      } catch (e) {}
    }

    // 3. Send via Next.js API /api/signaling (for Vercel serverless cross-device)
    fetch('/api/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    }).catch(() => {});
  }

  public destroy() {
    this.log('Tearing down signaling channel', 'warn', 'signaling');
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
    this.listeners.clear();
  }
}
