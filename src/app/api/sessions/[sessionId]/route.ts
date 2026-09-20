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
  const assignment = session.assignmentId ? dbStore.getAssignment(session.assignmentId) : undefined;
  const course = session.courseId ? dbStore.getCourses().find(c => c.id === session.courseId) : undefined;

  return NextResponse.json({ session, assignment, course });
}
