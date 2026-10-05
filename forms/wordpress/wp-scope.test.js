// 워드프레스 조각 점검: 태그 금지, CSS 한정, 전역 누수·ID 충돌 없음
// 실행: node wp-scope.test.js   (playwright 필요, CHROME_PATH 로 크롬 경로 지정 가능)
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), __dirname, "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }));

const FILES = ["1_위쪽글.html", "2_계산기.html", "3_아래쪽글.html", "wp-guard-calc-all.html"];
let pass = 0;
const ok = (name, cond) => { assert(cond, "FAIL: " + name); console.log("PASS", name); pass++; };

// 선택자 추출 (@media 안쪽 포함)
function selectors(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let d = 1, j = open + 1; while (d && j < css.length) { if (css[j] === "{") d++; else if (css[j] === "}") d--; j++; }
    if (head.startsWith("@")) out.push(...selectors(css.slice(open + 1, j - 1)));
    else out.push(...head.split(",").map((s) => s.trim()));
    i = j;
  }
  return out;
}

for (const f of FILES) {
  const html = fs.readFileSync(path.join(__dirname, f), "utf8");
  ok(`${f}: html/head/body/doctype 태그 없음`, !/<\s*(!doctype|html|head|body)\b/i.test(html));
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, ""));
  ok(`${f}: <style> 존재`, styles.length >= 1);
  const sels = styles.flatMap(selectors);
  const bad = sels.filter((s) => !/^(#guard-calc|\.gc-article)(?![\w-])/.test(s));
  ok(`${f}: 모든 CSS 선택자(${sels.length}개)가 #guard-calc / .gc-article 하위 (위반: ${bad.join(" | ") || "없음"})`, bad.length === 0);
  ok(`${f}: 다크모드 미디어쿼리 없음`, !/prefers-color-scheme/.test(html));
  ok(`${f}: 빈 줄 없음(자동 <p> 삽입 방지)`, !/\n\s*\n/.test(html));
}
const calc = fs.readFileSync(path.join(__dirname, "2_계산기.html"), "utf8");
ok("2_계산기: 비접두어 id 없음", [...calc.matchAll(/\bid="([^"]+)"/g)].every((m) => m[1] === "guard-calc" || m[1].startsWith("gc-")));
ok("2_계산기: 스크립트가 즉시실행함수로 감싸짐", /<script>\s*\(function \(\) \{/.test(calc));
ok("2_계산기: 설명글 id(gcs-)와 충돌 없음", !/id="gcs-/.test(calc));

/* ── ③ 업로드용 합본: 요약 → 계산기 → 목차 → 설명글 ── */
const ALL = fs.readFileSync(path.join(__dirname, "wp-guard-calc-all.html"), "utf8");
const at = (needle) => ALL.indexOf(needle);
const scripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const B64LINE = /^"[A-Za-z0-9+/=]+",?$/;
const encScript = scripts(ALL)[0];
const b64Lines = encScript.split("\n").filter((l) => B64LINE.test(l));
const loaderText = encScript.split("\n").filter((l) => !B64LINE.test(l)).join("\n");
const decoded = Buffer.from(b64Lines.map((l) => l.replace(/[",]/g, "")).join(""), "base64").toString("utf8");
{
  const order = ["2줄 요약", 'id="guard-calc"', 'class="gc-toc"', 'id="gcs-approval"', 'id="gcs-changes"', 'id="gcs-rest"', 'id="gcs-night"', 'id="gcs-examples"', 'id="gcs-faq"', 'id="gcs-links"', 'id="gcs-source"'];
  const pos = order.map(at);
  ok(`합본 순서: ${order.join(" → ")}`, pos.every((v) => v >= 0) && pos.every((v, i) => i === 0 || v > pos[i - 1]));
  ok("합본에 테마 견본(h1·버튼·문단) 없음", !/sentinel-|테마 제목|테마 버튼|테마 문단/.test(ALL));
  ok("합본: 계산기 첫 화면 버튼 2개 + 예시 버튼 포함 (스크립트는 base64 라 풀어서 확인)", decoded.includes("내 월급, 제대로 받았나 확인하기") && decoded.includes("앞으로 받을 월급 미리 계산하기") && decoded.includes("예시로 해보기") && ALL.includes('id="gc-app"'));
  const toc = ALL.slice(at('class="gc-toc"'), at('class="gc-toc"') + 900);
  ok("합본: 목차 7개 항목, '계산기 바로 사용하기' 항목 없음", (toc.match(/<li><a href="#gcs-/g) || []).length === 7 && !ALL.includes("계산기 바로 사용하기") && !toc.includes('href="#guard-calc"'));
  ok("합본: <style> 2개(설명글 1 + 계산기 1), <script> 1개, 문서 한 덩어리", (ALL.match(/<style>/g) || []).length === 2 && (ALL.match(/<script>/g) || []).length === 1 && ALL.trimStart().startsWith("<!--"));
  ok("합본: 운영자 문단 없음", !ALL.includes("gc-operator") && !ALL.includes("blockquote"));
  const PRE = fs.readFileSync(path.join(__dirname, "preview-all.html"), "utf8");
  ok("테스트용 preview-all.html 은 합본 + 테마 견본(같은 내용 포함)", PRE.includes(ALL) && PRE.includes("sentinel-h1"));
}

/* ── 워드프레스 안전: <script> 안에 &, <, > 가 하나도 없어야 함 (base64 + 짧은 로더) ── */
for (const f of ["wp-guard-calc-all.html", "2_계산기.html", "preview-all.html"]) {
  const sc = scripts(fs.readFileSync(path.join(__dirname, f), "utf8"));
  const bad = sc.map((s) => ({ amp: (s.match(/&/g) || []).length, lt: (s.match(/</g) || []).length, gt: (s.match(/>/g) || []).length }));
  ok(`${f}: <script> ${sc.length}개 안의 & / < / > 문자 0개 (${JSON.stringify(bad)})`, sc.length >= 1 && bad.every((x) => x.amp + x.lt + x.gt === 0));
}
ok(`로더는 짧음 (${loaderText.trim().length}자) · base64 ${b64Lines.length}줄`, loaderText.trim().length < 700 && b64Lines.length > 10);
ok("로더에 & < > 없음 · eval 미사용 · atob 로 풀어 <script> 를 만들어 실행", !/[&<>]/.test(loaderText) && !/\beval\b/.test(loaderText) && /atob\(/.test(loaderText) && /createElement\("script"\)/.test(loaderText));
ok("base64 줄은 A-Z a-z 0-9 + / = 만 사용", b64Lines.every((l) => /^"[A-Za-z0-9+/=]+",?$/.test(l)));
let syntaxOk = true; try { new Function(decoded); } catch (e) { syntaxOk = false; }
ok("base64를 풀면 계산기 스크립트(문법 정상, && · < · > 는 인코딩 안에만 존재)", syntaxOk && decoded.includes("guard-calc") && decoded.includes("window.GuardCalc") && /&&/.test(decoded) && /</.test(decoded) && />/.test(decoded));
ok("풀린 스크립트는 한글을 그대로 포함(UTF-8 보존)", decoded.includes("한 달 약") && decoded.includes("예시로 해보기"));
{
  // 대조군: 인코딩하지 않은 원본 스크립트에 워드프레스식 변형(& → &#038;)을 하면 SyntaxError (콘솔의 Invalid or unexpected token 재현)
  const raw = fs.readFileSync(path.join(__dirname, "..", "guard-salary-calculator.html"), "utf8").match(/<script>([\s\S]*)<\/script>/)[1];
  let rawThrows = false; try { new Function(raw.replace(/&/g, "&#038;")); } catch (e) { rawThrows = e instanceof SyntaxError; }
  ok("(대조군) 인코딩 전 스크립트는 &→&#038; 변형에서 SyntaxError — 이번 수정이 필요한 이유", rawThrows);
}

/* ── ① 금지 표현이 forms/ 전체에 없음 ── */
{
  const BAN = ["3" + "교대", "저희 " + "근무지", "경비 일을 " + "하고"];
  const hits = [];
  const walk = (d) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (n.name === "node_modules" || n.name === ".git") continue;
    const f = path.join(d, n.name);
    if (n.isDirectory()) walk(f);
    else if (/\.(html|js|md|txt|json|css)$/.test(n.name)) { const c = fs.readFileSync(f, "utf8"); for (const w of BAN) if (c.includes(w)) hits.push(`${path.relative(path.join(__dirname, ".."), f)}: ${w}`); }
  } };
  walk(path.join(__dirname, ".."));
  ok(`금지 표현 없음 (forms/ 전체 텍스트 파일 검사${hits.length ? " — 발견: " + hits.join(", ") : ""})`, hits.length === 0);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "preview-all.html"));
  const dup = await p.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i); });
  ok(`문서 전체 id 중복 없음 (${dup.join(",") || "없음"})`, dup.length === 0);
  const read = () => p.evaluate(() => {
    const props = ["fontSize", "fontFamily", "fontWeight", "margin", "padding", "color", "backgroundColor", "lineHeight", "boxSizing", "border", "borderRadius", "display", "textAlign"];
    const pick = (sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
    return { h1: pick("#sentinel-h1"), btn: pick("#sentinel-btn"), p: pick("#sentinel-p"), body: pick("body") };
  });
  const withCss = await read();
  const bare = await b.newPage({ viewport: { width: 390, height: 900 } });
  await bare.setContent(`<!doctype html><html lang="ko"><body style="margin:0"><h1 id="sentinel-h1">테마 제목(h1)</h1><button id="sentinel-btn">테마 버튼</button><p id="sentinel-p">테마 문단</p></body></html>`);
  const without = await bare.evaluate(() => {
    const props = ["fontSize", "fontFamily", "fontWeight", "margin", "padding", "color", "backgroundColor", "lineHeight", "boxSizing", "border", "borderRadius", "display", "textAlign"];
    const pick = (sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
    return { h1: pick("#sentinel-h1"), btn: pick("#sentinel-btn"), p: pick("#sentinel-p"), body: pick("body") };
  });
  for (const k of ["h1", "btn", "p", "body"]) ok(`전역 누수 없음: 바깥 ${k} 요소의 계산 스타일이 CSS 삽입 전후 동일`, JSON.stringify(withCss[k]) === JSON.stringify(without[k]));
  // 합본 파일만 넣은 맨 페이지(= 블록 하나에 붙여넣은 상태)에서 화면 순서·동작 확인
  const only = await b.newPage({ viewport: { width: 390, height: 900 } });
  const e2 = []; only.on("pageerror", (e) => e2.push(e.message));
  await only.setContent(`<!doctype html><html lang="ko"><body style="margin:0"><div class="entry-content">${ALL}</div></body></html>`);
  const ord = await only.evaluate(() => {
    const y = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
    const el = (s) => document.querySelector(s);
    const before = (a, b) => !!(el(a).compareDocumentPosition(el(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { dom: before(".gc-summary", "#guard-calc") && before("#guard-calc", ".gc-toc") && before(".gc-toc", "#gcs-approval"), pos: [y(".gc-summary"), y("#guard-calc"), y(".gc-toc"), y("#gcs-approval")] };
  });
  ok(`합본만 붙여넣은 페이지에서 화면 순서: 요약 → 계산기 → 목차 → 설명글 (y=${ord.pos.map(Math.round)})`, ord.dom && ord.pos.every((v, i) => i === 0 || v > ord.pos[i - 1]));
  await only.click("#gc-start-example");
  ok("합본만 붙여넣은 페이지에서도 계산기 동작(예시 → 2,825,100원)", (await only.innerText("#gc-totalA")) === "2,825,100원" && e2.length === 0);
  await only.close();
  // 워드프레스식 변형 재현: 문서 전체의 & 를 &#038; 로, 스크립트가 없는 > 는 건드리지 않음 → 계산기가 그대로 동작해야 함
  const mangled = ALL.replace(/&/g, "&#038;");
  const wp = await b.newPage({ viewport: { width: 390, height: 900 } });
  const e3 = []; wp.on("pageerror", (e) => e3.push(e.message)); wp.on("console", (m) => { if (m.type() === "error") e3.push(m.text()); });
  await wp.setContent(`<!doctype html><html lang="ko"><body style="margin:0"><div class="entry-content">${mangled}</div></body></html>`);
  await wp.click("#gc-start-example");
  ok("&→&#038; 변형된 합본에서도 계산기 동작 + 콘솔 오류 없음 (예시 → 2,825,100원)", (await wp.innerText("#gc-totalA")) === "2,825,100원" && e3.length === 0);
  await wp.click("#gc-btn-restart"); await wp.click("#gc-start-B");
  ok("변형된 합본에서 모드 B 첫 질문까지 정상", (await wp.innerText("#gc-progress")) === "1/5");
  await wp.close();
  ok("가로 스크롤 없음(390px, 표는 자체 스크롤)", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok("목차 앵커가 모두 실제 요소를 가리킴", await p.evaluate(() => [...document.querySelectorAll(".gc-toc a")].every((a) => document.querySelector(a.getAttribute("href")))));
  ok("JS 오류 없음", errs.length === 0);
  console.log(`\nALL ${pass} CHECKS PASSED (wp-scope)`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
