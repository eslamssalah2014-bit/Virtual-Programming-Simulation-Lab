import { NextRequest, NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';
  const report = dbStore.getAttendanceReport(params.sessionId);

  if (format === 'csv') {
    const headers = [
      'Session Name',
      'Student Name',
      'Student ID',
      'Student Email',
      'Join Time',
      'Leave Time',
      'Duration (Mins)',
      'Screen Sharing Status',
      'Screen Share Mins',
      'Hands Raised',
      'Help Requested',
      'Attendance Status'
    ];
    const rows = report.map(r => [
      `"${r.sessionName}"`,
      `"${r.studentName}"`,
      `"${r.studentId}"`,
      `"${r.studentEmail}"`,
      `"${r.joinTime}"`,
      `"${r.leaveTime}"`,
      r.durationMinutes,
      `"${r.screenSharingStatus}"`,
      r.screenSharingDurationMinutes,
      r.handsRaisedCount,
      `"${r.helpRequested}"`,
      `"${r.notes}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendance-${params.sessionId}.csv"`
      }
    });
  }

  return NextResponse.json(report);
}
