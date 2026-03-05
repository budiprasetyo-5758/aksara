import { FileText, FileCheck, CheckCircle, HardDrive } from 'lucide-react';
import type { StatsData } from '@/types';

interface StatsRowProps {
  stats: StatsData;
}

const statCards = [
  {
    key: 'totalDocuments' as const,
    label: 'Total Documents',
    icon: FileText,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    format: (v: number | string) => v.toLocaleString(),
  },
  {
    key: 'indexedPages' as const,
    label: 'Indexed Pages',
    icon: FileCheck,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    format: (v: number | string) => String(v),
  },
  {
    key: 'activeStatus' as const,
    label: 'Active Status',
    icon: CheckCircle,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-500',
    format: (v: number | string) => String(v),
  },
  {
    key: 'storageUsed' as const,
    label: 'Storage Used',
    icon: HardDrive,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    format: (v: number | string) => String(v),
  },
];

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {statCards.map((card) => {
        const Icon = card.icon;
        const rawValue = stats[card.key];
        return (
          <div
            key={card.key}
            className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
          >
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800">{card.format(rawValue)}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
