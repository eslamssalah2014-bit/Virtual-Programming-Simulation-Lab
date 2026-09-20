'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Code2,
  Tv,
  FileCode,
  BarChart3,
  ShieldCheck,
  Zap,
  Play,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Activity,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  const { currentUser, switchUser, isSimulationActive, toggleSimulation } = useAuth();

  return (
    <div className="flex-1 bg-[#0d1117] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-gray-800 py-16 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Virtual Programming Simulation Lab • Phase 1 Active</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Simulate Real Classroom Labs with{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Live Keystroke Monitoring
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Students code directly in the browser via Monaco Editor and WebAssembly runtimes. Instructors inspect workspaces, track timelines, and answer help requests in real time without page reloads.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/instructor/sessions/session-101"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-bold text-sm text-white shadow-lg shadow-cyan-900/30 flex items-center space-x-2 transition"
            >
              <Tv className="w-4 h-4" />
              <span>Open Instructor Live Monitor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/lab/session-101"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition"
            >
              <Code2 className="w-4 h-4" />
              <span>Enter Student Coding Lab</span>
            </Link>

            <button
              onClick={toggleSimulation}
              className={`px-5 py-3 rounded-xl border text-sm font-semibold flex items-center space-x-2 transition ${
                isSimulationActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-gray-800/80 hover:bg-gray-800 text-gray-300 border-gray-700'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulationActive ? 'Stop Live Student Sim' : 'Launch Demo Sim Activity'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Role Navigation Cards */}
      <section className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">System Portals & Experiences</h2>
          <p className="text-xs text-gray-400">
            Explore both sides of the classroom or manage curriculum as an administrator:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Student Workspace */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-emerald-500/40 transition group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Student Lab Workspace</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Full in-browser coding environment equipped with Monaco Editor, Pyodide Python WASM runner, multi-file explorer, activity logging, and the "Need Help" emergency queue.
              </p>
              <ul className="text-xs text-gray-300 space-y-1.5 pt-2">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Python, JavaScript & HTML/CSS support</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-save & live WebSocket broadcast</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Terminal & task completion checklist</span>
                </li>
              </ul>
            </div>

            <Link
              href="/lab/session-101"
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white text-center transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>Launch Student Lab (Alex Chen)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Instructor Live Monitoring */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-cyan-500/40 transition group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Instructor Live Monitor</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Supervise active students with zero-latency keystroke updates, live terminal error inspection, activity timelines, help queue priority alerts, and evaluation tagging.
              </p>
              <ul className="text-xs text-gray-300 space-y-1.5 pt-2">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live Student Grid (Active, Idle, Disconnected)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Focus Student Panel (Mirrored Monaco Editor)</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Instructor Notes & CSV Attendance Export</span>
                </li>
              </ul>
            </div>

            <Link
              href="/instructor/sessions/session-101"
              className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white text-center transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>Open Monitor (Dr. Jenkins)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Admin & Analytics */}
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-5 hover:border-purple-500/40 transition group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Analytics & Administration</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Review attendance duration curves, assignment submission percentages, student engagement scores, and manage course curriculum and user roles.
              </p>
              <ul className="text-xs text-gray-300 space-y-1.5 pt-2">
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Real-time duration & attendance calculation</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reusable assignment & template creator</span>
                </li>
                <li className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Extensible Phase 2 Docker architecture</span>
                </li>
              </ul>
            </div>

            <Link
              href="/instructor/analytics"
              className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white text-center transition flex items-center justify-center space-x-2 shadow-sm"
            >
              <span>View Analytics & Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
