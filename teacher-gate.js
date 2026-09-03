(function(){
  'use strict';
  const DB_KEY='rt_dashboard_v1';
  const GAS_SESSION_KEY='mhh_gas_token_session_v1';
  const UNLOCK_KEY='mhh_teacher_unlocked_v1';
  /* 預設 PIN 1111 的 SHA-256。這是共用電腦的第一道門，不是伺服器端身分驗證。 */
  const PIN_HASH='0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c';
  const scripts=[
    ['xlsx.js?v=13',false],['qrcode-generator.js?v=1',false],['qr-adapter.js?v=1',false],
    ['app.js?v=52',false],['cycle.js?v=46',false],['tools.js?v=7',false],
    ['seat-student-view.js?v=1',false],
    ['push.js?v=52',true],['sync.js?v=2',true]
  ];
  const gate=document.getElementById('teacher-gate');
  const form=document.getElementById('teacher-gate-form');
  const input=document.getElementById('teacher-pin');
  const submit=document.getElementById('teacher-gate-submit');
  const status=document.getElementById('teacher-gate-status');
  let loading=false, failures=0;
  function scrubPersistedGasToken(){
    try{
      const raw=localStorage.getItem(DB_KEY); if(!raw) return;
      const data=JSON.parse(raw);
      if(data&&data.gasToken){ data.gasToken=''; localStorage.setItem(DB_KEY,JSON.stringify(data)); }
    }catch(e){ console.warn('無法清除舊版永久金鑰',e); }
  }
  /* ★ 2026-09-03 修正：pagehide 不可以再刪 sessionStorage。
     pagehide 在 location.reload() 也會觸發，而 sync.js 從雲端還原資料
     正是用 reload 套用 —— 舊寫法會讓每一次「匯入雲端」都被踢回密碼欄。
     pagehide 只負責 scrub localStorage 裡的舊版永久金鑰（那才是要清的東西）；
     sessionStorage 本來就會跟著分頁一起消失，不需要在這裡動手。
     真的要上鎖走 window.mhhTeacherLock()。 */
  function scrubOnPagehide(){
    scrubPersistedGasToken();
  }
  function lockTeacher(){
    try{ sessionStorage.removeItem(GAS_SESSION_KEY); sessionStorage.removeItem(UNLOCK_KEY); }catch(e){}
    scrubPersistedGasToken();
    location.reload();
  }
  function addScript(src,module){
    return new Promise((resolve,reject)=>{
      const el=document.createElement('script'); el.src=src;
      if(module) el.type='module';
      el.onload=resolve; el.onerror=()=>reject(new Error('載入失敗：'+src));
      document.body.appendChild(el);
    });
  }
  async function loadDashboard(){
    if(loading) return; loading=true; submit.disabled=true; input.disabled=true;
    status.className='teacher-gate-status ok'; status.textContent='密碼正確，正在載入儀表板…';
    try{
      for(const [src,module] of scripts) await addScript(src,module);
      gate.hidden=true;
    }catch(e){
      loading=false; submit.disabled=false; input.disabled=false;
      status.className='teacher-gate-status'; status.textContent='儀表板載入失敗，請重新整理後再試。'; console.error(e);
    }
  }
  async function sha256(text){
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault(); if(loading) return;
    if(!window.crypto||!crypto.subtle){ status.textContent='瀏覽器不支援安全登入，請改用最新版 Chrome 或 Edge。'; return; }
    submit.disabled=true;
    const ok=await sha256(input.value)===PIN_HASH; input.value='';
    if(!ok){
      failures+=1; status.className='teacher-gate-status';
      status.textContent=failures>=5?'密碼錯誤次數過多，請 30 秒後再試。':'密碼錯誤，請再試一次。';
      input.disabled=failures>=5;
      if(failures>=5) setTimeout(()=>{ failures=0; input.disabled=false; submit.disabled=false; input.focus(); },30000);
      else{ submit.disabled=false; input.focus(); }
      return;
    }
    sessionStorage.setItem(UNLOCK_KEY,'1'); loadDashboard();
  });
  scrubPersistedGasToken();
  addEventListener('pagehide',scrubOnPagehide);
  window.mhhTeacherLock=lockTeacher;
  if(sessionStorage.getItem(UNLOCK_KEY)==='1') loadDashboard(); else input.focus();
})();
