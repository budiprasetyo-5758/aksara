import { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RefreshCw, FileText, Layers, CheckCircle2, HardDrive } from 'lucide-react';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { UploadZone } from '@/components/admin/UploadZone';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { UserManagement } from '@/components/admin/UserManagement';
import { fetchStats } from '@/lib/api';

interface StatsData {
  totalDocuments: number;
  indexedPages: number;
  activePercentage: number;
  storageUsedBytes: number;
}

function formatStorage(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function StatsRow({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments.toString(),
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Indexed Pages',
      value: stats.indexedPages.toLocaleString(),
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Active Status',
      value: `${stats.activePercentage}%`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Storage Used',
      value: formatStorage(stats.storageUsedBytes),
      icon: HardDrive,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentsView() {
  const [stats, setStats] = useState<StatsData>({
    totalDocuments: 0,
    indexedPages: 0,
    activePercentage: 0,
    storageUsedBytes: 0,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats({
        totalDocuments: data.total_documents,
        indexedPages: data.indexed_pages,
        activePercentage: data.active_percentage,
        storageUsedBytes: data.storage_used_bytes,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  const handleUploadComplete = () => {
    // Trigger refresh of both stats and document table
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Document Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <StatsRow stats={stats} />
      <UploadZone onUploadComplete={handleUploadComplete} />
      <DocumentTable refreshTrigger={refreshTrigger} />
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
