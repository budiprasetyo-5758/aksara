import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { uploadDocument } from '@/lib/api';

interface UploadStatus {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  message: string;
}

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
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
    handleUpload(files);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleUpload(files);
    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async (files: File[]) => {
    for (const file of files) {
      // Add to upload list
      setUploads((prev) => [
        ...prev,
        { fileName: file.name, progress: 0, status: 'uploading', message: 'Uploading...' },
      ]);

      try {
        const result = await uploadDocument(file, (progress) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.fileName === file.name && u.status === 'uploading'
                ? {
                    ...u,
                    progress,
                    message: progress >= 90 ? 'Processing & indexing...' : `Uploading (${progress}%)...`,
                  }
                : u
            )
          );
        });

        // Mark as done
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name
              ? { ...u, progress: 100, status: 'done', message: result.message }
              : u
          )
        );

        // Notify parent to refresh document list
        onUploadComplete?.();
      } catch (err: any) {
        const errorMsg = err.message?.includes('Failed to fetch')
          ? 'Cannot connect to backend server. Make sure the backend is running on port 8000.'
          : err.message || 'Upload failed.';
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && (u.status === 'uploading' || u.status === 'processing')
              ? { ...u, progress: 0, status: 'error', message: errorMsg }
              : u
          )
        );
      }
    }
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
          key={`${upload.fileName}-${i}`}
          className="mt-4 bg-white border border-gray-200 rounded-xl px-5 py-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                upload.status === 'error' ? 'bg-red-50' : upload.status === 'done' ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                {upload.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : upload.status === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <FileText className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{upload.fileName}</p>
                <p className={`text-xs ${upload.status === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                  {upload.message}
                </p>
              </div>
            </div>
            {upload.status !== 'error' && upload.status !== 'done' && (
              <span className="text-sm font-semibold text-primary">{upload.progress}%</span>
            )}
          </div>
          {upload.status !== 'error' && (
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  upload.status === 'done' ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
