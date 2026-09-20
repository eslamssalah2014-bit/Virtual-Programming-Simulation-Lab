import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { registerSocketHandlers } from './src/lib/socket/handlers';
import { dbStore } from './src/lib/db/store';
import { startStudentSimulation, stopStudentSimulation, isSimulationActive } from './src/lib/simulation/studentSim';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

async function bootstrap() {
  await nextApp.prepare();

  const app = express();
  const server = createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(express.json());

  // Socket.IO registration
  registerSocketHandlers(io);

  // REST API Endpoints

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Get current user info / mock session
  app.get('/api/users', (req, res) => {
    res.json(dbStore.getUsers());
  });

  // Get courses
  app.get('/api/courses', (req, res) => {
    res.json(dbStore.getCourses());
  });

  // Get assignments
  app.get('/api/assignments', (req, res) => {
    res.json(dbStore.getAssignments());
  });

  app.post('/api/assignments', (req, res) => {
    const newAssignment = dbStore.createAssignment(req.body);
    res.status(201).json(newAssignment);
  });

  // Get sessions
  app.get('/api/sessions', (req, res) => {
    res.json(dbStore.getSessions());
  });

  app.post('/api/sessions', (req, res) => {
    const newSession = dbStore.createSession(req.body);
    res.status(201).json(newSession);
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = dbStore.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const assignment = dbStore.getAssignment(session.assignmentId);
    const course = dbStore.getCourses().find(c => c.id === session.courseId);
    res.json({ session, assignment, course });
  });

  // Get live students for a session
  app.get('/api/sessions/:id/students', (req, res) => {
    res.json(dbStore.getStudentStatesForSession(req.params.id));
  });

  // Get student activity timeline logs
  app.get('/api/sessions/:id/activity', (req, res) => {
    const studentId = req.query.studentId as string | undefined;
    res.json(dbStore.getActivityLogs(req.params.id, studentId));
  });

  // Attendance & export API
  app.get('/api/sessions/:id/attendance', (req, res) => {
    const format = (req.query.format as string) || 'json';
    const report = dbStore.getAttendanceReport(req.params.id);

    if (format === 'csv') {
      const headers = ['Session Name', 'Student Name', 'Student Email', 'Join Time', 'Status', 'Duration (Mins)', 'Progress %', 'Tasks Done', 'Help Requested', 'Performance Tag', 'Notes'];
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
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${req.params.id}.csv"`);
      return res.send(csvContent);
    }

    res.json(report);
  });

  // Simulation Toggle (for live interactive instructor demo)
  app.get('/api/simulation/status', (req, res) => {
    res.json({ active: isSimulationActive() });
  });

  app.post('/api/simulation/toggle', (req, res) => {
    const { sessionId } = req.body;
    if (isSimulationActive()) {
      stopStudentSimulation();
      res.json({ active: false, message: 'Simulation stopped' });
    } else {
      startStudentSimulation(io, sessionId || 'session-101');
      res.json({ active: true, message: 'Live multi-student simulation started' });
    }
  });

  // Analytics Metrics
  app.get('/api/analytics', (req, res) => {
    const students = dbStore.getStudentStatesForSession('session-101');
    const totalStudents = students.length;
    const activeCount = students.filter(s => s.status === 'Active').length;
    const submittedCount = students.filter(s => s.status === 'Submitted').length;
    const helpRequestsCount = students.filter(s => s.helpRequest !== null).length;
    const avgProgress = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.progressPercentage, 0) / totalStudents)
      : 0;
    const avgDurationMinutes = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + s.timeInLabSeconds, 0) / totalStudents / 60)
      : 0;

    res.json({
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
  });

  // Let Next.js handle all remaining frontend routes
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Virtual Programming Simulation Lab Server running on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
