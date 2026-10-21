// 서식 페이지 5종 → 워드프레스 '사용자 정의 HTML' 블록용 조각 + 업로드 파일 정리 생성
//   node build-wp-pages.js [--base <업로드 URL 앞부분>] [--out <출력 폴더>] [--no-copy]
//  - html/head/body 태그 없음, 스크립트 없음(그래서 base64 처리 불필요), 모든 CSS 는 .idf 안쪽으로 한정
//  - 다운로드·이미지 링크는 영문 파일명으로 바꿔 <base> 아래를 가리킴 (기본값: /wp-content/uploads/2026/10/)
//  - forms/wordpress/upload/ 에 영문 파일명으로 바꾼 복사본을 만들어 미디어에 한 번에 올릴 수 있게 함
const fs = require("fs");
const path = require("path");
const { PAGES, CSS, CHECKED, esc, btn, table, faq, verify, section } = require("../../pages/build-pages.js");

const FORMS = path.join(__dirname, "..", ".."); // forms/
const DEFAULT_BASE = "/wp-content/uploads/2026/10/";
const compact = (s) => s.replace(/\n\s*\n/g, "\n");

/* ───────── 업로드 파일 목록 (한글 원본 → 영문 업로드 이름) ───────── */
const OWN = [
  { key: "resignation-letter", ko: "1_사직서", title: "사직서" },
  { key: "employment-certificate", ko: "2_재직증명서", title: "재직증명서" },
  { key: "career-certificate", ko: "3_경력증명서", title: "경력증명서" },
  { key: "annual-leave-request", ko: "4_연차휴가신청서", title: "연차휴가신청서" },
  { key: "severance-interim-request", ko: "5_퇴직금중간정산신청서", title: "퇴직금 중간정산 신청서" },
];
const ELIG = [["상용근로자", "regular"], ["일용근로자", "daily"], ["예술인", "artist"], ["단기예술인", "short-artist"], ["노무제공자", "platform"], ["단기노무제공자", "short-platform"]];
const ELIG_HWP = new Set(["노무제공자", "단기노무제공자"]);

const FILES = []; // { src(forms 기준), name, kind, label }
for (const o of OWN) {
  FILES.push({ src: `${o.ko}.docx`, name: `incomedown-${o.key}.docx`, label: `${o.title} (워드)` });
  FILES.push({ src: `${o.ko}.pdf`, name: `incomedown-${o.key}.pdf`, label: `${o.title} (PDF)` });
  FILES.push({ src: `preview/${o.ko}.png`, name: `incomedown-${o.key}-blank.png`, label: `${o.title} 빈 양식 미리보기 이미지` });
  FILES.push({ src: `examples/${o.ko}_작성예시.png`, name: `incomedown-${o.key}-example.png`, label: `${o.title} 작성 예시 이미지` });
}
FILES.push({ src: "pages/files/이직확인서_별지75호의4_개정2025.7.1.hwp", name: "law-leave-confirmation-75-4-rev20250701.hwp", label: "이직확인서 별지 제75호의4서식 (HWP)" });
FILES.push({ src: "pages/files/이직확인서_별지75호의4_개정2025.7.1.pdf", name: "law-leave-confirmation-75-4-rev20250701.pdf", label: "이직확인서 별지 제75호의4서식 (PDF)" });
for (const [ko, slug] of ELIG) {
  FILES.push({ src: `pages/files/수급자격인정신청서_별지75호_개정2024.12.31_${ko}.pdf`, name: `law-eligibility-75-rev20241231-${slug}.pdf`, label: `수급자격 인정신청서 ${ko}용 (PDF)` });
  if (ELIG_HWP.has(ko)) FILES.push({ src: `pages/files/수급자격인정신청서_별지75호_개정2024.12.31_${ko}.hwp`, name: `law-eligibility-75-rev20241231-${slug}.hwp`, label: `수급자격 인정신청서 ${ko}용 (HWP)` });
}
const byName = new Map(FILES.map((f) => [f.name, f]));
const bySrcBase = new Map(FILES.filter((f) => f.src.startsWith("pages/files/")).map((f) => [path.basename(f.src), f]));

/* ───────── 워드프레스용 CSS (전부 .idf 하위, 밝은 화면 고정) ───────── */
function scopeCss(text) {
  const map = (sel) => { sel = sel.trim(); if (sel === ":root" || sel === "body") return ".idf"; if (sel === "*") return ".idf *"; return sel.startsWith(".idf") ? sel : ".idf " + sel; };
  let out = "", i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i); if (open < 0) break;
    const head = text.slice(i, open).trim();
    let d = 1, j = open + 1; while (d && j < text.length) { if (text[j] === "{") d++; else if (text[j] === "}") d--; j++; }
    const inner = text.slice(open + 1, j - 1);
    out += head.startsWith("@") ? `${head}{${scopeCss(inner)}}\n` : `${head.split(",").map(map).join(",")}{${inner}}\n`;
    i = j;
  }
  return out;
}
const WP_CSS = scopeCss(CSS.replace(/^@media \(prefers-color-scheme:dark\).*$/m, "").replace(/\/\*[\s\S]*?\*\//g, "")) + `
.idf{background:#fff;text-align:left;letter-spacing:normal}
.idf h3{font-size:1.05rem;margin:1.4em 0 .4em;color:var(--fg)}
.idf p{margin:.7em 0}
.idf a{color:var(--acc)}
.idf a.btn,.idf a.btn:hover{color:#fff;text-decoration:none}
.idf a.btn.sub,.idf a.btn.sub:hover{color:var(--acc)}
.idf img{max-width:100%;height:auto;display:block}
.idf .pair{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin:12px 0}
@media (min-width:640px){.idf .pair{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.idf figure{margin:0;min-width:0}
.idf figcaption{font-size:.88rem;color:var(--mut);margin-top:6px}
.idf .toc{border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:1em 0;background:var(--soft)}
.idf .toc ol{margin:.4em 0 0;padding-left:1.3em}
.idf .slot.off{display:block;padding:10px 14px;border:1px dashed var(--line);border-radius:8px;color:var(--mut)}
`;

/* ───────── 사이트 링크(관련 서식·계산기 자리) ───────── */
const LINKS_FILE = path.join(__dirname, "site-links.json");
function loadLinks(keys) {
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(LINKS_FILE, "utf8")); } catch (e) { /* 새로 만듦 */ }
  const merged = {}; for (const k of [...keys].sort()) merged[k] = cur[k] || "";
  fs.writeFileSync(LINKS_FILE, JSON.stringify(merged, null, 2) + "\n");
  return merged;
}
const slotList = (items, links) => `<ul class="slots">\n${items.map(([key, label]) => links[key]
  ? `  <li><a class="slot" href="${esc(encodeURI(links[key]))}">${esc(label)}</a></li>` // 한글 주소는 퍼센트 인코딩해서 링크로 씀
  : `  <li><span class="slot off">${esc(label)} (준비 중)</span></li>`).join("\n")}\n</ul>`;

/* ───────── 공통 도우미 ───────── */
const pngSize = (file) => { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const header = (p) => `<div class="badges">${p.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}<span class="badge">확인일 ${CHECKED}</span></div>\n<p class="lead">${p.lead}</p>`;
const wrap = (id, note, inner) => compact(`<!-- ${note} · 워드프레스 '사용자 정의 HTML' 블록에 통째로 붙여넣기 (build-wp-pages.js 로 생성, 직접 수정 금지). 스크립트 없음. 페이지 제목은 워드프레스 제목(h1)을 사용 -->
<div class="idf" id="idf-${id}">
<style>
${WP_CSS}</style>
${inner}
</div>
`);
const credit = `<p class="credit">인컴다운 제공 무료 정보 · 작성 예시는 이해를 돕기 위한 가상 데이터이며 법률 자문이 아닙니다.</p>`;

/* ───────── 법령·고용노동부 서식 페이지 4종 (build-pages.js 데이터 재사용) ───────── */
const LAW_PAGES = [
  { file: "1_이직확인서.html", id: "leave-confirmation", out: "wp-form-leave-confirmation.html" },
  { file: "2_수급자격인정신청서.html", id: "eligibility", out: "wp-form-eligibility.html" },
  { file: "3_표준근로계약서.html", id: "standard-contract", out: "wp-form-standard-contract.html" },
  { file: "4_산재요양급여신청서.html", id: "industrial-accident", out: "wp-form-industrial-accident.html" },
];
function rewriteFiles(html, base) {
  return html.replace(/href="files\/([^"]+)"/g, (m, name) => {
    const f = bySrcBase.get(decodeURIComponent(name));
    if (!f) throw new Error("업로드 목록에 없는 첨부 파일: " + name);
    return `href="${base}${f.name}"`;
  });
}
function lawFragment(def, base, links) {
  const p = PAGES.find((x) => x.file === def.file).p;
  const inner = `${header(p)}
${verify()}
${section("서식 받기", rewriteFiles(p.download, base))}
${section("칸별 작성 예시", table(p.rows))}
${section("자주 묻는 질문 (FAQ)", faq(p.faq))}
${section("관련 서식·계산기", slotList(p.slots, links))}
${rewriteFiles(p.extra || "", base)}
${verify()}
<p class="src">${p.src}</p>
${credit}`;
  return wrap(def.id, def.file.replace(/^\d_|\.html$/g, ""), inner);
}

/* ───────── 자체 양식 5종 안내 페이지 ───────── */
const GUIDE = {
  "resignation-letter": {
    use: "회사에 퇴직 의사를 전할 때",
    items: "인적 사항(소속·직위·사번·연락처·입사일·퇴직 희망일), 사직 사유 체크(개인 사정·이직·건강·학업·가사·육아·기타·권고사직·계약기간 만료)와 상세 사유, 인수인계(담당 업무·대상자·완료 예정일), 사직 문구, 서명란",
    tips: ["사유 구분에서 실제 사정에 맞는 항목 하나를 체크하세요. ‘권고사직’과 ‘계약기간 만료’는 회사 요청이나 계약 종료로 그만두는 경우에 쓰는 항목입니다.", "이직 사유는 실업급여 등에서 중요하게 쓰이는 항목이니 사실과 다르게 적지 마세요. 해당 여부의 판단은 고용센터가 합니다.", "퇴직 희망일과 인수인계 완료 예정일을 날짜까지 적어 두면 협의가 쉽습니다."],
  },
  "employment-certificate": {
    use: "금융기관·관공서 등에 재직 사실을 증명할 때",
    items: "문서번호, 인적 사항, 재직 사항(소속·직위·입사일·재직 여부·담당 업무), 용도 체크(금융기관·관공서·학교·기타)와 제출처, 증명 문구, 발급 기관(회사명·대표자·사업자등록번호·전화번호·소재지), 직인 자리",
    tips: ["문서번호와 발급 기관, 직인은 증명서를 발급하는 회사가 채우는 칸입니다.", "용도와 제출처를 적어 두면 제출처에서 요구하는 형식과 맞는지 확인하기 쉽습니다.", "제출처가 지정한 양식이 있으면 그 양식을 우선 사용하세요."],
  },
  "career-certificate": {
    use: "이직·지원 등에서 근무 경력을 증명할 때",
    items: "문서번호, 인적 사항, 근무 경력 표(근무 기간·소속·직위·담당 업무, 4행), 총 근무 기간, 퇴직 사유, 용도 체크와 제출처, 증명 문구, 발급 기관, 직인 자리",
    tips: ["근무 경력은 입사 순서대로 적고, 행이 모자라면 DOCX 파일에서 표의 행을 추가하세요.", "총 근무 기간은 각 근무 기간을 합산해 적습니다.", "퇴직 사유 칸은 사실대로 적고, 제출처가 요구하지 않으면 비워 둘 수도 있습니다."],
  },
  "annual-leave-request": {
    use: "연차·반차·병가 등 휴가를 신청할 때",
    items: "결재란(담당·팀장·대표), 신청자 정보, 휴가 종류 체크(연차·반차 오전/오후·병가·경조사·기타), 휴가 기간·사용 일수·복귀 예정일, 사유, 업무 대행자·비상 연락처, 연차 현황(인사 담당 기재)",
    tips: ["휴가 종류를 체크하고 기간과 사용 일수를 함께 적으면 결재가 빠릅니다.", "업무 대행자와 비상 연락처는 자리를 비우는 동안의 업무 공백을 줄이기 위한 칸입니다.", "‘연차 현황’ 칸은 인사 담당자가 채우는 칸이니 비워서 내면 됩니다."],
  },
  "severance-interim-request": {
    use: "재직 중에 퇴직금을 미리 정산받고 싶을 때",
    items: "결재란, 신청자 정보, 중간정산 기준일·정산 대상 기간, 신청 사유 체크(무주택자 주택 구입·전세보증금·6개월 이상 요양·파산·개인회생·재난·임금피크제·기타 법령상 사유), 상세 내용, 증빙 서류 체크, 수령 계좌, 확인 문구, 회사 기재란(평균임금·정산 금액·지급 예정일)",
    tips: ["중간정산은 법령에서 정한 사유에 한해 인정되는 것으로 알려져 있습니다. 해당 여부는 회사 담당자나 고용노동부 상담 1350에서 확인하세요.", "신청 사유에 맞는 증빙 서류(계약서·진단서·법원 결정문 등)를 함께 준비하세요.", "‘회사 기재란’은 회사가 채우는 칸이므로 비워서 제출합니다."],
  },
};
const GUIDE_FAQ = [
  ["회사에서 정한 양식이 따로 있으면 어떻게 하나요?", "회사나 제출처가 지정한 양식이 있으면 그 양식을 우선 사용하세요. 이 양식은 일반적으로 필요한 항목으로 새로 구성한 참고용 양식입니다."],
  ["워드 파일을 열면 글꼴이 다르게 보여요.", "글꼴을 ‘맑은 고딕’으로 지정했습니다. 컴퓨터에 해당 글꼴이 없으면 다른 글꼴로 보일 수 있으며, 내용에는 영향이 없습니다."],
  ["PDF는 컴퓨터에서 바로 입력할 수 있나요?", "PDF는 출력해서 손으로 쓰는 용도입니다. 컴퓨터로 입력하려면 DOCX(워드) 파일을 사용하세요."],
  ["작성 예시 이미지의 이름과 회사는 실제 정보인가요?", "아닙니다. ‘홍길동’, ‘(주)예시회사’ 등 모두 가상의 정보이며 실제 개인정보가 아닙니다."],
  ["사직서에 ‘권고사직’, ‘계약기간 만료’ 항목이 있는 이유는요?", "이직 사유는 실업급여 등을 확인할 때 중요하게 쓰이는 항목이라 선택지로 넣었습니다. 사유가 사실과 맞는지 확인해 적으시고, 해당 여부의 판단은 고용센터가 합니다."],
  ["서명이나 직인은 어떻게 하나요?", "신청서류에는 서명 또는 인감 자리를, 증명서류에는 발급 기관의 직인 자리를 두었습니다. 출력한 뒤 서명이나 날인하세요."],
];
const GUIDE_SLOTS = [["form-isik", "이직확인서 서식 페이지"], ["form-sugub", "수급자격 인정신청서 서식 페이지"], ["std-contract", "표준근로계약서 안내 페이지"], ["calc-severance", "퇴직금 계산기"]];

function guideFragment(base, links) {
  const dl = (key, ext, label, sub) => btn(label, `${base}incomedown-${key}.${ext}`, { download: true, sub });
  const rows = OWN.map((o) => `<tr><th scope="row"><a href="#idf-guide-${o.key}">${o.title}</a></th><td>${dl(o.key, "docx", "DOCX")}</td><td>${dl(o.key, "pdf", "PDF", true)}</td></tr>`).join("\n");
  const cards = OWN.map((o) => {
    const g = GUIDE[o.key];
    const blank = pngSize(path.join(FORMS, "preview", `${o.ko}.png`)), ex = pngSize(path.join(FORMS, "examples", `${o.ko}_작성예시.png`));
    const img = (suffix, size, alt) => `<a href="${base}incomedown-${o.key}-${suffix}.png" target="_blank" rel="noopener noreferrer"><img src="${base}incomedown-${o.key}-${suffix}.png" alt="${esc(alt)}" width="${size.w}" height="${size.h}" loading="lazy"></a>`;
    return `<h2 id="idf-guide-${o.key}">${o.title}</h2>
<p><strong>이럴 때 쓰세요</strong> — ${esc(g.use)}</p>
<p><strong>들어 있는 항목</strong> — ${esc(g.items)}</p>
<div class="pair">
<figure>${img("blank", blank, `${o.title} 빈 양식 미리보기`)}<figcaption>빈 양식 (A4 1쪽)</figcaption></figure>
<figure>${img("example", ex, `${o.title} 작성 예시 (가상 정보)`)}<figcaption>작성 예시 (홍길동·(주)예시회사, 가상 정보)</figcaption></figure>
</div>
<div class="btns">${dl(o.key, "docx", `${o.title} DOCX 받기`)}${dl(o.key, "pdf", `${o.title} PDF 받기`, true)}</div>
<h3>채울 때 참고하세요</h3>
<ul>
${g.tips.map((t) => `<li>${esc(t)}</li>`).join("\n")}
</ul>`;
  }).join("\n");
  const p = {
    badges: ["자체 양식 5종", "DOCX·PDF", "무료"],
    lead: "일반적으로 필요한 항목으로 새로 구성한 자체 양식입니다. 칸 채우기 쉽게 만들었고, 모든 양식 하단에 ‘인컴다운 제공 무료 양식’이 표기되어 있습니다.",
  };
  const inner = `${header(p)}
<div class="notice" role="note"><strong>제출 전 확인</strong> — 회사나 제출처가 정한 양식이 있으면 그 양식을 우선 사용하세요. 이 양식은 참고용이며 법률 자문이 아닙니다.</div>
<nav class="toc" aria-label="목차"><strong>목차</strong>
<ol>
${OWN.map((o) => `<li><a href="#idf-guide-${o.key}">${o.title}</a></li>`).join("\n")}
<li><a href="#idf-guide-faq">자주 묻는 질문</a></li>
</ol></nav>
${section("한눈에 보기", `<div class="tbl-wrap"><table class="dl">\n<thead><tr><th>양식</th><th>워드</th><th>PDF</th></tr></thead>\n<tbody>\n${rows}\n</tbody>\n</table></div>`)}
${cards}
<h2 id="idf-guide-faq">자주 묻는 질문 (FAQ)</h2>
${faq(GUIDE_FAQ)}
${section("관련 서식·계산기", slotList(GUIDE_SLOTS, links))}
<p class="src">양식은 인컴다운이 일반적인 항목으로 새로 구성했으며 특정 업체의 양식을 가져다 쓰지 않았습니다. 작성 예시의 이름·회사는 모두 가상입니다.</p>
${credit}`;
  return wrap("own-forms-guide", "자체 양식 5종 안내", inner);
}

/* ───────── 제목·메타설명 제안 ───────── */
const SEO = [
  { page: "자체 양식 5종 안내", out: "wp-form-own-forms-guide.html",
    titles: ["사직서·재직증명서·경력증명서·연차휴가신청서·퇴직금 중간정산 신청서 무료 양식 (DOCX·PDF)", "직장인 필수 서류 5종 무료 양식 모음 | 작성 예시 이미지 포함", "사직서 양식 다운로드 외 4종: 칸 채우기 쉬운 무료 양식 (워드·PDF)"],
    metas: ["사직서·재직증명서·경력증명서·연차휴가신청서·퇴직금 중간정산 신청서를 DOCX·PDF로 무료 제공합니다. 작성 예시 이미지로 쉽게 채우세요.", "칸 채우기 쉬운 자체 제작 양식 5종(사직서 등)을 워드·PDF로 받으세요. 가상 정보로 채운 작성 예시 이미지가 함께 있습니다."] },
  { page: "이직확인서", out: "wp-form-leave-confirmation.html",
    titles: ["피보험자 이직확인서 양식 다운로드 | 별지 제75호의4서식 작성 예시", "이직확인서 서식(HWP·PDF)과 칸별 작성 예시 — 개정 2025.7.1 표기", "이직확인서, 어디서 받고 어떻게 쓰나요? 원본 파일과 작성 방법"],
    metas: ["고용보험법 시행규칙 별지 제75호의4 피보험자 이직확인서 원본(HWP·PDF)과 칸별 작성 예시를 정리했습니다. 제출 전 공식 사이트 확인.", "실업급여 신청에 쓰는 이직확인서 서식과 칸별 작성 예시를 한 번에. 개정 2025.7.1 표기 원본 파일(HWP·PDF) 제공."] },
  { page: "수급자격 인정신청서", out: "wp-form-eligibility.html",
    titles: ["실업급여 수급자격 인정신청서 양식 다운로드 | 유형별 6종(PDF·HWP)", "수급자격 인정(국민연금 가입기간 추가 산입) 신청서 서식과 작성 예시", "수급자격 인정신청서, 상용·일용·예술인·노무제공자 유형별 파일 받기"],
    metas: ["별지 제75호서식 수급자격 인정(국민연금 가입기간 추가 산입)신청서를 피보험자격 유형별로 내려받고 작성 예시를 확인하세요.", "상용·일용·예술인·노무제공자 유형별 수급자격 인정신청서 파일(PDF·HWP)과 작성 예시. 첨부본 개정일 2024.12.31."] },
  { page: "표준근로계약서", out: "wp-form-standard-contract.html",
    titles: ["표준근로계약서 양식 다운로드 안내 (2025년 배포판) + 작성 예시", "표준근로계약서 어디서 받나요? 고용노동부 2025년 배포판과 칸별 작성법", "근로계약서 작성 예시: 표준근로계약서(2025년 배포판) 칸별 안내"],
    metas: ["고용노동부 공식 게시판의 표준근로계약서 2025년 배포판 받는 곳과 칸별 작성 예시, 자주 묻는 질문을 정리했습니다.", "근로계약서 쓸 때 빠지기 쉬운 항목을 표준근로계약서 2025년 배포판 기준으로 칸별 예시와 함께 확인하세요."] },
  { page: "산재 요양급여신청서", out: "wp-form-industrial-accident.html",
    titles: ["산재 요양급여신청서 양식 어디서 받나? 근로복지공단 서식과 작성 예시", "산재 요양급여신청서(별지 제2호) 서식 안내와 칸별 작성 예시", "산재 신청 서류: 요양급여신청서와 소견서(별지 제3호) 구분과 작성 요령"],
    metas: ["산재 요양급여신청서(요양업무처리규정 별지 제2호) 서식을 받는 곳과 칸별 작성 예시를 정리했습니다. 근로복지공단 서식자료실 링크 제공.", "산업재해로 치료받을 때 내는 요양급여신청서와 소견서의 차이, 서식 받는 곳, 작성 예시를 한 번에 확인하세요."] },
];
for (const s of SEO) for (const m of s.metas) if ([...m].length > 80) throw new Error(`메타설명 80자 초과(${[...m].length}): ${m}`);

/* ───────── 실행 ───────── */
function build({ base = DEFAULT_BASE, outDir = __dirname, copy = true } = {}) {
  if (!base.endsWith("/")) base += "/";
  const STORED_ONLY = ["own-forms-guide", "industrial-accident"]; // 슬롯에는 안 쓰지만 사이트 주소로 보관
  const keys = new Set([...PAGES.flatMap((x) => x.p.slots.map((s) => s[0])), ...GUIDE_SLOTS.map((s) => s[0]), ...STORED_ONLY]);
  const links = loadLinks(keys);
  const pages = {};
  pages["wp-form-own-forms-guide.html"] = guideFragment(base, links);
  for (const d of LAW_PAGES) pages[d.out] = lawFragment(d, base, links);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(outDir, name), html);

  if (copy) {
    const up = path.join(__dirname, "..", "upload");
    fs.mkdirSync(up, { recursive: true });
    for (const f of fs.readdirSync(up)) if (!byName.has(f)) fs.unlinkSync(path.join(up, f)); // 목록에 없는 옛 파일 정리
    for (const f of FILES) fs.copyFileSync(path.join(FORMS, f.src), path.join(up, f.name));
  }

  /* 미디어 업로드 목록 */
  const usedBy = (name) => Object.entries(pages).filter(([, h]) => h.includes(base + name)).map(([n]) => n.replace(/^wp-form-|\.html$/g, ""));
  const size = (f) => { const b = fs.statSync(path.join(FORMS, f.src)).size; return b > 1024 * 1024 ? (b / 1048576).toFixed(1) + "MB" : Math.round(b / 1024) + "KB"; };
  const row = (f, i) => `| ${i + 1} | \`${f.name}\` | ${f.label} | ${size(f)} | \`forms/${f.src}\` | ${usedBy(f.name).join(", ") || "-"} |`;
  const group = (title, list) => `### ${title} (${list.length}개)\n\n| # | 업로드 파일명 | 내용 | 용량 | 원본 위치 | 쓰이는 페이지 |\n|---|---|---|---|---|---|\n${list.map(row).join("\n")}\n`;
  const ext = (e) => FILES.filter((f) => f.name.endsWith(e));
  const md = `# 워드프레스 미디어에 올릴 파일 목록

서식 페이지 5종(\`wp-form-*.html\`)이 이 파일들을 가리킵니다. **영문 파일명으로 바꾼 복사본이 \`forms/wordpress/upload/\` 에 이미 들어 있으니** 그 폴더의 파일을 미디어 라이브러리에 한 번에 올리면 됩니다. (이 문서는 \`build-wp-pages.js\` 가 자동 생성)

## 올리는 방법
1. 워드프레스 관리자 → **미디어 → 새로 추가** → \`upload/\` 폴더의 파일을 끌어다 놓기
2. 파일 하나를 열어 **파일 URL** 을 확인합니다. 예: \`https://내사이트/wp-content/uploads/2026/10/incomedown-resignation-letter.docx\`
3. 페이지 링크의 기본 주소는 \`${base}\` 입니다. **URL 의 폴더(연/월)가 다르면** 아래처럼 다시 생성하세요.
   \`node build-wp-pages.js --base /wp-content/uploads/2026/11/\`
4. 같은 이름 파일이 이미 있으면 워드프레스가 \`-1\` 을 붙입니다. 그러면 링크가 어긋나므로 기존 파일을 지우고 다시 올리세요.

## 꼭 확인할 것 — HWP 파일
- 워드프레스는 **\`.hwp\` 업로드를 기본으로 막습니다**("보안상 이 파일 형식은 허용되지 않습니다"). 허용하려면 파일 형식 허용 플러그인(예: File Upload Types)이나 테마 설정이 필요합니다.
- 어려우면 HWP 4개(이직확인서 1, 수급자격 노무제공자·단기노무제공자 2)만 ZIP 으로 묶어 올리는 방식으로 바꿀 수 있으니 알려 주세요. PDF 는 그대로 올라갑니다.

## 전체 ${FILES.length}개 · 약 ${(FILES.reduce((a, f) => a + fs.statSync(path.join(FORMS, f.src)).size, 0) / 1048576).toFixed(1)}MB

${group("자체 양식 — DOCX", ext(".docx"))}
${group("자체 양식 — PDF", FILES.filter((f) => f.name.startsWith("incomedown-") && f.name.endsWith(".pdf")))}
${group("자체 양식 — 이미지(빈 양식 미리보기·작성 예시)", ext(".png"))}
${group("법령 서식 — PDF", FILES.filter((f) => f.name.startsWith("law-") && f.name.endsWith(".pdf")))}
${group("법령 서식 — HWP", ext(".hwp"))}
## 올리지 않는 것
- **표준근로계약서**, **산재 요양급여신청서**: 파일을 올리지 않고 고용노동부·근로복지공단 공식 사이트 링크만 사용합니다. (재배포 조건을 확인하지 못했기 때문)
`;
  fs.writeFileSync(path.join(outDir, "media-upload-list.md"), md);

  const seo = `# 서식 페이지 5종 — 페이지별 제목·메타설명 제안

제목은 워드프레스 **글 제목(h1)** 에 넣고, 메타설명은 SEO 플러그인의 설명 칸에 넣으세요. 본문 조각에는 제목(h1)이 들어 있지 않습니다. 메타설명은 모두 공백 포함 80자 이내입니다.

${SEO.map((s) => `## ${s.page} — \`${s.out}\`

**제목 3안**
${s.titles.map((t, i) => `${i + 1}. ${t} (${[...t].length}자)`).join("\n")}

**메타설명 2안**
${s.metas.map((m, i) => `${i + 1}. ${m} (${[...m].length}자)`).join("\n")}
`).join("\n")}
추천: 각 페이지 제목 1안 + 메타설명 1안.
`;
  fs.writeFileSync(path.join(outDir, "titles-and-meta.md"), seo);
  return { pages, files: FILES, base, links };
}

module.exports = { build, FILES, OWN, DEFAULT_BASE, WP_CSS, SEO };

if (require.main === module) {
  const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const r = build({ base: opt("--base") || DEFAULT_BASE, outDir: opt("--out") || __dirname, copy: !args.includes("--no-copy") });
  console.log(`생성: ${Object.keys(r.pages).length}개 페이지 조각 · 업로드 파일 ${r.files.length}개 · 기본 주소 ${r.base}`);
}
