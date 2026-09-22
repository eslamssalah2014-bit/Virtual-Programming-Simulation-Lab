'use client';

import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, getSupabaseConfig } from '@/lib/supabase/client';
import { AlertTriangle, Database, Key, CheckCircle2, ShieldAlert } from 'lucide-react';

export function SupabaseConfigGate({ children }: { children: React.ReactNode }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) return;

    localStorage.setItem('vlab_supabase_url', url.trim());
    localStorage.setItem('vlab_supabase_key', key.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  if (configured === null) {
    return (
      <div className="flex-1 min-h-[70vh] flex items-center justify-center text-gray-400 text-xs">
        Checking signaling backend configuration...
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#161b22] border-2 border-rose-500/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl text-left">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-1">
                Blocking Configuration Error
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">
                Real WebRTC streaming cannot work because no signaling backend exists.
              </h2>
            </div>
          </div>

          <div className="p-4 bg-black/60 border border-gray-800 rounded-xl space-y-2 text-xs text-gray-300">
            <p className="font-semibold text-rose-300">
              Supabase Realtime environment variables are missing from this deployment.
            </p>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              WebRTC requires an active signaling channel (<code>session:&lt;sessionId&gt;</code>) to exchange SDP offers, answers, and ICE candidates between students and instructors. Without Supabase credentials, peer connection signaling cannot start.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-200">
                Supabase Project URL
              </label>
              <div className="relative">
                <Database className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-200">
                Supabase Anon Public API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Or set in Vercel: <code>NEXT_PUBLIC_SUPABASE_URL</code> & <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg flex items-center space-x-1.5"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Supabase & Proceed</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
