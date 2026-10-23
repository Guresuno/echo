import React, { useState, useEffect } from 'react';
import { Server, Channel, User } from './types';
import { api } from './services/api';
import { vault } from './services/storageVault';
import { wsService } from './services/websocket';
import { ServerSidebar } from './components/ServerSidebar';
import { ChatView } from './components/ChatView';
import { VoiceVideoRoom } from './components/VoiceVideoRoom';
import { QRLoginScreen } from './components/QRLoginScreen';
import { AccountSwitcher } from './components/AccountSwitcher';
import { AnimationStudio } from './studio/AnimationStudio';
import { P2PDirectModal } from './components/P2PDirectModal';
import { QrCode, LogIn, UserPlus, Radio, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Data state
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServer, setActiveServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modals state
  const [showQRLogin, setShowQRLogin] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Auth form fields
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // 1. Zero-Click Auto-Login Initialization (Section 2.2)
  useEffect(() => {
    const initApp = async () => {
      try {
        // Attempt to fetch hardware ID from Tauri if available
        let hwid = vault.getHardwareId();
        if ((window as any).__TAURI__) {
          try {
            const { invoke } = (window as any).__TAURI__.tauri;
            const tauriHwid = await invoke('get_hardware_id');
            if (tauriHwid) {
              hwid = tauriHwid;
              vault.setHardwareId(tauriHwid);
            }
          } catch (e) {
            console.warn('Tauri invoke get_hardware_id fallback:', e);
          }
        }

        // Try auto-login with primary owner of hardware
        const res = await api.autoLogin(hwid);
        vault.saveAccount(res.User, res.AccessToken, res.RefreshToken, true);
        handleLoginSuccess(res.User, res.AccessToken);
      } catch {
        setIsBackendOffline(true);
        // Check local vault backup account
        const saved = vault.getActiveAccount();
        if (saved) {
          handleLoginSuccess(saved.user, saved.accessToken);
        } else {
          setShowAuthModal(true);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initApp();
  }, []);

  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    setShowQRLogin(false);
    setShowAccountSwitcher(false);

    // Connect presence WebSocket
    wsService.connectPresence('PC_DESKTOP');

    // Load servers
    try {
      const srvs = await api.listServers();
      setServers(srvs);
      setIsBackendOffline(false);
      if (srvs.length > 0) {
        selectServer(srvs[0]);
      }
    } catch (e) {
      console.warn('Failed to load servers, backend might be offline:', e);
      setIsBackendOffline(true);
    }
  };

  const selectServer = async (server: Server) => {
    setActiveServer(server);
    try {
      const chans = await api.getChannels(server.ServerID);
      setChannels(chans);
      if (chans.length > 0) {
        setActiveChannel(chans[0]);
      } else {
        setActiveChannel(null);
      }
    } catch (e) {
      console.error('Failed to load channels:', e);
    }
  };

  const handleClassicAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const hwid = vault.getHardwareId();

    try {
      if (authMode === 'REGISTER') {
        const res = await api.register({
          Username: usernameInput,
          DisplayName: displayNameInput || usernameInput,
          Password: passwordInput,
          HardwareID: hwid,
          PlatformType: 'PC_DESKTOP',
        });
        vault.saveAccount(res.User, res.AccessToken, res.RefreshToken, true);
        handleLoginSuccess(res.User, res.AccessToken);
      } else {
        const res = await api.login({
          Username: usernameInput,
          Password: passwordInput,
          HardwareID: hwid,
          PlatformType: 'PC_DESKTOP',
          SetAsPrimary: true,
        });
        vault.saveAccount(res.User, res.AccessToken, res.RefreshToken, true);
        handleLoginSuccess(res.User, res.AccessToken);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error de autenticación');
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-discord-darkest flex flex-col items-center justify-center text-discord-white select-none">
        <div className="w-16 h-16 rounded-3xl bg-discord-blurple flex items-center justify-center text-3xl font-extrabold shadow-2xl animate-pulse mb-4">
          E
        </div>
        <h1 className="text-xl font-bold tracking-tight">Echo</h1>
        <p className="text-xs text-discord-channel mt-1">Verificando Hardware ID & Auto-Login...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-discord-darkest text-discord-text overflow-hidden select-none">
      {/* Offline Alert Ribbon */}
      {isBackendOffline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-40">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>Servidor central no detectado. Modo P2P Directo disponible para llamadas y mensajes sin servidor.</span>
          </div>
          <button
            onClick={() => setShowP2PModal(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Radio className="w-3.5 h-3.5" />
            Abrir P2P Directo
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Workspace Layout */}
        {currentUser && (
          <>
            <ServerSidebar
              servers={servers}
              activeServer={activeServer}
              onSelectServer={selectServer}
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
              currentUser={currentUser}
              isMobileOpen={isMobileDrawerOpen}
              onCloseMobile={() => setIsMobileDrawerOpen(false)}
              onOpenAccountSwitcher={() => setShowAccountSwitcher(true)}
              onOpenP2P={() => setShowP2PModal(true)}
              onCreateServer={async () => {
                const name = prompt('Nombre del nuevo servidor:');
                if (name) {
                  const s = await api.createServer(name);
                  setServers((prev) => [...prev, s]);
                  selectServer(s);
                }
              }}
              onCreateChannel={async () => {
                if (!activeServer) return;
                const name = prompt('Nombre del canal:');
                if (name) {
                  const isVoice = confirm('¿Crear como canal de voz/video? (Aceptar = Voz, Cancelar = Texto)');
                  const c = await api.createChannel(activeServer.ServerID, name, isVoice ? 'VOICE_VIDEO' : 'TEXT');
                  setChannels((prev) => [...prev, c]);
                  setActiveChannel(c);
                }
              }}
            />

            {/* Active Channel View */}
            {activeChannel ? (
              activeChannel.ChannelType === 'VOICE_VIDEO' ? (
                <VoiceVideoRoom
                  channel={activeChannel}
                  onToggleMobileDrawer={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                  onOpenP2P={() => setShowP2PModal(true)}
                  onDisconnect={() => {
                    const firstText = channels.find((c) => c.ChannelType === 'TEXT');
                    if (firstText) setActiveChannel(firstText);
                  }}
                />
              ) : (
                <ChatView
                  channel={activeChannel}
                  currentUser={currentUser}
                  onOpenStudio={() => setShowStudio(true)}
                  onToggleMobileDrawer={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                />
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-discord-light text-discord-channel">
                <p className="text-sm">Selecciona o crea un canal para comenzar a chatear.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth Modal (Login / Register / QR Login) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          {showQRLogin ? (
            <QRLoginScreen
              onSuccess={handleLoginSuccess}
              onCancel={() => setShowQRLogin(false)}
            />
          ) : (
            <div className="w-full max-w-md bg-discord-darkest rounded-3xl p-8 border border-white/10 shadow-2xl animate-in zoom-in-95">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-discord-blurple flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 shadow-lg">
                  E
                </div>
                <h2 className="text-2xl font-extrabold text-discord-white">
                  {authMode === 'LOGIN' ? '¡Te damos la bienvenida de nuevo!' : 'Crear una Cuenta'}
                </h2>
                <p className="text-xs text-discord-channel mt-1">
                  {authMode === 'LOGIN'
                    ? 'Estamos encantados de verte otra vez.'
                    : 'Regístrate para empezar a usar Echo.'}
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-discord-red/20 border border-discord-red/50 rounded-xl text-xs text-discord-red font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleClassicAuth} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-discord-channel block mb-1">
                      Nombre Visible (DisplayName)
                    </label>
                    <input
                      type="text"
                      required
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="Ej. Greco Pro ⚡"
                      className="w-full bg-discord-dark px-3.5 py-2.5 rounded-xl text-sm text-discord-white border border-white/10 focus:outline-none focus:border-discord-blurple"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-discord-channel block mb-1">
                    Nombre de Usuario Único (@Username)
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="ej. greco"
                    className="w-full bg-discord-dark px-3.5 py-2.5 rounded-xl text-sm text-discord-white border border-white/10 focus:outline-none focus:border-discord-blurple lowercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-discord-channel block mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-discord-dark px-3.5 py-2.5 rounded-xl text-sm text-discord-white border border-white/10 focus:outline-none focus:border-discord-blurple"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-discord-blurple hover:bg-discord-blurple/90 text-white text-sm font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  {authMode === 'LOGIN' ? 'Iniciar Sesión' : 'Registrarse'}
                </button>
              </form>

              {/* QR Code Login Button & P2P Direct Button */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowQRLogin(true)}
                  className="w-full py-2.5 bg-discord-dark hover:bg-discord-hover text-discord-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all shadow-sm"
                >
                  <QrCode className="w-4 h-4 text-discord-blurple" />
                  Iniciar Sesión con Código QR (Móvil)
                </button>

                <button
                  type="button"
                  onClick={() => setShowP2PModal(true)}
                  className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20 transition-all shadow-sm"
                >
                  <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                  Modo P2P Directo (Llamadas y Chat Sin Servidor)
                </button>
              </div>

              {/* Switch Auth Mode */}
              <div className="mt-4 text-center text-xs text-discord-channel">
                {authMode === 'LOGIN' ? (
                  <span>
                    ¿Necesitas una cuenta?{' '}
                    <button
                      onClick={() => setAuthMode('REGISTER')}
                      className="text-discord-blurple font-semibold hover:underline"
                    >
                      Regístrate
                    </button>
                  </span>
                ) : (
                  <span>
                    ¿Ya tienes una cuenta?{' '}
                    <button
                      onClick={() => setAuthMode('LOGIN')}
                      className="text-discord-blurple font-semibold hover:underline"
                    >
                      Inicia Sesión
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Switcher Modal (Section 2.2) */}
      {showAccountSwitcher && (
        <AccountSwitcher
          currentUser={currentUser}
          onSelectAccount={(user, token) => handleLoginSuccess(user, token)}
          onAddNewAccount={() => {
            setShowAccountSwitcher(false);
            setShowAuthModal(true);
            setAuthMode('LOGIN');
          }}
          onGuestMode={() => {
            setShowAccountSwitcher(false);
            setShowAuthModal(true);
            setAuthMode('REGISTER');
          }}
          onClose={() => setShowAccountSwitcher(false)}
        />
      )}

      {/* Frame-by-Frame Animation & Sticker Studio Modal (Section 5.2) */}
      {showStudio && activeServer && (
        <AnimationStudio
          serverId={activeServer.ServerID}
          onClose={() => setShowStudio(false)}
          onSaved={() => {
            // refresh custom assets
          }}
        />
      )}

      {/* P2P Direct Modal (Serverless WebRTC Calls & DMs) */}
      <P2PDirectModal
        isOpen={showP2PModal}
        onClose={() => setShowP2PModal(false)}
        currentUserName={currentUser?.DisplayName || currentUser?.Username || 'Usuario Echo'}
      />
    </div>
  );
};
