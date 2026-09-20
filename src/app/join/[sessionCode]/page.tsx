'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Terminal, User, Hash, ArrowRight, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { LabSession } from '@/types';

export default function JoinSessionPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.sessionCode as string) || '';

  const [session, setSession] = useState<LabSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // Find session by id or sessionCode
    fetch('/api/sessions')
      .then(r => r.json())
      .then((sessions: LabSession[]) => {
        if (Array.isArray(sessions)) {
          const found = sessions.find(
            s =>
              s.id.toLowerCase() === rawCode.toLowerCase() ||
              s.sessionCode.toLowerCase() === rawCode.toLowerCase()
          );
          if (found) {
            setSession(found);
          } else {
            setError(`No active session found matching code "${rawCode}".`);
          }
        }
      })
      .catch(() => setError('Unable to connect to lab server.'))
      .finally(() => setLoading(false));

    // Pre-populate if saved in localStorage
    const savedName = localStorage.getItem('vlab_student_name');
    const savedId = localStorage.getItem('vlab_student_id');
    if (savedName) setStudentName(savedName);
    if (savedId) setStudentId(savedId);
  }, [rawCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim() || !session) return;

    setIsJoining(true);
    setError('');

    try {
      const res = await fetch(`/api/sessions/${session.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentRegistrationId: studentId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      // Save to localStorage
      localStorage.setItem('vlab_student_name', studentName.trim());
      localStorage.setItem('vlab_student_id', studentId.trim());
      localStorage.setItem(`vlab_registered_${session.id}`, 'true');

      // Navigate to student lab workspace
      router.push(`/lab/${session.id}?name=${encodeURIComponent(studentName.trim())}&studentId=${encodeURIComponent(studentId.trim())}`);
    } catch (err: any) {
      setError(err.message || 'Error joining lab session');
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Verifying lab session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800/80 bg-gray-900/40">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Student Lab Entry</span>
          </div>

          {session ? (
            <div>
              <h1 className="text-xl font-bold text-white mb-1">{session.sessionTitle || session.name}</h1>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span className="bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
                  {session.groupCode}
                </span>
                <span>Session #{session.sessionNumber}</span>
                <span className="capitalize text-emerald-400">
                  {session.language}
                </span>
              </div>
            </div>
          ) : (
            <h1 className="text-lg font-bold text-white">Join Lab Session</h1>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start space-x-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Full Student Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Student ID / Registration Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="e.g. 2024-0182"
                className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isJoining || !studentName.trim() || !studentId.trim() || !session}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm transition shadow-sm"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Enter Coding Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="px-6 py-3 bg-[#0d1117]/60 border-t border-gray-800 text-center text-[11px] text-gray-500">
          Internal Educational Laboratory • Direct Workspace Mirror
        </div>
      </div>
    </div>
  );
}
