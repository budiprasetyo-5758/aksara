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
  const [highlighted, setHighlighted] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    itemRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const handleSearch = (value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      requestRef.current++; // drop any in-flight response
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestRef.current;
      setIsSearching(true);
      try {
        const data = await searchDocuments(value.trim());
        if (requestId !== requestRef.current) return; // a newer query is in flight
        setResults(data);
        setHighlighted(0);
        setHasSearched(true);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        console.error('[DocumentSearch] Error:', err);
        setResults([]);
        setHasSearched(true);
      } finally {
        if (requestId === requestRef.current) setIsSearching(false);
      }
    }, 400);
  };

  const clearSearch = () => {
    handleSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelectDocument(results[highlighted]);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return 'bg-red-50 border-red-100 text-red-500';
      case 'docx': return 'bg-blue-50 border-blue-100 text-blue-500';
      default: return 'bg-gray-50 border-gray-100 text-gray-500';
    }
  };

  return (
    <div className="flex flex-col">
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 border-b border-gray-100">
        {isSearching ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari judul atau isi dokumen (mis. PERDIR, Kesehatan)"
          className="flex-1 py-4 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent border-0 focus:outline-none focus:ring-0"
          aria-label="Cari dokumen"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
            aria-label="Hapus pencarian"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!hasSearched ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">
            Ketik minimal 2 karakter untuk mencari berdasarkan judul atau isi dokumen.
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-gray-400">
            Tidak ada dokumen yang cocok dengan "<span className="font-medium text-gray-600">{query}</span>"
          </p>
        ) : (
          <>
            <p className="px-3 pt-1 pb-2 text-xs text-gray-400">
              {results.length} dokumen ditemukan · gunakan ↑ ↓ lalu Enter
            </p>
            {results.map((doc, index) => {
              const isHighlighted = index === highlighted;
              return (
                <button
                  key={doc.id}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => onSelectDocument(doc)}
                  onMouseEnter={() => setHighlighted(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isHighlighted ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${getFileIcon(doc.file_type)}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${isHighlighted ? 'text-primary-ink' : 'text-gray-800'}`}>
                      {doc.file_name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      <span className="uppercase">{doc.file_type}</span>
                      {doc.total_pages > 0 && ` · ${doc.total_pages} halaman`}
                    </p>
                  </div>
                  {isHighlighted && (
                    <span className="text-xs font-medium text-primary-ink shrink-0">Buka ↵</span>
                  )}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
