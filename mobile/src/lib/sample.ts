// 예시 데이터: 약 3개월 동안의 습관과 경험 (웹 버전과 같은 흐름)
import { hash, shift, today } from './dates';
import { BADGES, TEMPLATES, badgeEarned, blank, scheduled, type Dot, type State } from './model';

export function sampleState(): State {
  const S = blank();
  S.profile = { name: '지민', identity: '매일 성장하는', onboarded: true };
  const start = shift(today(), -84);
  const pick = [0, 1, 2, 3, 5];
  S.habits = pick.map((i, k) => ({ id: 'h' + k, start, days: i === 1 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6], ...TEMPLATES[i] }));
  for (let i = 84; i >= 1; i--) {
    const d = shift(today(), -i);
    const p = 0.45 + (0.45 * (84 - i)) / 84; // 시간이 갈수록 더 꾸준해지는 흐름
    const rest = i > 2 && hash('rest' + d) % 7 === 0; // 가끔 쉬는 날
    const list = rest ? [] : S.habits.filter((h) => scheduled(h, d) && (hash(d + h.id) % 100) / 100 < p).map((h) => h.id);
    if (list.length) S.checks[d] = list;
    if (!rest && i <= 40 && hash('m' + d) % 5) {
      const base = 2.4 + list.length * 0.45 + (list.includes('h2') ? 0.6 : 0);
      S.moods[d] = Math.max(1, Math.min(5, Math.round(base + ((hash('x' + d) % 10) - 5) / 6)));
    }
  }
  S.checks[today()] = ['h1'];
  const M: [string, number, Dot['cat'], string, string, string[]][] = [
    ['s1', 84, 'learn', '서체(캘리그래피) 수업 청강', '당장은 쓸모없어 보였지만 글자가 아름다웠다.', []],
    ['s2', 80, 'health', '아침 30분 걷기 시작', '', []],
    ['s3', 76, 'learn', 'HTML 첫 페이지 만들기', '<h1>부터 시작.', []],
    ['s4', 71, 'mind', '하루 3줄 일기', '', []],
    ['s5', 66, 'learn', 'CSS로 글꼴과 여백 다듬기', '서체 수업에서 본 감각이 떠올랐다.', ['s1', 's3']],
    ['s6', 60, 'relation', '개발 스터디 모임 참여', '', ['s3']],
    ['s7', 55, 'health', '첫 5km 달리기', '', ['s2']],
    ['s8', 49, 'learn', 'JavaScript 기초 강의 완주', '', ['s3', 's6']],
    ['s9', 44, 'create', '개인 블로그 디자인', '', ['s5', 's1']],
    ['s10', 38, 'mind', '실패한 프로젝트 회고', '무엇을 배웠는지 적어보았다.', ['s4']],
    ['s11', 33, 'work', '사이드 프로젝트 기획', '', ['s8', 's10']],
    ['s12', 27, 'relation', '스터디에서 발표', '', ['s6', 's8']],
    ['s13', 21, 'create', '첫 웹 앱 배포', '', ['s11', 's9', 's8']],
    ['s14', 16, 'health', '10km 완주', '', ['s7']],
    ['s15', 11, 'work', '포트폴리오 정리', '', ['s13', 's9']],
    ['s16', 6, 'relation', '후배에게 HTML 알려주기', '', ['s12', 's3']],
    ['s17', 3, 'learn', '모바일 앱 공부 시작', '', ['s13']],
    ['s18', 1, 'mind', '1년 후의 나에게 편지', '', ['s4', 's10']],
  ];
  S.dots = M.map(([id, ago, cat, title, note, links], i) => ({ id, createdAt: i, cat, title, note, date: shift(today(), -ago), links }));
  for (const b of BADGES) if (badgeEarned(S, b)) S.badges[b.id] = today();
  return S;
}
