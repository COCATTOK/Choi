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

// 자주 바뀌는 것과 거의 안 바뀌는 것을 나눠서, 필요한 화면만 다시 그립니다.
//  · DataCtx: 기록(S) — 기록할 때만 바뀜
//  · ActCtx: 동작 함수들 — 절대 바뀌지 않음 (이것만 쓰는 화면은 다시 그리지 않음)
//  · 선택한 날짜, 시트, 토스트, 방금 추가한 점 — 각자 따로
export type Actions = {
  update: (fn: (s: State) => void, opts?: { quiet?: boolean }) => void;
  replace: (s: State) => void;
  undoable: (msg: string, fn: (s: State) => void) => void;
  toast: (msg: string, action?: ToastAction) => void;
  dropToast: (id: number) => void;
  openSheet: (r: SheetReq) => void;
  closeSheet: () => void;
  setSelDay: (d: string) => void;
  setJustAdded: (id: string | null) => void;
};
const DataCtx = createContext<{ S: State; ready: boolean } | null>(null);
const ActCtx = createContext<Actions | null>(null);
const DayCtx = createContext<string>('');
const SheetReqCtx = createContext<SheetReq | null>(null);
const ToastCtx = createContext<Toast[]>([]);
const FreshCtx = createContext<string | null>(null);
const need = <T,>(v: T | null, name: string): T => {
  if (v === null) throw new Error(`${name}: StoreProvider 밖에서 사용`);
  return v;
};
export const useS = () => need(useContext(DataCtx), 'useS').S;
export const useReady = () => need(useContext(DataCtx), 'useReady').ready;
export const useAct = () => need(useContext(ActCtx), 'useAct');
export const useDay = () => useContext(DayCtx);
export const useSheetReq = () => useContext(SheetReqCtx);
export const useToasts = () => useContext(ToastCtx);
export const useJustAdded = () => useContext(FreshCtx);

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

  // 저장과 알림 예약은 무거우니 손가락 반응이 끝난 뒤(250ms) 한 번에
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = null;
    const cur = ref.current;
    AsyncStorage.setItem(KEY, JSON.stringify(cur)).catch(() => toast('저장하지 못했습니다'));
    syncNotifications(cur);
  }, [toast]);
  const commit = useCallback((next: State) => {
    ref.current = next;
    setS(next);
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(flush, 250);
  }, [flush]);

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
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') wake();
      else if (saveT.current) flush(); // 앱을 떠날 때 남은 저장을 바로
    });
    return () => sub.remove();
  }, [wake, flush]);

  const closeSheet = useCallback(() => setSheet(null), []);
  const actions = useMemo<Actions>(() => ({
    update, replace, undoable, toast, dropToast, openSheet: setSheet, closeSheet, setSelDay, setJustAdded,
  }), [update, replace, undoable, toast, dropToast, closeSheet]);
  const data = useMemo(() => ({ S, ready }), [S, ready]);

  return (
    <ActCtx.Provider value={actions}>
      <DataCtx.Provider value={data}>
        <DayCtx.Provider value={selDay}>
          <FreshCtx.Provider value={justAdded}>
            <SheetReqCtx.Provider value={sheet}>
              <ToastCtx.Provider value={toasts}>{children}</ToastCtx.Provider>
            </SheetReqCtx.Provider>
          </FreshCtx.Provider>
        </DayCtx.Provider>
      </DataCtx.Provider>
    </ActCtx.Provider>
  );
}
