// 날짜는 모두 기기 현지 시간 기준 'YYYY-MM-DD' 문자열로 다룹니다.
export const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date | string, n: number) => {
  const x = new Date(typeof d === 'string' ? parse(d) : d);
  x.setDate(x.getDate() + n);
  return x;
};
export const shift = (s: string, n: number) => ymd(addDays(s, n));
export const dayDiff = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

export const fmtDate = (s: string) => {
  const d = parse(s);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};
export const fmtShort = (s: string) => {
  const d = parse(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
export const fmtLong = (s: string) => {
  const d = parse(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;
};
export const agoText = (s: string, now = today()) => {
  const n = dayDiff(s, now);
  if (n === 0) return '오늘';
  if (n === 1) return '어제';
  if (n < 30) return `${n}일 전`;
  if (n < 365) return `${Math.floor(n / 30)}개월 전`;
  return `${Math.floor(n / 365)}년 전`;
};

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
