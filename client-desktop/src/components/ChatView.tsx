import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Paperclip, Sparkles, Hash, Volume2, Menu } from 'lucide-react';
import { Message, Channel, User, CustomAsset } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { WaveformAudioPlayer, VoiceNoteRecorder } from './VoiceNoteRecorder';
import { UserProfilePopover } from './UserProfilePopover';
import { EmojiPicker } from './EmojiPicker';

interface ChatViewProps {
  channel: Channel;
  currentUser: User | null;
  onOpenStudio: () => void;
  onToggleMobileDrawer?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ channel, currentUser, onOpenStudio, onToggleMobileDrawer }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [customAssets, setCustomAssets] = useState<CustomAsset[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [popoverUser, setPopoverUser] = useState<User | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | undefined>();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    try {
      const [msgs, assets] = await Promise.all([
        api.getMessages(channel.ChannelID),
        api.getAssets(channel.ServerID),
      ]);
      setMessages(msgs);
      setCustomAssets(assets);
    } catch (e) {
      console.error('Error loading chat:', e);
    }
  };

  useEffect(() => {
    loadData();
    wsService.connectChat(channel.ChannelID);
    const unsubscribe = wsService.subscribeChat((data) => {
      if (data.type === 'NEW_MESSAGE' && data.channel_id === channel.ChannelID) {
        setMessages((prev) => {
          if (prev.some((m) => m.MessageID === data.message.MessageID)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [channel.ChannelID]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');

    try {
      const msg = await api.sendMessage(channel.ChannelID, text);
      wsService.sendChatMessage(channel.ChannelID, msg);
      setMessages((prev) => {
        if (prev.some((m) => m.MessageID === msg.MessageID)) {
          return prev;
        }
        return [...prev, msg];
      });
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  const sendSticker = async (sticker: CustomAsset) => {
    try {
      const msg = await api.sendMessage(
        channel.ChannelID,
        `:${sticker.Shortcode}:`,
        'STICKER',
        sticker.FileURL
      );
      wsService.sendChatMessage(channel.ChannelID, msg);
      setMessages((prev) => {
        if (prev.some((m) => m.MessageID === msg.MessageID)) {
          return prev;
        }
        return [...prev, msg];
      });
      setShowAssetPicker(false);
    } catch (err) {
      console.error('Failed to send sticker:', err);
    }
  };

  // Inline Emoji & Jumbo Parser (Section 5.1.1)
  const renderMessageContent = (content: string = '') => {
    // Check if message is ONLY 1-3 emojis (Jumbo Mode 48x48)
    const emojiRegex = /:([a-zA-Z0-9_]+):/g;
    const matches = Array.from(content.matchAll(emojiRegex));
    const nonEmojiText = content.replace(emojiRegex, '').trim();

    const isJumbo = matches.length >= 1 && matches.length <= 3 && nonEmojiText.length === 0;

    // Split text and replace matched :shortcode: with custom emoji image
    const parts = content.split(/(:[a-zA-Z0-9_]+:)/g);

    return (
      <div className={`flex flex-wrap items-center gap-1 ${isJumbo ? 'py-1' : ''}`}>
        {parts.map((part, idx) => {
          if (part.startsWith(':') && part.endsWith(':')) {
            const code = part.slice(1, -1);
            const foundAsset = customAssets.find(
              (a) => a.Shortcode.toLowerCase() === code.toLowerCase() && a.AssetType === 'EMOJI'
            );
            if (foundAsset) {
              return (
                <img
                  key={idx}
                  src={foundAsset.FileURL}
                  alt={code}
                  title={`:${code}:`}
                  className={`${
                    isJumbo ? 'w-12 h-12' : 'w-[22px] h-[22px]'
                  } object-contain inline-block align-middle transition-transform hover:scale-110`}
                />
              );
            }
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  const handleAvatarClick = (e: React.MouseEvent, sender: any) => {
    setPopoverPos({ x: e.clientX, y: e.clientY });
    setPopoverUser({
      UserID: sender.SenderID,
      Username: sender.SenderName || 'usuario',
      DisplayName: sender.SenderDisplayName || 'Usuario',
      AvatarURL: sender.SenderAvatar,
      ActivePlatforms: sender.SenderActivePlatforms || ['PC_DESKTOP'],
      Roles: [],
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-discord-light h-full overflow-hidden relative">
      {/* Channel Header */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-3 md:px-4 bg-discord-light shadow-sm">
        <div className="flex items-center gap-2">
          {onToggleMobileDrawer && (
            <button
              onClick={onToggleMobileDrawer}
              className="p-1.5 -ml-1 text-discord-channel hover:text-white md:hidden"
              title="Abrir Canales"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Hash className="w-5 h-5 text-discord-channel" />
          <h2 className="text-sm font-bold text-discord-white truncate max-w-[140px] sm:max-w-xs">{channel.Name}</h2>
          <span className="hidden sm:inline text-xs text-discord-channel font-medium">| Canal de Texto</span>
        </div>

        <button
          onClick={onOpenStudio}
          className="px-2.5 py-1.5 bg-discord-blurple/20 hover:bg-discord-blurple/30 text-discord-blurple border border-discord-blurple/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Estudio de Stickers</span>
          <span className="sm:hidden">Estudio</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          let metadata: any = {};
          try {
            if (msg.MetadataJSON) metadata = JSON.parse(msg.MetadataJSON);
          } catch {}

          return (
            <div key={msg.MessageID} className="flex items-start gap-3 group hover:bg-discord-hover/30 -mx-4 px-4 py-1.5 rounded-lg transition-colors">
              {/* Avatar with Platform Indicator */}
              <div
                className="relative cursor-pointer flex-shrink-0"
                onClick={(e) => handleAvatarClick(e, msg)}
              >
                <img
                  src={msg.SenderAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.SenderName}`}
                  alt={msg.SenderDisplayName}
                  className="w-10 h-10 rounded-full bg-discord-dark object-cover shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1">
                  <DeviceStatusBadge
                    platforms={msg.SenderActivePlatforms || ['PC_DESKTOP']}
                    status="online"
                    size="sm"
                  />
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-baseline gap-2">
                  <span
                    onClick={(e) => handleAvatarClick(e, msg)}
                    className="text-sm font-bold text-discord-white hover:underline cursor-pointer"
                  >
                    {msg.SenderDisplayName || msg.SenderName}
                  </span>
                  <span className="text-[10px] text-discord-channel font-mono">
                    {new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Body */}
                <div className="mt-1 text-sm text-discord-text leading-relaxed">
                  {msg.MessageType === 'DEFAULT' && renderMessageContent(msg.Content)}

                  {msg.MessageType === 'VOICE_NOTE' && msg.AttachmentURL && (
                    <div className="mt-1">
                      <WaveformAudioPlayer
                        audioUrl={msg.AttachmentURL.startsWith('http') ? msg.AttachmentURL : `http://localhost:8000${msg.AttachmentURL}`}
                        waveformPeaks={metadata.waveform_peaks}
                        durationSeconds={metadata.duration_seconds || 0}
                      />
                    </div>
                  )}

                  {msg.MessageType === 'STICKER' && msg.AttachmentURL && (
                    <div className="mt-1.5">
                      <img
                        src={msg.AttachmentURL.startsWith('http') ? msg.AttachmentURL : `http://localhost:8000${msg.AttachmentURL}`}
                        alt="Sticker"
                        className="w-44 h-44 object-contain filter drop-shadow-lg rounded-2xl transition-transform hover:scale-105"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Comprehensive Categorized Emoji & Sticker Picker (PiliApp & Discord style) */}
      {showAssetPicker && (
        <EmojiPicker
          onSelectEmoji={(emoji) => {
            setInputText((prev) => `${prev} ${emoji} `);
          }}
          onSelectCustomAsset={(asset) => {
            if (asset.AssetType === 'STICKER') {
              sendSticker(asset);
            } else {
              setInputText((prev) => `${prev} :${asset.Shortcode}: `);
            }
          }}
          customAssets={customAssets}
          onOpenStudio={onOpenStudio}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      {/* Input Box Footer */}
      <div className="p-4 bg-discord-light">
        <form
          onSubmit={handleSend}
          className="bg-discord-dark rounded-xl px-4 py-2 flex items-center gap-2 border border-white/5 focus-within:border-discord-blurple/50 shadow-inner"
        >
          {/* Voice Note Recorder Button */}
          <VoiceNoteRecorder
            channelId={channel.ChannelID}
            onSent={(msg) => {
              wsService.sendChatMessage(channel.ChannelID, msg);
              setMessages((prev) => {
                if (prev.some((m) => m.MessageID === msg.MessageID)) {
                  return prev;
                }
                return [...prev, msg];
              });
            }}
          />

          {/* Text Input */}
          <input
            type="text"
            placeholder={`Enviar mensaje a #${channel.Name}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent text-sm text-discord-white focus:outline-none placeholder-discord-channel"
          />

          {/* Emoji/Sticker Picker Trigger */}
          <button
            type="button"
            onClick={() => setShowAssetPicker(!showAssetPicker)}
            className="p-1.5 text-discord-channel hover:text-discord-yellow transition-colors"
            title="Emojis y Stickers Personalizados"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 bg-discord-blurple hover:bg-discord-blurple/90 disabled:opacity-40 text-white rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Floating User Profile Card Popover */}
      {popoverUser && (
        <UserProfilePopover
          user={popoverUser}
          position={popoverPos}
          onClose={() => setPopoverUser(null)}
        />
      )}
    </div>
  );
};
