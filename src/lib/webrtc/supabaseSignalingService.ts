import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase/client';

export interface SignalingLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  stage: string;
  message: string;
  data?: any;
}

export interface RoomPresenceUser {
  role: 'student' | 'instructor';
  id: string;
  name: string;
  isSharing: boolean;
  joinedAt: number;
  timestamp?: number;
}

export type SignalingEventHandler = (payload: any) => void;

/**
 * SupabaseRealtimeSignalingService
 * Full-featured signaling layer with:
 * 1. Supabase Realtime Channels (presence + broadcast) when credentials exist.
 * 2. Persistent cloud WebSocket relay (ntfy.sh WebSocket + HTTP pub/sub) for 100% reliable cross-device messaging.
 * 3. Local BroadcastChannel for 0ms same-machine tab-to-tab latency.
 */
export class SupabaseRealtimeSignalingService {
  public sessionId: string;
  public roomId: string;
  public clientId: string;
  public role: 'student' | 'instructor';
  public userName: string;

  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private isSupabaseSubscribed: boolean = false;
  private isDestroyed: boolean = false;
  private channelName: string;
  private ntfyTopic: string;

  private cloudWs: WebSocket | null = null;
  private cloudWsConnected: boolean = false;
  private processedMessageIds: Set<string> = new Set();

  private eventListeners: Map<string, Set<SignalingEventHandler>> = new Map();
  private presenceUsers: Map<string, RoomPresenceUser> = new Map();
  private onLogCallback?: (log: SignalingLog) => void;
  private onPresenceChangeCallback?: (presence: {
    studentConnected: boolean;
    instructorConnected: boolean;
    users: RoomPresenceUser[];
  }) => void;
  private onStatusChangeCallback?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;

  constructor(options: {
    sessionId: string;
    roomId: string;
    clientId: string;
    role: 'student' | 'instructor';
    userName: string;
    onLog?: (log: SignalingLog) => void;
    onPresenceChange?: (presence: {
      studentConnected: boolean;
      instructorConnected: boolean;
      users: RoomPresenceUser[];
    }) => void;
    onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  }) {
    this.sessionId = options.sessionId;
    this.roomId = options.roomId;
    this.clientId = options.clientId;
    this.role = options.role;
    this.userName = options.userName;
    this.onLogCallback = options.onLog;
    this.onPresenceChangeCallback = options.onPresenceChange;
    this.onStatusChangeCallback = options.onStatusChange;

    // Guaranteed canonical channel and topic
    const cleanId = this.roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    this.channelName = `room_${cleanId}`;
    this.ntfyTopic = `vlab_sig_${cleanId}`;

    this.init();
  }

  public log(stage: string, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info', data?: any) {
    const entry: SignalingLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      }),
      stage,
      message,
      type,
      data
    };

    console.log(`[SIGNALING][${stage}] ${message}`, data || '');
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  private init() {
    this.log(
      'Initialization',
      `Starting signaling client | Role: ${this.role} | Room: ${this.roomId} | Client: ${this.clientId}`,
      'info'
    );
    this.onStatusChangeCallback?.('connecting');

    // 1. Initialize Persistent Cloud WebSocket Broker (Guarantees cross-device message exchange on Vercel)
    this.initCloudWebSocket();

    // 2. Initialize Supabase Realtime Channels
    const config = getSupabaseConfig();
    if (config) {
      this.initSupabaseChannel(config.url, config.anonKey);
    } else {
      this.log(
        'Supabase Realtime',
        'Supabase env variables not detected in deployment. Operating via cloud WebSocket signaling broker.',
        'info'
      );
    }

    // 3. Local cross-tab BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(this.channelName);
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.senderId !== this.clientId) {
            this.handleIncomingRawMessage(ev.data, 'broadcast_channel');
          }
        };
      } catch (e) {}
    }

    // 4. Send initial presence heartbeat
    setTimeout(() => {
      this.sendPresenceHeartbeat(false);
    }, 500);

    // Heartbeat loop every 8 seconds
    const heartbeatTimer = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(heartbeatTimer);
        return;
      }
      this.sendPresenceHeartbeat(false);
    }, 8000);
  }

  /**
   * Persistent Cloud WebSocket Connection (ntfy.sh WebSocket)
   */
  private initCloudWebSocket() {
    if (typeof window === 'undefined' || this.isDestroyed) return;

    try {
      const wsUrl = `wss://ntfy.sh/${this.ntfyTopic}/ws`;
      this.log('Cloud WebSocket', `Connecting to cloud signaling broker: ${wsUrl}...`, 'info');

      const ws = new WebSocket(wsUrl);
      this.cloudWs = ws;

      ws.onopen = () => {
        if (this.isDestroyed) {
          ws.close();
          return;
        }
        this.cloudWsConnected = true;
        this.onStatusChangeCallback?.('connected');
        this.log('Cloud WebSocket', `Connected to cloud signaling broker for room: ${this.roomId}`, 'success');
        this.sendPresenceHeartbeat(false);
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const payload = JSON.parse(raw.message);
            if (payload && payload.senderId !== this.clientId) {
              this.handleIncomingRawMessage(payload, 'cloud_ws');
            }
          }
        } catch (e) {}
      };

      ws.onerror = () => {
        this.log('Cloud WebSocket', 'WebSocket connection note. Reconnecting...', 'warn');
      };

      ws.onclose = () => {
        this.cloudWsConnected = false;
        if (!this.isDestroyed) {
          setTimeout(() => {
            if (!this.isDestroyed) this.initCloudWebSocket();
          }, 3000);
        }
      };
    } catch (err: any) {
      this.log('Cloud WebSocket Error', `Failed to open cloud WebSocket: ${err.message}`, 'warn');
    }
  }

  /**
   * Supabase Realtime Channel
   */
  private initSupabaseChannel(url: string, key: string) {
    try {
      this.log('Supabase Realtime', `Initializing Supabase Realtime channel: ${this.channelName}...`, 'info');
      this.supabase = createClient(url, key, {
        realtime: {
          params: { eventsPerSecond: 40 }
        }
      });

      this.channel = this.supabase.channel(this.channelName, {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: this.clientId }
        }
      });

      // Presence tracking
      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel) return;
          const state = this.channel.presenceState<RoomPresenceUser>();
          this.handleSupabasePresenceSync(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.log(
            'Presence Join',
            `User joined room: ${newPresences?.[0]?.name || key} (${newPresences?.[0]?.role || 'user'})`,
            'info'
          );
        });

      // Broadcast events
      const broadcastEvents = [
        'webrtc_offer',
        'webrtc_answer',
        'webrtc_ice_candidate',
        'screen_track_state',
        'presence_heartbeat'
      ];

      broadcastEvents.forEach(evt => {
        this.channel?.on('broadcast', { event: evt }, ({ payload }) => {
          if (!payload) return;
          if (payload.senderId === this.clientId) return;
          this.handleIncomingRawMessage(payload, 'supabase_realtime');
        });
      });

      this.channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          this.isSupabaseSubscribed = true;
          this.onStatusChangeCallback?.('connected');
          this.log(
            'Supabase Realtime',
            `SUBSCRIBED to Supabase Realtime channel: ${this.channelName}`,
            'success'
          );

          try {
            await this.channel?.track({
              role: this.role,
              id: this.clientId,
              name: this.userName,
              isSharing: false,
              joinedAt: Date.now()
            });
            this.log('Presence Tracking', `Tracked presence as [${this.role}] via Supabase Realtime`, 'success');
          } catch (e) {}
        } else if (status === 'CHANNEL_ERROR') {
          this.log('Supabase Realtime', `Supabase channel error: ${err?.message || 'unknown'}`, 'warn');
        }
      });
    } catch (err: any) {
      this.log('Supabase Exception', `Failed to initialize channel: ${err.message}`, 'warn');
    }
  }

  private handleSupabasePresenceSync(state: Record<string, RoomPresenceUser[]>) {
    let studentConnected = false;
    let instructorConnected = false;

    Object.values(state).forEach(presenceList => {
      presenceList.forEach(user => {
        this.presenceUsers.set(user.id, user);
        if (user.role === 'student') studentConnected = true;
        if (user.role === 'instructor') instructorConnected = true;
      });
    });

    this.onPresenceChangeCallback?.({
      studentConnected: this.role === 'student' ? true : studentConnected,
      instructorConnected: this.role === 'instructor' ? true : instructorConnected,
      users: Array.from(this.presenceUsers.values())
    });
  }

  private sendPresenceHeartbeat(isSharing: boolean) {
    const payload = {
      role: this.role,
      id: this.clientId,
      name: this.userName,
      isSharing,
      timestamp: Date.now()
    };
    this.send('presence_heartbeat', payload);
  }

  public async updatePresence(isSharing: boolean) {
    this.sendPresenceHeartbeat(isSharing);

    if (this.channel && this.isSupabaseSubscribed) {
      try {
        await this.channel.track({
          role: this.role,
          id: this.clientId,
          name: this.userName,
          isSharing,
          joinedAt: Date.now()
        });
      } catch (e) {}
    }
  }

  /**
   * Dispatches signaling messages across all synchronized real-time transports
   */
  public async send(event: string, payload: any): Promise<void> {
    const messageId = `${event}_${this.clientId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const message = {
      msgId: messageId,
      event,
      senderId: this.clientId,
      senderRole: this.role,
      senderName: this.userName,
      roomId: this.roomId,
      timestamp: Date.now(),
      payload
    };

    // Mark own message as processed to avoid self-echo
    this.processedMessageIds.add(messageId);

    // 1. Supabase Realtime Channel Broadcast
    if (this.channel && this.isSupabaseSubscribed) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event,
          payload: message
        });
        this.log('Message Sent', `Dispatched [${event}] via Supabase Realtime`, 'info');
      } catch (err: any) {
        this.log('Supabase Send Warning', err.message, 'warn');
      }
    }

    // 2. Persistent Cloud WebSocket Broker (ntfy.sh HTTP POST)
    try {
      fetch(`https://ntfy.sh/${this.ntfyTopic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Title': event
        },
        body: JSON.stringify(message)
      }).catch(() => {});
      this.log('Message Sent', `Dispatched [${event}] via Cloud Signaling Broker`, 'info');
    } catch (e) {}

    // 3. Local BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(this.channelName);
        bc.postMessage(message);
      } catch (e) {}
    }

    // 4. Redundant POST to Next.js /api/signaling
    try {
      fetch('/api/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.roomId,
          from: this.clientId,
          to: 'all',
          type: event,
          payload: message
        })
      }).catch(() => {});
    } catch (e) {}
  }

  private handleIncomingRawMessage(message: any, source: string) {
    if (!message || !message.event) return;

    // Deduplication
    const msgKey = message.msgId || `${message.event}_${message.senderId}_${message.timestamp}`;
    if (this.processedMessageIds.has(msgKey)) {
      return;
    }
    this.processedMessageIds.add(msgKey);

    // Keep deduplication set bounded
    if (this.processedMessageIds.size > 500) {
      const arr = Array.from(this.processedMessageIds);
      this.processedMessageIds = new Set(arr.slice(-250));
    }

    // Handle presence heartbeats
    if (message.event === 'presence_heartbeat' && message.payload) {
      const user = message.payload;
      this.presenceUsers.set(user.id, user);

      let studentConnected = this.role === 'student';
      let instructorConnected = this.role === 'instructor';

      this.presenceUsers.forEach(u => {
        const lastSeen = u.timestamp || u.joinedAt || 0;
        if (Date.now() - lastSeen < 30000) {
          if (u.role === 'student') studentConnected = true;
          if (u.role === 'instructor') instructorConnected = true;
        }
      });

      this.onPresenceChangeCallback?.({
        studentConnected,
        instructorConnected,
        users: Array.from(this.presenceUsers.values())
      });
      return;
    }

    this.log(
      'Message Received',
      `Received [${message.event}] from ${message.senderName || message.senderId} via ${source}`,
      'success'
    );

    this.emitInternalEvent(message.event, message.payload);
  }

  public on(event: string, handler: SignalingEventHandler): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => {
      this.eventListeners.get(event)?.delete(handler);
    };
  }

  private emitInternalEvent(event: string, payload: any) {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(fn => {
        try {
          fn(payload);
        } catch (e: any) {
          console.error(`Error in event handler for ${event}:`, e);
        }
      });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.cloudWs) {
      try {
        this.cloudWs.close();
      } catch (e) {}
      this.cloudWs = null;
    }
    if (this.channel) {
      try {
        this.channel.untrack();
        this.channel.unsubscribe();
      } catch (e) {}
      this.channel = null;
    }
    if (this.supabase) {
      this.supabase = null;
    }
    this.eventListeners.clear();
    this.log('Destroyed', 'Signaling client destroyed and channels closed', 'info');
  }
}
