import React, { useState } from 'react';
import { Copy, Check, Shield, UserX, AlertTriangle } from 'lucide-react';
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
  const [blocked, setBlocked] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('HARASSMENT');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const copyUsername = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`@${user.Username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlockUser = async () => {
    if (!confirm(`¿Estás seguro de que deseas bloquear a ${user.DisplayName}? No verás sus mensajes ni podrá contactarte.`)) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/users/${user.UserID}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setBlocked(true);
      alert(`Has bloqueado a @${user.Username}.`);
      onClose();
      window.location.reload();
    } catch {
      alert('Error al bloquear usuario.');
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await fetch(`/users/${user.UserID}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Reason: reportReason,
          Details: reportDetails,
        }),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReporting(false);
        setReportSuccess(false);
        onClose();
      }, 1500);
    } catch {
      alert('Error al enviar el reporte.');
    }
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
          <div className="bg-discord-dark/50 rounded-xl p-3 border border-white/5 mb-3">
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

          {/* Moderation & Safety Actions (Google Play UGC) */}
          <div className="pt-2 border-t border-white/5 flex gap-2">
            <button
              type="button"
              onClick={handleBlockUser}
              className="flex-1 py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 border border-red-500/20 transition-all active:scale-95"
            >
              <UserX className="w-3.5 h-3.5" />
              Bloquear
            </button>
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="flex-1 py-1.5 px-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 border border-yellow-500/20 transition-all active:scale-95"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Reportar
            </button>
          </div>

          {/* Report Form Dialog */}
          {reporting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="bg-discord-darkest rounded-2xl p-4 w-80 border border-white/10 shadow-2xl">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Reportar a @{user.Username}
                </h4>
                {reportSuccess ? (
                  <div className="py-4 text-center text-xs text-green-400 font-medium">
                    ✓ Reporte enviado. Los moderadores lo revisarán de inmediato.
                  </div>
                ) : (
                  <form onSubmit={handleSendReport} className="space-y-3">
                    <div>
                      <label className="text-[11px] text-discord-channel font-semibold block mb-1">
                        Motivo del reporte:
                      </label>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full bg-discord-dark text-xs text-white p-2 rounded-lg border border-white/10 outline-none"
                      >
                        <option value="HARASSMENT">Acoso o Hostigamiento</option>
                        <option value="SPAM">Spam o Publicidad no deseada</option>
                        <option value="HATE_SPEECH">Incitación al odio</option>
                        <option value="INAPPROPRIATE_CONTENT">Contenido inapropiado / sexual</option>
                        <option value="OTHER">Otro motivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-discord-channel font-semibold block mb-1">
                        Detalles adicionales:
                      </label>
                      <textarea
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        rows={2}
                        placeholder="Describe la situación..."
                        className="w-full bg-discord-dark text-xs text-white p-2 rounded-lg border border-white/10 outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setReporting(false)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs text-discord-channel rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-xs font-bold text-black rounded-lg"
                      >
                        Enviar Reporte
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
