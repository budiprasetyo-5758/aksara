import { useState, useRef, useLayoutEffect, type FormEvent } from 'react';
import { Paperclip, ArrowUp, X, FileText, ImageIcon, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, file?: File) => void;
  /** True while an answer is being generated: typing stays allowed, sending is blocked. */
  disabled?: boolean;
  placeholder?: string;
}

const MAX_TEXTAREA_HEIGHT = 200;

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'Tanyakan kepada AKSARA…',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to MAX_TEXTAREA_HEIGHT, then scroll inside
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Empty: stay one row (scrollHeight would count a wrapping placeholder)
    if (!value) {
      el.style.height = '';
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

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
    textareaRef.current?.focus();
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const canSend = Boolean(value.trim() || selectedFile) && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim(), selectedFile || undefined);
    setValue('');
    handleRemoveFile();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter adds a line; ignore Enter while an IME is composing
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf');
  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
      {/* Attachment Preview */}
      {selectedFile && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 min-w-0">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Pratinjau lampiran"
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            ) : isPdf ? (
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
                {isPdf && ' · PDF'}
                {isImage && ' · Gambar'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
              title="Hapus lampiran"
              aria-label="Hapus lampiran"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-2">
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
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            selectedFile
              ? 'text-primary-ink bg-primary/10'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
          title="Lampirkan gambar atau PDF"
          aria-label="Lampirkan gambar atau PDF"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedFile ? 'Tambahkan pertanyaan tentang file ini…' : placeholder}
          className="flex-1 resize-none bg-transparent border-0 px-1 py-1.5 text-[15px] leading-6 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          aria-label="Pesan"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="w-9 h-9 rounded-full bg-primary-dark hover:bg-primary-ink text-white flex items-center justify-center transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shrink-0"
          title={disabled ? 'Menunggu jawaban…' : 'Kirim (Enter)'}
          aria-label="Kirim pesan"
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
