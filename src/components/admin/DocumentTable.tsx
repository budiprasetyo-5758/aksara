import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  FileType,
  File,
  RefreshCw,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';
import type { Document, DocumentStatus } from '@/types';
import { fetchDocuments, deleteDocument, toggleDocumentStatus, syncDocument } from '@/lib/api';

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

interface DocumentTableProps {
  refreshTrigger?: number;
}

export function DocumentTable({ refreshTrigger }: DocumentTableProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDocuments();
      // Map API response to frontend Document type
      const docs: Document[] = res.documents.map((d: any) => ({
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
      }));
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, refreshTrigger]);

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

  const filteredDocuments = documents.filter((doc) =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">Document List</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={loadDocuments}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Table */}
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
              {filteredDocuments.map((doc) => {
                const fIcon = fileIcons[doc.file_type] || fileIcons.txt;
                const Icon = fIcon.icon;
                const status = statusConfig[doc.status];
                const isActioning = actionId === doc.id;

                return (
                  <tr
                    key={doc.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isActioning ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${fIcon.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${fIcon.color}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[250px]">
                          {doc.file_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(doc.upload_date).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{doc.total_pages}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                        {doc.status === 'syncing' ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        )}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
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
              {filteredDocuments.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
