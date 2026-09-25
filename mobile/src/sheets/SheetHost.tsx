// 모든 시트: 점 찍기/다듬기, 습관, 점 상세, 습관 상세, 배지, 백업 불러오기
import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { DOW, addDays, agoText, fmtDate, fmtShort, parse, shift, today, uid, ymd } from '../lib/dates';
import {
  BADGES, CATS, TEMPLATES, TIMES, catOf, dotById, habitBest, habitRate, habitStreak, isDone, neighbors, normalize,
  scheduled, sortedDots, timeOf, type CatId, type TimeId,
} from '../lib/model';
import { useAct, useS, useSheetReq, type SheetReq } from '../store/Store';
import { tap } from '../ui/feel';
import { Chips, Medal, Segment, Sep, Sw, Tap } from '../ui/kit';
import { SheetBar, SheetFrame, useSheet } from '../ui/shell';
import { C, S as T, num } from '../ui/theme';

export default function SheetHost() {
  const sheet = useSheetReq();
  const { closeSheet } = useAct();
  if (!sheet) return null;
  const key = JSON.stringify(sheet);
  return (
    <SheetFrame key={key} onClosed={closeSheet}>
      <Body req={sheet} />
    </SheetFrame>
  );
}

function Body({ req }: { req: SheetReq }) {
  switch (req.kind) {
    case 'dot': return <DotForm req={req} />;
    case 'habit': return <HabitForm id={req.id} />;
    case 'dotDetail': return <DotDetail id={req.id} />;
    case 'habitDetail': return <HabitDetail id={req.id} />;
    case 'badge': return <BadgeSheet id={req.id} />;
    case 'import': return <ImportSheet />;
  }
}

// ── 오늘의 점: 과거의 점과만 이을 수 있습니다 ──
function DotForm({ req }: { req: Extract<SheetReq, { kind: 'dot' }> }) {
  const S = useS();
  const { update, toast, setJustAdded } = useAct();
  const { dismiss } = useSheet();
  const editing = req.id ? dotById(S, req.id) : undefined;
  const [title, setTitle] = useState(editing?.title ?? req.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [cat, setCat] = useState<CatId>(editing?.cat ?? S.lastCat ?? 'learn');
  const [date, setDate] = useState(editing?.date ?? req.date ?? today());
  const [links, setLinks] = useState<Set<string>>(new Set(editing?.links ?? req.links ?? []));
  const [q, setQ] = useState('');
  const past = [...sortedDots(S)].reverse().filter((d) => d.id !== editing?.id && d.date <= date);
  const cands = q ? past.filter((d) => d.title.includes(q) || (d.note ?? '').includes(q)) : past;
  // 잇는 수고를 덜기: 지금 쓰는 제목과 비슷한 과거의 점을 위에 추천
  const words = (t: string) => new Set(t.split(/[\s,.·()~!?]+/).filter((w) => w.length >= 2));
  const mine = words(title);
  const score = (d: (typeof past)[number]) => (d.cat === cat ? 1 : 0) + [...words(d.title)].filter((w) => mine.has(w) || [...mine].some((m) => m.length >= 2 && (w.startsWith(m) || m.startsWith(w)))).length * 3;
  const suggested = !q && title.trim() ? past.map((d) => ({ d, s: score(d) })).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.d.id) : [];
  const ordered = [...cands.filter((d) => suggested.includes(d.id)), ...cands.filter((d) => !suggested.includes(d.id))];
  const save = () => {
    const t = title.trim();
    if (!t) return;
    const valid = [...links].filter((id) => (dotById(S, id)?.date ?? '9') <= date);
    const id = editing?.id ?? uid();
    update((x) => {
      x.lastCat = cat;
      const data = { title: t, note: note.trim(), cat, date, links: valid };
      const cur = x.dots.find((d) => d.id === id);
      if (cur) Object.assign(cur, data);
      else x.dots.push({ id, createdAt: Date.now(), ...data });
    });
    tap();
    if (!editing) {
      setJustAdded(id);
      toast(valid.length ? `점 하나, 선 ${valid.length}개` : '새로운 점');
      router.navigate('/sky');
    } else toast('저장했습니다');
    dismiss();
  };
  // 날짜는 최근 7일에서 고릅니다
  const days = Array.from({ length: 7 }, (_, i) => shift(today(), -i)).map((d) => ({ id: d, name: d === today() ? '오늘' : d === shift(today(), -1) ? '어제' : `${DOW[parse(d).getDay()]} ${fmtShort(d)}` }));
  if (!days.some((d) => d.id === date)) days.push({ id: date, name: fmtShort(date) });
  return (
    <>
      <SheetBar title={editing ? '점 다듬기' : '오늘의 점'} onDone={save} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
        <Text style={st.q}>{req.prompt ?? '무엇을 했나요?'}</Text>
        <View style={T.group}>
          <TextInput autoFocus={!editing} value={title} onChangeText={setTitle} placeholder="예) 서체 수업을 들었다" placeholderTextColor={C.muted} maxLength={60} style={st.big} returnKeyType="done" onSubmitEditing={save} />
          <View><Sep /><TextInput value={note} onChangeText={setNote} placeholder="메모" placeholderTextColor={C.muted} multiline maxLength={500} style={st.note} /></View>
        </View>
        <Text style={T.section}>분야</Text>
        <Chips items={CATS} value={cat} onChange={setCat} dots />
        <Text style={T.section}>날짜</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><Chips items={days} value={date} onChange={setDate} scroll /></ScrollView>
        {cands.length > 0 || q ? (
          <>
            <Text style={T.section}>과거의 점과 잇기</Text>
            <Text style={T.sectionDesc}>뒤돌아보니, 이 경험과 이어지는 점이 있나요?</Text>
            <View style={T.group}>
              <TextInput value={q} onChangeText={setQ} placeholder="검색" placeholderTextColor={C.muted} style={st.search} />
              {ordered.slice(0, 40).map((d) => {
                const on = links.has(d.id);
                return (
                  <Tap key={d.id} scale={0.99} style={T.row} onPress={() => { const n = new Set(links); if (on) n.delete(d.id); else n.add(d.id); setLinks(n); tap(); }}>
                    <Sep />
                    <View style={[st.tick, on && { backgroundColor: C.text, borderColor: C.text }]}>{on ? <View style={st.tickDot} /> : null}</View>
                    <Sw color={catOf(d.cat).color} />
                    <Text numberOfLines={1} style={[T.body, { flex: 1 }]}>{d.title}</Text>
                    {suggested.includes(d.id) ? <Text style={{ color: C.warm, fontSize: 11, fontWeight: '600' }}>비슷함</Text> : null}
                    <Text style={[T.meta, num]}>{fmtShort(d.date)}</Text>
                  </Tap>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

// ── 습관 ──
function HabitForm({ id }: { id?: string }) {
  const S = useS();
  const { update, undoable, toast } = useAct();
  const { dismiss } = useSheet();
  const h = id ? S.habits.find((x) => x.id === id) : undefined;
  const [name, setName] = useState(h?.name ?? '');
  const [emoji, setEmoji] = useState(h?.emoji ?? '');
  const [cat, setCat] = useState<CatId>(h?.cat ?? 'learn');
  const [time, setTime] = useState<TimeId>(h?.time ?? 'morning');
  const [days, setDays] = useState<Set<number>>(new Set(h?.days ?? [0, 1, 2, 3, 4, 5, 6]));
  const have = new Set(S.habits.map((x) => x.name));
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const data = { name: n, emoji, cat, time, days: [...days].sort() };
    update((x) => {
      const cur = x.habits.find((y) => y.id === id);
      if (cur) Object.assign(cur, data);
      else x.habits.push({ id: uid(), start: today(), ...data });
    }, { quiet: true });
    toast(h ? '저장했습니다' : '새 습관');
    dismiss();
  };
  const remove = () => {
    undoable('습관을 삭제했습니다', (x) => {
      x.habits = x.habits.filter((y) => y.id !== id);
      for (const d in x.checks) {
        x.checks[d] = x.checks[d].filter((y) => y !== id);
        if (!x.checks[d].length) delete x.checks[d];
      }
    });
    dismiss();
  };
  return (
    <>
      <SheetBar title={h ? '습관' : '새 습관'} onDone={save} />
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={[T.group, { marginTop: 8 }]}>
          <TextInput value={name} onChangeText={setName} placeholder="습관 이름" placeholderTextColor={C.muted} maxLength={30} style={st.big} />
        </View>
        {!h && (
          <>
            <Text style={T.section}>추천</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TEMPLATES.filter((t) => !have.has(t.name)).map((t) => (
                <Tap key={t.name} haptic style={st.chip} onPress={() => { setName(t.name); setEmoji(t.emoji ?? ''); setCat(t.cat); setTime(t.time); }}>
                  <Text style={{ color: C.text2, fontSize: 13 }}>{t.name}</Text>
                </Tap>
              ))}
            </ScrollView>
          </>
        )}
        <Text style={T.section}>분야</Text>
        <Chips items={CATS} value={cat} onChange={setCat} dots />
        <Text style={T.section}>시간</Text>
        <Segment items={TIMES} value={time} onChange={setTime} />
        <Text style={T.section}>요일</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DOW.map((n, i) => {
            const on = days.has(i);
            return (
              <Tap key={n} haptic style={[st.dow, on && { backgroundColor: C.text }]} onPress={() => { const s = new Set(days); if (on && s.size > 1) s.delete(i); else s.add(i); setDays(s); }}>
                <Text style={{ color: on ? '#000' : C.muted, fontWeight: on ? '600' : '400' }}>{n}</Text>
              </Tap>
            );
          })}
        </View>
        {h && (
          <View style={[T.group, { marginTop: 28 }]}>
            <Tap scale={0.985} style={T.row} onPress={remove}><Text style={[T.body, { color: C.danger }]}>습관 삭제</Text></Tap>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ── 점 상세 ──
function DotDetail({ id }: { id: string }) {
  const S = useS();
  const { openSheet, undoable } = useAct();
  const { dismiss } = useSheet();
  const d = dotById(S, id);
  if (!d) return null;
  const nb = neighbors(S, id);
  const c = catOf(d.cat);
  return (
    <ScrollView>
      <View style={st.kicker}><Sw color={c.color} /><Text style={T.meta}>{c.name}</Text></View>
      <Text style={st.h2}>{d.title}</Text>
      <Text style={T.meta}>{fmtDate(d.date)} · {agoText(d.date)}</Text>
      {d.note ? <Text style={st.noteText}>{d.note}</Text> : null}
      <Text style={T.section}>이어진 점</Text>
      <View style={T.group}>
        {!nb.length && <View style={T.row}><Text style={T.meta}>아직 이어진 점이 없습니다.</Text></View>}
        {nb.map(({ dot, dir }, i) => (
          <Tap key={dot.id} scale={0.985} style={T.row} onPress={() => openSheet({ kind: 'dotDetail', id: dot.id })}>
            {i > 0 && <Sep />}
            <Sw color={catOf(dot.cat).color} />
            <Text numberOfLines={1} style={[T.body, { flex: 1 }]}>{dot.title}</Text>
            <Text style={[T.meta, num]}>{dir === 'past' ? '과거' : '이후'} · {fmtShort(dot.date)}</Text>
          </Tap>
        ))}
      </View>
      <View style={st.actions}>
        <Tap style={st.btn} onPress={() => openSheet({ kind: 'dot', id })}><Text style={st.btnText}>편집</Text></Tap>
        <Tap style={[st.btn, { backgroundColor: C.text }]} onPress={dismiss}><Text style={[st.btnText, { color: '#000' }]}>닫기</Text></Tap>
      </View>
      <View style={[T.group, { marginTop: 12 }]}>
        <Tap scale={0.985} style={T.row} onPress={() => { undoable('점을 삭제했습니다', (x) => { x.dots = x.dots.filter((y) => y.id !== id); for (const y of x.dots) y.links = y.links.filter((l) => l !== id); }); dismiss(); }}>
          <Text style={[T.body, { color: C.danger }]}>삭제</Text>
        </Tap>
      </View>
    </ScrollView>
  );
}

// ── 습관 상세: 최근 12주, 체크한 날은 점, 연달아 한 날은 선 ──
function HabitDetail({ id }: { id: string }) {
  const S = useS();
  const { openSheet } = useAct();
  const { dismiss } = useSheet();
  const h = S.habits.find((x) => x.id === id);
  const [w, setW] = useState(320);
  const cal = useMemo(() => {
    if (!h) return null;
    const weeks = 12;
    const cell = w / weeks;
    const now = new Date();
    const start = addDays(addDays(now, 6 - now.getDay()), -weeks * 7 + 1);
    const out: ReactElement[] = [];
    for (let wk = 0; wk < weeks; wk++) {
      for (let dow = 0; dow < 7; dow++) {
        const day = ymd(addDays(start, wk * 7 + dow));
        if (day > today()) continue;
        const cx = wk * cell + cell / 2, cy = dow * cell + cell / 2;
        const on = isDone(S, h, day);
        if (on && dow > 0 && isDone(S, h, shift(day, -1))) out.push(<Line key={'l' + day} x1={cx} y1={cy - cell} x2={cx} y2={cy} stroke={C.text} strokeOpacity={0.5} strokeWidth={1.2} />);
        out.push(on
          ? <Circle key={day} cx={cx} cy={cy} r={cell * 0.19} fill={C.text} />
          : scheduled(h, day) ? <Circle key={day} cx={cx} cy={cy} r={cell * 0.15} fill="none" stroke={C.hair2} />
            : <Circle key={day} cx={cx} cy={cy} r={1.2} fill={C.hair2} />);
      }
    }
    return { out, H: 7 * cell };
  }, [S, h, w]);
  if (!h || !cal) return null;
  return (
    <ScrollView>
      <View style={st.kicker}><Sw color={catOf(h.cat).color} /><Text style={T.meta}>{catOf(h.cat).name} · {timeOf(h.time).name}</Text></View>
      <Text style={st.h2}>{h.name}</Text>
      <View style={st.stat3}>
        {[[habitStreak(S, h), '현재 연속'], [habitBest(S, h), '최고 연속'], [`${habitRate(S, h)}%`, '30일']].map(([v, k], i) => (
          <View key={k} style={[{ flex: 1, alignItems: 'center' }, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.hair2 }]}>
            <Text style={[{ color: C.text, fontSize: 26, fontWeight: '300' }, num]}>{v}</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{k}</Text>
          </View>
        ))}
      </View>
      <Text style={T.section}>최근 12주</Text>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Svg width={w} height={cal.H}>{cal.out}</Svg>
      </View>
      <View style={st.actions}>
        <Tap style={st.btn} onPress={() => openSheet({ kind: 'habit', id })}><Text style={st.btnText}>편집</Text></Tap>
        <Tap style={[st.btn, { backgroundColor: C.text }]} onPress={dismiss}><Text style={[st.btnText, { color: '#000' }]}>닫기</Text></Tap>
      </View>
    </ScrollView>
  );
}

function BadgeSheet({ id }: { id: string }) {
  const S = useS();
  const { dismiss } = useSheet();
  const b = BADGES.find((x) => x.id === id);
  if (!b) return null;
  const got = S.badges[b.id];
  const [cur, target] = b.prog(S);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
      <Medal id={b.id} got={!!got} size={88} />
      <Text style={[st.h2, { marginTop: 18 }]}>{b.name}</Text>
      <Text style={{ color: C.text2, marginTop: 8 }}>{b.desc}</Text>
      <Text style={[T.meta, { marginTop: 8 }, num]}>{got ? fmtDate(got) : `${Math.min(cur, target)} / ${target}${b.unit}`}</Text>
      <Tap style={[st.btn, { backgroundColor: C.text, alignSelf: 'stretch', marginTop: 28 }]} onPress={dismiss}><Text style={[st.btnText, { color: '#000' }]}>닫기</Text></Tap>
    </View>
  );
}

// 웹 버전에서 옮기기: 웹의 '백업 내보내기' 파일 내용을 붙여넣기
function ImportSheet() {
  const { replace, toast } = useAct();
  const { dismiss } = useSheet();
  const [text, setText] = useState('');
  const go = () => {
    try {
      const s = normalize(JSON.parse(text));
      s.profile.onboarded = true;
      replace(s);
      toast('백업을 불러왔습니다');
      dismiss();
    } catch {
      toast('백업 내용을 읽지 못했습니다');
    }
  };
  return (
    <>
      <SheetBar title="백업 불러오기" onDone={go} doneLabel="불러오기" />
      <Text style={[T.sectionDesc, { marginTop: 8 }]}>웹 버전이나 이 앱에서 내보낸 백업 내용을 붙여넣으세요. 지금 기록은 바뀝니다.</Text>
      <View style={T.group}>
        <TextInput value={text} onChangeText={setText} multiline placeholder='{"v":2, …}' placeholderTextColor={C.muted} style={[st.note, { minHeight: 180, fontSize: 13 }]} />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  q: { color: C.muted, fontSize: 13, marginTop: 8, marginBottom: 10 },
  big: { color: C.text, fontSize: 18, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 14 },
  note: { color: C.text, fontSize: 16, paddingHorizontal: 16, paddingVertical: 12, minHeight: 72, textAlignVertical: 'top' },
  search: { color: C.text, fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  tick: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.hair2, alignItems: 'center', justifyContent: 'center' },
  tickDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface2 },
  dow: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  h2: { color: C.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.8, marginTop: 10, marginBottom: 4 },
  noteText: { color: C.text2, fontSize: 15, lineHeight: 24, marginTop: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 28 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: C.surface2, alignItems: 'center' },
  btnText: { color: C.text, fontSize: 15, fontWeight: '600' },
  stat3: { flexDirection: 'row', marginTop: 24, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.hair2 },
});
