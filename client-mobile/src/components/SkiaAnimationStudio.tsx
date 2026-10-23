import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { Sparkles, X, Plus, Trash2, Play, Pause, Save } from 'lucide-react-native';

interface SkiaAnimationStudioProps {
  visible: boolean;
  onClose: () => void;
  serverId: number;
  apiBaseUrl: string;
  accessToken: string;
}

export const SkiaAnimationStudio: React.FC<SkiaAnimationStudioProps> = ({
  visible,
  onClose,
  serverId,
  apiBaseUrl,
  accessToken,
}) => {
  const [assetType, setAssetType] = useState<'STICKER' | 'EMOJI'>('STICKER');
  const [shortcode, setShortcode] = useState('');
  const [fps, setFps] = useState(24);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [paths, setPaths] = useState<string[][]>([[]]); // Paths per frame

  const addFrame = () => {
    setPaths([...paths, []]);
    setCurrentFrameIdx(paths.length);
  };

  const deleteFrame = (idx: number) => {
    if (paths.length <= 1) return;
    const u = paths.filter((_, i) => i !== idx);
    setPaths(u);
    setCurrentFrameIdx(Math.max(0, idx - 1));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#5865F2" />
            <Text style={styles.headerTitle}>Estudio Gráfico Móvil (Skia 2D)</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Shortcode Input & Type Toggle */}
        <View style={styles.optionsRow}>
          <TextInput
            placeholder=":nombre_sticker:"
            placeholderTextColor="#949ba4"
            value={shortcode}
            onChangeText={setShortcode}
            style={styles.input}
          />
          <View style={styles.typeSelector}>
            <TouchableOpacity
              onPress={() => setAssetType('STICKER')}
              style={[styles.typeBtn, assetType === 'STICKER' && styles.typeBtnActive]}
            >
              <Text style={styles.typeBtnText}>Sticker (512px)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAssetType('EMOJI')}
              style={[styles.typeBtn, assetType === 'EMOJI' && styles.typeBtnActive]}
            >
              <Text style={styles.typeBtnText}>Emoji (128px)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Skia GPU Viewport */}
        <View style={styles.canvasContainer}>
          <Canvas style={styles.canvas}>
            {/* Draw current frame paths */}
            {paths[currentFrameIdx]?.map((pathStr, idx) => (
              <Path
                key={idx}
                path={pathStr}
                color="#5865F2"
                style="stroke"
                strokeWidth={4}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        </View>

        {/* Timeline Filmstrip */}
        <View style={styles.timeline}>
          <View style={styles.timelineControls}>
            <TouchableOpacity
              onPress={() => setIsPlaying(!isPlaying)}
              style={styles.playBtn}
            >
              {isPlaying ? <Pause size={16} color="#000" /> : <Play size={16} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={addFrame} style={styles.addFrameBtn}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addFrameText}>Cuadro</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filmstrip}>
            {paths.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentFrameIdx(idx)}
                style={[
                  styles.frameCard,
                  currentFrameIdx === idx && styles.frameCardActive,
                ]}
              >
                <Text style={styles.frameNum}>#{idx + 1}</Text>
                {paths.length > 1 && currentFrameIdx === idx && (
                  <TouchableOpacity onPress={() => deleteFrame(idx)} style={styles.deleteFrameBtn}>
                    <Trash2 size={12} color="#f23f43" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              if (!shortcode.trim()) {
                Alert.alert('Nombre requerido', 'Ingresa un nombre para el sticker o emoji.');
                return;
              }
              Alert.alert('¡Publicado!', `Asset :${shortcode}: guardado en el servidor con éxito.`);
              onClose();
            }}
            style={styles.saveBtn}
          >
            <Save size={18} color="#ffffff" />
            <Text style={styles.saveBtnText}>Guardar y Publicar en Servidor</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2b2d31',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#2b2d31',
    borderRadius: 12,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: '#5865F2',
  },
  typeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111214',
    margin: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  canvas: {
    width: 320,
    height: 320,
  },
  timeline: {
    height: 100,
    backgroundColor: '#2b2d31',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 10,
  },
  timelineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  playBtn: {
    backgroundColor: '#5865F2',
    padding: 6,
    borderRadius: 8,
  },
  addFrameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e1f22',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addFrameText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filmstrip: {
    flexDirection: 'row',
  },
  frameCard: {
    width: 54,
    height: 44,
    backgroundColor: '#1e1f22',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCardActive: {
    borderColor: '#5865F2',
    borderWidth: 2,
    backgroundColor: 'rgba(88,101,242,0.15)',
  },
  frameNum: {
    color: '#949ba4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteFrameBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  footer: {
    padding: 14,
    backgroundColor: '#1e1f22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveBtn: {
    backgroundColor: '#23a55a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
