import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { wsService } from '../services/websocket';
import { vault } from '../services/storageVault';
import { User } from '../types';

interface QRLoginScreenProps {
  onSuccess: (user: User, accessToken: string) => void;
  onCancel?: () => void;
}

export const QRLoginScreen: React.FC<QRLoginScreenProps> = ({ onSuccess, onCancel }) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(120);
  const [status, setStatus] = useState<'PENDING' | 'SCANNED' | 'APPROVED' | 'EXPIRED'>('PENDING');
  const [scannedUser, setScannedUser] = useState<{ DisplayName: string; Username: string; AvatarURL?: string } | null>(null);

  const startQRFlow = () => {
    setStatus('PENDING');
    setScannedUser(null);
    setExpiresIn(120);

    const hwid = vault.getHardwareId();
    const disconnect = wsService.connectQRLogin(hwid, 'Echo Desktop PC', (data) => {
      if (data.type === 'QR_READY') {
        setQrToken(data.qr_token);
        setQrUrl(data.qr_url);
        setExpiresIn(data.expires_in || 120);
      } else if (data.type === 'SCANNED') {
        setStatus('SCANNED');
        setScannedUser(data.user);
      } else if (data.type === 'APPROVED') {
        setStatus('APPROVED');
        const payload = data.payload;
        vault.saveAccount(payload.User, payload.AccessToken, payload.RefreshToken, true);
        setTimeout(() => {
          onSuccess(payload.User, payload.AccessToken);
        }, 800);
      } else if (data.type === 'EXPIRED') {
        setStatus('EXPIRED');
      }
    });

    return disconnect;
  };

  useEffect(() => {
    const cleanup = startQRFlow();
    return () => {
      cleanup();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (expiresIn <= 0) {
      setStatus('EXPIRED');
      return;
    }
    const timer = setInterval(() => {
      setExpiresIn((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-discord-darkest rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-auto text-center">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-discord-white">Iniciar Sesión con Código QR</h2>
        <p className="text-xs text-discord-channel mt-1">
          Escanea esto con la app móvil de Echo para iniciar sesión al instante.
        </p>
      </div>

      {/* State Transitions */}
      {status === 'PENDING' && qrUrl && (
        <div className="relative group p-4 bg-white rounded-2xl shadow-lg border border-white/20">
          <QRCodeSVG value={qrUrl} size={200} level="H" includeMargin={false} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 bg-discord-blurple rounded-xl flex items-center justify-center shadow-lg text-white">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {status === 'SCANNED' && (
        <div className="p-6 bg-discord-dark rounded-2xl border border-discord-blurple/50 shadow-xl flex flex-col items-center animate-in zoom-in-95">
          <img
            src={scannedUser?.AvatarURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${scannedUser?.Username}`}
            alt={scannedUser?.DisplayName}
            className="w-20 h-20 rounded-full border-4 border-discord-blurple mb-3 object-cover"
          />
          <h3 className="text-lg font-bold text-discord-white">{scannedUser?.DisplayName}</h3>
          <p className="text-xs text-discord-channel mb-4">@{scannedUser?.Username}</p>
          <div className="flex items-center gap-2 text-discord-yellow text-xs font-semibold bg-discord-yellow/10 px-3 py-1.5 rounded-full animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Esperando confirmación en tu teléfono...
          </div>
        </div>
      )}

      {status === 'APPROVED' && (
        <div className="p-8 bg-discord-dark rounded-2xl border border-discord-green/50 shadow-xl flex flex-col items-center animate-in zoom-in-95">
          <CheckCircle2 className="w-16 h-16 text-discord-green mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-discord-white">¡Aprobado con éxito!</h3>
          <p className="text-xs text-discord-channel">Iniciando sesión en tu PC...</p>
        </div>
      )}

      {status === 'EXPIRED' && (
        <div className="p-6 bg-discord-dark rounded-2xl border border-white/10 shadow-xl flex flex-col items-center">
          <p className="text-sm font-semibold text-discord-red mb-3">El código QR ha expirado</p>
          <button
            onClick={() => startQRFlow()}
            className="px-4 py-2 bg-discord-blurple hover:bg-discord-blurple/90 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Generar Nuevo Código
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-5 text-left text-xs text-discord-channel space-y-1.5 w-full bg-discord-dark/50 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 text-discord-white font-medium">
          <ShieldCheck className="w-4 h-4 text-discord-green" />
          <span>Verificación Segura Punto a Punto</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          1. Abre la app móvil de Echo.<br />
          2. Ve a <strong>Ajustes &gt; Escanear Código QR</strong>.<br />
          3. Apunta tu cámara hacia esta pantalla.
        </p>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 text-xs text-discord-channel hover:text-discord-white transition-colors"
        >
          Volver al inicio de sesión clásico
        </button>
      )}
    </div>
  );
};
