'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { getSocket } from '@/lib/socket/client';
import { LabSession, LabParticipant } from '@/types';
import {
  ArrowLeft,
  Monitor,
  Radio,
  Hand,
  Users,
  Copy,
  Check,
  Search,
  Maximize2,
  X,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function ClassroomMonitoringPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

  const [session, setSession] = useState<LabSession | null>(null);
  const [participants, setParticipants] = useState<LabParticipant[]>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<LabParticipant | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sharing' | 'hands'>('all');

  // Load session and participants
  const loadData = () => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.session) setSession(data.session);
        if (Array.isArray(data.participants)) setParticipants(data.participants);
      })
      .catch(err => console.error('Failed to load session:', err));
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    socket.emit('join_session', { sessionId, user: currentUser });

    const handleParticipantsListUpdated = (list: LabParticipant[]) => {
      setParticipants(list);
      setFocusedParticipant(prev => {
        if (!prev) return null;
        return list.find(p => p.studentId === prev.studentId) || prev;
      });
    };

    const handleParticipantUpdated = (updated: LabParticipant) => {
      setParticipants(prev =>
        prev.map(p => (p.studentId === updated.studentId ? updated : p))
      );
      setFocusedParticipant(prev => {
        if (prev && prev.studentId === updated.studentId) return updated;
        return prev;
      });
    };

    socket.on('participants_list_updated', handleParticipantsListUpdated);
    socket.on('participant_updated', handleParticipantUpdated);

    return () => {
      socket.off('participants_list_updated', handleParticipantsListUpdated);
      socket.off('participant_updated', handleParticipantUpdated);
    };
  }, [sessionId, currentUser]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined' || !session) return;
    const url = `${window.location.origin}/join/${session.sessionCode || session.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLowerHand = (studentId: string) => {
    const socket = getSocket();
    socket.emit('instructor_resolve_help', { sessionId, studentId });
  };

  // Metrics
  const totalCount = participants.length;
  const sharingCount = participants.filter(p => p.isScreenSharing).length;
  const handsRaisedCount = participants.filter(p => p.isHandRaised).length;

  const filteredParticipants = participants.filter(p => {
    const matchesSearch =
      (p.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.studentRegistrationId || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'sharing') return matchesSearch && p.isScreenSharing;
    if (statusFilter === 'hands') return matchesSearch && p.isHandRaised;
    return matchesSearch;
  });

  // Focus navigation
  const currentIndex = focusedParticipant
    ? filteredParticipants.findIndex(p => p.studentId === focusedParticipant.studentId)
    : -1;

  const handleNextFocus = () => {
    if (currentIndex >= 0 && currentIndex < filteredParticipants.length - 1) {
      setFocusedParticipant(filteredParticipants[currentIndex + 1]);
    }
  };

  const handlePrevFocus = () => {
    if (currentIndex > 0) {
      setFocusedParticipant(filteredParticipants[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 p-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* Session Top Bar */}
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
                  {session?.groupCode || 'LAB-1'}
                </span>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {session?.sessionTitle || session?.groupName || 'Classroom Computer Lab'}
                </h1>
                <span className="inline-flex items-center text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Live Monitoring
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {session?.groupName || 'Computer Room'} • Session Code:{' '}
                <span className="font-mono text-gray-200 font-semibold">
                  {session?.sessionCode || session?.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* View Attendance Report Button */}
            <button
              onClick={() => setIsAttendanceModalOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Attendance Sheet</span>
            </button>

            {/* Copy Student Join Link Button */}
            <button
              onClick={handleCopyLink}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Join Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Student Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hand Raised Priority Banner */}
        {handsRaisedCount > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Hand className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-amber-200 text-sm">
                  {handsRaisedCount} Student{handsRaisedCount > 1 ? 's' : ''} Raised Hand
                </h4>
                <p className="text-xs text-amber-300/80">
                  {participants
                    .filter(p => p.isHandRaised)
                    .map(p => p.studentName)
                    .join(', ')}{' '}
                  waiting for assistance.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {participants
                .filter(p => p.isHandRaised)
                .map(p => (
                  <button
                    key={p.studentId}
                    onClick={() => setFocusedParticipant(p)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Focus {p.studentName.split(' ')[0]}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined Stations
              </div>
              <div className="text-2xl font-bold text-white mt-0.5">{totalCount}</div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Sharing Screens</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{sharingCount}</div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Hands Raised
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-0.5">{handsRaisedCount}</div>
            </div>
          </div>
        </div>

        {/* Multi-Screen Grid Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#161b22] border border-gray-800 p-3.5 rounded-xl">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                statusFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Screens ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('sharing')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                statusFilter === 'sharing'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sharing Active ({sharingCount})
            </button>
            <button
              onClick={() => setStatusFilter('hands')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                statusFilter === 'hands'
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hands Raised ({handsRaisedCount})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search station or student..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        {/* Live Multi-Screen Gallery */}
        {filteredParticipants.length === 0 ? (
          <div className="p-16 text-center bg-[#161b22] border border-gray-800 rounded-2xl space-y-3">
            <Monitor className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-base font-bold text-gray-300">No student screens found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Students who open the lab join link will appear in this screen gallery live.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredParticipants.map(participant => (
              <StudentScreenTile
                key={participant.studentId}
                participant={participant}
                onFocus={() => setFocusedParticipant(participant)}
                onLowerHand={() => handleLowerHand(participant.studentId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOCUS MODE MODAL: Full Screen Desktop Inspection */}
      {focusedParticipant && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Focus Mode Top Header */}
          <div className="bg-[#161b22] border border-gray-700 rounded-t-xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-sm">
                {focusedParticipant.studentName[0]}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-white">{focusedParticipant.studentName}</h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                    ID: {focusedParticipant.studentRegistrationId}
                  </span>
                  {focusedParticipant.isHandRaised && (
                    <span className="bg-amber-500 text-gray-950 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                      <Hand className="w-3 h-3" />
                      <span>Hand Raised</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex items-center space-x-3">
                  <span>
                    Join Time: {new Date(focusedParticipant.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span>
                    Screen Status:{' '}
                    <strong className={focusedParticipant.isScreenSharing ? 'text-emerald-400' : 'text-gray-400'}>
                      {focusedParticipant.isScreenSharing ? 'Active Stream' : 'Not Sharing'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Navigation */}
            <div className="flex items-center space-x-2">
              {focusedParticipant.isHandRaised && (
                <button
                  onClick={() => handleLowerHand(focusedParticipant.studentId)}
                  className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                >
                  Lower Hand
                </button>
              )}

              <button
                onClick={handlePrevFocus}
                disabled={currentIndex <= 0}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white disabled:opacity-30 transition"
                title="Previous Student"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleNextFocus}
                disabled={currentIndex >= filteredParticipants.length - 1}
                className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white disabled:opacity-30 transition"
                title="Next Student"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setFocusedParticipant(null)}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition ml-2"
                title="Close Focus Mode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Full-Size Screen View */}
          <div className="flex-1 bg-black rounded-b-xl border-x border-b border-gray-700 flex flex-col items-center justify-center p-3 relative overflow-hidden">
            <MockScreenCanvas
              type={focusedParticipant.mockScreenType || 'desktop'}
              studentName={focusedParticipant.studentName}
              studentId={focusedParticipant.studentRegistrationId}
              isFullSize={true}
            />

            {focusedParticipant.helpRequest && (
              <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-md border border-amber-500/40 rounded-xl p-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center space-x-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Student Help Message:</strong> {focusedParticipant.helpRequest.message}
                  </span>
                </div>
                <button
                  onClick={() => handleLowerHand(focusedParticipant.studentId)}
                  className="bg-amber-600 hover:bg-amber-500 text-gray-950 font-bold text-xs px-3 py-1 rounded transition shrink-0 ml-4"
                >
                  Mark Hand Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTENDANCE ROSTER MODAL */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/40">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-white text-base">Classroom Attendance & Session Roster</h2>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={`/api/sessions/${sessionId}/attendance?format=csv`}
                  download
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
                <button
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#11161d] text-gray-400 border-b border-gray-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Station ID</th>
                    <th className="px-3 py-2.5">Join Time</th>
                    <th className="px-3 py-2.5">Leave Time</th>
                    <th className="px-3 py-2.5">Screen Status</th>
                    <th className="px-3 py-2.5">Duration</th>
                    <th className="px-3 py-2.5">Hand Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {participants.map(p => (
                    <tr key={p.studentId} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-semibold text-white">{p.studentName}</td>
                      <td className="px-3 py-3 font-mono text-gray-300">{p.studentRegistrationId}</td>
                      <td className="px-3 py-3 text-gray-400">
                        {new Date(p.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3 text-gray-400">
                        {p.leaveTime
                          ? new Date(p.leaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'In Session'}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.isScreenSharing
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {p.isScreenSharing ? 'Active' : 'Stopped'}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-300">
                        {Math.round(p.timeInLabSeconds / 60)} mins
                      </td>
                      <td className="px-3 py-3">
                        {p.isHandRaised ? (
                          <span className="text-amber-400 font-bold">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Student Screen Tile in the Monitoring Gallery
function StudentScreenTile({
  participant,
  onFocus,
  onLowerHand
}: {
  participant: LabParticipant;
  onFocus: () => void;
  onLowerHand: () => void;
}) {
  return (
    <div
      onClick={onFocus}
      className={`group bg-[#161b22] border rounded-xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col hover:border-emerald-500/70 hover:shadow-emerald-950/20 ${
        participant.isHandRaised
          ? 'border-amber-500 shadow-amber-950/30'
          : participant.isScreenSharing
          ? 'border-gray-800'
          : 'border-gray-800/60 opacity-85'
      }`}
    >
      {/* Top Station Header */}
      <div className="px-3.5 py-2 border-b border-gray-800 bg-[#12161f] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-emerald-700/60 text-emerald-200 font-bold flex items-center justify-center text-[10px]">
            {participant.studentName[0]}
          </div>
          <span className="font-semibold text-xs text-white truncate max-w-[130px]">
            {participant.studentName}
          </span>
          <span className="font-mono text-[10px] text-gray-400">
            ({participant.studentRegistrationId})
          </span>
        </div>

        {/* Hand Raised or Screen Status Badge */}
        <div className="flex items-center space-x-1.5">
          {participant.isHandRaised && (
            <span
              onClick={e => {
                e.stopPropagation();
                onLowerHand();
              }}
              title="Hand Raised! Click to acknowledge and lower."
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-gray-950 flex items-center space-x-1 animate-pulse"
            >
              <Hand className="w-3 h-3" />
              <span>Hand</span>
            </span>
          )}

          {participant.isScreenSharing ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 font-medium">Paused</span>
          )}
        </div>
      </div>

      {/* Live Screen Preview Canvas */}
      <div className="relative aspect-video bg-[#0a0d12] flex items-center justify-center overflow-hidden">
        <MockScreenCanvas
          type={participant.mockScreenType || 'desktop'}
          studentName={participant.studentName}
          studentId={participant.studentRegistrationId}
        />

        {/* Hover Focus Button Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enter Focus Mode</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="px-3.5 py-2 border-t border-gray-800/80 bg-[#12161f] text-[11px] text-gray-400 flex items-center justify-between">
        <span className="truncate max-w-[180px]">{participant.lastActivity || 'Present at station'}</span>
        <span className="font-mono text-[10px] text-gray-500">
          {Math.round(participant.timeInLabSeconds / 60)}m in lab
        </span>
      </div>
    </div>
  );
}

// Realistic Canvas Simulation for Multi-Screen Computer Lab Desktop Preview
function MockScreenCanvas({
  type,
  studentName,
  studentId,
  isFullSize = false
}: {
  type: 'ide' | 'browser' | 'terminal' | 'desktop' | 'document';
  studentName: string;
  studentId: string;
  isFullSize?: boolean;
}) {
  return (
    <div className={`w-full h-full bg-[#181d24] flex flex-col overflow-hidden text-[10px] select-none ${isFullSize ? 'max-w-6xl max-h-[750px] shadow-2xl rounded-lg' : ''}`}>
      {/* Fake OS Window Title Bar */}
      <div className="bg-[#21262d] px-2.5 py-1 flex items-center justify-between border-b border-gray-700/80">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
          <span className="text-[10px] text-gray-300 font-mono ml-2">
            Station-{studentId} • {type.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] text-gray-500">{studentName}</span>
      </div>

      {/* Screen Window Body */}
      <div className="flex-1 p-3 font-mono text-[11px] text-gray-300 overflow-hidden flex flex-col justify-between bg-[#0e1217]">
        {type === 'ide' && (
          <div className="space-y-1">
            <div className="text-gray-500">// Computer Lab Exercise • Task 3</div>
            <div className="text-purple-400">#include &lt;iostream&gt;</div>
            <div className="text-purple-400">#include &lt;vector&gt;</div>
            <div className="text-blue-400">using namespace <span className="text-emerald-300">std;</span></div>
            <div className="text-yellow-300">int <span className="text-blue-300">main()</span> &#123;</div>
            <div className="pl-4 text-emerald-300">cout &lt;&lt; "Running simulation test..." &lt;&lt; endl;</div>
            <div className="pl-4 text-gray-400">vector&lt;int&gt; buffer(1024, 0);</div>
            <div className="pl-4 text-gray-300">return 0;</div>
            <div className="text-yellow-300">&#125;</div>
          </div>
        )}

        {type === 'terminal' && (
          <div className="space-y-1 text-emerald-400">
            <div className="text-gray-400">$ gcc -Wall main.c -o lab_exec</div>
            <div>[Compiling station-{studentId} source files...]</div>
            <div className="text-cyan-300">$ ./lab_exec --test-suite</div>
            <div>[RUNNING] Unit test 1: Memory bounds ... OK</div>
            <div>[RUNNING] Unit test 2: Socket loopback ... OK</div>
            <div className="text-amber-300">[WARNING] Execution timeout: waiting on child process...</div>
            <div className="flex items-center space-x-1">
              <span>$ </span>
              <span className="w-1.5 h-3 bg-emerald-400 animate-pulse inline-block" />
            </div>
          </div>
        )}

        {type === 'browser' && (
          <div className="space-y-2">
            <div className="bg-[#1c2128] p-1.5 rounded text-[10px] text-gray-400 flex items-center space-x-2">
              <span className="text-emerald-400">https://</span>
              <span>university-lab.internal/docs/spec-v4</span>
            </div>
            <div className="p-2 border border-gray-800 rounded bg-[#161b22] text-xs text-gray-300 space-y-1">
              <div className="font-bold text-white">Laboratory Specification Document</div>
              <div className="text-[10px] text-gray-400 leading-normal">
                Follow steps 1-4 to connect the network node and verify heartbeat packets.
              </div>
            </div>
          </div>
        )}

        {type === 'document' && (
          <div className="space-y-1.5 text-gray-300">
            <div className="text-xs font-bold text-cyan-400">CS101 Lab Report — {studentName}</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">
              Objective: Analyze algorithm efficiency across different cache line alignments.
              Data points logged: 24 trials completed with 0 segment faults.
            </div>
            <div className="h-10 bg-gray-900 border border-gray-800 rounded p-1 flex items-center justify-around">
              <div className="w-3 bg-emerald-500 h-6 rounded-t" />
              <div className="w-3 bg-emerald-500 h-8 rounded-t" />
              <div className="w-3 bg-emerald-500 h-5 rounded-t" />
              <div className="w-3 bg-cyan-500 h-7 rounded-t" />
            </div>
          </div>
        )}

        {type === 'desktop' && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex space-x-4">
              <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-xs">
                💻
              </div>
              <div className="w-8 h-8 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-xs">
                📁
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500">
              Desktop Station • Active Session
            </div>
          </div>
        )}

        {/* Fake Desktop Taskbar */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[9px] text-gray-500">
          <span>Display: 1920x1080 (Primary Monitor)</span>
          <span>WebRTC 60 FPS</span>
        </div>
      </div>
    </div>
  );
}
