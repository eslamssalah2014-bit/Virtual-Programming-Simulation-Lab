'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Send, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  isHelpActive: boolean;
  onCancelRequest: () => void;
}

export function HelpModal({
  isOpen,
  onClose,
  onSubmit,
  isHelpActive,
  onCancelRequest
}: HelpModalProps) {
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(message.trim() || 'Student requested instructor assistance.');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">
              {isHelpActive ? 'Cancel Help Request?' : 'Request Instructor Help'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isHelpActive ? (
          <div className="p-5 space-y-4 text-xs text-gray-300">
            <p>
              Your help request is currently in the instructor queue. Would you like to cancel it?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:bg-gray-800"
              >
                Keep Waiting
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancelRequest();
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium"
              >
                Cancel Help Request
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs text-gray-400">
              Your instructor will see an immediate notification with your current code and terminal output.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Describe what you're stuck on (optional):
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Getting IndexError on Fibonacci edge cases, or syntax error in helper function..."
                rows={4}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-800"
              >
                Back to Lab
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-rose-900/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Help Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
