import { NextRequest, NextResponse } from 'next/server';
import { isSimulationActive, stopStudentSimulation } from '@/lib/simulation/studentSim';

export async function POST(req: NextRequest) {
  if (isSimulationActive()) {
    stopStudentSimulation();
    return NextResponse.json({ active: false, message: 'Simulation stopped' });
  } else {
    return NextResponse.json({
      active: false,
      message: 'Simulation requires a persistent WebSocket server (running via server.ts or external realtime service).'
    });
  }
}
