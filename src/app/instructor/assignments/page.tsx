'use client';

import React, { useState, useEffect } from 'react';
import { Assignment, Course, SupportedLanguage, CodeFile, AssignmentTask } from '@/types';
import {
  FileCode,
  Plus,
  Rocket,
  Code2,
  ListTodo,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';

export default function AssignmentManagementPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isLaunchingSession, setIsLaunchingSession] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Form states for new assignment
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [starterCode, setStarterCode] = useState('');
  const [tasksText, setTasksText] = useState('');

  // Form states for launching session
  const [sessionName, setSessionName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/assignments')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAssignments(data);
      });

    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCourses(data);
          if (data[0]) setCourseId(data[0].id);
        }
      });
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const starterFileName = language === 'python' ? 'main.py' : language === 'javascript' ? 'index.js' : 'index.html';
    const tasks: AssignmentTask[] = tasksText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map((desc, idx) => ({
        id: `task-${Date.now()}-${idx}`,
        description: desc,
        required: true
      }));

    const newAssignment: Assignment = {
      id: `assign-${Date.now()}`,
      courseId: courseId || courses[0]?.id || 'course-1',
      title: title.trim(),
      description: description.trim(),
      instructionsMarkdown: instructions.trim() || '### Instructions\nComplete the required tasks.',
      language,
      starterFiles: [
        {
          id: `f-${Date.now()}`,
          name: starterFileName,
          language,
          content: starterCode || (language === 'python' ? '# Starter Code\nprint("Hello World")\n' : '// Starter Code\nconsole.log("Hello");')
        }
      ],
      tasks: tasks.length > 0 ? tasks : [{ id: 't-1', description: 'Complete lab implementation', required: true }],
      maxScore: 100,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      });
      const data = await res.json();
      setAssignments(prev => [data, ...prev]);
      setIsCreatingAssignment(false);
      // Reset form
      setTitle('');
      setDescription('');
      setInstructions('');
      setStarterCode('');
      setTasksText('');
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  const handleLaunchSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !sessionName.trim()) return;

    const newSession = {
      id: `session-${Date.now()}`,
      assignmentId: selectedAssignment.id,
      courseId: selectedAssignment.courseId,
      name: sessionName.trim(),
      sessionCode: (sessionCode || `LAB-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 120 * 60000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      });
      const data = await res.json();
      setCreatedSessionId(data.id);
    } catch (err) {
      console.error('Failed to launch session:', err);
    }
  };

  return (
    <div className="flex-1 bg-[#0d1117] p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Reusable Assignment & Lab Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Create reusable programming labs with starter templates, test tasks, and launch live monitored classroom sessions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreatingAssignment(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-md shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {assignments.map((assign) => {
          const course = courses.find(c => c.id === assign.courseId);

          return (
            <div
              key={assign.id}
              className="bg-[#161b22] border border-gray-800 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-gray-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {course?.code || 'CS'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {assign.language}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm leading-snug">
                    {assign.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                    {assign.description}
                  </p>
                </div>

                <div className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{assign.starterFiles.length} Starter File(s)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{assign.tasks.length} Check Tasks</span>
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-gray-400 truncate">
                    Files: {assign.starterFiles.map(f => f.name).join(', ')}
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Reusable template
                </span>
                <button
                  onClick={() => {
                    setSelectedAssignment(assign);
                    setSessionName(`${assign.title} - Lab Session`);
                    setSessionCode(`${assign.language.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
                    setIsLaunchingSession(true);
                    setCreatedSessionId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Launch Live Lab</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Assignment */}
      {isCreatingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Create Reusable Lab Assignment</h3>
              <button
                onClick={() => setIsCreatingAssignment(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Binary Search Tree Implementation"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Target Course</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Programming Language</label>
                <div className="flex space-x-3">
                  {(['python', 'javascript', 'html'] as SupportedLanguage[]).map(lang => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg font-medium uppercase text-xs border transition ${
                        language === lang
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Short Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of lab objective..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Instructions (Markdown)</label>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="### Lab 5: Instructions&#10;1. Implement binary search...&#10;2. Verify edge cases..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Starter Code Template</label>
                <textarea
                  rows={5}
                  value={starterCode}
                  onChange={(e) => setStarterCode(e.target.value)}
                  placeholder={language === 'python' ? '# Starter Code\ndef solution():\n    pass' : '// Starter Code\nfunction solution() {}'}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Required Task Checklist (One per line)
                </label>
                <textarea
                  rows={3}
                  value={tasksText}
                  onChange={(e) => setTasksText(e.target.value)}
                  placeholder="Implement core function&#10;Test with sample inputs&#10;Handle boundary conditions"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingAssignment(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-900/30"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Launch Lab Session */}
      {isLaunchingSession && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-gray-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Launch Live Lab Session</h3>
              <button
                onClick={() => setIsLaunchingSession(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {createdSessionId ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Lab Session Is Active!</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Students can now join using the session link or code below:
                  </p>
                </div>

                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 text-xs font-mono text-cyan-300">
                  Code: <strong className="text-white text-sm">{sessionCode}</strong>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Link
                    href={`/instructor/sessions/${createdSessionId}`}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center"
                  >
                    Open Live Monitoring
                  </Link>
                  <Link
                    href={`/lab/${createdSessionId}`}
                    target="_blank"
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium text-center border border-gray-700"
                  >
                    Open Student View
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLaunchSession} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Session Name *</label>
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Session Access Code</label>
                  <input
                    type="text"
                    required
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsLaunchingSession(false)}
                    className="px-3 py-1.5 rounded-lg text-gray-400 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                  >
                    Start Session Now
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
