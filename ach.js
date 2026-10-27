'use strict';
/* Erfolge, XP & Level */
const lvOf=x=>Math.floor((1+Math.sqrt(1+x/12.5))/2);
const lvNeed=L=>50*(L-1)*L;
const TITLES=['Neuling','Kunde','Stammkunde','Sparer','Anleger','Investor','Privatbankier','Vermögensberater','Direktor','Bankchef','Bankier-Legende','Habicht-Magnat'];
const lvTitle=L=>TITLES[Math.min(L-1,TITLES.length-1)];
function xp(n){if(S)S.xp=(S.xp||0)+n}
function bump(k,n){if(S){S.cnt=S.cnt||{};S.cnt[k]=(S.cnt[k]||0)+(n==null?1:n)}}
const cn=k=>(S.cnt&&S.cnt[k])||0;
const sparSum=()=>S.a.filter(a=>a.own&&a.type==='spar').reduce((x,a)=>x+a.b,0);
const trProfit=()=>cn('rp')+(depVal()-depCost());
const ACH=[
 {id:'pay1',i:'💳',n:'Erste Zahlung',d:'Zahle einmal mit der Habicht-Karte.',t:()=>cn('pay')>=1},
 {id:'pay25',i:'🛍️',n:'Kartenprofi',d:'25 Kartenzahlungen.',t:()=>cn('pay')>=25,p:()=>[cn('pay'),25]},
 {id:'tf1',i:'💸',n:'Überweiser',d:'Mache eine Überweisung.',t:()=>cn('tf')>=1},
 {id:'acc3',i:'🗂️',n:'Kontosammler',d:'Besitze 3 eigene Konten.',t:()=>own().length>=3,p:()=>[own().length,3]},
 {id:'w25',i:'💰',n:'Wohlhabend',d:'25.000 HB$ Gesamtvermögen.',t:()=>tot(S)>=25000,p:()=>[tot(S),25000]},
 {id:'w100',i:'🏦',n:'Sechsstellig',d:'100.000 HB$ Gesamtvermögen.',t:()=>tot(S)>=1e5,p:()=>[tot(S),1e5]},
 {id:'mil',i:'💎',n:'Erste Million',d:'1.000.000 HB$ Gesamtvermögen.',t:()=>tot(S)>=1e6,p:()=>[tot(S),1e6]},
 {id:'spar',i:'🦊',n:'Sparfuchs',d:'5.000 HB$ auf Sparkonten.',t:()=>sparSum()>=5000,p:()=>[sparSum(),5000]},
 {id:'zins',i:'🌱',n:'Zinseszins',d:'7 Tage Zinsen erhalten.',t:()=>cn('int')>=7,p:()=>[cn('int'),7]},
 {id:'dep1',i:'📈',n:'Börsen-Neuling',d:'Kaufe deine erste Aktie oder Krypto.',t:()=>cn('buy')>=1||Object.keys(S.dep).length>0},
 {id:'kry',i:'🪙',n:'Krypto-Zocker',d:'Kaufe eine Kryptowährung.',t:()=>cn('kb')>=1||Object.keys(S.dep).some(k=>(ASSETS.find(a=>a.s===k)||{}).t==='k')},
 {id:'win',i:'🤑',n:'Erster Gewinn',d:'Verkaufe etwas mit Gewinn.',t:()=>cn('win')>=1},
 {id:'div',i:'🧺',n:'Diversifiziert',d:'5 Positionen gleichzeitig im Depot.',t:()=>Object.keys(S.dep).length>=5,p:()=>[Object.keys(S.dep).length,5]},
 {id:'shark',i:'🦈',n:'Börsenhai',d:'5.000 HB$ Gesamtgewinn mit Aktien & Krypto.',t:()=>trProfit()>=5000,p:()=>[Math.max(0,trProfit()),5000]},
 {id:'link1',i:'📲',n:'Geld-Bote',d:'Sende Geld per Link/QR.',t:()=>cn('link')>=1},
 {id:'red1',i:'🎁',n:'Beschenkt',d:'Löse einen Geld-Link ein.',t:()=>cn('red')>=1},
 {id:'so',i:'🔁',n:'Planer',d:'Richte einen Dauerauftrag ein.',t:()=>S.so.length>0||cn('so')>=1},
 {id:'sal',i:'💼',n:'Gehaltsempfänger',d:'Erhalte Gehalt.',t:()=>cn('sal')>=1},
 {id:'pdf',i:'📄',n:'Papierkram',d:'Erstelle einen Kontoauszug als PDF.',t:()=>cn('pdf')>=1},
 {id:'lv5',i:'⭐',n:'Aufsteiger',d:'Erreiche Level 5.',t:()=>lvOf(S.xp||0)>=5,p:()=>[lvOf(S.xp||0),5]},
 {id:'lv10',i:'🌟',n:'Veteran',d:'Erreiche Level 10.',t:()=>lvOf(S.xp||0)>=10,p:()=>[lvOf(S.xp||0),10]},
 {id:'b1',i:'🏛️',n:'Bankchef',d:'Vergib deinen ersten Kredit.',t:()=>S.bank.cnt.granted>=1},
 {id:'b10',i:'🦅',n:'Kreditgeber',d:'Vergib 10 Kredite.',t:()=>S.bank.cnt.granted>=10,p:()=>[S.bank.cnt.granted,10]},
 {id:'brep',i:'✅',n:'Pünktlich',d:'Ein Kredit wurde komplett zurückgezahlt.',t:()=>S.bank.cnt.repaid>=1},
 {id:'bdef',i:'📉',n:'Lehrgeld',d:'Dein erster Kreditausfall.',t:()=>S.bank.cnt.def>=1},
 {id:'bclean',i:'🛡️',n:'Ohne Ausfall',d:'5 Kredite zurückgezahlt, kein Ausfall.',t:()=>S.bank.cnt.repaid>=5&&S.bank.cnt.def===0,p:()=>[S.bank.cnt.def===0?S.bank.cnt.repaid:0,5]},
 {id:'bprof',i:'📊',n:'Gewinnbringer',d:'10.000 HB$ Bankgewinn insgesamt.',t:()=>bProfit(S.bank)>=1e4,p:()=>[Math.max(0,bProfit(S.bank)),1e4]},
 {id:'bpay',i:'🥂',n:'Dividende',d:'Zahle Bankgewinn an dich aus.',t:()=>S.bank.paid>0},
 {id:'bcust',i:'👥',n:'Große Kundschaft',d:'20 Bankkunden.',t:()=>S.bank.cust.length>=20,p:()=>[S.bank.cust.length,20]},
 {id:'beq',i:'🏰',n:'Eigenkapital-Riese',d:'300.000 HB$ Eigenkapital der Bank.',t:()=>bEq(S.bank)>=3e5,p:()=>[bEq(S.bank),3e5]}
];
function initProgress(s,ov){
  s.cnt=s.cnt||{};s.ach=s.ach||{};
  if(ov<3||s.xp==null){
    const c={pay:0,buy:0,sell:0,kb:0,link:0,sal:0,tf:0,int:0};
    s.a.forEach(a=>{if(!a.own)return;a.tx.forEach(t=>{const T=t.t||'';
      if(/^Kartenzahlung/.test(T))c.pay++;else if(/^Kauf /.test(T)){c.buy++;if(/^Kauf (HBC|ETN|KRT|MND)/.test(T))c.kb++}else if(/^Verkauf /.test(T))c.sell++;
      else if(/^Link-Überweisung/.test(T))c.link++;else if(/^Gehalt/.test(T))c.sal++;else if(/^An /.test(T)&&!t.x)c.tf++;else if(/^Zinsen/.test(T)&&t.c==='Zinsen')c.int++})});
    Object.keys(c).forEach(k=>{if(s.cnt[k]==null)s.cnt[k]=c[k]});
    s.xp=Math.min(1500,c.pay*5+c.buy*8+c.sell*8+c.link*15+c.tf*5+Math.min(50,c.sal)+Math.min(30,c.int)+s.a.filter(a=>a.own).length*20+(s.so||[]).length*20);
    s.lvl=lvOf(s.xp);s._retro=1}
  if(!s.lvl)s.lvl=lvOf(s.xp||0);
}
/* Konfetti */
function confetti(){
  let cv=document.getElementById('confetti');if(!cv){cv=document.createElement('canvas');cv.id='confetti';document.body.appendChild(cv)}
  const W=cv.width=innerWidth*2,H=cv.height=innerHeight*2,x=cv.getContext('2d'),cols=['#d4af37','#f6e7b0','#6c6','#4aa8e8','#e86a6a','#b06ad8'];
  const ps=Array.from({length:140},()=>({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*26,vy:-Math.random()*30-6,s:8+Math.random()*12,c:cols[Math.floor(Math.random()*cols.length)],r:Math.random()*6,vr:(Math.random()-.5)*.4}));
  const t0=performance.now();(function fr(t){const e=t-t0;x.clearRect(0,0,W,H);if(e>2800){cv.remove();return}
    ps.forEach(p=>{p.vy+=.9;p.x+=p.vx;p.y+=p.vy;p.vx*=.992;p.r+=p.vr;x.save();x.globalAlpha=Math.min(1,(2800-e)/700);x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});requestAnimationFrame(fr)})(t0)}
function checkAch(silent){
  if(!S)return 0;S.ach=S.ach||{};let n=0;const names=[];
  ACH.forEach(a=>{if(S.ach[a.id])return;let ok=false;try{ok=a.t()}catch(e){}if(ok){S.ach[a.id]=Date.now();S.xp=(S.xp||0)+40;n++;names.push(a.i+' '+a.n)}});
  const L=lvOf(S.xp||0),up=L>(S.lvl||1);
  if(!silent){
    names.forEach((m,i)=>setTimeout(()=>toast('🏆 Erfolg freigeschaltet: '+m),i*900));
    if(up)setTimeout(()=>toast('🎉 Level '+L+' – '+lvTitle(L)),names.length*900);
    if(n||up)confetti()}
  if(L>(S.lvl||1))S.lvl=L;
  // Level-Erfolge können durch XP aus Erfolgen entstehen
  if(n&&!silent)return n+checkAch(false);
  if(n&&silent)return n+checkAch(true);
  return n}
function renderLvl(){
  const xpv=S.xp||0,L=lvOf(xpv),a=lvNeed(L),b=lvNeed(L+1),pc=Math.min(100,(xpv-a)/(b-a)*100);
  const html=`<div class="lv-top"><b>Level ${L}</b><span class="muted">${lvTitle(L)}</span><span class="muted small" style="margin-left:auto">${xpv-a} / ${b-a} XP</span></div><div class="pbar big"><u style="width:${pc}%"></u></div>`;
  if($('lvl-chip'))$('lvl-chip').innerHTML=html;if($('lv-card'))$('lv-card').innerHTML=html}
function renderAch(){
  renderLvl();if(!$('ach-grid'))return;const u=ACH.filter(a=>S.ach[a.id]).length;$('ach-cnt').textContent=u+' von '+ACH.length+' freigeschaltet';
  $('ach-grid').innerHTML=ACH.slice().sort((a,b)=>(S.ach[b.id]?1:0)-(S.ach[a.id]?1:0)).map(a=>{const ok=S.ach[a.id];let pg='';
    if(!ok&&a.p){let v=[0,1];try{v=a.p()}catch(e){}pg=`<div class="pbar"><u style="width:${Math.min(100,v[0]/v[1]*100)}%"></u></div>`}
    return `<div class="bdg${ok?' on':''}"><div class="ic">${a.i}</div><b>${a.n}</b><small>${a.d}</small>${ok?'<small class="gold">'+new Date(ok).toLocaleDateString('de-DE')+'</small>':pg}</div>`}).join('')}
