// 화면 틀: 큰 제목 + 스크롤하면 나타나는 작은 제목, 끌어내려 닫는 시트, 되돌리기 토스트, 탭바
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useScrollToTop } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
  type GestureResponderEvent, type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/Store';
import { tick } from './feel';
import { Icon } from './kit';
import { C, PAD } from './theme';

export const TABBAR_H = 58;

// ── 화면 ─────────────────────────────
export function Screen({ eyebrow, title, right, children, scrollProps }: { eyebrow?: string; title: string; right?: ReactNode; children: ReactNode; scrollProps?: ScrollViewProps }) {
  const insets = useSafeAreaInsets();
  const y = useState(() => new Animated.Value(0))[0];
  const ref = useRef<ScrollView>(null);
  useScrollToTop(ref); // 같은 탭을 다시 누르면 맨 위로
  const bar = y.interpolate({ inputRange: [48, 72], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.ScrollView
        ref={ref as never}
        {...scrollProps}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: PAD, paddingBottom: TABBAR_H + insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={st.top}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={st.eyebrow}>{eyebrow}</Text> : null}
            <Text style={st.h1}>{title}</Text>
          </View>
          {right}
        </View>
        {children}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[st.minibar, { paddingTop: insets.top + 12, opacity: bar, transform: [{ translateY: bar.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
        <Text style={st.miniTitle}>{title}</Text>
      </Animated.View>
    </View>
  );
}

// ── 시트: 스프링으로 올라오고, 위쪽을 잡아 끌어내리면 닫힘 ──
const SheetCtx = createContext<{ dismiss: () => void }>({ dismiss: () => {} });
export const useSheet = () => useContext(SheetCtx);

export function SheetFrame({ children, onClosed }: { children: ReactNode; onClosed: () => void }) {
  const H = Dimensions.get('window').height;
  const insets = useSafeAreaInsets();
  const ty = useState(() => new Animated.Value(H))[0];
  const fade = useState(() => new Animated.Value(0))[0];
  const closing = useRef(false);
  useEffect(() => {
    Animated.parallel([
      Animated.spring(ty, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 260, mass: 1 }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [ty, fade]);
  const dismiss = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(ty, { toValue: H, duration: 240, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClosed());
  };
  // 드래그 중에는 다시 그리지 않도록 시작점을 ref에 담아둡니다 (이벤트 안에서만 읽고 씀)
  const dragRef = useRef({ on: false, y: 0, t: 0 });
  const grab = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => { dragRef.current = { on: true, y: e.nativeEvent.pageY, t: Date.now() }; },
    onResponderMove: (e: GestureResponderEvent) => { const d = dragRef.current; if (d.on) ty.setValue(Math.max(0, e.nativeEvent.pageY - d.y)); },
    onResponderRelease: (e: GestureResponderEvent) => {
      const d = dragRef.current;
      if (!d.on) return;
      d.on = false;
      const dy = e.nativeEvent.pageY - d.y;
      const v = dy / Math.max(1, Date.now() - d.t);
      if (dy > 110 || v > 0.8) dismiss();
      else Animated.spring(ty, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }).start();
    },
  };

  return (
    <SheetCtx.Provider value={{ dismiss }}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fade }]}>
          <Pressable style={{ flex: 1 }} onPress={dismiss} accessibilityLabel="닫기" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.sheetWrap} pointerEvents="box-none">
          <Animated.View style={[st.sheet, { maxHeight: H * 0.92, paddingBottom: insets.bottom + 24, transform: [{ translateY: ty }] }]}>
            <View {...grab} style={st.grab}>
              <View style={st.grip} />
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SheetCtx.Provider>
  );
}
// 시트 상단: 취소 · 제목 · 완료
export function SheetBar({ title, onDone, doneLabel = '완료' }: { title: string; onDone?: () => void; doneLabel?: string }) {
  const { dismiss } = useSheet();
  return (
    <View style={st.sheetBar}>
      <Pressable onPress={dismiss} hitSlop={10}><Text style={st.barBtn}>취소</Text></Pressable>
      <Text style={st.barTitle}>{title}</Text>
      {onDone ? <Pressable onPress={onDone} hitSlop={10}><Text style={[st.barBtn, { color: C.text, fontWeight: '600', textAlign: 'right' }]}>{doneLabel}</Text></Pressable> : <View style={{ width: 40 }} />}
    </View>
  );
}

// ── 토스트: 탭바 바로 위, 되돌리기 버튼 ──
export function ToastHost() {
  const { toasts, dropToast } = useStore();
  const insets = useSafeAreaInsets();
  const cur = toasts[0];
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!cur) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 220 }).start();
    const t = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => dropToast(cur.id));
    }, cur.action ? 4000 : toasts.length > 1 ? 1800 : 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id]);
  if (!cur) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[st.toastWrap, { bottom: TABBAR_H + insets.bottom + 14, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}
    >
      <View style={st.toast}>
        <Text style={st.toastText}>{cur.msg}</Text>
        {cur.action ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              cur.action!.run();
              dropToast(cur.id);
            }}
          >
            <Text style={st.toastAct}>{cur.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ── 탭바: 얇은 선 아이콘 ──
const TABS: Record<string, { label: string; icon: 'today' | 'sky' | 'growth' | 'me' }> = {
  index: { label: '오늘', icon: 'today' },
  sky: { label: '별자리', icon: 'sky' },
  growth: { label: '성장', icon: 'growth' },
  me: { label: '나', icon: 'me' },
};
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[st.tabbar, { paddingBottom: insets.bottom + 4 }]}>
      {state.routes.map((route, i) => {
        const t = TABS[route.name];
        if (!t) return null;
        const focused = state.index === i;
        const color = focused ? C.text : C.muted;
        return (
          <Pressable
            key={route.key}
            role="tab"
            aria-selected={focused}
            style={st.tab}
            onPress={() => {
              tick();
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Icon name={t.icon} color={color} />
            <Text style={[st.tabText, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingTop: 20, paddingBottom: 18 },
  eyebrow: { color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  h1: { color: C.text, fontSize: 30, fontWeight: '700', letterSpacing: -1 },
  minibar: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.92)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hair2 },
  miniTitle: { color: C.text, fontSize: 15, fontWeight: '600' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.sheet, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: PAD },
  grab: { paddingTop: 8, paddingBottom: 6, alignItems: 'center' },
  grip: { width: 36, height: 5, borderRadius: 3, backgroundColor: C.hair2 },
  sheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  barBtn: { color: C.text2, fontSize: 15, minWidth: 40 },
  barTitle: { color: C.text, fontSize: 16, fontWeight: '600' },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: '90%', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(44,44,46,0.96)' },
  toastText: { color: C.text, fontSize: 14, fontWeight: '500' },
  toastAct: { color: C.warm, fontSize: 14, fontWeight: '600' },
  tabbar: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair2 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  tabText: { fontSize: 10, fontWeight: '500' },
});
