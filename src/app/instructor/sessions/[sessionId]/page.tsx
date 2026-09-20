'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { getSocket } from '@/lib/socket/client';
import { LabSession, LiveStudentState, ActivityLog } from '@/types';
import { FocusStudentPanel } from '@/components/instructor/FocusStudentPanel';
import {
  ArrowLeft,
  Tv,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Search,
  ExternalLink,
  Code2,
  Eye,
  Maximize2
} from 'lucide-react';

export default function InstructorLiveMonitoringPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

  const [session, setSession] = useState<LabSession | null>(null);
  const [students, setStudents] = useState<LiveStudentState[]>([]);
  const [focusedStudent, setFocusedStudent] = useState<LiveStudentState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.session) setSession(data.session);
      })
      .catch(err => console.error('Failed to load session details:', err));

    fetch(`/api/sessions/${sessionId}/students`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch(err => console.error('Failed to load initial students:', err));
  }, [sessionId]);

  // 2. Real-time Socket Subscriptions
  useEffect(() => {
    const socket = getSocket();

    socket.emit('join_session', { sessionId, user: currentUser });

    // Complete student list updates
    const handleStudentsListUpdated = (updatedList: LiveStudentState[]) => {
      setStudents(updatedList);

      setFocusedStudent(prev => {
        if (!prev) return null;
        const match = updatedList.find(s => s.studentId === prev.studentId);
        return match || prev;
      });
    };

    // Live keystroke code sync
    const handleStudentCodeSynced = ({
      studentId,
      fileId,
      content,
      studentState
    }: {
      studentId: string;
      fileId: string;
      content: string;
      studentState: LiveStudentState;
    }) => {
      setStudents(prev =>
        prev.map(s => (s.studentId === studentId ? { ...s, ...studentState } : s))
      );

      setFocusedStudent(prev => {
        if (prev && prev.studentId === studentId) {
          const updatedFiles = prev.files.map(f =>
            f.id === fileId ? { ...f, content } : f
          );
          return {
            ...prev,
            ...studentState,
            files: updatedFiles,
            currentFileId: fileId
          };
        }
        return prev;
      });
    };

    socket.on('students_list_updated', handleStudentsListUpdated);
    socket.on('student_code_synced', handleStudentCodeSynced);

    return () => {
      socket.off('students_list_updated', handleStudentsListUpdated);
      socket.off('student_code_synced', handleStudentCodeSynced);
    };
  }, [sessionId, currentUser]);

  const handleResolveHelp = (studentId: string) => {
    const socket = getSocket();
    socket.emit('instructor_resolve_help', { sessionId, studentId });
  };

  const getJoinUrl = () => {
    if (typeof window === 'undefined' || !session) return '';
    return `${window.location.origin}/join/${session.sessionCode || session.id}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getJoinUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics
  const joinedCount = students.length;
  const activeCount = students.filter(s => s.status === 'Active').length;
  const idleCount = students.filter(s => s.status === 'Idle').length;
  const pendingHelpStudents = students.filter(s => s.helpRequest?.status === 'pending');

  const filteredStudents = students.filter(student => {
    const nameMatch = (student.studentName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = (student.studentRegistrationId || student.studentId || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return nameMatch || idMatch;
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 p-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* Back Link & Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
              title="Back to Sessions Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200">
                  {session?.groupCode || 'GRP-1'}
                </span>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {session?.sessionNumber ? `Session #${session.sessionNumber}: ` : ''}
                  {session?.sessionTitle || session?.name || 'Live Programming Lab'}
                </h1>
                <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {session?.language || 'python'}
                </span>
                <span className="inline-flex items-center text-xs text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Live Session
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{session?.groupName || 'Computer Science Section'}</div>
            </div>
          </div>

          {/* Copy Student Link Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLink}
              className="bg-[#161b22] hover:bg-gray-800 border border-gray-700 text-gray-200 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Join Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-gray-400" />
                  <span>Copy Student Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Urgent Help Request Notification Banner if students are stuck */}
        {pendingHelpStudents.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-rose-200 text-xs">
                  {pendingHelpStudents.length} Student{pendingHelpStudents.length > 1 ? 's' : ''} Requested Help
                </h4>
                <p className="text-[11px] text-rose-300/80">
                  {pendingHelpStudents.map(s => s.studentName).join(', ')} waiting for assistance.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {pendingHelpStudents.map(s => (
                <button
                  key={s.studentId}
                  onClick={() => setFocusedStudent(s)}
                  className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Inspect {s.studentName.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined Students
              </div>
              <div className="text-2xl font-bold text-white mt-0.5">{joinedCount}</div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Active Students</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{activeCount}</div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Idle Students
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">{idleCount}</div>
            </div>
          </div>
        </div>

        {/* Clean Student Table Section */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
          {/* Table Toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-900/30">
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-white text-sm">Session Participant Roster</h2>
              <span className="text-xs text-gray-400">({filteredStudents.length} students)</span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#11161d] text-gray-400 border-b border-gray-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Join Time</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      No students found. Students who open the join link will appear in this table live.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr
                      key={student.studentId}
                      className="hover:bg-gray-800/40 transition group"
                    >
                      {/* Student Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-700/50 text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {student.studentName ? student.studentName[0] : 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{student.studentName}</div>
                            {student.helpRequest?.status === 'pending' && (
                              <span className="text-[10px] text-rose-400 font-medium inline-flex items-center space-x-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Needs Help</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="px-4 py-3.5 font-mono text-gray-300 font-medium">
                        {student.studentRegistrationId || student.studentId}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase inline-flex items-center space-x-1 ${
                            student.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : student.status === 'Idle'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : student.status === 'Submitted'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              student.status === 'Active'
                                ? 'bg-emerald-400 animate-pulse'
                                : student.status === 'Idle'
                                ? 'bg-amber-400'
                                : student.status === 'Submitted'
                                ? 'bg-blue-400'
                                : 'bg-gray-500'
                            }`}
                          />
                          <span>{student.status}</span>
                        </span>
                      </td>

                      {/* Join Time */}
                      <td className="px-4 py-3.5 text-gray-400">
                        {student.joinTime
                          ? new Date(student.joinTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </td>

                      {/* Last Activity */}
                      <td className="px-4 py-3.5 text-gray-300 max-w-xs truncate" title={student.lastActivity}>
                        {student.lastActivity || 'Coding in workspace'}
                      </td>

                      {/* Action: Focus Button */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setFocusedStudent(student)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs inline-flex items-center space-x-1.5 shadow-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Focus</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Focus Student Slide-Over Panel */}
      {focusedStudent && (
        <FocusStudentPanel
          student={focusedStudent}
          sessionId={sessionId}
          onClose={() => setFocusedStudent(null)}
          onResolveHelp={handleResolveHelp}
        />
      )}
    </div>
  );
}
