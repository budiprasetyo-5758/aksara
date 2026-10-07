import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  FileType,
  File,
  RefreshCw,
  Trash2,
  Search,
  Loader2,
  FolderKanban,
  Tag,
  ChevronDown,
  ArrowLeft,
  FileStack,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Document, DocumentStatus, Classification } from '@/types';
import {
  fetchDocuments,
  fetchDocumentSummary,
  deleteDocument,
  toggleDocumentStatus,
  syncDocument,
  classifyDocument,
  fetchClassifications,
} from '@/lib/api';
import type { DocumentSummaryApiResponse } from '@/lib/api';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const fileIcons: Record<string, { icon: typeof FileText; bg: string; color: string }> = {
  pdf: { icon: FileText, bg: 'bg-red-50', color: 'text-red-500' },
  docx: { icon: FileType, bg: 'bg-blue-50', color: 'text-blue-500' },
  txt: { icon: File, bg: 'bg-gray-100', color: 'text-gray-500' },
};

const statusConfig: Record<DocumentStatus, { label: string; dot: string; text: string; bg: string }> = {
  indexed: { label: 'Terindeks', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  syncing: { label: 'Diproses', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  failed: { label: 'Gagal', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  pending: { label: 'Menunggu', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// ── Card color palette ──────────────────────────────────
// Same hues as the original cards, one shade deeper so the white text stays readable
const cardColors = [
  { gradient: 'from-teal-600 to-teal-700', hoverShadow: 'hover:shadow-teal-200/50' },
  { gradient: 'from-amber-600 to-orange-600', hoverShadow: 'hover:shadow-amber-200/50' },
  { gradient: 'from-violet-600 to-purple-700', hoverShadow: 'hover:shadow-violet-200/50' },
  { gradient: 'from-rose-600 to-pink-700', hoverShadow: 'hover:shadow-rose-200/50' },
  { gradient: 'from-sky-600 to-blue-700', hoverShadow: 'hover:shadow-sky-200/50' },
  { gradient: 'from-emerald-600 to-green-700', hoverShadow: 'hover:shadow-emerald-200/50' },
];
const unclassifiedColors = { gradient: 'from-gray-500 to-gray-600', hoverShadow: 'hover:shadow-gray-200/50' };

// ── Classification Picker (fixed overflow) ──────────────
function ClassificationPicker({
  currentId,
  classifications,
  onSelect,
  disabled,
}: {
  currentId: string | null;
  classifications: Classification[];
  onSelect: (id: string | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 260);
    }
  }, [open]);

  return (
    <div className="relative" ref={buttonRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-primary-ink hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
        title="Ubah klasifikasi"
      >
        <Tag className="w-3 h-3" />
        <span className="max-w-[80px] truncate">
          {currentId
            ? classifications.find((c) => c.id === currentId)?.name || 'Tidak diketahui'
            : 'Belum diatur'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[200px] max-h-[240px] overflow-y-auto ${
              dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
            style={{ animation: 'scaleIn 0.15s ease-out' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                !currentId ? 'text-primary-ink font-medium' : 'text-gray-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
              Belum Diklasifikasi
            </button>
            {classifications.map((c) => (
              <button
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(c.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  currentId === c.id ? 'text-primary-ink font-medium' : 'text-gray-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────
/** Page buttons to render: first, last, and current ±1, with gaps collapsed to '…'. */
function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

function Pagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled: boolean;
}) {
  const navButton =
    'w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        className={navButton}
        title="Halaman sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {getPageNumbers(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="w-8 text-center text-sm text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={disabled || p === page}
            className={`min-w-8 h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100 disabled:opacity-40'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        className={navButton}
        title="Halaman berikutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Card Group Interface ────────────────────────────────
interface CardGroup {
  id: string | null;
  name: string;
  description?: string | null;
  docCount: number;
  indexedCount: number;
  totalPages: number;
  colorIndex: number;
}

/** Fill the fields the list endpoint doesn't return. */
function toDocument(d: Document): Document {
  return {
    id: d.id,
    file_name: d.file_name,
    file_path: '',
    file_size: d.file_size,
    file_type: d.file_type,
    upload_date: d.upload_date,
    status: d.status as DocumentStatus,
    is_active: d.is_active,
    total_pages: d.total_pages,
    storage_path: '',
    created_at: d.upload_date,
    updated_at: d.upload_date,
    classification_id: d.classification_id || null,
    classification_name: d.classification_name || null,
  };
}

// ── Main Component ──────────────────────────────────────
interface DocumentTableProps {
  refreshTrigger?: number;
}

export function DocumentTable({ refreshTrigger }: DocumentTableProps) {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [summary, setSummary] = useState<DocumentSummaryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Card view state: undefined = show cards, string/null id = show detail
  const [activeGroupId, setActiveGroupId] = useState<string | null | undefined>(undefined);

  // Detail view: one server-side page of the active classification
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // debounced, sent to the server
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const docsRequestRef = useRef(0);
  const detailTopRef = useRef<HTMLDivElement>(null);

  const loadSummary = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [summaryRes, classRes] = await Promise.all([
        fetchDocumentSummary(),
        fetchClassifications(),
      ]);
      setSummary(summaryRes);
      setClassifications(classRes);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    if (activeGroupId === undefined) return;

    const requestId = ++docsRequestRef.current;
    setDocsLoading(true);
    setDocsError(null);
    try {
      const res = await fetchDocuments({
        page,
        perPage: PAGE_SIZE,
        classificationId: activeGroupId,
        search: searchQuery,
      });
      // A newer page/search request was issued while this one was in flight
      if (requestId !== docsRequestRef.current) return;

      // Current page no longer exists (e.g. its last document was deleted)
      const lastPage = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setDocuments(res.documents.map(toDocument));
      setTotalDocs(res.total);
    } catch (err) {
      if (requestId !== docsRequestRef.current) return;
      setDocsError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === docsRequestRef.current) setDocsLoading(false);
    }
  }, [activeGroupId, page, searchQuery]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshTrigger]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, refreshTrigger]);

  // Debounce typing, then search from page 1
  useEffect(() => {
    const q = searchInput.trim();
    if (q === searchQuery) return;
    const timer = setTimeout(() => {
      setSearchQuery(q);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  // ── Build groups ──────────────────────────────────
  const summaryById = new Map(
    (summary?.groups ?? []).map((s) => [s.classification_id, s])
  );

  const buildGroup = (
    id: string | null,
    name: string,
    description: string | null,
    colorIndex: number,
  ): CardGroup => {
    const s = summaryById.get(id);
    return {
      id,
      name,
      description,
      docCount: s?.document_count ?? 0,
      indexedCount: s?.indexed_count ?? 0,
      totalPages: s?.total_pages ?? 0,
      colorIndex,
    };
  };

  const groups: CardGroup[] = [
    ...classifications.map((c, index) =>
      buildGroup(c.id, c.name, c.description, index % cardColors.length)
    ),
    buildGroup(null, 'Belum Diklasifikasi', 'Dokumen yang belum diberi klasifikasi', -1),
  ];

  const totalAllDocs = summary?.total_documents ?? 0;

  // ── Active group detail ───────────────────────────
  const activeGroup = activeGroupId !== undefined
    ? groups.find((g) => g.id === activeGroupId)
    : null;

  const pageCount = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = rangeStart + documents.length - 1;

  const openGroup = (id: string | null) => {
    setActiveGroupId(id);
    setPage(1);
    setSearchInput('');
    setSearchQuery('');
    setDocuments([]);
    setTotalDocs(0);
    setDocsError(null);
    setDocsLoading(true);
  };

  const closeGroup = () => {
    docsRequestRef.current++; // drop any in-flight page response
    setActiveGroupId(undefined);
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    // Counts may have changed from actions taken inside the group
    loadSummary(false);
  };

  const goToPage = (p: number) => {
    setPage(p);
    detailTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Actions ───────────────────────────────────────
  const handleToggle = async (id: string) => {
    setActionId(id);
    try {
      const result = await toggleDocumentStatus(id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: result.is_active } : d))
      );
    } catch (err: any) {
      alert(`Gagal mengubah status: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Hapus "${fileName}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setActionId(id);
    try {
      await deleteDocument(id);
      // Refetch so the next document slides into this page
      await loadDocuments();
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleSync = async (id: string) => {
    setActionId(id);
    try {
      await syncDocument(id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'syncing' as DocumentStatus } : d))
      );
    } catch (err: any) {
      alert(`Gagal memproses ulang: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleClassify = async (docId: string, classificationId: string | null) => {
    setActionId(docId);
    try {
      await classifyDocument(docId, classificationId);
      // A reclassified document leaves this group; refetch to backfill the page
      await loadDocuments();
    } catch (err: any) {
      alert(`Gagal mengubah klasifikasi: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  // ── Loading State ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // DETAIL VIEW — Show documents for selected card
  // ═══════════════════════════════════════════════════
  if (activeGroup) {
    const colors = activeGroup.colorIndex >= 0 ? cardColors[activeGroup.colorIndex] : unclassifiedColors;

    return (
      <div
        ref={detailTopRef}
        className="space-y-4 scroll-mt-4"
        style={{ animation: 'fadeSlideIn 0.25s ease-out' }}
      >
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={closeGroup}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
            title="Kembali ke daftar klasifikasi"
            aria-label="Kembali ke daftar klasifikasi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${colors.gradient}`}>
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{activeGroup.name}</h3>
              {activeGroup.description && (
                <p className="text-xs text-gray-500">{activeGroup.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama dokumen…"
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={() => {
                loadDocuments();
                loadSummary(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Muat ulang"
            >
              <RefreshCw className={`w-4 h-4 ${docsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
          {docsError ? (
            <div className="text-center py-16 text-sm text-red-500">
              Gagal memuat dokumen: {docsError}{' '}
              <button onClick={loadDocuments} className="underline hover:text-red-700">
                Coba lagi
              </button>
            </div>
          ) : documents.length === 0 ? (
            docsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="text-center py-16 text-sm text-gray-400">
                {searchQuery ? 'Tidak ada dokumen yang cocok dengan pencarian.' : 'Belum ada dokumen di klasifikasi ini.'}
              </div>
            )
          ) : (
            <>
              <table className={`w-full transition-opacity ${docsLoading ? 'opacity-50' : ''}`}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Nama file
                    </th>
                    <th className="text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Tanggal unggah
                    </th>
                    <th className="text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Ukuran
                    </th>
                    <th className="text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Halaman
                    </th>
                    <th className="text-left text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-right text-[11px] text-gray-500 font-semibold uppercase tracking-wider px-5 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const fIcon = fileIcons[doc.file_type] || fileIcons.txt;
                    const Icon = fIcon.icon;
                    const status = statusConfig[doc.status];
                    const isActioning = actionId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isActioning ? 'opacity-50' : ''}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${fIcon.bg} flex items-center justify-center shrink-0`}>
                              <Icon className={`w-4 h-4 ${fIcon.color}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                              {doc.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {new Date(doc.upload_date).toLocaleDateString('id-ID', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{doc.total_pages}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {doc.status === 'syncing' ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            )}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <ClassificationPicker
                              currentId={doc.classification_id}
                              classifications={classifications}
                              onSelect={(id) => handleClassify(doc.id, id)}
                              disabled={isActioning}
                            />
                            <button
                              onClick={() => handleToggle(doc.id)}
                              title={doc.is_active ? 'Aktif — klik untuk menonaktifkan' : 'Nonaktif — klik untuk mengaktifkan'}
                              aria-label={doc.is_active ? 'Nonaktifkan dokumen' : 'Aktifkan dokumen'}
                              disabled={isActioning}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                doc.is_active ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  doc.is_active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => handleSync(doc.id)}
                              disabled={isActioning}
                              className="p-1.5 text-gray-400 hover:text-primary-ink rounded-md hover:bg-primary/5 transition-colors"
                              title="Proses ulang"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.file_name)}
                              disabled={isActioning}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Menampilkan {rangeStart}–{rangeEnd} dari {totalDocs.toLocaleString('id-ID')} dokumen
                </p>
                {pageCount > 1 && (
                  <Pagination
                    page={page}
                    totalPages={pageCount}
                    onChange={goToPage}
                    disabled={docsLoading}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateX(-8px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95) translateY(-4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // CARD VIEW — Classification cards grid
  // ═══════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">Daftar Dokumen</h3>
        <button
          onClick={() => loadSummary()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Muat ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {totalAllDocs === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-400">Belum ada dokumen yang diunggah.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const colors = group.colorIndex >= 0 ? cardColors[group.colorIndex] : unclassifiedColors;
            const { docCount, totalPages, indexedCount } = group;

            return (
              <button
                key={group.id ?? '__unclassified'}
                onClick={() => openGroup(group.id)}
                className={`group relative rounded-2xl p-5 text-left overflow-hidden bg-gradient-to-br ${colors.gradient} ${colors.hoverShadow} transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5`}
                style={{ animation: `cardIn 0.3s ease-out` }}
              >
                {/* Background decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

                {/* Icon */}
                <div className="relative z-10 w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>

                {/* Title */}
                <h4 className="text-base font-bold text-white mb-1 relative z-10">
                  {group.name}
                </h4>
                {group.description && (
                  <p className="text-xs text-white/80 mb-4 line-clamp-1 relative z-10">
                    {group.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 relative z-10">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                    <FileStack className="w-3 h-3" />
                    {docCount.toLocaleString('id-ID')} dokumen
                  </span>
                  {totalPages > 0 && (
                    <span className="text-xs text-white/75">
                      {totalPages.toLocaleString('id-ID')} halaman
                    </span>
                  )}
                </div>

                {/* Index status bar */}
                {docCount > 0 && (
                  <div className="mt-4 relative z-10">
                    <div className="flex items-center justify-between text-[11px] text-white/75 mb-1">
                      <span>Terindeks</span>
                      <span>{indexedCount}/{docCount}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/20">
                      <div
                        className="h-1.5 rounded-full bg-white/80 transition-all duration-500"
                        style={{ width: `${(indexedCount / docCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Total footer */}
      {totalAllDocs > 0 && (
        <div className="px-1">
          <p className="text-sm text-gray-500">
            Total {totalAllDocs.toLocaleString('id-ID')} dokumen dalam {groups.length} klasifikasi
          </p>
        </div>
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
