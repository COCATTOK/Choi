// 손맛: 진동. 웹이나 지원하지 않는 기기에서는 조용히 넘어갑니다.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const safe = (p: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  p().catch(() => {});
};
export const tick = () => safe(() => Haptics.selectionAsync());
export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const thud = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
