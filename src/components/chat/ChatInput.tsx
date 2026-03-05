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
    <div className="bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg rounded-2xl p-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
        <button
          type="button"
          className="text-gray-400 hover:text-primary transition-colors shrink-0 ml-2"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type your question here..."
          disabled={disabled}
          className="flex-1 bg-transparent border-0 px-2 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
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
