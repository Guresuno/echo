import { User, Server, Channel, Message, CustomAsset, Role } from '../types';
import { vault } from './storageVault';

const isBrowser = typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
const API_BASE = isBrowser ? '' : 'http://127.0.0.1:8000';

class ApiService {
  private getHeaders(isFormData: boolean = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const active = vault.getActiveAccount();
    if (active && active.accessToken) {
      headers['Authorization'] = `Bearer ${active.accessToken}`;
    }
    return headers;
  }

  // AUTH & IDENTITY
  async register(payload: {
    Username: string;
    DisplayName: string;
    Password: string;
    HardwareID?: string;
    DeviceName?: string;
    PlatformType?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error en registro' }));
      throw new Error(err.detail || 'Fallo al registrar usuario');
    }
    return res.json();
  }

  async login(payload: {
    Username: string;
    Password: string;
    HardwareID?: string;
    DeviceName?: string;
    PlatformType?: string;
    SetAsPrimary?: boolean;
  }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Credenciales inválidas' }));
      throw new Error(err.detail || 'Error al iniciar sesión');
    }
    return res.json();
  }

  async autoLogin(hardwareId: string) {
    const res = await fetch(`${API_BASE}/auth/auto-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ HardwareID: hardwareId }),
    });
    if (!res.ok) {
      throw new Error('Auto-login falló');
    }
    return res.json();
  }

  async switchAccount(hardwareId: string, targetUserId: number) {
    const res = await fetch(`${API_BASE}/auth/switch-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ HardwareID: hardwareId, TargetUserID: targetUserId }),
    });
    if (!res.ok) {
      throw new Error('Cambio de cuenta falló');
    }
    return res.json();
  }

  async getHardwareAccounts(hardwareId: string) {
    const res = await fetch(`${API_BASE}/auth/hardware-accounts/${hardwareId}`);
    if (!res.ok) return { accounts: [] };
    return res.json();
  }

  // QR LOGIN
  async scanQrCode(qrToken: string) {
    const res = await fetch(`${API_BASE}/auth/qr/scan`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ qr_token: qrToken }),
    });
    if (!res.ok) throw new Error('Error al escanear QR');
    return res.json();
  }

  async approveQrCode(qrToken: string, trustDevice: boolean = false) {
    const res = await fetch(`${API_BASE}/auth/qr/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ qr_token: qrToken, trust_device: trustDevice }),
    });
    if (!res.ok) throw new Error('Error al aprobar inicio de sesión QR');
    return res.json();
  }

  // USERS
  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/users/me`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Error al obtener perfil');
    return res.json();
  }

  async getUserProfile(userId: number, serverId?: number): Promise<User> {
    const url = serverId
      ? `${API_BASE}/users/${userId}?server_id=${serverId}`
      : `${API_BASE}/users/${userId}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Error al obtener usuario');
    return res.json();
  }

  async updateProfile(payload: { DisplayName?: string; BannerColor?: string; StatusText?: string; AvatarURL?: string }) {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Error al actualizar perfil');
    return res.json();
  }

  // SERVERS & CHANNELS
  async listServers(): Promise<Server[]> {
    const res = await fetch(`${API_BASE}/servers`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  async createServer(name: string, iconUrl?: string): Promise<Server> {
    const res = await fetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ Name: name, IconURL: iconUrl }),
    });
    if (!res.ok) throw new Error('Error al crear servidor');
    return res.json();
  }

  async getChannels(serverId: number): Promise<Channel[]> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/channels`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  async createChannel(serverId: number, name: string, channelType: 'TEXT' | 'VOICE_VIDEO' = 'TEXT'): Promise<Channel> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ Name: name, ChannelType: channelType }),
    });
    if (!res.ok) throw new Error('Error al crear canal');
    return res.json();
  }

  async getMembers(serverId: number): Promise<User[]> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/members`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  async getRoles(serverId: number): Promise<Role[]> {
    const res = await fetch(`${API_BASE}/servers/${serverId}/roles`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  // MESSAGES
  async getMessages(channelId: number): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  async sendMessage(channelId: number, content: string, messageType: string = 'DEFAULT', attachmentUrl?: string, metadataJson?: string): Promise<Message> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        Content: content,
        MessageType: messageType,
        AttachmentURL: attachmentUrl,
        MetadataJSON: metadataJson,
      }),
    });
    if (!res.ok) throw new Error('Error al enviar mensaje');
    return res.json();
  }

  async uploadVoiceNote(channelId: number, blob: Blob, durationSeconds: number): Promise<Message> {
    const formData = new FormData();
    formData.append('file', blob, 'voice_note.webm');
    formData.append('duration', durationSeconds.toString());

    const res = await fetch(`${API_BASE}/channels/${channelId}/voice-notes`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir nota de voz');
    return res.json();
  }

  // CUSTOM ASSETS (EMOJIS & STICKERS)
  async getAssets(serverId: number, assetType?: 'EMOJI' | 'STICKER'): Promise<CustomAsset[]> {
    const url = assetType
      ? `${API_BASE}/servers/${serverId}/assets?asset_type=${assetType}`
      : `${API_BASE}/servers/${serverId}/assets`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) return [];
    return res.json();
  }

  async uploadAsset(
    serverId: number,
    shortcode: string,
    assetType: 'EMOJI' | 'STICKER',
    fileBlob: Blob,
    isAnimated: boolean = false,
    projectJson?: string,
    fps: number = 24
  ): Promise<CustomAsset> {
    const formData = new FormData();
    formData.append('shortcode', shortcode);
    formData.append('asset_type', assetType);
    formData.append('is_animated', isAnimated ? 'true' : 'false');
    formData.append('fps', fps.toString());
    if (projectJson) {
      formData.append('project_json', projectJson);
    }
    formData.append('file', fileBlob, `${shortcode}.${assetType === 'STICKER' ? 'webp' : 'png'}`);

    const res = await fetch(`${API_BASE}/servers/${serverId}/assets`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir asset personalizado');
    return res.json();
  }

  async getAssetProject(assetId: number) {
    const res = await fetch(`${API_BASE}/assets/${assetId}/project`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Error al cargar proyecto de animación');
    return res.json();
  }

  // VOICE ROOM LIVEKIT TOKEN
  async getVoiceToken(channelId: number) {
    const res = await fetch(`${API_BASE}/channels/${channelId}/voice/token`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener token de voz');
    return res.json();
  }
}

export const api = new ApiService();
