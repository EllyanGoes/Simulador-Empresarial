const XLSX=require('xlsx'), E=require('./engine.js');
const D="/mnt/user-data/uploads/Simulador Empresarial /dados-simulweb/";
function load(p){const wb=XLSX.readFile(D+`22188_p${p}_real_e2_TODOS.xls`);const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}).map(r=>r.map(c=>String(c)));return o;}
function rawload(p){const wb=XLSX.readFile(D+`22188_p${p}_real_e2_TODOS.xls`);const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(c=>String(c)));return o;}
const f=(x)=>Math.round(x).toLocaleString('pt-BR');
for (const p of [1,2,3,4,5]) {
  const prev=rawload(p-1), cur=rawload(p);
  const imp=E.importExport(prev);
  const st=imp.state;
  const bs0=E.balanceSheet(st, st.period);
  const dec=E.parseDecisions(cur['Decisões']);
  const mk=E.parseMarket(cur['Market Share']);
  // own demand from Vendas
  const v=cur['Vendas']; const dm={}; let prod=null;
  for(const r of v){ if(r[0]==='Smartphone')prod='P'; if(r[0]==='Smartwatch')prod='W'; if(String(r[0]).startsWith('Demanda')&&prod) dm[prod]=r.slice(1,6).map(Number);}
  dec.scenario=E.importExport(cur).rivals; // rivals of this period (for demand-model test)
  const P=E.clone(E.PARAMS); if(p<3){P.salesTax={local:{icms:.17,ipi:.10},comp:{icms:.12,ipi:.10},ext:{icms:0,ipi:.07}};P.adCost=2500;} const out=E.simulate(st,dec,P,{demand:dm});
  const R=out.report;
  // real numbers
  const dre=cur['Demonstração do Resultado']; const g=(rows,l)=>{const r=rows.find(x=>String(x[0]).trim()===l);return r?Number(r[3]||r[1]):NaN};
  const bp=cur['Balanço Patrimonial']; const gb=(l)=>{const r=bp.find(x=>String(x[0]).trim()===l);return r?Number(r[1]):NaN};
  const cx=cur['Caixa']; const gc=(l)=>{const r=cx.find(x=>String(x[0]).trim()===l);return r?Number(r[1]):NaN};
  console.log(`\n=== P${p}  (balanço importado P${p-1}: dif ${f(bs0.diferenca)})`);
  const rows=[['Receita bruta',R.dre.receitaBruta,g(dre,'Receita Bruta de Vendas')],['CPV',-R.dre.cpv,g(dre,'Custo dos Produtos Vendidos')],
   ['Desp. comerciais',-R.dre.despComerciais,g(dre,'Comerciais')],['Desp. adm',-R.dre.despAdministrativas,g(dre,'Administrativas')],
   ['Desp. financeiras',-R.dre.despesasFinanceiras,g(dre,'Despesas Financeiras')],['Lucro antes trib.',R.dre.lair,Number((dre.find(x=>String(x[0]).includes('Antes dos Tributos'))||[])[3])],
   ['Lucro líquido',R.dre.lucroLiquido,Number((dre.find(x=>String(x[0]).includes('Resultado Líquido do Período'))||[])[3])],
   ['Caixa final',R.cashflow.final,gc('Caixa Final (Inicial + Entradas - Saídas)')],['Esp.',R.cashflow.especial,NaN],['Ativo total',R.balance.ativoTotal,gb('ATIVO TOTAL')],
   ['PL',R.balance.pl,gb('Patrimônio Líquido')],['RAA %',R.kpi.raa*100,gb('Rentabilidade do Ativo Acumulado (%)')]];
  for(const [l,a,b] of rows) console.log(l.padEnd(18), f(a).padStart(14), isNaN(b)?'':f(b).padStart(14), isNaN(b)||!b?'':((a/b-1)*100).toFixed(1)+'%');
  console.log('prod',R.production.prod,'dif BS',f(R.balance.diferenca),'warn',R.warnings.join(' | '));
}
