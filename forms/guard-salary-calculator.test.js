// 경비원 월급 계산기(단계형) UI 테스트
// 실행: node guard-salary-calculator.test.js [대상 HTML 경로] [ID 접두어]
//   원본:        node guard-salary-calculator.test.js
//   워드프레스:  node guard-salary-calculator.test.js wordpress/preview-all.html gc-
// playwright 필요 (크롬 경로는 CHROME_PATH 환경변수로 지정, 기본 /opt/pw-browsers/chromium)
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), __dirname, "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }));

const FILE = path.resolve(process.argv[2] || path.join(__dirname, "guard-salary-calculator.html"));
const PX = process.argv[3] || "";
// "#btn-next" → "#<PX>btn-next"  (id 접두어)
const S = (sel) => sel.replace(/#([\w-]+)/g, `#${PX}$1`);
const RADIO = new Set(["year", "wtype", "approved", "five"]);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" }); // 다크 환경에서도 밝게 보여야 함
  const p = await ctx.newPage();
  const reqs = [], errs = [];
  p.on("request", (r) => reqs.push(r.url()));
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + FILE);

  let pass = 0;
  const ok = (name, cond) => { assert(cond, "FAIL: " + name); console.log("PASS", name); pass++; };
  const T = async (s) => (await p.locator(S(s)).innerText()).replace(/\s+/g, " ");
  const has = async (s) => (await p.locator(S(s)).count()) > 0;
  const click = (s) => p.click(S(s));
  const restart = async () => { if (await has("#btn-restart")) await click("#btn-restart"); else if (!(await has("#start-A"))) { while (!(await has("#start-A"))) await click("#btn-prev"); } };

  /* 한 단계 답하기 */
  const answer = async (key, v) => {
    if (RADIO.has(key)) await click(`#opt-${key}-${v}`);
    else await p.fill(S(`#in-${key}`), String(v));
  };
  /* 질문을 차례로 답하며 진행. 오류가 나면 그 문구 반환, 결과가 뜨면 "" 반환. until 이 주어지면 그 단계에서 멈춤 */
  async function flow(mode, ans, until) {
    await restart();
    await click(`#start-${mode}`);
    for (let g = 0; g < 14; g++) {
      if (await has("#result")) return "";
      const key = await p.getAttribute(S("#q"), "data-step");
      if (until && key === until) return "stopped";
      if (!(key in ans)) throw new Error("답이 없는 단계: " + key);
      await answer(key, ans[key]);
      await click("#btn-next");
      if (await has("#q-err")) { const e = await T("#q-err"); if (e) return e; }
    }
    throw new Error("결과에 도달하지 못함");
  }
  const A = (o) => ({ year: "2026", wtype: "daily", wage: "10320", rest: 8, nightRest: 4, approved: "yes", five: "yes", ...o });
  const AS = (o) => ({ year: "2026", wtype: "shift", wage: "10320", days: 20, shift: 8, restS: 1, nightWork: 7, approved: "yes", five: "yes", ...o });
  const B = (o) => ({ year: "2026", wtype: "daily", base: 2511200, rest: 8, approved: "yes", ...o });
  const BS = (o) => ({ year: "2026", wtype: "shift", base: 1444800, days: 20, shift: 8, restS: 1, approved: "yes", ...o });

  /* ── ① 첫 화면 ─────────────────── */
  const root = PX ? "#guard-calc" : "body";
  const bg = await p.evaluate((sel) => getComputedStyle(document.querySelector(sel)).backgroundColor, root);
  ok("다크 환경에서도 밝은 배경 (rgb(246, 247, 250))", bg === "rgb(246, 247, 250)");
  ok("CSS에 prefers-color-scheme 없음", !/prefers-color-scheme\s*:\s*dark/.test(fs.readFileSync(FILE, "utf8")));
  const startB = await T("#start-B"), startA = await T("#start-A");
  ok("첫 화면 큰 버튼: 내 월급, 제대로 받았나 확인하기", startB.startsWith("내 월급, 제대로 받았나 확인하기"));
  ok("첫 화면 큰 버튼: 앞으로 받을 월급 미리 계산하기", startA.startsWith("앞으로 받을 월급 미리 계산하기"));
  ok("첫 화면에 '예시로 해보기' 버튼", (await T("#start-example")) === "예시로 해보기");
  ok("첫 화면에는 진행 표시가 없음", !(await has("#progress")));

  /* ── ⑦ 글자·버튼 크기, 색 대비 ───── */
  const m = await p.evaluate(({ sa, sb, root }) => {
    const fs = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
    const h = (s) => document.querySelector(s).getBoundingClientRect().height;
    return { base: fs(root), btnA: h(sa), btnB: h(sb), fontA: fs(sa) };
  }, { sa: S("#start-A"), sb: S("#start-B"), root });
  ok(`기본 글자 18px 이상 (${m.base}px)`, m.base >= 18);
  ok(`첫 화면 버튼 높이 52px 이상 (${Math.round(m.btnA)}, ${Math.round(m.btnB)}px) / 글자 ${m.fontA}px`, m.btnA >= 52 && m.btnB >= 52 && m.fontA >= 18);

  /* ── ② 한 화면에 질문 하나 + 진행 표시 ── */
  await click("#start-A");
  ok("진행 표시 1/7 (격일제 기준 7단계)", (await T("#progress")) === "1/7");
  ok("질문은 한 화면에 하나(제목 1개)", (await p.locator(S("#q .q-title")).count()) === 1);
  ok("[이전]/[다음] 버튼 존재", (await T("#btn-prev")) === "이전" && (await T("#btn-next")) === "다음");
  await click("#btn-next");
  ok("선택 없이 다음 → 안내 문구, 화면 유지", (await T("#q-err")) === "하나를 골라 주세요." && (await T("#progress")) === "1/7");
  await click("#opt-year-2026"); await click("#btn-next");
  ok("진행 표시 2/7", (await T("#progress")) === "2/7");
  await click("#opt-wtype-shift");
  ok("교대제 선택하면 총 단계 9 (2/9)", (await T("#progress")) === "2/9");
  await click("#opt-wtype-daily");
  ok("격일제로 되돌리면 2/7", (await T("#progress")) === "2/7");
  await click("#btn-next");
  ok("진행 표시 3/7 (시급 단계)", (await T("#progress")) === "3/7" && (await p.getAttribute(S("#q"), "data-step")) === "wage");
  ok("질문 아래 도움말(회색) 한 줄", (await T("#q .q-help")).length > 5);
  await click("#btn-prev");
  ok("이전 → 근무형태 단계(2/7), 선택 유지", (await T("#progress")) === "2/7" && (await p.getAttribute(S("#opt-wtype-daily"), "aria-pressed")) === "true");
  await click("#btn-prev"); await click("#btn-prev");
  ok("첫 질문에서 이전 → 첫 화면", await has("#start-A"));

  /* ── ③④ 도움말 문구, +/− 입력 ────── */
  await flow("A", A(), "rest");
  ok("휴게 질문 도움말: 근무표나 근로계약서에 적혀 있어요", (await T("#q .q-help")).includes("근무표나 근로계약서에 적혀 있어요"));
  ok("wage default 2026 = 10320 (이전 단계 값 확인)", await (async () => { await click("#btn-prev"); const v = await p.inputValue(S("#in-wage")); await click("#btn-next"); return v === "10320"; })());
  await click("#inc-rest");
  ok("[+] 빈 칸에서 0.5", (await p.inputValue(S("#in-rest"))) === "0.5");
  await click("#inc-rest"); await click("#inc-rest");
  ok("[+] 두 번 더 → 1.5", (await p.inputValue(S("#in-rest"))) === "1.5");
  await click("#dec-rest"); await click("#dec-rest"); await click("#dec-rest"); await click("#dec-rest");
  ok("[−] 0 아래로 내려가지 않음", (await p.inputValue(S("#in-rest"))) === "0");
  await p.fill(S("#in-rest"), "8");
  await click("#inc-rest");
  ok("키보드로 8 입력 후 [+] → 8.5", (await p.inputValue(S("#in-rest"))) === "8.5");
  const sz = await p.evaluate((ids) => ids.map((id) => document.getElementById(id).getBoundingClientRect().height), [PX + "dec-rest", PX + "in-rest", PX + "inc-rest", PX + "btn-next", PX + "btn-prev"]);
  ok(`[−]·입력·[+]·이전/다음 높이 52px 이상 (${sz.map(Math.round)})`, sz.every((v) => v >= 52));

  /* 색 대비 (WCAG) */
  const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const cols = await p.evaluate((ids) => {
    const g = (el, k) => getComputedStyle(el)[k];
    const q = (s) => document.querySelector(s);
    return {
      title: [g(q("#" + ids.title), "color"), g(q("#" + ids.card), "backgroundColor")],
      help: [g(q("#" + ids.card + " .q-help"), "color"), g(q("#" + ids.card), "backgroundColor")],
      next: [g(q("#" + ids.next), "color"), g(q("#" + ids.next), "backgroundColor")],
      prev: [g(q("#" + ids.prev), "color"), g(q("#" + ids.prev), "backgroundColor")],
    };
  }, { title: PX + "q-title", card: PX + "q", next: PX + "btn-next", prev: PX + "btn-prev" });
  const R = Object.fromEntries(Object.entries(cols).map(([k, [f, bgc]]) => [k, ratio(f, bgc)]));
  ok(`색 대비: 제목 ${R.title.toFixed(1)} / 도움말 ${R.help.toFixed(1)} / 다음 ${R.next.toFixed(1)} / 이전 ${R.prev.toFixed(1)} (모두 7:1 이상)`, Object.values(R).every((v) => v >= 7));

  /* ── 격일제 값 검증 (기존 값 그대로) ── */
  ok("격일제 2026 결과 도달", (await flow("A", A())) === "");
  let t = await T("#result");
  ok("2026 기본급 2,511,200원", t.includes("2,511,200원"));
  ok("2026 야간수당 313,900원", t.includes("313,900원"));
  ok("2026 합계 2,825,100원", (await T("#totalA")) === "2,825,100원");
  ok("월평균 243.33시간", t.includes("243.33시간"));
  ok("⑥ '한 달 약 ○원 (세금 떼기 전)' 큰 글씨", (await T("#result .res-big")).startsWith("2,825,100원") && t.includes("한 달 약") && t.includes("(세금 떼기 전)"));
  ok("⑥ '급여명세서 총액과 비교해 보세요'", t.includes("급여명세서 총액과 비교해 보세요"));
  ok("⑥ 계산 과정은 접혀 있음(open 아님) + 내용 존재", !(await p.locator(S("#result details")).evaluate((d) => d.open)) && (await p.locator(S("#result details")).textContent()).includes("월평균 근로시간 = (24 − 8)"));
  ok("⑥ 1350은 tel: 링크", (await p.locator(S('#result a[href="tel:1350"]')).count()) >= 1);
  const bigPx = await p.evaluate((id) => parseFloat(getComputedStyle(document.getElementById(id)).fontSize), PX + "totalA");
  ok(`결과 금액 글자 큼 (${bigPx}px)`, bigPx >= 32 || (await p.evaluate((id) => parseFloat(getComputedStyle(document.getElementById(id).parentElement).fontSize), PX + "totalA")) >= 32);

  ok("격일제 2027 결과 도달", (await flow("A", A({ year: "2027", wage: "10700" }))) === "");
  t = await T("#result");
  ok("2027 합계 2,929,125원", (await T("#totalA")).includes("2,929,125원"));
  ok("2027 기본급 2,603,667원", t.includes("2,603,667원"));
  ok("2027 야간수당 325,458원", t.includes("325,458원"));
  // 시급 기본값이 연도를 따라감
  await flow("A", A({ year: "2027" }), "wage");
  ok("wage auto 10700 (2027)", (await p.inputValue(S("#in-wage"))) === "10700");
  // 사용자가 바꾼 시급은 연도를 바꿔도 유지
  await p.fill(S("#in-wage"), "12000");
  await click("#btn-prev"); await click("#btn-prev"); await click("#opt-year-2026"); await click("#btn-next"); await click("#btn-next");
  ok("touched wage kept (연도 바꿔도 12000 유지)", (await p.inputValue(S("#in-wage"))) === "12000");

  ok("5인 미만 → 결과 도달", (await flow("A", A({ five: "no" }))) === "");
  t = await T("#result");
  ok("5인 미만 야간 0원", t.includes("0원 (5인 미만)") && (await T("#totalA")).includes("2,511,200원"));
  ok("승인 아니오 → 결과 도달", (await flow("A", A({ approved: "no" }))) === "");
  t = await T("#result");
  ok("승인 아니오 안내(1350)", t.includes("연장·휴일·주휴 가산 대상일 수 있어 금액이 더 클 수 있어요") && t.includes("1350") && !(await has("#totalA")) && !t.includes("합계"));
  ok("승인 아니오 안내의 1350도 tel: 링크", (await p.locator(S('#result a[href="tel:1350"]')).count()) >= 1);
  ok("야간휴게 9 오류", (await flow("A", A({ nightRest: 9 }))).includes("0~8시간"));
  ok("야간휴게>휴게 오류", (await flow("A", A({ rest: 3, nightRest: 4 }))).includes("클 수 없습니다"));
  ok("휴게 24 오류", (await flow("A", A({ rest: 24 }))).includes("24 미만"));
  ok("숫자 비움 오류", (await flow("A", A({ rest: "" }))) === "숫자를 적어 주세요.");

  /* ── 교대제 (월 20일, 8시간, 휴게 1, 야간 7) ── */
  ok("교대제 결과 도달", (await flow("A", AS())) === "");
  t = await T("#result");
  ok("교대제 월 근로시간 140시간", t.includes("140시간"));
  ok("교대제 기본급 1,444,800원", t.includes("1,444,800원"));
  ok("교대제 야간수당 722,400원", t.includes("722,400원"));
  ok("교대제 합계 2,167,200원", (await T("#totalA")) === "2,167,200원");
  ok("교대제 계산 과정 표시", (await p.locator(S("#result details")).textContent()).includes("20 × (8 − 1)"));
  await flow("A", AS(), "days");
  ok("교대제 진행 표시 (days = 4/9)", (await T("#progress")) === "4/9");
  ok("교대제 2027 합계 2,247,000원 (기본 1,498,000 + 야간 749,000)", (await flow("A", AS({ year: "2027", wage: "10700" }))) === "" && (await T("#totalA")) === "2,247,000원" && (await T("#result")).includes("1,498,000원") && (await T("#result")).includes("749,000원"));
  ok("교대제 5인 미만 야간 0원", (await flow("A", AS({ five: "no" }))) === "" && (await T("#result")).includes("0원 (5인 미만)") && (await T("#totalA")) === "1,444,800원");
  ok("교대제 승인 아니오 → 상담 안내", (await flow("A", AS({ approved: "no" }))) === "" && (await T("#result")).includes("1350") && !(await has("#totalA")));
  ok("교대제 야간>실근로 오류", (await flow("A", AS({ nightWork: 8 }))).includes("실제 근로시간"));
  ok("교대제 휴게≥근무 오류", (await flow("A", AS({ restS: 8 }))).includes("근무시간 미만"));
  ok("교대제 근무일수 32 오류", (await flow("A", AS({ days: 32 }))).includes("31 이하"));
  ok("교대제 근무시간 25 오류", (await flow("A", AS({ shift: 25 }))).includes("24 이하"));

  /* ── ⑤ '모르겠어요' ─────────────── */
  ok("승인 모름 → 결과 도달", (await flow("A", A({ approved: "unknown" }))) === "");
  t = await T("#result");
  ok("승인 모름: 승인 기준 합계 2,825,100원", (await T("#totalA")) === "2,825,100원");
  ok("승인 모름: '승인을 안 받았다면 이보다 더 받아야 할 수 있어요' + 상담 1350(tel)", t.includes("승인을 안 받았다면 이보다 더 받아야 할 수 있어요") && (await p.locator(S('#result a[href="tel:1350"]')).count()) >= 1);
  ok("5인 모름 → 결과 도달", (await flow("A", A({ five: "unknown" }))) === "");
  t = await T("#result");
  ok("5인 모름: 5인 이상 기준(야간수당 313,900원, 합계 2,825,100원)", t.includes("313,900원") && (await T("#totalA")) === "2,825,100원");
  ok("5인 모름: '아파트 관리업체는 대부분 5인 이상' 안내", t.includes("아파트 관리업체는 대부분 5인 이상"));
  ok("둘 다 모름 → 안내 2개 + 합계 2,825,100원", (await flow("A", A({ approved: "unknown", five: "unknown" }))) === "" && (await p.locator(S("#result .note")).count()) >= 2 && (await T("#totalA")) === "2,825,100원");
  ok("교대제 승인·5인 모름 → 합계 2,167,200원", (await flow("A", AS({ approved: "unknown", five: "unknown" }))) === "" && (await T("#totalA")) === "2,167,200원");
  ok("승인·5인 선택 안 하고 다음 → 안내, 결과 안 뜸", (await (async () => { await flow("A", A(), "approved"); await click("#btn-next"); return await T("#q-err"); })()) === "하나를 골라 주세요." && !(await has("#result")));
  ok("5인 질문은 모드 A에만 있음 (B 격일제 5단계, five 없음)", (await (async () => { await flow("B", B(), "approved"); return await T("#progress"); })()) === "5/5");

  /* ── ① 모드 B ───────────────────── */
  ok("B 격일제 결과 도달", (await flow("B", B())) === "");
  t = await T("#result");
  ok("B 격일제 2026 기본급 2,511,200 → 이상, 시간당 10,320원", t.includes("최저임금 이상") && (await T("#hourlyB")).startsWith("10,320원"));
  ok("B 야간 제외 문구", t.includes("야간수당은 최저임금 비교에서 제외됨"));
  ok("B 격일제 2,500,000 → 미달 (11,200원 부족)", (await flow("B", B({ base: 2500000 }))) === "" && (await T("#result")).includes("최저임금 미달") && (await T("#result")).includes("11,200원 부족"));
  ok("B 격일제 2027 2,511,200 → 미달", (await flow("B", B({ year: "2027" }))) === "" && (await T("#result")).includes("최저임금 미달"));
  ok("B 격일제 2027 2,603,667 → 이상", (await flow("B", B({ year: "2027", base: 2603667 }))) === "" && (await T("#result")).includes("최저임금 이상"));
  ok("B 교대제 1,444,800 → 시간당 10,320원, 이상", (await flow("B", BS())) === "" && (await T("#result")).includes("최저임금 이상") && (await T("#hourlyB")).startsWith("10,320원"));
  ok("B 교대제 1,400,000 → 미달 (44,800원 부족)", (await flow("B", BS({ base: 1400000 }))) === "" && (await T("#result")).includes("최저임금 미달") && (await T("#result")).includes("44,800원 부족"));
  ok("B 승인 아니오 → 판정 대신 상담 안내(1350)", (await flow("B", B({ approved: "no" }))) === "" && await (async () => { const x = await T("#result"); return x.includes("1350") && x.includes("금액이 더 클 수 있어요") && !x.includes("최저임금 이상") && !x.includes("최저임금 미달") && (await p.locator(S('#result a[href="tel:1350"]')).count()) >= 1; })());
  ok("B 승인 모름 → 승인 기준 판정 + 안내", (await flow("B", B({ approved: "unknown" }))) === "" && await (async () => { const x = await T("#result"); return x.includes("최저임금 이상") && x.includes("승인을 안 받았다면 이보다 더 받아야 할 수 있어요"); })());
  ok("B 교대제 근무시간 25 오류", (await flow("B", BS({ shift: 25 }))).includes("24 이하"));
  ok("B 승인 미선택 시 판정 보류", (await (async () => { await flow("B", B(), "approved"); await click("#btn-next"); return !(await has("#result")) && (await T("#q-err")) === "하나를 골라 주세요."; })()));
  ok("B 진행 표시 (격일제 5단계 / 교대제 7단계)", (await (async () => { await flow("B", BS(), "approved"); return (await T("#progress")) === "7/7"; })()));

  /* ── ⑧ 예시로 해보기 ─────────────── */
  await restart(); await click("#start-example");
  t = await T("#result");
  ok("예시로 해보기 → 곧바로 결과(합계 2,825,100원)", (await T("#totalA")) === "2,825,100원" && t.includes("2,511,200원") && t.includes("313,900원"));
  ok("예시 결과에 '예시 값' 안내", t.includes("예시 값으로 계산한 결과"));
  ok("예시 결과에서도 계산 과정은 접혀 있음", !(await p.locator(S("#result details")).evaluate((d) => d.open)));
  await click("#btn-prev");
  ok("예시 결과에서 이전 → 마지막 질문(5인 여부), 값 유지", (await p.getAttribute(S("#q"), "data-step")) === "five" && (await p.getAttribute(S("#opt-five-yes"), "aria-pressed")) === "true" && (await T("#progress")) === "7/7");
  await restart();
  ok("처음으로 → 첫 화면", await has("#start-B"));

  /* ── 휴게시간 점검 (체크리스트) ──── */
  const checkAt = async (mode, ans, step, inputId) => {
    await flow(mode, ans, step);
    const before = !(await p.locator(S("#restWarn")).isVisible());
    await p.check(`${PX ? "#guard-calc " : ""}.rc >> nth=2`);
    const shown = (await T("#restWarn")).includes("이 시간은 근로시간으로 인정될 수 있음");
    await click("#refocus");
    const focused = (await p.evaluate(() => document.activeElement.id)) === PX + inputId;
    return before && shown && focused;
  };
  ok("체크리스트(A 격일제): 경고 표시 + 휴게시간 입력칸으로 유도", await checkAt("A", A(), "rest", "in-rest"));
  ok("체크리스트(A 교대제): 경고 표시 + 휴게시간 입력칸으로 유도", await checkAt("A", AS(), "restS", "in-restS"));
  ok("체크리스트(B 격일제): 경고 표시 + 휴게시간 입력칸으로 유도", await checkAt("B", B(), "rest", "in-rest"));
  ok("체크리스트(B 교대제): 경고 표시 + 휴게시간 입력칸으로 유도", await checkAt("B", BS(), "restS", "in-restS"));
  await p.uncheck(`${PX ? "#guard-calc " : ""}.rc >> nth=2`);
  ok("해제 시 경고 숨김", !(await p.locator(S("#restWarn")).isVisible()));
  await p.check(`${PX ? "#guard-calc " : ""}.rc >> nth=0`);
  await p.fill(S("#in-restS"), "1"); // B 교대제 휴게 단계
  await p.fill(S("#in-restS"), "1");
  while (!(await has("#result"))) { const key = await p.getAttribute(S("#q"), "data-step"); const v = { restS: 1, approved: "yes" }[key]; await answer(key, v); await click("#btn-next"); }
  ok("체크 항목이 있으면 결과에 '실제보다 작게 나올 수 있어요' 경고", (await T("#result")).includes("실제보다 작게 나올 수 있으니"));

  /* ── 공통 점검 ──────────────────── */
  ok("외부 요청 없음", reqs.every((u) => u.startsWith("file:") || u.startsWith("data:")));
  ok("JS 오류 없음", errs.length === 0);
  const scrolls = [];
  await restart(); scrolls.push(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await click("#start-A"); scrolls.push(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await flow("A", AS()); scrolls.push(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok("가로 스크롤 없음(390px: 첫 화면·질문·결과)", scrolls.every(Boolean));
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
