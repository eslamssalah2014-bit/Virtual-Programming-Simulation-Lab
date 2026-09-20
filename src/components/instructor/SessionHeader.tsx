'use client';

import React, { useState } from 'react';
import { LabSession, Course, LiveStudentState } from '@/types';
import {
  Tv,
  Users,
  AlertCircle,
  Copy,
  Check,
  Play,
  Square,
  Clock,
  Download,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface SessionHeaderProps {
  session?: LabSession;
  course?: Course;
  students: LiveStudentState[];
  isSimulationActive: boolean;
  onToggleSimulation: () => void;
  pendingHelpCount: number;
}

export function SessionHeader({
  session,
  course,
  students,
  isSimulationActive,
  onToggleSimulation,
  pendingHelpCount
}: SessionHeaderProps) {
  const [copied, setCopied] = useState(false);

  const activeCount = students.filter(s => s.status === 'Active').length;
  const submittedCount = students.filter(s => s.status === 'Submitted').length;

  const copyLabLink = () => {
    if (typeof window !== 'undefined' && session) {
      const url = `${window.location.origin}/lab/${session.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#161b22] border-b border-gray-800 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Session & Course info */}
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {course?.code || 'CS101'}
            </span>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {session?.name || 'Live Laboratory Session'}
            </h1>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE MONITORING</span>
            </span>
          </div>

          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
            <span>
              Session Code:{' '}
              <span className="font-mono text-gray-200 font-semibold">
                {session?.sessionCode || 'PY-101'}
              </span>
            </span>
            <span>•</span>
            <button
              onClick={copyLabLink}
              className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Copy Student Invite Link'}</span>
            </button>
            <span>•</span>
            <Link
              href={`/lab/${session?.id || 'session-101'}`}
              target="_blank"
              className="flex items-center space-x-1 text-gray-400 hover:text-white"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Student View</span>
            </Link>
          </div>
        </div>

        {/* Right: Key Session KPIs & Controls */}
        <div className="flex items-center space-x-3">
          {/* Active students pill */}
          <div className="bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-lg flex items-center space-x-2 text-xs">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-400">Enrolled:</span>
            <span className="font-bold text-white">{students.length}</span>
            <span className="text-emerald-400 font-medium">({activeCount} Active)</span>
          </div>

          {/* Help Requests Pill */}
          <div
            className={`border px-3.5 py-1.5 rounded-lg flex items-center space-x-2 text-xs transition ${
              pendingHelpCount > 0
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-gray-900 border-gray-800 text-gray-400'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Help Queue:</span>
            <span className="font-bold text-white font-mono">{pendingHelpCount}</span>
          </div>

          {/* Export Attendance */}
          <a
            href={`/api/sessions/${session?.id || 'session-101'}/attendance?format=csv`}
            download
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-medium transition"
            title="Download CSV Attendance Log"
          >
            <Download className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Export Attendance</span>
          </a>

          {/* Simulation Toggle */}
          <button
            onClick={onToggleSimulation}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              isSimulationActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
            }`}
          >
            {isSimulationActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isSimulationActive ? 'Stop Sim Activity' : 'Start Sim Activity'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
