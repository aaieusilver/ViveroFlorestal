const defaultState = {
  eucTarget: 1000000,
  teakTarget: 500000,
  weeks: 48,
  safetyMargin: 5,
  rootLoss: 15,
  postLoss: 10,
  trayCells: 176,
  germRate: 70,
  teakSelectLoss: 10,
  teakDensity: 160,
  rootWeeks: 4,
  shadeWeeks: 1.5,
  growthWeeks: 8,
  greenhouseArea: 240,
  shadeArea: 100,
  growthArea: 500,
  beds: 37,
  bedLength: 80,
  bedWidth: 1.2,
  waterDepth: 5,
  trayDensityProtected: 2.7,
  trayDensityGrowth: 2.3,
  sampleN: 200,
  observedSurvival: 85,
  marginError: 5,
  sdRoot: 4,
  sdGerm: 8,
  sdPost: 4
};

let state = { ...defaultState };
let lastResults = null;

const fmt = new Intl.NumberFormat('pt-BR');
const fmt1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const pct = (v, digits = 0) => `${(v * 100).toFixed(digits).replace('.', ',')}%`;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const labels = {
  eucTarget: v => `${fmt.format(v)} mudas`,
  teakTarget: v => `${fmt.format(v)} mudas`,
  weeks: v => `${v} semanas`,
  safetyMargin: v => `${v}%`,
  rootLoss: v => `${v}%`,
  postLoss: v => `${v}%`,
  trayCells: v => `${v} células`,
  germRate: v => `${v}%`,
  teakSelectLoss: v => `${v}%`,
  teakDensity: v => `${v} mudas/m²`,
  rootWeeks: v => `${v} sem.`,
  shadeWeeks: v => `${v} sem.`,
  growthWeeks: v => `${v} sem.`,
  greenhouseArea: v => `${v} m²`,
  shadeArea: v => `${v} m²`,
  growthArea: v => `${v} m²`,
  beds: v => `${v}`,
  bedLength: v => `${v} m`,
  bedWidth: v => `${v.toString().replace('.', ',')} m`,
  waterDepth: v => `${v.toString().replace('.', ',')} mm/dia`,
  trayDensityProtected: v => `${v.toString().replace('.', ',')} band./m²`,
  trayDensityGrowth: v => `${v.toString().replace('.', ',')} band./m²`,
  sampleN: v => `${fmt.format(v)} mudas`,
  observedSurvival: v => `${v}%`,
  marginError: v => `${v.toString().replace('.', ',')} p.p.`,
  sdRoot: v => `${v.toString().replace('.', ',')} p.p.`,
  sdGerm: v => `${v.toString().replace('.', ',')} p.p.`,
  sdPost: v => `${v.toString().replace('.', ',')} p.p.`
};

function compute(s) {
  const rootSurvival = 1 - s.rootLoss / 100;
  const postSurvival = 1 - s.postLoss / 100;
  const germ = s.germRate / 100;
  const teakSelection = 1 - s.teakSelectLoss / 100;
  const margin = 1 + s.safetyMargin / 100;

  const eucCuttingsRequired = s.eucTarget / (rootSurvival * postSurvival);
  const eucCuttingsPlanned = eucCuttingsRequired * margin;
  const eucWeeklyCuttings = eucCuttingsPlanned / s.weeks;
  const eucWeeklyTrays = eucWeeklyCuttings / s.trayCells;

  const eucRootedWeekly = eucWeeklyCuttings * rootSurvival;
  const eucFinalWeekly = eucRootedWeekly * postSurvival;
  const traysRooting = eucWeeklyTrays * s.rootWeeks;
  const traysShade = (eucRootedWeekly / s.trayCells) * s.shadeWeeks;
  const traysGrowth = (eucRootedWeekly / s.trayCells) * s.growthWeeks;

  const greenhouseCapacityTrays = s.greenhouseArea * s.trayDensityProtected;
  const shadeCapacityTrays = s.shadeArea * s.trayDensityProtected;
  const growthCapacityTrays = s.growthArea * s.trayDensityGrowth;

  const greenhouseOcc = traysRooting / greenhouseCapacityTrays;
  const shadeOcc = traysShade / shadeCapacityTrays;
  const growthOcc = traysGrowth / growthCapacityTrays;

  const teakFruitsRequired = s.teakTarget / (germ * teakSelection);
  const teakFruitsPlanned = teakFruitsRequired * margin;
  const teakSeedlingsAfterGerm = teakFruitsPlanned * germ;
  const teakFinal = teakSeedlingsAfterGerm * teakSelection;
  const bedArea = s.beds * s.bedLength * s.bedWidth;
  const teakCapacity = bedArea * s.teakDensity * teakSelection;
  const teakRequiredArea = s.teakTarget / (s.teakDensity * teakSelection);
  const teakOcc = teakRequiredArea / bedArea;

  const productiveArea = s.greenhouseArea + s.shadeArea + s.growthArea + bedArea;
  const waterM3Day = productiveArea * (s.waterDepth / 1000) * 1.25;
  const totalTarget = s.eucTarget + s.teakTarget;
  const laborMin = Math.ceil(totalTarget / 170000);
  const laborMid = Math.ceil(totalTarget / 150000);
  const laborMax = Math.ceil(totalTarget / 130000);

  const occupancies = [
    { key: 'greenhouse', label: 'Casa de vegetação', occ: greenhouseOcc, required: traysRooting, capacity: greenhouseCapacityTrays, unit: 'bandejas' },
    { key: 'shade', label: 'Casa de sombra', occ: shadeOcc, required: traysShade, capacity: shadeCapacityTrays, unit: 'bandejas' },
    { key: 'growth', label: 'Crescimento/rustificação', occ: growthOcc, required: traysGrowth, capacity: growthCapacityTrays, unit: 'bandejas' },
    { key: 'teak', label: 'Canteiros de teca', occ: teakOcc, required: teakRequiredArea, capacity: bedArea, unit: 'm²' }
  ].sort((a, b) => b.occ - a.occ);

  const monte = simulateMonteCarlo(s, eucCuttingsPlanned, teakFruitsPlanned);
  const stats = computeStats(s);

  return {
    rootSurvival, postSurvival, germ, teakSelection, margin,
    eucCuttingsRequired, eucCuttingsPlanned, eucWeeklyCuttings, eucWeeklyTrays,
    eucRootedWeekly, eucFinalWeekly, traysRooting, traysShade, traysGrowth,
    greenhouseCapacityTrays, shadeCapacityTrays, growthCapacityTrays,
    greenhouseOcc, shadeOcc, growthOcc,
    teakFruitsRequired, teakFruitsPlanned, teakSeedlingsAfterGerm, teakFinal,
    bedArea, teakCapacity, teakRequiredArea, teakOcc,
    productiveArea, waterM3Day, totalTarget, laborMin, laborMid, laborMax,
    occupancies, bottleneck: occupancies[0], monte, stats
  };
}

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulateMonteCarlo(s, eucInput, teakInput) {
  const runs = 1000;
  const results = [];
  const eucTarget = s.eucTarget;
  const teakTarget = s.teakTarget;
  for (let i = 0; i < runs; i++) {
    const root = clamp(1 - s.rootLoss / 100 + randn() * s.sdRoot / 100, 0.35, 0.99);
    const post = clamp(1 - s.postLoss / 100 + randn() * s.sdPost / 100, 0.55, 0.99);
    const germ = clamp(s.germRate / 100 + randn() * s.sdGerm / 100, 0.15, 0.98);
    const teakSel = clamp(1 - s.teakSelectLoss / 100 + randn() * s.sdPost / 100, 0.55, 0.99);
    const eucOut = eucInput * root * post;
    const teakOut = teakInput * germ * teakSel;
    results.push({ eucOut, teakOut, total: eucOut + teakOut, ok: eucOut >= eucTarget && teakOut >= teakTarget });
  }
  const totals = results.map(r => r.total).sort((a, b) => a - b);
  const euc = results.map(r => r.eucOut).sort((a, b) => a - b);
  const teak = results.map(r => r.teakOut).sort((a, b) => a - b);
  const q = (arr, p) => arr[Math.floor((arr.length - 1) * p)];
  const okProb = results.filter(r => r.ok).length / runs;
  return {
    okProb,
    p5: q(totals, .05), p50: q(totals, .5), p95: q(totals, .95),
    eucP5: q(euc, .05), eucP50: q(euc, .5), eucP95: q(euc, .95),
    teakP5: q(teak, .05), teakP50: q(teak, .5), teakP95: q(teak, .95),
    histogram: makeHistogram(totals, 28)
  };
}

function makeHistogram(values, bins) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx]++;
  }
  return counts;
}

function computeStats(s) {
  const n = s.sampleN;
  const phat = s.observedSurvival / 100;
  const z = 1.96;
  const denom = 1 + z ** 2 / n;
  const centre = phat + z ** 2 / (2 * n);
  const adj = z * Math.sqrt((phat * (1 - phat) + z ** 2 / (4 * n)) / n);
  const lower = (centre - adj) / denom;
  const upper = (centre + adj) / denom;
  const e = s.marginError / 100;
  const nRequiredConservative = Math.ceil((z ** 2 * 0.25) / (e ** 2));
  const nRequiredObserved = Math.ceil((z ** 2 * phat * (1 - phat)) / (e ** 2));
  return { phat, lower, upper, nRequiredConservative, nRequiredObserved };
}

function clsByOcc(occ) {
  if (occ >= 1) return 'bad';
  if (occ >= .85) return 'warn';
  return 'ok';
}

function colorByOcc(occ) {
  if (occ >= 1) return '#db6868';
  if (occ >= .85) return '#e8b95e';
  return '#6fbf73';
}

function update() {
  lastResults = compute(state);
  syncInputs();
  renderKpis(lastResults);
  renderFlow(lastResults);
  renderSummaryTable(lastResults);
  renderLayout(lastResults);
  renderStats(lastResults);
  renderGantt();
  renderExecutiveSummary(lastResults);
}

function syncInputs() {
  document.querySelectorAll('input[data-key]').forEach(input => {
    const key = input.dataset.key;
    if (String(input.value) !== String(state[key])) input.value = state[key];
  });
  Object.keys(labels).forEach(key => {
    const out = document.getElementById('out' + key.charAt(0).toUpperCase() + key.slice(1));
    if (out) out.textContent = labels[key](state[key]);
  });
}

function renderKpis(r) {
  document.getElementById('kpiTotalTarget').textContent = fmt.format(r.totalTarget);
  document.getElementById('kpiBottleneck').textContent = r.bottleneck.label;
  document.getElementById('kpiBottleneckOcc').textContent = `${fmt1.format(r.bottleneck.occ * 100)}% ocup.`;
  document.getElementById('kpiProb').textContent = pct(r.monte.okProb);
  const status = r.bottleneck.occ >= 1 ? 'Gargalo estrutural' : r.bottleneck.occ >= .85 ? 'Viável com atenção' : 'Operacionalmente folgado';
  document.getElementById('scenarioStatus').textContent = status;
  document.getElementById('metricEucTarget').textContent = fmt.format(state.eucTarget);
  document.getElementById('metricTeakTarget').textContent = fmt.format(state.teakTarget);
  document.getElementById('metricWater').textContent = fmt1.format(r.waterM3Day);
  document.getElementById('metricLabor').textContent = `${r.laborMid}`;
  document.getElementById('flowTag').textContent = `Gargalo: ${r.bottleneck.label}`;
}

function phaseHTML(title, value, sub, occ) {
  const c = occ == null ? 'ok' : clsByOcc(occ);
  const badge = occ == null ? 'calc.' : `${fmt1.format(occ * 100)}%`;
  return `<div class="phase ${c}"><div><span>${title}</span><strong>${value}</strong><span>${sub}</span></div><div class="badge">${badge}</div></div>`;
}

function renderFlow(r) {
  document.getElementById('eucFlow').innerHTML = [
    phaseHTML('Miniestacas planejadas', fmt.format(Math.round(r.eucCuttingsPlanned)), `${fmt.format(Math.round(r.eucWeeklyCuttings))}/semana`, null),
    phaseHTML('Casa de vegetação', `${fmt.format(Math.round(r.traysRooting))} band.`, `${state.rootWeeks} semanas de permanência`, r.greenhouseOcc),
    phaseHTML('Casa de sombra', `${fmt.format(Math.round(r.traysShade))} band.`, `${state.shadeWeeks} semanas de aclimatação`, r.shadeOcc),
    phaseHTML('Crescimento e rustificação', `${fmt.format(Math.round(r.traysGrowth))} band.`, `${state.growthWeeks} semanas a pleno sol`, r.growthOcc),
    phaseHTML('Expedição estimada', fmt.format(Math.round(r.eucFinalWeekly * state.weeks)), `${fmt.format(Math.round(r.eucFinalWeekly))}/semana`, null)
  ].join('');

  document.getElementById('teakFlow').innerHTML = [
    phaseHTML('Frutos/sementes planejados', fmt.format(Math.round(r.teakFruitsPlanned)), `germinação média de ${state.germRate}%`, null),
    phaseHTML('Canteiros a pleno sol', `${fmt.format(Math.round(r.teakRequiredArea))} m²`, `${state.beds} canteiros disponíveis`, r.teakOcc),
    phaseHTML('Plântulas pós-germinação', fmt.format(Math.round(r.teakSeedlingsAfterGerm)), `antes da seleção final`, null),
    phaseHTML('Tocos/mudas expedíveis', fmt.format(Math.round(r.teakFinal)), `após ${state.teakSelectLoss}% de perda`, null)
  ].join('');
}

function renderSummaryTable(r) {
  const rows = [
    ['Material propagativo anual', fmt.format(Math.round(r.eucCuttingsPlanned)) + ' miniestacas', fmt.format(Math.round(r.teakFruitsPlanned)) + ' frutos/sementes', 'Inclui margem extra definida no cenário.'],
    ['Produção semanal', fmt.format(Math.round(r.eucWeeklyCuttings)) + ' miniestacas/semana', 'produção concentrada no ciclo de canteiro', 'O Eucalyptus permite melhor escalonamento semanal; a teca depende mais do calendário de plantio.'],
    ['Área simultânea crítica', fmt.format(Math.round(r.traysGrowth)) + ' bandejas em rustificação', fmt.format(Math.round(r.teakRequiredArea)) + ' m² líquidos de canteiros', 'Esses setores concentram maior ocupação física.'],
    ['Capacidade instalada', fmt.format(Math.round(r.greenhouseCapacityTrays)) + ' band. casa de vegetação', fmt.format(Math.round(r.teakCapacity)) + ' mudas de teca', 'Capacidade calculada a partir da infraestrutura informada.'],
    ['Gargalo atual', r.bottleneck.label, `${fmt1.format(r.bottleneck.occ * 100)}% de ocupação`, 'Acima de 85% requer atenção; acima de 100% indica necessidade de redimensionamento.']
  ];
  document.getElementById('summaryTable').innerHTML = rows.map(row => `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td></tr>`).join('');
}

function renderLayout(r) {
  const svg = document.getElementById('nurserySvg');
  const sectors = [
    { id: 'Minijardim clonal', x: 48, y: 56, w: 230, h: 125, fill: '#cde7ca', sub: 'matrizes | brotações' },
    { id: 'Casa de vegetação', x: 310, y: 56, w: 270, h: 125, fill: colorByOcc(r.greenhouseOcc), sub: `${fmt1.format(r.greenhouseOcc * 100)}% ocup.` },
    { id: 'Casa de sombra', x: 612, y: 56, w: 190, h: 125, fill: colorByOcc(r.shadeOcc), sub: `${fmt1.format(r.shadeOcc * 100)}% ocup.` },
    { id: 'Expedição', x: 834, y: 56, w: 218, h: 125, fill: '#d9c18a', sub: 'seleção | carga' },
    { id: 'Crescimento e rustificação', x: 48, y: 230, w: 515, h: 175, fill: colorByOcc(r.growthOcc), sub: `${fmt1.format(r.growthOcc * 100)}% ocup. | pleno sol` },
    { id: 'Canteiros de Tectona grandis', x: 598, y: 230, w: 454, h: 175, fill: colorByOcc(r.teakOcc), sub: `${fmt1.format(r.teakOcc * 100)}% ocup. | ${state.beds} canteiros` },
    { id: 'Galpão técnico', x: 48, y: 455, w: 255, h: 110, fill: '#d6c4a7', sub: 'substrato | tubetes | insumos' },
    { id: 'Reservatório e fertirrigação', x: 338, y: 455, w: 255, h: 110, fill: '#9ec7dd', sub: `${fmt1.format(r.waterM3Day)} m³/dia pico` },
    { id: 'Drenos primários', x: 628, y: 455, w: 424, h: 110, fill: '#b8c2b5', sub: 'declividade operacional | escoamento' }
  ];

  const arrows = [
    [278, 118, 310, 118], [580, 118, 612, 118], [802, 118, 834, 118],
    [442, 181, 330, 230], [560, 318, 598, 318], [824, 405, 920, 455]
  ];

  svg.innerHTML = `
    <rect x="18" y="18" width="1064" height="642" rx="28" fill="#efe6d2" stroke="rgba(16,32,22,.28)" stroke-width="3" />
    <text x="48" y="35" class="svg-sub">Planta conceitual dinâmica | cores indicam ocupação operacional</text>
    ${arrows.map(a => `<line class="svg-line" x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" />`).join('')}
    ${sectors.map(s => `
      <rect class="svg-sector" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill}" />
      <text x="${s.x + 18}" y="${s.y + 42}" class="svg-label">${s.id}</text>
      <text x="${s.x + 18}" y="${s.y + 72}" class="svg-sub">${s.sub}</text>
      <text x="${s.x + 18}" y="${s.y + s.h - 22}" class="svg-sub">Área: ${sectorAreaLabel(s.id)}</text>
    `).join('')}
    <path d="M 64 615 C 220 585, 354 646, 510 615 S 840 585, 1020 615" fill="none" stroke="rgba(55,110,130,.55)" stroke-width="6" stroke-linecap="round" />
    <text x="48" y="642" class="svg-sub">Fluxo preferencial: minijardim → enraizamento → aclimatação → crescimento/rustificação → expedição; drenagem conduzida aos drenos primários.</text>
  `;

  function sectorAreaLabel(id) {
    if (id === 'Casa de vegetação') return `${state.greenhouseArea} m²`;
    if (id === 'Casa de sombra') return `${state.shadeArea} m²`;
    if (id === 'Crescimento e rustificação') return `${state.growthArea} m²`;
    if (id === 'Canteiros de Tectona grandis') return `${fmt.format(Math.round(r.bedArea))} m²`;
    if (id === 'Reservatório e fertirrigação') return 'dimensionável';
    return 'setor de apoio';
  }

  const cards = [
    { title: 'Casa de vegetação', occ: r.greenhouseOcc, req: `${fmt.format(Math.round(r.traysRooting))} band.`, cap: `${fmt.format(Math.round(r.greenhouseCapacityTrays))} band.` },
    { title: 'Casa de sombra', occ: r.shadeOcc, req: `${fmt.format(Math.round(r.traysShade))} band.`, cap: `${fmt.format(Math.round(r.shadeCapacityTrays))} band.` },
    { title: 'Crescimento/rustificação', occ: r.growthOcc, req: `${fmt.format(Math.round(r.traysGrowth))} band.`, cap: `${fmt.format(Math.round(r.growthCapacityTrays))} band.` },
    { title: 'Canteiros de teca', occ: r.teakOcc, req: `${fmt.format(Math.round(r.teakRequiredArea))} m²`, cap: `${fmt.format(Math.round(r.bedArea))} m²` }
  ];
  document.getElementById('capacityCards').innerHTML = cards.map(c => {
    const cl = clsByOcc(c.occ);
    return `<article class="capacity-card ${cl}"><p>${c.title}</p><strong>${fmt1.format(c.occ * 100)}%</strong><small>Necessário: ${c.req}<br>Capacidade: ${c.cap}</small><div class="progress"><i style="width:${Math.min(c.occ * 100, 120)}%"></i></div></article>`;
  }).join('');
}

function renderStats(r) {
  const { stats, monte } = r;
  document.getElementById('statsResults').innerHTML = `
    <div class="stat-result"><span>IC 95% da sobrevivência</span><strong>${pct(stats.lower, 1)} – ${pct(stats.upper, 1)}</strong></div>
    <div class="stat-result"><span>Amostra mínima conservadora</span><strong>${fmt.format(stats.nRequiredConservative)}</strong></div>
    <div class="stat-result"><span>Probabilidade de cumprir as duas metas</span><strong>${pct(monte.okProb, 0)}</strong></div>
    <div class="stat-result"><span>P5 total anual</span><strong>${fmt.format(Math.round(monte.p5))}</strong></div>
    <div class="stat-result"><span>Mediana total anual</span><strong>${fmt.format(Math.round(monte.p50))}</strong></div>
    <div class="stat-result"><span>P95 total anual</span><strong>${fmt.format(Math.round(monte.p95))}</strong></div>
  `;
  const max = Math.max(...monte.histogram) || 1;
  document.getElementById('monteChart').innerHTML = monte.histogram.map(c => `<div style="height:${Math.max(4, (c / max) * 130)}px" title="${c} simulações"></div>`).join('');
}

function renderGantt() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const tasks = [
    { name: 'Planejamento e insumos', months: [1,2], cls: 'ops' },
    { name: 'Coleta de miniestacas', months: [1,12], cls: '' },
    { name: 'Enraizamento de Eucalyptus', months: [1,12], cls: '' },
    { name: 'Aclimatação e rustificação', months: [2,12], cls: '' },
    { name: 'Tratamento de sementes de teca', months: [5,7], cls: 'teak' },
    { name: 'Semeadura e canteiros de teca', months: [6,10], cls: 'teak' },
    { name: 'Expedição principal', months: [9,12], cls: 'warn' },
    { name: 'Manutenção e higienização', months: [1,12], cls: 'ops' }
  ];
  const header = `<div class="gantt-header"><div>Etapa</div>${months.map(m => `<div>${m}</div>`).join('')}</div>`;
  const rows = tasks.map(t => {
    const cells = months.map((_, idx) => {
      const m = idx + 1;
      const active = m >= t.months[0] && m <= t.months[1];
      return `<div>${active ? `<span class="bar ${t.cls}"></span>` : ''}</div>`;
    }).join('');
    return `<div class="gantt-row"><div class="task-name">${t.name}</div>${cells}</div>`;
  }).join('');
  document.getElementById('ganttChart').innerHTML = header + rows;
}

function renderExecutiveSummary(r) {
  const text = `SIMVIVEIRO MT — RESUMO EXECUTIVO DO CENÁRIO

Meta anual: ${fmt.format(r.totalTarget)} mudas, sendo ${fmt.format(state.eucTarget)} mudas clonais de Eucalyptus urophylla e ${fmt.format(state.teakTarget)} mudas seminais de Tectona grandis.

Eucalyptus: para cumprir a meta com ${state.rootLoss}% de perda no enraizamento, ${state.postLoss}% de perdas posteriores e ${state.safetyMargin}% de margem operacional, o viveiro deve planejar aproximadamente ${fmt.format(Math.round(r.eucCuttingsPlanned))} miniestacas/ano, equivalentes a ${fmt.format(Math.round(r.eucWeeklyCuttings))} miniestacas por semana e ${fmt.format(Math.round(r.eucWeeklyTrays))} bandejas semanais de ${state.trayCells} células.

Teca: com germinação esperada de ${state.germRate}% e perda de seleção/toco de ${state.teakSelectLoss}%, recomenda-se planejar aproximadamente ${fmt.format(Math.round(r.teakFruitsPlanned))} frutos/sementes. A área líquida requerida de canteiros é de ${fmt.format(Math.round(r.teakRequiredArea))} m², frente a ${fmt.format(Math.round(r.bedArea))} m² disponíveis.

Gargalo operacional: ${r.bottleneck.label}, com ${fmt1.format(r.bottleneck.occ * 100)}% de ocupação. Interpretação: ${r.bottleneck.occ >= 1 ? 'há sobrecarga estrutural e o setor precisa ser ampliado ou o cronograma precisa ser redistribuído.' : r.bottleneck.occ >= .85 ? 'há viabilidade, mas com baixa folga operacional; recomenda-se monitorar lotes e evitar concentração de produção.' : 'há folga operacional no cenário atual.'}

Bioestatística: com n=${state.sampleN} mudas avaliadas e sobrevivência observada de ${state.observedSurvival}%, o intervalo de confiança de 95% estimado é de ${pct(r.stats.lower,1)} a ${pct(r.stats.upper,1)}. Na simulação Monte Carlo, a probabilidade de cumprir simultaneamente as metas de Eucalyptus e teca foi de ${pct(r.monte.okProb,0)}.

Equipe operacional estimada: ${r.laborMin} a ${r.laborMax} colaboradores, com referência central de ${r.laborMid} colaboradores operacionais para a escala definida.`;
  document.getElementById('executiveSummary').textContent = text;
}

function download(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvSummary(r) {
  const rows = [
    ['Indicador', 'Valor'],
    ['Meta Eucalyptus', state.eucTarget],
    ['Meta Teca', state.teakTarget],
    ['Miniestacas planejadas', Math.round(r.eucCuttingsPlanned)],
    ['Miniestacas por semana', Math.round(r.eucWeeklyCuttings)],
    ['Frutos/sementes teca planejados', Math.round(r.teakFruitsPlanned)],
    ['Área canteiros teca necessária m2', Math.round(r.teakRequiredArea)],
    ['Ocupação casa vegetação %', (r.greenhouseOcc * 100).toFixed(1)],
    ['Ocupação casa sombra %', (r.shadeOcc * 100).toFixed(1)],
    ['Ocupação crescimento %', (r.growthOcc * 100).toFixed(1)],
    ['Ocupação canteiros %', (r.teakOcc * 100).toFixed(1)],
    ['Gargalo', r.bottleneck.label],
    ['Probabilidade cumprir metas %', (r.monte.okProb * 100).toFixed(1)],
    ['Demanda hídrica pico m3/dia', r.waterM3Day.toFixed(1)],
    ['Equipe operacional central', r.laborMid]
  ];
  return rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\n');
}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function setup() {
  document.querySelectorAll('input[data-key]').forEach(input => {
    const key = input.dataset.key;
    input.value = state[key];
    input.addEventListener('input', e => {
      const value = Number(e.target.value);
      state[key] = value;
      update();
    });
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    state = { ...defaultState };
    update();
    showToast('Cenário padrão restaurado.');
  });

  document.getElementById('copySummaryBtn').addEventListener('click', async () => {
    const text = document.getElementById('executiveSummary').textContent;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Resumo copiado.');
    } catch {
      showToast('Não foi possível copiar automaticamente.');
    }
  });

  document.getElementById('downloadJsonBtn').addEventListener('click', () => {
    download('simviveiro-cenario.json', JSON.stringify({ state, results: lastResults }, null, 2), 'application/json');
  });

  document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    download('simviveiro-resumo.csv', csvSummary(lastResults), 'text/csv;charset=utf-8');
  });

  update();
}

setup();
