/* Acervo docente – régua, linha do tempo, painel e relatórios anuais */
(function () {
  'use strict';
  const { S, CATS, CAT, GROUPS, $, $$, esc, yr, fmtDate, fmtDocDate, gcolor, norm } = APP;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString('pt-BR');
  const T0 = new Date('1983-07-01'), T1 = new Date('2026-06-01');
  const date = s => new Date(s + 'T12:00:00');

  /* =============== RÉGUA (acervo) =============== */
  let brush, brushG;
  APP.drawRuler = function () {
    const svg = d3.select('#ruler'); if (!S.docs.length) return;
    const W = svg.node().clientWidth || 600, H = 132, m = { l: 4, r: 4, t: 6, b: 24 };
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H).selectAll('*').remove();
    const y0 = 1984, y1 = 2025;
    const x = d3.scaleLinear().domain([y0, y1 + 1]).range([m.l, W - m.r]);
    const byY = d3.group(S.docs, d => yr(d.d));
    const max = d3.max([...byY.values()], a => a.length);
    const bw = Math.max(3, (W - m.l - m.r) / (y1 - y0 + 1) - 2);
    const order = CATS.map(c => c[0]);
    const visible = new Set(S.list.map(d => d.id));
    const g = svg.append('g'); const avail = H - m.t - m.b;
    for (const [y, arr] of byY) {
      arr.sort((a, b) => order.indexOf(a.c) - order.indexOf(b.c));
      const tot = Math.max(8, avail * Math.sqrt(arr.length / max)); const bh = tot / arr.length;
      arr.forEach((d, i) => {
        g.append('rect').attr('x', x(y) + 1).attr('y', H - m.b - (i + 1) * bh).attr('width', bw).attr('height', Math.max(.8, bh - (bh > 4 ? 1 : 0)))
          .attr('fill', gcolor(d.c)).attr('opacity', visible.has(d.id) ? 1 : .18);
      });
    }
    const ax = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`);
    ax.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('stroke', css('--line'));
    for (let y = 1985; y <= 2025; y += 5) ax.append('text').attr('x', x(y) + bw / 2).attr('y', 17).attr('text-anchor', 'middle').text(y);
    brush = d3.brushX().extent([[m.l, 0], [W - m.r, H - m.b]]).on('end', ev => {
      if (!ev.sourceEvent) return;
      if (!ev.selection) { APP.setRange(null); return; }
      let a = Math.floor(x.invert(ev.selection[0])), b = Math.floor(x.invert(ev.selection[1] - 1));
      a = Math.max(y0, a); b = Math.min(y1, Math.max(a, b));
      brushG.call(brush.move, [x(a), x(b + 1)]);
      APP.setRange([a, b]); redrawRulerDim();
    });
    brushG = svg.append('g').call(brush);
    brushG.select('.selection').attr('fill', css('--accent')).attr('fill-opacity', .12).attr('stroke', css('--accent'));
    if (S.range) brushG.call(brush.move, [x(S.range[0]), x(S.range[1] + 1)]);
    // legenda
    $('#ruler-legend').innerHTML = GROUPS.map(([g, l]) => `<span><i style="background:var(--${g})"></i>${l}</span>`).join('') + '<span><i style="background:var(--gr)"></i>Relatórios</span>';
  };
  function redrawRulerDim() {
    const visible = new Set(S.list.map(d => d.id));
    // opacidade acompanha o filtro de categoria/busca, não o pincel
  }
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { APP.rerender(); }, 150); });

  /* =============== LINHA DO TEMPO =============== */
  const RANGES = [['Tudo', 1984, 2025], ['Até 1999', 1984, 1999], ['2000–2009', 2000, 2009], ['2010–2019', 2010, 2019], ['2020–2025', 2020, 2025]];
  let tlRange = 0;
  function drawTimeline() {
    const wrap = $('#range');
    if (!wrap.children.length) {
      wrap.innerHTML = RANGES.map((r, i) => `<button aria-pressed="${i === tlRange}" data-i="${i}">${r[0]}</button>`).join('');
      wrap.onclick = e => { const b = e.target.closest('button'); if (!b) return; tlRange = +b.dataset.i; $$('button', wrap).forEach(x => x.setAttribute('aria-pressed', x === b)); drawTimeline(); };
    }
    const [, a, b] = RANGES[tlRange];
    const svg = d3.select('#timeline'); svg.selectAll('*').remove();
    const W = Math.max(900, $('.tl-wrap').clientWidth - 8), lane = 50, m = { l: 225, r: 24, t: 14, b: 34 };
    const H = m.t + CATS.length * lane + m.b;
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
    const x = d3.scaleTime().domain([new Date(a + '-01-01'), new Date((b + 1) + '-01-01')]).range([m.l, W - m.r]);
    const ticks = x.ticks(d3.timeYear.every(b - a > 25 ? 5 : b - a > 12 ? 2 : 1));
    svg.append('g').selectAll('line').data(ticks).join('line').attr('class', 'tl-grid').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', m.t).attr('y2', H - m.b).attr('opacity', .6);
    const ax = svg.append('g').attr('class', 'tl-axis');
    ax.selectAll('text').data(ticks).join('text').attr('x', d => x(d)).attr('y', H - 12).attr('text-anchor', 'middle').text(d => d.getFullYear());
    const docs = S.docs.filter(d => { const y = yr(d.d); return y >= a && y <= b; });
    CATS.forEach(([id, label], i) => {
      const cy = m.t + i * lane + lane / 2;
      svg.append('rect').attr('x', 0).attr('y', cy - lane / 2 + 2).attr('width', W).attr('height', lane - 4).attr('fill', i % 2 ? 'transparent' : css('--line2')).attr('opacity', .55).attr('rx', 6);
      svg.append('circle').attr('cx', 14).attr('cy', cy).attr('r', 5).attr('fill', gcolor(id));
      const ds = docs.filter(d => d.c === id).sort((p, q) => p.d < q.d ? -1 : 1);
      svg.append('text').attr('class', 'tl-lane-label').attr('x', 28).attr('y', cy + 4).text(label.length > 26 ? label.replace(' técnica e científica', '').replace('Relatórios de atividade docente', 'Relatórios anuais') : label)
        .append('title').text(label);
      svg.append('text').attr('x', m.l - 12).attr('y', cy + 4).attr('text-anchor', 'end').attr('fill', css('--muted')).attr('font-size', 12).text(ds.length || '');
      const rows = [-13, 0, 13, -6.5, 6.5]; const lastX = rows.map(() => -99);
      ds.forEach(d => {
        const px = x(date(d.d));
        let r = lastX.findIndex(v => px - v > 11); if (r < 0) r = 0; lastX[r] = px;
        const py = cy + rows[r];
        if (d.e && d.e > d.d && (date(d.e) - date(d.d)) > 35 * 864e5) {
          svg.append('rect').attr('class', 'tl-bar').attr('x', px).attr('y', py - 3).attr('width', Math.max(4, x(date(d.e)) - px)).attr('height', 6).attr('rx', 3).attr('fill', gcolor(id)).attr('opacity', .35);
        }
        svg.append('circle').attr('class', 'tl-dot').attr('cx', px).attr('cy', py).attr('r', 5.5).attr('fill', gcolor(id)).attr('tabindex', 0).attr('role', 'button')
          .attr('aria-label', `${d.t}, ${fmtDocDate(d)}`)
          .on('mousemove', ev => APP.showTip(ev, `<b>${esc(d.t)}</b><small>${fmtDocDate(d)}${d.i ? ' · ' + esc(d.i) : ''}</small>`))
          .on('mouseleave', APP.hideTip)
          .on('focus', ev => { const r = ev.target.getBoundingClientRect(); APP.showTip({ clientX: r.right, clientY: r.bottom }, `<b>${esc(d.t)}</b><small>${fmtDocDate(d)}</small>`); })
          .on('blur', APP.hideTip)
          .on('click', () => { APP.hideTip(); const l = docs.slice().sort((p, q) => p.d < q.d ? -1 : 1); APP.openDoc(d.id, l); })
          .on('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); APP.hideTip(); APP.openDoc(d.id, docs.slice().sort((p, q) => p.d < q.d ? -1 : 1)); } });
      });
    });
  }
  APP.onView.linha = drawTimeline;

  /* =============== PAINEL =============== */
  const A = () => S.act;
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);

  function legend(items) {
    return `<ul class="legend">${items.map(([c, l]) => `<li><i style="background:${c}"></i>${l}</li>`).join('')}</ul>`;
  }
  function table(head, rows, cls = '') {
    return `<div class="tscroll"><table class="dtable ${cls}"><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row" style="font-weight:500">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* gráfico de colunas (empilhado ou simples) */
  function columns(host, o) {
    // o: labels[], series[{label,color,values[]}], h, tick(label)->bool, unit
    const W = host.clientWidth || 700, H = o.h || 260, m = { l: 34, r: 6, t: 8, b: 26 };
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.aria || '');
    const tot = o.labels.map((_, i) => sum(o.series, s => s.values[i]));
    const x = d3.scaleBand().domain(o.labels).range([m.l, W - m.r]).paddingInner(.25).paddingOuter(.1);
    const y = d3.scaleLinear().domain([0, Math.max(1, d3.max(tot))]).nice().range([H - m.b, m.t]);
    const yt = y.ticks(4);
    svg.append('g').attr('class', 'axis').selectAll('g').data(yt).join('g').attr('transform', d => `translate(0,${y(d)})`).each(function (d) {
      d3.select(this).append('line').attr('class', 'gridline').attr('x1', m.l).attr('x2', W - m.r);
      d3.select(this).append('text').attr('x', m.l - 6).attr('dy', '.32em').attr('text-anchor', 'end').text(d);
    });
    const xa = svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`);
    xa.append('line').attr('x1', m.l).attr('x2', W - m.r);
    const maxLen = d3.max(o.labels, l => (o.tick ? o.tick(l) : l).length) || 1; const every = Math.max(1, Math.ceil(maxLen * 6.6 / x.step()));
    xa.selectAll('text').data(o.labels.filter((_, i) => i % every === 0)).join('text').attr('x', d => x(d) + x.bandwidth() / 2).attr('y', 18).attr('text-anchor', 'middle').text(d => o.tick ? o.tick(d) : d);
    o.labels.forEach((lab, i) => {
      let acc = 0;
      const col = svg.append('g');
      o.series.forEach((s, k) => {
        const v = s.values[i]; if (!v) return;
        const y1 = y(acc + v), y0 = y(acc); acc += v;
        const top = k === o.series.length - 1 || o.series.slice(k + 1).every(t => !t.values[i]);
        const bw = x.bandwidth(), r = Math.min(4, bw / 2, (y0 - y1) / 2);
        const px = x(lab), hh = Math.max(1, y0 - y1 - (o.series.length > 1 ? 2 : 0));
        const path = top ? `M${px},${y0 - (o.series.length > 1 ? 2 : 0)}V${y1 + r}a${r},${r} 0 0 1 ${r},${-r}H${px + bw - r}a${r},${r} 0 0 1 ${r},${r}V${y0 - (o.series.length > 1 ? 2 : 0)}Z`
          : `M${px},${y0 - 2}V${y1}H${px + bw}V${y0 - 2}Z`;
        col.append('path').attr('d', path).attr('fill', s.color);
      });
      svg.append('rect').attr('x', x(lab) - 2).attr('width', x.bandwidth() + 4).attr('y', m.t).attr('height', H - m.t - m.b).attr('fill', 'transparent')
        .on('mousemove', ev => APP.showTip(ev, `<b>${o.tick ? o.tick(lab, true) : lab}</b>` + (o.series.length > 1
          ? o.series.filter(s => s.values[i]).map(s => `<small>${s.label}: ${fmt(s.values[i])}</small>`).join('') + `<small>Total: ${fmt(tot[i])}</small>`
          : `<small>${o.series[0].label}: ${fmt(o.series[0].values[i])}</small>`)))
        .on('mouseleave', APP.hideTip);
    });
    return svg;
  }

  /* barras horizontais */
  function hbars(host, o) {
    // o: rows[{label,value,color,onClick}], h per row
    const rowH = 30, W = host.clientWidth || 600, m = { l: Math.min(230, W * .42), r: 40, t: 4, b: 4 };
    const H = m.t + m.b + o.rows.length * rowH;
    const svg = d3.select(host).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.aria || '');
    const x = d3.scaleLinear().domain([0, d3.max(o.rows, r => r.value) || 1]).range([m.l, W - m.r]);
    o.rows.forEach((r, i) => {
      const y = m.t + i * rowH;
      const g = svg.append('g').style('cursor', r.onClick ? 'pointer' : null);
      g.append('text').attr('x', m.l - 10).attr('y', y + rowH / 2 + 4).attr('text-anchor', 'end').attr('fill', css('--ink2')).attr('font-size', 13).text(r.label);
      g.append('path').attr('d', `M${m.l},${y + 5}H${Math.max(m.l + 2, x(r.value)) - 4}a4,4 0 0 1 4,4v${rowH - 20}a4,4 0 0 1 -4,4H${m.l}Z`).attr('fill', r.color);
      g.append('text').attr('x', x(r.value) + 6).attr('y', y + rowH / 2 + 4).attr('fill', css('--ink')).attr('font-size', 13).style('font-variant-numeric', 'tabular-nums').text(r.value);
      g.append('rect').attr('x', 0).attr('y', y).attr('width', W).attr('height', rowH).attr('fill', 'transparent')
        .on('mousemove', ev => APP.showTip(ev, `<b>${esc(r.label)}</b><small>${r.value}${r.onClick ? ' · clique para ver' : ''}</small>`)).on('mouseleave', APP.hideTip)
        .on('click', () => r.onClick && r.onClick());
    });
  }

  function section(id, title, take, note) {
    return `<section class="chart-sec" id="${id}"><header><h2>${title}</h2><button class="tblbtn" data-t="${id}" aria-expanded="false">Ver como tabela</button></header>
      <p class="take">${take}</p><div class="chart-area"></div><div class="tbl" hidden></div>${note ? `<p class="note">${note}</p>` : ''}</section>`;
  }

  function drawPanel() {
    const docs = S.docs, years = A();
    const isSerie = p => p.serie;
    const nonSerie = y => y.producao.filter(p => !p.serie);
    const uniq = (arr, k) => [...new Map(arr.map(x => [x[k], x])).values()];
    const allOri = uniq(years.flatMap(y => y.orientacoes.map(o => ({ ...o, _y: y.year }))).sort((a, b) => b._y - a._y), 'uid');
    const allProd = uniq(years.flatMap(y => nonSerie(y)).filter(p => p.tipo !== 'Outra produção'), 'uid');
    const allBancas = years.reduce((n, y) => n + y.bancas.length, 0);
    const disc = years.reduce((n, y) => n + y.ensino.length, 0);
    const serieN = sum(years, y => y.producao.filter(isSerie).length);
    const concl = allOri.filter(o => o.situacao === 'Concluída').length;

    $('#kpis').innerHTML = [
      ['Documentos no acervo', docs.length], ['Relatórios anuais', docs.filter(d => d.kind === 'pdf').length],
      ['Disciplinas ministradas*', disc], ['Orientações distintas', allOri.length], ['Orientações concluídas', concl],
      ['Participações em bancas*', allBancas], ['Produções distintas**', allProd.length]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    const P = $('#panel'); P.innerHTML = [
      section('s-cat', 'Documentos por categoria', '', ''),
      section('s-time', 'Documentos por período de emissão', '', ''),
      section('s-heat', 'Onde estão os documentos: categoria e década', '', ''),
      section('s-ativ', 'Atividade docente ano a ano', 'Quatro medidas, cada uma em sua própria escala, extraídas dos relatórios anuais.', '*Ensino e bancas somam todos os anos 2010–2025. Orientações e projetos aparecem em cada relatório enquanto estão em andamento; por isso a contagem por ano mostra as orientações ativas naquele ano. 2021 não inclui a série de ' + serieN + ' capítulos “Aspectos geográficos/metodológicos…”, contabilizada à parte.'),
      section('s-prod', 'Produção por tipo', '', '**Produções distintas: artigos, capítulos, livros, trabalhos em evento e pareceres, sem repetir itens listados em mais de um ano e sem a série de capítulos de 2021.'),
      section('s-ori', 'Orientações por nível e situação', '', 'Cada orientação é contada uma vez, com a situação do relatório mais recente em que aparece. Nomes de orientandos não são publicados.'),
      section('s-qualis', 'Artigos em periódicos por estrato Qualis', '', ''),
      section('s-pont', 'Pontuação no SICAD+ (2022–2025)', '', 'Componentes: Ensino (ens), Pesquisa (psq), Produção intelectual (pri), Extensão (ext), Administração (adm), Representação (rpt) e Outras (otr), conforme o relatório.')
    ].join('');
    const area = id => $('#' + id + ' .chart-area');
    const tbl = (id, html) => { $('#' + id + ' .tbl').innerHTML = html; };
    const take = (id, t) => { $('#' + id + ' .take').innerHTML = t; };

    // 1 categorias
    const cnt = CATS.map(([id, l]) => ({ id, label: l, value: docs.filter(d => d.c === id).length }));
    const top = [...cnt].sort((a, b) => b.value - a.value)[0];
    take('s-cat', `${top.label} é a categoria com mais documentos (${top.value}). Clique em uma barra para abrir a categoria no acervo.`);
    hbars(area('s-cat'), { aria: 'Documentos por categoria', rows: cnt.map(c => ({ label: c.label.replace('Produção técnica e científica', 'Produção técnico-científica').replace('Relatórios de atividade docente', 'Relatórios anuais'), value: c.value, color: gcolor(c.id), onClick: () => APP.filterCat(c.id) })) });
    tbl('s-cat', table(['Categoria', 'Documentos', 'Com dados pessoais'], cnt.map(c => [c.label, c.value, docs.filter(d => d.c === c.id && d.s).length])));

    // 2 tempo (blocos de 5 anos)
    const bins = []; for (let a = 1984; a <= 2024; a += 5) bins.push(a);
    const lab = a => a === 2024 ? '2024–25' : `${a}–${String(a + 4).slice(2)}`;
    const series = GROUPS.map(([g, l]) => ({ label: l, color: `var(--${g})`, values: bins.map(a => docs.filter(d => d.c !== 'relatorios' && CAT[d.c].g === g && yr(d.d) >= a && yr(d.d) < (a === 2024 ? 2026 : a + 5)).length) }));
    const tt = bins.map((_, i) => sum(series, s => s.values[i])); const pk = tt.indexOf(Math.max(...tt));
    take('s-time', `O maior volume está em ${lab(bins[pk])}, com ${tt[pk]} documentos. Os 16 relatórios anuais ficam fora desta contagem.`);
    area('s-time').innerHTML = legend(series.map(s => [s.color, s.label]));
    columns(area('s-time'), { labels: bins.map(lab), series, h: 280, aria: 'Documentos por período de cinco anos, empilhados por grupo' });
    tbl('s-time', table(['Período', ...series.map(s => s.label), 'Total'], bins.map((a, i) => [lab(a), ...series.map(s => s.values[i]), tt[i]])));

    // 3 heatmap (tabela)
    const decs = [[1980, 1989], [1990, 1999], [2000, 2009], [2010, 2019], [2020, 2029]];
    const rowsH = CATS.map(([id, l]) => ({ l, v: decs.map(([a, b]) => docs.filter(d => d.c === id && yr(d.d) >= a && yr(d.d) <= b).length) }));
    const mx = Math.max(...rowsH.flatMap(r => r.v));
    const shade = v => { if (!v) return ''; const k = Math.min(4, Math.ceil(v / mx * 4)); return `background:var(--seq${k - 1 < 0 ? 0 : k});color:${k >= 3 ? '#fff' : 'var(--ink)'}`; };
    const colsW = decs.map(d => d[0] + 's');
    take('s-heat', 'Quanto mais escura a célula, mais documentos naquela categoria e década.');
    area('s-heat').innerHTML = `<div class="tscroll" style="max-height:none"><table class="dtable heat"><caption class="sr" style="display:none">Documentos por categoria e década</caption><thead><tr><th>Categoria</th>${colsW.map(c => `<th>${c}</th>`).join('')}<th>Total</th></tr></thead><tbody>${rowsH.map(r => `<tr><th scope="row" style="font-weight:500">${r.l}</th>${r.v.map(v => `<td class="h" data-v="${v}" style="${shade(v)}">${v}</td>`).join('')}<td>${sum(r.v)}</td></tr>`).join('')}</tbody></table></div>`;
    $('#s-heat .tblbtn').remove();

    // 4 atividade (small multiples)
    const yl = years.map(y => String(y.year));
    const mk = (title, vals, aria) => `<div><h3>${title}</h3><div class="sm" data-k="${aria}"></div></div>`;
    const defs = [
      ['Disciplinas no ano', years.map(y => y.ensino.length)],
      ['Orientações ativas no ano', years.map(y => y.orientacoes.length)],
      ['Participações em bancas', years.map(y => y.bancas.length)],
      ['Produções no ano', years.map(y => nonSerie(y).length)]
    ];
    area('s-ativ').innerHTML = `<div class="small-multi">${defs.map(([t], i) => mk(t, null, i)).join('')}</div>`;
    $$('#s-ativ .sm').forEach((el, i) => columns(el, { labels: yl, series: [{ label: defs[i][0], color: 'var(--g1)', values: defs[i][1] }], h: 190, tick: (l, full) => full ? l : "'" + l.slice(2), aria: defs[i][0] }));
    tbl('s-ativ', table(['Ano', 'Fonte', ...defs.map(d => d[0]), 'Pontos de projeto*'], years.map((y, i) => [y.year, y.source, ...defs.map(d => d[1][i]), y.projetos.length])));
    $('#s-ativ .tbl th:last-child,#s-ativ .tbl thead th:last-child').textContent = 'Projetos listados';
    take('s-ativ', `Média de ${fmt(sum(years, y => y.ensino.length) / years.length)} disciplinas e ${fmt(sum(years, y => y.orientacoes.length) / years.length)} orientações ativas por ano entre 2010 e 2025.`);

    // 5 produção por tipo
    const tipos = ['Artigo em periódico', 'Capítulo de livro', 'Trabalho em evento', 'Livro', 'Parecer ad hoc', 'Outra produção'];
    const tcol = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)', 'var(--g7)'];
    const ps = tipos.map((t, k) => ({ label: t, color: tcol[k], values: years.map(y => nonSerie(y).filter(p => p.tipo === t).length) }));
    const totP = years.map((_, i) => sum(ps, s => s.values[i]));
    take('s-prod', `Pico em ${years[totP.indexOf(Math.max(...totP))].year}, com ${Math.max(...totP)} itens registrados. ${serieN} capítulos da série de 2021 ficam de fora do gráfico.`);
    area('s-prod').innerHTML = legend(ps.map(s => [s.color, s.label]));
    columns(area('s-prod'), { labels: yl, series: ps, h: 280, aria: 'Produção por tipo e por ano', tick: (l, full) => full ? l : "'" + l.slice(2) });
    tbl('s-prod', table(['Ano', ...tipos, 'Total'], years.map((y, i) => [y.year, ...ps.map(s => s.values[i]), totP[i]])));

    // 6 orientações
    const nivel = o => /dout/i.test(o.nivel) ? 'Doutorado' : /mestr|stricto/i.test(o.nivel) ? 'Mestrado' : /espec/i.test(o.nivel) ? 'Especialização' : 'Graduação';
    const niveis = ['Graduação', 'Especialização', 'Mestrado', 'Doutorado'];
    const so = [['Concluída', 'var(--g1)'], ['Em andamento', 'var(--g2)']].map(([s, c]) => ({ label: s, color: c, values: niveis.map(n => allOri.filter(o => nivel(o) === n && o.situacao === s).length) }));
    take('s-ori', `${allOri.length} orientações distintas, das quais ${concl} concluídas.`);
    area('s-ori').innerHTML = legend(so.map(s => [s.color, s.label]));
    columns(area('s-ori'), { labels: niveis, series: so, h: 240, aria: 'Orientações por nível e situação' });
    tbl('s-ori', table(['Nível', 'Concluída', 'Em andamento', 'Total'], niveis.map((n, i) => [n, so[0].values[i], so[1].values[i], so[0].values[i] + so[1].values[i]])));

    // 7 qualis
    const arts = uniq(years.flatMap(y => y.producao.filter(p => p.tipo === 'Artigo em periódico')), 'uid');
    const qs = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C'];
    const qv = qs.map(q => arts.filter(a => a.qualis === q).length); const sem = arts.filter(a => !qs.includes(a.qualis)).length;
    take('s-qualis', `${arts.length} artigos distintos; ${arts.length - sem} com estrato Qualis informado.`);
    columns(area('s-qualis'), { labels: [...qs, 'Sem estrato'], series: [{ label: 'Artigos', color: 'var(--g1)', values: [...qv, sem] }], h: 220, aria: 'Artigos por estrato Qualis' });
    tbl('s-qualis', table(['Estrato', 'Artigos'], [...qs, 'Sem estrato'].map((q, i) => [q, [...qv, sem][i]])));

    // 8 pontuação
    const py = years.filter(y => y.pontuacao);
    const comp = [['ens', 'Ensino', 'g1'], ['psq', 'Pesquisa', 'g2'], ['pri', 'Produção intelectual', 'g3'], ['ext', 'Extensão', 'g4'], ['adm', 'Administração', 'g5'], ['rpt', 'Representação', 'g6'], ['otr', 'Outras', 'g7']];
    const cs = comp.map(([k, l, g]) => ({ label: l, color: `var(--${g})`, values: py.map(y => y.pontuacao[k] || 0) }));
    const best = py.reduce((a, b) => (b.pontuacao.total > a.pontuacao.total ? b : a));
    take('s-pont', `Maior pontuação total em ${best.year}: ${fmt(best.pontuacao.total)} pontos.`);
    area('s-pont').innerHTML = legend(cs.map(s => [s.color, s.label]));
    columns(area('s-pont'), { labels: py.map(y => String(y.year)), series: cs, h: 280, aria: 'Pontuação SICAD+ por componente' });
    tbl('s-pont', table(['Ano', ...cs.map(s => s.label), 'Total'], py.map((y, i) => [y.year, ...cs.map(s => fmt(s.values[i])), fmt(y.pontuacao.total)])));

    $$('.tblbtn').forEach(b => b.onclick = () => {
      const sec = $('#' + b.dataset.t), t = $('.tbl', sec), a = $('.chart-area', sec);
      const open = t.hidden; t.hidden = !open; a.hidden = open; b.textContent = open ? 'Ver como gráfico' : 'Ver como tabela'; b.setAttribute('aria-expanded', open);
    });
  }
  APP.onView.painel = drawPanel;

  /* =============== RELATÓRIOS ANUAIS =============== */
  let repYear = 2025;
  function drawYears() {
    const ys = S.act.map(y => y.year);
    $('#years').innerHTML = ys.map((y, i) => (y === 2022 ? '<span class="sep"></span>' : '') + `<button data-y="${y}" aria-pressed="${y === repYear}">${y}</button>`).join('');
    $('#years').onclick = e => { const b = e.target.closest('button'); if (!b) return; repYear = +b.dataset.y; drawYears(); drawReport(); history.replaceState(null, '', '#relatorios&' + repYear); };
  }
  function tr(cells, nums = []) { return `<tr>${cells.map((c, i) => `<td class="${nums.includes(i) ? 'num' : ''}">${c ?? ''}</td>`).join('')}</tr>`; }
  function rtable(head, rows, nums = []) {
    if (!rows.length) return '<p class="note" style="color:var(--muted)">Nada registrado neste ano.</p>';
    return `<div class="tscroll"><table class="dtable"><thead><tr>${head.map((h, i) => `<th class="${nums.includes(i) ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  const dt = d => d ? fmtDate(d) : '';
  const cap = s => { s = (s || '').trim(); if (s.length > 4 && s === s.toUpperCase()) s = s.charAt(0) + s.slice(1).toLowerCase(); return s; };
  function drawReport() {
    const y = S.act.find(v => v.year === repYear), d = APP.pdfFor(repYear), sc = y.source === 'SICAD+';
    const serie = y.producao.filter(p => p.serie), prod = y.producao.filter(p => !p.serie);
    const pts = !!y.pontuacao;
    let h = `<div class="rep-head"><img src="${APP.thumb(d)}" alt="Primeira página do relatório ${repYear}">
      <div><h2>${y.source === 'RADOC' ? 'RADOC' : 'SICAD+'} ${repYear}</h2>
      <p>${sc ? 'Sistema de Avaliação Docente da UFG' : 'Relatório Anual de Atividades Docentes (UFG)'} · ${d.pages} páginas${y.info.classe ? ` · Classe ${y.info.classe}, nível ${+y.info.nivel || y.info.nivel}` : ''}${y.info.regime ? ` · ${esc(cap(y.info.regime))}` : ''}</p>
      <div class="rep-stats"><span><b>${y.ensino.length}</b> disciplinas</span><span><b>${y.orientacoes.length}</b> orientações</span><span><b>${y.projetos.length}</b> projetos</span><span><b>${y.bancas.length}</b> bancas</span><span><b>${y.extensao.length}</b> extensão</span><span><b>${prod.length}</b> produções</span></div>
      <button class="btn" id="open-rep">Abrir o PDF do relatório</button></div></div>`;
    if (pts) {
      const p = y.pontuacao; const lab = { ens: 'Ensino', pri: 'Produção intelectual', psq: 'Pesquisa', ext: 'Extensão', adm: 'Administração', rpt: 'Representação', otr: 'Outras', total: 'Total' };
      h += `<dl class="pontos">${Object.keys(lab).map(k => `<div><dt>${lab[k]}</dt><dd>${fmt(p[k] || 0)}</dd></div>`).join('')}</dl>`;
    }
    const sec = (t, n, body) => `<section class="rep-sec"><h3>${t}<small>${n}</small></h3>${body}</section>`;
    h += sec('Ensino', y.ensino.length, rtable(['Período', 'Nível', 'Curso', 'Disciplina', 'CH', ...(pts ? ['Alunos', 'Pontos'] : [])],
      y.ensino.map(e => tr([e.periodo, cap(e.nivel), cap(e.curso), cap(e.disciplina), fmt(e.cha), ...(pts ? [e.alunos, fmt(e.pontos || 0)] : [])], [4, 5, 6])), [4, 5, 6]));
    h += sec('Orientações', y.orientacoes.length, rtable(['Tipo', 'Situação', 'Título', 'Função', 'Início', 'Fim'],
      y.orientacoes.map(o => tr([cap(o.tipo), o.situacao, esc(o.titulo), cap(o.funcao), dt(o.inicio), dt(o.fim)]))));
    if (y.projetos.length) h += sec('Projetos', y.projetos.length, rtable(['Tipo', 'Situação', 'Título', 'Função', 'Início', 'Fim'], y.projetos.map(o => tr([cap(o.tipo), o.situacao, esc(o.titulo), cap(o.funcao), dt(o.inicio), dt(o.fim)]))));
    h += sec('Bancas', y.bancas.length, rtable(['Tipo', 'Data', 'Descrição'], y.bancas.map(b => tr([cap(b.tipo), dt(b.data), esc(b.descricao)]))));
    h += sec('Extensão', y.extensao.length, rtable(['Tipo', 'Descrição', 'Início', 'Fim'], y.extensao.map(e => tr([cap(e.tipo).slice(0, 90), esc(cap(e.descricao).slice(0, 140)), dt(e.inicio), dt(e.fim)]))));
    h += sec('Atividades administrativas e de representação', y.administrativas.length, rtable(['Tipo', 'Descrição', 'Início', 'Fim'], y.administrativas.map(e => tr([cap(e.tipo).slice(0, 80), esc(cap(e.descricao).replace(/\s{2,}/g, ' · ').slice(0, 160)), dt(e.inicio), dt(e.fim)]))));
    h += sec('Produção', prod.length + (serie.length ? ` + ${serie.length} em série` : ''), rtable(['Tipo', 'Título', 'Autoria', ...(sc ? ['Veiculação', 'Qualis'] : ['Qualis'])], prod.map(p => tr([cap(p.tipo), esc(p.titulo), cap(p.autoria), ...(sc ? [esc(p.veiculacao), p.qualis] : [p.qualis])]))));
    if (serie.length) h += `<p class="note" style="margin-top:-10px">Este ano inclui uma série de ${serie.length} capítulos de livro (“Aspectos geográficos…” e “Aspectos metodológicos…”), omitida da tabela acima para não alongar a página. Todos constam no PDF.</p>`;
    if (y.outras.length) h += sec('Outras atividades', y.outras.length, rtable(['Tipo', 'Descrição'], y.outras.map(o => tr([cap(o.tipo).slice(0, 140), esc(o.descricao)]))));
    $('#report').innerHTML = h;
    $('#open-rep').onclick = () => APP.openDoc(d.id, S.docs.filter(x => x.kind === 'pdf'));
  }
  APP.onView.relatorios = (extra) => { if (extra && /^\d{4}$/.test(extra)) repYear = +extra; drawYears(); drawReport(); };

  APP.rerender = () => {
    APP.drawRuler && APP.drawRuler();
    if (APP.view === 'linha') drawTimeline();
    if (APP.view === 'painel') drawPanel();
  };
  function start() { APP.drawRuler(); const v = APP.view; if (v && APP.onView[v]) APP.onView[v](location.hash.split('&')[1]); }
  if (APP.ready) start(); else window.addEventListener('appready', start);
})();
