'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNotifications } from '@/app/hooks/useNotifications';

interface Question {
  id?: string;
  text: string;
  type: string;
  difficulty?: string;
  marks: number;
  options?: string[];
  sampleAnswer?: string;
}

interface AssignmentData {
  _id: string;
  assignmentName: string;
  dueDate: string;
  generatedQuestions: Question[];
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

// Helper function to group questions by type
const groupQuestionsByType = (questions: Question[]) => {
  const grouped: { [key: string]: Question[] } = {};
  questions.forEach((q) => {
    if (!grouped[q.type]) {
      grouped[q.type] = [];
    }
    grouped[q.type].push(q);
  });
  return grouped;
};

// Convert type to section letter (A, B, C, D, etc.)
const typeToSection = (type: string, index: number): string => {
  return String.fromCharCode(65 + index);
};

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
      
      if (blob.type !== 'application/pdf') {
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 animate-spin text-slate-900" />
          <p className="text-slate-600 text-sm font-medium">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-slate-600 text-sm">Assignment not found</p>
        </div>
      </div>
    );
  }

  const groupedQuestions = groupQuestionsByType(assignment.generatedQuestions);
  const questionTypes = Object.keys(groupedQuestions);
  const totalMarks = assignment.generatedQuestions?.reduce((sum: number, q: Question) => sum + q.marks, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto flex items-start justify-center py-4 md:py-8">
      <div className="bg-white w-full mx-3 md:mx-auto md:w-11/12 max-w-5xl shadow-2xl rounded-lg md:rounded-xl">
        {/* HEADER WITH DOWNLOAD */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-slate-800 to-slate-900 px-6 md:px-12 py-4 md:py-5 flex items-center justify-between gap-4 rounded-t-lg md:rounded-t-xl">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 transition text-white rounded-lg flex-shrink-0"
            aria-label="Close"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base md:text-xl font-bold text-white flex-1 text-center truncate">
            {assignment.assignmentName}
          </h1>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition disabled:opacity-50 flex-shrink-0 text-xs md:text-sm whitespace-nowrap"
          >
            {isDownloading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>

        {/* MAIN CONTENT - EXAM PAPER STYLE */}
        <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="p-6 md:p-12 space-y-8 md:space-y-10">
            {/* TITLE & INSTITUTION */}
            <div className="text-center border-b-3 border-slate-800 pb-6 md:pb-8">
              <p className="text-xs md:text-sm font-semibold text-slate-600 uppercase tracking-widest mb-2 md:mb-3">
                {assignment.location || 'Institution'}
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 tracking-tight">
                {assignment.schoolName || 'School Name'}
              </h2>
              <h3 className="text-lg md:text-2xl font-semibold text-slate-700 mt-4 md:mt-6">
                {assignment.assignmentName}
              </h3>
            </div>

            {/* EXAM DETAILS */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 bg-slate-50 p-4 md:p-8 rounded-lg border border-slate-200">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">Time Allowed</p>
                <p className="text-base md:text-lg font-bold text-slate-900">As Required</p>
              </div>
              <div className="text-center border-l-2 border-r-2 border-slate-300">
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">Total Questions</p>
                <p className="text-base md:text-lg font-bold text-slate-900">
                  {assignment.generatedQuestions?.length || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-600 uppercase mb-2">Maximum Marks</p>
                <p className="text-base md:text-lg font-bold text-slate-900">{totalMarks}</p>
              </div>
            </div>

            {/* IMPORTANT INSTRUCTIONS */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 md:p-6 rounded">
              <h4 className="text-xs md:text-sm font-bold text-amber-900 uppercase tracking-wider mb-3 md:mb-4">
                Important Instructions
              </h4>
              <ul className="space-y-2 text-xs md:text-sm text-amber-900">
                <li className="flex gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  <span>All questions are compulsory.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  <span>Read the questions carefully before answering.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  <span>Write your name, roll number, and class in the space provided.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold flex-shrink-0">•</span>
                  <span>Show all working and calculations clearly.</span>
                </li>
                {assignment.additionalInfo && (
                  <li className="flex gap-2">
                    <span className="font-bold flex-shrink-0">•</span>
                    <span>{assignment.additionalInfo}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* SECTIONS WITH GROUPED QUESTIONS */}
            {questionTypes.map((qType, typeIndex) => {
              const sectionLetter = typeToSection(qType, typeIndex);
              const questionsInSection = groupedQuestions[qType];
              const sectionMarks = questionsInSection.reduce((sum: number, q: Question) => sum + q.marks, 0);

              return (
                <div key={qType} className="space-y-6 md:space-y-8">
                  {/* SECTION HEADER */}
                  <div className="border-b-2 border-slate-800 pb-3 md:pb-4">
                    <div className="flex items-baseline gap-3 md:gap-4">
                      <span className="text-2xl md:text-3xl font-bold text-slate-900 w-10 md:w-12 h-10 md:h-12 flex items-center justify-center bg-slate-900 text-white rounded-full">
                        {sectionLetter}
                      </span>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900">
                          {qType} Questions
                        </h3>
                        <p className="text-xs md:text-sm text-slate-600 font-semibold">
                          {questionsInSection.length} Question{questionsInSection.length !== 1 ? 's' : ''} &nbsp;|&nbsp; {sectionMarks} Marks
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QUESTIONS IN SECTION */}
                  <div className="space-y-4 md:space-y-6">
                    {questionsInSection.map((question: Question, qIndex: number) => {
                      const globalIndex = assignment.generatedQuestions.indexOf(question);
                      const questionNumber = globalIndex + 1;

                      return (
                        <div key={questionNumber} className="space-y-3 md:space-y-4">
                          {/* QUESTION TEXT */}
                          <div className="flex gap-3 md:gap-4">
                            <span className="text-sm md:text-base font-bold text-slate-900 flex-shrink-0 w-6">
                              {questionNumber}.
                            </span>
                            <div className="flex-1">
                              <div className="text-sm md:text-base text-slate-900 leading-relaxed prose prose-sm max-w-none">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({ children }) => <h1 className="text-base md:text-lg font-bold mb-2 mt-3 text-slate-900">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base md:text-lg font-bold mb-2 mt-3 text-slate-900">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm md:text-base font-bold mb-2 mt-2 text-slate-900">{children}</h3>,
                                    h4: ({ children }) => <h4 className="text-sm font-bold mb-2 mt-2 text-slate-900">{children}</h4>,
                                    p: ({ children }) => <p className="mb-2 text-slate-900">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 md:pl-6 mb-2 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 md:pl-6 mb-2 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="text-slate-900">{children}</li>,
                                    strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-slate-900">{children}</em>,
                                    code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs md:text-sm font-mono text-slate-800">{children}</code>,
                                    pre: ({ children }) => <pre className="bg-slate-100 p-3 md:p-4 rounded mb-2 overflow-x-auto text-xs md:text-sm">{children}</pre>,
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-400 pl-4 italic text-slate-700 mb-2">{children}</blockquote>,
                                    table: ({ children }) => <table className="w-full border-collapse border border-slate-300 mb-2 text-xs md:text-sm">{children}</table>,
                                    thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                                    tbody: ({ children }) => <tbody>{children}</tbody>,
                                    tr: ({ children }) => <tr className="border border-slate-300">{children}</tr>,
                                    th: ({ children }) => <th className="border border-slate-300 px-3 py-2 font-bold text-slate-900 text-left">{children}</th>,
                                    td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-slate-800">{children}</td>,
                                  }}
                                >
                                  {question.text}
                                </ReactMarkdown>
                              </div>
                              <p className="text-xs md:text-sm text-slate-600 font-semibold mt-3">
                                [{question.marks} Mark{question.marks !== 1 ? 's' : ''}]
                              </p>
                            </div>
                          </div>

                          {/* MCQ OPTIONS - ONLY FOR MCQ TYPE */}
                          {question.options && question.options.length > 0 && (
                            <div className="ml-6 md:ml-8 space-y-2 bg-slate-50 p-3 md:p-4 rounded border border-slate-200">
                              {question.options.map((option: string, optIndex: number) => (
                                <div key={optIndex} className="flex gap-2 md:gap-3">
                                  <span className="font-semibold text-slate-900 flex-shrink-0">
                                    ({String.fromCharCode(97 + optIndex)})
                                  </span>
                                  <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
                                    {option}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ANSWER SPACE - RESPONSIVE */}
                          {question.type !== 'MCQ' && (
                            <div className="ml-6 md:ml-8 min-h-12 md:min-h-16 border-b-2 border-slate-400 border-dashed"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* SECTION FOOTER DIVIDER */}
                  <div className="h-px bg-slate-300 my-6 md:my-8"></div>
                </div>
              );
            })}

            {/* ANSWER KEY SECTION - ONLY IF AVAILABLE */}
            {assignment.generatedQuestions?.some((q: Question) => q.sampleAnswer) && (
              <div className="mt-10 md:mt-12 pt-8 md:pt-10 border-t-4 border-slate-800">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Answer Key & Solutions
                </h3>
                <p className="text-xs text-slate-500 mb-8">For reference and marking</p>
                
                <div className="space-y-5 md:space-y-6">
                  {assignment.generatedQuestions
                    ?.filter((q: Question) => q.sampleAnswer)
                    .map((question: Question, index: number) => {
                      const qNum = assignment.generatedQuestions.indexOf(question) + 1;
                      return (
                        <div key={index} className="bg-emerald-50 border-l-4 border-emerald-500 p-5 md:p-6 rounded-r-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                              <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                {qNum}
                              </span>
                              Question {qNum}
                            </h4>
                            {question.marks && (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                                {question.marks} marks
                              </span>
                            )}
                          </div>
                          
                          <div className="text-slate-700 text-xs md:text-sm prose prose-sm max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => <h1 className="text-base md:text-lg font-bold mb-2 mt-3 text-slate-900">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base md:text-lg font-bold mb-2 mt-3 text-slate-900">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm md:text-base font-bold mb-2 mt-2 text-slate-900">{children}</h3>,
                                p: ({ children }) => <p className="mb-2 text-slate-700">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 md:pl-6 mb-2 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 md:pl-6 mb-2 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="text-slate-700">{children}</li>,
                                strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
                                em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
                                code: ({ children }) => <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-900">{children}</code>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-400 pl-4 italic text-slate-600 mb-2">{children}</blockquote>,
                              }}
                            >
                              {question.sampleAnswer}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* DUE DATE FOOTER */}
            <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-300 text-center">
              <p className="text-xs md:text-sm text-slate-600">
                <span className="font-semibold">Due Date:</span> {new Date(assignment.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}