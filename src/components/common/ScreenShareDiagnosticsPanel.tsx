'use client';

import React, { useState } from 'react';
import { DiagnosticsState } from '@/lib/webrtc/screenShareManager';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Terminal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Copy,
  Check,
  Server,
  Activity,
  Key
} from 'lucide-react';

interface ScreenShareDiagnosticsPanelProps {
  diagnostics: DiagnosticsState;
  role: 'student' | 'instructor';
  onRestartIce?: () => void;
  logs?: Array<{
    id: string;
    time: string;
    type: string;
    stage: string;
    message: string;
  }>;
}

export function ScreenShareDiagnosticsPanel({
  diagnostics,
  role,
  onRestartIce,
  logs = []
}: ScreenShareDiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');
  const [savedConfig, setSavedConfig] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (supaUrl.trim() && supaKey.trim()) {
      localStorage.setItem('vlab_supabase_url', supaUrl.trim());
      localStorage.setItem('vlab_supabase_key', supaKey.trim());
      setSavedConfig(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const getStatusBadge = (value: boolean, trueText = 'Yes', falseText = 'No') => {
    if (value) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
          {trueText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
        <XCircle className="w-3 h-3 mr-1 text-gray-500" />
        {falseText}
      </span>
    );
  };

  const getConnectionBadge = (state: string) => {
    switch (state) {
      case 'connected':
      case 'completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
            {state}
          </span>
        );
      case 'connecting':
      case 'checking':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1.5" />
            {state}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            {state}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-[#11161f] border border-gray-800 rounded-xl overflow-hidden shadow-2xl text-xs text-gray-300 transition-all">
      {/* Top Header */}
      <div className="bg-[#161c27] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white text-sm tracking-tight">
            WebRTC Screen-Sharing Diagnostics Console
          </span>
          <span className="font-mono text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
            {role}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onRestartIce && (
            <button
              onClick={onRestartIce}
              className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] flex items-center space-x-1 border border-gray-700 transition"
              title="Restart ICE Negotiation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restart ICE</span>
            </button>
          )}

          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] flex items-center space-x-1 border border-gray-700 transition"
          >
            <Key className="w-3 h-3 text-cyan-400" />
            <span>Supabase Config</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Failed Stage Critical Alert */}
          {diagnostics.failedStage ? (
            <div className="bg-rose-950/50 border-2 border-rose-500/60 rounded-lg p-3.5 flex items-start space-x-3 text-rose-200 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm text-rose-300 flex items-center space-x-2">
                  <span>EXACT FAILED STAGE:</span>
                  <span className="bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded border border-rose-500/40 uppercase">
                    {diagnostics.failedStage}
                  </span>
                </div>
                <div className="text-xs text-rose-300/90 mt-1 font-mono">
                  {diagnostics.errorMessage || 'Signaling failure detected during WebRTC establishment.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg px-3.5 py-2 flex items-center justify-between text-emerald-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-xs">
                  {diagnostics.connectionState === 'connected'
                    ? 'All Signaling Milestones Active — Desktop Stream Live'
                    : 'Signaling Active — Ready to establish WebRTC screen sharing'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-gray-400">
                Channel: room_{diagnostics.roomId}
              </span>
            </div>
          )}

          {/* 13 Key Diagnostics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* 1. Session ID */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Session ID</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-white text-xs truncate max-w-[170px]" title={diagnostics.sessionId}>
                  {diagnostics.sessionId}
                </span>
                <button
                  onClick={() => copyToClipboard(diagnostics.sessionId, 'sessionId')}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition"
                  title="Copy Session ID"
                >
                  {copiedField === 'sessionId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 2. Room ID */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Room ID</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-cyan-400 text-xs truncate max-w-[170px]" title={diagnostics.roomId}>
                  {diagnostics.roomId}
                </span>
                <button
                  onClick={() => copyToClipboard(diagnostics.roomId, 'roomId')}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition"
                  title="Copy Room ID"
                >
                  {copiedField === 'roomId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 3. Student Connected */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Student Connected</span>
              {getStatusBadge(diagnostics.studentConnected, 'Present', 'Offline')}
            </div>

            {/* 4. Instructor Connected */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Instructor Connected</span>
              {getStatusBadge(diagnostics.instructorConnected, 'Present', 'Offline')}
            </div>

            {/* 5. Offer Sent */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Offer Sent</span>
              {getStatusBadge(diagnostics.offerSent, 'Sent', 'Pending')}
            </div>

            {/* 6. Offer Received */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Offer Received</span>
              {getStatusBadge(diagnostics.offerReceived, 'Received', 'Pending')}
            </div>

            {/* 7. Answer Sent */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Answer Sent</span>
              {getStatusBadge(diagnostics.answerSent, 'Sent', 'Pending')}
            </div>

            {/* 8. Answer Received */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Answer Received</span>
              {getStatusBadge(diagnostics.answerReceived, 'Received', 'Pending')}
            </div>

            {/* 9. ICE Candidates Sent */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">ICE Candidates Sent</span>
              <span className="font-mono font-bold text-white text-xs bg-gray-800 px-2.5 py-0.5 rounded border border-gray-700">
                {diagnostics.iceCandidatesSent}
              </span>
            </div>

            {/* 10. ICE Candidates Received */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">ICE Candidates Recv</span>
              <span className="font-mono font-bold text-white text-xs bg-gray-800 px-2.5 py-0.5 rounded border border-gray-700">
                {diagnostics.iceCandidatesReceived}
              </span>
            </div>

            {/* 11. Connection State */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Connection State</span>
              {getConnectionBadge(diagnostics.connectionState)}
            </div>

            {/* 12. ICE State */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">ICE State</span>
              {getConnectionBadge(diagnostics.iceState)}
            </div>

            {/* 13. Remote Stream Attached */}
            <div className="bg-[#161c26] border border-gray-800 rounded-lg p-3 flex items-center justify-between md:col-span-2 lg:col-span-4">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Remote Stream Attached</span>
                {diagnostics.activeTrackLabel && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    ({diagnostics.activeTrackLabel})
                  </span>
                )}
              </div>
              {getStatusBadge(diagnostics.remoteStreamAttached, 'Attached & Playing', 'Not Attached')}
            </div>
          </div>

          {/* Optional Supabase Key Modal */}
          {isConfigOpen && (
            <div className="bg-[#161b24] border border-cyan-500/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-xs">Direct Supabase Realtime Configuration</span>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">Realtime Channels Enabled</span>
              </div>
              <p className="text-[11px] text-gray-400">
                You can optionally link your direct Supabase project to enforce dedicated channel transport.
              </p>
              <form onSubmit={handleSaveSupabaseConfig} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="https://xyz.supabase.co"
                  value={supaUrl}
                  onChange={(e) => setSupaUrl(e.target.value)}
                  className="bg-[#0e1217] border border-gray-700 rounded px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="password"
                  placeholder="Supabase Anon Public Key (eyJ...)"
                  value={supaKey}
                  onChange={(e) => setSupaKey(e.target.value)}
                  className="bg-[#0e1217] border border-gray-700 rounded px-3 py-1.5 text-xs text-white"
                />
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-1.5 rounded transition"
                  >
                    {savedConfig ? 'Saved! Reconnecting...' : 'Save Credentials & Reconnect'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Event Logs Accordion */}
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsLogsOpen(!isLogsOpen)}
              className="w-full bg-[#141923] px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-400 hover:text-white transition"
            >
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-semibold">Signaling Event Log ({logs.length} events)</span>
              </div>
              {isLogsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isLogsOpen && (
              <div className="bg-[#0c0f14] p-3 max-h-56 overflow-y-auto space-y-1 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <div className="text-gray-600 text-center py-4">No signaling events recorded yet</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-gray-500 text-[10px] flex-shrink-0">{log.time}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1 rounded flex-shrink-0 ${
                          log.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : log.type === 'error'
                            ? 'bg-rose-500/10 text-rose-400'
                            : log.type === 'warn'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        [{log.stage}]
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
