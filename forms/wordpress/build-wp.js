// 원본 guard-salary-calculator.html → 워드프레스 '사용자 정의 HTML' 블록용 조각으로 변환
// 실행: node build-wp.js   (원본은 수정하지 않음)
//  - html/head/body 태그 없음
//  - 모든 CSS 선택자는 #guard-calc 아래로 한정 (전역 단독 선택자 없음)
//  - id/name 은 gc- 접두어, 스크립트는 즉시실행함수로 감싸 전역 오염 없음
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "guard-salary-calculator.html"), "utf8");

const pick = (re, label) => { const m = src.match(re); if (!m) throw new Error("원본에서 못 찾음: " + label); return m[1]; };
let css = pick(/<style>([\s\S]*?)<\/style>/, "style");
let body = pick(/<main class="gc-main">([\s\S]*?)<\/main>/, "main");
let js = pick(/<script>([\s\S]*?)<\/script>/, "script");

/* ── CSS 스코프 ─────────────────────── */
function mapSel(sel) {
  sel = sel.trim();
  if (sel === ":root" || sel === "body") return "#guard-calc";
  if (sel === "*") return "#guard-calc *";
  if (sel === "main") return "#guard-calc .gc-main";
  return "#guard-calc " + sel;
}
function scope(text) {
  let out = "", i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (depth && j < text.length) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
    const inner = text.slice(open + 1, j - 1);
    if (head.startsWith("@media")) out += `${head}{${scope(inner)}}\n`;
    else out += `${head.split(",").map(mapSel).join(",")}{${inner}}\n`;
    i = j;
  }
  return out;
}
css = scope(css.replace(/\/\*[\s\S]*?\*\//g, ""));
// 테마의 전역 스타일이 새어 들어오지 않도록 최소 리셋 추가 (모두 #guard-calc 하위)
css += `#guard-calc{border-radius:16px;overflow:hidden;text-align:left;letter-spacing:normal}
#guard-calc button,#guard-calc input,#guard-calc select{margin:0;box-shadow:none;text-transform:none}
#guard-calc a{color:inherit}
`;

/* ── HTML: id/name 접두어, 제목 태그, ARIA ── */
const count = { id: 0, name: 0 };
body = body
  .replace(/\b(id|for|aria-controls|aria-labelledby)="([^"]+)"/g, (_, a, v) => { count.id++; return `${a}="gc-${v}"`; })
  .replace(/\bname="([^"]+)"/g, (_, v) => { count.name++; return `name="gc-${v}"`; })
  .replace(/<h1 class="gc-title">([\s\S]*?)<\/h1>/, '<h2 class="gc-title">$1</h2>'); // 본문 안에서는 h2

/* ── JS: 스코프 한정 ────────────────── */
const must = (cond, label) => { if (!cond) throw new Error("JS 변환 실패: " + label); };
must(js.includes('const $ = (id) => document.getElementById(id);'), "$ 헬퍼");
js = js.replace('const $ = (id) => document.getElementById(id);',
  'const ROOT = document.getElementById("guard-calc");\n  if (!ROOT) return;\n  const $ = (id) => document.getElementById("gc-" + id);');
js = js.replace(/document\.querySelectorAll\(/g, "ROOT.querySelectorAll(");
// 스크립트가 런타임에 만드는 HTML 안의 id (예: totalA, in-rest, opt-year-2026)도 접두어 처리
let jsIds = 0;
js = js.replace(/\bid="([^"]+)"/g, (_, v) => { jsIds++; return `id="gc-${v}"`; });
must(jsIds >= 10, "스크립트 내 id 접두어");
must(!/document\.(querySelector|getElementsBy)/.test(js.replace(/document\.getElementById/g, "")), "남은 전역 조회");
js = js.replace('"use strict";', "").trim();
js = `(function () {\n"use strict";\n${js}\n})();`;

/* ── 조립 ───────────────────────────── */
const compact = (s) => s.replace(/\n\s*\n/g, "\n"); // 빈 줄 제거(자동 <p> 삽입 방지)
const out = compact(`<!-- 경비원 월급 계산기 · 워드프레스 '사용자 정의 HTML' 블록에 통째로 붙여넣기 (build-wp.js 로 생성, 직접 수정 금지) -->
<div id="guard-calc">
<style>
${css}</style>
<div class="gc-main">
${body}
</div>
<script>
${js}
</script>
</div>
`);
fs.writeFileSync(path.join(__dirname, "2_계산기.html"), out);
console.log(`2_계산기.html 생성: id/for/aria ${count.id}개, name ${count.name}개, 스크립트 내 id ${jsIds}개 접두어 처리`);
