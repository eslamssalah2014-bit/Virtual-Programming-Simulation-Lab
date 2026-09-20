'use client';

import React, { useState } from 'react';
import { WebRTCLogEntry } from '@/lib/webrtc/signalingClient';
import {
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  Video,
  Layers,
  Copy,
  Check
} from 'lucide-react';

export interface WebRTCDebugInfo {
  role: 'student' | 'instructor';
  screenSharingStatus: boolean;
  streamId?: string;
  trackCount: number;
  trackDetails?: {
    id: string;
    kind: string;
    label: string;
    enabled: boolean;
    readyState: string;
    muted: boolean;
  }[];
  peerConnectionState: string; // 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'
  iceConnectionState: string;  // 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed'
  iceGatheringState?: string;
  signalingState?: string;
  remoteStreamStatus?: string; // e.g. 'Active (1080p)', 'Receiving', 'No Stream'
  remoteStreamId?: string;
  bytesReceived?: number;
  bytesSent?: number;
}

interface WebRTCDebugPanelProps {
  debugInfo: WebRTCDebugInfo;
  logs: WebRTCLogEntry[];
  onClearLogs?: () => void;
  onRestartIce?: () => void;
  title?: string;
  className?: string;
}

export function WebRTCDebugPanel({
  debugInfo,
  logs,
  onClearLogs,
  onRestartIce,
  title = 'WebRTC Diagnostics & Real-time Stream Inspector',
  className = ''
}: WebRTCDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'logs'>('status');
  const [logFilter, setLogFilter] = useState<'all' | 'webrtc' | 'signaling' | 'ice'>('all');
  const [copiedLog, setCopiedLog] = useState(false);

  const getPeerStateBadge = (state: string) => {
    switch (state) {
      case 'connected':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>connected</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>connecting</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center space-x-1.5">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>failed</span>
          </span>
        );
      case 'disconnected':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 inline-flex items-center space-x-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span>disconnected</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-gray-400 bg-gray-800 border border-gray-700">
            {state || 'new'}
          </span>
        );
    }
  };

  const getIceBadge = (ice: string) => {
    const isGood = ice === 'connected' || ice === 'completed';
    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
          isGood
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : ice === 'checking'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            : ice === 'failed'
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}
      >
        {ice || 'new'}
      </span>
    );
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    return l.category === logFilter;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.category.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message} ${l.details ? JSON.stringify(l.details) : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className={`bg-[#12161f] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl transition-all ${className}`}>
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-[#161b22] hover:bg-[#1c2128] cursor-pointer flex items-center justify-between border-b border-gray-800 transition"
      >
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">{title}</h3>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-gray-800 text-gray-300">
                {debugInfo.role}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              WebRTC Peer: <strong className="text-gray-200">{debugInfo.peerConnectionState}</strong> | ICE:{' '}
              <strong className="text-gray-200">{debugInfo.iceConnectionState}</strong> | Stream:{' '}
              <strong className={debugInfo.screenSharingStatus ? 'text-emerald-400' : 'text-gray-400'}>
                {debugInfo.screenSharingStatus ? 'Active' : 'Idle'}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getPeerStateBadge(debugInfo.peerConnectionState)}
          <button className="text-gray-400 hover:text-white p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'status'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Diagnostics Grid</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'logs'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>WebRTC Event Logs ({logs.length})</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {onRestartIce && (
                <button
                  onClick={onRestartIce}
                  className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-cyan-300 text-[11px] font-semibold border border-gray-700 flex items-center space-x-1 transition"
                  title="Force WebRTC ICE Restart"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ICE Restart</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: Diagnostics Grid */}
          {activeTab === 'status' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Screen Share Status */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    Screen Sharing
                  </span>
                  <div className="font-bold flex items-center space-x-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        debugInfo.screenSharingStatus ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                      }`}
                    />
                    <span className={debugInfo.screenSharingStatus ? 'text-emerald-400' : 'text-gray-400'}>
                      {debugInfo.screenSharingStatus ? 'Capturing' : 'Stopped'}
                    </span>
                  </div>
                </div>

                {/* Peer Connection State */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    Peer State
                  </span>
                  <div>{getPeerStateBadge(debugInfo.peerConnectionState)}</div>
                </div>

                {/* ICE Connection State */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    ICE State
                  </span>
                  <div>{getIceBadge(debugInfo.iceConnectionState)}</div>
                </div>

                {/* Stream ID */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    Stream ID
                  </span>
                  <span className="font-mono text-gray-300 truncate block" title={debugInfo.streamId || 'None'}>
                    {debugInfo.streamId ? `${debugInfo.streamId.substring(0, 12)}...` : 'None'}
                  </span>
                </div>

                {/* Track Count */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    Track Count
                  </span>
                  <span className="font-mono text-white font-bold">
                    {debugInfo.trackCount} {debugInfo.trackCount === 1 ? 'Track' : 'Tracks'}
                  </span>
                </div>

                {/* Remote Stream Status */}
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                    Remote Stream
                  </span>
                  <span className="font-mono text-cyan-300 truncate block">
                    {debugInfo.remoteStreamStatus || 'Active (Transmitting)'}
                  </span>
                </div>
              </div>

              {/* Video Track Details */}
              {debugInfo.trackDetails && debugInfo.trackDetails.length > 0 && (
                <div className="bg-[#161b22] border border-gray-800 rounded-lg p-3 space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Video className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Captured Video Track Specifications</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-gray-500 uppercase text-[9px] border-b border-gray-800">
                        <tr>
                          <th className="py-1">Kind</th>
                          <th className="py-1">Label / Device</th>
                          <th className="py-1">ReadyState</th>
                          <th className="py-1">Muted</th>
                          <th className="py-1">Track ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                        {debugInfo.trackDetails.map(t => (
                          <tr key={t.id}>
                            <td className="py-1.5 text-cyan-400">{t.kind}</td>
                            <td className="py-1.5 truncate max-w-xs">{t.label || 'Screen Capture'}</td>
                            <td className="py-1.5">
                              <span className="text-emerald-400">{t.readyState}</span>
                            </td>
                            <td className="py-1.5">{t.muted ? 'Yes' : 'No'}</td>
                            <td className="py-1.5 text-gray-500">{t.id.substring(0, 16)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Detailed WebRTC Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1 text-[11px]">
                  <span className="text-gray-400 mr-1 font-semibold">Filter:</span>
                  {(['all', 'webrtc', 'signaling', 'ice'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-0.5 rounded uppercase font-mono text-[10px] transition ${
                        logFilter === f
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyLogs}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold border border-gray-700 flex items-center space-x-1"
                  >
                    {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLog ? 'Copied' : 'Copy All Logs'}</span>
                  </button>
                  {onClearLogs && (
                    <button
                      onClick={onClearLogs}
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] font-semibold border border-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Log Terminal Window */}
              <div className="bg-[#0a0d12] border border-gray-800 rounded-lg p-3 font-mono text-[11px] max-h-60 overflow-y-auto space-y-1.5 select-text">
                {filteredLogs.length === 0 ? (
                  <div className="text-gray-600 italic py-4 text-center">No WebRTC logs recorded yet.</div>
                ) : (
                  filteredLogs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span
                        className={`uppercase text-[9px] px-1 rounded font-bold shrink-0 ${
                          log.category === 'webrtc'
                            ? 'bg-purple-900/60 text-purple-300'
                            : log.category === 'signaling'
                            ? 'bg-blue-900/60 text-blue-300'
                            : log.category === 'ice'
                            ? 'bg-amber-900/60 text-amber-300'
                            : 'bg-emerald-900/60 text-emerald-300'
                        }`}
                      >
                        {log.category}
                      </span>
                      <span
                        className={`break-all ${
                          log.level === 'error'
                            ? 'text-rose-400 font-bold'
                            : log.level === 'warn'
                            ? 'text-amber-300'
                            : log.level === 'success'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-gray-300'
                        }`}
                      >
                        {log.message}
                        {log.details && (
                          <span className="text-gray-500 ml-1">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
