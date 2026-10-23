import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import {
  QrCode,
  Hash,
  Volume2,
  Send,
  Sparkles,
  Users,
  Mic,
} from 'lucide-react-native';
import { getMobileHardwareId, getMobilePlatformType } from './src/services/hardwareId';
import { QRScannerModal } from './src/components/QRScannerModal';
import { DeviceStatusBadge } from './src/components/DeviceStatusBadge';
import { SkiaAnimationStudio } from './src/components/SkiaAnimationStudio';

const API_BASE = 'http://192.168.10.213:8000';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  // Modals
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showStudio, setShowStudio] = useState(false);

  // Initialize and auto-login
  useEffect(() => {
    const init = async () => {
      try {
        const hwid = await getMobileHardwareId();
        const platform = getMobilePlatformType();

        // Try Auto-Login with backend
        const res = await fetch(`${API_BASE}/auth/auto-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            HardwareID: hwid,
            PlatformType: platform,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.User);
          setToken(data.AccessToken);
          loadServersAndChannels(data.AccessToken);
        } else {
          // Fallback login with demo user
          loginDemoUser(hwid, platform);
        }
      } catch {
        // Fallback demo user
        loginDemoUser('MOB-DEMO-123', 'ANDROID_PHONE');
      }
    };

    init();
  }, []);

  const loginDemoUser = async (hwid: string, platform: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Username: 'greco',
          Password: 'greco1234',
          HardwareID: hwid,
          PlatformType: platform,
          SetAsPrimary: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.User);
        setToken(data.AccessToken);
        loadServersAndChannels(data.AccessToken);
      }
    } catch (e) {
      console.warn('Demo login fallback:', e);
    }
  };

  const loadServersAndChannels = async (authToken: string) => {
    try {
      const srvRes = await fetch(`${API_BASE}/servers`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const srvs = await srvRes.json();
      if (srvs.length > 0) {
        const chanRes = await fetch(`${API_BASE}/servers/${srvs[0].ServerID}/channels`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const chans = await chanRes.json();
        setChannels(chans);
        if (chans.length > 0) {
          setActiveChannel(chans[0]);
          loadMessages(chans[0].ChannelID, authToken);
        }
      }
    } catch (e) {
      console.error('Failed to load servers:', e);
    }
  };

  const loadMessages = async (channelId: number, authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChannel) return;
    const text = inputText;
    setInputText('');

    try {
      const res = await fetch(`${API_BASE}/channels/${activeChannel.ChannelID}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Content: text, MessageType: 'DEFAULT' }),
      });
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      Alert.alert('Error', 'Fallo al enviar mensaje');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1f22" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.channelBadge}>
          <Hash size={18} color="#949ba4" />
          <Text style={styles.channelName}>{activeChannel?.Name || 'general'}</Text>
        </View>

        <View style={styles.topActions}>
          {/* QR Scanner for PC Login (Section 2.3) */}
          <TouchableOpacity
            onPress={() => setShowQRScanner(true)}
            style={styles.qrButton}
            title="Escanear QR de PC"
          >
            <QrCode size={18} color="#ffffff" />
            <Text style={styles.qrButtonText}>Escanear PC</Text>
          </TouchableOpacity>

          {/* Animation Studio Trigger (Section 5.2) */}
          <TouchableOpacity
            onPress={() => setShowStudio(true)}
            style={styles.studioButton}
            title="Estudio de Animación Móvil"
          >
            <Sparkles size={18} color="#5865F2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.MessageID.toString()}
        style={styles.chatList}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>
                {(item.SenderDisplayName || item.SenderName || 'U')[0]}
              </Text>
            </View>

            <View style={styles.messageContent}>
              <View style={styles.senderHeader}>
                <Text style={styles.senderName}>
                  {item.SenderDisplayName || item.SenderName}
                </Text>
                <DeviceStatusBadge
                  platforms={item.SenderActivePlatforms || ['MOBILE_GENERIC']}
                  status="online"
                  size={10}
                />
              </View>
              <Text style={styles.messageText}>{item.Content}</Text>
            </View>
          </View>
        )}
      />

      {/* Input Row */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.micBtn}>
          <Mic size={20} color="#949ba4" />
        </TouchableOpacity>

        <TextInput
          placeholder={`Enviar mensaje a #${activeChannel?.Name || 'general'}`}
          placeholderTextColor="#949ba4"
          value={inputText}
          onChangeText={setInputText}
          style={styles.input}
        />

        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* QR Scanner Modal (Section 2.3) */}
      {currentUser && (
        <QRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          apiBaseUrl={API_BASE}
          accessToken={token}
          currentUser={currentUser}
        />
      )}

      {/* Skia 2D Animation Studio Modal (Section 5.2) */}
      <SkiaAnimationStudio
        visible={showStudio}
        onClose={() => setShowStudio(false)}
        serverId={activeChannel?.ServerID || 1}
        apiBaseUrl={API_BASE}
        accessToken={token}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#313338',
  },
  topBar: {
    height: 52,
    backgroundColor: '#2b2d31',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5865F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qrButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  studioButton: {
    padding: 6,
    backgroundColor: 'rgba(88,101,242,0.15)',
    borderRadius: 12,
  },
  chatList: {
    flex: 1,
    padding: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageContent: {
    flex: 1,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  messageText: {
    color: '#dbdee1',
    fontSize: 13,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2d31',
    margin: 10,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  micBtn: {
    padding: 6,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  sendBtn: {
    backgroundColor: '#5865F2',
    padding: 8,
    borderRadius: 12,
  },
});
