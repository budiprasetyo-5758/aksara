import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText } from 'lucide-react';
import type { UploadProgress } from '@/types';

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([
    { fileName: 'knowledge_base_v2.pdf', progress: 45, status: 'Processing vectors...' },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    simulateUpload(files);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    simulateUpload(files);
  };

  const simulateUpload = (files: File[]) => {
    const newUploads: UploadProgress[] = files.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: 'Uploading...',
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  };

  return (
    <div className="mb-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-400 text-center">
          Supported formats: PDF, DOCX, TXT. Maximum file size 25MB.
          <br />
          Files will be automatically processed for RAG indexing.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploads.map((upload, i) => (
        <div
          key={i}
          className="mt-4 bg-white border border-gray-200 rounded-xl px-5 py-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{upload.fileName}</p>
                <p className="text-xs text-gray-400">{upload.status}</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary">{upload.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
