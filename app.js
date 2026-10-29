import { db } from './firebase-client.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const menuRoot=document.getElementById('menu'),navRoot=document.getElementById('categoryNav');
const yen=new Intl.NumberFormat('en-US',{style:'currency',currency:'JPY',maximumFractionDigits:0});
function render(data){
 menuRoot.replaceChildren();navRoot.replaceChildren();
 for(const section of data){const items=(section.items||[]).map(x=>Array.isArray(x)?{name:x[0],meta:x[1],price:x[2]}:x).filter(x=>!x.hidden);if(!items.length)continue;
 const link=document.createElement('a');link.href='#'+section.id;link.textContent=section.title;navRoot.appendChild(link);
 const sec=document.createElement('section');sec.className='menu-section';sec.id=section.id;
 const head=document.createElement('div');head.className='section-head';const h=document.createElement('h2');h.textContent=section.title;head.appendChild(h);if(section.description){const p=document.createElement('p');p.textContent=section.description;head.appendChild(p);}sec.appendChild(head);
 for(const x of items){const article=document.createElement('article');article.className='item'+(x.soldOut?' is-sold-out':'');
 if(x.image){const img=document.createElement('img');img.className='item-photo';img.src=x.image;img.alt=x.name||'Menu photo';img.loading='lazy';article.appendChild(img);}
 const info=document.createElement('div');const name=document.createElement('div');name.className='item-name';name.textContent=x.name;info.appendChild(name);if(x.meta){const meta=document.createElement('div');meta.className='item-meta';meta.textContent=x.meta;info.appendChild(meta);}article.appendChild(info);
 const priceWrap=document.createElement('div');priceWrap.className='item-price-wrap';if(x.soldOut){const sold=document.createElement('span');sold.className='sold-out';sold.textContent='SOLD OUT';priceWrap.appendChild(sold);}const price=document.createElement('div');price.className='item-price';price.textContent=yen.format(Number(x.price)||0);priceWrap.appendChild(price);article.appendChild(priceWrap);sec.appendChild(article);
 }menuRoot.appendChild(sec);
 }}
render(MENU_DATA);
try{const snap=await getDoc(doc(db,'public','menu'));if(snap.exists()&&Array.isArray(snap.data().sections))render(snap.data().sections);}catch(e){console.error('Firebase menu read failed, showing bundled menu',e);}
