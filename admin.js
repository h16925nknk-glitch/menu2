import { db, storage, auth } from './firebase-client.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
const editor = document.getElementById('editor');
const status = document.getElementById('status');
const clone = x => JSON.parse(JSON.stringify(x));
const draftKey = 'boyorou-menu-admin-draft-v2';
const menuRef = doc(db, 'public', 'menu');
let loggedIn = false, initialized = false;
function notify(message) { status.textContent = message; }
function normalize(data) { return (Array.isArray(data) ? data : []).map((s,i) => ({id:s.id||`section-${i+1}`,title:s.title||'',description:s.description||'',items:(s.items||[]).map(x => Array.isArray(x)?{name:x[0]||'',meta:x[1]||'',price:x[2]||0,soldOut:false,hidden:false,image:''}:{name:x.name||'',meta:x.meta||'',price:x.price||0,soldOut:!!x.soldOut,hidden:!!x.hidden,image:x.image||''})})); }
const el = (tag,cls,text) => { const n=document.createElement(tag); if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; };
function itemView(item) {
 const node=document.getElementById('itemTemplate').content.firstElementChild.cloneNode(true);
 for(const [c,v] of [['item-name',item.name],['item-meta',item.meta],['item-price',item.price]]) node.querySelector('.'+c).value=v??'';
 node.querySelector('.item-soldout').checked=!!item.soldOut;
 node.querySelector('.item-hidden').checked=!!item.hidden;
 node.dataset.image=item.image||'';
 const preview=node.querySelector('.photo-preview');
 function updatePreview(){preview.hidden=!node.dataset.image;preview.removeAttribute('src');if(node.dataset.image)preview.src=node.dataset.image;}
 updatePreview();
 node.querySelector('.remove-photo').onclick=()=>{node.dataset.image='';node.querySelector('.item-photo-file').value='';updatePreview();};
 node.querySelector('.item-photo-file').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!loggedIn){notify('写真登録にはログインが必要です。');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notify('JPEG、PNG、WebPの画像を選んでください。iPhoneのHEIC写真はJPEGに変換してください。');return;}
  if(file.size>8*1024*1024){notify('写真は8MB以下にしてください。');return;}
  notify('写真をアップロードしています…');
  try {const path=`menu/${crypto.randomUUID()}.${file.type.split('/')[1]}`;const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type});node.dataset.image=await getDownloadURL(r);updatePreview();notify('写真をアップロードしました。「変更を更新」で公開してください。');}
  catch(err){console.error(err);notify('写真アップロード失敗：'+err.message+'（Storageの設定・権限を確認）');}
 };
 node.querySelector('.delete-item').onclick=()=>{if(confirm('この料理を削除しますか？'))node.remove();};
 return node;
}
function sectionView(section){
 const node=document.getElementById('sectionTemplate').content.firstElementChild.cloneNode(true);
 for(const [c,v] of [['section-title',section.title],['section-id',section.id],['section-description',section.description]])node.querySelector('.'+c).value=v||'';
 const root=node.querySelector('.items');(section.items||[]).forEach(i=>root.appendChild(itemView(i)));
 node.querySelector('.add-item').onclick=()=>root.appendChild(itemView({}));
 node.querySelector('.delete-section').onclick=()=>{if(confirm('このカテゴリーを削除しますか？'))node.remove();};
 return node;
}
function render(data){editor.replaceChildren(...normalize(data).map(sectionView));}
function collect(){return [...editor.querySelectorAll('.section-card')].map((s,i)=>({id:s.querySelector('.section-id').value.trim()||`section-${i+1}`,title:s.querySelector('.section-title').value.trim(),description:s.querySelector('.section-description').value.trim(),items:[...s.querySelectorAll('.item-editor')].map(n=>({name:n.querySelector('.item-name').value.trim(),meta:n.querySelector('.item-meta').value.trim(),price:Number(n.querySelector('.item-price').value)||0,soldOut:n.querySelector('.item-soldout').checked,hidden:n.querySelector('.item-hidden').checked,image:n.dataset.image||''}))}));}
async function loadPublished(){const snap=await getDoc(menuRef);return snap.exists()?normalize(snap.data().sections):normalize(clone(MENU_DATA));}
document.getElementById('loginBtn').onclick=async()=>{try{await signInWithEmailAndPassword(auth,document.getElementById('email').value,document.getElementById('password').value);document.getElementById('password').value='';}catch(e){notify('ログイン失敗：'+e.message);}};
document.getElementById('logoutBtn').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async user=>{loggedIn=!!user;document.getElementById('authStatus').textContent=user?'ログイン中：'+user.email:'未ログイン（編集内容は公開保存できません）';document.getElementById('saveBtn').disabled=!user;if(!initialized){initialized=true;try{render(await loadPublished());notify('メニューを読み込みました。');}catch(e){render(normalize(MENU_DATA));notify('公開データの読み込みに失敗しました：'+e.message);}}});
document.getElementById('saveBtn').onclick=async()=>{if(!loggedIn)return notify('先にログインしてください。');const b=document.getElementById('saveBtn');b.disabled=true;notify('公開メニューを更新しています…');try{await setDoc(menuRef,{sections:collect(),updatedAt:new Date().toISOString()});notify('公開メニューを更新しました。');}catch(e){console.error(e);notify('保存失敗：'+e.message);}finally{b.disabled=false;}};
document.getElementById('addSectionBtn').onclick=()=>editor.appendChild(sectionView({id:'',title:'',description:'',items:[]}));
document.getElementById('resetBtn').onclick=async()=>{if(!confirm('編集内容を破棄して公開中のメニューに戻しますか？'))return;try{render(await loadPublished());notify('公開中の内容に戻しました。');}catch(e){notify('読み込み失敗：'+e.message);}};
document.getElementById('downloadBtn').onclick=()=>{const blob=new Blob([`const MENU_DATA = ${JSON.stringify(collect(),null,2)};\n`],{type:'text/javascript'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='menu-data.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('バックアップをダウンロードしました。');};
render(normalize(MENU_DATA));
