/* 점과 선 — Connecting the Dots
 * 하루하루 찍은 점(경험)을 과거의 점과 이어, 성장이 선과 별자리로 보이게 하는 앱.
 * 데이터는 이 기기(localStorage)에만 저장됩니다.
 */
(() => {
  'use strict';

  const STORE_KEY = 'dots.v1';
  const CATS = [
    { id: 'learn', name: '배움', color: 'var(--c-learn)' },
    { id: 'work', name: '일·커리어', color: 'var(--c-work)' },
    { id: 'health', name: '건강', color: 'var(--c-health)' },
    { id: 'create', name: '창작', color: 'var(--c-create)' },
    { id: 'relation', name: '관계', color: 'var(--c-relation)' },
    { id: 'mind', name: '마음', color: 'var(--c-mind)' },
  ];
  const catOf = (id) => CATS.find((c) => c.id === id) || CATS[0];

  const $ = (sel) => document.querySelector(sel);
  const SVGNS = 'http://www.w3.org/2000/svg';

  // ---------- 저장소 ----------
  let dots = load();
  let justAdded = null; // 방금 추가된 점 id (애니메이션용)

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(dots));
    } catch (e) {
      toast('저장하지 못했어요. 브라우저 저장공간을 확인해주세요.');
    }
  }

  // ---------- 날짜 유틸 ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const fmtDate = (s) => {
    const d = parse(s);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };
  const fmtShort = (s) => {
    const d = parse(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // ---------- 계산 ----------
  const sorted = () =>
    [...dots].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
  const byId = (id) => dots.find((d) => d.id === id);

  function edges() {
    const list = [];
    for (const d of dots) {
      for (const to of d.links || []) {
        if (byId(to)) list.push([d.id, to]);
      }
    }
    return list;
  }
  function degreeMap() {
    const m = Object.fromEntries(dots.map((d) => [d.id, 0]));
    for (const [a, b] of edges()) {
      m[a]++;
      m[b]++;
    }
    return m;
  }
  function neighbors(id) {
    const out = [];
    const self = byId(id);
    for (const to of self.links || []) if (byId(to)) out.push({ dot: byId(to), dir: 'past' });
    for (const d of dots) if ((d.links || []).includes(id)) out.push({ dot: d, dir: 'future' });
    return out.sort((a, b) => (a.dot.date < b.dot.date ? -1 : 1));
  }
  function streak() {
    const days = new Set(dots.map((d) => d.date));
    let cur = new Date();
    if (!days.has(ymd(cur))) cur = addDays(cur, -1); // 오늘 아직 안 찍었으면 어제부터
    let n = 0;
    while (days.has(ymd(cur))) {
      n++;
      cur = addDays(cur, -1);
    }
    return n;
  }

  // ---------- 탭 이동 ----------
  function show(view) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    render();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
  document.querySelectorAll('[data-action="add"]').forEach((b) => b.addEventListener('click', () => openForm()));

  // ---------- 렌더링 ----------
  function render() {
    const e = edges().length;
    $('#summary').textContent = dots.length
      ? `${dots.length}개의 점 · ${e}개의 선`
      : '오늘의 점을 찍어보세요';
    renderSky();
    renderTimeline();
    renderGrowth();
  }

  // 1) 별자리: 가운데서 바깥으로 자라나는 나선 위에 시간 순으로 점을 놓고,
  //    사용자가 이은 점들은 밝은 선으로 연결합니다.
  function layout() {
    const list = sorted();
    const pos = {};
    const a = 4.2; // 나선 간격
    const step = 24; // 점 사이 거리
    let theta = 2.2;
    list.forEach((d, i) => {
      const r = a * theta;
      // 점마다 고정된 작은 흔들림으로 자연스러운 별자리 느낌
      const j = hash(d.id);
      const jx = ((j % 100) / 100 - 0.5) * 6;
      const jy = (((j >>> 7) % 100) / 100 - 0.5) * 6;
      pos[d.id] = { x: r * Math.cos(theta) + jx, y: r * Math.sin(theta) + jy, i };
      theta += step / Math.max(r, 8);
    });
    return { list, pos };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function renderSky() {
    const svg = $('#sky');
    svg.innerHTML = '';
    $('#sky-empty').hidden = dots.length > 0;
    renderLegend();

    const { list, pos } = layout();
    let R = 60;
    for (const id in pos) R = Math.max(R, Math.hypot(pos[id].x, pos[id].y) + 16);
    const W = R * 2;
    const H = W * 1.15;
    svg.setAttribute('viewBox', `${-R} ${-H / 2} ${W} ${H}`);

    const defs = el('defs', {}, svg);
    const glow = el('filter', { id: 'glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3 }, glow);

    // 배경 별
    const bg = el('g', {}, svg);
    for (let i = 0; i < 70; i++) {
      const h = hash('bg' + i);
      el('circle', {
        class: 'bgstar',
        cx: ((h % 1000) / 1000 - 0.5) * W,
        cy: (((h >>> 10) % 1000) / 1000 - 0.5) * H,
        r: (W / 400) * (0.4 + ((h >>> 20) % 10) / 12),
        opacity: 0.25 + ((h >>> 4) % 10) / 25,
        style: `animation-delay:${(h % 40) / 10}s`,
      }, bg);
    }
    if (!list.length) return;

    const scale = W / 300; // 화면 크기에 따라 선/글자 굵기 보정
    const deg = degreeMap();

    // 시간의 실: 점을 찍은 순서대로 흐르는 옅은 선
    if (list.length > 1) {
      const d = list.map((p, i) => `${i ? 'L' : 'M'}${pos[p.id].x.toFixed(1)} ${pos[p.id].y.toFixed(1)}`).join(' ');
      el('path', { d, class: 'link', stroke: '#8a95c4', 'stroke-opacity': 0.18, 'stroke-width': 1 * scale, 'stroke-dasharray': `${2 * scale} ${3 * scale}` }, svg);
    }

    // 이어진 선
    const linkG = el('g', {}, svg);
    for (const [from, to] of edges()) {
      const p = pos[from];
      const q = pos[to];
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      const cx = mx * 0.8; // 가운데 쪽으로 살짝 휘게
      const cy = my * 0.8;
      const path = el('path', {
        d: `M${p.x} ${p.y} Q${cx} ${cy} ${q.x} ${q.y}`,
        class: 'link',
        stroke: catOf(byId(from).cat).color,
        'stroke-opacity': 0.5,
        'stroke-width': 1.2 * scale,
      }, linkG);
      if (from === justAdded) {
        const len = path.getTotalLength();
        path.classList.add('draw');
        path.style.setProperty('--len', len);
      }
    }

    // 점
    const dotG = el('g', {}, svg);
    for (const d of list) {
      const p = pos[d.id];
      const r = (3.2 + Math.min(deg[d.id], 6) * 1.1) * scale;
      const g = el('g', { class: 'dot' + (d.id === justAdded ? ' new' : ''), tabindex: 0, role: 'button', 'aria-label': `${d.title}, ${fmtDate(d.date)}` }, dotG);
      g.dataset.id = d.id;
      el('circle', { cx: p.x, cy: p.y, r: r * 2.2, fill: catOf(d.cat).color, opacity: 0.35, filter: 'url(#glow)' }, g);
      el('circle', { class: 'core', cx: p.x, cy: p.y, r, fill: catOf(d.cat).color, 'stroke-width': 1.2 * scale }, g);
      el('circle', { cx: p.x, cy: p.y, r: Math.max(r, 11 * scale), fill: 'transparent' }, g); // 넓은 터치 영역
    }

    // 라벨은 가장 많이 이어진 점 몇 개와 가장 최근 점에만
    const labelIds = new Set([list[list.length - 1].id]);
    for (const id of [...list].filter((d) => deg[d.id] >= 2).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 3).map((d) => d.id)) labelIds.add(id);
    const placed = [];
    for (const id of labelIds) {
      const d = byId(id);
      const p = pos[id];
      const ly = p.y - (8 + Math.min(deg[id], 6) * 1.1) * scale;
      // 다른 라벨과 겹치면 생략
      if (placed.some((q) => Math.abs(q.x - p.x) < 60 * scale && Math.abs(q.y - ly) < 12 * scale)) continue;
      placed.push({ x: p.x, y: ly });
      const t = el('text', { class: 'label', x: p.x, y: ly, 'text-anchor': 'middle', 'font-size': 8 * scale, 'stroke-width': 3 * scale }, svg);
      t.textContent = d.title.length > 10 ? d.title.slice(0, 9) + '…' : d.title;
    }

    // 상호작용: 탭하면 상세, 마우스를 올리면 툴팁
    svg.onclick = (e) => {
      const g = e.target.closest('.dot');
      if (g) openDetail(g.dataset.id);
    };
    svg.onkeydown = (e) => {
      const g = e.target.closest && e.target.closest('.dot');
      if (g && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openDetail(g.dataset.id);
      }
    };
    svg.onpointermove = (e) => {
      const g = e.target.closest('.dot');
      if (g && e.pointerType === 'mouse') {
        const d = byId(g.dataset.id);
        tip(e.clientX, e.clientY, `${d.title} · ${fmtShort(d.date)} · 선 ${deg[d.id]}개`);
      } else hideTip();
    };
    svg.onpointerleave = hideTip;
    justAdded = null;
  }

  function renderLegend() {
    const used = new Set(dots.map((d) => d.cat));
    $('#legend').innerHTML = '';
    for (const c of CATS) {
      if (dots.length && !used.has(c.id)) continue;
      const s = document.createElement('span');
      s.innerHTML = `<i class="sw" style="background:${c.color}"></i>`;
      s.append(c.name);
      $('#legend').appendChild(s);
    }
  }

  // 2) 타임라인
  let timelineFilter = 'all';
  function renderTimeline() {
    const f = $('#timeline-filters');
    f.innerHTML = '';
    for (const c of [{ id: 'all', name: '전체' }, ...CATS]) {
      const b = document.createElement('button');
      b.className = 'chip' + (timelineFilter === c.id ? ' on' : '');
      if (c.color) b.innerHTML = `<i class="sw" style="background:${c.color}"></i>`;
      b.append(c.name);
      b.onclick = () => {
        timelineFilter = c.id;
        renderTimeline();
      };
      f.appendChild(b);
    }

    const deg = degreeMap();
    const list = sorted().reverse().filter((d) => timelineFilter === 'all' || d.cat === timelineFilter);
    const ol = $('#timeline');
    ol.innerHTML = '';
    $('#timeline-empty').hidden = list.length > 0;
    let month = '';
    for (const d of list) {
      const m = d.date.slice(0, 7);
      if (m !== month) {
        month = m;
        const li = document.createElement('li');
        li.className = 'month';
        li.textContent = `${Number(m.slice(0, 4))}년 ${Number(m.slice(5))}월`;
        ol.appendChild(li);
      }
      const li = document.createElement('li');
      li.className = 't-item';
      li.style.setProperty('--c', catOf(d.cat).color);
      const h = document.createElement('h3');
      h.textContent = d.title;
      const meta = document.createElement('div');
      meta.className = 't-meta';
      meta.innerHTML = `<span>${fmtDate(d.date)}</span><span>${catOf(d.cat).name}</span>` +
        (deg[d.id] ? `<span class="links">— 선 ${deg[d.id]}개</span>` : '');
      li.append(h, meta);
      li.onclick = () => openDetail(d.id);
      ol.appendChild(li);
    }
  }

  // 3) 성장
  function renderGrowth() {
    const deg = degreeMap();
    const e = edges().length;
    const days = new Set(dots.map((d) => d.date)).size;
    const tiles = [
      ['찍은 점', dots.length, '개'],
      ['이어진 선', e, '개'],
      ['연속 기록', streak(), '일'],
      ['기록한 날', days, '일'],
    ];
    $('#tiles').innerHTML = tiles
      .map(([k, v, u]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}<small>${u}</small></div></div>`)
      .join('');

    renderLineChart();
    renderHeat();

    // 분야별 막대
    const counts = CATS.map((c) => ({ c, n: dots.filter((d) => d.cat === c.id).length }));
    const max = Math.max(1, ...counts.map((x) => x.n));
    $('#cat-bars').innerHTML = counts
      .map(({ c, n }) => `<div class="bar-row"><span class="name"><i class="sw" style="background:${c.color}"></i>${c.name}</span>` +
        `<div class="bar-track"><div class="bar-fill" style="width:${(n / max) * 100}%;background:${c.color}"></div></div>` +
        `<span class="n">${n}</span></div>`)
      .join('');

    // 허브 점
    const hubs = [...dots].filter((d) => deg[d.id] > 0).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 5);
    const ol = $('#hubs');
    ol.innerHTML = '';
    if (!hubs.length) {
      ol.innerHTML = '<li class="muted" style="cursor:default">점을 찍을 때 과거의 점과 이어보세요.</li>';
    }
    for (const d of hubs) {
      const li = document.createElement('li');
      li.innerHTML = `<i class="sw" style="background:${catOf(d.cat).color}"></i>`;
      const t = document.createElement('span');
      t.textContent = d.title;
      const n = document.createElement('span');
      n.className = 'cnt';
      n.textContent = `선 ${deg[d.id]}개`;
      li.append(t, n);
      li.onclick = () => openDetail(d.id);
      ol.appendChild(li);
    }
  }

  function renderLineChart() {
    const box = $('#line-chart');
    box.innerHTML = '';
    if (!dots.length) {
      box.innerHTML = '<p class="muted small">점을 찍으면 여기에 선이 그려져요.</p>';
      return;
    }
    const list = sorted();
    const start = list[0].date;
    const end = today() > list[list.length - 1].date ? today() : list[list.length - 1].date;
    const span = Math.max(1, dayDiff(start, end));
    const perDay = {};
    for (const d of list) perDay[d.date] = (perDay[d.date] || 0) + 1;

    const series = [];
    let acc = 0;
    for (let i = 0; i <= span; i++) {
      const day = ymd(addDays(parse(start), i));
      acc += perDay[day] || 0;
      series.push({ day, v: acc, add: perDay[day] || 0 });
    }

    const W = 320, H = 170, L = 28, Rm = 10, T = 12, B = 22;
    const iw = W - L - Rm, ih = H - T - B;
    const maxV = niceMax(acc);
    const x = (i) => L + (i / span) * iw;
    const y = (v) => T + ih - (v / maxV) * ih;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `누적 점 ${acc}개` });
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id: 'areaGrad', x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': '#f3c969', 'stop-opacity': 0.28 }, grad);
    el('stop', { offset: '100%', 'stop-color': '#f3c969', 'stop-opacity': 0 }, grad);

    for (let k = 0; k <= 4; k++) {
      const v = (maxV / 4) * k;
      el('line', { class: 'grid', x1: L, x2: W - Rm, y1: y(v), y2: y(v) }, svg);
      const t = el('text', { class: 'axis', x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, svg);
      t.textContent = Math.round(v);
    }
    const t1 = el('text', { class: 'axis', x: L, y: H - 6 }, svg);
    t1.textContent = fmtShort(start);
    const t2 = el('text', { class: 'axis', x: W - Rm, y: H - 6, 'text-anchor': 'end' }, svg);
    t2.textContent = end === today() ? '오늘' : fmtShort(end);

    // 계단형 누적선: 점이 찍힌 날 한 칸씩 올라갑니다
    let d = `M${x(0)} ${y(series[0].v)}`;
    for (let i = 1; i < series.length; i++) d += ` H${x(i)} V${y(series[i].v)}`;
    el('path', { class: 'area', d: `${d} V${y(0)} H${x(0)} Z` }, svg);
    el('path', { class: 'ln', d }, svg);
    const last = series[series.length - 1];
    el('circle', { class: 'pt', cx: x(series.length - 1), cy: y(last.v), r: 4 }, svg);

    // 호버/터치 크로스헤어
    const cross = el('line', { class: 'cross', y1: T, y2: T + ih, visibility: 'hidden' }, svg);
    const hp = el('circle', { class: 'pt', r: 4, visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: T, width: iw, height: ih, fill: 'transparent' }, svg);
    const move = (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(span, Math.round(((px - L) / iw) * span)));
      const s = series[i];
      cross.setAttribute('x1', x(i));
      cross.setAttribute('x2', x(i));
      hp.setAttribute('cx', x(i));
      hp.setAttribute('cy', y(s.v));
      cross.setAttribute('visibility', 'visible');
      hp.setAttribute('visibility', 'visible');
      const sx = rect.left + (x(i) / W) * rect.width;
      const sy = rect.top + (y(s.v) / H) * rect.height;
      tip(sx, sy, `${fmtDate(s.day)} · 누적 ${s.v}개${s.add ? ` (+${s.add})` : ''}`);
    };
    const leave = () => {
      cross.setAttribute('visibility', 'hidden');
      hp.setAttribute('visibility', 'hidden');
      hideTip();
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);
    hit.addEventListener('pointerup', (ev) => ev.pointerType !== 'mouse' && setTimeout(leave, 1200));
    box.appendChild(svg);
  }
  function niceMax(v) {
    return v <= 4 ? 4 : Math.ceil(v / 4) * 4; // 눈금 4칸이 정수로 나눠지도록
  }

  function renderHeat() {
    const box = $('#heat');
    box.innerHTML = '';
    const perDay = {};
    for (const d of dots) perDay[d.date] = (perDay[d.date] || 0) + 1;
    const now = new Date();
    // 이번 주 토요일을 마지막 칸으로, 12주 전 일요일부터
    const endSat = addDays(now, 6 - now.getDay());
    const start = addDays(endSat, -12 * 7 + 1);
    const cell = 20, gap = 4, L = 22, T = 16;
    const W = L + 12 * (cell + gap), H = T + 7 * (cell + gap);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '최근 12주 기록' });
    ['일', '', '화', '', '목', '', '토'].forEach((n, i) => {
      if (!n) return;
      const t = el('text', { x: 0, y: T + i * (cell + gap) + 14, fill: 'var(--muted)', 'font-size': 10 }, svg);
      t.textContent = n;
    });
    // 한 가지 색(밝기)으로만 양을 표현
    const fillFor = (n) => (n === 0 ? 'var(--bg-2)' : n === 1 ? '#6b5a2e' : n === 2 ? '#a88a3f' : '#f3c969');
    let lastMonth = -1;
    for (let w = 0; w < 12; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const day = addDays(start, w * 7 + dow);
        if (dow === 0 && day.getMonth() !== lastMonth) {
          lastMonth = day.getMonth();
          const t = el('text', { x: L + w * (cell + gap), y: 10, fill: 'var(--muted)', 'font-size': 10 }, svg);
          t.textContent = `${day.getMonth() + 1}월`;
        }
        const key = ymd(day);
        const n = perDay[key] || 0;
        const future = day > now;
        const r = el('rect', {
          x: L + w * (cell + gap), y: T + dow * (cell + gap), width: cell, height: cell,
          fill: future ? 'transparent' : fillFor(n),
          stroke: future ? 'var(--line)' : 'none',
          'stroke-dasharray': future ? '2 2' : '',
        }, svg);
        if (!future) {
          r.addEventListener('pointerenter', (ev) => {
            const b = r.getBoundingClientRect();
            tip(b.left + b.width / 2, b.top, `${fmtDate(key)} · 점 ${n}개`);
          });
          r.addEventListener('pointerleave', hideTip);
        }
      }
    }
    box.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.style.padding = '10px 0 0';
    legend.innerHTML = [0, 1, 2, 3].map((n) => `<span><i class="sw" style="border-radius:3px;background:${fillFor(n)}"></i>${n === 3 ? '3개+' : n + '개'}</span>`).join('');
    box.appendChild(legend);
  }

  // ---------- 툴팁 / 토스트 ----------
  function tip(x, y, text) {
    const t = $('#tooltip');
    t.textContent = text;
    t.hidden = false;
    const w = t.offsetWidth / 2 + 8;
    t.style.left = Math.max(w, Math.min(window.innerWidth - w, x)) + 'px';
    t.style.top = y + 'px';
  }
  function hideTip() {
    $('#tooltip').hidden = true;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------- 추가 / 수정 폼 ----------
  const form = $('#add-form');
  let editingId = null;
  let selCat = 'learn';
  let selLinks = new Set();

  function openForm(id = null) {
    editingId = id;
    const d = id ? byId(id) : null;
    form.reset();
    form.title.value = d ? d.title : '';
    form.note.value = d ? d.note || '' : '';
    form.date.value = d ? d.date : today();
    form.date.max = today();
    selCat = d ? d.cat : selCat;
    selLinks = new Set(d ? d.links || [] : []);
    form.querySelector('h2').textContent = d ? '점 다듬기' : '오늘의 점';
    form.querySelector('[type=submit]').textContent = d ? '저장' : '점 찍기';
    $('#link-search').value = '';
    renderCatChips();
    renderLinkList();
    closeSheets();
    $('#add-sheet').hidden = false;
    if (!d) setTimeout(() => form.title.focus(), 250);
  }

  function renderCatChips() {
    const box = $('#cat-chips');
    box.innerHTML = '';
    for (const c of CATS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (selCat === c.id ? ' on' : '');
      b.innerHTML = `<i class="sw" style="background:${c.color}"></i>`;
      b.append(c.name);
      b.onclick = () => {
        selCat = c.id;
        renderCatChips();
      };
      box.appendChild(b);
    }
  }

  // "뒤돌아볼 때만 이을 수 있다" — 이 점의 날짜보다 과거(같은 날 포함)의 점만 이을 수 있어요.
  function renderLinkList() {
    const box = $('#link-list');
    const q = $('#link-search').value.trim().toLowerCase();
    const date = form.date.value || today();
    const cands = sorted()
      .reverse()
      .filter((d) => d.id !== editingId && d.date <= date)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || (d.note || '').toLowerCase().includes(q));
    // 선택 안 된 선이 날짜 변경으로 미래가 되면 선택에서 빼기
    for (const id of [...selLinks]) {
      const d = byId(id);
      if (!d || d.date > date) selLinks.delete(id);
    }
    $('#link-field').hidden = !dots.some((d) => d.id !== editingId && d.date <= date);
    box.innerHTML = '';
    for (const d of cands.slice(0, 50)) {
      const label = document.createElement('label');
      label.className = 'link-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = selLinks.has(d.id);
      cb.onchange = () => (cb.checked ? selLinks.add(d.id) : selLinks.delete(d.id));
      const sw = document.createElement('i');
      sw.className = 'sw';
      sw.style.background = catOf(d.cat).color;
      const t = document.createElement('span');
      t.textContent = d.title;
      const dd = document.createElement('span');
      dd.className = 'd';
      dd.textContent = fmtShort(d.date);
      label.append(cb, sw, t, dd);
      box.appendChild(label);
    }
  }
  $('#link-search').addEventListener('input', renderLinkList);
  form.date.addEventListener('change', renderLinkList);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    const data = {
      title,
      note: form.note.value.trim(),
      cat: selCat,
      date: form.date.value || today(),
      links: [...selLinks],
    };
    if (editingId) {
      Object.assign(byId(editingId), data);
      // 날짜를 옮겨서 미래가 된 점이 이 점을 가리키면 그 선은 유지(그 점 입장에선 여전히 과거)
      toast('점을 다듬었어요');
    } else {
      const dot = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: Date.now(), ...data };
      dots.push(dot);
      justAdded = dot.id;
      toast(data.links.length ? `점을 찍고 ${data.links.length}개의 선을 이었어요 ✦` : '새로운 점을 찍었어요 ✦');
    }
    save();
    closeSheets();
    show('sky');
  });

  // ---------- 상세 ----------
  function openDetail(id) {
    const d = byId(id);
    if (!d) return;
    hideTip();
    const c = catOf(d.cat);
    const box = $('#detail');
    box.className = 'sheet detail';
    box.innerHTML = `<div class="grip"></div>
      <span class="detail-cat"><i class="sw" style="background:${c.color}"></i>${c.name}</span>
      <h2 style="margin:8px 0 0"></h2>
      <div class="detail-date">${fmtDate(d.date)}</div>
      <p class="detail-note"></p>
      <h3>이어진 점</h3>
      <ul class="conn"></ul>
      <div class="row end" style="margin-top:20px">
        <button class="btn danger-ghost" data-del style="margin-right:auto">삭제</button>
        <button class="btn ghost" data-edit>다듬기 · 잇기</button>
        <button class="btn primary" data-close>닫기</button>
      </div>`;
    box.querySelector('h2').textContent = d.title;
    const note = box.querySelector('.detail-note');
    if (d.note) note.textContent = d.note;
    else note.remove();

    const ul = box.querySelector('.conn');
    const nb = neighbors(id);
    if (!nb.length) {
      ul.innerHTML = '<li class="muted" style="cursor:default">아직 이어진 점이 없어요. 뒤돌아보면 이어질 점이 보일 거예요.</li>';
    }
    for (const { dot, dir } of nb) {
      const li = document.createElement('li');
      li.innerHTML = `<i class="sw" style="background:${catOf(dot.cat).color}"></i>`;
      const t = document.createElement('span');
      t.textContent = dot.title;
      const dd = document.createElement('span');
      dd.className = 'd';
      dd.innerHTML = `<span class="dir">${dir === 'past' ? '← 과거' : '미래 →'}</span> ${fmtShort(dot.date)}`;
      li.append(t, dd);
      li.onclick = () => openDetail(dot.id);
      ul.appendChild(li);
    }

    box.querySelector('[data-edit]').onclick = () => openForm(id);
    box.querySelector('[data-del]').onclick = () => {
      if (!confirm('이 점을 지울까요? 이어진 선도 함께 사라져요.')) return;
      dots = dots.filter((x) => x.id !== id);
      for (const x of dots) x.links = (x.links || []).filter((l) => l !== id);
      save();
      closeSheets();
      render();
      toast('점을 지웠어요');
    };
    closeSheets();
    $('#detail-sheet').hidden = false;
  }

  function closeSheets() {
    document.querySelectorAll('.sheet-backdrop').forEach((s) => (s.hidden = true));
  }
  document.addEventListener('click', (e) => {
    if (e.target.matches('.sheet-backdrop') || e.target.closest('[data-close]')) closeSheets();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheets());

  // ---------- 데이터 관리 ----------
  $('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(dots, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dots-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#import').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.every((d) => d.id && d.title && d.date)) throw new Error();
      dots = data.map((d) => ({ ...d, cat: catOf(d.cat).id, links: Array.isArray(d.links) ? d.links : [] }));
      save();
      render();
      toast(`${dots.length}개의 점을 불러왔어요`);
    } catch (err) {
      toast('백업 파일을 읽지 못했어요');
    }
    e.target.value = '';
  };
  $('#reset').onclick = () => {
    if (!dots.length || !confirm('정말 모든 점을 지울까요? 되돌릴 수 없어요.')) return;
    dots = [];
    save();
    render();
    toast('모든 점을 지웠어요');
  };

  // ---------- 예시 데이터 ----------
  $('#load-sample').onclick = () => {
    const base = new Date();
    const at = (daysAgo) => ymd(addDays(base, -daysAgo));
    const S = [
      ['s1', 84, 'learn', '서체(캘리그래피) 수업 청강', '당장은 쓸모없어 보였지만 글자가 아름다웠다.', []],
      ['s2', 80, 'health', '아침 30분 걷기 시작', '', []],
      ['s3', 76, 'learn', 'HTML 첫 페이지 만들기', '<h1>부터 시작.', []],
      ['s4', 71, 'mind', '하루 3줄 일기', '', []],
      ['s5', 66, 'learn', 'CSS로 글꼴과 여백 다듬기', '서체 수업에서 본 감각이 떠올랐다.', ['s1', 's3']],
      ['s6', 60, 'relation', '개발 스터디 모임 참여', '', ['s3']],
      ['s7', 55, 'health', '첫 5km 달리기', '', ['s2']],
      ['s8', 49, 'learn', 'JavaScript 기초 강의 완주', '', ['s3', 's6']],
      ['s9', 44, 'create', '개인 블로그 디자인', '', ['s5', 's1']],
      ['s10', 38, 'mind', '실패한 프로젝트 회고', '무엇을 배웠는지 적어보았다.', ['s4']],
      ['s11', 33, 'work', '사이드 프로젝트 기획', '', ['s8', 's10']],
      ['s12', 27, 'relation', '스터디에서 발표', '', ['s6', 's8']],
      ['s13', 21, 'create', '첫 웹 앱 배포', '', ['s11', 's9', 's8']],
      ['s14', 16, 'health', '10km 완주', '', ['s7']],
      ['s15', 11, 'work', '포트폴리오 정리', '', ['s13', 's9']],
      ['s16', 6, 'relation', '후배에게 HTML 알려주기', '', ['s12', 's3']],
      ['s17', 3, 'learn', '모바일 앱 공부 시작', '', ['s13']],
      ['s18', 1, 'mind', '1년 후의 나에게 편지', '', ['s4', 's10']],
      ['s19', 0, 'create', '점과 선 앱 만들기', '점들이 이어져 여기까지 왔다.', ['s17', 's15', 's1']],
    ];
    dots = S.map(([id, ago, cat, title, note, links], i) => ({ id, createdAt: i, cat, title, note, date: at(ago), links }));
    save();
    render();
    toast('예시 점들을 불러왔어요. + 버튼으로 나만의 점을 찍어보세요');
  };

  // ---------- 시작 ----------
  window.addEventListener('resize', () => renderSky());
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
