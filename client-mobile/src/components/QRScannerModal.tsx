import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Monitor, ShieldCheck, X, Check } from 'lucide-react-native';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  accessToken: string;
  currentUser: { UserID: number; DisplayName: string; Username: string; AvatarURL?: string };
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  apiBaseUrl,
  accessToken,
  currentUser,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [trustDevice, setTrustDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'SCANNING' | 'CONFIRMING' | 'DONE'>('SCANNING');

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedToken || loading) return;

    // Pattern: miapp://qr-login/{qr_token}
    let token = data;
    if (data.includes('qr-login/')) {
      token = data.split('qr-login/')[1];
    }

    if (!token) return;

    setScannedToken(token);
    setLoading(true);

    try {
      // Step 2: Notify server that phone has scanned QR code
      const res = await fetch(`${apiBaseUrl}/auth/qr/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ qr_token: token }),
      });

      if (!res.ok) {
        throw new Error('El código QR es inválido o ha expirado.');
      }

      setStep('CONFIRMING');
    } catch (err: any) {
      Alert.alert('Error al escanear', err.message);
      setScannedToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!scannedToken) return;
    setLoading(true);

    try {
      // Step 3: Approve login with Hardware Trust Auto-login switch
      const res = await fetch(`${apiBaseUrl}/auth/qr/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          qr_token: scannedToken,
          trust_device: trustDevice,
        }),
      });

      if (!res.ok) {
        throw new Error('Fallo al autorizar el inicio de sesión.');
      }

      setStep('DONE');
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      Alert.alert('Error de Aprobación', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setScannedToken(null);
    setStep('SCANNING');
    setLoading(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Escanear Código QR de PC</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#dbdee1" />
            </TouchableOpacity>
          </View>

          {/* Scanner View */}
          {step === 'SCANNING' && (
            <View style={styles.cameraContainer}>
              {!permission?.granted ? (
                <View style={styles.permissionBox}>
                  <Text style={styles.permText}>Se requiere permiso para usar la cámara.</Text>
                  <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
                    <Text style={styles.grantBtnText}>Permitir Cámara</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                >
                  <View style={styles.scannerTarget}>
                    <View style={styles.scannerCorner} />
                  </View>
                </CameraView>
              )}

              <Text style={styles.hintText}>
                Apunta tu cámara hacia la pantalla de tu PC donde aparece el código QR de Echo.
              </Text>
            </View>
          )}

          {/* Confirmation Card (Section 2.3) */}
          {step === 'CONFIRMING' && (
            <View style={styles.confirmBox}>
              <View style={styles.pcIconBadge}>
                <Monitor size={36} color="#5865F2" />
              </View>

              <Text style={styles.confirmTitle}>¿Iniciar sesión en este equipo?</Text>
              <Text style={styles.confirmSubtitle}>
                Una computadora de escritorio ha solicitado inicio de sesión en tu cuenta.
              </Text>

              <View style={styles.userCard}>
                <Text style={styles.userName}>{currentUser.DisplayName}</Text>
                <Text style={styles.userHandle}>@{currentUser.Username}</Text>
              </View>

              {/* Trust Device Switch */}
              <View style={styles.trustSwitchRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.trustTitle}>Registrar como dispositivo habitual</Text>
                  <Text style={styles.trustDesc}>
                    Habilitará el auto-login instantáneo (Zero-Click) en esa PC sin volver a pedir contraseña.
                  </Text>
                </View>
                <Switch
                  value={trustDevice}
                  onValueChange={setTrustDevice}
                  trackColor={{ false: '#2b2d31', true: '#23a55a' }}
                  thumbColor="#ffffff"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={loading}
                  style={styles.approveBtn}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.approveText}>Aprobar e Iniciar Sesión</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Success State */}
          {step === 'DONE' && (
            <View style={styles.doneBox}>
              <View style={styles.doneCircle}>
                <Check size={40} color="#23a55a" />
              </View>
              <Text style={styles.doneTitle}>¡PC Conectada con Éxito!</Text>
              <Text style={styles.doneSubtitle}>Ya puedes usar Echo en tu computadora.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e1f22',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  cameraContainer: {
    alignItems: 'center',
    padding: 16,
  },
  camera: {
    width: 260,
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#5865F2',
    borderRadius: 16,
  },
  scannerCorner: {
    width: 20,
    height: 20,
    borderColor: '#ffffff',
  },
  permissionBox: {
    width: 260,
    height: 260,
    backgroundColor: '#2b2d31',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  permText: {
    color: '#dbdee1',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
  },
  grantBtn: {
    backgroundColor: '#5865F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  grantBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  hintText: {
    color: '#949ba4',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  confirmBox: {
    padding: 24,
    alignItems: 'center',
  },
  pcIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(88,101,242,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  confirmSubtitle: {
    color: '#949ba4',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
  },
  userCard: {
    width: '100%',
    backgroundColor: '#2b2d31',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userHandle: {
    color: '#949ba4',
    fontSize: 12,
    marginTop: 2,
  },
  trustSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b2d31',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  trustTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  trustDesc: {
    color: '#949ba4',
    fontSize: 10,
    marginTop: 3,
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2b2d31',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: '#dbdee1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  approveBtn: {
    flex: 2,
    backgroundColor: '#23a55a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  approveText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  doneBox: {
    padding: 36,
    alignItems: 'center',
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(35,165,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  doneTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneSubtitle: {
    color: '#949ba4',
    fontSize: 12,
    marginTop: 6,
  },
});
