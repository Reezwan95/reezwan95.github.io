(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fmt = (n) => Math.round(n).toLocaleString('en-CA');

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#themeBtn').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    drawChart(); network.recolor();
  });

  /* ---------- Nav ---------- */
  const nav = $('.nav');
  const menuBtn = $('#menuBtn'), links = $('#navlinks');
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#navlinks a').forEach((a) => a.addEventListener('click', () => { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
  const sections = $$('section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) $$('#navlinks a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  /* ---------- Rotating role ---------- */
  const roles = ['data analyst', 'business analyst', 'operations analyst', 'process improvement analyst', 'BI developer'];
  const roleEl = $('#roleWord');
  if (!reduce) {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % roles.length;
      roleEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 180, fill: 'forwards' })
        .onfinish = () => { roleEl.textContent = roles[i]; roleEl.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, fill: 'forwards' }); };
    }, 2600);
  }

  /* ---------- Reveal + counters (content is visible without JS) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));
  function countUp(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = '1';
    const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1100;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Hero: animated transit network ---------- */
  const network = (() => {
    const cv = $('#network'), ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, lines = [], trains = [], mouse = { x: -999, y: -999 }, colors = {};
    function recolor() { colors = { l1: css('--l1'), l2: css('--l2'), l4: css('--l4'), route: css('--route'), ink: css('--ink'), bg: css('--bg'), line: css('--line') }; }
    function build() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = Math.max(46, Math.min(70, W / 18));
      const x0 = W * 0.58, cols = Math.ceil((W - x0) / g) + 1, rows = Math.ceil(H / g) + 1;
      const P = (c, r) => ({ x: x0 + c * g, y: r * g });
      const narrow = W < 960;
      const ox = narrow ? -Math.floor(cols * 0.6) : 0;
      // Three stylised lines in 45-degree transit-map geometry
      lines = [
        { c: 'l1', pts: [P(ox + 1, -1), P(ox + 1, 3), P(ox + 3, 5), P(ox + 7, 5), P(ox + 9, 3), P(ox + 9, rows + 1)] },
        { c: 'l2', pts: [P(ox + 0, 7), P(ox + 4, 7), P(ox + 6, 9), P(ox + cols + 2, 9)] },
        { c: 'l4', pts: [P(ox + 5, -1), P(ox + 5, 2), P(ox + 8, 5), P(ox + cols + 2, 5)] },
        { c: 'route', pts: [P(ox + 2, rows + 1), P(ox + 2, 11), P(ox + 4, 9), P(ox + 4, 7)] }
      ];
      lines.forEach((l) => {
        l.len = 0; l.seg = [];
        for (let i = 1; i < l.pts.length; i++) { const a = l.pts[i - 1], b = l.pts[i], d = Math.hypot(b.x - a.x, b.y - a.y); l.seg.push({ a, b, d, s: l.len }); l.len += d; }
        l.stops = l.pts.slice(1, -1);
      });
      trains = [];
      lines.forEach((l, i) => { trains.push({ l, t: (i * 0.23) % 1, v: 0.00007 + i * 0.000012 }); trains.push({ l, t: (i * 0.23 + 0.5) % 1, v: 0.00007 + i * 0.000012 }); });
    }
    function at(l, t) {
      const d = t * l.len;
      for (const s of l.seg) if (d <= s.s + s.d) { const k = (d - s.s) / s.d; return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k }; }
      const last = l.pts[l.pts.length - 1]; return { x: last.x, y: last.y };
    }
    let reveal = reduce ? 1 : 0, last = 0;
    function frame(ts) {
      const dt = last ? ts - last : 16; last = ts;
      ctx.clearRect(0, 0, W, H);
      if (reveal < 1) reveal = Math.min(1, reveal + dt / 1600);
      const fade = W < 960 ? 0.16 : 0.95;
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      lines.forEach((l) => {
        ctx.strokeStyle = colors[l.c]; ctx.lineWidth = 9;
        ctx.setLineDash([l.len * reveal, l.len]);
        ctx.beginPath(); l.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      });
      ctx.setLineDash([]);
      lines.forEach((l) => l.stops.forEach((p) => {
        const near = Math.hypot(p.x - mouse.x, p.y - mouse.y) < 60;
        ctx.fillStyle = near ? colors.l1 : colors.bg; ctx.strokeStyle = colors.ink; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, near ? 11 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }));
      if (!reduce) trains.forEach((tr) => {
        tr.t = (tr.t + tr.v * dt) % 1;
        const p = at(tr.l, tr.t);
        ctx.fillStyle = colors.ink; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (!reduce || reveal < 1) raf = requestAnimationFrame(frame);
    }
    let raf;
    recolor(); build(); raf = requestAnimationFrame(frame);
    addEventListener('resize', () => { build(); if (reduce) requestAnimationFrame(frame); });
    $('.hero').addEventListener('pointermove', (e) => { const b = cv.getBoundingClientRect(); mouse = { x: e.clientX - b.left, y: e.clientY - b.top }; if (reduce) requestAnimationFrame(frame); });
    $('.hero').addEventListener('pointerleave', () => { mouse = { x: -999, y: -999 }; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else if (!reduce) { last = 0; raf = requestAnimationFrame(frame); } });
    return { recolor: () => { recolor(); if (reduce) requestAnimationFrame(frame); } };
  })();

  /* ---------- Case study charts ---------- */
  const D = window.TTC;
  const chartEl = $('#chart'), tip = document.createElement('div');
  tip.className = 'tip'; chartEl.after(tip); chartEl.parentElement.style.position = 'relative';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const nice = (m) => { const p = Math.pow(10, Math.floor(Math.log10(m))); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const short = (n) => n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace('.0', '') + 'k' : String(n);
  const labelMap = { 'Patron': 'Customer-related', 'Mechanical/Infrastructure': 'Infrastructure', 'Unknown': 'Uncoded / other', 'Mechanical/Vehicle': 'Vehicle', 'Human/Process': 'Staff and process', 'Weather': 'Weather', 'Other/External': 'Other external', 'Other/Internal': 'Other internal', 'Planned Work': 'Planned work' };
  const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  function showTip(e, html) {
    tip.replaceChildren(); html.filter(Boolean).forEach((t, i) => { const d = document.createElement(i ? 'span' : 'b'); d.textContent = t; tip.appendChild(d); if (i) tip.appendChild(document.createElement('br')); });
    tip.classList.add('on');
    const box = chartEl.parentElement.getBoundingClientRect();
    let x = e.clientX - box.left + 14, y = e.clientY - box.top + 14;
    if (x + tip.offsetWidth > box.width) x = e.clientX - box.left - tip.offsetWidth - 10;
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => tip.classList.remove('on');
  function hover(node, lines) {
    node.addEventListener('pointermove', (e) => showTip(e, lines));
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('pointerdown', (e) => showTip(e, lines));
    node.style.cursor = 'pointer';
  }
  function grow(node, attr, to) {
    if (reduce) { node.setAttribute(attr, to); return; }
    node.setAttribute(attr, 0);
    node.animate ? requestAnimationFrame(() => { node.style.transition = attr === 'width' ? 'width .6s cubic-bezier(.2,.7,.2,1)' : ''; node.setAttribute(attr, to); }) : node.setAttribute(attr, to);
  }

  const views = {
    causes: {
      title: 'Delay minutes by cause category',
      note: 'Customer-related incidents (disorderly patrons, people at track level, ill customers) outweigh every other category combined.',
      draw(svg, W) {
        const rows = D.cat, rowH = 34, H = rows.length * rowH + 6, max = rows[0].v;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const endPad = 64;
        rows.forEach((r, i) => {
          const g = el('g', { transform: `translate(0,${i * rowH})` }, svg);
          const label = el('text', { x: 0, y: 12, class: i === 0 ? 'lbl-strong' : '' }, g); label.textContent = labelMap[r.k] || r.k;
          const w = Math.max(2, (W - endPad) * r.v / max);
          const bar = el('rect', { x: 0, y: 17, height: 11, rx: 5.5, fill: i === 0 ? css('--l1') : css('--route') }, g);
          bar.style.transition = reduce ? '' : 'width .7s cubic-bezier(.2,.7,.2,1)';
          bar.setAttribute('width', reduce ? w : 0); if (!reduce) requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('width', w)));
          const val = el('text', { x: w + 8, y: 27 }, g); val.textContent = r.s.toFixed(1) + '%';
          const hit = el('rect', { x: 0, y: 0, width: W, height: rowH, fill: 'transparent' }, g);
          hover(hit, [labelMap[r.k] || r.k, fmt(r.v) + ' delay minutes', r.s.toFixed(1) + '% of all delay minutes', fmt(r.n) + ' delay-causing incidents']);
        });
      }
    },
    pareto: {
      title: 'Top 20 delay causes, with cumulative share',
      note: 'The classic 80/20: 25 of 123 codes account for 80% of delay minutes. The top cause alone, disorderly patrons, is 12.2%.',
      draw(svg, W) {
        const rows = D.pareto, H = 300, m = { t: 14, r: 40, b: 26, l: 40 };
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const iw = W - m.l - m.r, ih = H - m.t - m.b, bw = iw / rows.length, top = nice(rows[0].v);
        const y = (v) => m.t + ih - ih * v / top, y2 = (p) => m.t + ih - ih * p / 100;
        const ax = el('g', { class: 'axis' }, svg);
        [0, .25, .5, .75, 1].forEach((f) => {
          el('line', { x1: m.l, x2: W - m.r, y1: y(top * f), y2: y(top * f), 'stroke-dasharray': f ? '2 4' : '' }, ax);
          const t = el('text', { x: m.l - 6, y: y(top * f) + 4, 'text-anchor': 'end' }, ax); t.textContent = short(top * f);
        });
        [0, 50, 80, 100].forEach((p) => { const t = el('text', { x: W - m.r + 6, y: y2(p) + 4 }, ax); t.textContent = p + '%'; });
        el('line', { x1: m.l, x2: W - m.r, y1: y2(80), y2: y2(80), stroke: css('--l4'), 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, svg);
        rows.forEach((r, i) => {
          const x = m.l + i * bw + bw * 0.15, h = m.t + ih - y(r.v);
          const bar = el('rect', { x, width: bw * 0.7, y: m.t + ih, height: 0, rx: 2, fill: i < 3 ? css('--l1') : css('--route') }, svg);
          bar.setAttribute('y', y(r.v)); bar.setAttribute('height', h);
          if (!reduce) { bar.style.transformOrigin = `0 ${m.t + ih}px`; bar.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 600, delay: i * 25, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); }
          const hit = el('rect', { x: m.l + i * bw, width: bw, y: m.t, height: ih, fill: 'transparent' }, svg);
          hover(hit, [titleCase(r.d), r.k + ' · ' + fmt(r.v) + ' delay minutes', 'Cumulative: ' + r.c.toFixed(1) + '% of all minutes']);
        });
        const path = rows.map((r, i) => (i ? 'L' : 'M') + (m.l + i * bw + bw / 2) + ' ' + y2(r.c)).join(' ');
        const line = el('path', { d: path, fill: 'none', stroke: css('--ink'), 'stroke-width': 2 }, svg);
        line.style.pointerEvents = 'none';
        rows.forEach((r, i) => { const c = el('circle', { cx: m.l + i * bw + bw / 2, cy: y2(r.c), r: 3, fill: css('--ink') }, svg); c.style.pointerEvents = 'none'; });
        const lab = el('text', { x: m.l + 4, y: m.t + ih + 18 }, svg); lab.textContent = 'Each bar is one TTC delay code, largest first';
      }
    },
    hours: {
      title: 'Delay minutes by hour of day',
      note: 'Lost time peaks between 4 and 6 pm, when trains and platforms are busiest. Early-morning bars reflect incidents at service start.',
      draw(svg, W) {
        const v = D.hours, H = 280, m = { t: 14, r: 8, b: 26, l: 40 };
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const iw = W - m.l - m.r, ih = H - m.t - m.b, bw = iw / 24, top = nice(Math.max(...v));
        const y = (x) => m.t + ih - ih * x / top;
        const ax = el('g', { class: 'axis' }, svg);
        [0, .5, 1].forEach((f) => { el('line', { x1: m.l, x2: W - m.r, y1: y(top * f), y2: y(top * f), 'stroke-dasharray': f ? '2 4' : '' }, ax); const t = el('text', { x: m.l - 6, y: y(top * f) + 4, 'text-anchor': 'end' }, ax); t.textContent = short(top * f); });
        const hl = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? ' am' : ' pm');
        const peak = v.indexOf(Math.max(...v));
        v.forEach((val, h) => {
          const bar = el('rect', { x: m.l + h * bw + 2, width: bw - 4, y: y(val), height: m.t + ih - y(val), rx: 2, fill: (h === 16 || h === 17) ? css('--l1') : css('--route') }, svg);
          if (!reduce) { bar.style.transformOrigin = `0 ${m.t + ih}px`; bar.animate([{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 550, delay: h * 18, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); }
          const hit = el('rect', { x: m.l + h * bw, width: bw, y: m.t, height: ih, fill: 'transparent' }, svg);
          hover(hit, [hl(h) + ' hour', fmt(val) + ' delay minutes', h === peak ? 'Busiest hour for delays' : '']);
          if (h % (W < 480 ? 6 : 3) === 0) { const t = el('text', { x: m.l + h * bw + bw / 2, y: H - 6, 'text-anchor': 'middle' }, svg); t.textContent = hl(h); }
        });
      }
    },
    stations: {
      title: 'Ten stations with the most delay minutes',
      note: 'Together they account for 27.7% of all delay minutes. Most are terminals or interchanges, where trains turn back or lines meet.',
      draw(svg, W) {
        const rows = D.stations, rowH = 30, H = rows.length * rowH + 4, max = rows[0].v, labW = Math.min(130, W * 0.36), endPad = 52;
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        rows.forEach((r, i) => {
          const g = el('g', { transform: `translate(0,${i * rowH})` }, svg);
          const t = el('text', { x: labW - 10, y: 19, 'text-anchor': 'end', class: i < 3 ? 'lbl-strong' : '' }, g); t.textContent = r.k;
          const w = Math.max(2, (W - labW - endPad) * r.v / max);
          const bar = el('rect', { x: labW, y: 8, height: 14, rx: 7, fill: i < 3 ? css('--l1') : css('--route') }, g);
          bar.style.transition = reduce ? '' : `width .7s ${i * 40}ms cubic-bezier(.2,.7,.2,1)`;
          bar.setAttribute('width', reduce ? w : 0); if (!reduce) requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('width', w)));
          const val = el('text', { x: labW + w + 8, y: 19 }, g); val.textContent = short(r.v);
          const hit = el('rect', { x: 0, y: 0, width: W, height: rowH, fill: 'transparent' }, g);
          hover(hit, [r.k + ' station', fmt(r.v) + ' delay minutes', fmt(r.n) + ' delay-causing incidents']);
        });
      }
    },
    trend: {
      title: 'Delay minutes by month',
      note: 'January–October delay minutes rose from 53,294 in 2023 to 61,659 in 2024, then fell 5.8% to 58,106 in 2025.',
      draw(svg, W) {
        const rows = D.monthly, H = 280, m = { t: 16, r: 14, b: 26, l: 40 };
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const iw = W - m.l - m.r, ih = H - m.t - m.b, top = nice(Math.max(...rows.map((r) => r.v)));
        const x = (i) => m.l + iw * i / (rows.length - 1), y = (v) => m.t + ih - ih * v / top;
        const ax = el('g', { class: 'axis' }, svg);
        [0, .5, 1].forEach((f) => { el('line', { x1: m.l, x2: W - m.r, y1: y(top * f), y2: y(top * f), 'stroke-dasharray': f ? '2 4' : '' }, ax); const t = el('text', { x: m.l - 6, y: y(top * f) + 4, 'text-anchor': 'end' }, ax); t.textContent = short(top * f); });
        const pts = rows.map((r, i) => [x(i), y(r.v)]);
        const area = 'M' + pts.map((p) => p.join(' ')).join(' L') + ` L${x(rows.length - 1)} ${m.t + ih} L${m.l} ${m.t + ih} Z`;
        const a = el('path', { d: area, fill: css('--route'), opacity: .12 }, svg); a.style.pointerEvents = 'none';
        const p = el('path', { d: 'M' + pts.map((q) => q.join(' ')).join(' L'), fill: 'none', stroke: css('--route'), 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
        if (!reduce) { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1100, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
        rows.forEach((r, i) => {
          if (r.m.endsWith('-01')) { const t = el('text', { x: x(i), y: H - 6, 'text-anchor': 'middle' }, svg); t.textContent = 'Jan ' + r.m.slice(0, 4); el('line', { x1: x(i), x2: x(i), y1: m.t, y2: m.t + ih, stroke: css('--line') }, svg); }
          const dot = el('circle', { cx: x(i), cy: y(r.v), r: 3.5, fill: css('--route') }, svg);
          const hit = el('rect', { x: x(i) - iw / rows.length / 2, width: iw / rows.length, y: m.t, height: ih, fill: 'transparent' }, svg);
          const d = new Date(Date.UTC(+r.m.slice(0, 4), +r.m.slice(5) - 1, 1));
          hover(hit, [d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }), fmt(r.v) + ' delay minutes']);
          void dot;
        });
        const lastP = pts[pts.length - 1]; el('circle', { cx: lastP[0], cy: lastP[1], r: 6, fill: css('--l1'), stroke: css('--surface'), 'stroke-width': 2 }, svg);
      }
    }
  };

  let current = 'causes';
  function drawChart() {
    const v = views[current];
    $('#vizTitle').textContent = v.title; $('#vizNote').textContent = v.note;
    chartEl.replaceChildren(); hideTip();
    const W = Math.max(280, chartEl.clientWidth);
    const svg = el('svg', { width: '100%', role: 'img', 'aria-label': v.title }, chartEl);
    v.draw(svg, W);
    // remove empty tooltip lines
  }
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    current = b.dataset.view; drawChart();
  }));
  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('.tabs button'), i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); n.click();
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawChart, 150); });
  drawChart();

  /* ---------- Project filters ---------- */
  $$('.chip').forEach((c) => c.addEventListener('click', () => {
    $$('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const f = c.dataset.filter;
    $$('#projectGrid .card').forEach((card) => { card.hidden = f !== 'all' && !card.dataset.tags.split(' ').includes(f); });
  }));

  /* ---------- Skills light up projects ---------- */
  const hint = $('#skillHint');
  const cards = $$('#projectGrid .card');
  const titleOf = (c) => $('h3', c).textContent;
  function lightUp(skill, btn) {
    $$('.skill').forEach((s) => s.classList.toggle('on', s === btn));
    if (!skill) { cards.forEach((c) => c.classList.remove('dim')); hint.textContent = ''; return; }
    const hits = cards.filter((c) => c.dataset.skills.split(',').includes(skill));
    cards.forEach((c) => c.classList.toggle('dim', !hits.includes(c)));
    const work = { 'Power BI': 'MHI RJ executive dashboards', 'Power Query': 'MHI RJ reporting automation', 'Excel': 'MHI RJ and Hybernate reporting', 'SQL': 'MHI RJ reporting automation', 'KPI design': 'MHI RJ and Hybernate', 'Stakeholder reporting': 'MHI RJ directors and VPs', 'Process improvement': 'MHI RJ reporting redesign', 'Root-cause analysis': 'MHI RJ service-centre analysis', 'Forecasting': 'MHI RJ workload forecasts' }[skill];
    const parts = [];
    if (hits.length) parts.push('Projects: ' + hits.map(titleOf).join(', '));
    if (work) parts.push('Work: ' + work);
    hint.textContent = skill + ' → ' + (parts.join(' · ') || 'Coursework at the University of Toronto');
    if (hits.length) { $('.chip[data-filter="all"]').click(); }
  }
  $$('.skill').forEach((s) => {
    s.addEventListener('mouseenter', () => lightUp(s.textContent, s));
    s.addEventListener('focus', () => lightUp(s.textContent, s));
    s.addEventListener('click', () => lightUp(s.textContent, s));
  });
  $('.skills').addEventListener('mouseleave', () => lightUp(null));

  /* ---------- Copy email ---------- */
  const copyBtn = $('#copyEmail'), ok = $('#copyOk');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(copyBtn.dataset.email); ok.textContent = 'Copied'; }
    catch (e) { ok.textContent = copyBtn.dataset.email; }
    setTimeout(() => { ok.textContent = ''; }, 2500);
  });
})();
