import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, LogOut, ShieldAlert, Sparkles, User as UserIcon } from 'lucide-react';
import { vault, SavedAccount } from '../services/storageVault';
import { api } from '../services/api';
import { User } from '../types';

interface AccountSwitcherProps {
  currentUser: User | null;
  onSelectAccount: (user: User, token: string) => void;
  onAddNewAccount: () => void;
  onGuestMode: () => void;
  onClose: () => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  currentUser,
  onSelectAccount,
  onAddNewAccount,
  onGuestMode,
  onClose,
}) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    setSavedAccounts(vault.getSavedAccounts());
  }, []);

  const handleSwitch = async (account: SavedAccount) => {
    if (account.user.UserID === currentUser?.UserID) {
      onClose();
      return;
    }

    setLoadingId(account.user.UserID);
    try {
      const hwid = vault.getHardwareId();
      // Fast switch via backend hardware trust
      const res = await api.switchAccount(hwid, account.user.UserID);
      vault.saveAccount(res.User, res.AccessToken, res.RefreshToken, account.isPrimary);
      onSelectAccount(res.User, res.AccessToken);
      onClose();
    } catch {
      // Local token fallback
      vault.setActiveUserId(account.user.UserID);
      onSelectAccount(account.user, account.accessToken);
      onClose();
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    vault.removeAccount(userId);
    setSavedAccounts(vault.getSavedAccounts());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-96 bg-discord-darkest rounded-2xl p-5 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-discord-blurple" />
            <h2 className="text-base font-bold text-discord-white">Cambiar de Cuenta</h2>
          </div>
          <button
            onClick={onClose}
            className="text-discord-channel hover:text-discord-white text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-discord-channel mb-4">
          Bóveda de Dispositivo Confiable. Cambia de cuenta al instante sin ingresar contraseña.
        </p>

        {/* Saved Accounts List */}
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
          {savedAccounts.map((account) => {
            const isCurrent = account.user.UserID === currentUser?.UserID;
            const isLoading = loadingId === account.user.UserID;

            return (
              <div
                key={account.user.UserID}
                onClick={() => handleSwitch(account)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-discord-blurple/15 border-discord-blurple text-discord-white'
                    : 'bg-discord-dark/50 hover:bg-discord-dark border-white/5 hover:border-white/10 text-discord-text'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={account.user.AvatarURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${account.user.Username}`}
                    alt={account.user.DisplayName}
                    className="w-10 h-10 rounded-full bg-discord-dark object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-discord-white">
                        {account.user.DisplayName}
                      </span>
                      {account.isPrimary && (
                        <span className="px-1.5 py-0.2 bg-discord-blurple/30 text-discord-blurple text-[10px] font-bold rounded">
                          Principal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-discord-channel font-medium">
                      @{account.user.Username}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent ? (
                    <span className="text-xs font-semibold text-discord-green flex items-center gap-1">
                      <UserCheck className="w-4 h-4" /> Activa
                    </span>
                  ) : isLoading ? (
                    <span className="text-xs text-discord-channel animate-spin">⟳</span>
                  ) : (
                    <button
                      onClick={(e) => handleRemove(e, account.user.UserID)}
                      title="Eliminar de este dispositivo"
                      className="p-1 hover:text-discord-red text-discord-channel text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <button
            onClick={onAddNewAccount}
            className="w-full py-2.5 px-3 bg-discord-dark hover:bg-discord-hover text-discord-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar Otra Cuenta
          </button>

          <button
            onClick={onGuestMode}
            className="w-full py-2.5 px-3 bg-discord-darkest hover:bg-discord-dark text-discord-channel hover:text-discord-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all"
          >
            <ShieldAlert className="w-4 h-4 text-discord-yellow" />
            Modo Sesión Temporal / Invitado
          </button>
        </div>
      </div>
    </div>
  );
};
