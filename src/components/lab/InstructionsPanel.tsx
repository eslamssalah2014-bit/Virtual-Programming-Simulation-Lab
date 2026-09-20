'use client';

import React, { useState } from 'react';
import { Assignment, AssignmentTask } from '@/types';
import {
  BookOpen,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  Award,
  ListTodo
} from 'lucide-react';

interface InstructionsPanelProps {
  assignment?: Assignment;
  completedTaskIds: string[];
  onToggleTask: (taskId: string, completed: boolean) => void;
  progressPercentage: number;
}

export function InstructionsPanel({
  assignment,
  completedTaskIds,
  onToggleTask,
  progressPercentage
}: InstructionsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'instructions'>('tasks');

  if (isCollapsed) {
    return (
      <div className="w-10 bg-[#161b22] border-r border-gray-800 flex flex-col items-center py-3">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800"
          title="Expand Instructions"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-8 transform -rotate-90 whitespace-nowrap text-xs text-gray-400 font-semibold tracking-wider uppercase">
          Instructions & Tasks
        </div>
      </div>
    );
  }

  const tasks = assignment?.tasks || [];

  return (
    <aside className="w-80 bg-[#161b22] border-r border-gray-800 flex flex-col h-full text-xs">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-gray-200 text-xs">Lab Overview</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar Card */}
      <div className="p-3 border-b border-gray-800 bg-gray-900/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400 font-medium">Assignment Progress</span>
          <span className="text-[11px] font-bold text-emerald-400 font-mono">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-[#13171d]">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2 text-center font-medium border-b-2 transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'tasks'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>Tasks ({completedTaskIds.length}/{tasks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          className={`flex-1 py-2 text-center font-medium border-b-2 transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'instructions'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Guide</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'tasks' ? (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-400">
              Check off tasks as you solve them. Your progress updates live on the instructor dashboard:
            </p>
            {tasks.map((task) => {
              const isDone = completedTaskIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(task.id, !isDone)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex items-start space-x-2.5 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-gray-800/40 border-gray-700/60 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs ${isDone ? 'line-through text-gray-400' : ''}`}>
                      {task.description}
                    </p>
                    {task.required && (
                      <span className="inline-block mt-1 text-[10px] text-amber-400 font-semibold uppercase">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="prose prose-invert prose-xs max-w-none text-gray-300 leading-relaxed space-y-3">
            <h4 className="text-white font-bold text-sm">{assignment?.title}</h4>
            <div className="whitespace-pre-line text-gray-300 font-sans text-xs">
              {assignment?.instructionsMarkdown || 'No detailed instructions available for this lab.'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
