// 서식 페이지 4종 HTML 템플릿 생성: node build-pages.js
// 워드프레스 업로드 없이 파일로만 생성. 본문만 쓰려면 <article class="idf"> … </article> 와 <style> 을 복사.
const fs = require("fs");
const CHECKED = "2026년 10월 4일";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CSS = `
:root{--bg:#fff;--fg:#1c1f26;--mut:#5b6472;--line:#d9dee7;--soft:#f4f6fa;--acc:#1f4e9c;--warn-bg:#fff6e5;--warn-line:#f0c36d}
@media (prefers-color-scheme:dark){:root{--bg:#14171c;--fg:#e8eaee;--mut:#9aa3b2;--line:#2c333e;--soft:#1c2128;--acc:#7aa7ff;--warn-bg:#2a2412;--warn-line:#7a6320}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 "Pretendard","Noto Sans KR","맑은 고딕",system-ui,sans-serif}
.idf{max-width:820px;margin:0 auto;padding:24px 16px 56px}
.idf h1{font-size:1.7rem;line-height:1.35;margin:.2em 0 .4em}
.idf h2{font-size:1.25rem;margin:2.2em 0 .6em;padding-bottom:.3em;border-bottom:2px solid var(--line)}
.idf .badges{display:flex;flex-wrap:wrap;gap:6px;margin:.4em 0 1em}
.idf .badge{font-size:.8rem;padding:2px 10px;border-radius:99px;background:var(--soft);border:1px solid var(--line);color:var(--mut)}
.idf .lead{color:var(--mut)}
.idf .notice{background:var(--warn-bg);border:1px solid var(--warn-line);border-radius:8px;padding:12px 14px;margin:1.2em 0}
.idf .box{background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:16px;margin:1em 0}
.idf .btns{display:flex;flex-wrap:wrap;gap:10px;margin:.8em 0}
.idf .btn{display:inline-block;padding:10px 18px;border-radius:8px;background:var(--acc);color:#fff;text-decoration:none;font-weight:600}
.idf .btn.sub{background:transparent;color:var(--acc);border:1px solid var(--acc)}
.idf .tbl-wrap{overflow-x:auto}
.idf table{border-collapse:collapse;width:100%;min-width:560px;font-size:.95rem}
.idf th,.idf td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
.idf th{background:var(--soft);white-space:nowrap}
.idf td.ex{color:var(--acc);font-weight:600}
.idf details{border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:8px 0}
.idf summary{cursor:pointer;font-weight:600}
.idf ul.slots{list-style:none;padding:0;display:grid;gap:8px}
.idf a.slot{display:block;padding:10px 14px;border:1px dashed var(--line);border-radius:8px;color:var(--acc);text-decoration:none}
.idf .src{font-size:.88rem;color:var(--mut)}
.idf .credit{margin-top:2.5em;padding-top:1em;border-top:1px solid var(--line);text-align:center;font-size:.85rem;color:var(--mut)}
`;

const section = (h, body) => `<section>\n<h2>${h}</h2>\n${body}\n</section>`;
const btn = (label, href, o = {}) =>
  `<a class="btn${o.sub ? " sub" : ""}" href="${href}"${o.download ? " download" : ' target="_blank" rel="noopener noreferrer"'}${o.attrs || ""}>${label}</a>`;
const table = (rows) =>
  `<div class="tbl-wrap"><table>\n<thead><tr><th>칸(항목)</th><th>작성 예시 (가상)</th><th>작성 요령</th></tr></thead>\n<tbody>\n${rows
    .map(([a, b, c]) => `<tr><th scope="row">${esc(a)}</th><td class="ex">${esc(b)}</td><td>${esc(c)}</td></tr>`)
    .join("\n")}\n</tbody>\n</table></div>
<p class="src">※ 예시의 이름·회사·번호는 모두 가상(홍길동/(주)예시회사)이며 실제 정보가 아닙니다. 칸 이름은 서식 개정에 따라 달라질 수 있으니 내려받은 원본과 대조해 작성하세요.</p>`;
const faq = (items) =>
  items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${a}</p></details>`).join("\n");
const slots = (items) =>
  `<ul class="slots">\n${items
    .map(([key, label]) => `  <li><a class="slot" href="#" data-slot="${key}">[링크 자리] ${esc(label)}</a></li>`)
    .join("\n")}\n</ul>`;
const verify = (extra = "") =>
  `<div class="notice" role="note"><strong>제출 전 공식 사이트 확인</strong> — 서식은 개정될 수 있습니다. 제출 전에 아래 공식 사이트에서 현행 서식과 작성 방법을 반드시 다시 확인하세요.${extra}</div>`;

function page(file, p) {
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<style>${CSS}</style>
</head>
<body>
<article class="idf">
<header>
<h1>${esc(p.title)}</h1>
<div class="badges">${p.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}<span class="badge">확인일 ${CHECKED}</span></div>
<p class="lead">${p.lead}</p>
</header>
${verify()}
${section("서식 받기", p.download)}
${section("칸별 작성 예시", table(p.rows))}
${section("자주 묻는 질문 (FAQ)", faq(p.faq))}
${section("관련 서식·계산기", slots(p.slots))}
${p.extra || ""}
${verify()}
<p class="src">${p.src}</p>
<p class="credit">인컴다운 제공 무료 정보 · 작성 예시는 이해를 돕기 위한 가상 데이터이며 법률 자문이 아닙니다.</p>
</article>
</body>
</html>
`;
  fs.writeFileSync(file, html);
}

const LAW_REPUB = (name, no) => `<div class="box"><strong>출처 표기 (복사해서 사용)</strong><br>
출처: 국가법령정보센터, 「고용보험법 시행규칙」 ${no}서식 ‘${name}’<br>
서식 표기 개정일: 2025년 7월 1일 · 확인일: ${CHECKED}<br>
본 첨부자료는 법령 별지 서식 원문입니다. 제출 전 공식 사이트에서 현행 서식을 확인하시기 바랍니다.</div>`;

// ── 1. 이직확인서
page("1_이직확인서.html", {
  title: "피보험자 이직확인서 서식 다운로드와 작성 예시",
  desc: "고용보험법 시행규칙 별지 제75호의4서식 피보험자 이직확인서 원본 파일과 칸별 작성 예시.",
  badges: ["별지 제75호의4서식", "고용보험법 시행규칙", "서식 개정일 2025.7.1"],
  lead: "실업급여(구직급여) 신청 때 필요한 이직확인서는 사업주가 작성해 고용센터에 제출하는 서식입니다. 아래 원본 파일과 칸별 예시를 참고하세요.",
  download: `<p>국가법령정보센터에 게시된 「고용보험법 시행규칙」 별지 제75호의4서식 원본입니다. 서식 표기 개정일은 <strong>2025.7.1</strong>입니다.</p>
<div class="btns">
<!-- TODO(게시 전): 국가법령정보센터에서 받은 원본을 pages/files/ 에 아래 이름으로 넣을 것 (files/README.md 참고) -->
${btn("원본 파일 내려받기 (HWP)", "files/이직확인서_별지75호의4_개정2025.7.1.hwp", { download: true, attrs: ' data-attach="pending"' })}
${btn("원본 파일 내려받기 (PDF)", "files/이직확인서_별지75호의4_개정2025.7.1.pdf", { download: true, attrs: ' data-attach="pending"' })}
${btn("국가법령정보센터에서 보기", "https://www.law.go.kr/%EB%B2%95%EB%A0%B9%EB%B3%84%ED%91%9C%EC%84%9C%EC%8B%9D/(%EA%B3%A0%EC%9A%A9%EB%B3%B4%ED%97%98%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99,%EC%84%9C%EC%8B%9D75%EC%9D%984)", { sub: true })}
${btn("고용24 서식자료실", "https://m.work24.go.kr/cm/c/b/1100/selectBbttInfo.do?polySvcFomtId=FM00000115", { sub: true })}
</div>
${LAW_REPUB("피보험자 이직확인서", "별지 제75호의4")}`,
  rows: [
    ["피보험자 성명·주민등록번호", "홍길동 / 900101-*******", "주민등록번호 뒷자리는 예시에서 가렸습니다. 실제 서식에는 정확히 기재."],
    ["사업장 명칭·관리번호", "(주)예시회사 / 000-00-00000-0", "고용보험 사업장 관리번호를 기재."],
    ["입사일·이직일(최종 근무일 다음 날 등)", "2021.03.02. / 2026.11.30.", "이직일 기준은 서식 안내를 확인."],
    ["피보험 단위기간(근로일수)", "이직일 이전 기간별 근로일수 기재", "산정 구간과 근로일수 계산 방법은 서식 안내문 확인."],
    ["임금 지급 내역", "월별 기초 임금·통상임금·상여금 등", "급여대장 기준으로 월별로 기재. 금액은 사실과 일치해야 함."],
    ["주 소정근로시간", "40시간", "근로계약서 기준."],
    ["이직 사유", "서식 안내의 사유 코드 중 해당 항목 선택", "사직서에 적은 사유(예: 권고사직, 계약기간 만료)와 사실관계가 일치하는지 확인. 최종 판단은 고용센터가 합니다."],
    ["작성자(사업주) 확인", "대표자 성명·연락처·서명 또는 인", "사업주가 직접 작성·확인하는 서식입니다."],
  ],
  faq: [
    ["이직확인서는 누가 작성하나요?", "사업주가 작성해 고용센터에 제출하는 서식입니다. 근로자는 사업주에게 발급을 요청하거나 고용센터 안내를 확인하세요."],
    ["이직 사유는 실업급여에 영향이 있나요?", "이직 사유는 수급자격 판단에 쓰이는 중요한 항목입니다. 사실과 다르게 적지 말고, 판단은 고용센터가 하므로 공식 안내를 확인하세요."],
    ["서식 개정일 2025.7.1은 어디서 확인하나요?", "국가법령정보센터의 별지 제75호의4서식에 표시된 개정일입니다. 시행규칙 전체가 개정되었다고 모든 별지 서식의 개정일이 같이 바뀌는 것은 아닙니다."],
    ["HWP와 PDF 중 무엇을 쓰나요?", "직접 입력은 HWP, 출력해 손으로 쓸 때는 PDF가 편합니다. 제출 방식(전자 제출 등)은 고용24 안내를 확인하세요."],
  ],
  slots: [["form-sugub", "수급자격 인정신청서 서식 페이지"], ["form-resign", "사직서 양식(권고사직·계약기간 만료 선택 가능)"], ["calc-unemployment", "실업급여 계산기"], ["calc-severance", "퇴직금 계산기"]],
  src: "근거: 「고용보험법 시행규칙」 별지 제75호의4서식(국가법령정보센터), 고용24 서식자료실. 이 페이지는 공식 기관이 아닙니다.",
});

// ── 2. 수급자격 인정신청서
page("2_수급자격인정신청서.html", {
  title: "실업급여 수급자격 인정(국민연금 가입기간 추가 산입) 신청서 다운로드와 작성 예시",
  desc: "고용보험법 시행규칙 별지 제75호서식 수급자격 인정신청서 원본 파일과 칸별 작성 예시.",
  badges: ["별지 제75호서식", "고용보험법 시행규칙", "서식 개정일 2025.7.1"],
  lead: "구직급여 수급자격 인정을 신청할 때 쓰는 서식의 정식 명칭은 ‘수급자격 인정(국민연금 가입기간 추가 산입)신청서’입니다.",
  download: `<p>국가법령정보센터에 게시된 「고용보험법 시행규칙」 별지 제75호서식 원본입니다. 서식 표기 개정일은 <strong>2025.7.1</strong>입니다.</p>
<div class="btns">
<!-- TODO(게시 전): 국가법령정보센터 원본을 pages/files/ 에 넣을 것. 고용24 파일은 유형별(상용·일용 등)이므로 첫머리 개정일 표기를 대조 -->
${btn("원본 파일 내려받기 (HWP)", "files/수급자격인정신청서_별지75호_개정2025.7.1.hwp", { download: true, attrs: ' data-attach="pending"' })}
${btn("원본 파일 내려받기 (PDF)", "files/수급자격인정신청서_별지75호_개정2025.7.1.pdf", { download: true, attrs: ' data-attach="pending"' })}
${btn("국가법령정보센터에서 보기", "https://www.law.go.kr/%EB%B2%95%EB%A0%B9%EB%B3%84%ED%91%9C%EC%84%9C%EC%8B%9D/(%EA%B3%A0%EC%9A%A9%EB%B3%B4%ED%97%98%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99,%EC%84%9C%EC%8B%9D75)", { sub: true })}
${btn("고용24 서식자료실", "https://m.work24.go.kr/cm/c/b/1100/selectBbttInfo.do?polySvcFomtId=FM00000112", { sub: true })}
</div>
${LAW_REPUB("수급자격 인정(국민연금 가입기간 추가 산입)신청서", "별지 제75호")}`,
  rows: [
    ["성명·주민등록번호", "홍길동 / 900101-*******", "주민등록번호 뒷자리는 예시에서 가렸습니다."],
    ["주소·연락처", "서울특별시 예시구 예시로 123 / 010-0000-0000", "실제 거주지와 연락 가능한 번호를 기재."],
    ["최종 이직 사업장", "(주)예시회사", "이직확인서의 사업장 명칭과 동일하게."],
    ["이직일", "2026.11.30.", "이직확인서의 이직일과 일치해야 합니다."],
    ["국민연금 가입기간 추가 산입 희망 여부", "해당 칸에 체크", "희망 여부와 요건은 고용24·국민연금 안내를 확인."],
    ["신청일·신청인 서명", "2026.12.01. / 홍길동", "서명 또는 인."],
  ],
  faq: [
    ["이직확인서와 무엇이 다른가요?", "이직확인서는 사업주가 작성하는 서식이고, 이 서식은 수급자격 인정을 신청하는 사람이 작성합니다."],
    ["고용24에서 받은 파일과 법령 서식이 다른가요?", "고용24에는 상용·일용 등 유형별 파일이 올라와 있습니다. 파일 첫머리에 적힌 개정일 표기를 법령 서식과 대조해 최신판인지 확인하세요."],
    ["온라인으로도 신청할 수 있나요?", "신청 방법(방문·온라인)은 고용24와 관할 고용센터 안내를 확인하세요."],
  ],
  slots: [["form-isik", "이직확인서 서식 페이지"], ["form-resign", "사직서 양식"], ["calc-unemployment", "실업급여 계산기"]],
  src: "근거: 「고용보험법 시행규칙」 별지 제75호서식(국가법령정보센터), 고용24 서식자료실. 이 페이지는 공식 기관이 아닙니다.",
});

// ── 3. 표준근로계약서 (파일 첨부 없음 — 공식 게시판 링크)
page("3_표준근로계약서.html", {
  title: "표준근로계약서 양식 다운로드 안내와 작성 예시 (2025년 배포판)",
  desc: "고용노동부 공식 게시판의 표준근로계약서 2025년 배포판 안내와 칸별 작성 예시.",
  badges: ["2025년 배포판", "고용노동부 게시 2025.3.7"],
  lead: "표준근로계약서는 고용노동부가 배포하는 근로계약서 예시 서식입니다. 파일은 이 페이지에 올리지 않았으니 공식 게시판에서 받아 주세요.",
  download: `<p>고용노동부가 공식 게시판에 올린 <strong>2025년 배포판</strong>입니다. 게시판에는 통합 HWP 첨부파일이 올라와 있고, 게시일은 2025.3.7입니다.</p>
<div class="btns">
${btn("고용노동부 공식 게시판에서 받기", "https://www.moel.go.kr/policy/policydata/view.do?bbs_seq=20250300356")}
</div>
<p class="src">서식 종류(일반·단시간 등)별 최신판과 내용은 게시판에서 직접 확인하세요.</p>`,
  rows: [
    ["근로개시일", "2026.12.01.", "실제 근무 시작일."],
    ["근무 장소", "서울특별시 예시구 예시로 100, (주)예시회사 본사", "배치 가능성이 있으면 범위를 구체적으로."],
    ["업무 내용", "국내 영업 및 거래처 관리", "담당 업무를 구체적으로 기재."],
    ["소정근로시간", "09:00 ~ 18:00 (휴게 12:00 ~ 13:00)", "시업·종업 시각과 휴게시간을 함께 기재."],
    ["근무일·주휴일", "주 5일(월~금) / 주휴일 일요일", "근무일과 주휴일을 명시."],
    ["임금", "월 2,500,000원", "금액과 구성항목(기본급·수당)을 적습니다. 예시 금액은 가상입니다."],
    ["임금 지급일·방법", "매월 25일 / 근로자 명의 계좌 이체", "지급일과 지급 방법을 기재."],
    ["연차유급휴가", "근로기준법에서 정하는 바에 따름", "법정 기준에 따른다고 적는 경우가 많습니다."],
    ["사회보험 적용", "고용·산재·국민연금·건강보험 가입", "해당 항목에 체크."],
    ["계약서 교부 확인", "근로자 서명 후 1부 교부", "작성한 계약서는 근로자에게 교부합니다."],
    ["서명", "사업주 (주)예시회사 김대표 / 근로자 홍길동", "양쪽 모두 서명 또는 인."],
  ],
  faq: [
    ["표준근로계약서를 꼭 써야 하나요?", "서식 사용이 의무는 아니지만 근로조건을 서면으로 명시해 교부해야 하는 사항이 있으니, 표준 서식을 기준으로 빠진 항목이 없는지 확인하면 편합니다."],
    ["‘2025년 배포판’은 무슨 뜻인가요?", "고용노동부가 2025년에 배포한 판이라는 뜻입니다. 게시일은 2025.3.7이며, 게시판의 8.7 안내는 파일 형식(HWP) 수정이고 내용은 종전과 동일하다고 적혀 있습니다."],
    ["단시간근로자용은 어디서 받나요?", "같은 공식 게시판에서 유형별 서식을 확인하세요. 최신판 여부는 게시판 안내를 따르세요."],
    ["이 페이지에서 파일을 직접 받을 수 없나요?", "정부 배포자료의 재배포 조건이 서식마다 다를 수 있어, 파일은 올리지 않고 공식 게시판으로 안내합니다."],
  ],
  slots: [["calc-wage", "최저임금·월급 계산기"], ["form-resign", "사직서 양식"], ["form-employment-cert", "재직증명서 양식"], ["calc-severance", "퇴직금 계산기"]],
  src: "출처: 고용노동부 정책자료실 ‘개정 「표준 근로계약서」 및 「표준 취업규칙」 게시’(2025.3.7.). 이 페이지는 공식 기관이 아닙니다.",
});

// ── 4. 산재 요양급여신청서 (공단 서식자료실 링크)
page("4_산재요양급여신청서.html", {
  title: "산재 요양급여신청서 서식 안내와 작성 예시",
  desc: "근로복지공단 서식자료실 링크와 요양급여신청서(요양업무처리규정 별지 제2호) 칸별 작성 예시.",
  badges: ["요양업무처리규정 별지 제2호", "근로복지공단"],
  lead: "산업재해로 치료를 받을 때 제출하는 요양급여신청서입니다. 파일은 근로복지공단 서식자료실에서 내려받아 주세요.",
  download: `<p>서식의 근거는 근로복지공단 「산업재해보상보험 요양업무처리규정」 <strong>별지 제2호</strong>(신청서)입니다. 소견서는 별지 제3호로 구분됩니다.</p>
<div class="btns">
${btn("근로복지공단 서식자료실 바로가기", "https://www.comwel.or.kr/comwel/info/data/papr/papr_lst.jsp")}
${btn("정부24 안내 보기", "https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A05007&CappBizCD=14900000261", { sub: true })}
</div>
<p class="src">이 페이지에는 서식 파일을 올리지 않았습니다. 개정일은 내려받은 파일에서 확인하세요.</p>`,
  rows: [
    ["재해자 성명·주민등록번호", "홍길동 / 900101-*******", "주민등록번호 뒷자리는 예시에서 가렸습니다."],
    ["사업장 명칭", "(주)예시회사", "재해 당시 소속 사업장."],
    ["재해 발생 일시·장소", "2026.09.15. 14:30 / (주)예시회사 물류창고", "일시와 장소를 구체적으로."],
    ["재해 경위", "물품 하역 중 적재물이 넘어져 오른쪽 발등에 부상", "누가·어디서·무엇을 하다가·어떻게 다쳤는지 간단명료하게."],
    ["상병명", "오른쪽 발등 골절(예시)", "의사 소견서(별지 제3호)의 상병명과 일치시키세요."],
    ["요양기관", "예시병원(가상)", "치료받는 의료기관."],
    ["휴업급여 등 함께 청구 여부", "해당 칸에 체크", "함께 청구할 수 있는 급여는 공단 안내를 확인."],
    ["수령 계좌", "예시은행 000-000-000000 (예금주 홍길동)", "본인 명의 계좌."],
    ["사업주 확인", "(주)예시회사 대표 김대표 서명 또는 인", "사업주 확인을 받기 어려운 경우의 처리는 공단 안내를 확인."],
  ],
  faq: [
    ["신청서와 소견서는 같은 서식인가요?", "신청서는 요양업무처리규정 별지 제2호, 소견서는 별지 제3호로 구분됩니다. 공단 서식자료실에서 함께 안내되는 경우가 많습니다."],
    ["어디에 제출하나요?", "관할 근로복지공단 지사 제출이 일반적이며 온라인 방법도 있습니다. 정확한 방법은 공단 안내를 확인하세요."],
    ["신청 기한이 있나요?", "급여에는 소멸시효가 있으므로 지체 없이 신청하는 것이 좋습니다. 정확한 기간은 공단 안내를 확인하세요."],
    ["서식 파일을 이 페이지에서 받을 수 없나요?", "공단 자체 규정의 서식은 재배포 허용 근거를 확인하지 못해 파일을 올리지 않았습니다. 공단 서식자료실에서 직접 받으세요."],
  ],
  slots: [["form-sick-leave", "병가·휴가 관련 서식 페이지"], ["calc-avgwage", "평균임금 계산기"], ["form-resign", "사직서 양식"]],
  src: "근거: 근로복지공단 「산업재해보상보험 요양업무처리규정」 별지 제2호, 근로복지공단 서식자료실, 정부24. 이 페이지는 공식 기관이 아닙니다.",
});
