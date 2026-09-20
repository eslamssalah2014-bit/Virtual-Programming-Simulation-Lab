'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Monitor,
  Copy,
  Check,
  Calendar,
  Users,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  Radio
} from 'lucide-react';
import { LabSession } from '@/types';

function InstructorDashboardContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdSession, setCreatedSession] = useState<LabSession | null>(null);
  const [formData, setFormData] = useState({
    groupCode: '',
    groupName: '',
    sessionNumber: '1',
    sessionTitle: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Sessions
  const loadSessions = () => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(err => console.error('Failed to load sessions:', err));
  };

  useEffect(() => {
    loadSessions();

    if (searchParams.get('action') === 'create') {
      setIsCreateModalOpen(true);
    }

    const handleOpenEvent = () => setIsCreateModalOpen(true);
    window.addEventListener('open-create-session', handleOpenEvent);
    return () => window.removeEventListener('open-create-session', handleOpenEvent);
  }, [searchParams]);

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchesTab = activeTab === 'active' ? session.isActive : !session.isActive;
    const matchesSearch =
      (session.groupCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.groupName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.sessionTitle || session.sessionCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getJoinUrl = (session: LabSession) => {
    if (typeof window === 'undefined') return `/join/${session.sessionCode || session.id}`;
    return `${window.location.origin}/join/${session.sessionCode || session.id}`;
  };

  const handleCopyLink = (session: LabSession) => {
    const url = getJoinUrl(session);
    navigator.clipboard.writeText(url);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupCode || !formData.sessionTitle) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const newSession = await res.json();
      setCreatedSession(newSession);
      loadSessions();
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setCreatedSession(null);
    setFormData({
      groupCode: '',
      groupName: '',
      sessionNumber: '1',
      sessionTitle: ''
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Classroom Computer Lab Monitoring</h1>
            <p className="text-xs text-gray-400 mt-1">
              Simultaneously view student desktop screens, track attendance and join times, and answer student help requests.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/instructor/sessions/session-101"
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3.5 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>Multi-Screen Monitor</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Lab Session</span>
            </button>
          </div>
        </div>

        {/* Operational Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex items-center space-x-1 bg-[#161b22] p-1 rounded-lg border border-gray-800 inline-flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === 'active'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Lab Sessions</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {sessions.filter(s => s.isActive).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === 'past'
                  ? 'bg-gray-700 text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Past Sessions</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {sessions.filter(s => !s.isActive).length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search group code, title, or room..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-[#161b22] border border-gray-800/80 rounded-xl space-y-3">
            <Monitor className="w-8 h-8 text-gray-600 mx-auto" />
            <div className="text-sm font-medium text-gray-300">
              No {activeTab === 'active' ? 'active' : 'past'} lab sessions found.
            </div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'Click "+ Create Lab Session" to open a room for student screen sharing.'
                : 'Completed lab sessions will appear here for attendance records.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="bg-[#161b22] border border-gray-800 hover:border-gray-700 rounded-xl p-5 flex flex-col justify-between transition space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-gray-800 text-gray-200 border border-gray-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded">
                      {session.groupCode || 'LAB-1'}
                    </span>
                    <div className="flex items-center space-x-2">
                      {session.isActive ? (
                        <span className="inline-flex items-center text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                          Monitoring Live
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-medium">Finished</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {session.sessionNumber ? `Session #${session.sessionNumber}: ` : ''}
                    {session.sessionTitle}
                  </h3>
                  <div className="text-xs text-gray-400 mt-1">{session.groupName || 'Computer Lab'}</div>
                </div>

                <div className="pt-3 border-t border-gray-800/80 text-xs text-gray-400 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      <strong className="text-gray-200 font-semibold">{session.joinedCount || 0}</strong> active stations
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Code: {session.sessionCode || session.id}
                  </div>
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <Link
                    href={`/instructor/sessions/${session.id}`}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition text-center shadow-xs"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Open Screen Monitor</span>
                  </Link>

                  <button
                    onClick={() => handleCopyLink(session)}
                    title="Copy Student Join Link"
                    className="bg-[#0d1117] hover:bg-gray-800 border border-gray-700 text-gray-300 py-1.5 px-2.5 rounded-lg text-xs flex items-center space-x-1 transition"
                  >
                    {copiedId === session.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[11px]">Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE LAB SESSION MODAL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/30">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-white text-base">
                    {createdSession ? 'Lab Session Created!' : 'Create New Computer Lab Session'}
                  </h2>
                </div>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createdSession ? (
                <div className="p-6 space-y-5">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Classroom Session Ready for Screen Sharing</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      <strong>{createdSession.sessionTitle}</strong> ({createdSession.groupCode}) •{' '}
                      {createdSession.groupName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Student Screen Sharing Link:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={getJoinUrl(createdSession)}
                        className="flex-1 bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none select-all"
                      />
                      <button
                        onClick={() => handleCopyLink(createdSession)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                      >
                        {copiedId === createdSession.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Send this link to students. They will enter their Name & ID and start sharing their screen immediately.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-3">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition"
                    >
                      Done
                    </button>
                    <Link
                      href={`/instructor/sessions/${createdSession.id}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Open Live Monitor</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Group / Room Code <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS101-G1"
                        value={formData.groupCode}
                        onChange={e => setFormData({ ...formData, groupCode: e.target.value })}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Session Number <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 4"
                        value={formData.sessionNumber}
                        onChange={e => setFormData({ ...formData, sessionNumber: e.target.value })}
                        className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Room / Class Name <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Lab Room 302"
                      value={formData.groupName}
                      onChange={e => setFormData({ ...formData, groupName: e.target.value })}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Lab Exercise Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operating Systems & Memory Architecture"
                      value={formData.sessionTitle}
                      onChange={e => setFormData({ ...formData, sessionTitle: e.target.value })}
                      className="w-full bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.groupCode || !formData.sessionTitle}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                    >
                      <span>Create & Generate Link</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstructorDashboardPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] p-6 text-xs text-gray-400">Loading Sessions Dashboard...</div>}>
      <InstructorDashboardContent />
    </React.Suspense>
  );
}
