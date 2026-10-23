import React from 'react';
import { Monitor, Tablet, Smartphone, Gamepad2 } from 'lucide-react';
import { DevicePlatformType, UserStatus } from '../types';

interface DeviceStatusBadgeProps {
  platforms?: DevicePlatformType[];
  status?: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

// Custom Apple SVG Icon
const AppleIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.97-14.42-6.53-9.99-11.55-21.43-15.08-34.33-3.53-12.89-5.3-24.87-5.3-35.94 0-14.67 3.7-26.62 11.11-35.84 7.4-9.22 16.75-13.93 28.05-14.15 4.35 0 9.28 1.15 14.81 3.44 5.54 2.29 9.38 3.5 11.53 3.65 1.74-.15 5.76-1.42 12.06-3.81 6.31-2.39 11.22-3.44 14.75-3.17 13.6.87 24.37 5.66 32.32 14.36-11.85 7.18-17.67 17.07-17.46 29.68.21 9.79 3.91 18.06 11.11 24.8 7.2 6.74 15.66 10.55 25.39 11.44-2.17 6.53-4.78 13.16-7.83 19.89zM119.22 31.84c0-7.39 2.61-14.14 7.83-20.25 5.22-6.1 11.75-9.9 19.59-11.41.22 1.3.33 2.5.33 3.59 0 7.39-2.72 14.35-8.16 20.89-5.44 6.53-12.06 10.33-19.59 11.41-.01-1.3-.01-2.73 0-4.23z"/>
  </svg>
);

// Custom Android Robot SVG Icon
const AndroidIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5802 8.4116 13.8443 8 12 8s-3.5802.4116-5.1368.9507L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
  </svg>
);

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  platforms = ['PC_DESKTOP'],
  status = 'online',
  size = 'md',
  showTooltip = true,
}) => {
  // Status Colors per Section 3.2
  const getStatusColor = (st: UserStatus) => {
    switch (st) {
      case 'online':
        return '#23a55a'; // Discord Green
      case 'idle':
        return '#f0b232'; // Discord Yellow
      case 'dnd':
        return '#f23f43'; // Discord Red
      case 'offline':
      default:
        return '#80848e'; // Discord Muted Gray
    }
  };

  const statusColor = getStatusColor(status);

  const getPlatformIcon = (platform: DevicePlatformType) => {
    const iconClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
    switch (platform) {
      case 'PC_DESKTOP':
        return <Monitor className={iconClass} />;
      case 'TABLET_IPAD':
        return <Tablet className={iconClass} />;
      case 'IOS_PHONE':
        return <AppleIcon className={iconClass} />;
      case 'ANDROID_PHONE':
        return <AndroidIcon className={iconClass} />;
      case 'CONSOLE':
        return <Gamepad2 className={iconClass} />;
      case 'MOBILE_GENERIC':
      default:
        return <Smartphone className={iconClass} />;
    }
  };

  const getPlatformLabel = (platform: DevicePlatformType): string => {
    switch (platform) {
      case 'PC_DESKTOP':
        return 'PC';
      case 'TABLET_IPAD':
        return 'Tablet / iPad';
      case 'IOS_PHONE':
        return 'iOS (iPhone)';
      case 'ANDROID_PHONE':
        return 'Android';
      case 'CONSOLE':
        return 'Consola';
      case 'MOBILE_GENERIC':
      default:
        return 'Móvil';
    }
  };

  const tooltipText =
    platforms.length > 1
      ? `Conectado en ${platforms.map(getPlatformLabel).join(' y ')} (${status})`
      : `${getPlatformLabel(platforms[0] || 'PC_DESKTOP')} (${status})`;

  return (
    <div
      className="inline-flex items-center gap-1 bg-discord-darkest/90 px-1.5 py-0.5 rounded-full border border-black/40 shadow-sm relative group"
      title={showTooltip ? tooltipText : undefined}
    >
      {/* Status Dot */}
      <span
        className="w-2 h-2 rounded-full inline-block animate-pulse"
        style={{ backgroundColor: statusColor }}
      />

      {/* Render all active platform icons illuminated (Multi-Session rule) */}
      <div className="flex items-center gap-1 text-discord-text">
        {platforms.map((platform, idx) => (
          <span
            key={`${platform}-${idx}`}
            className="transition-colors hover:scale-110"
            style={{ color: statusColor }}
          >
            {getPlatformIcon(platform)}
          </span>
        ))}
      </div>

      {/* Floating Hover Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-black text-white text-[10px] font-medium rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {tooltipText}
        </div>
      )}
    </div>
  );
};
