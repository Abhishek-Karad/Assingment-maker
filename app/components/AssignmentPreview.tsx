'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Loader } from 'lucide-react';
import { useNotifications } from '@/app/hooks/useNotifications';

interface AssignmentData {
  _id: string;
  assignmentName: string;
  dueDate: string;
  generatedQuestions: any[];
  schoolName?: string;
  location?: string;
  pdfFilePath?: string;
  questions?: Array<{
    type: string;
    count: number;
    marks: number;
  }>;
  additionalInfo?: string;
}

interface AssignmentPreviewProps {
  assignmentId: string;
  onClose: () => void;
}

export default function AssignmentPreview({ assignmentId, onClose }: AssignmentPreviewProps) {
  const { addNotification } = useNotifications();
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
      const response = await fetch(`${apiBaseUrl}/assignments/${assignmentId}`);
      const data = await response.json();
      
      if (data.success) {
        setAssignment(data.data);
      } else {
        addNotification('error', 'Failed to load assignment');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      addNotification('error', 'Error loading assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
      const response = await fetch(`${apiBaseUrl}/assignments/${assignmentId}/download-pdf`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Check if response is actually PDF
      if (blob.type !== 'application/pdf') {
        // Try parsing as JSON to get error message
        try {
          const errorData = await blob.text();
          const parsed = JSON.parse(errorData);
          throw new Error(parsed.message || 'Failed to download assignment');
        } catch {
          throw new Error('Failed to download assignment');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assignment?.assignmentName || 'assignment'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification('success', 'Assignment downloaded successfully!');
    } catch (error) {
      console.error('Error downloading:', error);
      const message = error instanceof Error ? error.message : 'Error downloading assignment';
      addNotification('error', message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 flex flex-col items-center gap-4 mx-4 w-full md:w-auto">
          <Loader className="w-8 h-8 animate-spin text-slate-900" />
          <p className="text-slate-600 text-sm md:text-base">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 flex flex-col items-center gap-4 mx-4 w-full md:w-auto">
          <p className="text-slate-600 text-sm md:text-base">Assignment not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto flex items-start justify-center pt-2 pb-4 md:pt-4">
      <div className="bg-white rounded-2xl md:rounded-3xl w-full mx-2 md:w-11/12 max-w-3xl shadow-2xl mt-2 mb-8">
        {/* HEADER */}
        <div className="bg-slate-900 rounded-t-2xl md:rounded-t-3xl px-4 md:px-12 py-4 md:py-6 flex items-center justify-between sticky top-0 z-40 gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition text-white flex-shrink-0"
            >
              <ArrowLeft className="w-4 md:w-5 h-4 md:h-5" />
            </button>
            <h2 className="text-lg md:text-2xl font-bold text-white truncate">
              {assignment.assignmentName || 'Question Paper'}
            </h2>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 bg-white text-slate-900 rounded-full font-semibold hover:bg-slate-100 transition disabled:opacity-50 flex-shrink-0 text-xs md:text-sm whitespace-nowrap"
          >
            {isDownloading ? (
              <Loader className="w-3 md:w-4 h-3 md:h-4 animate-spin" />
            ) : (
              <Download className="w-3 md:w-4 h-3 md:h-4" />
            )}
            <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            <span className="sm:hidden">{isDownloading ? '...' : 'PDF'}</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 md:p-12 max-h-[calc(100vh-150px)] overflow-y-auto">
          {/* SCHOOL HEADER */}
          <div className="text-center mb-6 md:mb-10 pb-4 md:pb-8 border-b-2 border-slate-300">
            <h3 className="text-xl md:text-3xl font-bold text-slate-900 mb-1">
              {assignment.schoolName || 'School Name'}
            </h3>
            {assignment.location && (
              <p className="text-slate-600 text-xs md:text-base mb-4">{assignment.location}</p>
            )}
            <h4 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
              {assignment.assignmentName}
            </h4>
          </div>

          {/* ASSIGNMENT DETAILS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
            <div className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 font-bold uppercase mb-2">Due Date</p>
              <p className="text-base md:text-lg font-bold text-slate-900">
                {new Date(assignment.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 font-bold uppercase mb-2">Total Questions</p>
              <p className="text-base md:text-lg font-bold text-slate-900">
                {assignment.generatedQuestions?.length || 0}
              </p>
            </div>
            <div className="bg-slate-50 p-4 md:p-6 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 font-bold uppercase mb-2">Total Marks</p>
              <p className="text-base md:text-lg font-bold text-slate-900">
                {assignment.generatedQuestions?.reduce((sum: number, q: any) => sum + (q.marks || 0), 0) || 0}
              </p>
            </div>
          </div>

          {/* QUESTION TYPE BREAKDOWN */}
          {assignment.questions && assignment.questions.length > 0 && (
            <div className="mb-6 md:mb-10 bg-blue-50 p-4 md:p-6 rounded-xl border border-blue-200">
              <h4 className="text-sm md:text-base font-bold text-slate-900 mb-4">Question Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {assignment.questions.map((q: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 md:p-4 rounded-lg border border-blue-100">
                    <p className="text-xs text-slate-600 font-semibold mb-1">{q.type}</p>
                    <p className="text-base md:text-lg font-bold text-blue-900">
                      {q.count} × {q.marks}M
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSTRUCTIONS */}
          <div className="mb-6 md:mb-10 bg-amber-50 p-4 md:p-8 rounded-xl border border-amber-200">
            <h4 className="text-xs md:text-base font-bold text-amber-900 uppercase mb-4">Important Instructions</h4>
            <ul className="space-y-2 text-xs md:text-sm text-amber-900">
              <li>• All questions are compulsory unless stated otherwise.</li>
              <li>• Read the questions carefully before answering.</li>
              <li>• Write your name, roll number, and class in the space provided.</li>
              <li>• Show all working and calculations clearly.</li>
              {assignment.additionalInfo && <li>• {assignment.additionalInfo}</li>}
            </ul>
          </div>

          {/* QUESTIONS SECTION */}
          <div className="mb-6 md:mb-10">
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 md:mb-8 pb-2 md:pb-4 border-b-3 border-slate-900">
              Questions
            </h3>

            <div className="space-y-4 md:space-y-8">
              {assignment.generatedQuestions &&
                assignment.generatedQuestions.map((question: any, index: number) => (
                  <div key={index} className="bg-white border-l-4 border-slate-400 p-4 md:p-6 rounded-lg hover:shadow-md transition">
                    <div className="flex gap-3 md:gap-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-7 md:h-8 w-7 md:w-8 rounded-full bg-slate-900 text-white font-bold text-sm md:text-base">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-medium leading-relaxed mb-3 text-sm md:text-base">
                          {question.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="inline-block bg-blue-100 text-blue-900 px-2 md:px-3 py-1 rounded-full text-xs font-semibold">
                            {question.type}
                          </span>
                          <span className="inline-block bg-green-100 text-green-900 px-2 md:px-3 py-1 rounded-full text-xs font-semibold">
                            {question.marks} Marks
                          </span>
                          <span className="inline-block bg-purple-100 text-purple-900 px-2 md:px-3 py-1 rounded-full text-xs font-semibold capitalize">
                            {question.difficulty}
                          </span>
                        </div>

                        {/* OPTIONS FOR MCQ */}
                        {question.options && question.options.length > 0 && (
                          <div className="mt-3 md:mt-4 ml-2 md:ml-4 space-y-2 bg-slate-50 p-3 md:p-4 rounded-lg">
                            {question.options.map((option: string, optIndex: number) => (
                              <p key={optIndex} className="text-xs md:text-sm text-slate-700">
                                <span className="font-semibold">({String.fromCharCode(97 + optIndex)})</span> {option}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* SAMPLE ANSWERS (if available) */}
          {assignment.generatedQuestions?.some((q: any) => q.sampleAnswer) && (
            <div className="bg-green-50 border-l-4 border-green-600 p-4 md:p-8 rounded-lg">
              <h4 className="text-base md:text-lg font-bold text-green-900 mb-4 md:mb-6">
                Answer Key / Sample Solutions
              </h4>
              <div className="space-y-4 md:space-y-6">
                {assignment.generatedQuestions
                  ?.filter((q: any) => q.sampleAnswer)
                  .map((question: any, index: number) => {
                    const qNum = (assignment.generatedQuestions?.indexOf(question) || 0) + 1;
                    return (
                      <div key={index} className="bg-white p-3 md:p-4 rounded border-l-4 border-green-300">
                        <p className="font-bold text-green-900 mb-2 text-sm md:text-base">Q{qNum}:</p>
                        <p className="text-slate-700 leading-relaxed text-xs md:text-sm">{question.sampleAnswer}</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
