'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Code2,
  Tv,
  FileCode,
  ShieldCheck,
  BarChart3,
  Users,
  Play,
  Square,
  Sparkles
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, switchUser, availableUsers, isSimulationActive, toggleSimulation } = useAuth();

  const isLabActive = pathname.startsWith('/lab');

  return (
    <header className="sticky top-0 z-50 bg-[#161b22] border-b border-gray-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 font-bold text-white tracking-wide">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              VLab Simulation
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/lab/session-101"
              className={`px-3 py-1.5 rounded-md transition font-medium flex items-center space-x-1.5 ${
                pathname.startsWith('/lab')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Student Lab</span>
            </Link>

            <Link
              href="/instructor/sessions/session-101"
              className={`px-3 py-1.5 rounded-md transition font-medium flex items-center space-x-1.5 ${
                pathname.startsWith('/instructor/sessions')
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Live Monitor</span>
            </Link>

            <Link
              href="/instructor/assignments"
              className={`px-3 py-1.5 rounded-md transition font-medium flex items-center space-x-1.5 ${
                pathname === '/instructor/assignments'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Assignments</span>
            </Link>

            <Link
              href="/instructor/analytics"
              className={`px-3 py-1.5 rounded-md transition font-medium flex items-center space-x-1.5 ${
                pathname.startsWith('/instructor/analytics')
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-md transition font-medium flex items-center space-x-1.5 ${
                pathname.startsWith('/admin')
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3">
          {/* Live Simulator Button */}
          <button
            onClick={toggleSimulation}
            title="Toggle background student simulation (useful to demo live instructor monitoring)"
            className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
              isSimulationActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
            }`}
          >
            {isSimulationActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isSimulationActive ? 'Stop Live Sim' : 'Demo Sim Activity'}</span>
          </button>

          {/* Role & User Switcher */}
          <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg">
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Role:</span>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              <optgroup label="Students">
                {availableUsers.filter(u => u.role === 'student').map(u => (
                  <option key={u.id} value={u.id} className="bg-gray-900 text-gray-200">
                    🎓 {u.fullName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Instructors">
                {availableUsers.filter(u => u.role === 'instructor').map(u => (
                  <option key={u.id} value={u.id} className="bg-gray-900 text-gray-200">
                    👨‍🏫 {u.fullName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Administration">
                {availableUsers.filter(u => u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id} className="bg-gray-900 text-gray-200">
                    🛡️ {u.fullName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* User badge */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-700 relative shrink-0">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                {currentUser.fullName[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
