'use client';

import React, { useState, useEffect } from 'react';
import { LiveStudentState, PerformanceTag, ActivityLog, CodeFile } from '@/types';
import { MonacoCodeEditor } from '@/components/lab/MonacoCodeEditor';
import {
  X,
  FileCode,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Send,
  Clock,
  Zap,
  Bookmark,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { getSocket } from '@/lib/socket/client';

interface FocusStudentPanelProps {
  student: LiveStudentState;
  sessionId: string;
  onClose: () => void;
  onResolveHelp: (studentId: string) => void;
  onSaveNote: (studentId: string, tag: PerformanceTag, noteText: string) => void;
}

export function FocusStudentPanel({
  student,
  sessionId,
  onClose,
  onResolveHelp,
  onSaveNote
}: FocusStudentPanelProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(student.currentFileId || student.files[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'terminal' | 'timeline' | 'notes'>('terminal');
  const [noteTag, setNoteTag] = useState<PerformanceTag>(student.instructorNote?.tag || 'NORMAL');
  const [noteText, setNoteText] = useState<string>(student.instructorNote?.content || '');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync selectedFileId if student changes file
  useEffect(() => {
    if (student.currentFileId && (!selectedFileId || !student.files.some(f => f.id === selectedFileId))) {
      setSelectedFileId(student.currentFileId);
    }
  }, [student.currentFileId, student.files]);

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

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(student.studentId, noteTag, noteText);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const hasHelpPending = !!student.helpRequest && student.helpRequest.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12161f] border border-gray-700 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="bg-[#161b22] px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/50 bg-gray-800">
              {student.avatarUrl ? (
                <img src={student.avatarUrl} alt={student.studentName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">
                  {student.studentName[0]}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-base leading-tight">
                  {student.studentName}
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time Sync</span>
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {student.studentEmail} • Time in Lab:{' '}
                <span className="text-gray-200 font-mono font-medium">
                  {Math.round(student.timeInLabSeconds / 60)} mins
                </span>{' '}
                • Progress:{' '}
                <span className="text-emerald-400 font-mono font-semibold">
                  {student.progressPercentage}%
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {hasHelpPending && (
              <button
                onClick={() => onResolveHelp(student.studentId)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-emerald-900/30 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Help Resolved</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Close Panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Help Banner if student requested assistance */}
        {hasHelpPending && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-5 py-2.5 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong className="font-semibold text-rose-100">Help Request:</strong> "
                {student.helpRequest?.message}"
              </span>
            </div>
            <span className="text-rose-400 font-mono text-[11px]">
              Requested at {new Date(student.helpRequest?.requestedAt || '').toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Workspace Body: Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Real-Time Mirrored Monaco Code Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
            {/* Student's files tab bar */}
            <div className="bg-[#181d24] px-3 py-1.5 border-b border-gray-800 flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-[11px] text-gray-400 uppercase font-semibold mr-1">
                Student Files:
              </span>
              {student.files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`px-3 py-1 rounded font-mono text-xs flex items-center space-x-1.5 transition ${
                    activeFile?.id === file.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{file.name}</span>
                </button>
              ))}
            </div>

            {/* Monaco Editor (Read-Only Live Mirror) */}
            <div className="flex-1 relative">
              <MonacoCodeEditor
                file={activeFile}
                value={activeFile?.content || ''}
                isReadOnly={true}
              />
            </div>
          </div>

          {/* Right Column: Terminal Output, Timeline & Notes */}
          <div className="w-96 bg-[#161b22] flex flex-col overflow-hidden text-xs">
            {/* Tabs */}
            <div className="flex border-b border-gray-800 bg-[#12161f]">
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex-1 py-2.5 font-medium border-b-2 transition flex items-center justify-center space-x-1.5 ${
                  activeTab === 'terminal'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 font-semibold'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-2.5 font-medium border-b-2 transition flex items-center justify-center space-x-1.5 ${
                  activeTab === 'timeline'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5 font-semibold'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-2.5 font-medium border-b-2 transition flex items-center justify-center space-x-1.5 ${
                  activeTab === 'notes'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5 font-semibold'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Notes</span>
              </button>
            </div>

            {/* Tab 1: Terminal / Console Output */}
            {activeTab === 'terminal' && (
              <div className="flex-1 p-3 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 text-gray-400 text-[11px]">
                  <span>LIVE EXECUTION OUTPUT</span>
                  {student.lastExecution && (
                    <span className="font-mono text-emerald-400">
                      {student.lastExecution.durationMs}ms
                    </span>
                  )}
                </div>
                <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-lg p-3 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {student.terminalOutput ? (
                    <pre
                      className={`whitespace-pre-wrap ${
                        student.lastExecution?.status === 'error'
                          ? 'text-rose-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {student.terminalOutput}
                    </pre>
                  ) : (
                    <div className="text-gray-500 italic">No execution recorded yet.</div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Activity Timeline */}
            {activeTab === 'timeline' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <div className="text-[11px] text-gray-400 uppercase font-semibold mb-2">
                  Chronological Event Stream
                </div>
                {activityLogs.length > 0 ? (
                  <div className="relative pl-4 space-y-3 border-l-2 border-gray-800">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="relative group">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute -left-[21px] top-1 ring-4 ring-[#161b22]" />
                        <div className="text-[11px] text-gray-400 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                        <p className="text-xs text-gray-200 font-medium">{log.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-center py-8">
                    No activity logs recorded yet.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Instructor Notes & Performance Tag */}
            {activeTab === 'notes' && (
              <form onSubmit={handleSaveNotes} className="flex-1 p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Performance Evaluation Tag:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteTag('EXCELLENT')}
                        className={`p-2 rounded-lg text-xs font-medium border transition text-left ${
                          noteTag === 'EXCELLENT'
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        ⭐ Excellent
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoteTag('NEEDS_SUPPORT')}
                        className={`p-2 rounded-lg text-xs font-medium border transition text-left ${
                          noteTag === 'NEEDS_SUPPORT'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        ⚠️ Needs Support
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoteTag('DID_NOT_PARTICIPATE')}
                        className={`p-2 rounded-lg text-xs font-medium border transition text-left ${
                          noteTag === 'DID_NOT_PARTICIPATE'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        ⏱️ Inactive / Left
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoteTag('NORMAL')}
                        className={`p-2 rounded-lg text-xs font-medium border transition text-left ${
                          noteTag === 'NORMAL'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        ✓ Normal
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Private Instructor Notes & Feedback:
                    </label>
                    <textarea
                      rows={5}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add private evaluation notes (e.g. Good recursive approach, struggled with prime edge cases)..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  {saveSuccess && (
                    <span className="text-emerald-400 text-xs font-medium flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </span>
                  )}
                  <button
                    type="submit"
                    className="ml-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-md shadow-purple-900/30 flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Save Student Notes</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
