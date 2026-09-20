# Virtual Programming Simulation Lab (Instructor Monitoring System)

A web-based programming laboratory platform simulating a physical classroom environment where students can join coding labs, write code, run tests, and be monitored by instructors in real time.

---

## 🌟 Key Features

### 1. Student Lab Experience
- **Browser-based Monaco Editor**: VS Code engine with syntax highlighting, autocomplete, auto-save, bracket pair colorization, and multi-file management.
- **In-Browser Execution Engine (Phase 1)**:
  - **Python 3**: Runs via Pyodide WebAssembly with multi-file VFS support (e.g. `main.py` can import `utils.py`).
  - **JavaScript**: Sandboxed runner capturing `console.log`, `console.error`, and runtime errors.
  - **HTML / CSS**: Live sandboxed iframe preview with hot reload.
- **Activity Telemetry**: Real-time event tracking (`JOINED_LAB`, `STARTED_TYPING`, `CREATED_FILE`, `EDITED_FILE`, `EXECUTED_CODE`, `SUBMITTED_ASSIGNMENT`, `REQUESTED_HELP`).
- **Need Help System**: Instant help beacon that notifies instructors, marks the student in the priority queue, and transmits their exact error/question.
- **Progress Tracking**: Checklist tasks dynamically recalculate completion percentage.

### 2. Instructor Live Monitoring Dashboard
- **Real-Time Student Grid**: Displays all students with live status indicators:
  - **Active** (pulsing green dot)
  - **Idle** (amber dot)
  - **Disconnected** (gray dot)
  - **Submitted** (blue badge)
- **Focus Student Mode**:
  - **Live Keystroke Mirroring**: View student's Monaco Editor code in real time as they type via WebSockets with zero page refresh.
  - **File Explorer**: Inspect all files in the student's workspace.
  - **Live Terminal Mirror**: See real-time stdout/stderr and error traces.
  - **Activity Timeline**: Chronological event history.
  - **Instructor Notes & Tags**: Label students with evaluation tags (`EXCELLENT`, `NEEDS_SUPPORT`, `DID_NOT_PARTICIPATE`) and save private feedback.
  - **Help Resolution**: Resolve pending help requests directly from the inspection panel.
- **Built-in Student Simulation Engine**: Toggle background student activity to demo multi-student typing, errors, and help requests live.

### 3. Curriculum & Session Management
- **Reusable Assignments**: Instructors can create assignments with Markdown instructions, starter files, and task checklists.
- **Session Launching**: Launch active lab sessions with custom codes (e.g. `PY-101`) and shareable invite links.

### 4. Attendance & Analytics
- **Duration Tracking**: Automatic recording of join time, active duration, and progress.
- **Attendance Export**: One-click download of attendance logs in CSV format.
- **Analytics KPIs**: Attendance rate, lab completion rate, engagement score, average duration, help request metrics.

### 5. Admin Control Panel
- Global overview of users, courses, assignments, and sessions.

---

## 🛠️ Architecture & Tech Stack

```
Frontend:     Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
Code Editor:  Monaco Editor (@monaco-editor/react)
Backend:      Node.js + Express + Socket.IO
Database:     Supabase PostgreSQL Schema (with in-memory/JSON store fallback for zero-config run)
Exec Engine:  Pyodide (Python WASM) + Web Worker Sandbox + Pluggable DockerRunner Interface
```

### Phase 2 Container Extensibility
The platform is built with a pluggable `ICodeRunner` interface (`src/lib/runner/types.ts` & `src/lib/runner/index.ts`). A stubbed `DockerContainerRunner` is already defined, allowing future drop-in support for Docker containers, Piston runners, and code-server instances without refactoring the frontend or realtime state machine.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node v24.19)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 Interactive Demo Walkthrough

1. **Top Navbar Role Switcher**:
   - Switch between **Dr. Sarah Jenkins** (Instructor), **Alex Chen** (Student), **Maya Patel** (Student with active help request), or **System Administrator**.
2. **Student Lab Workspace** (`/lab/session-101`):
   - Edit code in `main.py` or `utils.py`.
   - Click **Run Code** to execute Python directly in the browser and see the terminal output.
   - Click **Need Help** to raise an urgent instructor alert.
3. **Instructor Live Monitor** (`/instructor/sessions/session-101`):
   - Watch the live grid of students.
   - Click **Focus Student** on any student to open the live mirrored Monaco Editor.
   - Click **Demo Sim Activity** in the top navigation bar to watch Maya and Liam code and run programs automatically in real time!
4. **Attendance Export & Analytics** (`/instructor/analytics`):
   - Review attendance duration and download the CSV report.

---

## 🗄️ Supabase PostgreSQL Setup (Optional)
To deploy the database to Supabase:
1. Create a project in [Supabase](https://supabase.com).
2. Go to the SQL Editor and execute the schema script located at:
   `supabase/schema.sql`
3. Add your Supabase project URL and anon key to a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
*(By default, the application runs out-of-the-box with the embedded high-fidelity store and seed data).*
