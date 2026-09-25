/* 점과 선 — Connecting the Dots (v2)
 * 매일의 습관(작은 점)과 특별한 경험(오늘의 점)을 기록하고,
 * 점이 이어져 선이 되고 별자리가 되는 과정을 보여주는 자기계발 앱.
 * 데이터는 이 기기(localStorage)에만 저장됩니다.
 */
(() => {
  'use strict';

  // ---------- 상수 ----------
  const STORE_KEY = 'dots.v2';
  const OLD_KEY = 'dots.v1';
  const CATS = [
    { id: 'learn', name: '배움', color: 'var(--c-learn)' },
    { id: 'work', name: '일·커리어', color: 'var(--c-work)' },
    { id: 'health', name: '건강', color: 'var(--c-health)' },
    { id: 'create', name: '창작', color: 'var(--c-create)' },
    { id: 'relation', name: '관계', color: 'var(--c-relation)' },
    { id: 'mind', name: '마음', color: 'var(--c-mind)' },
  ];
  const TIMES = [
    { id: 'morning', name: '아침', icon: '🌅' },
    { id: 'afternoon', name: '오후', icon: '☀️' },
    { id: 'evening', name: '저녁', icon: '🌙' },
    { id: 'any', name: '언제든', icon: '✨' },
  ];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];
  const MOODS = [
    { v: 1, e: '😣', name: '힘듦' },
    { v: 2, e: '😕', name: '별로' },
    { v: 3, e: '😐', name: '보통' },
    { v: 4, e: '🙂', name: '좋음' },
    { v: 5, e: '😄', name: '최고' },
  ];
  const TEMPLATES = [
    { emoji: '📚', name: '책 10쪽 읽기', cat: 'learn', time: 'evening' },
    { emoji: '🏃', name: '30분 운동하기', cat: 'health', time: 'morning' },
    { emoji: '🧘', name: '5분 명상', cat: 'mind', time: 'morning' },
    { emoji: '✍️', name: '감사한 일 3가지 쓰기', cat: 'mind', time: 'evening' },
    { emoji: '💧', name: '물 2L 마시기', cat: 'health', time: 'any' },
    { emoji: '🗣️', name: '영어 20분', cat: 'learn', time: 'afternoon' },
    { emoji: '💻', name: '코딩 1시간', cat: 'work', time: 'afternoon' },
    { emoji: '🎯', name: '오늘의 핵심 일 1개 끝내기', cat: 'work', time: 'morning' },
    { emoji: '🎨', name: '15분 그리거나 쓰기', cat: 'create', time: 'evening' },
    { emoji: '📞', name: '소중한 사람에게 연락', cat: 'relation', time: 'any' },
    { emoji: '📵', name: 'SNS 30분 이하', cat: 'mind', time: 'any' },
    { emoji: '😴', name: '12시 전에 잠들기', cat: 'health', time: 'evening' },
  ];
  const IDENTITIES = ['매일 성장하는', '건강한', '꾸준한', '배움을 즐기는', '창작하는', '단단한 마음을 가진'];
  const PROMPTS = [
    '오늘 나를 조금이라도 성장시킨 순간은?',
    '오늘 새로 배운 한 가지는 무엇인가요?',
    '오늘 용기를 낸 일이 있나요?',
    '오늘 누군가와 나눈 의미 있는 대화는?',
    '당장은 쓸모없어 보여도 마음이 끌린 일은?',
    '오늘 실패했지만 배운 것이 있다면?',
    '오늘 가장 몰입했던 순간은?',
  ];
  // 레벨: 점에서 시작해 우주로
  const LEVELS = [
    { xp: 0, name: '점' },
    { xp: 40, name: '선' },
    { xp: 120, name: '면' },
    { xp: 250, name: '궤도' },
    { xp: 450, name: '별' },
    { xp: 700, name: '별자리' },
    { xp: 1000, name: '성운' },
    { xp: 1400, name: '은하' },
    { xp: 2000, name: '우주' },
  ];
  const XP = { check: 3, moment: 10, link: 5, mood: 2 };

  const catOf = (id) => CATS.find((c) => c.id === id) || CATS[0];
  const timeOf = (id) => TIMES.find((t) => t.id === id) || TIMES[3];
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ---------- 날짜 ----------
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (d, n) => {
    const x = new Date(typeof d === 'string' ? parse(d) : d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const shift = (s, n) => ymd(addDays(s, n));
  const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const fmtDate = (s) => {
    const d = parse(s);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };
  const fmtShort = (s) => {
    const d = parse(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const fmtLong = (s) => {
    const d = parse(s);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;
  };
  const agoText = (s) => {
    const n = dayDiff(s, today());
    if (n === 0) return '오늘';
    if (n === 1) return '어제';
    if (n < 30) return `${n}일 전`;
    if (n < 365) return `${Math.floor(n / 30)}개월 전`;
    return `${Math.floor(n / 365)}년 전`;
  };

  // ---------- 저장소 ----------
  const blank = () => ({ v: 2, profile: { name: '', identity: '', onboarded: false }, habits: [], checks: {}, moods: {}, dots: [], badges: {} });
  let S = load();
  let justAdded = null;
  let selDay = today();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return { ...blank(), ...JSON.parse(raw) };
      const old = localStorage.getItem(OLD_KEY); // v1에서 옮겨오기
      const st = blank();
      if (old) {
        const dots = JSON.parse(old);
        if (Array.isArray(dots)) st.dots = dots;
      }
      return st;
    } catch (e) {
      return blank();
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(S));
    } catch (e) {
      toast('저장하지 못했어요. 브라우저 저장공간을 확인해주세요.');
    }
  }

  // ---------- 습관 계산 ----------
  const activeHabits = () => S.habits.filter((h) => !h.archived);
  const isDone = (h, day) => (S.checks[day] || []).includes(h.id);
  const scheduled = (h, day) => h.days.includes(parse(day).getDay()) && day >= h.start;
  const habitsFor = (day) => activeHabits().filter((h) => scheduled(h, day));

  function dayProgress(day) {
    const hs = habitsFor(day);
    const done = hs.filter((h) => isDone(h, day)).length;
    return { done, total: hs.length, pct: hs.length ? done / hs.length : 0 };
  }

  function habitStreak(h) {
    let d = today();
    if (scheduled(h, d) && !isDone(h, d)) d = shift(d, -1); // 오늘은 아직 기회가 있어요
    let n = 0;
    for (let guard = 0; guard < 3650 && d >= h.start; guard++, d = shift(d, -1)) {
      if (!scheduled(h, d)) continue;
      if (!isDone(h, d)) break;
      n++;
    }
    return n;
  }
  function habitBest(h) {
    let best = 0, cur = 0;
    for (let d = h.start; d <= today(); d = shift(d, 1)) {
      if (!scheduled(h, d)) continue;
      if (isDone(h, d)) best = Math.max(best, ++cur);
      else if (d !== today()) cur = 0;
    }
    return best;
  }
  function habitRate(h, days = 30) {
    let sch = 0, done = 0;
    for (let i = 0; i < days; i++) {
      const d = shift(today(), -i);
      if (!scheduled(h, d)) continue;
      if (d === today() && !isDone(h, d)) continue;
      sch++;
      if (isDone(h, d)) done++;
    }
    return sch ? Math.round((done / sch) * 100) : 0;
  }

  // 하루라도 습관을 체크했거나 점을 찍었으면 "기록한 날"
  const activeDays = () => {
    const set = new Set(S.dots.map((d) => d.date));
    for (const d in S.checks) if (S.checks[d].length) set.add(d);
    return set;
  };
  function streak() {
    const days = activeDays();
    let d = today();
    if (!days.has(d)) d = shift(d, -1);
    let n = 0;
    while (days.has(d)) {
      n++;
      d = shift(d, -1);
    }
    return n;
  }
  function bestStreak() {
    const days = [...activeDays()].sort();
    let best = 0, cur = 0, prev = null;
    for (const d of days) {
      cur = prev && dayDiff(prev, d) === 1 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = d;
    }
    return best;
  }
  const totalChecks = () => Object.values(S.checks).reduce((a, l) => a + l.length, 0);

  // ---------- 점(경험) 계산 ----------
  const sortedDots = () => [...S.dots].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1));
  const byId = (id) => S.dots.find((d) => d.id === id);
  function edges() {
    const list = [];
    for (const d of S.dots) for (const to of d.links || []) if (byId(to)) list.push([d.id, to]);
    return list;
  }
  function degreeMap() {
    const m = Object.fromEntries(S.dots.map((d) => [d.id, 0]));
    for (const [a, b] of edges()) {
      m[a]++;
      m[b]++;
    }
    return m;
  }
  function neighbors(id) {
    const out = [];
    for (const to of byId(id).links || []) if (byId(to)) out.push({ dot: byId(to), dir: 'past' });
    for (const d of S.dots) if ((d.links || []).includes(id)) out.push({ dot: d, dir: 'future' });
    return out.sort((a, b) => (a.dot.date < b.dot.date ? -1 : 1));
  }

  // ---------- 레벨 · 배지 ----------
  function xp() {
    return totalChecks() * XP.check + S.dots.length * XP.moment + edges().length * XP.link + Object.keys(S.moods).length * XP.mood;
  }
  function level() {
    const x = xp();
    let i = 0;
    while (i + 1 < LEVELS.length && x >= LEVELS[i + 1].xp) i++;
    const cur = LEVELS[i], next = LEVELS[i + 1];
    return { i, x, cur, next, pct: next ? (x - cur.xp) / (next.xp - cur.xp) : 1 };
  }
  function perfectDays() {
    let n = 0;
    for (const d in S.checks) {
      const p = dayProgress(d);
      if (p.total && p.done === p.total) n++;
    }
    return n;
  }
  // 배지 아이콘은 모두 “점과 선”으로 그립니다 (24×24)
  const G = {
    dot: '<circle class="f" cx="12" cy="12" r="3"/>',
    link: '<path d="M6 17 L18 7"/><circle class="f" cx="6" cy="17" r="2.2"/><circle class="f" cx="18" cy="7" r="2.2"/>',
    check: '<path d="M6 12.5 L10 16.5 L18 8"/>',
    perfect: '<circle cx="12" cy="12" r="8"/><circle class="f" cx="12" cy="12" r="3"/>',
    s3: '<path d="M5 12 H19"/><circle class="f" cx="5" cy="12" r="2"/><circle class="f" cx="12" cy="12" r="2"/><circle class="f" cx="19" cy="12" r="2"/>',
    s7: '<path d="M4 15 L8 11 L12 13 L16 8 L20 10"/><circle class="f" cx="20" cy="10" r="2"/>',
    s30: '<circle cx="12" cy="12" r="8"/><path d="M12 4 V12 L17 15"/>',
    votes: '<path d="M5 19 H19 M7 19 V11 M12 19 V6 M17 19 V9"/>',
    dots10: '<circle class="f" cx="6" cy="8" r="1.6"/><circle class="f" cx="12" cy="6" r="1.6"/><circle class="f" cx="18" cy="9" r="1.6"/><circle class="f" cx="8" cy="15" r="1.6"/><circle class="f" cx="15" cy="17" r="1.6"/>',
    hub: '<path d="M12 12 L5 6 M12 12 L19 6 M12 12 L4 15 M12 12 L20 16 M12 12 L12 20"/><circle class="f" cx="12" cy="12" r="2.6"/>',
    mood: '<path d="M4 14 C7 8 10 8 12 12 C14 16 17 16 20 10"/>',
    sky: '<path d="M5 17 L9 9 L15 12 L19 5"/><circle class="f" cx="5" cy="17" r="1.8"/><circle class="f" cx="9" cy="9" r="1.8"/><circle class="f" cx="15" cy="12" r="1.8"/><circle class="f" cx="19" cy="5" r="1.8"/>',
  };
  const BADGES = [
    { id: 'first_dot', icon: G.dot, name: '첫 점', desc: '처음으로 오늘의 점을 찍었습니다.', test: () => S.dots.length >= 1 },
    { id: 'first_link', icon: G.link, name: '첫 연결', desc: '처음으로 과거의 점과 선을 이었습니다.', test: () => edges().length >= 1 },
    { id: 'first_check', icon: G.check, name: '첫 표', desc: '처음으로 습관을 체크했습니다.', test: () => totalChecks() >= 1 },
    { id: 'perfect', icon: G.perfect, name: '완벽한 하루', desc: '하루의 습관을 모두 해냈습니다.', test: () => perfectDays() >= 1 },
    { id: 'streak3', icon: G.s3, name: '3일', desc: '3일 연속으로 기록했습니다.', test: () => bestStreak() >= 3 },
    { id: 'streak7', icon: G.s7, name: '7일', desc: '7일 연속으로 기록했습니다.', test: () => bestStreak() >= 7 },
    { id: 'streak30', icon: G.s30, name: '30일', desc: '30일 연속으로 기록했습니다.', test: () => bestStreak() >= 30 },
    { id: 'votes100', icon: G.votes, name: '100표', desc: '되고 싶은 나에게 100표를 던졌습니다.', test: () => totalChecks() >= 100 },
    { id: 'dots10', icon: G.dots10, name: '점 10개', desc: '오늘의 점을 10개 찍었습니다.', test: () => S.dots.length >= 10 },
    { id: 'hub', icon: G.hub, name: '허브', desc: '한 점에서 선이 다섯 개 이상 뻗어나갔습니다.', test: () => Object.values(degreeMap()).some((n) => n >= 5) },
    { id: 'mood7', icon: G.mood, name: '마음', desc: '기분을 7일 기록했습니다.', test: () => Object.keys(S.moods).length >= 7 },
    { id: 'constellation', icon: G.sky, name: '별자리', desc: '레벨 “별자리”에 도달했습니다.', test: () => level().i >= 5 },
  ];
  // 새로 얻은 배지가 있으면 축하
  function checkBadges(celebrate = true) {
    const got = [];
    for (const b of BADGES) {
      if (!S.badges[b.id] && b.test()) {
        S.badges[b.id] = today();
        got.push(b);
      }
    }
    if (got.length) {
      save();
      if (celebrate) {
        setTimeout(() => {
          toast(`배지 · ${got[0].name}${got.length > 1 ? ` 외 ${got.length - 1}개` : ''}`);
        }, 500);
      }
    }
  }
  let lastLevel = null;
  function checkLevel() {
    const lv = level().i;
    if (lastLevel !== null && lv > lastLevel) {
      setTimeout(() => {
        toast(`이제 당신은 ${LEVELS[lv].name}입니다`);
      }, 300);
    }
    lastLevel = lv;
  }

  // ---------- 탭 ----------
  let view = 'today';
  function show(v) {
    view = v;
    $$('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${v}`));
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === v));
    render();
    window.scrollTo(0, 0);
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
  $$('[data-action="add"]').forEach((b) => b.addEventListener('click', () => openForm()));

  function render() {
    if (view === 'today') renderToday();
    if (view === 'sky') renderSky();
    if (view === 'growth') renderGrowth();
    if (view === 'me') renderMe();
  }

  // =========================================================
  // 1) 오늘
  // =========================================================
  function renderToday() {
    const h = new Date().getHours();
    const hello = h < 5 ? '늦은 밤입니다' : h < 11 ? '좋은 아침입니다' : h < 17 ? '좋은 오후입니다' : '좋은 저녁입니다';
    $('#greeting').textContent = '오늘';
    $('#today-date').textContent = S.profile.name ? `${hello}, ${S.profile.name}님` : fmtLong(today());
    const st = streak();
    const pill = $('#streak-pill');
    pill.innerHTML = st ? `<b>${st}</b>일 연속` : '';
    pill.onclick = () => toast(`최고 기록 ${bestStreak()}일`);

    renderWeek();
    renderProgress();
    renderHabits();
    renderMoods();
    renderMoments();
    renderLookback();
  }

  function ringSVG(pct, size, stroke, color, track = 'var(--hair)') {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return `<svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg>`;
  }

  function renderWeek() {
    const box = $('#week');
    box.innerHTML = '';
    for (let i = 6; i >= 0; i--) {
      const d = shift(today(), -i);
      const p = dayProgress(d);
      const b = document.createElement('button');
      b.className = 'day' + (d === selDay ? ' sel' : '') + (d === today() ? ' today' : '');
      const moment = S.dots.some((x) => x.date === d);
      b.innerHTML = `<span>${DOW[parse(d).getDay()]}</span>` +
        `<span class="ring">${ringSVG(p.pct, 36, 1.5, 'var(--text)', 'var(--hair)')}<b>${parse(d).getDate()}</b></span>` +
        `<i class="mark${moment ? ' on' : ''}"></i>`;
      b.setAttribute('aria-label', `${fmtLong(d)} 습관 ${p.done}/${p.total}`);
      b.onclick = () => {
        selDay = d;
        renderToday();
      };
      box.appendChild(b);
    }
  }

  // 오늘의 진행: 완료한 습관 수만큼 점이 차오르고, 이어진 점은 선이 됩니다
  // 오늘의 진행: 완료한 습관만큼 점이 채워지고, 채워진 점끼리 선으로 이어집니다
  function renderProgress() {
    const p = dayProgress(selDay);
    const card = $('#progress-card');
    const isToday = selDay === today();
    if (!p.total) {
      card.innerHTML = `<div class="count">0</div><p class="caption">작은 습관 하나가 첫 번째 점이 됩니다.</p>`;
      return;
    }
    const who = S.profile.identity ? `<b>${esc(S.profile.identity)} 사람</b>에게` : '되고 싶은 나에게';
    const caption = p.done === p.total
      ? `${isToday ? '오늘의' : '이 날의'} 점이 모두 이어졌습니다.`
      : `${isToday ? '' : `${fmtLong(selDay)} · `}${who} ${p.done}표.`;
    const n = p.total;
    const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100);
    let dots = '';
    for (let i = 0; i < n; i++) dots += `<i class="${i < p.done ? 'on' : ''}" style="left:${x(i)}%"></i>`;
    const fill = p.done > 1 ? `<span class="fill" style="width:${x(p.done - 1)}%"></span>` : '';
    card.innerHTML = `<div class="count">${p.done}<small>/ ${p.total}</small></div><p class="caption">${caption}</p>` +
      `<div class="track" aria-hidden="true"><span class="base"></span>${fill}${dots}</div>`;
  }

  // 습관별 최근 n일 점-선 (체크한 날이 이어지면 선이 됨)
  // 습관별 최근 n일 점-선 (체크한 날이 이어지면 선이 됨)
  function dotLineSVG(h, n, w, hgt, endDay = today(), cls = '') {
    const days = [];
    for (let i = n - 1; i >= 0; i--) days.push(shift(endDay, -i));
    const step = w / n;
    const cy = hgt / 2;
    let lines = '', circles = '';
    days.forEach((d, i) => {
      const x = step * i + step / 2;
      const on = isDone(h, d);
      if (i > 0 && on) {
        // 이전 체크한 날까지(쉬는 요일은 건너뛰고) 선을 잇습니다
        let j = i - 1;
        while (j >= 0 && !scheduled(h, days[j]) && !isDone(h, days[j])) j--;
        if (j >= 0 && isDone(h, days[j])) lines += `<line x1="${step * j + step / 2}" y1="${cy}" x2="${x}" y2="${cy}" stroke="var(--text)" stroke-opacity=".55" stroke-width="1"/>`;
      }
      const r = Math.min(step * 0.22, hgt * 0.26);
      if (on) circles += `<circle cx="${x}" cy="${cy}" r="${r}" fill="var(--text)"/>`;
      else if (scheduled(h, d) && d <= today()) circles += `<circle cx="${x}" cy="${cy}" r="${r * 0.75}" fill="none" stroke="var(--hair-2)" stroke-width="1"/>`;
      else circles += `<circle cx="${x}" cy="${cy}" r="${r * 0.3}" fill="var(--hair-2)"/>`;
    });
    return `<svg class="${cls}" viewBox="0 0 ${w} ${hgt}" aria-hidden="true">${lines}${circles}</svg>`;
  }

  function renderHabits() {
    const box = $('#habit-groups');
    box.innerHTML = '';
    const list = activeHabits();
    if (!list.length) {
      box.innerHTML = '<h2 class="section">습관</h2><div class="group"><div class="empty-note">아직 습관이 없습니다.</div></div>';
      return;
    }
    for (const t of TIMES) {
      const hs = list.filter((h) => h.time === t.id);
      if (!hs.length) continue;
      const title = document.createElement('h2');
      title.className = 'section';
      title.textContent = t.name;
      const group = document.createElement('div');
      group.className = 'group';
      const ul = document.createElement('div');
      ul.className = 'list';
      for (const h of hs) ul.appendChild(habitRow(h));
      group.appendChild(ul);
      box.append(title, group);
    }
  }

  function habitRow(h) {
    const sch = scheduled(h, selDay);
    const done = isDone(h, selDay);
    const el = document.createElement('div');
    el.className = 'habit' + (done ? ' done' : '') + (!sch ? ' off' : '');
    el.dataset.id = h.id;
    const s = habitStreak(h);
    el.innerHTML = `<button class="check" aria-label="${esc(h.name)}" aria-pressed="${done}"><svg viewBox="0 0 16 16"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5"/></svg></button>` +
      `<div class="body"><div class="name">${esc(h.name)}</div>` +
      `<div class="sub"><i class="sw" style="background:${catOf(h.cat).color}"></i>${!sch ? '쉬는 날' : s ? `${s}일 연속` : catOf(h.cat).name}</div></div>` +
      dotLineSVG(h, 7, 70, 10, selDay, 'trail');
    el.querySelector('.body').onclick = () => openHabitDetail(h.id);
    el.querySelector('.check').onclick = () => toggleHabit(h);
    return el;
  }

  function toggleHabit(h) {
    const list = S.checks[selDay] || (S.checks[selDay] = []);
    const was = list.includes(h.id);
    if (was) S.checks[selDay] = list.filter((x) => x !== h.id);
    else list.push(h.id);
    if (!S.checks[selDay].length) delete S.checks[selDay];
    save();
    renderToday();
    if (!was) {
      haptic(10);
      const row = document.querySelector(`.habit[data-id="${h.id}"]`);
      if (row) row.classList.add('pulse');
      const p = dayProgress(selDay);
      if (p.total && p.done === p.total) {
        haptic([15, 80, 15]);
        toast(selDay === today() ? '오늘의 점이 모두 이어졌습니다' : '이 날의 점이 모두 이어졌습니다');
      }
    }
    checkLevel();
    checkBadges();
  }

  function renderMoods() {
    const box = $('#moods');
    box.innerHTML = '';
    const cur = S.moods[selDay];
    for (const m of MOODS) {
      const b = document.createElement('button');
      b.className = 'mood' + (cur === m.v ? ' on' : '');
      const size = 6 + m.v * 2.4; // 좋을수록 큰 점
      b.innerHTML = `<i style="width:${size}px;height:${size}px;margin-top:${(18 - size) / 2}px;margin-bottom:${(18 - size) / 2}px"></i>${m.name}`;
      b.setAttribute('aria-pressed', cur === m.v);
      b.onclick = () => {
        if (S.moods[selDay] === m.v) delete S.moods[selDay];
        else S.moods[selDay] = m.v;
        haptic(8);
        save();
        renderMoods();
        checkLevel();
        checkBadges();
      };
      box.appendChild(b);
    }
  }

  function renderMoments() {
    const list = sortedDots().filter((d) => d.date === selDay);
    const deg = degreeMap();
    const ul = $('#moment-list');
    ul.innerHTML = '';
    $('#moment-count').textContent = list.length ? `${list.length}` : '';
    for (const d of list) {
      const li = document.createElement('li');
      li.className = 'li';
      li.innerHTML = `<i class="sw" style="background:${catOf(d.cat).color}"></i><span class="grow">${esc(d.title)}</span>` +
        (deg[d.id] ? `<span class="meta">선 ${deg[d.id]}</span>` : '') + '<svg class="chev"><use href="#i-chev"/></svg>';
      li.onclick = () => openDetail(d.id);
      ul.appendChild(li);
    }
    const q = PROMPTS[(parse(selDay).getDate() + parse(selDay).getMonth()) % PROMPTS.length];
    $('#prompt-q').textContent = list.length ? '또 다른 점 찍기' : q;
    $('#prompt-btn').onclick = () => openForm(null, { date: selDay, prompt: list.length ? null : q });
  }

  // 돌아보기: 과거의 점 하나를 꺼내 “오늘과 이어지나요?” 묻기
  // 돌아보기: 과거의 점 하나를 꺼내 “오늘과 이어지나요?” 묻기
  function renderLookback() {
    const box = $('#lookback');
    const past = S.dots.filter((d) => dayDiff(d.date, today()) >= 3);
    if (!past.length) {
      box.hidden = true;
      return;
    }
    const pick = past[hash(today()) % past.length]; // 하루 동안은 같은 점
    box.hidden = false;
    box.innerHTML = `<p class="lb-when">돌아보기 · ${agoText(pick.date)}</p>` +
      `<h3>${esc(pick.title)}</h3>` +
      `<p class="lb-note">이 점은 지금의 나와 이어져 있나요?</p>` +
      `<div class="actions"><button class="btn primary" data-lb-link>오늘과 잇기</button><button class="btn" data-lb-view>보기</button></div>`;
    box.querySelector('[data-lb-link]').onclick = () => {
      const todays = sortedDots().filter((d) => d.date === today());
      if (todays.length) {
        const t = todays[todays.length - 1];
        if (!(t.links || []).includes(pick.id)) {
          t.links = [...(t.links || []), pick.id];
          save();
          justAdded = t.id;
          toast('두 점을 이었습니다');
          checkLevel();
          checkBadges();
        } else toast('이미 이어져 있습니다');
        show('sky');
      } else {
        openForm(null, { links: [pick.id], prompt: `“${pick.title}”에서 이어진 오늘의 경험은?` });
      }
    };
    box.querySelector('[data-lb-view]').onclick = () => openDetail(pick.id);
  }

  // =========================================================
  // 2) 별자리
  // =========================================================
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
  // 가운데서 바깥으로 자라나는 나선 위에 시간 순으로 점 배치
  function layout() {
    const list = sortedDots();
    const pos = {};
    const a = 4.2, step = 24;
    let theta = 2.2;
    list.forEach((d) => {
      const r = a * theta;
      const j = hash(d.id);
      pos[d.id] = { x: r * Math.cos(theta) + ((j % 100) / 100 - 0.5) * 6, y: r * Math.sin(theta) + (((j >>> 7) % 100) / 100 - 0.5) * 6 };
      theta += step / Math.max(r, 8);
    });
    return { list, pos };
  }

  function renderSky() {
    const e = edges().length;
    $('#sky-summary').textContent = S.dots.length ? `${S.dots.length}개의 점 · ${e}개의 선` : '';
    const svg = $('#sky');
    svg.innerHTML = '';
    $('#sky-empty').hidden = S.dots.length > 0;
    renderLegend();

    const { list, pos } = layout();
    let R = 60;
    for (const id in pos) R = Math.max(R, Math.hypot(pos[id].x, pos[id].y) + 16);
    const W = R * 2, H = W * 1.1;
    svg.setAttribute('viewBox', `${-R} ${-H / 2} ${W} ${H}`);
    const defs = el('defs', {}, svg);
    const glow = el('filter', { id: 'glow', x: '-100%', y: '-100%', width: '300%', height: '300%' }, defs);
    el('feGaussianBlur', { stdDeviation: 2.5 }, glow);

    const bg = el('g', {}, svg);
    for (let i = 0; i < 45; i++) {
      const h = hash('bg' + i);
      el('circle', {
        class: 'bgstar', cx: ((h % 1000) / 1000 - 0.5) * W, cy: (((h >>> 10) % 1000) / 1000 - 0.5) * H,
        r: (W / 400) * (0.4 + ((h >>> 20) % 10) / 12), opacity: 0.12 + ((h >>> 4) % 10) / 40, style: `animation-delay:${(h % 40) / 10}s`,
      }, bg);
    }
    if (!list.length) return;

    const scale = W / 300;
    const deg = degreeMap();
    if (list.length > 1) {
      const d = list.map((p, i) => `${i ? 'L' : 'M'}${pos[p.id].x.toFixed(1)} ${pos[p.id].y.toFixed(1)}`).join(' ');
      el('path', { d, class: 'link', stroke: '#fff', 'stroke-opacity': 0.08, 'stroke-width': 0.6 * scale, 'stroke-dasharray': `${2 * scale} ${3 * scale}` }, svg);
    }
    const linkG = el('g', {}, svg);
    for (const [from, to] of edges()) {
      const p = pos[from], q = pos[to];
      const path = el('path', {
        d: `M${p.x} ${p.y} Q${((p.x + q.x) / 2) * 0.8} ${((p.y + q.y) / 2) * 0.8} ${q.x} ${q.y}`,
        class: 'link', stroke: '#fff', 'stroke-opacity': 0.3, 'stroke-width': 0.7 * scale,
      }, linkG);
      if (from === justAdded) {
        path.classList.add('draw');
        path.style.setProperty('--len', path.getTotalLength());
      }
    }
    const dotG = el('g', {}, svg);
    for (const d of list) {
      const p = pos[d.id];
      const r = (2.2 + Math.min(deg[d.id], 6) * 0.65) * scale;
      const g = el('g', { class: 'dot' + (d.id === justAdded ? ' new' : ''), tabindex: 0, role: 'button', 'aria-label': `${d.title}, ${fmtDate(d.date)}` }, dotG);
      g.dataset.id = d.id;
      el('circle', { cx: p.x, cy: p.y, r: r * 2.4, fill: catOf(d.cat).color, opacity: 0.22, filter: 'url(#glow)' }, g);
      el('circle', { class: 'ring', cx: p.x, cy: p.y, r: r + 2.5 * scale, fill: 'none', stroke: '#fff', 'stroke-opacity': 0, 'stroke-width': 0.6 * scale }, g);
      el('circle', { class: 'core', cx: p.x, cy: p.y, r, fill: catOf(d.cat).color }, g);
      el('circle', { cx: p.x, cy: p.y, r: Math.max(r, 11 * scale), fill: 'transparent' }, g);
    }
    const labelIds = new Set([list[list.length - 1].id]);
    for (const d of [...list].filter((x) => deg[x.id] >= 2).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 3)) labelIds.add(d.id);
    const placed = [];
    for (const id of labelIds) {
      const p = pos[id];
      const ly = p.y - (8 + Math.min(deg[id], 6) * 0.65) * scale;
      if (placed.some((q) => Math.abs(q.x - p.x) < 60 * scale && Math.abs(q.y - ly) < 12 * scale)) continue;
      placed.push({ x: p.x, y: ly });
      const t = el('text', { class: 'label', x: p.x, y: ly, 'text-anchor': 'middle', 'font-size': 7 * scale }, svg);
      const title = byId(id).title;
      t.textContent = title.length > 10 ? title.slice(0, 9) + '…' : title;
    }
    svg.onclick = (ev) => {
      const g = ev.target.closest('.dot');
      if (g) openDetail(g.dataset.id);
    };
    svg.onkeydown = (ev) => {
      const g = ev.target.closest && ev.target.closest('.dot');
      if (g && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        openDetail(g.dataset.id);
      }
    };
    svg.onpointermove = (ev) => {
      const g = ev.target.closest('.dot');
      if (g && ev.pointerType === 'mouse') {
        const d = byId(g.dataset.id);
        tip(ev.clientX, ev.clientY, `${d.title} · ${fmtShort(d.date)} · 선 ${deg[d.id]}개`);
      } else hideTip();
    };
    svg.onpointerleave = hideTip;
    justAdded = null;
  }

  function renderLegend() {
    const used = new Set(S.dots.map((d) => d.cat));
    $('#legend').innerHTML = CATS.filter((c) => !S.dots.length || used.has(c.id))
      .map((c) => `<span><i class="sw" style="background:${c.color}"></i>${c.name}</span>`).join('');
  }

  // =========================================================
  // 3) 성장
  // =========================================================
  function renderGrowth() {
    const lv = level();
    $('#level-card').innerHTML = `<div class="lv">LEVEL ${lv.i + 1}</div><h2>${lv.cur.name}</h2>` +
      `<div class="bar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>` +
      `<div class="xp"><span>${lv.x} XP</span><span>${lv.next ? `${lv.next.name}까지 ${lv.next.xp - lv.x}` : '최고 레벨'}</span></div>`;

    const stats = [['연속', streak()], ['최고', bestStreak()], ['점', S.dots.length], ['선', edges().length]];
    $('#tiles').innerHTML = stats.map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');

    const who = S.profile.identity ? `${esc(S.profile.identity)} 사람` : '되고 싶은 나';
    $('#identity-card').innerHTML = `<p>${who}에게 던진 표</p><div class="votes">${totalChecks()}<small>표</small></div>` +
      `<p class="fine">완벽할 필요는 없습니다. 과반이면 충분합니다.</p>`;

    renderHabitLines();
    renderMoodChart();
    renderHeat();

    const counts = CATS.map((c) => ({ c, n: S.dots.filter((d) => d.cat === c.id).length + totalChecksByCat(c.id) }));
    const max = Math.max(1, ...counts.map((x) => x.n));
    $('#cat-bars').innerHTML = counts.map(({ c, n }) => `<div class="bar-row"><span class="name"><i class="sw" style="background:${c.color}"></i>${c.name}</span>` +
      `<div class="bar-track"><div class="bar-fill" style="width:${(n / max) * 100}%"></div></div><span class="n">${n}</span></div>`).join('');

    const deg = degreeMap();
    const hubs = [...S.dots].filter((d) => deg[d.id] > 0).sort((a, b) => deg[b.id] - deg[a.id]).slice(0, 5);
    const ol = $('#hubs');
    ol.innerHTML = hubs.length ? '' : '<li class="li static">점을 찍을 때 과거의 점과 이어보세요.</li>';
    for (const d of hubs) {
      const li = document.createElement('li');
      li.className = 'li';
      li.innerHTML = `<i class="sw" style="background:${catOf(d.cat).color}"></i><span class="grow">${esc(d.title)}</span><span class="meta">선 ${deg[d.id]}</span>`;
      li.onclick = () => openDetail(d.id);
      ol.appendChild(li);
    }

    const got = BADGES.filter((b) => S.badges[b.id]).length;
    $('#badge-count').textContent = `${got} / ${BADGES.length}`;
    const bx = $('#badges');
    bx.innerHTML = '';
    for (const b of BADGES) {
      const btn = document.createElement('button');
      btn.className = 'badge' + (S.badges[b.id] ? ' got' : '');
      btn.innerHTML = `<span class="medal"><svg viewBox="0 0 24 24">${b.icon}</svg></span>${b.name}`;
      btn.onclick = () => openBadge(b);
      bx.appendChild(btn);
    }
  }
  function totalChecksByCat(cat) {
    const ids = new Set(S.habits.filter((h) => h.cat === cat).map((h) => h.id));
    let n = 0;
    for (const d in S.checks) for (const id of S.checks[d]) if (ids.has(id)) n++;
    return n;
  }

  function renderHabitLines() {
    const box = $('#habit-lines');
    box.innerHTML = '';
    const hs = activeHabits();
    if (!hs.length) {
      box.innerHTML = '<p class="section-desc" style="margin:0">습관을 추가하면 여기에 선이 그려집니다.</p>';
      return;
    }
    for (const h of hs) {
      const row = document.createElement('div');
      row.className = 'hl-row';
      const st = habitStreak(h);
      row.innerHTML = `<span class="nm">${esc(h.name)}</span><span class="st">${st ? `${st}일 · ` : ''}${habitRate(h)}%</span>${dotLineSVG(h, 21, 336, 14)}`;
      row.onclick = () => openHabitDetail(h.id);
      box.appendChild(row);
    }
  }

  function renderMoodChart() {
    const box = $('#mood-chart');
    box.innerHTML = '';
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(shift(today(), -i));
    const pts = days.map((d, i) => ({ d, i, v: S.moods[d] })).filter((p) => p.v);
    if (pts.length < 2) {
      box.innerHTML = '<p class="section-desc" style="margin:0">오늘 탭에서 마음을 기록하면 흐름이 보입니다.</p>';
      $('#insight').hidden = true;
      return;
    }
    const W = 320, H = 140, L = 34, Rm = 8, T = 10, B = 20, iw = W - L - Rm, ih = H - T - B;
    const x = (i) => L + (i / 29) * iw;
    const y = (v) => T + ih - ((v - 1) / 4) * ih;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '최근 30일 기분 흐름' });
    for (const m of MOODS) {
      el('line', { class: 'grid', x1: L, x2: W - Rm, y1: y(m.v), y2: y(m.v) }, svg);
      const t = el('text', { class: 'axis', x: L - 8, y: y(m.v) + 3, 'text-anchor': 'end' }, svg);
      t.textContent = m.name;
    }
    const t1 = el('text', { class: 'axis', x: L, y: H - 4 }, svg);
    t1.textContent = fmtShort(days[0]);
    const t2 = el('text', { class: 'axis', x: W - Rm, y: H - 4, 'text-anchor': 'end' }, svg);
    t2.textContent = '오늘';
    // 기록이 이어진 날은 선으로, 끊긴 날은 끊어서
    let d = '';
    pts.forEach((p, k) => {
      d += `${k && pts[k - 1].i === p.i - 1 ? 'L' : 'M'}${x(p.i)} ${y(p.v)} `;
    });
    el('path', { class: 'ln', d }, svg);
    for (const p of pts) {
      const c = el('circle', { class: 'pt', cx: x(p.i), cy: y(p.v), r: 3 }, svg);
      const hit = el('circle', { cx: x(p.i), cy: y(p.v), r: 10, fill: 'transparent' }, svg);
      const show = () => {
        const b = c.getBoundingClientRect();
        tip(b.left + b.width / 2, b.top, `${fmtDate(p.d)} · ${MOODS[p.v - 1].name}`);
      };
      hit.addEventListener('pointerenter', show);
      hit.addEventListener('pointerdown', show);
      hit.addEventListener('pointerleave', hideTip);
    }
    box.appendChild(svg);

    // 인사이트: 이 습관을 한 날 기분이 더 좋았어요 (Daylio 스타일)
    let best = null;
    for (const h of activeHabits()) {
      const on = [], off = [];
      for (const day in S.moods) {
        if (!scheduled(h, day)) continue;
        (isDone(h, day) ? on : off).push(S.moods[day]);
      }
      if (on.length < 3 || off.length < 3) continue;
      const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
      const diff = avg(on) - avg(off);
      if (diff > 0.3 && (!best || diff > best.diff)) best = { h, diff, on: avg(on), off: avg(off) };
    }
    const ins = $('#insight');
    if (best) {
      ins.hidden = false;
      ins.innerHTML = `<b>${esc(best.h.name)}</b>을(를) 한 날, 마음이 평균 <b>${best.diff.toFixed(1)}</b>만큼 더 좋았습니다.`;
    } else ins.hidden = true;
  }

  // 최근 12주: 기록이 많을수록 밝은 점
  function renderHeat() {
    const box = $('#heat');
    box.innerHTML = '';
    const count = {};
    for (const d of S.dots) count[d.date] = (count[d.date] || 0) + 1;
    for (const d in S.checks) count[d] = (count[d] || 0) + S.checks[d].length;
    const now = new Date();
    const endSat = addDays(now, 6 - now.getDay());
    const start = addDays(endSat, -12 * 7 + 1);
    const cell = 22, L = 18, T = 16;
    const W = L + 12 * cell, H = T + 7 * cell;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '최근 12주 기록' });
    ['', '월', '', '수', '', '금', ''].forEach((n, i) => {
      if (!n) return;
      const t = el('text', { x: 0, y: T + i * cell + cell / 2 + 3.5, fill: 'var(--muted)', 'font-size': 9 }, svg);
      t.textContent = n;
    });
    const lvl = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3);
    const op = [0, 0.3, 0.6, 1];
    const rad = [1.2, 4, 5.5, 7];
    let lastMonth = -1;
    for (let w = 0; w < 12; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const day = addDays(start, w * 7 + dow);
        const cx = L + w * cell + cell / 2, cy = T + dow * cell + cell / 2;
        if (dow === 0 && day.getMonth() !== lastMonth) {
          lastMonth = day.getMonth();
          const t = el('text', { x: cx - 4, y: 9, fill: 'var(--muted)', 'font-size': 9 }, svg);
          t.textContent = `${day.getMonth() + 1}월`;
        }
        const key = ymd(day);
        if (key > today()) continue;
        const n = count[key] || 0;
        const k = lvl(n);
        el('circle', { cx, cy, r: rad[k], fill: k ? 'var(--text)' : 'var(--hair-2)', 'fill-opacity': k ? op[k] : 1 }, svg);
        const hit = el('rect', { x: cx - cell / 2, y: cy - cell / 2, width: cell, height: cell, fill: 'transparent' }, svg);
        hit.addEventListener('pointerenter', () => {
          const b = hit.getBoundingClientRect();
          tip(b.left + b.width / 2, b.top, `${fmtDate(key)} · ${n}`);
        });
        hit.addEventListener('pointerleave', hideTip);
      }
    }
    box.appendChild(svg);
    const legend = document.createElement('div');
    legend.className = 'heat-legend';
    legend.innerHTML = '적음 ' + [1, 2, 3].map((k) => `<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="${rad[k] * 0.85}" fill="var(--text)" fill-opacity="${op[k]}"/></svg>`).join('') + ' 많음';
    box.appendChild(legend);
  }

  // =========================================================
  // 4) 나
  // =========================================================
  function renderMe() {
    $('#me-name').textContent = S.profile.name || '나';
    const f = $('#profile-form');
    f.name.value = S.profile.name || '';
    f.identity.value = S.profile.identity || '';
    const ul = $('#habit-manage');
    ul.innerHTML = activeHabits().length ? '' : '<li class="li static">아직 습관이 없습니다.</li>';
    for (const h of activeHabits()) {
      const li = document.createElement('li');
      li.className = 'li';
      const days = h.days.length === 7 ? '매일' : h.days.map((d) => DOW[d]).join(' ');
      li.innerHTML = `<i class="sw" style="background:${catOf(h.cat).color}"></i><span class="grow">${esc(h.name)}<span class="sub">${timeOf(h.time).name} · ${days}</span></span><svg class="chev"><use href="#i-chev"/></svg>`;
      li.onclick = () => openHabitForm(h.id);
      ul.appendChild(li);
    }
  }
  $('#profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    S.profile.name = e.target.name.value.trim();
    S.profile.identity = e.target.identity.value.trim();
    save();
    renderMe();
    toast('저장했습니다');
  });
  $('#add-habit').onclick = () => openHabitForm();
  $('#add-habit-inline').onclick = () => openHabitForm();

  // =========================================================
  // 시트: 오늘의 점
  // =========================================================
  const form = $('#add-form');
  let editingId = null;
  let selCat = 'learn';
  let selLinks = new Set();

  function openForm(id = null, opts = {}) {
    editingId = id;
    const d = id ? byId(id) : null;
    form.reset();
    form.title.value = d ? d.title : '';
    form.note.value = d ? d.note || '' : '';
    form.date.value = d ? d.date : opts.date || today();
    form.date.max = today();
    selCat = d ? d.cat : selCat;
    selLinks = new Set(d ? d.links || [] : opts.links || []);
    form.querySelector('h2').textContent = d ? '점 다듬기' : '오늘의 점';
    $('#title-label').textContent = opts.prompt || '무엇을 했나요?';
    
    $('#link-search').value = '';
    renderChips($('#cat-chips'), CATS, () => selCat, (v) => (selCat = v), true);
    renderLinkList();
    openSheet('#add-sheet');
    if (!d) setTimeout(() => form.title.focus(), 250);
  }

  function renderChips(box, items, get, set, withColor) {
    box.innerHTML = '';
    for (const c of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (get() === c.id ? ' on' : '');
      b.innerHTML = (withColor ? `<i class="sw" style="background:${c.color}"></i>` : '') + esc(c.name);
      b.onclick = () => {
        set(c.id);
        renderChips(box, items, get, set, withColor);
      };
      box.appendChild(b);
    }
  }

  // 뒤돌아볼 때만 이을 수 있다: 이 점의 날짜보다 과거(같은 날 포함)의 점만
  function renderLinkList() {
    const box = $('#link-list');
    const q = $('#link-search').value.trim().toLowerCase();
    const date = form.date.value || today();
    for (const id of [...selLinks]) {
      const d = byId(id);
      if (!d || d.date > date) selLinks.delete(id);
    }
    const cands = sortedDots().reverse()
      .filter((d) => d.id !== editingId && d.date <= date)
      .filter((d) => !q || d.title.toLowerCase().includes(q) || (d.note || '').toLowerCase().includes(q));
    $('#link-field').hidden = !S.dots.some((d) => d.id !== editingId && d.date <= date);
    // 선택된 점을 위로
    cands.sort((a, b) => selLinks.has(b.id) - selLinks.has(a.id));
    box.innerHTML = '';
    for (const d of cands.slice(0, 50)) {
      const label = document.createElement('label');
      label.className = 'link-item';
      label.innerHTML = `<input type="checkbox" ${selLinks.has(d.id) ? 'checked' : ''}><span class="tick"></span><i class="sw" style="background:${catOf(d.cat).color}"></i><span class="grow">${esc(d.title)}</span><span class="d">${fmtShort(d.date)}</span>`;
      label.querySelector('input').onchange = (e) => (e.target.checked ? selLinks.add(d.id) : selLinks.delete(d.id));
      box.appendChild(label);
    }
  }
  $('#link-search').addEventListener('input', renderLinkList);
  form.date.addEventListener('change', renderLinkList);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return;
    const data = { title, note: form.note.value.trim(), cat: selCat, date: form.date.value || today(), links: [...selLinks] };
    if (editingId) {
      Object.assign(byId(editingId), data);
      toast('저장했습니다');
    } else {
      const dot = { id: uid(), createdAt: Date.now(), ...data };
      S.dots.push(dot);
      justAdded = dot.id;
      haptic(15);
      toast(data.links.length ? `점 하나, 선 ${data.links.length}개` : '새로운 점');
    }
    save();
    closeSheets();
    show('sky');
    checkLevel();
    checkBadges();
  });

  // =========================================================
  // 시트: 습관
  // =========================================================
  const hform = $('#habit-form');
  let editingHabit = null;
  let hCat = 'learn', hTime = 'morning', hDays = new Set([0, 1, 2, 3, 4, 5, 6]);

  function openHabitForm(id = null) {
    editingHabit = id;
    const h = id ? S.habits.find((x) => x.id === id) : null;
    hform.reset();
    hform.name.value = h ? h.name : '';
    hform.emoji.value = h ? h.emoji || '' : '';
    hCat = h ? h.cat : 'learn';
    hTime = h ? h.time : 'morning';
    hDays = new Set(h ? h.days : [0, 1, 2, 3, 4, 5, 6]);
    hform.querySelector('h2').textContent = h ? '습관' : '새 습관';
    $('#habit-delete').parentElement.hidden = !h;
    $('#habit-templates-wrap').hidden = !!h;
    const tbox = $('#habit-templates');
    tbox.innerHTML = '';
    const have = new Set(S.habits.map((x) => x.name));
    for (const t of TEMPLATES.filter((x) => !have.has(x.name))) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t.name;
      b.onclick = () => {
        hform.name.value = t.name;
        hform.emoji.value = t.emoji;
        hCat = t.cat;
        hTime = t.time;
        drawHabitChips();
      };
      tbox.appendChild(b);
    }
    drawHabitChips();
    openSheet('#habit-sheet');
  }
  function drawHabitChips() {
    renderChips($('#habit-cat-chips'), CATS, () => hCat, (v) => (hCat = v), true);
    renderChips($('#habit-time-chips'), TIMES, () => hTime, (v) => (hTime = v));
    const box = $('#habit-days');
    box.innerHTML = '';
    DOW.forEach((n, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.className = hDays.has(i) ? 'on' : '';
      b.onclick = () => {
        if (hDays.has(i) && hDays.size > 1) hDays.delete(i);
        else hDays.add(i);
        drawHabitChips();
      };
      box.appendChild(b);
    });
  }
  hform.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = hform.name.value.trim();
    if (!name) return;
    const data = { name, emoji: hform.emoji.value.trim(), cat: hCat, time: hTime, days: [...hDays].sort() };
    if (editingHabit) Object.assign(S.habits.find((x) => x.id === editingHabit), data);
    else S.habits.push({ id: uid(), start: today(), ...data });
    save();
    closeSheets();
    toast(editingHabit ? '저장했습니다' : '새 습관');
    render();
  });
  $('#habit-delete').onclick = () => {
    if (!confirm('이 습관과 체크 기록을 삭제할까요?')) return;
    S.habits = S.habits.filter((x) => x.id !== editingHabit);
    for (const d in S.checks) {
      S.checks[d] = S.checks[d].filter((x) => x !== editingHabit);
      if (!S.checks[d].length) delete S.checks[d];
    }
    save();
    closeSheets();
    render();
    toast('삭제했습니다');
  };

  // =========================================================
  // 상세: 점 / 습관 / 배지
  // =========================================================
  function openDetail(id) {
    const d = byId(id);
    if (!d) return;
    hideTip();
    const c = catOf(d.cat);
    const box = $('#detail');
    box.className = 'sheet detail';
    const nb = neighbors(id);
    box.innerHTML = `<div class="grip"></div>
      <span class="kicker"><i class="sw" style="background:${c.color}"></i>${c.name}</span>
      <h2>${esc(d.title)}</h2>
      <div class="date">${fmtDate(d.date)} · ${agoText(d.date)}</div>
      ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
      <h3 class="section">이어진 점</h3>
      <div class="group"><ul class="list conn">${nb.length ? '' : '<li class="li static">아직 이어진 점이 없습니다.</li>'}</ul></div>
      <div class="actions"><button class="btn" data-edit>편집</button><button class="btn primary" data-close>닫기</button></div>
      <div class="group" style="margin-top:12px"><button class="row-btn danger" data-del>삭제</button></div>`;
    const ul = box.querySelector('.conn');
    for (const { dot, dir } of nb) {
      const li = document.createElement('li');
      li.className = 'li';
      li.innerHTML = `<i class="sw" style="background:${catOf(dot.cat).color}"></i><span class="grow">${esc(dot.title)}</span><span class="meta">${dir === 'past' ? '과거' : '이후'} · ${fmtShort(dot.date)}</span>`;
      li.onclick = () => openDetail(dot.id);
      ul.appendChild(li);
    }
    box.querySelector('[data-edit]').onclick = () => openForm(id);
    box.querySelector('[data-del]').onclick = () => {
      if (!confirm('이 점과 이어진 선을 삭제할까요?')) return;
      S.dots = S.dots.filter((x) => x.id !== id);
      for (const x of S.dots) x.links = (x.links || []).filter((l) => l !== id);
      save();
      closeSheets();
      render();
      toast('삭제했습니다');
    };
    openSheet('#detail-sheet');
  }

  function openHabitDetail(id) {
    const h = S.habits.find((x) => x.id === id);
    if (!h) return;
    const box = $('#detail');
    box.className = 'sheet detail';
    // 최근 12주: 체크한 날은 점, 연달아 한 날은 선으로 이어집니다
    const weeks = 12, cell = 24;
    const now = new Date();
    const endSat = addDays(now, 6 - now.getDay());
    const start = addDays(endSat, -weeks * 7 + 1);
    let s = '';
    for (let w = 0; w < weeks; w++) {
      for (let dow = 0; dow < 7; dow++) {
        const day = ymd(addDays(start, w * 7 + dow));
        const cx = w * cell + cell / 2, cy = dow * cell + cell / 2;
        if (day > today()) continue;
        const on = isDone(h, day);
        if (on && dow > 0 && isDone(h, shift(day, -1))) s += `<line x1="${cx}" y1="${cy - cell}" x2="${cx}" y2="${cy}" stroke="var(--text)" stroke-opacity=".5" stroke-width="1.2"/>`;
        s += on ? `<circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--text)"/>`
          : scheduled(h, day) ? `<circle cx="${cx}" cy="${cy}" r="3.5" fill="none" stroke="var(--hair-2)" stroke-width="1"/>`
            : `<circle cx="${cx}" cy="${cy}" r="1.2" fill="var(--hair-2)"/>`;
      }
    }
    const W = weeks * cell, H = 7 * cell;
    box.innerHTML = `<div class="grip"></div>
      <span class="kicker"><i class="sw" style="background:${catOf(h.cat).color}"></i>${catOf(h.cat).name} · ${timeOf(h.time).name}</span>
      <h2>${esc(h.name)}</h2>
      <div class="stat3"><div><b>${habitStreak(h)}</b><span>현재 연속</span></div><div><b>${habitBest(h)}</b><span>최고 연속</span></div><div><b>${habitRate(h)}<small style="font-size:14px">%</small></b><span>30일</span></div></div>
      <h3 class="section">최근 12주</h3>
      <div class="cal"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 12주 체크 기록">${s}</svg></div>
      <div class="actions"><button class="btn" data-edit>편집</button><button class="btn primary" data-close>닫기</button></div>`;
    box.querySelector('[data-edit]').onclick = () => openHabitForm(id);
    openSheet('#detail-sheet');
  }

  function openBadge(b) {
    const box = $('#detail');
    box.className = 'sheet detail';
    const got = S.badges[b.id];
    box.innerHTML = `<div class="grip"></div><div class="badge-hero badge ${got ? 'got' : ''}"><span class="medal"><svg viewBox="0 0 24 24">${b.icon}</svg></span>` +
      `<h2>${b.name}</h2><p>${b.desc}</p><p class="date">${got ? fmtDate(got) : '아직 잠겨 있습니다'}</p></div>` +
      `<div class="actions"><button class="btn primary" data-close>닫기</button></div>`;
    openSheet('#detail-sheet');
  }

  function openSheet(sel) {
    closeSheets();
    hideTip();
    $(sel).hidden = false;
  }
  function closeSheets() {
    $$('.sheet-backdrop').forEach((s) => (s.hidden = true));
  }
  document.addEventListener('click', (e) => {
    if (e.target.matches('.sheet-backdrop') || e.target.closest('[data-close]')) closeSheets();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheets());

  // ---------- 피드백: 툴팁 · 토스트 · 진동 · 축하 ----------
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
    t.hidden = true;
    void t.offsetWidth; // 애니메이션 다시 시작
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2800);
  }
  function haptic(p) {
    try {
      if (navigator.vibrate) navigator.vibrate(p);
    } catch (e) { /* 지원하지 않는 기기 */ }
  }


  // ---------- 데이터 관리 ----------
  $('#export').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
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
      if (Array.isArray(data)) S = { ...blank(), dots: data, profile: { ...S.profile } }; // v1 백업
      else if (data && data.v === 2) S = { ...blank(), ...data };
      else throw new Error();
      S.profile.onboarded = true;
      save();
      render();
      toast('백업을 불러왔어요');
    } catch (err) {
      toast('백업 파일을 읽지 못했어요');
    }
    e.target.value = '';
  };
  $('#reset').onclick = () => {
    if (!confirm('정말 모든 기록을 지울까요? 되돌릴 수 없어요.')) return;
    S = blank();
    save();
    closeSheets();
    selDay = today();
    startOnboarding();
  };

  // =========================================================
  // 온보딩
  // =========================================================
  let obPicked = new Set([0, 2, 3]);
  function startOnboarding() {
    $('#onboard').hidden = false;
    goStep(0);
    const chips = $('#ob-identity-chips');
    chips.innerHTML = '';
    for (const idn of IDENTITIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = idn;
      b.onclick = () => ($('#ob-identity').value = idn);
      chips.appendChild(b);
    }
    drawTemplates();
  }
  function goStep(n) {
    $$('.ob-step').forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === n));
    $('#onboard').scrollTop = 0;
  }
  function drawTemplates() {
    const box = $('#ob-templates');
    box.innerHTML = '';
    TEMPLATES.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tpl' + (obPicked.has(i) ? ' on' : '');
      b.innerHTML = `<span class="tick"><svg viewBox="0 0 16 16"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5"/></svg></span><span class="grow">${t.name}<span class="m">${timeOf(t.time).name} · ${catOf(t.cat).name}</span></span>`;
      b.onclick = () => {
        obPicked.has(i) ? obPicked.delete(i) : obPicked.add(i);
        drawTemplates();
      };
      box.appendChild(b);
    });
  }
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => {
    const cur = Number(b.closest('.ob-step').dataset.step);
    goStep(cur + 1);
  }));
  $('#ob-finish').onclick = () => {
    S.profile.name = $('#ob-name').value.trim();
    S.profile.identity = $('#ob-identity').value.trim();
    for (const i of obPicked) {
      const t = TEMPLATES[i];
      S.habits.push({ id: uid(), start: today(), days: [0, 1, 2, 3, 4, 5, 6], ...t });
    }
    S.profile.onboarded = true;
    save();
    $('#onboard').hidden = true;
    lastLevel = level().i;
    show('today');
    toast('첫 번째 점을 찍어보세요');
  };
  $('#ob-sample').onclick = () => {
    loadSample();
    $('#onboard').hidden = true;
    lastLevel = level().i;
    show('today');
    toast('예시 기록');
  };

  // 예시 데이터: 약 3개월 동안의 습관과 경험
  function loadSample() {
    S = blank();
    S.profile = { name: '지민', identity: '매일 성장하는', onboarded: true };
    const start = shift(today(), -84);
    const pick = [0, 1, 2, 3, 5];
    S.habits = pick.map((i, k) => ({ id: 'h' + k, start, days: i === 1 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6], ...TEMPLATES[i] }));
    for (let i = 84; i >= 1; i--) {
      const d = shift(today(), -i);
      // 시간이 갈수록 더 꾸준해지는 흐름
      const p = 0.45 + (0.45 * (84 - i)) / 84;
      const list = S.habits.filter((h) => scheduled(h, d) && (hash(d + h.id) % 100) / 100 < p).map((h) => h.id);
      if (list.length) S.checks[d] = list;
      if (i <= 40 && hash('m' + d) % 5) {
        const base = 2.4 + list.length * 0.45 + (list.includes('h2') ? 0.6 : 0);
        S.moods[d] = Math.max(1, Math.min(5, Math.round(base + ((hash('x' + d) % 10) - 5) / 6)));
      }
    }
    S.checks[today()] = ['h1'];
    const at = (n) => shift(today(), -n);
    const M = [
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
    ];
    S.dots = M.map(([id, ago, cat, title, note, links], i) => ({ id, createdAt: i, cat, title, note, date: at(ago), links }));
    checkBadges(false);
    save();
  }

  // ---------- 시작 ----------
  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => view === 'sky' && renderSky(), 150);
  });
  // 자정이 지나면 오늘을 새로
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (selDay > today()) selDay = today();
      render();
    }
  });
  if (!S.profile.onboarded) startOnboarding();
  else {
    checkBadges(false);
    lastLevel = level().i;
  }
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
