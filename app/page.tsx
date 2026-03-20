'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Home,
  Users,
  FileText,
  Zap,
  Book,
  Settings,
  Menu,
  X,
  AlertCircle,
  ArrowLeft,
  LayoutGrid,
  Sparkles,
  ImageIcon,
  Square,
  PieChart,
} from 'lucide-react';
import CreateAssignment from './components/CreateAssignment';
import AssignmentsList from './components/AssignmentsList';
import NotificationDropdown from './components/NotificationDropdown';
import { getAssignments, deleteAssignment as deleteFromBackend } from './api/assignmentService';

interface Assignment {
  id: string;
  title: string;
  assignedDate: string;
  dueDate: string;
  assignmentName?: string;
  file?: File | null;
  questions?: any[];
  additionalInfo?: string;
  fileUrl?: string;
  fileName?: string;
  _id?: string;
}

export default function HomePage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch assignments from backend on component mount
  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const response = await getAssignments();
      if (response.success && response.data) {
        // Transform backend data to frontend format
        const transformedAssignments = response.data.map((item: any) => ({
          id: item._id || item.id,
          title: item.assignmentName,
          assignedDate: new Date(item.createdAt).toISOString().split('T')[0],
          dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
          assignmentName: item.assignmentName,
          questions: item.questions,
          additionalInfo: item.additionalInfo,
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          _id: item._id,
          questionGenerationStatus: item.questionGenerationStatus,
        }));
        setAssignments(transformedAssignments);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
  };

  const handleSubmitAssignment = async () => {
    // Reload assignments from backend after successful creation
    await loadAssignments();
    setActiveNav('assignments');
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      // Find the MongoDB ID from our assignments
      const assignment = assignments.find(a => a.id === id);
      if (assignment && assignment._id) {
        const response = await deleteFromBackend(assignment._id);
        if (response.success) {
          setAssignments(assignments.filter((a) => a.id !== id));
        }
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Home', icon: LayoutGrid },
    { id: 'groups', label: 'My Groups', icon: ImageIcon },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'toolkit', label: "AI Teacher's Toolkit", icon: Square },
    { id: 'library', label: 'My Library', icon: PieChart },
  ];

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: LayoutGrid },
    { id: 'groups', label: 'My Groups', icon: ImageIcon },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'library', label: 'Library', icon: PieChart },
    { id: 'toolkit', label: 'AI Toolkit', icon: Square },
  ];

  const schoolInfo = {
    name: 'Delhi Public School',
    location: 'Delhi, India',
  };

  return (
    <div className="flex h-screen relative" style={{ backgroundColor: '#dbdbdb' }}>
      {/* DESKTOP SIDEBAR */}
      <div
        className="hidden md:flex bg-white flex-col fixed"
        style={{
          width: '304px',
          height: 'calc(100vh - 24px)',
          padding: '24px',
          borderRadius: '16px',
          top: '12px',
          left: '12px',
          bottom: '12px',
          justifyContent: 'space-between',
          opacity: 1,
          boxShadow: '0px 16px 48px 0px rgba(0,0,0,0.12)',
          zIndex: 10,
        }}
      >
        {/* LOGO SECTION */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.avif"
                alt="VedaAI Logo"
                width={48}
                height={48}
                priority
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">VedaAI</h1>
          </div>
        </div>

        {/* CREATE ASSIGNMENT BUTTON */}
        <div className="py-4">
          <button
            onClick={() => {
              setShowCreateForm(true);
              setActiveNav('assignments');
            }}
            className="w-full bg-slate-800 text-white rounded-full font-semibold transition-all duration-300 hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 border-4 border-orange-500 py-3 px-4"
          >
            <Sparkles className="w-5 h-5" />
            <span>Create Assignment</span>
          </button>
        </div>

        {/* NAVIGATION MENU */}
        <nav className="flex-1 py-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveNav(item.id);
                      setShowCreateForm(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-100 text-black'
                        : 'text-gray-500 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-black' : 'text-gray-500'
                    }`} />
                    <span className="flex-1 text-left font-medium text-sm">
                      {item.label}
                    </span>
                    {item.id === 'assignments' && assignments.length > 0 && (
                      <span className="bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {assignments.length}
                      </span>
                    )}
                    {isActive && (
                      <span className="text-slate-400 text-lg">›</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* DIVIDER */}
        <div className="py-2">
          <div className="h-px bg-slate-100"></div>
        </div>

        {/* SETTINGS */}
        <div className="py-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-500 hover:bg-slate-50 transition-all duration-200">
            <Settings className="w-5 h-5 flex-shrink-0 text-gray-500" />
            <span className="flex-1 text-left font-medium text-sm">Settings</span>
          </button>
        </div>

        {/* USER PROFILE SECTION */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              AK
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {schoolInfo.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {schoolInfo.location}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden md:flex md:flex-col md:ml-[328px]">
        {/* MOBILE TOP HEADER */}
        <div className="md:hidden bg-white rounded-3xl border-0 shadow-lg mx-3 mt-3 px-4 py-3 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.avif"
                alt="VedaAI Logo"
                width={32}
                height={32}
                priority
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="text-base font-bold text-slate-900">VedaAI</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              AK
            </div>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>

          {/* DROPDOWN MENU */}
          {mobileMenuOpen && (
            <div className="absolute top-14 left-3 right-3 bg-white z-50 overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              {bottomNavItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileMenuOpen(false);
                    setShowCreateForm(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                    index !== bottomNavItems.length - 1 ? 'border-b border-slate-100' : ''
                  } ${
                    activeNav === item.id
                      ? 'bg-slate-50 text-black'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden md:flex bg-white rounded-3xl m-4 mt-6 px-8 py-4 items-center justify-between shadow-md border border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveNav('home');
                setShowCreateForm(false);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <LayoutGrid className="w-5 h-5 text-slate-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              {showCreateForm ? 'Create Assignment' : (activeNav === 'assignments' ? 'Assignments' : activeNav.charAt(0).toUpperCase() + activeNav.slice(1))}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-600 text-white flex items-center justify-center font-bold text-sm">
                AK
              </div>
              <span className="text-sm font-medium text-slate-900">Abhishek Karad</span>
              <span className="text-slate-400">▼</span>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {showCreateForm ? (
            <CreateAssignment
              onClose={handleCloseForm}
              onSubmit={handleSubmitAssignment}
            />
          ) : activeNav === 'assignments' && assignments.length > 0 ? (
            <AssignmentsList
              onBack={() => {
                setActiveNav('home');
              }}
              onCreateNew={() => {
                setShowCreateForm(true);
              }}
              assignments={assignments}
              onDeleteAssignment={handleDeleteAssignment}
            />
          ) : (
            <div className="flex items-center justify-center p-4 md:p-8 h-full">
              <div className="text-center max-w-sm">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 mx-auto mb-8 flex items-center justify-center relative">
                  <div className="absolute w-24 h-24 border-2 border-white rounded-2xl opacity-80"></div>
                  <AlertCircle className="w-16 h-16 text-slate-600 relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">No assignments yet</h3>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                  Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
                </p>
                <button
                  className="bg-slate-900 text-white py-3 px-8 rounded-full font-semibold hover:bg-slate-800 transition-all active:scale-95 text-sm inline-flex items-center gap-2"
                  onClick={() => {
                    setShowCreateForm(true);
                    setActiveNav('assignments');
                  }}
                >
                  <span>+</span>
                  Create Your First Assignment
                </button>
              </div>
            </div>
          )}

          {/* FLOATING ACTION BUTTON (Mobile) */}
          {!showCreateForm && activeNav !== 'assignments' && (
            <button
              onClick={() => {
                setShowCreateForm(true);
                setActiveNav('assignments');
              }}
              className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:shadow-xl transition-shadow active:scale-95"
            >
              +
            </button>
          )}
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 mx-3 mb-3 rounded-3xl">
          <div className="flex items-center justify-around">
            {bottomNavItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    setShowCreateForm(false);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
