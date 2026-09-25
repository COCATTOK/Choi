// 검정, 흰색, 그리고 얇은 선. 색은 분야를 나타내는 작은 점에만 씁니다.
import { Platform, StyleSheet } from 'react-native';

export const C = {
  bg: '#000000',
  surface: '#111113',
  surface2: '#1c1c1e',
  sheet: '#0b0b0c',
  hair: 'rgba(255,255,255,0.09)',
  hair2: 'rgba(255,255,255,0.16)',
  text: '#f5f5f7',
  text2: '#a1a1a6',
  muted: '#6e6e73',
  warm: '#e0c48f', // 연속 기록 · 레벨에만 아껴 쓰는 금빛
  up: '#ff5b5b', // 한국 주식 관례: 상승 빨강
  down: '#4d8dff', // 하락 파랑
  danger: '#ff453a',
};
export const R = 14;
export const PAD = 20;
export const font = Platform.select({ web: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif', default: undefined });
export const num = { fontVariant: ['tabular-nums' as const] };

export const S = StyleSheet.create({
  section: { marginTop: 32, marginBottom: 10, fontSize: 13, fontWeight: '600', color: C.muted },
  sectionDesc: { marginTop: -4, marginBottom: 10, fontSize: 13, color: C.muted },
  group: { backgroundColor: C.surface, borderRadius: R, overflow: 'hidden' },
  groupPad: { backgroundColor: C.surface, borderRadius: R, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 11, paddingHorizontal: 16 },
  sep: { position: 'absolute', top: 0, left: 16, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: C.hair2 },
  body: { fontSize: 15, color: C.text },
  meta: { fontSize: 13, color: C.muted },
  sw: { width: 7, height: 7, borderRadius: 4 },
});
