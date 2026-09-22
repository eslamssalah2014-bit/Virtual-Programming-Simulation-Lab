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

// Global in-memory message queue for same-process fallback
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
  return idOrCode.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
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

    // Forward to persistent cloud topic for cross-container synchronization
    const ntfyTopic = `vlab_sig_${canonicalRoomId}`;
    try {
      fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      }).catch(() => {});
    } catch (_) {}

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

  // Local memory messages
  const localMessages = getStore().filter(m => {
    const matchesRoom =
      m.canonicalRoomId === canonicalRoomId ||
      m.sessionId === sessionId ||
      m.sessionId === canonicalRoomId;
    if (!matchesRoom) return false;
    if (m.from === clientId) return false;
    if (m.to !== 'all' && m.to !== clientId && !(role === 'instructor' && m.to === 'instructor')) {
      return false;
    }
    return m.timestamp > since;
  });

  // Pull cloud messages from persistent topic to bridge serverless containers
  let cloudMessages: SignalingMessage[] = [];
  try {
    const ntfyTopic = `vlab_sig_${canonicalRoomId}`;
    const sinceUnix = Math.floor(since / 1000);
    const res = await fetch(`https://ntfy.sh/${ntfyTopic}/json?poll=1&since=${sinceUnix > 0 ? sinceUnix : '30s'}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.event === 'message' && entry.message) {
            const parsed = JSON.parse(entry.message);
            if (parsed && parsed.from !== clientId) {
              cloudMessages.push(parsed);
            }
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  // Deduplicate combined messages
  const seenIds = new Set<string>();
  const combined: SignalingMessage[] = [];

  for (const m of [...localMessages, ...cloudMessages]) {
    const id = m.id || `${m.type}_${m.from}_${m.timestamp}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      combined.push(m);
    }
  }

  return NextResponse.json({
    messages: combined,
    serverTime: Date.now(),
    canonicalRoomId
  });
}
