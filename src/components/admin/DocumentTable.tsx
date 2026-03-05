import { useState } from 'react';
import {
  FileText,
  FileType,
  File,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import type { Document, DocumentStatus } from '@/types';

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

const mockDocuments: Document[] = [
  { id: '1', file_name: 'SOP_Emergency_2023.pdf', file_path: '', file_size: 2516582, file_type: 'pdf', upload_date: 'Oct 24, 2023', status: 'indexed', is_active: true, total_pages: 48, storage_path: '', created_at: '', updated_at: '' },
  { id: '2', file_name: 'Helpdesk_Guidelines_v1.docx', file_path: '', file_size: 865280, file_type: 'docx', upload_date: 'Oct 22, 2023', status: 'syncing', is_active: true, total_pages: 15, storage_path: '', created_at: '', updated_at: '' },
  { id: '3', file_name: 'raw_data_dump_patient_info.txt', file_path: '', file_size: 12288, file_type: 'txt', upload_date: 'Oct 20, 2023', status: 'failed', is_active: false, total_pages: 1, storage_path: '', created_at: '', updated_at: '' },
  { id: '4', file_name: 'Insurance_Claim_Process_2024.pdf', file_path: '', file_size: 5347737, file_type: 'pdf', upload_date: 'Oct 18, 2023', status: 'indexed', is_active: true, total_pages: 82, storage_path: '', created_at: '', updated_at: '' },
  { id: '5', file_name: 'Visiting_Hours_Policy.pdf', file_path: '', file_size: 1258291, file_type: 'pdf', upload_date: 'Oct 15, 2023', status: 'indexed', is_active: true, total_pages: 6, storage_path: '', created_at: '', updated_at: '' },
];

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function DocumentTable() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [currentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleActive = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_active: !d.is_active } : d))
    );
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
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowDownUp className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            All Statuses
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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

            return (
              <tr
                key={doc.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                {/* File Name */}
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

                {/* Upload Date */}
                <td className="px-5 py-4 text-sm text-gray-500">{doc.upload_date}</td>

                {/* Size */}
                <td className="px-5 py-4 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>

                {/* Status */}
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

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleActive(doc.id)}
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
                    <button className="p-1.5 text-gray-400 hover:text-primary rounded-md hover:bg-primary/5 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
        <p className="text-sm text-primary">
          Showing 1 to 5 of 24 entries
        </p>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}
          <button className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1">
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
