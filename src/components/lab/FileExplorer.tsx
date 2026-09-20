'use client';

import React, { useState } from 'react';
import { CodeFile } from '@/types';
import {
  FileCode,
  FilePlus,
  Trash2,
  Edit2,
  Check,
  X,
  FileText
} from 'lucide-react';

interface FileExplorerProps {
  files: CodeFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
}

export function FileExplorer({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile
}: FileExplorerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamedName, setRenamedName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = (fileId: string) => {
    if (renamedName.trim()) {
      onRenameFile(fileId, renamedName.trim());
    }
    setRenamingId(null);
  };

  const getFileBadge = (name: string) => {
    if (name.endsWith('.py')) return { label: 'PY', color: 'text-amber-400 bg-amber-400/10' };
    if (name.endsWith('.js')) return { label: 'JS', color: 'text-yellow-400 bg-yellow-400/10' };
    if (name.endsWith('.html')) return { label: 'HTML', color: 'text-orange-400 bg-orange-400/10' };
    if (name.endsWith('.css')) return { label: 'CSS', color: 'text-blue-400 bg-blue-400/10' };
    return { label: 'TXT', color: 'text-gray-400 bg-gray-400/10' };
  };

  return (
    <div className="w-60 bg-[#161b22] border-r border-gray-800 flex flex-col h-full select-none text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between text-gray-400 font-semibold tracking-wider uppercase text-[11px]">
        <span>Files Explorer</span>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:text-white hover:bg-gray-800 rounded transition"
          title="Create New File"
        >
          <FilePlus className="w-4 h-4" />
        </button>
      </div>

      {/* New File Input */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-gray-800 bg-gray-900/60">
          <div className="flex items-center space-x-1">
            <input
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="e.g. helper.py"
              className="w-full bg-gray-800 text-gray-200 px-2 py-1 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-gray-700"
            />
            <button type="submit" className="p-1 text-emerald-400 hover:text-emerald-300">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 text-gray-400 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* Files List */}
      <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5">
        {files.map((file) => {
          const badge = getFileBadge(file.name);
          const isActive = file.id === activeFileId;

          return (
            <div
              key={file.id}
              onClick={() => onSelectFile(file.id)}
              className={`group px-3 py-1.5 flex items-center justify-between cursor-pointer transition ${
                isActive
                  ? 'bg-[#1f242c] text-emerald-400 border-l-2 border-emerald-500'
                  : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
              }`}
            >
              {renamingId === file.id ? (
                <div
                  className="flex items-center space-x-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    value={renamedName}
                    onChange={(e) => setRenamedName(e.target.value)}
                    className="w-full bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs border border-emerald-500/50"
                  />
                  <button
                    onClick={() => handleRenameSubmit(file.id)}
                    className="p-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="p-1 text-gray-400 hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="truncate font-mono">{file.name}</span>
                  </div>

                  <div className="hidden group-hover:flex items-center space-x-1 text-gray-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(file.id);
                        setRenamedName(file.name);
                      }}
                      className="p-0.5 hover:text-white rounded"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {files.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                        }}
                        className="p-0.5 hover:text-rose-400 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
