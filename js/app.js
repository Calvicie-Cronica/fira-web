(function () {
  const D = window.DATOS;
  const $ = id => document.getElementById(id);
  const fmt = (v, d = 2) => Number(v).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = D.metodos;
  const NOM = { LASSO: 'LASSO', RandomForest: 'Random Forest', XGBoost: 'XGBoost', MutualInfo: 'Información mutua', SelectKBest: 'SelectKBest', Correlacion: 'Correlación' };
  const CORTO = { LASSO: 'LASSO', RandomForest: 'RF', XGBoost: 'XGB', MutualInfo: 'MI', SelectKBest: 'KB', Correlacion: 'Corr' };
  const HEX = { LASSO: '#56704a', RandomForest: '#c3a458', XGBoost: '#7b93a6', MutualInfo: '#9b8bae', SelectKBest: '#bb806b', Correlacion: '#8e938a' };
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const G = D.resumen.LASSO;

  const lin = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
  const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; };
  const ticks = (a, b, n = 6) => { const s = niceStep((b - a) / n); const o = []; for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) o.push(+v.toFixed(10)); return o; };
  const quant = (arr, p) => { const s = [...arr].sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

  const tipEl = $('tip');
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tipEl.style.opacity = 0; return; }
    tipEl.innerHTML = t.getAttribute('data-tip');
    tipEl.style.opacity = 1;
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + 250 > window.innerWidth) x = e.clientX - 254;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  });

  /* Portada */
  $('cf-err').textContent = fmt(G.RMSE.media);
  $('cf-mape').textContent = fmt(G.MAPE.media, 1) + ' %';
  $('cinta').innerHTML = MESES.map((m, i) => `<span class="${i >= 3 && i <= 9 ? 'on' : ''}">${m}</span>`).join('');

  /* Ficha técnica */
  const ficha = [
    ['Cultivo', 'Cebada'],
    ['Ciclo evaluado', 'Abril a octubre de 2025'],
    ['Zona de estudio', 'Nueve municipios de Puebla, Hidalgo y Tlaxcala'],
    ['Parcelas', '197: 138 con rendimiento conocido y 59 por estimar'],
    ['Variable estimada', 'Rendimiento por parcela, en toneladas por hectárea (t/ha)'],
    ['Imágenes satelitales', 'Sentinel-2 y Landsat (2022–2025); Planet PRO (2025)'],
    ['Otras fuentes', 'Precipitación y temperaturas mensuales; modelo digital de elevación'],
    ['Registros procesados', '107,666 brutos; 75,925 válidos tras retirar nubosidad total'],
    ['Variables candidatas', `${D.n_candidatas.toLocaleString('es-MX')} por parcela: ${D.n_indices} índices × 4 estadísticos × 12 meses, más superficie y observaciones válidas`],
    ['Variables elegidas', '15 por selector'],
    ['Selector ganador', `LASSO (R² medio ${fmt(G.R2.media)})`],
    ['Modelo de estimación', 'XGBoost: 300 árboles, profundidad 4, tasa de aprendizaje 0.05, submuestreo 0.8'],
    ['Validación', 'Validación cruzada de 5 particiones repetida 1,000 veces (5,000 pruebas por selector)'],
    ['Indicadores', 'R², RMSE, MAE, MAPE, sesgo y correlación'],
    ['Herramientas', 'Python: pandas, scikit-learn y XGBoost']
  ];
  $('ficha-grid').innerHTML = ficha.map(f => `<div class="fila"><div class="k">${f[0]}</div><div class="v">${f[1]}</div></div>`).join('');

  /* Metodología */
  const embudo = [['Registros satelitales', 107666, ''], ['Sin valores (nubosidad de 100 %)', 31741, 'x'], ['Registros válidos', 75925, '']];
  const embudoHtml = `<div class="embudo">${embudo.map(e => `<div class="fila"><div class="nom">${e[0]}</div><div class="pista"><div class="rel ${e[2]}" style="width:${e[1] / 107666 * 100}%"></div></div><div class="val">${e[1].toLocaleString('es-MX')}</div></div>`).join('')}</div>`;
  const sesgoNdvi = `<div class="embudo" style="margin-top:14px"><div class="etiqueta">Desvío del NDVI según la nubosidad</div>
    <div class="fila"><div class="nom">Nubosidad de 0 a 10 %</div><div class="pista"><div class="rel" style="width:${0.022 / 0.109 * 100}%"></div></div><div class="val">−0.022</div></div>
    <div class="fila"><div class="nom">Nubosidad de 70 a 100 %</div><div class="pista"><div class="rel x" style="width:100%"></div></div><div class="val">−0.109</div></div></div>`;
  const pasos = [
    ['Recopilar', 'Reunir imágenes, clima y relieve', `<p>Se reunieron imágenes de Sentinel-2 y Landsat de 2022 a 2025 y del conjunto PRO de Planet de 2025, junto con precipitación y temperaturas mensuales y variables de relieve: elevación, pendiente, orientación e índice de posición topográfica.</p><p>Los polígonos de cada parcela permiten identificarla, asociarla con su municipio y obtener sus características geográficas. En total son 197 parcelas, de las cuales 138 cuentan con rendimiento conocido.</p>`],
    ['Limpiar nubes', 'Retirar registros contaminados', `<p>Se retiraron los 31,741 registros sin valores, asociados con nubosidad total. Con nubosidad parcial, el índice de verdor se subestima de forma creciente, por lo que se fijó un umbral máximo de 20 %, que descarta cerca del 10 % de los registros.</p>${embudoHtml}${sesgoNdvi}<p class="nota" style="margin-top:12px">Ambos satélites se combinaron porque sus huecos por nubes casi nunca coinciden. Ninguna parcela perdió más del 32 % de sus observaciones.</p>`],
    ['Resumir por mes', 'Convertir imágenes en números', `<p>Para cada parcela y cada mes se calcularon el promedio, el mínimo, el máximo y la desviación de ${D.n_indices} índices de vegetación y suelo. Así, cada parcela queda descrita por ${D.n_candidatas.toLocaleString('es-MX')} números que cuentan cómo evolucionó durante el año.</p><p>Ejemplo de nombre de variable: <span class="chip-var">ndvi_promedio_m06</span> significa "promedio del índice NDVI durante junio".</p>`],
    ['Elegir variables', 'De más de mil a quince', `<p>Con solo 138 parcelas y más de mil variables, usarlas todas haría que el modelo memorice en lugar de aprender. Por eso seis selectores eligieron quince variables cada uno:</p><p>${M.map(m => `<span class="chip-var" style="border-color:${HEX[m]}">${NOM[m]}</span>`).join('')}</p>`],
    ['Entrenar y validar', 'Probar con parcelas no vistas', `<p>Con cada lista de quince variables, un modelo XGBoost se evaluó 1,000 veces mediante validación cruzada de cinco particiones: cerca del 80 % de las parcelas se usa para entrenar y el 20 % restante se estima y se compara contra el rendimiento real.</p><p>Las repeticiones usan particiones distintas del azar, lo que permite medir no solo el resultado promedio sino también cuánto varía.</p>`],
    ['Estimar y contrastar', 'Parcelas sin dato y verificación externa', `<p>La mejor combinación, LASSO para elegir variables y XGBoost para estimar, se ajustó con las 138 parcelas para estimar las 59 restantes.</p><p>Como verificación externa, los rendimientos de entrenamiento se compararon con las estadísticas municipales de 2025 del Servicio de Información Agroalimentaria y Pesquera (SIAP) en ocho de los nueve municipios, como referencia de coherencia territorial, pues los promedios municipales y las mediciones por parcela corresponden a escalas distintas.</p>`]
  ];
  let pasoAct = 0;
  function pintaPaso() {
    $('riel').innerHTML = pasos.map((p, i) => `<button class="paso ${i === pasoAct ? 'act' : ''}" data-i="${i}"><span class="n">${i + 1}</span><span class="t">${p[0]}</span></button>`).join('');
    $('panel-paso').innerHTML = `<h3>${pasoAct + 1}. ${pasos[pasoAct][1]}</h3>${pasos[pasoAct][2]}`;
  }
  $('riel').addEventListener('click', e => { const b = e.target.closest('.paso'); if (!b) return; pasoAct = +b.dataset.i; pintaPaso(); });
  pintaPaso();

  /* Métricas */
  const kp = [
    [fmt(G.R2.media), 'Parte de la variación explicada', `El modelo explica cerca de ${fmt(G.R2.media * 100, 0)} % de las diferencias de rendimiento entre parcelas.`],
    [fmt(G.RMSE.media) + ' t/ha', 'Error típico (RMSE)', 'Distancia habitual entre lo estimado y lo real; los errores grandes pesan más.'],
    [fmt(G.MAE.media) + ' t/ha', 'Error promedio (MAE)', 'Diferencia media, sin importar el signo, entre lo estimado y lo real.'],
    [fmt(G.MAPE.media, 1) + ' %', 'Desviación relativa (MAPE)', `En promedio, la estimación se aparta cerca de ${fmt(G.MAPE.media, 0)} % del valor real.`],
    [fmt(G.Corr.media), 'Correlación', 'Las parcelas que rinden más tienden a recibir estimaciones más altas.'],
    [fmt(G.Sesgo.media, 3) + ' t/ha', 'Sesgo', 'Prácticamente sin tendencia a sobrestimar ni a subestimar.']
  ];
  $('kpis').innerHTML = kp.map(k => `<div class="tarjeta kpi"><div class="n">${k[0]}</div><div class="t">${k[1]}</div><p>${k[2]}</p></div>`).join('');

  const METS = [
    ['R2', 'R²', 'mayor', 'El R² indica qué parte de la variación entre parcelas explica el modelo. Mayor es mejor.', 2],
    ['RMSE', 'Error típico', 'menor', 'Error típico en t/ha. Menor es mejor.', 3],
    ['MAE', 'Error promedio', 'menor', 'Error promedio en t/ha, sin signo. Menor es mejor.', 3],
    ['MAPE', 'Desviación %', 'menor', 'Desviación relativa media, en porcentaje. Menor es mejor.', 1],
    ['Corr', 'Correlación', 'mayor', 'Correlación entre lo estimado y lo real. Mayor es mejor.', 3],
    ['Sesgo', 'Sesgo', 'cero', 'Sesgo medio en t/ha; lo mejor es estar cerca de cero. Se muestra su valor absoluto.', 4]
  ];
  let metAct = 'R2';
  function pintaMetodos() {
    $('tabs-metrica').innerHTML = METS.map(m => `<button class="pestana ${m[0] === metAct ? 'act' : ''}" data-k="${m[0]}">${m[1]}</button>`).join('');
    const info = METS.find(m => m[0] === metAct);
    const val = m => metAct === 'Sesgo' ? Math.abs(D.resumen[m][metAct].media) : D.resumen[m][metAct].media;
    const orden = [...M].sort((a, b) => info[2] === 'mayor' ? val(b) - val(a) : val(a) - val(b));
    const mx = Math.max(...M.map(m => metAct === 'Sesgo' ? Math.abs(D.resumen[m].Sesgo.media) : D.resumen[m][metAct].hi)) * 1.08;
    $('barras-metodo').innerHTML = orden.map((m, i) => {
      const r = D.resumen[m][metAct];
      const w = val(m) / mx * 100;
      const ic = metAct === 'Sesgo' ? '' : `<div class="ic" style="left:${r.lo / mx * 100}%;width:${Math.max(0.6, (r.hi - r.lo) / mx * 100)}%"><i></i></div>`;
      const tip = `<b>${NOM[m]}</b><br>Media: ${fmt(r.media, info[4])}<br>Desviación: ${fmt(r.sd, info[4])}<br>P05 a P95: ${fmt(r.p05, info[4])} a ${fmt(r.p95, info[4])}<br>IC 95 %: ${fmt(r.lo, info[4])} a ${fmt(r.hi, info[4])}`;
      return `<div class="barra-m ${i === 0 ? 'mejor' : ''}" data-tip="${esc(tip)}"><div class="nom">${NOM[m]}${i === 0 ? '<span class="sello-mejor">mejor</span>' : ''}</div><div class="pista"><div class="rel" style="width:${w}%;background:${HEX[m]}"></div>${ic}</div><div class="val">${fmt(D.resumen[m][metAct].media, info[4])}</div></div>`;
    }).join('');
    $('nota-metrica').textContent = info[3] + ' La línea negra de cada barra marca el intervalo de confianza de 95 %.';
  }
  $('tabs-metrica').addEventListener('click', e => { const b = e.target.closest('.pestana'); if (!b) return; metAct = b.dataset.k; pintaMetodos(); });
  pintaMetodos();

  const sim = $('sim-rango');
  function pintaSim() {
    const v = +sim.value, r = G.RMSE.media;
    $('sim-val').textContent = fmt(v, 2);
    const pc = x => Math.max(0, Math.min(100, (x - 2) / 4 * 100));
    $('sim-banda').style.left = pc(v - r) + '%';
    $('sim-banda').style.width = (pc(v + r) - pc(v - r)) + '%';
    $('sim-pto').style.left = `calc(${pc(v)}% - 2px)`;
    const rel = v * G.MAPE.media / 100;
    $('sim-txt').innerHTML = `Una estimación de <b>${fmt(v, 2)} t/ha</b> implica, de forma típica, un rendimiento real entre <b>${fmt(v - r, 1)} y ${fmt(v + r, 1)} t/ha</b>. Medido como desviación relativa media, la diferencia sería de unas ${fmt(rel, 2)} t/ha a este nivel.`;
  }
  sim.addEventListener('input', pintaSim); pintaSim();

  const cols = [['R2', 'R²', 3], ['RMSE', 'RMSE', 3], ['MAE', 'MAE', 3], ['MedAE', 'MedAE', 3], ['MAPE', 'MAPE %', 2], ['Corr', 'Corr.', 3], ['Sesgo', 'Sesgo', 4]];
  $('tabla-completa').innerHTML = `<tr><th>Selector</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>R² P05 a P95</th></tr>` +
    M.map((m, i) => `<tr class="${i === 0 ? 'mejor' : ''}"><td>${NOM[m]}</td>${cols.map(c => `<td>${fmt(D.resumen[m][c[0]].media, c[2])}</td>`).join('')}<td>${fmt(D.resumen[m].R2.p05)} a ${fmt(D.resumen[m].R2.p95)}</td></tr>`).join('');

  /* Variable clave */
  const re = /^(.+)_(max|min|promedio|std)_m(\d\d)$/;
  const info = {};
  M.forEach(m => D.caract[m].forEach(f => {
    if (!info[f]) { const x = re.exec(f); info[f] = { f, metodos: [], indice: x ? x[1] : f, stat: x ? x[2] : null, mes: x ? +x[3] : null }; }
    info[f].metodos.push(m);
  }));
  const feats = Object.values(info).sort((a, b) => b.metodos.length - a.metodos.length || a.f.localeCompare(b.f));
  const maxC = feats[0].metodos.length;
  const top = feats.filter(f => f.metodos.length === maxC);
  const casi = feats.filter(f => f.metodos.length === maxC - 1);
  const porMes = Array.from({ length: 12 }, () => ({}));
  let totMes = 0;
  M.forEach(m => D.caract[m].forEach(f => { const x = info[f]; if (x.mes) { porMes[x.mes - 1][m] = (porMes[x.mes - 1][m] || 0) + 1; totMes++; } }));
  const cntMes = porMes.map(o => Object.values(o).reduce((a, b) => a + b, 0));
  const mesTop = cntMes.indexOf(Math.max(...cntMes));
  const stats = {}; M.forEach(m => D.caract[m].forEach(f => { const s = info[f].stat; if (s) stats[s] = (stats[s] || 0) + 1; }));
  const STAT_N = { min: 'valor mínimo del mes', promedio: 'promedio del mes', max: 'valor máximo del mes', std: 'variación dentro del mes' };
  const statTop = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
  const nom = f => { const x = info[f]; return x.mes ? `${STAT_N[x.stat]} del índice ${x.indice.toUpperCase()} en ${MESES_L[x.mes - 1]}` : f; };
  $('clave-dest').innerHTML = `<div class="etiqueta">Hallazgo principal</div>
    <div class="gran">${top.map(t => `<span class="chip-var">${t.f}</span>`).join('')} fue elegida por ${maxC} de los 6 selectores.</div>
    <p style="margin-top:10px">Corresponde al ${nom(top[0].f)}. ${casi.length ? `Le sigue ${casi.map(c => `<span class="chip-var">${c.f}</span>`).join('')} con ${maxC - 1} selectores.` : ''}</p>
    <p>${MESES_L[mesTop][0].toUpperCase() + MESES_L[mesTop].slice(1)} reúne ${cntMes[mesTop]} de las ${totMes} elecciones por mes (${fmt(cntMes[mesTop] / totMes * 100, 0)} %). Entre los estadísticos, el más frecuente es el ${STAT_N[statTop[0]]} (${statTop[1]} de ${Object.values(stats).reduce((a, b) => a + b, 0)}).</p>`;

  let mesAct = mesTop;
  const maxMes = Math.max(...cntMes);
  function pintaMeses() {
    $('meses').innerHTML = cntMes.map((c, i) => {
      const seg = M.filter(m => porMes[i][m]).map(m => `<i style="height:${porMes[i][m] / maxMes * 92}px;background:${HEX[m]}"></i>`).join('');
      return `<button class="mes-btn ${i >= 3 && i <= 9 ? 'ciclo' : ''} ${i === mesAct ? 'act' : ''}" data-i="${i}"><span class="cnt">${c || ''}</span><span class="col">${seg}</span><span class="lbl">${MESES[i]}</span></button>`;
    }).join('');
    const lista = feats.filter(f => f.mes === mesAct + 1);
    $('mes-detalle').innerHTML = `<div class="etiqueta">${MESES_L[mesAct]}: ${lista.length} variable(s)</div>` + (lista.length ?
      lista.map(f => `<div style="margin:4px 0"><span class="chip-var">${f.f}</span> ${f.metodos.map(m => `<span title="${NOM[m]}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${HEX[m]};margin-right:2px"></span>`).join('')}</div>`).join('') :
      '<p class="nota">Ningún selector eligió variables de este mes.</p>') + `<div class="leyenda" style="margin-top:8px">${M.map(m => `<span class="nota"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${HEX[m]}"></i> ${NOM[m]}</span>`).join('')}</div>`;
  }
  $('meses').addEventListener('click', e => { const b = e.target.closest('.mes-btn'); if (!b) return; mesAct = +b.dataset.i; pintaMeses(); });
  pintaMeses();

  const DESC = {
    ndvi: 'NDVI: mide qué tan verde y vigorosa se ve la vegetación.',
    savi: 'SAVI: similar al NDVI, pero corrige el efecto del suelo visible entre las plantas.',
    evi: 'EVI: índice de vegetación mejorado; distingue mejor los cultivos densos y reduce efectos de la atmósfera.',
    lai: 'LAI: índice de área foliar; cuánta superficie de hojas hay por cada metro cuadrado de suelo.',
    fapar: 'FAPAR: fracción de la luz útil para la fotosíntesis que absorbe el cultivo.',
    ndwi: 'NDWI: contenido de agua en la vegetación.',
    ndti: 'NDTI: índice de labranza; sensible a los residuos de cultivo y al estado del suelo.',
    sti: 'STI: índice de labranza simple; contrasta bandas del infrarrojo de onda corta y es sensible al suelo y a los residuos.',
    dswi: 'DSWI: familia de índices ligados al estrés hídrico y a la sanidad de la vegetación.',
    nddi: 'NDDI: índice de sequía; combina verdor y contenido de agua.',
    ndsvi: 'NDSVI: resalta la vegetación seca o senescente frente al suelo.',
    AREA_HA: 'Superficie de la parcela, en hectáreas.',
    n_obs_validas: 'Número de observaciones satelitales válidas de la parcela.'
  };
  const descr = k => DESC[k] || (k.startsWith('dswi') ? DESC.dswi : `${k.toUpperCase()}: índice espectral complementario, calculado a partir de las bandas del satélite.`);
  const porInd = {};
  M.forEach(m => D.caract[m].forEach(f => { const k = info[f].indice; (porInd[k] = porInd[k] || {}); porInd[k][m] = (porInd[k][m] || 0) + 1; }));
  const indOrden = Object.keys(porInd).sort((a, b) => Object.values(porInd[b]).reduce((x, y) => x + y, 0) - Object.values(porInd[a]).reduce((x, y) => x + y, 0));
  const maxInd = Object.values(porInd[indOrden[0]]).reduce((x, y) => x + y, 0);
  let indAct = indOrden[0];
  function pintaIndices() {
    $('indices').innerHTML = indOrden.map(k => {
      const t = Object.values(porInd[k]).reduce((x, y) => x + y, 0);
      return `<div class="hbar ${k === indAct ? 'act' : ''}" data-k="${k}"><div class="nom">${esc(k.replace('n_obs_validas', 'obs.').replace('AREA_HA', 'área'))}</div><div class="pista">${M.filter(m => porInd[k][m]).map(m => `<i style="width:${porInd[k][m] / maxInd * 100}%;background:${HEX[m]}"></i>`).join('')}</div><div class="val">${t}</div></div>`;
    }).join('');
    $('indice-detalle').textContent = descr(indAct);
  }
  $('indices').addEventListener('click', e => { const b = e.target.closest('.hbar'); if (!b) return; indAct = b.dataset.k; pintaIndices(); });
  pintaIndices();

  $('matriz').innerHTML = `<table><tr><th style="text-align:left;padding-left:8px">Variable</th>${M.map(m => `<th style="color:${HEX[m]}">${CORTO[m]}</th>`).join('')}<th>N.º</th></tr>` +
    feats.map(f => `<tr><td class="v">${f.f}</td>${M.map(m => `<td class="c" ${f.metodos.includes(m) ? `data-tip="${esc(NOM[m] + ': elegida')}"` : ''}>${f.metodos.includes(m) ? `<i style="background:${HEX[m]}"></i>` : ''}</td>`).join('')}<td><b>${f.metodos.length}</b></td></tr>`).join('') + '</table>';

  /* Gráficas */
  const vis = {}; M.forEach(m => vis[m] = true);
  const visibles = () => M.filter(m => vis[m]);
  $('leyenda').innerHTML = M.map(m => `<label><input type="checkbox" data-m="${m}" checked><i style="background:${HEX[m]}"></i>${NOM[m]}</label>`).join('');
  const W = 900, H = 400, mg = { l: 58, r: 18, t: 14, b: 44 };
  const frame = (xs, ys, xt, yt, xl, yl, fx, fy) => {
    let s = '';
    yt.forEach(v => { s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${ys(v)}" y2="${ys(v)}" stroke="#e6dfcd"/><text x="${mg.l - 8}" y="${ys(v) + 4}" font-size="12" text-anchor="end">${fy(v)}</text>`; });
    xt.forEach(v => { s += `<text x="${xs(v)}" y="${H - mg.b + 18}" font-size="12" text-anchor="middle">${fx(v)}</text>`; });
    s += `<line x1="${mg.l}" x2="${W - mg.r}" y1="${H - mg.b}" y2="${H - mg.b}" stroke="#b9b29c"/>`;
    s += `<text x="${(mg.l + W - mg.r) / 2}" y="${H - 6}" font-size="12.5" text-anchor="middle">${xl}</text>`;
    s += `<text x="14" y="${(mg.t + H - mg.b) / 2}" font-size="12.5" text-anchor="middle" transform="rotate(-90 14 ${(mg.t + H - mg.b) / 2})">${yl}</text>`;
    return s;
  };
  const svgWrap = (inner, h = H) => `<svg viewBox="0 0 ${W} ${h}" role="img">${inner}</svg>`;
  const RUN = (m, k) => D.corridas[m][k];
  const rango = (k, vs) => { const all = vs.flatMap(m => RUN(m, k)); return [Math.min(...all), Math.max(...all)]; };
  const mejorOtro = M.filter(m => m !== 'LASSO').sort((a, b) => D.resumen[b].R2.media - D.resumen[a].R2.media)[0];
  const gana = (a, b) => { const x = RUN(a, 'R2'), y = RUN(b, 'R2'); let n = 0; for (let i = 0; i < x.length; i++) if (x[i] > y[i]) n++; return n / x.length * 100; };

  let metG = 'R2';
  const subTabs = () => `<div class="pestanas">${[['R2', 'R²'], ['RMSE', 'Error típico'], ['MAE', 'Error promedio']].map(k => `<button class="pestana ${metG === k[0] ? 'act' : ''}" data-sub="${k[0]}">${k[1]}</button>`).join('')}</div>`;

  function gCaja() {
    const vs = visibles(), k = metG, d = k === 'R2' ? 3 : 3;
    const [a, b] = rango(k, M), pad = (b - a) * 0.06;
    const ys = lin(a - pad, b + pad, H - mg.b, mg.t), yt = ticks(a - pad, b + pad, 7);
    const bw = (W - mg.l - mg.r) / vs.length;
    let s = frame(() => 0, ys, [], yt, '', k === 'R2' ? 'R² por repetición' : k === 'RMSE' ? 'Error típico (t/ha)' : 'Error promedio (t/ha)', v => v, v => fmt(v, 2));
    vs.forEach((m, i) => {
      const arr = RUN(m, k), q1 = quant(arr, .25), q2 = quant(arr, .5), q3 = quant(arr, .75), iq = q3 - q1;
      const lo = Math.min(...arr.filter(x => x >= q1 - 1.5 * iq)), hi = Math.max(...arr.filter(x => x <= q3 + 1.5 * iq));
      const cx = mg.l + bw * (i + .5), w = Math.min(70, bw * .5);
      const tip = `<b>${NOM[m]}</b><br>Mediana: ${fmt(q2, d)}<br>Mitad central: ${fmt(q1, d)} a ${fmt(q3, d)}<br>Extremos habituales: ${fmt(lo, d)} a ${fmt(hi, d)}`;
      s += `<g data-tip="${esc(tip)}"><line x1="${cx}" x2="${cx}" y1="${ys(lo)}" y2="${ys(hi)}" stroke="#4a4d40"/><line x1="${cx - w / 4}" x2="${cx + w / 4}" y1="${ys(lo)}" y2="${ys(lo)}" stroke="#4a4d40"/><line x1="${cx - w / 4}" x2="${cx + w / 4}" y1="${ys(hi)}" y2="${ys(hi)}" stroke="#4a4d40"/><rect x="${cx - w / 2}" y="${ys(q3)}" width="${w}" height="${ys(q1) - ys(q3)}" fill="${HEX[m]}" fill-opacity=".8" stroke="#4a4d40"/><line x1="${cx - w / 2}" x2="${cx + w / 2}" y1="${ys(q2)}" y2="${ys(q2)}" stroke="#2b2f26" stroke-width="2"/><rect x="${cx - bw / 2}" y="${mg.t}" width="${bw}" height="${H - mg.b - mg.t}" fill="transparent"/></g>`;
      s += `<text x="${cx}" y="${H - mg.b + 18}" font-size="12" text-anchor="middle">${NOM[m]}</text>`;
    });
    const med = vs.map(m => [m, quant(RUN(m, k), .5)]).sort((x, y) => k === 'R2' ? y[1] - x[1] : x[1] - y[1]);
    const nota = med.length > 1 ? `Mejor mediana: <b>${NOM[med[0][0]]}</b> (${fmt(med[0][1], d)}); la menos favorable: ${NOM[med[med.length - 1][0]]} (${fmt(med[med.length - 1][1], d)}).` : '';
    return [subTabs() + svgWrap(s), 'La caja reúne el 50 % central de las 1,000 repeticiones; la línea interior es la mediana y los bigotes, los extremos habituales. Cajas más bajas y compactas indican resultados más estables.', nota];
  }

  function gHist() {
    const vs = visibles(), a = 0.14, b = 0.68, st = 0.01, nb = Math.round((b - a) / st);
    const cnt = {}; let ymax = 1;
    vs.forEach(m => { const c = new Array(nb).fill(0); RUN(m, 'R2').forEach(v => { const i = Math.min(nb - 1, Math.max(0, Math.floor((v - a) / st))); c[i]++; }); cnt[m] = c; ymax = Math.max(ymax, ...c); });
    const xs = lin(a, b, mg.l, W - mg.r), ys = lin(0, ymax * 1.08, H - mg.b, mg.t);
    let s = frame(xs, ys, ticks(a, b, 9), ticks(0, ymax, 6), 'R² de cada repetición', 'Número de repeticiones', v => fmt(v, 2), v => v);
    vs.forEach(m => cnt[m].forEach((c, i) => { if (c) s += `<rect x="${xs(a + i * st)}" y="${ys(c)}" width="${xs(a + st) - xs(a) - 0.5}" height="${H - mg.b - ys(c)}" fill="${HEX[m]}" fill-opacity=".45" data-tip="${esc(NOM[m] + '<br>R² de ' + fmt(a + i * st, 2) + ' a ' + fmt(a + (i + 1) * st, 2) + ': ' + c + ' repeticiones')}"/>`; }));
    return [svgWrap(s), 'Cada barra cuenta cuántas repeticiones dieron un R² dentro de ese tramo. Las formas más a la derecha indican mejor desempeño y las más angostas, mayor estabilidad.',
      `Con las mismas particiones para ambos, LASSO supera a ${NOM[mejorOtro]} en <b>${fmt(gana('LASSO', mejorOtro), 0)} %</b> de las 1,000 repeticiones.`];
  }

  function gEstab() {
    const vs = visibles(), n = RUN('LASSO', 'R2').length;
    const acc = {}; let lo = 1, hi = 0;
    M.forEach(m => { let t = 0; acc[m] = RUN(m, 'R2').map((v, i) => (t += v) / (i + 1)); acc[m].slice(5).forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); }); });
    const xs = lin(1, n, mg.l, W - mg.r), ys = lin(lo - .01, hi + .01, H - mg.b, mg.t);
    let s = frame(xs, ys, ticks(0, n, 5).filter(v => v > 0), ticks(lo, hi, 6), 'Número de repeticiones', 'R² promedio acumulado', v => v, v => fmt(v, 2));
    vs.forEach(m => { s += `<polyline fill="none" stroke="${HEX[m]}" stroke-width="2" points="${acc[m].map((v, i) => `${xs(i + 1).toFixed(1)},${ys(v).toFixed(1)}`).join(' ')}" data-tip="${esc(NOM[m] + ': R² acumulado final ' + fmt(acc[m][n - 1], 3))}"/>`; });
    const t = acc.LASSO.slice(199), v = Math.max(...t) - Math.min(...t);
    return [svgWrap(s), 'Cada línea es el R² promedio acumulado hasta esa repetición. Cuando la línea se aplana, repetir más veces ya no cambia el resultado.',
      `Entre la repetición 200 y la 1,000, el promedio acumulado de LASSO varió solo <b>${fmt(v, 3)}</b>: el resultado es estable.`];
  }

  function gDisp() {
    const vs = visibles(), [x0, x1] = rango('RMSE', M), [y0, y1] = rango('R2', M);
    const xs = lin(x0 - .01, x1 + .01, mg.l, W - mg.r), ys = lin(y0 - .02, y1 + .02, H - mg.b, mg.t);
    let s = frame(xs, ys, ticks(x0, x1, 8), ticks(y0, y1, 7), 'Error típico de la repetición (t/ha)', 'R² de la repetición', v => fmt(v, 2), v => fmt(v, 2));
    vs.forEach(m => { const x = RUN(m, 'RMSE'), y = RUN(m, 'R2'); s += `<g fill="${HEX[m]}" fill-opacity=".38">${x.map((v, i) => `<circle cx="${xs(v).toFixed(1)}" cy="${ys(y[i]).toFixed(1)}" r="2.6"/>`).join('')}</g>`; });
    const r = G.RMSE;
    return [svgWrap(s), 'Cada punto es una repetición. Hacia arriba y a la izquierda están los mejores resultados. R² y error típico se mueven juntos: son dos formas de ver el mismo ajuste.',
      `El error típico de LASSO queda entre <b>${fmt(r.p05, 2)} y ${fmt(r.p95, 2)} t/ha</b> en el 90 % de las repeticiones.`];
  }

  function gSesgo() {
    const vs = visibles(), a = -0.09, b = 0.075, st = 0.005, nb = Math.round((b - a) / st);
    const cnt = {}; let ymax = 1;
    vs.forEach(m => { const c = new Array(nb).fill(0); RUN(m, 'Sesgo').forEach(v => { const i = Math.min(nb - 1, Math.max(0, Math.floor((v - a) / st))); c[i]++; }); cnt[m] = c; ymax = Math.max(ymax, ...c); });
    const xs = lin(a, b, mg.l, W - mg.r), ys = lin(0, ymax * 1.1, H - mg.b, mg.t);
    let s = frame(xs, ys, ticks(a, b, 8), ticks(0, ymax, 6), 'Sesgo de la repetición (t/ha)', 'Número de repeticiones', v => fmt(v, 2), v => v);
    vs.forEach(m => cnt[m].forEach((c, i) => { if (c) s += `<rect x="${xs(a + i * st)}" y="${ys(c)}" width="${xs(a + st) - xs(a) - 0.5}" height="${H - mg.b - ys(c)}" fill="${HEX[m]}" fill-opacity=".45" data-tip="${esc(NOM[m] + '<br>' + c + ' repeticiones')}"/>`; }));
    s += `<line x1="${xs(0)}" x2="${xs(0)}" y1="${mg.t}" y2="${H - mg.b}" stroke="#2b2f26" stroke-width="1.6"/>`;
    const mxs = Math.max(...M.map(m => Math.abs(D.resumen[m].Sesgo.media)));
    return [svgWrap(s), 'El sesgo es el promedio de (estimado − real). Cero significa que no hay tendencia a sobrestimar ni a subestimar; la línea negra marca ese punto.',
      `El sesgo medio de todos los selectores queda a menos de <b>${fmt(Math.ceil(mxs * 100) / 100, 2)} t/ha</b> de cero; el de LASSO es ${fmt(G.Sesgo.media, 3)} t/ha.`];
  }

  function gFold() {
    const vs = visibles(), ys = lin(0, .7, H - mg.b, mg.t), gw = (W - mg.l - mg.r) / 5;
    let s = frame(() => 0, ys, [], ticks(0, .7, 7), '', 'R² medio de la partición', v => v, v => fmt(v, 1));
    for (let f = 0; f < 5; f++) {
      const bw = Math.min(26, (gw * .8) / Math.max(1, vs.length));
      vs.forEach((m, i) => {
        const v = D.folds[m].por_fold[f], x = mg.l + gw * f + (gw - bw * vs.length) / 2 + bw * i;
        s += `<rect x="${x}" y="${ys(v)}" width="${bw - 1}" height="${H - mg.b - ys(v)}" fill="${HEX[m]}" data-tip="${esc(NOM[m] + '<br>Partición ' + (f + 1) + ': R² medio ' + fmt(v, 3))}"/>`;
      });
      s += `<text x="${mg.l + gw * (f + .5)}" y="${H - mg.b + 18}" font-size="12" text-anchor="middle">Partición ${f + 1}</text>`;
    }
    let primero = 0;
    for (let f = 0; f < 5; f++) { const mejor = [...M].sort((a, b) => D.folds[b].por_fold[f] - D.folds[a].por_fold[f])[0]; if (mejor === 'LASSO') primero++; }
    const q = D.folds.LASSO.q;
    return [svgWrap(s), 'Cada grupo de barras es una de las cinco particiones de la validación cruzada; la altura es el R² promedio de las 1,000 repeticiones. Sirve para comprobar que el resultado no depende de una partición en particular.',
      `LASSO encabeza ${primero === 5 ? 'las cinco particiones' : primero + ' de las 5 particiones'}. En las 5,000 pruebas individuales, el R² de LASSO va de ${fmt(q[0], 2)} a ${fmt(q[4], 2)} en el 90 % central, por lo que una prueba aislada puede variar bastante.`];
  }

  const FIGS = [['caja', 'Variación por repetición', gCaja], ['hist', 'Histograma de R²', gHist], ['estab', 'Estabilidad', gEstab], ['disp', 'R² frente a error', gDisp], ['sesgo', 'Sesgo', gSesgo], ['fold', 'Por partición', gFold]];
  let figAct = 'caja';
  function pintaGraf() {
    $('tabs-graf').innerHTML = FIGS.map(f => `<button class="pestana ${f[0] === figAct ? 'act' : ''}" data-f="${f[0]}">${f[1]}</button>`).join('');
    const [svg, lee, hall] = FIGS.find(f => f[0] === figAct)[2]();
    $('graf').innerHTML = svg;
    $('graf-nota').innerHTML = `<b>Cómo leerla.</b> ${lee}${hall ? `<br><b>Qué muestra.</b> ${hall}` : ''}`;
  }
  $('tabs-graf').addEventListener('click', e => { const b = e.target.closest('.pestana'); if (!b) return; figAct = b.dataset.f; pintaGraf(); });
  $('graf').addEventListener('click', e => { const b = e.target.closest('[data-sub]'); if (!b) return; metG = b.dataset.sub; pintaGraf(); });
  $('leyenda').addEventListener('change', e => { vis[e.target.dataset.m] = e.target.checked; if (!visibles().length) { vis[e.target.dataset.m] = true; e.target.checked = true; } pintaGraf(); });
  pintaGraf();

  /* Parcelas */
  const P = D.parcelas;
  const ord = [...P].sort((a, b) => a.pred - b.pred);
  const t1 = ord[Math.floor(P.length / 3)].pred, t2 = ord[Math.floor(P.length * 2 / 3)].pred;
  const nivel = p => p.pred < t1 ? 'bajo' : p.pred < t2 ? 'medio' : 'alto';
  const NIV = { bajo: ['Rendimiento bajo', '#bb806b'], medio: ['Rendimiento medio', '#c3a458'], alto: ['Rendimiento alto', '#56704a'] };
  const rank = {}; [...P].sort((a, b) => b.pred - a.pred).forEach((p, i) => rank[p.id] = i + 1);
  const pMin = ord[0].pred, pMax = ord[ord.length - 1].pred;
  const st = { q: '', orden: 'id', nivel: 'todos', sel: null, ix: 'ndvi' };

  function pintaTira() {
    const w = 900, h = 170, l = 20, r = 20, xs = lin(pMin - .05, pMax + .05, l, w - r);
    let s = '';
    ticks(pMin, pMax, 8).forEach(v => { s += `<line x1="${xs(v)}" x2="${xs(v)}" y1="14" y2="${h - 34}" stroke="#e6dfcd"/><text x="${xs(v)}" y="${h - 14}" font-size="12" text-anchor="middle">${fmt(v, 1)}</text>`; });
    [t1, t2].forEach(v => { s += `<line x1="${xs(v)}" x2="${xs(v)}" y1="8" y2="${h - 34}" stroke="#8a6f4d" stroke-dasharray="4 4"/>`; });
    s += `<text x="${(xs(pMin) + xs(t1)) / 2}" y="${h - 1}" font-size="12" text-anchor="middle">bajo</text><text x="${(xs(t1) + xs(t2)) / 2}" y="${h - 1}" font-size="12" text-anchor="middle">medio</text><text x="${(xs(t2) + xs(pMax)) / 2}" y="${h - 1}" font-size="12" text-anchor="middle">alto</text>`;
    ord.forEach((p, i) => {
      const sel = p.id === st.sel, c = NIV[nivel(p)][1];
      s += `<circle data-id="${p.id}" cx="${xs(p.pred)}" cy="${28 + (i % 5) * 20}" r="${sel ? 8 : 6}" fill="${c}" fill-opacity="${sel ? 1 : .75}" stroke="${sel ? '#2b2f26' : '#fff'}" stroke-width="${sel ? 2.5 : 1}" style="cursor:pointer" data-tip="${esc(p.id + '<br>' + fmt(p.pred, 2) + ' t/ha')}"/>`;
    });
    $('tira').innerHTML = `<svg viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }
  $('tira').addEventListener('click', e => { const c = e.target.closest('[data-id]'); if (!c) return; seleccionar(c.dataset.id, true); });

  function lista() {
    let a = P.filter(p => (st.nivel === 'todos' || nivel(p) === st.nivel) && p.id.toLowerCase().includes(st.q.toLowerCase().trim()));
    const o = st.orden;
    a.sort((x, y) => o === 'id' ? x.id.localeCompare(y.id) : o === 'pred-d' ? y.pred - x.pred : o === 'pred-a' ? x.pred - y.pred : y.area - x.area);
    $('cuenta').textContent = a.length + ' de ' + P.length + ' parcelas';
    $('lista').innerHTML = a.length ? a.map(p => `<div class="item ${p.id === st.sel ? 'sel' : ''}" data-id="${p.id}"><div><b style="font-family:ui-monospace,Consolas,monospace">${p.id}</b><br><small>${fmt(p.area, 1)} ha</small></div><div style="text-align:right"><b>${fmt(p.pred, 2)} t/ha</b><br><small style="color:${NIV[nivel(p)][1]}">${NIV[nivel(p)][0]}</small></div></div>`).join('') : '<div class="vacio">Sin coincidencias</div>';
  }
  $('q').addEventListener('input', e => { st.q = e.target.value; lista(); });
  $('orden').addEventListener('change', e => { st.orden = e.target.value; lista(); });
  $('nivel').addEventListener('change', e => { st.nivel = e.target.value; lista(); });
  $('lista').addEventListener('click', e => { const it = e.target.closest('.item'); if (it) seleccionar(it.dataset.id, false); });

  const IX = [['ndvi', 'NDVI', 'verdor y vigor de la vegetación'], ['savi', 'SAVI', 'verdor con corrección del suelo'], ['evi', 'EVI', 'vegetación densa, con corrección atmosférica'], ['lai', 'LAI', 'superficie de hojas por metro cuadrado']];
  function curva(p) {
    const w = 700, h = 270, l = 50, r = 14, t = 14, b = 34, a = p[st.ix], m = D.media[st.ix];
    const all = a.concat(m), lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * .12 || .05;
    const xs = lin(1, 12, l + 14, w - r - 14), ys = lin(lo - pad, hi + pad, h - b, t);
    let s = `<rect x="${xs(4) - 14}" y="${t}" width="${xs(10) - xs(4) + 28}" height="${h - b - t}" fill="#dfe7d4" fill-opacity=".6"/>`;
    ticks(lo - pad, hi + pad, 5).forEach(v => { s += `<line x1="${l}" x2="${w - r}" y1="${ys(v)}" y2="${ys(v)}" stroke="#e6dfcd"/><text x="${l - 6}" y="${ys(v) + 4}" font-size="11" text-anchor="end">${fmt(v, st.ix === 'lai' ? 1 : 2)}</text>`; });
    MESES.forEach((n, i) => { s += `<text x="${xs(i + 1)}" y="${h - 12}" font-size="11" text-anchor="middle">${n}</text>`; });
    s += `<polyline fill="none" stroke="#8e938a" stroke-width="2" stroke-dasharray="5 4" points="${m.map((v, i) => `${xs(i + 1)},${ys(v)}`).join(' ')}"/>`;
    s += `<polyline fill="none" stroke="#56704a" stroke-width="3" points="${a.map((v, i) => `${xs(i + 1)},${ys(v)}`).join(' ')}"/>`;
    a.forEach((v, i) => { s += `<circle cx="${xs(i + 1)}" cy="${ys(v)}" r="5" fill="#56704a" stroke="#fff" stroke-width="1.5" data-tip="${esc(MESES_L[i][0].toUpperCase() + MESES_L[i].slice(1) + '<br>Parcela: ' + fmt(v, 3) + '<br>Promedio de las 59: ' + fmt(m[i], 3))}"/>`; });
    return `<svg viewBox="0 0 ${w} ${h}">${s}</svg>`;
  }
  function fichaParcela() {
    const p = P.find(x => x.id === st.sel); if (!p) return;
    const nv = nivel(p), r = G.RMSE.media, pos = (p.pred - pMin) / (pMax - pMin) * 100, ixi = IX.find(i => i[0] === st.ix);
    $('ficha-parcela').innerHTML = `
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><h3 style="font-size:1.5rem">Parcela ${p.id}</h3><span class="etiq-nivel" style="background:${NIV[nv][1]};margin:0">${NIV[nv][0]}</span></div>
      <div class="etiqueta" style="margin-top:14px">Rendimiento estimado</div>
      <div class="gran-num">${fmt(p.pred, 2)} <span style="font-size:1.05rem">t/ha</span></div>
      <p class="nota" style="margin-top:6px">Margen típico del modelo: de ${fmt(p.pred - r, 1)} a ${fmt(p.pred + r, 1)} t/ha.</p>
      <div class="mini">
        <div><div class="k">Superficie</div><div class="v">${fmt(p.area, 2)} ha</div></div>
        <div><div class="k">Producción estimada</div><div class="v">≈ ${fmt(p.pred * p.area, 1)} t</div></div>
        <div><div class="k">Observaciones válidas</div><div class="v">${p.obs}</div></div>
        <div><div class="k">Posición</div><div class="v">${rank[p.id]} de ${P.length}</div></div>
      </div>
      <div class="etiqueta">Ubicación entre las 59 parcelas</div>
      <div class="rango-vis" style="background:linear-gradient(90deg,#e6cfc6,#f1e8cc,#cfdcc3);margin:14px 0 4px"><div class="pto" style="left:calc(${pos}% - 2px)"></div></div>
      <div class="rango-ej"><span>${fmt(pMin, 1)} t/ha</span><span>${fmt(pMax, 1)} t/ha</span></div>
      <div class="etiqueta" style="margin-top:18px">Cómo se vio el cultivo mes a mes</div>
      <div class="pestanas" style="margin-top:6px" id="tabs-ix">${IX.map(i => `<button class="pestana ${i[0] === st.ix ? 'act' : ''}" data-ix="${i[0]}">${i[1]}</button>`).join('')}</div>
      <div class="graf">${curva(p)}</div>
      <p class="nota">${ixi[1]}: ${ixi[2]}. Línea verde: la parcela. Línea punteada: promedio de las 59. Franja verde: ciclo productivo (abril a octubre).</p>`;
  }
  $('ficha-parcela').addEventListener('click', e => { const b = e.target.closest('[data-ix]'); if (!b) return; st.ix = b.dataset.ix; fichaParcela(); });
  function seleccionar(id, scroll) {
    st.sel = id; lista(); pintaTira(); fichaParcela();
    if (scroll && $('ficha-parcela').scrollIntoView) $('ficha-parcela').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  pintaTira(); lista();

  /* Aplicación */
  $('p100').innerHTML = Array.from({ length: 100 }, (_, i) => `<i class="${i < 6 ? 'on' : ''}"></i>`).join('');

  /* Límites */
  const lim = [
    ['Muestra reducida', 'El modelo aprendió de 138 parcelas con rendimiento conocido. Con pocos ejemplos, las métricas pueden cambiar al incorporar más parcelas.'],
    ['Validación algo favorable', 'La elección de las quince variables se hizo con todas las parcelas de entrenamiento antes de la validación cruzada; por eso las métricas pueden resultar algo optimistas.'],
    ['Peso de la ubicación', 'Gran parte de la señal del modelo proviene de la ubicación geográfica de las parcelas. No se asegura el mismo desempeño en zonas distintas a las estudiadas.'],
    ['Nubosidad residual', 'Aun con el umbral de 20 %, pueden quedar efectos de nubes en algunas observaciones.'],
    ['Escalas distintas', 'La comparación con las estadísticas municipales del SIAP es una referencia de coherencia territorial: promedios municipales y mediciones por parcela no corresponden a la misma escala.'],
    ['Apoyo, no sustituto', 'Las estimaciones complementan el análisis financiero y la verificación en campo; no los reemplazan.']
  ];
  $('limites-grid').innerHTML = lim.map((l, i) => `<div class="tarjeta"><div class="etiqueta">${String(i + 1).padStart(2, '0')}</div><h3 style="font-size:1.15rem;margin:4px 0 8px">${l[0]}</h3><p class="nota" style="color:#464a3e;font-size:.93rem">${l[1]}</p></div>`).join('');

  /* Navegación */
  const links = [...document.querySelectorAll('nav.top a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href')));
  function spy() {
    let k = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < 120) k = i; });
    links.forEach((a, i) => a.classList.toggle('act', i === k));
  }
  window.addEventListener('scroll', spy, { passive: true }); spy();
})();
