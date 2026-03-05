import { RefreshCw, Plus } from 'lucide-react';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { StatsRow } from '@/components/admin/StatsRow';
import { UploadZone } from '@/components/admin/UploadZone';
import { DocumentTable } from '@/components/admin/DocumentTable';
import type { StatsData } from '@/types';

const mockStats: StatsData = {
  totalDocuments: 1248,
  indexedPages: '45.2k',
  activeStatus: '98%',
  storageUsed: '2.4 GB',
};

export function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Document Management</h1>
            <p className="text-sm text-gray-500 max-w-lg">
              Manage and query internal documents for your Helpdesk. Ensure your RAG system is
              up-to-date with the latest knowledge base.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              New Upload
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <StatsRow stats={mockStats} />

        {/* Upload Zone */}
        <UploadZone />

        {/* Document Table */}
        <DocumentTable />
      </main>
    </div>
  );
}
