import { Platform, Dimensions } from 'react-native';
import * as Application from 'expo-application';

export type DevicePlatformType =
  | 'PC_DESKTOP'
  | 'TABLET_IPAD'
  | 'IOS_PHONE'
  | 'ANDROID_PHONE'
  | 'MOBILE_GENERIC'
  | 'CONSOLE';

export async function getMobileHardwareId(): Promise<string> {
  if (Platform.OS === 'android') {
    const androidId = Application.getAndroidId();
    return `AND-${androidId || 'GENERIC_ANDROID_ID'}`;
  } else if (Platform.OS === 'ios') {
    const iosId = await Application.getIosIdForVendorAsync();
    return `IOS-${iosId || 'GENERIC_IOS_ID'}`;
  }
  return `MOB-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
}

export function getMobilePlatformType(): DevicePlatformType {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  const isTablet = Platform.isPad || (Math.min(width, height) >= 600 && aspectRatio < 1.6);

  if (isTablet) {
    return 'TABLET_IPAD';
  }

  if (Platform.OS === 'ios') {
    return 'IOS_PHONE';
  }

  if (Platform.OS === 'android') {
    return 'ANDROID_PHONE';
  }

  return 'MOBILE_GENERIC';
}
