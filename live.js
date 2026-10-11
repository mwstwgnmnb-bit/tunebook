// Synchronisation de la méta Grand Race avec le tableur MilitiaGaming (TCM - Leaderboards)
(function(){
const SHEET='1Z6HD_0Xf6YqMY6ZXP7L5IxKIQmQY2Nh_mx8qMvorUZE';
const TABS={st1:'Street 1',st2:'Street 2',hyp:'Hypercar',rac:'Racing',ral:'Rally',rr:'Rally Raid',mx:'Motocross',dft:'Drift',agp:'Alpha GP',pl:'Plane'};
const KEY='tunebook-live';
const LABELS={'all around':'aa','all around/gutters':'aag','gutters':'gut','gutters/city':'gutc','gutter heavy':'gh','highways':'hw','highway only':'hwo','technical only':'tech','top speed only':'ts','top speed':'ts','high speed turns':'hst','off road/sand':'or','water routes only':'wat','viable/gutters':'vg','viable':'v'};

function parseCSV(t){const rows=[];let row=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===','){row.push(f);f=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}
    else f+=c}
  if(f!==''||row.length){row.push(f);rows.push(row)}
  return rows}
const TIME=/^\d{1,2}:\d{2}\.\d{2,3}$/;
const normTime=s=>{s=(s||'').trim();return TIME.test(s)?s.replace(/^0(\d):/,'$1:'):''};
const normSpeed=s=>(s||'').replace(/\*/g,'').replace(/slip/ig,'').replace(/nos/ig,'').replace(/\s*\/\s*/,' / ').replace(/\s+/g,' ').trim();
function normDate(s){const m=(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return '';const y=+m[3];if(y<2023||y>2100)return '';return m[2].padStart(2,'0')+'/'+m[1].padStart(2,'0')+'/'+y}
function labelKey(raw){const k=raw.trim().toLowerCase().replace(/\s+/g,' ');if(LABELS[k])return LABELS[k];const id='x:'+k;if(!L[id])L[id]=[raw.trim(),/viable/.test(k)?'via':'spec'];return id}

function toEntry(cat,rows){
  const hi=rows.findIndex(r=>r.some(c=>/gr meta/i.test(c)));if(hi<0)return null;
  const h=rows[hi].map(x=>x.trim().toLowerCase());
  const col=re=>h.findIndex(x=>re.test(x));
  const cM=col(/gr meta/),cY=col(/^year/),cB=col(/^brand/),cMo=col(/^model/),cS=col(/top speed/),cD=col(/date|test/);
  if(cM<0||cMo<0)return null;
  const data=rows.slice(hi+1);
  let cT=col(/^average/);
  if(cT<0){for(let j=Math.max(cS,cMo)+1;j<h.length;j++){if(data.some(r=>TIME.test((r[j]||'').trim()))){cT=j;break}}}
  const route=cT<0?'':(/^average/.test(h[cT])?'moyenne des tracés de test':rows[hi][cT].trim());
  const top=[];
  for(const r of data){const lab=(r[cM]||'').trim();const model=(r[cMo]||'').trim();if(!lab||!model)continue;
    const y=(cY>=0?r[cY]:'').trim(),b=(cB>=0?r[cB]:'').trim();
    top.push([(b?b+' ':'')+model+(/^\d{4}$/.test(y)?' ('+y+')':''),labelKey(lab),cT>=0?normTime(r[cT]):'',cS>=0?normSpeed(r[cS]):'',cD>=0?normDate(r[cD]):''])}
  return top.length?{cat,src:'live',route,top,more:[]}:null}

function apply(data){let n=0;for(const cat in data){const i=META.findIndex(m=>m.cat===cat);const e=data[cat];
  // re-crée les libellés inconnus
  e.top.forEach(c=>{if(!L[c[1]]&&c[1].startsWith('x:'))L[c[1]]=[c[1].slice(2),'spec']});
  if(i>=0)META[i]=e;else META.push(e);n++}
  if(n){renderCats();renderMetas();renderList()}return n}

const box=document.getElementById('live'),msg=document.getElementById('live-msg'),btn=document.getElementById('live-btn');
box.hidden=false;
const fmt=t=>new Date(t).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
let cached=null;try{cached=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
if(cached&&cached.data){apply(cached.data);msg.textContent='Méta du '+fmt(cached.t)+'. Synchronisation…'}else msg.textContent='Synchronisation avec le tableur…';

async function sync(){btn.disabled=true;
  const res=await Promise.allSettled(Object.entries(TABS).map(async([cat,name])=>{
    const r=await fetch(`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}&_=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error(r.status);return [cat,toEntry(cat,parseCSV(await r.text()))]}));
  const data={};res.forEach(x=>{if(x.status==='fulfilled'&&x.value[1])data[x.value[0]]=x.value[1]});
  const n=Object.keys(data).length;
  if(n){apply(data);const t=Date.now();try{localStorage.setItem(KEY,JSON.stringify({t,data}))}catch(e){}
    msg.textContent=`Méta synchronisée avec le tableur MilitiaGaming le ${fmt(t)} (${n} classes).`}
  else msg.textContent=cached?`Pas de connexion au tableur. Méta du ${fmt(cached.t)}.`:'Pas de connexion au tableur. Méta intégrée à l\'app (11/10/2026).';
  btn.disabled=false}
btn.addEventListener('click',sync);
sync();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){let c=null;try{c=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}if(!c||Date.now()-c.t>6*3600e3)sync()}});
window.__tb={parseCSV,toEntry};
})();
