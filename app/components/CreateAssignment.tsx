'use client';

import { useState, useRef } from 'react';
import { CloudUpload, ArrowLeft, ChevronRight, Loader } from 'lucide-react';
import { useNotifications } from '@/app/hooks/useNotifications';
import { createAssignment as submitAssignmentToBackend } from '@/app/api/assignmentService';

interface Question {
  type: string;
  count: number;
  marks: number;
}

interface Assignment {
  assignmentName: string;
  file?: File | null;
  dueDate: string;
  questions: Question[];
  additionalInfo: string;
}

interface CreateAssignmentProps {
  onClose: () => void;
  onSubmit?: (data: Assignment) => void;
}

export default function CreateAssignment({ onClose, onSubmit }: CreateAssignmentProps) {
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignmentData, setAssignmentData] = useState<Assignment>({
    assignmentName: '',
    dueDate: '',
    questions: [
      { type: 'Multiple Choice Questions', count: 1, marks: 1 },
      { type: 'Short Questions', count: 1, marks: 2 },
      { type: 'Diagram/Graph-Based Questions', count: 1, marks: 5 },
      { type: 'Numerical Problems', count: 1, marks: 5 },
    ],
    additionalInfo: '',
    file: null,
  });

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification('error', 'Invalid File Type', 'Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.');
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      addNotification('error', 'File Too Large', `File size must be less than 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFile(file)) {
      setAssignmentData({ ...assignmentData, file });
      addNotification('success', 'File Uploaded', `${file.name} has been selected.`);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setAssignmentData({ ...assignmentData, file });
        addNotification('success', 'File Uploaded', `${file.name} has been selected.`);
      }
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...assignmentData.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setAssignmentData({ ...assignmentData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = assignmentData.questions.filter((_, i) => i !== index);
    setAssignmentData({ ...assignmentData, questions: updatedQuestions });
  };

  const incrementQuestion = (index: number, field: 'count' | 'marks') => {
    const updatedQuestions = [...assignmentData.questions];
    updatedQuestions[index][field] = (updatedQuestions[index][field] || 0) + 1;
    setAssignmentData({ ...assignmentData, questions: updatedQuestions });
  };

  const decrementQuestion = (index: number, field: 'count' | 'marks') => {
    const updatedQuestions = [...assignmentData.questions];
    if (updatedQuestions[index][field] > 0) {
      updatedQuestions[index][field] = updatedQuestions[index][field] - 1;
    }
    setAssignmentData({ ...assignmentData, questions: updatedQuestions });
  };

  const addQuestionType = () => {
    setAssignmentData({
      ...assignmentData,
      questions: [...assignmentData.questions, { type: '', count: 0, marks: 0 }],
    });
  };

  const getTotalQuestions = () => assignmentData.questions.reduce((sum, q) => sum + q.count, 0);
  const getTotalMarks = () => assignmentData.questions.reduce((sum, q) => sum + q.count * q.marks, 0);

  const validateForm = (): boolean => {
    if (!assignmentData.assignmentName.trim()) {
      addNotification('error', 'Validation Error', 'Please enter an assignment name.');
      return false;
    }

    if (!assignmentData.dueDate) {
      addNotification('error', 'Validation Error', 'Please select a due date.');
      return false;
    }

    if (assignmentData.questions.length === 0) {
      addNotification('error', 'Validation Error', 'Please add at least one question type.');
      return false;
    }

    const allQuestionsHaveType = assignmentData.questions.every(q => q.type);
    if (!allQuestionsHaveType) {
      addNotification('error', 'Validation Error', 'All questions must have a type selected.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('assignmentName', assignmentData.assignmentName);
      formData.append('dueDate', assignmentData.dueDate);
      formData.append('questions', JSON.stringify(assignmentData.questions));
      formData.append('additionalInfo', assignmentData.additionalInfo);

      // Add file if selected
      if (assignmentData.file) {
        formData.append('file', assignmentData.file);
      }

      // Submit to backend
      const response = await submitAssignmentToBackend(formData);

      if (response.success) {
        addNotification('success', 'Assignment Created Successfully!', `Assignment "${assignmentData.assignmentName}" has been saved to the database.`);

        // Call onSubmit callback with backend response data
        if (onSubmit) {
          onSubmit({
            ...assignmentData,
            ...response.data,
          });
        }

        onClose();
      } else {
        addNotification('error', 'Failed to Create Assignment', response.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      addNotification('error', 'Network Error', 'Failed to connect to the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-8" style={{ backgroundColor: '#dbdbdb' }}>
      {/* MAIN HEADER SECTION */}
      <div className="hidden md:block px-8 py-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></span>
          <h2 className="text-2xl font-semibold text-slate-900">
            Create Assignment
          </h2>
        </div>
        <p className="text-sm text-slate-500">
         Set up a new assignment for your students
        </p>
      </div>
      

      {/* PROGRESS BAR */}
      <div className="max-w-[1100px] mx-auto px-4 md:px-2 py-4">
        <div className="h-1.5 rounded-full overflow-hidden shadow-sm" style={{ backgroundColor: '#e5e5e5' }}>
          <div className="h-full w-1/3 bg-gradient-to-r from-slate-800 to-slate-600 transition-all duration-300"></div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] overflow-hidden relative">
        {/* MOBILE HEADER */}
        <div className="md:hidden px-4 py-3 flex items-center gap-3 border-b border-slate-100">
     
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-500">Assignment</span>
        </div>

        {/* FORM CONTENT */}
        <div className="px-6 md:px-12 py-8 space-y-8" style={{ backgroundColor: '#f4f4f4' }}>
          {/* ASSIGNMENT DETAILS SECTION */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Assignment Details</h2>
            <p className="text-xs text-slate-500 mb-6">Basic information about your assignment</p>

            {/* FILE UPLOAD */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed rounded-xl p-10 text-center mb-6 hover:border-slate-300 transition-colors cursor-pointer"
              style={{ borderColor: '#D1D5DB', backgroundColor: '#ffffff' }}
              onClick={handleBrowseClick}
            >
              <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-900 font-medium mb-1">Choose a file or drag & drop it here</p>
              <p className="text-xs text-slate-500 mb-4">JPEG, PNG upto 20MB</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBrowseClick();
                }}
                className="px-6 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                className="hidden"
              />
            </div>

            {assignmentData.file && (
              <p className="text-sm text-slate-600 mb-6">
                <span className="font-medium">Selected:</span> {assignmentData.file.name}
              </p>
            )}

            {/* ASSIGNMENT TITLE */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-900 mb-2">Assignment Title</label>
              <input
                type="text"
                value={assignmentData.assignmentName}
                onChange={(e) => setAssignmentData({ ...assignmentData, assignmentName: e.target.value })}
                placeholder="e.g. Physics Chapter 5 Quiz"
                className="w-full px-4 py-2 border-none bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* DUE DATE */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Due Date</label>
              <input
                type="date"
                value={assignmentData.dueDate}
                onChange={(e) => setAssignmentData({ ...assignmentData, dueDate: e.target.value })}
                placeholder="Choose a date"
                className="w-full px-4 py-2 border-none bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>

          {/* QUESTION TYPES SECTION */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Question Types</h2>

            {/* MOBILE VIEW */}
            <div className="md:hidden space-y-4">
              {assignmentData.questions.map((question, index) => (
                <div key={index} className="relative bg-white rounded-[20px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.05)]">
                  {/* QUESTION TYPE DROPDOWN + DELETE */}
                  <div className="flex items-center gap-2 mb-5">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="w-fit h-12 px-2 rounded-[16px] text-sm border-none focus:outline-none focus:ring-0 bg-white font-medium"
                    >
                      <option value="">Select Type</option>
                      <option value="Multiple Choice Questions">Multiple Choice Questions</option>
                      <option value="Short Questions">Short Questions</option>
                      <option value="Diagram/Graph-Based Questions">Diagram/Graph-Based Questions</option>
                      <option value="Numerical Problems">Numerical Problems</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center text-[#9CA3AF] hover:text-red-600 transition-colors text-xl"
                    >
                      ×
                    </button>
                  </div>

                  {/* COUNTERS SECTION - HORIZONTAL LAYOUT */}
                  <div className="bg-[#F3F4F6] rounded-[16px] p-4">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <p className="text-sm font-medium text-[#6B7280]">No. of Questions</p>
                      <p className="text-sm font-medium text-[#6B7280]">Marks</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* No. of Questions Stepper */}
                      <div className="flex items-center justify-center gap-4 bg-white rounded-full px-3 py-2">
                        <button
                          type="button"
                          onClick={() => decrementQuestion(index, 'count')}
                          className="text-[#111827] hover:text-opacity-70 transition-colors text-lg font-semibold"
                        >
                          −
                        </button>
                        <span className="font-semibold text-[#111827] w-6 text-center">{question.count}</span>
                        <button
                          type="button"
                          onClick={() => incrementQuestion(index, 'count')}
                          className="text-[#111827] hover:text-opacity-70 transition-colors text-lg font-semibold"
                        >
                          +
                        </button>
                      </div>

                      {/* Marks Stepper */}
                      <div className="flex items-center justify-center gap-4 bg-white rounded-full px-3 py-2">
                        <button
                          type="button"
                          onClick={() => decrementQuestion(index, 'marks')}
                          className="text-[#111827] hover:text-opacity-70 transition-colors text-lg font-semibold"
                        >
                          −
                        </button>
                        <span className="font-semibold text-[#111827] w-6 text-center">{question.marks}</span>
                        <button
                          type="button"
                          onClick={() => incrementQuestion(index, 'marks')}
                          className="text-[#111827] hover:text-opacity-70 transition-colors text-lg font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* ADD QUESTION BUTTON */}
              <div className="flex items-center gap-3 mt-6">
                <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-white text-xl hover:bg-slate-800 transition-colors cursor-pointer" onClick={addQuestionType}>
                  +
                </div>
                <span className="text-sm font-medium text-[#111827]">Add Question Type</span>
              </div>

              {/* TOTAL SECTION */}
              <div className="bg-white rounded-[20px] p-5 shadow-[0px_2px_8px_rgba(0,0,0,0.05)] space-y-3 mt-6">
                <p className="text-sm text-[#6B7280]">
                  Total Questions : <span className="font-semibold text-[#111827] text-left block">{getTotalQuestions()}</span>
                </p>
                <p className="text-sm text-[#6B7280]">
                  Total Marks : <span className="font-semibold text-[#111827] text-left block">{getTotalMarks()}</span>
                </p>
              </div>
            </div>

            {/* DESKTOP VIEW (KEEP EXISTING) */}
            <div className="hidden md:block rounded-3xl p-5" style={{ backgroundColor: '#ececec' }}>
              {/* HEADINGS */}
              <div className="grid grid-cols-[1fr_40px_160px_140px] items-center mb-3 px-2">
                <p className="text-sm font-medium text-slate-700">Question Type</p>
                <div />
                <p className="text-sm font-medium text-slate-700 text-center">No. of Questions</p>
                <p className="text-sm font-medium text-slate-700 text-center">Marks</p>
              </div>

              {/* ROWS */}
              {assignmentData.questions.map((question, index) => (
                <div key={index} className="grid grid-cols-[1fr_40px_160px_140px] items-center gap-2 py-2.5">
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                    className="h-12 px-1 rounded-[16px] text-sm border-none focus:outline-none focus:ring-0 transition-all cursor-pointer font-medium"
                    style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  >
                    <option value="">Select Type</option>
                    <option value="Multiple Choice Questions">Multiple Choice Questions</option>
                    <option value="Short Questions">Short Questions</option>
                    <option value="Diagram/Graph-Based Questions">Diagram/Graph-Based Questions</option>
                    <option value="Numerical Problems">Numerical Problems</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-slate-400 text-sm flex justify-center hover:text-red-600 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    ×
                  </button>

                  <div className="flex justify-center">
                    <div className="flex items-center justify-between px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#F3F4F6' }}>
                      <button
                        type="button"
                        onClick={() => decrementQuestion(index, 'count')}
                        className="text-[#111827] hover:text-opacity-70 transition-colors bg-transparent border-none cursor-pointer text-lg font-semibold"
                      >
                        −
                      </button>
                      <span className="font-semibold text-[#111827] mx-4">{question.count}</span>
                      <button
                        type="button"
                        onClick={() => incrementQuestion(index, 'count')}
                        className="text-[#111827] hover:text-opacity-70 transition-colors bg-transparent border-none cursor-pointer text-lg font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="flex items-center justify-between px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#F3F4F6' }}>
                      <button
                        type="button"
                        onClick={() => decrementQuestion(index, 'marks')}
                        className="text-[#111827] hover:text-opacity-70 transition-colors bg-transparent border-none cursor-pointer text-lg font-semibold"
                      >
                        −
                      </button>
                      <span className="font-semibold text-[#111827] mx-4">{question.marks}</span>
                      <button
                        type="button"
                        onClick={() => incrementQuestion(index, 'marks')}
                        className="text-[#111827] hover:text-opacity-70 transition-colors bg-transparent border-none cursor-pointer text-lg font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* ADD BUTTON */}
              <div className="flex items-center gap-3 mt-5">
                <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-white text-lg cursor-pointer hover:bg-slate-800 transition-colors" onClick={addQuestionType}>
                  +
                </div>
                <p className="text-sm font-medium text-slate-800">Add Question Type</p>
              </div>

              {/* TOTAL SECTION */}
              <div className="mt-4 text-right space-y-0.5">
                <p className="text-sm text-slate-600">
                  Total Questions : <span className="font-semibold text-slate-900">{getTotalQuestions()}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Total Marks : <span className="font-semibold text-slate-900">{getTotalMarks()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ADDITIONAL INFORMATION */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#f4f4f4' }}>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Additional Information (For better output)</h2>
            <textarea
              value={assignmentData.additionalInfo}
              onChange={(e) => setAssignmentData({ ...assignmentData, additionalInfo: e.target.value })}
              placeholder="e.g. Generate a question paper for 2 hour exam duration."
              rows={4}
              className="w-full px-4 py-3 border border-dashed border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
        </div>

        {/* BLUR FADE AT BOTTOM */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f4f4f4] via-[#f4f4f4]/50 to-transparent pointer-events-none"></div>

        {/* BUTTON SECTION */}
        
      </div>

      {/* MOBILE BUTTON SECTION */}
      <div className="md:hidden px-4 py-6 flex gap-3 bg-transparent">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-6 py-3 rounded-full text-slate-900 font-semibold hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm"
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
        >
          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>

      {/* DESKTOP BUTTON SECTION */}
      <div className="hidden md:flex max-w-[1200px] mx-auto px-6 md:px-12 py-6 justify-between items-center" style={{ backgroundColor: '#dbdbdb' }}>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 rounded-full text-slate-900 font-medium hover:bg-slate-100 transition-colors"
          style={{ backgroundColor: '#ffffff' }}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
        >
          {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <>Next <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

