/*
 * Motor do Simulador Enividia — réplica funcional das regras do Tecnomind (cenário industrial).
 * Código original. Regras do Manual dos Diretores + parâmetros calibrados com as exportações
 * reais da Enividia (períodos #0 a #5). Onde o jogo diverge do manual, vale o que os relatórios mostram.
 */
(function (root) {
  'use strict';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sum = (a) => a.reduce((s, x) => s + (x || 0), 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const PR = ['P', 'W'];
  const NAME = { P: 'Smartphone', W: 'Smartwatch' };

  // ------------------------------------------------------------------ regras fixas
  const RULES = {
    products: PR, productName: NAME,
    minPrice: { P: 1300, W: 560 },
    bom: { P: { kit: 'kitP', emb: 2, opH: 2.0, mach: 'P', machH: 1.0 }, W: { kit: 'kitW', emb: 1, opH: 1.0, mach: 'W', machH: 1.5 } },
    items: ['kitP', 'kitW', 'emb'],
    itemName: { kitP: 'Kit Smartphone', kitW: 'Kit Smartwatch', emb: 'Embalagem e acessórios' },
    suppliers: {
      Fasterix:  { maxTerm: 1, rate: 0.05,  ipi: 0.10, icms: 0.10, arrival: 'start', disc: {} },
      Lallemand: { maxTerm: 2, rate: 0.075, ipi: 0.10, icms: 0.07, arrival: 'end', disc: { emb: [60000, 0.20], kitP: [30000, 0.20], kitW: [8000, 0.20] } },
      Playphone: { maxTerm: 2, rate: 0.05,  ipi: 0.10, icms: 0.17, arrival: 'end', disc: { emb: [40000, 0.10], kitP: [20000, 0.10], kitW: [10000, 0.10] } },
    },
    payOptions: {
      AV: { label: 'À vista', now: 1, later: 0 },
      E1P: { label: 'Entrada + 1 parcela', now: 1, later: 1 },
      '1P': { label: '1 parcela sem entrada', now: 0, later: 1 },
      E2P: { label: 'Entrada + 2 parcelas', now: 1, later: 2 },
      '2P': { label: '2 parcelas sem entrada', now: 0, later: 2 },
      E3P: { label: 'Entrada + 3 parcelas', now: 1, later: 3 },
      '3P': { label: '3 parcelas sem entrada', now: 0, later: 3 },
    },
    machineModels: {
      'P-V1': { type: 'P', price: 90000, prod: 1.0, cv: 8 }, 'P-V2': { type: 'P', price: 130000, prod: 1.3, cv: 3 },
      'W-V1': { type: 'W', price: 70000, prod: 1.0, cv: 8 }, 'W-V2': { type: 'W', price: 95000, prod: 1.3, cv: 3 },
    },
    hours: 550, machLife: 40, machResidual: 0.10,
    salaryMin: 12, salaryMax: 25, dsr: 0.20, encargos: 0.368, provFerias: 0.1111, prov13: 0.0833,
    overtime: { 0: { cap: 0, prem: 0 }, 1: { cap: 0.13636, prem: 1.75 }, 2: { cap: 0.27273, prem: 1.875 } },
    benefits: { med: { none: 0, basic: 1125, full: 2790 }, food: { none: 0, rest: 1100, voucher: 1800 } },
    training: { none: { cost: 0, time: 0 }, basic: { cost: 1650, time: 0.33 }, adv: { cost: 3660, time: 0.50 } },
    cif: { maintenance: 30000, managers: 240000, support: 231600, insurance: 90000 },
    dep: { prodBuildings: 12880, vehicle: 4950, comBuilding: 6400 },
    adm: { commercial: 209000, admin: 315000, general: 180000, energyAdm: 15000, commission: 0.03 },
    storageRate: 0.06,
    adLag: [0.5, 0.3, 0.2], diLag: [0.2, 0.3, 0.5], adMaxUseful: 20, diMin: 1000,
    freight: { local: 10, comp: 20, ext: 30 },
    ir: 0.25, csll: 0.09,
    risk: { A: 1.0, B: 1.1, C: 1.2 },
    vacationFine: 0.3333,
    market0: { P: { M: [6769, 6769, 6769, 6769, 11108], p: [1750, 1750, 1750, 1750, 2100] },
               W: { M: [1502, 1502, 1502, 1502, 2468], p: [767.5, 767.5, 767.5, 767.5, 840] } },
  };
  const LF = (1 + RULES.dsr) * (1 + RULES.encargos) * (1 + RULES.provFerias + RULES.prov13);
  const SF = (1 + RULES.encargos) * (1 + RULES.provFerias + RULES.prov13);
  const CASHSHARE = 1 / (1 + RULES.provFerias + RULES.prov13);
  RULES.laborFactor = LF; RULES.salaryFactor = SF;

  function termDays(code) { const o = RULES.payOptions[code]; if (!o || !o.later) return 0; const parts = o.now + o.later; let s = 0; for (let k = 1; k <= o.later; k++) s += 90 * k; return s / parts; }
  // r = juro do fornecedor ao período (Portal de Notícias → Insumos e Imobilizados)
  function supplierFactor(code, r) { return { AV: 1, E1P: 1 + r / 2, '1P': 1 + r, E2P: 1 + 1.38333 * r, '2P': (1 + r) * (1 + r) }[code] || 1; }

  // ------------------------------------------------------------------ parâmetros calibrados (editáveis)
  const PARAMS = {
    nCompanies: 4, ownRegion: 2,
    season: { P: [100, 76, 77, 77, 106, 76, 78, 77, 117, 77, 77, 78, 113], W: [100, 89, 96, 102, 173, 125, 143, 163, 289, 211, 233, 251, 446] },
    econ: {},
    share: { // ajuste por mínimos quadrados sobre a demanda real da Enividia por região, períodos #1–#5
      P: { price: 2.09, ads: 0.39, term: 0.376, di: 0, sat: 1.49, inc: 0, local: 0.14, ext: 0.14 },
      W: { price: 2.21, ads: 0.75, term: 0.03, di: 1.9, sat: 2.95, inc: 3.29, local: 0.47, ext: 0.28 },
    },
    // Manual 5.3: o consumidor rejeita aumento demasiado entre períodos e preço muito longe da referência
    // (abaixo indica baixa qualidade). Manual 5.3.1: falta de produto e abuso de preço reduzem a fidelidade.
    priceLow: { thr: 0.15, k: 4 },        // abaixo de 85% do preço médio: penalidade crescente
    incP: 0,                              // smartphone: os relatórios reais não mostram punição por aumento > 10% (testado: piora o ajuste de 3% para 5,6%)
    loyalty: { k: 0.8, decay: 0.5 },      // perda de fidelidade: índice = decaimento × anterior + % não atendido + abuso de preço
    satProd: 0.02,                        // Manual 10.3: satisfação relativa da MOD afeta a produtividade
    market: { ads: 0.6, price: 0.5, season: 0.5 },
    sat: { base: 0.8, perDollar: 0.0067, med: { none: 0, basic: 0.079, full: 0.15 }, food: { none: 0, rest: 0.005, voucher: 0.009 }, perPLRpt: 0.004, cutPenalty: 0.112 },
    strike: [[0.6, 0.20], [0.4, 0.10], [0.2, 0.05]],
    learning: { base: 0.0122, none: -0.0135, basic: 0, adv: 0.003 },
    wear: 0.02, kwh: 0.70, adCost: 4500, machineSalePct: 0.60,
    // condições vigentes (Portal de Notícias, período #5)
    bank: { financing: 0.035, giro: 0.049, special: 0.105, application: 0.0455, anticipation: 0.056 },
    financingMax: 0.8, financingGrace: 1, giroMaxInstallments: 1, salaryMin: 15, exchange: 0.8, extIndex: 1,
    freight: { local: 13, comp: 26, ext: 39 },
    supplierRates: { Fasterix: 0.077, Lallemand: 0.119, Playphone: 0.0875 },
    machinePrices: { 'P-V1': 117000, 'P-V2': 169000, 'W-V1': 91000, 'W-V2': 123500 },
    vacationStaffFactor: 0.6977,
    // impostos sobre vendas (o IPI caiu para 4% em todas as regiões a partir do período #3)
    salesTax: { local: { icms: 0.17, ipi: 0.04 }, comp: { icms: 0.12, ipi: 0.04 }, ext: { icms: 0.0, ipi: 0.04 } },
    prices: {
      Fasterix: { kitP: 1350, kitW: 285, emb: 120 },
      Lallemand: { kitP: 940, kitW: 210, emb: 90 },
      Playphone: { kitP: 894, kitW: 192, emb: 97 },
    },
  };

  const add = (m, p, v) => { if (!v) return; m[p] = (m[p] || 0) + v; };
  const due = (m, p) => m[p] || 0;
  const futureSum = (m, p) => sum(Object.entries(m).filter(([k]) => +k > p).map(([, v]) => v));

  function newLoan(kind, label, t, amount, rate, principalSched, interestNow) {
    const L = { kind, label, sched: {} };
    let bal = amount; const last = Math.max(...Object.keys(principalSched).map(Number));
    for (let p = t + (interestNow ? 0 : 1); p <= last; p++) {
      const pr = principalSched[p] || 0;
      L.sched[p] = { principal: pr, interest: bal * rate };
      bal -= pr;
    }
    return L;
  }
  const loanBalance = (L, p) => sum(Object.entries(L.sched).filter(([k]) => +k >= p).map(([, v]) => v.principal));

  function satisfaction(d, prev, p) {
    const s = p.sat;
    let v = s.base + s.perDollar * (d.salary - 12) + s.med[d.med] + s.food[d.food] + s.perPLRpt * (d.plr * 100);
    const rank = { none: 0, basic: 1, full: 2, rest: 1, voucher: 2 };
    if (prev && (rank[d.med] < rank[prev.med] || rank[d.food] < rank[prev.food] || d.salary < prev.salary)) v -= s.cutPenalty;
    return clamp(v, 0.3, 1.2);
  }

  // sazonalidade além do período 12: repete o ciclo anual com crescimento limitado a 15% ao ano
  function seasonAt(p, j, t) {
    const S = p.season[j], n = S.length - 1; if (t <= n) return S[Math.max(0, t)];
    const g = Math.min(1.15, Math.max(0.9, S[n] / (S[n - 4] || S[n])));
    return seasonAt(p, j, t - 4) * g;
  }
  const lag = (cur, h, w) => w[0] * cur + w[1] * h[0] + w[2] * h[1];
  function demand(s, d, p, sat) {
    const t = s.period, out = {}, sc = d.scenario;
    const N = p.nCompanies, nR = N + 1, own = p.ownRegion - 1;
    const satRel = sat / ((sat + (N - 1) * sc.satRivals) / N) - 1;
    for (const j of PR) {
      const b = p.share[j], m0 = RULES.market0[j], c = sc[j];
      const season = seasonAt(p, j, t) / 100;
      const econ = p.econ[t] != null ? +p.econ[t] : 1;
      const termOwn = termDays(d.term[j]);
      const termAvg = (termOwn + (N - 1) * c.term) / N;
      const diOwn = lag(d.di[j] < RULES.diMin ? 0 : d.di[j], s.diHist[j], RULES.diLag);
      const diAvgNow = (d.di[j] + (N - 1) * c.di) / N;
      const diAvg = lag(diAvgNow, s.diAvgHist[j], RULES.diLag);
      const regions = [];
      for (let r = 0; r < nR; r++) {
        const kind = r === nR - 1 ? 'ext' : r === own ? 'local' : 'comp';
        const pr = d.price[j][r], pAvg = (pr + (N - 1) * c.price[r]) / N;
        const adOwn = lag(Math.min(d.ads[j][r], RULES.adMaxUseful), [Math.min(s.adHist[j][0][r], 20), Math.min(s.adHist[j][1][r], 20)], RULES.adLag);
        const adAvgNow = (d.ads[j][r] + (N - 1) * c.ads[r]) / N;
        const adAvg = lag(adAvgNow, [s.adAvgHist[j][0][r], s.adAvgHist[j][1][r]], RULES.adLag);
        const prev = s.lastPrice[j][r];
        const inc = prev ? Math.max(0, pr / prev - 1 - 0.10) : 0;
        const pl = p.priceLow || { thr: 1, k: 0 }, low = pr < pAvg * (1 - pl.thr) ? Math.log(pAvg * (1 - pl.thr) / pr) : 0;
        const incK = j === 'P' && !b.inc ? (p.incP || 0) : b.inc, loy = ((s.loyal || {})[j] || 0) * ((p.loyalty || {}).k || 0);
        const u = -b.price * Math.log(pr / pAvg) + b.ads * Math.log((1 + adOwn) / (1 + adAvg)) + b.term * (termOwn - termAvg) / 90
          + b.di * Math.log((1 + diOwn / 20000) / (1 + diAvg / 20000)) + b.sat * satRel - incK * inc - pl.k * low - loy
          + (kind === 'local' ? b.local : 0) + (kind === 'ext' ? b.ext : 0);
        const share = 1 / (1 + (N - 1) * Math.exp(-u));
        const M0 = kind === 'ext' ? m0.M[4] * N / 4 : m0.M[0], P0 = kind === 'ext' ? m0.p[4] : m0.p[0]; // uma região por empresa + externo (Manual 5.1)
        const market = (kind === 'ext' ? (p.extIndex || 1) : 1) * M0 * Math.pow(season, p.market.season != null ? p.market.season : 1) * econ * Math.pow((1 + adAvg) / 4, p.market.ads) * Math.pow(pAvg / P0, -p.market.price);
        regions.push({ r, kind, price: pr, pAvg, share, market, demand: market * share, adAvgNow, diAvgNow });
      }
      out[j] = { regions, termAvg, diAvgNow };
    }
    return out;
  }

  function simulate(state0, dec, p, opts) {
    p = p || PARAMS; opts = opts || {};
    const s = clone(state0), d = clone(dec), t = s.period, warn = [];
    { // decisões nunca negativas (preço, propaganda, previsão, I&D, produção, compras, RH, máquinas e finanças)
      const nn = (x) => Math.max(0, +x || 0);
      for (const j of PR) { ['price', 'ads', 'forecast'].forEach((k) => { if (d[k] && d[k][j]) d[k][j] = d[k][j].map(nn); }); if (d.di) d.di[j] = nn(d.di[j]); if (d.production) d.production[j] = nn(d.production[j]); }
      (d.purchases || []).forEach((x) => { x.qty = nn(x.qty); });
      ['hire', 'fire', 'giro', 'financing', 'anticipation', 'application', 'plr'].forEach((k) => { d[k] = nn(d[k]); });
      ['buyMachines', 'sellMachines'].forEach((k) => { if (d[k]) for (const m of Object.keys(d[k])) d[k][m] = nn(d[k][m]); });
    }
    const risk = RULES.risk[s.riskClass] || 1;
    const N = p.nCompanies, nR = N + 1, own = p.ownRegion - 1;
    const rep = { period: t, warnings: warn };

    for (const j of PR) d.price[j] = d.price[j].map((v, r) => { if (v < RULES.minPrice[j]) { warn.push(`${NAME[j]}: preço na R${r + 1} abaixo do mínimo de $${RULES.minPrice[j]}; ajustado.`); return RULES.minPrice[j]; } return v; });
    const salMin = p.salaryMin || RULES.salaryMin;
    if (+d.salary < salMin) warn.push(`Salário-hora abaixo do mínimo obrigatório ($${salMin}); ajustado.`);
    d.salary = clamp(+d.salary || salMin, salMin, RULES.salaryMax);

    // 1. chegadas
    for (const it of s.inTransit) { s.stock[it.item].q += it.q; s.stock[it.item].v += it.v; }
    s.inTransit = [];
    for (const m of s.machinesPending) s.machines.push(m);
    s.machinesPending = [];

    const mov = {}; for (const k of ['kitP', 'kitW', 'emb', 'P', 'W']) mov[k] = { ini: { ...s.stock[k] }, compraIni: { q: 0, v: 0 }, compraFim: { q: 0, v: 0 }, consumo: { q: 0, v: 0 }, fabricado: { q: 0, v: 0 }, venda: { q: 0, v: 0 } };
    // 2. estocagem: 6% do estoque inicial
    const storageItem = {}; for (const i of RULES.items) storageItem[i] = s.stock[i].v * RULES.storageRate;
    const storageFG = (s.stock.P.v + s.stock.W.v) * RULES.storageRate;

    // 3. compras
    let cashNowPurch = 0, icmsCred = 0, ipiCred = 0; const purch = [];
    for (const row of (d.purchases || [])) {
      const q = Math.max(0, Math.round(+row.qty || 0)); if (!q) continue;
      const sup = RULES.suppliers[row.supplier]; if (!sup) continue;
      let pay = row.pay || 'AV'; const po = RULES.payOptions[pay];
      if (!po || po.later > sup.maxTerm) { warn.push(`${row.supplier} aceita no máximo ${sup.maxTerm} parcela(s) futura(s); compra tratada à vista.`); pay = 'AV'; }
      const list = p.prices[row.supplier][row.item];
      const disc = sup.disc[row.item] && q >= sup.disc[row.item][0] ? sup.disc[row.item][1] : 0;
      const unit = list * supplierFactor(pay, (p.supplierRates || {})[row.supplier] != null ? p.supplierRates[row.supplier] : sup.rate);
      const total = q * unit * (1 - disc);
      const icms = total * sup.icms, ipi = total * sup.ipi, invoice = total + ipi, stockV = total - icms;
      icmsCred += icms; ipiCred += ipi;
      const o = RULES.payOptions[pay], parts = o.now + o.later;
      if (o.now) cashNowPurch += invoice / parts;
      for (let k = 1; k <= o.later; k++) add(s.payables, t + k, invoice / parts);
      if (sup.arrival === 'start') { s.stock[row.item].q += q; s.stock[row.item].v += stockV; mov[row.item].compraIni.q += q; mov[row.item].compraIni.v += stockV; }
      else { s.inTransit.push({ item: row.item, q, v: stockV }); mov[row.item].compraFim.q += q; mov[row.item].compraFim.v += stockV; }
      purch.push({ ...row, pay, q, unit, disc, total, icms, ipi, invoice, stockV });
    }
    rep.purchases = purch;

    // 4. máquinas
    let machSale = 0, machSaleBook = 0;
    for (const type of ['P', 'W']) {
      let q = Math.max(0, Math.round(+(d.sellMachines || {})[type] || 0));
      for (const g of s.machines.filter((x) => x.type === type).sort((a, b) => a.prod - b.prod)) {
        if (!q) break; const k = Math.min(q, g.qty), accShare = g.accDep * k / g.qty;
        machSaleBook += k * g.cost - accShare; machSale += k * g.cost * p.machineSalePct;
        g.accDep -= accShare; g.qty -= k; q -= k;
      }
      if (q) warn.push(`Não há máquinas ${type} suficientes para vender.`);
    }
    s.machines = s.machines.filter((g) => g.qty > 0);
    const mPrice = (m) => (p.machinePrices || {})[m] || RULES.machineModels[m].price;
    const buyCost = sum(Object.entries(d.buyMachines || {}).map(([m, q]) => mPrice(m) * Math.max(0, Math.round(+q || 0))));
    for (const [m, q0] of Object.entries(d.buyMachines || {})) {
      const q = Math.max(0, Math.round(+q0 || 0)); if (!q) continue; const mm = RULES.machineModels[m];
      s.machinesPending.push({ model: m, type: mm.type, qty: q, prod: mm.prod, wear: 0, cost: mPrice(m), accDep: 0, cv: mm.cv });
    }

    // 5. RH
    const fire = Math.min(Math.max(0, Math.round(+d.fire || 0)), s.workers);
    const hire = Math.max(0, Math.round(+d.hire || 0));
    s.workers = s.workers - fire + hire;
    const tr = RULES.training[d.training] || RULES.training.none;
    const ot = RULES.overtime[d.overtime] || RULES.overtime[0];
    const vac = !!d.vacation;
    const sat = satisfaction(d, s.lastRH, p);
    const satAvg = (sat + (N - 1) * d.scenario.satRivals) / N;
    const gap = (satAvg - sat) / satAvg;
    let strike = 0; for (const [th, cut] of p.strike) if (gap >= th) { strike = cut; break; }
    const normalH = s.workers * RULES.hours;
    const vacH = vac ? normalH / 3 : 0;
    const otH = (normalH - vacH) * ot.cap;
    const trainH = hire * RULES.hours * tr.time;
    const strikeH = normalH * strike;
    const availH = Math.max(0, normalH - vacH + otH - trainH - strikeH);
    if (strike) warn.push(`Greve: ${(strike * 100).toFixed(0)}% das horas paradas (satisfação ${sat.toFixed(3)} contra média ${satAvg.toFixed(3)}).`);
    s.opIndex *= 1 + p.learning.base + (hire ? (p.learning[d.training] || 0) : 0) + (p.satProd || 0) * clamp(sat / satAvg - 1, -0.5, 0.5);

    // 6. capacidade e produção
    const mi = {};
    for (const type of ['P', 'W']) {
      const gs = s.machines.filter((g) => g.type === type), qty = sum(gs.map((g) => g.qty));
      mi[type] = { qty, hoursAv: qty * RULES.hours * (1 + ot.cap), normalH: qty * RULES.hours, used: 0,
        prodAvg: qty ? sum(gs.map((g) => g.qty * g.prod * (1 - g.wear))) / qty : 0, cv: qty ? sum(gs.map((g) => g.qty * g.cv)) / qty : 0 };
    }
    const order = d.priority === 'W' ? ['W', 'P'] : ['P', 'W'];
    let opLeft = availH, embLeft = s.stock.emb.q; const prod = { P: 0, W: 0 }, limits = {};
    for (const j of order) {
      const b = RULES.bom[j], m = mi[b.mach];
      const want = Math.max(0, Math.round(+d.production[j] || 0));
      const opPer = b.opH / s.opIndex, mPer = m.prodAvg ? b.machH / m.prodAvg : Infinity;
      const lim = { plano: want, kits: Math.floor(s.stock[b.kit].q + 1e-6), embalagens: Math.floor(embLeft / b.emb + 1e-6), operadores: Math.floor(opLeft / opPer + 1e-6), maquinas: Math.floor((m.hoursAv - m.used) / mPer + 1e-6) };
      const q = Math.max(0, Math.min(...Object.values(lim)));
      prod[j] = q; limits[j] = lim;
      if (q < want) warn.push(`${NAME[j]}: produção limitada por ${Object.keys(lim).find((k) => lim[k] === q)} (${q} de ${want}).`);
      opLeft -= q * opPer; m.used += q * mPer; embLeft -= q * b.emb;
    }
    const opUsed = availH - opLeft;
    const mat = { P: 0, W: 0 }, embUnit = s.stock.emb.q ? s.stock.emb.v / s.stock.emb.q : 0;
    for (const j of PR) {
      const b = RULES.bom[j], ku = s.stock[b.kit].q ? s.stock[b.kit].v / s.stock[b.kit].q : 0;
      mat[j] = prod[j] * (ku + b.emb * embUnit);
      mov[b.kit].consumo.q += prod[j]; mov[b.kit].consumo.v += prod[j] * ku; mov.emb.consumo.q += prod[j] * b.emb; mov.emb.consumo.v += prod[j] * b.emb * embUnit;
      s.stock[b.kit].q -= prod[j]; s.stock[b.kit].v -= prod[j] * ku;
      s.stock.emb.q -= prod[j] * b.emb; s.stock.emb.v -= prod[j] * b.emb * embUnit;
    }
    const energy = {};
    for (const type of ['P', 'W']) {
      const m = mi[type];
      energy[type] = m.used * m.cv * 0.736 * p.kwh;
      m.wearInc = m.normalH ? p.wear * m.used / m.normalH : 0;
      s.machines.filter((g) => g.type === type).forEach((g) => { g.wear += m.wearInc; });
    }

    // 7. custos
    const hourCost = d.salary * LF;
    const vacStaff = vac ? p.vacationStaffFactor : 1;
    const laborNormal = (normalH - strikeH) * hourCost;
    const laborOT = otH * d.salary * ot.prem * LF;
    const strikeCost = strikeH * hourCost;
    const laborTot = laborNormal + laborOT;
    const direct = availH > 0 ? laborTot * opUsed / availH : 0;
    const idle = laborTot - direct;
    const benefits = s.workers * (RULES.benefits.med[d.med] + RULES.benefits.food[d.food]);
    const training = hire * tr.cost;
    const indemn = fire * RULES.hours * d.salary * (2 / 3);
    const machDep = sum(s.machines.map((g) => g.qty * g.cost * (1 - RULES.machResidual) / RULES.machLife));
    s.machines.forEach((g) => { g.accDep += g.qty * g.cost * (1 - RULES.machResidual) / RULES.machLife; });
    const vehDep = s.fixed.vehicleLifeLeft > 0 ? RULES.dep.vehicle : 0; s.fixed.vehicleLifeLeft -= 1;
    s.fixed.accBuild += RULES.dep.prodBuildings + RULES.dep.comBuilding; s.fixed.accVeh += vehDep;
    const otF = 1 + ot.cap;
    const cif = {
      ociosidade: idle, manutencao: RULES.cif.maintenance,
      gerentes: RULES.cif.managers * SF * otF * vacStaff, apoio: RULES.cif.support * SF * otF * vacStaff,
      seguro: RULES.cif.insurance, depreciacao: machDep + RULES.dep.prodBuildings + vehDep,
      estocagem: sum(Object.values(storageItem)), beneficios: benefits, treinamento: training, indenizacoes: indemn,
    };
    const opH = { P: prod.P * 2 / s.opIndex, W: prod.W / s.opIndex }, opT = opH.P + opH.W || 1;
    const mh = { P: mi.P.used, W: mi.W.used }, mT = mh.P + mh.W || 1;
    const embUse = { P: prod.P * 2, W: prod.W }, embT = embUse.P + embUse.W || 1;
    const pc = {};
    for (const j of PR) {
      const fo = opH[j] / opT, fm = mh[j] / mT;
      const cifJ = (j === 'P' ? storageItem.kitP : storageItem.kitW) + storageItem.emb * embUse[j] / embT
        + (cif.manutencao + machDep) * fm + (cif.gerentes + cif.apoio + cif.ociosidade + cif.beneficios + cif.treinamento + cif.indenizacoes + vehDep + RULES.dep.prodBuildings) * fo + cif.seguro / 2;
      pc[j] = { materiais: mat[j], mod: direct * fo, energia: energy[j], cif: cifJ };
      pc[j].total = pc[j].materiais + pc[j].mod + pc[j].energia + pc[j].cif;
      pc[j].unit = prod[j] ? pc[j].total / prod[j] : 0;
    }
    { const z = PR.filter((j) => !prod[j]), nz = PR.filter((j) => prod[j]);
      if (z.length === 1 && nz.length === 1) { const a = z[0], o = nz[0]; pc[o].cif += pc[a].cif; pc[o].total += pc[a].cif; pc[o].unit = pc[o].total / prod[o]; pc[a].cif = 0; pc[a].total = pc[a].materiais + pc[a].mod + pc[a].energia; } }
    const cifTot = sum(Object.values(cif));
    const noProd = prod.P + prod.W === 0;
    for (const j of PR) if (prod[j]) { s.stock[j].q += prod[j]; s.stock[j].v += pc[j].total; mov[j].fabricado = { q: prod[j], v: pc[j].total }; }
    const unabsorbed = noProd ? cifTot + direct + energy.P + energy.W : 0;

    // 8. demanda e vendas
    const dem = opts.demand ? null : demand(s, d, p, sat);
    const sales = {}; let gross = 0, icmsDeb = 0, ipiDeb = 0, freight = 0, cogs = 0, recNow = 0;
    for (const j of PR) {
      const regs = dem ? dem[j].regions : opts.demand[j].map((x, r) => ({ r, kind: r === nR - 1 ? 'ext' : r === own ? 'local' : 'comp', demand: x, market: 0, share: 0, price: d.price[j][r], pAvg: d.price[j][r] }));
      const D = regs.map((x) => Math.round(x.demand)); let avail = s.stock[j].q;
      const sold = Array(nR).fill(0);
      sold[own] = Math.min(D[own], Math.floor(avail)); avail -= sold[own];
      const oth = D.reduce((a, x, r) => a + (r === own ? 0 : x), 0);
      for (let r = 0; r < nR; r++) if (r !== own) sold[r] = oth <= avail ? D[r] : Math.floor(avail * D[r] / oth);
      const qty = sum(sold), uc = s.stock[j].q ? s.stock[j].v / s.stock[j].q : 0, c = qty * uc;
      cogs += c; s.stock[j].q -= qty; s.stock[j].v -= c; mov[j].venda = { q: qty, v: c };
      let rev = 0; const o = RULES.payOptions[d.term[j]] || RULES.payOptions.AV, parts = o.now + o.later; const det = [];
      let icmsJ = 0, ipiJ = 0, frJ = 0;
      regs.forEach((x, r) => {
        const tx = p.salesTax[x.kind], rv = sold[r] * d.price[j][r];
        const ic = rv / (1 + tx.ipi) * tx.icms, ip = rv / (1 + tx.ipi) * tx.ipi, fr = sold[r] * (p.freight || RULES.freight)[x.kind];
        rev += rv; icmsDeb += ic; ipiDeb += ip; freight += fr; icmsJ += ic; ipiJ += ip; frJ += fr;
        det.push({ receita: rv, icms: ic, ipi: ip, recebido: o.now ? rv / parts : 0, prazo: rv - (o.now ? rv / parts : 0), frete: fr });
      });
      gross += rev;
      if (o.now) recNow += rev / parts;
      for (let k = 1; k <= o.later; k++) add(s.receivables, t + k, rev / parts);
      sales[j] = { regions: regs.map((x, r) => ({ ...x, demand: D[r], sold: sold[r], unmet: D[r] - sold[r], ...det[r] })), qty, demand: sum(D), revenue: rev, cogs: c, unmet: sum(D) - qty, uc, icms: icmsJ, ipi: ipiJ, frete: frJ, avail: qty + s.stock[j].q };
      if (sum(D) > qty) warn.push(`${NAME[j]}: faltou produto para ${sum(D) - qty} un.`);
      s.adHist[j] = [d.ads[j].slice(), s.adHist[j][0]];
      s.adAvgHist[j] = [dem ? dem[j].regions.map((x) => x.adAvgNow) : s.adAvgHist[j][0], s.adAvgHist[j][0]];
      s.diHist[j] = [d.di[j], s.diHist[j][0]];
      s.diAvgHist[j] = [dem ? dem[j].diAvgNow : s.diAvgHist[j][0], s.diAvgHist[j][0]];
      { const L = p.loyalty || { decay: 0.5 }, D0 = sum(D) || 1, prevP = s.lastPrice[j] || [];
        const abuse = d.price[j].reduce((a, v, r) => a + (prevP[r] ? Math.max(0, v / prevP[r] - 1.10) : 0), 0) / nR;
        s.loyal = s.loyal || { P: 0, W: 0 }; s.loyal[j] = Math.min(1, L.decay * (s.loyal[j] || 0) + (sum(D) - qty) / D0 + abuse); }
      s.lastPrice[j] = d.price[j].slice();
    }
    rep.sales = sales;

    // 9. despesas
    const ads = sum(PR.map((j) => sum(d.ads[j]))) * p.adCost;
    const desp = {
      comerciais: { pessoalComercial: RULES.adm.commercial * SF * vacStaff, comissoes: gross * RULES.adm.commission * SF, frete: freight,
        propaganda: ads, inovacaoDesign: d.di.P + d.di.W, depreciacaoPredio: RULES.dep.comBuilding, estocagemProdutos: storageFG },
      administrativas: { pessoalAdm: RULES.adm.admin * SF * vacStaff, energiaAdm: RULES.adm.energyAdm, gerais: RULES.adm.general },
    };
    const saleResult = machSale - machSaleBook;
    let fine = 0;
    if (vac) { s.lastVacation = t; s.vacViol = 0; }
    else if (t - s.lastVacation >= 5) { s.vacViol += 1; fine = RULES.vacationFine * s.vacViol * laborTot; warn.push(`Multa por férias não concedidas: $${fmt(fine)} (acumulativa).`); }
    else if (t - s.lastVacation === 4) warn.push(`Último período para conceder férias coletivas sem multa (últimas no período ${s.lastVacation}).`);
    else if (t - s.lastVacation === 3) warn.push(`Férias coletivas precisam ser dadas até o próximo período (últimas no período ${s.lastVacation}).`);

    // 10. financeiro
    let finExp = 0, finRev = 0; const finDet = [];
    for (const L of s.loans) { const e = L.sched[t]; if (e && e.interest) { finExp += e.interest; finDet.push({ desc: `Juros · ${L.label}`, v: e.interest }); } }
    const appIncome = s.application.amount * s.application.rate; finRev += appIncome;
    const freeRec = {}; for (const [k, v] of Object.entries(s.receivables)) if (+k > t) freeRec[k] = Math.max(0, v - due(s.anticipated, k));
    const freeTot = sum(Object.values(freeRec));
    const ant = Math.min(Math.max(0, +d.anticipation || 0), freeTot);
    if (+d.anticipation > freeTot + 1) warn.push(`Antecipação limitada ao saldo livre a receber ($${fmt(freeTot)}).`);
    if (ant > 0) {
      const sched = {}; for (const [k, v] of Object.entries(freeRec)) { const a = ant * v / freeTot; sched[k] = a; add(s.anticipated, +k, a); }
      s.loans.push(newLoan('anticipation', `Antecipação P${t}`, t, ant, p.bank.anticipation, sched));
    }
    const finMax = buyCost * (p.financingMax != null ? p.financingMax : 1);
    let giro = Math.max(0, +d.giro || 0), fin = Math.min(Math.max(0, +d.financing || 0), finMax);
    if (s.creditLimit != null && giro + fin > s.creditLimit) { // Manual 13.1: crédito limitado para giro e financiamento
      const f = Math.max(0, s.creditLimit) / (giro + fin); warn.push(`Limite de crédito ($${fmt(s.creditLimit)}) insuficiente: giro e financiamento reduzidos para ${Math.round(f * 100)}% do pedido.`); giro *= f; fin *= f; }
    if (+d.financing > finMax + 0.5) warn.push(`Financiamento limitado a ${Math.round((p.financingMax != null ? p.financingMax : 1) * 100)}% das máquinas compradas ($${fmt(finMax)}).`);
    const bankDebt = sum(s.loans.filter((L) => L.kind === 'giro' || L.kind === 'financing').map((L) => loanBalance(L, t + 1)));

    // 11. DRE
    const despCom = sum(Object.values(desp.comerciais)), despAdm = sum(Object.values(desp.administrativas));
    const deductions = icmsDeb + ipiDeb, netRev = gross - deductions;
    const grossProfit = netRev - cogs - unabsorbed;
    const perdas = strikeCost + fine;
    const ebit = grossProfit - despCom - despAdm + saleResult - perdas;
    const lair = ebit + finRev - finExp;
    const ir = lair > 0 ? lair * RULES.ir : 0, csll = lair > 0 ? lair * RULES.csll : 0;
    const afterTax = lair - ir - csll;
    const plr = afterTax > 0 ? afterTax * Math.max(0, +d.plr || 0) : 0;
    const net = afterTax - plr;
    rep.dre = { receitaBruta: gross, deducoes: deductions, icms: icmsDeb, ipi: ipiDeb, receitaLiquida: netRev, cpv: cogs + unabsorbed, lucroBruto: grossProfit,
      despComerciais: despCom, despAdministrativas: despAdm, vendaImobilizado: saleResult, perdas, greve: strikeCost, multaFerias: fine,
      ebit, receitasFinanceiras: finRev, despesasFinanceiras: finExp, lair, ir, csll, plr, lucroLiquido: net, detalhe: desp, financeiro: finDet };

    // 12. caixa
    const cf = { entradas: {}, saidas: {} };
    const IN = (k, v) => { if (v > 0.005) cf.entradas[k] = (cf.entradas[k] || 0) + v; };
    const OUT = (k, v) => { if (v > 0.005) cf.saidas[k] = (cf.saidas[k] || 0) + v; };
    IN('Vendas recebidas no período', recNow);
    IN('Recebimento de clientes (parcelas)', due(s.receivables, t)); delete s.receivables[t]; delete s.anticipated[t];
    IN('Resgate de aplicação + rendimento', s.application.amount + appIncome);
    IN('Antecipação de recebíveis', ant); IN('Empréstimo de giro', giro); IN('Financiamento', fin); IN('Venda de imobilizado', machSale);
    const staffCost = cif.gerentes + cif.apoio + desp.comerciais.pessoalComercial + desp.comerciais.comissoes + desp.administrativas.pessoalAdm;
    const payroll = laborTot + strikeCost + staffCost;
    OUT('Salários, comissões e encargos', payroll * CASHSHARE);
    const provAdd = payroll * (1 - CASHSHARE);
    s.provisions.ferias += provAdd * RULES.provFerias / (RULES.provFerias + RULES.prov13);
    s.provisions.decimo += provAdd * RULES.prov13 / (RULES.provFerias + RULES.prov13);
    if (vac) { OUT('Pagamento de férias', s.provisions.ferias); s.provisions.ferias = 0; }
    if (t % 4 === 0) { OUT('Pagamento de 13º salário', s.provisions.decimo); s.provisions.decimo = 0; }
    OUT('Impostos (IR e CSLL)', due(s.taxIR, t)); delete s.taxIR[t];
    OUT('Impostos (IPI e ICMS)', due(s.taxICMS, t) + due(s.taxIPI, t)); delete s.taxICMS[t]; delete s.taxIPI[t];
    let amort = 0, interest = 0;
    for (const L of s.loans) { const e = L.sched[t]; if (e) { amort += e.principal; interest += e.interest; } }
    OUT('Amortização de empréstimos e antecipações', amort); OUT('Juros de empréstimos e antecipações', interest);
    OUT('Fornecedores (parcelas)', due(s.payables, t)); delete s.payables[t];
    OUT('Compras de insumos (à vista e entradas)', cashNowPurch);
    OUT('Compra de imobilizados', buyCost);
    OUT('Energia das máquinas', energy.P + energy.W); OUT('Energia prédios adm/com', RULES.adm.energyAdm);
    OUT('Despesas gerais administrativas', RULES.adm.general); OUT('Frete', freight); OUT('Propaganda', ads); OUT('Inovação & Design', d.di.P + d.di.W);
    OUT('Estocagem', cif.estocagem + storageFG); OUT('Manutenção da fábrica', cif.manutencao); OUT('Seguro da fábrica', cif.seguro);
    OUT('Benefícios', benefits); OUT('Treinamento', training); OUT('Indenizações', indemn); OUT('Multa de férias', fine);
    OUT('Participação nos lucros', plr);
    const app = Math.max(0, +d.application || 0); OUT('Aplicação financeira', app);
    s.yearResult += net; s.accResult += net;
    if (t % 4 === 0) {
      const div = s.yearResult > 0 ? s.yearResult * 0.10 : 0;
      s.capital += s.yearResult - div; s.yearResult = 0; OUT('Dividendos', div);
      warn.push(`Fechamento do ano: dividendos de $${fmt(div)}; 90% do lucro do ano vai para o capital.`);
    }
    const totIn = sum(Object.values(cf.entradas)), totOut = sum(Object.values(cf.saidas));
    let cash = s.cash + totIn - totOut, special = 0;
    if (giro) { const n = +d.giroInstallments === 2 && (p.giroMaxInstallments || 2) >= 2 ? 2 : 1; const sc = {}; for (let k = 1; k <= n; k++) sc[t + k] = giro / n; s.loans.push(newLoan('giro', `Giro P${t}`, t, giro, p.bank.giro * risk, sc)); }
    if (fin) s.loans.push(newLoan('financing', `Financiamento P${t}`, t, fin, p.bank.financing * risk, { [t + (p.financingGrace != null ? p.financingGrace : 2) + 1]: fin / 2, [t + (p.financingGrace != null ? p.financingGrace : 2) + 2]: fin / 2 }));
    if (cash < 0) { special = -cash; cash = 0; s.loans.push(newLoan('special', `Especial P${t}`, t, special, p.bank.special * risk, { [t + 1]: special })); warn.push(`Caixa negativo: empréstimo especial automático de $${fmt(special)}.`); }
    cf.inicial = s.cash; cf.totalEntradas = totIn; cf.totalSaidas = totOut; cf.especial = special; cf.final = cash;
    rep.cashflow = cf;
    s.cash = cash; s.application = { amount: app, rate: p.bank.application };
    add(s.taxIR, t + 1, ir + csll);
    const icmsBal = icmsDeb - icmsCred - s.taxCredit.icms, ipiBal = ipiDeb - ipiCred - s.taxCredit.ipi;
    s.taxCredit.icms = icmsBal < 0 ? -icmsBal : 0; s.taxCredit.ipi = ipiBal < 0 ? -ipiBal : 0;
    add(s.taxICMS, t + 1, Math.max(0, icmsBal)); add(s.taxIPI, t + 1, Math.max(0, ipiBal));
    rep.taxes = { icmsDeb, icmsCred, ipiDeb, ipiCred };
    for (const k of Object.keys(mov)) mov[k].fim = { ...s.stock[k] };
    for (const it of s.inTransit) { mov[it.item].fim.q += it.q; mov[it.item].fim.v += it.v; }
    rep.stock = mov; rep.storage = { item: storageItem, fg: storageFG };
    s.loans = s.loans.filter((L) => Object.keys(L.sched).some((k) => +k > t));
    s.lastRH = { salary: d.salary, med: d.med, food: d.food, plr: d.plr };
    s.salary = d.salary; s.sat = sat;

    // 13. balanço e RAA
    const bs = balanceSheet(s, t + 1);
    s.assetsSum += bs.ativoTotal; s.assetsCount += 1;
    if (s.plSum == null) s.plSum = (bs.pl - net) * (s.assetsCount - 1);
    s.plSum += bs.pl; const avgPL = s.plSum / s.assetsCount;
    const avgA = s.assetsSum / s.assetsCount;
    rep.balance = bs;
    rep.production = { prod, limits, normalH, vacH, otH, trainH, strikeH, availH, opUsed, opIndex: s.opIndex, mi, sat, satAvg, strike, hourCost };
    rep.costs = { pc, cif, cifTot, direct, energy, unabsorbed, machDep, vehDep };
    rep.kpi = { lucroLiquido: net, resultadoAcumulado: s.accResult, ativoMedio: avgA, plMedio: avgPL, rpl: avgPL ? s.accResult / avgPL : 0, raa: s.accResult / avgA, margem: netRev ? net / netRev : 0 };
    // Manual 13.1: limite ~ patrimônio líquido; risco pelo endividamento e pela rentabilidade (faixas aproximadas dos relatórios reais)
    { const debt = sum(s.loans.map((L) => loanBalance(L, t + 1))), lev = bs.pl > 0 ? debt / bs.pl : 9;
      s.creditLimit = Math.max(0, bs.pl);
      s.riskClass = lev < 0.5 && net >= 0 ? 'A' : lev < 1 && net >= 0 ? 'B' : 'C'; rep.risk = { lev, cls: s.riskClass }; }
    s.period = t + 1;
    return { report: rep, state: s };
  }

  function balanceSheet(s, nextP) {
    const mach = s.machines.concat(s.machinesPending);
    const f = s.fixed;
    const det = {
      caixa: s.cash, aplicacao: s.application.amount, clientes: futureSum(s.receivables, nextP - 1),
      icmsRecuperar: s.taxCredit.icms, ipiRecuperar: s.taxCredit.ipi,
      estoqueInsumos: sum(RULES.items.map((i) => s.stock[i].v)) + sum(s.inTransit.map((x) => x.v)), estoqueProdutos: s.stock.P.v + s.stock.W.v,
      predios: f.build, deprPredios: f.accBuild, maquinas: sum(mach.map((g) => g.qty * g.cost)), deprMaquinas: sum(mach.map((g) => g.accDep)),
      veiculos: f.veh, deprVeiculos: f.accVeh, terrenos: f.land,
      fornecedores: futureSum(s.payables, nextP - 1), irCsll: futureSum(s.taxIR, nextP - 1), icms: futureSum(s.taxICMS, nextP - 1), ipi: futureSum(s.taxIPI, nextP - 1),
      provisoes: s.provisions.ferias + s.provisions.decimo, emprestimos: sum(s.loans.map((L) => loanBalance(L, nextP))),
    };
    det.circulante = det.caixa + det.aplicacao + det.clientes + det.icmsRecuperar + det.ipiRecuperar + det.estoqueInsumos + det.estoqueProdutos;
    det.naoCirculante = det.predios - det.deprPredios + det.maquinas - det.deprMaquinas + det.veiculos - det.deprVeiculos + det.terrenos;
    const ativo = { caixa: det.caixa, aplicacoes: det.aplicacao, clientes: det.clientes, impostosRecuperar: det.icmsRecuperar + det.ipiRecuperar,
      estoqueInsumos: det.estoqueInsumos, estoqueProdutos: det.estoqueProdutos, imobilizado: det.naoCirculante };
    const passivo = { fornecedores: det.fornecedores, impostos: det.irCsll + det.icms + det.ipi, provisoes: det.provisoes, emprestimos: det.emprestimos };
    const at = sum(Object.values(ativo)), pt = sum(Object.values(passivo)), pl = s.capital + s.yearResult;
    return { ativo, passivo, det, ativoTotal: at, passivoTotal: pt, capital: s.capital, lucroADestinar: s.yearResult, pl, diferenca: at - pt - pl };
  }
  function fmt(v) { return Math.round(v).toLocaleString('pt-BR'); }

  // ------------------------------------------------------------------ importação da exportação "TODOS" do SimulWeb
  function importExport(sheets) {
    const S = (n) => { const k = Object.keys(sheets).find((x) => x.trim().toLowerCase().startsWith(n.toLowerCase())); if (!k) throw new Error('Aba não encontrada: ' + n); return sheets[k]; };
    const num = (x) => { const v = parseFloat(String(x).replace(/\s/g, '')); return isFinite(v) ? v : 0; };
    const c0 = (r) => String(r[0] == null ? '' : r[0]).trim();
    const find = (rows, label, col = 1) => { const r = rows.find((x) => c0(x) === label); return r ? num(r[col]) : 0; };
    const findAll = (rows, label) => rows.filter((x) => c0(x) === label);

    const ac = S('Análise Comparativa');
    const hdr = ac.find((r) => c0(r) === 'Descrição');
    const realCols = hdr.map((h, i) => [String(h), i]).filter(([h]) => /_Real$/.test(h));
    const t = parseInt(realCols[realCols.length - 1][0].match(/#(\d+)/)[1], 10);
    const vacRow = ac.find((r) => c0(r) === 'Férias coletivas no Período');
    let lastVacation = 0; realCols.forEach(([h, i]) => { if (num(vacRow[i]) > 0) lastVacation = parseInt(h.match(/#(\d+)/)[1], 10); });

    const bp = S('Balanço Patrimonial');
    const bpv = (l) => find(bp, l);
    const dep = findAll(bp, '(-) Depr. acumulada').map((r) => num(r[1]));

    const cr = S('Contas a Receber');
    const crHdr = cr.find((r) => c0(r) === 'CONTAS A RECEBER');
    const periods = crHdr.slice(1).map((x) => parseInt(String(x).replace(/\D/g, ''), 10)).filter((x) => x > 0);
    const block = (title, label) => {
      const i = cr.findIndex((r) => c0(r) === title); if (i < 0) return periods.map(() => 0);
      const rest = cr.slice(i + 1); const stop = rest.findIndex((r) => ['Clientes', 'Aplicação Financeira', 'Financiamento', 'Empréstimo de Giro', 'Antecipação de Recebíveis', 'Empréstimo Especial', 'Compra de Insumos', 'Impostos', 'CONTAS A PAGAR'].includes(c0(r)) && c0(r) !== title);
      const r = (stop < 0 ? rest : rest.slice(0, stop)).find((x) => c0(x) === label);
      return r ? periods.map((_, k) => num(r[k + 1])) : periods.map(() => 0);
    };
    const toMap = (arr) => { const m = {}; periods.forEach((p, k) => { if (arr[k]) m[p] = arr[k]; }); return m; };
    const riskRow = cr.find((r) => c0(r).startsWith('Classificação de risco'));
    const limitRow = cr.find((r) => c0(r).startsWith('Limite de crédito'));
    const receivables = toMap(block('Clientes', 'Valor Total'));
    const anticipated = toMap(block('Clientes', 'Valor já Antecipado').map((x) => -x));
    const loans = [];
    const mkLoan = (kind, label, title, pl, il) => {
      const pr = block(title, pl), it = block(title, il); if (!sum(pr) && !sum(it)) return;
      const L = { kind, label, sched: {} }; periods.forEach((p, k) => { if (pr[k] || it[k]) L.sched[p] = { principal: pr[k], interest: it[k] }; }); loans.push(L);
    };
    mkLoan('financing', 'Financiamentos', 'Financiamento', 'Valor', 'Juros');
    mkLoan('giro', 'Empréstimos de giro', 'Empréstimo de Giro', 'Amortização', 'Juros');
    mkLoan('anticipation', 'Antecipações', 'Antecipação de Recebíveis', 'Amortização', 'Juros');
    mkLoan('special', 'Empréstimo especial', 'Empréstimo Especial', 'Amortização', 'Juros');
    const payables = toMap(block('Compra de Insumos', 'Valor Parcela(s)'));
    const ir = block('Impostos', 'IR'), cs = block('Impostos', 'CSSL'), icms = block('Impostos', 'ICMS'), ipi = block('Impostos', 'IPI');
    const taxIR = toMap(ir.map((x, k) => x + cs[k])), taxICMS = toMap(icms), taxIPI = toMap(ipi);
    const appAmt = block('Aplicação Financeira', 'Valor Aplicado')[0] || 0, appRend = block('Aplicação Financeira', 'Rendimentos')[0] || 0;

    const es = S('Estoque');
    // o relatório tem blocos lado a lado (colunas 0-3 e 5-8); pega o último "(=) Estoque Final" de cada bloco
    const stock = { P: { q: 0, v: 0 }, W: { q: 0, v: 0 }, kitP: { q: 0, v: 0 }, kitW: { q: 0, v: 0 }, emb: { q: 0, v: 0 } };
    let sec = 'fg';
    for (const r of es) {
      const k = c0(r);
      if (k.startsWith('ESTOQUE DE INSUMOS')) sec = 'kits';
      if (k === 'Embalagem e acessórios') sec = 'emb';
      const L = { fg: 'P', kits: 'kitP', emb: 'emb' }[sec], Rk = { fg: 'W', kits: 'kitW', emb: null }[sec];
      if (k === '(=) Estoque Final') stock[L] = { q: num(r[1]), v: num(r[3]) };
      if (Rk && String(r[5] == null ? '' : r[5]).trim() === '(=) Estoque Final') stock[Rk] = { q: num(r[6]), v: num(r[8]) };
    }
    const inTransit = [];
    const cp = S('Compras');
    const itemKey = { 'Kit Smartphone': 'kitP', 'Kit Smartwatch': 'kitW', 'Embalagem e acessórios': 'emb' };
    let inC = false;
    for (const r of cp) {
      const k = c0(r);
      if (k === 'COMPRA DE INSUMOS') { inC = true; continue; }
      if (k.startsWith('COMPRA DE IMOBILIZADOS') || k === 'Totais') inC = false;
      if (inC && itemKey[k] && /Lallemand|Playphone/i.test(r[1])) inTransit.push({ item: itemKey[k], q: num(r[2]), v: num(r[10]) });
    }
    for (const it of inTransit) { stock[it.item].q -= it.q; stock[it.item].v -= it.v; if (stock[it.item].q < 0.5) stock[it.item] = { q: 0, v: 0 }; }

    const rp = S('Recursos da Produção');
    const workers = find(rp, 'Quantidade Disponível');
    const prodRows = findAll(rp, 'Produtividade');
    const opIndex = num(prodRows[0][1]);
    const machQty = findAll(rp, 'Quantidade Disponível')[1];
    const wearPer = findAll(rp, 'Desgaste no período (%)')[0] || [0, 0, 0];
    const machProd = prodRows[1];
    const qP = num(machQty[1]), qW = num(machQty[2]);
    const grossM = bpv('Máquinas'), accM = dep[1] || 0;
    const machinesPending = [];
    let inI = false;
    for (const r of cp) {
      const k = c0(r);
      if (k.startsWith('COMPRA DE IMOBILIZADOS')) { inI = true; continue; }
      const m = k.match(/^Máquina ([PW]) (V[12])$/);
      if (inI && m) { const key = `${m[1]}-${m[2]}`, mm = RULES.machineModels[key]; machinesPending.push({ model: key, type: mm.type, qty: num(r[1]), prod: mm.prod, wear: 0, cost: mm.price, accDep: 0, cv: mm.cv }); }
    }
    const pendGross = sum(machinesPending.map((m) => m.qty * m.cost));
    const wP = qP * 90000, wW = qW * 70000, wt = wP + wW || 1, gAct = grossM - pendGross;
    const machines = [];
    if (qP) machines.push({ model: 'P (atual)', type: 'P', qty: qP, prod: num(machProd[1]) * (1 - num(wearPer[1]) / 100), wear: 0, cost: gAct * wP / wt / qP, accDep: accM * wP / wt, cv: 7.21 });
    if (qW) machines.push({ model: 'W (atual)', type: 'W', qty: qW, prod: num(machProd[2]) * (1 - num(wearPer[2]) / 100), wear: 0, cost: gAct * wW / wt / qW, accDep: accM * wW / wt, cv: 5.5 });

    const mod = S('Mercado da Mão de Obra');
    const satRows = mod.filter((r) => num(r[1]) > 0 && num(r[1]) < 2 && !c0(r).startsWith('*') && c0(r) !== 'Descrição');
    const satOwn = satRows.length ? num(satRows[0][1]) : 0.8;
    const satAvg = find(mod, '*Média*') || satOwn;
    const salary = find(mod, 'Salário Hora') || 12;
    const medTxt = String((mod.find((r) => c0(r) === 'Assistência Médica') || [])[1] || '');
    const foodTxt = String((mod.find((r) => c0(r) === 'Alimentação') || [])[1] || '');
    const plr = find(mod, 'Participação nos Lucros (%)') / 100;
    const medK = /Complet/i.test(medTxt) ? 'full' : /Básic/i.test(medTxt) ? 'basic' : 'none';
    const foodK = /Vale/i.test(foodTxt) ? 'voucher' : /Empresa/i.test(foodTxt) ? 'rest' : 'none';

    const dec = parseDecisions(S('Decisões'));
    const market = parseMarket(S('Market Share'));
    const ferDec = bpv('13º Salário e Férias a Pagar');
    const k13 = t % 4; // períodos de 13º acumulados desde o último pagamento
    const sinceVac = Math.max(1, t - lastVacation);
    const decimo = k13 ? ferDec * (RULES.prov13 * k13) / (RULES.prov13 * k13 + RULES.provFerias * sinceVac) : 0;
    const state = {
      period: t + 1, riskClass: String(riskRow ? riskRow[1] : 'A').trim() || 'A', creditLimit: limitRow ? num(limitRow[1]) : null,
      cash: bpv('Caixa'), application: { amount: appAmt, rate: appAmt ? appRend / appAmt : 0.0325 },
      receivables, anticipated, payables, taxIR, taxICMS, taxIPI, loans,
      taxCredit: { icms: bpv('ICMS a Recuperar'), ipi: bpv('IPI a Recuperar') },
      provisions: { ferias: ferDec - decimo, decimo },
      stock, inTransit, machines, machinesPending,
      fixed: { land: bpv('Terrenos'), build: bpv('Prédios e Un. de Armazenagem'), accBuild: dep[0] || 0, veh: bpv('Veículos'), accVeh: dep[2] || 0, vehicleLifeLeft: Math.max(0, Math.round((bpv('Veículos') * 0.9 - (dep[2] || 0)) / RULES.dep.vehicle)) },
      workers, opIndex, salary, sat: satOwn,
      lastRH: { salary, med: medK, food: foodK, plr },
      lastVacation, vacViol: 0,
      lastPrice: { P: dec.price.P.slice(), W: dec.price.W.slice() },
      adHist: { P: [dec.ads.P.slice(), dec.ads.P.slice()], W: [dec.ads.W.slice(), dec.ads.W.slice()] },
      adAvgHist: { P: [market.P.aavg.slice(), market.P.aavg.slice()], W: [market.W.aavg.slice(), market.W.aavg.slice()] },
      diHist: { P: [dec.di.P, dec.di.P], W: [dec.di.W, dec.di.W] }, diAvgHist: { P: [market.P.diavg, market.P.diavg], W: [market.W.diavg, market.W.diavg] },
      capital: bpv('Capital Social'), yearResult: find(bp, 'Lucro a destinar'),
      accResult: find(bp, 'Resultado Acumulado'), assetsSum: find(bp, 'Ativo Médio') * (t + 1), assetsCount: t + 1,
    };
    const N = 4;
    const rivals = { satRivals: (N * satAvg - satOwn) / (N - 1) };
    for (const j of PR) {
      const mk = market[j];
      rivals[j] = {
        price: mk.pavg.map((pa, r) => Math.round((N * pa - dec.price[j][r]) / (N - 1))),
        ads: mk.aavg.map((a, r) => Math.max(0, +((N * a - dec.ads[j][r]) / (N - 1)).toFixed(2))),
        di: Math.max(0, Math.round((N * mk.diavg - dec.di[j]) / (N - 1))),
        term: Math.max(0, Math.round((N * mk.tavg - termDays(dec.term[j])) / (N - 1))),
      };
    }
    // histórico dos períodos realizados (Análise Comparativa)
    const history = realCols.map(([h, i]) => ({ period: parseInt(h.match(/#(\d+)/)[1], 10) }));
    const grab = (label, key, block) => {
      let rows = ac; if (block) { const bi = ac.findIndex((r) => c0(r) === block); rows = ac.slice(bi); }
      const r = rows.find((x) => c0(x) === label); if (!r) return;
      realCols.forEach(([, i], k) => { history[k][key] = num(r[i]); });
    };
    grab('Resultado Acumulado', 'accResult'); grab('Rentabilidade do Ativo Acumulado', 'raa'); grab('Resultado Líquido', 'net'); grab('Caixa Final', 'cash');
    grab('E. Especial', 'special'); grab('Margem Líquida', 'margin'); grab('Receita Bruta de Vendas', 'revenue'); grab('Horas Ociosas de Operador', 'idleOp'); grab('Coef. Satisfação de Operador', 'sat');
    for (const [j, nm] of [['P', 'Smartphone'], ['W', 'Smartwatch']]) {
      grab('Demandas Totais (un)', 'dem' + j, nm); grab('Vendas Totais (un)', 'sales' + j, nm); grab('Preço Médio de Venda', 'price' + j, nm);
      grab('Participação de mercado (%)', 'share' + j, nm); grab('Estoque disponível (un)', 'avail' + j, nm);
      grab('Propaganda média (inserções)', 'ads' + j, nm); grab('Prazo Recebimento Clientes (dias)', 'term' + j, nm); grab('Inovação & Design', 'di' + j, nm);
    }
    const rank = (() => { try { return S('Ranking').filter((r) => num(r[2]) > 0).map((r) => ({ pos: String(r[0]), name: String(r[1]), raa: num(r[2]) })); } catch (e) { return []; } })();
    return { state, decisions: dec, market, rivals, period: t, history, ranking: rank };
  }

  function parseDecisions(rows) {
    const numBR = (x) => { const v = parseFloat(String(x).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : 0; };
    const numAny = (x) => { const s = String(x).trim(); if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s); return numBR(s); };
    const c0 = (r) => String(r[0] == null ? '' : r[0]).trim();
    const d = { price: { P: [], W: [] }, ads: { P: [], W: [] }, forecast: { P: [], W: [] }, di: { P: 0, W: 0 }, term: { P: 'AV', W: 'AV' }, production: { P: 0, W: 0 }, priority: 'P',
      purchases: [], buyMachines: { 'P-V1': 0, 'P-V2': 0, 'W-V1': 0, 'W-V2': 0 }, sellMachines: { P: 0, W: 0 }, hire: 0, fire: 0, training: 'none', overtime: 0, vacation: false, salary: 12, plr: 0, med: 'none', food: 'none',
      giro: 0, giroInstallments: 1, financing: 0, anticipation: 0, application: 0 };
    const termCode = (txt) => { const t = String(txt).toLowerCase(); if (t.includes('vista')) return 'AV'; const m = t.match(/(\d) parcela/); const n = m ? +m[1] : 1; return (t.includes('entrada') && !t.includes('sem entrada') ? 'E' : '') + n + 'P'; };
    let cur = null, sec = '';
    for (const r of rows) {
      const k = c0(r);
      if (['MARKETING', 'FABRICAÇÃO', 'RECURSOS HUMANOS', 'COMPRA E VENDA DE IMOBILIZADOS', 'COMPRA DE INSUMOS', 'FINANÇAS'].includes(k)) { sec = k; continue; }
      if (sec === 'MARKETING') {
        if (k === 'Smartphone') cur = 'P'; else if (k === 'Smartwatch') cur = 'W';
        else if (k.startsWith('Prazo concedido')) d.term[cur] = termCode(k);
        else if (k.startsWith('Inovação')) d.di[cur] = numBR(k.split('$')[1]);
        else if (/^R\.#\d/.test(k)) { d.price[cur].push(numAny(r[1])); d.ads[cur].push(numAny(r[2])); d.forecast[cur].push(numAny(r[3])); }
      } else if (sec === 'FABRICAÇÃO') {
        if (k === 'Smartphone' || k === 'Smartwatch') { const j = k === 'Smartphone' ? 'P' : 'W'; d.production[j] = numBR(r[1]); if (numAny(r[2]) === 1) d.priority = j; }
      } else if (sec === 'RECURSOS HUMANOS') {
        const v = String(r[1]).trim();
        if (k === 'Contratação Desejada') d.hire = numAny(v); if (k === 'Demitidos') d.fire = numAny(v);
        if (k === 'Ritmo Operação') d.overtime = /2 Horas/i.test(v) ? 2 : /1 Hora/i.test(v) ? 1 : 0;
        if (k.startsWith('Férias Concedidas')) d.vacation = /Sim/i.test(v);
        if (k.startsWith('Participação no Lucro')) d.plr = numAny(v) / 100;
        if (k === 'Preço/Hora') d.salary = numAny(v);
        if (k === 'Assistência Médica') d.med = /Complet/i.test(v) ? 'full' : /Básic/i.test(v) ? 'basic' : 'none';
        if (k === 'Alimentação') d.food = /Vale/i.test(v) ? 'voucher' : /Empresa/i.test(v) ? 'rest' : 'none';
        if (k.startsWith('Treinamento')) d.training = /Avan/i.test(v) ? 'adv' : /Básic/i.test(v) ? 'basic' : 'none';
      } else if (sec === 'COMPRA E VENDA DE IMOBILIZADOS') {
        const m = k.match(/Máquina ([PW]) (V[12])/);
        if (m) { const q = numAny(r[2]); if (/Venda/i.test(r[1])) d.sellMachines[m[1]] += q; else d.buyMachines[`${m[1]}-${m[2]}`] += q; }
      } else if (sec === 'COMPRA DE INSUMOS') {
        const key = { 'Kit Smartphone': 'kitP', 'Kit Smartwatch': 'kitW', 'Embalagem e acessórios': 'emb' }[k];
        if (key) d.purchases.push({ item: key, qty: numBR(r[1]), supplier: /Fast/i.test(r[2]) ? 'Fasterix' : /Play/i.test(r[2]) ? 'Playphone' : 'Lallemand', pay: termCode(r[3]) });
      } else if (sec === 'FINANÇAS') {
        if (k.startsWith('Financiamento')) d.financing = numAny(r[1]);
        if (k.startsWith('Empréstimo de giro')) { d.giro = numAny(r[1]); d.giroInstallments = /2/.test(r[3]) ? 2 : 1; }
        if (k.startsWith('Antecipação')) d.anticipation = numAny(r[1]);
        if (k.startsWith('Aplicação')) d.application = numAny(r[1]);
      }
    }
    return d;
  }

  function parseMarket(rows) {
    const num = (x) => { const v = parseFloat(x); return isFinite(v) ? v : 0; };
    const out = {}; let j = null, blk = '';
    for (const r of rows) {
      const k = String(r[0] == null ? '' : r[0]).trim();
      if (k === 'Smartphone' || k === 'Smartwatch') { j = k === 'Smartphone' ? 'P' : 'W'; out[j] = { prices: {}, share: {} }; blk = ''; continue; }
      if (k.startsWith('DEMANDA E VENDA')) blk = 'dv'; else if (k.startsWith('PREÇO, PROPAGANDA')) blk = 'avg'; else if (k.startsWith('PREÇOS PRATICADOS')) blk = 'pp'; else if (k.startsWith('MARKET SHARE')) blk = 'sh';
      else if (blk === 'dv' && (k === 'Demanda' || k === 'Venda')) out[j][k === 'Demanda' ? 'demand' : 'sales'] = r.slice(1, 6).map(num);
      else if (blk === 'avg' && k === 'Preço') out[j].pavg = r.slice(1, 6).map(num);
      else if (blk === 'avg' && k === 'Propaganda') out[j].aavg = r.slice(1, 6).map(num);
      else if (blk === 'avg' && k === 'Prazo') out[j].tavg = num(r[6]);
      else if (blk === 'avg' && k.startsWith('Inova')) out[j].diavg = num(r[6]);
      else if ((blk === 'pp' || blk === 'sh') && k && k !== 'Empresa' && k !== 'Descrição') out[j][blk === 'pp' ? 'prices' : 'share'][k] = r.slice(1, 6).map(num);
    }
    return out;
  }

  function decisionsFrom(imp) {
    const d = clone(imp.decisions);
    d.purchases = d.purchases.filter((x) => x.qty > 0);
    d.hire = 0; d.fire = 0; d.vacation = false; d.giro = 0; d.financing = 0; d.anticipation = 0; d.application = 0;
    d.buyMachines = { 'P-V1': 0, 'P-V2': 0, 'W-V1': 0, 'W-V2': 0 }; d.sellMachines = { P: 0, W: 0 };
    d.scenario = clone(imp.rivals);
    return d;
  }

  // Manual 5.1: regiões = número de empresas + 1 (externo é sempre a última). Ajusta vetores por região.
  function fitRegions(arr, nR, own) {
    if (!Array.isArray(arr) || arr.length === nR) return arr;
    const ext = arr[arr.length - 1], loc = arr[Math.min(1, arr.length - 2)], comp = arr[0];
    return Array.from({ length: nR }, (_, r) => (r === nR - 1 ? ext : r === own ? loc : comp));
  }
  function resizeRegions(state, dec, N, own) {
    const nR = N + 1, f = (a) => fitRegions(a, nR, own);
    if (dec) for (const j of PR) {
      ['price', 'ads', 'forecast'].forEach((k) => { if (dec[k] && dec[k][j]) dec[k][j] = f(dec[k][j]); });
      if (dec.scenario && dec.scenario[j]) { dec.scenario[j].price = f(dec.scenario[j].price); dec.scenario[j].ads = f(dec.scenario[j].ads); }
    }
    if (state) for (const j of PR) {
      if (state.lastPrice && state.lastPrice[j]) state.lastPrice[j] = f(state.lastPrice[j]);
      if (state.adHist && state.adHist[j]) state.adHist[j] = state.adHist[j].map(f);
      if (state.adAvgHist && state.adAvgHist[j]) state.adAvgHist[j] = state.adAvgHist[j].map(f);
    }
  }

  const API = { RULES, PARAMS, seasonAt, resizeRegions, simulate, demand, importExport, parseDecisions, parseMarket, decisionsFrom, balanceSheet, termDays, satisfaction, clone };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SimEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
