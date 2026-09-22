'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { LabSession, LabParticipant } from '@/types';
import { ScreenShareManager, DiagnosticsState } from '@/lib/webrtc/screenShareManager';
import { ScreenShareDiagnosticsPanel } from '@/components/common/ScreenShareDiagnosticsPanel';
import { SessionDebugPanel, SessionDebugData } from '@/components/common/SessionDebugPanel';
import { lookupSessionEverywhere, normalizeSessionId } from '@/lib/supabase/sessions';
import {
  Users,
  Monitor,
  Radio,
  Hand,
  Maximize2,
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Search,
  Video
} from 'lucide-react';

function InstructorLiveSessionContent() {
  const params = useParams();
  const rawSessionId = (params?.sessionId as string) || 'session-101';

  const [session, setSession] = useState<LabSession | null>(null);
  const [canonicalRoomId, setCanonicalRoomId] = useState<string>(normalizeSessionId(rawSessionId));
  const [participants, setParticipants] = useState<LabParticipant[]>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<LabParticipant | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sharing' | 'hands'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);

  // Session Debug State
  const [sessionDebugData, setSessionDebugData] = useState<SessionDebugData>({
    sessionId: normalizeSessionId(rawSessionId),
    sessionCode: rawSessionId,
    sessionStatus: 'checking...',
    startTime: '-',
    endTime: '-',
    databaseRecordFound: false,
    extractedUrlCode: rawSessionId,
    executedQuery: `SELECT * FROM sessions WHERE id = '${normalizeSessionId(rawSessionId)}'`,
    returnedResult: 'Querying database...'
  });

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    sessionId: rawSessionId,
    roomId: normalizeSessionId(rawSessionId),
    studentConnected: false,
    instructorConnected: true,
    offerSent: false,
    offerReceived: false,
    answerSent: false,
    answerReceived: false,
    iceCandidatesSent: 0,
    iceCandidatesReceived: 0,
    connectionState: 'new',
    iceState: 'new',
    remoteStreamAttached: false,
    failedStage: null,
    errorMessage: null
  });
  const [signalingLogs, setSignalingLogs] = useState<any[]>([]);

  // WebRTC Multi-Peer Real Streams Map: studentId -> MediaStream
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const screenShareManagerRef = useRef<ScreenShareManager | null>(null);
  const focusVideoRef = useRef<HTMLVideoElement | null>(null);

  // 1. Fetch Session Info & Resolve Canonical Room ID everywhere
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const lookup = await lookupSessionEverywhere(rawSessionId);
        if (!isMounted) return;

        setSessionDebugData({
          sessionId: lookup.session?.id || normalizeSessionId(rawSessionId),
          sessionCode: lookup.logCode,
          sessionStatus: lookup.session?.status || (lookup.session?.isActive ? 'active' : 'inactive'),
          startTime: lookup.session?.startTime || '-',
          endTime: lookup.session?.endTime || '-',
          databaseRecordFound: !!lookup.session,
          foundIn: lookup.foundIn,
          extractedUrlCode: rawSessionId,
          executedQuery: lookup.logQuery,
          returnedResult: lookup.logResult
        });

        if (lookup.session) {
          setSession(lookup.session);
          setCanonicalRoomId(lookup.session.id);
        }

        // Also fetch any existing server-side participants
        try {
          const apiRes = await fetch(`/api/sessions/${rawSessionId}`);
          const apiData = await apiRes.json();
          if (Array.isArray(apiData.participants)) {
            setParticipants(apiData.participants);
          }
        } catch (_) {}
      } catch (err: any) {
        console.error('Failed to load session:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [rawSessionId]);

  // 2. Setup Rebuilt ScreenShareManager (Precondition: session loaded)
  useEffect(() => {
    if (!session || !session.id) {
      console.log('[Instructor WebRTC] Waiting for session to be found before initializing signaling...');
      return;
    }

    const effectiveRoomId = session.id;

    const manager = new ScreenShareManager({
      role: 'instructor',
      sessionId: rawSessionId,
      roomId: effectiveRoomId,
      clientId: 'instructor',
      userName: 'Instructor',
      onDiagnosticsChange: (state) => {
        setDiagnostics(state);
      },
      onLog: (entry) => {
        setSignalingLogs(prev => [entry, ...prev.slice(0, 199)]);
      },
      onRemoteStreamReceived: (studentId, stream) => {
        console.log(`[Instructor Station] Bound real remote stream for student: ${studentId}`, stream);
        setRemoteStreams(prev => ({
          ...prev,
          [studentId]: stream
        }));

        setParticipants(prev => {
          const exists = prev.find(p => p.studentId === studentId || p.studentRegistrationId === studentId);
          if (exists) {
            return prev.map(p =>
              p.studentId === studentId || p.studentRegistrationId === studentId
                ? { ...p, isScreenSharing: true, status: 'Active', lastActivity: 'Streaming live desktop' }
                : p
            );
          }
          const newP: LabParticipant = {
            studentId,
            studentName: `Student ${studentId.slice(-4)}`,
            studentRegistrationId: studentId,
            studentEmail: `${studentId}@student.edu`,
            status: 'Active',
            isScreenSharing: true,
            isHandRaised: false,
            joinTime: new Date().toISOString(),
            timeInLabSeconds: 0,
            screenShareDurationSeconds: 0,
            lastActivity: 'Streaming live desktop',
            lastActivityTime: new Date().toISOString()
          };
          return [...prev, newP];
        });
      }
    });

    screenShareManagerRef.current = manager;

    return () => {
      manager.destroy();
      screenShareManagerRef.current = null;
    };
  }, [rawSessionId, canonicalRoomId, session]);

  // Focus Mode Video Attachment: video.srcObject = remoteStream
  useEffect(() => {
    if (focusVideoRef.current) {
      if (focusedParticipant && remoteStreams[focusedParticipant.studentId]) {
        focusVideoRef.current.srcObject = remoteStreams[focusedParticipant.studentId];
        focusVideoRef.current.play().catch(e => console.log('Autoplay handled:', e));
      } else {
        focusVideoRef.current.srcObject = null;
      }
    }
  }, [focusedParticipant, remoteStreams]);

  // Lower Hand Action
  const handleLowerHand = (studentId: string) => {
    setParticipants(prev =>
      prev.map(p => (p.studentId === studentId ? { ...p, isHandRaised: false, helpRequest: null } : p))
    );
  };

  // Copy Session Link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${canonicalRoomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered Participants
  const filteredParticipants = participants.filter(p => {
    if (statusFilter === 'sharing' && !remoteStreams[p.studentId]) return false;
    if (statusFilter === 'hands' && !p.isHandRaised) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.studentName.toLowerCase().includes(q) ||
        p.studentRegistrationId.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Focus Navigation
  const currentIndex = focusedParticipant
    ? filteredParticipants.findIndex(p => p.studentId === focusedParticipant.studentId)
    : -1;

  const handlePrevFocus = () => {
    if (currentIndex > 0) {
      setFocusedParticipant(filteredParticipants[currentIndex - 1]);
    }
  };

  const handleNextFocus = () => {
    if (currentIndex < filteredParticipants.length - 1 && currentIndex !== -1) {
      setFocusedParticipant(filteredParticipants[currentIndex + 1]);
    }
  };

  // Stat Counters (derived from actual WebRTC tracks)
  const totalCount = participants.length;
  const sharingCount = Object.keys(remoteStreams).filter(
    id => remoteStreams[id]?.getVideoTracks().some(t => t.readyState === 'live')
  ).length;
  const handsRaisedCount = participants.filter(p => p.isHandRaised).length;

  return (
    <div className="flex-1 bg-[#0a0d12] flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Session Top Banner */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {session?.groupCode || 'LAB-1'}
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {session?.sessionTitle || session?.groupName || 'Classroom Computer Lab'}
            </h1>
            <span className="inline-flex items-center text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              <span>Multi-Screen Monitor Active</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Group: <strong className="text-gray-200">{session?.groupName || 'Computer Lab Group'}</strong> • Code:{' '}
            <strong className="text-cyan-400 font-mono">{canonicalRoomId}</strong> • Canonical Room:{' '}
            <strong className="text-emerald-400 font-mono">{canonicalRoomId}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAttendanceModalOpen(true)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Attendance Sheet</span>
          </button>

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
                  <span>Assist {p.studentName}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Workstations</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalCount}</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active WebRTC Streams</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5">{sharingCount}</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Help Requests / Hands</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">{handsRaisedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161b22] border border-gray-800 rounded-xl p-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              statusFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            All Workstations ({participants.length})
          </button>
          <button
            onClick={() => setStatusFilter('sharing')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              statusFilter === 'sharing' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Streaming Screens ({sharingCount})
          </button>
          <button
            onClick={() => setStatusFilter('hands')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
              statusFilter === 'hands' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
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
              remoteStream={remoteStreams[participant.studentId]}
              onFocus={() => setFocusedParticipant(participant)}
              onLowerHand={() => handleLowerHand(participant.studentId)}
            />
          ))}
        </div>
      )}

      {/* Rebuilt 13-Milestone WebRTC Screen-Sharing Diagnostics Panel */}
      <ScreenShareDiagnosticsPanel
        diagnostics={diagnostics}
        role="instructor"
        logs={signalingLogs}
        onRestartIce={() => screenShareManagerRef.current?.restartIce()}
      />

      {/* Session Diagnostics Panel */}
      <SessionDebugPanel debugData={sessionDebugData} />

      {/* FOCUS MODE MODAL: Full Screen Desktop Inspection */}
      {focusedParticipant && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in zoom-in-95 duration-150">
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
                    <strong className={remoteStreams[focusedParticipant.studentId] ? 'text-emerald-400' : 'text-gray-400'}>
                      {remoteStreams[focusedParticipant.studentId]
                        ? 'Live WebRTC Desktop Stream'
                        : 'WebRTC Connecting'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

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

          <div className="flex-1 bg-black rounded-b-xl border-x border-b border-gray-700 flex flex-col items-center justify-center p-3 relative overflow-hidden">
            {remoteStreams[focusedParticipant.studentId] ? (
              <video
                ref={focusVideoRef}
                autoPlay
                playsInline
                controls={false}
                className="w-full h-full max-h-[82vh] object-contain rounded-lg shadow-2xl bg-black"
              />
            ) : (
              <div className="w-full h-[600px] bg-[#0d1117] rounded-lg border border-gray-800 flex flex-col items-center justify-center space-y-3 p-6 text-center select-none">
                <div className="w-14 h-14 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center text-emerald-400">
                  <Monitor className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white text-base font-bold">
                    WebRTC Screen Stream Connecting
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Station: {focusedParticipant.studentRegistrationId} • Room: {canonicalRoomId}
                  </p>
                </div>
                <div className="text-[11px] text-gray-500 max-w-sm">
                  The peer connection is active and negotiating WebRTC desktop video tracks.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTENDANCE SHEET MODAL */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Computer Lab Session Attendance Sheet</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={`/api/sessions/${canonicalRoomId}/attendance?format=csv`}
                  download
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </a>
                <button
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="p-1 rounded text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#0d1117] text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-800">
                  <tr>
                    <th className="px-3 py-2.5">Student Name</th>
                    <th className="px-3 py-2.5">Student ID</th>
                    <th className="px-3 py-2.5">Join Time</th>
                    <th className="px-3 py-2.5">Leave Time</th>
                    <th className="px-3 py-2.5">Screen Status</th>
                    <th className="px-3 py-2.5">Total In Lab</th>
                    <th className="px-3 py-2.5">Hand Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 font-sans">
                  {participants.map(p => (
                    <tr key={p.studentId} className="hover:bg-gray-800/30">
                      <td className="px-3 py-3 font-medium text-white">{p.studentName}</td>
                      <td className="px-3 py-3 font-mono text-cyan-300">{p.studentRegistrationId}</td>
                      <td className="px-3 py-3 font-mono text-gray-400">
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
                            remoteStreams[p.studentId]
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {remoteStreams[p.studentId] ? 'Live Video' : 'Ready'}
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

// Real WebRTC Student Screen Tile in the Monitoring Gallery
function StudentScreenTile({
  participant,
  remoteStream,
  onFocus,
  onLowerHand
}: {
  participant: LabParticipant;
  remoteStream?: MediaStream;
  onFocus: () => void;
  onLowerHand: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Bind WebRTC stream to video element: video.srcObject = remoteStream
  useEffect(() => {
    if (videoRef.current) {
      if (remoteStream) {
        videoRef.current.srcObject = remoteStream;
        videoRef.current.play().catch(e => console.log('Autoplay handled:', e));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  const hasLiveStream = !!remoteStream && remoteStream.getVideoTracks().some(t => t.readyState === 'live');

  return (
    <div
      onClick={onFocus}
      className={`group bg-[#161b22] border rounded-xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col hover:border-emerald-500/70 hover:shadow-emerald-950/20 ${
        participant.isHandRaised
          ? 'border-amber-500 shadow-amber-950/30'
          : hasLiveStream
          ? 'border-emerald-500/60'
          : 'border-gray-800/60 opacity-90'
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

          {hasLiveStream ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Feed</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 font-medium font-mono">Standby</span>
          )}
        </div>
      </div>

      {/* Actual WebRTC Screen Video Element */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {hasLiveStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="w-full h-full bg-[#0d1117] p-4 flex flex-col items-center justify-center space-y-2 text-center select-none">
            <div className="w-10 h-10 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center text-cyan-400">
              <Monitor className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-gray-300 text-xs font-semibold">
              Station {participant.studentRegistrationId}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              WebRTC Peer Ready
            </span>
          </div>
        )}

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
        <span className="truncate max-w-[180px]">
          {hasLiveStream ? 'Streaming live desktop' : 'Station connected'}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          {Math.round(participant.timeInLabSeconds / 60)}m in lab
        </span>
      </div>
    </div>
  );
}

export default function InstructorLiveSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[80vh] text-gray-400 text-xs">
          Loading instructor live session...
        </div>
      }
    >
      <InstructorLiveSessionContent />
    </Suspense>
  );
}
