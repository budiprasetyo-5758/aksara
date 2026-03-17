import { useState, useRef, useEffect } from 'react';
import { Search, FileText, X, Loader2 } from 'lucide-react';
import { searchDocuments } from '@/lib/api';
import type { DocumentSearchResult } from '@/types';

interface DocumentSearchProps {
  onSelectDocument: (doc: DocumentSearchResult) => void;
}

export function DocumentSearch({ onSelectDocument }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchDocuments(value.trim());
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        console.error('[DocumentSearch] Error:', err);
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return 'bg-red-50 border-red-100 text-red-500';
      case 'docx': return 'bg-blue-50 border-blue-100 text-blue-500';
      default: return 'bg-gray-50 border-gray-100 text-gray-500';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Search Input */}
      <div className="relative">
        <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
          <div className="pl-5 text-gray-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search documents... (e.g. Kesehatan, PERDIR)"
            className="flex-1 px-4 py-4 text-sm text-gray-700 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No documents found for "<span className="font-medium text-gray-600">{query}</span>"
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3 px-1">
                {results.length} document{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-md transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${getFileIcon(doc.file_type)} group-hover:scale-105 transition-transform`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary transition-colors">
                      {doc.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-medium text-gray-400 uppercase">
                        {doc.file_type}
                      </span>
                      {doc.total_pages > 0 && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[11px] text-gray-400">
                            {doc.total_pages} page{doc.total_pages !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-primary font-medium px-3 py-1.5 bg-primary/5 rounded-full">
                      Open
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
