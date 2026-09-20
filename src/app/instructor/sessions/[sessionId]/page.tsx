'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { getSocket } from '@/lib/socket/client';
import { LabSession, Course, LiveStudentState, PerformanceTag } from '@/types';
import { SessionHeader } from '@/components/instructor/SessionHeader';
import { StudentGrid } from '@/components/instructor/StudentGrid';
import { FocusStudentPanel } from '@/components/instructor/FocusStudentPanel';
import { AlertTriangle, X, Maximize2 } from 'lucide-react';

export default function InstructorLiveMonitoringPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || 'session-101';
  const { currentUser, isSimulationActive, toggleSimulation } = useAuth();

  const [session, setSession] = useState<LabSession | undefined>(undefined);
  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [students, setStudents] = useState<LiveStudentState[]>([]);
  const [focusedStudent, setFocusedStudent] = useState<LiveStudentState | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.session) setSession(data.session);
        if (data.course) setCourse(data.course);
      })
      .catch(err => console.error('Failed to load session details:', err));

    fetch(`/api/sessions/${sessionId}/students`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch(err => console.error('Failed to load initial students:', err));
  }, [sessionId]);

  // 2. Real-time Socket Subscriptions
  useEffect(() => {
    const socket = getSocket();

    socket.emit('join_session', { sessionId, user: currentUser });

    // Handle complete student list updates
    const handleStudentsListUpdated = (updatedList: LiveStudentState[]) => {
      setStudents(updatedList);

      // If a student is currently focused, update their live state reference
      setFocusedStudent(prev => {
        if (!prev) return null;
        const match = updatedList.find(s => s.studentId === prev.studentId);
        return match || prev;
      });
    };

    // Handle real-time keystroke code sync
    const handleStudentCodeSynced = ({ studentId, fileId, content, studentState }: {
      studentId: string;
      fileId: string;
      content: string;
      studentState: LiveStudentState;
    }) => {
      // Update the student in local state
      setStudents(prev =>
        prev.map(s => (s.studentId === studentId ? { ...s, ...studentState } : s))
      );

      // If this student is currently being focused, mirror the new code immediately!
      setFocusedStudent(prev => {
        if (prev && prev.studentId === studentId) {
          const updatedFiles = prev.files.map(f =>
            f.id === fileId ? { ...f, content } : f
          );
          return {
            ...prev,
            ...studentState,
            files: updatedFiles,
            currentFileId: fileId
          };
        }
        return prev;
      });
    };

    socket.on('students_list_updated', handleStudentsListUpdated);
    socket.on('student_code_synced', handleStudentCodeSynced);

    return () => {
      socket.off('students_list_updated', handleStudentsListUpdated);
      socket.off('student_code_synced', handleStudentCodeSynced);
    };
  }, [sessionId, currentUser]);

  // 3. Resolve Help Request
  const handleResolveHelp = (studentId: string) => {
    const socket = getSocket();
    socket.emit('instructor_resolve_help', { sessionId, studentId });
  };

  // 4. Save Instructor Notes
  const handleSaveNote = (studentId: string, tag: PerformanceTag, content: string) => {
    const socket = getSocket();
    socket.emit('instructor_save_note', {
      sessionId,
      studentId,
      instructorId: currentUser.id,
      tag,
      content
    });
  };

  const pendingHelpStudents = students.filter(s => s.helpRequest?.status === 'pending');

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] min-h-[calc(100vh-3.5rem)]">
      {/* Session Top Bar */}
      <SessionHeader
        session={session}
        course={course}
        students={students}
        isSimulationActive={isSimulationActive}
        onToggleSimulation={toggleSimulation}
        pendingHelpCount={pendingHelpStudents.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Urgent Help Request Notification Banner if students are stuck */}
        {pendingHelpStudents.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-rose-950/30 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-bold text-rose-200 text-sm">
                  {pendingHelpStudents.length} Student{pendingHelpStudents.length > 1 ? 's' : ''} Need Instructor Help
                </h4>
                <p className="text-xs text-rose-300/80">
                  {pendingHelpStudents.map(s => s.studentName).join(', ')} currently waiting for assistance.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {pendingHelpStudents.map(s => (
                <button
                  key={s.studentId}
                  onClick={() => setFocusedStudent(s)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-md shadow-rose-900/40"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Inspect {s.studentName.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Student Grid */}
        <StudentGrid
          students={students}
          onFocusStudent={setFocusedStudent}
        />
      </div>

      {/* Focus Student Live Inspector Modal */}
      {focusedStudent && (
        <FocusStudentPanel
          student={focusedStudent}
          sessionId={sessionId}
          onClose={() => setFocusedStudent(null)}
          onResolveHelp={handleResolveHelp}
          onSaveNote={handleSaveNote}
        />
      )}
    </div>
  );
}
