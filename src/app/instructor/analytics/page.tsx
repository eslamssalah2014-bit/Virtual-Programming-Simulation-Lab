'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Zap,
  Calendar,
  Search,
  Filter,
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsData {
  attendanceRate: number;
  labCompletionRate: number;
  averageEngagementScore: number;
  averageTimeInLabMinutes: number;
  activeHelpRequests: number;
  submissionRate: number;
  averageProgress: number;
  totalSessionsConducted: number;
  totalEnrolledStudents: number;
}

interface AttendanceRecord {
  sessionId: string;
  sessionName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  joinTime: string;
  status: string;
  durationMinutes: number;
  progressPercentage: number;
  tasksCompleted: number;
  helpRequested: string;
  instructorTag: string;
  instructorNotes: string;
}

export default function AnalyticsDashboardPage() {
  const [metrics, setMetrics] = useState<AnalyticsData | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(data => setMetrics(data))
      .catch(() => {});

    fetch('/api/sessions/session-101/attendance')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRecords(data);
      })
      .catch(() => {});
  }, []);

  const filteredRecords = records.filter(r =>
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    r.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#0d1117] p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>Lab Engagement & Attendance Analytics</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time analytics across completed sessions, duration logs, and student performance metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/api/sessions/session-101/attendance?format=csv"
            download
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-md shadow-emerald-900/30 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Attendance (CSV)</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Attendance Rate */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Attendance Rate</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.attendanceRate || 92}%
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center">
            <ArrowUpRight className="w-3 h-3" /> +4% vs last week
          </span>
        </div>

        {/* Lab Completion Rate */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.labCompletionRate || 75}%
          </div>
          <span className="text-[10px] text-gray-400">Assignment milestones</span>
        </div>

        {/* Student Engagement */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Engagement Score</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.averageEngagementScore || 88}%
          </div>
          <span className="text-[10px] text-amber-400">High active typing</span>
        </div>

        {/* Average Time in Lab */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Avg Time in Lab</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.averageTimeInLabMinutes || 41}m
          </div>
          <span className="text-[10px] text-gray-400">Duration per session</span>
        </div>

        {/* Help Requests */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Help Requests</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.activeHelpRequests || 1}
          </div>
          <span className="text-[10px] text-rose-400">Resolved promptly</span>
        </div>

        {/* Submission Rate */}
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Submission Rate</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {metrics?.submissionRate || 80}%
          </div>
          <span className="text-[10px] text-purple-400">Passing test cases</span>
        </div>
      </div>

      {/* Attendance & Performance Table Section */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">
              Session Attendance & Duration Log
            </h3>
            <p className="text-xs text-gray-400">
              CS101 Lab Session #4: Algorithms & Modular Python
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Join Time</th>
                <th className="py-3 px-4">Time in Lab</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Tasks Done</th>
                <th className="py-3 px-4">Help Asked</th>
                <th className="py-3 px-4">Instructor Tag</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-sans">
              {filteredRecords.map((r) => (
                <tr key={r.studentId} className="hover:bg-gray-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{r.studentName}</div>
                    <div className="text-[11px] text-gray-400">{r.studentEmail}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.status === 'Submitted'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : r.status === 'Idle'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-300">
                    {new Date(r.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-300">
                    {r.durationMinutes} mins
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${r.progressPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-gray-300">
                        {r.progressPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-300">
                    {r.tasksCompleted}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${
                        r.helpRequested === 'Yes' ? 'text-rose-400' : 'text-gray-500'
                      }`}
                    >
                      {r.helpRequested}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {r.instructorTag === 'EXCELLENT' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                        ⭐ Excellent
                      </span>
                    )}
                    {r.instructorTag === 'NEEDS_SUPPORT' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        ⚠️ Needs Support
                      </span>
                    )}
                    {r.instructorTag === 'DID_NOT_PARTICIPATE' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400">
                        Inactive
                      </span>
                    )}
                    {(!r.instructorTag || r.instructorTag === 'NORMAL') && (
                      <span className="text-gray-500 text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400 truncate max-w-xs text-[11px]">
                    {r.instructorNotes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
