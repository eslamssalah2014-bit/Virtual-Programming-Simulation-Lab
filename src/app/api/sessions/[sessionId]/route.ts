import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = dbStore.getSession(params.sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  const participants = dbStore.getParticipants(params.sessionId);

  return NextResponse.json({ session, participants });
}
