import { NextResponse } from 'next/server';
import { isSimulationActive } from '@/lib/simulation/studentSim';

export async function GET() {
  return NextResponse.json({ active: isSimulationActive() });
}
