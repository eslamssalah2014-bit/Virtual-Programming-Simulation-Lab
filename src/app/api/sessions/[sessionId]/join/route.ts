import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await req.json();
    const { studentName, studentRegistrationId } = body;

    if (!studentName || !studentRegistrationId) {
      return NextResponse.json(
        { error: 'Student Name and Student ID are required' },
        { status: 400 }
      );
    }

    const session = dbStore.getSession(params.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const studentState = dbStore.registerStudent(
      params.sessionId,
      studentName.trim(),
      studentRegistrationId.trim()
    );

    return NextResponse.json({
      success: true,
      student: studentState,
      session
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to join session' },
      { status: 500 }
    );
  }
}
