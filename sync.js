/* ==========================================================================
   sync.js — 儀表板資料的雲端自動同步
   MH⋯H ｜ Where Minds Bond @ TNGS

   為什麼要這個：教室桌機每天還原，localStorage 會整個消失 ——
   班級名單、座位表、加分與點名紀錄全部歸零。所以資料必須跟著帳號走。

   存哪裡：workspaces/mhh 底下（共用工作區，tngs 與 gmail 兩個帳號同一份）
     workspaces/mhh                     設定（學年度、GAS 網址金鑰、輪動方向…）
     workspaces/mhh/classes/{classId}   一個班一份（名單、座位）
     workspaces/mhh/chunks/{key}        紀錄，依「學年度__班級__年月」切塊

   為什麼要切塊：Firestore 單一文件上限 1MB。一整年的加分紀錄遠超過，
   切成「每班每月一塊」之後，每塊都只有幾十 KB，而且改哪個月只上傳那一塊。
   ========================================================================== */
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, collection, getDoc, getDocs, setDoc, deleteDoc, writeBatch }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db, WORKSPACE, isTeacher } from './mhh-fb.js';

const LS_KEY = 'rt_dashboard_v1';
const $ = s => document.querySelector(s);

let ME = null;
let pending = null;          // 防抖計時器
let lastPushed = '';         // 上次上傳的快照，一樣就不重複傳
let busy = false;

/* ---------- 讀寫本機 DB（和 app.js 共用同一把鑰匙） ---------- */
function localDB(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; }
  catch(e){ return null; }
}
function writeLocal(obj){
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function status(msg, kind){
  const el = $('#sync-cloud-log');
  if(el){
    el.textContent = msg;
    el.className = 'log' + (kind ? ' ' + kind : '');
  }
  const dot = $('#sync-dot');
  if(dot) dot.className = 'syncdot ' + (kind || 'ok');
}

/* ---------- 切塊的鍵：學年度__班級__年月 ---------- */
function chunkKey(r){
  const ym = String(r.session || '').slice(0, 7) || 'nodate';   // YYYY-MM
  const safe = s => String(s || '_').replace(/[/\\.#$[\]]/g, '-');
  return `${safe(r.year)}__${safe(r.classId)}__${safe(ym)}`;
}

/* ══════════ 上傳 ══════════ */
async function push(reason){
  const DB = localDB();
  if(!DB || !ME) return;
  const snapshot = JSON.stringify(DB);
  if(snapshot === lastPushed) return;          // 沒變就別浪費配額
  if(busy) return;
  busy = true;
  try{
    status('同步中…', 'busy');

    /* ① 設定（不含班級與紀錄，那兩塊另外放） */
    const { classes, records, ...settings } = DB;
    await setDoc(doc(db, 'workspaces', WORKSPACE), {
      ...settings,
      updatedAt: Date.now(),
      updatedBy: ME.email,
      device: navigator.userAgent.slice(0, 80)
    }, { merge: false });

    /* ② 班級：一班一份 */
    const batch1 = writeBatch(db);
    Object.values(classes || {}).forEach(c => {
      batch1.set(doc(db, 'workspaces', WORKSPACE, 'classes', c.id), c);
    });
    await batch1.commit();

    /* ③ 紀錄：切塊 */
    const buckets = {};
    (records || []).forEach(r => {
      const k = chunkKey(r);
      (buckets[k] = buckets[k] || []).push(r);
    });
    /* Firestore 一批最多 500 筆寫入，分批送 */
    const keys = Object.keys(buckets);
    for(let i = 0; i < keys.length; i += 400){
      const b = writeBatch(db);
      keys.slice(i, i + 400).forEach(k => {
        b.set(doc(db, 'workspaces', WORKSPACE, 'chunks', k),
              { key: k, items: buckets[k], n: buckets[k].length, updatedAt: Date.now() });
      });
      await b.commit();
    }

    /* ④ 清掉雲端多出來的塊（本機已刪的班級／月份） */
    const remote = await getDocs(collection(db, 'workspaces', WORKSPACE, 'chunks'));
    const dead = remote.docs.filter(d => !buckets[d.id]);
    if(dead.length){
      const b = writeBatch(db);
      dead.slice(0, 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
    const remoteC = await getDocs(collection(db, 'workspaces', WORKSPACE, 'classes'));
    const deadC = remoteC.docs.filter(d => !(classes || {})[d.id]);
    if(deadC.length){
      const b = writeBatch(db);
      deadC.slice(0, 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }

    lastPushed = snapshot;
    status(`已同步到雲端　${new Date().toLocaleTimeString()}　（${reason || '自動'}）`);
  }catch(e){
    status('同步失敗：' + (e.code || e.message) + '　資料仍安全存在本機。', 'bad');
    console.warn('[sync] push 失敗', e);
  }finally{ busy = false; }
}

/* ══════════ 下載 ══════════ */
async function pull(){
  if(!ME) return null;
  const head = await getDoc(doc(db, 'workspaces', WORKSPACE));
  if(!head.exists()) return null;
  const settings = head.data();

  const [cs, ch] = await Promise.all([
    getDocs(collection(db, 'workspaces', WORKSPACE, 'classes')),
    getDocs(collection(db, 'workspaces', WORKSPACE, 'chunks'))
  ]);
  const classes = {};
  cs.forEach(d => classes[d.id] = d.data());
  const records = [];
  ch.forEach(d => (d.data().items || []).forEach(r => records.push(r)));
  records.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));

  delete settings.updatedBy; delete settings.device;
  return { ...settings, classes, records };
}

function summarise(o){
  if(!o) return '（空的）';
  const nc = Object.keys(o.classes || {}).length;
  const nr = (o.records || []).length;
  const when = o.updatedAt ? new Date(o.updatedAt).toLocaleString() : '不明';
  return `${nc} 個班級、${nr} 筆紀錄（最後更新 ${when}）`;
}

/* ══════════ 登入後的第一次對帳 ══════════ */
async function reconcile(){
  const local = localDB();
  let cloud;
  try { cloud = await pull(); }
  catch(e){
    status('讀取雲端失敗：' + (e.code || e.message), 'bad');
    return;
  }

  const localEmpty = !local || (!Object.keys(local.classes || {}).length && !(local.records || []).length);
  const cloudEmpty = !cloud || (!Object.keys(cloud.classes || {}).length && !(cloud.records || []).length);

  if(cloudEmpty && localEmpty){ status('雲端與本機都是空的，開始建班級吧。'); return; }

  /* 本機空 → 直接拉回來。這正是「教室桌機還原後」的情境 */
  if(localEmpty && !cloudEmpty){
    writeLocal(cloud);
    lastPushed = JSON.stringify(cloud);
    status(`已從雲端還原：${summarise(cloud)}　重新整理後生效。`);
    if(confirm(`偵測到這台裝置沒有資料，雲端有：\n${summarise(cloud)}\n\n已下載完成，要現在重新整理套用嗎？`))
      location.reload();
    return;
  }

  /* 雲端空 → 把本機推上去 */
  if(cloudEmpty && !localEmpty){ await push('首次上傳'); return; }

  /* 兩邊都有 → 比對時間 */
  const lt = local.updatedAt || 0, ct = cloud.updatedAt || 0;
  if(JSON.stringify({...local, updatedAt:0}) === JSON.stringify({...cloud, updatedAt:0})){
    lastPushed = JSON.stringify(local);
    status('雲端與本機一致。'); return;
  }
  if(ct > lt){
    if(confirm(`雲端的資料比較新：\n雲端　${summarise(cloud)}\n本機　${summarise(local)}\n\n`+
               `要用雲端版本覆蓋這台裝置嗎？\n（取消＝保留本機，並在下次變更時上傳）`)){
      writeLocal(cloud); location.reload(); return;
    }
    status('保留本機版本。下次修改資料時會覆蓋雲端。', 'warn');
  }else{
    await push('本機較新');
  }
}

/* ══════════ 監看本機變動 → 自動上傳 ══════════ */
function watch(){
  /* app.js 每次改資料都會呼叫 save() → localStorage.setItem。
     包一層攔截，比每秒輪詢省。 */
  const orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k, v){
    orig(k, v);
    if(k === LS_KEY && ME){
      clearTimeout(pending);
      pending = setTimeout(() => push('自動'), 4000);   // 4 秒防抖，連點加分不會狂傳
    }
  };
  /* 關頁面前最後補一次 */
  addEventListener('beforeunload', () => { if(ME && localDB() && JSON.stringify(localDB())!==lastPushed) push('離開前'); });
}

/* ══════════ 啟動 ══════════ */
onAuthStateChanged(auth, async u => {
  const box = $('#cloud-box');
  if(!u || !isTeacher(u.email)){
    ME = null;
    if(box) box.style.display = 'none';
    return;
  }
  ME = u;
  if(box) box.style.display = '';
  $('#cloud-who') && ($('#cloud-who').textContent = u.email);
  await reconcile();
});
watch();

/* 手動按鈕 */
$('#btn-cloud-push')?.addEventListener('click', () => {
  if(!ME) return alert('請先在「📡 推送題目」分頁登入老師帳號。');
  lastPushed = ''; push('手動');
});
$('#btn-cloud-pull')?.addEventListener('click', async () => {
  if(!ME) return alert('請先在「📡 推送題目」分頁登入老師帳號。');
  const cloud = await pull().catch(e => { status('讀取失敗：'+(e.code||e.message),'bad'); return null; });
  if(!cloud) return alert('雲端目前沒有資料。');
  if(!confirm(`要用雲端版本覆蓋這台裝置嗎？\n\n雲端：${summarise(cloud)}\n\n`+
              `本機目前的資料會被取代（建議先按「⬇️ 匯出整包 JSON」）。`)) return;
  writeLocal(cloud); location.reload();
});
