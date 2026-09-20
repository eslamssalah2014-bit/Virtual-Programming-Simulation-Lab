'use client';

import React, { useState } from 'react';
import { LiveStudentState } from '@/types';
import { StudentCard } from './StudentCard';
import { Search, Filter, AlertTriangle } from 'lucide-react';

interface StudentGridProps {
  students: LiveStudentState[];
  onFocusStudent: (student: LiveStudentState) => void;
}

export function StudentGrid({ students, onFocusStudent }: StudentGridProps) {
  const [filter, setFilter] = useState<'all' | 'Active' | 'Idle' | 'Disconnected' | 'Submitted' | 'help'>('all');
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(student => {
    // Status filter
    if (filter === 'help') {
      if (!student.helpRequest || student.helpRequest.status !== 'pending') return false;
    } else if (filter !== 'all') {
      if (student.status !== filter) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = student.studentName.toLowerCase().includes(q);
      const matchEmail = student.studentEmail.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }

    return true;
  });

  const helpCount = students.filter(s => s.helpRequest?.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161b22] border border-gray-800 p-3 rounded-xl">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-gray-800 text-white font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            All Students ({students.length})
          </button>

          <button
            onClick={() => setFilter('Active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'Active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            Active ({students.filter(s => s.status === 'Active').length})
          </button>

          <button
            onClick={() => setFilter('help')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              filter === 'help'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Help Needed ({helpCount})</span>
          </button>

          <button
            onClick={() => setFilter('Idle')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'Idle'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            Idle ({students.filter(s => s.status === 'Idle').length})
          </button>

          <button
            onClick={() => setFilter('Submitted')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filter === 'Submitted'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            Submitted ({students.filter(s => s.status === 'Submitted').length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student by name..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.studentId}
              student={student}
              onFocus={onFocusStudent}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-12 text-center text-gray-400 space-y-2">
          <p className="text-sm font-medium">No students match current filter criteria.</p>
          <button
            onClick={() => {
              setFilter('all');
              setSearch('');
            }}
            className="text-xs text-cyan-400 hover:underline"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
