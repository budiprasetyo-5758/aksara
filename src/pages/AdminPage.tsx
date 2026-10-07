import { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RefreshCw, FileText, Layers, CheckCircle2, HardDrive } from 'lucide-react';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { UploadZone } from '@/components/admin/UploadZone';
import { DocumentTable } from '@/components/admin/DocumentTable';
import { UserManagement } from '@/components/admin/UserManagement';
import { ClassificationManagement } from '@/components/admin/ClassificationManagement';
import { fetchStats } from '@/lib/api';

interface StatsData {
  totalDocuments: number;
  indexedPages: number;
  activePercentage: number;
  storageUsedBytes: number;
}

function formatStorage(bytes: number): string {
  const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  if (bytes >= 1073741824) return `${fmt(bytes / 1073741824)} GB`;
  if (bytes >= 1048576) return `${fmt(bytes / 1048576)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function StatsRow({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: 'Total dokumen',
      value: stats.totalDocuments.toLocaleString('id-ID'),
      icon: FileText,
      color: 'text-primary-ink',
      bg: 'bg-primary/10',
    },
    {
      label: 'Halaman terindeks',
      value: stats.indexedPages.toLocaleString('id-ID'),
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Dokumen aktif',
      value: `${stats.activePercentage.toLocaleString('id-ID')}%`,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Penyimpanan terpakai',
      value: formatStorage(stats.storageUsedBytes),
      icon: HardDrive,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium truncate">{card.label}</p>
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
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Manajemen Dokumen</h1>
          <p className="text-sm text-gray-500">Unggah, klasifikasikan, dan kelola dokumen referensi AKSARA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Muat ulang</span>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route index element={<DocumentsView />} />
          <Route path="documents" element={<DocumentsView />} />
          <Route path="classifications" element={<ClassificationManagement />} />
          <Route path="users" element={<UserManagement />} />
        </Routes>
      </main>
    </div>
  );
}
