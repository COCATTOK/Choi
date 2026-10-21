// 인컴다운 무료 양식 생성 스크립트: node build.js → *.docx
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer,
  AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign, HeightRule, TableLayoutType,
} = require("docx");

const FONT = "맑은 고딕";
const W = 9638; // A4 본문 폭 (좌우 여백 2cm)
const C = 1700, V = (W - 2 * C) / 2; // 4열 격자: 라벨/값/라벨/값
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "555555" };
const BORDERS = { top: LINE, bottom: LINE, left: LINE, right: LINE };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOBORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const BOX = "☐";
const BLUE = "1F4E9C";
let CUR = {};                                   // 현재 양식의 작성 예시 데이터(빈 양식이면 {})
const val = (k) => (CUR.v && CUR.v[k]) || "";
const ex = (t) => (CUR.example && t !== undefined ? t : "");

const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: 20, ...o });
const para = (t, o = {}) =>
  new Paragraph({
    alignment: o.align || AlignmentType.LEFT,
    spacing: { before: o.before || 0, after: o.after || 0, line: o.line || 276 },
    indent: o.indent,
    children: Array.isArray(t) ? t : [run(t, o.run || {})],
  });

function cell(content, w, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    typeof c === "string" ? para(c, { align: o.align, run: o.run }) : c);
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    columnSpan: o.span,
    borders: o.noBorder ? NOBORDERS : BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: paras,
  });
}
const L = (t, w = C, o = {}) =>
  cell(t, w, { shade: "EDEDED", align: AlignmentType.CENTER, run: { bold: true }, ...o });
const B = (w = V, o = {}) => cell("", w, o);          // 빈 입력칸
const Bv = (k, w = V, o = {}) => cell(val(k), w, { run: { color: BLUE }, ...o }); // 예시값이 있으면 채움
const T = (t, w = V, o = {}) => cell(t, w, o);        // 안내 문구가 들어간 칸

const row = (cells, h = 520) =>
  new TableRow({ height: { value: h, rule: HeightRule.ATLEAST }, cantSplit: true, children: cells });
const table = (rows, widths = [C, V, C, V], width = W) =>
  new Table({ width: { size: width, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows });

// 자주 쓰는 행 패턴
const pair = (a, b) => row([L(a), Bv(a), L(b), Bv(b)]);
const full = (a, h) => row([L(a), Bv(a, W - C, { span: 3 })], h);
const fullText = (a, t, h) => row([L(a), T(t, W - C, { span: 3 }), ], h);
const checks = (items) => para(items.map((i) => `${(CUR.c || []).includes(i) ? "☒" : BOX} ${i}`).join("      "));

const title = (t) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 280 },
    children: [run(t.split("").join(" "), { size: 44, bold: true })] });
const heading = (t) => para(`■ ${t}`, { before: 240, after: 80, run: { bold: true, size: 21 } });
const note = (t) => para(t, { align: AlignmentType.RIGHT, after: 60, run: { size: 17, color: "777777" } });
const gap = (n = 160) => new Paragraph({ spacing: { before: n, after: 0 }, children: [] });
const statement = (lines) => lines.map((l) => para(l, { align: AlignmentType.CENTER, line: 360, run: { size: 21 } }));
const dateLine = () => para(CUR.date || "20　　　　년　　　　월　　　　일", { align: AlignmentType.CENTER, before: 300, after: 200, run: { size: 22, color: CUR.date ? BLUE : undefined } });
const to = () => para(`${CUR.company || "(회사명)　　　　　　　"}　　　　　귀중`, { align: AlignmentType.LEFT, before: 120, after: 0, run: { size: 22, bold: true } });

// 서명(인)란
const sign = (label = "성　명", extra = []) =>
  new Table({
    width: { size: 5200, type: WidthType.DXA }, columnWidths: [1500, 3700], alignment: AlignmentType.RIGHT,
    layout: TableLayoutType.FIXED,
    rows: [...extra, row([L(label, 1500), cell(para([run(val("서명"), { color: BLUE, size: 22 }), run(val("서명") ? "   (인)" : "(서명 또는 인)", { size: 17, color: "888888" })], { align: AlignmentType.RIGHT }), 3700)], 600)],
  });

// 결재란
const approval = (names) => {
  const w = 1000, lw = 700;
  return new Table({
    width: { size: w * names.length + lw, type: WidthType.DXA }, columnWidths: [lw, ...names.map(() => w)],
    alignment: AlignmentType.RIGHT, layout: TableLayoutType.FIXED,
    rows: [
      row([L("결재", lw), ...names.map((n) => L(n, w, { align: AlignmentType.CENTER }))], 380),
      row([L("", lw), ...names.map(() => B(w))], 600),
    ],
  });
};
// 회사 정보(증명서 발급처)
const issuer = () => [
  heading("발급 기관"),
  table([
    pair("회 사 명", "대표자"),
    pair("사업자등록번호", "전화번호"),
    full("소 재 지"),
  ]),
];

const footer = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA", space: 6 } },
    children: [run("인컴다운 제공 무료 양식", { size: 17, color: "777777" })],
  })],
});

async function build(name, children, outDir = ".") {
  if (CUR.example) children.splice(1, 0, new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run("※ 작성 예시 — 가상의 이름·회사로 채운 샘플입니다 (실제 정보 아님)", { size: 17, color: "C0392B" })] }));
  const doc = new Document({
    title: name, creator: "인컴다운",
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, footer: 500 } } },
      footers: { default: footer },
      children,
    }],
  });
  fs.writeFileSync(`${outDir}/${name}.docx`, await Packer.toBuffer(doc));
}

const person = () => [pair("성　　명", "생년월일"), pair("소속(부서)", "직　　위"), pair("사　　번", "연 락 처"), full("주　　소")];

const forms = {};
(async () => {
  // 1. 사직서
  forms["1_사직서"] = () => [
    title("사 직 서"),
    heading("인적 사항"),
    table([...person(), pair("입 사 일", "퇴직 희망일")]),
    heading("사직 사유"),
    table([
      row([L("사유 구분"), T([
        checks(["개인 사정", "이직", "건강", "학업", "가사·육아", "기타"]),
        checks(["권고사직", "계약기간 만료"]),
      ], W - C, { span: 3 })], 760),
      full("상세 사유", 1300),
    ]),
    heading("인수인계"),
    table([full("담당 업무", 900), pair("인수인계 대상자", "인수인계 완료 예정일")]),
    gap(300),
    ...statement(["위와 같은 사유로 사직하고자 하오니 허락하여 주시기 바랍니다.", "또한 퇴직일까지 맡은 업무의 인수인계를 성실히 이행하겠습니다."]),
    dateLine(),
    sign("성　명"),
    to(),
  ];

  // 2. 재직증명서
  forms["2_재직증명서"] = () => [
    title("재 직 증 명 서"),
    note(`문서번호:  제 ${CUR.docno || "　　　　　　"} 호`),
    heading("인적 사항"),
    table([pair("성　　명", "생년월일"), full("주　　소")]),
    heading("재직 사항"),
    table([
      pair("소속(부서)", "직　　위"),
      pair("입 사 일", "재직 여부"),
      full("담당 업무"),
      row([L("용　　도"), T(checks(["금융기관 제출", "관공서 제출", "학교 제출", "기타"]), W - C, { span: 3 })], 640),
      full("제 출 처"),
    ]),
    gap(300),
    ...statement(["위 사람은 위와 같이 당사에 재직하고 있음을 증명합니다."]),
    dateLine(),
    ...issuer(),
    para("(직인)", { align: AlignmentType.RIGHT, before: 120, run: { size: 18, color: "888888" } }),
  ];

  // 3. 경력증명서
  const career = (n) => { const d = (CUR.career || [])[n] || []; const c = (t, w) => cell(t || "", w, { run: { color: BLUE } }); return row([c(d[0], 2900), c(d[1], 1800), c(d[2], 1800), c(d[3], W - 2900 - 3600)], 640); };
  forms["3_경력증명서"] = () => [
    title("경 력 증 명 서"),
    note(`문서번호:  제 ${CUR.docno || "　　　　　　"} 호`),
    heading("인적 사항"),
    table([pair("성　　명", "생년월일"), full("주　　소")]),
    heading("근무 경력"),
    table([
      row([L("근무 기간", 2900), L("소속(부서)", 1800), L("직　위", 1800), L("담당 업무", W - 2900 - 3600)], 480),
      career(0), career(1), career(2), career(3),
    ], [2900, 1800, 1800, W - 2900 - 3600]),
    gap(80),
    table([
      pair("총 근무 기간", "퇴직 사유"),
      row([L("용　　도"), T(checks(["이직", "금융기관 제출", "관공서 제출", "기타"]), W - C, { span: 3 })], 640),
      full("제 출 처"),
    ]),
    gap(240),
    ...statement(["위 사람은 위와 같이 당사에 근무하였음을 증명합니다."]),
    dateLine(),
    ...issuer(),
    para("(직인)", { align: AlignmentType.RIGHT, before: 120, run: { size: 18, color: "888888" } }),
  ];

  // 4. 연차휴가신청서
  forms["4_연차휴가신청서"] = () => [
    title("연 차 휴 가 신 청 서"),
    approval(["담당", "팀장", "대표"]),
    gap(120),
    heading("신청자"),
    table([pair("성　　명", "소속(부서)"), pair("직　　위", "신청일")]),
    heading("휴가 내용"),
    table([
      row([L("휴가 종류"), T(checks(["연차", "반차(오전)", "반차(오후)", "병가", "경조사", "기타"]), W - C, { span: 3 })], 640),
      row([L("휴가 기간"), T(val("휴가 기간") || "20　　 년　　 월　　 일 (　)  ~  20　　 년　　 월　　 일 (　)", W - C, { span: 3, run: { color: val("휴가 기간") ? BLUE : undefined } }), ]),
      pair("사용 일수", "복귀 예정일"),
      full("사　　유", 1100),
      pair("업무 대행자", "비상 연락처"),
    ]),
    heading("연차 현황 (인사담당 기재)"),
    table([
      row([L("발생 연차", C), L("사용 연차", C), L("이번 신청", C), L("잔여 연차", C), L("확인", W - 4 * C)], 440),
      row([...(CUR.leave || ["", "", "", ""]).map((t) => cell(t, C, { align: AlignmentType.CENTER, run: { color: BLUE } })), B(W - 4 * C)], 560),
    ], [C, C, C, C, W - 4 * C]),
    gap(240),
    ...statement(["위와 같이 휴가를 신청하오니 허가하여 주시기 바랍니다."]),
    dateLine(),
    sign("신청인"),
    to(),
  ];

  // 5. 퇴직금 중간정산 신청서
  forms["5_퇴직금중간정산신청서"] = () => [
    title("퇴직금 중간정산 신청서"),
    approval(["담당", "팀장", "대표"]),
    gap(40),
    heading("신청자"),
    table([...person().slice(0, 2), pair("사　　번", "입 사 일"), full("주　　소")]),
    heading("정산 내용"),
    table([
      pair("중간정산 기준일", "정산 대상 기간"),
      row([L("신청 사유"), T([
        checks(["무주택자 주택 구입", "무주택자 전세보증금 부담"]),
        checks(["6개월 이상 요양(본인·부양가족)", "파산선고·개인회생절차 개시"]),
        checks(["천재지변 등 재난 피해", "임금피크제 실시", "기타 법령상 사유"]),
      ].map((p) => p), W - C, { span: 3 })], 1000),
      full("상세 내용", 800),
      row([L("증빙 서류"), T(checks(["등기부등본·계약서", "진단서·소득증빙", "법원 결정문", "기타"]), W - C, { span: 3 })], 640),
    ]),
    heading("수령 계좌"),
    table([pair("은　　행", "예 금 주"), full("계좌번호")]),
    gap(100),
    ...statement(["위와 같은 사유로 퇴직금 중간정산을 신청합니다.", "신청 사유 및 증빙 서류의 내용이 사실과 다름이 없음을 확인합니다."]),
    dateLine(),
    sign("신청인"),
    heading("회사 기재란"),
    table([pair("평균임금(일)", "정산 금액"), full("지급 예정일")]),
  ];

  const DATA = require("./example-data.js");
  fs.mkdirSync("examples-src", { recursive: true });
  for (const [name, make] of Object.entries(forms)) {
    CUR = {};
    await build(name, make());                       // 빈 양식
    CUR = { ...DATA[name], example: true };
    await build(name, make(), "examples-src");       // 작성 예시
  }
})();
