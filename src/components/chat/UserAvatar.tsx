import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-20 h-20 text-2xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || 'U').substring(0, 2).toUpperCase();
}

interface UserAvatarProps {
  size?: keyof typeof sizeClasses;
  /** Show another user (e.g. in User Management); omit both to show the signed-in user. */
  name?: string | null;
  avatarUrl?: string | null;
}

/** Photo (e.g. from Google) when available, otherwise initials on the brand gradient. */
export function UserAvatar({ size = 'md', name, avatarUrl }: UserAvatarProps) {
  const { user, profile } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const isOtherUser = name !== undefined || avatarUrl !== undefined;
  const displayName = (isOtherUser ? name : profile?.full_name || user?.email) || '';
  const photoUrl = isOtherUser ? avatarUrl : profile?.avatar_url;
  const sizeClass = sizeClasses[size];

  if (photoUrl && !imageFailed) {
    return (
      <img
        src={photoUrl}
        alt={displayName}
        // Google profile photos can reject requests that carry a referrer
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary to-primary-ink flex items-center justify-center font-semibold text-white shrink-0`}
      aria-hidden="true"
    >
      {getInitials(displayName)}
    </div>
  );
}
