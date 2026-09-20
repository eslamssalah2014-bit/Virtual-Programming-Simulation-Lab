import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { WebRTCLogEntry } from './signalingClient';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseSignalingTransport {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private channelName: string;
  private clientId: string;
  private isConnected: boolean = false;
  private onMessageCallback: (event: string, payload: any) => void;
  private onLogCallback?: (entry: WebRTCLogEntry) => void;

  constructor(
    channelName: string,
    clientId: string,
    onMessage: (event: string, payload: any) => void,
    onLog?: (entry: WebRTCLogEntry) => void
  ) {
    this.channelName = channelName;
    this.clientId = clientId;
    this.onMessageCallback = onMessage;
    this.onLogCallback = onLog;

    this.init();
  }

  private log(
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

    console.log(`[SUPABASE-${category.toUpperCase()}] ${message}`, details || '');
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }

  private getCredentials(): SupabaseConfig | null {
    if (typeof window === 'undefined') return null;

    // 1. Check environment variables
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey };
    }

    // 2. Check localStorage configuration (allows user to enter credentials in Debug Panel)
    try {
      const storedUrl = localStorage.getItem('vlab_supabase_url');
      const storedKey = localStorage.getItem('vlab_supabase_key');
      if (storedUrl && storedKey) {
        return { url: storedUrl, anonKey: storedKey };
      }
    } catch (e) {}

    return null;
  }

  private init() {
    const creds = this.getCredentials();
    if (!creds) {
      this.log(
        'Supabase Realtime credentials not detected (using BroadcastChannel & Next.js Signaling API fallback)',
        'info',
        'signaling'
      );
      return;
    }

    try {
      this.log(`Connecting to Supabase Realtime on channel: ${this.channelName}...`, 'info', 'signaling');
      this.client = createClient(creds.url, creds.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 20
          }
        }
      });

      this.channel = this.client.channel(this.channelName, {
        config: {
          broadcast: {
            self: false, // Don't receive own messages
            ack: false
          }
        }
      });

      // Subscribe to WebRTC broadcast events
      const events = ['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate', 'student_screen_status', 'student_raise_hand', 'student_lower_hand'];

      events.forEach(evt => {
        this.channel?.on('broadcast', { event: evt }, (response: any) => {
          const payload = response.payload;
          if (payload && payload.senderId !== this.clientId) {
            this.log(`[Supabase Realtime Received] Event: ${evt} from ${payload.senderId || 'peer'}`, 'success', 'signaling');
            this.onMessageCallback(evt, payload);
          }
        });
      });

      this.channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.log(`[Supabase Realtime SUBSCRIBED] Channel: ${this.channelName} is live and ready!`, 'success', 'signaling');
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          this.log(`[Supabase Realtime ERROR] Failed to subscribe to channel: ${this.channelName}`, 'error', 'signaling');
        } else if (status === 'TIMED_OUT') {
          this.isConnected = false;
          this.log(`[Supabase Realtime TIMED_OUT] Channel subscription timed out`, 'warn', 'signaling');
        }
      });
    } catch (err: any) {
      this.log(`Supabase Realtime initialization error: ${err.message}`, 'error', 'signaling');
    }
  }

  public getStatus(): string {
    if (!this.client) return 'NOT_CONFIGURED';
    return this.isConnected ? 'SUBSCRIBED' : 'CONNECTING';
  }

  public send(event: string, payload: any): boolean {
    if (!this.channel || !this.isConnected) {
      return false;
    }

    try {
      this.channel.send({
        type: 'broadcast',
        event,
        payload
      });
      this.log(`[Supabase Realtime Broadcast] Dispatched ${event} on channel ${this.channelName}`, 'info', 'signaling');
      return true;
    } catch (err: any) {
      this.log(`[Supabase Send Error] ${err.message}`, 'error', 'signaling');
      return false;
    }
  }

  public destroy() {
    if (this.channel && this.client) {
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
    this.client = null;
    this.isConnected = false;
  }
}
