'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { LabSession } from '@/types';
import { useAuth } from '@/lib/context/AuthContext';
import {
  PureSupabaseSignaling,
  RTC_STUN_CONFIGURATION,
  DiagnosticsState,
  StageLog
} from '@/lib/webrtc/pureSupabaseSignaling';
import { SupabaseConfigGate } from '@/components/common/SupabaseConfigGate';
import { WebRTCStageDiagnostics } from '@/components/common/WebRTCStageDiagnostics';
import { lookupSessionEverywhere, normalizeSessionId } from '@/lib/supabase/sessions';
import {
  MonitorPlay,
  MonitorOff,
  Hand,
  HelpCircle,
  LogOut,
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
  const [canonicalRoomId, setCanonicalRoomId] = useState<string>(normalizeSessionId(rawSessionId));

  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [helpMessage, setHelpMessage] = useState<string>('');
  const [hasLeft, setHasLeft] = useState<boolean>(false);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    signalingStatus: 'connecting',
    offerStatus: 'pending',
    answerStatus: 'pending',
    iceStatus: { sent: 0, received: 0, connectionState: 'new', iceState: 'new' },
    remoteStreamStatus: 'none',
    channelName: `session:${normalizeSessionId(rawSessionId)}`,
    sessionId: normalizeSessionId(rawSessionId),
    logs: []
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<PureSupabaseSignaling | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

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

  // 2. Fetch Session & Resolve Canonical Room ID
  useEffect(() => {
    async function resolveSession() {
      const result = await lookupSessionEverywhere(rawSessionId);
      if (result.session) {
        setSession(result.session);
        setCanonicalRoomId(result.session.id);
      }
    }
    resolveSession();
  }, [rawSessionId]);

  // 3. Initialize Pure Supabase Realtime Signaling Client
  useEffect(() => {
    if (!isIdentityConfirmed || hasLeft || !session || !session.id) return;

    const cleanRoomId = normalizeSessionId(rawSessionId);
    const studentUid = getEffectiveStudentUid();

    const signaling = new PureSupabaseSignaling({
      sessionId: cleanRoomId,
      role: 'student',
      clientId: studentUid,
      onDiagnostics: (d) => setDiagnostics(d)
    });

    signalingRef.current = signaling;

    // Connect to Supabase Realtime channel: session:<sessionId>
    signaling.connect().then((connected) => {
      if (connected) {
        // Listen for Answer from Instructor
        signaling.onAnswer(async (data) => {
          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              signaling.logStage('ANSWER_RECEIVED', `Applied remote SDP answer from instructor`);

              // Flush any queued ICE candidates
              for (const cand of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              pendingCandidatesRef.current = [];
            }
          } catch (err: any) {
            console.error('Failed to set remote description on student:', err);
          }
        });

        // Listen for ICE candidates from Instructor
        signaling.onIceCandidate(async (data) => {
          const pc = peerConnectionRef.current;
          if (!pc) return;

          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn('Student addIceCandidate error:', err);
            }
          } else {
            pendingCandidatesRef.current.push(data.candidate);
          }
        });
      }
    });

    return () => {
      signaling.destroy();
      signalingRef.current = null;
    };
  }, [rawSessionId, isIdentityConfirmed, studentName, studentId, hasLeft, session]);

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
    if (!signaling) return;

    const studentUid = getEffectiveStudentUid();

    try {
      // Stage 1: SCREEN_CAPTURE_STARTED
      signaling.logStage('SCREEN_CAPTURE_STARTED', 'Requesting monitor capture via navigator.mediaDevices.getDisplayMedia()');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false
      });

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error('No video track found in captured screen stream');
      }

      // Local preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      // Close previous connection if exists
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Create RTCPeerConnection with STUN
      const pc = new RTCPeerConnection(RTC_STUN_CONFIGURATION);
      peerConnectionRef.current = pc;

      pc.onconnectionstatechange = () => {
        signaling.updateDiagnostics({
          iceStatus: {
            ...signaling.getDiagnostics().iceStatus,
            connectionState: pc.connectionState
          }
        });
      };

      pc.oniceconnectionstatechange = () => {
        signaling.updateDiagnostics({
          iceStatus: {
            ...signaling.getDiagnostics().iceStatus,
            iceState: pc.iceConnectionState
          }
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signaling.sendIceCandidate(studentUid, event.candidate, 'student');
        }
      };

      // Stage 2: TRACKS_ADDED
      pc.addTrack(videoTrack, stream);
      signaling.logStage('TRACKS_ADDED', `Video track added to RTCPeerConnection: ${videoTrack.label}`);

      // Handle native browser stop sharing
      videoTrack.onended = () => {
        handleStopScreenShare();
      };

      // Stage 3: OFFER_CREATED
      const offer = await pc.createOffer({
        offerToReceiveVideo: false,
        offerToReceiveAudio: false
      });
      await pc.setLocalDescription(offer);
      signaling.logStage('OFFER_CREATED', `SDP Offer created and local description set (type: ${offer.type})`);

      // Stage 4: OFFER_SENT
      await signaling.sendOffer(studentUid, studentName.trim() || currentUser?.fullName || 'Student', offer);

    } catch (err: any) {
      console.error('Screen share error:', err);
    }
  };

  const handleStopScreenShare = () => {
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
  };

  const handleToggleRaiseHand = () => {
    setIsHandRaised(!isHandRaised);
  };

  const handleSubmitHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMessage.trim()) return;
    setIsHandRaised(true);
    setIsHelpModalOpen(false);
    setHelpMessage('');
  };

  const handleLeaveLab = () => {
    if (window.confirm('Are you sure you want to leave the lab workstation?')) {
      handleStopScreenShare();
      setHasLeft(true);
    }
  };

  if (hasLeft) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-[#161b22] border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <Tv className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Lab Session Concluded</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            You have disconnected from the live computer lab.
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
                Click below to select your screen or window. Your desktop stream is transmitted directly to the instructor via WebRTC through Supabase Realtime signaling.
              </p>
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

      {/* Requirement 11: Real WebRTC Stage Diagnostics Console */}
      <WebRTCStageDiagnostics
        diagnostics={diagnostics}
        role="student"
        title="Student WebRTC Realtime Signaling Diagnostics"
      />
    </div>
  );
}

export default function StudentLabPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[80vh] text-gray-400 text-xs">
          Loading student workstation...
        </div>
      }
    >
      <SupabaseConfigGate>
        <StudentLabWorkstationContent />
      </SupabaseConfigGate>
    </Suspense>
  );
}
