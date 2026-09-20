import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get('studentId') || undefined;
  const logs = dbStore.getActivityLogs(params.sessionId, studentId);
  return NextResponse.json(logs);
}
