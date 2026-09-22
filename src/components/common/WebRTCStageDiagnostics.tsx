'use client';

import React, { useState } from 'react';
import { DiagnosticsState, AuditStageDetail } from '@/lib/webrtc/pureSupabaseSignaling';
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
  AlertTriangle,
  Monitor
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

  const getStageBadge = (stage: AuditStageDetail, label: string) => {
    if (stage.status === 'success') {
      return (
        <div className="bg-[#121820] border border-emerald-500/40 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">{label}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-emerald-400 font-semibold uppercase">PASS</span>
            <span className="text-gray-500 font-mono">{stage.timestamp || 'Ready'}</span>
          </div>
          {stage.details && (
            <p className="text-[9px] text-gray-400 font-mono mt-1 truncate" title={stage.details}>
              {stage.details}
            </p>
          )}
        </div>
      );
    }

    if (stage.status === 'failed') {
      return (
        <div className="bg-rose-950/30 border border-rose-500/60 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">{label}</span>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-rose-400 font-semibold uppercase">FAILED</span>
            <span className="text-rose-400/80 font-mono">{stage.timestamp || 'Now'}</span>
          </div>
          {stage.details && (
            <p className="text-[9px] text-rose-300 font-mono mt-1 truncate" title={stage.details}>
              {stage.details}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="bg-[#141820] border border-gray-800 rounded-lg p-2.5 flex flex-col justify-between opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-400">{label}</span>
          <Clock className="w-3.5 h-3.5 text-gray-600" />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px]">
          <span className="text-gray-500 uppercase">PENDING</span>
          <span className="text-gray-600 font-mono">--:--:--</span>
        </div>
      </div>
    );
  };

  const audit = diagnostics.audit;

  return (
    <div className="w-full bg-[#11161f] border border-gray-800 rounded-xl overflow-hidden shadow-2xl text-xs text-gray-300">
      {/* Header */}
      <div className="bg-[#161c27] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm">
            {title || `${role === 'instructor' ? 'Instructor' : 'Student'} Media Track Audit & Diagnostics`}
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
          {/* Requirement 7: Prominent Failure Banner if any stage fails */}
          {audit.failingStage && (
            <div className="bg-rose-950/70 border-2 border-rose-500 rounded-xl p-4 flex items-start space-x-3 text-rose-200 shadow-xl animate-in fade-in">
              <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-sm text-white uppercase tracking-wide">
                    WebRTC Media Track Failure Detected
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-bold">
                    Stage: {audit.failingStage.stage}
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed font-mono">
                  {audit.failingStage.reason}
                </p>
              </div>
            </div>
          )}

          {/* Connection States Bar (Requirement 5) */}
          <div className="bg-[#141923] border border-gray-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Connection State:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded ${
                diagnostics.iceStatus.connectionState === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : diagnostics.iceStatus.connectionState === 'failed'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-gray-800 text-gray-300'
              }`}>
                {diagnostics.iceStatus.connectionState.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400">ICE Connection:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded ${
                diagnostics.iceStatus.iceState === 'connected' || diagnostics.iceStatus.iceState === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : diagnostics.iceStatus.iceState === 'failed'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-gray-800 text-gray-300'
              }`}>
                {diagnostics.iceStatus.iceState.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400">ICE Candidates:</span>
              <span className="text-cyan-400 font-bold">
                Sent: {diagnostics.iceStatus.sent} • Received: {diagnostics.iceStatus.received}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Signaling:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded ${
                diagnostics.signalingStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {diagnostics.signalingStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Requirement 6: 9-Stage Diagnostics Grid */}
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>9-Stage Media Track Verification Flow</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-2">
              {getStageBadge(audit.trackCaptured, '1. Track Captured')}
              {getStageBadge(audit.trackAdded, '2. Track Added')}
              {getStageBadge(audit.offerSent, '3. Offer Sent')}
              {getStageBadge(audit.offerReceived, '4. Offer Received')}
              {getStageBadge(audit.answerSent, '5. Answer Sent')}
              {getStageBadge(audit.answerReceived, '6. Answer Received')}
              {getStageBadge(audit.iceConnected, '7. ICE Connected')}
              {getStageBadge(audit.onTrackFired, '8. OnTrack Fired')}
              {getStageBadge(audit.videoAttached, '9. Video Attached')}
            </div>
          </div>

          {/* Real-time Stage Event Audit Log */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsLogsOpen(!isLogsOpen)}
              className="w-full bg-[#141923] px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-gray-300">Live WebRTC Media Audit Log Terminal</span>
                <span className="text-[10px] text-gray-500 font-mono">({diagnostics.logs.length} events)</span>
              </div>
              <span className="text-[10px] text-gray-500">
                {isLogsOpen ? 'Collapse' : 'Expand'}
              </span>
            </button>

            {isLogsOpen && (
              <div className="bg-[#0b0e14] p-3 max-h-56 overflow-y-auto space-y-1.5 font-mono text-[10px] border-t border-gray-800">
                {diagnostics.logs.length === 0 ? (
                  <div className="text-gray-600 italic">Awaiting WebRTC media operations...</div>
                ) : (
                  diagnostics.logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-gray-500 select-none flex-shrink-0">{log.timestamp}</span>
                      <span
                        className={`font-bold flex-shrink-0 px-1 py-0.5 rounded text-[9px] ${
                          log.role === 'student' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'
                        }`}
                      >
                        {log.role.toUpperCase()}
                      </span>
                      <span className="text-amber-400 font-semibold flex-shrink-0">[{log.stage}]</span>
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
