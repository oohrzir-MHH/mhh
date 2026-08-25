/* ==========================================================================
   mhh-fb.js — 共用的 Firebase 連線層
   MH⋯H ｜ Where Minds Bond @ TNGS

   push.js 和 sync.js 都要用 Firebase。initializeApp 對同一個名稱只能呼叫一次，
   所以統一從這裡拿，誰先載入都不會撞。
   ========================================================================== */
import { initializeApp, getApps, getApp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export const CFG = {
  apiKey: "AIzaSyB21eHdFPd9W5o0Xa9EFvJEAk8Wsuzfzbw",
  authDomain: "mhh-tngs.firebaseapp.com",
  projectId: "mhh-tngs",
  storageBucket: "mhh-tngs.firebasestorage.app",
  messagingSenderId: "471690787859",
  appId: "1:471690787859:web:37fa09bcd09a54032013e6"
};

export const DOMAIN = 'tngs.tn.edu.tw';

/* 共用工作區 —— 兩個帳號看同一份資料。
   學校桌機用 tngs、家裡用 gmail，班級名單與紀錄都是同一份。 */
export const WORKSPACE = 'mhh';

export const TEA_KEY = 'mhh_teachers';
export const DEFAULT_TEACHERS = ['oohrzir@tngs.tn.edu.tw', 'oohrzir@gmail.com'];

/* 協作老師名單（介面層閘門；真正擋人的是 Firestore 規則，兩邊都要加） */
export function teachers(){
  try{
    const list = JSON.parse(localStorage.getItem(TEA_KEY) || 'null');
    if(Array.isArray(list) && list.length) return list;
  }catch(e){}
  return DEFAULT_TEACHERS;
}
export function isTeacher(email){
  const e = String(email || '').toLowerCase();
  return teachers().some(t => t.toLowerCase() === e);
}

const app = getApps().length ? getApp() : initializeApp(CFG);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
