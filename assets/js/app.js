/* Acervo docente – núcleo: dados, acervo, visualizador, navegação */
(function () {
  'use strict';

  const CATS = [
    ['formacao', 'Formação', 'g1'],
    ['estagios', 'Estágios', 'g1'],
    ['vinculo', 'Vínculos profissionais', 'g4'],
    ['cursos', 'Cursos e treinamentos', 'g2'],
    ['eventos', 'Eventos e congressos', 'g3'],
    ['docencia', 'Docência', 'g5'],
    ['orientacao', 'Orientações', 'g6'],
    ['bancas', 'Bancas e concursos', 'g7'],
    ['producao', 'Produção técnica e científica', 'g8'],
    ['extensao', 'Extensão', 'g8'],
    ['relatorios', 'Relatórios de atividade docente', 'gr']
  ];
  const CAT = Object.fromEntries(CATS.map(([id, label, g], i) => [id, { id, label, g, order: i }]));
  const GROUPS = [
    ['g1', 'Formação e estágios'], ['g2', 'Cursos'], ['g3', 'Eventos'], ['g4', 'Vínculos'],
    ['g5', 'Docência'], ['g6', 'Orientações'], ['g7', 'Bancas'], ['g8', 'Produção e extensão']
  ];

  const S = {
    docs: [], act: null, cats: new Set(), q: '', mode: 'cat', order: 'asc',
    range: null, blur: false, list: [], current: -1
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yr = d => +d.slice(0, 4);
  const fmtDate = d => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    if ((m === '01' && dd === '01') || (m === '12' && dd === '31')) return y;
    return `${dd}/${m}/${y}`;
  };
  const fmtDocDate = x => {
    const a = fmtDate(x.d);
    if (x.e && x.e !== x.d && !['formacao', 'bancas', 'producao', 'relatorios'].includes(x.c)) return `${a} – ${fmtDate(x.e)}`;
    return a;
  };
    const gcolor = c => `var(--${CAT[c].g})`;

  window.APP = { S, CATS, CAT, GROUPS, $, $$, norm, esc, yr, fmtDate, fmtDocDate, gcolor, openDoc: null, go: null, onView: {} };

  APP.thumb = d => (window.THUMBS && window.THUMBS[d.id]) || d.th;

  /* ---------- tooltip ---------- */
  const tip = $('#tip');
  APP.showTip = (ev, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  };
  APP.hideTip = () => { tip.hidden = true; };

  /* ---------- tema ---------- */
  $('#theme').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    APP.rerender && APP.rerender();
  });

  /* ---------- navegação ---------- */
  const VIEWS = ['acervo', 'linha', 'painel', 'relatorios'];
  APP.go = (view, extra) => {
    if (!VIEWS.includes(view)) view = 'acervo';
    VIEWS.forEach(v => { $('#v-' + v).hidden = v !== view; });
    $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === view));
    APP.view = view;
    if (location.hash.slice(1).split('&')[0] !== view && !/^doc=/.test(location.hash.slice(1))) history.replaceState(null, '', '#' + view);
    if (APP.onView[view]) APP.onView[view](extra);
    scrollTo({ top: 0 });
  };
  $$('.tabs button').forEach(b => b.addEventListener('click', () => APP.go(b.dataset.view)));
  addEventListener('hashchange', route);
  function route() {
    const h = location.hash.slice(1);
    if (h.startsWith('doc=')) { const d = S.docs.find(x => x.id === h.slice(4)); if (d) openById(d.id); return; }
    const [v, a] = h.split('&');
    if (v !== APP.view) APP.go(v || 'acervo', a);
  }

  /* ---------- filtro ---------- */
  function filtered() {
    const q = norm(S.q).split(/\s+/).filter(Boolean);
    let l = S.docs.filter(d => {
      if (S.cats.size && !S.cats.has(d.c)) return false;
      if (S.range) { const y = yr(d.d); if (y < S.range[0] || y > S.range[1]) return false; }
      if (q.length) { const t = d._s; if (!q.every(w => t.includes(w))) return false; }
      return true;
    });
    const sgn = S.order === 'asc' ? 1 : -1;
    l.sort((a, b) => sgn * ((a.d + a.id) < (b.d + b.id) ? -1 : 1));
    return l;
  }

  function card(d, idx) {
    const c = CAT[d.c];
    return `<button class="card" data-i="${idx}" data-s="${d.s}" aria-label="${esc(d.t)}">
      <span class="thumb"><img loading="lazy" decoding="async" src="${APP.thumb(d)}" alt="" width="420" height="315">
        ${d.kind === 'pdf' ? '<span class="pill pdf">PDF</span>' : ''}${d.s ? '<span class="pill" title="Contém dados pessoais">dados pessoais</span>' : ''}</span>
      <span class="meta"><time>${fmtDocDate(d)}</time><b>${esc(d.t)}</b><span>${esc(d.i || '')}</span></span></button>`;
  }

  function renderList() {
    const l = S.list = filtered();
    const n = l.length;
    $('#count').textContent = n === S.docs.length ? `${n} documentos` : `${n} de ${S.docs.length} documentos`
      + (S.range ? ` · ${S.range[0]}–${S.range[1]}` : '');
    const box = $('#list');
    if (!n) { box.innerHTML = '<div class="empty">Nenhum documento corresponde aos filtros. <button class="link" id="clear2">Limpar filtros</button></div>'; $('#clear2').onclick = clearAll; return; }
    let html = '';
    if (S.mode === 'cat') {
      const by = new Map();
      CATS.forEach(([id]) => by.set(id, []));
      l.forEach((d, i) => by.get(d.c).push(i));
      for (const [id, label] of CATS) {
        const ix = by.get(id); if (!ix.length) continue;
        const a = S.docs.filter(d => d.c === id);
        const span = ix.map(i => yr(l[i].d)); const lo = Math.min(...span), hi = Math.max(...span);
        html += `<section class="group"><h2><span class="dot" style="background:${gcolor(id)}"></span>${label}<small>${ix.length} ${ix.length === 1 ? 'documento' : 'documentos'} · ${lo === hi ? lo : lo + '–' + hi}</small></h2><div class="grid">${ix.map(i => card(l[i], i)).join('')}</div></section>`;
      }
    } else {
      const by = new Map();
      l.forEach((d, i) => { const y = yr(d.d); if (!by.has(y)) by.set(y, []); by.get(y).push(i); });
      for (const [y, ix] of by) html += `<section class="group"><h2>${y}<small>${ix.length} ${ix.length === 1 ? 'documento' : 'documentos'}</small></h2><div class="grid">${ix.map(i => card(l[i], i)).join('')}</div></section>`;
    }
    box.innerHTML = html;
  }

  function renderCats() {
    const base = S.docs.filter(d => {
      if (S.range) { const y = yr(d.d); if (y < S.range[0] || y > S.range[1]) return false; }
      const q = norm(S.q).split(/\s+/).filter(Boolean);
      return q.every(w => d._s.includes(w));
    });
    $('#cats').innerHTML = CATS.map(([id, label]) => {
      const n = base.filter(d => d.c === id).length;
      return `<li><button data-c="${id}" aria-pressed="${S.cats.has(id)}"><span class="dot" style="background:${gcolor(id)};margin:0"></span><span>${label}</span><span class="n">${n}</span></button></li>`;
    }).join('');
  }

  function refresh() { renderCats(); renderList(); APP.drawRuler && APP.drawRuler(); }
  function clearAll() {
    S.cats.clear(); S.q = ''; S.range = null; $('#q').value = '';
    refresh();
  }
  APP.refresh = refresh;
  APP.filterCat = (c) => { S.cats = new Set([c]); S.range = null; S.q = ''; $('#q').value = ''; APP.go('acervo'); refresh(); };
  APP.setRange = (r) => { S.range = r; renderCats(); renderList(); };

  $('#cats').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const c = b.dataset.c; S.cats.has(c) ? S.cats.delete(c) : S.cats.add(c);
    refresh();
  });
  $('#clear').onclick = clearAll;
  let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; refresh(); }, 120); });
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; $$('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderList(); }));
  $$('[data-order]').forEach(b => b.addEventListener('click', () => { S.order = b.dataset.order; $$('[data-order]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderList(); }));
  $('#blur').addEventListener('change', e => { S.blur = e.target.checked; $('#list').classList.toggle('blur', S.blur); try { localStorage.setItem('blur', S.blur ? '1' : '0'); } catch (x) {} });
  $('#list').addEventListener('click', e => {
    const c = e.target.closest('.card'); if (!c) return;
    S.current = +c.dataset.i; show(S.list[S.current]);
  });

  /* ---------- visualizador ---------- */
  const dlg = $('#viewer');
  let zoom = 1, curDoc = null, userRot = 0, srcImg = null, seq = 0;
  const imgUrl = d => `https://drive.google.com/thumbnail?id=${d.gid}&sz=w2200`;

  function toolbar(on) { $$('#v-zin,#v-zout,#v-rl,#v-rr').forEach(b => { b.hidden = !on; }); }

  function show(d) {
    curDoc = d; userRot = 0; zoom = 1; srcImg = null;
    const my = ++seq;
    $('#v-t').textContent = d.t;
    $('#v-sub').textContent = `${CAT[d.c].label} · ${fmtDocDate(d)}`;
    const stage = $('#v-stage');
    const open = $('#v-open');
    if (d.gid) { open.href = `https://drive.google.com/file/d/${d.gid}/view`; open.hidden = false; open.textContent = 'Abrir no Drive'; }
    else open.hidden = true;
    const frame = () => { toolbar(false); stage.innerHTML = `<iframe src="https://drive.google.com/file/d/${d.gid}/preview" title="${esc(d.t)}" allow="autoplay"></iframe>`; };
    if (d.kind === 'pdf') frame();
    else if (!d.gid) {
      toolbar(false);
      stage.innerHTML = `<div class="v-missing"><img src="${APP.thumb(d)}" alt=""><p>Este arquivo não está mais na pasta do Drive. Envie-o novamente à pasta para visualizá-lo em tamanho completo.</p></div>`;
    } else {
      toolbar(true);
      stage.innerHTML = '<p class="v-load">Carregando documento…</p>';
      const im = new Image();
      im.onload = () => { if (my !== seq) return; srcImg = im; draw(); };
      im.onerror = () => { if (my !== seq) return; frame(); };
      im.src = imgUrl(d);
    }
    const rows = [['Categoria', CAT[d.c].label], ['Data', fmtDocDate(d)], ['Período', d.p], ['Emitido por', d.i], ['Descrição', d.x]].filter(r => r[1]);
    $('#v-meta').innerHTML = `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
      + (d.s ? '<p class="warn">Este documento contém dados pessoais (como RG, CPF ou matrícula). Evite compartilhá-lo publicamente.</p>' : '');
    $('#v-prev').disabled = S.current <= 0; $('#v-next').disabled = S.current >= S.list.length - 1 || S.current < 0;
    if (!dlg.open) dlg.showModal();
    if (srcImg) draw();
    history.replaceState(null, '', '#doc=' + d.id);
  }

  /* desenha a imagem do Drive já girada para a posição de leitura */
  function draw() {
    if (!srcImg || !curDoc) return;
    const stage = $('#v-stage');
    const ccw = (((curDoc.rot || 0) - userRot) % 360 + 360) % 360;
    const w = srcImg.naturalWidth, h = srcImg.naturalHeight, swap = ccw % 180 !== 0;
    let cv = stage.querySelector('canvas');
    if (!cv) { stage.innerHTML = ''; cv = document.createElement('canvas'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', curDoc.t); stage.appendChild(cv); }
    cv.width = swap ? h : w; cv.height = swap ? w : h;
    const ctx = cv.getContext('2d');
    ctx.save(); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(-ccw * Math.PI / 180); ctx.drawImage(srcImg, -w / 2, -h / 2); ctx.restore();
    const base = Math.min(stage.clientWidth - 28, cv.width);
    cv.style.width = Math.max(160, base * zoom) + 'px'; cv.style.height = 'auto';
  }
  function step(n) { const i = S.current + n; if (i < 0 || i >= S.list.length) return; S.current = i; show(S.list[i]); }
  $('#v-prev').onclick = () => step(-1);
  $('#v-next').onclick = () => step(1);
  $('#v-zin').onclick = () => { zoom = Math.min(zoom * 1.25, 4); draw(); };
  $('#v-zout').onclick = () => { zoom = Math.max(zoom / 1.25, .4); draw(); };
  $('#v-rl').onclick = () => { userRot -= 90; draw(); };
  $('#v-rr').onclick = () => { userRot += 90; draw(); };
  $('#v-stage').addEventListener('dblclick', () => { zoom = zoom === 1 ? 2 : 1; draw(); });
  $('#v-close').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { seq++; srcImg = null; $('#v-stage').innerHTML = ''; history.replaceState(null, '', '#' + (APP.view || 'acervo')); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
    else if (e.key === '+' || e.key === '=') $('#v-zin').click(); else if (e.key === '-') $('#v-zout').click();
    else if (e.key === 'r' || e.key === 'R') $('#v-rr').click();
  });
  addEventListener('resize', () => dlg.open && draw());

  function openById(id) {
    const d = S.docs.find(x => x.id === id); if (!d) return;
    S.list = filtered(); S.current = S.list.findIndex(x => x.id === id);
    if (S.current < 0) { S.list = [d]; S.current = 0; }
    show(d);
  }
  APP.openDoc = (id, list) => {
    if (list) { S.list = list; S.current = list.findIndex(x => x.id === id); show(S.docs.find(x => x.id === id)); }
    else openById(id);
  };
  APP.pdfFor = (year) => S.docs.find(d => d.kind === 'pdf' && d.c === 'relatorios' && d.year === year);

  /* ---------- sem documentos repetidos ---------- */
  /* Ignora cópias já marcadas (campo "dup"), arquivos do Drive repetidos (mesmo gid) e
     "2ª via"/"2ª cópia" de um documento que já está no acervo (mesmo título, emissor e data). */
  const COPY = /\s*,?\s*\(?\s*2ª\s+(via|cópia)\s*\)?/i;
  function dedupe(all) {
    const key = d => norm(String(d.t).replace(/,\s*2ª\s+(via|cópia)/i, '').replace(COPY, '')) + '|' + norm(d.i) + '|' + d.d;
    const seenGid = new Set(), seenKey = new Set(), out = [];
    const firstPass = all.filter(d => !d.dup && !COPY.test(d.t));
    firstPass.forEach(d => seenKey.add(key(d)));
    for (const d of all) {
      if (d.dup) continue;
      if (d.gid) { if (seenGid.has(d.gid)) continue; seenGid.add(d.gid); }
      if (COPY.test(d.t) && seenKey.has(key(d))) continue;   /* cópia de um original presente */
      out.push(d);
    }
    return out;
  }

  /* ---------- carga ---------- */
  try {
    const { act } = window.SITE_DATA;
    const docs = dedupe(window.SITE_DATA.docs);
    docs.forEach(d => { d._s = norm([d.t, d.i, d.x, d.p, CAT[d.c].label, yr(d.d)].join(' ')); });
    S.docs = docs; S.act = act;
    try { if (localStorage.getItem('blur') === '1') { S.blur = true; $('#blur').checked = true; $('#list').classList.add('blur'); } } catch (e) {}
    const ys = docs.map(d => yr(d.d));
    $('#n-docs').textContent = docs.length; $('#y-min').textContent = Math.min(...ys); $('#y-max').textContent = Math.max(...ys);
    refresh();
    route();
    APP.ready = true;
    window.dispatchEvent(new Event('appready'));
  } catch (err) {
    $('#list').innerHTML = '<div class="empty">Não foi possível carregar os dados do acervo (' + esc(err.message) + '). Confira se a pasta <code>assets/js</code> foi copiada por completo.</div>';
    console.error(err);
  }
})();
