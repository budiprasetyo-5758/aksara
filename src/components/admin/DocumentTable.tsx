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
} from 'lucide-react';
import type { Document, DocumentStatus, Classification } from '@/types';
import {
  fetchDocuments,
  deleteDocument,
  toggleDocumentStatus,
  syncDocument,
  classifyDocument,
  fetchClassifications,
} from '@/lib/api';

const fileIcons: Record<string, { icon: typeof FileText; bg: string; color: string }> = {
  pdf: { icon: FileText, bg: 'bg-red-50', color: 'text-red-500' },
  docx: { icon: FileType, bg: 'bg-blue-50', color: 'text-blue-500' },
  txt: { icon: File, bg: 'bg-gray-100', color: 'text-gray-500' },
};

const statusConfig: Record<DocumentStatus, { label: string; dot: string; text: string; bg: string }> = {
  indexed: { label: 'Indexed', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  syncing: { label: 'Syncing', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  failed: { label: 'Failed', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
  pending: { label: 'Pending', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
};

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// ── Card color palette ──────────────────────────────────
const cardColors = [
  {
    gradient: 'from-teal-500 to-teal-600',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-teal-200/50',
  },
  {
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-amber-200/50',
  },
  {
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-violet-200/50',
  },
  {
    gradient: 'from-rose-500 to-pink-600',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-rose-200/50',
  },
  {
    gradient: 'from-sky-500 to-blue-600',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-sky-200/50',
  },
  {
    gradient: 'from-emerald-500 to-green-600',
    iconBg: 'bg-white/20',
    badge: 'bg-white/20 text-white',
    hoverShadow: 'hover:shadow-emerald-200/50',
  },
];

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
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
        title="Ubah klasifikasi"
      >
        <Tag className="w-3 h-3" />
        <span className="max-w-[80px] truncate">
          {currentId
            ? classifications.find((c) => c.id === currentId)?.name || 'Unknown'
            : 'Unset'}
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
                !currentId ? 'text-primary font-medium' : 'text-gray-600'
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
                  currentId === c.id ? 'text-primary font-medium' : 'text-gray-600'
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

// ── Card Group Interface ────────────────────────────────
interface CardGroup {
  id: string | null;
  name: string;
  description?: string | null;
  documents: Document[];
  colorIndex: number;
}

// ── Main Component ──────────────────────────────────────
interface DocumentTableProps {
  refreshTrigger?: number;
}

export function DocumentTable({ refreshTrigger }: DocumentTableProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Card view state: null = show cards, string/null id = show detail
  const [activeGroupId, setActiveGroupId] = useState<string | null | undefined>(undefined);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docRes, classRes] = await Promise.all([
        fetchDocuments(),
        fetchClassifications(),
      ]);
      const docs: Document[] = docRes.documents.map((d: any) => ({
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
      }));
      setDocuments(docs);
      setClassifications(classRes);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // ── Build groups ──────────────────────────────────
  const buildGroups = (): CardGroup[] => {
    const groups: CardGroup[] = [];

    classifications.forEach((c, index) => {
      const docs = documents.filter((d) => d.classification_id === c.id);
      groups.push({
        id: c.id,
        name: c.name,
        description: c.description,
        documents: docs,
        colorIndex: index % cardColors.length,
      });
    });

    // Unclassified
    const unclassifiedDocs = documents.filter((d) => !d.classification_id);
    groups.push({
      id: null,
      name: 'Belum Diklasifikasi',
      description: 'Dokumen yang belum diberi klasifikasi',
      documents: unclassifiedDocs,
      colorIndex: -1,
    });

    return groups;
  };

  const groups = buildGroups();

  // ── Active group detail ───────────────────────────
  const activeGroup = activeGroupId !== undefined
    ? groups.find((g) => g.id === activeGroupId)
    : null;

  const activeDocuments = activeGroup
    ? activeGroup.documents.filter((doc) =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // ── Actions ───────────────────────────────────────
  const handleToggle = async (id: string) => {
    setActionId(id);
    try {
      const result = await toggleDocumentStatus(id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: result.is_active } : d))
      );
    } catch (err: any) {
      alert(`Failed to toggle: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    setActionId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
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
      alert(`Failed to sync: ${err.message}`);
    } finally {
      setActionId(null);
    }
  };

  const handleClassify = async (docId: string, classificationId: string | null) => {
    setActionId(docId);
    try {
      await classifyDocument(docId, classificationId);
      const newName = classificationId
        ? classifications.find((c) => c.id === classificationId)?.name || null
        : null;
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, classification_id: classificationId, classification_name: newName }
            : d
        )
      );
    } catch (err: any) {
      alert(`Failed to classify: ${err.message}`);
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
    const colors = activeGroup.colorIndex >= 0
      ? cardColors[activeGroup.colorIndex]
      : null;

    return (
      <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.25s ease-out' }}>
        {/* Back + Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveGroupId(undefined);
              setSearchQuery('');
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              colors ? `bg-gradient-to-br ${colors.gradient}` : 'bg-gray-200'
            }`}>
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{activeGroup.name}</h3>
              {activeGroup.description && (
                <p className="text-xs text-gray-400">{activeGroup.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-visible">
          {activeDocuments.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              {searchQuery ? 'No documents match your search.' : 'No documents in this classification yet.'}
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      File Name
                    </th>
                    <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      Upload Date
                    </th>
                    <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      Size
                    </th>
                    <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      Pages
                    </th>
                    <th className="text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-right text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeDocuments.map((doc) => {
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
                          {new Date(doc.upload_date).toLocaleDateString('en-US', {
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
                              className="p-1.5 text-gray-400 hover:text-primary rounded-md hover:bg-primary/5 transition-colors"
                              title="Re-sync"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id, doc.file_name)}
                              disabled={isActioning}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                              title="Delete"
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
                  {activeDocuments.length} document{activeDocuments.length !== 1 ? 's' : ''}
                </p>
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
        <h3 className="text-base font-bold text-gray-800">Document List</h3>
        <button
          onClick={loadData}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <p className="text-sm text-gray-400">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const colors = group.colorIndex >= 0
              ? cardColors[group.colorIndex]
              : null;
            const docCount = group.documents.length;
            const totalPages = group.documents.reduce((sum, d) => sum + d.total_pages, 0);
            const indexedCount = group.documents.filter((d) => d.status === 'indexed').length;

            return (
              <button
                key={group.id ?? '__unclassified'}
                onClick={() => setActiveGroupId(group.id)}
                className={`group relative rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                  colors
                    ? `bg-gradient-to-br ${colors.gradient} ${colors.hoverShadow}`
                    : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:shadow-gray-200/50'
                } overflow-hidden`}
                style={{ animation: `cardIn 0.3s ease-out` }}
              >
                {/* Background decoration */}
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                  colors ? colors.iconBg : 'bg-white/20'
                }`}>
                  <FolderKanban className="w-5 h-5 text-white" />
                </div>

                {/* Title */}
                <h4 className="text-base font-bold text-white mb-1 relative z-10">
                  {group.name}
                </h4>
                {group.description && (
                  <p className="text-xs text-white/70 mb-4 line-clamp-1 relative z-10">
                    {group.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 relative z-10">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    colors ? colors.badge : 'bg-white/20 text-white'
                  }`}>
                    <FileStack className="w-3 h-3" />
                    {docCount} dokumen
                  </span>
                  {totalPages > 0 && (
                    <span className="text-xs text-white/60">
                      {totalPages} halaman
                    </span>
                  )}
                </div>

                {/* Index status bar */}
                {docCount > 0 && (
                  <div className="mt-4 relative z-10">
                    <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
                      <span>Indexed</span>
                      <span>{indexedCount}/{docCount}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/20">
                      <div
                        className="h-1.5 rounded-full bg-white/70 transition-all duration-500"
                        style={{ width: `${docCount > 0 ? (indexedCount / docCount) * 100 : 0}%` }}
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
      {documents.length > 0 && (
        <div className="px-1">
          <p className="text-sm text-gray-500">
            {documents.length} document{documents.length !== 1 ? 's' : ''} total across {groups.length} classification{groups.length !== 1 ? 's' : ''}
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
