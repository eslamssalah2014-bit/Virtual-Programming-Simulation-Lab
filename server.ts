import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { registerSocketHandlers } from './src/lib/socket/handlers';
import { dbStore } from './src/lib/db/store';

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
    const participants = dbStore.getParticipants(req.params.id);
    res.json({ session, participants });
  });

  // Get live participants for a session
  app.get('/api/sessions/:id/students', (req, res) => {
    res.json(dbStore.getParticipants(req.params.id));
  });

  // Attendance & export API
  app.get('/api/sessions/:id/attendance', (req, res) => {
    const format = (req.query.format as string) || 'json';
    const report = dbStore.getAttendanceReport(req.params.id);

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
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${req.params.id}.csv"`);
      return res.send(csvContent);
    }

    res.json(report);
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
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
