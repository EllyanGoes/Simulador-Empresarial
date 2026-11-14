const XLSX=require('xlsx'), E=require('./engine.js');
const D="/mnt/user-data/uploads/Simulador Empresarial /dados-simulweb/";
function rawload(p){const wb=XLSX.readFile(D+`22188_p${p}_real_e2_TODOS.xls`);const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(c=>String(c)));return o;}
let errs={P:[],W:[]};
for (const p of [1,2,3,4,5]) {
  const prev=rawload(p-1), cur=rawload(p);
  const st=E.importExport(prev).state; const impc=E.importExport(cur);
  const dec=E.parseDecisions(cur['Decisões']); dec.scenario=impc.rivals;
  // satisfaction actual for this period (use model)
  const sat=E.satisfaction(dec, st.lastRH, E.PARAMS);
  const dm=E.demand(st,dec,E.PARAMS,sat);
  const v=cur['Vendas']; const real={}; let prod=null;
  for(const r of v){ if(r[0]==='Smartphone')prod='P'; if(r[0]==='Smartwatch')prod='W'; if(String(r[0]).startsWith('Demanda')&&prod) real[prod]=r.slice(1,6).map(Number);}
  for (const j of ['P','W']) {
    const m=dm[j].regions.map(x=>Math.round(x.demand)); const tm=m.reduce((a,b)=>a+b), tr=real[j].reduce((a,b)=>a+b);
    errs[j].push(Math.abs(tm/tr-1));
    console.log(`P${p} ${j} modelo ${m.join(' ')} = ${tm} | real ${real[j].join(' ')} = ${tr} | erro total ${((tm/tr-1)*100).toFixed(1)}%  sat ${sat.toFixed(3)}`);
  }
}
for (const j of ['P','W']) console.log(j,'erro médio total', (errs[j].reduce((a,b)=>a+b)/errs[j].length*100).toFixed(1)+'%');
