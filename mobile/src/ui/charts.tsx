// 차트: 시세판 스파크라인, 주식 차트(손가락으로 훑기), 마음 흐름, 12주 점 지도, 별자리
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polyline, Stop, Text as SvgText } from 'react-native-svg';
import { addDays, fmtShort, hash, shift, today, ymd } from '../lib/dates';
import { MOODS, catOf, degreeMap, edges, sortedDots, type IndexPoint, type State } from '../lib/model';
import { tick } from './feel';
import { C, font } from './theme';

const useWidth = (initial = 320) => {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
};

export function Sparkline({ ser, w, h, color }: { ser: IndexPoint[]; w: number; h: number; color: string }) {
  if (ser.length < 2) return <Svg width={w} height={h}><Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth={1.5} /></Svg>;
  const vs = ser.map((p) => p.v);
  const lo = Math.min(...vs);
  const span = Math.max(...vs) - lo || 1;
  const pts = ser.map((p, i) => `${((i / (ser.length - 1)) * w).toFixed(1)},${(h - 2 - ((p.v - lo) / span) * (h - 4)).toFixed(1)}`).join(' ');
  return <Svg width={w} height={h}><Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" /></Svg>;
}

// 주식 차트: 손가락으로 훑으면 그날의 지수를 onScrub으로 알려줌
export function StockChart({ ser, onScrub }: { ser: IndexPoint[]; onScrub: (p: IndexPoint | null) => void }) {
  const [W, onLayout] = useWidth(390);
  const [idx, setIdx] = useState<number | null>(null);
  const H = 190, T = 14, B = 14, PR = 14;
  const n = ser.length;
  const first = ser[0];
  const last = ser[n - 1];
  const up = last.v >= first.v;
  const color = up ? C.up : C.down;
  const vs = ser.map((p) => p.v);
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
  const padY = (hi - lo) * 0.12;
  lo -= padY; hi += padY;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * (W - PR));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const d = ser.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(p.v).toFixed(2)}`).join(' ');

  const pick = (px: number) => {
    const i = Math.max(0, Math.min(n - 1, Math.round((px / (W - PR)) * (n - 1))));
    if (i !== idx) tick();
    setIdx(i);
    onScrub(ser[i]);
  };
  const end = () => {
    setIdx(null);
    onScrub(null);
  };

  return (
    <View onLayout={onLayout} style={{ height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={0} x2={W} y1={y(first.v)} y2={y(first.v)} stroke={C.hair2} strokeDasharray="2 4" />
        <Path d={`${d} L${x(n - 1)} ${H} L${x(0)} ${H} Z`} fill="url(#g)" />
        <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(n - 1)} cy={y(last.v)} r={3.5} fill={color} />
        {idx !== null && (
          <G>
            <Line x1={x(idx)} x2={x(idx)} y1={0} y2={H} stroke={C.text2} strokeWidth={1} />
            <Circle cx={x(idx)} cy={y(ser[idx].v)} r={4.5} fill={color} stroke={C.bg} strokeWidth={2} />
          </G>
        )}
      </Svg>
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderRelease={end}
        onResponderTerminate={end}
      />
    </View>
  );
}

export function MoodChart({ S }: { S: State }) {
  const [W, onLayout] = useWidth(300);
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(shift(today(), -i));
  const pts = days.map((d, i) => ({ d, i, v: S.moods[d] })).filter((p) => p.v);
  if (pts.length < 2) return <Text style={{ color: C.muted, fontSize: 13 }}>오늘 탭에서 마음을 기록하면 흐름이 보입니다.</Text>;
  const H = 140, L = 34, Rm = 8, T = 10, B = 20, iw = W - L - Rm, ih = H - T - B;
  const x = (i: number) => L + (i / 29) * iw;
  const y = (v: number) => T + ih - ((v - 1) / 4) * ih;
  let d = '';
  pts.forEach((p, k) => { d += `${k && pts[k - 1].i === p.i - 1 ? 'L' : 'M'}${x(p.i)} ${y(p.v)} `; });
  return (
    <View onLayout={onLayout}>
      <Svg width={W} height={H}>
        {MOODS.map((m) => (
          <G key={m.v}>
            <Line x1={L} x2={W - Rm} y1={y(m.v)} y2={y(m.v)} stroke={C.hair} />
            <SvgText x={L - 8} y={y(m.v) + 3} fill={C.muted} fontSize={10} fontFamily={font} textAnchor="end">{m.name}</SvgText>
          </G>
        ))}
        <SvgText x={L} y={H - 4} fill={C.muted} fontSize={10} fontFamily={font}>{fmtShort(days[0])}</SvgText>
        <SvgText x={W - Rm} y={H - 4} fill={C.muted} fontSize={10} fontFamily={font} textAnchor="end">오늘</SvgText>
        <Path d={d} stroke={C.text} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        {pts.map((p) => <Circle key={p.d} cx={x(p.i)} cy={y(p.v)} r={3} fill={C.text} stroke={C.surface} strokeWidth={2} />)}
      </Svg>
    </View>
  );
}

// 최근 12주: 기록이 많을수록 크고 밝은 점
export function Heat({ S }: { S: State }) {
  const [W, onLayout] = useWidth(300);
  const count: Record<string, number> = {};
  for (const d of S.dots) count[d.date] = (count[d.date] ?? 0) + 1;
  for (const d in S.checks) count[d] = (count[d] ?? 0) + S.checks[d].length;
  const now = new Date();
  const endSat = addDays(now, 6 - now.getDay());
  const start = addDays(endSat, -12 * 7 + 1);
  const L = 18, T = 16;
  const cell = (W - L) / 12;
  const H = T + 7 * cell;
  const lvl = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3);
  const op = [0, 0.3, 0.6, 1];
  const rad = [1.2, 4, 5.5, 7].map((r) => (r * cell) / 22);
  const out: ReactElement[] = [];
  let lastMonth = -1;
  for (let w = 0; w < 12; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const day = addDays(start, w * 7 + dow);
      const cx = L + w * cell + cell / 2, cy = T + dow * cell + cell / 2;
      if (dow === 0 && day.getMonth() !== lastMonth) {
        lastMonth = day.getMonth();
        out.push(<SvgText key={'m' + w} x={cx - 4} y={9} fill={C.muted} fontSize={9} fontFamily={font}>{`${day.getMonth() + 1}월`}</SvgText>);
      }
      const key = ymd(day);
      if (key > today()) continue;
      const k = lvl(count[key] ?? 0);
      out.push(<Circle key={key} cx={cx} cy={cy} r={rad[k]} fill={k ? C.text : C.hair2} fillOpacity={k ? op[k] : 1} />);
    }
  }
  ['', '월', '', '수', '', '금', ''].forEach((t, i) => t && out.push(<SvgText key={'d' + i} x={0} y={T + i * cell + cell / 2 + 3.5} fill={C.muted} fontSize={9} fontFamily={font}>{t}</SvgText>));
  return <View onLayout={onLayout}><Svg width={W} height={H}>{out}</Svg></View>;
}

// 별자리: 가운데서 바깥으로 자라는 나선 위에 시간 순으로 점, 이은 점은 선으로
export function Constellation({ S, onPick, fresh }: { S: State; onPick: (id: string) => void; fresh?: string | null }) {
  const [W, onLayout] = useWidth(390);
  const list = sortedDots(S);
  const pos: Record<string, { x: number; y: number }> = {};
  let theta = 2.2;
  for (const d of list) {
    const r = 4.2 * theta;
    const j = hash(d.id);
    pos[d.id] = { x: r * Math.cos(theta) + ((j % 100) / 100 - 0.5) * 6, y: r * Math.sin(theta) + (((j >>> 7) % 100) / 100 - 0.5) * 6 };
    theta += 24 / Math.max(r, 8);
  }
  let R = 60;
  for (const id in pos) R = Math.max(R, Math.hypot(pos[id].x, pos[id].y) + 16);
  const VW = R * 2, VH = VW * 1.1;
  const H = W * 1.1;
  const k = W / VW; // 화면 좌표로 변환
  const X = (v: number) => (v + R) * k;
  const Y = (v: number) => (v + VH / 2) * k;
  const deg = degreeMap(S);
  const stars = Array.from({ length: 45 }, (_, i) => {
    const h = hash('bg' + i);
    return { x: (h % 1000) / 1000, y: ((h >>> 10) % 1000) / 1000, r: 0.4 + ((h >>> 20) % 10) / 12, o: 0.12 + ((h >>> 4) % 10) / 40 };
  });
  const labels = new Set<string>(list.length ? [list[list.length - 1].id] : []);
  [...list].filter((d) => deg[d.id] >= 2).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 3).forEach((d) => labels.add(d.id));
  const placed: { x: number; y: number }[] = [];
  return (
    <View onLayout={onLayout} style={{ height: H, marginHorizontal: -20 }}>
      <Svg width={W} height={H}>
        {stars.map((s, i) => <Circle key={i} cx={s.x * W} cy={s.y * H} r={s.r} fill="#fff" opacity={s.o} />)}
        {list.length > 1 && <Polyline points={list.map((d) => `${X(pos[d.id].x)},${Y(pos[d.id].y)}`).join(' ')} fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={0.6} strokeDasharray="3 4" />}
        {edges(S).map(([a, b]) => {
          const p = pos[a], q = pos[b];
          return <Path key={a + b} d={`M${X(p.x)} ${Y(p.y)} Q${X(((p.x + q.x) / 2) * 0.8)} ${Y(((p.y + q.y) / 2) * 0.8)} ${X(q.x)} ${Y(q.y)}`} stroke="#fff" strokeOpacity={a === fresh ? 0.7 : 0.3} strokeWidth={0.8} fill="none" />;
        })}
        {list.map((d) => {
          const r = (2.2 + Math.min(deg[d.id], 6) * 0.65) * k * (VW / 300);
          const c = catOf(d.cat).color;
          return (
            <G key={d.id} onPress={() => onPick(d.id)}>
              <Circle cx={X(pos[d.id].x)} cy={Y(pos[d.id].y)} r={r * 2.6} fill={c} opacity={0.16} />
              <Circle cx={X(pos[d.id].x)} cy={Y(pos[d.id].y)} r={d.id === fresh ? r * 1.3 : r} fill={c} />
              <Circle cx={X(pos[d.id].x)} cy={Y(pos[d.id].y)} r={Math.max(r * 2, 16)} fill="transparent" />
            </G>
          );
        })}
        {[...labels].map((id) => {
          const d = list.find((x) => x.id === id)!;
          const lx = X(pos[id].x), ly = Y(pos[id].y) - 14;
          if (placed.some((p) => Math.abs(p.x - lx) < 90 && Math.abs(p.y - ly) < 16)) return null;
          placed.push({ x: lx, y: ly });
          return <SvgText key={'t' + id} x={lx} y={ly} fill={C.text2} fontSize={11} fontFamily={font} textAnchor="middle">{d.title.length > 10 ? d.title.slice(0, 9) + '…' : d.title}</SvgText>;
        })}
      </Svg>
      {list.length === 0 && (
        <Pressable style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.text2, textAlign: 'center', lineHeight: 22 }}>{'특별한 경험을 점으로 찍으면\n이곳에 별이 생깁니다.'}</Text>
        </Pressable>
      )}
    </View>
  );
}
