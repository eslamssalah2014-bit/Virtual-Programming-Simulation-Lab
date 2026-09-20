'use client';

import React, { useState, useEffect } from 'react';
import { User, LabSession } from '@/types';
import {
  ShieldCheck,
  Users,
  Tv,
  MonitorPlay,
  Download,
  CheckCircle2,
  Calendar,
  Radio
} from 'lucide-react';
import Link from 'next/link';

export default function AdminControlPanelPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'sessions'>('users');

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setUsers(d))
      .catch(() => {});
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setSessions(d))
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 bg-[#0d1117] p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Virtual Computer Lab Administration & Governance</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Global management of student workstations, instructors, screen monitoring sessions, and attendance reports.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/api/sessions/session-101/attendance?format=csv"
            download
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold flex items-center space-x-2 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Master Attendance CSV</span>
          </a>
        </div>
      </div>

      {/* Admin Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Enrolled Lab Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{users.length}</div>
          <span className="text-[10px] text-gray-400">
            {users.filter(u => u.role === 'student').length} Students, {users.filter(u => u.role === 'instructor').length} Instructors
          </span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Total Lab Sessions</span>
            <Tv className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{sessions.length}</div>
          <span className="text-[10px] text-emerald-400">Scheduled & Completed</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Live Screen Monitors</span>
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {sessions.filter(s => s.isActive).length}
          </div>
          <span className="text-[10px] text-amber-400">WebRTC Screen Feeds Active</span>
        </div>

        <div className="bg-[#161b22] border border-gray-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Lab Workstations</span>
            <MonitorPlay className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">24</div>
          <span className="text-[10px] text-purple-400">Lab-A & Lab-B Operational</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-[#161b22] rounded-t-xl px-2 pt-2 text-xs">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'sessions'
              ? 'border-cyan-500 text-cyan-400 font-bold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Lab Sessions & Feeds</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-[#161b22] border border-t-0 border-gray-800 rounded-b-xl overflow-hidden">
        {activeTab === 'users' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/40">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center font-bold text-white text-xs">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                        ) : (
                          u.fullName[0]
                        )}
                      </div>
                      <span className="font-semibold text-white">{u.fullName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300'
                            : u.role === 'instructor'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4">Group Code</th>
                  <th className="py-3 px-4">Scheduled Start</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/40">
                    <td className="py-3 px-4 font-semibold text-white">{s.sessionTitle}</td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{s.sessionCode}</td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      {s.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active Monitoring
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400">
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/instructor/sessions/${s.id}`}
                        className="px-3 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-semibold transition inline-flex items-center space-x-1"
                      >
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>Open Dashboard</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
