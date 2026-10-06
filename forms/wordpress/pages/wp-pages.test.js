// 서식 페이지 5종(워드프레스 조각) 점검
// 실행: node wp-pages.test.js   (playwright 필요, CHROME_PATH 로 크롬 경로 지정 가능)
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const assert = require("assert");
const { chromium } = require(require.resolve("playwright", { paths: [process.cwd(), __dirname, "/usr/lib/node_modules", "/usr/local/lib/node_modules"] }));
const { build, FILES, DEFAULT_BASE } = require("./build-wp-pages.js");

const FORMS = path.join(__dirname, "..", "..");
const UP = path.join(__dirname, "..", "upload");
const PAGES = ["wp-form-own-forms-guide.html", "wp-form-leave-confirmation.html", "wp-form-eligibility.html", "wp-form-standard-contract.html", "wp-form-industrial-accident.html"];
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
let pass = 0;
const ok = (name, cond) => { assert(cond, "FAIL: " + name); console.log("PASS", name); pass++; };

function selectors(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let d = 1, j = open + 1; while (d && j < css.length) { if (css[j] === "{") d++; else if (css[j] === "}") d--; j++; }
    if (head.startsWith("@")) out.push(...selectors(css.slice(open + 1, j - 1))); else out.push(...head.split(",").map((s) => s.trim()));
    i = j;
  }
  return out;
}

/* ── 1. 구조: 블록 하나에 통째로 붙여넣을 수 있는 조각 ── */
for (const f of PAGES) {
  const h = read(f);
  ok(`${f}: html/head/body/doctype 태그 없음`, !/<\s*(!doctype|html|head|body)\b/i.test(h));
  ok(`${f}: <script> 없음 (그래서 base64 처리 불필요)`, !/<script/i.test(h));
  ok(`${f}: <h1> 없음 (워드프레스 글 제목이 h1)`, !/<h1[\s>]/i.test(h));
  ok(`${f}: 빈 줄 없음(자동 <p> 삽입 방지)`, !/\n\s*\n/.test(h));
  ok(`${f}: 다크모드 미디어쿼리 없음 (밝은 화면 고정)`, !/prefers-color-scheme/.test(h));
  const sels = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].flatMap((m) => selectors(m[1].replace(/\/\*[\s\S]*?\*\//g, "")));
  const bad = sels.filter((s) => !/^\.idf(?![\w-])/.test(s));
  ok(`${f}: 모든 CSS 선택자(${sels.length}개)가 .idf 하위 (위반: ${bad.join(" | ") || "없음"})`, sels.length > 10 && bad.length === 0);
  const ids = [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  ok(`${f}: id 는 모두 idf- 접두어, 중복 없음 (${ids.length}개)`, ids.every((x) => x.startsWith("idf-")) && new Set(ids).size === ids.length);
  ok(`${f}: href="#" 죽은 링크 없음`, !/href="#"/.test(h));
  const anchors = [...h.matchAll(/<a [^>]*href="(https?:[^"]+)"[^>]*>/g)];
  const own = anchors.filter((m) => m[1].startsWith("https://incomedown.com/")), ext = anchors.filter((m) => !m[1].startsWith("https://incomedown.com/"));
  ok(`${f}: 외부 링크(${ext.length}개)는 새 창 + rel=noopener, 내 사이트 링크(${own.length}개)는 같은 창`, ext.every((m) => /target="_blank"/.test(m[0]) && /rel="noopener noreferrer"/.test(m[0])) && own.every((m) => !/target=/.test(m[0])));
  ok(`${f}: 금지 표현 없음`, !["3" + "교대", "저희 " + "근무지", "경비 일을 " + "하고", "2026년 " + "개정"].some((w) => h.includes(w)));
}

/* ── 2. 다운로드·이미지 링크 = 업로드 목록 = upload/ 폴더 ── */
const allHtml = PAGES.map(read).join("\n");
const refs = [...allHtml.matchAll(new RegExp(`(?:href|src)="${DEFAULT_BASE.replace(/\//g, "\\/")}([^"]+)"`, "g"))].map((m) => m[1]);
const refSet = new Set(refs);
ok(`링크 ${refs.length}개(고유 ${refSet.size}개)가 모두 업로드 목록에 있음`, [...refSet].every((n) => FILES.some((f) => f.name === n)));
ok("업로드 목록 30개 전부가 어느 페이지에서든 실제로 쓰임 (고아 파일 없음)", FILES.length === 30 && FILES.every((f) => refSet.has(f.name)));
ok("업로드 파일명은 영문 소문자·숫자·.-만 사용 (한글 파일명 문제 방지)", FILES.every((f) => /^[a-z0-9.-]+$/.test(f.name)));
ok("upload/ 폴더 = 업로드 목록과 정확히 일치", JSON.stringify(fs.readdirSync(UP).sort()) === JSON.stringify(FILES.map((f) => f.name).sort()));
ok("upload/ 의 각 파일은 원본과 내용이 같음(SHA-256)", FILES.every((f) => sha(path.join(UP, f.name)) === sha(path.join(FORMS, f.src))));
ok("한글 원본 상대경로(files/…) 링크가 남아 있지 않음", !/href="files\//.test(allHtml));
const md = read("media-upload-list.md");
ok("media-upload-list.md 에 30개 파일이 모두 적혀 있음 + HWP 안내 포함", FILES.every((f) => md.includes("`" + f.name + "`")) && md.includes("전체 30개") && md.includes(".hwp") && md.includes("--base"));

/* ── 3. 페이지별 내용 ── */
const guide = read(PAGES[0]), isik = read(PAGES[1]), elig = read(PAGES[2]), std = read(PAGES[3]), ia = read(PAGES[4]);
const names = (h) => [...h.matchAll(new RegExp(`href="${DEFAULT_BASE}([^"]+)"`, "g"))].map((m) => m[1]);
ok("자체 양식 안내: DOCX 링크 5개 + PDF 링크 5개(표와 카드에 각각 → 고유 10개)", ["docx", "pdf"].every((e) => new Set(names(guide).filter((n) => n.startsWith("incomedown-") && n.endsWith("." + e))).size === 5));
ok("자체 양식 안내: 이미지 10개(빈 양식 5 + 작성 예시 5), alt·width·height 있음", (guide.match(/<img /g) || []).length === 10 && [...guide.matchAll(/<img [^>]*>/g)].every((m) => /alt="[^"]{4,}"/.test(m[0]) && /width="\d+"/.test(m[0]) && /height="\d+"/.test(m[0])));
ok("자체 양식 안내: 5종 섹션 + FAQ 6개 + 제출 전 확인 + 무료 양식 표기 + 가상 정보 안내", ["resignation-letter", "employment-certificate", "career-certificate", "annual-leave-request", "severance-interim-request"].every((k) => guide.includes(`id="idf-guide-${k}"`)) && (guide.match(/<details>/g) || []).length === 6 && guide.includes("제출 전 확인") && guide.includes("인컴다운 제공 무료 양식") && guide.includes("가상"));
ok("자체 양식 안내: 사직서 사유에 권고사직·계약기간 만료 언급", guide.includes("권고사직") && guide.includes("계약기간 만료"));
ok("이직확인서: 개정 2025.7.1 표기 + HWP·PDF 링크 2개 + 제출 전 공식 사이트 확인", isik.includes("2025.7.1") && names(isik).length === 2 && names(isik).some((n) => n.endsWith(".hwp")) && isik.includes("제출 전 공식 사이트 확인"));
ok("수급자격 인정신청서: 첨부본 개정일 2024.12.31 표기(2025.7.1 아님) + 유형별 PDF 6 + HWP 2", elig.includes("2024.12.31") && !elig.includes("2025.7.1") && names(elig).filter((n) => n.endsWith(".pdf")).length === 6 && names(elig).filter((n) => n.endsWith(".hwp")).length === 2);
ok("표준근로계약서: '2025년 배포판' + 공식 게시판 링크 + 파일 첨부(업로드 링크) 없음", std.includes("2025년 배포판") && std.includes("moel.go.kr/policy/policydata/view.do?bbs_seq=20250300356") && names(std).length === 0);
ok("산재 요양급여신청서: 요양업무처리규정 별지 제2호 + 근로복지공단 서식자료실 링크 + 파일 첨부 없음", ia.includes("별지 제2호") && ia.includes("comwel.or.kr/comwel/info/data/papr/papr_lst.jsp") && names(ia).length === 0);
ok("4개 서식 페이지 모두 칸별 작성 예시 표·FAQ·관련 링크·제출 전 공식 사이트 확인 포함", [isik, elig, std, ia].every((h) => h.includes("칸별 작성 예시") && h.includes("자주 묻는 질문") && h.includes("관련 서식·계산기") && h.includes("제출 전 공식 사이트 확인") && /가상\(홍길동\/\(주\)예시회사\)/.test(h)));
ok("링크 자리는 site-links.json 에서 채워짐 (비어 있으면 '준비 중' 표기, 죽은 링크 아님)", /준비 중/.test(isik) && JSON.parse(read("site-links.json")) && Object.keys(JSON.parse(read("site-links.json"))).length >= 10);

/* ── 3-2. site-links.json: 발행된 실제 주소로 링크 채움 ── */
{
  const SITE = JSON.parse(read("site-links.json"));
  const U = {
    guide: "https://incomedown.com/무료-양식-사직서-재직증명서-경력증명서/",
    isik: "https://incomedown.com/이직확인서-양식-다운로드/",
    elig: "https://incomedown.com/수급자격-인정신청서-양식/",
    std: "https://incomedown.com/2026년-표준근로계약서-양식-무료-다운로드-hwp-word/",
    ia: "https://incomedown.com/산재-요양급여-신청서-서식근로복지공단-무료-다운/",
    calc: "https://incomedown.com/guard-salary-calculator/",
  };
  ok("site-links.json: 알려주신 6개 주소가 그대로 저장됨", SITE["own-forms-guide"] === U.guide && SITE["form-isik"] === U.isik && SITE["form-sugub"] === U.elig && SITE["std-contract"] === U.std && SITE["industrial-accident"] === U.ia && SITE["calc-guard"] === U.calc);
  ok("site-links.json: 사직서·재직증명서·병가/휴가 링크는 안내 페이지의 해당 양식 위치(#앵커)로 연결", SITE["form-resign"] === U.guide + "#idf-guide-resignation-letter" && SITE["form-employment-cert"] === U.guide + "#idf-guide-employment-certificate" && SITE["form-sick-leave"] === U.guide + "#idf-guide-annual-leave-request");
  /* 워드프레스는 글 슬러그를 퍼센트 인코딩한 상태로 200자까지만 저장하고 넘으면 끝을 자른다 (한글 1글자 = 9자) */
  const slugOf = (u) => decodeURIComponent(new URL(u).pathname.replace(/^\/|\/$/g, ""));
  const slugLens = Object.entries(SITE).filter(([, u]) => u).map(([k, u]) => [k, encodeURIComponent(slugOf(u)).length]);
  ok(`슬러그 길이: 모든 주소가 인코딩 후 200자 이내 (최대 ${Math.max(...slugLens.map((x) => x[1]))}자 — 여유 ${200 - Math.max(...slugLens.map((x) => x[1]))}자)`, slugLens.every(([, n]) => n <= 200));
  ok("이직확인서 주소는 짧은 슬러그(인코딩 후 101자)로 교체됨", encodeURIComponent(slugOf(SITE["form-isik"])).length === 101 && SITE["form-isik"] === "https://incomedown.com/이직확인서-양식-다운로드/");
  ok("수급자격 주소는 짧은 슬러그로 교체됨", SITE["form-sugub"] === "https://incomedown.com/수급자격-인정신청서-양식/" && encodeURIComponent(slugOf(SITE["form-sugub"])).length <= 120);
  ok("산재 요양급여신청서 주소는 기존 글 그대로 유지", SITE["industrial-accident"] === "https://incomedown.com/산재-요양급여-신청서-서식근로복지공단-무료-다운/");
  const OLDS = ["피보험자-이직확인서-양식-다운로드-별지", "실업급여-수급자격-인정신청서-양식-다운로드-유형"];
  ok("옛 이직확인서·수급자격 주소가 어떤 페이지·설정에도 남아 있지 않음 (원문·인코딩 모두)", ![allHtml, read("site-links.json"), read("build-wp-pages.js")].some((t) => OLDS.some((o) => t.includes(o) || t.includes(encodeURIComponent(o)))));
  const enc = (u) => `href="${encodeURI(u)}"`;
  const empty = (h) => (h.match(/준비 중/g) || []).length;
  ok("링크 값은 퍼센트 인코딩되어 들어가고 디코딩하면 원래 주소와 같음", [...allHtml.matchAll(/class="slot" href="([^"]+)"/g)].every((m) => /^[\x21-\x7e]+$/.test(m[1]) && Object.values(SITE).includes(decodeURI(m[1]))));
  ok("이직확인서 페이지: 수급자격·사직서 링크가 실제 주소, '(준비 중)'은 실업급여·퇴직금 계산기 2개만", isik.includes(enc(U.elig)) && isik.includes(enc(SITE["form-resign"])) && empty(isik) === 2);
  ok("수급자격 인정신청서 페이지: 이직확인서·사직서 링크가 실제 주소, '(준비 중)'은 실업급여 계산기 1개만", elig.includes(enc(U.isik)) && elig.includes(enc(SITE["form-resign"])) && empty(elig) === 1);
  ok("표준근로계약서 페이지: 경비원 월급 계산기·사직서·재직증명서 링크가 실제 주소, '(준비 중)'은 2개(최저임금·월급, 퇴직금 계산기)", std.includes(enc(U.calc)) && std.includes(enc(SITE["form-resign"])) && std.includes(enc(SITE["form-employment-cert"])) && empty(std) === 2);
  ok("산재 요양급여신청서 페이지: 병가·휴가·사직서 링크가 실제 주소, '(준비 중)'은 평균임금 계산기 1개만", ia.includes(enc(SITE["form-sick-leave"])) && ia.includes(enc(SITE["form-resign"])) && empty(ia) === 1);
  ok("자체 양식 안내 페이지: 이직확인서·수급자격·표준근로계약서 링크가 실제 주소, '(준비 중)'은 퇴직금 계산기 1개만", guide.includes(enc(U.isik)) && guide.includes(enc(U.elig)) && guide.includes(enc(U.std)) && empty(guide) === 1);
}

/* ── 4. 제목·메타설명 ── */
const seo = read("titles-and-meta.md");
const metaLens = [...seo.matchAll(/^\d+\. (.+) \((\d+)자\)$/gm)];
ok("titles-and-meta.md: 5개 페이지 × (제목 3안 + 메타 2안) = 25줄, 표기된 글자수가 실제 글자수와 일치", (seo.match(/^## /gm) || []).length === 5 && metaLens.length === 25 && metaLens.every((m) => [...m[1]].length === Number(m[2])));
{
  const metaOnly = seo.split("**메타설명 2안**").slice(1).flatMap((blk) => blk.split("\n").filter((l) => /^\d+\. /.test(l)).slice(0, 2)).map((l) => l.replace(/^\d+\. /, "").replace(/ \(\d+자\)$/, ""));
  ok(`메타설명 ${metaOnly.length}개 모두 80자 이내 (최대 ${Math.max(...metaOnly.map((x) => [...x].length))}자)`, metaOnly.length === 10 && metaOnly.every((x) => [...x].length <= 80));
}

/* ── 5. 실제 화면: 로컬 파일 주소로 다시 생성해 브라우저에서 확인 ── */
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wp-pages-"));
  const localBase = "file://" + UP + "/";
  const built = build({ base: localBase, outDir: tmp, copy: false });
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, colorScheme: "dark" }); // 다크 환경에서도 밝게
  const SENT = `<h1 id="s-h1">테마 제목</h1><button id="s-btn">테마 버튼</button><p id="s-p">테마 문단</p>`;
  const bare = await ctx.newPage();
  await bare.setContent(`<!doctype html><html lang="ko"><body style="margin:0">${SENT}</body></html>`);
  const probe = (pg) => pg.evaluate(() => ["#s-h1", "#s-btn", "#s-p", "body"].map((s) => { const c = getComputedStyle(document.querySelector(s)); return ["fontSize", "fontFamily", "margin", "padding", "color", "backgroundColor", "lineHeight", "border", "textAlign"].map((k) => c[k]).join("|"); }).join("\n"));
  const baseline = await probe(bare);
  const lum = (rgb) => { const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  for (const name of PAGES) {
    const pg = await ctx.newPage();
    const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    const failed = []; pg.on("requestfailed", (r) => { if (r.url().startsWith("file:")) failed.push(r.url()); });
    // about:blank 에서는 file:// 이미지가 막히므로 임시 HTML 파일로 열어 실제 로드를 확인
    const tmpPage = path.join(tmp, "view-" + name);
    fs.writeFileSync(tmpPage, `<!doctype html><html lang="ko"><body style="margin:0">${SENT}<div class="entry-content">${built.pages[name]}</div></body></html>`);
    await pg.goto("file://" + tmpPage);
    await pg.waitForLoadState("load");
    ok(`${name}: 바깥 h1·버튼·문단·body 스타일이 CSS 삽입 전후 동일(전역 누수 없음)`, (await probe(pg)) === baseline);
    ok(`${name}: 390px 가로 스크롤 없음`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    ok(`${name}: 콘솔 오류·요청 실패 없음`, errs.length === 0 && failed.length === 0);
    const col = await pg.evaluate(() => { const g = (s, k) => getComputedStyle(document.querySelector(s))[k]; return { fg: g(".idf", "color"), bg: g(".idf", "backgroundColor"), lead: g(".idf .lead", "color") }; });
    ok(`${name}: 다크 환경에서도 밝은 배경 + 글자 대비 충분 (본문 ${ratio(col.fg, col.bg).toFixed(1)}, 안내문 ${ratio(col.lead, col.bg).toFixed(1)})`, col.bg === "rgb(255, 255, 255)" && ratio(col.fg, col.bg) >= 7 && ratio(col.lead, col.bg) >= 4.5);
    const files = await pg.evaluate(() => [...document.querySelectorAll('.idf a[href^="file:"]')].map((a) => a.getAttribute("href")));
    ok(`${name}: 다운로드·이미지 링크 ${files.length}개가 모두 실제 파일을 가리킴`, files.every((u) => fs.existsSync(decodeURIComponent(u.replace("file://", "")))));
    const anchors = await pg.evaluate(() => [...document.querySelectorAll('.idf a[href^="#"]')].map((a) => !!document.querySelector(a.getAttribute("href"))));
    ok(`${name}: 페이지 안 앵커 ${anchors.length}개가 모두 실제 요소를 가리킴`, anchors.every(Boolean));
    if (name === PAGES[0]) {
      const imgs = await pg.evaluate(() => [...document.querySelectorAll(".idf img")].map((i) => ({ ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, aw: +i.getAttribute("width") })));
      await pg.evaluate(() => document.querySelectorAll("img").forEach((i) => { i.loading = "eager"; }));
      await pg.waitForTimeout(500);
      const imgs2 = await pg.evaluate(() => [...document.querySelectorAll(".idf img")].map((i) => ({ ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, aw: +i.getAttribute("width") })));
      ok("자체 양식 안내: 이미지 10개가 모두 실제로 로드되고 width 속성이 원본 크기와 일치", imgs2.length === 10 && imgs2.every((i) => i.ok && i.w === i.aw));
    }
    await pg.close();
  }
  console.log(`\nALL ${pass} CHECKS PASSED (wp-pages)`);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
