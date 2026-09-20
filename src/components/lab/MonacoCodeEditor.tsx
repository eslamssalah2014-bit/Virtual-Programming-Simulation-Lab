'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { CodeFile } from '@/types';
import { Check, CloudUpload, FileCode } from 'lucide-react';

interface MonacoCodeEditorProps {
  file?: CodeFile;
  value: string;
  onChange?: (val: string) => void;
  isReadOnly?: boolean;
  isSyncing?: boolean;
}

export function MonacoCodeEditor({
  file,
  value,
  onChange,
  isReadOnly = false,
  isSyncing = false
}: MonacoCodeEditorProps) {
  const getLanguage = (fileName?: string) => {
    if (!fileName) return 'python';
    if (fileName.endsWith('.py')) return 'python';
    if (fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] relative overflow-hidden">
      {/* Tab bar */}
      <div className="bg-[#181818] border-b border-gray-800 flex items-center justify-between px-3 h-9 text-xs">
        <div className="flex items-center space-x-2">
          <div className="bg-[#1e1e1e] border-t-2 border-emerald-500 text-gray-200 px-3 py-1.5 flex items-center space-x-1.5 font-mono">
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>{file?.name || 'untitled'}</span>
          </div>
          {isReadOnly && (
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Mirror (Read-Only)
            </span>
          )}
        </div>

        {/* Sync Status */}
        <div className="flex items-center space-x-1.5 text-gray-400 text-[11px]">
          {isSyncing ? (
            <span className="flex items-center space-x-1 text-cyan-400">
              <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
              <span>Syncing...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-gray-400">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={getLanguage(file?.name)}
          value={value}
          theme="vs-dark"
          onChange={(val) => {
            if (!isReadOnly && onChange && val !== undefined) {
              onChange(val);
            }
          }}
          options={{
            readOnly: isReadOnly,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 }
          }}
          loading={
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              <span>Loading Monaco Editor engine...</span>
            </div>
          }
        />
      </div>
    </div>
  );
}
