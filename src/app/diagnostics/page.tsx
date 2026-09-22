'use client';

import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/client';
import { PureSupabaseSignaling, DiagnosticsState } from '@/lib/webrtc/pureSupabaseSignaling';
import { WebRTCStageDiagnostics } from '@/components/common/WebRTCStageDiagnostics';
import { Radio, Database, ShieldCheck, AlertTriangle, Key, ExternalLink } from 'lucide-react';

export default function DiagnosticsPage() {
  const [configured, setConfigured] = useState<boolean>(false);
  const [config, setConfig] = useState<{ url: string; anonKey: string } | null>(null);
  const [testSessionId, setTestSessionId] = useState('test-session-101');
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    signalingStatus: 'disconnected',
    offerStatus: 'pending',
    answerStatus: 'pending',
    iceStatus: { sent: 0, received: 0, connectionState: 'new', iceState: 'new' },
    remoteStreamStatus: 'none',
    channelName: 'session:test-session-101',
    sessionId: 'test-session-101',
    audit: {
      trackCaptured: { status: 'pending' },
      trackAdded: { status: 'pending' },
      offerSent: { status: 'pending' },
      offerReceived: { status: 'pending' },
      answerSent: { status: 'pending' },
      answerReceived: { status: 'pending' },
      iceConnected: { status: 'pending' },
      onTrackFired: { status: 'pending' },
      videoAttached: { status: 'pending' },
      failingStage: null
    },
    logs: []
  });

  useEffect(() => {
    const isConf = isSupabaseConfigured();
    setConfigured(isConf);
    if (isConf) {
      setConfig(getSupabaseConfig());
    }
  }, []);

  const handleTestConnection = async () => {
    const signaling = new PureSupabaseSignaling({
      sessionId: testSessionId,
      role: 'instructor',
      clientId: 'diagnostics-runner',
      onDiagnostics: (d) => setDiagnostics(d)
    });

    const connected = await signaling.connect();
    if (connected) {
      signaling.logStage('OFFER_RECEIVED', 'Simulated test stage log for channel verification');
      signaling.updateDiagnostics({ offerStatus: 'received' });
    }
  };

  return (
    <div className="flex-1 bg-[#0a0d12] p-6 max-w-6xl mx-auto w-full space-y-6">
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              WebRTC Signaling & Stream Diagnostics Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Production verification of Supabase Realtime signaling, SDP offer/answer states, and ICE transport.
            </p>
          </div>
        </div>
      </div>

      {/* Backend Status Card */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Signaling Transport: Supabase Realtime</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#0d1117] p-3.5 rounded-lg border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[11px] font-semibold">Configuration Status:</span>
            <div className="flex items-center space-x-2 pt-1">
              {configured ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Configured & Ready</span>
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Missing Environment Variables</span>
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#0d1117] p-3.5 rounded-lg border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[11px] font-semibold">Supabase URL:</span>
            <div className="font-mono text-cyan-400 pt-1 truncate">
              {config?.url || 'NEXT_PUBLIC_SUPABASE_URL not configured'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <input
            type="text"
            value={testSessionId}
            onChange={(e) => setTestSessionId(e.target.value)}
            className="bg-[#0d1117] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            placeholder="test session id"
          />
          <button
            onClick={handleTestConnection}
            disabled={!configured}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs transition"
          >
            Verify Realtime Channel (session:{testSessionId})
          </button>
        </div>
      </div>

      {/* Requirement 11 Console */}
      <WebRTCStageDiagnostics
        diagnostics={diagnostics}
        role="instructor"
        title="Live Diagnostics State View (Requirement 11)"
      />
    </div>
  );
}
