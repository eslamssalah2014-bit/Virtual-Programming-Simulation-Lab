'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Terminal,
  Plus,
  Tv,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, switchUser, availableUsers } = useAuth();

  const handleOpenCreateModal = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('open-create-session'));
    } else {
      router.push('/?action=create');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#161b22] border-b border-gray-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 font-bold text-white tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight text-white">Virtual Programming Lab</span>
              <span className="text-[10px] text-gray-400 font-normal leading-tight">Educational Simulation System</span>
            </div>
          </Link>

          {/* Operational Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
                pathname === '/'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sessions Dashboard</span>
            </Link>

            <Link
              href="/instructor/sessions/session-101"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
                pathname.startsWith('/instructor/sessions')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Live Student Monitoring</span>
            </Link>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3">
          {/* Primary Action: + Create Session */}
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded-md text-xs flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Session</span>
          </button>

          {/* User / Role Switcher for local test workflows */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md bg-[#0d1117] border border-gray-700/80 hover:border-gray-600 text-xs text-gray-300 transition">
              <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser?.fullName?.[0] || 'U'}
              </div>
              <span className="hidden sm:inline font-medium text-gray-200 max-w-[120px] truncate">
                {currentUser?.fullName}
              </span>
              <span className="text-[10px] text-emerald-400 uppercase font-mono px-1 rounded bg-emerald-500/10">
                {currentUser?.role}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {/* Dropdown for role test switching */}
            <div className="absolute right-0 mt-1 w-56 bg-[#161b22] border border-gray-700 rounded-lg shadow-xl p-1.5 hidden group-hover:block z-50">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-800">
                Switch Test Account
              </div>
              {availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => switchUser(user.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition text-left ${
                    currentUser?.id === user.id
                      ? 'bg-emerald-600/20 text-emerald-300 font-semibold'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{user.fullName}</span>
                    <span className="text-[10px] text-gray-500 capitalize">{user.role}</span>
                  </div>
                  {currentUser?.id === user.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
