import React from 'react';
import { Hash, Volume2, Plus, Users, Settings, Mic, Headphones, Radio } from 'lucide-react';
import { Server, Channel, User } from '../types';
import { DeviceStatusBadge } from './DeviceStatusBadge';

interface ServerSidebarProps {
  servers: Server[];
  activeServer: Server | null;
  onSelectServer: (server: Server) => void;
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  currentUser: User | null;
  onOpenAccountSwitcher: () => void;
  onCreateServer: () => void;
  onCreateChannel: () => void;
  onOpenP2P?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  activeServer,
  onSelectServer,
  channels,
  activeChannel,
  onSelectChannel,
  currentUser,
  onOpenAccountSwitcher,
  onCreateServer,
  onCreateChannel,
  onOpenP2P,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const handleChannelClick = (c: Channel) => {
    onSelectChannel(c);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      <div
        className={`h-full select-none z-50 ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 flex shadow-2xl animate-in slide-in-from-left duration-200'
            : 'hidden md:flex md:relative'
        }`}
      >
      {/* 1. Discord Rail (Server Icons) */}
      <div className="w-[72px] bg-discord-darkest flex flex-col items-center py-3 gap-2 border-r border-black/40">
        {/* Direct Messages / Home icon */}
        <div className="relative group cursor-pointer">
          <div className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] bg-discord-blurple flex items-center justify-center text-white transition-all duration-200 shadow-md">
            <span className="font-bold text-lg">E</span>
          </div>
        </div>

        {/* P2P Direct Button (Offline / Serverless Calls & Chat) */}
        {onOpenP2P && (
          <div
            onClick={onOpenP2P}
            className="relative group cursor-pointer flex items-center justify-center w-full"
            title="Llamadas y Chat P2P Directo (Sin Servidor)"
          >
            <div className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all duration-200 shadow-md border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        )}

        <div className="w-8 h-[2px] bg-white/10 rounded-full my-1" />

        {/* Server List */}
        <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto">
          {servers.map((server) => {
            const isActive = activeServer?.ServerID === server.ServerID;
            return (
              <div
                key={server.ServerID}
                onClick={() => onSelectServer(server)}
                className="relative group cursor-pointer flex items-center justify-center w-full"
                title={server.Name}
              >
                {/* Active indicator pill */}
                <span
                  className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                    isActive ? 'h-10' : 'h-0 group-hover:h-5'
                  }`}
                />

                <img
                  src={server.IconURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${server.Name}`}
                  alt={server.Name}
                  className={`w-12 h-12 object-cover transition-all duration-200 shadow-md ${
                    isActive
                      ? 'rounded-[16px] border-2 border-discord-blurple'
                      : 'rounded-[24px] group-hover:rounded-[16px]'
                  }`}
                />
              </div>
            );
          })}

          {/* Add Server Button */}
          <button
            onClick={onCreateServer}
            title="Crear un Servidor"
            className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-discord-dark hover:bg-discord-green text-discord-green hover:text-white flex items-center justify-center transition-all duration-200 shadow-md border border-white/5"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 2. Channel Sidebar */}
      <div className="w-60 bg-discord-dark flex flex-col justify-between border-r border-white/5">
        {/* Server Header */}
        <div>
          <div className="h-12 border-b border-black/20 flex items-center justify-between px-4 font-bold text-discord-white shadow-sm">
            <span className="truncate">{activeServer?.Name || 'Echo'}</span>
            <button
              onClick={onCreateChannel}
              title="Crear Canal"
              className="p-1 hover:text-white text-discord-channel transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Channels List */}
          <div className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-120px)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel px-2 py-1">
              Canales de Texto
            </div>
            {channels
              .filter((c) => c.ChannelType === 'TEXT')
              .map((channel) => {
                const isActive = activeChannel?.ChannelID === channel.ChannelID;
                return (
                  <div
                    key={channel.ChannelID}
                    onClick={() => handleChannelClick(channel)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-discord-hover text-discord-white'
                        : 'text-discord-channel hover:bg-discord-hover/50 hover:text-discord-text'
                    }`}
                  >
                    <Hash className="w-4 h-4" />
                    <span className="truncate">{channel.Name}</span>
                  </div>
                );
              })}

            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel px-2 py-1 mt-3">
              Canales de Voz & Video
            </div>
            {channels
              .filter((c) => c.ChannelType === 'VOICE_VIDEO')
              .map((channel) => {
                const isActive = activeChannel?.ChannelID === channel.ChannelID;
                return (
                  <div
                    key={channel.ChannelID}
                    onClick={() => handleChannelClick(channel)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-discord-hover text-discord-green'
                        : 'text-discord-channel hover:bg-discord-hover/50 hover:text-discord-text'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span className="truncate">{channel.Name}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* User Footer Profile & Controls */}
        <div className="h-14 bg-discord-darkest/90 px-2 flex items-center justify-between border-t border-white/5">
          {/* User info trigger */}
          <div
            onClick={onOpenAccountSwitcher}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-discord-hover/50 cursor-pointer flex-1 overflow-hidden transition-colors"
            title="Cambiar de cuenta o ver estado"
          >
            <div className="relative flex-shrink-0">
              <img
                src={currentUser?.AvatarURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.Username}`}
                alt={currentUser?.DisplayName}
                className="w-8 h-8 rounded-full bg-discord-dark object-cover"
              />
              <div className="absolute -bottom-1 -right-1">
                <DeviceStatusBadge
                  platforms={currentUser?.ActivePlatforms || ['PC_DESKTOP']}
                  status="online"
                  size="sm"
                  showTooltip={false}
                />
              </div>
            </div>

            <div className="overflow-hidden leading-tight">
              <div className="text-xs font-bold text-discord-white truncate">
                {currentUser?.DisplayName || 'Cargando...'}
              </div>
              <div className="text-[10px] text-discord-channel truncate">
                @{currentUser?.Username || 'usuario'}
              </div>
            </div>
          </div>

          {/* Quick controls */}
          <div className="flex items-center text-discord-channel">
            <button className="p-1 hover:text-discord-white hover:bg-discord-hover rounded transition-colors" title="Silenciar">
              <Mic className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-discord-white hover:bg-discord-hover rounded transition-colors" title="Ensordecer">
              <Headphones className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAccountSwitcher}
              className="p-1 hover:text-discord-white hover:bg-discord-hover rounded transition-colors"
              title="Ajustes de Cuenta"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </>
);
};
