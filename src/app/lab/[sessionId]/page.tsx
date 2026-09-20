'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getSocket } from '@/lib/socket/client';
import { LabSession, LabParticipant } from '@/types';
import {
  Monitor,
  Radio,
  Hand,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Hash,
  ArrowRight,
  Sparkles,
  StopCircle,
  Play,
  Send,
  X
} from 'lucide-react';

function StudentScreenShareContent() {
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // 3. Socket Connection & Presence
  useEffect(() => {
    if (!isIdentityConfirmed || hasLeft) return;

    const socket = getSocket();
    const activeStudentUser = {
      id: studentId || currentUser.id,
      fullName: studentName || currentUser.fullName,
      email: `${(studentId || 'stud').toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`,
      role: 'student' as const
    };

    socket.emit('join_session', { sessionId, user: activeStudentUser });

    // Listen for instructor lowering hand / resolving help
    const handleParticipantUpdated = (updated: LabParticipant) => {
      if (updated.studentRegistrationId === studentId || updated.studentId === activeStudentUser.id) {
        setIsHandRaised(updated.isHandRaised);
        if (!updated.isHandRaised) {
          setActiveHelpTicket(null);
        }
      }
    };

    socket.on('participant_updated', handleParticipantUpdated);

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      socket.emit('student_heartbeat', {
        sessionId,
        studentId: activeStudentUser.id
      });
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off('participant_updated', handleParticipantUpdated);
    };
  }, [sessionId, isIdentityConfirmed, studentName, studentId, currentUser, hasLeft]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

  // Start Screen Sharing via getDisplayMedia
  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);

      const socket = getSocket();
      socket.emit('student_screen_status', {
        sessionId,
        studentId: studentId || currentUser.id,
        isScreenSharing: true
      });

      // Handle user clicking "Stop Sharing" from browser native chrome banner
      stream.getVideoTracks()[0].onended = () => {
        handleStopScreenShare();
      };
    } catch (err: any) {
      console.warn('Screen share cancelled or not allowed:', err);
    }
  };

  // Stop Screen Sharing
  const handleStopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);

    const socket = getSocket();
    socket.emit('student_screen_status', {
      sessionId,
      studentId: studentId || currentUser.id,
      isScreenSharing: false
    });
  };

  // Raise / Lower Hand Toggle
  const handleToggleRaiseHand = () => {
    const socket = getSocket();
    const studentUid = studentId || currentUser.id;

    if (isHandRaised) {
      socket.emit('student_lower_hand', { sessionId, studentId: studentUid });
      setIsHandRaised(false);
      setActiveHelpTicket(null);
    } else {
      socket.emit('student_raise_hand', { sessionId, studentId: studentUid });
      setIsHandRaised(true);
    }
  };

  // Submit Need Help Ticket
  const handleSubmitHelp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMessage.trim()) return;

    const socket = getSocket();
    const studentUid = studentId || currentUser.id;
    socket.emit('student_raise_hand', {
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

    const socket = getSocket();
    socket.emit('student_leave_lab', {
      sessionId,
      studentId: studentId || currentUser.id
    });

    setHasLeft(true);
  };

  // Access Gate Modal if student hasn't entered Name and ID yet
  if (!isIdentityConfirmed) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-6 border-b border-gray-800 bg-gray-900/40">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Computer Lab Entry</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              {session?.sessionTitle || session?.groupName || 'Virtual Computer Lab'}
            </h1>
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
                {session?.groupCode || 'LAB-1'}
              </span>
              <span>{session?.groupName || 'Computer Lab Room'}</span>
            </div>
          </div>

          <form onSubmit={handleConfirmIdentity} className="p-6 space-y-4">
            {joinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Your Full Name <span className="text-rose-400">*</span>
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
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Student ID / Computer Station Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 2024-0101"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isJoining || !studentName.trim() || !studentId.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm transition shadow-sm"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entering Lab...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Computer Lab</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="px-6 py-3 bg-[#0d1117]/60 border-t border-gray-800 text-center text-[11px] text-gray-500">
            You will share your desktop screen with the instructor during this session
          </div>
        </div>
      </div>
    );
  }

  // If student clicked Leave Lab
  if (hasLeft) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
            <LogOut className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">You Have Left the Lab Session</h2>
          <p className="text-xs text-gray-400">
            Your departure time has been recorded in the attendance roster. Your screen sharing has been terminated.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setHasLeft(false);
                setIsScreenSharing(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
            >
              Rejoin Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 flex flex-col">
      {/* Top Station Header */}
      <header className="bg-[#161b22] border-b border-gray-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-gray-800 px-2 py-0.5 rounded font-mono text-[11px] text-gray-200 border border-gray-700">
                {session?.groupCode || 'LAB-1'}
              </span>
              <h1 className="text-sm font-bold text-white">
                {session?.sessionTitle || session?.groupName || 'Classroom Computer Lab'}
              </h1>
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Station: <strong className="text-gray-200">{studentName}</strong> (ID: {studentId})
            </div>
          </div>
        </div>

        {/* Live Status Pill & Quick Controls */}
        <div className="flex items-center space-x-3">
          {isScreenSharing ? (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Screen Sharing Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Screen Not Shared</span>
            </div>
          )}

          <button
            onClick={handleLeaveLab}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-rose-900/40 hover:text-rose-300 text-gray-400 border border-gray-700 text-xs flex items-center space-x-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Lab</span>
          </button>
        </div>
      </header>

      {/* Hand Raised Notification Banner if active */}
      {isHandRaised && (
        <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs text-amber-200">
            <Hand className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>
              <strong>Your hand is raised.</strong> The instructor has been notified and will assist you shortly.
              {activeHelpTicket && ` ("${activeHelpTicket}")`}
            </span>
          </div>
          <button
            onClick={handleToggleRaiseHand}
            className="text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-md transition"
          >
            Lower Hand
          </button>
        </div>
      )}

      {/* Main Workspace Stage */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col space-y-6">
        {/* Screen Sharing Broadcast Container */}
        <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[420px]">
          {/* Container Header */}
          <div className="px-5 py-3 border-b border-gray-800 bg-[#12161f] flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-gray-200">Desktop Screen Broadcast</span>
            </div>
            <span className="text-[11px] text-gray-500">
              {isScreenSharing ? 'Transmitting full display live via WebRTC' : 'Ready to transmit'}
            </span>
          </div>

          {/* Broadcast Stage View */}
          <div className="flex-1 flex items-center justify-center p-4 bg-[#0a0d12] relative">
            {isScreenSharing ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-[500px] object-contain rounded-lg shadow-2xl border border-gray-800"
                />
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/40 text-[11px] text-emerald-300 font-semibold flex items-center space-x-1.5 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live to Instructor</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 max-w-md space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                  <Monitor className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Share Your Desktop Screen</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    This computer lab requires real-time screen sharing. Your instructor will monitor your desktop alongside other participants during class exercises.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleStartScreenShare}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center space-x-2 mx-auto shadow-lg shadow-emerald-900/30 transition transform hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Share Entire Screen</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Screen Share Action */}
            {isScreenSharing ? (
              <button
                onClick={handleStopScreenShare}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 transition"
              >
                <StopCircle className="w-4 h-4 text-rose-400" />
                <span>Stop Screen Sharing</span>
              </button>
            ) : (
              <button
                onClick={handleStartScreenShare}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 transition shadow-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Sharing Desktop</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Raise / Lower Hand */}
            <button
              onClick={handleToggleRaiseHand}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition shadow-xs ${
                isHandRaised
                  ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20 animate-pulse'
                  : 'bg-[#0d1117] hover:bg-gray-800 border border-gray-700 text-amber-300'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span>{isHandRaised ? 'Hand Raised (Click to Lower)' : 'Raise Hand'}</span>
            </button>

            {/* Need Help Button */}
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="bg-[#0d1117] hover:bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Need Help</span>
            </button>
          </div>
        </div>
      </div>

      {/* Need Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/40">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Ask Instructor for Assistance</span>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHelp} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Describe what you need help with:
                </label>
                <textarea
                  required
                  rows={3}
                  value={helpMessage}
                  onChange={e => setHelpMessage(e.target.value)}
                  placeholder="e.g. Could you look at my terminal? Encountering a segmentation fault."
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!helpMessage.trim()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Instructor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentScreenSharePage() {
  return (
    <React.Suspense fallback={<div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] flex items-center justify-center text-xs text-gray-400">Loading Computer Lab Station...</div>}>
      <StudentScreenShareContent />
    </React.Suspense>
  );
}
