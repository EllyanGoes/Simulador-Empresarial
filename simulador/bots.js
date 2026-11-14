// Concorrentes automáticos (bots) e resolução conjunta do mercado entre 4 empresas.
(function (root) {
  const E = root.SimEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const RU = E.RULES, PR = ['P', 'W'], clone = E.clone;

  const PERSONAS = {
    volume: { label: 'Volume', desc: 'Preço baixo, muita propaganda, prazo longo e expansão de fábrica.', priceM: 0.93, extM: 1.08, ads: 5, adsExt: 4, diM: 1, term: 'E2P', salary: 12.5, med: 'basic', food: 'none', plr: 0.05, stock: 1.08, expand: 2 },
    premium: { label: 'Premium', desc: 'Preço alto, inovação forte, bons benefícios e produção enxuta.', priceM: 1.1, extM: 1.18, ads: 4, adsExt: 3, diM: 2.5, term: 'E1P', salary: 14, med: 'full', food: 'rest', plr: 0.08, stock: 1.0, expand: 0 },
    inovador: { label: 'Inovador', desc: 'Aposta pesada em inovação e design, preço um pouco acima da média e foco no smartwatch.', priceM: 1.05, extM: 1.15, ads: 4, adsExt: 3, diM: 3.5, term: 'E1P', salary: 13, med: 'basic', food: 'rest', plr: 0.06, stock: 1.02, expand: 1, focusW: true },
    agressivo: { label: 'Agressivo', desc: 'Guerra de preço, propaganda no máximo útil e prazo de 2 parcelas para ganhar mercado.', priceM: 0.88, extM: 1.05, ads: 7, adsExt: 5, diM: 0.8, term: '2P', salary: 12.5, med: 'none', food: 'rest', plr: 0.05, stock: 1.1, expand: 2 },
    conservador: { label: 'Conservador', desc: 'Preço na média, gasto contido e caixa protegido com aplicação financeira.', priceM: 1.0, extM: 1.15, ads: 3, adsExt: 3, diM: 1, term: 'E1P', salary: 12.5, med: 'none', food: 'rest', plr: 0.05, stock: 0.98, expand: 1 },
  };
  const LEVELS = {
    facil: { label: 'Fácil', noise: 0.15, err: 0.05, adapt: 0, season: false, optimize: false, cash: true },
    medio: { label: 'Médio', noise: 0.07, err: 0.02, adapt: 0.03, season: true, optimize: false, cash: true },
    dificil: { label: 'Difícil', noise: 0.02, err: 0, adapt: 0.04, season: true, optimize: true, cash: true },
  };
  const NAMES = [['Vértice', 'volume'], ['Orbis', 'premium'], ['Nimbus', 'conservador'], ['Quasar', 'inovador'], ['Zênite', 'agressivo']];
  const REGIONS = [1, 3, 4, 5, 6]; // região 2 é do jogador; cada empresa tem a sua (Manual 5.1)

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : 0);

  function paramsFor(params, region) { const p = clone(params); p.ownRegion = region; return p; }

  function create(baseImp, difficulty, seed, nBots) {
    nBots = Math.max(1, Math.min(NAMES.length, nBots || 3));
    const d0 = E.decisionsFrom(baseImp);
    return {
      difficulty, seed,
      list: NAMES.slice(0, nBots).map(([name, persona], i) => { const st = clone(baseImp.state), dd = clone(d0); E.resizeRegions(st, dd, nBots + 1, REGIONS[i] - 1);
        return { id: 'b' + i, name, persona, region: REGIONS[i], state: st, dec: dd, mult: { P: 1, W: 1 }, last: null, hist: [] }; }),
      market: null,
    };
  }

  // capacidade de produção (unidades) considerando máquinas que chegam no início do período
  function capacity(s, j) {
    const h = RU.hours, bom = RU.bom[j];
    return Math.floor(sum(s.machines.concat(s.machinesPending || []).filter((m) => m.type === j).map((m) => m.qty * h * (m.prod || 1) * (1 - (m.wear || 0)))) / bom.machH);
  }
  const itemsAvail = (s, it) => (s.stock[it] ? s.stock[it].q : 0) + sum((s.inTransit || []).filter((x) => x.item === it).map((x) => x.q));

  // decisões de um bot para o período atual do seu estado
  function decide(bot, ctx) {
    const s = bot.state, t = s.period, P = PERSONAS[bot.persona], L = LEVELS[ctx.difficulty], p = paramsFor(ctx.params, bot.region);
    const R = rng((ctx.seed || 1) * 7919 + t * 131 + bot.region * 17);
    const nz = (x) => 1 + (R() * 2 - 1) * x;
    const d = clone(bot.dec), nR = d.price.P.length;
    Object.assign(d, { hire: 0, fire: 0, giro: 0, financing: 0, anticipation: 0, application: 0, buyMachines: { 'P-V1': 0, 'P-V2': 0, 'W-V1': 0, 'W-V2': 0 }, sellMachines: { P: 0, W: 0 }, overtime: 0, training: 'none' });
    d.scenario = clone(ctx.scenarioFor(bot));
    const ref = ctx.refPrice; // preço médio de mercado por produto e região (último período)

    // marketing
    for (const j of PR) {
      for (let r = 0; r < nR; r++) {
        const ext = r === nR - 1, base = ext ? ref[j][r] * (P.extM / 1.15) : avg(ref[j].slice(0, nR - 1));
        d.price[j][r] = Math.max(RU.minPrice[j], Math.round(base * P.priceM * bot.mult[j] * nz(L.err)));
        d.ads[j][r] = ext ? P.adsExt : P.ads;
      }
      d.di[j] = Math.round(ctx.baseDI[j] * P.diM);
      d.term[j] = P.term;
      d.forecast[j] = d.forecast[j] || [0, 0, 0, 0, 0];
    }
    // RH
    d.salary = Math.max(p.salaryMin || 12, P.salary + (L.optimize ? 0.5 : 0)); d.med = P.med; d.food = P.food; d.plr = P.plr;
    d.vacation = t - s.lastVacation >= 3;

    // previsão de demanda
    const fc = {};
    for (const j of PR) {
      const last = bot.last ? bot.last.demand[j] : ctx.baseDemand[j];
      const g = L.season ? E.seasonAt(p, j, t) / E.seasonAt(p, j, t - 1) : 1;
      fc[j] = Math.max(0, last * Math.pow(g, 0.5) * nz(L.noise));
    }
    // produção limitada por máquinas, kits e pessoas
    const cap = { P: capacity(s, 'P'), W: capacity(s, 'W') };
    const prod = {};
    for (const j of PR) {
      const kit = RU.bom[j].kit, fg = s.stock[j].q;
      prod[j] = Math.max(0, Math.min(cap[j], Math.floor(itemsAvail(s, kit)), Math.round(fc[j] * P.stock - fg)));
    }
    const embAv = itemsAvail(s, 'emb'), embNeed = prod.P * 2 + prod.W;
    if (embNeed > embAv) { const f = embAv / embNeed; prod.P = Math.floor(prod.P * f); prod.W = Math.floor(prod.W * f); }
    const hoursPer = RU.hours * (d.vacation ? 0.75 : 1);
    const needW = Math.ceil((prod.P * RU.bom.P.opH + prod.W * RU.bom.W.opH) / ((s.opIndex || 1) * hoursPer));
    if (needW > s.workers) d.hire = needW - s.workers;
    else if (s.workers - needW > 8 && bot.persona !== 'premium') d.fire = Math.floor((s.workers - needW) / 2);
    d.production = { P: prod.P, W: prod.W };
    d.priority = P.focusW || fc.W * 2 > fc.P ? 'W' : 'P';

    // expansão: compra máquina V2 quando faltou produto de forma consistente
    const machBuy = {};
    if (ctx.periodsLeft >= 3) for (const j of PR) {
      const unmet = bot.last ? bot.last.unmet[j] : 0, c = Math.max(1, cap[j]);
      const trigger = P.expand >= 2 ? 0.06 : P.expand === 1 ? 0.15 : 0.3;
      const added = (bot.added && bot.added[j]) || 0, maxAdd = P.expand >= 2 ? 8 : 4;
      if (unmet / c > trigger && (P.expand > 0 || L.optimize) && added < maxAdd && s.cash > 0) {
        const per = RU.hours * 1.3 / RU.bom[j].machH;
        const n = Math.min(2, maxAdd - added, Math.ceil(unmet / per)); bot.added = bot.added || {}; bot.added[j] = added + n;
        d.buyMachines[j + '-V2'] = n; machBuy[j] = n * per;
        d.financing = (d.financing || 0) + n * (p.machinePrices ? p.machinePrices[j + '-V2'] : RU.machineModels[j + '-V2'].price) * (p.financingMax != null ? p.financingMax : 1);
      }
    }
    // compras para o próximo período (chegam no fim deste)
    d.purchases = [];
    const nextProd = {};
    for (const j of PR) {
      const g = L.season ? E.seasonAt(p, j, t + 1) / E.seasonAt(p, j, t) : 1;
      nextProd[j] = Math.min(cap[j] + (machBuy[j] || 0), fc[j] * Math.pow(g, 0.5) * 1.05);
      const kit = RU.bom[j].kit, left = itemsAvail(s, kit) - prod[j];
      const q = Math.max(0, Math.round(nextProd[j] - left));
      if (q > 0) d.purchases.push({ item: kit, qty: q, supplier: 'Lallemand', pay: '1P' });
    }
    const embQ = Math.max(0, Math.round(nextProd.P * 2 + nextProd.W - (embAv - embNeed)));
    if (embQ > 0) d.purchases.push({ item: 'emb', qty: embQ, supplier: 'Lallemand', pay: '1P' });

    // otimização de preço (difícil): testa variações e fica com o maior lucro
    if (L.optimize) {
      let best = null;
      for (const mP of [0.95, 1, 1.05]) for (const mW of [0.95, 1, 1.05]) {
        const dd = clone(d); for (let r = 0; r < nR; r++) { dd.price.P[r] = Math.max(RU.minPrice.P, Math.round(d.price.P[r] * mP)); dd.price.W[r] = Math.max(RU.minPrice.W, Math.round(d.price.W[r] * mW)); }
        const rep = E.simulate(s, dd, p).report;
        const left = sum(PR.map((j) => rep.stock && rep.stock[j] && rep.stock[j].fim ? rep.stock[j].fim.v || 0 : 0));
        const score = rep.dre.lucroLiquido - 0.06 * left;
        if (!best || score > best.score) best = { score, dd };
      }
      d.price = best.dd.price;
    }
    // caixa: evita o empréstimo especial e aplica sobras
    if (L.cash) {
      const rep = E.simulate(s, d, p).report, esp = rep.cashflow.especial || 0, fin = rep.cashflow.final || 0;
      if (esp > 0) { d.giro = Math.ceil(esp * 1.1 / 1000) * 1000; d.giroInstallments = (p.giroMaxInstallments || 1) >= 2 ? 2 : 1; }
      else if (bot.persona === 'conservador' && fin > 600000) d.application = Math.floor((fin - 400000) / 1000) * 1000;
    }
    return d;
  }

  // Resolve o mercado entre todas as empresas: cada uma vê a média das outras, e a demanda de cada região é repartida
  // proporcionalmente às participações (somam 100%).
  function resolve(firms) {
    const N = firms.length;
    const satOf = (f) => E.satisfaction(f.dec, f.state.sat, f.params);
    const sats = firms.map(satOf);
    const pass1 = firms.map((f, i) => {
      const others = firms.filter((_, k) => k !== i);
      const sc = { satRivals: avg(sats.filter((_, k) => k !== i)) };
      for (const j of PR) {
        sc[j] = {
          price: f.dec.price[j].map((_, r) => avg(others.map((o) => o.dec.price[j][r]))),
          ads: f.dec.ads[j].map((_, r) => avg(others.map((o) => o.dec.ads[j][r]))),
          di: avg(others.map((o) => o.dec.di[j])),
          term: avg(others.map((o) => E.termDays(o.dec.term[j]))),
        };
      }
      const dec = clone(f.dec); dec.scenario = sc;
      return { dec, res: E.simulate(f.state, dec, f.params) };
    });
    const dem = firms.map(() => ({ P: [], W: [] })), meta = {};
    for (const j of PR) {
      const nR = pass1[0].res.report.sales[j].regions.length; meta[j] = [];
      for (let r = 0; r < nR; r++) {
        const sh = pass1.map((x) => x.res.report.sales[j].regions[r].share), S = sum(sh) || 1;
        const M = avg(pass1.map((x) => x.res.report.sales[j].regions[r].market));
        const pAvg = avg(firms.map((f) => f.dec.price[j][r])), adAvg = avg(firms.map((f) => f.dec.ads[j][r]));
        meta[j][r] = { market: M, pAvg, adAvg };
        firms.forEach((_, i) => (dem[i][j][r] = M * sh[i] / S));
      }
    }
    return firms.map((f, i) => {
      const out = E.simulate(f.state, pass1[i].dec, f.params, { demand: dem[i] });
      const st = out.state, s1 = pass1[i].res.state;
      for (const j of PR) { st.adAvgHist[j] = s1.adAvgHist[j]; st.diAvgHist[j] = s1.diAvgHist[j]; }
      for (const j of PR) out.report.sales[j].regions.forEach((x, r) => { const m = meta[j][r]; x.market = m.market; x.pAvg = m.pAvg; x.adAvgNow = m.adAvg; x.share = m.market ? x.demand / m.market : 0; });
      out.dec = pass1[i].dec;
      return out;
    });
  }

  // fecha o período de todas as empresas. player = { state, dec, params, region }
  function closeAll(B, player, params, periodsLeft) {
    const scenarioFor = (bot) => {
      const others = [player.dec].concat(B.list.filter((b) => b !== bot).map((b) => b.dec));
      const sc = { satRivals: B.market ? B.market.sat : 0.8 };
      for (const j of PR) sc[j] = { price: others[0].price[j].map((_, r) => avg(others.map((o) => o.price[j][r]))), ads: others[0].ads[j].map((_, r) => avg(others.map((o) => o.ads[j][r]))), di: avg(others.map((o) => o.di[j])), term: avg(others.map((o) => E.termDays(o.term[j]))) };
      return sc;
    };
    const ref = {};
    if (!B.ref0) B.ref0 = { P: player.dec.scenario.P.price.slice(), W: player.dec.scenario.W.price.slice() };
    for (const j of PR) ref[j] = B.market ? B.market.price[j].map((x, r) => 0.5 * x + 0.5 * B.ref0[j][r]) : B.ref0[j].slice();
    const ctx = { params, difficulty: B.difficulty, seed: B.seed, scenarioFor, refPrice: ref, periodsLeft,
      baseDI: { P: 20000, W: 10000 }, baseDemand: B.market ? B.market.baseDemand : { P: 9000, W: 2400 } };
    const bdec = B.list.map((b) => decide(b, ctx));
    const firms = [{ state: player.state, dec: player.dec, params: paramsFor(params, player.region) }].concat(B.list.map((b, i) => ({ state: b.state, dec: bdec[i], params: paramsFor(params, b.region) })));
    const res = resolve(firms);
    // atualiza bots
    B.list.forEach((b, i) => {
      const r = res[i + 1], rep = r.report;
      b.state = r.state; b.dec = r.dec;
      const L = LEVELS[B.difficulty];
      b.last = { demand: {}, unmet: {} };
      for (const j of PR) {
        const sj = rep.sales[j]; b.last.demand[j] = sj.demand; b.last.unmet[j] = sj.unmet;
        if (L.adapt) {
          const left = r.state.stock[j].q, made = (rep.production && rep.production.prod ? rep.production.prod[j] : 0) || r.dec.production[j];
          if (sj.demand && sj.unmet / sj.demand > 0.05) b.mult[j] *= 1 + L.adapt;
          else if (left > 0.15 * Math.max(1, made)) b.mult[j] *= 1 - L.adapt;
          b.mult[j] = Math.min(1.12, Math.max(0.88, b.mult[j]));
        }
      }
      b.hist.push(summary(rep, r.dec));
    });
    // mercado observado (o que o relatório de mercado mostra)
    const all = res.map((r) => r.dec);
    const m = { price: {}, ads: {}, di: {}, term: {}, sat: avg(firms.slice(1).map((f) => E.satisfaction(f.dec, f.state.sat, f.params))), baseDemand: {} };
    for (const j of PR) {
      m.price[j] = all[0].price[j].map((_, r) => avg(all.map((d) => d.price[j][r])));
      m.ads[j] = all[0].ads[j].map((_, r) => avg(all.map((d) => d.ads[j][r])));
      m.di[j] = avg(all.map((d) => d.di[j])); m.term[j] = avg(all.map((d) => E.termDays(d.term[j])));
      m.baseDemand[j] = avg(res.map((r) => r.report.sales[j].demand));
    }
    B.market = m;
    // premissa do jogador para o próximo período = média dos bots que ele acabou de observar
    const sc = { satRivals: m.sat };
    for (const j of PR) sc[j] = { price: B.list[0].dec.price[j].map((_, r) => avg(B.list.map((b) => b.dec.price[j][r]))), ads: B.list[0].dec.ads[j].map((_, r) => avg(B.list.map((b) => b.dec.ads[j][r]))), di: avg(B.list.map((b) => b.dec.di[j])), term: avg(B.list.map((b) => E.termDays(b.dec.term[j]))) };
    return { player: res[0], scenario: sc };
  }

  function summary(rep, dec) {
    const k = rep.kpi;
    return { period: rep.period, raa: k.raa, acc: k.resultadoAcumulado, net: rep.dre.lucroLiquido, rev: rep.dre.receitaBruta, cash: rep.cashflow.final, esp: rep.cashflow.especial,
      price: { P: dec.price.P.slice(), W: dec.price.W.slice() }, sales: { P: rep.sales.P.qty, W: rep.sales.W.qty }, demand: { P: rep.sales.P.demand, W: rep.sales.W.demand },
      share: { P: rep.sales.P.regions.map((x) => x.share), W: rep.sales.W.regions.map((x) => x.share) },
      ads: { P: dec.ads.P.slice(), W: dec.ads.W.slice() }, term: { P: E.termDays(dec.term.P), W: E.termDays(dec.term.W) }, di: { P: dec.di.P, W: dec.di.W },
      demR: { P: rep.sales.P.regions.map((x) => x.demand), W: rep.sales.W.regions.map((x) => x.demand) }, salR: { P: rep.sales.P.regions.map((x) => x.sold), W: rep.sales.W.regions.map((x) => x.sold) },
      sat: rep.production ? rep.production.sat : null, salary: dec.salary,
      ativo: rep.balance ? rep.balance.ativoTotal : null, pl: rep.balance ? rep.balance.pl : null, ativoMedio: k.ativoMedio, plMedio: k.plMedio, finNet: (rep.dre.despesasFinanceiras || 0) - (rep.dre.receitasFinanceiras || 0) };
  }

  root.SimBots = { PERSONAS, LEVELS, create, closeAll, resolve, summary };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SimBots;
})(typeof window !== 'undefined' ? window : globalThis);
