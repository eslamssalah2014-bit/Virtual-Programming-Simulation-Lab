'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getSocket } from '@/lib/socket/client';
import { LabSession, Assignment, CodeFile, LiveStudentState } from '@/types';
import { WorkspaceHeader } from '@/components/lab/WorkspaceHeader';
import { FileExplorer } from '@/components/lab/FileExplorer';
import { MonacoCodeEditor } from '@/components/lab/MonacoCodeEditor';
import { TerminalConsole } from '@/components/lab/TerminalConsole';
import { InstructionsPanel } from '@/components/lab/InstructionsPanel';
import { HelpModal } from '@/components/lab/HelpModal';
import { runCode } from '@/lib/runner';
import { Terminal, User, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function StudentLabWorkspaceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

  // Student Identity State
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [isIdentityConfirmed, setIsIdentityConfirmed] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');

  const [session, setSession] = useState<LabSession | undefined>(undefined);
  const [assignment, setAssignment] = useState<Assignment | undefined>(undefined);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string>('Initializing lab workspace...\n');
  const [isTerminalError, setIsTerminalError] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined);
  const [isRunning, setIsRunning] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isHelpActive, setIsHelpActive] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Check Identity from URL or localStorage
  useEffect(() => {
    const qName = searchParams.get('name');
    const qId = searchParams.get('studentId');
    const localName = typeof window !== 'undefined' ? localStorage.getItem('vlab_student_name') : null;
    const localId = typeof window !== 'undefined' ? localStorage.getItem('vlab_student_id') : null;

    const initialName = qName || localName || (currentUser?.role === 'student' ? currentUser.fullName : '');
    const initialId = qId || localId || (currentUser?.role === 'student' ? currentUser.id : '');

    if (initialName && initialId) {
      setStudentName(initialName);
      setStudentId(initialId);
      setIsIdentityConfirmed(true);
    }
  }, [searchParams, currentUser]);

  // 2. Fetch Session & Assignment
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setSession(data.session);
        }
        if (data.assignment) {
          setAssignment(data.assignment);
          if (files.length === 0 && data.assignment.starterFiles?.length > 0) {
            setFiles(data.assignment.starterFiles);
            setActiveFileId(data.assignment.starterFiles[0]?.id || '');
          }
        }
      })
      .catch(err => console.error('Failed to load lab session info:', err));
  }, [sessionId, files.length]);

  // 3. Socket Connection & Presence (once identity is confirmed)
  useEffect(() => {
    if (!isIdentityConfirmed) return;

    const socket = getSocket();
    const activeStudentUser = {
      id: studentId || currentUser.id,
      fullName: studentName || currentUser.fullName,
      email: `${(studentId || 'stud').toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`,
      role: 'student' as const
    };

    socket.emit('join_session', { sessionId, user: activeStudentUser });

    // Listen for state sync updates
    const handleStudentStateUpdated = (state: LiveStudentState) => {
      if (state.studentId === activeStudentUser.id || state.studentRegistrationId === studentId) {
        setIsHelpActive(!!state.helpRequest && state.helpRequest.status === 'pending');
        setIsSubmitted(state.status === 'Submitted');
        setCompletedTasks(state.completedTaskIds || []);
        setProgress(state.progressPercentage);
      }
    };

    socket.on('student_state_updated', handleStudentStateUpdated);

    const heartbeatInterval = setInterval(() => {
      socket.emit('student_heartbeat', {
        sessionId,
        studentId: activeStudentUser.id,
        status: isSubmitted ? 'Submitted' : 'Active'
      });
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off('student_state_updated', handleStudentStateUpdated);
    };
  }, [sessionId, isIdentityConfirmed, studentName, studentId, currentUser, isSubmitted]);

  // Handle Identity Confirmation Submit
  const handleConfirmIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentId.trim()) return;

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentRegistrationId: studentId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      if (data.student?.files && data.student.files.length > 0) {
        setFiles(data.student.files);
        setActiveFileId(data.student.files[0].id);
      }

      localStorage.setItem('vlab_student_name', studentName.trim());
      localStorage.setItem('vlab_student_id', studentId.trim());
      setIsIdentityConfirmed(true);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to register student');
    } finally {
      setIsJoining(false);
    }
  };

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // Code change sync
  const handleCodeChange = (newContent: string) => {
    if (!activeFile) return;

    setFiles(prev =>
      prev.map(f => (f.id === activeFile.id ? { ...f, content: newContent } : f))
    );
    setIsSyncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const socket = getSocket();
      socket.emit('student_code_change', {
        sessionId,
        studentId: studentId || currentUser.id,
        fileId: activeFile.id,
        content: newContent
      });
      setIsSyncing(false);
    }, 300);
  };

  const handleCreateFile = (name: string) => {
    const newFile: CodeFile = {
      id: `file-${Date.now()}`,
      name,
      content: `# ${name}\n`,
      language: name.endsWith('.js') ? 'javascript' : name.endsWith('.html') ? 'html' : 'python'
    };
    const updated = [...files, newFile];
    setFiles(updated);
    setActiveFileId(newFile.id);

    const socket = getSocket();
    socket.emit('student_files_update', {
      sessionId,
      studentId: studentId || currentUser.id,
      files: updated,
      activeFileId: newFile.id
    });
  };

  const handleDeleteFile = (fileId: string) => {
    if (files.length <= 1) return;
    const updated = files.filter(f => f.id !== fileId);
    setFiles(updated);
    if (activeFileId === fileId) {
      setActiveFileId(updated[0].id);
    }

    const socket = getSocket();
    socket.emit('student_files_update', {
      sessionId,
      studentId: studentId || currentUser.id,
      files: updated,
      activeFileId: updated[0].id
    });
  };

  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    const socket = getSocket();
    socket.emit('student_files_update', {
      sessionId,
      studentId: studentId || currentUser.id,
      files,
      activeFileId: fileId
    });
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    const updated = files.map(f => (f.id === fileId ? { ...f, name: newName } : f));
    setFiles(updated);

    const socket = getSocket();
    socket.emit('student_files_update', {
      sessionId,
      studentId: studentId || currentUser.id,
      files: updated,
      activeFileId
    });
  };

  // Run Code
  const handleRunCode = async () => {
    if (!activeFile || isRunning) return;
    setIsRunning(true);
    setTerminalOutput('Running program...\n');
    setIsTerminalError(false);

    try {
      const result = await runCode(
        activeFile.language,
        activeFile.content,
        files,
        activeFile.name
      );
      const outputText = result.stderr ? `${result.stdout}\n${result.stderr}` : result.stdout;
      setTerminalOutput(outputText || 'Program finished with no output.');
      setIsTerminalError(result.exitCode !== 0);
      setExecutionTime(result.executionTimeMs);

      const socket = getSocket();
      socket.emit('student_code_execution', {
        sessionId,
        studentId: studentId || currentUser.id,
        output: outputText,
        status: result.exitCode === 0 ? 'success' : 'error',
        durationMs: result.executionTimeMs
      });
    } catch (err: any) {
      const errMsg = `Execution error: ${err.message || String(err)}`;
      setTerminalOutput(errMsg);
      setIsTerminalError(true);

      const socket = getSocket();
      socket.emit('student_code_execution', {
        sessionId,
        studentId: studentId || currentUser.id,
        output: errMsg,
        status: 'error',
        durationMs: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    const socket = getSocket();
    socket.emit('student_task_toggle', {
      sessionId,
      studentId: studentId || currentUser.id,
      taskId,
      completed
    });
  };

  const handleSendHelpRequest = (message: string) => {
    const socket = getSocket();
    socket.emit('student_request_help', {
      sessionId,
      studentId: studentId || currentUser.id,
      message
    });
    setIsHelpActive(true);
    setIsHelpModalOpen(false);
  };

  const handleCancelHelp = () => {
    const socket = getSocket();
    socket.emit('instructor_resolve_help', {
      sessionId,
      studentId: studentId || currentUser.id
    });
    setIsHelpActive(false);
  };

  const handleSubmitAssignment = () => {
    const confirmed = window.confirm(
      'Are you sure you want to submit your laboratory assignment? You can continue editing after submitting.'
    );
    if (!confirmed) return;

    const socket = getSocket();
    socket.emit('student_submit_assignment', {
      sessionId,
      studentId: studentId || currentUser.id
    });
    setIsSubmitted(true);
  };

  // If student identity is not confirmed yet, render the clean gate modal
  if (!isIdentityConfirmed) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-[#0d1117] text-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-6 border-b border-gray-800 bg-gray-900/40">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Student Lab Access</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              {session?.sessionTitle || session?.name || 'Programming Lab'}
            </h1>
            <div className="flex items-center space-x-3 text-xs text-gray-400">
              <span className="bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
                {session?.groupCode || 'GRP-1'}
              </span>
              <span>{session?.groupName || 'Section Lab'}</span>
            </div>
          </div>

          <form onSubmit={handleConfirmIdentity} className="p-6 space-y-4">
            {joinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Your Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Student ID / Registration Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 2024-0101"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isJoining || !studentName.trim() || !studentId.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 text-sm transition shadow-sm"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entering Lab...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Coding Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="px-6 py-3 bg-[#0d1117]/60 border-t border-gray-800 text-center text-[11px] text-gray-500">
            Instructor will monitor your code & executions in real time
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#0d1117] text-white overflow-hidden">
      {/* Workspace Header */}
      <WorkspaceHeader
        session={session}
        assignment={assignment}
        isRunning={isRunning}
        onRunCode={handleRunCode}
        onSubmitAssignment={handleSubmitAssignment}
        onRequestHelp={() => {
          if (isHelpActive) handleCancelHelp();
          else setIsHelpModalOpen(true);
        }}
        isHelpActive={isHelpActive}
        isSubmitted={isSubmitted}
      />

      {/* Main 3-Column IDE Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Col: File Explorer */}
        <div className="w-56 bg-[#161b22] border-r border-gray-800 flex flex-col shrink-0">
          <FileExplorer
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </div>

        {/* Center Col: Monaco Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {activeFile ? (
            <MonacoCodeEditor
              file={activeFile}
              value={activeFile.content}
              isReadOnly={isSubmitted}
              isSyncing={isSyncing}
              onChange={handleCodeChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              No open file. Create or select a file from the explorer.
            </div>
          )}
        </div>

        {/* Right Col: Instructions & Terminal */}
        <div className="w-96 bg-[#161b22] border-l border-gray-800 flex flex-col shrink-0">
          {/* Top Half: Instructions */}
          <div className="h-1/2 border-b border-gray-800 flex flex-col min-h-0">
            <InstructionsPanel
              assignment={assignment}
              completedTaskIds={completedTasks}
              progressPercentage={progress}
              onToggleTask={handleTaskToggle}
            />
          </div>

          {/* Bottom Half: Terminal Console */}
          <div className="h-1/2 flex flex-col min-h-0">
            <TerminalConsole
              output={terminalOutput}
              isError={isTerminalError}
              executionTimeMs={executionTime}
              onClear={() => setTerminalOutput('')}
              files={files}
              activeLanguage={activeFile?.language}
            />
          </div>
        </div>
      </div>

      {/* Help Request Modal */}
      {isHelpModalOpen && (
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          onSubmit={handleSendHelpRequest}
          isHelpActive={isHelpActive}
          onCancelRequest={handleCancelHelp}
        />
      )}
    </div>
  );
}

export default function StudentLabWorkspacePage() {
  return (
    <React.Suspense fallback={<div className="h-[calc(100vh-3.5rem)] bg-[#0d1117] flex items-center justify-center text-xs text-gray-400">Loading Lab Workspace...</div>}>
      <StudentLabWorkspaceContent />
    </React.Suspense>
  );
}
