import { useState, useRef, type FormEvent } from 'react';
import { Paperclip, Send, X, FileText, ImageIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    // Reset the input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && !selectedFile) || disabled) return;

    onSend(value.trim(), selectedFile || undefined);
    setValue('');
    handleRemoveFile();
  };

  const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf');
  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div className="bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg rounded-2xl p-3">
      {/* Attachment Preview */}
      {selectedFile && (
        <div className="mb-2 mx-2 flex items-start gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-w-0 flex-1">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            ) : isPdf ? (
              <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6 text-blue-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
                {isPdf && ' · PDF'}
                {isImage && ' · Image'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`transition-colors shrink-0 ml-2 ${
            selectedFile
              ? 'text-primary'
              : 'text-gray-400 hover:text-primary'
          }`}
          title="Attach image or PDF"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={selectedFile ? "Add a message about this file..." : "Type your question here..."}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 px-2 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={(!value.trim() && !selectedFile) || disabled}
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <p className="text-center text-[10px] text-gray-400 mt-2 px-4">
        AKSARA may produce inaccurate information about people, places, or facts. Always verify with internal protocols.
      </p>
    </div>
  );
}
