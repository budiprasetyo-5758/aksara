import { FileText, Eye } from 'lucide-react';
import type { SourceReference } from '@/types';

interface SourceCardProps {
  source: SourceReference;
  onClick: () => void;
}

export function SourceCard({ source, onClick }: SourceCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-start gap-3 p-3 bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-xl text-left transition-all duration-200 min-w-[220px] max-w-[280px] shrink-0"
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
        <FileText className="w-4 h-4 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {source.file_name}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Halaman {source.page_number}
        </p>
        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
          {source.snippet}
        </p>
      </div>

      {/* Preview icon */}
      <Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
    </button>
  );
}
