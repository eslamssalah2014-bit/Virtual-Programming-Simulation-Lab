import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET() {
  return NextResponse.json(dbStore.getCourses());
}
