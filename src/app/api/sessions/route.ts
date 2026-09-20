import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET() {
  return NextResponse.json(dbStore.getSessions());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newSession = dbStore.createSession(body);
    return NextResponse.json(newSession, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}
