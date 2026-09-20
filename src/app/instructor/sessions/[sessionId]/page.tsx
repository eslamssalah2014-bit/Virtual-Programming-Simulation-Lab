'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { LabSession, LabParticipant } from '@/types';
import {
  UnifiedSignalingClient,
  RTC_CONFIGURATION,
  WebRTCLogEntry
} from '@/lib/webrtc/signalingClient';
import { WebRTCDebugPanel, WebRTCDebugInfo } from '@/components/common/WebRTCDebugPanel';
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

  // WebRTC Multi-Peer State
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerStates, setPeerStates] = useState<Record<string, {
    connectionState: string;
    iceState: string;
    signalingState: string;
    streamId?: string;
    trackCount: number;
  }>>({});
  const [logs, setLogs] = useState<WebRTCLogEntry[]>([]);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingRef = useRef<UnifiedSignalingClient | null>(null);
  const focusVideoRef = useRef<HTMLVideoElement | null>(null);

  const addLog = (entry: WebRTCLogEntry) => {
    setLogs(prev => [entry, ...prev.slice(0, 249)]);
  };

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

  // 2. Setup Unified WebRTC Signaling Channel (Preconditions: session must be found and loaded)
  useEffect(() => {
    if (!session || !session.id) {
      console.log('[Instructor WebRTC] Waiting for session to be found before initializing signaling...');
      return;
    }

    const effectiveRoomId = session.id;
    const signaling = new UnifiedSignalingClient(
      rawSessionId,
      effectiveRoomId,
      'instructor',
      'instructor',
      addLog
    );
    signalingRef.current = signaling;

    signaling.log(
      `Instructor Station Connected | Raw: ${rawSessionId} | Canonical Room: ${effectiveRoomId} | Channel: ${signaling.channelName}`,
      'success',
      'signaling'
    );

    // Notify room presence
    signaling.send('join_session', 'all', {
      sessionId: effectiveRoomId,
      rawSessionId,
      user: { id: 'instructor', role: 'instructor' }
    });

    // Handle student joined
    signaling.on('join_session', (data: any) => {
      if (data.studentId && data.studentId !== 'instructor') {
        signaling.log(
          `[Student Connected] Student joined room: ${data.studentName || 'Student'} (${data.studentId})`,
          'info',
          'signaling'
        );

        setParticipants(prev => {
          const exists = prev.find(p => p.studentId === data.studentId || p.studentRegistrationId === data.studentRegistrationId);
          if (exists) {
            return prev.map(p => p.studentId === data.studentId ? { ...p, status: 'Active' } : p);
          }
          const newP: LabParticipant = {
            studentId: data.studentId,
            studentName: data.studentName || 'New Student',
            studentRegistrationId: data.studentRegistrationId || data.studentId,
            studentEmail: `${data.studentId.toLowerCase()}@student.edu`,
            status: 'Active',
            isScreenSharing: false,
            isHandRaised: false,
            joinTime: new Date().toISOString(),
            timeInLabSeconds: 0,
            screenShareDurationSeconds: 0,
            lastActivity: 'Joined lab session',
            lastActivityTime: new Date().toISOString()
          };
          return [...prev, newP];
        });
      }
    });

    // 4. Offer received milestone handler
    signaling.on('webrtc_offer', async (data: any) => {
      const { studentId, studentName, studentRegistrationId, offer } = data;
      if (!studentId || !offer) return;

      signaling.log(
        `[4. Offer received] Received WebRTC offer from student: ${studentName || studentId}`,
        'success',
        'signaling',
        { sdpType: offer.type }
      );

      // Close previous connection if exists
      const existingPc = peerConnectionsRef.current.get(studentId);
      if (existingPc) {
        signaling.log(`Closing prior RTCPeerConnection for student ${studentId}`, 'info', 'webrtc');
        existingPc.close();
      }

      // 1. PeerConnection created milestone for student peer
      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionsRef.current.set(studentId, pc);

      signaling.log(
        `[1. PeerConnection created] RTCPeerConnection created for student ${studentName || studentId}`,
        'success',
        'webrtc'
      );

      const updatePeerInfo = () => {
        setPeerStates(prev => ({
          ...prev,
          [studentId]: {
            connectionState: pc.connectionState,
            iceState: pc.iceConnectionState,
            signalingState: pc.signalingState,
            streamId: (pc as any).getRemoteStreams?.()[0]?.id || `stream-${studentId}`,
            trackCount: pc.getReceivers().length
          }
        }));
      };

      // 11. Connection state changes milestone
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        updatePeerInfo();
        signaling.log(
          `[11. Connection state changes] Student ${studentName || studentId}: connectionState transitioned to -> ${state}`,
          state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info',
          'webrtc'
        );
      };

      // 10. ICE connection state changes milestone
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        updatePeerInfo();
        signaling.log(
          `[10. ICE connection state changes] Student ${studentName || studentId}: iceConnectionState transitioned to -> ${state}`,
          state === 'connected' || state === 'completed' ? 'success' : state === 'failed' ? 'error' : 'info',
          'ice'
        );
      };

      // 8. ICE candidate generated milestone
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling.log(
            `[8. ICE candidate generated] Generated instructor candidate for student ${studentName || studentId}, dispatching`,
            'info',
            'ice'
          );
          signaling.send('webrtc_ice_candidate', studentId, {
            sessionId: canonicalRoomId,
            studentId,
            targetId: studentId,
            candidate: event.candidate,
            fromRole: 'instructor'
          });
        }
      };

      // Critical ontrack handler: receives the remote desktop stream!
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        signaling.log(
          `[Remote Stream Received] ontrack fired for student: ${studentName || studentId}! Stream ID: ${remoteStream.id}, Tracks: ${remoteStream.getTracks().length}`,
          'success',
          'webrtc'
        );

        setRemoteStreams(prev => ({
          ...prev,
          [studentId]: remoteStream
        }));

        setParticipants(prev =>
          prev.map(p => {
            if (p.studentId === studentId || p.studentRegistrationId === studentRegistrationId) {
              return {
                ...p,
                isScreenSharing: true,
                status: 'Active',
                lastActivity: 'Streaming live desktop'
              };
            }
            return p;
          })
        );

        updatePeerInfo();
      };

      try {
        // Set remote description from student offer
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        signaling.log(`[Remote Description Set] Applied offer from student ${studentName || studentId}`, 'info', 'webrtc');

        // 5. Answer created milestone
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        updatePeerInfo();
        signaling.log(
          `[5. Answer created] Created SDP answer for student ${studentName || studentId} (type: ${answer.type})`,
          'success',
          'webrtc'
        );

        // 6. Answer sent milestone
        signaling.send('webrtc_answer', studentId, {
          sessionId: canonicalRoomId,
          studentId,
          targetId: studentId,
          answer
        });
        signaling.log(
          `[6. Answer sent] Dispatched WebRTC answer to student ${studentName || studentId} on channel ${signaling.channelName}`,
          'success',
          'signaling'
        );
      } catch (err: any) {
        signaling.log(`[WebRTC Error] Failed processing offer from student ${studentId}: ${err.message}`, 'error', 'webrtc');
      }
    });

    // 9. ICE candidate received milestone
    signaling.on('webrtc_ice_candidate', async (data: any) => {
      if (data.fromRole === 'instructor') return;
      const { studentId, candidate } = data;
      if (!studentId || !candidate) return;

      const pc = peerConnectionsRef.current.get(studentId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          signaling.log(
            `[9. ICE candidate received] Applied ICE candidate from student ${studentId}`,
            'info',
            'ice'
          );
        } catch (err: any) {
          signaling.log(`[ICE Error] Failed to add candidate from student ${studentId}: ${err.message}`, 'warn', 'ice');
        }
      }
    });

    // Screen status change
    signaling.on('student_screen_status', (data: any) => {
      const { studentId, isScreenSharing } = data;
      signaling.log(`Student ${studentId} screen status: ${isScreenSharing ? 'Active' : 'Stopped'}`, 'info', 'media');

      if (!isScreenSharing) {
        const pc = peerConnectionsRef.current.get(studentId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(studentId);
        }
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
      }

      setParticipants(prev =>
        prev.map(p =>
          p.studentId === studentId
            ? { ...p, isScreenSharing, lastActivity: isScreenSharing ? 'Sharing screen' : 'Screen paused' }
            : p
        )
      );
    });

    // Raise Hand
    signaling.on('student_raise_hand', (data: any) => {
      const { studentId, message } = data;
      signaling.log(`[Hand Raised Alert] Student ${studentId} raised hand. Message: ${message || 'None'}`, 'warn', 'signaling');

      setParticipants(prev =>
        prev.map(p =>
          p.studentId === studentId
            ? {
                ...p,
                isHandRaised: true,
                helpRequest: message
                  ? { id: `help-${Date.now()}`, sessionId: canonicalRoomId, studentId, message, status: 'pending', requestedAt: new Date().toISOString() }
                  : null
              }
            : p
        )
      );
    });

    // Lower Hand
    signaling.on('student_lower_hand', (data: any) => {
      const { studentId } = data;
      setParticipants(prev =>
        prev.map(p => (p.studentId === studentId ? { ...p, isHandRaised: false, helpRequest: null } : p))
      );
    });

    // Student Left
    signaling.on('student_leave_lab', (data: any) => {
      const { studentId } = data;
      signaling.log(`Student ${studentId} left the lab`, 'info', 'signaling');

      const pc = peerConnectionsRef.current.get(studentId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(studentId);
      }
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });

      setParticipants(prev =>
        prev.map(p =>
          p.studentId === studentId
            ? { ...p, status: 'Left', isScreenSharing: false, isHandRaised: false, leaveTime: new Date().toISOString() }
            : p
        )
      );
    });

    return () => {
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
      signaling.destroy();
      signalingRef.current = null;
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
    signalingRef.current?.send('instructor_resolve_help', studentId, {
      sessionId: canonicalRoomId,
      studentId
    });

    setParticipants(prev =>
      prev.map(p => (p.studentId === studentId ? { ...p, isHandRaised: false, helpRequest: null } : p))
    );
  };

  // Copy Session Link
  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${session?.sessionCode || canonicalRoomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered Participants
  const filteredParticipants = participants.filter(p => {
    if (statusFilter === 'sharing' && !p.isScreenSharing) return false;
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

  // Stat Counters
  const totalCount = participants.length;
  const sharingCount = participants.filter(p => p.isScreenSharing).length;
  const handsRaisedCount = participants.filter(p => p.isHandRaised).length;

  // Selected Student Debug Info
  const activeFocusPeerState = focusedParticipant ? peerStates[focusedParticipant.studentId] : undefined;
  const firstPeerState = Object.values(peerStates)[0];
  const effectivePeerState = activeFocusPeerState || firstPeerState;

  const debugInfo: WebRTCDebugInfo = {
    role: 'instructor',
    rawSessionId,
    canonicalRoomId,
    channelName: signalingRef.current?.channelName || `vlab_webrtc_${canonicalRoomId}`,
    screenSharingStatus: sharingCount > 0,
    streamId: focusedParticipant ? remoteStreams[focusedParticipant.studentId]?.id : Object.values(remoteStreams)[0]?.id,
    trackCount: Object.keys(remoteStreams).length,
    peerConnectionState: effectivePeerState?.connectionState || (sharingCount > 0 ? 'connected' : 'new'),
    iceConnectionState: effectivePeerState?.iceState || (sharingCount > 0 ? 'connected' : 'new'),
    signalingState: effectivePeerState?.signalingState || 'stable',
    remoteStreamStatus: `${Object.keys(remoteStreams).length} Live Streams Connected`,
    transports: signalingRef.current?.getTransportStatus()
  };

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
            <strong className="text-cyan-400 font-mono">{session?.sessionCode || rawSessionId}</strong> • Canonical Room:{' '}
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
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Joined Stations</div>
            <div className="text-2xl font-bold text-white mt-0.5">{totalCount}</div>
          </div>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Streaming Live Screens</div>
            <div className="text-2xl font-bold text-emerald-400 mt-0.5 font-mono">
              {sharingCount} / {totalCount}
            </div>
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
              peerState={peerStates[participant.studentId]}
              onFocus={() => setFocusedParticipant(participant)}
              onLowerHand={() => handleLowerHand(participant.studentId)}
            />
          ))}
        </div>
      )}

      {/* WebRTC Diagnostics & Event Log Panel */}
      <WebRTCDebugPanel
        debugInfo={debugInfo}
        logs={logs}
        onClearLogs={() => setLogs([])}
        title="Instructor WebRTC Multi-Screen Stream Monitor & Verification Console"
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
                    <strong className={focusedParticipant.isScreenSharing ? 'text-emerald-400' : 'text-gray-400'}>
                      {remoteStreams[focusedParticipant.studentId]
                        ? 'Live WebRTC Desktop Stream'
                        : focusedParticipant.isScreenSharing
                        ? 'Active Stream'
                        : 'Not Sharing'}
                    </strong>
                  </span>
                  {peerStates[focusedParticipant.studentId] && (
                    <>
                      <span>•</span>
                      <span>
                        Peer State:{' '}
                        <strong className="text-cyan-400 font-mono">
                          {peerStates[focusedParticipant.studentId].connectionState}
                        </strong>
                      </span>
                    </>
                  )}
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
              <MockScreenCanvas
                type={focusedParticipant.mockScreenType || 'desktop'}
                studentName={focusedParticipant.studentName}
                studentId={focusedParticipant.studentRegistrationId}
                isFullSize={true}
              />
            )}

            {focusedParticipant.helpRequest && (
              <div className="absolute bottom-6 left-6 right-6 bg-black/85 backdrop-blur-md border border-amber-500/40 rounded-xl p-4 flex items-center justify-between shadow-2xl">
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
  remoteStream,
  peerState,
  onFocus,
  onLowerHand
}: {
  participant: LabParticipant;
  remoteStream?: MediaStream;
  peerState?: { connectionState: string; iceState: string; signalingState: string; streamId?: string; trackCount: number };
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

  const hasLiveStream = !!remoteStream;

  return (
    <div
      onClick={onFocus}
      className={`group bg-[#161b22] border rounded-xl overflow-hidden shadow-lg transition-all duration-200 cursor-pointer flex flex-col hover:border-emerald-500/70 hover:shadow-emerald-950/20 ${
        participant.isHandRaised
          ? 'border-amber-500 shadow-amber-950/30'
          : hasLiveStream
          ? 'border-emerald-500/60'
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

          {hasLiveStream ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Feed</span>
            </span>
          ) : participant.isScreenSharing ? (
            <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Active</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 font-medium">Paused</span>
          )}
        </div>
      </div>

      {/* Live Screen Video Element or Simulated Fallback */}
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
          <MockScreenCanvas
            type={participant.mockScreenType || 'desktop'}
            studentName={participant.studentName}
            studentId={participant.studentRegistrationId}
          />
        )}

        {/* WebRTC State Overlay Pill */}
        {peerState && (
          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono text-gray-300 border border-gray-800 flex items-center space-x-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                peerState.connectionState === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>{peerState.connectionState}</span>
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
          {hasLiveStream ? 'Streaming live screen' : participant.lastActivity || 'Present at station'}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          {Math.round(participant.timeInLabSeconds / 60)}m in lab
        </span>
      </div>
    </div>
  );
}

// Fallback Realistic Canvas
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
    <div
      className={`w-full h-full bg-[#181d24] flex flex-col overflow-hidden text-[10px] select-none ${
        isFullSize ? 'max-w-6xl max-h-[750px] shadow-2xl rounded-lg' : ''
      }`}
    >
      <div className="bg-[#21262d] px-2.5 py-1 flex items-center justify-between border-b border-gray-700/80">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2 h-2 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 inline-block" />
          <span className="text-[10px] text-gray-300 font-mono ml-2">
            Station-{studentId} • {type.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] text-gray-500 font-mono">1920x1080</span>
      </div>

      <div className="flex-1 bg-[#0d1117] p-3 flex flex-col items-center justify-center space-y-2 text-center">
        <Video className="w-8 h-8 text-gray-700" />
        <span className="text-gray-400 text-xs font-semibold">Station Desktop Idle</span>
        <span className="text-[10px] text-gray-600">Waiting for student to initiate screen sharing</span>
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
