import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const participants = dbStore.getParticipants(params.sessionId);
  return NextResponse.json(participants);
}
