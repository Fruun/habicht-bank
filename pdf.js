'use strict';
/* Kontoauszug als PDF – lokal erzeugt mit jsPDF (MIT-Lizenz, mitgeliefert) */
let PDF=null;
function loadScript(src){return new Promise((res,rej)=>{if(window.jspdf)return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('lib'));document.head.appendChild(s)})}
const ptx=s=>String(s==null?'':s).replace(/[^\x20-\x7E\u00A0-\u00FF]/g,'').replace(/\s+/g,' ').trim();
const MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function pdfPeriods(a){
  const now=new Date(),cur=now.getFullYear()*12+now.getMonth(),set=new Set([cur,cur-1]);a.tx.forEach(t=>{const d=new Date(t.ts);set.add(d.getFullYear()*12+d.getMonth())});
  const ms=[...set].sort((x,y)=>y-x).slice(0,18);
  return [...ms.map(m=>({v:'m'+m,l:MON[m%12]+' '+Math.floor(m/12)+(m===cur?' (laufend)':'')})),{v:'q',l:'Letzte 3 Monate'},{v:'all',l:'Gesamter Zeitraum'},{v:'c',l:'Eigener Zeitraum …'}]}
function pdfRange(v,fromS,toS){
  if(v[0]==='m'){const m=+v.slice(1),a=new Date(Math.floor(m/12),m%12,1),b=new Date(Math.floor(m/12),m%12+1,1);return [a.getTime(),b.getTime(),MON[m%12]+' '+Math.floor(m/12)]}
  if(v==='q'){const n=new Date(),a=new Date(n.getFullYear(),n.getMonth()-2,1);return [a.getTime(),Date.now()+1,'Letzte 3 Monate']}
  if(v==='c'){const a=fromS?new Date(fromS+'T00:00:00').getTime():0,b=toS?new Date(toS+'T00:00:00').getTime()+864e5:Date.now()+1;return [a,b,(fromS?new Date(fromS).toLocaleDateString('de-DE'):'Beginn')+' - '+(toS?new Date(toS).toLocaleDateString('de-DE'):'heute')]}
  return [0,Date.now()+1,'Gesamter Zeitraum']}
function openPdfSheet(id){
  const accs=S.a.filter(a=>a.own);if(!accs.length)return;
  const sel=id&&g(id)&&g(id).own?id:accs[0].id;PDF=null;
  openSheet(`<h3>📄 Kontoauszug als PDF</h3><div class="muted small">Wird direkt auf deinem iPhone erzeugt – es wird nichts hochgeladen.</div>
  <select id="pf-acc" onchange="pdfPerFill()">${accs.map(a=>`<option value="${a.id}"${String(a.id)===String(sel)?' selected':''}>${esc(a.n)} (${a.type==='spar'?'Sparkonto':'Girokonto'})</option>`).join('')}</select>
  <select id="pf-per" onchange="pdfPerChg()"></select>
  <div class="row" id="pf-c" hidden><input id="pf-from" type="date"><input id="pf-to" type="date"></div>
  <button onclick="pdfBuild()">PDF erstellen</button><div id="pf-res"></div><button class="s" onclick="closeSheet()">Schließen</button>`);
  pdfPerFill()}
function pdfPerFill(){const a=g($('pf-acc').value);if(!a)return;$('pf-per').innerHTML=pdfPeriods(a).map(p=>`<option value="${p.v}">${p.l}</option>`).join('');pdfPerChg()}
function pdfPerChg(){$('pf-c').hidden=$('pf-per').value!=='c';$('pf-res').innerHTML='';PDF=null}
function accNo(a){let h=fnv(String(a.id)+'hb'),n=''+(parseInt(h,36)%1e10);n=n.padStart(10,'0');return 'HB'+(10+parseInt(fnv(n),36)%89)+' HABI '+n.slice(0,4)+' '+n.slice(4,8)+' '+n.slice(8)}
async function pdfBuild(){
  const a=g($('pf-acc').value);if(!a)return;const per=$('pf-per').value,[t0,t1,label]=pdfRange(per,$('pf-from').value,$('pf-to').value);
  $('pf-res').innerHTML='<div class="muted small" style="padding:8px 0">Erstelle PDF …</div>';
  try{await loadScript('jspdf.min.js')}catch(e){$('pf-res').innerHTML='';return toast('PDF-Bibliothek nicht geladen (offline?)',1)}
  try{
    const blob=makeStatement(a,t0,t1,label);PDF={blob,name:'Kontoauszug_'+ptx(a.n).replace(/[^A-Za-z0-9]+/g,'_')+'_'+ptx(label).replace(/[^A-Za-z0-9]+/g,'_')+'.pdf'};
    bump('pdf');xp(10);persist();checkAch();
    PDF.url=URL.createObjectURL(blob);
    $('pf-res').innerHTML=`<div class="note">✅ Kontoauszug fertig (${Math.max(1,Math.round(blob.size/1024))} KB)</div>
    <button onclick="pdfShare()">📤 Teilen / Speichern …</button>
    <a class="btnlink" href="${PDF.url}" target="_blank">👁 Öffnen</a>
    <a class="btnlink" href="${PDF.url}" download="${PDF.name}">⬇️ Herunterladen</a>
    <div class="muted small">Tipp: Im Teilen-Menü „In Dateien sichern“ wählen.</div>`;
  }catch(e){console.error(e);$('pf-res').innerHTML='';toast('PDF konnte nicht erstellt werden',1)}
}
async function pdfShare(){
  if(!PDF)return;const file=new File([PDF.blob],PDF.name,{type:'application/pdf'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Kontoauszug Habicht Private Bank'});return}}
  catch(e){if(e&&e.name==='AbortError')return}
  const l=document.createElement('a');l.href=PDF.url;l.download=PDF.name;document.body.appendChild(l);l.click();l.remove();toast('Teilen nicht möglich – PDF wird heruntergeladen')}
function makeStatement(a,t0,t1,label){
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),W=210,H=297,M=14,GOLD=[212,175,55],DARK=[11,13,18];
  const fmtN=v=>(v<0?'-':'')+nf(Math.abs(v)),fd=ts=>new Date(ts).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
  // Salden chronologisch
  const all=a.tx.slice().reverse(),sumAll=all.reduce((x,t)=>x+t.v,0);let run=r2(a.b-sumAll);const rows=[];let open=null;
  all.forEach(t=>{if(t.ts<t0){run=r2(run+t.v);return}if(open===null)open=run;run=r2(run+t.v);if(t.ts<t1)rows.push({t,bal:run})});
  if(open===null)open=run;
  let inc=0,out=0;rows.forEach(r=>{if(r.t.v>=0)inc+=r.t.v;else out+=-r.t.v});inc=r2(inc);out=r2(out);
  const endBal=rows.length?rows[rows.length-1].bal:open;
  const logo=(x,y,r)=>{doc.setFillColor(...GOLD);doc.circle(x,y,r,'F');doc.setFillColor(240,215,120);doc.circle(x,y,r*0.82,'F');doc.setFillColor(...GOLD);doc.circle(x,y,r*0.72,'F');doc.setTextColor(...DARK);doc.setFont('times','bold');doc.setFontSize(r*2.1*2.83*0.62);doc.text('H',x,y+r*0.34,{align:'center'})};
  const header=first=>{
    if(first){doc.setFillColor(...DARK);doc.rect(0,0,W,40,'F');doc.setFillColor(...GOLD);doc.rect(0,40,W,1.2,'F');logo(M+9,20,8.5);
      doc.setTextColor(...GOLD);doc.setFont('times','bold');doc.setFontSize(21);doc.text('Habicht Private Bank',M+22,19);
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(170,175,185);doc.text('Kontoauszug  |  Spielgeld (HB$) - kein echtes Geld',M+22,26);
      doc.setTextColor(...GOLD);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('KONTOAUSZUG',W-M,19,{align:'right'});
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(200,200,205);doc.text(ptx(label),W-M,26,{align:'right'})}
    else{doc.setFillColor(...DARK);doc.rect(0,0,W,16,'F');doc.setFillColor(...GOLD);doc.rect(0,16,W,.8,'F');logo(M+4,8,3.6);doc.setTextColor(...GOLD);doc.setFont('times','bold');doc.setFontSize(12);doc.text('Habicht Private Bank',M+11,9.5);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(200,200,205);doc.text(ptx(a.n)+'  |  '+ptx(label),W-M,9.5,{align:'right'})}};
  const COLS={d:M,x:M+27,v:W-M-30,b:W-M},tableHead=y=>{doc.setFillColor(28,31,40);doc.rect(M,y,W-2*M,7,'F');doc.setTextColor(...GOLD);doc.setFont('helvetica','bold');doc.setFontSize(8.5);
    doc.text('DATUM',COLS.d+1.5,y+4.8);doc.text('BUCHUNGSTEXT',COLS.x,y+4.8);doc.text('BETRAG',COLS.v,y+4.8,{align:'right'});doc.text('SALDO',COLS.b-1.5,y+4.8,{align:'right'});return y+7};
  header(true);let y=52;
  doc.setTextColor(60,60,70);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('KONTOINHABER',M,y);doc.text('KONTO',M+70,y);doc.text('KONTONUMMER',M+130,y);
  doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(20,20,25);
  doc.text(ptx(S.cfg.name),M,y+5.5);doc.text(ptx(a.n)+' ('+(a.type==='spar'?'Sparkonto':'Girokonto')+')',M+70,y+5.5);doc.text(accNo(a),M+130,y+5.5);
  doc.setFontSize(8);doc.setTextColor(110,110,120);doc.text('Erstellt am '+new Date().toLocaleString('de-DE')+'  |  Zeitraum: '+ptx(label),M,y+11.5);
  y+=18;
  const bw=(W-2*M-9)/4,boxes=[['Anfangssaldo',fmtN(open),0],['Einnahmen','+'+nf(inc),1],['Ausgaben','-'+nf(out),2],['Endsaldo',fmtN(endBal),3]];
  boxes.forEach((b,i)=>{const x=M+i*(bw+3);doc.setFillColor(i===3?245:248,i===3?238:248,i===3?212:248);doc.setDrawColor(...GOLD);doc.setLineWidth(i===3?.6:.2);doc.roundedRect(x,y,bw,17,2,2,'FD');
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(110,110,120);doc.text(b[0],x+3,y+5.5);doc.setFont('helvetica','bold');doc.setFontSize(11);
    doc.setTextColor(...(i===1?[40,140,60]:i===2?[200,60,60]:[20,20,25]));doc.text(b[1],x+3,y+12.5);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(140,140,150);doc.text('HB$',x+bw-3,y+12.5,{align:'right'})});
  y+=24;y=tableHead(y);
  if(!rows.length){doc.setFont('helvetica','italic');doc.setFontSize(10);doc.setTextColor(120,120,130);doc.text('Keine Buchungen in diesem Zeitraum.',M+2,y+8);y+=12}
  const xw=COLS.v-COLS.x-30;
  rows.forEach((r,i)=>{
    doc.setFont('helvetica','normal');doc.setFontSize(9);const ls=doc.splitTextToSize(ptx(r.t.t),xw),h=Math.max(6.5,ls.length*4+2.5);
    if(y+h>H-18){doc.addPage();header(false);y=24;y=tableHead(y)}
    if(i%2===0){doc.setFillColor(248,247,242);doc.rect(M,y,W-2*M,h,'F')}
    doc.setTextColor(90,90,100);doc.setFontSize(8);doc.text(fd(r.t.ts),COLS.d+1.5,y+4.4);
    doc.setTextColor(25,25,30);doc.setFontSize(9);doc.text(ls,COLS.x,y+4.4);
    doc.setFont('helvetica','bold');doc.setTextColor(...(r.t.v<0?[200,60,60]:[40,140,60]));doc.text((r.t.v>0?'+':r.t.v<0?'-':'')+nf(Math.abs(r.t.v)),COLS.v,y+4.4,{align:'right'});
    doc.setFont('helvetica','normal');doc.setTextColor(60,60,70);doc.text(fmtN(r.bal),COLS.b-1.5,y+4.4,{align:'right'});
    doc.setDrawColor(228,226,216);doc.setLineWidth(.1);doc.line(M,y+h,W-M,y+h);y+=h});
  if(y+14>H-18){doc.addPage();header(false);y=24}
  y+=3;doc.setFillColor(...DARK);doc.rect(M,y,W-2*M,9,'F');doc.setTextColor(...GOLD);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('ENDSALDO',M+2,y+6);doc.text(fmtN(endBal)+' HB$',W-M-2,y+6,{align:'right'});
  y+=15;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(120,120,130);doc.text(rows.length+' Buchung'+(rows.length===1?'':'en')+' im Zeitraum.',M,y);
  const n=doc.getNumberOfPages();for(let p=1;p<=n;p++){doc.setPage(p);doc.setDrawColor(...GOLD);doc.setLineWidth(.3);doc.line(M,H-13,W-M,H-13);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(120,120,130);
    doc.text('Habicht Private Bank  |  Nur Spielgeld - dieses Dokument hat keinen realen Wert.',M,H-8);doc.text('Seite '+p+' von '+n,W-M,H-8,{align:'right'})}
  doc.setProperties({title:'Kontoauszug '+ptx(a.n)+' '+ptx(label),author:'Habicht Private Bank',subject:'Spielgeld-Kontoauszug'});
  return doc.output('blob')}
