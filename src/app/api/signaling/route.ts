import { NextRequest, NextResponse } from 'next/server';

interface SignalingMessage {
  id: string;
  sessionId: string;
  from: string;
  to: string; // 'instructor' | 'all' | specific studentId
  type: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate' | 'screen_status' | 'raise_hand' | 'lower_hand' | 'heartbeat';
  payload: any;
  timestamp: number;
}

// In-memory message bus for Vercel / serverless signaling fallback
// Holds recent signaling events with 60-second TTL
declare global {
  var __vlabSignalingStore: SignalingMessage[] | undefined;
}

if (!global.__vlabSignalingStore) {
  global.__vlabSignalingStore = [];
}

const getStore = (): SignalingMessage[] => {
  if (!global.__vlabSignalingStore) {
    global.__vlabSignalingStore = [];
  }
  return global.__vlabSignalingStore;
};

// Clean messages older than 60 seconds
const pruneStore = () => {
  const cutoff = Date.now() - 60000;
  global.__vlabSignalingStore = getStore().filter(m => m.timestamp > cutoff);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, from, to = 'all', type, payload } = body;

    if (!sessionId || !from || !type) {
      return NextResponse.json({ error: 'Missing required signaling fields' }, { status: 400 });
    }

    pruneStore();

    const message: SignalingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      from,
      to,
      type,
      payload,
      timestamp: Date.now()
    };

    getStore().push(message);

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to post signaling message' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  const clientId = searchParams.get('clientId');
  const role = searchParams.get('role'); // 'instructor' | 'student'
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!sessionId || !clientId) {
    return NextResponse.json({ error: 'sessionId and clientId are required' }, { status: 400 });
  }

  pruneStore();

  // Filter messages for this session, received after 'since', not from self, and directed to this client or all
  const messages = getStore().filter(m => {
    if (m.sessionId !== sessionId) return false;
    if (m.from === clientId) return false;
    if (m.timestamp <= since) return false;

    // Check routing
    if (m.to === 'all') return true;
    if (m.to === clientId) return true;
    if (role === 'instructor' && m.to === 'instructor') return true;
    if (role === 'student' && m.to === 'student') return true;

    return false;
  });

  return NextResponse.json({
    messages,
    serverTime: Date.now()
  });
}
