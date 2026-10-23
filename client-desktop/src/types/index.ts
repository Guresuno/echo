export type DevicePlatformType =
  | 'PC_DESKTOP'
  | 'TABLET_IPAD'
  | 'IOS_PHONE'
  | 'ANDROID_PHONE'
  | 'MOBILE_GENERIC'
  | 'CONSOLE';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface User {
  UserID: number;
  Username: string;
  DisplayName: string;
  AvatarURL?: string;
  BannerColor?: string;
  StatusText?: string;
  CreatedAt?: string;
  Status?: UserStatus;
  ActivePlatforms?: DevicePlatformType[];
  Roles?: Role[];
}

export interface Role {
  RoleID: number;
  ServerID: number;
  Name: string;
  ColorHex: string;
  Position: number;
  PermissionsBitmask: number;
}

export interface Server {
  ServerID: number;
  Name: string;
  IconURL?: string;
  OwnerID: number;
  CreatedAt?: string;
}

export interface Channel {
  ChannelID: number;
  ServerID: number;
  Name: string;
  ChannelType: 'TEXT' | 'VOICE_VIDEO';
  Position: number;
}

export interface Message {
  MessageID: number;
  ChannelID: number;
  SenderID: number;
  SenderName?: string;
  SenderDisplayName?: string;
  SenderAvatar?: string;
  SenderActivePlatforms?: DevicePlatformType[];
  Content?: string;
  MessageType: 'DEFAULT' | 'VOICE_NOTE' | 'STICKER' | 'FILE';
  AttachmentURL?: string;
  MetadataJSON?: string;
  CreatedAt: string;
}

export interface CustomAsset {
  AssetID: number;
  ServerID: number;
  CreatorID: number;
  Shortcode: string;
  AssetType: 'EMOJI' | 'STICKER';
  IsAnimated: boolean;
  FileURL: string;
  ProjectJSON?: string;
  FPS: number;
  CreatedAt: string;
}

export interface AnimationKeyframe {
  id: string;
  frameIndex: number;
  durationMs: number; // Duration of this specific frame
  imageDataUrl: string; // Base64 canvas data
  layers: AnimationLayer[];
  tween?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
  };
}

export interface AnimationLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: StrokeData[];
}

export interface StrokeData {
  points: number[][]; // [x, y, pressure, tiltX, tiltY]
  color: string;
  size: number;
  smoothing: number;
}

export interface ProjectJSON {
  version: string;
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  assetType: 'EMOJI' | 'STICKER';
  frames: AnimationKeyframe[];
  whiteBorder: boolean;
}
