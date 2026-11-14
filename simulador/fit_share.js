const XLSX=require('xlsx'), E=require('./engine.js');
const D="/mnt/user-data/uploads/Simulador Empresarial /dados-simulweb/";
function rawload(p){const wb=XLSX.readFile(D+`22188_p${p}_real_e2_TODOS.xls`);const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(c=>String(c)));return o;}
const data=[];
for (const p of [1,2,3,4,5]) { const prev=rawload(p-1), cur=rawload(p); const st=E.importExport(prev).state; const ic=E.importExport(cur); const dec=E.parseDecisions(cur['Decisões']); dec.scenario=ic.rivals;
  const v=cur['Vendas']; const real={}; let prod=null; for(const r of v){ if(r[0]==='Smartphone')prod='P'; if(r[0]==='Smartwatch')prod='W'; if(String(r[0]).startsWith('Demanda')&&prod) real[prod]=r.slice(1,6).map(Number);}
  // satisfação real do relatório
  const satReal=Number((cur['Mercado da Mão de Obra Direta'].find(r=>r[0]==='Enividia')||[])[1]);
  data.push({p,st,dec,real,satReal}); }
function err(P,j,verbose){ let se=0,n=0,tot=0;
  for (const x of data){ const dm=E.demand(x.st,x.dec,P,x.satReal); const regs=dm[j].regions;
    regs.forEach((r,i)=>{ se+=Math.log(r.demand/x.real[j][i])**2; n++; });
    const tm=regs.reduce((a,r)=>a+r.demand,0), tr=x.real[j].reduce((a,b)=>a+b); tot+=Math.abs(tm/tr-1);
    if(verbose) console.log(' P'+x.p,j,regs.map(r=>Math.round(r.demand)).join(' '),'| real',x.real[j].join(' '),'| total',((tm/tr-1)*100).toFixed(1)+'%');
  } return [Math.sqrt(se/n), tot/data.length]; }
const P=E.clone(E.PARAMS);
const keys=['price','ads','term','di','sat','inc','local','ext'];
for (const j of ['P','W']) {
  console.log(j,'antes',err(P,j).map(x=>x.toFixed(3)));
  for (let it=0;it<6;it++) for (const k of keys) {
    let bestV=P.share[j][k], bestE=err(P,j)[0];
    for (const dv of [-0.4,-0.2,-0.1,-0.05,0.05,0.1,0.2,0.4]) { const old=P.share[j][k]; let nv=old+dv;
      if(['price','ads','di','term'].includes(k)&&nv<0) continue; if(k==='inc'&&nv<0) continue; if(k==='sat'&&nv<0) continue;
      P.share[j][k]=nv; const e=err(P,j)[0]; if(e<bestE-1e-6){bestE=e;bestV=nv;} P.share[j][k]=old; }
    P.share[j][k]=+bestV.toFixed(3);
  }
  console.log(j,'depois',err(P,j).map(x=>x.toFixed(3)), JSON.stringify(P.share[j])); err(P,j,true);
}
