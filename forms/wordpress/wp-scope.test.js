// 워드프레스 조각 점검: 태그 금지, CSS 한정, 전역 누수·ID 충돌 없음
// 실행: node wp-scope.test.js   (playwright 필요, CHROME_PATH 로 크롬 경로 지정 가능)
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), __dirname, "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }));

const FILES = ["1_위쪽글.html", "2_계산기.html", "3_아래쪽글.html"];
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
  ok("가로 스크롤 없음(390px, 표는 자체 스크롤)", await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok("목차 앵커가 모두 실제 요소를 가리킴", await p.evaluate(() => [...document.querySelectorAll(".gc-toc a")].every((a) => document.querySelector(a.getAttribute("href")))));
  ok("JS 오류 없음", errs.length === 0);
  console.log(`\nALL ${pass} CHECKS PASSED (wp-scope)`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
