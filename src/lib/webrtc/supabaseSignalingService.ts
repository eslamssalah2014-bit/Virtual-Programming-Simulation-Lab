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
}

export type SignalingEventHandler = (payload: any) => void;

/**
 * SupabaseRealtimeSignalingService
 * Dedicated signaling layer utilizing Supabase Realtime channels with presence and broadcast.
 */
export class SupabaseRealtimeSignalingService {
  public sessionId: string;
  public roomId: string;
  public clientId: string;
  public role: 'student' | 'instructor';
  public userName: string;

  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private isSubscribed: boolean = false;
  private isDestroyed: boolean = false;
  private fallbackChannelName: string;

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

    // Guaranteed canonical channel name
    this.fallbackChannelName = `room_${this.roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;

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

    const config = getSupabaseConfig();

    if (config) {
      this.initSupabaseChannel(config.url, config.anonKey);
    } else {
      this.log(
        'Supabase Config',
        'Supabase credentials not configured in env. Initializing cloud signaling bus fallback...',
        'warn'
      );
      this.initCloudFallback();
    }
  }

  private initSupabaseChannel(url: string, key: string) {
    try {
      this.log('Supabase Realtime', `Connecting to Supabase at ${url}...`, 'info');
      this.supabase = createClient(url, key, {
        realtime: {
          params: { eventsPerSecond: 40 }
        }
      });

      // Create unique Realtime channel for this room
      this.channel = this.supabase.channel(this.fallbackChannelName, {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: this.clientId }
        }
      });

      // 1. Presence tracking
      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel) return;
          const state = this.channel.presenceState<RoomPresenceUser>();
          this.handlePresenceSync(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.log(
            'Presence Join',
            `User joined room: ${newPresences?.[0]?.name || key} (${newPresences?.[0]?.role || 'unknown'})`,
            'info'
          );
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.log(
            'Presence Leave',
            `User left room: ${leftPresences?.[0]?.name || key}`,
            'warn'
          );
        });

      // 2. Broadcast events for WebRTC signaling
      const broadcastEvents = [
        'webrtc_offer',
        'webrtc_answer',
        'webrtc_ice_candidate',
        'screen_track_state',
        'student_raise_hand',
        'student_lower_hand'
      ];

      broadcastEvents.forEach(evt => {
        this.channel?.on('broadcast', { event: evt }, ({ payload }) => {
          if (!payload) return;
          if (payload.senderId === this.clientId) return;
          this.emitInternalEvent(evt, payload);
        });
      });

      // 3. Subscribe to channel
      this.channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          this.onStatusChangeCallback?.('connected');
          this.log(
            'Supabase Realtime',
            `Successfully SUBSCRIBED to room channel: ${this.fallbackChannelName}`,
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
            this.log('Presence Tracking', `Tracked presence as [${this.role}] in room ${this.roomId}`, 'success');
          } catch (e: any) {
            this.log('Presence Error', `Failed to track presence: ${e.message}`, 'warn');
          }
        } else if (status === 'CLOSED') {
          this.isSubscribed = false;
          this.onStatusChangeCallback?.('disconnected');
          this.log('Supabase Realtime', 'Channel closed', 'warn');
        } else if (status === 'CHANNEL_ERROR') {
          this.isSubscribed = false;
          this.onStatusChangeCallback?.('error');
          this.log('Supabase Realtime', `Channel error: ${err?.message || 'unknown'}`, 'error');
          this.initCloudFallback();
        } else if (status === 'TIMED_OUT') {
          this.log('Supabase Realtime', 'Channel subscription timed out. Retrying...', 'warn');
          this.initCloudFallback();
        }
      });
    } catch (err: any) {
      this.log('Supabase Exception', `Failed to initialize channel: ${err.message}`, 'error');
      this.initCloudFallback();
    }
  }

  private initCloudFallback() {
    if (this.isDestroyed) return;

    try {
      this.log('Cloud Bus', `Using resilient signaling bus for room ${this.fallbackChannelName}`, 'info');
      this.startApiPolling();

      // Local cross-tab BroadcastChannel
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(this.fallbackChannelName);
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.senderId !== this.clientId) {
            this.emitInternalEvent(ev.data.event, ev.data.payload);
          }
        };
      }
    } catch (err: any) {
      this.log('Cloud Bus Error', `Warning: ${err.message}`, 'warn');
    }
  }

  private startApiPolling() {
    let lastPolled = Date.now() - 3000;
    const interval = setInterval(async () => {
      if (this.isDestroyed) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(
          `/api/signaling?sessionId=${encodeURIComponent(this.roomId)}&clientId=${encodeURIComponent(this.clientId)}&role=${this.role}&since=${lastPolled}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.serverTime) lastPolled = data.serverTime;
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              this.emitInternalEvent(msg.type, msg.payload);
            }
          }
        }
      } catch (_) {}
    }, 450);
  }

  private handlePresenceSync(state: Record<string, RoomPresenceUser[]>) {
    this.presenceUsers.clear();
    let studentConnected = false;
    let instructorConnected = false;

    Object.values(state).forEach(presenceList => {
      presenceList.forEach(user => {
        this.presenceUsers.set(user.id, user);
        if (user.role === 'student') studentConnected = true;
        if (user.role === 'instructor') instructorConnected = true;
      });
    });

    this.log(
      'Presence Sync',
      `Presence synchronized: ${studentConnected ? 'Student Present' : 'No Student'} | ${
        instructorConnected ? 'Instructor Present' : 'No Instructor'
      }`,
      'info',
      { totalUsers: this.presenceUsers.size }
    );

    this.onPresenceChangeCallback?.({
      studentConnected,
      instructorConnected,
      users: Array.from(this.presenceUsers.values())
    });
  }

  public async updatePresence(isSharing: boolean) {
    if (this.channel && this.isSubscribed) {
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

  public async send(event: string, payload: any): Promise<void> {
    const message = {
      event,
      senderId: this.clientId,
      senderRole: this.role,
      senderName: this.userName,
      roomId: this.roomId,
      timestamp: Date.now(),
      payload
    };

    // 1. Supabase Realtime Channel Broadcast
    if (this.channel && this.isSubscribed) {
      try {
        await this.channel.send({
          type: 'broadcast',
          event,
          payload: message
        });
        this.log(
          'Message Sent',
          `Dispatched ${event} via Supabase Realtime channel`,
          'info'
        );
      } catch (err: any) {
        this.log('Send Error', `Failed to broadcast on Supabase channel: ${err.message}`, 'warn');
      }
    }

    // 2. Local cross-tab broadcast
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(this.fallbackChannelName);
        bc.postMessage(message);
      } catch (e) {}
    }

    // 3. Redundant /api/signaling POST
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
