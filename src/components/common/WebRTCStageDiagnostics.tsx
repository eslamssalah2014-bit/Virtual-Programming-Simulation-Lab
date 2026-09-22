'use client';

import React, { useState } from 'react';
import { DiagnosticsState, StageLog } from '@/lib/webrtc/pureSupabaseSignaling';
import {
  Radio,
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  Layers,
  Sparkles
} from 'lucide-react';

export function WebRTCStageDiagnostics({
  diagnostics,
  role,
  title
}: {
  diagnostics: DiagnosticsState;
  role: 'student' | 'instructor';
  title?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLogsOpen, setIsLogsOpen] = useState(true);

  const getStatusPill = (status: string, successValues: string[], pendingValues: string[] = ['pending']) => {
    if (successValues.includes(status)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
          {status.toUpperCase()}
        </span>
      );
    }
    if (pendingValues.includes(status)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
          <Clock className="w-3 h-3 mr-1 text-gray-500" />
          {status.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <Activity className="w-3 h-3 mr-1 text-amber-400 animate-pulse" />
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="w-full bg-[#11161f] border border-gray-800 rounded-xl overflow-hidden shadow-2xl text-xs text-gray-300">
      {/* Header */}
      <div className="bg-[#161c27] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm">
            {title || `${role === 'instructor' ? 'Instructor' : 'Student'} WebRTC Diagnostics Console`}
          </span>
          <span className="font-mono text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">
            Channel: {diagnostics.channelName}
          </span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Requirement 11: Diagnostics 5-Box Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Signaling Status */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Signaling Status</span>
              <div className="mt-2">
                {getStatusPill(diagnostics.signalingStatus, ['connected'], ['connecting', 'disconnected'])}
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-1 truncate">
                Supabase Realtime
              </span>
            </div>

            {/* 2. Offer Status */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Offer Status</span>
              <div className="mt-2">
                {getStatusPill(diagnostics.offerStatus, ['sent', 'received'])}
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-1">
                {diagnostics.offerStatus === 'sent' ? 'Offer dispatched' : diagnostics.offerStatus === 'received' ? 'Offer applied' : 'Awaiting offer'}
              </span>
            </div>

            {/* 3. Answer Status */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Answer Status</span>
              <div className="mt-2">
                {getStatusPill(diagnostics.answerStatus, ['sent', 'received'])}
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-1">
                {diagnostics.answerStatus === 'sent' ? 'Answer dispatched' : diagnostics.answerStatus === 'received' ? 'Remote answer set' : 'Awaiting answer'}
              </span>
            </div>

            {/* 4. ICE Status */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">ICE Status</span>
              <div className="mt-2 flex items-center space-x-1.5">
                <span className="font-mono text-xs font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded">
                  S: {diagnostics.iceStatus.sent}
                </span>
                <span className="font-mono text-xs font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded">
                  R: {diagnostics.iceStatus.received}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 mt-1">
                State: {diagnostics.iceStatus.connectionState}
              </span>
            </div>

            {/* 5. Remote Stream Status */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Remote Stream Status</span>
              <div className="mt-2">
                {getStatusPill(diagnostics.remoteStreamStatus, ['attached', 'tracks_received'], ['none'])}
              </div>
              <span className="text-[10px] font-mono text-gray-500 mt-1 truncate">
                {diagnostics.activeTrackLabel || 'Awaiting video track'}
              </span>
            </div>
          </div>

          {/* Real-time Stage Event Audit Log */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsLogsOpen(!isLogsOpen)}
              className="w-full bg-[#141923] px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-semibold">Signaling Stage History ({diagnostics.logs.length} events)</span>
              </div>
              {isLogsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isLogsOpen && (
              <div className="bg-[#0c0f14] p-3 max-h-56 overflow-y-auto space-y-1 font-mono text-[11px]">
                {diagnostics.logs.length === 0 ? (
                  <div className="text-gray-600 text-center py-3">No stage events recorded yet</div>
                ) : (
                  diagnostics.logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-gray-500 text-[10px] flex-shrink-0">{log.timestamp}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                        {log.stage}
                      </span>
                      <span className="text-gray-300 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
