'use strict';
/* Habicht Private Bank – Bankchef-Modus (Spielgeld). 1 Bankmonat = 1 Tag. */
const FN=['Anna','Ben','Clara','David','Emma','Felix','Greta','Hannes','Ida','Jonas','Klara','Leon','Mia','Noah','Olga','Paul','Rita','Sven','Tina','Uwe','Vera','Willi','Xenia','Yannik','Zoe','Lukas','Sophie','Tim','Nele','Jan','Lotte','Moritz','Pia','Rolf','Susi'];
const LN=['Müller','Schmidt','Habermann','Bergmann','Fuchs','Weber','Wagner','Becker','Hoffmann','Koch','Richter','Klein','Wolf','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hartmann','Lange','Vogel','Falke','Adler','Bussard'];
const JOBS=['Bäcker','Lehrerin','Programmierer','Taxifahrer','Ärztin','Gärtner','Influencerin','Koch','Pilot','Tierarzt','Schreiner','Streamer','Bauer','Anwältin','Mechaniker','Friseurin','Imker','DJ','Kapitän','Detektiv','Eisverkäufer','Zauberer'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const BDAYS_MAX=60, BRES=0.1;
function bGauss(){return Math.sqrt(-2*Math.log(Math.random()||1e-9))*Math.cos(2*Math.PI*Math.random())}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function newCust(B){
  const sc=clamp(Math.round(560+bGauss()*105),300,850),inc=Math.round((1500+Math.pow(Math.random(),1.6)*8500)/10)*10;
  let n;for(let i=0;i<20;i++){n=pick(FN)+' '+pick(LN);if(!B.cust.some(c=>c.n===n))break}
  return {id:rid(),n,job:pick(JOBS),sc,inc,dep:Math.round(inc*(0.4+Math.random()*3.5)),st:'ok',rec:0}
}
function initBank(){
  const B={eq0:150000,cash:0,cust:[],loans:[],req:[],rLoan:6,rDep:1,feeAcc:1.5,feeLoan:1,last:dkey(new Date()),day:0,paid:0,
    cum:{intI:0,fee:0,intE:0,loss:0,cost:0},pend:0,days:[],eqh:[],cnt:{granted:0,repaid:0,def:0}};
  for(let i=0;i<10;i++)B.cust.push(newCust(B));
  B.cash=r2(B.eq0+B.cust.reduce((x,c)=>x+c.dep,0));
  genReq(B,1);genReq(B,1);B.eqh.push(bEq(B));
  return B}
function fixBank(B){
  B=B||{};const d=initBank();for(const k in d)if(B[k]===undefined)B[k]=d[k];
  B.cnt=Object.assign({granted:0,repaid:0,def:0},B.cnt);B.cum=Object.assign({intI:0,fee:0,intE:0,loss:0,cost:0},B.cum);return B}
const bDeps=B=>B.cust.reduce((x,c)=>x+c.dep,0);
const bLoans=B=>B.loans.reduce((x,l)=>l.st==='act'?x+l.bal:x,0);
const bEq=B=>r2(B.cash+bLoans(B)-bDeps(B));
const bAvail=B=>Math.max(0,Math.min(bEq(B)-B.eq0,B.cash-BRES*bDeps(B)));
const bProfit=B=>r2(bEq(B)-B.eq0+B.paid);
function annuity(P,r,n){const m=r/1200;return r2(m>0?P*m/(1-Math.pow(1+m,-n)):P/n)}
const custOf=id=>S.bank.cust.find(c=>c.id===id);
const actPay=(B,c)=>B.loans.reduce((x,l)=>l.cid===c.id&&l.st==='act'?x+l.pay:x,0);
function pdMonth(B,c,extraPay){const pdA=0.02+(850-c.sc)/550*0.28,dti=(actPay(B,c)+(extraPay||0))/c.inc;return clamp(pdA*(1+Math.max(0,dti-0.4)*3)/12,0,0.6)}
const pdTerm=(B,c,n,pay)=>1-Math.pow(1-pdMonth(B,c,pay),n);
const suggRate=(B,c)=>r2(B.rLoan+Math.max(0,(720-c.sc)/100)*2);
function genReq(B,force){
  if(B.req.length>=8)return;
  const p=clamp(0.9-(B.rLoan-6)*0.07,0.1,0.95);if(!force&&Math.random()>p)return;
  const cs=B.cust.filter(c=>c.st==='ok'&&!B.req.some(r=>r.cid===c.id)&&B.loans.filter(l=>l.cid===c.id&&l.st==='act').length<2);if(!cs.length)return;
  const c=pick(cs),amt=clamp(Math.round(c.inc*(2+Math.random()*10)/100)*100,500,60000);
  B.req.push({id:rid(),cid:c.id,amt,n:pick([6,12,12,18,24]),maxR:r2(4+Math.random()*11),d:B.day})}

function bankDay(B,msgs,dayKey){
  B.day++;const d={k:dayKey,intI:0,fee:r2(B.pend||0),intE:0,loss:0,cost:0};B.pend=0;
  B.cust.forEach(c=>{
    if(c.st==='pleite'){c.rec--;if(c.rec<=0){c.st='ok';c.sc=Math.max(c.sc,430)}}
    const ie=r2(c.dep*B.rDep/1200);c.dep=r2(c.dep+ie);d.intE+=ie;
    if(B.feeAcc>0&&c.dep>=B.feeAcc){c.dep=r2(c.dep-B.feeAcc);d.fee+=B.feeAcc}
    let fl=r2(c.dep*(bGauss()*0.02+(B.rDep-1)*0.002)+c.inc*0.04*(Math.random()-0.35));
    if(c.dep+fl<0)fl=-c.dep;if(B.cash+fl<0)fl=-B.cash;c.dep=r2(c.dep+fl);B.cash=r2(B.cash+fl)});
  B.loans.filter(l=>l.st==='act').forEach(l=>{
    const c=custOf(l.cid);if(!c){l.st='done';return}
    if(c.st==='pleite'||Math.random()<pdMonth(B,c)){
      const rec=r2(l.bal*0.2),loss=r2(l.bal-rec);B.cash=r2(B.cash+rec);d.loss=r2(d.loss+loss);l.st='def';l.lost=loss;l.bal=0;
      if(c.st!=='pleite'){c.st='pleite';c.rec=6;c.sc=Math.max(300,c.sc-120)}B.cnt.def++;
      msgs.push('⚠️ Kreditausfall: '+esc(c.n)+' zahlt nicht mehr – Verlust '+f(loss));return}
    const i=r2(l.bal*l.r/1200);l.m++;let pay=l.pay;if(l.m>=l.n||pay>l.bal+i)pay=r2(l.bal+i);
    l.bal=r2(l.bal-(pay-i));B.cash=r2(B.cash+pay);d.intI=r2(d.intI+i);c.sc=Math.min(850,c.sc+2);
    if(l.m>=l.n||l.bal<=0.005){l.st='done';l.bal=0;B.cnt.repaid++;msgs.push('✅ Kredit von '+esc(c.n)+' vollständig zurückgezahlt')}});
  {const ci=r2(Math.max(0,B.cash)*1/1200);B.cash=r2(B.cash+ci);d.intI=r2(d.intI+ci)}
  const cost=Math.min(30,Math.max(0,B.cash));B.cash=r2(B.cash-cost);d.cost=cost;
  if(B.cust.length<40&&Math.random()<clamp(0.2+(B.rDep-1)*0.05-(B.feeAcc-1.5)*0.03,0.02,0.6)){const nc=newCust(B);B.cust.push(nc);B.cash=r2(B.cash+nc.dep)}
  B.req=B.req.filter(r=>B.day-r.d<=5&&custOf(r.cid));genReq(B);if(Math.random()<0.3)genReq(B);
  ['intI','fee','intE','loss','cost'].forEach(k=>{d[k]=r2(d[k]);B.cum[k]=r2(B.cum[k]+d[k])});
  d.net=r2(d.intI+d.fee-d.intE-d.loss-d.cost);B.days.push(d);if(B.days.length>40)B.days.shift();
  B.eqh.push(bEq(B));if(B.eqh.length>60)B.eqh.shift();
  return d}
function procBank(msgs){
  const B=S.bank,today=dkey(new Date());let n=daysBetween(B.last,today);if(n<=0)return;n=Math.min(n,BDAYS_MAX);
  let net=0;const m2=[];for(let i=1;i<=n;i++){const d=bankDay(B,m2,dkey(addDays(B.last,i)));net+=d.net}
  B.last=today;
  msgs.push('🏦 Habicht Bank: '+n+' Tag'+(n>1?'e':'')+' · Ergebnis '+(net>=0?'+':'−')+f(Math.abs(r2(net))));
  m2.slice(0,4).forEach(x=>msgs.push(x));
  if(B.req.length)msgs.push('📋 '+B.req.length+' offene Kreditanfrage'+(B.req.length>1?'n':'')+' im Bank-Tab');
}

/* ----- Aktionen ----- */
function bSaveRates(){const B=S.bank,v=id=>+$(id).value;
  B.rLoan=clamp(v('bk-rl')||0,0,40);B.rDep=clamp(v('bk-rd')||0,0,20);B.feeAcc=clamp(v('bk-fa')||0,0,25);B.feeLoan=clamp(v('bk-fl')||0,0,10);sv();toast('Konditionen gespeichert ✓')}
function reqSheet(id){
  const B=S.bank,r=B.req.find(x=>x.id===id),c=r&&custOf(r.cid);if(!r||!c)return;const sg=suggRate(B,c),pay=annuity(r.amt,sg,r.n);
  const act=B.loans.filter(l=>l.cid===c.id&&l.st==='act');
  openSheet(`<h3>Kreditanfrage</h3><div><b>${esc(c.n)}</b> <span class="muted">· ${esc(c.job)}</span></div>
  <div class="kv"><span>Bonität (Score)</span><b class="${c.sc>=650?'pos':c.sc>=500?'':'neg'}">${c.sc}</b></div>
  <div class="kv"><span>Einkommen / Monat</span><b>${f(c.inc)}</b></div><div class="kv"><span>Einlagen bei uns</span><b>${f(c.dep)}</b></div>
  <div class="kv"><span>Laufende Kredite</span><b>${act.length?f(act.reduce((x,l)=>x+l.bal,0)):'keine'}</b></div>
  <div class="note" style="background:#171c27;border-color:#3a321a"><b>Wunsch:</b> ${f(r.amt)} über ${r.n} Monate<br><span class="muted small">Der Kunde akzeptiert höchstens ${nf(r.maxR,1)} % p.a.</span></div>
  <div class="muted small">Dein Zinssatz % p.a. (Vorschlag nach Risiko: ${nf(sg,1)} %)</div>
  <input id="rq-r" type="number" inputmode="decimal" step="0.1" value="${sg}" oninput="reqCalc('${id}')">
  <div class="kv"><span>Monatsrate</span><b id="rq-pay"></b></div><div class="kv"><span>Ausfallrisiko über Laufzeit</span><b id="rq-pd"></b></div>
  <div class="kv"><span>Erwarteter Verlust</span><b id="rq-el"></b></div><div class="kv"><span>Erwarteter Zinsertrag</span><b id="rq-ei"></b></div>
  <div class="kv"><span>Bearbeitungsgebühr</span><b>${f(r2(r.amt*B.feeLoan/100))}</b></div>
  <div class="row"><button onclick="reqDo('${id}',1)">Bewilligen</button><button class="s" onclick="reqDo('${id}',0)">Ablehnen</button></div><button class="s" onclick="closeSheet()">Später</button>`);
  reqCalc(id)}
function reqCalc(id){
  const B=S.bank,r=B.req.find(x=>x.id===id),c=r&&custOf(r.cid);if(!r||!c||!$('rq-r'))return;const rt=+$('rq-r').value||0,pay=annuity(r.amt,rt,r.n),pd=pdTerm(B,c,r.n,pay);
  $('rq-pay').textContent=f(pay);$('rq-pd').innerHTML='<span class="'+(pd>0.15?'neg':pd>0.07?'':'pos')+'">'+nf(pd*100,1)+' %</span>';
  $('rq-el').textContent=f(r2(r.amt*0.8*pd*0.6));$('rq-ei').textContent=f(r2(pay*r.n-r.amt));
  $('rq-r').style.borderColor=rt>r.maxR?'#e66':'#333'}
function reqDo(id,ok){
  const B=S.bank,r=B.req.find(x=>x.id===id),c=r&&custOf(r.cid);if(!r||!c)return closeSheet();
  if(!ok){B.req=B.req.filter(x=>x.id!==id);sv();closeSheet();return toast('Anfrage abgelehnt')}
  const rate=r2(+$('rq-r').value);if(!(rate>=0&&rate<=60))return toast('Zinssatz prüfen',1);
  if(rate>r.maxR){B.req=B.req.filter(x=>x.id!==id);sv();closeSheet();return toast(c.n+' lehnt ab – Zins zu hoch',1)}
  if(B.cash-r.amt<BRES*bDeps(B)){return toast('Zu wenig Liquidität (10 % Reserve der Einlagen bleibt)',1)}
  const fee=r2(r.amt*B.feeLoan/100),pay=annuity(r.amt,rate,r.n);
  B.loans.push({id:rid(),cid:c.id,p:r.amt,r:rate,n:r.n,m:0,bal:r.amt,pay,st:'act',ts:Date.now(),fee});
  B.cash=r2(B.cash-(r.amt-fee));B.pend=r2((B.pend||0)+fee);B.cum.fee=r2(B.cum.fee+fee);B.cnt.granted++;
  B.req=B.req.filter(x=>x.id!==id);xp(25);bump('loans');sv();closeSheet();toast('Kredit an '+c.n+' bewilligt ✓')}
function bPayout(){
  const B=S.bank,a=g($('bk-pacc').value),v=r2(+$('bk-pamt').value),av=bAvail(B);
  if(!a||!(v>0))return toast('Betrag eingeben',1);if(v>av+0.005)return toast('Maximal auszahlbar: '+f(av),1);
  B.cash=r2(B.cash-v);B.paid=r2(B.paid+v);bk(a,v,'Gewinnausschüttung Habicht Bank',{c:'Bankgewinn'});xp(20);bump('payout');$('bk-pamt').value='';sv();toast('+'+f(v)+' ausgezahlt ✓')}
function bPayAll(){const av=bAvail(S.bank);$('bk-pamt').value=Math.floor(av*100)/100}
function bInject(){
  const B=S.bank,a=g($('bk-pacc').value),v=r2(+$('bk-pamt').value);if(!a||!(v>0))return toast('Betrag eingeben',1);if(a.b<v)return toast('Nicht genug Guthaben',1);
  bk(a,-v,'Kapitaleinlage Habicht Bank',{x:1});B.eq0=r2(B.eq0+v);B.cash=r2(B.cash+v);$('bk-pamt').value='';sv();toast('Kapital eingezahlt ✓')}

/* ----- Anzeige ----- */
const kvr=(a,b,c)=>`<div class="kv"><span>${a}</span><b${c?' class="'+c+'"':''}>${b}</b></div>`;
const sg=x=>(x>=0?'+':'−')+nf(Math.abs(x));
function renderBank(){
  const B=S.bank;if(!B||!$('bk-head'))return;const eq=bEq(B),last=B.days[B.days.length-1],pr=bProfit(B);
  $('bk-head').innerHTML=`<div class="muted">Eigenkapital der Habicht Bank</div><div class="big gold">${f(eq)}</div>
  <div class="small ${pr>=0?'pos':'neg'}">Gewinn gesamt: ${pr>=0?'+':'−'}${f(Math.abs(pr))}${last?' · letzter Tag: '+sg(last.net):''}</div>
  <div id="bk-sp" style="height:50px;margin-top:6px"></div>
  <div class="muted small">⏩ Zeitraffer: 1 Bankmonat = 1 Tag. Überschüssige Liquidität bringt 1 % p.a. (Zentralbank). Raten, Zinsen &amp; Ausfälle werden beim Öffnen nachgerechnet.</div>`;
  $('bk-sp').innerHTML=B.eqh.length>1?spark(B.eqh,300,50).replace('<svg','<svg style="width:100%;height:50px"'):'';
  $('bk-req').innerHTML=B.req.length?B.req.map(r=>{const c=custOf(r.cid);return c?`<div class="acc"><span>${esc(c.n)}<small>${f(r.amt)} · ${r.n} Mon. · Score ${c.sc} · max. ${nf(r.maxR,1)} %</small></span><button class="s" style="width:auto;padding:8px 14px" onclick="reqSheet('${r.id}')">Prüfen</button></div>`:''}).join(''):'<div class="muted small" style="padding:8px 0">Keine offenen Anfragen. Neue kommen mit der Zeit – niedrigere Kreditzinsen locken mehr an.</div>';
  [['bk-rl',B.rLoan],['bk-rd',B.rDep],['bk-fa',B.feeAcc],['bk-fl',B.feeLoan]].forEach(([i,v])=>{if(document.activeElement!==$(i))$(i).value=v});
  const dep=bDeps(B),ln=bLoans(B);
  $('bk-bil').innerHTML=`<div class="bil"><div><div class="muted small">AKTIVA</div>${kvr('Liquidität',f(B.cash))}${kvr('Kredite (offen)',f(ln))}<div class="kv tot"><span>Summe</span><b>${f(B.cash+ln)}</b></div></div>
  <div><div class="muted small">PASSIVA</div>${kvr('Kundeneinlagen',f(dep))}${kvr('Eigenkapital',f(eq),'gold')}<div class="kv tot"><span>Summe</span><b>${f(dep+eq)}</b></div></div></div>
  ${B.cash<BRES*dep?'<div class="note" style="background:#2a1a1a;border-color:#6a2a2a">⚠️ Liquidität unter der 10-%-Reserve – keine neuen Kredite möglich.</div>':''}`;
  const w=B.days.slice(-7),sum=k=>r2(w.reduce((x,d)=>x+d[k],0)),L=last||{intI:0,fee:0,intE:0,loss:0,cost:0,net:0},C=B.cum;
  const row=(n,k,neg)=>`<tr><td>${n}</td><td align="right">${nf(neg?-L[k]:L[k])}</td><td align="right">${nf(neg?-sum(k):sum(k))}</td><td align="right">${nf(neg?-C[k]:C[k])}</td></tr>`;
  const nt=r2(w.reduce((x,d)=>x+d.net,0)),ct=r2(C.intI+C.fee-C.intE-C.loss-C.cost);
  $('bk-pl').innerHTML=`<table class="plt"><tr class="muted small"><td></td><td align="right">Letzter Tag</td><td align="right">7 Tage</td><td align="right">Gesamt</td></tr>
  ${row('Zinserträge','intI')}${row('Gebühren','fee')}${row('Zinsaufwand','intE',1)}${row('Kreditausfälle','loss',1)}${row('Betriebskosten','cost',1)}
  <tr class="sumr"><td>Ergebnis</td><td align="right" class="${L.net>=0?'pos':'neg'}">${nf(L.net)}</td><td align="right" class="${nt>=0?'pos':'neg'}">${nf(nt)}</td><td align="right" class="${ct>=0?'pos':'neg'}">${nf(ct)}</td></tr></table>`;
  const av=bAvail(B);$('bk-av').innerHTML=`Auszahlbarer Gewinn: <b class="gold">${f(av)}</b> <span class="muted small">(bereits ausgezahlt: ${f(B.paid)})</span>`;
  fillSel('bk-pacc',own(),lab);
  const ls=B.loans.slice().sort((a,b)=>(a.st==='act'?0:1)-(b.st==='act'?0:1)||b.ts-a.ts).slice(0,25);
  $('bk-loans').innerHTML=ls.length?ls.map(l=>{const c=custOf(l.cid);const pc=l.st==='act'?l.m/l.n*100:l.st==='done'?100:l.m/l.n*100;
    return `<div class="acc"><span>${esc(c?c.n:'(Kunde weg)')}<small>${f(l.p)} · ${nf(l.r,1)} % · ${l.m}/${l.n} Raten à ${nf(l.pay)}</small><span class="pbar"><u style="width:${pc}%;background:${l.st==='def'?'#e66':'#d4af37'}"></u></span></span><span style="text-align:right">${l.st==='act'?f(l.bal):l.st==='done'?'<span class="pos">zurückgezahlt</span>':'<span class="neg">Ausfall −'+nf(l.lost||0)+'</span>'}</span></div>`}).join(''):'<div class="muted small" style="padding:8px 0">Noch keine Kredite vergeben.</div>';
  $('bk-cust').innerHTML=B.cust.slice().sort((a,b)=>b.dep-a.dep).map(c=>`<div class="acc"><span>${esc(c.n)}<small>${esc(c.job)} · Einkommen ${nf(c.inc,0)}${c.st==='pleite'?' · <span class="neg">zahlungsunfähig</span>':''}</small></span><span style="text-align:right">${f(c.dep)}<small>Score ${c.sc}</small></span></div>`).join('')}
