import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET() {
  return NextResponse.json(dbStore.getAssignments());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newAssignment = dbStore.createAssignment(body);
    return NextResponse.json(newAssignment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}
