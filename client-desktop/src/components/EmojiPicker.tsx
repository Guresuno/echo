import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Clock, Smile } from 'lucide-react';
import { EMOJI_CATEGORIES, EmojiItem } from './emojiData';
import { CustomAsset } from '../types';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectCustomAsset?: (asset: CustomAsset) => void;
  customAssets?: CustomAsset[];
  onOpenStudio?: () => void;
  onClose: () => void;
}

const RECENT_EMOJIS_KEY = 'echo_recent_emojis';

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelectEmoji,
  onSelectCustomAsset,
  customAssets = [],
  onOpenStudio,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recents from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to recents
  const handleEmojiClick = (emoji: string, item?: EmojiItem) => {
    onSelectEmoji(emoji);
    try {
      const nextRecents = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 18);
      setRecentEmojis(nextRecents);
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(nextRecents));
    } catch {
      // ignore
    }
  };

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter emojis based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    const results: EmojiItem[] = [];

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.emoji === q ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          results.push(item);
        }
      }
    }
    return results;
  }, [searchQuery]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-16 right-4 w-84 sm:w-96 bg-discord-darkest rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{ maxHeight: '420px', height: '420px' }}
    >
      {/* Header with Search and Close */}
      <div className="p-3 bg-discord-darkest border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-discord-white">
            <Smile className="w-4 h-4 text-discord-yellow" />
            <span>Emojis y Reacciones</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-discord-channel hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-discord-channel" />
          <input
            type="text"
            placeholder="Buscar emoji (ej: risa, amor, fuego)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-discord-dark text-xs text-discord-white pl-8 pr-7 py-1.5 rounded-lg border border-white/5 focus:outline-none focus:border-discord-blurple/50 placeholder-discord-channel"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-discord-channel hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (PiliApp & Discord style) */}
      {!searchResults && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-discord-dark/40 border-b border-white/5 overflow-x-auto scrollbar-none">
          {recentEmojis.length > 0 && (
            <button
              onClick={() => setActiveCategory('recents')}
              className={`p-1.5 rounded-lg text-sm transition-all ${
                activeCategory === 'recents'
                  ? 'bg-discord-blurple/20 text-discord-blurple font-bold'
                  : 'text-discord-channel hover:bg-white/5 hover:text-white'
              }`}
              title="Frecuentes"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`p-1.5 rounded-lg text-sm transition-all ${
                activeCategory === cat.id
                  ? 'bg-discord-blurple/20 text-discord-blurple font-bold'
                  : 'text-discord-channel hover:bg-white/5 hover:text-white'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}

          {/* Custom Stickers Tab */}
          <button
            onClick={() => setActiveCategory('custom')}
            className={`p-1.5 rounded-lg text-sm transition-all flex items-center gap-1 ${
              activeCategory === 'custom'
                ? 'bg-discord-blurple/20 text-discord-blurple font-bold'
                : 'text-discord-channel hover:bg-white/5 hover:text-white'
            }`}
            title="Stickers del Servidor"
          >
            <Sparkles className="w-4 h-4 text-discord-yellow" />
          </button>
        </div>
      )}

      {/* Emoji Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {searchResults ? (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel mb-2">
              Resultados de búsqueda ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-discord-channel">
                No se encontraron emojis para "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.emoji}-${idx}`}
                    onClick={() => handleEmojiClick(item.emoji, item)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    className="aspect-square flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-transform hover:scale-125 active:scale-95"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeCategory === 'recents' ? (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Usados Recientemente
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
              {recentEmojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="aspect-square flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-transform hover:scale-125 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : activeCategory === 'custom' ? (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-discord-yellow" />
                Stickers y Emojis Personalizados
              </span>
              {onOpenStudio && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenStudio();
                  }}
                  className="text-discord-blurple hover:underline normal-case text-xs font-semibold"
                >
                  + Crear
                </button>
              )}
            </div>

            {customAssets.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-discord-channel">
                  Aún no hay stickers personalizados en este servidor.
                </p>
                {onOpenStudio && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStudio();
                    }}
                    className="px-3 py-1.5 bg-discord-blurple hover:bg-discord-blurple/90 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Abrir Estudio de Animación
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {customAssets.map((asset) => (
                  <button
                    key={asset.AssetID}
                    onClick={() => {
                      if (onSelectCustomAsset) {
                        onSelectCustomAsset(asset);
                      } else {
                        onSelectEmoji(`:${asset.Shortcode}:`);
                      }
                      onClose();
                    }}
                    className="aspect-square bg-discord-dark hover:bg-discord-hover rounded-xl p-1.5 flex flex-col items-center justify-center transition-all hover:scale-105 border border-white/5"
                    title={`:${asset.Shortcode}:`}
                  >
                    <img
                      src={
                        asset.FileURL.startsWith('http')
                          ? asset.FileURL
                          : `http://localhost:8000${asset.FileURL}`
                      }
                      alt={asset.Shortcode}
                      className="w-full h-full object-contain"
                    />
                    <span className="text-[9px] text-discord-channel truncate max-w-full mt-0.5">
                      :{asset.Shortcode}:
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {(() => {
              const currentCat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
              if (!currentCat) return null;
              return (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-discord-channel mb-2">
                    {currentCat.name}
                  </div>
                  <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                    {currentCat.emojis.map((item, idx) => (
                      <button
                        key={`${item.emoji}-${idx}`}
                        onClick={() => handleEmojiClick(item.emoji, item)}
                        onMouseEnter={() => setHoveredEmoji(item)}
                        className="aspect-square flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-transform hover:scale-125 active:scale-95"
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Footer Preview Bar (Shows hovered emoji & name) */}
      <div className="h-10 px-3 bg-discord-dark/80 border-t border-white/5 flex items-center justify-between">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2">
            <span className="text-xl">{hoveredEmoji.emoji}</span>
            <span className="text-xs text-discord-white font-medium capitalize truncate max-w-[200px]">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-discord-channel italic">
            Pasa el cursor o toca un emoji para previsualizar
          </span>
        )}

        <span className="text-[10px] text-discord-channel/70">
          Echo Emojis
        </span>
      </div>
    </div>
  );
};
