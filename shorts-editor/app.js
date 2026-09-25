'use strict';

// ===== 기본 설정 =====
const W = 1080;
const H = 1920;
const FPS = 30;
const FONT = "'Noto Sans KR', sans-serif";
const STORAGE_KEY = 'sports-hanip-shorts-v1';

// 장면 종류별 입력 항목: [필드 이름, 입력 종류, 라벨, (select 옵션)]
const TYPES = {
  hook: {
    label: '훅 (결론 먼저)',
    duration: 2,
    fields: [
      ['badge', 'text', '라벨 (예: 속보, 오늘의 KBO)'],
      ['text', 'textarea', '큰 제목'],
      ['media', 'media', '배경 사진/영상'],
      ['bgColor', 'color', '배경색'],
    ],
    defaults: { badge: '오늘의 KBO', text: '9회말 [끝내기]!\nLG 3연승', bgColor: '#111827' },
  },
  score: {
    label: '스코어보드',
    duration: 3,
    fields: [
      ['status', 'text', '상태 (예: 경기 종료)'],
      ['teamA', 'text', '팀 A 이름'],
      ['scoreA', 'text', '팀 A 점수'],
      ['colorA', 'color', '팀 A 색'],
      ['teamB', 'text', '팀 B 이름'],
      ['scoreB', 'text', '팀 B 점수'],
      ['colorB', 'color', '팀 B 색'],
      ['text', 'text', '아래 한 줄 (예: 잠실 · 9회말 끝내기)'],
      ['media', 'media', '배경 사진/영상'],
      ['bgColor', 'color', '배경색'],
    ],
    defaults: {
      status: '경기 종료', teamA: 'LG', scoreA: '5', colorA: '#c30452',
      teamB: '두산', scoreB: '4', colorB: '#1a1748', text: '잠실 · 9회말 끝내기', bgColor: '#0b1020',
    },
  },
  caption: {
    label: '장면 + 자막',
    duration: 5,
    fields: [
      ['badge', 'text', '상단 라벨 (예: 핵심 장면 1)'],
      ['text', 'textarea', '자막'],
      ['position', 'select', '자막 위치', [['bottom', '아래'], ['middle', '가운데'], ['top', '위']]],
      ['media', 'media', '사진/영상'],
      ['bgColor', 'color', '배경색'],
    ],
    defaults: { badge: '핵심 장면', text: '9회말 2사 만루\n대타의 [끝내기 안타]', position: 'bottom', bgColor: '#1f2937' },
  },
  stat: {
    label: '기록 카드',
    duration: 6,
    fields: [
      ['badge', 'text', '라벨 (예: 오늘의 MVP)'],
      ['text', 'text', '선수 이름'],
      ['sub', 'text', '팀 · 포지션'],
      ['stats', 'textarea', '기록 (한 줄에 "항목: 값", 최대 5줄)'],
      ['media', 'media', '선수 사진/영상'],
      ['bgColor', 'color', '배경색'],
    ],
    defaults: {
      badge: '오늘의 MVP', text: '홍길동', sub: 'LG 트윈스 · 외야수',
      stats: '타격: 4타수 3안타\n타점: 3타점\n결승타: 9회말 끝내기', bgColor: '#111827',
    },
  },
  outro: {
    label: '질문 + 구독 유도',
    duration: 4,
    fields: [
      ['text', 'textarea', '질문 (댓글 유도)'],
      ['sub', 'text', '구독 문구'],
      ['media', 'media', '배경 사진/영상'],
      ['bgColor', 'color', '배경색'],
    ],
    defaults: { text: '오늘 MVP는 누구?\n[댓글]로 알려주세요', sub: '구독하고 매일 한입!', bgColor: '#111827' },
  },
};

// 구성안(README.md)과 같은 순서의 기본 템플릿
const TEMPLATES = {
  game: {
    label: '경기 결과 요약 (30초)',
    scenes: [
      ['hook', {}],
      ['score', {}],
      ['caption', { badge: '핵심 장면 1', text: '1회초 선제 [2점 홈런]' }],
      ['caption', { badge: '핵심 장면 2', text: '7회 동점 적시타\n승부는 다시 [원점]' }],
      ['caption', { badge: '핵심 장면 3', text: '9회말 2사 만루\n대타의 [끝내기 안타]' }],
      ['stat', {}],
      ['outro', {}],
    ],
  },
  player: {
    label: '선수 기록 (20초)',
    scenes: [
      ['hook', { badge: '대기록', text: '시즌 [40홈런]\n달성!' }],
      ['caption', { badge: '기록의 순간', text: '6회말 우중간\n비거리 [135m] 대포', duration: 5 }],
      ['stat', {
        badge: '시즌 기록', sub: 'OO 구단 · 1루수',
        stats: '홈런: 40개 (1위)\n타점: 112타점\n타율: 0.312\nOPS: 1.021', duration: 7,
      }],
      ['caption', { badge: '의미', text: '구단 역대 [최초]\n40홈런 타자', position: 'middle', duration: 3 }],
      ['outro', { text: '50홈런까지 갈까?\n[댓글]로 예상해 주세요', duration: 3 }],
    ],
  },
  news: {
    label: '이적 · 뉴스 속보 (25초)',
    scenes: [
      ['hook', { badge: '속보', text: '[오피셜]\nOOO 이적 확정' }],
      ['caption', { badge: '무슨 일?', text: 'OOO가 A팀에서\nB팀으로 [전격 이적]' }],
      ['stat', {
        badge: '계약 조건', text: 'OOO', sub: 'B팀 · 미드필더',
        stats: '기간: 4년\n이적료: 약 500억 원\n주급: 팀 내 최고 수준',
      }],
      ['caption', { badge: '영향', text: 'B팀 중원에\n[즉시 전력] 합류' }],
      ['caption', { badge: '팬 반응', text: '"드디어 왔다"\n"[우승] 가자"', position: 'middle', duration: 4 }],
      ['outro', { text: '이번 이적\n[성공]할까요?', duration: 3 }],
    ],
  },
};

const DEFAULT_SETTINGS = {
  channel: '스포츠 한입',
  accent: '#ffd400',
  watermark: true,
  progress: true,
  bgmVolume: 0.3,
  narrationVolume: 1,
  title: '',
  tags: '#스포츠한입 #KBO #야구 #shorts',
};

// ===== 상태 =====
let nextId = 1;
const state = {
  settings: { ...DEFAULT_SETTINGS },
  scenes: [],
  selected: 0,
  time: 0,
  playing: false,
  exporting: false,
  dirty: true,
  recorder: null,
};
const media = new Map(); // mediaId -> { kind, el, url, name }
const audio = { bgm: new Audio(), narration: new Audio(), ctx: null, dest: null, gains: {} };
audio.bgm.loop = true;

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d');

function makeScene(type, overrides = {}) {
  const def = TYPES[type];
  return { id: nextId++, type, duration: def.duration, ...def.defaults, ...overrides, mediaId: null };
}

function loadTemplate(key) {
  state.scenes = TEMPLATES[key].scenes.map(([type, o]) => makeScene(type, o));
  state.selected = 0;
  state.time = 0;
}

function totalDuration() {
  return state.scenes.reduce((sum, s) => sum + Number(s.duration || 0), 0);
}

function sceneStart(index) {
  let t = 0;
  for (let i = 0; i < index; i++) t += Number(state.scenes[i].duration || 0);
  return t;
}

function sceneAt(t) {
  let start = 0;
  for (let i = 0; i < state.scenes.length; i++) {
    const d = Number(state.scenes[i].duration || 0);
    if (t < start + d || i === state.scenes.length - 1) {
      return { scene: state.scenes[i], index: i, localT: Math.min(Math.max(t - start, 0), d) };
    }
    start += d;
  }
  return { scene: null, index: -1, localT: 0 };
}

// ===== 그리기 도우미 =====
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
function easeOutBack(p) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function setFont(size, weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const stripMarks = (s) => s.replace(/[[\]]/g, '');
const measure = (s) => ctx.measureText(stripMarks(s)).width;

// 띄어쓰기 기준으로 줄바꿈하고, 너무 긴 단어는 글자 단위로 자른다.
function wrapLines(text, maxW) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const cand = line ? `${line} ${word}` : word;
      if (measure(cand) <= maxW) {
        line = cand;
        continue;
      }
      if (line) out.push(line);
      line = '';
      for (const ch of word) {
        if (line && measure(line + ch) > maxW) {
          out.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
    }
    out.push(line);
  }
  return out;
}

// 여러 줄 텍스트. [대괄호] 안의 글자는 강조색. 반환값: 그린 높이.
function layoutText(text, { size, weight = 900, maxW = W - 200, maxLines = 4, lineH = 1.22 }) {
  let s = size;
  setFont(s, weight);
  let lines = wrapLines(text, maxW);
  while (lines.length > maxLines && s > 40) {
    s = Math.round(s * 0.9);
    setFont(s, weight);
    lines = wrapLines(text, maxW);
  }
  return { lines, size: s, weight, lineH, height: lines.length * s * lineH };
}

function drawText(layout, cx, top, { color = '#fff', stroke = true } = {}) {
  const { lines, size, weight, lineH } = layout;
  setFont(size, weight);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  let highlight = false;
  lines.forEach((line, i) => {
    const y = top + i * size * lineH;
    let x = cx - measure(line) / 2;
    // 강조 표시 기준으로 조각내기
    const parts = [];
    let buf = '';
    for (const ch of line) {
      if (ch === '[' || ch === ']') {
        if (buf) parts.push([buf, highlight]);
        buf = '';
        highlight = ch === '[';
      } else {
        buf += ch;
      }
    }
    if (buf) parts.push([buf, highlight]);
    for (const [str, hl] of parts) {
      if (stroke) {
        ctx.lineWidth = size * 0.12;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = hl ? state.settings.accent : color;
      ctx.fillText(str, x, y);
      x += ctx.measureText(str).width;
    }
  });
}

function drawPill(text, cx, y, { size = 52, bg = state.settings.accent, color = '#111', padX = 34, padY = 16 } = {}) {
  if (!text) return 0;
  setFont(size, 900);
  const w = ctx.measureText(text).width + padX * 2;
  const h = size + padY * 2;
  ctx.fillStyle = bg;
  roundRect(cx - w / 2, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h / 2 + size * 0.04);
  return h;
}

// 가운데 기준으로 확대 애니메이션
function withPop(cx, cy, p, fn) {
  const s = p >= 1 ? 1 : Math.max(easeOutBack(clamp01(p)), 0.01);
  ctx.save();
  ctx.globalAlpha *= clamp01(p * 3);
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

function mediaReady(m) {
  if (!m) return false;
  if (m.kind === 'video') return m.el.readyState >= 2 && m.el.videoWidth > 0;
  return m.el.complete && m.el.naturalWidth > 0;
}

function drawBackground(scene, localT) {
  ctx.fillStyle = scene.bgColor || '#111';
  ctx.fillRect(0, 0, W, H);
  const m = media.get(scene.mediaId);
  if (!mediaReady(m)) return;
  const iw = m.kind === 'video' ? m.el.videoWidth : m.el.naturalWidth;
  const ih = m.kind === 'video' ? m.el.videoHeight : m.el.naturalHeight;
  // 천천히 확대되는 효과 (켄 번스)
  const zoom = 1 + 0.08 * (localT / Math.max(scene.duration, 0.1));
  const s = Math.max(W / iw, H / ih) * zoom;
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(m.el, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.3, 'rgba(0,0,0,0.15)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ===== 장면별 그리기 =====
const RENDERERS = {
  hook(scene, t) {
    const layout = layoutText(scene.text, { size: 150, maxLines: 3 });
    const top = 860 - layout.height / 2;
    // 라벨은 제목 바로 위에 둔다 (제목 줄 수에 따라 위치가 달라짐)
    const badgeP = easeOut(clamp01(t / 0.25));
    ctx.save();
    ctx.globalAlpha = badgeP;
    drawPill(scene.badge, W / 2, Math.min(520, top - 130) - (1 - badgeP) * 40, { size: 58 });
    ctx.restore();
    withPop(W / 2, 860, t / 0.35, () => drawText(layout, W / 2, top));
  },

  score(scene, t) {
    drawPill(scene.status, W / 2, 380, { size: 50, bg: '#fff' });
    const a = Number(scene.scoreA);
    const b = Number(scene.scoreB);
    const cards = [
      { name: scene.teamA, score: scene.scoreA, color: scene.colorA, x: 80, dir: -1, win: a > b },
      { name: scene.teamB, score: scene.scoreB, color: scene.colorB, x: 560, dir: 1, win: b > a },
    ];
    const p = easeOut(clamp01(t / 0.4));
    for (const c of cards) {
      ctx.save();
      ctx.translate(c.dir * (1 - p) * 600, 0);
      ctx.fillStyle = c.color || '#333';
      roundRect(c.x, 560, 440, 560, 36);
      ctx.fill();
      if (c.win) {
        ctx.lineWidth = 14;
        ctx.strokeStyle = state.settings.accent;
        ctx.stroke();
        drawPill('WIN', c.x + 220, 520, { size: 40 });
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      setFont(80, 900);
      ctx.fillText(c.name || '', c.x + 220, 680, 400);
      setFont(260, 900);
      ctx.fillText(c.score || '', c.x + 220, 900, 400);
      ctx.restore();
    }
    const layout = layoutText(scene.text, { size: 64, maxLines: 2 });
    ctx.save();
    ctx.globalAlpha = clamp01((t - 0.4) / 0.3);
    drawText(layout, W / 2, 1200);
    ctx.restore();
  },

  caption(scene, t) {
    drawPill(scene.badge, W / 2, 300, { size: 46, bg: 'rgba(0,0,0,0.6)', color: '#fff' });
    const layout = layoutText(scene.text, { size: 100, maxLines: 4 });
    let top;
    if (scene.position === 'top') top = 420;
    else if (scene.position === 'middle') top = 900 - layout.height / 2;
    else top = 1450 - layout.height;
    withPop(W / 2, top + layout.height / 2, t / 0.3, () => drawText(layout, W / 2, top));
  },

  stat(scene, t) {
    drawPill(scene.badge, W / 2, 300, { size: 52 });
    withPop(W / 2, 700, t / 0.35, () => {
      drawText(layoutText(scene.text, { size: 140, maxLines: 1 }), W / 2, 620);
    });
    ctx.save();
    ctx.globalAlpha = clamp01((t - 0.2) / 0.3);
    drawText(layoutText(scene.sub, { size: 52, weight: 700, maxLines: 1 }), W / 2, 800, { color: '#d6d9e0' });
    ctx.restore();
    const rows = String(scene.stats || '').split('\n').filter((r) => r.trim()).slice(0, 5);
    rows.forEach((row, i) => {
      const [label, ...rest] = row.split(':');
      const value = rest.join(':').trim();
      const p = easeOut(clamp01((t - 0.4 - i * 0.3) / 0.3));
      if (p <= 0) return;
      const y = 920 + i * 118;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate((1 - p) * 300, 0);
      ctx.fillStyle = 'rgba(15,17,21,0.82)';
      roundRect(90, y, W - 180, 100, 24);
      ctx.fill();
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c8ccd6';
      setFont(46, 700);
      ctx.fillText(value ? label.trim() : '', 130, y + 52, 360);
      ctx.textAlign = 'right';
      ctx.fillStyle = state.settings.accent;
      setFont(56, 900);
      ctx.fillText(value || label.trim(), W - 130, y + 52, value ? 520 : W - 260);
      ctx.restore();
    });
  },

  outro(scene, t) {
    const layout = layoutText(scene.text, { size: 110, maxLines: 3 });
    const top = 720 - layout.height / 2;
    withPop(W / 2, 720, t / 0.35, () => drawText(layout, W / 2, top));
    const p = clamp01((t - 0.4) / 0.35);
    withPop(W / 2, 1150, p, () => drawPill(state.settings.channel, W / 2, 1100, { size: 72, padX: 48, padY: 22 }));
    // 구독 버튼이 살짝 두근거림
    const beat = 1 + 0.05 * Math.sin(t * 8);
    withPop(W / 2, 1320, clamp01((t - 0.7) / 0.35) * beat, () => {
      drawPill(scene.sub, W / 2, 1280, { size: 50, bg: '#ff0033', color: '#fff' });
    });
  },
};

function drawBranding(t, total, scene) {
  if (state.settings.progress && total > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, W, 12);
    ctx.fillStyle = state.settings.accent;
    ctx.fillRect(0, 0, W * clamp01(t / total), 12);
  }
  if (state.settings.watermark && scene.type !== 'outro') {
    ctx.save();
    ctx.globalAlpha = 0.9;
    setFont(38, 900);
    const text = state.settings.channel;
    const w = ctx.measureText(text).width + 40;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(60, 180, w, 64, 32);
    ctx.fill();
    ctx.fillStyle = state.settings.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 80, 214);
    ctx.restore();
  }
}

function render(t) {
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const { scene, index, localT } = sceneAt(t);
  if (scene) {
    drawBackground(scene, localT);
    RENDERERS[scene.type](scene, localT);
    // 장면 전환 때 짧은 번쩍임
    if (index > 0 && localT < 0.15) {
      ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - localT / 0.15)})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawBranding(t, totalDuration(), scene);
  }
  ctx.restore();
}

// ===== 재생 =====
function syncVideos() {
  const { scene, localT } = sceneAt(state.time);
  const activeId = scene && scene.mediaId;
  for (const [id, m] of media) {
    if (m.kind !== 'video') continue;
    const v = m.el;
    if (id !== activeId) {
      if (!v.paused) v.pause();
      continue;
    }
    const want = v.duration ? localT % v.duration : localT;
    if (state.playing) {
      if (v.paused) {
        v.currentTime = want;
        v.play().catch(() => {});
      } else if (Math.abs(v.currentTime - want) > 0.3) {
        v.currentTime = want;
      }
    } else {
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - want) > 0.05) v.currentTime = want;
    }
  }
}

function ensureAudioGraph() {
  if (audio.ctx) return;
  audio.ctx = new AudioContext();
  audio.dest = audio.ctx.createMediaStreamDestination();
  for (const key of ['bgm', 'narration']) {
    const src = audio.ctx.createMediaElementSource(audio[key]);
    const gain = audio.ctx.createGain();
    src.connect(gain);
    gain.connect(audio.ctx.destination);
    gain.connect(audio.dest);
    audio.gains[key] = gain;
  }
  updateVolumes();
}

function updateVolumes() {
  if (!audio.ctx) return;
  audio.gains.bgm.gain.value = Number(state.settings.bgmVolume);
  audio.gains.narration.gain.value = Number(state.settings.narrationVolume);
}

function playAudio() {
  for (const key of ['bgm', 'narration']) {
    const el = audio[key];
    if (!el.src) continue;
    const d = el.duration;
    if (key === 'narration' && d && state.time >= d) continue;
    el.currentTime = key === 'bgm' && d ? state.time % d : state.time;
    el.play().catch(() => {});
  }
}

function pauseAudio() {
  audio.bgm.pause();
  audio.narration.pause();
}

function play() {
  if (!state.scenes.length) return;
  ensureAudioGraph();
  audio.ctx.resume();
  if (state.time >= totalDuration()) state.time = 0;
  state.playing = true;
  playAudio();
  $('playBtn').textContent = '❚❚';
}

function pause() {
  state.playing = false;
  pauseAudio();
  $('playBtn').textContent = '▶';
  state.dirty = true;
}

function seek(t) {
  state.time = Math.min(Math.max(t, 0), totalDuration());
  if (state.playing) playAudio();
  state.dirty = true;
}

let lastTs = null;
function tick(ts) {
  if (state.playing) {
    if (lastTs !== null) state.time += (ts - lastTs) / 1000;
    lastTs = ts;
    const total = totalDuration();
    if (state.time >= total) {
      state.time = total;
      if (state.exporting) finishExport();
      else pause();
    }
    if (state.exporting) $('exportProgress').textContent = `${Math.round((state.time / total) * 100)}%`;
  } else {
    lastTs = null;
  }
  syncVideos();
  if (state.playing || state.dirty) {
    render(state.time);
    updateTimeUI();
    state.dirty = false;
  }
  requestAnimationFrame(tick);
}

function updateTimeUI() {
  const total = totalDuration();
  const seekEl = $('seek');
  seekEl.max = total || 1;
  if (document.activeElement !== seekEl) seekEl.value = state.time;
  $('timeLabel').textContent = `${state.time.toFixed(1)} / ${total.toFixed(1)}초`;
  const { index } = sceneAt(state.time);
  document.querySelectorAll('#sceneList li').forEach((li, i) => li.classList.toggle('playing', i === index));
}

// ===== 내보내기 =====
// 업로드 호환성을 위해 H.264 MP4를 우선하고, 안 되면 WebM으로 저장한다.
function pickMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((c) => window.MediaRecorder && MediaRecorder.isTypeSupported(c)) || '';
}

function exportVideo() {
  if (state.exporting || !state.scenes.length) return;
  if (!window.MediaRecorder || !canvas.captureStream) {
    alert('이 브라우저는 영상 녹화를 지원하지 않습니다. 최신 크롬이나 엣지를 사용해 주세요.');
    return;
  }
  pause();
  ensureAudioGraph();
  audio.ctx.resume();
  const mimeType = pickMimeType();
  const stream = new MediaStream([
    ...canvas.captureStream(FPS).getVideoTracks(),
    ...audio.dest.stream.getAudioTracks(),
  ]);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((tr) => { if (tr.kind === 'video') tr.stop(); });
    const type = rec.mimeType || mimeType || 'video/webm';
    const ext = type.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.settings.channel.replace(/\s+/g, '')}_${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    state.exporting = false;
    $('exportOverlay').hidden = true;
    $('exportStatus').textContent = ext === 'mp4'
      ? `완료: ${a.download} (${(blob.size / 1048576).toFixed(1)}MB)`
      : `완료: ${a.download} — 이 브라우저는 MP4 녹화를 지원하지 않아 WebM으로 저장했습니다. 네이버 클립 등 MP4만 받는 곳은 변환이 필요합니다.`;
  };
  state.recorder = rec;
  state.exporting = true;
  resetShareChecks();
  state.time = 0;
  $('exportOverlay').hidden = false;
  $('exportProgress').textContent = '0%';
  render(0);
  rec.start(250);
  play();
}

function finishExport() {
  pause();
  // 마지막 프레임이 담기도록 잠깐 기다렸다가 멈춘다
  setTimeout(() => state.recorder && state.recorder.state !== 'inactive' && state.recorder.stop(), 200);
}

// ===== 화면 (장면 목록 / 입력 폼) =====
function renderSceneList() {
  const list = $('sceneList');
  list.innerHTML = '';
  state.scenes.forEach((scene, i) => {
    const li = document.createElement('li');
    li.className = i === state.selected ? 'active' : '';
    const hasMedia = scene.mediaId && media.has(scene.mediaId) ? ' · 🖼' : '';
    li.innerHTML = `
      <div class="meta"><span>${i + 1}. ${TYPES[scene.type].label}</span><small>${Number(scene.duration)}초${hasMedia}</small></div>
      <div class="snippet"></div>
      <div class="tools">
        <button data-act="up" title="위로">↑</button>
        <button data-act="down" title="아래로">↓</button>
        <button data-act="dup">복제</button>
        <button data-act="del">삭제</button>
      </div>`;
    li.querySelector('.snippet').textContent = stripMarks(String(scene.text || scene.badge || '')).replace(/\n/g, ' ');
    li.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.act;
      if (act) sceneAction(act, i);
      else selectScene(i);
    });
    list.appendChild(li);
  });
}

function selectScene(i) {
  state.selected = i;
  if (!state.playing) seek(sceneStart(i) + Math.min(1, state.scenes[i].duration / 2));
  renderSceneList();
  renderSceneForm();
}

function sceneAction(act, i) {
  const s = state.scenes;
  if (act === 'up' && i > 0) {
    [s[i - 1], s[i]] = [s[i], s[i - 1]];
    state.selected = i - 1;
  } else if (act === 'down' && i < s.length - 1) {
    [s[i + 1], s[i]] = [s[i], s[i + 1]];
    state.selected = i + 1;
  } else if (act === 'dup') {
    s.splice(i + 1, 0, { ...s[i], id: nextId++ });
    state.selected = i + 1;
  } else if (act === 'del') {
    if (s.length <= 1) return;
    s.splice(i, 1);
    state.selected = Math.min(i, s.length - 1);
  }
  changed();
  renderSceneList();
  renderSceneForm();
}

function renderSceneForm() {
  const form = $('sceneForm');
  form.innerHTML = '';
  const scene = state.scenes[state.selected];
  if (!scene) return;

  const typeLabel = document.createElement('label');
  typeLabel.textContent = '장면 종류';
  const typeSel = document.createElement('select');
  for (const [key, def] of Object.entries(TYPES)) typeSel.add(new Option(def.label, key, false, key === scene.type));
  typeSel.addEventListener('change', () => {
    const def = TYPES[typeSel.value];
    Object.assign(scene, { ...def.defaults, ...scene, type: typeSel.value });
    changed();
    renderSceneList();
    renderSceneForm();
  });
  typeLabel.appendChild(typeSel);
  form.appendChild(typeLabel);

  const durLabel = document.createElement('label');
  durLabel.textContent = '길이 (초)';
  const dur = document.createElement('input');
  Object.assign(dur, { type: 'number', min: 0.5, max: 60, step: 0.5, value: scene.duration });
  dur.addEventListener('input', () => {
    const v = Number(dur.value);
    if (v > 0) {
      scene.duration = v;
      changed();
      renderSceneList();
    }
  });
  durLabel.appendChild(dur);
  form.appendChild(durLabel);

  for (const [key, kind, label, options] of TYPES[scene.type].fields) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    if (kind === 'media') {
      form.appendChild(buildMediaField(scene, wrap));
      continue;
    }
    let input;
    if (kind === 'textarea') {
      input = document.createElement('textarea');
    } else if (kind === 'select') {
      input = document.createElement('select');
      for (const [v, text] of options) input.add(new Option(text, v));
    } else {
      input = document.createElement('input');
      input.type = kind;
    }
    input.value = scene[key] ?? '';
    input.addEventListener('input', () => {
      scene[key] = input.value;
      changed();
      if (key === 'text' || key === 'badge') renderSceneList();
    });
    wrap.appendChild(input);
    form.appendChild(wrap);
  }
}

function buildMediaField(scene, wrap) {
  const m = media.get(scene.mediaId);
  const row = document.createElement('div');
  row.className = 'media-row';
  const name = document.createElement('span');
  name.textContent = m ? m.name : '없음';
  const pick = document.createElement('label');
  pick.className = 'button-like ghost';
  pick.textContent = m ? '변경' : '선택';
  const file = document.createElement('input');
  Object.assign(file, { type: 'file', accept: 'image/*,video/*', hidden: true });
  file.addEventListener('change', () => {
    if (!file.files[0]) return;
    scene.mediaId = addMedia(file.files[0]);
    changed();
    renderSceneList();
    renderSceneForm();
  });
  pick.appendChild(file);
  row.append(name, pick);
  if (m) {
    const clear = document.createElement('button');
    clear.className = 'ghost';
    clear.textContent = '제거';
    clear.addEventListener('click', (e) => {
      e.preventDefault();
      scene.mediaId = null;
      changed();
      renderSceneList();
      renderSceneForm();
    });
    row.appendChild(clear);
  }
  wrap.appendChild(row);
  return wrap;
}

function addMedia(file) {
  const id = `m${nextId++}`;
  const url = URL.createObjectURL(file);
  const onReady = () => { state.dirty = true; };
  if (file.type.startsWith('video/')) {
    const v = document.createElement('video');
    Object.assign(v, { src: url, muted: true, playsInline: true, loop: true, preload: 'auto' });
    v.addEventListener('loadeddata', onReady);
    v.addEventListener('seeked', onReady);
    media.set(id, { kind: 'video', el: v, url, name: file.name });
  } else {
    const img = new Image();
    img.onload = onReady;
    img.src = url;
    media.set(id, { kind: 'image', el: img, url, name: file.name });
  }
  return id;
}

// ===== 업로드 체크리스트 =====
const SHARE_KEY = 'sports-hanip-shared-v1';

function saveShareChecks() {
  const done = [...document.querySelectorAll('#shareList input')].filter((c) => c.checked).map((c) => c.dataset.platform);
  try { localStorage.setItem(SHARE_KEY, JSON.stringify(done)); } catch (e) { /* 저장 불가 환경 */ }
}

function applyShareChecks(done) {
  document.querySelectorAll('#shareList input').forEach((c) => {
    c.checked = done.includes(c.dataset.platform);
    c.closest('li').classList.toggle('done', c.checked);
  });
}

// 새 영상을 내보내면 체크리스트를 처음부터 다시 시작한다
function resetShareChecks() {
  applyShareChecks([]);
  saveShareChecks();
}

function bindShareList() {
  let done = [];
  try { done = JSON.parse(localStorage.getItem(SHARE_KEY)) || []; } catch (e) { /* 없음 */ }
  applyShareChecks(done);
  document.querySelectorAll('#shareList input').forEach((c) => c.addEventListener('change', () => {
    c.closest('li').classList.toggle('done', c.checked);
    saveShareChecks();
  }));
}

// ===== 저장 / 불러오기 =====
function projectData() {
  // 사진/영상 파일은 브라우저에 저장할 수 없어서 글자와 설정만 저장한다.
  return {
    version: 1,
    settings: state.settings,
    scenes: state.scenes.map(({ mediaId, id, ...rest }) => rest),
  };
}

function applyProject(data) {
  if (!data || !Array.isArray(data.scenes) || !data.scenes.length) return false;
  state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  state.scenes = data.scenes.filter((s) => TYPES[s.type]).map((s) => ({ ...s, id: nextId++, mediaId: null }));
  state.selected = 0;
  state.time = 0;
  return state.scenes.length > 0;
}

let saveTimer = null;
function changed() {
  state.dirty = true;
  if (state.time > totalDuration()) state.time = totalDuration();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData())); } catch (e) { /* 저장 불가 환경 */ }
  }, 400);
}

function syncSettingsUI() {
  const s = state.settings;
  $('setChannel').value = s.channel;
  $('setAccent').value = s.accent;
  $('setWatermark').checked = s.watermark;
  $('setProgress').checked = s.progress;
  $('bgmVolume').value = s.bgmVolume;
  $('narrationVolume').value = s.narrationVolume;
  $('setTitle').value = s.title;
  $('setTags').value = s.tags;
  document.documentElement.style.setProperty('--accent', s.accent);
}

function refreshAll() {
  syncSettingsUI();
  renderSceneList();
  renderSceneForm();
  updateVolumes();
  state.dirty = true;
}

// ===== 이벤트 연결 =====
function bindUI() {
  for (const [key, t] of Object.entries(TEMPLATES)) $('templateSelect').add(new Option(t.label, key));
  for (const [key, t] of Object.entries(TYPES)) $('addType').add(new Option(t.label, key));

  $('applyTemplate').addEventListener('click', () => {
    if (!confirm('지금 장면들을 템플릿으로 바꿀까요? (사진/영상 연결도 초기화됩니다)')) return;
    pause();
    loadTemplate($('templateSelect').value);
    changed();
    refreshAll();
  });

  $('addScene').addEventListener('click', () => {
    const type = $('addType').value;
    state.scenes.splice(state.selected + 1, 0, makeScene(type));
    changed();
    selectScene(state.selected + 1);
  });

  $('saveProject').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(projectData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.settings.channel.replace(/\s+/g, '')}_프로젝트.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  });

  $('loadProject').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (!applyProject(JSON.parse(await file.text()))) throw new Error('empty');
      pause();
      changed();
      refreshAll();
    } catch (err) {
      alert('프로젝트 파일을 읽을 수 없습니다.');
    }
  });

  const bindSetting = (id, key, prop = 'value') => {
    $(id).addEventListener('input', () => {
      state.settings[key] = $(id)[prop];
      if (key === 'accent') document.documentElement.style.setProperty('--accent', state.settings.accent);
      updateVolumes();
      changed();
    });
  };
  bindSetting('setChannel', 'channel');
  bindSetting('setAccent', 'accent');
  bindSetting('setWatermark', 'watermark', 'checked');
  bindSetting('setProgress', 'progress', 'checked');
  bindSetting('bgmVolume', 'bgmVolume');
  bindSetting('narrationVolume', 'narrationVolume');
  bindSetting('setTitle', 'title');
  bindSetting('setTags', 'tags');

  for (const key of ['bgm', 'narration']) {
    $(`${key}File`).addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (audio[key].src) URL.revokeObjectURL(audio[key].src);
      audio[key].src = file ? URL.createObjectURL(file) : '';
      if (!file) audio[key].removeAttribute('src');
      if (state.playing) playAudio();
    });
  }

  $('copyCaption').addEventListener('click', async () => {
    const text = [state.settings.title, state.settings.tags].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      $('copyCaption').textContent = '복사됨!';
    } catch (e) {
      prompt('아래 문구를 복사하세요', text);
    }
    setTimeout(() => { $('copyCaption').textContent = '제목 + 해시태그 복사'; }, 1500);
  });

  $('playBtn').addEventListener('click', () => (state.playing ? pause() : play()));
  $('seek').addEventListener('input', (e) => seek(Number(e.target.value)));
  $('safeToggle').addEventListener('change', (e) => { $('safeZone').hidden = !e.target.checked; });
  $('exportBtn').addEventListener('click', exportVideo);
  bindShareList();

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || state.exporting) return;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
    e.preventDefault();
    state.playing ? pause() : play();
  });
}

function init() {
  let restored = false;
  try { restored = applyProject(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch (e) { /* 없음 */ }
  if (!restored) loadTemplate('game');
  bindUI();
  refreshAll();
  seek(1); // 첫 화면에 애니메이션이 끝난 모습이 보이도록
  if (document.fonts) {
    document.fonts.load(`900 100px 'Noto Sans KR'`).then(() => { state.dirty = true; });
    document.fonts.load(`700 100px 'Noto Sans KR'`).then(() => { state.dirty = true; });
  }
  requestAnimationFrame(tick);
}

init();
