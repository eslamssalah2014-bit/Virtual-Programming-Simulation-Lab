import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

interface SignalingMessage {
  id: string;
  sessionId: string;
  canonicalRoomId: string;
  from: string;
  to: string; // 'instructor' | 'all' | studentId
  type: string;
  payload: any;
  timestamp: number;
}

// Global in-memory message queue for Vercel serverless signaling
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

const resolveCanonicalRoomId = (idOrCode: string): string => {
  try {
    const session = dbStore.getSession(idOrCode);
    if (session) return session.id;
  } catch (e) {}
  return idOrCode.toLowerCase().trim();
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, from, to = 'all', type, payload } = body;

    if (!sessionId || !from || !type) {
      return NextResponse.json({ error: 'Missing required signaling fields' }, { status: 400 });
    }

    pruneStore();

    const canonicalRoomId = resolveCanonicalRoomId(sessionId);

    const message: SignalingMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      canonicalRoomId,
      from,
      to,
      type,
      payload,
      timestamp: Date.now()
    };

    getStore().push(message);

    return NextResponse.json({
      success: true,
      messageId: message.id,
      canonicalRoomId
    });
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

  const canonicalRoomId = resolveCanonicalRoomId(sessionId);

  // Filter messages for this room, received after 'since', not from self
  const messages = getStore().filter(m => {
    // 1. Room matching (accepts either raw sessionId or canonicalRoomId)
    const matchesRoom =
      m.canonicalRoomId === canonicalRoomId ||
      m.sessionId === sessionId ||
      m.sessionId.toLowerCase() === sessionId.toLowerCase();

    if (!matchesRoom) return false;

    // 2. Ignore messages sent by self
    if (m.from === clientId) return false;

    // 3. Ignore messages received before 'since' timestamp
    if (m.timestamp <= since) return false;

    // 4. Role-based and recipient routing
    if (m.to === 'all') return true;
    if (m.to === clientId) return true;

    // If client is instructor, deliver all messages directed to instructor or offers from students
    if (role === 'instructor') {
      if (m.to === 'instructor') return true;
      if (m.type === 'webrtc_offer') return true;
      if (m.type === 'student_raise_hand') return true;
      if (m.type === 'student_screen_status') return true;
      if (m.payload?.fromRole === 'student' && m.type === 'webrtc_ice_candidate') return true;
    }

    // If client is student, deliver answers and candidates directed to them
    if (role === 'student') {
      if (m.to === 'student') return true;
      if (m.type === 'webrtc_answer') {
        // Matches studentId, targetId, or registration id
        if (m.to === clientId || m.payload?.studentId === clientId || m.payload?.targetId === clientId) {
          return true;
        }
      }
      if (m.type === 'webrtc_ice_candidate') {
        if (m.payload?.fromRole === 'instructor' && (m.to === clientId || m.payload?.targetId === clientId || !m.payload?.targetId)) {
          return true;
        }
      }
    }

    return false;
  });

  return NextResponse.json({
    messages,
    serverTime: Date.now(),
    canonicalRoomId
  });
}
