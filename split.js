// Pure logic: parsing + split math (works in browser and Node)
(function(root){
const toC = v => Math.round((parseFloat(v)||0)*100);
function parseReceipt(text){
  const items=[]; let subtotal=null,tax=null,tip=null,total=null;
  const priceRe=/(-?\$?\s?\d{1,4}(?:[.,]\d{2}))\s*[A-Z]?\s*$/;
  for(let raw of text.split(/\n/)){
    const line=raw.trim(); if(!line) continue;
    const m=line.match(priceRe); if(!m) continue;
    const price=parseFloat(m[1].replace(/[$\s]/g,'').replace(',','.'));
    let name=line.slice(0,m.index).replace(/[.\-:_*]+$/,'').replace(/^\d+\s*[xX@]?\s+/,'').trim();
    const low=name.toLowerCase();
    if(/sub\s*-?\s*total/.test(low)){subtotal=price;continue;}
    if(/\b(tax|vat|gst|hst)\b/.test(low)){tax=(tax||0)+price;continue;}
    if(/\b(tip|gratuity|service)\b/.test(low)){tip=price;continue;}
    if(/total|balance|amount due|change|cash|visa|mastercard|amex|card|payment/.test(low)){if(/total/.test(low)&&total==null)total=price;continue;}
    if(!name||name.length<2) name='Item';
    items.push({name,price});
  }
  return {items,subtotal,tax,tip,total};
}
// items:[{name,price,members:[ids]}], members:[{id,name}], tax, tip (dollars)
function computeSplit(items,members,tax,tip){
  const per={}; members.forEach(m=>per[m.id]={id:m.id,name:m.name,items:[],sub:0,tax:0,tip:0,total:0});
  let itemSum=0;
  for(const it of items){
    const c=toC(it.price); const ms=(it.members||[]).filter(id=>per[id]); if(!ms.length) continue;
    itemSum+=c; const base=Math.floor(c/ms.length); let rem=c-base*ms.length;
    // deterministic penny spread
    ms.forEach(id=>{const s=base+(rem>0?1:0); if(rem>0)rem--; per[id].items.push({name:it.name,price:c,share:s,n:ms.length}); per[id].sub+=s;});
  }
  const alloc=(amt,key)=>{ const ids=Object.keys(per); if(!itemSum||!ids.length) return;
    const raw=ids.map(id=>({id,v:amt*per[id].sub/itemSum})); let used=0;
    raw.forEach(r=>{r.f=Math.floor(r.v);used+=r.f;});
    let left=amt-used; raw.sort((a,b)=>(b.v-b.f)-(a.v-a.f));
    for(let i=0;left>0;i=(i+1)%raw.length){raw[i].f++;left--;}
    raw.forEach(r=>per[r.id][key]=r.f); };
  const taxC=toC(tax),tipC=toC(tip); alloc(taxC,'tax'); alloc(tipC,'tip');
  const people=Object.values(per); people.forEach(p=>p.total=p.sub+p.tax+p.tip);
  const unassigned=items.filter(it=>!(it.members||[]).some(id=>per[id])).reduce((s,it)=>s+toC(it.price),0);
  return {people,itemSum,tax:taxC,tip:tipC,grand:itemSum+taxC+tipC,unassigned};
}
const api={parseReceipt,computeSplit,toC};
if(typeof module!=='undefined') module.exports=api; else root.Split=api;
})(this);
