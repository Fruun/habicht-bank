'use strict';
/* Habicht Private Bank v2 – nur Spielgeld */
const $=i=>document.getElementById(i);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=(n,dg=2)=>n.toLocaleString('de-DE',{minimumFractionDigits:dg,maximumFractionDigits:dg});
const f=n=>nf(n)+' HB$';
const r2=x=>Math.round(x*100)/100;
const rid=()=>Math.random().toString(36).slice(2,10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmtD=ts=>new Date(ts).toLocaleString('de-DE');
const pad=n=>String(n).padStart(2,'0');
const dkey=dt=>dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
const addDays=(k,n)=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d+n,0,5)};
const daysBetween=(a,b)=>{const p=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)};return Math.round((p(b)-p(a))/864e5)};
const CATS=['Supermarkt','Restaurant','Tanken','Shopping','Freizeit','Reisen','Miete','Abos','Überweisung','Sonstiges'];
const COL={Supermarkt:'#6cc070',Restaurant:'#e8924a',Tanken:'#c9c04a',Shopping:'#b06ad8',Freizeit:'#4aa8e8',Reisen:'#4ad8c0',Miete:'#e86a6a',Abos:'#8a8ff0',Überweisung:'#d4af37',Sonstiges:'#8a8f9c'};
const SHOPS={Supermarkt:['Edeka','Rewe','Lidl','Aldi'],Restaurant:['Döner Dynamics','Pizza Palazzo','Burger Bär','Sushi Sonne'],Tanken:['Aral','Shell','Jet Tankstelle'],Shopping:['Amazone','Zalando-ish','Media Markt Platz','Sneaker Shop'],Freizeit:['Kino Cinemaxx','Bowling Bahn','Maestia Shop','Freibad'],Reisen:['Bahn Verspätung AG','Billigflieger','Hotel Habicht'],Miete:['Vermieter'],Abos:['Streamflix','Spotifly','Cloud+'],Überweisung:['Überweisung'],Sonstiges:['Kiosk','Apotheke','Friseur']};
const ASSETS=[
 {s:'HAB',n:'Habicht AG',t:'a',p:142.5,v:.012},{s:'MAE',n:'Maestia Games',t:'a',p:67.2,v:.02},{s:'DOE',n:'Döner Dynamics',t:'a',p:23.8,v:.018},
 {s:'RKT',n:'Rakete Motors',t:'a',p:310,v:.025},{s:'BRB',n:'Brauerei Bierbaum',t:'a',p:54.1,v:.01},{s:'ICE',n:'Eisdiele Global',t:'a',p:12.4,v:.022},
 {s:'HBC',n:'HabiCoin',t:'k',p:48200,v:.04},{s:'ETN',n:'Etherno',t:'k',p:2650,v:.045},{s:'KRT',n:'KartoffelCoin',t:'k',p:.84,v:.07},{s:'MND',n:'MondToken',t:'k',p:5.6,v:.08}];
const STEP=15*60*1000, HMAX=96;

/* ---------- Zustand ---------- */
let S=null, LOCKED=true, NOTES=[], hiddenAt=0, tickT=null, pendingRedeem=null;
const g=id=>S.a.find(a=>String(a.id)===String(id));
const own=()=>S.a.filter(a=>a.own);
const depVal=()=>Object.keys(S.dep).reduce((x,k)=>x+S.dep[k].q*(S.mk.p[k]||0),0);
const depCost=()=>Object.keys(S.dep).reduce((x,k)=>x+S.dep[k].c,0);
const tot=s=>s.a.reduce((x,a)=>x+a.b,0)+(s.dep?Object.keys(s.dep).reduce((x,k)=>x+s.dep[k].q*((s.mk&&s.mk.p[k])||0),0):0);
const persist=()=>{try{localStorage.setItem('hb',JSON.stringify(S))}catch(e){}};
const sv=()=>{S.h.push(r2(tot(S)));S.h=S.h.slice(-60);persist();render()};
function toast(m,bad){const t=$('toast'),e=document.createElement('div');e.textContent=m;if(bad)e.className='bad';t.appendChild(e);setTimeout(()=>e.remove(),bad?3600:2600)}

function parseD(s){const m=/(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s*(\d{1,2})?:?(\d{2})?/.exec(s||'');return m?new Date(+m[3],m[2]-1,+m[1],+(m[4]||0),+(m[5]||0)).getTime():Date.now()}
function newAcc(n,type,b,o){const ts=Date.now();return {id:rid()+rid(),n,type,own:o!==false,b,tx:[{d:fmtD(ts),ts,t:'Kontoeröffnung',v:b,c:'Sonstiges',x:1}]}}
function cardData(){const grp=()=>String(Math.floor(Math.random()*9000)+1000);return {num:'9876 '+grp()+' '+grp()+' '+grp(),cvv:String(Math.floor(Math.random()*900)+100),exp:'12/'+(new Date().getFullYear()+4-2000)}}
function initMarket(){const mk={ts:Math.floor(Date.now()/STEP)*STEP,p:{},h:{}};ASSETS.forEach(a=>{let p=a.p*(0.92+Math.random()*.16);const h=[];for(let i=0;i<48;i++){p=stepP(a,p,1);h.push(p)}mk.p[a.s]=p;mk.h[a.s]=h});return mk}
function gauss(){return Math.sqrt(-2*Math.log(Math.random()||1e-9))*Math.cos(2*Math.PI*Math.random())}
function stepP(a,p,sc){let lp=Math.log(p);lp+=-0.015*sc*(lp-Math.log(a.p))+a.v*gauss()*Math.sqrt(sc);return Math.max(0.01,Math.round(Math.exp(lp)*10000)/10000)}

function fresh(){
  const s={v:2,a:[newAcc('Girokonto','giro',10000),newAcc('Sparkonto','spar',0)],h:[]};
  s.h.push(10000);return migrate(s);
}
function migrate(s){
  s.v=2;s.a=s.a||[];s.h=s.h||[];
  s.a.forEach((a,i)=>{
    a.type=a.type||'giro';if(a.own===undefined)a.own=(i===0);
    a.tx=a.tx||[];
    a.tx.forEach(t=>{
      if(!t.ts)t.ts=parseD(t.d);
      if(!t.c){const T=t.t||'';if(/Bankchef|Kontoeröffnung|^Zinsen/.test(T)){t.x=1;t.c='Sonstiges'}else t.c=/^An /.test(T)?'Überweisung':'Sonstiges'}
    });
  });
  if(!s.a.some(a=>a.type==='spar'&&a.own))s.a.push(newAcc('Sparkonto','spar',0));
  s.cfg=Object.assign({name:'Jeremy Habicht',rate:3,frozen:false,card:cardData(),cardAcc:null},s.cfg||{});
  if(!s.cfg.card||!s.cfg.card.num)s.cfg.card=cardData();
  if(!s.cfg.cardAcc||!s.a.some(a=>String(a.id)===String(s.cfg.cardAcc)))s.cfg.cardAcc=(s.a.find(a=>a.own&&a.type==='giro')||s.a[0]).id;
  s.lastInt=s.lastInt||dkey(new Date());
  if(!s.mk||!s.mk.p)s.mk=initMarket();
  s.dep=s.dep||{};s.so=s.so||[];s.out=s.out||{};s.red=s.red||[];
  s.sal=Object.assign({on:false,acc:null,amt:2500,day:1,last:''},s.sal||{});
  if(!s.sal.acc||!s.a.some(a=>String(a.id)===String(s.sal.acc)))s.sal.acc=s.cfg.cardAcc;
  return s;
}
function load(){let x=null;try{x=JSON.parse(localStorage.getItem('hb')||'null')}catch(e){}
  if(x&&x.a&&x.a.length){S=migrate(x)}else S=fresh();
  persist()}

/* ---------- Buchungen ---------- */
function bk(a,v,t,o){o=o||{};const ts=o.ts||Date.now();a.b=r2(a.b+v);const tx={d:fmtD(ts),ts,t,v:r2(v),c:o.c||'Sonstiges'};if(o.x)tx.x=1;a.tx.unshift(tx);if(a.tx.length>600)a.tx.length=600}
function mkey(m){return Math.floor(m/12)+'-'+pad(m%12+1)}
function pm(k){const [y,m]=k.split('-').map(Number);return y*12+m-1}
function dueM(last,day){const now=new Date(),cur=now.getFullYear()*12+now.getMonth();let m=(last?pm(last):cur-1)+1;const out=[];while(m<=cur&&out.length<24){if(m===cur&&day>now.getDate())break;out.push(m);m++}return out}
function tsOf(m,day){return Math.min(Date.now(),new Date(Math.floor(m/12),m%12,day,8,0).getTime())}
function lastFor(day){const n=new Date(),cur=n.getFullYear()*12+n.getMonth();return mkey(day<=n.getDate()?cur:cur-1)}

function procInterest(msgs){
  const today=dkey(new Date());let n=daysBetween(S.lastInt,today);if(n<=0)return;n=Math.min(n,3650);
  S.a.filter(a=>a.type==='spar').forEach(a=>{let sum=0;
    for(let k=1;k<=n;k++){const iv=r2(a.b*S.cfg.rate/36500);if(iv>0){bk(a,iv,'Zinsen '+nf(S.cfg.rate,1)+' % p.a.',{c:'Zinsen',ts:addDays(S.lastInt,k).getTime()});sum+=iv}}
    if(sum>0)msgs.push('💰 Zinsen für '+n+' Tag'+(n>1?'e':'')+': +'+f(r2(sum))+' ('+a.n+')')});
  S.lastInt=today;
}
function execTransfer(from,toAcc,ext,amt,txt,cat,ts){
  if(from.b<amt)return false;
  if(toAcc){const same=from.own&&toAcc.own;
    bk(from,-amt,'An '+toAcc.n+(txt?': '+txt:''),{c:same?'Sonstiges':cat,x:same||!from.own,ts});
    bk(toAcc,amt,'Von '+from.n+(txt?': '+txt:''),{c:same?'Sonstiges':'Überweisung',x:same||!toAcc.own,ts});
  }else bk(from,-amt,'An '+ext+(txt?': '+txt:''),{c:cat,ts});
  return true;
}
function procOrders(msgs){
  S.so.forEach(o=>{if(o.off)return;const from=g(o.from);if(!from){o.off=1;return}
    for(const m of dueM(o.last,o.day)){const ts=tsOf(m,o.day),to=o.to?g(o.to):null;
      if(o.to&&!to){o.off=1;break}
      if(execTransfer(from,to,o.ext,o.amt,o.z||'Dauerauftrag',o.cat,ts)){o.last=mkey(m);msgs.push('🔁 Dauerauftrag: −'+f(o.amt)+' an '+(to?to.n:o.ext))}
      else{msgs.push('⚠️ Dauerauftrag '+esc(o.z||'')+' nicht ausgeführt: zu wenig Guthaben auf '+from.n);break}}});
}
function procSalary(msgs){
  const s=S.sal;if(!s.on)return;const a=g(s.acc);if(!a)return;
  for(const m of dueM(s.last,s.day)){bk(a,s.amt,'Gehalt Habicht AG',{c:'Gehalt',ts:tsOf(m,s.day)});s.last=mkey(m);msgs.push('💼 Gehalt: +'+f(s.amt)+' ('+a.n+')')}
}
function procMarket(){
  const mk=S.mk,now=Date.now();let steps=Math.floor((now-mk.ts)/STEP);if(steps<=0)return;
  if(steps>960){mk.ts=now-960*STEP;steps=960}
  for(let i=0;i<steps;i++){ASSETS.forEach(a=>{const p=stepP(a,mk.p[a.s],1);mk.p[a.s]=p;const h=mk.h[a.s];h.push(p);if(h.length>HMAX)h.shift()})}
  mk.ts+=steps*STEP;
}
function liveTick(){
  if(LOCKED||document.hidden)return;const mk=S.mk;
  ASSETS.forEach(a=>{const p=stepP(a,mk.p[a.s],0.0056);mk.p[a.s]=p;const h=mk.h[a.s];h[h.length-1]=p});
  if(Date.now()-mk.ts>=STEP){procMarket()}
  renderMarket();renderTotals();updTrade();
}
function processAll(){const msgs=[];procInterest(msgs);procOrders(msgs);procSalary(msgs);procMarket();if(msgs.length){NOTES=msgs.concat(NOTES).slice(0,8);S.h.push(r2(tot(S)));S.h=S.h.slice(-60)}persist()}

/* ---------- Konten & Überweisung ---------- */
function neu(){const n=$('nn').value.trim();if(!n)return toast('Bitte einen Namen eingeben',1);S.a.push(newAcc(n,$('nt').value,0));$('nn').value='';sv();toast('Konto eröffnet ✓')}
function ueb(){const a=g($('tf').value),b=g($('tt').value),v=r2(+$('ta').value),z=$('tz').value.trim();
  if(!a||!b||a===b||!(v>0))return toast('Bitte Eingaben prüfen',1);if(a.b<v)return toast('Nicht genug Guthaben',1);
  execTransfer(a,b,null,v,z||'Überweisung','Überweisung');$('ta').value=$('tz').value='';sv();toast('Überwiesen ✓')}
function chef(k){const a=g($('ck').value),v=r2(+$('ca').value);if(!a||!(v>0))return;bk(a,k*v,k>0?'Gutschrift Bankchef':'Abbuchung Bankchef',{x:1});$('ca').value='';sv()}
function zins(){const p=+$('zs').value;S.a.forEach(a=>{const v=r2(a.b*p/100);if(v>0)bk(a,v,'Zinsen '+p+' %',{c:'Zinsen'})});sv()}

/* ---------- Karte ---------- */
function frz(){S.cfg.frozen=!S.cfg.frozen;sv();toast(S.cfg.frozen?'Karte gesperrt 🔒':'Karte entsperrt ✓')}
function pay(cat,amt,shop){
  cat=cat||$('p-cat').value;amt=r2(amt!=null?amt:+$('p-amt').value);shop=shop||$('p-hn').value.trim()||(SHOPS[cat]||['Händler'])[Math.floor(Math.random()*(SHOPS[cat]||[1]).length)];
  const a=g(S.cfg.cardAcc);if(!a)return;
  if(S.cfg.frozen)return toast('Karte ist gesperrt',1);
  if(!(amt>0))return toast('Bitte Betrag eingeben',1);
  if(a.b<amt)return toast('Karte abgelehnt – zu wenig Guthaben',1);
  bk(a,-amt,'Kartenzahlung '+shop,{c:cat});$('p-amt').value=$('p-hn').value='';sv();toast('Bezahlt: '+f(amt)+' bei '+shop+' ✓')}
function payRnd(){const c=CATS.filter(x=>x!=='Überweisung'&&x!=='Miete')[Math.floor(Math.random()*8)];const rng={Supermarkt:[8,90],Restaurant:[12,70],Tanken:[30,90],Shopping:[15,200],Freizeit:[8,60],Reisen:[40,400],Abos:[5,20],Sonstiges:[3,40]}[c];pay(c,rng[0]+Math.random()*(rng[1]-rng[0]))}

/* ---------- Links / QR ---------- */
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/'))));
function mkToken(p){const j=JSON.stringify(p);return b64e(j)+'.'+fnv(j+'hb!')}
function parseToken(raw){
  try{raw=String(raw||'').trim();const i=raw.indexOf('#e=');if(i>=0)raw=raw.slice(i+3);else{const m=/[?&]e=([^&\s]+)/.exec(raw);if(m)raw=m[1]}
    raw=decodeURIComponent(raw).replace(/\s+/g,'');const [b,c]=raw.split('.');if(!b||!c)return null;const j=b64d(b);if(fnv(j+'hb!')!==c)return null;
    const p=JSON.parse(j);if(!p.i||!(p.a>0)||p.a>1e9||String(p.i).length>24)return null;return {p,token:raw}}catch(e){return null}
}
const linkOf=t=>location.origin+location.pathname+'#e='+t;
function qrSvg(text){const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),m=2;let d='';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m},${r+m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*m} ${n+2*m}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`}
function mkLink(){
  const a=g($('lk-from').value),v=r2(+$('lk-amt').value);
  if(!a||!(v>0))return toast('Bitte Konto und Betrag prüfen',1);if(a.b<v)return toast('Nicht genug Guthaben',1);
  const nm=$('lk-name').value.trim()||S.cfg.name.split(' ')[0],z=$('lk-z').value.trim().slice(0,60);
  const id=rid()+rid().slice(0,4),p={i:id,a:v,n:nm.slice(0,30),z,t:Date.now()},token=mkToken(p);
  bk(a,-v,'Link-Überweisung '+(z?'('+z+')':''),{c:'Überweisung'});
  S.out[id]={a:v,acc:a.id,ts:p.t,z,token,done:false};
  $('lk-amt').value=$('lk-z').value='';sv();showLink(id);
}
function showLink(id){
  const o=S.out[id];if(!o)return;const url=linkOf(o.token);
  openSheet(`<h3>Geld-Link</h3><div class="muted small">${f(o.a)}${o.z?' · '+esc(o.z):''} — einmalig einlösbar</div>
  <div class="qr">${qrSvg(url)}</div><div class="muted small" style="text-align:center">Freund scannt den QR-Code mit der Kamera-App.</div>
  <div class="code">${esc(url)}</div>
  <button onclick="copyTxt(S.out['${id}'].token&&linkOf(S.out['${id}'].token))">🔗 Link kopieren</button>
  <button class="s" onclick="shareLink('${id}')">📤 Teilen …</button>
  <button class="s" onclick="copyTxt(S.out['${id}'].token)">Nur Code kopieren</button>
  <button class="s" onclick="closeSheet()">Schließen</button>`);
}
async function copyTxt(t){try{await navigator.clipboard.writeText(t);toast('Kopiert ✓')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Kopiert ✓')}catch(_){toast('Kopieren nicht möglich',1)}ta.remove()}}
async function shareLink(id){const o=S.out[id];if(!o)return;const url=linkOf(o.token);try{await navigator.share({title:'Habicht Private Bank',text:'Ich schicke dir '+f(o.a)+' Spielgeld 💰',url})}catch(e){}}
function renderOut(){
  const l=Object.keys(S.out).filter(k=>!S.out[k].done).sort((a,b)=>S.out[b].ts-S.out[a].ts);
  $('out-list').innerHTML=l.length?'<div class="muted small" style="margin-top:10px">Offene Links</div>'+l.map(k=>{const o=S.out[k];return `<div class="acc"><span>${f(o.a)}<small>${fmtD(o.ts)}${o.z?' · '+esc(o.z):''}</small></span><span style="display:flex;gap:6px"><button class="s" style="width:auto;padding:8px 10px" onclick="showLink('${k}')">QR</button><button class="s" style="width:auto;padding:8px 10px" onclick="takeBack('${k}')">Zurück</button></span></div>`}).join(''):'';
}
function takeBack(id){const o=S.out[id];if(!o||o.done)return;if(!confirm('Link ungültig machen und '+f(o.a)+' zurückbuchen?'))return;
  const a=g(o.acc)||own()[0];o.done=true;S.red.push(id);bk(a,o.a,'Link zurückgeholt',{c:'Überweisung',x:1});sv();toast('Zurückgebucht ✓')}
function redeemInput(){const r=parseToken($('rd-in').value);if(!r)return toast('Ungültiger Link/Code',1);$('rd-in').value='';openRedeem(r)}
function openRedeem(r){
  const p=r.p,done=S.red.includes(p.i),standalone=window.navigator.standalone||matchMedia('(display-mode: standalone)').matches;
  const hint=standalone?'':'<div class="note" style="font-size:12px">ℹ️ Du bist im Browser. iOS trennt Safari und Homescreen-App: Wenn du die App auf dem Homescreen hast, kopiere den Code und löse ihn dort unter <b>Zahlen → Einlösen</b> ein.<br><button class="s" onclick="copyTxt(\''+r.token+'\')">Code kopieren</button></div>';
  if(done){openSheet(`<h3>Schon eingelöst</h3><div class="muted">Dieser Link (${f(p.a)}) wurde bereits eingelöst und ist nicht mehr gültig.</div><button class="s" onclick="closeSheet()">OK</button>`);return}
  openSheet(`<h3>Geld erhalten 🎁</h3><div style="font-size:15px"><b>${esc(p.n||'Jemand')}</b> schickt dir</div><div class="big gold">${f(p.a)}</div>${p.z?'<div class="muted">„'+esc(p.z)+'“</div>':''}${hint}
  <div class="muted small" style="margin-top:8px">Auf welches Konto?</div><select id="rd-acc">${own().map(a=>`<option value="${a.id}">${esc(a.n)} (${a.type==='spar'?'Sparkonto':'Girokonto'})</option>`).join('')}</select>
  <button onclick="doRedeem('${r.token}')">Gutschreiben</button><button class="s" onclick="closeSheet()">Später</button>`);
}
function doRedeem(token){const r=parseToken(token);if(!r)return;const p=r.p;if(S.red.includes(p.i)){closeSheet();return toast('Schon eingelöst',1)}
  const a=g($('rd-acc').value);if(!a)return;S.red.push(p.i);if(S.red.length>1000)S.red.shift();
  const mine=S.out[p.i];if(mine)mine.done=true;
  bk(a,p.a,'Von '+(p.n||'Freund')+(p.z?': '+p.z:''),{c:'Überweisung',x:mine?1:0});sv();closeSheet();toast('+'+f(p.a)+' gutgeschrieben 🎉')}

/* ---------- Daueraufträge / Gehalt ---------- */
function soToChg(){$('so-ext').hidden=$('so-to').value!=='__ext'}
function addSO(){
  const from=$('so-from').value,to=$('so-to').value,amt=r2(+$('so-amt').value),day=Math.round(+$('so-day').value),ext=$('so-ext').value.trim();
  if(!g(from)||!(amt>0)||!(day>=1&&day<=28))return toast('Betrag und Tag (1–28) prüfen',1);
  if(to==='__ext'&&!ext)return toast('Empfänger eingeben',1);if(to===from)return toast('Quelle und Ziel sind gleich',1);
  S.so.push({id:rid(),from,to:to==='__ext'?null:to,ext:to==='__ext'?ext:null,cat:$('so-cat').value,amt,day,z:$('so-z').value.trim(),last:lastFor(day)});
  $('so-amt').value=$('so-day').value=$('so-z').value=$('so-ext').value='';
  processAll();sv();toast('Dauerauftrag angelegt ✓');
}
function delSO(id){if(!confirm('Dauerauftrag löschen?'))return;S.so=S.so.filter(o=>o.id!==id);sv()}
function salSave(){const s=S.sal,was=s.on;s.on=$('sal-on').checked;s.acc=$('sal-acc').value;s.amt=r2(+$('sal-amt').value)||0;
  const dd=Math.round(+$('sal-day').value);s.day=dd>=1&&dd<=28?dd:1;
  if(s.on&&!was){s.last=lastFor(s.day)}
  const m=[];procSalary(m);if(m.length)NOTES=m.concat(NOTES).slice(0,8);sv()}

/* ---------- Depot ---------- */
let TR=null;
const fp=p=>nf(p,p<10?4:2);
function spark(h,w,hh){h=h.slice(-48);const mn=Math.min(...h),mx=Math.max(...h),rg=mx-mn||1,col=h[h.length-1]>=h[0]?'#6c6':'#e66';
  const pts=h.map((v,i)=>(i*(w/(h.length-1))).toFixed(1)+','+(hh-2-(v-mn)/rg*(hh-4)).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none"><polyline fill="none" stroke="${col}" stroke-width="2" points="${pts}"/></svg>`}
const chg=s=>{const h=S.mk.h[s];return (S.mk.p[s]/h[0]-1)*100};
const pct=x=>(x>=0?'+':'')+nf(x,2)+' %';
function renderMarket(){
  ['a','k'].forEach(t=>{$('mk-'+t).innerHTML=ASSETS.filter(a=>a.t===t).map(a=>{const c=chg(a.s);return `<div class="mk" onclick="openTrade('${a.s}')"><div class="nm"><b>${esc(a.n)}</b><small>${a.s}${S.dep[a.s]?' · '+nf(S.dep[a.s].q,S.dep[a.s].q<1?6:3)+' Stk.':''}</small></div>${spark(S.mk.h[a.s],70,28)}<div class="pr"><b>${fp(S.mk.p[a.s])}</b><div class="small ${c>=0?'pos':'neg'}">${pct(c)}</div></div></div>`}).join('')});
  const hold=Object.keys(S.dep).filter(k=>S.dep[k].q>0);
  $('dep-list').innerHTML=hold.length?hold.map(k=>{const a=ASSETS.find(x=>x.s===k),d=S.dep[k],v=d.q*S.mk.p[k],pl=v-d.c;return `<div class="mk" onclick="openTrade('${k}')"><div class="nm"><b>${esc(a.n)}</b><small>${nf(d.q,d.q<1?6:3)} × ${fp(S.mk.p[k])}</small></div><div class="pr"><b>${f(v)}</b><div class="small ${pl>=0?'pos':'neg'}">${pl>=0?'+':''}${nf(pl)} (${pct(d.c>0?pl/d.c*100:0)})</div></div></div>`}).join(''):'<div class="muted small" style="padding:8px 0">Noch nichts im Depot. Tippe unten auf eine Aktie oder Krypto, um zu kaufen.</div>';
  const v=depVal(),c=depCost(),pl=v-c;$('dep-val').textContent=f(v);$('dep-pl').innerHTML=c>0?`<span class="${pl>=0?'pos':'neg'}">${pl>=0?'+':''}${nf(pl)} HB$ (${pct(pl/c*100)}) seit Kauf</span>`:'<span class="muted">Kein Gewinn/Verlust</span>';
}
function openTrade(s){TR=s;const a=ASSETS.find(x=>x.s===s);
  openSheet(`<h3>${esc(a.n)} <span class="muted small">${s}</span></h3><div class="big" id="tr-p"></div><div id="tr-c" class="small"></div><div id="tr-sp" style="height:90px"></div><div class="muted small" id="tr-h"></div>
  <select id="tr-acc">${own().map(x=>`<option value="${x.id}"${String(x.id)===String(S.cfg.cardAcc)?' selected':''}>${esc(x.n)} · ${f(x.b)}</option>`).join('')}</select>
  <input id="tr-amt" type="number" inputmode="decimal" placeholder="Betrag in HB$">
  <div class="row"><button onclick="trade(1)">Kaufen</button><button class="s" onclick="trade(-1)">Verkaufen</button></div>
  <button class="s" onclick="trade(-2)">Alles verkaufen</button><button class="s" onclick="closeSheet()">Schließen</button>`);
  const sh=$('sheet');sh.dataset.kind='trade';updTrade();}
function updTrade(){if(!TR||$('sheet').hidden||$('sheet').dataset.kind!=='trade'||!$('tr-p'))return;const s=TR,c=chg(s),d=S.dep[s];
  $('tr-p').textContent=fp(S.mk.p[s])+' HB$';$('tr-c').innerHTML=`<span class="${c>=0?'pos':'neg'}">${pct(c)}</span> <span class="muted">(24 Std.)</span>`;
  $('tr-sp').innerHTML=spark(S.mk.h[s],300,90).replace('<svg','<svg style="width:100%;height:90px"');
  $('tr-h').textContent=d&&d.q>0?`Im Depot: ${nf(d.q,6)} Stk. = ${f(d.q*S.mk.p[s])}`:'Nicht im Depot'}
function trade(k){
  const s=TR,a=g($('tr-acc').value),p=S.mk.p[s],d=S.dep[s]||(S.dep[s]={q:0,c:0});
  if(!a)return;
  if(k>0){const amt=r2(+$('tr-amt').value);if(!(amt>0))return toast('Betrag eingeben',1);if(a.b<amt)return toast('Nicht genug Guthaben',1);
    const q=amt/p;d.q+=q;d.c+=amt;bk(a,-amt,'Kauf '+s+' ('+nf(q,q<1?6:3)+' Stk.)',{c:'Depot',x:1});toast('Gekauft ✓')}
  else{if(!(d.q>0))return toast('Nichts zu verkaufen',1);let q;
    if(k===-2)q=d.q;else{const amt=+$('tr-amt').value;if(!(amt>0))return toast('Betrag eingeben',1);q=Math.min(d.q,amt/p)}
    const v=r2(q*p),frac=q/d.q;d.c=d.q-q<1e-9?0:d.c*(1-frac);d.q=d.q-q<1e-9?0:d.q-q;
    bk(a,v,'Verkauf '+s+' ('+nf(q,q<1?6:3)+' Stk.)',{c:'Depot',x:1});toast('Verkauft: +'+f(v)+' ✓')}
  if(d.q<=0)delete S.dep[s];
  sv();if(!$('sheet').hidden){const v=$('tr-amt');if(v)v.value='';updTrade();const sel=$('tr-acc');if(sel){const cur=sel.value;sel.innerHTML=own().map(x=>`<option value="${x.id}">${esc(x.n)} · ${f(x.b)}</option>`).join('');sel.value=cur}}
}

/* ---------- Statistik ---------- */
function statData(per){
  const now=Date.now(),d0=new Date(),start=per==='m'?new Date(d0.getFullYear(),d0.getMonth(),1).getTime():per==='30'?now-30*864e5:0;
  const cats={};let inc=0,out=0;
  own().forEach(a=>a.tx.forEach(t=>{if(t.x||t.ts<start)return;if(t.v<0){const c=CATS.includes(t.c)?t.c:'Sonstiges';cats[c]=(cats[c]||0)+(-t.v);out+=-t.v}else inc+=t.v}));
  return {cats,inc,out};
}
function renderStat(){
  const {cats,inc,out}=statData($('st-per').value),cv=$('dn'),x=cv.getContext('2d');x.clearRect(0,0,440,440);
  const ks=Object.keys(cats).sort((a,b)=>cats[b]-cats[a]);
  if(!ks.length){x.strokeStyle='#2a2f3a';x.lineWidth=40;x.beginPath();x.arc(220,220,170,0,7);x.stroke()}
  else{let a0=-Math.PI/2;ks.forEach(k=>{const a1=a0+cats[k]/out*Math.PI*2;x.strokeStyle=COL[k]||'#888';x.lineWidth=44;x.beginPath();x.arc(220,220,170,a0,a1-(ks.length>1?0.025:0));x.stroke();a0=a1})}
  $('dn-t').textContent=f(out);
  $('st-leg').innerHTML=ks.length?ks.map(k=>`<div class="leg"><i style="background:${COL[k]}"></i><span style="width:100px">${k}</span><span class="bar"><u style="width:${cats[k]/out*100}%;background:${COL[k]}"></u></span><b style="min-width:92px;text-align:right">${nf(cats[k])}</b></div>`).join(''):'<div class="muted small" style="padding:8px 0">Noch keine Ausgaben in diesem Zeitraum. Bezahle mal mit der Karte 💳</div>';
  $('st-in').textContent='+'+f(inc);$('st-out').textContent='−'+f(out);
  // Monatsbalken
  const mb=$('mb'),y=mb.getContext('2d'),W=680,H=320;y.clearRect(0,0,W,H);const n=new Date(),cur=n.getFullYear()*12+n.getMonth(),M=[];
  for(let i=5;i>=0;i--)M.push({m:cur-i,i:0,o:0});
  own().forEach(a=>a.tx.forEach(t=>{if(t.x)return;const d=new Date(t.ts),m=d.getFullYear()*12+d.getMonth(),e=M.find(z=>z.m===m);if(e){if(t.v<0)e.o+=-t.v;else e.i+=t.v}}));
  const mx=Math.max(1,...M.map(z=>Math.max(z.i,z.o))),bw=34,gap=(W-6*bw*2)/7;
  y.font='22px -apple-system,sans-serif';y.textAlign='center';
  M.forEach((z,k)=>{const x0=gap+k*(2*bw+gap),h1=z.i/mx*230,h2=z.o/mx*230;y.fillStyle='#6c6';y.fillRect(x0,260-h1,bw-2,h1);y.fillStyle='#e66';y.fillRect(x0+bw,260-h2,bw-2,h2);y.fillStyle='#8a8f9c';y.fillText(['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][z.m%12],x0+bw,295)});
}

/* ---------- Rendering ---------- */
function fillSel(id,list,fmt,sel){const el=$(id);if(!el)return;const v=el.value;el.innerHTML=list.map(a=>`<option value="${a.id}">${esc(fmt(a))}</option>`).join('');if(v&&list.some(a=>String(a.id)===v))el.value=v;else if(sel!=null&&list[sel])el.selectedIndex=sel}
const lab=a=>a.n+' · '+(a.type==='spar'?'Spar':'Giro')+' · '+f(a.b);
function renderTotals(){$('tot').textContent=f(tot(S));const dv=depVal();$('tot2').textContent=dv>0?'davon im Depot: '+f(dv):'';}
function renderAz(){const a=g($('ak').value);$('az').innerHTML=a?a.tx.slice(0,80).map(t=>`<tr><td>${esc(t.d)}<br>${esc(t.t)}${t.c&&!t.x&&t.v<0?' <span class="muted small">· '+esc(t.c)+'</span>':''}</td><td align="right" class="${t.v<0?'neg':'pos'}">${t.v>0?'+':''}${nf(t.v)}</td></tr>`).join(''):''}
function render(){
  if(!S)return;renderTotals();
  $('notes').innerHTML=NOTES.map((n,i)=>`<div class="note"><span class="x" onclick="NOTES.splice(${i},1);render()">✕</span>${n}</div>`).join('');
  $('accs').innerHTML=S.a.map(a=>{let sub='';if(a.type==='spar'&&a.b>0)sub=`<small>${nf(S.cfg.rate,1)} % p.a. · ca. +${f(a.b*S.cfg.rate/36500)} pro Tag</small>`;else if(a.type==='spar')sub=`<small>${nf(S.cfg.rate,1)} % Zinsen p.a.</small>`;
    return `<div class="acc"><span>${esc(a.n)}<span class="badge ${a.type==='spar'?'sp':''}">${a.type==='spar'?'Sparkonto':'Girokonto'}</span>${sub}</span><span class="gold">${f(a.b)}</span></div>`}).join('');
  fillSel('ak',S.a,a=>a.n);renderAz();
  fillSel('tf',S.a,lab,0);fillSel('tt',S.a,lab,1);
  fillSel('lk-from',own(),lab);fillSel('ck',S.a,a=>a.n);fillSel('c-acc',own(),a=>a.n);fillSel('sal-acc',own(),a=>a.n);fillSel('so-from',own(),lab);
  const sto=[...S.a.map(a=>({id:a.id,n:a.n+(a.own?'':' (extern)'),b:0,type:'giro'})),{id:'__ext',n:'Externer Empfänger …'}];
  fillSel('so-to',sto,a=>a.n,0);soToChg();
  if(!$('so-cat').options.length)$('so-cat').innerHTML=CATS.map(c=>`<option>${c}</option>`).join('');
  if(!$('p-cat').options.length)$('p-cat').innerHTML=CATS.filter(c=>c!=='Überweisung').map(c=>`<option>${c}</option>`).join('');
  $('c-acc').value=S.cfg.cardAcc;
  const ca=g(S.cfg.cardAcc);$('c-bal').textContent=ca?f(ca.b):'';
  $('c-num').textContent=S.cfg.card.num;$('c-name').textContent=S.cfg.name.toUpperCase();$('c-exp').textContent=S.cfg.card.exp;$('c-sig').textContent=S.cfg.name;$('c-cvv').textContent=S.cfg.card.cvv;
  document.querySelector('.wallet').classList.toggle('frz',!!S.cfg.frozen);$('c-frz').textContent=S.cfg.frozen?'🔓 Karte entsperren':'🔒 Karte sperren';
  $('so-list').innerHTML=S.so.length?S.so.map(o=>{const fr=g(o.from),to=o.to?g(o.to):null;return `<div class="acc"><span>${f(o.amt)} · jeden ${o.day}.<small>${esc(fr?fr.n:'?')} → ${esc(to?to.n:o.ext||'?')} · ${esc(o.cat)}${o.z?' · '+esc(o.z):''}${o.off?' · inaktiv':''}</small></span><button class="s" style="width:auto;padding:8px 12px" onclick="delSO('${o.id}')">✕</button></div>`}).join(''):'<div class="muted small" style="padding:8px 0">Keine Daueraufträge.</div>';
  const s=S.sal;$('sal-on').checked=s.on;$('sal-acc').value=s.acc;if(document.activeElement!==$('sal-amt'))$('sal-amt').value=s.amt;if(document.activeElement!==$('sal-day'))$('sal-day').value=s.day;
  $('sal-info').textContent=s.on?'Nächstes Gehalt: '+f(s.amt)+' am '+s.day+'. jedes Monats.':'Aus.';
  if(document.activeElement!==$('cf-name'))$('cf-name').value=S.cfg.name;if(document.activeElement!==$('cf-rate'))$('cf-rate').value=S.cfg.rate;
  renderOut();renderMarket();renderStat();drawChart();renderFid();
}
function drawChart(){const c=$('ch'),x=c.getContext('2d');c.width=c.clientWidth*2;c.height=240;x.clearRect(0,0,c.width,c.height);const h=S.h.length>1?S.h:[S.h[0]||0,S.h[0]||0],mx=Math.max(...h),mn=Math.min(...h),W=c.width;
  x.strokeStyle='#d4af37';x.lineWidth=4;x.beginPath();h.forEach((v,i)=>{const px=h.length>1?i*W/(h.length-1):W/2,py=220-(mx===mn?100:(v-mn)/(mx-mn)*200);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
function showTab(t){document.querySelectorAll('.tab').forEach(s=>s.hidden=s.id!=='t-'+t);document.querySelectorAll('#tabs a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));window.scrollTo(0,0);if(t==='home')drawChart();if(t==='stat')renderStat()}
document.querySelectorAll('#tabs a').forEach(a=>a.onclick=()=>showTab(a.dataset.t));
function openSheet(h){$('sheet-in').innerHTML=h;$('sheet').dataset.kind='';$('sheet').hidden=false}
function closeSheet(){$('sheet').hidden=true;$('sheet-in').innerHTML='';TR=null}
function cfSave(){const n=$('cf-name').value.trim(),r=+$('cf-rate').value;if(n)S.cfg.name=n.slice(0,26);if(r>=0&&r<=100)S.cfg.rate=r;sv();toast('Gespeichert ✓')}
function resetBank(){if(!confirm('Bank wirklich zurücksetzen? Alle Konten & das Depot werden gelöscht.'))return;if(!confirm('Wirklich sicher? Das kann nicht rückgängig gemacht werden.'))return;S=fresh();NOTES=[];persist();render();showTab('home')}
function bkExport(){copyTxt(JSON.stringify(S))}
function bkImport(){const t=prompt('Sicherung hier einfügen:');if(!t)return;try{const x=JSON.parse(t);if(!x.a||!x.a.length)throw 0;S=migrate(x);persist();render();toast('Sicherung eingespielt ✓')}catch(e){toast('Ungültige Sicherung',1)}}

/* ---------- PIN-Sperre ---------- */
let SEC=null;try{SEC=JSON.parse(localStorage.getItem('hb_sec')||'null')}catch(e){}
const saveSec=()=>localStorage.setItem('hb_sec',JSON.stringify(SEC));
async function hashPin(pin,salt){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pin));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return 'f'+fnv(salt+':'+pin)+fnv(pin+salt)}}
let PINREQ=null,PV='';
function dots(){document.querySelectorAll('#lk-dots i').forEach((e,i)=>e.classList.toggle('f',i<PV.length))}
function lkText(t,s){$('lk-t').textContent=t;$('lk-s').textContent=s||''}
function askPin(title,sub,o){o=o||{};return new Promise(res=>{PV='';dots();lkText(title,sub);$('lock').hidden=false;$('lk-x').hidden=!o.cancel;$('lk-forgot').hidden=!o.forgot;$('lk-face').style.visibility=o.face?'visible':'hidden';PINREQ={res};
  const d=$('lk-dots');if(sub&&/falsch|nicht gleich/i.test(sub)){d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake')}})}
function pk(k){if(!PINREQ||PV.length>=4)return;PV+=k;dots();if(PV.length===4){const r=PINREQ.res,v=PV;PINREQ=null;setTimeout(()=>{PV='';dots();r(v)},120)}}
function pkDel(){if(PINREQ){PV=PV.slice(0,-1);dots()}}
function pkCancel(){if(PINREQ){const r=PINREQ.res;PINREQ=null;r(null)}}
function pkForgot(){if(PINREQ){const r=PINREQ.res;PINREQ=null;r('FORGOT')}}
function pkFace(){if(PINREQ){const r=PINREQ.res;PINREQ=null;r('FACE')}}
async function setupPin(first,cancel){
  let err='';for(;;){
    const a=await askPin(first?'Willkommen! PIN festlegen':'Neue PIN',err||'Wähle eine 4-stellige PIN',{cancel});if(a===null)return false;
    const b=await askPin('PIN wiederholen','',{cancel});if(b===null)return false;
    if(a!==b){err='PINs nicht gleich – nochmal';continue}
    const salt=rid()+rid();SEC=Object.assign(SEC||{},{salt,hash:await hashPin(a,salt),fail:0,until:0});saveSec();return true}
}
async function verifyPin(p){return (await hashPin(p,SEC.salt))===SEC.hash}
async function unlockFlow(){
  LOCKED=true;stopTick();
  if(!SEC||!SEC.hash){await setupPin(true)}
  else{let err='',first=true;
    for(;;){
      while(SEC.until>Date.now()){$('lock').hidden=false;lkText('Zu viele Versuche','Bitte warte '+Math.ceil((SEC.until-Date.now())/1000)+' s');await sleep(500)}
      const faceP=first&&SEC.cred&&faceAvail;
      const pr=askPin('PIN eingeben',err,{face:!!SEC.cred,forgot:true});
      if(faceP)faceUnlock().then(ok=>{if(ok&&PINREQ){const r=PINREQ.res;PINREQ=null;r('FACEOK')}}).catch(()=>{});
      first=false;
      const p=await pr;
      if(p==='FACEOK')break;
      if(p==='FACE'){if(await faceUnlock())break;err='Face ID hat nicht geklappt';continue}
      if(p==='FORGOT'){if(forgot())return;continue}
      if(await verifyPin(p)){SEC.fail=0;saveSec();break}
      SEC.fail=(SEC.fail||0)+1;if(SEC.fail>=5)SEC.until=Date.now()+30000*Math.pow(2,Math.min(4,SEC.fail-5));saveSec();
      err='Falsche PIN'+(SEC.fail>=3?' ('+SEC.fail+'. Versuch)':'');
    }}
  $('lock').hidden=true;LOCKED=false;afterUnlock();
}
function forgot(){if(!confirm('PIN vergessen? Dann müssen die Bank-Daten (Konten, Depot, …) gelöscht werden. Fortfahren?'))return false;if(!confirm('Wirklich ALLES löschen und neu starten?'))return false;localStorage.removeItem('hb');localStorage.removeItem('hb_sec');location.reload();return true}
async function changePin(){const o=await askPin('Aktuelle PIN','',{cancel:true});if(o===null){$('lock').hidden=true;return}
  if(!(await verifyPin(o))){$('lock').hidden=true;return toast('Falsche PIN',1)}
  const ok=await setupPin(false,true);$('lock').hidden=true;if(ok)toast('PIN geändert ✓')}
function lockNow(){if(LOCKED)return;closeSheet();unlockFlow()}
/* Face ID (WebAuthn, nur lokal) */
let faceAvail=false;
if(window.PublicKeyCredential&&PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(v=>{faceAvail=!!v;if(S)renderFid()}).catch(()=>{});
const u8=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a)));
async function enableFace(){
  try{const ch=crypto.getRandomValues(new Uint8Array(32)),uid=crypto.getRandomValues(new Uint8Array(16));
    const c=await navigator.credentials.create({publicKey:{challenge:ch,rp:{name:'Habicht Private Bank',id:location.hostname},user:{id:uid,name:'habicht-user',displayName:S.cfg.name},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required'},timeout:60000}});
    SEC.cred=b64(c.rawId);saveSec();renderFid();toast('Face ID aktiviert ✓')}catch(e){toast('Face ID konnte nicht aktiviert werden',1)}}
async function faceUnlock(){try{const a=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:u8(SEC.cred)}],userVerification:'required',rpId:location.hostname,timeout:60000}});return !!a}catch(e){return false}}
function toggleFace(){if(SEC.cred){SEC.cred=null;saveSec();renderFid();toast('Face ID aus')}else enableFace()}
function renderFid(){const b=$('fid-btn');if(!b)return;b.hidden=!faceAvail&&!SEC.cred;b.textContent=SEC.cred?'Face ID deaktivieren':'Face ID aktivieren';$('fid-info').textContent=faceAvail||SEC.cred?'Face ID ersetzt die PIN beim Entsperren (die PIN bleibt als Ersatz).':'Face ID ist in diesem Browser nicht verfügbar – es gilt nur die PIN.'}

/* ---------- Start ---------- */
function stopTick(){clearInterval(tickT);tickT=null}
function afterUnlock(){
  processAll();render();showTab('home');
  stopTick();tickT=setInterval(liveTick,5000);
  if(pendingRedeem){const r=pendingRedeem;pendingRedeem=null;showTab('pay');openRedeem(r)}
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();if(S)persist();return}
  if(!LOCKED&&hiddenAt&&Date.now()-hiddenAt>20000)lockNow();
  else if(!LOCKED){processAll();render()}
});
window.addEventListener('pagehide',()=>{if(S)persist()});
setInterval(()=>{if(S&&!LOCKED&&!document.hidden)persist()},30000);
function readHash(){const h=location.hash;if(h.startsWith('#e=')){const r=parseToken(h);history.replaceState(null,'',location.pathname+location.search);if(r){pendingRedeem=r;if(!LOCKED){showTab('pay');openRedeem(r);pendingRedeem=null}}else toast('Ungültiger Link',1)}}
window.addEventListener('hashchange',readHash);
load();readHash();
if('serviceWorker'in navigator){const had=!!navigator.serviceWorker.controller;let rl=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!rl&&LOCKED){rl=true;location.reload()}});navigator.serviceWorker.register('sw.js').catch(()=>{})}
unlockFlow();
