/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { shift } from '../dates';
import {
  blank, bestStreak, comebackGap, dayProgress, earnsFreeze, forecast, freezeCandidates, habitStreak,
  fmtIdx, indexSeries, isNewHigh, level, nextGoal, normalize, streak, trail, type State,
} from '../model';
import { sampleState } from '../sample';

const NOW = '2026-09-25'; // 금요일
const ago = (n: number) => shift(NOW, -n);
function withHabits(activeAgo: number[], extra: Partial<State> = {}): State {
  const S = blank();
  S.profile.onboarded = true;
  S.habits = [
    { id: 'h1', name: '책', cat: 'learn', time: 'morning', days: [0, 1, 2, 3, 4, 5, 6], start: ago(40) },
    { id: 'h2', name: '명상', cat: 'mind', time: 'evening', days: [0, 1, 2, 3, 4, 5, 6], start: ago(40) },
  ];
  for (const n of activeAgo) S.checks[ago(n)] = ['h1'];
  return { ...S, ...extra };
}

beforeEach(() => mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 25, 20, 0) }));
afterEach(() => mock.timers.reset());

describe('연속 기록', () => {
  it('오늘 기록이 없으면 어제부터 셉니다', () => {
    assert.equal(streak(withHabits([1, 2, 3])), 3);
    assert.equal(streak(withHabits([0, 1, 2, 3])), 4);
    assert.equal(streak(withHabits([2, 3])), 0);
  });
  it('최고 연속', () => assert.equal(bestStreak(withHabits([1, 2, 5, 6, 7, 8])), 4));
  it('습관별 연속은 쉬는 요일을 건너뜁니다', () => {
    const S = withHabits([]);
    S.habits[0].days = [1, 2, 3, 4, 5]; // 평일만
    // 9/25 금, 9/24 목, 9/22 화... 주말(20,21)은 쉬는 날
    for (const d of ['2026-09-25', '2026-09-24', '2026-09-23', '2026-09-22', '2026-09-21', '2026-09-18']) S.checks[d] = ['h1'];
    assert.equal(habitStreak(S, S.habits[0]), 6);
  });
  it('점-선: 이어진 날만 선으로', () => {
    const S = withHabits([0, 1, 3]);
    const t = trail(S, S.habits[0], 4);
    assert.deepEqual(t.map((p) => [p.on, p.joined]), [[true, false], [false, false], [true, false], [true, true]]);
  });
});

describe('보호권', () => {
  it('어제를 놓쳤고 보호권이 있으면 지켜줍니다', () => {
    assert.deepEqual(freezeCandidates(withHabits([2, 3, 4], { freezes: 1 })), [ago(1)]);
  });
  it('놓친 날이 보호권보다 많으면 지키지 못합니다', () => {
    assert.deepEqual(freezeCandidates(withHabits([3, 4], { freezes: 1 })), []);
    assert.deepEqual(freezeCandidates(withHabits([3, 4], { freezes: 2 })), [ago(1), ago(2)]);
  });
  it('지킨 날은 연속 기록에 포함', () => {
    assert.equal(streak(withHabits([2, 3, 4], { frozen: [ago(1)] })), 4);
  });
  it('7일째 기록한 날 보호권을 받습니다 (최대 2개)', () => {
    assert.equal(earnsFreeze(withHabits([0, 1, 2, 3, 4, 5, 6])), true);
    assert.equal(earnsFreeze(withHabits([0, 1, 2, 3, 4, 5, 6], { freezes: 2 })), false);
    assert.equal(earnsFreeze(withHabits([1, 2, 3, 4, 5, 6, 7])), false); // 오늘 기록 전
  });
});

describe('성장 지수', () => {
  it('100에서 시작해 기록만큼 오릅니다', () => {
    const ser = indexSeries(withHabits([0, 1]));
    assert.equal(ser[0].v, 100);
    assert.equal(ser[ser.length - 1].v, 106);
  });
  it('쉰 날은 쌓인 성장분이 1.5% 내려가고, 오늘은 내리지 않습니다', () => {
    const ser = indexSeries(withHabits([2]));
    assert.deepEqual(ser.map((p) => +p.v.toFixed(3)), [100, 103, 102.955, 102.955]);
  });
  it('전망: 기록이 없으면 하락 예고, 남은 습관이 있으면 상승 예고', () => {
    assert.equal(forecast(withHabits([2])).dir, 'down');
    const f = forecast(withHabits([0]));
    assert.equal(f.dir, 'up');
    assert.equal(f.left, 1);
  });
  it('신고가는 하루 한 번', () => {
    const S = withHabits([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(isNewHigh(S), true);
    assert.equal(isNewHigh({ ...S, athDay: NOW }), false);
  });
  it('첫 주에는 신고가를 축하하지 않습니다', () => {
    assert.equal(isNewHigh(withHabits([0, 1])), false);
  });
});

describe('그 밖', () => {
  it('지수 표기', () => {
    assert.equal(fmtIdx(1234567.891), '1,234,567.89');
    assert.equal(fmtIdx(100), '100.00');
    assert.equal(fmtIdx(-0.5), '-0.50');
  });
  it('진행률', () => assert.deepEqual(dayProgress(withHabits([0]), NOW), { done: 1, total: 2, pct: 0.5 }));
  it('레벨', () => assert.equal(level(withHabits([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])).cur.name, '선'));
  it('다음 목표는 가장 가까운 배지', () => {
    const g = nextGoal(withHabits([0, 1, 2, 3, 4, 5]));
    assert.ok(g);
  });
  it('3일 이상 쉬고 돌아오면', () => {
    assert.equal(comebackGap(withHabits([5, 6])), 5);
    assert.equal(comebackGap(withHabits([1])), 0);
  });
  it('웹 버전 백업(v1 배열, v2 객체)을 읽습니다', () => {
    const v1 = normalize([{ id: 'a', title: 't', cat: 'learn', date: NOW, createdAt: 1 }]);
    assert.equal(v1.dots[0].links.length, 0);
    const v2 = normalize({ v: 2, profile: { name: '민수' }, habits: [], checks: {}, moods: {}, dots: [], badges: {} });
    assert.equal(v2.profile.name, '민수');
    assert.equal(v2.settings.remind, true);
    assert.throws(() => normalize({ hello: 1 }));
  });
  it('예시 데이터', () => {
    const S = sampleState();
    assert.ok(S.dots.length === 18 && S.habits.length === 5);
    assert.ok(indexSeries(S).at(-1)!.v > 500);
  });
});
