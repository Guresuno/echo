import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Monitor, Tablet, Smartphone, Gamepad2 } from 'lucide-react-native';
import { DevicePlatformType } from '../services/hardwareId';

interface DeviceStatusBadgeProps {
  platforms?: DevicePlatformType[];
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  size?: number;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
  platforms = ['MOBILE_GENERIC'],
  status = 'online',
  size = 12,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#23a55a';
      case 'idle':
        return '#f0b232';
      case 'dnd':
        return '#f23f43';
      case 'offline':
      default:
        return '#80848e';
    }
  };

  const color = getStatusColor();

  const renderIcon = (platform: DevicePlatformType) => {
    switch (platform) {
      case 'PC_DESKTOP':
        return <Monitor size={size} color={color} />;
      case 'TABLET_IPAD':
        return <Tablet size={size} color={color} />;
      case 'CONSOLE':
        return <Gamepad2 size={size} color={color} />;
      case 'IOS_PHONE':
      case 'ANDROID_PHONE':
      case 'MOBILE_GENERIC':
      default:
        return <Smartphone size={size} color={color} />;
    }
  };

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.iconsRow}>
        {platforms.map((p, idx) => (
          <View key={`${p}-${idx}`} style={{ marginLeft: idx > 0 ? 2 : 0 }}>
            {renderIcon(p)}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,31,34,0.95)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 3,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
