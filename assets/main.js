(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pct = (x, d = 0) => (100 * x).toFixed(d) + '%';

  /* ---------- nav ---------- */
  const nav = $('.nav'), menuBtn = $('#menuBtn'), links = $('#navlinks');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 6), { passive: true });
  menuBtn.addEventListener('click', () => { const o = links.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(o)); });
  $$('#navlinks a').forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('#navlinks a').forEach(a => a.classList.toggle('active', a.hash === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => spy.observe(s));

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(count);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));
  function count(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = 1;
    const end = +el.dataset.count, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- hero: a quiet field of nodes that links up near the cursor ---------- */
  (() => {
    const cv = $('#field'), ctx = cv.getContext('2d');
    let W, H, pts = [], mouse = { x: -1e4, y: -1e4 }, raf;
    function build() {
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, W * H / 14000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18, r: 1 + Math.random() * 1.6 }));
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; }
      }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            const near = Math.max(0, 1 - Math.hypot((a.x + b.x) / 2 - mouse.x, (a.y + b.y) / 2 - mouse.y) / 260);
            ctx.strokeStyle = `rgba(${Math.round(42 + 81 * near)},${Math.round(98 - 21 * near)},${240 + 15 * near},${(1 - d / 120) * (.10 + .45 * near)})`;
            ctx.lineWidth = .8 + near; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const near = Math.max(0, 1 - Math.hypot(a.x - mouse.x, a.y - mouse.y) / 200);
        ctx.fillStyle = `rgba(${Math.round(42 + 81 * near)},98,240,${.25 + .6 * near})`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + near * 2, 0, 7); ctx.fill();
      }
      // keep the headline area calm
      const g = ctx.createRadialGradient(W / 2, H * .48, 0, W / 2, H * .48, Math.max(W, H) * .42);
      g.addColorStop(0, 'rgba(251,251,253,.92)'); g.addColorStop(1, 'rgba(251,251,253,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    build(); frame();
    addEventListener('resize', () => { build(); if (reduce) frame(); });
    $('.hero').addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); mouse = { x: e.clientX - b.left, y: e.clientY - b.top }; if (reduce) frame(); });
    $('.hero').addEventListener('pointerleave', () => { mouse = { x: -1e4, y: -1e4 }; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else if (!reduce) raf = requestAnimationFrame(frame); });
  })();

  /* ---------- featured: incident triage demo ---------- */
  const T = window.TRIAGE;
  if (T) {
    const opt = (sel, items) => items.forEach(([v, l]) => sel.add(new Option(l, v)));
    const code = $('#tCode'), st = $('#tStation'), hr = $('#tHour'), dy = $('#tDay');
    opt(code, T.codes.map(c => [c.code, c.label]));
    opt(st, T.stations.map(s => [s.id, s.label]));
    opt(hr, Array.from({ length: 24 }, (_, h) => [h, (h % 12 || 12) + (h < 12 ? ' am' : ' pm')]));
    opt(dy, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => [i, d]));
    code.value = (T.codes.find(c => c.code === 'SUUT') || T.codes[0]).code;
    st.value = (T.stations.find(s => s.id === 'BLOOR') || T.stations[0]).id;
    hr.value = 17; dy.value = 2;

    const w = k => T.coef[k] || 0;
    const sweep = T.sweep, best = T.decision.threshold;
    let idx = sweep.findIndex(s => Math.abs(s.t - best) < 1e-9);
    const slider = $('#tSlider'); slider.max = sweep.length - 1; slider.value = idx;
    $('#tBest').textContent = best.toFixed(2);

    function predict() {
      const c = T.codes.find(x => x.code === code.value), s = T.stations.find(x => x.id === st.value);
      const z = T.intercept + w('code=' + c.code) + w('category=' + c.category) + w('station_clean=' + s.id) +
        w('line_clean=' + s.line) + T.bound_avg + w('hour=' + hr.value) + w('dow=' + dy.value);
      return { p: 1 / (1 + Math.exp(-z)), c };
    }
    function render() {
      const { p, c } = predict(), t = sweep[idx].t, alert = p >= t;
      const ring = $('#tRing'); ring.style.setProperty('--p', Math.min(1, p / .6).toFixed(3)); ring.classList.toggle('alert', alert);
      $('#tProb').textContent = pct(p, p < .1 ? 1 : 0);
      const v = $('#tVerdict'); v.textContent = alert ? 'Alert: start recovery early' : 'Monitor: no alert'; v.classList.toggle('alert', alert);
      $('#tContext').textContent = `Historically, ${pct(c.hist)} of "${c.label}" incidents became major. Alert threshold: ${t.toFixed(2)}.`;
      const s = sweep[idx];
      $('#rT').textContent = s.t.toFixed(2); $('#rRecall').textContent = pct(s.recall); $('#rPrec').textContent = pct(s.precision); $('#rAlerts').textContent = s.alerts_per_day.toFixed(1);
    }
    [code, st, hr, dy].forEach(el => el.addEventListener('change', render));
    slider.addEventListener('input', () => { idx = +slider.value; render(); });
    render();

    const names = { code: 'Delay code', station_clean: 'Station', category: 'Cause category', hour: 'Hour of day', month: 'Month', dow: 'Day of week', peak: 'Peak period', line_clean: 'Line', bound: 'Direction' };
    const mx = T.importance[0].mean_abs_shap;
    $('#tImp').innerHTML = T.importance.map(f => `<div class="bar"><span>${names[f.feature] || f.feature}</span><i style="transform:scaleX(${(f.mean_abs_shap / mx).toFixed(3)})"></i></div>`).join('');
    const rows = [['Code lookup rule', 'Code base rate'], ['Logistic regression (this demo)', 'Logistic regression'], ['LightGBM', 'LightGBM']];
    $('#tTable').innerHTML = rows.map(([l, k]) => { const m = T.metrics[k]; return `<tr><td>${l}</td><td>${m.pr_auc.toFixed(3)}</td><td>${m.roc_auc.toFixed(3)}</td><td>${m.brier.toFixed(4)}</td></tr>`; }).join('');
  }

  /* ---------- project filter ---------- */
  $$('.chip[data-f]').forEach(c => c.addEventListener('click', () => {
    $$('.chip[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    $$('#grid .card').forEach(card => { card.hidden = c.dataset.f !== 'all' && card.dataset.t !== c.dataset.f; card.classList.add('in'); });
  }));

  /* ---------- fit check: job description vs. evidence ---------- */
  // [label, regex, evidence or null]. Evidence lines only state what is on the résumé or this site.
  const S = [
    ['Python', /\bpython\b/, 'Every project on this site; pandas, scikit-learn, XGBoost, LightGBM, spaCy'],
    ['SQL', /\bsql\b|postgres|mysql|t-sql|duckdb/, 'Automated reporting at MHI RJ; TTC analysis reproduced in DuckDB SQL'],
    ['Machine learning', /machine learning|\bml\b|predictive model/, 'AI & Applied ML specialization; fraud, flight and incident-triage models'],
    ['Classification and regression', /classification|regression|supervised/, 'XGBoost and LightGBM classifiers; Random Forest regression'],
    ['Model evaluation', /model evaluation|validation|metrics|precision|recall|auc/, 'PR-AUC, calibration, time-based splits and leakage checks'],
    ['Deep learning', /deep learning|neural network/, 'Applied Deep Learning course (in progress); work-order triage project'],
    ['NLP', /\bnlp\b|natural language|text analytics|text mining/, 'Résumé ↔ job matcher with spaCy and TF-IDF'],
    ['Generative AI / LLMs', /\bllm|large language|generative ai|genai|gpt|prompt/, 'Offline vision-language model prototype (Qwen via Ollama)'],
    ['Statistics', /statistic|hypothesis|probability/, 'Statistics & Design of Experiments; Probability'],
    ['Forecasting', /forecast/, 'Workload forecasts for MHI RJ directors and VPs'],
    ['Optimization and OR', /optimi[sz]ation|operations research|linear programming/, 'Deterministic and stochastic OR coursework; cost-optimal thresholds'],
    ['Simulation', /simulation/, 'Systems Modelling & Simulation coursework'],
    ['Power BI', /power ?bi/, 'Executive dashboards at MHI RJ'],
    ['Excel', /\bexcel\b|spreadsheet/, 'Advanced Excel reporting at MHI RJ and Hybernate'],
    ['Power Query / ETL', /power query|\betl\b|data pipeline|data transformation/, 'Multi-source reporting automation, about 40% less manual effort'],
    ['Tableau', /tableau/, 'Listed on résumé (coursework and projects)'],
    ['Dashboards and reporting', /dashboard|reporting|business intelligence|\bbi\b/, '10+ executive dashboards and decision tools'],
    ['KPIs', /\bkpi|metrics definition|performance metric/, 'Standardized KPI definitions across Operations, Finance and Supply Chain'],
    ['Data visualization', /visuali[sz]/, 'Interactive charts on this site; Power BI dashboards'],
    ['Data modelling', /data model/, 'Data Modelling coursework; reporting data models at MHI RJ'],
    ['Data cleaning', /data clean|data quality|wrangl/, 'Cleaned about 90,000 TTC incident records; résumé dataset duplicate audit'],
    ['Git / GitHub', /\bgit\b|github|version control/, 'All projects published on GitHub'],
    ['APIs and Flask', /\bapis?\b|\brest(ful)?\b|flask/, 'Flask app for the résumé matcher; REST APIs in a Java course project'],
    ['Java / C++', /\bjava\b|c\+\+/, 'Object-oriented programming and data structures coursework'],
    ['Stakeholder management', /stakeholder/, 'Worked with directors and VPs across Operations, Finance and Supply Chain'],
    ['Requirements gathering', /requirement/, 'Turned business questions into reporting definitions at MHI RJ'],
    ['Process improvement', /process improvement|continuous improvement|\blean\b|efficien/, 'Reporting redesign at MHI RJ; operating processes at Hybernate'],
    ['Root-cause analysis', /root cause|root-cause/, 'CRJ service-centre performance analysis'],
    ['Project management / Agile', /project manag|agile|scrum/, 'Agile coordination at the U of T Robotics Association'],
    ['Supply chain and operations', /supply chain|logistics|operations/, 'Operations Director at Hybernate; MHI RJ supply-chain KPIs'],
    ['Financial and pricing analysis', /financ|pricing|budget|cost analysis/, 'Pricing and expense analysis (+10% profitability); budgeting dashboards'],
    ['Communication', /communicat|presentation|storytelling/, 'Reports and recommendations for executives; memos on GitHub'],
    ['Aviation / aerospace', /aviation|aerospace|aircraft|airline/, '16 months at MHI RJ Aviation Group (CRJ Series)'],
    ['PyTorch / TensorFlow', /pytorch|tensorflow|keras/, null],
    ['Cloud (AWS, Azure, GCP)', /\baws\b|azure|\bgcp\b|google cloud/, null],
    ['Docker / Kubernetes', /docker|kubernetes/, null],
    ['Spark / Databricks', /spark|databricks|hadoop/, null],
    ['Snowflake / data warehouse', /snowflake|redshift|bigquery|data warehouse/, null],
    ['Airflow / MLOps', /airflow|mlops|ml ops|mlflow/, null],
    ['VBA / macros', /\bvba\b|macro/, null],
    ['SAP / ERP', /\bsap\b|\berp\b/, null],
    ['Salesforce', /salesforce/, null],
    ['R', /\br\b(?! &)|\brstudio\b/, null],
    ['Six Sigma', /six sigma/, null],
    ['A/B testing', /a\/b test|ab test|experimentation/, null]
  ];
  const SAMPLE = `Junior Data Scientist, Operations Analytics (Toronto)
We're looking for a new grad to build machine learning models that forecast demand and flag operational risk. You'll work with stakeholders in operations and finance, write SQL and Python, and build Power BI dashboards that track KPIs. Requirements: Python, SQL, statistics, classification and regression, model evaluation, data visualization, strong communication. Nice to have: experience with AWS, Docker, PyTorch and A/B testing.`;
  const jd = $('#jd');
  function check() {
    const text = ' ' + jd.value.toLowerCase() + ' ';
    if (text.trim().length < 20) { jd.focus(); return; }
    const found = S.filter(([, re]) => re.test(text));
    const have = found.filter(s => s[2]), gap = found.filter(s => !s[2]);
    const out = $('#jdOut'); out.hidden = false;
    $('#jdPct').textContent = found.length ? pct(have.length / found.length) : '–';
    $('#jdSum').textContent = found.length ? `of the ${found.length} skills I recognised in this posting have evidence behind them.` : 'No recognisable skills found. Try pasting the full requirements section.';
    $('#jdHave').innerHTML = have.map(([l, , e]) => `<li><b>${l}</b>${e}</li>`).join('') || '<li>None found.</li>';
    $('#jdGap').innerHTML = gap.map(([l]) => `<li>${l}</li>`).join('') || '<li>None. Every recognised requirement is covered.</li>';
    out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  $('#jdGo').addEventListener('click', check);
  $('#jdSample').addEventListener('click', () => { jd.value = SAMPLE; check(); });
})();
