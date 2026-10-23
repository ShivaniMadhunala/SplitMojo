const S=require('./split.js');
const txt=`JOE'S DINER
Burger 12.99
2 Fries 4.50
Caesar Salad 9.75
Iced Tea 3.25
Nachos 10.00
SUBTOTAL 40.49
TAX 3.59
TOTAL 44.08`;
const r=S.parseReceipt(txt);console.log(r);
const m=[{id:'a',name:'Ann'},{id:'b',name:'Bob'},{id:'c',name:'Cy'}];
const items=r.items.map((it,i)=>({...it,members:[['a'],['a','b'],['b'],['c'],['a','b','c']][i]}));
const out=S.computeSplit(items,m,r.tax,6.07);
out.people.forEach(p=>console.log(p.name,p.sub,p.tax,p.tip,p.total));
const sum=out.people.reduce((s,p)=>s+p.total,0);console.log('sum',sum,'grand',out.grand);
if(sum!==out.grand||out.itemSum!==4049) throw 'FAIL';
// fuzz
for(let k=0;k<2000;k++){const its=Array.from({length:1+Math.random()*8|0},()=>({name:'x',price:(Math.random()*50).toFixed(2),members:m.filter(()=>Math.random()<.6).map(x=>x.id)}));
 its[0].members=['a'];const o=S.computeSplit(its,m,(Math.random()*9).toFixed(2),(Math.random()*15).toFixed(2));
 if(o.people.reduce((s,p)=>s+p.total,0)!==o.grand) throw 'fuzz fail';}
console.log('ALL OK');
