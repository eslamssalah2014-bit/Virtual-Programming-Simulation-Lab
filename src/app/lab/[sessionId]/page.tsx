'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { LabSession } from '@/types';
import { useAuth } from '@/lib/context/AuthContext';
import {
  UnifiedSignalingClient,
  RTC_CONFIGURATION,
  WebRTCLogEntry
} from '@/lib/webrtc/signalingClient';
import { WebRTCDebugPanel, WebRTCDebugInfo } from '@/components/common/WebRTCDebugPanel';
import { SessionDebugPanel, SessionDebugData } from '@/components/common/SessionDebugPanel';
import { lookupSessionEverywhere, normalizeSessionId } from '@/lib/supabase/sessions';
import {
  MonitorPlay,
  MonitorOff,
  Hand,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Radio,
  User,
  Hash,
  ShieldCheck,
  ChevronRight,
  Tv
} from 'lucide-react';

function StudentLabWorkstationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawSessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

  // Student Identity State
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');

  const [session, setSession] = useState<LabSession | null>(null);
  const [canonicalRoomId, setCanonicalRoomId] = useState<string>(rawSessionId);
  const [sessionDebugData, setSessionDebugData] = useState<SessionDebugData>({
    sessionId: normalizeSessionId(rawSessionId),
    sessionCode: normalizeSessionId(rawSessionId),
    sessionStatus: 'active',
    databaseRecordFound: false,
    extractedUrlCode: rawSessionId,
    executedQuery: `SELECT * FROM sessions WHERE id = '${normalizeSessionId(rawSessionId)}'`,
    returnedResult: 'Querying database...'
  });

  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [helpMessage, setHelpMessage] = useState<string>('');
  const [activeHelpTicket, setActiveHelpTicket] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState<boolean>(false);

  // WebRTC Diagnostics State
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new');
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [iceGatheringState, setIceGatheringState] = useState<string>('new');
  const [signalingState, setSignalingState] = useState<string>('stable');
  const [logs, setLogs] = useState<WebRTCLogEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<UnifiedSignalingClient | null>(null);

  const addLog = (entry: WebRTCLogEntry) => {
    setLogs(prev => [entry, ...prev.slice(0, 199)]);
  };

  const getEffectiveStudentUid = () => {
    return studentId.trim() || currentUser?.id || `stud-${Date.now().toString().slice(-4)}`;
  };

  // 1. Initial Identity Check
  useEffect(() => {
    const qName = searchParams.get('name');
    const qId = searchParams.get('studentId');
    const localName = typeof window !== 'undefined' ? localStorage.getItem('vlab_student_name') : null;
    const localId = typeof window !== 'undefined' ? localStorage.getItem('vlab_student_id') : null;

    const initialName = qName || localName || (currentUser?.role === 'student' ? currentUser.fullName : '');
    const initialId = qId || localId || (currentUser?.role === 'student' ? currentUser.id : '');

    if (initialName && initialId) {
      setStudentName(initialName);
      setStudentId(initialId);
      setIsIdentityConfirmed(true);
    }
  }, [searchParams, currentUser]);

  // 2. Fetch Session & Resolve Canonical Room ID via lookupSessionEverywhere
  useEffect(() => {
    async function resolveSession() {
      const result = await lookupSessionEverywhere(rawSessionId);
      console.log(`[Student Lab URL Code]: ${result.logCode}`);
      console.log(`[Student Lab Database Query]: ${result.logQuery}`);
      console.log(`[Student Lab Result]: ${result.logResult}`);

      if (result.session) {
        setSession(result.session);
        setCanonicalRoomId(result.session.id); // Matches instructor room format
        setSessionDebugData({
          sessionId: result.session.id,
          sessionCode: result.session.sessionCode || result.session.id,
          sessionStatus: result.session.status || 'active',
          startTime: result.session.startTime,
          endTime: result.session.endTime,
          databaseRecordFound: true,
          foundIn: result.foundIn,
          extractedUrlCode: result.logCode,
          executedQuery: result.logQuery,
          returnedResult: result.logResult
        });
      }
    }
    resolveSession();
  }, [rawSessionId]);

  // 3. Initialize Unified Signaling Client ONLY after session is loaded from database (Requirement 6)
  useEffect(() => {
    // Prevent WebRTC initialization until the session is successfully found and loaded
    if (!isIdentityConfirmed || hasLeft || !session || !session.id) return;

    const studentUid = getEffectiveStudentUid();
    const signaling = new UnifiedSignalingClient(
      rawSessionId,
      canonicalRoomId,
      studentUid,
      'student',
      addLog
    );
    signalingRef.current = signaling;

    signaling.log(
      `Student Station Connected | Raw: ${rawSessionId} | Canonical Room: ${canonicalRoomId} | Channel: ${signaling.channelName} | ID: ${studentUid}`,
      'success',
      'signaling'
    );

    // Notify presence to room
    signaling.send('join_session', 'all', {
      sessionId: canonicalRoomId,
      rawSessionId,
      studentId: studentUid,
      studentName: studentName || currentUser.fullName,
      studentRegistrationId: studentId
    });

    // 7. Answer received milestone handler
    const unsubAnswer = signaling.on('webrtc_answer', async (data: any) => {
      if (data.studentId && data.studentId !== studentUid && data.targetId !== studentUid) {
        return;
      }

      signaling.log(
        `[7. Answer received] Received WebRTC answer from instructor for student ${studentUid}`,
        'success',
        'signaling',
        { sdpType: data.answer?.type }
      );

      const pc = peerConnectionRef.current;
      if (pc && data.answer) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            signaling.log(
              `[Handshake Complete] Remote description set with instructor answer! State transitioning to connecting/connected...`,
              'success',
              'webrtc'
            );
            setSignalingState(pc.signalingState);
            setPeerConnectionState(pc.connectionState);
          }
        } catch (err: any) {
          signaling.log(`[WebRTC Handshake Error] Failed to set remote description: ${err.message}`, 'error', 'webrtc');
        }
      }
    });

    // 9. ICE candidate received milestone handler
    const unsubCandidate = signaling.on('webrtc_ice_candidate', async (data: any) => {
      if (data.fromRole === 'student' && data.senderId === studentUid) return;
      if (data.studentId && data.studentId !== studentUid && data.targetId !== studentUid) return;

      const pc = peerConnectionRef.current;
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          signaling.log(
            `[9. ICE candidate received] Added ICE candidate from instructor (${data.candidate.type || 'candidate'})`,
            'info',
            'ice'
          );
        } catch (err: any) {
          signaling.log(`[ICE Error] Failed to add candidate: ${err.message}`, 'warn', 'ice');
        }
      }
    });

    // Handle participant updates
    const unsubParticipant = signaling.on('participant_updated', (updated: any) => {
      if (updated.studentRegistrationId === studentId || updated.studentId === studentUid) {
        setIsHandRaised(updated.isHandRaised);
        if (!updated.isHandRaised) {
          setActiveHelpTicket(null);
        }
      }
    });

    return () => {
      unsubAnswer();
      unsubCandidate();
      unsubParticipant();
      signaling.destroy();
      signalingRef.current = null;
    };
  }, [rawSessionId, canonicalRoomId, isIdentityConfirmed, studentName, studentId, hasLeft]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Confirm Identity
  const handleConfirmIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim()) return;

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/sessions/${rawSessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentRegistrationId: studentId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enter session');
      }

      if (data.session) {
        setCanonicalRoomId(data.session.id);
      }

      localStorage.setItem('vlab_student_name', studentName.trim());
      localStorage.setItem('vlab_student_id', studentId.trim());
      setIsIdentityConfirmed(true);
    } catch (err: any) {
      setJoinError(err.message || 'Error entering lab');
    } finally {
      setIsJoining(false);
    }
  };

  // WebRTC Screen Sharing Implementation
  const handleStartScreenShare = async () => {
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    try {
      signaling?.log('Requesting desktop screen capture via getDisplayMedia()...', 'info', 'media');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        } as any,
        audio: false
      });

      streamRef.current = stream;
      signaling?.log(
        `Screen stream captured successfully! ID: ${stream.id}, Tracks: ${stream.getVideoTracks().length}`,
        'success',
        'media'
      );

      // Local preview assignment
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      // 1. PeerConnection created milestone
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = pc;

      setPeerConnectionState(pc.connectionState);
      setIceConnectionState(pc.iceConnectionState);
      setIceGatheringState(pc.iceGatheringState);
      setSignalingState(pc.signalingState);

      signaling?.log(
        `[1. PeerConnection created] RTCPeerConnection created with Google STUN servers`,
        'success',
        'webrtc'
      );

      // 11. Connection state changes milestone
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setPeerConnectionState(state);
        signaling?.log(
          `[11. Connection state changes] Connection state is now: ${state}`,
          state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info',
          'webrtc'
        );
      };

      // 10. ICE connection state changes milestone
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setIceConnectionState(state);
        signaling?.log(
          `[10. ICE connection state changes] ICE state is now: ${state}`,
          state === 'connected' || state === 'completed' ? 'success' : state === 'failed' ? 'error' : 'info',
          'ice'
        );
      };

      pc.onicegatheringstatechange = () => {
        setIceGatheringState(pc.iceGatheringState);
      };

      pc.onsignalingstatechange = () => {
        setSignalingState(pc.signalingState);
      };

      // 8. ICE candidate generated milestone
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling?.log(
            `[8. ICE candidate generated] Generated local candidate (${event.candidate.type || 'candidate'}), forwarding to instructor`,
            'info',
            'ice'
          );
          signaling?.send('webrtc_ice_candidate', 'instructor', {
            sessionId: canonicalRoomId,
            studentId: studentUid,
            candidate: event.candidate,
            fromRole: 'student'
          });
        }
      };

      // Add tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        signaling?.log(`Added track to RTCPeerConnection: ${track.kind} (${track.label || 'Screen'})`, 'success', 'webrtc');
      });

      // 2. Offer created milestone
      signaling?.log('Creating WebRTC SDP offer...', 'info', 'webrtc');
      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);
      setSignalingState(pc.signalingState);
      signaling?.log(
        `[2. Offer created] SDP offer created and local description set (type: ${offer.type})`,
        'success',
        'webrtc'
      );

      // 3. Offer sent milestone
      signaling?.send('webrtc_offer', 'instructor', {
        sessionId: canonicalRoomId,
        rawSessionId,
        studentId: studentUid,
        studentName: studentName.trim() || currentUser.fullName,
        studentRegistrationId: studentId.trim(),
        offer
      });
      signaling?.log(
        `[3. Offer sent] WebRTC offer dispatched to instructor on channel ${signaling?.channelName}`,
        'success',
        'signaling'
      );

      // Notify screen status
      signaling?.send('student_screen_status', 'instructor', {
        sessionId: canonicalRoomId,
        studentId: studentUid,
        isScreenSharing: true
      });

      // Native browser stop sharing button
      stream.getVideoTracks()[0].onended = () => {
        signaling?.log('Screen share ended by browser chrome controls', 'warn', 'media');
        handleStopScreenShare();
      };
    } catch (err: any) {
      signaling?.log(`[Screen Share Failed or Cancelled]: ${err.message}`, 'warn', 'media');
      console.warn('Screen share error:', err);
    }
  };

  // Stop Screen Sharing
  const handleStopScreenShare = () => {
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsScreenSharing(false);
    setPeerConnectionState('closed');
    setIceConnectionState('closed');

    signaling?.log('Screen sharing stopped and peer connection closed', 'info', 'media');

    signaling?.send('student_screen_status', 'instructor', {
      sessionId: canonicalRoomId,
      studentId: studentUid,
      isScreenSharing: false
    });
  };

  // Re-send Offer
  const handleTriggerOffer = async () => {
    const pc = peerConnectionRef.current;
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    if (!pc || !isScreenSharing) {
      handleStartScreenShare();
      return;
    }

    try {
      signaling?.log('Regenerating and re-sending WebRTC offer...', 'info', 'webrtc');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      signaling?.send('webrtc_offer', 'instructor', {
        sessionId: canonicalRoomId,
        studentId: studentUid,
        studentName: studentName.trim() || currentUser.fullName,
        studentRegistrationId: studentId.trim(),
        offer
      });
      signaling?.log('[3. Offer sent] Re-sent WebRTC offer to instructor', 'success', 'signaling');
    } catch (err: any) {
      signaling?.log(`Re-offer error: ${err.message}`, 'error', 'webrtc');
    }
  };

  // Force ICE Restart
  const handleRestartIce = async () => {
    const pc = peerConnectionRef.current;
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    if (!pc || !isScreenSharing) {
      signaling?.log('Cannot restart ICE: no active screen sharing peer connection', 'warn', 'ice');
      return;
    }

    try {
      signaling?.log('Triggering ICE Restart offer...', 'info', 'ice');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      signaling?.send('webrtc_offer', 'instructor', {
        sessionId: canonicalRoomId,
        studentId: studentUid,
        studentName: studentName.trim() || currentUser.fullName,
        studentRegistrationId: studentId.trim(),
        offer
      });
      signaling?.log('[ICE Restart] Dispatched offer with iceRestart: true', 'success', 'ice');
    } catch (err: any) {
      signaling?.log(`ICE Restart error: ${err.message}`, 'error', 'ice');
    }
  };

  // Raise / Lower Hand Toggle
  const handleToggleRaiseHand = () => {
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    if (isHandRaised) {
      signaling?.send('student_lower_hand', 'instructor', { sessionId: canonicalRoomId, studentId: studentUid });
      setIsHandRaised(false);
      setActiveHelpTicket(null);
    } else {
      signaling?.send('student_raise_hand', 'instructor', { sessionId: canonicalRoomId, studentId: studentUid });
      setIsHandRaised(true);
    }
  };

  // Submit Need Help Ticket
  const handleSubmitHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMessage.trim()) return;

    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    signaling?.send('student_raise_hand', 'instructor', {
      sessionId: canonicalRoomId,
      studentId: studentUid,
      message: helpMessage.trim()
    });

    setIsHandRaised(true);
    setActiveHelpTicket(helpMessage.trim());
    setIsHelpModalOpen(false);
    setHelpMessage('');
  };

  // Leave Session
  const handleLeaveLab = () => {
    const confirmed = window.confirm('Are you sure you want to leave this computer lab session?');
    if (!confirmed) return;

    handleStopScreenShare();

    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    signaling?.send('student_leave_lab', 'instructor', {
      sessionId: canonicalRoomId,
      studentId: studentUid
    });

    setHasLeft(true);
  };

  // Construct Debug Object for Panel
  const debugInfo: WebRTCDebugInfo = {
    role: 'student',
    rawSessionId,
    canonicalRoomId,
    channelName: signalingRef.current?.channelName || `vlab_webrtc_${canonicalRoomId}`,
    screenSharingStatus: isScreenSharing,
    streamId: streamRef.current?.id,
    trackCount: streamRef.current?.getTracks().length || 0,
    peerConnectionState,
    iceConnectionState,
    iceGatheringState,
    signalingState,
    remoteStreamStatus: isScreenSharing ? 'Transmitting to Instructor' : 'Stream Idle',
    transports: signalingRef.current?.getTransportStatus()
  };

  // Left the lab view
  if (hasLeft) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Lab Session Ended</h2>
          <p className="text-xs text-gray-400">
            You have logged out of workstation station <strong>{studentId}</strong>. Your attendance and active screen
            duration have been recorded.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Student Identity Form
  if (!isIdentityConfirmed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Tv className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
              <span>Computer Lab Entry</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              {session?.sessionTitle || session?.groupName || 'Virtual Computer Lab'}
            </h1>
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
                Group: {session?.groupCode || 'LAB-1'}
              </span>
              <span>Session #{session?.sessionNumber || '1'}</span>
            </div>
          </div>

          <form onSubmit={handleConfirmIdentity} className="space-y-4">
            {joinError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Student ID / Registration # <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2026-089"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining || !studentName.trim() || !studentId.trim()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-950/20"
            >
              {isJoining ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Lab Workstation...</span>
                </>
              ) : (
                <>
                  <span>Enter Computer Lab</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Workstation View
  return (
    <div className="flex-1 bg-[#0a0d12] flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Top Station Header */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {session?.groupCode || 'LAB-1'}
              </span>
              <h1 className="text-sm font-bold text-white">
                {session?.sessionTitle || session?.groupName || 'Classroom Computer Lab'}
              </h1>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Workstation Station: <span className="text-gray-200 font-mono font-semibold">{studentId}</span> •{' '}
              Student: <span className="text-gray-200 font-semibold">{studentName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400 text-[11px]">Peer:</span>
            <span
              className={`font-mono text-[11px] font-bold ${
                peerConnectionState === 'connected'
                  ? 'text-emerald-400'
                  : peerConnectionState === 'connecting'
                  ? 'text-amber-400'
                  : 'text-gray-400'
              }`}
            >
              {peerConnectionState}
            </span>
          </div>

          <button
            onClick={handleToggleRaiseHand}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              isHandRaised
                ? 'bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold shadow-md shadow-amber-900/30'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
            }`}
          >
            <Hand className={`w-4 h-4 ${isHandRaised ? 'animate-bounce' : 'text-amber-400'}`} />
            <span>{isHandRaised ? 'Hand Raised (Lower)' : 'Raise Hand'}</span>
          </button>

          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Request Help</span>
          </button>

          <button
            onClick={handleLeaveLab}
            className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center space-x-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Raised Hand Active Banner */}
      {isHandRaised && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <Hand className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
            <span>
              Your hand is raised! The instructor has been alerted in their monitoring dashboard.
              {activeHelpTicket && (
                <span className="text-amber-300/80 ml-1 italic">Message: "{activeHelpTicket}"</span>
              )}
            </span>
          </div>
          <button
            onClick={handleToggleRaiseHand}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/40 text-[11px]"
          >
            Lower Hand
          </button>
        </div>
      )}

      {/* Main Desktop Sharing Workstation Area */}
      <div className="flex-1 bg-[#12161f] border border-gray-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 relative min-h-[460px] shadow-xl">
        {isScreenSharing ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden border border-emerald-500/40 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40 flex items-center space-x-2 text-[11px] text-emerald-400 font-semibold shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Transmitting Screen Stream to Instructor</span>
              </div>
              <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-lg border border-gray-700 text-[10px] text-gray-300 font-mono">
                Stream ID: {streamRef.current?.id.substring(0, 12)}...
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleStopScreenShare}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-red-950/30"
              >
                <MonitorOff className="w-4 h-4" />
                <span>Stop Sharing Screen</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full text-center space-y-5 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/80 border border-gray-700 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <MonitorPlay className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white">Share Your Desktop Screen</h2>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Click below to select your screen or application window. Your instructor will observe your workstation
                in real time for guidance and attendance validation.
              </p>
            </div>

            <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl text-left space-y-2 text-[11px] text-gray-400">
              <div className="flex items-center space-x-2 text-gray-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Lab Connection Readiness</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-gray-400 text-[10px]">
                <li>Direct WebRTC PeerConnection with Google STUN</li>
                <li>Full Desktop capture with mouse cursor enabled</li>
                <li>Zero recorded storage: streams directly to instructor live</li>
              </ul>
            </div>

            <button
              onClick={handleStartScreenShare}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xl shadow-emerald-950/40"
            >
              <MonitorPlay className="w-4 h-4" />
              <span>Start Sharing Screen</span>
            </button>
          </div>
        )}
      </div>

      {/* WebRTC Diagnostics & Debugging Panel */}
      <WebRTCDebugPanel
        debugInfo={debugInfo}
        logs={logs}
        onClearLogs={() => setLogs([])}
        onRestartIce={handleRestartIce}
        onTriggerOffer={handleTriggerOffer}
        title="Student WebRTC Signaling & Stream Verification Console"
      />

      {/* Session Database & Lookup Diagnostics Panel */}
      <SessionDebugPanel debugData={sessionDebugData} />

      {/* Need Help Ticket Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-gray-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Request Instructor Assistance</span>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitHelp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Briefly describe what you need help with:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Screen sharing permission error, question regarding the lab exercise..."
                  value={helpMessage}
                  onChange={e => setHelpMessage(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md"
                >
                  Send Help Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentLabWorkstationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[80vh] text-gray-400 text-xs">
          Loading student workstation...
        </div>
      }
    >
      <StudentLabWorkstationContent />
    </Suspense>
  );
}
