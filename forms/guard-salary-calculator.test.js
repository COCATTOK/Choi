// 실행: node guard-salary-calculator.test.js (playwright 필요, 크롬 경로는 환경에 맞게 수정)
const { chromium } = require(require.resolve("playwright", { paths: ["/home/user/Choi", "/usr/lib/node_modules", "/usr/local/lib/node_modules", process.cwd()] }));
const assert = require("assert");
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const reqs = [], errs = [];
  p.on("request", (r) => reqs.push(r.url()));
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file:///home/user/Choi/forms/guard-salary-calculator.html");
  const T = async (s) => (await p.locator(s).innerText()).replace(/\s+/g, " ");
  let pass = 0; const ok = (name, cond) => { assert(cond, "FAIL: " + name); console.log("PASS", name); pass++; };

  // 모드 A 기본 시나리오 (2026)
  await p.fill("#restA", "8"); await p.fill("#nightRestA", "4");
  await p.check("input[name=approved][value=yes]"); await p.check("input[name=five][value=yes]");
  ok("wage default 2026 = 10320", (await p.inputValue("#wage")) === "10320");
  let t = await T("#resA");
  ok("2026 기본급 2,511,200원", t.includes("2,511,200원"));
  ok("2026 야간수당 313,900원", t.includes("313,900원"));
  ok("2026 합계 2,825,100원", (await T("#totalA")) === "2,825,100원");
  ok("월평균 243.33시간", t.includes("243.33시간"));
  // 2027
  await p.selectOption("#year", "2027");
  ok("wage auto 10700", (await p.inputValue("#wage")) === "10700");
  t = await T("#resA");
  ok("2027 합계 2,929,125원", (await T("#totalA")).includes("2,929,125원"));
  ok("2027 기본급 2,603,667원", t.includes("2,603,667원"));
  ok("2027 야간수당 325,458원", t.includes("325,458원"));
  // 사용자가 시급을 바꾸면 연도 변경 시 유지
  await p.fill("#wage", "12000"); await p.selectOption("#year", "2026");
  ok("touched wage kept", (await p.inputValue("#wage")) === "12000");
  await p.fill("#wage", "10320");
  // 5인 미만
  await p.check("input[name=five][value=no]");
  t = await T("#resA");
  ok("5인 미만 야간 0원", t.includes("0원 (5인 미만)") && (await T("#totalA")).includes("2,511,200원"));
  await p.check("input[name=five][value=yes]");
  // 승인 아니오
  await p.check("input[name=approved][value=no]");
  t = await T("#resA");
  ok("승인 아니오 안내(1350)", t.includes("연장·휴일·주휴 가산 대상일 수 있어 금액이 더 클 수 있습니다") && t.includes("1350") && !t.includes("합계"));
  await p.check("input[name=approved][value=yes]");
  // 검증 오류
  await p.fill("#nightRestA", "9");
  ok("야간휴게 9 오류", (await T("#errA")).includes("0~8시간"));
  await p.fill("#nightRestA", "4"); await p.fill("#restA", "3");
  ok("야간휴게>휴게 오류", (await T("#errA")).includes("클 수 없습니다"));
  await p.fill("#restA", "8");
  // 계산 과정
  ok("계산 과정 details 존재", (await p.locator("#resA details summary").innerText()).includes("계산 과정"));

  // 모드 B
  await p.click("#tabB");
  ok("모드 B 패널 표시", await p.locator("#panelB").isVisible() && !(await p.locator("#panelA").isVisible()));
  await p.fill("#base", "2511200"); await p.fill("#restB", "8");
  t = await T("#resB");
  ok("B 2026 기본급 2,511,200 → 이상", t.includes("최저임금 이상") && (await T("#hourlyB")).startsWith("10,320원"));
  ok("B 야간 제외 문구", t.includes("야간수당은 최저임금 비교에서 제외됨"));
  await p.fill("#base", "2500000");
  t = await T("#resB");
  ok("B 2,500,000 → 미달", t.includes("최저임금 미달") && t.includes("11,200원 부족"));
  await p.selectOption("#year", "2027"); await p.fill("#base", "2511200");
  ok("B 2027 2,511,200 → 미달", (await T("#resB")).includes("최저임금 미달"));
  await p.fill("#base", "2603667");
  ok("B 2027 2,603,667 → 이상", (await T("#resB")).includes("최저임금 이상"));

  // 휴게시간 체크리스트
  ok("경고 초기 숨김", !(await p.locator("#restWarn").isVisible()));
  await p.check(".rc >> nth=2");
  ok("체크 시 경고 표시", (await T("#restWarn")).includes("이 시간은 근로시간으로 인정될 수 있음"));
  await p.click("#refocus");
  ok("재입력 유도 → 모드 B 휴게 포커스", await p.evaluate(() => document.activeElement.id) === "restB");
  await p.click("#tabA"); await p.click("#refocus");
  ok("재입력 유도 → 모드 A 휴게 포커스", await p.evaluate(() => document.activeElement.id) === "restA");
  await p.uncheck(".rc >> nth=2");
  ok("해제 시 경고 숨김", !(await p.locator("#restWarn").isVisible()));

  // 외부 요청 없음 / 오류 없음 / 가로 스크롤 없음
  ok("외부 요청 없음", reqs.every((u) => u.startsWith("file:") || u.startsWith("data:")));
  ok("JS 오류 없음", errs.length === 0);
  ok("가로 스크롤 없음(390px)", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // 순수 함수 직접 검증
  const g = await p.evaluate(() => { const c = GuardCalc.calcA({ year: 2026, wage: 10320, rest: 8, nightRest: 4, five: true }); const d = GuardCalc.calcA({ year: 2027, wage: 10700, rest: 8, nightRest: 4, five: true }); return [c.basic, c.night, c.total, d.total]; });
  ok("calcA 직접: [2511200,313900,2825100,2929125]", JSON.stringify(g) === "[2511200,313900,2825100,2929125]");

  await p.selectOption("#year", "2026");
  await p.screenshot({ path: "/tmp/claude-0/calc-mobile.png", fullPage: true });
  await p.click("#tabA"); await p.screenshot({ path: "/tmp/claude-0/calc-mobile-a.png", fullPage: true });
  console.log(`\nALL ${pass} CHECKS PASSED`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
