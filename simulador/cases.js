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
  // ---------- caso de fluxo de caixa (Simples Nacional) ----------
  const DEC = [['viavel', 'Viável'], ['inviavel', 'Inviável']];
  const npv = (fl, i) => fl.reduce((a, v, t) => a + v / Math.pow(1 + i, t), 0);
  function irr(fl) { let lo = -0.95, hi = 10; if (npv(fl, lo) * npv(fl, hi) > 0) return null; for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (npv(fl, lo) * npv(fl, m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; }
  function payback(fl) { let acc = fl[0]; for (let t = 1; t < fl.length; t++) { if (acc + fl[t] >= 0) return t - 1 + (-acc) / fl[t]; acc += fl[t]; } return null; }
  const BIZ = [['Loja de Calçados Femininos', 'Luiza e Ana', 'uma cidade do interior de Minas'], ['Cafeteria Especial', 'Bruno e Carla', 'o centro de Belém'], ['Pet Shop de Bairro', 'Marcos e Júlia', 'Macapá'], ['Ótica Popular', 'Renata e Paulo', 'Santarém'], ['Padaria Artesanal', 'Tiago e Sofia', 'Ananindeua'], ['Loja de Bicicletas', 'Diego e Lara', 'Florianópolis'], ['Papelaria e Presentes', 'Helena e Caio', 'Campinas'], ['Loja de Cosméticos', 'Beatriz e Rafael', 'Recife']];
  function generateFC(seed) {
    if (seed === 1) return finishFC({ seed, biz: BIZ[0], n: 5, inv: 80000, cg: 70000, q: 6000, p: 100, cv: 50, al: 4000, fu: 3000, ou: 3000, pl: 5000, aliq: 8, tma: 15, vr: 10000 });
    const R = rng(seed * 104729 + 7), u = (a, b) => a + (b - a) * R(), pick = (a) => a[Math.floor(R() * a.length)], wantPos = R() < 0.62;
    for (let tries = 0; tries < 20000; tries++) {
      const c = { seed, biz: pick(BIZ), n: pick([4, 5, 5, 5, 6]), inv: Math.round(u(40, 260)) * 1000, q: Math.round(u(15, 140)) * 100, p: Math.round(u(6, 70)) * 5, aliq: pick([4, 6, 7.3, 8, 9.5, 10, 11.2]), tma: Math.round(u(10, 20)) };
      c.cv = Math.round(c.p * u(0.35, 0.62)); c.cg = Math.round(c.inv * u(0.25, 1.0) / 5000) * 5000; c.vr = Math.round(c.inv * u(0.05, 0.25) / 1000) * 1000;
      const rb = c.q * c.p, m = (k) => Math.max(500, Math.round(rb / 12 * k / 500) * 500);
      c.al = m(u(0.04, 0.09)); c.fu = m(u(0.04, 0.12)); c.ou = m(u(0.02, 0.06)); c.pl = m(u(0.04, 0.1));
      const x = finishFC(c), lo = x.lo / x.rb;
      if (lo < 0.03 || lo > 0.25 || x.tir == null || x.tir <= 0.005 || (x.vpl > 0) !== wantPos || Math.abs(x.vpl) < 0.03 * (x.inv + x.cg)) continue;
      if (x.vpl > 0 && x.pbd == null) continue; return x;
    }
    return generateFC(seed + 1000003);
  }
  function finishFC(c) {
    c.name = c.biz[0]; c.rb = c.q * c.p; c.imp = c.rb * c.aliq / 100; c.rl = c.rb - c.imp; c.gv = c.q * c.cv; c.gfm = c.al + c.fu + c.ou + c.pl; c.gf = c.gfm * 12; c.lo = c.rl - c.gv - c.gf; c.ll = c.lo;
    c.fl = [-(c.inv + c.cg)]; for (let t = 1; t <= c.n; t++) c.fl.push(c.ll + (t === c.n ? c.vr + c.cg : 0));
    const i = c.tma / 100; c.vpl = npv(c.fl, i); c.tir = irr(c.fl); c.pbs = payback(c.fl); c.disc = c.fl.map((v, t) => v / Math.pow(1 + i, t)); c.pbd = payback(c.disc);
    c.vpe = c.disc.slice(1).reduce((a, v) => a + v, 0); c.il = c.vpe / -c.fl[0]; return c; }
  function fieldsFC(c) {
    const F = [], one = (sec, id, code, label, ans, kind, tip, x) => F.push(Object.assign({ id, sec, row: id, code, label, col: 1, ans, kind, tip }, x || {}));
    one('pr', 'inv', 'INVESTIMENTO', 'Investimento (Ano 0)', -c.inv, 'm', ['Saída de caixa na montagem do negócio. Entra negativa no fluxo.', fx('Investimento', '− valor da montagem')], { abs: 1 });
    one('pr', 'cg', 'CAPITAL DE GIRO', 'Capital de Giro (Ano 0)', -c.cg, 'm', ['Dinheiro preso em estoques e vendas a prazo. Sai no Ano 0 e volta no último ano.', fx('Capital de Giro', '− valor necessário ao giro')], { abs: 1 });
    one('dre', 'rb', 'RECEITA BRUTA', 'Receita Bruta', c.rb, 'm', ['Faturamento anual com vendas constantes.', fx('Receita Bruta', 'Unidades por ano × Preço médio')]);
    one('dre', 'imp', 'IMPOSTO SIMPLES', 'Imposto Simples', -c.imp, 'm', ['No Simples Nacional o imposto incide sobre as vendas brutas e já inclui IR e CSLL.', fx('Imposto', 'Receita Bruta × alíquota do Simples')], { abs: 1 });
    one('dre', 'rl', 'RECEITA LÍQUIDA', 'Receita Líquida', c.rl, 'm', ['Receita depois do imposto sobre vendas.', fx('Receita Líquida', 'Receita Bruta − Imposto Simples')]);
    one('dre', 'gv', 'GASTOS VARIÁVEIS', 'Gastos Variáveis', -c.gv, 'm', ['Custo das mercadorias vendidas no ano.', fx('Gastos Variáveis', 'Unidades por ano × Custo médio')], { abs: 1 });
    one('dre', 'gf', 'GASTOS FIXOS', 'Gastos Fixos', -c.gf, 'm', ['Soma dos gastos mensais, inclusive pró-labore, vezes 12.', fx('Gastos Fixos', '(Aluguel + Funcionários + Outras despesas + Pró-labore) × 12')], { abs: 1 });
    one('dre', 'lo', 'LUCRO OPERACIONAL', 'Lucro Operacional', c.lo, 'm', ['Resultado da operação no ano.', fx('Lucro Operacional', 'Receita Líquida − Gastos Variáveis − Gastos Fixos')]);
    one('dre', 'll', 'LUCRO LÍQUIDO', 'Lucro Líquido', c.ll, 'm', ['No Simples não há IR e CSLL à parte: o imposto já saiu das vendas, e não há depreciação a descontar neste exercício.', fx('Lucro Líquido', 'Lucro Operacional')]);
    one('aj', 'vr', 'VALOR RESIDUAL', 'Valor Residual (Ano ' + c.n + ')', c.vr, 'm', ['Quanto os ativos da montagem valem no fim do horizonte. Entra positivo no último ano.', fx('Valor Residual', 'valor de revenda dos ativos no Ano ' + c.n)]);
    one('aj', 'rcg', 'RECUPERAÇÃO CAPITAL DE GIRO', 'Recuperação do Capital de Giro (Ano ' + c.n + ')', c.cg, 'm', ['Os estoques e recebíveis são liquidados ao encerrar o projeto e o giro volta ao caixa.', fx('Recuperação', 'Capital de Giro investido no Ano 0')]);
    for (let t = 0; t <= c.n; t++) F.push({ id: 'fc' + t, sec: 'fl', row: 'fc', code: 'FC ANO ' + t, label: 'Fluxo de Caixa do Projeto', col: t, ans: c.fl[t], kind: 'm',
      tip: ['Soma de tudo que entra e sai do caixa em cada ano. O Ano 0 é negativo.', fx('FC', 'Ano 0: Investimento + Capital de Giro · Anos 1 a ' + (c.n - 1) + ': Lucro Líquido · Ano ' + c.n + ': Lucro Líquido + Valor Residual + Recuperação do Giro')] });
    one('av', 'vpl', 'VPL', 'VPL à TMA', c.vpl, 'm', ['Valor criado pelo projeto, em dinheiro de hoje, acima da remuneração mínima exigida.', fx('VPL', 'Σ FC<sub>t</sub> ÷ (1 + TMA)<sup>t</sup>') + '<br><span class="fcfm">Excel: =VPL(TMA; FC1:FCn) + FC0</span>']);
    one('av', 'tir', 'TIR', 'TIR (%)', c.tir * 100, 'p', ['Taxa que zera o VPL. Compare com a TMA.', fx('TIR', 'taxa i tal que Σ FC<sub>t</sub> ÷ (1 + i)<sup>t</sup> = 0') + '<br><span class="fcfm">Excel: =TIR(FC0:FCn)</span>']);
    one('av', 'pbs', 'PAYBACK SIMPLES', 'Payback simples (anos)', c.pbs, 'a', ['Tempo para recuperar o investimento sem descontar os fluxos. Use fração de ano.', fx('Payback', 'anos completos + saldo que falta ÷ FC do ano seguinte')]);
    if (c.pbd != null) one('av', 'pbd', 'PAYBACK DESCONTADO', 'Payback descontado (anos)', c.pbd, 'a', ['Igual ao simples, mas com cada fluxo trazido a valor presente pela TMA.', fx('Payback', 'anos completos + saldo descontado que falta ÷ FC descontado do ano seguinte')]);
    one('av', 'il', 'IL', 'Índice de Lucratividade', c.il, 'x', ['Quanto volta, em valor presente, para cada $ 1 investido no Ano 0.', fx('IL', 'Σ FC<sub>t</sub> ÷ (1 + TMA)<sup>t</sup> (anos 1 a n) ÷ |FC<sub>0</sub>|')]);
    one('av', 'dec', '', 'Decisão', c.vpl > 0 ? 'viavel' : 'inviavel', 'sel', ['Use o VPL: positivo, o projeto paga a TMA e ainda cria valor.', '<span class="fcfm">VPL &gt; 0 · TIR &gt; TMA · IL &gt; 1 → viável</span>'], { opts: DEC });
    return F;
  }

  function parseNum(s) { s = String(s).trim().replace(/[R$\s%]/g, ''); if (!s) return null; const neg = /^\(.*\)$/.test(s); s = s.replace(/[()]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const v = parseFloat(s); return isNaN(v) ? null : neg ? -v : v; }
  const nk = (k) => String(k).toLowerCase().replace(/\s+/g, ' ').trim();
  const codeOf = (f) => f.code ? f.code : f.row.toUpperCase() + (st.F.filter((x) => x.row === f.row && x.sec === f.sec).length > 1 ? ' ' + (f.col ? st.c.y1 : st.c.y0) : '');
  function evalRaw(raw, depth) { raw = String(raw == null ? '' : raw).trim(); if (raw[0] !== '=') return parseNum(raw); if ((depth || 0) > 25) return null;
    let bad = false, x = raw.slice(1).replace(/\[([^\]]+)\]/g, (m, k) => { k = nk(k); let v = st.refs[k]; if (v == null && st.fref[k]) v = evalRaw(st.val[st.fref[k]], (depth || 0) + 1); if (v == null || !isFinite(v)) { bad = true; return '0'; } return '(' + v + ')'; });
    if (bad) return null; x = x.replace(/\d[\d.]*(,\d+)?/g, (m) => m.includes(',') ? m.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(m) ? m.replace(/\./g, '') : m).replace(/[×x]/gi, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**');
    if (!/^[\d\s+\-*/().e]*$/.test(x) || !x.trim()) return null; try { const v = Function('"use strict";return (' + x + ')')(); return typeof v === 'number' && isFinite(v) ? v : null; } catch (e) { return null; } }
  const disp = (raw) => { raw = String(raw || ''); if (raw.trim()[0] !== '=') return raw; const v = evalRaw(raw); return v == null ? '#ERRO' : f2(v); };
  function right(f, raw) { if (f.kind === 'sel') return raw === f.ans; let v = evalRaw(raw); if (v == null) return false; const a = f.abs ? Math.abs(f.ans) : f.ans; if (f.abs) v = Math.abs(v);
    const tol = f.kind === 'm' ? Math.max(1, Math.abs(a) * 0.0005) : f.kind === 'd' ? 0.06 : f.kind === 'a' ? 0.011 : f.kind === 'x' ? 0.006 : 0.02; return Math.abs(v - a) <= tol; }
  const show = (f) => f.kind === 'sel' ? (f.opts || TYPES.map((t) => [t.k, t.n])).find((t) => t[0] === f.ans)[1] : f.kind === 'm' ? f2(f.ans) : f.kind === 'd' ? f2(f.ans) + ' dias' : f.kind === 'a' ? f2(f.ans) + ' anos' : f.kind === 'x' ? f2(f.ans) : f2(f.ans) + '%';

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
    d.open = clear || !st || st.done ? null : { seed: st.c.seed, kind: st.kind, n: st.F.length, hints: st.hints, val: st.val, hint: st.hint, miss: st.miss, okSet: st.okSet, lastBad: st.lastBad || {}, txt: st.txt || '', sec: Math.floor((Date.now() - st.t0) / 1000), at: Date.now() };
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
#fc .fcgrid{overflow-x:auto}#fc .fcgrid input.fi{width:112px}#fc .fcgrid td:first-child{white-space:nowrap}
#fc .fcmsg{background:#e3f6e6;border:1px solid #2e9e3f;color:#16521f;border-radius:8px;padding:10px 14px;margin:10px 0;font-weight:600}#fc .fcbar{row-gap:8px}
#fc .fxhelp{background:#eef4fb;border:1px solid #c5d9f0;border-radius:8px;padding:10px 14px;font-size:14px;margin:10px 0}#fc code{background:#fff;border:1px solid #d6d9dc;border-radius:3px;padding:1px 5px;font:13px ui-monospace,Menlo,monospace}#fc .fi.fxv{font-style:italic}#fc .fi:focus{text-align:left;width:100%;min-width:150px;position:relative;z-index:2}#fc.fx [data-ref]{cursor:cell;outline:1px dashed #3a78c3;outline-offset:-3px}#fc.fx [data-ref]:hover{background:#d8e8fb!important}#fc.fx input[data-ref]:focus{outline:2px solid #3a78c3;cursor:text}
#fc .fcopen{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;background:#fff8e1;border:1px solid #e0b84a;border-radius:10px;padding:14px 18px;margin-top:18px}#fc .fcopen b{display:block;font-size:16px}#fc .fcopen span{font-size:14px;color:#4a4f54}#fc .fcbar .btn{padding:7px 14px}
#fc .fcempty{background:#fff;border:1px dashed #b8bcc0;border-radius:10px;padding:26px;text-align:center;color:#666b70}#fc .fcnote{display:inline-block;min-width:58px;text-align:center;font-weight:700;border-radius:12px;padding:2px 10px}#fc .fcnote.g{background:#e3f6e6;color:#1a6b2a}#fc .fcnote.y{background:#fdf3cf;color:#7a5a00}#fc .fcnote.r{background:#fde7e9;color:#a00015}
@media(max-width:800px){#fc .fchero,#fc .fcsteps,#fc .fcrule{grid-template-columns:minmax(0,1fr)}#fc .fcstats{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
  function root() { let el = document.getElementById('fc'); if (!el) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); el = document.createElement('div'); el.id = 'fc'; document.body.appendChild(el); el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onInput); el.addEventListener('mousedown', onDown); el.addEventListener('focusin', onFocus); el.addEventListener('focusout', onFocus); el.addEventListener('keydown', onKey); } return el; }
  const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function lobby() {
    clearInterval(tick); if (st && !st.done) saveOpen(); st = null; const op = loadOpen(), h = hist(), n = h.length, best = n ? Math.max(...h.map((x) => x.score)) : null, avg = n ? h.reduce((a, x) => a + x.score, 0) / n : null, tm = n ? Math.round(h.reduce((a, x) => a + x.sec, 0) / n) : null;
    const STEPS = { fc: [['Ano 0', 'Lance o investimento na montagem e o capital de giro como saídas de caixa.'], ['Resultado anual', 'Monte receita, imposto do Simples, gastos variáveis e fixos até o lucro líquido.'], ['Ajustes do último ano', 'Some o valor residual e a recuperação do capital de giro.'], ['Fluxo do projeto', 'Feche o fluxo de caixa de cada ano, do Ano 0 ao fim do horizonte.'], ['VPL, TIR e paybacks', 'Avalie o projeto pela TMA: VPL, TIR, paybacks simples e descontado e IL.'], ['Decisão e parecer', 'Diga se o projeto é viável e compare seu parecer com o de referência.']] };
    STEPS.eva = [['Modelo dinâmico', 'Reclassifique o balanço em contas erráticas, cíclicas e de longo prazo.'], ['ST, NCG e CDG', 'Calcule os três indicadores e identifique a estrutura financeira de cada ano.'], ['Ciclo financeiro', 'Monte PME, PMR e PMP em dias e confirme a NCG pelo ciclo.'], ['Problema de gestão', 'Ache o prazo de estocagem que cabe no teto de investimento em NCG.'], ['EVA', 'Chegue ao mesmo valor por quatro caminhos: ROCE, NOPAT, custo das fontes e ROE.'], ['Parecer', 'Escreva sua análise de risco e de valor e compare com a de referência.']];
    const stepsHTML = (k) => STEPS[k].map((x, i) => `<div><i>${i + 1}</i><b>${x[0]}</b><span>${x[1]}</span></div>`).join(''); lobby.steps = stepsHTML;
    const KN = { eva: 'Modelo dinâmico e EVA', fc: 'Fluxo de caixa de projeto' };
    const badge = (s) => { const p = s / 75; return `<span class="fcnote ${p >= 0.9 ? 'g' : p >= 0.6 ? 'y' : 'r'}">${f2(s)}</span>`; };
    root().innerHTML = `<div class="fcbar"><b>Casos de Finanças</b><span class="pill">Jogador: ${esc(player)}</span><span class="sp"></span><button class="btn" data-a="exit">Voltar ao Simulador</button></div><div class="fcw fclob">
      <div class="fchero"><div><h1>Treine análise financeira com casos novos a cada rodada</h1><p>Escolha o tipo de exercício: a análise do balanço de uma empresa fictícia (modelo dinâmico, ciclo financeiro e EVA) ou a avaliação de um novo negócio pelo fluxo de caixa (VPL, TIR e payback). Você confere na hora e recebe uma nota de 0 a 75.</p></div>
        <div class="fcgo"><label>Tipo de caso<select id="fcType"><option value="eva"${lastKind === 'eva' ? ' selected' : ''}>Modelo dinâmico e EVA</option><option value="fc"${lastKind === 'fc' ? ' selected' : ''}>Fluxo de caixa de projeto</option></select></label><label>Número do caso<input id="fcSeed" type="number" min="1" value="${Math.floor(Math.random() * 9000) + 1000}"></label><label>Dicas<select id="fcHints"><option value="1">Permitidas (com desconto)</option><option value="0">Desligadas (modo prova)</option></select></label><button class="btn pri big" data-a="start">Começar caso</button><button class="btn big" data-a="imp">Importar Excel preenchido</button><span class="note">O mesmo número gera sempre o mesmo caso. No fluxo de caixa, o caso 1 é o exercício da loja de calçados da aula.</span></div></div>
      ${op ? `<div class="fcopen"><div><b>Caso ${op.seed} em andamento · ${KN[op.kind || 'eva']}</b><span>${Object.keys(op.okSet || {}).length} de ${op.n || 42} campos certos · ${Object.values(op.val || {}).filter((v) => String(v).trim()).length} preenchidos · tempo ${clock(op.sec || 0)} · salvo em ${new Date(op.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div><span><button class="btn pri" data-a="resume">Continuar</button> <button class="btn" data-a="discard">Descartar</button></span></div>` : ''}
      <div class="fcstats"><div><span>Casos resolvidos</span><b>${n}</b></div><div><span>Melhor nota</span><b>${best != null ? f2(best) : '–'}</b></div><div><span>Nota média</span><b>${avg != null ? f2(avg) : '–'}</b></div><div><span>Tempo médio</span><b>${tm != null ? clock(tm) : '–'}</b></div></div>
      <h3>O que você resolve em cada caso</h3><div class="fcsteps" id="fcSteps">${stepsHTML(lastKind)}</div>
      <div class="fcrule"><div><b>Campo certo</b><span>75 pontos divididos igualmente entre os campos do caso</span></div><div><b>Dica aberta (?)</b><span>o campo passa a valer metade</span></div><div><b>Conferência errada</b><span>cada uma tira 25% do campo</span></div></div>
      <h3>Seu histórico</h3>${n ? `<table><thead><tr><th>Data</th><th>Caso</th><th>Tipo</th><th>Resultado</th><th>Acertos</th><th>Tempo</th><th>Nota (de 75)</th><th></th></tr></thead><tbody>${h.map((x) => `<tr><td>${new Date(x.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${x.seed}</td><td>${KN[x.kind || 'eva']}</td><td>${esc(x.type)}</td><td>${x.ok}/${x.n}</td><td>${clock(x.sec)}</td><td>${badge(x.score)}</td><td><button class="btn sm" data-a="again" data-seed="${x.seed}" data-kind="${x.kind || 'eva'}">Refazer</button></td></tr>`).join('')}</tbody></table>` : '<div class="fcempty">Nenhum caso resolvido ainda. Comece pelo caso acima; as notas aparecem aqui.</div>'}</div>`;
    root().classList.add('on'); root().scrollTop = 0;
  }

  function start(seed, hints, sv, kind) {
    kind = kind === 'fc' ? 'fc' : 'eva'; lastKind = kind; const c = kind === 'fc' ? generateFC(seed) : generate(seed), F = kind === 'fc' ? fieldsFC(c) : fields(c); st = { c, F, hints, t0: Date.now(), done: false, val: {}, hint: {}, miss: {}, okSet: {} };
    st.refs = {}; st.fref = {}; F.forEach((f) => { if (f.kind !== 'sel') st.fref[nk(codeOf(f))] = f.id; }); st.kind = kind;
    if (sv) { Object.assign(st, { val: sv.val || {}, hint: sv.hint || {}, miss: sv.miss || {}, okSet: sv.okSet || {}, lastBad: sv.lastBad || {}, txt: sv.txt || '', t0: Date.now() - (sv.sec || 0) * 1000 }); }
    draw(); root().scrollTop = 0; clearInterval(tick); tick = setInterval(() => { const el = document.getElementById('fcClock'); if (el && st && !st.done) { const s = Math.floor((Date.now() - st.t0) / 1000); el.textContent = clock(s); if (s % 15 === 0) saveOpen(); } }, 1000); saveOpen();
  }
  const worth = (f) => { if (!st.okSet[f.id]) return 0; const base = 75 / st.F.length; return base * (st.hint[f.id] ? 0.5 : 1) * Math.max(0, 1 - 0.25 * (st.miss[f.id] || 0)); };
  const score = () => st.F.reduce((s, f) => s + worth(f), 0);

  function inp(f) { const v = st.val[f.id] || '', cls = st.okSet[f.id] ? ' ok' : st.miss[f.id] && st.val[f.id] === st.lastBad[f.id] ? ' no' : st.done ? ' no' : '', lock = st.done || st.okSet[f.id], dis = lock ? (f.kind === 'sel' ? ' disabled' : ' readonly') : '';
    const el = f.kind === 'sel' ? `<select class="fi${cls}" data-f="${f.id}"${dis}><option value="">Escolha…</option>${(f.opts || TYPES.map((t) => [t.k, t.n])).map((t) => `<option value="${t[0]}"${v === t[0] ? ' selected' : ''}>${t[1]}</option>`).join('')}</select>` : `<input class="fi${cls}${String(v).trim()[0] === '=' ? ' fxv' : ''}" data-f="${f.id}" data-ref="${esc(codeOf(f))}" value="${esc(disp(v))}" title="${String(v).trim()[0] === '=' ? esc(v) : ''}" autocomplete="off" spellcheck="false"${dis} aria-label="${esc(f.label)}">`;
    return el + (st.done && !st.okSet[f.id] ? `<span class="ans">Resposta: ${show(f)}</span>` : ''); }
  const qb = (f) => st.hints ? `<button class="q${st.hint[f.id] ? ' used' : ''}" data-q="${f.id}" title="Dica (reduz o valor do campo à metade)" aria-label="Dica">?</button>` : '';
  function tbl(sec, heads) { const rows = [], seen = {}; st.F.filter((f) => f.sec === sec).forEach((f) => { if (seen[f.row]) return; seen[f.row] = 1; const fs = st.F.filter((x) => x.sec === sec && x.row === f.row); rows.push(`<tr><td>${f.label}${qb(f)}</td>${fs.map((x) => `<td>${inp(x)}</td>`).join('')}</tr>`); });
    return `<table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`; }

  function draw() {
    if (st.kind === 'fc') return drawFC();
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
    root().innerHTML = `<div class="fcbar"><b>Casos de Finanças</b><span class="pill">Caso ${c.seed} · ${esc(c.name)}</span><span class="pill">Tempo <span id="fcClock">${clock(sec)}</span></span><span class="pill">Certos ${nOk}/${st.F.length}</span><span class="pill">Nota ${f2(score())}</span><span class="sp"></span><button class="btn" data-a="pin">${st.pin ? 'Soltar balanço' : 'Fixar balanço'}</button>${st.done ? '' : '<button class="btn" data-a="xlsx">Baixar Excel</button><button class="btn" data-a="imp">Importar Excel</button><button class="btn" data-a="save" id="fcSaved" title="O caso também é salvo automaticamente">Salvar</button>'}<button class="btn" data-a="lobby">${st.done ? 'Sair do caso' : 'Salvar e sair'}</button></div><div class="fcw">${st.msg ? `<div class="fcmsg">${esc(st.msg)}</div>` : ''}
      <p>Com o Balanço e a DRE abaixo, analise os exercícios de ${c.y1} e ${c.y0} pelos indicadores de NCG, ST, CDG e EVA. Valores em $ mil; indicadores com duas casas decimais.</p>
      <div class="fxhelp"><b>Fórmulas como no Excel.</b> Comece o campo com <code>=</code> e clique nos números do balanço, da DRE ou em outros campos para inserir a referência, por exemplo <code>=[Contas a Receber ${c.y1}]+[Estoques ${c.y1}]</code> ou <code>=[ACC ${c.y1}]-[PCC ${c.y1}]</code>. Use <code>+ − * / ( )</code> e números. Enter confirma, Esc cancela. Prefere o Excel? Use “Baixar Excel”, preencha e volte com “Importar Excel”. O botão “Fixar balanço” mantém as demonstrações visíveis enquanto você rola. Campos em % esperam o valor já em porcentagem (multiplique por 100).</div>
      <h3>Balanço Patrimonial e DRE · ${esc(c.name)}</h3><div id="fcStm" class="g2${st.pin ? ' pin' : ''}"><div class="g2e">${at}${pa}</div>${dr}</div>
      <h3>1. Modelo dinâmico · reclassificação do balanço</h3>${tbl('rc', ['Grupo', ...yy])}
      <h3>2. Indicadores do modelo dinâmico</h3>${tbl('md', ['Indicador', ...yy])}
      <h3>3. Ciclo financeiro em dias · ${c.y1}</h3>${tbl('cf', ['Descrição', c.y1])}
      <h3>4. Problema de gestão</h3><div class="box"><p>Para ${c.y1 + 1}, a previsão de faturamento líquido é de <b${ref('Receita prevista', c.pb.rl2)}>$ ${f0(c.pb.rl2)}</b>. A empresa aceita investir no máximo <b${ref('Teto NCG', c.pb.cap)}>$ ${f0(c.pb.cap)}</b> em NCG e não consegue mexer nos prazos médios de recebimento e de pagamento. Resta ajustar os estoques. Qual prazo médio de estocagem a empresa pode admitir?</p></div>${tbl('pb', ['Descrição', c.y1 + 1])}
      <h3>5. Avaliação do EVA · ${c.y1}</h3><div class="box"><p>Custo do capital próprio (Ke): <b${ref('Ke', c.ev.ke * 100)}>${f2(c.ev.ke * 100)}%</b>. Alíquota de IR e CSLL: <b>34%</b>.</p></div>${tbl('ev', ['Descrição', c.y1])}
      <h3>6. Parecer</h3><p>Qual é o risco financeiro da empresa e para qual tipo de estrutura ela evoluiu ou regrediu? A empresa gerou valor para os acionistas? Você investiria nela?</p><textarea id="fcTxt" placeholder="Escreva seu parecer. Ele não vale pontos; ao entregar, você compara com o parecer de referência."${st.done ? ' disabled' : ''}>${esc(st.txt || '')}</textarea>
      ${end}<div class="acts">${st.done ? '<button class="btn pri" data-a="new">Novo caso</button><button class="btn" data-a="lobby">Histórico</button>' : '<button class="btn" data-a="check">Conferir preenchidos</button><button class="btn pri" data-a="finish">Entregar caso</button>'}</div></div>`;
  }
  function drawFC() {
    const { c } = st; st.lastBad = st.lastBad || {};
    const ref = (k, v) => { st.refs[nk(k)] = v; return ` data-ref="${esc(k)}"`; }, money = (v) => 'R$ ' + f2(v);
    const L = (lab, k, v, txt) => `<tr><td>${lab}</td><td${ref(k, v)}>${txt || money(v)}</td></tr>`;
    const dados = `<table><thead><tr><th>Dados levantados</th><th>Valor</th></tr></thead><tbody>${L('Investimento na montagem', 'Investimento', c.inv)}${L('Capital de Giro (estoques e vendas a prazo)', 'Capital de Giro', c.cg)}${L('Vendas', 'Unidades', c.q, f0(c.q) + ' unidades por ano')}${L('Preço de venda médio', 'Preço', c.p, money(c.p) + '/unid.')}${L('Custo médio dos produtos', 'Custo', c.cv, money(c.cv) + '/unid.')}${L('Valor residual dos ativos no Ano ' + c.n, 'Valor residual', c.vr)}</tbody></table>`;
    const gastos = `<table><thead><tr><th>Gastos e premissas</th><th>Valor</th></tr></thead><tbody>${L('Aluguel', 'Aluguel', c.al, money(c.al) + '/mês')}${L('Funcionários', 'Funcionários', c.fu, money(c.fu) + '/mês')}${L('Outras despesas (contabilidade, propaganda, telefone, energia)', 'Outras despesas', c.ou, money(c.ou) + '/mês')}${L('Pró-labore', 'Pró-labore', c.pl, money(c.pl) + '/mês')}${L('Alíquota do Simples Nacional sobre as vendas brutas', 'Alíquota', c.aliq, f2(c.aliq) + '%')}${L('Remuneração mínima exigida (TMA)', 'TMA', c.tma, f2(c.tma) + '% a.a.')}${L('Horizonte de análise', 'Anos', c.n, c.n + ' anos')}</tbody></table>`;
    const sec = Math.floor(((st.done ? st.t1 : Date.now()) - st.t0) / 1000), nOk = Object.keys(st.okSet).length, yrs = Array.from({ length: c.n + 1 }, (_, t) => 'Ano ' + t);
    let end = '';
    if (st.done) { const ok = c.vpl > 0;
      end = `<h3>Resultado</h3><div class="box"><p class="res">Nota: ${f2(score())} de 75 · ${nOk} de ${st.F.length} campos certos · tempo ${clock(sec)}</p>
        <p><b>Parecer de referência.</b> O projeto exige R$ ${f2(-c.fl[0])} no Ano 0 e gera R$ ${f2(c.ll)} por ano${c.n > 1 ? `, com R$ ${f2(c.vr + c.cg)} a mais no Ano ${c.n} pelo valor residual e pela volta do capital de giro` : ''}. A TMA de ${f2(c.tma)}% leva a um VPL de <b>R$ ${f2(c.vpl)}</b> e a TIR é de <b>${f2(c.tir * 100)}%</b>. ${ok ? `O projeto é <b>viável</b>: remunera a TMA e ainda cria valor; cada R$ 1 investido volta como R$ ${f2(c.il)} em valor presente.` : `O projeto é <b>inviável</b> à TMA exigida: a TIR fica abaixo dela e cada R$ 1 investido volta como apenas R$ ${f2(c.il)} em valor presente.`}</p>
        <p><b>Recuperação do investimento.</b> O payback simples é de ${f2(c.pbs)} anos${c.pbd != null ? ` e o descontado, de ${f2(c.pbd)} anos` : `, mas, descontando os fluxos pela TMA, o investimento não se paga dentro dos ${c.n} anos`}. ${c.pbs > c.n * 0.7 ? 'É um retorno lento para o horizonte; vale testar cenários de venda menor ou de gastos maiores antes de decidir.' : 'A folga entre o payback e o horizonte dá margem para absorver anos de venda mais fraca.'}</p>
        <p class="note">Neste exercício não há depreciação nem financiamento: no Simples o imposto já sai das vendas, então o lucro líquido é igual ao operacional e vira fluxo de caixa.</p></div>`; }
    root().innerHTML = `<div class="fcbar"><b>Casos de Finanças</b><span class="pill">Caso ${c.seed} · ${esc(c.name)}</span><span class="pill">Tempo <span id="fcClock">${clock(sec)}</span></span><span class="pill">Certos ${nOk}/${st.F.length}</span><span class="pill">Nota ${f2(score())}</span><span class="sp"></span><button class="btn" data-a="pin">${st.pin ? 'Soltar dados' : 'Fixar dados'}</button>${st.done ? '' : '<button class="btn" data-a="xlsx">Baixar Excel</button><button class="btn" data-a="imp">Importar Excel</button><button class="btn" data-a="save" id="fcSaved" title="O caso também é salvo automaticamente">Salvar</button>'}<button class="btn" data-a="lobby">${st.done ? 'Sair do caso' : 'Salvar e sair'}</button></div><div class="fcw">${st.msg ? `<div class="fcmsg">${esc(st.msg)}</div>` : ''}
      <h3>Exercício sobre fluxo de caixa · tributação pelo Simples</h3><div class="box"><p>${esc(c.biz[1])}, depois da Pós-Graduação em Gestão, resolveram abrir uma <b>${esc(c.name)}</b> em ${esc(c.biz[2])}. Monte o fluxo de caixa do negócio considerando <b>vendas constantes durante os ${c.n} anos</b>. A empresa é tributada pelo Simples Nacional na alíquota de ${f2(c.aliq)}% sobre as vendas brutas.</p></div>
      <div class="fxhelp"><b>Fórmulas como no Excel.</b> Comece o campo com <code>=</code> e clique nos dados ou em outros campos para inserir a referência, por exemplo <code>=[Unidades]*[Preço]</code> ou <code>=[RECEITA BRUTA]*[Alíquota]/100</code>. Saídas de caixa podem ser digitadas com ou sem sinal de menos, exceto no fluxo do projeto, onde o Ano 0 é negativo. Enter confirma, Esc cancela. Prefere o Excel? Use “Baixar Excel”, preencha e volte com “Importar Excel”.</div>
      <div id="fcStm" class="g2e${st.pin ? ' pin' : ''}">${dados}${gastos}</div>
      <h3>1. Ano 0 · investimentos</h3>${tbl('pr', ['Discriminação', 'Ano 0'])}
      <h3>2. Resultado de cada ano · Anos 1 a ${c.n}</h3>${tbl('dre', ['Discriminação', 'Cada ano'])}
      <h3>3. Ajustes no último ano</h3>${tbl('aj', ['Discriminação', 'Ano ' + c.n])}
      <h3>4. Fluxo de caixa do projeto</h3><div class="fcgrid">${tbl('fl', ['Discriminação', ...yrs])}</div>
      <h3>5. Avaliação econômica · TMA de ${f2(c.tma)}% a.a.</h3>${tbl('av', ['Indicador', 'Valor'])}
      <h3>6. Parecer</h3><p>O negócio vale a pena para ${esc(c.biz[1])}? Em quanto tempo o investimento volta e qual é o risco de o retorno não se confirmar?</p><textarea id="fcTxt" placeholder="Escreva seu parecer. Ele não vale pontos; ao entregar, você compara com o parecer de referência."${st.done ? ' disabled' : ''}>${esc(st.txt || '')}</textarea>
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
  function onInput(e) { const t = e.target; if (t.id === 'fcType') { lastKind = t.value; const el = document.getElementById('fcSteps'); if (el && lobby.steps) el.innerHTML = lobby.steps(t.value); return; } if (!st) return; if (t.dataset && t.dataset.f) { if (t.readOnly) return; st.val[t.dataset.f] = t.value; t.classList.remove('no'); root().classList.toggle('fx', t.tagName === 'INPUT' && t.value.trim()[0] === '='); } else if (t.id === 'fcTxt') st.txt = t.value; else return; clearTimeout(onInput.t); onInput.t = setTimeout(() => saveOpen(), 600); }
  function onClick(e) {
    const q = e.target.closest('[data-q]'), b = e.target.closest('[data-a]'); closeTip();
    if (q && st) { const f = st.F.find((x) => x.id === q.dataset.q) ; st.F.filter((x) => x.row === f.row && x.sec === f.sec).forEach((x) => { if (!st.okSet[x.id]) st.hint[x.id] = 1; }); q.classList.add('used');
      const tip = document.createElement('div'); tip.className = 'fctip'; tip.innerHTML = `<b>Indica:</b> ${f.tip[0]}<br>${f.tip[1]}`; const w = root().querySelector('.fcw'); w.style.position = 'relative'; w.appendChild(tip);
      const wr = w.getBoundingClientRect(), z = w.offsetWidth ? wr.width / w.offsetWidth : 1, r = q.getBoundingClientRect(), qx = (r.left - wr.left) / z, qw = r.width / z, qb = (r.bottom - wr.top) / z;
      let left = qx + qw / 2 - 24; const maxL = w.offsetWidth - tip.offsetWidth - 4; if (left > maxL) left = Math.max(0, maxL); if (left < 0) left = 0;
      tip.style.left = left + 'px'; tip.style.top = (qb + 10) + 'px'; tip.style.setProperty('--ax', (qx + qw / 2 - left) + 'px'); saveOpen(); e.stopPropagation(); return; }
    if (!b) return; const a = b.dataset.a;
    if (a === 'exit') { if (st && !st.done) saveOpen(); clearInterval(tick); root().classList.remove('on'); if (onExit) onExit(); }
    else if (a === 'resume') { const o = loadOpen(); if (o) start(o.seed, o.hints, o, o.kind); }
    else if (a === 'pin') { st.pin = !st.pin; const el = document.getElementById('fcStm'); el.classList.toggle('pin', st.pin); b.textContent = st.kind === 'fc' ? (st.pin ? 'Soltar dados' : 'Fixar dados') : (st.pin ? 'Soltar balanço' : 'Fixar balanço'); }
    else if (a === 'xlsx') { exportXlsx(); }
    else if (a === 'imp') { pickXlsx(); }
    else if (a === 'discard') { saveOpen(true); lobby(); }
    else if (a === 'save') { saveOpen(); const el = document.getElementById('fcSaved'); if (el) el.textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    else if (a === 'start') start(Math.max(1, +document.getElementById('fcSeed').value || 1), document.getElementById('fcHints').value === '1', null, document.getElementById('fcType').value);
    else if (a === 'again') start(+b.dataset.seed, true, null, b.dataset.kind);
    else if (a === 'new') start(Math.floor(Math.random() * 9000) + 1000, st ? st.hints : true, null, st ? st.kind : lastKind);
    else if (a === 'lobby') { lobby(); }
    else if (a === 'check') { const y = root().scrollTop; st.msg = null; check(); draw(); root().scrollTop = y; saveOpen(); }
    else if (a === 'finish') { check(); st.done = true; st.t1 = Date.now(); clearInterval(tick); saveOpen(true); record({ at: Date.now(), seed: st.c.seed, kind: st.kind, type: st.kind === 'fc' ? 'VPL ' + (st.c.vpl > 0 ? 'positivo' : 'negativo') : st.c.b.type.n, ok: Object.keys(st.okSet).length, n: st.F.length, sec: Math.floor((st.t1 - st.t0) / 1000), score: Math.round(score() * 100) / 100 }); draw(); const r = root().querySelector('.res'); if (r) r.scrollIntoView({ block: 'center' }); }
  }
  // ---------- planilha Excel: baixar e importar ----------
  const XF = { cab: 'FFB7B7B7', th: 'FFBFBFBF', fcIn: 'FFD8D8D8', evIn: 'FFFFF2CC' };
  const NF = { st: '#,##0_ ;[Red]\\-#,##0 ', m: '#,##0_);[Red](#,##0)', m2: '#,##0.00_);[Red](#,##0.00)', p: '0.00%', rs: '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@', q: '#,##0', a: '0.00' };
  const TEFN = () => TYPES.map((t) => t.n);
  function curNum(f) { const raw = st.val[f.id]; if (raw == null || String(raw).trim() === '') return null; if (f.kind === 'sel') return (f.opts || TYPES.map((t) => [t.k, t.n])).find((o) => o[0] === raw)?.[1] || null; const v = evalRaw(raw); return v == null ? null : f.kind === 'p' ? v / 100 : v; }
  function sheetEVA(wb) {
    const { c } = st, { a, b, dre } = c, ws = wb.addWorksheet('VA', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } }), map = [];
    ws.columns = [3, 39.5, 12, 12, 39.5, 12, 12, 3.5, 38, 13, 12, 3].map((w) => ({ width: w }));
    const S = (addr, v, o) => { const x = ws.getCell(addr); x.value = v; o = o || {}; if (o.b) x.font = { name: 'Calibri', size: 11, bold: true }; if (o.nf) x.numFmt = o.nf; if (o.fill) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }; if (o.wrap) x.alignment = { wrapText: true, vertical: 'top' }; return x; };
    const IN = (addr, id, nf) => { const f = st.F.find((x) => x.id === id); const x = S(addr, f ? curNum(f) : null, { nf, b: 1, fill: XF.evIn }); x.border = { top: { style: 'thin', color: { argb: 'FFBF9000' } }, bottom: { style: 'thin', color: { argb: 'FFBF9000' } }, left: { style: 'thin', color: { argb: 'FFBF9000' } }, right: { style: 'thin', color: { argb: 'FFBF9000' } } }; if (f && f.kind === 'sel') x.dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + TEFN().join(',') + '"'] }; if (f) map.push([id, 'VA', addr, f.kind]); };
    const M = (r) => ws.mergeCells(r);
    [['B1', 'Pós-Graduação em Gestão'], ['B2', 'Casos de Finanças · Verificação de Aprendizagem'], ['B3', 'Caso ' + c.seed + ' · Modelo dinâmico, ciclo financeiro e EVA'], ['B4', 'VALOR TOTAL = 75 PONTOS']].forEach(([k, v], i) => { S(k, v, { b: 1 }); M(`B${i + 1}:K${i + 1}`); });
    S('B6', 'PARTICIPANTE:', { b: 1 }); S('C6', player, { b: 1 }); M('C6:K6');
    S('B8', 'ORIENTAÇÕES', { b: 1 }); M('B8:K8');
    S('B9', 'Preencha as células amarelas. Pode usar fórmulas do Excel; as células brancas ao lado são de apoio e não valem pontos.'); M('B9:K9');
    S('B10', 'Ao terminar, salve e importe esta planilha no app em Casos de Finanças → Importar Excel. Não mude a posição das células.'); M('B10:K10');
    S('B11', 'Apresente os indicadores com pelo menos duas casas decimais. Percentuais podem ser digitados como 9,5% ou 0,095.'); M('B11:K11');
    S('B13', 'QUESTÃO 01: (75 PONTOS) CONSIDERE OS DADOS ABAIXO PARA O DESENVOLVIMENTO DESTA VERIFICAÇÃO.', { b: 1 }); M('B13:K13');
    S('B15', `Dado Balanço e DRE abaixo, faça uma análise dos resultados apresentados nos exercícios de ${c.y1} e ${c.y0}, com base nos indicadores de NCG, ST, CDG e EVA.`, { b: 1, wrap: 1 }); M('B15:K15'); ws.getRow(15).height = 32;
    S('B17', `BALANÇO PATRIMONIAL ${c.name.toUpperCase()}  $`, { b: 1 }); M('B17:G17'); S('I17', `DRE ${c.name.toUpperCase()}  $`, { b: 1 }); M('I17:K17');
    [['B18', 'ATIVO'], ['C18', c.y1], ['D18', c.y0], ['E18', 'PASSIVO'], ['F18', c.y1], ['G18', c.y0], ['I18', 'DRE'], ['J18', c.y1]].forEach(([k, v]) => S(k, v, { b: 1, fill: XF.th }));
    const AT = [['Ativo Total', '=C20+C28', '=D20+D28', 1], ['Ativo Circulante', '=SUM(C21:C26)', '=SUM(D21:D26)'], ['Caixa e Equivalentes de Caixa', b.caixa, a.caixa], ['Aplicações Financeiras', b.aplic, a.aplic], ['Contas a Receber', b.cr, a.cr], ['Estoques', b.est, a.est], ['Tributos a Recuperar', b.trib, a.trib], ['Adiantamento a Fornecedores', b.adi, a.adi], null, ['Ativo Não Circulante', '=SUM(C29:C32)', '=SUM(D29:D32)'], ['Imobilizado Tangível', b.imob, a.imob], ['(-) Depreciação Acumulada', b.depAc, a.depAc], ['Imobilizado Intangível', b.intang, a.intang], ['(-) Amortização Acumulada', b.amAc, a.amAc]];
    const PA = [['Passivo Total', '=F20+F28+F30', '=G20+G28+G30', 1], ['Passivo Circulante', '=SUM(F21:F26)', '=SUM(G21:G26)'], ['Obrigações Sociais e Trabalhistas', b.os, a.os], ['Fornecedores', b.forn, a.forn], ['Obrigações Fiscais', b.of, a.of], ['Empréstimos e Financiamentos', b.empCP, a.empCP], ['Contas a pagar', b.cp, a.cp], ['Provisões Trabalhistas e Cíveis', b.prov, a.prov], null, ['Passivo Não Circulante', '=F29', '=G29'], ['Empréstimos e Financiamentos', b.empLP, a.empLP], ['Patrimônio Liquido', '=SUM(F31:F32)', '=SUM(G31:G32)'], ['Capital Social Realizado', b.capital, a.capital], ['Lucro / Prejuízos Acumulados', b.lucros, a.lucros]];
    const DR = [['Receita Bruta de Vendas', dre.rb], ['(-) Impostos incidentes sobre vendas', -dre.imp], ['Receita Líquida de Vendas', '=J19+J20'], ['Custos dos Produtos Vendidos', -dre.cpv], ['Lucro Bruto', '=J21+J22'], ['Despesas Administrativas', -dre.adm], ['Despesas Comerciais', -dre.com], ['EBITDA', '=J23+J24+J25'], ['Despesas c/ Depreciação/Amortização', -dre.dep], ['EBIT = Lucro Operacional', '=J26+J27'], ['Despesas Financeiras', -dre.fin], ['EBT = Lucro Antes do IR e CSLL', '=J28+J29'], ['IR e CSLL - 34%', '=J30*-0.34'], ['Lucro Líquido', '=J30+J31']];
    const val = (v) => typeof v === 'string' && v[0] === '=' ? { formula: v.slice(1) } : v;
    AT.forEach((r, i) => { if (!r) return; const n = 19 + i; S('B' + n, r[0], { b: r[3] }); S('C' + n, val(r[1]), { nf: NF.st, b: r[3] }); S('D' + n, val(r[2]), { nf: NF.st, b: r[3] }); });
    PA.forEach((r, i) => { if (!r) return; const n = 19 + i; S('E' + n, r[0], { b: r[3] }); S('F' + n, val(r[1]), { nf: NF.st, b: r[3] }); S('G' + n, val(r[2]), { nf: NF.st, b: r[3] }); });
    DR.forEach((r, i) => { const n = 19 + i; S('I' + n, r[0]); S('J' + n, val(r[1]), { nf: NF.st }); M(`J${n}:K${n}`); });
    S('B34', 'MODELO DINÂMICO', { b: 1 }); M('B34:K34'); S('B35', 'RECLASSIFICAÇÃO DO BALANÇO:', { b: 1 }); M('B35:G35');
    [['B36', 'ATIVO'], ['C36', c.y1], ['D36', c.y0], ['E36', 'PASSIVO'], ['F36', c.y1], ['G36', c.y0], ['I36', 'Indicadores Modelo Dinâmico'], ['J36', c.y1], ['K36', c.y0]].forEach(([k, v]) => S(k, v, { b: 1, fill: XF.th }));
    [['Ativo Circulante Errático', 'ace', 'Passivo Circulante Errático', 'pce', 'ST (ACE - PCE) =', 'st'], ['Ativo Circulante Cíclico', 'acc', 'Passivo Circulante Cíclico', 'pcc', 'NCG (ACC - PCC) =', 'ncg'], ['Ativo de Longo Prazo', 'alp', 'Passivo de Longo Prazo', 'plp', 'CDG (PÑC+PL) - AÑC =', 'cdg']].forEach((r, i) => { const n = 37 + i;
      S('B' + n, r[0]); IN('C' + n, r[1] + '1', NF.m); IN('D' + n, r[1] + '0', NF.m); S('E' + n, r[2]); IN('F' + n, r[3] + '1', NF.m); IN('G' + n, r[3] + '0', NF.m); S('I' + n, r[4]); IN('J' + n, r[5] + '1', NF.m); IN('K' + n, r[5] + '0', NF.m); });
    S('B40', 'TOTAL'); S('E40', 'TOTAL'); ['C', 'D', 'F', 'G'].forEach((k) => S(k + '40', { formula: `SUM(${k}37:${k}39)` }, { nf: NF.m, b: 1 }));
    S('I40', 'TEF (Escala de Fleuriet) ='); IN('J40', 'tef1'); IN('K40', 'tef0');
    S('B42', 'Relatório da análise de risco: com base nos indicadores, qual é o risco financeiro da empresa e para qual tipo de estrutura ela evoluiu ou regrediu?', { wrap: 1 }); M('B42:K42'); ws.getRow(42).height = 30;
    S('B43', st.txt ? String(st.txt).split('\n\n')[0] : null, { wrap: 1, fill: XF.evIn }); M('B43:K48'); map.push(['txt1', 'VA', 'B43', 'txt']);
    S('B50', 'CÁLCULO DO CICLO FINANCEIRO EM DIAS', { b: 1, fill: XF.th }); S('C50', c.y1, { b: 1, fill: XF.th }); S('E50', 'CÁLCULO DA NCG COM BASE NO CF', { b: 1, fill: XF.th }); S('F50', c.y1, { b: 1, fill: XF.th });
    [['PRAZO MÉDIO DE ESTOCAGEM (PME)', 'pme'], ['PRAZO MÉDIO DE RECEBIMENTO (PMR)', 'pmr'], ['PRAZO MÉDIO DE PAGAMENTO (PMP)', 'pmp'], ['CICLO FINANCEIRO = PME + PMR - PMP', 'cf']].forEach((r, i) => { S('B' + (51 + i), r[0]); IN('C' + (51 + i), r[1], NF.m2); S('D' + (51 + i), 'DIAS'); });
    S('E51', 'NECESSIDADE DE CAPITAL DE GIRO =>'); IN('F51', 'ncgcf', NF.m);
    S('E53', `Sabe-se que, para o exercício de ${c.y1 + 1}, a previsão de faturamento líquido da empresa é de $ ${f0(c.pb.rl2)}`); S('E54', `e que ela aceita investir no máximo $ ${f0(c.pb.cap)} na sua NCG.`);
    S('E55', 'Entretanto, a empresa está limitada em trabalhar os prazos médios de pagamento e recebimento,'); S('E56', 'restando apenas os estoques para que possa adequar a NCG às suas expectativas.'); S('E57', 'Diante destas premissas, qual seria o prazo médio de estocagem que a empresa pode admitir?');
    S('B56', 'Receita líquida prevista (' + (c.y1 + 1) + ')'); S('C56', c.pb.rl2, { nf: NF.m, b: 1 }); S('B57', 'Teto de investimento na NCG'); S('C57', c.pb.cap, { nf: NF.m, b: 1 });
    S('E59', 'NOVO CICLO FINANCEIRO EM DIAS', { b: 1, fill: XF.th }); S('F59', c.y1 + 1, { b: 1, fill: XF.th }); S('I59', 'COMPROVAÇÃO COM O NOVO CF', { b: 1, fill: XF.th }); S('J59', c.y1 + 1, { b: 1, fill: XF.th });
    S('E60', 'PRAZO MÉDIO DE ESTOCAGEM (PME)'); IN('F60', 'pme2', NF.m2); S('G60', 'DIAS'); S('I60', 'COMPROVAÇÃO NCG'); IN('J60', 'ncg2', NF.m);
    S('E61', 'PRAZO MÉDIO DE RECEBIMENTO (PMR)'); S('F61', { formula: 'C52' }, { nf: NF.m2 }); S('G61', 'DIAS'); S('E62', 'PRAZO MÉDIO DE PAGAMENTO (PMP)'); S('F62', { formula: 'C53' }, { nf: NF.m2 }); S('G62', 'DIAS'); S('I62', 'NCG = CF / 360 X RECEITA LÍQUIDA DE VENDAS');
    S('E63', 'CICLO FINANCEIRO = PME + PMR - PMP'); IN('F63', 'cf2', NF.m2); S('G63', 'DIAS');
    S('B68', 'AVALIAÇÃO DO EVA', { b: 1 }); M('B68:K68'); S('B69', 'EVA', { b: 1, fill: XF.th }); S('C69', c.y1, { b: 1, fill: XF.th });
    S('B70', 'Necessidade de Capital de Giro'); S('B71', 'Ativo Não Circulante (Longo Prazo)'); S('B72', 'Disponibilidades'); S('B73', 'Capital Empregado =>'); IN('C73', 'ce', NF.m); ['C70', 'C71', 'C72'].forEach((k) => S(k, null, { nf: NF.m }));
    S('B75', 'Custo do Capital de Terceiros', { b: 1 }); S('B76', 'Total do Capital Oneroso Investido'); IN('C76', 'ct', NF.m); S('B77', 'Despesas Financeiras do Período'); S('C77', { formula: 'J29' }, { nf: NF.m });
    S('B78', 'Taxa média do Período'); IN('C78', 'taxa', NF.p); S('B79', 'Taxa Líquida descontado o benefício do IR'); IN('C79', 'kd', NF.p);
    S('B81', 'NOPAT (Lucro Operacional deduzido do IR)'); IN('C81', 'nopat', NF.m); S('B82', 'ROCE - Return On Capital Employed'); IN('C82', 'roce', NF.p);
    S('B83', 'Custo do Capital Próprio', { b: 1 }); S('C83', c.ev.ke, { nf: NF.p, b: 1 });
    S('C85', c.y1, { b: 1 }); M('C85:E85'); [['B86', 'FONTES FINANCIADORAS'], ['C86', 'Estrut.'], ['D86', '% Part'], ['E86', 'Custo'], ['F86', 'WACC']].forEach(([k, v]) => S(k, v, { b: 1, fill: XF.th }));
    S('B87', 'CAPITAL DE TERCEIROS'); S('C87', { formula: 'C76' }, { nf: NF.m }); IN('D87', 'wt', NF.p); S('E87', { formula: 'C79' }, { nf: NF.p }); S('F87', null, { nf: NF.p });
    S('B88', 'CAPITAL PRÓPRIO'); S('C88', null, { nf: NF.m }); IN('D88', 'wp', NF.p); S('E88', { formula: 'C83' }, { nf: NF.p }); S('F88', null, { nf: NF.p });
    S('C89', { formula: 'SUM(C87:C88)' }, { nf: NF.m }); S('E89', 'WACC:', { b: 1 }); IN('F89', 'wacc', NF.p);
    S('I69', 'EVA 1', { b: 1, fill: XF.th }); S('J69', c.y1, { b: 1, fill: XF.th }); S('I70', '=> (ROCE - WACC) x Capital Empregado'); S('I71', 'ROCE - WACC ='); S('J71', null, { nf: NF.p }); S('I72', 'Capital Empregado ='); S('J72', null, { nf: NF.m }); S('I73', '=> EVA 1'); IN('J73', 'eva1', NF.m);
    S('I76', 'EVA 2', { b: 1, fill: XF.th }); S('J76', c.y1, { b: 1, fill: XF.th }); S('I77', '=> NOPAT - (Capital Empregado x WACC)'); S('I78', 'NOPAT'); S('I79', 'Capital Empregado X WACC'); S('I80', '=> EVA 2'); IN('J80', 'eva2', NF.m);
    S('I83', 'EVA 3', { b: 1, fill: XF.th }); S('J83', c.y1, { b: 1, fill: XF.th }); S('I84', 'NOPAT =>'); S('I85', '(-) Custo do Capital de Terceiros'); S('I86', '(-) Custo do Capital Próprio'); S('I87', '=> EVA 3'); IN('J87', 'eva3', NF.m);
    S('I90', 'EVA 4', { b: 1, fill: XF.th }); S('J90', c.y1, { b: 1, fill: XF.th }); S('I91', 'NOPAT =>'); S('I92', '(-) Custo do Capital de Terceiros'); S('I93', 'Lucro Líquido'); S('I94', 'ROE'); IN('J94', 'roe', NF.p); S('I95', '% Custo do Capital Próprio desejado'); S('I96', 'ROE - %Custo Capital Próprio (Ke) ='); S('I97', 'Cap. Próprio Empregado nas Operac.'); S('I98', '=> EVA 4'); IN('J98', 'eva4', NF.m);
    ['J78', 'J79', 'J84', 'J85', 'J86', 'J91', 'J92', 'J93', 'J97'].forEach((k) => S(k, null, { nf: NF.m })); ['J95', 'J96'].forEach((k) => S(k, null, { nf: NF.p }));
    S('B100', 'Com base nas premissas apresentadas acima, a empresa gerou valor para os acionistas? Por quê? Você investiria nela?', { b: 1, wrap: 1 }); M('B100:K100'); ws.getRow(100).height = 30;
    S('B101', st.txt && String(st.txt).includes('\n\n') ? String(st.txt).split('\n\n').slice(1).join('\n\n') : null, { wrap: 1, fill: XF.evIn }); M('B101:K106'); map.push(['txt2', 'VA', 'B101', 'txt']);
    return map;
  }
  function sheetFC(wb) {
    const { c } = st, n = c.n, ws = wb.addWorksheet('Fluxo de Caixa', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } }), map = [], col = (t) => String.fromCharCode(68 + t), last = col(n);
    ws.columns = [34, 13, 15].concat(Array.from({ length: n + 1 }, () => 16)).map((w) => ({ width: w }));
    const S = (addr, v, o) => { const x = ws.getCell(addr); x.value = v; o = o || {}; if (o.b) x.font = { name: 'Calibri', size: 11, bold: true }; if (o.nf) x.numFmt = o.nf; if (o.fill) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }; if (o.wrap) x.alignment = { wrapText: true, vertical: 'top' }; if (o.c) x.alignment = { horizontal: 'center', vertical: 'middle' }; return x; };
    const IN = (addr, id, nf, fill) => { const f = st.F.find((x) => x.id === id); const x = S(addr, f ? curNum(f) : null, { nf, fill: fill || XF.fcIn, b: fill === XF.th }); if (f && f.kind === 'sel') x.dataValidation = { type: 'list', allowBlank: true, formulae: ['"' + f.opts.map((o) => o[1]).join(',') + '"'] }; if (f) map.push([id, 'Fluxo de Caixa', addr, f.kind]); return x; };
    const M = (r) => ws.mergeCells(r);
    [['Pós-graduação em Gestão de Negócios'], ['Análise Econômica de Investimentos'], ['Caso ' + c.seed + ' · Exemplo de Fluxo de Caixa e Simples Nacional · Participante: ' + player]].forEach((r, i) => { S('A' + (i + 1), r[0], { b: 1, fill: XF.cab, c: 1 }); M(`A${i + 1}:${last}${i + 1}`); });
    S('A5', `Projeto ${c.name} - Avaliação Econômica - Simples Nacional`, { b: 1, fill: XF.cab, c: 1 }); M(`A5:${last}5`);
    S('A6', 'Discriminação', { b: 1, fill: XF.th, c: 1 }); M('A6:A7'); S('B6', 'Quantidade', { b: 1, fill: XF.th, c: 1 }); M('B6:B7'); S('C6', 'Informações', { b: 1, fill: XF.th, c: 1 }); M('C6:C7');
    S('D6', 'Ano', { fill: XF.th, c: 1 }); M(`D6:${last}6`); for (let t = 0; t <= n; t++) S(col(t) + '7', t, { b: 1, fill: XF.th, c: 1 });
    const rows = [[8, 'Investimento'], [9, 'Capital de Giro'], [10, 'Receita Bruta', 'rb'], [11, 'Imposto Simples', 'imp'], [12, 'Receita Liquida', 'rl'], [13, 'Gastos Variaveis', 'gv'], [14, 'Gastos Fixos (mensais/anuais)', 'gf'], [15, 'Lucro Operacional', 'lo'], [16, 'Lucro Líquido', 'll']];
    rows.forEach(([r, lab, id]) => { S('A' + r, lab); if (!id) return; IN('E' + r, id, NF.rs); for (let t = 2; t <= n; t++) S(col(t) + r, null, { nf: NF.rs, fill: XF.fcIn }); });
    IN('D8', 'inv', NF.rs); IN('D9', 'cg', NF.rs);
    S('B10', c.q, { nf: NF.q }); S('C10', c.p, { nf: NF.rs }); S('C11', c.aliq / 100, { nf: '0.0%' }); S('C13', c.cv, { nf: NF.rs }); S('B14', 12); S('C14', null, { nf: NF.rs, fill: XF.fcIn });
    S('A17', 'Ajustes'); S('A18', 'Valor Residual'); IN(last + '18', 'vr', NF.rs); S('A19', 'Recuperação do Capital de Giro'); IN(last + '19', 'rcg', NF.rs);
    S('A20', 'Fluxo de Caixa do Projeto', { b: 1, fill: XF.th }); ['B20', 'C20'].forEach((k) => S(k, null, { fill: XF.th })); for (let t = 0; t <= n; t++) IN(col(t) + '20', 'fc' + t, NF.rs, XF.th);
    S('A22', 'Avaliação Econômica', { b: 1, fill: XF.cab, c: 1 }); M(`A22:${last}22`);
    S('A23', 'TMA (remuneração mínima exigida)'); S('C23', c.tma / 100, { nf: '0.00%', b: 1 });
    [['VPL à TMA', 'vpl', NF.rs], ['TIR', 'tir', NF.p], ['Payback simples (anos)', 'pbs', NF.a], ['Payback descontado (anos)', 'pbd', NF.a], ['Índice de Lucratividade', 'il', NF.a], ['Decisão (Viável / Inviável)', 'dec']].forEach(([lab, id, nf], i) => { const r = 24 + i; S('A' + r, lab);
      if (id === 'pbd' && c.pbd == null) { S('D' + r, 'O investimento não se paga dentro do horizonte quando descontado pela TMA (campo sem nota).', { wrap: 0 }); return; } IN('D' + r, id, nf); });
    S('A31', 'Dados levantados', { b: 1, fill: XF.cab, c: 1 }); M(`A31:${last}31`);
    S('A32', `${c.biz[1]}, depois da Pós-Graduação em Gestão, resolveram abrir uma ${c.name} em ${c.biz[2]}. Monte o fluxo de caixa do negócio considerando vendas constantes durante os ${n} anos. A empresa é tributada pelo Simples Nacional na alíquota de ${f2(c.aliq)}% sobre as vendas brutas.`, { wrap: 1 }); M(`A32:${last}32`); ws.getRow(32).height = 46;
    [['Investimento na montagem da loja', c.inv, NF.rs], ['Capital de Giro (estoques e vendas a prazo)', c.cg, NF.rs], ['Faturamento (unidades por ano)', c.q, NF.q], ['Preço de venda médio (por unidade)', c.p, NF.rs], ['Custo médio dos produtos (por unidade)', c.cv, NF.rs], ['Aluguel (por mês)', c.al, NF.rs], ['Funcionários (por mês)', c.fu, NF.rs], ['Outras despesas (contabilidade, propaganda, telefone, energia) por mês', c.ou, NF.rs], ['Pró-labore (por mês)', c.pl, NF.rs], ['Alíquota do Simples Nacional sobre as vendas brutas', c.aliq / 100, '0.0%'], ['Remuneração mínima exigida (TMA)', c.tma / 100, '0.00%'], ['Valor residual dos ativos no Ano ' + n, c.vr, NF.rs], ['Horizonte de análise (anos)', n, '0']].forEach(([lab, v, nf], i) => { S('A' + (33 + i), lab); S('C' + (33 + i), v, { nf, b: 1 }); });
    S('A47', 'Células cinza: preencha (pode usar fórmulas). Ao terminar, salve e importe no app em Casos de Finanças → Importar Excel.', { wrap: 0 });
    S('A49', 'Parecer: o negócio vale a pena? Em quanto tempo o investimento volta e qual é o risco de o retorno não se confirmar?', { b: 1, fill: XF.cab }); M(`A49:${last}49`);
    S('A50', st.txt || null, { wrap: 1, fill: XF.fcIn }); M(`A50:${last}55`); map.push(['txt', 'Fluxo de Caixa', 'A50', 'txt']);
    return map;
  }
  function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function saveBytes(name, buf) {
    const nat = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.sim);
    if (nat) { if (window.__NATIVE_SAVEFILE) window.webkit.messageHandlers.sim.postMessage('savefile:' + name + '|' + b64(buf)); else alert('Para salvar a planilha pela janela nativa, recompile o app uma vez: dê dois cliques em "Compilar app nativo.command" e abra o app de novo.'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  async function exportXlsx() {
    if (!window.ExcelJS) { alert('A biblioteca de Excel não carregou.'); return; }
    const wb = new ExcelJS.Workbook(); wb.creator = 'Simulador Empresarial'; wb.created = new Date();
    const map = st.kind === 'fc' ? sheetFC(wb) : sheetEVA(wb), ctl = wb.addWorksheet('_controle'); ctl.state = 'veryHidden';
    ctl.addRow(['simfin', 1]); ctl.addRow(['kind', st.kind]); ctl.addRow(['seed', st.c.seed]); ctl.addRow(['player', player]); map.forEach((r) => ctl.addRow(['f'].concat(r)));
    const buf = await wb.xlsx.writeBuffer(), nm = `Caso_${st.c.seed}_${st.kind === 'fc' ? 'Fluxo_de_Caixa' : 'Modelo_Dinamico_EVA'}_${String(player).replace(/[^\wÀ-ú-]+/g, '_')}.xlsx`;
    saveOpen(); saveBytes(nm, buf);
  }
  function cellVal(v) { if (v == null) return null; if (typeof v === 'object') { if (v instanceof Date) return null; if ('result' in v) return v.result == null || typeof v.result === 'object' ? null : v.result; if ('formula' in v || 'sharedFormula' in v) return undefined; if (v.richText) return v.richText.map((x) => x.text).join(''); if (v.text) return v.text; return null; } return v; }
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  async function importXlsx(file) {
    if (!window.ExcelJS) { alert('A biblioteca de Excel não carregou.'); return; }
    const wb = new ExcelJS.Workbook(); try { await wb.xlsx.load(await file.arrayBuffer()); } catch (e) { alert('Não consegui ler este arquivo. Salve como Pasta de Trabalho do Excel (.xlsx) e tente de novo.'); return; }
    const ctl = wb.getWorksheet('_controle'); if (!ctl) { alert('Esta planilha não foi baixada pelo app: falta a aba de controle. Baixe a planilha do caso pelo botão "Baixar Excel".'); return; }
    let kind = 'eva', seed = 0; const map = [];
    ctl.eachRow((r) => { const v = r.values; if (v[1] === 'kind') kind = v[2]; else if (v[1] === 'seed') seed = +v[2]; else if (v[1] === 'f') map.push({ id: v[2], sh: v[3], addr: v[4], kind: v[5] }); });
    if (!seed) { alert('A aba de controle desta planilha está incompleta.'); return; }
    const same = st && !st.done && st.kind === kind && st.c.seed === seed;
    if (!same) { if (st && !st.done && !confirm(`A planilha é do caso ${seed}. Abrir esse caso no lugar do caso ${st.c.seed}, que está em andamento?`)) return; start(seed, st ? st.hints : true, loadOpen() && loadOpen().seed === seed && (loadOpen().kind || 'eva') === kind ? loadOpen() : null, kind); }
    let got = 0, empty = 0, noCalc = 0; const txt = {};
    for (const m of map) { const ws = wb.getWorksheet(m.sh); if (!ws) continue; const raw = cellVal(ws.getCell(m.addr).value);
      if (m.kind === 'txt') { if (raw != null && String(raw).trim()) txt[m.id] = String(raw).trim(); continue; }
      const f = st.F.find((x) => x.id === m.id); if (!f) continue; if (st.okSet[f.id]) continue;
      if (raw === undefined) { noCalc++; continue; } if (raw == null || String(raw).trim() === '') { empty++; continue; }
      let s = null;
      if (f.kind === 'sel') { const opts = f.opts || TYPES.map((t) => [t.k, t.n]), w = fold(raw), o = opts.find((x) => w === fold(x[1])) || opts.find((x) => w.includes(fold(x[1]))); s = o ? o[0] : null; }
      else { let v = typeof raw === 'number' ? raw : parseNum(raw); if (v == null) continue; if (f.kind === 'p' && typeof raw === 'number') v *= 100; s = String(Math.round(v * 1e6) / 1e6).replace('.', ','); }
      if (s == null) continue; st.val[f.id] = s; got++; }
    const t = kind === 'fc' ? txt.txt : [txt.txt1, txt.txt2].filter(Boolean).join('\n\n'); if (t) st.txt = t;
    st.msg = `Importei ${got} ${got === 1 ? 'valor' : 'valores'} do Excel${empty ? `; ${empty} ${empty === 1 ? 'célula estava vazia' : 'células estavam vazias'}` : ''}${noCalc ? `; ${noCalc} ${noCalc === 1 ? 'fórmula veio' : 'fórmulas vieram'} sem resultado calculado (abra e salve a planilha no Excel antes de importar)` : ''}. Clique em “Conferir preenchidos” para corrigir.`;
    draw(); root().scrollTop = 0; saveOpen();
  }
  function pickXlsx() { let i = document.getElementById('fcFile'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'fcFile'; i.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; i.style.display = 'none'; i.addEventListener('change', () => { const f = i.files && i.files[0]; i.value = ''; if (f) importXlsx(f); }); document.body.appendChild(i); } i.click(); }

  let onExit = null, lastKind = 'eva';
  window.FinCases = { open(p, store, o) { player = p || 'Jogador'; io = store || null; st = null; o = o || {}; onExit = o.onExit || null; const op = o.resume && loadOpen(); if (op) start(op.seed, op.hints, op, op.kind); else if (o.seed) start(o.seed, true, null, o.kind); else lobby(); root().classList.add('on'); }, generate, fields, generateFC, fieldsFC, right, TYPES };
})();
