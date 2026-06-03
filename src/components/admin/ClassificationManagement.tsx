import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  FolderKanban,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchClassifications,
  createClassification,
  updateClassification,
  deleteClassification,
} from '@/lib/api';
import type { Classification } from '@/types';

// ── Toast Notification ──────────────────────────────────
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm animate-[slideUp_0.3s_ease-out] ${
            t.type === 'success'
              ? 'bg-emerald-600/95 text-white'
              : 'bg-red-600/95 text-white'
          }`}
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Modal Form ──────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  title: string;
  initialName?: string;
  initialDescription?: string;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}

function ClassificationModal({
  isOpen,
  title,
  initialName = '',
  initialDescription = '',
  isLoading = false,
  onClose,
  onSubmit,
}: ModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
  }, [initialName, initialDescription, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ animation: 'scaleIn 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="classification-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Jenis Referensi <span className="text-red-500">*</span>
            </label>
            <input
              id="classification-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dokumen kebijakan"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="classification-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
              Contoh / Deskripsi
            </label>
            <textarea
              id="classification-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Perdir, SPO, surat keputusan, pedoman internal"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
              disabled={isLoading || !name.trim()}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ───────────────────────────
interface DeleteModalProps {
  isOpen: boolean;
  classificationName: string;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ isOpen, classificationName, isLoading, onClose, onConfirm }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        style={{ animation: 'scaleIn 0.25s ease-out' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Hapus Klasifikasi</h3>
            <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Apakah Anda yakin ingin menghapus klasifikasi{' '}
          <span className="font-semibold text-gray-900">"{classificationName}"</span>?
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export function ClassificationManagement() {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Classification | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Load data ───────────────────────────────────────
  const loadClassifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchClassifications();
      setClassifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data klasifikasi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassifications();
  }, [loadClassifications]);

  // ── Create ──────────────────────────────────────────
  const handleCreate = async (name: string, description: string) => {
    try {
      setIsSubmitting(true);
      await createClassification({ name, description: description || undefined });
      setShowCreateModal(false);
      addToast(`Klasifikasi "${name}" berhasil ditambahkan`, 'success');
      await loadClassifications();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal menambahkan klasifikasi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Update ──────────────────────────────────────────
  const handleUpdate = async (name: string, description: string) => {
    if (!editTarget) return;
    try {
      setIsSubmitting(true);
      await updateClassification(editTarget.id, { name, description });
      setEditTarget(null);
      addToast(`Klasifikasi "${name}" berhasil diperbarui`, 'success');
      await loadClassifications();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal memperbarui klasifikasi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmitting(true);
      await deleteClassification(deleteTarget.id);
      addToast(`Klasifikasi "${deleteTarget.name}" berhasil dihapus`, 'success');
      setDeleteTarget(null);
      await loadClassifications();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Gagal menghapus klasifikasi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Klasifikasi Dokumen</h1>
          <p className="text-sm text-gray-500">
            Kelola jenis referensi dokumen untuk klasifikasi input
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Tambah Klasifikasi
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-gray-500">Memuat data klasifikasi...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={loadClassifications}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              Coba lagi
            </button>
          </div>
        </div>
      ) : classifications.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FolderKanban className="w-7 h-7 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Belum ada klasifikasi</p>
              <p className="text-xs text-gray-400 mt-0.5">Klik tombol "Tambah Klasifikasi" untuk memulai</p>
            </div>
          </div>
        </div>
      ) : (
        /* Table */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-left px-6 py-4 text-sm font-semibold tracking-wide w-[35%]">
                  Jenis Referensi
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold tracking-wide">
                  Contoh
                </th>
                <th className="text-right px-6 py-4 text-sm font-semibold tracking-wide w-[120px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {classifications.map((c, index) => (
                <tr
                  key={c.id}
                  className={`group transition-colors hover:bg-primary/[0.03] ${
                    index !== classifications.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 italic">
                      {c.description || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditTarget(c)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Total: {classifications.length} klasifikasi
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ClassificationModal
        isOpen={showCreateModal}
        title="Tambah Klasifikasi Baru"
        isLoading={isSubmitting}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Modal */}
      <ClassificationModal
        isOpen={!!editTarget}
        title="Edit Klasifikasi"
        initialName={editTarget?.name || ''}
        initialDescription={editTarget?.description || ''}
        isLoading={isSubmitting}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        classificationName={deleteTarget?.name || ''}
        isLoading={isSubmitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
