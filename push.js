/* ==========================================================================
   push.js — 老師端：開教室 / 推題目 / 即時看答案
   MH⋯H ｜ Where Minds Bond @ TNGS
   與 app.js 解耦：名單直接讀 localStorage('rt_dashboard_v1')
   ========================================================================== */
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, collection, setDoc, updateDoc, deleteDoc,
         getDocs, onSnapshot, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db, DOMAIN, TEA_KEY, teachers, isTeacher } from './mhh-fb.js';

const LS_KEY = 'rt_dashboard_v1';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let TEA = null, ROOM = null, UNSUB = null, ANSWERS = {}, CURQ = null;

/* ---------- 本機名單 ---------- */
function localDB(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch(e){ return {}; }
}
function activeClass(){
  const d = localDB();
  return (d.classes && d.classes[d.activeClass]) || null;
}
/* 6 位數字代碼。原本是英數混合，但學生要在手機上手打 ——
   數字鍵盤快得多，也不會有 O/0、I/1 看錯的問題。 */
function roomCodeFor(classId){
  const k = 'mhh_room_' + classId;
  let c = localStorage.getItem(k);
  if(!c || !/^\d{6}$/.test(c)){
    c = String(Math.floor(100000 + Math.random() * 900000));
    localStorage.setItem(k, c);
  }
  return c;
}

/* 學生端網址前綴。手機連不到老師電腦的 localhost，
   所以要能改成區網 IP 或正式的 GitHub Pages 網址。 */
const BASE_KEY = 'mhh_base_url';
function baseUrl(){
  const saved = (localStorage.getItem(BASE_KEY) || '').trim();
  if(saved) return saved.replace(/\/*$/, '') + '/';
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}
function studentUrl(code){
  return baseUrl() + 'student.html?r=' + code;
}
function log(msg, bad){
  const el = $('#push-log'); if(!el) return;
  el.innerHTML = `<span style="color:${bad?'var(--danger)':'inherit'}">${esc(msg)}</span>`;
}

/* ---------- 登入 ---------- */
$('#btn-tea-login')?.addEventListener('click', async () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ hd: DOMAIN, prompt: 'select_account' });
  try { await signInWithPopup(auth, p); }
  catch(e){ log('登入失敗：' + e.code, true); }
});
$('#btn-tea-logout')?.addEventListener('click', () => signOut(auth));

const teaBox = $('#inp-teachers');
if(teaBox) teaBox.value = teachers().join('\n');
$('#btn-save-teachers')?.addEventListener('click', () => {
  const list = teaBox.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if(!list.length) return alert('名單不能全空 —— 至少留一個 email，否則你自己也進不來。');
  const bad = list.filter(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  if(bad.length) return alert('這幾筆看起來不是 email：\n' + bad.join('\n'));
  localStorage.setItem(TEA_KEY, JSON.stringify(list));
  alert(`已儲存 ${list.length} 位協作老師。\n\n` +
        `別忘了 Firestore 規則的 teacher() 也要加上同樣的 email，否則會 permission-denied。`);
});

onAuthStateChanged(auth, u => {
  const box = $('#push-main'), lg = $('#push-login');
  if(!u){ TEA = null; if(box) box.style.display='none'; if(lg) lg.style.display=''; return; }
  if(!isTeacher(u.email)){
    const names = teachers().map(t => '・' + t).join('\n');
    alert(`目前登入的是 ${u.email}，不在協作老師名單裡。\n\n` +
          `名單：\n${names}\n\n` +
          `如果這是你的另一個帳號，把它加進下面的「協作老師名單」再登入一次。\n` +
          `學生請改開 student.html。`);
    signOut(auth); return;
  }
  TEA = u;
  if(lg) lg.style.display='none';
  if(box) box.style.display='';
  $('#tea-who') && ($('#tea-who').textContent = `${u.displayName || ''}（${u.email}）`);
  refreshRoomBar();
});

/* ---------- 開教室 ---------- */
function refreshRoomBar(){
  const c = activeClass();
  if(!c){ log('請先在「名單與雲端」建立班級並匯入名單。', true); return; }
  const code = roomCodeFor(c.id);
  const url  = studentUrl(code);
  $('#room-code').textContent = code.replace(/(\d{3})(\d{3})/, '$1 $2');
  $('#room-url').value = url;
  $('#room-class').textContent = `${c.name}　${(c.students||[]).length} 人`;
  drawQR(url);
}

function drawQR(url){
  const cv = $('#room-qr');
  if(!cv || !window.MHHQR) return;
  try { window.MHHQR.toCanvas(cv, url, { scale: 4, margin: 3 }); }
  catch(e){ console.warn('QR 產生失敗', e); }
}

/* 投影用的大 QR：用 SVG 才不會放大糊掉 */
$('#btn-qr-big')?.addEventListener('click', () => {
  const url = $('#room-url').value;
  if(!url) return log('請先按「開啟教室」。', true);
  const code = ($('#room-code').textContent || '').trim();
  const svg = window.MHHQR.toSVG(url, { margin: 2 });
  const w = window.open('', '_blank');
  if(!w) return log('瀏覽器擋掉了新視窗，請允許彈出視窗後再按一次。', true);
  w.document.write(`<!DOCTYPE html><meta charset="utf-8">
    <title>掃碼進教室 ${code}</title>
    <body style="margin:0;height:100vh;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:18px;background:#fff;
      font:600 clamp(20px,4vw,42px)/1.4 'Noto Sans TC',sans-serif;color:#1a1d24">
      <div style="width:min(62vh,62vw)">${svg}</div>
      <div>教室代碼　<b style="letter-spacing:.14em;font-size:1.25em">${code}</b></div>
      <div style="font-size:.46em;color:#667;word-break:break-all;max-width:80vw;text-align:center">${url}</div>
    </body>`);
  w.document.close();
});

/* 網址前綴：改了就重畫 QR 與連結 */
const baseBox = $('#room-base');
if(baseBox){
  baseBox.value = localStorage.getItem(BASE_KEY) || '';
  baseBox.onchange = () => {
    const v = baseBox.value.trim();
    if(v && !/^https?:\/\//i.test(v))
      return alert('網址要以 http:// 或 https:// 開頭。');
    localStorage.setItem(BASE_KEY, v);
    refreshRoomBar();
    log(v ? ('學生網址前綴已設為 ' + v) : '已改回使用目前這台電腦的網址。');
  };
}

$('#btn-open-room')?.addEventListener('click', async () => {
  const c = activeClass();
  if(!c) return log('請先選擇班級。', true);
  const d = localDB();
  const code = roomCodeFor(c.id);
  try{
    await setDoc(doc(db,'rooms',code), {
      code, classId: c.id, className: c.name, year: d.year || '',
      teacherEmail: TEA.email, teacherUid: TEA.uid,
      roster: (c.students||[]).map(s => ({ no: Number(s.no), name: s.name || '' })),
      open: true, question: null, updatedAt: serverTimestamp()
    }, { merge:true });
    ROOM = code;
    listenRoom();
    refreshRoomBar();          // 之前漏了這行，所以代碼與 QR 一直沒出現
    log(`教室 ${code} 已開啟，名單 ${(c.students||[]).length} 人已推送。學生現在可以進入了。`);
  }catch(e){ log('開教室失敗：' + (e.code || e.message), true); }
});

$('#btn-copy-url')?.addEventListener('click', async () => {
  try{ await navigator.clipboard.writeText($('#room-url').value);
       log('連結已複製，可以貼到 Google Classroom。'); }
  catch(e){ $('#room-url').select(); log('請按 Ctrl+C 複製。'); }
});

/* ---------- 附圖：截圖貼上 / 拖放 / 選檔 ----------
   圖片轉成 dataURL 直接放進題目文件。Firestore 單一文件上限 1MB，
   所以超過 700KB 就自動等比縮到最長邊 1600px 再轉 JPEG。 */
let QIMG = null;

function setImg(dataUrl){
  QIMG = dataUrl;
  const prev=$('#q-imgprev'), empty=$('#q-imgempty'), x=$('#q-imgclear');
  if(dataUrl){ prev.src=dataUrl; prev.style.display='block';
               empty.style.display='none'; x.style.display='block'; }
  else       { prev.removeAttribute('src'); prev.style.display='none';
               empty.style.display='flex';  x.style.display='none'; }
}
function shrink(dataUrl){
  return new Promise(res=>{
    if(dataUrl.length < 700000) return res(dataUrl);
    const im=new Image();
    im.onload=()=>{
      const max=1600, sc=Math.min(1, max/Math.max(im.width,im.height));
      const cv=document.createElement('canvas');
      cv.width=Math.round(im.width*sc); cv.height=Math.round(im.height*sc);
      const cx=cv.getContext('2d');
      cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
      cx.drawImage(im,0,0,cv.width,cv.height);
      let out=cv.toDataURL('image/jpeg',.85);
      if(out.length>900000) out=cv.toDataURL('image/jpeg',.6);
      res(out);
    };
    im.onerror=()=>res(dataUrl);
    im.src=dataUrl;
  });
}
async function readImgFile(file){
  if(!file || !/^image\//.test(file.type)) return;
  const raw = await new Promise(r=>{ const fr=new FileReader();
    fr.onload=()=>r(fr.result); fr.readAsDataURL(file); });
  const out = await shrink(raw);
  if(out.length > 950000){ log('圖片太大，請先裁切或縮小再試。', true); return; }
  setImg(out);
  log('附圖已就緒（'+Math.round(out.length/1024)+' KB）。');
}

const drop=$('#q-imgdrop');
if(drop){
  drop.addEventListener('click', e=>{ if(e.target.id!=='q-imgclear') $('#q-imgfile').click(); });
  $('#q-imgfile').addEventListener('change', e=>readImgFile(e.target.files[0]));
  $('#q-imgclear').addEventListener('click', e=>{ e.stopPropagation(); setImg(null); });
  ['dragenter','dragover'].forEach(t=>drop.addEventListener(t, e=>{
    e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t=>drop.addEventListener(t, e=>{
    e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e=>readImgFile(e.dataTransfer.files[0]));
  /* 全域貼上：只要「推送題目」分頁開著，Ctrl+V 就收圖 */
  document.addEventListener('paste', e=>{
    const panel=document.getElementById('p-push');
    if(!panel || !panel.classList.contains('active')) return;
    const it=[...(e.clipboardData?.items||[])].find(i=>/^image\//.test(i.type));
    if(!it) return;
    e.preventDefault(); readImgFile(it.getAsFile());
  });
}

/* ---------- 推題目 ---------- */
$('#btn-push-q')?.addEventListener('click', async () => {
  if(!ROOM) return log('請先按「開啟教室」。', true);
  const type   = $('#q-type').value;
  const prompt = $('#q-prompt').value.trim();
  if(!prompt) return log('題目內容不能空白。', true);
  const q = {
    qid: 'q' + Date.now().toString(36),
    type, prompt,
    imageUrl: QIMG || $('#q-imgurl').value.trim() || null,
    linkUrl:  $('#q-linkurl').value.trim() || null,
    choices: type === 'choice'
      ? $('#q-choices').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean) : [],
    openAt: Date.now()
  };
  if(type === 'choice' && q.choices.length < 2)
    return log('選擇題至少要兩個選項（一行一個）。', true);
  try{
    await updateDoc(doc(db,'rooms',ROOM), { question: q, updatedAt: serverTimestamp() });
    /* 同時留一份到 questions/ ——
       rooms/{code}.question 只存「現在這一題」，推下一題就被蓋掉。
       歸檔時要把題目文字寫進試算表，沒有這一份就只剩題號，事後看不懂學生在答什麼。 */
    setDoc(doc(db,'rooms',ROOM,'questions',q.qid), q).catch(()=>{});
    CURQ = q; ANSWERS = {}; renderAnswers();
    log(`已推送「${prompt.slice(0,20)}${prompt.length>20?'…':''}」到 ${ROOM}。`);
  }catch(e){ log('推送失敗：' + (e.code || e.message), true); }
});

$('#btn-stop-q')?.addEventListener('click', async () => {
  if(!ROOM) return;
  await updateDoc(doc(db,'rooms',ROOM), { question: null }).catch(()=>{});
  CURQ = null; log('已收回題目，學生端回到等待畫面。');
});

/* ---------- 即時監看 ---------- */
function listenRoom(){
  if(UNSUB) UNSUB();
  const unsubA = onSnapshot(collection(db,'rooms',ROOM,'answers'), snap => {
    snap.docChanges().forEach(ch => {
      const d = ch.doc.data();
      if(ch.type === 'removed') delete ANSWERS[ch.doc.id];
      else ANSWERS[ch.doc.id] = d;
    });
    renderAnswers();
  });
  const unsubS = onSnapshot(collection(db,'rooms',ROOM,'seats'), snap => {
    const rows = [];
    snap.forEach(d => rows.push(d.data()));
    rows.sort((a,b) => a.no - b.no);
    $('#seat-bind').innerHTML = rows.length
      ? rows.map(r => `<div class="bindrow">
          <b>${r.no}</b><span>${esc(r.name || r.displayName || '')}</span>
          <small>${esc(r.email || '')}</small>
          <button class="btn btn-ghost mini-btn" data-release="${r.no}">解除</button>
        </div>`).join('')
      : '<p class="hint">還沒有人綁定座號。</p>';
  });
  UNSUB = () => { unsubA(); unsubS(); };
}

document.addEventListener('click', async ev => {
  const no = ev.target?.dataset?.release;
  if(!no || !ROOM) return;
  if(!confirm(`確定解除 ${no} 號的裝置綁定？\n解除後她可以重新選座號。`)) return;
  await deleteDoc(doc(db,'rooms',ROOM,'seats',String(no))).catch(e=>log(e.code,true));
});

function renderAnswers(){
  const list = Object.values(ANSWERS)
    .filter(a => !CURQ || a.qid === CURQ.qid)
    .sort((a,b) => a.no - b.no);
  $('#ans-count').textContent = list.length;
  const box = $('#ans-grid');
  if(!list.length){ box.innerHTML = '<p class="hint">還沒有人送出答案。</p>'; return; }
  box.innerHTML = list.map(a => `
    <div class="anscard" data-id="${a.qid}__${a.no}">
      <div class="anshead"><b>${a.no}</b> ${esc(a.name || a.displayName || '')}</div>
      ${a.drawing
        ? `<img src="${a.drawing}" alt="${esc(a.name)}的作圖">`
        : `<div class="anstext">${esc(a.text ?? a.number ?? '')}</div>`}
    </div>`).join('');
}

/* 點卡片放大看 */
document.addEventListener('click', ev => {
  const card = ev.target.closest?.('.anscard');
  if(!card) return;
  const a = ANSWERS[card.dataset.id]; if(!a) return;
  const m = $('#modal-ans');
  $('#modal-ans-title').textContent = `${a.no} 號　${a.name || a.displayName || ''}`;
  $('#modal-ans-body').innerHTML = a.drawing
    ? `<img src="${a.drawing}" style="width:100%;border-radius:10px;background:#fff">`
    : `<div style="font-size:1.6rem;line-height:1.8;white-space:pre-wrap">${esc(a.text ?? a.number ?? '')}</div>`;
  m.classList.add('show');
});
$('#modal-ans-close')?.addEventListener('click',
  () => $('#modal-ans').classList.remove('show'));

/* ==========================================================================
   歸檔到試算表
   架構原則：Firestore 是通道，試算表是真相。
   Firestore 這份是暫存，歸檔之後才可以清 —— 所以「清空」前面必須先有「歸檔」。
   ========================================================================== */

/* 依 payload 大小切塊。手繪圖是 base64，一張可以到 900KB，
   一次全送會超過 Apps Script 的請求上限，也容易逾時。 */
function chunkBySize(items, limitBytes){
  const out = []; let cur = [], size = 0;
  for(const it of items){
    const s = JSON.stringify(it).length;
    if(cur.length && size + s > limitBytes){ out.push(cur); cur = []; size = 0; }
    cur.push(it); size += s;
  }
  if(cur.length) out.push(cur);
  return out;
}

async function gasPost(payload){
  const d = localDB();
  if(!d.gasUrl) throw new Error('尚未設定 Apps Script 網址（到「設定」分頁的「② 雲端試算表」填）');
  const res = await fetch(d.gasUrl, {
    method:'POST', redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(Object.assign({ token: d.gasToken || '' }, payload))
  });
  const j = await res.json();
  if(j.status !== 'success') throw new Error(j.message || '伺服器回報錯誤');
  return j;
}

let ARCHIVED_OK = false;   // 這一輪有沒有成功歸檔過（清空鈕會看這個）

$('#btn-archive-ans')?.addEventListener('click', async () => {
  if(!ROOM) return log('還沒開啟教室。', true);
  const btn = $('#btn-archive-ans');
  const cls = activeClass();
  const d = localDB();

  btn.disabled = true; btn.textContent = '歸檔中…';
  try{
    /* 1. 抓齊這間教室的所有作答（不只現在這一題） */
    const snap = await getDocs(collection(db,'rooms',ROOM,'answers'));
    const all = snap.docs.map(x => x.data()).filter(a => a && a.qid);
    if(!all.length){ log('這間教室還沒有任何作答，不需要歸檔。'); return; }

    /* 2. 補上題目文字。questions/ 是 2026-08-24 才開始寫的，
          在那之前推過的題目查不到，prompt 會是空的 —— 這是已知的、不會回頭補的。 */
    const qmap = {};
    try{
      const qs = await getDocs(collection(db,'rooms',ROOM,'questions'));
      qs.forEach(x => { const q = x.data(); if(q && q.qid) qmap[q.qid] = q; });
    }catch(e){ /* 讀不到就算了，題目欄留空 */ }
    if(CURQ) qmap[CURQ.qid] = CURQ;

    const recs = all.map(a => ({
      qid: a.qid, no: a.no, name: a.name || a.displayName || '',
      email: a.email || '', type: a.type || '',
      prompt: (qmap[a.qid] && qmap[a.qid].prompt) || '',
      text: a.text !== undefined && a.text !== null ? String(a.text)
            : (a.number !== undefined && a.number !== null ? String(a.number) : ''),
      drawing: a.drawing || null,
      submittedAt: a.submittedAt && a.submittedAt.toDate
        ? a.submittedAt.toDate().toISOString() : ''
    }));

    const meta = {
      year: d.year || '', classId: d.activeClass || '',
      className: (cls && cls.name) || '', room: ROOM,
      session: new Date().toISOString().slice(0,10)
    };

    /* 3. 分批送。3MB 一批，圖多的班會切成好幾批。 */
    const batches = chunkBySize(recs, 3_000_000);
    let added = 0, updated = 0, drawings = 0;
    const allFailed = [];
    for(let i = 0; i < batches.length; i++){
      btn.textContent = `歸檔中… ${i+1}/${batches.length}`;
      const r = await gasPost({ action:'archiveAnswers', meta, data: batches[i] });
      added += r.added || 0; updated += r.updated || 0; drawings += r.drawings || 0;
      if(r.failed && r.failed.length) allFailed.push(...r.failed);
    }

    ARCHIVED_OK = true;
    let msg = `✅ 已歸檔到試算表：新增 ${added} 筆、更新 ${updated} 筆`;
    if(drawings) msg += `，手繪圖 ${drawings} 張存到雲端硬碟的「作答圖檔」資料夾`;
    if(allFailed.length) msg += `。⚠️ 座號 ${allFailed.join('/')} 的圖檔存檔失敗，文字已進去`;
    log(msg, allFailed.length > 0);
  }catch(e){
    ARCHIVED_OK = false;
    log('歸檔失敗：' + e.message + '（資料還在 Firestore，沒有遺失）', true);
  }finally{
    btn.disabled = false; btn.textContent = '📥 歸檔到試算表';
  }
});

/* ---------- 清空本題作答 ---------- */
$('#btn-clear-ans')?.addEventListener('click', async () => {
  if(!ROOM) return;
  /* 沒歸檔就清空 = 資料真的不見了。多攔一道。 */
  if(!ARCHIVED_OK && !confirm(
      '⚠️ 這一輪還沒有成功歸檔到試算表。\n\n' +
      '現在清空，這些作答就真的消失了，救不回來。\n' +
      '建議先按「📥 歸檔到試算表」。\n\n' +
      '還是要直接清空嗎？')) return;
  if(!confirm('確定清空這間教室的所有作答紀錄？\n（座號綁定會保留）')) return;
  const snap = await getDocs(collection(db,'rooms',ROOM,'answers'));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  ANSWERS = {}; ARCHIVED_OK = false; renderAnswers(); log('作答紀錄已清空。');
});

/* 切到本分頁時刷新 */
document.addEventListener('click', ev => {
  if(ev.target?.dataset?.panel === 'p-push' && TEA) refreshRoomBar();
});
