const XLSX=require('xlsx'), E=require('./engine.js');
const D="/mnt/user-data/uploads/Simulador Empresarial /dados-simulweb/";
function rawload(p){const wb=XLSX.readFile(D+`22188_p${p}_real_e2_TODOS.xls`);const o={};for(const n of wb.SheetNames)o[n]=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}).map(r=>r.map(c=>String(c)));return o;}
const data=[];
for (const p of [1,2,3,4,5]) { const prev=rawload(p-1), cur=rawload(p); const st=E.importExport(prev).state; const ic=E.importExport(cur); const dec=E.parseDecisions(cur['Decisões']); dec.scenario=ic.rivals; data.push({p,st,dec,real:ic.market}); }
function evalP(P, verbose){ let se=0, seS=0, n=0;
 for (const x of data){ const sat=E.satisfaction(x.dec,x.st.lastRH,P); const dm=E.demand(x.st,x.dec,P,sat);
  for (const j of ['P','W']){ const M=dm[j].regions.reduce((a,r)=>a+r.market,0), R=x.real[j].demand.reduce((a,b)=>a+b);
   const own=dm[j].regions.reduce((a,r)=>a+r.demand,0);
   se+=Math.log(M/R)**2; n++;
   if(verbose) console.log('P'+x.p,j,'mercado modelo',Math.round(M),'real',R,((M/R-1)*100).toFixed(1)+'%');
 }} return Math.sqrt(se/n); }
let P=E.clone(E.PARAMS); console.log('rmse atual',evalP(P,true).toFixed(3));
let best=[1e9];
for (let a=0;a<=1.6;a+=0.05) for (let b=0;b<=2.0;b+=0.1) { P.market={ads:a,price:b}; const e=evalP(P); if(e<best[0]) best=[e,a,b]; }
console.log('melhor',best);
// season damping: M = M0*(season)^k
best=[1e9];
for (let k=0;k<=1.01;k+=0.1) for (let a=0;a<=1.6;a+=0.05) for (let b=0;b<=2.0;b+=0.1) { P.market={ads:a,price:b,season:k}; const e=evalP(P); if(e<best[0]) best=[e,a,b,k]; }
console.log('com sazonalidade',best); P.market={ads:best[1],price:best[2],season:best[3]}; evalP(P,true);
