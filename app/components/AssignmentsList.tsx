'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
} from 'lucide-react';
import AssignmentViewer from './AssignmentViewer';
import AssignmentPreview from './AssignmentPreview';

interface Assignment {
  id: string;
  title: string;
  assignedDate: string;
  dueDate: string;
  questionGenerationStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface AssignmentsListProps {
  onBack: () => void;
  onCreateNew?: () => void;
  assignments: Assignment[];
  onDeleteAssignment?: (id: string) => void;
}

export default function AssignmentsList({
  onBack,
  onCreateNew,
  assignments,
  onDeleteAssignment,
}: AssignmentsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewingAssignmentId, setViewingAssignmentId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'nearest' | 'furthest' | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filteredAssignments = assignments.filter((assignment) =>
    assignment.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (!sortBy) return 0;
    
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    
    if (sortBy === 'nearest') {
      return dateA - dateB; // Ascending - nearest first
    } else {
      return dateB - dateA; // Descending - furthest first
    }
  });

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const getStatusStyles = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusText = (status?: string) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1);
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#dbdbdb' }}>

      {/* MOBILE HEADER */}
      <div className="md:hidden px-4 py-4 bg-white border-b border-slate-200" style={{ backgroundColor: '#dbdbdb' }}>
        <div className="flex items-center mb-4">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-slate-900">Assignments</h2>
        </div>
      </div>

      {/* DESKTOP HEADER */}
      <div className="hidden md:block px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></span>
          <h2 className="text-2xl font-semibold text-slate-900">
            Assignments
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          Manage and create assignments for your classes.
        </p>
      </div>

      {/* MOBILE FILTER + SEARCH */}
      <div className="md:hidden px-3 py-3 mx-3 mb-3 bg-white flex gap-2 rounded-2xl shadow-md">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition whitespace-nowrap flex-shrink-0">
          <Filter className="w-4 h-4" />
          Filter
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* DESKTOP FILTER + SEARCH */}
      <div className="hidden md:flex items-center justify-between px-8 py-6 mx-8 mb-4 rounded-xl border border-slate-100 shadow-sm relative" style={{ backgroundColor: '#ffffff' }}>
        <div className="relative">
          <button 
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            <Filter className="w-4 h-4" />
            Filter By
          </button>
          
          {showFilterMenu && (
            <div className="absolute top-12 left-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 w-48">
              <button
                onClick={() => {
                  setSortBy('nearest');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b ${sortBy === 'nearest' ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                ✓ Nearest Due Date
              </button>
              <button
                onClick={() => {
                  setSortBy('furthest');
                  setShowFilterMenu(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${sortBy === 'furthest' ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                ✓ Furthest Due Date
              </button>
            </div>
          )}
        </div>

        <div className="relative w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Assignment"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* MOBILE ASSIGNMENTS LIST */}
      <div className="md:hidden flex-1 overflow-y-auto px-4 pb-32">
        {sortedAssignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-white rounded-2xl px-6 py-6 mb-3 border border-slate-100 shadow-md relative"
            style={{
              marginBottom: '12px',
            }}
          >
            {/* HEADER */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="text-base font-semibold text-slate-900 leading-tight">
                  {assignment.title}
                </h3>
                {assignment.questionGenerationStatus && (
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getStatusStyles(assignment.questionGenerationStatus)}`}>
                    {getStatusText(assignment.questionGenerationStatus)}
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleMenu(assignment.id)}
                className="p-1 rounded-md hover:bg-slate-100 transition flex-shrink-0 ml-2"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>

              {openMenuId === assignment.id && (
                <div className="absolute right-2 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-10 w-40">
                  <button
                    onClick={() => setViewingAssignmentId(assignment.id)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b"
                  >
                    View Assignment
                  </button>
                  <button
                    onClick={() => onDeleteAssignment?.(assignment.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* CONTENT */}
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                <span className="text-slate-900">Assigned on</span> <span className="text-slate-500">·</span> <span className="text-slate-500">{assignment.assignedDate}</span>
              </p>
              <p className="text-sm font-medium">
                <span className="text-slate-900">Due</span> <span className="text-slate-500">·</span> <span className="text-slate-500">{assignment.dueDate}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP GRID */}
      <div className="hidden md:grid gap-6 mx-8 pb-24" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: '162px' }}>
        {sortedAssignments.map((assignment) => (
          <div
            key={assignment.id}
            className="bg-white rounded-2xl px-8 py-6 border border-slate-100 shadow-md hover:shadow-lg transition-all relative flex flex-col justify-between"
          >
            {/* HEADER */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {assignment.title}
                </h3>
                {assignment.questionGenerationStatus && (
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getStatusStyles(assignment.questionGenerationStatus)}`}>
                    {getStatusText(assignment.questionGenerationStatus)}
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleMenu(assignment.id)}
                className="p-1.5 rounded-md hover:bg-slate-100 transition ml-2 flex-shrink-0"
              >
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>

              {openMenuId === assignment.id && (
                <div className="absolute right-4 top-12 bg-white border border-slate-200 rounded-lg shadow-lg z-10 w-40">
                  <button
                    onClick={() => setViewingAssignmentId(assignment.id)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b"
                  >
                    View Assignment
                  </button>
                  <button
                    onClick={() => onDeleteAssignment?.(assignment.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* DATES AT BOTTOM */}
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                <span className="text-slate-900">Assigned on</span> <span className="text-slate-500">·</span> <span className="text-slate-500">{assignment.assignedDate}</span>
              </p>
              <p className="text-sm font-medium">
                <span className="text-slate-900">Due</span> <span className="text-slate-500">·</span> <span className="text-slate-500">{assignment.dueDate}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE FLOATING BUTTON */}
      <button
        onClick={onCreateNew}
        className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl text-slate-900 hover:shadow-xl transition-shadow active:scale-95 border border-slate-200"
      >
        +
      </button>

      {/* DESKTOP FLOATING BUTTON */}
      {sortedAssignments.length > 0 && (
        <div className="hidden md:flex fixed bottom-8 left-[328px] right-0 justify-center z-40">
          <button
            onClick={onCreateNew}
            className="bg-slate-900 text-white px-10 py-4 rounded-full text-base font-semibold shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all active:scale-95"
          >
            + Create Assignment
          </button>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewingAssignmentId && (
        <AssignmentPreview
          assignmentId={viewingAssignmentId}
          onClose={() => setViewingAssignmentId(null)}
        />
      )}
    </div>
  );
}