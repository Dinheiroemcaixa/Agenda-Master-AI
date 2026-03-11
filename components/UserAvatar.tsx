
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user?: User; // Tornado opcional para maior robustez
  className?: string; // Container dimensions (e.g., "w-8 h-8")
  textSize?: string; // Text size class (e.g., "text-xs")
  showStatus?: boolean; // Online indicator
}

export const UserAvatar = React.memo<UserAvatarProps>(({ 
  user, 
  className = "w-8 h-8", 
  textSize = "text-xs",
  showStatus = false 
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar]); // Optional chaining aqui é crucial

  const showImage = user?.avatar && !imageError;

  const initials = useMemo(() => {
    if (!user?.name) return '??';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [user?.name]);

  const bgColorClass = useMemo(() => {
    const colors = [
      'bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 
      'bg-amber-600', 'bg-purple-600', 'bg-sky-600',
      'bg-slate-700', 'bg-teal-600', 'bg-violet-600',
      'bg-pink-600', 'bg-cyan-600'
    ];
    let hash = 0;
    const seed = user?.email || user?.name || user?.id || 'default';
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [user?.email, user?.name, user?.id]);

  if (!user) {
    return (
      <div className={`relative ${className} flex-shrink-0 select-none overflow-visible`}>
        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden bg-slate-400`}>
          <span className={`${textSize} leading-none tracking-tighter font-extrabold text-white drop-shadow-sm`}>
            ??
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className} flex-shrink-0 select-none overflow-visible`}>
      {showImage ? (
        <img 
          src={user.avatar} 
          alt={user.name} 
          onError={() => setImageError(true)}
          className="w-full h-full rounded-full object-cover shadow-sm ring-1 ring-black/5 dark:ring-white/10"
        />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10 overflow-hidden ${bgColorClass}`}>
          <span className={`${textSize} leading-none tracking-tighter font-extrabold text-white drop-shadow-sm`}>
            {initials}
          </span>
        </div>
      )}
      
      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5 z-10 w-[30%] h-[30%] min-w-[10px] min-h-[10px] flex items-center justify-center">
          {user.is_online ? (
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              <div className="relative w-full h-full bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
            </div>
          ) : (
            <div className="w-full h-full bg-slate-400 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
          )}
        </div>
      )}
    </div>
  );
});
