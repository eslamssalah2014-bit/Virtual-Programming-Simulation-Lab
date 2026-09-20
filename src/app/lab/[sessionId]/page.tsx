'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
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

export default function StudentLabWorkspacePage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser } = useAuth();

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

  // 1. Fetch Session & Assignment
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.session) setSession(data.session);
        if (data.assignment) {
          setAssignment(data.assignment);
          if (files.length === 0) {
            setFiles(data.assignment.starterFiles);
            setActiveFileId(data.assignment.starterFiles[0]?.id || '');
          }
        }
      })
      .catch(err => console.error('Failed to load lab session info:', err));
  }, [sessionId]);

  // 2. Socket Connection & Presence
  useEffect(() => {
    const socket = getSocket();

    socket.emit('join_session', { sessionId, user: currentUser });

    // Listen for updates to our state
    const handleStudentStateUpdated = (state: LiveStudentState) => {
      if (state.studentId === currentUser.id) {
        setIsHelpActive(!!state.helpRequest && state.helpRequest.status === 'pending');
        setIsSubmitted(state.status === 'Submitted');
        setCompletedTasks(state.completedTaskIds || []);
        setProgress(state.progressPercentage);
      }
    };

    socket.on('student_state_updated', handleStudentStateUpdated);

    // Heartbeat to keep status active
    const heartbeatInterval = setInterval(() => {
      socket.emit('student_heartbeat', {
        sessionId,
        studentId: currentUser.id,
        status: isSubmitted ? 'Submitted' : 'Active'
      });
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off('student_state_updated', handleStudentStateUpdated);
    };
  }, [sessionId, currentUser, isSubmitted]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // 3. Handle Code Changes with debounced sync
  const handleCodeChange = (newContent: string) => {
    if (!activeFile) return;

    // Local instant update
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
        studentId: currentUser.id,
        fileId: activeFile.id,
        content: newContent
      });
      setIsSyncing(false);
    }, 300);
  };

  // 4. File Management
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
      studentId: currentUser.id,
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
      studentId: currentUser.id,
      files: updated,
      activeFileId: updated[0].id
    });
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    const updated = files.map(f => (f.id === fileId ? { ...f, name: newName } : f));
    setFiles(updated);
    const socket = getSocket();
    socket.emit('student_files_update', {
      sessionId,
      studentId: currentUser.id,
      files: updated,
      activeFileId
    });
  };

  // 5. Code Execution
  const handleRunCode = async () => {
    if (!activeFile || !assignment) return;

    setIsRunning(true);
    setTerminalOutput('Running execution engine...\n');

    try {
      const result = await runCode(
        assignment.language,
        activeFile.content,
        files,
        activeFile.name
      );

      setTerminalOutput(result.stdout || result.stderr || '[Process finished with no output]');
      setIsTerminalError(result.exitCode !== 0);
      setExecutionTime(result.executionTimeMs);

      // Stream output to socket so instructor sees execution live!
      const socket = getSocket();
      socket.emit('student_code_execution', {
        sessionId,
        studentId: currentUser.id,
        output: result.stdout || result.stderr,
        status: result.exitCode === 0 ? 'success' : 'error',
        durationMs: result.executionTimeMs
      });
    } catch (err: any) {
      setTerminalOutput(`Execution error: ${err.message || err}`);
      setIsTerminalError(true);
    } finally {
      setIsRunning(false);
    }
  };

  // 6. Checklist Tasks
  const handleToggleTask = (taskId: string, completed: boolean) => {
    const updated = completed
      ? [...completedTasks, taskId]
      : completedTasks.filter(id => id !== taskId);
    setCompletedTasks(updated);

    const totalTasks = assignment?.tasks.length || 1;
    setProgress(Math.round((updated.length / totalTasks) * 100));

    const socket = getSocket();
    socket.emit('student_task_toggle', {
      sessionId,
      studentId: currentUser.id,
      taskId,
      completed
    });
  };

  // 7. Help Requests
  const handleRequestHelp = (message: string) => {
    const socket = getSocket();
    socket.emit('student_request_help', {
      sessionId,
      studentId: currentUser.id,
      message
    });
    setIsHelpActive(true);
  };

  const handleCancelHelp = () => {
    const socket = getSocket();
    socket.emit('instructor_resolve_help', {
      sessionId,
      studentId: currentUser.id
    });
    setIsHelpActive(false);
  };

  // 8. Submit Assignment
  const handleSubmitAssignment = () => {
    if (confirm('Are you ready to submit your lab assignment? You will still be able to review your code.')) {
      const socket = getSocket();
      socket.emit('student_submit_assignment', {
        sessionId,
        studentId: currentUser.id
      });
      setIsSubmitted(true);
      setProgress(100);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0d1117]">
      {/* Top Header */}
      <WorkspaceHeader
        session={session}
        assignment={assignment}
        isRunning={isRunning}
        onRunCode={handleRunCode}
        onSubmitAssignment={handleSubmitAssignment}
        onRequestHelp={() => setIsHelpModalOpen(true)}
        isHelpActive={isHelpActive}
        isSubmitted={isSubmitted}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Explorer */}
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={setActiveFileId}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
        />

        {/* Center: Monaco Editor & Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <MonacoCodeEditor
            file={activeFile}
            value={activeFile?.content || ''}
            onChange={handleCodeChange}
            isSyncing={isSyncing}
          />
          <TerminalConsole
            output={terminalOutput}
            isError={isTerminalError}
            executionTimeMs={executionTime}
            onClear={() => setTerminalOutput('')}
            files={files}
            activeLanguage={assignment?.language}
          />
        </div>

        {/* Right: Lab Instructions & Task Checklist */}
        <InstructionsPanel
          assignment={assignment}
          completedTaskIds={completedTasks}
          onToggleTask={handleToggleTask}
          progressPercentage={progress}
        />
      </div>

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onSubmit={handleRequestHelp}
        isHelpActive={isHelpActive}
        onCancelRequest={handleCancelHelp}
      />
    </div>
  );
}
