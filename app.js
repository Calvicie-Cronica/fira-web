(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt = (v, d = 2, u = '') => v == null || Number.isNaN(v) ? '—' :
    Number(v).toLocaleString('es-MX', {minimumFractionDigits: d, maximumFractionDigits: d}) + u;
  const P = window.PARCELAS || [], M = window.METRICAS || {};

  /* Pestañas */
  const tabs = [...document.querySelectorAll('.tab')];
  function show(i, focus) {
    i = Math.max(0, Math.min(tabs.length - 1, i));
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', k === i);
      t.tabIndex = k === i ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = k !== i;
    });
    if (focus) tabs[i].focus();
    history.replaceState(null, '', '#' + tabs[i].getAttribute('aria-controls'));
    window.scrollTo({top: 0});
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') show((i + 1) % tabs.length, true);
      if (e.key === 'ArrowLeft') show((i - 1 + tabs.length) % tabs.length, true);
    });
  });
  document.querySelectorAll('.panel').forEach((p, i) => {
    const nav = document.createElement('div'); nav.className = 'pager';
    nav.innerHTML = (i > 0 ? `<button class="btn" data-go="${i - 1}">← ${esc(tabs[i - 1].textContent)}</button>` : '<span></span>') +
      (i < tabs.length - 1 ? `<button class="btn go" data-go="${i + 1}">${esc(tabs[i + 1].textContent)} →</button>` : '');
    nav.onclick = e => { const b = e.target.closest('[data-go]'); if (b) show(+b.dataset.go); };
    p.appendChild(nav);
  });
  const hi = tabs.findIndex(t => t.getAttribute('aria-controls') === location.hash.slice(1));
  show(hi < 0 ? 0 : hi);

  /* Depuración */
  const f = M.depuracion || [], fmax = Math.max(1, ...f.map(x => x.n));
  $('funnel').innerHTML = f.map(x => `<div class="bar-row"><div>${esc(x.etapa)}</div>
    <div class="track"><div class="fill ${x.alt ? 'alt' : ''}" style="width:${(x.n / fmax * 100).toFixed(1)}%"></div></div>
    <div class="val">${x.n.toLocaleString('es-MX')}</div></div>`).join('');

  /* Buscador */
  $('nTrain').textContent = P.filter(p => p.tipo === 'entrenamiento').length || 138;
  $('nPred').textContent = P.filter(p => p.tipo === 'prediccion').length || 59;
  if (window.ES_DEMO) $('demoBanner').style.display = 'block';
  const state = {q: '', estado: 'Todos', tipo: 'Todos', sel: null};
  const estados = ['Todos', ...Array.from(new Set(P.map(p => p.estado))).sort()];
  const tipos = [['Todos', 'Todos'], ['entrenamiento', 'Rendimiento real'], ['prediccion', 'Predicción']];
  function chips(el, opts, key) {
    el.innerHTML = opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<button class="chip ${state[key] === v ? 'on' : ''}" data-v="${esc(v)}">${esc(l)}</button>`; }).join('');
    el.onclick = e => { const b = e.target.closest('.chip'); if (!b) return;
      state[key] = b.dataset.v; chips(el, opts, key); renderList(); };
  }
  chips($('chipsEstado'), estados, 'estado'); chips($('chipsTipo'), tipos, 'tipo');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function renderList() {
    const q = norm(state.q.trim());
    const r = P.filter(p => (state.estado === 'Todos' || p.estado === state.estado) &&
      (state.tipo === 'Todos' || p.tipo === state.tipo) &&
      (!q || norm(p.id).includes(q) || norm(p.municipio).includes(q)));
    $('count').textContent = r.length + ' parcela(s) encontradas';
    $('list').innerHTML = r.length ? r.map(p => `<div class="item ${state.sel === p.id ? 'sel' : ''}" data-id="${esc(p.id)}">
      <div><strong>${esc(p.id)}</strong><div class="m">${esc(p.municipio)}, ${esc(p.estado)}</div></div>
      <span class="tag ${p.tipo}">${p.tipo === 'entrenamiento' ? 'Real' : 'Predicha'}</span></div>`).join('')
      : '<div class="empty">Sin resultados</div>';
  }
  $('list').onclick = e => { const it = e.target.closest('.item'); if (!it) return;
    state.sel = it.dataset.id; renderList(); renderDetail(); };
  $('q').oninput = e => { state.q = e.target.value; renderList(); };
  function renderDetail() {
    const p = P.find(x => x.id === state.sel); if (!p) return;
    const real = p.rendimiento != null, val = real ? p.rendimiento : p.prediccion;
    const all = P.map(x => x.rendimiento ?? x.prediccion).filter(v => v != null);
    const lo = Math.min(...all), hi = Math.max(...all);
    const pos = Math.max(0, Math.min(100, (val - lo) / (hi - lo || 1) * 100));
    const fact = (l, v) => `<div class="fact"><div class="l">${l}</div><div class="v">${v}</div></div>`;
    $('detail').innerHTML = `<h3>Parcela ${esc(p.id)}</h3>
      <div class="m">${esc(p.municipio)}, ${esc(p.estado)} · <span class="tag ${p.tipo}">${real ? 'Rendimiento real' : 'Rendimiento predicho'}</span></div>
      <div class="big">
        <div class="b"><div class="v">${fmt(val)}</div><div class="m">${real ? 'Real' : 'Estimado'} (t/ha)</div></div>
        ${real && p.prediccion != null ? `<div class="b"><div class="v">${fmt(p.prediccion)}</div><div class="m">Predicción del modelo (t/ha)</div></div>` : ''}
        ${p.superficie_ha != null ? `<div class="b"><div class="v">${fmt(p.superficie_ha, 1)}</div><div class="m">Superficie (ha)</div></div>` : ''}
      </div>
      <div class="facts">${fact('Elevación', fmt(p.elevacion, 0, ' m'))}${fact('Pendiente', fmt(p.pendiente, 1, '°'))}
        ${fact('Orientación', fmt(p.orientacion, 0, '°'))}${fact('Índice de posición topográfica', fmt(p.tpi))}
        ${fact('Grados-día (GDD)', fmt(p.gdd, 0))}${fact('Precipitación del ciclo', fmt(p.precip, 0, ' mm'))}
        ${fact('NDVI máximo 2025', fmt(p.ndvi_max))}${fact('Anomalía NDVI vs 2022-24', fmt(p.ndvi_anom, 3))}</div>
      <div class="gauge"><div class="track"><div class="pin" style="left:calc(${pos}% - 2px)"></div></div>
        <div class="ends"><span>${fmt(lo, 1)} t/ha (mín.)</span><span>Posición entre las ${P.length} parcelas</span><span>${fmt(hi, 1)} t/ha (máx.)</span></div></div>`;
  }
  renderList();
})();
