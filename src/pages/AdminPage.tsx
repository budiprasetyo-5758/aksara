import { Routes, Route } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { StatsRow } from '@/components/admin/StatsRow';
import { UploadZone } from '@/components/admin/UploadZone';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { UserManagement } from '@/components/admin/UserManagement';
import type { StatsData } from '@/types';

const mockStats: StatsData = {
  totalDocuments: 1248,
  indexedPages: '45.2k',
  activeStatus: '98%',
  storageUsed: '2.4 GB',
};

function DocumentsView() {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Document Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Sync All
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <StatsRow stats={mockStats} />

      {/* Upload Zone */}
      <UploadZone />

      {/* Document Table */}
      <DocumentTable />
    </>
  );
}

export function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route index element={<DocumentsView />} />
          <Route path="documents" element={<DocumentsView />} />
          <Route path="users" element={<UserManagement />} />
        </Routes>
      </main>
    </div>
  );
}
