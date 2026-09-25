// 딸깍 키워드 분석 서버 (블랙키위 스타일)
// 실행: node server.js  →  http://localhost:3000/kiwi.html
// Node 18 이상, 설치할 패키지 없음. API 키는 .env 파일에 넣어요 (.env.example 참고).
// 키 없이 화면만 구경하려면: node server.js --mock

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── .env 읽기 ──
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const {
  SEARCHAD_API_KEY, SEARCHAD_SECRET_KEY, SEARCHAD_CUSTOMER_ID,
  NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, PORT = 3000
} = process.env;
const MOCK = process.argv.includes('--mock') || process.env.MOCK === '1';

// ── 네이버 검색광고 API (검색량·경쟁도·예상 입찰가) ──
async function searchad(method, uri, { query, body } = {}) {
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', SEARCHAD_SECRET_KEY).update(`${ts}.${method}.${uri}`).digest('base64');
  const url = 'https://api.searchad.naver.com' + uri + (query ? '?' + new URLSearchParams(query) : '');
  const res = await fetch(url, {
    method,
    headers: {
      'X-Timestamp': ts, 'X-API-KEY': SEARCHAD_API_KEY, 'X-Customer': SEARCHAD_CUSTOMER_ID,
      'X-Signature': sig, 'Content-Type': 'application/json; charset=UTF-8'
    },
    body: body && JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`검색광고 API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── 네이버 오픈 API (블로그 발행량·데이터랩 트렌드) ──
async function openapi(pathname, { query, body } = {}) {
  const url = 'https://openapi.naver.com' + pathname + (query ? '?' + new URLSearchParams(query) : '');
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      'Content-Type': 'application/json'
    },
    body: body && JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`오픈 API ${res.status}: ${await res.text()}`);
  return res.json();
}

// "< 10" 같은 값을 숫자로
const num = (v) => (typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 5);

// 동시에 너무 많이 호출하면 429가 나서 몇 개씩 나눠서 처리
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function blogCount(keyword) {
  try {
    const d = await openapi('/v1/search/blog.json', { query: { query: keyword, display: 1 } });
    return d.total;
  } catch { return null; }
}

// 모바일 3위 노출 예상 입찰가 = 대략적인 클릭당 단가(CPC)
async function estimateCpc(keywords) {
  const map = {};
  for (let i = 0; i < keywords.length; i += 50) {
    try {
      const d = await searchad('POST', '/estimate/average-position-bid/keyword', {
        body: { device: 'MOBILE', items: keywords.slice(i, i + 50).map((key) => ({ key, position: 3 })) }
      });
      for (const e of d.estimate || []) map[e.keyword] = e.bid;
    } catch (e) { console.warn('예상 입찰가 조회 실패:', e.message); }
  }
  return map;
}

function ymd(d) { return d.toISOString().slice(0, 10); }

async function trend(keyword) {
  const end = new Date(); end.setDate(0);             // 지난달 말일 (이번 달은 덜 끝나서 제외)
  const start = new Date(end); start.setMonth(start.getMonth() - 11); start.setDate(1);
  try {
    const d = await openapi('/v1/datalab/search', {
      body: { startDate: ymd(start), endDate: ymd(end), timeUnit: 'month', keywordGroups: [{ groupName: keyword, keywords: [keyword] }] }
    });
    return d.results[0].data.map((p) => ({ month: p.period.slice(0, 7), ratio: p.ratio }));
  } catch (e) { console.warn('데이터랩 조회 실패:', e.message); return []; }
}

// ── 황금 점수: 검색량 많고, 발행량 적고, 광고 단가 높을수록 ↑ ──
const clamp = (x) => Math.max(0, Math.min(1, x));
function golden(k) {
  const vol = clamp((Math.log10(Math.max(k.total, 1)) - 2) / 2.5) * 35;          // 100회 → 0점, 3만회 → 35점
  const sat = k.blog == null ? 0.5 : clamp((Math.log10(20) - Math.log10(Math.max(k.saturation, 0.01))) / Math.log10(40));
  const ad = ({ 높음: 20, 중간: 10, 낮음: 3 }[k.comp] || 0) + (k.cpc ? Math.min(10, k.cpc / 300) : 0);
  return Math.round(vol + sat * 35 + ad);
}

async function analyze(keyword) {
  const hint = keyword.replace(/\s+/g, '');
  const tool = await searchad('GET', '/keywordstool', { query: { hintKeywords: hint, showDetail: 1 } });
  let list = (tool.keywordList || []).map((k) => ({
    keyword: k.relKeyword,
    pc: num(k.monthlyPcQcCnt), mobile: num(k.monthlyMobileQcCnt),
    clicks: Math.round((+k.monthlyAvePcClkCnt || 0) + (+k.monthlyAveMobileClkCnt || 0)),
    comp: k.compIdx, adDepth: +k.plAvgDepth || 0
  }));
  list.forEach((k) => (k.total = k.pc + k.mobile));

  // 메인 키워드는 맨 앞, 나머지는 검색량 순으로 상위 40개만 발행량 조회
  const mainIdx = list.findIndex((k) => k.keyword.replace(/\s+/g, '') === hint);
  const main = mainIdx >= 0 ? list.splice(mainIdx, 1)[0] : { keyword, pc: 0, mobile: 0, total: 0, clicks: 0, comp: '-', adDepth: 0 };
  main.keyword = keyword;
  list = [main, ...list.sort((a, b) => b.total - a.total).slice(0, 40)];

  const [blogs, cpc, tr] = await Promise.all([
    mapLimit(list, 5, (k) => blogCount(k.keyword)),
    estimateCpc(list.map((k) => k.keyword.replace(/\s+/g, ''))),
    trend(keyword)
  ]);
  list.forEach((k, i) => {
    k.blog = blogs[i];
    k.saturation = k.blog == null ? null : +(k.blog / Math.max(k.total, 1)).toFixed(2);
    k.cpc = cpc[k.keyword.replace(/\s+/g, '')] ?? null;
    k.score = golden(k);
  });

  // 데이터랩 비율 × 최근 한 달 검색량 → 월별 검색량 추정
  const last = tr.length ? tr[tr.length - 1].ratio : 0;
  const monthly = tr.map((p) => ({ month: p.month, volume: last ? Math.round((p.ratio / last) * main.total) : 0 }));

  const [first, ...related] = list;
  return { main: first, monthly, related: related.sort((a, b) => b.score - a.score) };
}

// ── 키 없이 화면 확인용 가짜 데이터 ──
function mock(keyword) {
  let seed = [...keyword].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const mk = (kw) => {
    const pc = Math.round(rnd() ** 2 * 8000 + 10), mobile = Math.round(pc * (2 + rnd() * 5));
    const k = { keyword: kw, pc, mobile, total: pc + mobile, clicks: Math.round((pc + mobile) * rnd() * 0.02),
      comp: ['높음', '중간', '낮음'][Math.floor(rnd() * 3)], adDepth: Math.round(rnd() * 15),
      blog: Math.round((pc + mobile) * rnd() ** 2 * 30), cpc: Math.round(rnd() * 5000 / 10) * 10 };
    k.saturation = +(k.blog / k.total).toFixed(2); k.score = golden(k); return k;
  };
  const suffixes = ['비용', '가격', '추천', '후기', '종류', '부작용', '보험', '잘하는곳', '기간', '과정', '수명', '뼈이식', '통증', '틀니', '가격비교', '지원', '나이', '관리'];
  const main = mk(keyword);
  const now = new Date();
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 12 + i, 1);
    return { month: d.toISOString().slice(0, 7), volume: Math.round(main.total * (0.7 + rnd() * 0.5)) };
  });
  return { main, monthly, related: suffixes.map((s) => mk(`${keyword} ${s}`)).sort((a, b) => b.score - a.score), mock: true };
}

// ── 웹 서버 ──
const cache = new Map();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
const ready = () => MOCK || (SEARCHAD_API_KEY && SEARCHAD_SECRET_KEY && SEARCHAD_CUSTOMER_ID && NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };

  if (url.pathname === '/api/status') return json(200, { ready: !!ready(), mock: MOCK });
  if (url.pathname === '/api/analyze') {
    const kw = (url.searchParams.get('keyword') || '').trim();
    if (!kw) return json(400, { error: '키워드를 입력하세요' });
    if (!ready()) return json(503, { error: 'API 키가 없어요. .env 파일을 설정하세요 (README 참고).' });
    try {
      const hit = cache.get(kw);
      if (hit && Date.now() - hit.at < 3600e3) return json(200, hit.data);
      const data = MOCK ? mock(kw) : await analyze(kw);
      cache.set(kw, { at: Date.now(), data });
      return json(200, data);
    } catch (e) {
      console.error(e);
      return json(502, { error: e.message });
    }
  }

  // 정적 파일
  const file = path.join(__dirname, path.normalize(decodeURIComponent(url.pathname === '/' ? '/kiwi.html' : url.pathname)));
  if (!file.startsWith(__dirname + path.sep) || path.basename(file).startsWith('.') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`✅ http://localhost:${PORT}/kiwi.html 열어보세요`);
  if (MOCK) console.log('   (MOCK 모드: 가짜 데이터로 화면만 보여줘요)');
  else if (!ready()) console.log('⚠️  .env에 API 키가 없어요. README의 "API 키 받기"를 따라 해주세요.');
});
