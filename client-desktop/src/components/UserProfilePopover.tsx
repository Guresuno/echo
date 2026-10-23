import React, { useState } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import { User, Role } from '../types';
import { DeviceStatusBadge } from './DeviceStatusBadge';

interface UserProfilePopoverProps {
  user: User;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  user,
  onClose,
  position,
}) => {
  const [copied, setCopied] = useState(false);

  const copyUsername = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`@${user.Username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${Math.min(position.x, window.innerWidth - 320)}px`,
        top: `${Math.min(position.y, window.innerHeight - 420)}px`,
        zIndex: 9999,
      }
    : {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        style={style}
        className="w-80 bg-discord-darkest rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div
          className="h-24 w-full relative transition-colors"
          style={{ backgroundColor: user.BannerColor || '#5865F2' }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-black/70 rounded-full flex items-center justify-center text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Avatar & Device Badge Header */}
        <div className="px-4 pb-4 relative">
          <div className="relative -mt-12 mb-3 flex items-end justify-between">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user.AvatarURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.Username}`}
                alt={user.DisplayName}
                className="w-20 h-20 rounded-full border-4 border-discord-darkest bg-discord-dark object-cover shadow-md"
              />
              <div className="absolute -bottom-1 -right-1">
                <DeviceStatusBadge
                  platforms={user.ActivePlatforms || ['PC_DESKTOP']}
                  status={user.Status || 'online'}
                  size="sm"
                />
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="flex gap-2">
              <button
                onClick={copyUsername}
                className="px-3 py-1.5 bg-discord-dark hover:bg-discord-hover text-discord-white text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-white/5 transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-discord-green" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '¡Copiado!' : 'Copiar @'}
              </button>
            </div>
          </div>

          {/* User Details */}
          <div className="bg-discord-dark/50 rounded-xl p-3 border border-white/5 mb-3">
            <h3 className="text-lg font-bold text-discord-white leading-tight">
              {user.DisplayName}
            </h3>
            <p className="text-xs text-discord-channel font-medium flex items-center gap-1 mt-0.5">
              <span>@{user.Username}</span>
            </p>

            {/* Custom Status */}
            {user.StatusText && (
              <div className="mt-2.5 pt-2 border-t border-white/5 text-xs text-discord-text/90 italic">
                "{user.StatusText}"
              </div>
            )}
          </div>

          {/* Roles Section */}
          <div className="bg-discord-dark/50 rounded-xl p-3 border border-white/5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Roles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.Roles && user.Roles.length > 0 ? (
                user.Roles.map((role: Role) => (
                  <div
                    key={role.RoleID}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/30 border border-white/10"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: role.ColorHex || '#99AAB5' }}
                    />
                    <span className="text-discord-white">{role.Name}</span>
                  </div>
                ))
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-black/30 border border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-discord-blurple" />
                  <span className="text-discord-white">Miembro</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
