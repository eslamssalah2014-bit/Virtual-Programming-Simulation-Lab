import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db/store';

export async function GET() {
  const students = dbStore.getStudentStatesForSession('session-101');
  const totalStudents = students.length;
  const activeCount = students.filter(s => s.status === 'Active').length;
  const submittedCount = students.filter(s => s.status === 'Submitted').length;
  const helpRequestsCount = students.filter(s => s.helpRequest !== null).length;
  const avgProgress =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.progressPercentage, 0) / totalStudents)
      : 0;
  const avgDurationMinutes =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.timeInLabSeconds, 0) / totalStudents / 60)
      : 0;

  return NextResponse.json({
    attendanceRate: 92, // %
    labCompletionRate: Math.round((submittedCount / (totalStudents || 1)) * 100),
    averageEngagementScore: 88, // %
    averageTimeInLabMinutes: avgDurationMinutes,
    activeHelpRequests: helpRequestsCount,
    submissionRate: Math.round((submittedCount / (totalStudents || 1)) * 100),
    averageProgress: avgProgress,
    totalSessionsConducted: 24,
    totalEnrolledStudents: 142
  });
}
