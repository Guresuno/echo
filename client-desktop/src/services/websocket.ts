import { vault } from './storageVault';

const isBrowser = typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
const WS_BASE = isBrowser
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : 'ws://127.0.0.1:8000';

type Listener = (data: any) => void;

class WebSocketService {
  private presenceWs: WebSocket | null = null;
  private chatWs: WebSocket | null = null;
  private qrWs: WebSocket | null = null;

  private presenceListeners: Set<Listener> = new Set();
  private chatListeners: Set<Listener> = new Set();
  private qrListeners: Set<Listener> = new Set();

  // PRESENCE
  connectPresence(platformType: string = 'PC_DESKTOP') {
    if (this.presenceWs) {
      this.presenceWs.close();
    }

    this.presenceWs = new WebSocket(`${WS_BASE}/ws/presence`);
    this.presenceWs.onopen = () => {
      const active = vault.getActiveAccount();
      if (active) {
        this.presenceWs?.send(
          JSON.stringify({
            type: 'AUTH',
            token: active.accessToken,
            platform_info: platformType,
          })
        );
      }
    };

    this.presenceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.presenceListeners.forEach((l) => l(data));
      } catch (e) {
        console.error('Presence WS error:', e);
      }
    };
  }

  subscribePresence(listener: Listener) {
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  // CHAT
  connectChat(channelId: number) {
    if (this.chatWs) {
      this.chatWs.close();
    }

    this.chatWs = new WebSocket(`${WS_BASE}/ws/chat/${channelId}`);
    this.chatWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.chatListeners.forEach((l) => l(data));
      } catch (e) {
        console.error('Chat WS error:', e);
      }
    };
  }

  sendChatMessage(channelId: number, message: any) {
    if (this.chatWs && this.chatWs.readyState === WebSocket.OPEN) {
      this.chatWs.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          channel_id: channelId,
          message,
        })
      );
    }
  }

  subscribeChat(listener: Listener) {
    this.chatListeners.add(listener);
    return () => this.chatListeners.delete(listener);
  }

  // QR LOGIN
  connectQRLogin(hardwareId: string, deviceName: string, onEvent: (data: any) => void) {
    if (this.qrWs) {
      this.qrWs.close();
    }

    this.qrWs = new WebSocket(`${WS_BASE}/ws/qr-login`);
    this.qrWs.onopen = () => {
      this.qrWs?.send(
        JSON.stringify({
          type: 'INIT',
          hardware_id: hardwareId,
          device_name: deviceName,
          platform_type: 'PC_DESKTOP',
        })
      );
    };

    this.qrWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (e) {
        console.error('QR WS error:', e);
      }
    };

    return () => {
      if (this.qrWs) {
        this.qrWs.close();
        this.qrWs = null;
      }
    };
  }
}

export const wsService = new WebSocketService();
