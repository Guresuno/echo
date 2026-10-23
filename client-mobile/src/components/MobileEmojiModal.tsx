import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { X, Search } from 'lucide-react-native';

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: { emoji: string; name: string; keywords: string[] }[];
}

const MOBILE_EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Caritas y Gestos',
    icon: '😃',
    emojis: [
      { emoji: '😀', name: 'sonriente', keywords: ['feliz', 'risa'] },
      { emoji: '😃', name: 'ojos grandes', keywords: ['alegre'] },
      { emoji: '😄', name: 'ojos sonrientes', keywords: ['risa'] },
      { emoji: '😁', name: 'radiante', keywords: ['dientes'] },
      { emoji: '😆', name: 'riendo', keywords: ['lol', 'jaja'] },
      { emoji: '😅', name: 'sudor frio', keywords: ['nervioso'] },
      { emoji: '🤣', name: 'rodando de risa', keywords: ['morir de risa'] },
      { emoji: '😂', name: 'lagrimas de risa', keywords: ['chiste', 'jaja'] },
      { emoji: '🙂', name: 'ligeramente sonriente', keywords: ['bien'] },
      { emoji: '🙃', name: 'al revés', keywords: ['broma'] },
      { emoji: '😉', name: 'guiño', keywords: ['complice'] },
      { emoji: '😊', name: 'sonrojo', keywords: ['tierno'] },
      { emoji: '😇', name: 'angel', keywords: ['santo'] },
      { emoji: '🥰', name: 'enamorado', keywords: ['amor', 'love'] },
      { emoji: '😍', name: 'ojos de corazon', keywords: ['amor'] },
      { emoji: '🤩', name: 'deslumbrado', keywords: ['estrellas'] },
      { emoji: '😘', name: 'beso con corazon', keywords: ['beso'] },
      { emoji: '😗', name: 'beso', keywords: ['cariño'] },
      { emoji: '😋', name: 'saboreando', keywords: ['rico', 'yum'] },
      { emoji: '😛', name: 'lengua', keywords: ['broma'] },
      { emoji: '😜', name: 'guiño con lengua', keywords: ['locura'] },
      { emoji: '🤪', name: 'alocado', keywords: ['crazy'] },
      { emoji: '😝', name: 'lengua cerrada', keywords: ['risa'] },
      { emoji: '🤑', name: 'dinero', keywords: ['plata', 'dolar'] },
      { emoji: '🤗', name: 'abrazo', keywords: ['manos'] },
      { emoji: '🤭', name: 'ups', keywords: ['secreto'] },
      { emoji: '🤫', name: 'silencio', keywords: ['shh'] },
      { emoji: '🤔', name: 'pensando', keywords: ['duda'] },
      { emoji: '🤐', name: 'cremallera', keywords: ['callado'] },
      { emoji: '🤨', name: 'ceja levantada', keywords: ['sospecha'] },
      { emoji: '😐', name: 'neutral', keywords: ['serio'] },
      { emoji: '😑', name: 'inexpresivo', keywords: ['aburrido'] },
      { emoji: '😶', name: 'sin boca', keywords: ['mudo'] },
      { emoji: '😏', name: 'picaro', keywords: ['coqueto'] },
      { emoji: '😒', name: 'descontento', keywords: ['molesto'] },
      { emoji: '🙄', name: 'ojos en blanco', keywords: ['harto'] },
      { emoji: '😬', name: 'mueca', keywords: ['incomodo'] },
      { emoji: '🤥', name: 'mentiroso', keywords: ['pinocho'] },
      { emoji: '😌', name: 'alivio', keywords: ['paz'] },
      { emoji: '😔', name: 'desanimado', keywords: ['triste'] },
      { emoji: '😪', name: 'somnoliento', keywords: ['sueño'] },
      { emoji: '🤤', name: 'babeando', keywords: ['antojo'] },
      { emoji: '😴', name: 'durmiendo', keywords: ['zzz'] },
      { emoji: '😷', name: 'mascarilla', keywords: ['enfermo'] },
      { emoji: '🤒', name: 'termometro', keywords: ['fiebre'] },
      { emoji: '🤕', name: 'vendaje', keywords: ['herido'] },
      { emoji: '🤢', name: 'nauseas', keywords: ['asco'] },
      { emoji: '🤮', name: 'vomito', keywords: ['asco'] },
      { emoji: '🥵', name: 'calor', keywords: ['ardiente'] },
      { emoji: '🥶', name: 'frio', keywords: ['congelado'] },
      { emoji: '🥴', name: 'aturdido', keywords: ['ebrio'] },
      { emoji: '😵', name: 'mareado', keywords: ['knockout'] },
      { emoji: '🤯', name: 'cabeza explota', keywords: ['impacto'] },
      { emoji: '🤠', name: 'vaquero', keywords: ['cowboy'] },
      { emoji: '🥳', name: 'fiesta', keywords: ['cumpleaños'] },
      { emoji: '😎', name: 'gafas de sol', keywords: ['cool', 'pro'] },
      { emoji: '🤓', name: 'nerd', keywords: ['gafas'] },
      { emoji: '🧐', name: 'monoculo', keywords: ['elegante'] },
      { emoji: '😕', name: 'confundido', keywords: ['que'] },
      { emoji: '😟', name: 'preocupado', keywords: ['ansiedad'] },
      { emoji: '🙁', name: 'triste', keywords: ['pena'] },
      { emoji: '☹️', name: 'muy triste', keywords: ['tristeza'] },
      { emoji: '😮', name: 'sorpresa', keywords: ['wow'] },
      { emoji: '😯', name: 'sorprendido', keywords: ['oh'] },
      { emoji: '😲', name: 'atonito', keywords: ['shock'] },
      { emoji: '😳', name: 'sonrojado', keywords: ['verguenza'] },
      { emoji: '🥺', name: 'rogando', keywords: ['ojitos'] },
      { emoji: '😦', name: 'ceño fruncido', keywords: ['miedo'] },
      { emoji: '😨', name: 'miedo', keywords: ['susto'] },
      { emoji: '😰', name: 'ansiedad sudor', keywords: ['nervios'] },
      { emoji: '😥', name: 'aliviado', keywords: ['casi'] },
      { emoji: '😢', name: 'llorando', keywords: ['lagrima'] },
      { emoji: '😭', name: 'desconsolado', keywords: ['llorar', 'pena'] },
      { emoji: '😱', name: 'grito', keywords: ['terror'] },
      { emoji: '😖', name: 'frustrado', keywords: ['rabia'] },
      { emoji: '😣', name: 'desesperado', keywords: ['dolor'] },
      { emoji: '😞', name: 'decepcionado', keywords: ['decepcion'] },
      { emoji: '😓', name: 'cansado sudor', keywords: ['agotado'] },
      { emoji: '😩', name: 'cansado', keywords: ['basta'] },
      { emoji: '😫', name: 'fatiga', keywords: ['agotado'] },
      { emoji: '🥱', name: 'bostezo', keywords: ['aburrido'] },
      { emoji: '😤', name: 'furia vapor', keywords: ['enojo'] },
      { emoji: '😡', name: 'enfurecido', keywords: ['rabia', 'rojo'] },
      { emoji: '😠', name: 'enfadado', keywords: ['molesto'] },
      { emoji: '🤬', name: 'groseria', keywords: ['insulto'] },
      { emoji: '💀', name: 'calavera', keywords: ['muerto'] },
      { emoji: '☠️', name: 'peligro', keywords: ['pirata'] },
      { emoji: '💩', name: 'popó', keywords: ['mierda', 'caca'] },
      { emoji: '🤡', name: 'payaso', keywords: ['clown'] },
      { emoji: '👻', name: 'fantasma', keywords: ['halloween'] },
      { emoji: '👽', name: 'alien', keywords: ['ovni'] },
      { emoji: '👾', name: 'pixel monster', keywords: ['gamer'] },
      { emoji: '🤖', name: 'robot', keywords: ['bot'] },
      { emoji: '👋', name: 'saludo', keywords: ['hola', 'adios'] },
      { emoji: '🤚', name: 'mano levantada', keywords: ['alto'] },
      { emoji: '🖐️', name: 'mano abierta', keywords: ['cinco'] },
      { emoji: '✋', name: 'stop', keywords: ['parar'] },
      { emoji: '👌', name: 'ok', keywords: ['bien', 'perfecto'] },
      { emoji: '🤏', name: 'poco', keywords: ['pequeño'] },
      { emoji: '✌️', name: 'paz', keywords: ['victoria'] },
      { emoji: '🤞', name: 'suerte', keywords: ['esperanza'] },
      { emoji: '🫰', name: 'chasquido', keywords: ['kpop'] },
      { emoji: '🤟', name: 'te quiero', keywords: ['amor'] },
      { emoji: '🤘', name: 'rock', keywords: ['metal'] },
      { emoji: '🤙', name: 'shaka', keywords: ['llamame'] },
      { emoji: '👈', name: 'apuntar izquierda', keywords: ['aqui'] },
      { emoji: '👉', name: 'apuntar derecha', keywords: ['mira'] },
      { emoji: '👆', name: 'apuntar arriba', keywords: ['arriba'] },
      { emoji: '👇', name: 'apuntar abajo', keywords: ['abajo'] },
      { emoji: '👍', name: 'pulgar arriba', keywords: ['like', 'si'] },
      { emoji: '👎', name: 'pulgar abajo', keywords: ['dislike', 'no'] },
      { emoji: '✊', name: 'puño fuerza', keywords: ['poder'] },
      { emoji: '👊', name: 'puño choque', keywords: ['golpe'] },
      { emoji: '👏', name: 'aplausos', keywords: ['bravo'] },
      { emoji: '🙌', name: 'celebracion', keywords: ['manos'] },
      { emoji: '🫶', name: 'manos corazon', keywords: ['amor'] },
      { emoji: '🤝', name: 'apreton manos', keywords: ['acuerdo'] },
      { emoji: '🙏', name: 'rezar', keywords: ['gracias', 'por favor'] },
      { emoji: '💪', name: 'musculo', keywords: ['fuerza', 'gym'] }
    ]
  },
  {
    id: 'animals',
    name: 'Animales y Plantas',
    icon: '🐶',
    emojis: [
      { emoji: '🐶', name: 'perro', keywords: ['perrito', 'mascota'] },
      { emoji: '🐱', name: 'gato', keywords: ['gatito', 'michi'] },
      { emoji: '🐭', name: 'raton', keywords: ['roedor'] },
      { emoji: '🐹', name: 'hamster', keywords: ['mascota'] },
      { emoji: '🐰', name: 'conejo', keywords: ['conejito'] },
      { emoji: '🦊', name: 'zorro', keywords: ['astuto'] },
      { emoji: '🐻', name: 'oso', keywords: ['peluche'] },
      { emoji: '🐼', name: 'panda', keywords: ['oso'] },
      { emoji: '🐨', name: 'koala', keywords: ['australia'] },
      { emoji: '🐯', name: 'tigre', keywords: ['felino'] },
      { emoji: '🦁', name: 'leon', keywords: ['rey'] },
      { emoji: '🐮', name: 'vaca', keywords: ['granja'] },
      { emoji: '🐷', name: 'cerdo', keywords: ['chancho'] },
      { emoji: '🐸', name: 'rana', keywords: ['sapo'] },
      { emoji: '🐵', name: 'mono', keywords: ['chango'] },
      { emoji: '🐔', name: 'pollo', keywords: ['gallina'] },
      { emoji: '🐧', name: 'pinguino', keywords: ['frio'] },
      { emoji: '🐦', name: 'pajaro', keywords: ['ave'] },
      { emoji: '🐤', name: 'pollito', keywords: ['bebe'] },
      { emoji: '🦆', name: 'pato', keywords: ['lago'] },
      { emoji: '🦅', name: 'aguila', keywords: ['cazador'] },
      { emoji: '🦉', name: 'buho', keywords: ['noche'] },
      { emoji: '🦇', name: 'murcielago', keywords: ['batman'] },
      { emoji: '🐺', name: 'lobo', keywords: ['luna'] },
      { emoji: '🐴', name: 'caballo', keywords: ['correr'] },
      { emoji: '🦄', name: 'unicornio', keywords: ['magia'] },
      { emoji: '🐝', name: 'abeja', keywords: ['miel'] },
      { emoji: '🐛', name: 'gusano', keywords: ['oruga'] },
      { emoji: '🦋', name: 'mariposa', keywords: ['alas'] },
      { emoji: '🐌', name: 'caracol', keywords: ['lento'] },
      { emoji: '🐞', name: 'mariquita', keywords: ['suerte'] },
      { emoji: '🐢', name: 'tortuga', keywords: ['lento'] },
      { emoji: '🐍', name: 'serpiente', keywords: ['veneno'] },
      { emoji: '🐙', name: 'pulpo', keywords: ['mar'] },
      { emoji: '🐬', name: 'delfin', keywords: ['mar'] },
      { emoji: '🐳', name: 'ballena', keywords: ['mar'] },
      { emoji: '🦈', name: 'tiburon', keywords: ['mar'] },
      { emoji: '🌹', name: 'rosa', keywords: ['flor', 'amor'] },
      { emoji: '🌻', name: 'girasol', keywords: ['sol'] },
      { emoji: '🌸', name: 'sakura', keywords: ['cerezo'] },
      { emoji: '🍀', name: 'trebol', keywords: ['suerte'] },
      { emoji: '🔥', name: 'fuego', keywords: ['llama', 'hot'] },
      { emoji: '✨', name: 'brillos', keywords: ['magia'] },
      { emoji: '⚡', name: 'rayo', keywords: ['electricidad'] },
      { emoji: '☀️', name: 'sol', keywords: ['dia', 'calor'] },
      { emoji: '🌙', name: 'luna', keywords: ['noche'] },
      { emoji: '⭐', name: 'estrella', keywords: ['brillo'] }
    ]
  },
  {
    id: 'food',
    name: 'Comida y Bebida',
    icon: '🍕',
    emojis: [
      { emoji: '🍏', name: 'manzana', keywords: ['fruta'] },
      { emoji: '🍌', name: 'platano', keywords: ['banana'] },
      { emoji: '🍉', name: 'sandia', keywords: ['fruta'] },
      { emoji: '🍇', name: 'uvas', keywords: ['fruta'] },
      { emoji: '🍓', name: 'fresa', keywords: ['dulce'] },
      { emoji: '🥑', name: 'aguacate', keywords: ['palta'] },
      { emoji: '🍔', name: 'hamburguesa', keywords: ['burger'] },
      { emoji: '🍟', name: 'papas fritas', keywords: ['fries'] },
      { emoji: '🍕', name: 'pizza', keywords: ['queso'] },
      { emoji: '🌭', name: 'hot dog', keywords: ['perro caliente'] },
      { emoji: '🌮', name: 'taco', keywords: ['mexicano'] },
      { emoji: '🌯', name: 'burrito', keywords: ['mexicano'] },
      { emoji: '🍜', name: 'ramen', keywords: ['fideos'] },
      { emoji: '🍣', name: 'sushi', keywords: ['japones'] },
      { emoji: '🍦', name: 'helado', keywords: ['postre'] },
      { emoji: '🍰', name: 'pastel', keywords: ['torta'] },
      { emoji: '🎂', name: 'cumpleaños', keywords: ['velas'] },
      { emoji: '🍩', name: 'dona', keywords: ['rosquilla'] },
      { emoji: '🍪', name: 'galleta', keywords: ['cookie'] },
      { emoji: '🍫', name: 'chocolate', keywords: ['dulce'] },
      { emoji: '🍿', name: 'palomitas', keywords: ['cine'] },
      { emoji: '☕', name: 'cafe', keywords: ['desayuno'] },
      { emoji: '🍺', name: 'cerveza', keywords: ['bar'] },
      { emoji: '🍻', name: 'brindis', keywords: ['fiesta'] },
      { emoji: '🍷', name: 'vino', keywords: ['copa'] }
    ]
  },
  {
    id: 'objects',
    name: 'Objetos y Símbolos',
    icon: '💡',
    emojis: [
      { emoji: '💡', name: 'idea', keywords: ['luz'] },
      { emoji: '📱', name: 'celular', keywords: ['telefono'] },
      { emoji: '💻', name: 'laptop', keywords: ['pc'] },
      { emoji: '🎮', name: 'gamer', keywords: ['consola'] },
      { emoji: '🎧', name: 'audifonos', keywords: ['musica'] },
      { emoji: '🎸', name: 'guitarra', keywords: ['rock'] },
      { emoji: '🏆', name: 'trofeo', keywords: ['campeon'] },
      { emoji: '🥇', name: 'oro', keywords: ['primero'] },
      { emoji: '💸', name: 'dinero', keywords: ['plata'] },
      { emoji: '💰', name: 'bolsa de plata', keywords: ['riqueza'] },
      { emoji: '💎', name: 'diamante', keywords: ['joya'] },
      { emoji: '🎁', name: 'regalo', keywords: ['sorpresa'] },
      { emoji: '🎉', name: 'fiesta', keywords: ['confeti'] },
      { emoji: '❤️', name: 'corazon rojo', keywords: ['amor', 'love'] },
      { emoji: '🧡', name: 'corazon naranja', keywords: ['amistad'] },
      { emoji: '💛', name: 'corazon amarillo', keywords: ['amigo'] },
      { emoji: '💚', name: 'corazon verde', keywords: ['esperanza'] },
      { emoji: '💙', name: 'corazon azul', keywords: ['paz'] },
      { emoji: '💜', name: 'corazon morado', keywords: ['magia'] },
      { emoji: '🖤', name: 'corazon negro', keywords: ['dark'] },
      { emoji: '🤍', name: 'corazon blanco', keywords: ['pureza'] },
      { emoji: '💔', name: 'corazon roto', keywords: ['tristeza'] },
      { emoji: '💯', name: 'cien', keywords: ['perfecto'] },
      { emoji: '⚠️', name: 'alerta', keywords: ['peligro'] },
      { emoji: '✅', name: 'check', keywords: ['correcto', 'si'] },
      { emoji: '❌', name: 'cruz', keywords: ['error', 'no'] }
    ]
  }
];

interface MobileEmojiModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const MobileEmojiModal: React.FC<MobileEmojiModalProps> = ({
  visible,
  onClose,
  onSelectEmoji,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('smileys');
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();
    const res: { emoji: string; name: string }[] = [];
    for (const cat of MOBILE_EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.emoji === q ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          res.push(item);
        }
      }
    }
    return res;
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Emojis y Expresiones</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <Search size={16} color="#949ba4" style={styles.searchIcon} />
            <TextInput
              placeholder="Buscar emoji (ej: risa, corazon, fuego)..."
              placeholderTextColor="#949ba4"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <X size={14} color="#949ba4" />
              </TouchableOpacity>
            )}
          </View>

          {/* Categories Tab */}
          {!searchResults && (
            <View style={styles.catTabs}>
              {MOBILE_EMOJI_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setActiveCategory(cat.id)}
                  style={[
                    styles.tabItem,
                    activeCategory === cat.id && styles.activeTabItem,
                  ]}
                >
                  <Text style={styles.tabIcon}>{cat.icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Emoji Grid */}
          <ScrollView style={styles.emojiScroll} contentContainerStyle={styles.emojiGrid}>
            {searchResults ? (
              searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No se encontraron emojis.</Text>
              ) : (
                searchResults.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.emoji}-${idx}`}
                    onPress={() => {
                      onSelectEmoji(item.emoji);
                      onClose();
                    }}
                    style={styles.emojiCell}
                  >
                    <Text style={styles.emojiText}>{item.emoji}</Text>
                  </TouchableOpacity>
                ))
              )
            ) : (
              (() => {
                const cur = MOBILE_EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
                if (!cur) return null;
                return cur.emojis.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.emoji}-${idx}`}
                    onPress={() => {
                      onSelectEmoji(item.emoji);
                      onClose();
                    }}
                    style={styles.emojiCell}
                  >
                    <Text style={styles.emojiText}>{item.emoji}</Text>
                  </TouchableOpacity>
                ));
              })()
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1f22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '65%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2d31',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 2,
  },
  catTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 8,
    marginBottom: 10,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: 'rgba(88, 101, 242, 0.25)',
  },
  tabIcon: {
    fontSize: 18,
  },
  emojiScroll: {
    maxHeight: 280,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiCell: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  emojiText: {
    fontSize: 22,
  },
  emptyText: {
    color: '#949ba4',
    textAlign: 'center',
    marginVertical: 20,
    width: '100%',
    fontSize: 13,
  },
});
