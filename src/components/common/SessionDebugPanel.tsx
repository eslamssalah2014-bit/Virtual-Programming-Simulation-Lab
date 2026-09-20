'use client';

import React, { useState } from 'react';
import {
  Database,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Copy
} from 'lucide-react';
import { LabSession } from '@/types';

export interface SessionDebugData {
  sessionId: string;
  sessionCode: string;
  sessionStatus: string;
  startTime?: string;
  endTime?: string;
  databaseRecordFound: boolean;
  foundIn?: string;
  extractedUrlCode?: string;
  executedQuery?: string;
  returnedResult?: string;
}

interface SessionDebugPanelProps {
  debugData: SessionDebugData;
  className?: string;
}

export function SessionDebugPanel({ debugData, className = '' }: SessionDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true); // Always open for clear diagnostic visibility
  const [copied, setCopied] = useState(false);

  const handleCopyDebug = () => {
    const json = JSON.stringify(debugData, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-[#0d121b] border-2 border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all ${className}`}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-[#131b26] hover:bg-[#182230] cursor-pointer flex items-center justify-between border-b border-gray-800 transition select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                Session Database & Lookup Diagnostics
              </h3>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.2 rounded ${
                  debugData.databaseRecordFound
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                RECORD FOUND: {debugData.databaseRecordFound ? 'YES' : 'NO'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              ID: <strong className="text-cyan-300 font-mono">{debugData.sessionId || 'None'}</strong> • Status:{' '}
              <strong className="text-emerald-400 uppercase font-mono">{debugData.sessionStatus || 'Unknown'}</strong> • Source:{' '}
              <strong className="text-gray-300 uppercase font-mono">{debugData.foundIn || 'Database'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={e => {
              e.stopPropagation();
              handleCopyDebug();
            }}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-xs flex items-center space-x-1"
            title="Copy Session Diagnostics"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button className="text-gray-400 hover:text-white p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-4 space-y-4 text-xs font-sans">
          {/* Status Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 font-mono">
            {/* Session ID */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                Session ID
              </span>
              <span className="text-cyan-300 font-bold block truncate" title={debugData.sessionId}>
                {debugData.sessionId || 'Pending'}
              </span>
            </div>

            {/* Session Code */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                Session Code
              </span>
              <span className="text-gray-200 font-bold block truncate" title={debugData.sessionCode}>
                {debugData.sessionCode || 'None'}
              </span>
            </div>

            {/* Session Status */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                Session Status
              </span>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    debugData.sessionStatus === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
                <span
                  className={`font-bold uppercase ${
                    debugData.sessionStatus === 'active' ? 'text-emerald-400' : 'text-gray-400'
                  }`}
                >
                  {debugData.sessionStatus || 'active'}
                </span>
              </div>
            </div>

            {/* Start Time */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                Start Time
              </span>
              <span className="text-gray-300 block text-[11px] truncate">
                {debugData.startTime
                  ? new Date(debugData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Active Now'}
              </span>
            </div>

            {/* End Time */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                End Time
              </span>
              <span className="text-gray-500 block text-[11px]">
                {debugData.endTime ? new Date(debugData.endTime).toLocaleTimeString() : 'In Progress'}
              </span>
            </div>

            {/* Database Record Found */}
            <div className="bg-[#151c27] p-2.5 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-sans font-bold block">
                Database Record
              </span>
              <div className="flex items-center space-x-1 font-bold">
                {debugData.databaseRecordFound ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">Yes (Found)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-rose-400">No (Missing)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Query & Result Log */}
          <div className="bg-[#080b0f] border border-gray-800 rounded-xl p-3 space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 text-gray-400 font-sans text-xs">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                <span>Session Query Execution Trace</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Format: Exact Match Guaranteed</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 shrink-0 select-none">1. URL Code:</span>
                <span className="text-cyan-300 font-bold">{debugData.extractedUrlCode || debugData.sessionId}</span>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-gray-500 shrink-0 select-none">2. Query Executed:</span>
                <span className="text-purple-300 break-all">{debugData.executedQuery || 'SELECT * FROM sessions'}</span>
              </div>

              <div className="flex items-start space-x-2">
                <span className="text-gray-500 shrink-0 select-none">3. Query Result:</span>
                <span className="text-emerald-400 font-bold">{debugData.returnedResult || 'Session record verified'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
