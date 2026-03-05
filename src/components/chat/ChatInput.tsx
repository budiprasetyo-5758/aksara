import { useState, type FormEvent } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <button
          type="button"
          className="text-gray-400 hover:text-primary transition-colors shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your question here..."
          disabled={disabled}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <p className="text-center text-[11px] text-gray-400 mt-2">
        AKSARA may produce inaccurate information about people, places, or facts. Always verify with RSCM protocols.
      </p>
    </div>
  );
}
