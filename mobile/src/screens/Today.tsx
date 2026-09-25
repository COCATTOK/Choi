// 오늘: 열자마자 3초 안에 기록
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { DOW, agoText, dayDiff, fmtLong, hash, parse, shift, today, uid } from '../lib/dates';
import {
  MOODS, PROMPTS, QUOTES, TIMES, activeHabits, bestStreak, catOf, change, comebackGap, dayProgress, degreeMap, fmtIdx,
  forecast, habitStreak, indexSeries, isDone, nextGoal, nowSlot, scheduled, sortedDots, streak, type Habit,
} from '../lib/model';
import { useStore } from '../store/Store';
import { Sparkline } from '../ui/charts';
import { success, tap, tick } from '../ui/feel';
import { Icon, Medal, Ring, Sep, Sw, Tap, Trail, useCountUp } from '../ui/kit';
import { Screen } from '../ui/shell';
import { C, R, S as T, num } from '../ui/theme';

export default function Today() {
  const { S, selDay, setSelDay, openSheet, toast } = useStore();
  const h = new Date().getHours();
  const hello = h < 5 ? '늦은 밤입니다' : h < 11 ? '좋은 아침입니다' : h < 17 ? '좋은 오후입니다' : '좋은 저녁입니다';
  const days = streak(S);

  // 좌우로 밀어 어제/오늘 넘기기
  const slide = useState(() => new Animated.Value(0))[0];
  const [x0, setX0] = useState<{ x: number; y: number } | null>(null);
  const swipe = {
    onTouchStart: (e: GestureResponderEvent) => setX0({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }),
    onTouchEnd: (e: GestureResponderEvent) => {
      if (!x0) return;
      const dx = e.nativeEvent.pageX - x0.x;
      const dy = e.nativeEvent.pageY - x0.y;
      setX0(null);
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      const next = shift(selDay, dx < 0 ? 1 : -1);
      if (next > today() || dayDiff(next, today()) > 6) return;
      tick();
      setSelDay(next);
      slide.setValue(dx < 0 ? 24 : -24);
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }).start();
    },
  };

  return (
    <Screen
      eyebrow={S.profile.name ? `${hello}, ${S.profile.name}님` : fmtLong(today())}
      title="오늘"
      right={
        <View style={st.topRight}>
          {days ? (
            <Tap onPress={() => toast(`최고 ${bestStreak(S)}일 · 보호권 ${S.freezes}개`)}>
              <Text style={st.streak}><Text style={{ color: C.warm, fontWeight: '700' }}>{days}</Text>일 연속{S.freezes ? <Text style={{ color: C.warm, fontSize: 9 }}>{'  ' + '◆'.repeat(S.freezes)}</Text> : null}</Text>
            </Tap>
          ) : null}
          <Tap haptic style={st.iconBtn} onPress={() => openSheet({ kind: 'dot', date: selDay })} accessibilityLabel="오늘의 점 찍기">
            <Icon name="plus" size={18} />
          </Tap>
        </View>
      }
    >
      <View onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
        <Comeback />
        <Week />
        <Animated.View style={{ transform: [{ translateX: slide }] }}>
          <Hero />
        </Animated.View>
        <Ticker />
        <Goal />
        <Habits />
        <Tap onPress={() => openSheet({ kind: 'habit' })} style={{ alignSelf: 'center', padding: 10 }}>
          <Text style={{ color: C.muted, fontSize: 14 }}>습관 추가</Text>
        </Tap>
        <Moods />
        <Moments />
        <Lookback />
        <Text style={st.quote}>“{QUOTES[Math.abs(dayDiff('2026-01-01', today())) % QUOTES.length]}”</Text>
      </View>
    </Screen>
  );
}

function Comeback() {
  const { S } = useStore();
  const gap = comebackGap(S);
  if (!gap) return null;
  return (
    <View style={[st.card, { marginBottom: 22 }]}>
      <Text style={st.kWarm}>{gap}일 만이에요</Text>
      <Text style={st.cardTitle}>다시 오셨네요.</Text>
      <Text style={st.cardBody}>끊긴 선은 다시 이을 수 있습니다. 오늘은 가장 쉬운 습관 하나만 해볼까요?</Text>
    </View>
  );
}

function Week() {
  const { S, selDay, setSelDay } = useStore();
  const days = Array.from({ length: 7 }, (_, i) => shift(today(), i - 6));
  return (
    <View style={st.week}>
      {days.map((d) => {
        const p = dayProgress(S, d);
        const sel = d === selDay;
        const moment = S.dots.some((x) => x.date === d);
        return (
          <Tap key={d} onPress={() => { tick(); setSelDay(d); }} style={st.day} accessibilityLabel={`${fmtLong(d)} 습관 ${p.done}/${p.total}`}>
            <Text style={[st.dow, d === today() && { color: C.text }]}>{DOW[parse(d).getDay()]}</Text>
            <View style={{ width: 36, height: 36 }}>
              <Ring pct={p.pct} size={36} stroke={1.5} />
              <View style={[StyleSheet.absoluteFill, st.center]}>
                <View style={[st.dayNum, sel && { backgroundColor: C.text }]}>
                  <Text style={[st.dayText, sel && { color: '#000', fontWeight: '600' }]}>{parse(d).getDate()}</Text>
                </View>
              </View>
            </View>
            <View style={[st.mark, moment && { backgroundColor: C.text2 }]} />
          </Tap>
        );
      })}
    </View>
  );
}

// 오늘의 진행: 완료한 만큼 점이 채워지고, 채워진 점끼리 선으로
function Hero() {
  const { S, selDay } = useStore();
  const p = dayProgress(S, selDay);
  const isToday = selDay === today();
  const fill = useState(() => new Animated.Value(0))[0];
  const target = p.total > 1 && p.done > 1 ? (p.done - 1) / (p.total - 1) : 0;
  useEffect(() => {
    Animated.spring(fill, { toValue: target, useNativeDriver: false, damping: 20, stiffness: 120 }).start();
  }, [target, fill]);
  if (!p.total) {
    return (
      <View style={st.hero}>
        <Text style={st.count}>0</Text>
        <Text style={st.caption}>작은 습관 하나가 첫 번째 점이 됩니다.</Text>
      </View>
    );
  }
  const who = S.profile.identity ? `${S.profile.identity} 사람` : '되고 싶은 나';
  return (
    <View style={st.hero}>
      <Text style={st.count}>{p.done}<Text style={st.countSmall}> / {p.total}</Text></Text>
      <Text style={st.caption}>
        {p.done === p.total ? `${isToday ? '오늘의' : '이 날의'} 점이 모두 이어졌습니다.` : (
          <>
            {!isToday ? `${fmtLong(selDay)} · ` : ''}
            <Text style={{ color: C.text, fontWeight: '600' }}>{who}</Text>에게 {p.done}표.
          </>
        )}
      </Text>
      <View style={st.track}>
        <View style={st.trackBase} />
        <Animated.View style={[st.trackFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        {Array.from({ length: p.total }, (_, i) => {
          const on = i < p.done;
          const left = p.total === 1 ? 50 : (i / (p.total - 1)) * 100;
          return <View key={i} style={[st.tDot, { left: `${left}%` }, on && st.tDotOn]} />;
        })}
      </View>
    </View>
  );
}

// 오늘 탭의 작은 시세판
function Ticker() {
  const { S } = useStore();
  const ser = indexSeries(S);
  const last = ser[ser.length - 1];
  const prev = ser.length > 1 ? ser[ser.length - 2] : last;
  const ch = change(prev.v, last.v);
  const recent = ser.slice(-30);
  const color = recent[recent.length - 1].v >= recent[0].v ? C.up : C.down;
  const shown = useCountUp(last.v);
  const f = forecast(S);
  return (
    <Tap scale={0.98} onPress={() => router.navigate('/growth')} style={st.ticker} accessibilityLabel="성장 지수 보기">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>성장 지수</Text>
          <Text style={{ color: C.text2, fontSize: 13 }}>오늘</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}><Sparkline ser={recent} w={110} h={30} color={color} /></View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[{ color: C.text, fontSize: 16, fontWeight: '600' }, num]}>{fmtIdx(shown)}</Text>
          <Text style={[{ fontSize: 12, fontWeight: '500', color: ch.dir === 'up' ? C.up : ch.dir === 'down' ? C.down : C.text2 }, num]}>{ch.abs}</Text>
        </View>
      </View>
      <View style={st.cast}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: f.dir === 'up' ? C.up : f.dir === 'down' ? C.down : C.muted }}>{f.text}</Text>
      </View>
    </Tap>
  );
}

// 다음 목표: 가장 가까운 배지까지
function Goal() {
  const { S, openSheet } = useStore();
  const g = nextGoal(S);
  if (!g) return null;
  return (
    <Tap scale={0.98} onPress={() => openSheet({ kind: 'badge', id: g.b.id })} style={st.goal}>
      <Medal id={g.b.id} got={false} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.muted, fontSize: 11 }}>다음 목표</Text>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', marginTop: 1, marginBottom: 8 }}>{g.b.name}</Text>
        <View style={st.gBar}><View style={[st.gFill, { width: `${Math.round(g.r * 100)}%` }]} /></View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[{ color: C.text, fontSize: 18, fontWeight: '300' }, num]}>{g.target - g.cur}{g.b.unit}</Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>남음</Text>
      </View>
    </Tap>
  );
}

function Habits() {
  const { S } = useStore();
  const list = activeHabits(S);
  const { selDay } = useStore();
  if (!list.length) {
    return (
      <>
        <Text style={T.section}>습관</Text>
        <View style={[T.group, { padding: 24, alignItems: 'center' }]}><Text style={T.meta}>아직 습관이 없습니다.</Text></View>
      </>
    );
  }
  return (
    <>
      {TIMES.map((t) => {
        const hs = list.filter((h) => h.time === t.id);
        if (!hs.length) return null;
        const now = selDay === today() && t.id === nowSlot();
        return (
          <View key={t.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {now ? <Breathe /> : null}
              <Text style={[T.section, now && { color: C.text }]}>{now ? `지금 · ${t.name}` : t.name}</Text>
            </View>
            <View style={T.group}>
              {hs.map((h, i) => <HabitRow key={h.id} h={h} first={i === 0} />)}
            </View>
          </View>
        );
      })}
    </>
  );
}
function Breathe() {
  const a = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.35, duration: 1200, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, [a]);
  return <Animated.View style={[st.breathe, { opacity: a }]} />;
}

function HabitRow({ h, first }: { h: Habit; first: boolean }) {
  const { S, selDay, update, toast, openSheet } = useStore();
  const done = isDone(S, h, selDay);
  const sch = scheduled(h, selDay);
  const s = habitStreak(S, h);
  const pop = useState(() => new Animated.Value(1))[0];
  const toggle = () => {
    const wasDone = done;
    update((x) => {
      const l = x.checks[selDay] ?? [];
      x.checks[selDay] = wasDone ? l.filter((id) => id !== h.id) : [...l, h.id];
      if (!x.checks[selDay].length) delete x.checks[selDay];
    });
    if (!wasDone) {
      tap();
      pop.setValue(0.7);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 260 }).start();
      const p = dayProgress(S, selDay);
      if (p.total && p.done + 1 === p.total) {
        success();
        toast(selDay === today() ? '오늘의 점이 모두 이어졌습니다' : '이 날의 점이 모두 이어졌습니다');
      }
    }
  };
  return (
    <View style={[st.habit, !sch && { opacity: 0.4 }]}>
      {!first && <Sep />}
      <Tap onPress={toggle} scale={0.88} role="checkbox" aria-checked={done} accessibilityLabel={h.name} hitSlop={8}>
        <Animated.View style={[st.check, done && st.checkOn, { transform: [{ scale: pop }] }]}>
          {done ? <Icon name="check" size={16} color="#000" width={2.4} /> : null}
        </Animated.View>
      </Tap>
      <Tap scale={0.99} style={{ flex: 1 }} onPress={() => openSheet({ kind: 'habitDetail', id: h.id })}>
        <Text numberOfLines={1} style={[T.body, done && { color: C.muted }]}>{h.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Sw color={catOf(h.cat).color} />
          <Text style={{ color: C.muted, fontSize: 12 }}>{!sch ? '쉬는 날' : s ? `${s}일 연속` : catOf(h.cat).name}</Text>
        </View>
      </Tap>
      <Trail S={S} habit={h} n={7} w={70} end={selDay} />
    </View>
  );
}

function Moods() {
  const { S, selDay, update } = useStore();
  const cur = S.moods[selDay];
  return (
    <>
      <Text style={T.section}>마음</Text>
      <View style={st.moods}>
        {MOODS.map((m) => {
          const on = cur === m.v;
          const size = 6 + m.v * 2.4; // 좋을수록 큰 점
          return (
            <Tap key={m.v} haptic style={[st.mood, on && { backgroundColor: C.surface2 }]} onPress={() => update((x) => { if (x.moods[selDay] === m.v) delete x.moods[selDay]; else x.moods[selDay] = m.v; })} accessibilityLabel={m.name}>
              <View style={{ height: 18, justifyContent: 'center' }}><View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: on ? C.text : C.muted, opacity: on ? 1 : 0.5 }} /></View>
              <Text style={{ fontSize: 12, color: on ? C.text : C.muted }}>{m.name}</Text>
            </Tap>
          );
        })}
      </View>
    </>
  );
}

// 오늘의 점 + 빠른 기록 (쓰고 엔터)
function Moments() {
  const { S, selDay, update, openSheet, toast, setJustAdded } = useStore();
  const [text, setText] = useState('');
  const list = sortedDots(S).filter((d) => d.date === selDay);
  const deg = degreeMap(S);
  const q = PROMPTS[(parse(selDay).getDate() + parse(selDay).getMonth()) % PROMPTS.length];
  const submit = () => {
    const title = text.trim();
    if (!title) return;
    const id = uid();
    update((x) => { x.dots.push({ id, createdAt: Date.now(), title, note: '', cat: x.lastCat ?? 'learn', date: selDay, links: [] }); });
    setText('');
    tap();
    setJustAdded(id);
    toast('새로운 점', { label: '과거와 잇기', run: () => openSheet({ kind: 'dot', id }) });
  };
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={T.section}>오늘의 점</Text>
        <Text style={T.meta}>{list.length || ''}</Text>
      </View>
      <View style={T.group}>
        {list.map((d, i) => (
          <Tap key={d.id} scale={0.985} style={T.row} onPress={() => openSheet({ kind: 'dotDetail', id: d.id })}>
            {i > 0 && <Sep />}
            <Sw color={catOf(d.cat).color} />
            <Text numberOfLines={1} style={[T.body, { flex: 1 }]}>{d.title}</Text>
            {deg[d.id] ? <Text style={T.meta}>선 {deg[d.id]}</Text> : null}
            <Icon name="chev" size={14} color={C.muted} />
          </Tap>
        ))}
        <View style={[T.row, { paddingRight: 8 }]}>
          {list.length ? <Sep /> : null}
          <View style={st.qDot} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder={list.length ? '또 다른 점 찍기' : q}
            placeholderTextColor={C.muted}
            returnKeyType="done"
            maxLength={60}
            style={st.qInput}
            accessibilityLabel="오늘의 점 빠르게 찍기"
          />
          {text.trim() ? (
            <Tap haptic onPress={submit} style={st.qGo} accessibilityLabel="점 찍기"><Icon name="plus" size={16} color="#000" /></Tap>
          ) : (
            <Tap onPress={() => openSheet({ kind: 'dot', date: selDay, prompt: list.length ? undefined : q })} style={st.qMore} accessibilityLabel="자세히 쓰기"><Icon name="chev" size={14} color={C.muted} /></Tap>
          )}
        </View>
      </View>
    </>
  );
}

// 돌아보기: 과거의 점 하나를 꺼내 “오늘과 이어지나요?”
function Lookback() {
  const { S, update, openSheet, toast, setJustAdded } = useStore();
  const past = S.dots.filter((d) => dayDiff(d.date, today()) >= 3);
  if (!past.length) return null;
  const pick = past[hash(today()) % past.length];
  const link = () => {
    const todays = sortedDots(S).filter((d) => d.date === today());
    const t = todays[todays.length - 1];
    if (!t) return openSheet({ kind: 'dot', links: [pick.id], prompt: `“${pick.title}”에서 이어진 오늘의 경험은?` });
    if (t.links.includes(pick.id)) return toast('이미 이어져 있습니다');
    update((x) => { x.dots.find((d) => d.id === t.id)!.links.push(pick.id); });
    setJustAdded(t.id);
    toast('두 점을 이었습니다');
    router.navigate('/sky');
  };
  return (
    <View style={[st.card, { marginTop: 32, padding: 22 }]}>
      <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>돌아보기 · {agoText(pick.date)}</Text>
      <Text style={[st.cardTitle, { fontSize: 20 }]}>{pick.title}</Text>
      <Text style={st.cardBody}>이 점은 지금의 나와 이어져 있나요?</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        <Tap haptic onPress={link} style={[st.pill, { backgroundColor: C.text }]}><Text style={{ color: '#000', fontWeight: '600' }}>오늘과 잇기</Text></Tap>
        <Tap onPress={() => openSheet({ kind: 'dotDetail', id: pick.id })} style={st.pill}><Text style={{ color: C.text, fontWeight: '600' }}>보기</Text></Tap>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { color: C.text2, fontSize: 13, fontWeight: '600', padding: 4 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4 },
  day: { alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4 },
  dow: { color: C.muted, fontSize: 11, fontWeight: '500' },
  dayNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: C.text2, fontSize: 14, fontWeight: '500' },
  mark: { width: 3, height: 3, borderRadius: 2 },
  hero: { paddingTop: 28, paddingBottom: 8 },
  count: { color: C.text, fontSize: 56, fontWeight: '200', letterSpacing: -2 },
  countSmall: { color: C.muted, fontSize: 22, fontWeight: '300' },
  caption: { color: C.text2, fontSize: 14, marginTop: 10 },
  track: { height: 14, marginTop: 24, marginHorizontal: 5, justifyContent: 'center' },
  trackBase: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: C.hair2 },
  trackFill: { position: 'absolute', left: 0, height: 1.5, backgroundColor: C.text },
  tDot: { position: 'absolute', width: 7, height: 7, marginLeft: -3.5, borderRadius: 4, backgroundColor: C.bg, borderWidth: 1, borderColor: C.hair2 },
  tDotOn: { width: 9, height: 9, marginLeft: -4.5, borderRadius: 5, backgroundColor: C.text, borderColor: C.text },
  ticker: { marginTop: 28, padding: 16, borderRadius: R, backgroundColor: C.surface },
  cast: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hair2 },
  goal: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 16, borderRadius: R, backgroundColor: C.surface },
  gBar: { height: 2, borderRadius: 1, backgroundColor: C.hair },
  gFill: { height: 2, borderRadius: 1, backgroundColor: C.warm },
  breathe: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.warm, marginRight: 8, marginTop: 22 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.hair2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.text, borderColor: C.text },
  moods: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R, padding: 4, gap: 2 },
  mood: { flex: 1, alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 10, borderRadius: 10 },
  qDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: C.hair2 },
  qInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 6 },
  qGo: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' },
  qMore: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: R, padding: 20 },
  kWarm: { color: C.warm, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  cardTitle: { color: C.text, fontSize: 19, fontWeight: '600', letterSpacing: -0.4 },
  cardBody: { color: C.text2, fontSize: 14, marginTop: 6, lineHeight: 20 },
  pill: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: C.surface2 },
  quote: { color: C.muted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 44, lineHeight: 20, paddingHorizontal: 12 },
});
