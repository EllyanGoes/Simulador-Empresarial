/* Casos de Finanças — modo de treino (modelo dinâmico, ciclo financeiro e EVA) */
(function () {
  'use strict';
  const KEY = 'simFinCases';
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }), nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f0 = (v) => nf0.format(Math.round(v)), f2 = (v) => nf2.format(v);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const TYPES = [
    { k: 'exc', n: 'Excelente', s: [1, -1, 1], d: 'CDG positivo, NCG negativa e ST positivo: o ciclo financia a operação e sobra caixa. Risco financeiro muito baixo.' },
    { k: 'sol', n: 'Sólida', s: [1, 1, 1], d: 'CDG positivo e maior que a NCG, com ST positivo: os recursos de longo prazo cobrem o giro e ainda sobra saldo de tesouraria.' },
    { k: 'ins', n: 'Insatisfatória', s: [1, 1, -1], d: 'CDG positivo, mas menor que a NCG: parte do giro é financiada com dívida de curto prazo (ST negativo). Risco moderado, dependente da renovação de crédito.' },
    { k: 'pes', n: 'Péssima', s: [-1, 1, -1], d: 'CDG negativo e NCG positiva: dívida de curto prazo financia o giro e parte do ativo de longo prazo. Risco alto de insolvência.' },
    { k: 'mru', n: 'Muito ruim', s: [-1, -1, -1], d: 'CDG, NCG e ST negativos: o passivo cíclico e a dívida de curto prazo financiam ativos de longo prazo. Situação frágil.' },
    { k: 'alt', n: 'Alto risco', s: [-1, -1, 1], d: 'CDG e NCG negativos com ST positivo: o caixa vem do passivo cíclico, que financia até ativos de longo prazo. Qualquer queda de vendas desmonta a estrutura.' },
  ];
  const typeOf = (cdg, ncg, st) => TYPES.find((t) => t.s[0] === Math.sign(cdg || 1) && t.s[1] === Math.sign(ncg || 1) && t.s[2] === Math.sign(st || 1));

  // ---------- gerador ----------
  function generate(seed) {
    const R = rng(seed * 7919 + 13), target = TYPES[Math.floor(R() * 6)];
    const u = (a, b) => a + (b - a) * R(), r100 = (v) => Math.round(v / 100) * 100;
    for (let tries = 0; tries < 20000; tries++) {
      const RB = Math.round(u(180, 420)) * 1000, imp = r100(RB * u(0.18, 0.27)), RL = RB - imp;
      const cpv = r100(RL * u(0.50, 0.66)), adm = r100(RL * u(0.05, 0.10)), com = r100(RL * u(0.07, 0.13)), dep = Math.round(RL * u(0.03, 0.07) / 1000) * 1000;
      const year = (k) => ({ caixa: r100(RL * k * u(0.01, 0.06)), aplic: r100(RL * k * u(0, 0.12)), cr: r100(RL * k * u(0.08, 0.28)), est: r100(RL * k * u(0.06, 0.32)), trib: r100(RL * k * u(0.01, 0.04)), adi: r100(RL * k * u(0.003, 0.015)),
        os: r100(RL * k * u(0.03, 0.07)), forn: r100(RL * k * u(0.08, 0.42)), of: r100(RL * k * u(0.04, 0.12)), empCP: r100(RL * k * u(0.01, 0.25)), cp: r100(RL * k * u(0.02, 0.06)), prov: r100(RL * k * u(0.01, 0.03)) });
      const a = year(0.85), b = year(1); // a = ano anterior, b = ano atual
      a.imob = r100(RL * u(0.35, 0.85)); a.depAc = -r100(a.imob * u(0.15, 0.35)); a.intang = r100(RL * u(0.05, 0.18)); a.amAc = -r100(a.intang * u(0.1, 0.3));
      b.imob = r100(a.imob * u(1, 1.22)); b.intang = r100(a.intang * u(1, 1.15)); b.depAc = a.depAc - 0.6 * dep; b.amAc = a.amAc - 0.4 * dep;
      a.empLP = r100(RL * u(0.03, 0.28)); a.lucros = r100(u(2000, 20000));
      const tot = (y) => { y.ac = y.caixa + y.aplic + y.cr + y.est + y.trib + y.adi; y.anc = y.imob + y.depAc + y.intang + y.amAc; y.ativo = y.ac + y.anc; y.pc = y.os + y.forn + y.of + y.empCP + y.cp + y.prov; };
      tot(a); tot(b);
      a.capital = a.ativo - a.pc - a.empLP - a.lucros; if (a.capital < 0.12 * a.ativo) continue;
      b.capital = r100(a.capital * u(1, 1.1));
      const ebit = RL - cpv - adm - com - dep; if (ebit <= 0) continue;
      // despesa financeira e empréstimo LP do ano atual fecham juntos (itera)
      let fin = 0, ll = 0; b.empLP = 0;
      for (let i = 0; i < 6; i++) { ll = (ebit - fin) * 0.66; b.lucros = a.lucros + ll; b.empLP = b.ativo - b.pc - b.capital - b.lucros; fin = r100(Math.max(0, b.empCP + b.empLP) * 0.07); }
      const rate = u(0.04, 0.12); fin = r100((b.empCP + Math.max(0, b.empLP)) * rate); ll = (ebit - fin) * 0.66; b.lucros = a.lucros + ll; b.empLP = b.ativo - b.pc - b.capital - b.lucros;
      if (b.empLP < 1000 || ll <= 0 || fin <= 0) continue;
      const calc = (y) => { y.pnc = y.empLP; y.pl = y.capital + y.lucros; y.passivo = y.pc + y.pnc + y.pl; y.ace = y.caixa + y.aplic; y.acc = y.cr + y.est + y.trib + y.adi; y.pce = y.empCP; y.pcc = y.os + y.forn + y.of + y.cp + y.prov; y.plp = y.pnc + y.pl;
        y.st = y.ace - y.pce; y.ncg = y.acc - y.pcc; y.cdg = y.plp - y.anc; y.type = typeOf(y.cdg, y.ncg, y.st); };
      calc(a); calc(b);
      if (b.type !== target || Math.abs(b.ncg) < 2000 || Math.abs(b.st) < 1500 || Math.abs(b.cdg) < 1500 || Math.abs(a.ncg) < 1500 || Math.abs(a.st) < 1000 || Math.abs(a.cdg) < 1000) continue;
      const dre = { rb: RB, imp, rl: RL, cpv, lb: RL - cpv, adm, com, ebitda: RL - cpv - adm - com, dep, ebit, fin, ebt: ebit - fin, ir: (ebit - fin) * 0.34, ll };
      const cy = { pme: b.est / RL * 360, pmr: (b.acc - b.est) / RL * 360, pmp: b.pcc / RL * 360 }; cy.cf = cy.pme + cy.pmr - cy.pmp; cy.ncg = RL / 360 * cy.cf;
      // problema: receita prevista e teto de NCG -> PME admissível
      const rl2 = Math.round(RL * u(0.9, 1.2) / 5000) * 5000; let cap = 0, pme2 = 0, ok = false;
      for (let i = 0; i < 12 && !ok; i++) { pme2 = cy.pme * u(0.35, 0.9); cap = Math.round((pme2 + cy.pmr - cy.pmp) * rl2 / 360 / 500) * 500; if (cap < 1000) cap = Math.round(u(4, 30)) * 1000; pme2 = cap / rl2 * 360 + cy.pmp - cy.pmr; ok = pme2 > 3 && pme2 < 300; }
      if (!ok) continue;
      const pb = { rl2, cap, pme: pme2, cf: pme2 + cy.pmr - cy.pmp }; pb.ncg = pb.cf / 360 * rl2;
      const ke = Math.round(u(0.08, 0.15) * 400) / 400;
      const ev = { ce: b.ncg + b.anc + b.ace, ct: b.pc + b.pnc - b.pcc, ke }; ev.taxa = fin / ev.ct; ev.kd = ev.taxa * 0.66; ev.nopat = ebit * 0.66; ev.roce = ev.nopat / ev.ce;
      ev.wt = ev.ct / (ev.ct + b.pl); ev.wp = b.pl / (ev.ct + b.pl); ev.wacc = ev.wt * ev.kd + ev.wp * ke; ev.eva = (ev.roce - ev.wacc) * ev.ce; ev.lle = ev.nopat - ev.ct * ev.kd; ev.roe = ev.lle / b.pl;
      const y1 = 2019 + Math.floor(R() * 6);
      return { seed, y0: y1, y1: y1 + 1, a, b, dre, cy, pb, ev, name: 'Cia ' + ['Aurora', 'Boreal', 'Cascata', 'Delta', 'Estela', 'Faros', 'Gávea', 'Horizonte', 'Ícaro', 'Jatobá'][Math.floor(R() * 10)] };
    }
    return generate(seed + 1000003);
  }

  // ---------- campos ----------
  const fx = (res, expr) => `<span class="fcfm"><i>${res}</i> = ${expr}</span>`;
  function fields(c) {
    const { a, b, cy, pb, ev, dre } = c, F = [];
    const two = (sec, id, label, kb, tip, kind) => { F.push({ id: id + '1', sec, row: id, label, col: 1, ans: b[kb], kind: kind || 'm', tip }); F.push({ id: id + '0', sec, row: id, label, col: 0, ans: a[kb], kind: kind || 'm', tip }); };
    two('rc', 'ace', 'Ativo Circulante Errático', 'ace', ['Contas financeiras do ativo, sem ligação direta com a operação.', fx('ACE', 'Caixa e Equivalentes + Aplicações Financeiras')]);
    two('rc', 'acc', 'Ativo Circulante Cíclico', 'acc', ['Contas do ativo que giram com a operação.', fx('ACC', 'Contas a Receber + Estoques + Tributos a Recuperar + Adiantamento a Fornecedores')]);
    two('rc', 'alp', 'Ativo de Longo Prazo', 'anc', ['Aplicações permanentes de recursos.', fx('ALP', 'Ativo Não Circulante')]);
    two('rc', 'pce', 'Passivo Circulante Errático', 'pce', ['Dívida onerosa de curto prazo.', fx('PCE', 'Empréstimos e Financiamentos de curto prazo')]);
    two('rc', 'pcc', 'Passivo Circulante Cíclico', 'pcc', ['Financiamento espontâneo da operação.', fx('PCC', 'Obrigações Sociais + Fornecedores + Obrigações Fiscais + Contas a Pagar + Provisões')]);
    two('rc', 'plp', 'Passivo de Longo Prazo', 'plp', ['Fontes permanentes de recursos.', fx('PLP', 'Passivo Não Circulante + Patrimônio Líquido')]);
    two('md', 'st', 'ST (ACE − PCE)', 'st', ['Saldo de Tesouraria: folga (positivo) ou dependência (negativo) de dívida de curto prazo.', fx('ST', 'ACE − PCE')]);
    two('md', 'ncg', 'NCG (ACC − PCC)', 'ncg', ['Necessidade de Capital de Giro: quanto a operação exige de financiamento.', fx('NCG', 'ACC − PCC')]);
    two('md', 'cdg', 'CDG (PÑC + PL) − AÑC', 'cdg', ['Capital de Giro: sobra de recursos de longo prazo para financiar o giro.', fx('CDG', '(Passivo Não Circulante + PL) − Ativo Não Circulante')]);
    F.push({ id: 'tef1', sec: 'md', row: 'tef', label: 'Tipo de Estrutura Financeira', col: 1, ans: b.type.k, kind: 'sel', tip: ['Combine os sinais de CDG, NCG e ST.', '<span class="fcfm">Excelente (+ − +) · Sólida (+ + +) · Insatisfatória (+ + −) · Péssima (− + −) · Muito ruim (− − −) · Alto risco (− − +)</span>'] });
    F.push({ id: 'tef0', sec: 'md', row: 'tef', label: 'Tipo de Estrutura Financeira', col: 0, ans: a.type.k, kind: 'sel', tip: F[F.length - 1].tip });
    const one = (sec, id, label, ans, kind, tip) => F.push({ id, sec, row: id, label, col: 1, ans, kind, tip });
    one('cf', 'pme', 'Prazo Médio de Estocagem (PME)', cy.pme, 'd', ['Dias que o estoque leva para girar.', fx('PME', 'Estoques ÷ Receita Líquida × 360')]);
    one('cf', 'pmr', 'Prazo Médio de Recebimento (PMR)', cy.pmr, 'd', ['Dias de receita aplicados nos demais ativos cíclicos.', fx('PMR', '(ACC − Estoques) ÷ Receita Líquida × 360')]);
    one('cf', 'pmp', 'Prazo Médio de Pagamento (PMP)', cy.pmp, 'd', ['Dias de receita financiados pelo passivo cíclico.', fx('PMP', 'PCC ÷ Receita Líquida × 360')]);
    one('cf', 'cf', 'Ciclo Financeiro', cy.cf, 'd', ['Dias em que a empresa financia a operação com recursos próprios ou onerosos.', fx('CF', 'PME + PMR − PMP')]);
    one('cf', 'ncgcf', 'NCG com base no Ciclo Financeiro', cy.ncg, 'm', ['Deve bater com a NCG do balanço.', fx('NCG', 'Receita Líquida ÷ 360 × CF')]);
    one('pb', 'pme2', 'Novo PME admissível', pb.pme, 'd', ['Isole o PME na fórmula da NCG, mantendo PMR e PMP.', fx('PME', 'Teto de NCG ÷ Receita prevista × 360 + PMP − PMR')]);
    one('pb', 'cf2', 'Novo Ciclo Financeiro', pb.cf, 'd', ['Com o novo PME e os mesmos PMR e PMP.', fx('CF', 'PME + PMR − PMP')]);
    one('pb', 'ncg2', 'Comprovação da NCG', pb.ncg, 'm', ['Deve bater com o teto de investimento.', fx('NCG', 'CF ÷ 360 × Receita Líquida prevista')]);
    one('ev', 'ce', 'Capital Empregado', ev.ce, 'm', ['Recursos aplicados no negócio.', fx('CE', 'NCG + Ativo Não Circulante + Disponibilidades (Caixa + Aplicações)')]);
    one('ev', 'ct', 'Total do Capital Oneroso Investido', ev.ct, 'm', ['Dívida que paga juros.', fx('CT', 'Passivo Circulante + Passivo Não Circulante − PCC')]);
    one('ev', 'taxa', 'Taxa média do período (%)', ev.taxa * 100, 'p', ['Custo bruto da dívida.', fx('Taxa', 'Despesas Financeiras ÷ Capital Oneroso')]);
    one('ev', 'kd', 'Taxa líquida, descontado o benefício do IR (%)', ev.kd * 100, 'p', ['Juros reduzem a base do IR de 34%.', fx('Kd', 'Taxa média × (1 − 0,34)')]);
    one('ev', 'nopat', 'NOPAT', ev.nopat, 'm', ['Lucro operacional depois do IR.', fx('NOPAT', 'EBIT × (1 − 0,34)')]);
    one('ev', 'roce', 'ROCE (%)', ev.roce * 100, 'p', ['Retorno sobre o capital empregado.', fx('ROCE', 'NOPAT ÷ Capital Empregado')]);
    one('ev', 'wt', 'Participação do capital de terceiros (%)', ev.wt * 100, 'p', ['Peso da dívida onerosa na estrutura.', fx('% Terceiros', 'Capital Oneroso ÷ (Capital Oneroso + PL)')]);
    one('ev', 'wp', 'Participação do capital próprio (%)', ev.wp * 100, 'p', ['Peso do patrimônio líquido na estrutura.', fx('% Próprio', 'PL ÷ (Capital Oneroso + PL)')]);
    one('ev', 'wacc', 'WACC (%)', ev.wacc * 100, 'p', ['Custo médio ponderado de capital.', fx('WACC', '% Terceiros × Kd + % Próprio × Ke')]);
    one('ev', 'eva1', 'EVA 1 · (ROCE − WACC) × Capital Empregado', ev.eva, 'm', ['Valor criado acima do custo do capital.', fx('EVA', '(ROCE − WACC) × Capital Empregado')]);
    one('ev', 'eva2', 'EVA 2 · NOPAT − (Capital Empregado × WACC)', ev.eva, 'm', ['Mesmo resultado por outro caminho.', fx('EVA', 'NOPAT − Capital Empregado × WACC')]);
    one('ev', 'eva3', 'EVA 3 · NOPAT − custo de terceiros − custo próprio', ev.eva, 'm', ['Desconta do NOPAT o custo de cada fonte.', fx('EVA', 'NOPAT − Capital Oneroso × Kd − PL × Ke')]);
    one('ev', 'roe', 'ROE (%)', ev.roe * 100, 'p', ['Retorno do acionista depois do custo da dívida.', fx('ROE', '(NOPAT − Capital Oneroso × Kd) ÷ PL')]);
    one('ev', 'eva4', 'EVA 4 · (ROE − Ke) × Capital Próprio', ev.eva, 'm', ['Valor criado medido pelo lado do acionista.', fx('EVA', '(ROE − Ke) × PL')]);
    void dre; return F;
  }
  function parseNum(s) { s = String(s).trim().replace(/[R$\s%]/g, ''); if (!s) return null; const neg = /^\(.*\)$/.test(s); s = s.replace(/[()]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const v = parseFloat(s); return isNaN(v) ? null : neg ? -v : v; }
  const nk = (k) => String(k).toLowerCase().replace(/\s+/g, ' ').trim();
  const codeOf = (f) => f.row.toUpperCase() + (st.F.filter((x) => x.row === f.row && x.sec === f.sec).length > 1 ? ' ' + (f.col ? st.c.y1 : st.c.y0) : '');
  function evalRaw(raw, depth) { raw = String(raw == null ? '' : raw).trim(); if (raw[0] !== '=') return parseNum(raw); if ((depth || 0) > 25) return null;
    let bad = false, x = raw.slice(1).replace(/\[([^\]]+)\]/g, (m, k) => { k = nk(k); let v = st.refs[k]; if (v == null && st.fref[k]) v = evalRaw(st.val[st.fref[k]], (depth || 0) + 1); if (v == null || !isFinite(v)) { bad = true; return '0'; } return '(' + v + ')'; });
    if (bad) return null; x = x.replace(/\d[\d.]*(,\d+)?/g, (m) => m.includes(',') ? m.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(m) ? m.replace(/\./g, '') : m).replace(/[×x]/gi, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**');
    if (!/^[\d\s+\-*/().e]*$/.test(x) || !x.trim()) return null; try { const v = Function('"use strict";return (' + x + ')')(); return typeof v === 'number' && isFinite(v) ? v : null; } catch (e) { return null; } }
  const disp = (raw) => { raw = String(raw || ''); if (raw.trim()[0] !== '=') return raw; const v = evalRaw(raw); return v == null ? '#ERRO' : f2(v); };
  function right(f, raw) { if (f.kind === 'sel') return raw === f.ans; const v = evalRaw(raw); if (v == null) return false;
    const tol = f.kind === 'm' ? Math.max(1, Math.abs(f.ans) * 0.0005) : f.kind === 'd' ? 0.06 : 0.02; return Math.abs(v - f.ans) <= tol; }
  const show = (f) => f.kind === 'sel' ? TYPES.find((t) => t.k === f.ans).n : f.kind === 'm' ? f2(f.ans) : f.kind === 'd' ? f2(f.ans) + ' dias' : f2(f.ans) + '%';

  // ---------- estado e armazenamento ----------
  let st = null, player = '', tick = null;
  let io = null;
  const lsGet = () => { try { return (JSON.parse(localStorage.getItem(KEY) || '{}'))[player] || {}; } catch (e) { return {}; } };
  const lsSet = (v) => { let all = {}; try { all = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {} all[player] = v; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} };
  const data = () => { const d = (io ? io.get() : lsGet()) || {}; d.hist = d.hist || []; return d; };
  const put = (d) => { if (io) io.set(d); else lsSet(d); };
  const hist = () => data().hist;
  function record(e) { const d = data(); d.hist.unshift(e); d.hist = d.hist.slice(0, 60); d.open = null; put(d); }
  const loadOpen = () => data().open || null;
  function saveOpen(clear) { const d = data();
    d.open = clear || !st || st.done ? null : { seed: st.c.seed, hints: st.hints, val: st.val, hint: st.hint, miss: st.miss, okSet: st.okSet, lastBad: st.lastBad || {}, txt: st.txt || '', sec: Math.floor((Date.now() - st.t0) / 1000), at: Date.now() };
    put(d); }
  const CSS = `#fc{position:fixed;inset:0;z-index:66;background:#eceeef;overflow:auto;display:none;font:15px/1.4 "Noto Sans","Segoe UI",system-ui,sans-serif;color:#1d1f22}#fc.on{display:block}
#fc .fcbar{position:sticky;top:0;z-index:5;background:#2a5a9a;color:#fff;display:flex;gap:18px;align-items:center;padding:10px 22px;flex-wrap:wrap}#fc .fcbar b{font-size:17px}#fc .fcbar .sp{flex:1}#fc .fcbar .pill{background:rgba(255,255,255,.16);border-radius:14px;padding:3px 12px;font-size:14px}
#fc .fcw{max-width:1250px;margin:0 auto;padding:18px 22px 60px}#fc h3{font:600 14px Raleway,system-ui;background:#cfcfcf;border-radius:8px;padding:8px 14px;margin:22px 0 10px}#fc p{margin:8px 0}
#fc table{border-collapse:collapse;width:100%;background:#fff}#fc th{background:#717171;color:#fff;font-size:13px;padding:8px 10px;text-align:right}#fc th:first-child,#fc td:first-child{text-align:left}#fc td{padding:6px 10px;border-bottom:1px solid #e3e5e7;text-align:right;font-variant-numeric:tabular-nums}
#fc tr.b td{font-weight:700;background:#f3f4f5}#fc tr.i td:first-child{padding-left:26px}#fc tbody tr:hover td{background:#fff3c7}
#fc .g2{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:18px;align-items:start}#fc .g2e{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}@media(max-width:900px){#fc .g2,#fc .g2e{grid-template-columns:minmax(0,1fr)}}
#fc input.fi,#fc select.fi{width:150px;max-width:100%;font:15px system-ui;padding:6px 8px;border:1px solid #b8bcc0;border-radius:4px;text-align:right;background:#fffef2}#fc select.fi{width:170px;text-align:left}
#fc .fi.ok{background:#e3f6e6;border-color:#2e9e3f}#fc .fi.no{background:#fde7e9;border-color:#d0021b}#fc .ans{display:block;font-size:12px;color:#1a6b2a}
#fc .q{display:inline-flex;width:18px;height:18px;border-radius:50%;background:#3a78c3;color:#fff;font:700 12px/18px system-ui;justify-content:center;cursor:pointer;margin-left:6px;border:0;padding:0;vertical-align:middle}#fc .q.used{background:#9a6a00}
#fc .fctip{position:absolute;z-index:9;background:#1c1c1c;color:#fff;border-radius:8px;padding:14px 18px;max-width:560px;box-shadow:0 4px 14px rgba(0,0,0,.35);font-size:15px;text-align:left}#fc .fctip:before{content:"";position:absolute;top:-9px;left:var(--ax,20px);margin-left:-10px;border:10px solid transparent;border-top:0;border-bottom-color:#1c1c1c}
#fc .fcfm{display:inline-block;background:#f5f5f5;color:#222;font:italic 15px/1.3 'Times New Roman',Georgia,serif;padding:9px 14px;margin-top:10px}#fc .box{background:#fff;border:1px solid #d6d9dc;border-radius:8px;padding:14px 16px}
#fc textarea{width:100%;min-height:110px;font:15px/1.4 system-ui;padding:10px;border:1px solid #b8bcc0;border-radius:4px;background:#fffef2}#fc .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
#fc .btn{font:600 14px system-ui;padding:9px 16px;border-radius:4px;border:1px solid #3a78c3;background:#fff;color:#3a78c3;cursor:pointer}#fc .btn.pri{background:#3a78c3;color:#fff}#fc .note{color:#666b70;font-size:13px}#fc .res{font-size:22px;font-weight:700}#fc .form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}#fc .form label{display:grid;gap:4px;font-size:13px;font-weight:600}#fc .form input,#fc .form select{font-size:16px;padding:8px;border:1px solid #b8bcc0;border-radius:4px}
#fc .fclob{max-width:1100px}#fc .fchero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:28px;align-items:center;background:linear-gradient(135deg,#2a5a9a,#3a78c3);color:#fff;border-radius:14px;padding:30px 32px;margin-top:8px}#fc .fchero h1{font:700 26px/1.25 Raleway,system-ui;margin:0 0 10px;text-wrap:balance}#fc .fchero p{margin:0;font-size:16px;opacity:.92}
#fc .fcgo{background:#fff;color:#1d1f22;border-radius:10px;padding:18px;display:grid;gap:12px}#fc .fcgo label{display:grid;gap:4px;font-size:13px;font-weight:600}#fc .fcgo input,#fc .fcgo select{font-size:16px;padding:9px;border:1px solid #b8bcc0;border-radius:4px;width:100%;max-width:none;box-sizing:border-box;text-align:left}#fc .btn{text-align:center}#fc .btn.big{font-size:16px;padding:12px;width:100%;display:block;text-align:center;justify-content:center}#fc .btn.sm{padding:5px 12px;font-size:13px}#fc .fcgo .note{text-align:center}
#fc .fcstats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:18px}#fc .fcstats div{background:#fff;border:1px solid #d6d9dc;border-radius:10px;padding:14px 16px}#fc .fcstats span{display:block;font-size:13px;color:#666b70}#fc .fcstats b{font-size:26px;font-variant-numeric:tabular-nums}
#fc .fcsteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}#fc .fcsteps div{background:#fff;border:1px solid #d6d9dc;border-radius:10px;padding:14px 16px 14px 58px;position:relative;min-height:74px}#fc .fcsteps i{position:absolute;left:16px;top:16px;width:30px;height:30px;border-radius:50%;background:#e7f0fb;color:#1a4f9c;font:700 15px/30px system-ui;text-align:center}#fc .fcsteps b{display:block;margin-bottom:2px}#fc .fcsteps span{font-size:14px;color:#4a4f54}
#fc .fcrule{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}#fc .fcrule div{background:#f6f8fa;border-left:4px solid #3a78c3;border-radius:4px;padding:10px 14px}#fc .fcrule b{display:block}#fc .fcrule span{font-size:14px;color:#4a4f54}
#fc #fcStm.pin{position:sticky;top:58px;z-index:4;max-height:40vh;overflow:auto;background:#eceeef;box-shadow:0 6px 12px rgba(0,0,0,.18);border-bottom:2px solid #3a78c3;font-size:13px}#fc #fcStm.pin td{padding:3px 8px}#fc #fcStm.pin th{padding:4px 8px}
#fc .fxhelp{background:#eef4fb;border:1px solid #c5d9f0;border-radius:8px;padding:10px 14px;font-size:14px;margin:10px 0}#fc code{background:#fff;border:1px solid #d6d9dc;border-radius:3px;padding:1px 5px;font:13px ui-monospace,Menlo,monospace}#fc .fi.fxv{font-style:italic}#fc .fi:focus{text-align:left;width:100%;min-width:150px;position:relative;z-index:2}#fc.fx [data-ref]{cursor:cell;outline:1px dashed #3a78c3;outline-offset:-3px}#fc.fx [data-ref]:hover{background:#d8e8fb!important}#fc.fx input[data-ref]:focus{outline:2px solid #3a78c3;cursor:text}
#fc .fcopen{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;background:#fff8e1;border:1px solid #e0b84a;border-radius:10px;padding:14px 18px;margin-top:18px}#fc .fcopen b{display:block;font-size:16px}#fc .fcopen span{font-size:14px;color:#4a4f54}#fc .fcbar .btn{padding:7px 14px}
#fc .fcempty{background:#fff;border:1px dashed #b8bcc0;border-radius:10px;padding:26px;text-align:center;color:#666b70}#fc .fcnote{display:inline-block;min-width:58px;text-align:center;font-weight:700;border-radius:12px;padding:2px 10px}#fc .fcnote.g{background:#e3f6e6;color:#1a6b2a}#fc .fcnote.y{background:#fdf3cf;color:#7a5a00}#fc .fcnote.r{background:#fde7e9;color:#a00015}
@media(max-width:800px){#fc .fchero,#fc .fcsteps,#fc .fcrule{grid-template-columns:minmax(0,1fr)}#fc .fcstats{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  function root() { let el = document.getElementById('fc'); if (!el) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); el = document.createElement('div'); el.id = 'fc'; document.body.appendChild(el); el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onInput); el.addEventListener('mousedown', onDown); el.addEventListener('focusin', onFocus); el.addEventListener('focusout', onFocus); el.addEventListener('keydown', onKey); } return el; }
  const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function lobby() {
    clearInterval(tick); if (st && !st.done) saveOpen(); st = null; const op = loadOpen(), h = hist(), n = h.length, best = n ? Math.max(...h.map((x) => x.score)) : null, avg = n ? h.reduce((a, x) => a + x.score, 0) / n : null, tm = n ? Math.round(h.reduce((a, x) => a + x.sec, 0) / n) : null;
    const steps = [['Modelo dinâmico', 'Reclassifique o balanço em contas erráticas, cíclicas e de longo prazo.'], ['ST, NCG e CDG', 'Calcule os três indicadores e identifique a estrutura financeira de cada ano.'], ['Ciclo financeiro', 'Monte PME, PMR e PMP em dias e confirme a NCG pelo ciclo.'], ['Problema de gestão', 'Ache o prazo de estocagem que cabe no teto de investimento em NCG.'], ['EVA', 'Chegue ao mesmo valor por quatro caminhos: ROCE, NOPAT, custo das fontes e ROE.'], ['Parecer', 'Escreva sua análise de risco e de valor e compare com a de referência.']];
    const badge = (s) => { const p = s / 75; return `<span class="fcnote ${p >= 0.9 ? 'g' : p >= 0.6 ? 'y' : 'r'}">${f2(s)}</span>`; };
    root().innerHTML = `<div class="fcbar"><b>Casos de Finanças</b><span class="pill">Jogador: ${esc(player)}</span><span class="sp"></span><button class="btn" data-a="exit">Voltar ao Simulador</button></div><div class="fcw fclob">
      <div class="fchero"><div><h1>Treine análise financeira com casos novos a cada rodada</h1><p>Cada caso traz o Balanço Patrimonial e a DRE de uma empresa fictícia. Você preenche 42 campos, confere na hora e recebe uma nota de 0 a 75.</p></div>
        <div class="fcgo"><label>Número do caso<input id="fcSeed" type="number" min="1" value="${Math.floor(Math.random() * 9000) + 1000}"></label><label>Dicas<select id="fcHints"><option value="1">Permitidas (com desconto)</option><option value="0">Desligadas (modo prova)</option></select></label><button class="btn pri big" data-a="start">Começar caso</button><span class="note">O mesmo número gera sempre o mesmo caso.</span></div></div>
      ${op ? `<div class="fcopen"><div><b>Caso ${op.seed} em andamento</b><span>${Object.keys(op.okSet || {}).length} de 42 campos certos · ${Object.values(op.val || {}).filter((v) => String(v).trim()).length} preenchidos · tempo ${clock(op.sec || 0)} · salvo em ${new Date(op.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div><span><button class="btn pri" data-a="resume">Continuar</button> <button class="btn" data-a="discard">Descartar</button></span></div>` : ''}
      <div class="fcstats"><div><span>Casos resolvidos</span><b>${n}</b></div><div><span>Melhor nota</span><b>${best != null ? f2(best) : '–'}</b></div><div><span>Nota média</span><b>${avg != null ? f2(avg) : '–'}</b></div><div><span>Tempo médio</span><b>${tm != null ? clock(tm) : '–'}</b></div></div>
      <h3>O que você resolve em cada caso</h3><div class="fcsteps">${steps.map((x, i) => `<div><i>${i + 1}</i><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>
      <div class="fcrule"><div><b>Campo certo</b><span>vale 75 ÷ 42 ≈ 1,79 ponto</span></div><div><b>Dica aberta (?)</b><span>o campo passa a valer metade</span></div><div><b>Conferência errada</b><span>cada uma tira 25% do campo</span></div></div>
      <h3>Seu histórico</h3>${n ? `<table><thead><tr><th>Data</th><th>Caso</th><th>Estrutura</th><th>Acertos</th><th>Tempo</th><th>Nota (de 75)</th><th></th></tr></thead><tbody>${h.map((x) => `<tr><td>${new Date(x.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${x.seed}</td><td>${esc(x.type)}</td><td>${x.ok}/${x.n}</td><td>${clock(x.sec)}</td><td>${badge(x.score)}</td><td><button class="btn sm" data-a="again" data-seed="${x.seed}">Refazer</button></td></tr>`).join('')}</tbody></table>` : '<div class="fcempty">Nenhum caso resolvido ainda. Comece pelo caso acima; as notas aparecem aqui.</div>'}</div>`;
    root().classList.add('on'); root().scrollTop = 0;
  }

  function start(seed, hints, sv) {
    const c = generate(seed), F = fields(c); st = { c, F, hints, t0: Date.now(), done: false, val: {}, hint: {}, miss: {}, okSet: {} };
    st.refs = {}; st.fref = {}; F.forEach((f) => { if (f.kind !== 'sel') st.fref[nk(codeOf(f))] = f.id; });
    if (sv) { Object.assign(st, { val: sv.val || {}, hint: sv.hint || {}, miss: sv.miss || {}, okSet: sv.okSet || {}, lastBad: sv.lastBad || {}, txt: sv.txt || '', t0: Date.now() - (sv.sec || 0) * 1000 }); }
    draw(); root().scrollTop = 0; clearInterval(tick); tick = setInterval(() => { const el = document.getElementById('fcClock'); if (el && st && !st.done) { const s = Math.floor((Date.now() - st.t0) / 1000); el.textContent = clock(s); if (s % 15 === 0) saveOpen(); } }, 1000); saveOpen();
  }
  const worth = (f) => { if (!st.okSet[f.id]) return 0; const base = 75 / st.F.length; return base * (st.hint[f.id] ? 0.5 : 1) * Math.max(0, 1 - 0.25 * (st.miss[f.id] || 0)); };
  const score = () => st.F.reduce((s, f) => s + worth(f), 0);

  function inp(f) { const v = st.val[f.id] || '', cls = st.okSet[f.id] ? ' ok' : st.miss[f.id] && st.val[f.id] === st.lastBad[f.id] ? ' no' : st.done ? ' no' : '', lock = st.done || st.okSet[f.id], dis = lock ? (f.kind === 'sel' ? ' disabled' : ' readonly') : '';
    const el = f.kind === 'sel' ? `<select class="fi${cls}" data-f="${f.id}"${dis}><option value="">Escolha…</option>${TYPES.map((t) => `<option value="${t.k}"${v === t.k ? ' selected' : ''}>${t.n}</option>`).join('')}</select>` : `<input class="fi${cls}${String(v).trim()[0] === '=' ? ' fxv' : ''}" data-f="${f.id}" data-ref="${esc(codeOf(f))}" value="${esc(disp(v))}" title="${String(v).trim()[0] === '=' ? esc(v) : ''}" autocomplete="off" spellcheck="false"${dis} aria-label="${esc(f.label)}">`;
    return el + (st.done && !st.okSet[f.id] ? `<span class="ans">Resposta: ${show(f)}</span>` : ''); }
  const qb = (f) => st.hints ? `<button class="q${st.hint[f.id] ? ' used' : ''}" data-q="${f.id}" title="Dica (reduz o valor do campo à metade)" aria-label="Dica">?</button>` : '';
  function tbl(sec, heads) { const rows = [], seen = {}; st.F.filter((f) => f.sec === sec).forEach((f) => { if (seen[f.row]) return; seen[f.row] = 1; const fs = st.F.filter((x) => x.sec === sec && x.row === f.row); rows.push(`<tr><td>${f.label}${qb(f)}</td>${fs.map((x) => `<td>${inp(x)}</td>`).join('')}</tr>`); });
    return `<table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`; }

  function draw() {
    const { c } = st, { a, b, dre } = c; st.lastBad = st.lastBad || {};
    const ref = (k, v) => { st.refs[nk(k)] = v; return ` data-ref="${esc(k)}"`; }, kk = (l) => l.replace(/^\(−\)\s*/, '').replace(/\s*[=−-]\s.*$/, '').replace(/ c\/ /, ' ').trim();
    const R = (l, x, y, cl, k) => `<tr class="${cl || 'i'}"><td>${l}</td><td${ref((k || kk(l)) + ' ' + c.y1, x)}>${f0(x)}</td><td${ref((k || kk(l)) + ' ' + c.y0, y)}>${f0(y)}</td></tr>`;
    const at = `<table><thead><tr><th>ATIVO</th><th>${c.y1}</th><th>${c.y0}</th></tr></thead><tbody>${R('Ativo Total', b.ativo, a.ativo, 'b')}${R('Ativo Circulante', b.ac, a.ac, 'b')}${R('Caixa e Equivalentes de Caixa', b.caixa, a.caixa)}${R('Aplicações Financeiras', b.aplic, a.aplic)}${R('Contas a Receber', b.cr, a.cr)}${R('Estoques', b.est, a.est)}${R('Tributos a Recuperar', b.trib, a.trib)}${R('Adiantamento a Fornecedores', b.adi, a.adi)}${R('Ativo Não Circulante', b.anc, a.anc, 'b')}${R('Imobilizado Tangível', b.imob, a.imob)}${R('(−) Depreciação Acumulada', b.depAc, a.depAc)}${R('Imobilizado Intangível', b.intang, a.intang)}${R('(−) Amortização Acumulada', b.amAc, a.amAc)}</tbody></table>`;
    const pa = `<table><thead><tr><th>PASSIVO</th><th>${c.y1}</th><th>${c.y0}</th></tr></thead><tbody>${R('Passivo Total', b.passivo, a.passivo, 'b')}${R('Passivo Circulante', b.pc, a.pc, 'b')}${R('Obrigações Sociais e Trabalhistas', b.os, a.os)}${R('Fornecedores', b.forn, a.forn)}${R('Obrigações Fiscais', b.of, a.of)}${R('Empréstimos e Financiamentos', b.empCP, a.empCP, '', 'Empréstimos CP')}${R('Contas a Pagar', b.cp, a.cp)}${R('Provisões Trabalhistas e Cíveis', b.prov, a.prov)}${R('Passivo Não Circulante', b.pnc, a.pnc, 'b')}${R('Empréstimos e Financiamentos', b.empLP, a.empLP, '', 'Empréstimos LP')}${R('Patrimônio Líquido', b.pl, a.pl, 'b')}${R('Capital Social Realizado', b.capital, a.capital)}${R('Lucros / Prejuízos Acumulados', b.lucros, a.lucros)}</tbody></table>`;
    const D = (l, v, cl, k) => { ref(k || kk(l), v); return `<tr class="${cl || ''}"><td>${l}</td><td${ref((k || kk(l)) + ' ' + c.y1, v)}>${f0(v)}</td></tr>`; };
    const dr = `<table><thead><tr><th>DRE</th><th>${c.y1}</th></tr></thead><tbody>${D('Receita Bruta de Vendas', dre.rb)}${D('(−) Impostos incidentes sobre vendas', -dre.imp, '', 'Impostos sobre vendas')}${D('Receita Líquida de Vendas', dre.rl, 'b')}${D('Custos dos Produtos Vendidos', -dre.cpv)}${D('Lucro Bruto', dre.lb, 'b')}${D('Despesas Administrativas', -dre.adm)}${D('Despesas Comerciais', -dre.com)}${D('EBITDA', dre.ebitda, 'b')}${D('Despesas c/ Depreciação/Amortização', -dre.dep, '', 'Depreciação')}${D('EBIT = Lucro Operacional', dre.ebit, 'b', 'EBIT')}${D('Despesas Financeiras', -dre.fin)}${D('EBT = Lucro Antes do IR e CSLL', dre.ebt, 'b', 'EBT')}${D('IR e CSLL − 34%', -dre.ir, '', 'IR e CSLL')}${D('Lucro Líquido', dre.ll, 'b')}</tbody></table>`;
    const yy = [c.y1, c.y0], sec = Math.floor(((st.done ? st.t1 : Date.now()) - st.t0) / 1000), nOk = Object.keys(st.okSet).length;
    let end = '';
    if (st.done) { const e = c.ev, up = TYPES.indexOf(b.type) < TYPES.indexOf(a.type), same = b.type === a.type;
      end = `<h3>Resultado</h3><div class="box"><p class="res">Nota: ${f2(score())} de 75 · ${nOk} de ${st.F.length} campos certos · tempo ${clock(sec)}</p>
        <p><b>Parecer de referência — risco.</b> Em ${c.y0} a estrutura era <b>${a.type.n}</b>: ${a.type.d} Em ${c.y1} ${same ? 'manteve-se' : up ? 'evoluiu para' : 'regrediu para'} <b>${b.type.n}</b>: ${b.type.d}</p>
        <p><b>Parecer de referência — valor.</b> O ROCE foi de ${f2(e.roce * 100)}% contra um WACC de ${f2(e.wacc * 100)}%, e o EVA de ${c.y1} foi <b>${f2(e.eva)}</b>. ${e.eva > 0 ? 'A empresa gerou valor: o retorno do capital empregado superou o custo médio das fontes que o financiam, e o acionista ganhou acima do retorno mínimo exigido.' : 'A empresa destruiu valor: mesmo com lucro líquido positivo, o retorno do capital empregado ficou abaixo do custo médio das fontes que o financiam.'} A decisão de investir deve pesar o EVA junto com o risco da estrutura financeira (${b.type.n.toLowerCase()}).</p>
        <p class="note">A numeração dos tipos (I a VI) varia entre autores; por isso o jogo usa o nome da estrutura e os sinais de CDG, NCG e ST.</p></div>`; }
    root().innerHTML = `<div class="fcbar"><b>Casos de Finanças</b><span class="pill">Caso ${c.seed} · ${esc(c.name)}</span><span class="pill">Tempo <span id="fcClock">${clock(sec)}</span></span><span class="pill">Certos ${nOk}/${st.F.length}</span><span class="pill">Nota ${f2(score())}</span><span class="sp"></span><button class="btn" data-a="pin">${st.pin ? 'Soltar balanço' : 'Fixar balanço'}</button>${st.done ? '' : '<span class="pill" id="fcSaved">Salvo automaticamente</span><button class="btn" data-a="save">Salvar</button>'}<button class="btn" data-a="lobby">${st.done ? 'Sair do caso' : 'Salvar e sair'}</button></div><div class="fcw">
      <p>Com o Balanço e a DRE abaixo, analise os exercícios de ${c.y1} e ${c.y0} pelos indicadores de NCG, ST, CDG e EVA. Valores em $ mil; indicadores com duas casas decimais.</p>
      <div class="fxhelp"><b>Fórmulas como no Excel.</b> Comece o campo com <code>=</code> e clique nos números do balanço, da DRE ou em outros campos para inserir a referência, por exemplo <code>=[Contas a Receber ${c.y1}]+[Estoques ${c.y1}]</code> ou <code>=[ACC ${c.y1}]-[PCC ${c.y1}]</code>. Use <code>+ − * / ( )</code> e números. Enter confirma, Esc cancela. O botão “Fixar balanço” mantém as demonstrações visíveis enquanto você rola. Campos em % esperam o valor já em porcentagem (multiplique por 100).</div>
      <h3>Balanço Patrimonial e DRE · ${esc(c.name)}</h3><div id="fcStm" class="g2${st.pin ? ' pin' : ''}"><div class="g2e">${at}${pa}</div>${dr}</div>
      <h3>1. Modelo dinâmico · reclassificação do balanço</h3>${tbl('rc', ['Grupo', ...yy])}
      <h3>2. Indicadores do modelo dinâmico</h3>${tbl('md', ['Indicador', ...yy])}
      <h3>3. Ciclo financeiro em dias · ${c.y1}</h3>${tbl('cf', ['Descrição', c.y1])}
      <h3>4. Problema de gestão</h3><div class="box"><p>Para ${c.y1 + 1}, a previsão de faturamento líquido é de <b${ref('Receita prevista', c.pb.rl2)}>$ ${f0(c.pb.rl2)}</b>. A empresa aceita investir no máximo <b${ref('Teto NCG', c.pb.cap)}>$ ${f0(c.pb.cap)}</b> em NCG e não consegue mexer nos prazos médios de recebimento e de pagamento. Resta ajustar os estoques. Qual prazo médio de estocagem a empresa pode admitir?</p></div>${tbl('pb', ['Descrição', c.y1 + 1])}
      <h3>5. Avaliação do EVA · ${c.y1}</h3><div class="box"><p>Custo do capital próprio (Ke): <b${ref('Ke', c.ev.ke * 100)}>${f2(c.ev.ke * 100)}%</b>. Alíquota de IR e CSLL: <b>34%</b>.</p></div>${tbl('ev', ['Descrição', c.y1])}
      <h3>6. Parecer</h3><p>Qual é o risco financeiro da empresa e para qual tipo de estrutura ela evoluiu ou regrediu? A empresa gerou valor para os acionistas? Você investiria nela?</p><textarea id="fcTxt" placeholder="Escreva seu parecer. Ele não vale pontos; ao entregar, você compara com o parecer de referência."${st.done ? ' disabled' : ''}>${esc(st.txt || '')}</textarea>
      ${end}<div class="acts">${st.done ? '<button class="btn pri" data-a="new">Novo caso</button><button class="btn" data-a="lobby">Histórico</button>' : '<button class="btn" data-a="check">Conferir preenchidos</button><button class="btn pri" data-a="finish">Entregar caso</button>'}</div></div>`;
  }
  function check() { st.F.forEach((f) => { const v = (st.val[f.id] || '').trim(); if (!v || st.okSet[f.id]) return; if (right(f, v)) st.okSet[f.id] = 1; else if (st.lastBad[f.id] !== v) { st.miss[f.id] = (st.miss[f.id] || 0) + 1; st.lastBad[f.id] = v; } }); }
  function closeTip() { const t = root().querySelector('.fctip'); if (t) t.remove(); }
  const fxOn = () => { const a = document.activeElement; return a && a.dataset && a.dataset.f && a.tagName === 'INPUT' && !a.readOnly && a.value.trim()[0] === '=' ? a : null; };
  function onDown(e) { const a = fxOn(); root().classList.toggle('fx', !!a); if (!a) return; const r = e.target.closest('[data-ref]'); if (!r || r === a) return; e.preventDefault();
    const tok = '[' + r.dataset.ref + ']', p0 = a.selectionStart, p1 = a.selectionEnd; a.value = a.value.slice(0, p0) + tok + a.value.slice(p1); a.selectionStart = a.selectionEnd = p0 + tok.length; a.dispatchEvent(new Event('input', { bubbles: true })); }
  function onFocus(e) { const t = e.target; if (!st || !t.dataset || !t.dataset.f || t.tagName !== 'INPUT') return; if (e.type === 'focusin') { if (!t.readOnly) { t.value = st.val[t.dataset.f] || ''; t.dataset.old = t.value; } }
    else { const raw = st.val[t.dataset.f] || ''; t.value = disp(raw); t.title = raw.trim()[0] === '=' ? raw : ''; t.classList.toggle('fxv', raw.trim()[0] === '='); root().classList.remove('fx'); } }
  function onKey(e) { const t = e.target; if (!st || !t.dataset || !t.dataset.f || t.tagName !== 'INPUT') return; if (e.key === 'Enter') { e.preventDefault(); const all = [...root().querySelectorAll('input.fi:not([readonly])')], i = all.indexOf(t); t.blur(); if (all[i + 1]) all[i + 1].focus(); }
    else if (e.key === 'Escape') { t.value = t.dataset.old || ''; st.val[t.dataset.f] = t.value; t.blur(); } }
  function onInput(e) { const t = e.target; if (!st) return; if (t.dataset && t.dataset.f) { if (t.readOnly) return; st.val[t.dataset.f] = t.value; t.classList.remove('no'); root().classList.toggle('fx', t.tagName === 'INPUT' && t.value.trim()[0] === '='); } else if (t.id === 'fcTxt') st.txt = t.value; else return; clearTimeout(onInput.t); onInput.t = setTimeout(() => saveOpen(), 600); }
  function onClick(e) {
    const q = e.target.closest('[data-q]'), b = e.target.closest('[data-a]'); closeTip();
    if (q && st) { const f = st.F.find((x) => x.id === q.dataset.q) ; st.F.filter((x) => x.row === f.row && x.sec === f.sec).forEach((x) => { if (!st.okSet[x.id]) st.hint[x.id] = 1; }); q.classList.add('used');
      const tip = document.createElement('div'); tip.className = 'fctip'; tip.innerHTML = `<b>Indica:</b> ${f.tip[0]}<br>${f.tip[1]}`; const w = root().querySelector('.fcw'); w.style.position = 'relative'; w.appendChild(tip);
      const r = q.getBoundingClientRect(), wr = w.getBoundingClientRect(), z = parseFloat(document.documentElement.style.zoom) || 1; let left = (r.left - wr.left) / z - 20; const maxL = wr.width / z - tip.offsetWidth - 8; if (left > maxL) left = Math.max(0, maxL);
      tip.style.left = left + 'px'; tip.style.top = ((r.bottom - wr.top) / z + 10) + 'px'; tip.style.setProperty('--ax', ((r.left - wr.left) / z - left + 9) + 'px'); saveOpen(); e.stopPropagation(); return; }
    if (!b) return; const a = b.dataset.a;
    if (a === 'exit') { if (st && !st.done) saveOpen(); clearInterval(tick); root().classList.remove('on'); if (onExit) onExit(); }
    else if (a === 'resume') { const o = loadOpen(); if (o) start(o.seed, o.hints, o); }
    else if (a === 'pin') { st.pin = !st.pin; const el = document.getElementById('fcStm'); el.classList.toggle('pin', st.pin); b.textContent = st.pin ? 'Soltar balanço' : 'Fixar balanço'; }
    else if (a === 'discard') { saveOpen(true); lobby(); }
    else if (a === 'save') { saveOpen(); const el = document.getElementById('fcSaved'); if (el) el.textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    else if (a === 'start') start(Math.max(1, +document.getElementById('fcSeed').value || 1), document.getElementById('fcHints').value === '1');
    else if (a === 'again') start(+b.dataset.seed, true);
    else if (a === 'new') start(Math.floor(Math.random() * 9000) + 1000, st ? st.hints : true);
    else if (a === 'lobby') { lobby(); }
    else if (a === 'check') { const y = root().scrollTop; check(); draw(); root().scrollTop = y; saveOpen(); }
    else if (a === 'finish') { check(); st.done = true; st.t1 = Date.now(); clearInterval(tick); saveOpen(true); record({ at: Date.now(), seed: st.c.seed, type: st.c.b.type.n, ok: Object.keys(st.okSet).length, n: st.F.length, sec: Math.floor((st.t1 - st.t0) / 1000), score: Math.round(score() * 100) / 100 }); draw(); const r = root().querySelector('.res'); if (r) r.scrollIntoView({ block: 'center' }); }
  }
  let onExit = null;
  window.FinCases = { open(p, store, o) { player = p || 'Jogador'; io = store || null; st = null; o = o || {}; onExit = o.onExit || null; const op = o.resume && loadOpen(); if (op) start(op.seed, op.hints, op); else if (o.seed) start(o.seed, true); else lobby(); root().classList.add('on'); }, generate, fields, right, TYPES };
})();
