'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileText, Loader } from 'lucide-react';

interface AssignmentViewerProps {
  assignmentId: string;
  onClose: () => void;
}

export default function AssignmentViewer({ assignmentId, onClose }: AssignmentViewerProps) {
  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Fetch assignment details on mount
  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
        const response = await fetch(`${apiBaseUrl}/assignments/${assignmentId}`);
        const data = await response.json();
        
        if (data.success) {
          setAssignment(data.data);
          console.log('Assignment fetched:', data.data);
        }
      } catch (error) {
        console.error('Error fetching assignment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  // Build PDF URL when PDF path is available
  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (assignment?.pdfFilePath) {
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
          const response = await fetch(`${apiBaseUrl}/assignments/${assignmentId}/pdf-path`);
          const data = await response.json();
          
          if (data.success && data.data?.pdfPath) {
            setPdfUrl(data.data.pdfPath);
            console.log('PDF URL set:', data.data.pdfPath);
          }
        } catch (error) {
          console.error('Error fetching PDF URL:', error);
        }
      }
    };

    fetchPdfUrl();
  }, [assignment?.pdfFilePath, assignmentId]);

  const handleDownload = () => {
    if (assignment?.pdfFilePath) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
      const downloadUrl = `${apiBaseUrl}/assignments/${assignmentId}/download-pdf`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `questions_${assignment.assignmentName || 'assignment'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-slate-600 animate-spin" />
          <p className="text-slate-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Error</h3>
          <p className="text-slate-600 mb-6">Failed to load assignment details.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* TOP CLOSE BUTTON */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors bg-white shadow-lg"
          >
            <X className="w-6 h-6 text-slate-900" />
          </button>
        </div>

        {/* COMPACT HEADER/BANNER */}
        <div className="bg-slate-700 text-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between gap-6">
            <p className="text-sm flex-1">
              Certainly. Here are customized Question Paper for your {assignment.assignmentName}
            </p>
            {assignment.pdfFilePath && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-full transition-colors text-xs font-semibold flex-shrink-0 shadow-md hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download as PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* CONTENT AREA - PDF VIEWER */}
        <div className="flex-1 overflow-auto bg-white">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title="Generated Questions PDF"
            />
          ) : assignment.questionGenerationStatus === 'processing' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader className="w-16 h-16 text-blue-600 animate-spin mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Generating Your Question Paper</h3>
              <p className="text-slate-600">This may take a moment...</p>
            </div>
          ) : assignment.questionGenerationStatus === 'failed' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="w-16 h-16 text-red-300 mb-4" />
              <h3 className="text-xl font-semibold text-red-600 mb-2">Generation Failed</h3>
              <p className="text-slate-600 text-center">{assignment.questionGenerationError || 'Unknown error occurred'}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No Question Paper Generated</h3>
              <p className="text-slate-500">The question paper hasn't been generated yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}