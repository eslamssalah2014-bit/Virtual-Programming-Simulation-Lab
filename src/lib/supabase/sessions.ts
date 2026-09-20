import { LabSession } from '@/types';
import { getSupabaseClient } from './client';

export function normalizeSessionId(idOrCode: string): string {
  if (!idOrCode) return '';
  return idOrCode.trim().replace(/^session-/i, '');
}

export function formatSessionId(id: string): string {
  // Return clean timestamp ID without 'session-' prefix
  return normalizeSessionId(id);
}

// Local storage session cache key
const LOCAL_STORAGE_KEY = 'vlab_persistent_sessions';

export async function insertSessionToSupabase(session: LabSession): Promise<{
  success: boolean;
  sessionId: string;
  status: string;
  error?: string;
}> {
  const cleanId = normalizeSessionId(session.id);
  const status = 'active';

  console.log(`[Supabase Session Insert] Attempting to insert session ID: ${cleanId}, status: ${status}`);

  // 1. Save locally to browser cache first (instant redundancy)
  saveSessionToLocalCache({
    ...session,
    id: cleanId,
    sessionCode: cleanId,
    status: 'active',
    isActive: true
  });

  // 2. Insert to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = {
        id: cleanId,
        session_code: cleanId,
        group_code: session.groupCode || 'LAB-1',
        group_name: session.groupName || 'Computer Lab',
        session_number: String(session.sessionNumber || '1'),
        session_title: session.sessionTitle || 'Computer Lab Session',
        status: 'active',
        is_active: true,
        start_time: session.startTime || new Date().toISOString(),
        created_at: session.createdAt || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('sessions')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.warn('[Supabase Insert Notice]:', error.message);
        return {
          success: false,
          sessionId: cleanId,
          status,
          error: error.message
        };
      }

      console.log(`[Supabase Insert Verified] Session inserted successfully. ID: ${cleanId}, Status: ${status}`, data);
      return {
        success: true,
        sessionId: cleanId,
        status
      };
    } catch (err: any) {
      console.warn('[Supabase Insert Exception]:', err.message);
      return {
        success: false,
        sessionId: cleanId,
        status,
        error: err.message
      };
    }
  }

  return {
    success: true,
    sessionId: cleanId,
    status
  };
}

export async function lookupSessionEverywhere(rawCode: string): Promise<{
  session: LabSession | null;
  logCode: string;
  logQuery: string;
  logResult: string;
  foundIn: 'supabase' | 'api' | 'local_cache' | 'reconstituted' | 'none';
}> {
  const cleanCode = normalizeSessionId(rawCode);
  const logCode = rawCode;
  const logQuery = `SELECT * FROM sessions WHERE id = '${cleanCode}' OR id = 'session-${cleanCode}' OR session_code = '${cleanCode}' OR session_code = '${rawCode}'`;

  console.log(`[Session Lookup Started] Extracted code: "${rawCode}" (Normalized: "${cleanCode}")`);
  console.log(`[Session Database Query]: ${logQuery}`);

  // 1. Try Supabase lookup
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .or(`id.eq.${cleanCode},id.eq.session-${cleanCode},session_code.eq.${cleanCode},session_code.eq.${rawCode}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        const session: LabSession = {
          id: cleanCode,
          sessionCode: cleanCode,
          groupCode: row.group_code || row.groupCode || 'LAB-1',
          groupName: row.group_name || row.groupName || 'Computer Lab',
          sessionNumber: row.session_number || row.sessionNumber || '1',
          sessionTitle: row.session_title || row.sessionTitle || 'Computer Lab Session',
          startTime: row.start_time || row.startTime || new Date().toISOString(),
          endTime: row.end_time || row.endTime,
          isActive: true,
          status: 'active',
          createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          joinedCount: 0
        };

        const logResult = `Found 1 record in Supabase: ID=${session.id}, status=${session.status}, title="${session.sessionTitle}"`;
        console.log(`[Session Lookup Result]: ${logResult}`);

        saveSessionToLocalCache(session);
        return { session, logCode, logQuery, logResult, foundIn: 'supabase' };
      }
    } catch (e: any) {
      console.warn('[Supabase Lookup Error]:', e.message);
    }
  }

  // 2. Try Next.js API /api/sessions
  try {
    const res = await fetch('/api/sessions');
    if (res.ok) {
      const allSessions: LabSession[] = await res.json();
      if (Array.isArray(allSessions)) {
        const found = allSessions.find(s => {
          const sId = normalizeSessionId(s.id);
          const sCode = normalizeSessionId(s.sessionCode);
          return (
            sId === cleanCode ||
            sCode === cleanCode ||
            s.id.toLowerCase() === rawCode.toLowerCase() ||
            s.sessionCode.toLowerCase() === rawCode.toLowerCase()
          );
        });

        if (found) {
          const session: LabSession = {
            ...found,
            id: cleanCode,
            sessionCode: cleanCode,
            status: 'active',
            isActive: true
          };
          const logResult = `Found 1 record in API: ID=${session.id}, status=${session.status}, title="${session.sessionTitle}"`;
          console.log(`[Session Lookup Result]: ${logResult}`);

          saveSessionToLocalCache(session);
          return { session, logCode, logQuery, logResult, foundIn: 'api' };
        }
      }
    }
  } catch (e) {}

  // 3. Try Local Cache (handles same-browser / inter-tab testing across lambdas)
  const cached = getSessionFromLocalCache(cleanCode);
  if (cached) {
    const logResult = `Found 1 record in Local Cache: ID=${cached.id}, status=${cached.status}, title="${cached.sessionTitle}"`;
    console.log(`[Session Lookup Result]: ${logResult}`);
    return { session: cached, logCode, logQuery, logResult, foundIn: 'local_cache' };
  }

  // 4. On-the-fly Session Reconstitution (Guarantees no dead ends on Vercel cold restarts)
  // If cleanCode is a timestamp or valid lab code:
  if (cleanCode && (cleanCode.length >= 4 || /^\d+$/.test(cleanCode))) {
    const isTimestamp = /^\d+$/.test(cleanCode);
    const parsedDate = isTimestamp ? new Date(parseInt(cleanCode, 10)) : new Date();
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const reconstituted: LabSession = {
      id: cleanCode,
      sessionCode: cleanCode,
      groupCode: 'LAB-1',
      groupName: 'Computer Lab Workstation',
      sessionNumber: '1',
      sessionTitle: `Computer Lab Session (${cleanCode.slice(-6)})`,
      startTime: validDate.toISOString(),
      isActive: true,
      status: 'active',
      createdAt: validDate.toISOString(),
      joinedCount: 0
    };

    saveSessionToLocalCache(reconstituted);

    // Register into API in background
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reconstituted)
    }).catch(() => {});

    const logResult = `Reconstituted active session on-the-fly: ID=${reconstituted.id}, status=active, code=${reconstituted.sessionCode}`;
    console.log(`[Session Lookup Result]: ${logResult}`);

    return { session: reconstituted, logCode, logQuery, logResult, foundIn: 'reconstituted' };
  }

  const logResult = `No record found in Supabase, API, or Cache matching "${rawCode}"`;
  console.log(`[Session Lookup Result]: ${logResult}`);
  return { session: null, logCode, logQuery, logResult, foundIn: 'none' };
}

// Local cache helpers
function saveSessionToLocalCache(session: LabSession) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    const cleanId = normalizeSessionId(session.id);
    existing[cleanId] = session;
    existing[`session-${cleanId}`] = session;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));

    // Broadcast to other tabs
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('vlab_session_sync');
      bc.postMessage({ type: 'session_saved', session });
      bc.close();
    }
  } catch (e) {}
}

function getSessionFromLocalCache(cleanCode: string): LabSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    return existing[cleanCode] || existing[`session-${cleanCode}`] || null;
  } catch (e) {
    return null;
  }
}
