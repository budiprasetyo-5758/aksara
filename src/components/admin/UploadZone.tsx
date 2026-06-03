import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  FolderKanban,
  X,
  FileUp,
} from 'lucide-react';
import { uploadDocument, fetchClassifications } from '@/lib/api';
import type { Classification } from '@/types';

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
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Confirmation modal state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedClassificationId, setSelectedClassificationId] = useState<string>('');

  // Load classifications on mount
  useEffect(() => {
    fetchClassifications()
      .then(setClassifications)
      .catch((err) => console.error('Failed to load classifications:', err));
  }, []);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // When files are dropped or selected, show confirmation modal instead of uploading immediately
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setPendingFiles(files);
      setSelectedClassificationId('');
      setShowConfirm(true);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (files.length > 0) {
      setPendingFiles(files);
      setSelectedClassificationId('');
      setShowConfirm(true);
    }
  };

  // Cancel upload
  const handleCancel = () => {
    setShowConfirm(false);
    setPendingFiles([]);
    setSelectedClassificationId('');
  };

  // Confirm and start upload
  const handleConfirmUpload = () => {
    setShowConfirm(false);
    const classId = selectedClassificationId || undefined;
    const files = [...pendingFiles];
    setPendingFiles([]);
    doUpload(files, classId);
  };

  const doUpload = async (files: File[], classificationId?: string) => {
    for (const file of files) {
      setUploads((prev) => [
        ...prev,
        { fileName: file.name, progress: 0, status: 'uploading', message: 'Uploading...' },
      ]);

      try {
        const result = await uploadDocument(
          file,
          (progress) => {
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
          },
          classificationId,
        );

        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name
              ? { ...u, progress: 100, status: 'done', message: result.message }
              : u
          )
        );

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

      {/* ── Classification Confirmation Modal ────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            style={{ animation: 'scaleIn 0.25s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Upload Dokumen</h3>
                  <p className="text-xs text-gray-400">Pilih klasifikasi sebelum upload</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* File list preview */}
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {pendingFiles.length} file akan diupload:
                </p>
                <div className="max-h-[120px] overflow-y-auto space-y-1.5">
                  {pendingFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {f.size >= 1048576
                            ? `${(f.size / 1048576).toFixed(1)} MB`
                            : `${(f.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classification selection */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2.5">
                  Pilih klasifikasi dokumen:
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {/* Belum Diklasifikasi option */}
                  <button
                    onClick={() => setSelectedClassificationId('')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      selectedClassificationId === ''
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedClassificationId === '' ? 'bg-primary/10' : 'bg-gray-100'
                    }`}>
                      <FolderKanban className={`w-4 h-4 ${
                        selectedClassificationId === '' ? 'text-primary' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        selectedClassificationId === '' ? 'text-primary' : 'text-gray-600'
                      }`}>
                        Belum Diklasifikasi
                      </p>
                      <p className="text-[11px] text-gray-400">Upload tanpa klasifikasi</p>
                    </div>
                    {selectedClassificationId === '' && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Classification options */}
                  {classifications.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClassificationId(c.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selectedClassificationId === c.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedClassificationId === c.id ? 'bg-primary/10' : 'bg-gray-100'
                      }`}>
                        <FolderKanban className={`w-4 h-4 ${
                          selectedClassificationId === c.id ? 'text-primary' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          selectedClassificationId === c.id ? 'text-primary' : 'text-gray-700'
                        }`}>
                          {c.name}
                        </p>
                        {c.description && (
                          <p className="text-[11px] text-gray-400 truncate">{c.description}</p>
                        )}
                      </div>
                      {selectedClassificationId === c.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload {pendingFiles.length} File
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
