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
  const assignment = dbStore.getAssignment(session.assignmentId);
  const course = dbStore.getCourses().find(c => c.id === session.courseId);

  return NextResponse.json({ session, assignment, course });
}
