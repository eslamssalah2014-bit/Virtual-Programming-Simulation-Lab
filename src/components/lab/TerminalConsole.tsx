'use client';

import React, { useState } from 'react';
import { Terminal, Eye, Trash2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { CodeFile } from '@/types';

interface TerminalConsoleProps {
  output: string;
  isError?: boolean;
  executionTimeMs?: number;
  onClear: () => void;
  files?: CodeFile[];
  activeLanguage?: string;
}

export function TerminalConsole({
  output,
  isError = false,
  executionTimeMs,
  onClear,
  files = [],
  activeLanguage = 'python'
}: TerminalConsoleProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'preview'>('console');

  // Build HTML preview blob if HTML files exist
  const getCombinedHtml = () => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => f.name.endsWith('.js'));

    let html = htmlFile ? htmlFile.content : '<h1>No HTML file found</h1>';
    if (cssFile) {
      html = html.replace('</head>', `<style>${cssFile.content}</style></head>`);
    }
    if (jsFile) {
      html = html.replace('</body>', `<script>${jsFile.content}</script></body>`);
    }
    return html;
  };

  const hasHtml = files.some(f => f.name.endsWith('.html')) || activeLanguage === 'html';

  return (
    <div className="h-64 bg-[#0d1117] border-t border-gray-800 flex flex-col font-mono text-xs">
      {/* Console Header Bar */}
      <div className="bg-[#161b22] px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-gray-300">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs transition ${
              activeTab === 'console'
                ? 'bg-gray-800 text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Terminal / Console</span>
          </button>

          {hasHtml && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs transition ${
                activeTab === 'preview'
                  ? 'bg-gray-800 text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Live Web Preview</span>
            </button>
          )}
        </div>

        {/* Execution Metrics & Clear */}
        <div className="flex items-center space-x-3 text-[11px]">
          {executionTimeMs !== undefined && (
            <span className="flex items-center space-x-1 text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{executionTimeMs}ms</span>
            </span>
          )}

          {output && (
            <span className="flex items-center space-x-1">
              {isError ? (
                <span className="flex items-center space-x-1 text-rose-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Exit Code 1</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>Exit Code 0</span>
                </span>
              )}
            </span>
          )}

          <button
            onClick={onClear}
            className="p-1 text-gray-400 hover:text-rose-400 rounded transition"
            title="Clear Terminal Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Content */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
        {activeTab === 'console' ? (
          output ? (
            <pre
              className={`whitespace-pre-wrap leading-relaxed ${
                isError ? 'text-rose-300' : 'text-emerald-300/90'
              }`}
            >
              {output}
            </pre>
          ) : (
            <div className="text-gray-500 italic">
              Terminal idle. Click "Run Code" to execute the current script.
            </div>
          )
        ) : (
          <div className="w-full h-full bg-white rounded overflow-hidden">
            <iframe
              srcDoc={getCombinedHtml()}
              title="Live Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        )}
      </div>
    </div>
  );
}
