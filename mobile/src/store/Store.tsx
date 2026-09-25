// 앱 전체 상태. 기기(AsyncStorage)에 저장하고, 기록할 때마다
// 배지 · 보호권 · 신고가 · 레벨업을 확인해 알려줍니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { today } from '../lib/dates';
import {
  BADGES, LEVELS, badgeEarned, blank, earnsFreeze, fmtIdx, freezeCandidates, indexSeries, isNewHigh, level, normalize,
  streak, type State,
} from '../lib/model';
import { syncNotifications } from '../notify';
import { success, thud } from '../ui/feel';

const KEY = 'dots.v2';

export type SheetReq =
  | { kind: 'dot'; id?: string; date?: string; prompt?: string; title?: string; links?: string[] }
  | { kind: 'habit'; id?: string }
  | { kind: 'dotDetail'; id: string }
  | { kind: 'habitDetail'; id: string }
  | { kind: 'badge'; id: string }
  | { kind: 'import' };
export type ToastAction = { label: string; run: () => void };
export type Toast = { id: number; msg: string; action?: ToastAction };

type Ctx = {
  S: State;
  ready: boolean;
  selDay: string;
  setSelDay: (d: string) => void;
  update: (fn: (s: State) => void, opts?: { quiet?: boolean }) => void;
  replace: (s: State) => void;
  undoable: (msg: string, fn: (s: State) => void) => void;
  toast: (msg: string, action?: ToastAction) => void;
  toasts: Toast[];
  dropToast: (id: number) => void;
  sheet: SheetReq | null;
  openSheet: (r: SheetReq) => void;
  closeSheet: () => void;
  justAdded: string | null;
  setJustAdded: (id: string | null) => void;
};
const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider 밖에서 사용');
  return c;
};

const clone = (s: State): State => JSON.parse(JSON.stringify(s));

// 기록 뒤에 일어나는 좋은 일들 (next를 직접 고치고 알림 문구를 돌려줌)
function rewards(prev: State, next: State): string[] {
  const out: string[] = [];
  if (earnsFreeze(next)) {
    next.freezes++;
    next.freezeLog.push(today());
    out.push(`${streak(next)}일 연속 · 보호권을 받았습니다`);
  }
  if (isNewHigh(next)) {
    next.athDay = today();
    out.push(`신고가 · ${fmtIdx(indexSeries(next).at(-1)!.v)}`);
  }
  const got = BADGES.filter((b) => !next.badges[b.id] && badgeEarned(next, b));
  for (const b of got) next.badges[b.id] = today();
  if (got.length) out.push(`배지 · ${got[0].name}${got.length > 1 ? ` 외 ${got.length - 1}개` : ''}`);
  const lv = level(next).i;
  if (lv > level(prev).i) out.push(`이제 당신은 ${LEVELS[lv].name}입니다`);
  return out;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [S, setS] = useState<State>(blank);
  const [ready, setReady] = useState(false);
  const [selDay, setSelDay] = useState(today());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sheet, setSheet] = useState<SheetReq | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const ref = useRef(S); // commit과 불러오기에서만 갱신합니다
  const tid = useRef(0);

  const toast = useCallback((msg: string, action?: ToastAction) => {
    setToasts((t) => [...t, { id: ++tid.current, msg, action }]);
  }, []);
  const dropToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const commit = useCallback((next: State) => {
    ref.current = next;
    setS(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => toast('저장하지 못했습니다'));
    syncNotifications(next);
  }, [toast]);

  const update = useCallback((fn: (s: State) => void, opts?: { quiet?: boolean }) => {
    const prev = ref.current;
    const next = clone(prev);
    fn(next);
    const msgs = opts?.quiet ? [] : rewards(prev, next);
    commit(next);
    if (msgs.length) success();
    msgs.forEach((m) => toast(m));
  }, [commit, toast]);

  const replace = useCallback((s: State) => commit(s), [commit]);

  // 확인창 대신: 바로 하고, 4초 동안 되돌릴 수 있게
  const undoable = useCallback((msg: string, fn: (s: State) => void) => {
    const snap = ref.current;
    update(fn, { quiet: true });
    toast(msg, { label: '되돌리기', run: () => { commit(snap); thud(); } });
  }, [update, toast, commit]);

  // 앱을 열 때: 불러오기 → 놓친 날은 보호권으로 지키기 → 알림 다시 맞추기
  const wake = useCallback(() => {
    const cur = ref.current;
    setSelDay((d) => (d > today() ? today() : d));
    if (!cur.profile.onboarded) return;
    const missed = freezeCandidates(cur);
    if (missed.length) {
      update((s) => {
        s.frozen.push(...missed);
        s.freezes -= missed.length;
      }, { quiet: true });
      toast(`보호권이 ${missed.length}일의 연속 기록을 지켰습니다`);
    } else syncNotifications(cur);
  }, [update, toast]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const s = normalize(JSON.parse(raw));
          ref.current = s;
          setS(s);
        }
      })
      .catch(() => {})
      .finally(() => {
        setReady(true);
        wake();
      });
    const sub = AppState.addEventListener('change', (st) => st === 'active' && wake());
    return () => sub.remove();
  }, [wake]);

  const value = useMemo<Ctx>(() => ({
    S, ready, selDay, setSelDay, update, replace, undoable, toast, toasts, dropToast,
    sheet, openSheet: setSheet, closeSheet: () => setSheet(null), justAdded, setJustAdded,
  }), [S, ready, selDay, update, replace, undoable, toast, toasts, dropToast, sheet, justAdded]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
