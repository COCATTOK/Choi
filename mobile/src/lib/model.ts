// 점과 선의 데이터 모델과 모든 계산. 화면(React)과 분리된 순수 함수들입니다.
// 웹 버전(dots/app.js)과 같은 저장 형식(v2)을 써서 백업을 그대로 옮길 수 있습니다.
import { dayDiff, parse, shift, today } from './dates';

export type CatId = 'learn' | 'work' | 'health' | 'create' | 'relation' | 'mind';
export type TimeId = 'morning' | 'afternoon' | 'evening' | 'any';

export type Habit = {
  id: string;
  name: string;
  emoji?: string;
  cat: CatId;
  time: TimeId;
  days: number[]; // 0=일 … 6=토
  start: string;
  archived?: boolean;
};
export type Dot = { id: string; title: string; note?: string; cat: CatId; date: string; links: string[]; createdAt: number };
export type Settings = { remind: boolean; remindAt: number; nudge: boolean; nudgeAt: number }; // 분 단위 (예: 21*60)
export type State = {
  v: 2;
  profile: { name: string; identity: string; onboarded: boolean };
  habits: Habit[];
  checks: Record<string, string[]>;
  moods: Record<string, number>;
  dots: Dot[];
  badges: Record<string, string>;
  freezes: number;
  frozen: string[];
  freezeLog: string[];
  athDay: string;
  lastCat?: CatId;
  settings: Settings;
};

export const CATS: { id: CatId; name: string; color: string }[] = [
  // 어두운 배경 기준 색각 이상 대비가 검증된 순서
  { id: 'learn', name: '배움', color: '#3987e5' },
  { id: 'work', name: '일·커리어', color: '#d95926' },
  { id: 'health', name: '건강', color: '#199e70' },
  { id: 'create', name: '창작', color: '#c98500' },
  { id: 'relation', name: '관계', color: '#d55181' },
  { id: 'mind', name: '마음', color: '#9085e9' },
];
export const TIMES: { id: TimeId; name: string }[] = [
  { id: 'morning', name: '아침' },
  { id: 'afternoon', name: '오후' },
  { id: 'evening', name: '저녁' },
  { id: 'any', name: '언제든' },
];
export const MOODS = [
  { v: 1, name: '힘듦' },
  { v: 2, name: '별로' },
  { v: 3, name: '보통' },
  { v: 4, name: '좋음' },
  { v: 5, name: '최고' },
];
export const TEMPLATES: Omit<Habit, 'id' | 'start' | 'days'>[] = [
  { emoji: '📚', name: '책 10쪽 읽기', cat: 'learn', time: 'evening' },
  { emoji: '🏃', name: '30분 운동하기', cat: 'health', time: 'morning' },
  { emoji: '🧘', name: '5분 명상', cat: 'mind', time: 'morning' },
  { emoji: '✍️', name: '감사한 일 3가지 쓰기', cat: 'mind', time: 'evening' },
  { emoji: '💧', name: '물 2L 마시기', cat: 'health', time: 'any' },
  { emoji: '🗣️', name: '영어 20분', cat: 'learn', time: 'afternoon' },
  { emoji: '💻', name: '코딩 1시간', cat: 'work', time: 'afternoon' },
  { emoji: '🎯', name: '오늘의 핵심 일 1개 끝내기', cat: 'work', time: 'morning' },
  { emoji: '🎨', name: '15분 그리거나 쓰기', cat: 'create', time: 'evening' },
  { emoji: '📞', name: '소중한 사람에게 연락', cat: 'relation', time: 'any' },
  { emoji: '📵', name: 'SNS 30분 이하', cat: 'mind', time: 'any' },
  { emoji: '😴', name: '12시 전에 잠들기', cat: 'health', time: 'evening' },
];
export const IDENTITIES = ['매일 성장하는', '건강한', '꾸준한', '배움을 즐기는', '창작하는', '단단한 마음을 가진'];
export const PROMPTS = [
  '오늘 나를 조금이라도 성장시킨 순간은?',
  '오늘 새로 배운 한 가지는 무엇인가요?',
  '오늘 용기를 낸 일이 있나요?',
  '오늘 누군가와 나눈 의미 있는 대화는?',
  '당장은 쓸모없어 보여도 마음이 끌린 일은?',
  '오늘 실패했지만 배운 것이 있다면?',
  '오늘 가장 몰입했던 순간은?',
];
// 잡스의 2005 스탠퍼드 졸업 연설에서
export const QUOTES = [
  '앞을 내다보며 점을 이을 수는 없습니다. 뒤를 돌아볼 때만 이을 수 있죠.',
  '지금의 점들이 미래에 어떻게든 이어질 거라 믿어야 합니다.',
  '위대한 일을 하는 유일한 방법은 자신이 하는 일을 사랑하는 것입니다.',
  '아직 찾지 못했다면 계속 찾으세요. 안주하지 마세요.',
  '여러분의 시간은 한정되어 있습니다. 다른 사람의 삶을 사느라 낭비하지 마세요.',
  '가장 중요한 것은 마음과 직관을 따르는 용기입니다.',
  '오늘이 내 생의 마지막 날이라면, 오늘 하려는 일을 하고 싶을까?',
  'Stay hungry. Stay foolish.',
];
export const LEVELS = [
  { xp: 0, name: '점' },
  { xp: 40, name: '선' },
  { xp: 120, name: '면' },
  { xp: 250, name: '궤도' },
  { xp: 450, name: '별' },
  { xp: 700, name: '별자리' },
  { xp: 1000, name: '성운' },
  { xp: 1400, name: '은하' },
  { xp: 2000, name: '우주' },
];
export const XP = { check: 3, moment: 10, link: 5, mood: 2 };
export const INDEX_BASE = 100;
export const INDEX_DECAY = 0.015;
export const FREEZE_MAX = 2;

export const catOf = (id?: string) => CATS.find((c) => c.id === id) ?? CATS[0];
export const timeOf = (id?: string) => TIMES.find((t) => t.id === id) ?? TIMES[3];

export const blank = (): State => ({
  v: 2,
  profile: { name: '', identity: '', onboarded: false },
  habits: [],
  checks: {},
  moods: {},
  dots: [],
  badges: {},
  freezes: 0,
  frozen: [],
  freezeLog: [],
  athDay: '',
  settings: { remind: true, remindAt: 8 * 60 + 30, nudge: true, nudgeAt: 21 * 60 },
});

// 웹 버전 백업(v1 배열 또는 v2 객체)도 받아들입니다
export function normalize(raw: unknown): State {
  const b = blank();
  const fixDots = (ds: Dot[]) => ds.map((d) => ({ ...d, links: Array.isArray(d.links) ? d.links : [] }));
  if (Array.isArray(raw)) return { ...b, dots: fixDots(raw as Dot[]), profile: { ...b.profile, onboarded: true } };
  if (!raw || typeof raw !== 'object' || (raw as State).v !== 2) throw new Error('지원하지 않는 형식');
  const s = raw as Partial<State>;
  return {
    ...b,
    ...s,
    profile: { ...b.profile, ...s.profile },
    settings: { ...b.settings, ...s.settings },
    dots: fixDots(s.dots ?? []),
  } as State;
}

// ---------- 계산 캐시 ----------
// 기록(State)은 저장된 뒤 바꾸지 않고 새 객체로 교체합니다. 그래서 같은 기록 객체와
// 같은 날짜라면 결과가 같으니, 한 번만 계산해 둡니다 (1년치 기록도 탭 한 번에 가볍게).
const cache = new WeakMap<State, Map<string, unknown>>();
function memo<T>(S: State, name: string, f: () => T): T {
  let m = cache.get(S);
  if (!m) cache.set(S, (m = new Map()));
  const key = name + '@' + today();
  if (!m.has(key)) m.set(key, f());
  return m.get(key) as T;
}

// ---------- 습관 ----------
const activeHabits_ = (S: State) => S.habits.filter((h) => !h.archived);
export const activeHabits = (S: State): ReturnType<typeof activeHabits_> => memo(S, 'activeHabits', () => activeHabits_(S));
export const isDone = (S: State, h: Habit, day: string) => (S.checks[day] ?? []).includes(h.id);
export const scheduled = (h: Habit, day: string) => h.days.includes(parse(day).getDay()) && day >= h.start;
export const habitsFor = (S: State, day: string) => activeHabits(S).filter((h) => scheduled(h, day));

export function dayProgress(S: State, day: string) {
  const hs = habitsFor(S, day);
  const done = hs.filter((h) => isDone(S, h, day)).length;
  return { done, total: hs.length, pct: hs.length ? done / hs.length : 0 };
}
export function habitStreak(S: State, h: Habit) {
  let d = today();
  if (scheduled(h, d) && !isDone(S, h, d)) d = shift(d, -1); // 오늘은 아직 기회가 있어요
  let n = 0;
  for (let guard = 0; guard < 3650 && d >= h.start; guard++, d = shift(d, -1)) {
    if (!scheduled(h, d)) continue;
    if (!isDone(S, h, d)) break;
    n++;
  }
  return n;
}
export function habitBest(S: State, h: Habit) {
  let best = 0;
  let cur = 0;
  for (let d = h.start; d <= today(); d = shift(d, 1)) {
    if (!scheduled(h, d)) continue;
    if (isDone(S, h, d)) best = Math.max(best, ++cur);
    else if (d !== today()) cur = 0;
  }
  return best;
}
export function habitRate(S: State, h: Habit, days = 30) {
  let sch = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const d = shift(today(), -i);
    if (!scheduled(h, d)) continue;
    if (d === today() && !isDone(S, h, d)) continue;
    sch++;
    if (isDone(S, h, d)) done++;
  }
  return sch ? Math.round((done / sch) * 100) : 0;
}
// 최근 n일 (오래된 날 → endDay)
export function trail(S: State, h: Habit, n: number, endDay = today()) {
  const out: { d: string; on: boolean; sch: boolean; joined: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = shift(endDay, -i);
    out.push({ d, on: isDone(S, h, d), sch: scheduled(h, d), joined: false });
  }
  // 이전에 체크한 날까지 (쉬는 요일은 건너뛰고) 선을 잇습니다
  out.forEach((p, i) => {
    if (!p.on || i === 0) return;
    let j = i - 1;
    while (j >= 0 && !out[j].sch && !out[j].on) j--;
    p.joined = j >= 0 && out[j].on;
  });
  return out;
}

// ---------- 기록한 날 · 연속 ----------
export const didSomething = (S: State, d: string) => (S.checks[d] ?? []).length > 0 || S.dots.some((x) => x.date === d);
function activeDays_(S: State) {
  const set = new Set(S.dots.map((d) => d.date));
  for (const d in S.checks) if (S.checks[d].length) set.add(d);
  for (const d of S.frozen) set.add(d); // 보호권으로 지킨 날
  return set;
}
export const activeDays = (S: State): ReturnType<typeof activeDays_> => memo(S, 'activeDays', () => activeDays_(S));
function streak_(S: State) {
  const days = activeDays(S);
  let d = today();
  if (!days.has(d)) d = shift(d, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = shift(d, -1);
  }
  return n;
}
export const streak = (S: State): ReturnType<typeof streak_> => memo(S, 'streak', () => streak_(S));
function bestStreak_(S: State) {
  const days = [...activeDays(S)].sort();
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const d of days) {
    cur = prev && dayDiff(prev, d) === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}
export const bestStreak = (S: State): ReturnType<typeof bestStreak_> => memo(S, 'bestStreak', () => bestStreak_(S));
const totalChecks_ = (S: State) => Object.values(S.checks).reduce((a, l) => a + l.length, 0);
export const totalChecks = (S: State): ReturnType<typeof totalChecks_> => memo(S, 'totalChecks', () => totalChecks_(S));
function perfectDays_(S: State) {
  let n = 0;
  for (const d in S.checks) {
    const p = dayProgress(S, d);
    if (p.total && p.done === p.total) n++;
  }
  return n;
}
export const perfectDays = (S: State): ReturnType<typeof perfectDays_> => memo(S, 'perfectDays', () => perfectDays_(S));

// ---------- 점 · 선 ----------
// 주의: 캐시된 배열이니 받은 쪽에서 직접 고치지 말고 복사해서 쓰세요
export const sortedDots = (S: State): readonly Dot[] =>
  memo(S, 'sortedDots', () => [...S.dots].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1)));
export const dotById = (S: State, id: string) => S.dots.find((d) => d.id === id);
function edges_(S: State) {
  const ids = new Set(S.dots.map((d) => d.id));
  const list: [string, string][] = [];
  for (const d of S.dots) for (const to of d.links) if (ids.has(to)) list.push([d.id, to]);
  return list;
}
export const edges = (S: State): ReturnType<typeof edges_> => memo(S, 'edges', () => edges_(S));
function degreeMap_(S: State) {
  const m: Record<string, number> = Object.fromEntries(S.dots.map((d) => [d.id, 0]));
  for (const [a, b] of edges(S)) {
    m[a]++;
    m[b]++;
  }
  return m;
}
export const degreeMap = (S: State): ReturnType<typeof degreeMap_> => memo(S, 'degreeMap', () => degreeMap_(S));
export function neighbors(S: State, id: string) {
  const self = dotById(S, id);
  const out: { dot: Dot; dir: 'past' | 'future' }[] = [];
  for (const to of self?.links ?? []) {
    const d = dotById(S, to);
    if (d) out.push({ dot: d, dir: 'past' });
  }
  for (const d of S.dots) if (d.links.includes(id)) out.push({ dot: d, dir: 'future' });
  return out.sort((a, b) => (a.dot.date < b.dot.date ? -1 : 1));
}

// ---------- 레벨 ----------
const xp_ = (S: State) =>
  totalChecks(S) * XP.check + S.dots.length * XP.moment + edges(S).length * XP.link + Object.keys(S.moods).length * XP.mood;
export const xp = (S: State): ReturnType<typeof xp_> => memo(S, 'xp', () => xp_(S));
function level_(S: State) {
  const x = xp(S);
  let i = 0;
  while (i + 1 < LEVELS.length && x >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return { i, x, cur, next, pct: next ? (x - cur.xp) / (next.xp - cur.xp) : 1 };
}
export const level = (S: State): ReturnType<typeof level_> => memo(S, 'level', () => level_(S));

// ---------- 성장 지수 ----------
// 100에서 시작. 기록한 날은 그날의 XP만큼 오르고, 아무것도 안 한 날은
// 쌓인 성장분이 1.5%씩 내려갑니다. 오늘은 끝나지 않았으니 내리지 않습니다.
function dailyXP_(S: State) {
  const m: Record<string, number> = {};
  const add = (d: string, v: number) => (m[d] = (m[d] ?? 0) + v);
  const ids = new Set(S.dots.map((d) => d.id));
  for (const d in S.checks) add(d, S.checks[d].length * XP.check);
  for (const d of S.dots) add(d.date, XP.moment + d.links.filter((l) => ids.has(l)).length * XP.link);
  for (const d in S.moods) add(d, XP.mood);
  return m;
}
export const dailyXP = (S: State): ReturnType<typeof dailyXP_> => memo(S, 'dailyXP', () => dailyXP_(S));
export type IndexPoint = { d: string; v: number; g: number };
function indexSeries_(S: State): IndexPoint[] {
  const xpByDay = dailyXP(S);
  const days = Object.keys(xpByDay).sort();
  const now = today();
  const first = days.length && days[0] < now ? shift(days[0], -1) : shift(now, -1);
  const out: IndexPoint[] = [];
  let v = INDEX_BASE;
  for (let d = first; d <= now; d = shift(d, 1)) {
    const g = xpByDay[d] ?? 0;
    if (d !== first) v = g ? v + g : d === now ? v : INDEX_BASE + (v - INDEX_BASE) * (1 - INDEX_DECAY);
    out.push({ d, v, g });
  }
  return out;
}
export const indexSeries = (S: State): ReturnType<typeof indexSeries_> => memo(S, 'indexSeries', () => indexSeries_(S));
// 1,234.56 — 애니메이션 중 매 프레임 불리므로 toLocaleString(느림) 대신 직접 만듭니다
export const fmtIdx = (v: number) => {
  const [i, d] = Math.abs(v).toFixed(2).split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + d;
};
export function change(from: number, to: number) {
  const diff = to - from;
  const pct = from ? (diff / from) * 100 : 0;
  const dir: 'up' | 'down' | 'flat' = diff > 0.004 ? 'up' : diff < -0.004 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  return { dir, diff, abs: `${arrow}${fmtIdx(Math.abs(diff))}`, text: `${arrow}${fmtIdx(Math.abs(diff))} (${diff >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(2)}%)` };
}
// 오늘의 전망: 하면 얼마나 오르고, 안 하면 얼마나 내려가는지
function forecast_(S: State) {
  const ser = indexSeries(S);
  const last = ser[ser.length - 1];
  const p = dayProgress(S, today());
  const left = p.total - p.done;
  if (!last.g) {
    const drop = (last.v - INDEX_BASE) * INDEX_DECAY;
    return drop > 0.004
      ? { dir: 'down' as const, text: `오늘 기록이 없으면 지수가 ${fmtIdx(drop)} 내려갑니다`, drop, left }
      : { dir: 'flat' as const, text: '첫 기록으로 지수를 올려보세요', drop: 0, left };
  }
  if (left > 0) return { dir: 'up' as const, text: `남은 습관 ${left}개를 하면 +${left * XP.check} 더 오릅니다`, drop: 0, left };
  return { dir: 'up' as const, text: `오늘 +${last.g} 상승 마감`, drop: 0, left };
}
export const forecast = (S: State): ReturnType<typeof forecast_> => memo(S, 'forecast', () => forecast_(S));

// ---------- 배지 ----------
// 한 번이라도 N일을 채웠으면 달성, 아니면 지금 연속 기록이 진행도
const streakProg = (S: State, n: number): [number, number] => (bestStreak(S) >= n ? [n, n] : [streak(S), n]);
export type Badge = { id: string; name: string; desc: string; unit: string; prog: (S: State) => [number, number] };
export const BADGES: Badge[] = [
  { id: 'first_dot', name: '첫 점', desc: '처음으로 오늘의 점을 찍었습니다.', unit: '개', prog: (S) => [S.dots.length, 1] },
  { id: 'first_link', name: '첫 연결', desc: '처음으로 과거의 점과 선을 이었습니다.', unit: '개', prog: (S) => [edges(S).length, 1] },
  { id: 'first_check', name: '첫 표', desc: '처음으로 습관을 체크했습니다.', unit: '표', prog: (S) => [totalChecks(S), 1] },
  { id: 'perfect', name: '완벽한 하루', desc: '하루의 습관을 모두 해냈습니다.', unit: '개', prog: (S) => (perfectDays(S) ? [1, 1] : [dayProgress(S, today()).done, Math.max(1, dayProgress(S, today()).total)]) },
  { id: 'streak3', name: '3일', desc: '3일 연속으로 기록했습니다.', unit: '일', prog: (S) => streakProg(S, 3) },
  { id: 'streak7', name: '7일', desc: '7일 연속으로 기록했습니다.', unit: '일', prog: (S) => streakProg(S, 7) },
  { id: 'streak30', name: '30일', desc: '30일 연속으로 기록했습니다.', unit: '일', prog: (S) => streakProg(S, 30) },
  { id: 'votes100', name: '100표', desc: '되고 싶은 나에게 100표를 던졌습니다.', unit: '표', prog: (S) => [totalChecks(S), 100] },
  { id: 'dots10', name: '점 10개', desc: '오늘의 점을 10개 찍었습니다.', unit: '개', prog: (S) => [S.dots.length, 10] },
  { id: 'hub', name: '허브', desc: '한 점에서 선이 다섯 개 이상 뻗어나갔습니다.', unit: '개', prog: (S) => [Math.max(0, ...Object.values(degreeMap(S))), 5] },
  { id: 'mood7', name: '마음', desc: '기분을 7일 기록했습니다.', unit: '일', prog: (S) => [Object.keys(S.moods).length, 7] },
  { id: 'constellation', name: '별자리', desc: '레벨 “별자리”에 도달했습니다.', unit: ' XP', prog: (S) => [xp(S), LEVELS[5].xp] },
];
export const badgeEarned = (S: State, b: Badge) => {
  const [cur, target] = b.prog(S);
  return cur >= target;
};
// 목표에 가장 가까운 배지
function nextGoal_(S: State) {
  let best: { b: Badge; cur: number; target: number; r: number } | null = null;
  for (const b of BADGES) {
    if (S.badges[b.id]) continue;
    const [cur, target] = b.prog(S);
    if (cur >= target) continue;
    const r = cur / target;
    if (!best || r > best.r) best = { b, cur, target, r };
  }
  return best;
}
export const nextGoal = (S: State): ReturnType<typeof nextGoal_> => memo(S, 'nextGoal', () => nextGoal_(S));

// ---------- 보호권 ----------
// 어제(또는 그 전 며칠)를 놓쳤고 보호권이 충분하면 그 날들을 지켜줍니다
export function freezeCandidates(S: State) {
  if (!S.freezes) return [];
  const act = activeDays(S);
  const missed: string[] = [];
  let d = shift(today(), -1);
  while (!act.has(d) && missed.length <= S.freezes) {
    missed.push(d);
    d = shift(d, -1);
  }
  return missed.length && missed.length <= S.freezes && act.has(d) ? missed : [];
}
// 7일 연속마다 보호권 1개 (최대 2개)
export const earnsFreeze = (S: State) => {
  const st = streak(S);
  return st > 0 && st % 7 === 0 && didSomething(S, today()) && !S.freezeLog.includes(today()) && S.freezes < FREEZE_MAX;
};
// 역대 최고(신고가) — 하루 한 번
export function isNewHigh(S: State) {
  const ser = indexSeries(S);
  if (ser.length < 8) return false; // 첫 주에는 매일이 신고가라 의미가 없음
  const last = ser[ser.length - 1];
  const prevMax = Math.max(...ser.slice(0, -1).map((p) => p.v));
  return last.g > 0 && last.v > prevMax + 0.001 && S.athDay !== today();
}
// 쉬었다 돌아온 날 수 (오늘 아직 기록이 없을 때만)
function comebackGap_(S: State) {
  const days = [...activeDays(S)].filter((d) => d < today()).sort();
  const last = days[days.length - 1];
  const gap = last ? dayDiff(last, today()) : 0;
  return last && gap >= 3 && !didSomething(S, today()) ? gap : 0;
}
export const comebackGap = (S: State): ReturnType<typeof comebackGap_> => memo(S, 'comebackGap', () => comebackGap_(S));
export const nowSlot = (h = new Date().getHours()): TimeId => (h < 11 ? 'morning' : h < 17 ? 'afternoon' : 'evening');
