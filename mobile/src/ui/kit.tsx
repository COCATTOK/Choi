// 공통 부품: 눌리는 버튼, 아이콘, 링, 점-선, 칩, 배지 메달
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { trail, type Habit, type State } from '../lib/model';
import { tick } from './feel';
import { C, S as T } from './theme';

// 누르면 살짝 눌렸다 튕기는 버튼
// 바깥 배치(flex, width, margin 등)는 Pressable에, 모양은 안쪽 애니메이션 뷰에 줍니다.
const OUTER = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'position', 'top', 'left', 'right', 'bottom'] as const;
export function Tap({ style, children, scale = 0.96, haptic, onPress, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children?: ReactNode; scale?: number; haptic?: boolean }) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: v === 1 ? 10 : 0 }).start();
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const k in flat) {
    if ((OUTER as readonly string[]).includes(k)) outer[k] = flat[k];
    else inner[k] = flat[k];
  }
  if (outer.flex || outer.flexGrow || outer.width || outer.alignSelf === 'stretch') inner.flexGrow = 1;
  return (
    <Pressable
      {...rest}
      style={outer as ViewStyle}
      onPressIn={() => to(scale)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic) tick();
        onPress?.(e);
      }}
    >
      <Animated.View style={[inner as ViewStyle, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// 얇은 선 아이콘
type IconName = 'today' | 'sky' | 'growth' | 'me' | 'plus' | 'chev' | 'check';
export function Icon({ name, size = 24, color = C.text, width = 1.5 }: { name: IconName; size?: number; color?: string; width?: number }) {
  const p = { stroke: color, strokeWidth: width, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' && (<><Circle cx={12} cy={12} r={8.5} {...p} /><Circle cx={12} cy={12} r={2.2} fill={color} /></>)}
      {name === 'sky' && (<><Path d="M5 17 L10 9 L15 13 L19 6" {...p} />{[[5, 17], [10, 9], [15, 13], [19, 6]].map(([x, y]) => <Circle key={x} cx={x} cy={y} r={1.8} fill={color} />)}</>)}
      {name === 'growth' && (<><Path d="M4 19 H20" {...p} /><Path d="M6 15 L10 11 L13 13 L18 7" {...p} /><Path d="M14.5 7 H18 V10.5" {...p} /></>)}
      {name === 'me' && (<><Circle cx={12} cy={8.5} r={3.5} {...p} /><Path d="M5 19.5 C6.5 15.5 9 14.5 12 14.5 C15 14.5 17.5 15.5 19 19.5" {...p} /></>)}
      {name === 'plus' && <Path d="M12 5 V19 M5 12 H19" {...p} />}
      {name === 'chev' && <Path d="M9 5 L16 12 L9 19" {...p} />}
      {name === 'check' && <Path d="M5.5 12.5 L10 17 L18.5 7.5" {...p} />}
    </Svg>
  );
}

export const Sw = ({ color, size = 7 }: { color: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
);

// 진행 링
export function Ring({ pct, size, stroke, color = C.text, track = C.hair }: { pct: number; size: number; stroke: number; color?: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {pct > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - pct)} />}
    </Svg>
  );
}

// 습관의 점-선: 이어간 날은 선으로, 빠진 날은 끊김
export function Trail({ S, habit, n, w, hgt = 10, end }: { S: State; habit: Habit; n: number; w: number; hgt?: number; end?: string }) {
  return <TrailSvg points={trail(S, habit, n, end)} w={w} hgt={hgt} />;
}
// 부모 너비에 맞춰 늘어나는 점-선
export function TrailAuto({ S, habit, n, hgt = 14 }: { S: State; habit: Habit; n: number; hgt?: number }) {
  const [w, setW] = useState(0);
  return (
    <View style={{ height: hgt }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w > 0 ? <TrailSvg points={trail(S, habit, n)} w={w} hgt={hgt} /> : null}
    </View>
  );
}
export function TrailSvg({ points, w, hgt }: { points: ReturnType<typeof trail>; w: number; hgt: number }) {
  const step = w / points.length;
  const cy = hgt / 2;
  const r = Math.min(step * 0.22, hgt * 0.26);
  return (
    <Svg width={w} height={hgt}>
      {points.map((p, i) => {
        if (!p.joined) return null;
        let j = i - 1;
        while (j >= 0 && !points[j].on) j--;
        return <Line key={'l' + i} x1={step * j + step / 2} y1={cy} x2={step * i + step / 2} y2={cy} stroke={C.text} strokeOpacity={0.55} strokeWidth={1} />;
      })}
      {points.map((p, i) => {
        const x = step * i + step / 2;
        if (p.on) return <Circle key={i} cx={x} cy={cy} r={r} fill={C.text} />;
        if (p.sch) return <Circle key={i} cx={x} cy={cy} r={r * 0.75} fill="none" stroke={C.hair2} strokeWidth={1} />;
        return <Circle key={i} cx={x} cy={cy} r={r * 0.3} fill={C.hair2} />;
      })}
    </Svg>
  );
}

// 칩 / 세그먼트
export function Chips<T extends string>({ items, value, onChange, dots, scroll }: { items: { id: T; name: string; color?: string }[]; value: T; onChange: (v: T) => void; dots?: boolean; scroll?: boolean }) {
  return (
    <View style={[st.chips, scroll && { flexWrap: 'nowrap' }]}>
      {items.map((c) => {
        const on = c.id === value;
        return (
          <Tap key={c.id} haptic onPress={() => onChange(c.id)} style={[st.chip, on && st.chipOn]}>
            {dots && c.color ? <Sw color={c.color} /> : null}
            <Text style={[st.chipText, on && { color: '#000' }]}>{c.name}</Text>
          </Tap>
        );
      })}
    </View>
  );
}
export function Segment<T extends string>({ items, value, onChange }: { items: { id: T; name: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={st.segment}>
      {items.map((c) => (
        <Pressable key={c.id} onPress={() => { tick(); onChange(c.id); }} style={[st.segItem, c.id === value && st.segOn]}>
          <Text style={[st.chipText, { fontSize: 12 }, c.id === value && { color: C.text }]}>{c.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// 배지 아이콘은 모두 “점과 선”으로 그립니다 (24×24)
const G: Record<string, string> = {
  first_dot: '<circle class="f" cx="12" cy="12" r="3"/>',
  first_link: '<path d="M6 17 L18 7"/><circle class="f" cx="6" cy="17" r="2.2"/><circle class="f" cx="18" cy="7" r="2.2"/>',
  first_check: '<path d="M6 12.5 L10 16.5 L18 8"/>',
  perfect: '<circle cx="12" cy="12" r="8"/><circle class="f" cx="12" cy="12" r="3"/>',
  streak3: '<path d="M5 12 H19"/><circle class="f" cx="5" cy="12" r="2"/><circle class="f" cx="12" cy="12" r="2"/><circle class="f" cx="19" cy="12" r="2"/>',
  streak7: '<path d="M4 15 L8 11 L12 13 L16 8 L20 10"/><circle class="f" cx="20" cy="10" r="2"/>',
  streak30: '<circle cx="12" cy="12" r="8"/><path d="M12 4 V12 L17 15"/>',
  votes100: '<path d="M5 19 H19 M7 19 V11 M12 19 V6 M17 19 V9"/>',
  dots10: '<circle class="f" cx="6" cy="8" r="1.6"/><circle class="f" cx="12" cy="6" r="1.6"/><circle class="f" cx="18" cy="9" r="1.6"/><circle class="f" cx="8" cy="15" r="1.6"/><circle class="f" cx="15" cy="17" r="1.6"/>',
  hub: '<path d="M12 12 L5 6 M12 12 L19 6 M12 12 L4 15 M12 12 L20 16 M12 12 L12 20"/><circle class="f" cx="12" cy="12" r="2.6"/>',
  mood7: '<path d="M4 14 C7 8 10 8 12 12 C14 16 17 16 20 10"/>',
  constellation: '<path d="M5 17 L9 9 L15 12 L19 5"/><circle class="f" cx="5" cy="17" r="1.8"/><circle class="f" cx="9" cy="9" r="1.8"/><circle class="f" cx="15" cy="12" r="1.8"/><circle class="f" cx="19" cy="5" r="1.8"/>',
};
// 아이콘 문자열은 앱 시작 때 한 번만 해석해 둡니다 (그릴 때마다 해석하면 느림)
type Shape = { kind: 'path'; d: string } | { kind: 'circle'; cx: number; cy: number; r: number; fill: boolean };
const SHAPES: Record<string, Shape[]> = Object.fromEntries(
  Object.entries(G).map(([id, xml]) => [id, [...xml.matchAll(/<(path|circle)([^>]*)\/>/g)].map(([, tag, attrs]) => {
    const a = (k: string) => (attrs.match(new RegExp(`${k}="([^"]*)"`)) ?? [])[1] ?? '';
    return tag === 'path' ? { kind: 'path' as const, d: a('d') } : { kind: 'circle' as const, cx: +a('cx'), cy: +a('cy'), r: +a('r'), fill: attrs.includes('class="f"') };
  })]),
);
export const Medal = memo(function Medal({ id, got, size = 52 }: { id: string; got: boolean; size?: number }) {
  const color = got ? C.warm : C.muted;
  const s = size * 0.46;
  return (
    <View style={[st.medal, { width: size, height: size, borderRadius: size / 2, borderColor: got ? C.warm : C.hair2, opacity: got ? 1 : 0.45 }]}>
      <Svg width={s} height={s} viewBox="0 0 24 24">
        {(SHAPES[id] ?? SHAPES.first_dot).map((sh, k) => sh.kind === 'path'
          ? <Path key={k} d={sh.d} stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          : <Circle key={k} cx={sh.cx} cy={sh.cy} r={sh.r} fill={sh.fill ? color : 'none'} stroke={sh.fill ? 'none' : color} strokeWidth={1.4} />)}
      </Svg>
    </View>
  );
});

// 숫자가 차르르 올라가는 값
export function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const a = from.current;
    if (Math.abs(target - a) < 0.005) return setV(target);
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      const cur = a + (target - a) * (1 - Math.pow(1 - k, 3));
      setV(cur);
      from.current = cur;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// 첫 프레임을 먼저 보여주고, 무거운 부분은 다음 프레임에 그리기
export function useAfterFirstFrame() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOk(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ok;
}

export const Sep = () => <View style={T.sep} />;

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface2 },
  chipOn: { backgroundColor: C.text },
  chipText: { fontSize: 13, color: C.text2 },
  segment: { flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 10, padding: 2 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  segOn: { backgroundColor: '#636366' },
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
