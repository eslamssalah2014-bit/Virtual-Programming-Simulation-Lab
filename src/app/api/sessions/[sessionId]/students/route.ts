import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const students = dbStore.getStudentStatesForSession(params.sessionId);
  return NextResponse.json(students);
}
