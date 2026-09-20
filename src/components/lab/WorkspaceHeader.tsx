'use client';

import React, { useState, useEffect } from 'react';
import { LabSession, Assignment } from '@/types';
import {
  Play,
  CheckCircle2,
  HelpCircle,
  Clock,
  Send,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface WorkspaceHeaderProps {
  session?: LabSession;
  assignment?: Assignment;
  isRunning: boolean;
  onRunCode: () => void;
  onSubmitAssignment: () => void;
  onRequestHelp: () => void;
  isHelpActive: boolean;
  isSubmitted: boolean;
}

export function WorkspaceHeader({
  session,
  assignment,
  isRunning,
  onRunCode,
  onSubmitAssignment,
  onRequestHelp,
  isHelpActive,
  isSubmitted
}: WorkspaceHeaderProps) {
  // Countdown timer simulation (75 minutes remaining)
  const [timeLeft, setTimeLeft] = useState<number>(75 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-[#161b22] border-b border-gray-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
      {/* Left: Lab Info */}
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-white text-base leading-tight">
              {assignment?.title || 'Programming Simulation Lab'}
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {assignment?.language.toUpperCase() || 'PYTHON'}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Session: <span className="text-gray-300 font-medium">{session?.name || 'Session Active'}</span> ({session?.sessionCode || 'PY-101'})
          </p>
        </div>
      </div>

      {/* Middle: Timer & Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>Remaining:</span>
          <span className={`font-semibold ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
            {formatTimer(timeLeft)}
          </span>
        </div>

        {isSubmitted && (
          <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Assignment Submitted</span>
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2.5">
        {/* Help Request Button */}
        <button
          onClick={onRequestHelp}
          disabled={isSubmitted}
          className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition ${
            isHelpActive
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
          }`}
        >
          {isHelpActive ? <AlertTriangle className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
          <span>{isHelpActive ? 'Help Pending (Click to Cancel)' : 'Need Help'}</span>
        </button>

        {/* Run Code Button */}
        <button
          onClick={onRunCode}
          disabled={isRunning}
          className="px-4 py-1.5 rounded-md font-medium text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 transition disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Code</span>
            </>
          )}
        </button>

        {/* Submit Button */}
        <button
          onClick={onSubmitAssignment}
          disabled={isSubmitted}
          className={`px-3.5 py-1.5 rounded-md font-medium text-xs flex items-center space-x-1.5 transition ${
            isSubmitted
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isSubmitted ? 'Submitted' : 'Submit Assignment'}</span>
        </button>
      </div>
    </header>
  );
}
