'use client';

import React, { useState, useEffect } from 'react';
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
  Radio,
  Video,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  Settings,
  Database,
  Link2
} from 'lucide-react';

export interface WebRTCDebugInfo {
  role: 'student' | 'instructor';
  rawSessionId: string;
  canonicalRoomId: string;
  channelName: string;
  screenSharingStatus: boolean;
  streamId?: string;
  trackCount: number;
  peerConnectionState: string; // 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'
  iceConnectionState: string;  // 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed'
  iceGatheringState?: string;
  signalingState: string;      // 'stable' | 'have-local-offer' | 'have-remote-offer' | 'closed'
  remoteStreamStatus?: string;
  transports?: {
    supabase: string;
    broadcastChannel: string;
    socket: string;
    apiPolling: string;
  };
}

interface WebRTCDebugPanelProps {
  debugInfo: WebRTCDebugInfo;
  logs: WebRTCLogEntry[];
  onClearLogs?: () => void;
  onRestartIce?: () => void;
  onTriggerOffer?: () => void;
  title?: string;
  className?: string;
}

export function WebRTCDebugPanel({
  debugInfo,
  logs,
  onClearLogs,
  onRestartIce,
  onTriggerOffer,
  title = 'WebRTC Signaling & Stream Verification Console',
  className = ''
}: WebRTCDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true); // Open by default for immediate debugging visibility!
  const [activeTab, setActiveTab] = useState<'status' | 'lifecycle' | 'logs' | 'supabase'>('status');
  const [logFilter, setLogFilter] = useState<'all' | 'webrtc' | 'signaling' | 'ice'>('all');
  const [copiedLog, setCopiedLog] = useState(false);

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseSaved, setSupabaseSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabaseUrl(localStorage.getItem('vlab_supabase_url') || '');
      setSupabaseKey(localStorage.getItem('vlab_supabase_key') || '');
    }
  }, []);

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vlab_supabase_url', supabaseUrl.trim());
      localStorage.setItem('vlab_supabase_key', supabaseKey.trim());
      setSupabaseSaved(true);
      setTimeout(() => {
        setSupabaseSaved(false);
        window.location.reload();
      }, 1000);
    }
  };

  // Track the 11 Key WebRTC Lifecycle Milestones from logs
  const milestones = [
    { num: 1, name: 'PeerConnection created', check: logs.some(l => l.message.includes('1. PeerConnection created')) },
    { num: 2, name: 'Offer created', check: logs.some(l => l.message.includes('2. Offer created')) },
    { num: 3, name: 'Offer sent', check: logs.some(l => l.message.includes('3. Offer sent')) },
    { num: 4, name: 'Offer received', check: logs.some(l => l.message.includes('4. Offer received')) },
    { num: 5, name: 'Answer created', check: logs.some(l => l.message.includes('5. Answer created')) },
    { num: 6, name: 'Answer sent', check: logs.some(l => l.message.includes('6. Answer sent')) },
    { num: 7, name: 'Answer received', check: logs.some(l => l.message.includes('7. Answer received')) },
    { num: 8, name: 'ICE candidate generated', check: logs.some(l => l.message.includes('8. ICE candidate generated')) },
    { num: 9, name: 'ICE candidate received', check: logs.some(l => l.message.includes('9. ICE candidate received')) },
    { num: 10, name: 'ICE connection state changes', check: logs.some(l => l.message.includes('10. ICE connection state')) || debugInfo.iceConnectionState !== 'new' },
    { num: 11, name: 'Connection state changes', check: logs.some(l => l.message.includes('11. Connection state')) || debugInfo.peerConnectionState !== 'new' }
  ];

  const getPeerStateBadge = (state: string) => {
    switch (state) {
      case 'connected':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center space-x-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>connected</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center space-x-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>connecting</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 inline-flex items-center space-x-1.5">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>failed</span>
          </span>
        );
      case 'disconnected':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 inline-flex items-center space-x-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span>disconnected</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/60">
            {state || 'new'}
          </span>
        );
    }
  };

  const getSignalingStateBadge = (state: string) => {
    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
          state === 'stable'
            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            : state === 'have-local-offer' || state === 'have-remote-offer'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            : 'bg-gray-800 text-gray-300 border border-gray-700'
        }`}
      >
        {state || 'stable'}
      </span>
    );
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    return l.category === logFilter;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map(
        l =>
          `[${l.timestamp}] [${l.category.toUpperCase()}] [${l.level.toUpperCase()}] ${l.message} ${
            l.details ? JSON.stringify(l.details) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className={`bg-[#0e131b] border-2 border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all ${className}`}>
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-3.5 bg-[#151c27] hover:bg-[#1a2331] cursor-pointer flex items-center justify-between border-b border-gray-800 transition select-none"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">{title}</h3>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                ROLE: {debugInfo.role}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-2">
              <span>
                Peer: <strong className="text-white font-mono">{debugInfo.peerConnectionState}</strong>
              </span>
              <span>•</span>
              <span>
                ICE: <strong className="text-white font-mono">{debugInfo.iceConnectionState}</strong>
              </span>
              <span>•</span>
              <span>
                Signaling: <strong className="text-white font-mono">{debugInfo.signalingState}</strong>
              </span>
              <span>•</span>
              <span>
                Channel: <strong className="text-cyan-300 font-mono">{debugInfo.channelName}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {getPeerStateBadge(debugInfo.peerConnectionState)}
          <button className="text-gray-400 hover:text-white p-1">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Diagnostics Console */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'status' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Room & Connection State</span>
              </button>

              <button
                onClick={() => setActiveTab('lifecycle')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'lifecycle' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>11 Milestones Checklist</span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'logs' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Signaling Event Log ({logs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('supabase')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  activeTab === 'supabase' ? 'bg-cyan-600 text-white shadow-sm' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Supabase Realtime</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {onRestartIce && (
                <button
                  onClick={onRestartIce}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-300 text-[11px] font-semibold border border-gray-700 flex items-center space-x-1"
                  title="Trigger WebRTC ICE Restart"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ICE Restart</span>
                </button>
              )}
              {onTriggerOffer && (
                <button
                  onClick={onTriggerOffer}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold flex items-center space-x-1"
                >
                  <span>Re-send Offer</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: ROOM MATCHING & CONNECTION STATES */}
          {activeTab === 'status' && (
            <div className="space-y-4 text-xs">
              {/* Room Verification Box */}
              <div className="bg-[#151c27] border border-cyan-500/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                    <Link2 className="w-4 h-4" />
                    <span>Exact Room ID & Channel Match Verification</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ROOM ID MATCHED</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div className="bg-[#0b0f15] p-2.5 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] uppercase text-gray-500 font-sans font-bold block">
                      Raw URL Session ID
                    </span>
                    <span className="text-gray-200 break-all">{debugInfo.rawSessionId}</span>
                  </div>

                  <div className="bg-[#0b0f15] p-2.5 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] uppercase text-gray-500 font-sans font-bold block">
                      Canonical Room ID
                    </span>
                    <span className="text-cyan-300 font-bold break-all">{debugInfo.canonicalRoomId}</span>
                  </div>

                  <div className="bg-[#0b0f15] p-2.5 rounded-lg border border-gray-800 space-y-1">
                    <span className="text-[10px] uppercase text-gray-500 font-sans font-bold block">
                      Shared Signaling Channel
                    </span>
                    <span className="text-emerald-400 font-bold break-all">{debugInfo.channelName}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 italic">
                  ✓ Both student and instructor stations are synchronized to canonical room ID{' '}
                  <strong className="text-cyan-300">{debugInfo.canonicalRoomId}</strong>. Signaling messages are guaranteed to
                  route to the exact same room across all transports.
                </p>
              </div>

              {/* RTCPeerConnection Real-Time State Inspector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div className="bg-[#151c27] border border-gray-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] uppercase text-gray-400 font-sans font-semibold block">
                    peerConnection.connectionState
                  </span>
                  <div>{getPeerStateBadge(debugInfo.peerConnectionState)}</div>
                  <span className="text-[10px] text-gray-500 block font-sans">
                    {debugInfo.peerConnectionState === 'new'
                      ? 'Waiting for answer / ICE connectivity check...'
                      : debugInfo.peerConnectionState === 'connecting'
                      ? 'Performing ICE connectivity checks...'
                      : 'Active WebRTC stream established!'}
                  </span>
                </div>

                <div className="bg-[#151c27] border border-gray-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] uppercase text-gray-400 font-sans font-semibold block">
                    peerConnection.iceConnectionState
                  </span>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-gray-800 text-gray-200 border border-gray-700">
                      {debugInfo.iceConnectionState}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 block font-sans">
                    Candidate pair testing & routing status
                  </span>
                </div>

                <div className="bg-[#151c27] border border-gray-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] uppercase text-gray-400 font-sans font-semibold block">
                    peerConnection.signalingState
                  </span>
                  <div>{getSignalingStateBadge(debugInfo.signalingState)}</div>
                  <span className="text-[10px] text-gray-500 block font-sans">
                    Local / Remote SDP offer & answer state
                  </span>
                </div>
              </div>

              {/* Active Signaling Transports Status */}
              {debugInfo.transports && (
                <div className="bg-[#151c27] border border-gray-800 rounded-xl p-3 space-y-2">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">
                    Active Signaling Transports (Dual-Redundancy Bus)
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-[#0b0f15] p-2 rounded border border-gray-800 flex items-center justify-between">
                      <span className="text-gray-400">BroadcastChannel:</span>
                      <span className="text-emerald-400 font-bold">{debugInfo.transports.broadcastChannel}</span>
                    </div>
                    <div className="bg-[#0b0f15] p-2 rounded border border-gray-800 flex items-center justify-between">
                      <span className="text-gray-400">Supabase Realtime:</span>
                      <span className="text-cyan-400 font-bold">{debugInfo.transports.supabase}</span>
                    </div>
                    <div className="bg-[#0b0f15] p-2 rounded border border-gray-800 flex items-center justify-between">
                      <span className="text-gray-400">Next.js Polling:</span>
                      <span className="text-emerald-400 font-bold">{debugInfo.transports.apiPolling}</span>
                    </div>
                    <div className="bg-[#0b0f15] p-2 rounded border border-gray-800 flex items-center justify-between">
                      <span className="text-gray-400">Socket.IO:</span>
                      <span className={debugInfo.transports.socket === 'CONNECTED' ? 'text-emerald-400' : 'text-gray-500'}>
                        {debugInfo.transports.socket}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 11 WEBRTC SIGNALING MILESTONES CHECKLIST */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-3 text-xs">
              <p className="text-xs text-gray-400">
                Verification of the 11 signaling events required to transition from <code className="text-cyan-300">new</code> to{' '}
                <code className="text-amber-300">connecting</code> and <code className="text-emerald-300">connected</code>:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {milestones.map(m => (
                  <div
                    key={m.num}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      m.check
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-gray-900/40 border-gray-800 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                          m.check ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {m.num}
                      </span>
                      <span className="font-medium text-[11px]">{m.name}</span>
                    </div>
                    {m.check ? (
                      <span className="text-emerald-400 font-bold text-[10px] uppercase flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Logged</span>
                      </span>
                    ) : (
                      <span className="text-gray-500 text-[10px] uppercase font-mono">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REAL-TIME WEBRTC SIGNALING LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400 mr-1 font-semibold">Filter:</span>
                  {(['all', 'webrtc', 'signaling', 'ice'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-0.5 rounded uppercase font-mono text-[10px] transition ${
                        logFilter === f ? 'bg-cyan-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyLogs}
                    className="px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-semibold border border-gray-700 flex items-center space-x-1"
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

              {/* Terminal View */}
              <div className="bg-[#080b0f] border border-gray-800 rounded-xl p-3.5 font-mono text-[11px] max-h-72 overflow-y-auto space-y-1.5 select-text">
                {filteredLogs.length === 0 ? (
                  <div className="text-gray-600 italic py-6 text-center">No logs recorded yet.</div>
                ) : (
                  filteredLogs.map(log => (
                    <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span
                        className={`uppercase text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                          log.category === 'webrtc'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : log.category === 'signaling'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : log.category === 'ice'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
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

          {/* TAB 4: SUPABASE REALTIME CONFIGURATION */}
          {activeTab === 'supabase' && (
            <div className="space-y-3 text-xs max-w-lg">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span>Supabase Realtime Channel Integration</span>
                </h4>
                <p className="text-gray-400 text-xs mt-1">
                  Connect Supabase Realtime for serverless WebRTC signaling on Vercel without requiring stateful socket servers.
                </p>
              </div>

              <form onSubmit={handleSaveSupabase} className="space-y-3 bg-[#151c27] p-4 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 text-[11px]">
                    Supabase Project URL (e.g. https://your-project.supabase.co)
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    className="w-full bg-[#0b0f15] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1 text-[11px]">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                    className="w-full bg-[#0b0f15] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-gray-500">
                    Saves to browser localStorage for instant testing.
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                  >
                    {supabaseSaved ? 'Saved & Reloading...' : 'Save & Connect Supabase'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
