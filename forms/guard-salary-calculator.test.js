// 경비원 월급 계산기 UI 테스트
// 실행: node guard-salary-calculator.test.js [대상 HTML 경로] [ID 접두어]
//   원본:        node guard-salary-calculator.test.js
//   워드프레스:  node guard-salary-calculator.test.js wordpress/preview-all.html gc-
// playwright 필요 (크롬 경로는 CHROME_PATH 환경변수로 지정, 기본 /opt/pw-browsers/chromium)
const path = require("path");
const assert = require("assert");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), __dirname, "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }));

const FILE = path.resolve(process.argv[2] || path.join(__dirname, "guard-salary-calculator.html"));
const PX = process.argv[3] || "";
// "#restA" → "#<PX>restA", "[name=approved]" → "[name=<PX>approved]"
const S = (sel) => sel.replace(/#(\w+)/g, `#${PX}$1`).replace(/name=(\w+)/g, `name=${PX}$1`);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" }); // 다크 환경에서도 밝게 보여야 함
  const p = await ctx.newPage();
  const reqs = [], errs = [];
  p.on("request", (r) => reqs.push(r.url()));
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + FILE);

  const T = async (s) => (await p.locator(S(s)).innerText()).replace(/\s+/g, " ");
  const fill = (s, v) => p.fill(S(s), String(v));
  const check = (s) => p.check(S(s));
  let pass = 0;
  const ok = (name, cond) => { assert(cond, "FAIL: " + name); console.log("PASS", name); pass++; };
  const shiftA = async (days, shift, rest, night) => { await fill("#daysA", days); await fill("#shiftA", shift); await fill("#restSA", rest); await fill("#nightWA", night); };

  /* ── ② 밝은 화면 고정 ─────────────── */
  const root = PX ? "#guard-calc" : "body";
  const bg = await p.evaluate((sel) => getComputedStyle(document.querySelector(sel)).backgroundColor, root);
  ok("다크 환경에서도 밝은 배경 (rgb(246, 247, 250))", bg === "rgb(246, 247, 250)");
  ok("CSS에 prefers-color-scheme 없음", !/prefers-color-scheme\s*:\s*dark/.test(require("fs").readFileSync(FILE, "utf8")));

  /* ── 격일제 모드 A (기존 테스트) ───────── */
  await fill("#restA", 8); await fill("#nightRestA", 4);
  await check("input[name=approved][value=yes]"); await check("input[name=five][value=yes]");
  ok("wage default 2026 = 10320", (await p.inputValue(S("#wage"))) === "10320");
  let t = await T("#resA");
  ok("2026 기본급 2,511,200원", t.includes("2,511,200원"));
  ok("2026 야간수당 313,900원", t.includes("313,900원"));
  ok("2026 합계 2,825,100원", (await T("#totalA")) === "2,825,100원");
  ok("월평균 243.33시간", t.includes("243.33시간"));
  await p.selectOption(S("#year"), "2027");
  ok("wage auto 10700", (await p.inputValue(S("#wage"))) === "10700");
  t = await T("#resA");
  ok("2027 합계 2,929,125원", (await T("#totalA")).includes("2,929,125원"));
  ok("2027 기본급 2,603,667원", t.includes("2,603,667원"));
  ok("2027 야간수당 325,458원", t.includes("325,458원"));
  await fill("#wage", 12000); await p.selectOption(S("#year"), "2026");
  ok("touched wage kept", (await p.inputValue(S("#wage"))) === "12000");
  await fill("#wage", 10320);
  await check("input[name=five][value=no]");
  t = await T("#resA");
  ok("5인 미만 야간 0원", t.includes("0원 (5인 미만)") && (await T("#totalA")).includes("2,511,200원"));
  await check("input[name=five][value=yes]");
  await check("input[name=approved][value=no]");
  t = await T("#resA");
  ok("승인 아니오 안내(1350)", t.includes("연장·휴일·주휴 가산 대상일 수 있어 금액이 더 클 수 있습니다") && t.includes("1350") && !t.includes("합계"));
  await check("input[name=approved][value=yes]");
  await fill("#nightRestA", 9);
  ok("야간휴게 9 오류", (await T("#errA")).includes("0~8시간"));
  await fill("#nightRestA", 4); await fill("#restA", 3);
  ok("야간휴게>휴게 오류", (await T("#errA")).includes("클 수 없습니다"));
  await fill("#restA", 8);
  ok("계산 과정 details 존재", (await p.locator(S("#resA details summary")).innerText()).includes("계산 과정"));

  /* ── ③ 교대제 모드 A ───────────────── */
  await check("input[name=wtype][value=shift]");
  ok("교대제 입력칸 표시 / 격일제 입력칸 숨김", (await p.locator(S("#blkShiftA")).isVisible()) && !(await p.locator(S("#blkDailyA")).isVisible()));
  await shiftA(20, 8, 1, 7);
  t = await T("#resA");
  ok("교대제 월 근로시간 140시간", t.includes("140시간"));
  ok("교대제 기본급 1,444,800원", t.includes("1,444,800원"));
  ok("교대제 야간수당 722,400원", t.includes("722,400원"));
  ok("교대제 합계 2,167,200원", (await T("#totalA")) === "2,167,200원");
  ok("교대제 계산 과정 표시", (await p.locator(S("#resA details")).textContent()).includes("20 × (8 − 1)"));
  await p.selectOption(S("#year"), "2027");
  t = await T("#resA");
  ok("교대제 2027 합계 2,247,000원 (기본 1,498,000 + 야간 749,000)", (await T("#totalA")) === "2,247,000원" && t.includes("1,498,000원") && t.includes("749,000원"));
  await p.selectOption(S("#year"), "2026");
  await check("input[name=five][value=no]");
  ok("교대제 5인 미만 야간 0원", (await T("#resA")).includes("0원 (5인 미만)") && (await T("#totalA")) === "1,444,800원");
  await check("input[name=five][value=yes]");
  await check("input[name=approved][value=no]");
  t = await T("#resA");
  ok("교대제 승인 아니오 → 상담 안내", t.includes("1350") && !t.includes("합계"));
  await check("input[name=approved][value=yes]");
  await shiftA(20, 8, 1, 8);
  ok("교대제 야간>실근로 오류", (await T("#errA")).includes("실제 근로시간"));
  await shiftA(20, 8, 8, 0);
  ok("교대제 휴게≥근무 오류", (await T("#errA")).includes("근무시간 미만"));
  await shiftA(32, 8, 1, 7);
  ok("교대제 근무일수 32 오류", (await T("#errA")).includes("31 이하"));
  await shiftA(20, 8, 1, 7);
  ok("교대제 오류 해소", (await T("#errA")) === "");

  /* ── ① 모드 B: 승인 여부 + 근무형태 ──── */
  await p.click(S("#tabB"));
  ok("모드 B 패널 표시", await p.locator(S("#panelB")).isVisible() && !(await p.locator(S("#panelA")).isVisible()));
  ok("모드 B 교대제 입력칸 표시", await p.locator(S("#blkShiftB")).isVisible());
  await fill("#base", 1444800); await fill("#daysB", 20); await fill("#shiftB", 8); await fill("#restSB", 1);
  ok("B 승인 미선택 시 판정 보류", (await T("#resB")).includes("승인 여부를 입력"));
  await check("input[name=approvedB][value=yes]");
  t = await T("#resB");
  ok("B 교대제 1,444,800 → 시간당 10,320원, 이상", t.includes("최저임금 이상") && (await T("#hourlyB")).startsWith("10,320원"));
  ok("B 야간 제외 문구", t.includes("야간수당은 최저임금 비교에서 제외됨"));
  await fill("#base", 1400000);
  t = await T("#resB");
  ok("B 교대제 1,400,000 → 미달 (44,800원 부족)", t.includes("최저임금 미달") && t.includes("44,800원 부족"));
  await check("input[name=approvedB][value=no]");
  t = await T("#resB");
  ok("B 승인 아니오 → 판정 대신 상담 안내(1350)", t.includes("1350") && t.includes("금액이 더 클 수 있습니다") && !t.includes("최저임금 이상") && !t.includes("최저임금 미달"));
  await check("input[name=approvedB][value=yes]");
  await fill("#shiftB", 25);
  ok("B 교대제 근무시간 25 오류", (await T("#errB")).includes("24 이하"));
  await fill("#shiftB", 8);

  // 격일제 B (기존 테스트 + 승인 질문)
  await check("input[name=wtype][value=daily]");
  ok("B 격일제 입력칸 표시", await p.locator(S("#blkDailyB")).isVisible() && !(await p.locator(S("#blkShiftB")).isVisible()));
  await fill("#base", 2511200); await fill("#restB", 8);
  t = await T("#resB");
  ok("B 격일제 2026 기본급 2,511,200 → 이상", t.includes("최저임금 이상") && (await T("#hourlyB")).startsWith("10,320원"));
  await fill("#base", 2500000);
  t = await T("#resB");
  ok("B 격일제 2,500,000 → 미달", t.includes("최저임금 미달") && t.includes("11,200원 부족"));
  await p.selectOption(S("#year"), "2027"); await fill("#base", 2511200);
  ok("B 격일제 2027 2,511,200 → 미달", (await T("#resB")).includes("최저임금 미달"));
  await fill("#base", 2603667);
  ok("B 격일제 2027 2,603,667 → 이상", (await T("#resB")).includes("최저임금 이상"));
  await p.selectOption(S("#year"), "2026");

  /* ── 휴게시간 체크리스트 ───────────── */
  ok("경고 초기 숨김", !(await p.locator(S("#restWarn")).isVisible()));
  await p.check(`${PX ? "#guard-calc " : ""}.rc >> nth=2`);
  ok("체크 시 경고 표시", (await T("#restWarn")).includes("이 시간은 근로시간으로 인정될 수 있음"));
  await p.click(S("#refocus"));
  ok("재입력 유도 → 모드 B 격일제 휴게 포커스", (await p.evaluate(() => document.activeElement.id)) === PX + "restB");
  await check("input[name=wtype][value=shift]"); await p.click(S("#refocus"));
  ok("재입력 유도 → 모드 B 교대제 휴게 포커스", (await p.evaluate(() => document.activeElement.id)) === PX + "restSB");
  await p.click(S("#tabA")); await p.click(S("#refocus"));
  ok("재입력 유도 → 모드 A 교대제 휴게 포커스", (await p.evaluate(() => document.activeElement.id)) === PX + "restSA");
  await check("input[name=wtype][value=daily]"); await p.click(S("#refocus"));
  ok("재입력 유도 → 모드 A 격일제 휴게 포커스", (await p.evaluate(() => document.activeElement.id)) === PX + "restA");
  await p.uncheck(`${PX ? "#guard-calc " : ""}.rc >> nth=2`);
  ok("해제 시 경고 숨김", !(await p.locator(S("#restWarn")).isVisible()));

  /* ── 공통 점검 ──────────────────── */
  ok("외부 요청 없음", reqs.every((u) => u.startsWith("file:") || u.startsWith("data:")));
  ok("JS 오류 없음", errs.length === 0);
  ok("가로 스크롤 없음(390px)", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const g = await p.evaluate(() => {
    const G = window.GuardCalc;
    const a = G.calcA({ year: 2026, wage: 10320, rest: 8, nightRest: 4, five: true });
    const d = G.calcA({ year: 2027, wage: 10700, rest: 8, nightRest: 4, five: true });
    const s = G.calcShiftA({ year: 2026, wage: 10320, days: 20, shift: 8, rest: 1, nightWork: 7, five: true });
    return [a.basic, a.night, a.total, d.total, s.basic, s.night, s.total];
  });
  ok("순수 함수: 격일제·교대제 값", JSON.stringify(g) === "[2511200,313900,2825100,2929125,1444800,722400,2167200]");

  console.log(`\nALL ${pass} CHECKS PASSED  (${path.basename(FILE)})`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
