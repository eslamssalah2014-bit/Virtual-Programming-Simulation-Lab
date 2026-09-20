'use client';

import React from 'react';
import { LiveStudentState } from '@/types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Maximize2,
  Bookmark,
  Check,
  Zap
} from 'lucide-react';

interface StudentCardProps {
  student: LiveStudentState;
  onFocus: (student: LiveStudentState) => void;
}

export function StudentCard({ student, onFocus }: StudentCardProps) {
  const getStatusBadge = () => {
    switch (student.status) {
      case 'Active':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active</span>
          </span>
        );
      case 'Idle':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Idle</span>
          </span>
        );
      case 'Submitted':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span>Submitted</span>
          </span>
        );
      case 'Disconnected':
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span>Disconnected</span>
          </span>
        );
    }
  };

  const getTagBadge = () => {
    if (!student.instructorNote?.tag || student.instructorNote.tag === 'NORMAL') return null;
    const tag = student.instructorNote.tag;
    if (tag === 'EXCELLENT') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          ⭐ Excellent
        </span>
      );
    }
    if (tag === 'NEEDS_SUPPORT') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          ⚠️ Needs Support
        </span>
      );
    }
    if (tag === 'DID_NOT_PARTICIPATE') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-300">
          Inactive
        </span>
      );
    }
    return null;
  };

  const hasPendingHelp = !!student.helpRequest && student.helpRequest.status === 'pending';

  return (
    <div
      className={`rounded-xl bg-[#161b22] border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
        hasPendingHelp
          ? 'border-rose-500 shadow-rose-500/10 ring-1 ring-rose-500'
          : 'border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Top Card Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-700 bg-gray-800 shrink-0">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.studentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">
                  {student.studentName[0]}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-sm leading-tight">
                  {student.studentName}
                </h3>
                {getTagBadge()}
              </div>
              <p className="text-xs text-gray-400 truncate max-w-[150px]">
                {student.studentEmail}
              </p>
            </div>
          </div>

          <div>{getStatusBadge()}</div>
        </div>

        {/* Urgent Help Request Notification Banner */}
        {hasPendingHelp && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-lg p-2 flex items-start space-x-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[11px] font-bold text-rose-300 uppercase block tracking-wider">
                Help Requested
              </span>
              <p className="text-xs text-rose-200/90 line-clamp-2">
                "{student.helpRequest?.message || 'Needs assistance with lab code'}"
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400 text-[11px]">Lab Progress</span>
            <span className="font-mono font-bold text-emerald-400 text-[11px]">
              {student.progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${student.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Live Snippet / Last Activity */}
        <div className="bg-gray-900/60 rounded-lg p-2 text-xs border border-gray-800/80 font-mono">
          <div className="text-[10px] text-gray-500 flex items-center justify-between mb-1">
            <span>LAST ACTIVITY</span>
            <span className="text-gray-400 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>
                {student.timeInLabSeconds > 0
                  ? `${Math.round(student.timeInLabSeconds / 60)}m in lab`
                  : 'Just joined'}
              </span>
            </span>
          </div>
          <p className="text-gray-300 truncate text-[11px]">
            {student.lastActivity || 'Active in workspace'}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-[#12161c] px-4 py-2.5 border-t border-gray-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] text-gray-400">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>{student.files?.length || 1} files</span>
        </div>

        <button
          onClick={() => onFocus(student)}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
            hasPendingHelp
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
              : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Focus Student</span>
        </button>
      </div>
    </div>
  );
}
