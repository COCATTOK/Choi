// 성장: 주식처럼 쌓이며 오르는 성장 지수, 레벨, 습관의 선, 마음, 배지
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fmtDate } from '../lib/dates';
import {
  BADGES, CATS, INDEX_BASE, activeHabits, bestStreak, catOf, change, degreeMap, edges, fmtIdx, habitRate, habitStreak,
  indexSeries, isDone, level, scheduled, streak, totalChecks, type IndexPoint,
} from '../lib/model';
import { useStore } from '../store/Store';
import { Heat, MoodChart, StockChart } from '../ui/charts';
import { Medal, Segment, Sep, Sw, Tap, TrailAuto, useCountUp } from '../ui/kit';
import { Screen } from '../ui/shell';
import { C, S as T, num } from '../ui/theme';

const PERIODS = [
  { id: '1w', name: '1주', days: 7 },
  { id: '1m', name: '1개월', days: 30 },
  { id: '3m', name: '3개월', days: 90 },
  { id: '1y', name: '1년', days: 365 },
  { id: 'all', name: '전체', days: Infinity },
] as const;
type PeriodId = (typeof PERIODS)[number]['id'];

export default function Growth() {
  const { S } = useStore();
  return (
    <Screen eyebrow="성장" title="점이 모여 선이 되다" scrollProps={{ scrollEventThrottle: 16 }}>
      <Stock />
      <Level />
      <View style={st.stats}>
        {[['연속', streak(S)], ['최고', bestStreak(S)], ['점', S.dots.length], ['선', edges(S).length]].map(([k, v], i) => (
          <View key={k} style={[st.stat, i > 0 && st.statSep]}>
            <Text style={[st.statV, num]}>{v}</Text>
            <Text style={st.statK}>{k}</Text>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: 28 }}>
        <Text style={{ color: C.text2, fontSize: 14 }}>{S.profile.identity ? `${S.profile.identity} 사람` : '되고 싶은 나'}에게 던진 표</Text>
        <Text style={[st.big, num]}>{totalChecks(S)}<Text style={{ fontSize: 18, color: C.muted }}> 표</Text></Text>
        <Text style={T.meta}>완벽할 필요는 없습니다. 과반이면 충분합니다.</Text>
      </View>
      <HabitLines />
      <Text style={T.section}>마음의 흐름</Text>
      <Text style={T.sectionDesc}>최근 30일</Text>
      <View style={T.groupPad}>
        <MoodChart S={S} />
        <Insight />
      </View>
      <Text style={T.section}>최근 12주</Text>
      <View style={T.groupPad}><Heat S={S} /></View>
      <Cats />
      <Hubs />
      <Badges />
    </Screen>
  );
}

function Stock() {
  const { S } = useStore();
  const [period, setPeriod] = useState<PeriodId>('1m');
  const [scrub, setScrub] = useState<IndexPoint | null>(null);
  const all = indexSeries(S);
  const per = PERIODS.find((p) => p.id === period)!;
  const ser = all.slice(-Math.min(all.length, per.days + 1));
  const first = ser[0];
  const last = ser[ser.length - 1];
  const p = scrub ?? last;
  const ch = change(first.v, p.v);
  const animated = useCountUp(last.v);
  const hiAll = Math.max(...all.map((q) => q.v));
  const ath = !scrub && last.g > 0 && last.v >= hiAll - 0.001;
  const label = scrub ? `${fmtDate(scrub.d)}${scrub.g ? ` · +${scrub.g} XP` : ''}` : per.id === 'all' ? '처음부터' : `지난 ${per.name}`;
  let run = 0;
  for (let i = all.length - 1; i > 0 && all[i].g > 0; i--) run++;
  const vs = ser.map((q) => q.v);
  return (
    <View>
      <Text style={{ color: C.muted, fontSize: 13, fontWeight: '500' }}>성장 지수</Text>
      <Text style={[st.value, num]}>{fmtIdx(scrub ? scrub.v : animated)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6, minHeight: 20 }}>
        <Text style={[{ fontSize: 14, fontWeight: '500', color: ch.dir === 'up' ? C.up : ch.dir === 'down' ? C.down : C.text2 }, num]}>{ch.text}</Text>
        <Text style={{ color: C.muted, fontSize: 14 }}>{label}</Text>
        {ath ? <View style={st.ath}><Text style={{ color: C.up, fontSize: 11, fontWeight: '600' }}>신고가</Text></View> : null}
      </View>
      <View style={{ marginTop: 20, marginHorizontal: -20 }}>
        <StockChart ser={ser} onScrub={setScrub} />
      </View>
      <View style={{ marginTop: 14 }}>
        <Segment items={PERIODS.map((q) => ({ id: q.id, name: q.name }))} value={period} onChange={setPeriod} />
      </View>
      <View style={st.kv}>
        {[
          ['기간 최고', fmtIdx(Math.max(...vs))], ['기간 최저', fmtIdx(Math.min(...vs))],
          ['역대 최고', fmtIdx(hiAll)], ['상승한 날', `${ser.slice(1).filter((q) => q.g > 0).length}일`],
          ['연속 상승', `${run}일`], ['시작', fmtIdx(INDEX_BASE)],
        ].map(([k, v]) => (
          <View key={k} style={st.kvRow}><Text style={T.meta}>{k}</Text><Text style={[{ color: C.text, fontSize: 13, fontWeight: '500' }, num]}>{v}</Text></View>
        ))}
      </View>
    </View>
  );
}

function Level() {
  const { S } = useStore();
  const lv = level(S);
  return (
    <View style={{ marginTop: 32 }}>
      <Text style={{ color: C.warm, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>LEVEL {lv.i + 1}</Text>
      <Text style={[st.big, { marginTop: 6 }]}>{lv.cur.name}</Text>
      <View style={st.bar}><View style={[st.barFill, { width: `${Math.round(lv.pct * 100)}%` }]} /></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[T.meta, { fontSize: 12 }, num]}>{lv.x} XP</Text>
        <Text style={[T.meta, { fontSize: 12 }, num]}>{lv.next ? `${lv.next.name}까지 ${lv.next.xp - lv.x}` : '최고 레벨'}</Text>
      </View>
    </View>
  );
}

function HabitLines() {
  const { S, openSheet } = useStore();
  const hs = activeHabits(S);
  return (
    <>
      <Text style={T.section}>습관의 선</Text>
      <Text style={T.sectionDesc}>이어간 날은 선이 되고, 빠진 날은 끊깁니다. 최근 21일.</Text>
      <View style={T.groupPad}>
        {!hs.length && <Text style={T.meta}>습관을 추가하면 여기에 선이 그려집니다.</Text>}
        {hs.map((h, i) => {
          const s = habitStreak(S, h);
          return (
            <Tap key={h.id} scale={0.98} onPress={() => openSheet({ kind: 'habitDetail', id: h.id })} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair2 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontSize: 14, flex: 1 }}>{h.name}</Text>
                <Text style={[{ color: C.muted, fontSize: 12 }, num]}>{s ? `${s}일 · ` : ''}{habitRate(S, h)}%</Text>
              </View>
              <TrailAuto S={S} habit={h} n={21} />
            </Tap>
          );
        })}
      </View>
    </>
  );
}

// 인사이트: 이 습관을 한 날 마음이 더 좋았어요
function Insight() {
  const { S } = useStore();
  let best: { name: string; diff: number } | null = null;
  for (const h of activeHabits(S)) {
    const on: number[] = [];
    const off: number[] = [];
    for (const day in S.moods) {
      if (!scheduled(h, day)) continue;
      (isDone(S, h, day) ? on : off).push(S.moods[day]);
    }
    if (on.length < 3 || off.length < 3) continue;
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const diff = avg(on) - avg(off);
    if (diff > 0.3 && (!best || diff > best.diff)) best = { name: h.name, diff };
  }
  if (!best) return null;
  return (
    <Text style={st.insight}>
      <Text style={{ color: C.text, fontWeight: '600' }}>{best.name}</Text>을(를) 한 날, 마음이 평균 <Text style={{ color: C.text, fontWeight: '600' }}>{best.diff.toFixed(1)}</Text>만큼 더 좋았습니다.
    </Text>
  );
}

function Cats() {
  const { S } = useStore();
  const ids = (cat: string) => new Set(S.habits.filter((h) => h.cat === cat).map((h) => h.id));
  const counts = CATS.map((c) => {
    const hs = ids(c.id);
    let n = S.dots.filter((d) => d.cat === c.id).length;
    for (const d in S.checks) for (const id of S.checks[d]) if (hs.has(id)) n++;
    return { c, n };
  });
  const max = Math.max(1, ...counts.map((x) => x.n));
  return (
    <>
      <Text style={T.section}>분야</Text>
      <View style={[T.groupPad, { gap: 12 }]}>
        {counts.map(({ c, n }) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 84, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Sw color={c.color} /><Text style={{ color: C.text2, fontSize: 13 }}>{c.name}</Text></View>
            <View style={{ flex: 1, height: 2, backgroundColor: C.hair, borderRadius: 1 }}><View style={{ width: `${(n / max) * 100}%`, height: 2, backgroundColor: C.text2, borderRadius: 1 }} /></View>
            <Text style={[{ width: 34, textAlign: 'right', color: C.text2, fontSize: 13 }, num]}>{n}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Hubs() {
  const { S, openSheet } = useStore();
  const deg = degreeMap(S);
  const hubs = [...S.dots].filter((d) => deg[d.id] > 0).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 5);
  return (
    <>
      <Text style={T.section}>가장 많이 이어진 점</Text>
      <View style={T.group}>
        {!hubs.length && <View style={T.row}><Text style={T.meta}>점을 찍을 때 과거의 점과 이어보세요.</Text></View>}
        {hubs.map((d, i) => (
          <Tap key={d.id} scale={0.985} style={T.row} onPress={() => openSheet({ kind: 'dotDetail', id: d.id })}>
            {i > 0 && <Sep />}
            <Sw color={catOf(d.cat).color} />
            <Text numberOfLines={1} style={[T.body, { flex: 1 }]}>{d.title}</Text>
            <Text style={T.meta}>선 {deg[d.id]}</Text>
          </Tap>
        ))}
      </View>
    </>
  );
}

function Badges() {
  const { S, openSheet } = useStore();
  const got = BADGES.filter((b) => S.badges[b.id]).length;
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={T.section}>배지</Text>
        <Text style={[T.meta, num]}>{got} / {BADGES.length}</Text>
      </View>
      <View style={st.badges}>
        {BADGES.map((b) => (
          <Tap key={b.id} onPress={() => openSheet({ kind: 'badge', id: b.id })} style={st.badge}>
            <Medal id={b.id} got={!!S.badges[b.id]} />
            <Text style={{ color: S.badges[b.id] ? C.text2 : C.muted, fontSize: 11 }}>{b.name}</Text>
          </Tap>
        ))}
      </View>
    </>
  );
}

const st = StyleSheet.create({
  value: { color: C.text, fontSize: 44, fontWeight: '300', letterSpacing: -1.8, marginTop: 6 },
  ath: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,91,91,0.12)' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, marginTop: 20 },
  kvRow: { width: '46%', flexGrow: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair2 },
  big: { color: C.text, fontSize: 44, fontWeight: '200', letterSpacing: -1.6 },
  bar: { height: 2, backgroundColor: C.hair, marginTop: 20, marginBottom: 10, borderRadius: 1 },
  barFill: { height: 2, backgroundColor: C.warm, borderRadius: 1 },
  stats: { flexDirection: 'row', marginTop: 28, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.hair2 },
  stat: { flex: 1, alignItems: 'center' },
  statSep: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.hair2 },
  statV: { color: C.text, fontSize: 24, fontWeight: '300' },
  statK: { color: C.muted, fontSize: 11 },
  insight: { marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair2, color: C.text2, fontSize: 13, lineHeight: 20 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20, paddingVertical: 8 },
  badge: { width: '25%', alignItems: 'center', gap: 8 },
});
