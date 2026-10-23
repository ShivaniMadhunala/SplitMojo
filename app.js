const $=s=>document.querySelector(s), app=$('#app'), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=c=>'$'+(c/100).toFixed(2), uid=()=>Math.random().toString(36).slice(2,9);
const LS={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
let groups=LS.get('sm_groups',[]);
let S=LS.get('sm_state',null)||{step:0,items:[],tax:'',tip:'',tipMode:'$',tipPct:'18',groupId:null,img:null,ocrNote:''};
const save=()=>{const {img,...rest}=S;LS.set('sm_state',rest);LS.set('sm_groups',groups)};
const group=()=>groups.find(g=>g.id===S.groupId);
const tipDollars=()=>S.tipMode==='%'?(Split.computeSplit(S.items.map(i=>({...i,members:['x']})),[{id:'x',name:''}],0,0).itemSum*(parseFloat(S.tipPct)||0)/10000).toFixed(2):S.tip;

function render(){
  document.querySelectorAll('#steps span').forEach((s,i)=>s.className=i===S.step?'on':'');
  $('#back').style.visibility=S.step?'visible':'hidden';
  $('#next').textContent=S.step===3?'New receipt':'Next';
  [scan,grp,assign,results][S.step]();save();window.scrollTo(0,0);
}
function scan(){
  const sum=S.items.reduce((s,i)=>s+Split.toC(i.price),0);
  app.innerHTML=`<div class="card"><h2>Scan receipt</h2>
  <label class="big">📷 Take or upload photo<input id="file" type="file" accept="image/*" capture="environment" class="hide"></label>
  <div id="ocr" class="muted" style="margin-top:8px">${esc(S.ocrNote)}</div><div class="prog hide" id="pg"><i></i></div>
  ${S.img?`<img class="prev" src="${S.img}">`:''}</div>
  <div class="card"><h2>Items</h2><div id="items">${S.items.map((it,i)=>`<div class="row"><input class="n" data-i="${i}" data-f="name" value="${esc(it.name)}" placeholder="Item">
  <input class="pr" data-i="${i}" data-f="price" inputmode="decimal" value="${esc(it.price)}" placeholder="0.00"><button class="x" data-del="${i}">✕</button></div>`).join('')}</div>
  <button id="add">+ Add item</button><p class="muted">Items subtotal: <b>${money(sum)}</b>${S.detSub!=null?` · receipt says $${(+S.detSub).toFixed(2)}`:''}</p></div>
  <div class="card"><h2>Tax & tip</h2><label class="muted">Tax ($)</label><input id="tax" inputmode="decimal" value="${esc(S.tax)}" placeholder="0.00">
  <label class="muted" style="display:block;margin-top:10px">Tip</label><div class="row"><select id="tm" style="max-width:80px"><option ${S.tipMode==='$'?'selected':''}>$</option><option ${S.tipMode==='%'?'selected':''}>%</option></select>
  <input id="tip" inputmode="decimal" value="${esc(S.tipMode==='%'?S.tipPct:S.tip)}" placeholder="${S.tipMode==='%'?'18':'0.00'}"></div>
  ${S.tipMode==='%'?`<p class="muted">= $${tipDollars()} (on items subtotal)</p>`:''}</div>`;
  $('#file').onchange=e=>e.target.files[0]&&ocr(e.target.files[0]);
  app.querySelectorAll('#items input').forEach(el=>el.oninput=()=>{S.items[el.dataset.i][el.dataset.f]=el.value;save()});
  app.querySelectorAll('#items input.pr').forEach(el=>el.onchange=render);
  app.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{S.items.splice(b.dataset.del,1);render()});
  $('#add').onclick=()=>{S.items.push({name:'',price:'',members:[]});render();const n=app.querySelectorAll('#items .n');n[n.length-1].focus()};
  $('#tax').oninput=e=>{S.tax=e.target.value;save()};
  $('#tip').oninput=e=>{S.tipMode==='%'?S.tipPct=e.target.value:S.tip=e.target.value;save()};$('#tip').onchange=render;
  $('#tm').onchange=e=>{S.tipMode=e.target.value;render()};
}
async function ocr(file){
  const pg=$('#pg'),bar=pg.firstChild,note=$('#ocr');pg.classList.remove('hide');note.textContent='Reading receipt… (first time downloads ~10MB OCR model)';
  try{
    const url=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(file)});
    const img=await shrink(url);S.img=img;
    const {data}=await Tesseract.recognize(img,'eng',{logger:m=>{if(m.status==='recognizing text')bar.style.width=(m.progress*100)+'%'}});
    const r=Split.parseReceipt(data.text);
    S.items=r.items.map(i=>({name:i.name,price:i.price.toFixed(2),members:[]}));
    if(r.tax!=null)S.tax=r.tax.toFixed(2); if(r.tip!=null){S.tipMode='$';S.tip=r.tip.toFixed(2)}
    S.detSub=r.subtotal;S.ocrNote=`Found ${r.items.length} items${r.tax!=null?', tax':''}${r.tip!=null?', tip':''}. Please double-check below.`;
  }catch(e){S.ocrNote='OCR failed: '+e.message+'. You can add items manually.'}
  render();
}
function shrink(url){return new Promise(r=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1800/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;
  const x=c.getContext('2d');x.filter='grayscale(1) contrast(1.4)';x.drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.85))};i.src=url})}
function grp(){
  app.innerHTML=`<div class="card"><h2>Choose group</h2>${groups.length?groups.map(g=>`<div class="row"><button class="chip ${g.id===S.groupId?'on':''}" style="flex:1;text-align:left" data-g="${g.id}">${esc(g.name)} <span style="opacity:.7;font-size:13px">· ${g.members.map(m=>esc(m.name)).join(', ')}</span></button><button class="x" data-dg="${g.id}">🗑</button></div>`).join(''):'<p class="muted">No groups yet.</p>'}</div>
  <div class="card"><h2>New group</h2><input id="gn" placeholder="Group name (e.g. Friday dinner)"><p class="muted">Members (one per line or comma-separated)</p>
  <textarea id="gm" rows="4" style="width:100%;font:inherit;padding:10px;border:1px solid #ddd;border-radius:10px" placeholder="Jenny, Sam, Alex"></textarea><button class="pri" id="cg" style="margin-top:8px;width:100%">Create group</button></div>
  ${group()?`<div class="card"><h2>Add member to ${esc(group().name)}</h2><div class="row"><input id="am" placeholder="Name"><button id="amb">Add</button></div></div>`:''}`;
  app.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{S.groupId=b.dataset.g;render()});
  app.querySelectorAll('[data-dg]').forEach(b=>b.onclick=()=>{if(confirm('Delete group?')){groups=groups.filter(g=>g.id!==b.dataset.dg);if(S.groupId===b.dataset.dg)S.groupId=null;render()}});
  $('#cg').onclick=()=>{const names=$('#gm').value.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);if(!names.length)return alert('Add at least one member');
    const g={id:uid(),name:$('#gn').value.trim()||'Group',members:names.map(n=>({id:uid(),name:n}))};groups.push(g);S.groupId=g.id;render()};
  const amb=$('#amb');if(amb)amb.onclick=()=>{const n=$('#am').value.trim();if(n){group().members.push({id:uid(),name:n});render()}};
}
function assign(){
  const g=group();
  app.innerHTML=`<div class="card"><h2>Who had what?</h2><p class="muted">Tap names. Shared items split evenly.</p>
  <button id="all" style="margin-bottom:6px">Unassigned → everyone</button></div>`+S.items.map((it,i)=>`<div class="card"><div class="row" style="margin:0"><b style="flex:1">${esc(it.name||'Item')}</b><span>${money(Split.toC(it.price))}</span></div>
  <div class="chips">${g.members.map(m=>`<button class="chip ${(it.members||[]).includes(m.id)?'on':''}" data-i="${i}" data-m="${m.id}">${esc(m.name)}</button>`).join('')}
  <button class="chip" data-every="${i}">All</button></div></div>`).join('');
  app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const it=S.items[b.dataset.i];it.members=it.members||[];const k=it.members.indexOf(b.dataset.m);k<0?it.members.push(b.dataset.m):it.members.splice(k,1);b.classList.toggle('on');save()});
  app.querySelectorAll('[data-every]').forEach(b=>b.onclick=()=>{const it=S.items[b.dataset.every];it.members=it.members?.length===g.members.length?[]:g.members.map(m=>m.id);render()});
  $('#all').onclick=()=>{S.items.forEach(it=>{if(!it.members?.some(id=>g.members.find(m=>m.id===id)))it.members=g.members.map(m=>m.id)});render()};
}
function calc(){return Split.computeSplit(S.items,group().members,S.tax,tipDollars())}
function asText(r){
  let t=`🧾 SplitMojo — ${group().name}\n`;
  r.people.forEach(p=>{if(!p.total)return;t+=`\n${p.name}: ${money(p.total)}\n`;p.items.forEach(i=>t+=`  • ${i.name}${i.n>1?` (1/${i.n} of ${money(i.price)})`:''}: ${money(i.share)}\n`);
    t+=`  Subtotal ${money(p.sub)} + tax ${money(p.tax)} + tip ${money(p.tip)}\n`});
  return t+`\nItems ${money(r.itemSum)} · Tax ${money(r.tax)} · Tip ${money(r.tip)}\nTOTAL ${money(r.grand)}`;
}
function results(){
  const r=calc();
  app.innerHTML=(r.unassigned?`<div class="warn">⚠️ ${money(r.unassigned)} of items are unassigned and not included. Go back to assign them.</div>`:'')+
  r.people.map(p=>`<div class="card"><div class="row"><h2 style="flex:1;margin:0">${esc(p.name)}</h2><span class="owe">${money(p.total)}</span></div>
  <table>${p.items.map(i=>`<tr><td>${esc(i.name)}${i.n>1?` <span class="muted">(1/${i.n} of ${money(i.price)})</span>`:''}</td><td>${money(i.share)}</td></tr>`).join('')||'<tr><td class="muted">No items</td><td></td></tr>'}
  <tr class="tot"><td>Subtotal</td><td>${money(p.sub)}</td></tr><tr><td>Tax share${r.itemSum?` (${(p.sub/r.itemSum*100).toFixed(1)}%)`:''}</td><td>${money(p.tax)}</td></tr><tr><td>Tip share</td><td>${money(p.tip)}</td></tr>
  <tr class="tot"><td>Total owed</td><td>${money(p.total)}</td></tr></table></div>`).join('')+
  `<div class="card"><h2>Grand total</h2><table><tr><td>Items</td><td>${money(r.itemSum)}</td></tr><tr><td>Tax</td><td>${money(r.tax)}</td></tr><tr><td>Tip</td><td>${money(r.tip)}</td></tr>
  <tr class="tot"><td>Total</td><td>${money(r.grand)}</td></tr></table><p class="muted">Shares add up to ${money(r.people.reduce((s,p)=>s+p.total,0))} ✓</p>
  <button class="pri" id="share" style="width:100%">Share / copy as text</button></div>`;
  $('#share').onclick=async()=>{const t=asText(r);if(navigator.share){try{await navigator.share({title:'SplitMojo',text:t});return}catch(e){if(e.name==='AbortError')return}}
    try{await navigator.clipboard.writeText(t);alert('Copied!')}catch{prompt('Copy:',t)}};
}
$('#back').onclick=()=>{S.step--;render()};
$('#next').onclick=()=>{
  if(S.step===0){S.items=S.items.filter(i=>i.name||i.price);if(!S.items.length)return alert('Add at least one item');}
  if(S.step===1&&!group())return alert('Pick or create a group');
  if(S.step===3){if(!confirm('Start a new receipt?'))return;S={step:0,items:[],tax:'',tip:'',tipMode:'$',tipPct:'18',groupId:S.groupId,img:null,ocrNote:''};return render()}
  S.step++;render()};
if(S.step>1&&!group())S.step=1;
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
