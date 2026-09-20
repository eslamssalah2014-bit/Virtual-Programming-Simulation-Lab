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
      'Student Email',
      'Join Time',
      'Status',
      'Duration (Mins)',
      'Progress %',
      'Tasks Done',
      'Help Requested',
      'Performance Tag',
      'Notes'
    ];
    const rows = report.map(r => [
      `"${r.sessionName}"`,
      `"${r.studentName}"`,
      `"${r.studentEmail}"`,
      `"${r.joinTime}"`,
      `"${r.status}"`,
      r.durationMinutes,
      `${r.progressPercentage}%`,
      r.tasksCompleted,
      `"${r.helpRequested}"`,
      `"${r.instructorTag}"`,
      `"${r.instructorNotes.replace(/"/g, '""')}"`
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
