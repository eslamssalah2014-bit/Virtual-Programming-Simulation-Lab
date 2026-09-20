'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { LabSession, LabParticipant } from '@/types';
import { useAuth } from '@/lib/context/AuthContext';
import {
  UnifiedSignalingClient,
  RTC_CONFIGURATION,
  WebRTCLogEntry
} from '@/lib/webrtc/signalingClient';
import { WebRTCDebugPanel, WebRTCDebugInfo } from '@/components/common/WebRTCDebugPanel';
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
  Tv,
  Check,
  RotateCcw,
  Video
} from 'lucide-react';

function StudentLabWorkstationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

  // Student Identity State
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');

  const [session, setSession] = useState<LabSession | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [helpMessage, setHelpMessage] = useState<string>('');
  const [activeHelpTicket, setActiveHelpTicket] = useState<string | null>(null);
  const [hasLeft, setHasLeft] = useState<boolean>(false);

  // WebRTC & Diagnostics State
  const [peerConnectionState, setPeerConnectionState] = useState<string>('new');
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [iceGatheringState, setIceGatheringState] = useState<string>('new');
  const [signalingState, setSignalingState] = useState<string>('stable');
  const [logs, setLogs] = useState<WebRTCLogEntry[]>([]);
  const [trackDetails, setTrackDetails] = useState<any[]>([]);

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

  // 2. Fetch Session Info
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.session) setSession(data.session);
      })
      .catch(err => console.error('Failed to load session details:', err));
  }, [sessionId]);

  // 3. Initialize Unified Signaling Channel
  useEffect(() => {
    if (!isIdentityConfirmed || hasLeft) return;

    const studentUid = getEffectiveStudentUid();
    const signaling = new UnifiedSignalingClient(sessionId, studentUid, 'student', addLog);
    signalingRef.current = signaling;

    signaling.log(
      `[Student Connected] Student entered lab session: ${sessionId}, ID: ${studentUid}, Name: ${studentName || 'Student'}`,
      'success',
      'signaling'
    );

    // Notify session of presence
    signaling.send('join_session', 'all', {
      sessionId,
      studentId: studentUid,
      studentName: studentName || currentUser.fullName,
      studentRegistrationId: studentId
    });

    // Handle incoming WebRTC Answer from Instructor
    const unsubAnswer = signaling.on('webrtc_answer', async (data: any) => {
      if (data.studentId && data.studentId !== studentUid && data.targetId !== studentUid) {
        return;
      }

      signaling.log(
        `[Answer Received] WebRTC answer received from instructor for student ${studentUid}`,
        'success',
        'signaling',
        { sdpType: data.answer?.type }
      );

      if (peerConnectionRef.current && data.answer) {
        try {
          if (peerConnectionRef.current.signalingState !== 'stable') {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            signaling.log(
              `[Remote Description Set] WebRTC handshake completed! Remote answer applied successfully.`,
              'success',
              'webrtc'
            );
            setSignalingState(peerConnectionRef.current.signalingState);
          }
        } catch (err: any) {
          signaling.log(`[WebRTC Error] Failed to set remote description: ${err.message}`, 'error', 'webrtc');
        }
      }
    });

    // Handle incoming ICE candidates from Instructor
    const unsubCandidate = signaling.on('webrtc_ice_candidate', async (data: any) => {
      if (data.fromRole === 'student' && data.senderId === studentUid) return;
      if (data.studentId && data.studentId !== studentUid && data.targetId !== studentUid) return;

      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          signaling.log(
            `[ICE Candidate Exchange] Added ICE candidate from instructor (${data.candidate.candidate?.split(' ')[7] || 'candidate'})`,
            'info',
            'ice'
          );
        } catch (err: any) {
          signaling.log(`[ICE Error] Failed to add candidate: ${err.message}`, 'warn', 'ice');
        }
      }
    });

    // Handle participant updates (e.g. instructor lowered hand)
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
  }, [sessionId, isIdentityConfirmed, studentName, studentId, hasLeft]);

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

  // Confirm Identity / Enter
  const handleConfirmIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim()) return;

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
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
      signaling?.log('Requesting screen capture via getDisplayMedia()...', 'info', 'media');

      // 1. Capture screen stream via getDisplayMedia()
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        } as any,
        audio: false
      });

      streamRef.current = stream;
      signaling?.log(
        `[getDisplayMedia Verified] Screen captured successfully! Stream ID: ${stream.id}, Video Tracks: ${stream.getVideoTracks().length}`,
        'success',
        'media'
      );

      // Local preview assignment: video.srcObject = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      // Track specs for debug panel
      const tracks = stream.getTracks().map(t => ({
        id: t.id,
        kind: t.kind,
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      }));
      setTrackDetails(tracks);

      // 2. Setup RTCPeerConnection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = pc;

      setPeerConnectionState(pc.connectionState);
      setIceConnectionState(pc.iceConnectionState);
      setIceGatheringState(pc.iceGatheringState);
      setSignalingState(pc.signalingState);

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setPeerConnectionState(state);
        signaling?.log(
          `[WebRTC Connection State Changed] State is now: ${state}`,
          state === 'connected' ? 'success' : state === 'failed' ? 'error' : 'info',
          'webrtc'
        );
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setIceConnectionState(state);
        signaling?.log(
          `[ICE Connection State Changed] ICE state is now: ${state}`,
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

      // 3. ICE Candidate Generation & Sending
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling?.log(
            `[ICE Candidate Generated] Type: ${event.candidate.type || 'candidate'}, Protocol: ${event.candidate.protocol || 'udp'}`,
            'info',
            'ice'
          );
          signaling?.send('webrtc_ice_candidate', 'instructor', {
            sessionId,
            studentId: studentUid,
            candidate: event.candidate,
            fromRole: 'student'
          });
        }
      };

      // 4. Add captured video tracks to RTCPeerConnection using addTrack()
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        signaling?.log(
          `[addTrack Verified] Added track to RTCPeerConnection: ${track.kind} (${track.label || 'Screen'})`,
          'success',
          'webrtc'
        );
      });

      // 5. Create WebRTC Offer
      signaling?.log('Creating WebRTC SDP offer...', 'info', 'webrtc');
      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });

      await pc.setLocalDescription(offer);
      signaling?.log(
        `[Offer Created] Local description set with SDP offer (type: ${offer.type})`,
        'success',
        'webrtc'
      );

      // 6. Send WebRTC Offer to Instructor via signaling channel
      signaling?.send('webrtc_offer', 'instructor', {
        sessionId,
        studentId: studentUid,
        studentName: studentName.trim() || currentUser.fullName,
        studentRegistrationId: studentId.trim(),
        offer
      });
      signaling?.log(`[Offer Sent] Dispatched WebRTC offer to instructor`, 'success', 'signaling');

      // Notify screen status change
      signaling?.send('student_screen_status', 'instructor', {
        sessionId,
        studentId: studentUid,
        isScreenSharing: true
      });

      // Handle user clicking "Stop Sharing" from browser native banner
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
    setTrackDetails([]);
    setPeerConnectionState('closed');
    setIceConnectionState('closed');

    signaling?.log('Screen sharing stopped and peer connection closed', 'info', 'media');

    signaling?.send('student_screen_status', 'instructor', {
      sessionId,
      studentId: studentUid,
      isScreenSharing: false
    });
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
        sessionId,
        studentId: studentUid,
        studentName: studentName.trim() || currentUser.fullName,
        studentRegistrationId: studentId.trim(),
        offer
      });
      signaling?.log('[ICE Restart] Re-sent offer with iceRestart: true', 'success', 'ice');
    } catch (err: any) {
      signaling?.log(`ICE Restart error: ${err.message}`, 'error', 'ice');
    }
  };

  // Raise / Lower Hand Toggle
  const handleToggleRaiseHand = () => {
    const signaling = signalingRef.current;
    const studentUid = getEffectiveStudentUid();

    if (isHandRaised) {
      signaling?.send('student_lower_hand', 'instructor', { sessionId, studentId: studentUid });
      setIsHandRaised(false);
      setActiveHelpTicket(null);
    } else {
      signaling?.send('student_raise_hand', 'instructor', { sessionId, studentId: studentUid });
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
      sessionId,
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
      sessionId,
      studentId: studentUid
    });

    setHasLeft(true);
  };

  // Construct Debug Object for Panel
  const debugInfo: WebRTCDebugInfo = {
    role: 'student',
    screenSharingStatus: isScreenSharing,
    streamId: streamRef.current?.id,
    trackCount: streamRef.current?.getTracks().length || 0,
    trackDetails,
    peerConnectionState,
    iceConnectionState,
    iceGatheringState,
    signalingState,
    remoteStreamStatus: isScreenSharing ? 'Transmitting to Instructor' : 'Stream Idle'
  };

  // Left the lab state
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

  // Student Identity Prompt
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
          {/* WebRTC State Badge */}
          <div className="hidden sm:flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400 text-[11px]">WebRTC:</span>
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

          {/* Raise Hand Button */}
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

          {/* Need Help Button */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Request Help</span>
          </button>

          {/* Leave Lab */}
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
            {/* Live Video Preview element */}
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

            {/* Screen Control Bar */}
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
        title="Student WebRTC Diagnostics & Stream Inspector"
      />

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
