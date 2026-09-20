'use client';

import React, { useState, useEffect } from 'react';
import { LiveStudentState, ActivityLog } from '@/types';
import { MonacoCodeEditor } from '@/components/lab/MonacoCodeEditor';
import {
  X,
  FileCode,
  Clock,
  Play,
  Activity,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  Hash,
  Sparkles
} from 'lucide-react';

interface FocusStudentPanelProps {
  student: LiveStudentState;
  sessionId: string;
  onClose: () => void;
  onResolveHelp: (studentId: string) => void;
}

export function FocusStudentPanel({
  student,
  sessionId,
  onClose,
  onResolveHelp
}: FocusStudentPanelProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(
    student.currentFileId || student.files[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'timeline' | 'terminal'>('timeline');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Sync selectedFileId if student changes file
  useEffect(() => {
    if (student.currentFileId && (!selectedFileId || !student.files.some(f => f.id === selectedFileId))) {
      setSelectedFileId(student.currentFileId);
    }
  }, [student.currentFileId, student.files, selectedFileId]);

  // Fetch student timeline logs
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/activity?studentId=${student.studentId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setActivityLogs(data);
      })
      .catch(() => {});
  }, [sessionId, student.studentId]);

  const activeFile = student.files.find(f => f.id === selectedFileId) || student.files[0];
  const openFileName = student.currentFileName || activeFile?.name || 'main.py';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const hasHelpPending = !!student.helpRequest && student.helpRequest.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      {/* Slide-over Drawer */}
      <div className="w-full sm:w-[580px] md:w-[720px] bg-[#161b22] border-l border-gray-700 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-gray-800 bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700/50 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-sm">
              {student.studentName ? student.studentName[0] : 'S'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base leading-none">{student.studentName}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    student.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : student.status === 'Idle'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : student.status === 'Submitted'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {student.status}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400 font-mono">
                <span>ID: {student.studentRegistrationId || student.studentId}</span>
                {student.studentEmail && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500 font-sans">{student.studentEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Help Alert if applicable */}
        {hasHelpPending && (
          <div className="bg-rose-950/40 border-b border-rose-500/40 px-5 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Help Requested:</strong> {student.helpRequest?.message}
              </span>
            </div>
            <button
              onClick={() => onResolveHelp(student.studentId)}
              className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition shrink-0 ml-3"
            >
              Resolve Help
            </button>
          </div>
        )}

        {/* Operational Overview Metrics */}
        <div className="grid grid-cols-4 gap-2 px-5 py-3 bg-[#11161d] border-b border-gray-800 text-xs">
          <div className="bg-[#161b22] p-2.5 rounded-lg border border-gray-800">
            <div className="text-[10px] uppercase font-semibold text-gray-400 flex items-center space-x-1">
              <FileCode className="w-3 h-3 text-cyan-400" />
              <span>Open File</span>
            </div>
            <div className="font-mono text-gray-200 font-medium truncate mt-1">{openFileName}</div>
          </div>

          <div className="bg-[#161b22] p-2.5 rounded-lg border border-gray-800">
            <div className="text-[10px] uppercase font-semibold text-gray-400 flex items-center space-x-1">
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Run Count</span>
            </div>
            <div className="font-mono text-emerald-400 font-bold mt-1">
              {student.runCount !== undefined ? student.runCount : 0} runs
            </div>
          </div>

          <div className="bg-[#161b22] p-2.5 rounded-lg border border-gray-800">
            <div className="text-[10px] uppercase font-semibold text-gray-400 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Time in Session</span>
            </div>
            <div className="font-mono text-gray-200 font-medium mt-1">
              {formatDuration(student.timeInLabSeconds || 0)}
            </div>
          </div>

          <div className="bg-[#161b22] p-2.5 rounded-lg border border-gray-800">
            <div className="text-[10px] uppercase font-semibold text-gray-400 flex items-center space-x-1">
              <Activity className="w-3 h-3 text-purple-400" />
              <span>Last Activity</span>
            </div>
            <div className="text-gray-300 font-medium truncate mt-1 text-[11px]" title={student.lastActivity}>
              {student.lastActivity || 'Active in lab'}
            </div>
          </div>
        </div>

        {/* File Tabs if student has multiple files */}
        {student.files.length > 1 && (
          <div className="px-5 py-1.5 bg-[#0d1117] border-b border-gray-800 flex items-center space-x-1 overflow-x-auto">
            {student.files.map(file => (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`px-3 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition ${
                  selectedFileId === file.id
                    ? 'bg-gray-800 text-white border border-gray-700 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-850'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{file.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Current Code Monaco Editor (Live Mirror) */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800 relative">
          <div className="px-4 py-1.5 bg-[#12161f] border-b border-gray-800/80 flex items-center justify-between text-xs text-gray-400 font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-gray-300 font-semibold">Live Keystroke Mirror</span>
              <span>—</span>
              <span>{openFileName}</span>
            </div>
            <span className="text-[11px] text-gray-500">Read-only live stream</span>
          </div>

          <div className="flex-1 bg-[#1e1e1e] overflow-hidden">
            {activeFile ? (
              <MonacoCodeEditor
                file={activeFile}
                value={activeFile.content}
                isReadOnly={true}
                onChange={() => {}}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                No active code file selected.
              </div>
            )}
          </div>
        </div>

        {/* Bottom Panel: Activity Timeline & Terminal Output */}
        <div className="h-56 bg-[#0d1117] flex flex-col">
          {/* Tab Selection */}
          <div className="px-4 border-b border-gray-800 flex items-center space-x-4 text-xs bg-[#12161f]">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-2 border-b-2 font-medium flex items-center space-x-1.5 transition ${
                activeTab === 'timeline'
                  ? 'border-emerald-500 text-emerald-300 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Activity Timeline ({activityLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`py-2 border-b-2 font-medium flex items-center space-x-1.5 transition ${
                activeTab === 'terminal'
                  ? 'border-emerald-500 text-emerald-300 font-semibold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Terminal Trace</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'timeline' ? (
              activityLogs.length === 0 ? (
                <div className="text-xs text-gray-500 italic text-center py-6">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-gray-200">{log.description}</span>
                        <span className="text-[10px] text-gray-500 ml-2 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                {student.terminalOutput || 'No program executions logged yet.'}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
