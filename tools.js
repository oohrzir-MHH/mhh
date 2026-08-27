/* ==========================================================================
   tools.js — 右側浮動工具列（跨所有分頁常駐）
   MH⋯H ｜ Where Minds Bond @ TNGS

   四件事，上課中隨時可用，切到哪個分頁都在：
     ⏱  倒數計時（三段警示音，Web Audio 合成，不需要音檔）
     🔔 節次提醒（下課前 10／5 分鐘，說法輪替）
     ✏️  螢幕註記（畫筆／螢光筆／矩形／橢圓／箭頭，蓋在整個畫面上）
     ⚡  快速跳到座位表 / 課堂互動

   刻意寫成傳統 script（不是 module）—— 就算哪天有人雙擊 file:// 開檔，
   這一層還是能動。
   ========================================================================== */
(function(){
'use strict';

/* ---------- 節次表（台南女中作息） ---------- */
const PERIODS = [
  { name:'晨間活動', s:'07:40', e:'08:00' },
  { name:'第一節',   s:'08:10', e:'09:00' },
  { name:'第二節',   s:'09:10', e:'10:00' },
  { name:'第三節',   s:'10:10', e:'11:00' },
  { name:'第四節',   s:'11:10', e:'12:00' },
  { name:'午休',     s:'12:00', e:'13:20' },
  { name:'第五節',   s:'13:20', e:'14:10' },
  { name:'第六節',   s:'14:25', e:'15:15' },
  { name:'第七節',   s:'15:20', e:'16:10' },
  { name:'第八節',   s:'16:20', e:'17:10' }
];

/* 下課前提醒的說法，每次輪替，免得聽到麻痺 */
const SAY_10 = [
  '還有 10 分鐘 —— 現在是把話收攏的時候，不是開新話題的時候。',
  '10 分鐘。讓還沒開口的那幾個人先講。',
  '剩 10 分鐘，各組確認一下：你們的主張，證據撐得住嗎？',
  '10 分鐘倒數。老師，記得留時間讓學生自己說結論。',
  '還有 10 分鐘，可以開始收尾了。'
];
const SAY_5 = [
  '5 分鐘！該收尾了 —— 今天的結論是什麼？',
  '剩 5 分鐘。點名、加分紀錄記得存檔。',
  '5 分鐘。學生開始收東西了，講重點就好。',
  '最後 5 分鐘，留給「所以我們今天知道了什麼」。',
  '5 分鐘 —— 老師該下課了。'
];

const LS = 'mhh_tools_v1';
let CFG = { remind:true, level:'medium', lastNotified:'',
            pos:null,        // 工具列被拖到哪 {x,y}；null＝維持預設的右側置中
            mini:false };    // 是否收合成小點
try { Object.assign(CFG, JSON.parse(localStorage.getItem(LS)||'{}')); } catch(e){}
const saveCfg = () => localStorage.setItem(LS, JSON.stringify(CFG));

const $  = s => document.querySelector(s);
const el = (t,c,h) => { const d=document.createElement(t);
  if(c) d.className=c; if(h!=null) d.innerHTML=h; return d; };
const pad = n => String(n).padStart(2,'0');
const hm2min = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
const nowMin = () => { const d=new Date(); return d.getHours()*60+d.getMinutes(); };

/* ══════════ 音效：Web Audio 合成，不依賴任何檔案 ══════════ */
let AC = null;
function ac(){ if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
               if(AC.state==='suspended') AC.resume(); return AC; }
function beep(freq, dur, when, vol, type){
  const c=ac(), o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.value=freq;
  const t0=c.currentTime+(when||0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol==null?.25:vol, t0+.012);
  g.gain.exponentialRampToValueAtTime(.0001, t0+dur);
  o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0+dur+.02);
}
/* 三段強度：簡單一聲 / 中等三聲 / 強烈警報 */
function alarm(level){
  try{
    if(level==='simple'){ beep(880,.28,0,.22); }
    else if(level==='strong'){
      for(let i=0;i<6;i++){                       // 高低交替的警報聲，約 4 秒
        beep(1046,.16,i*.62,.34,'square');
        beep( 784,.16,i*.62+.2,.34,'square');
        beep(1318,.22,i*.62+.4,.30,'square');
      }
    }
    else { [0,.34,.68].forEach((t,i)=>beep(i===2?1046:880,.24,t,.26)); }
  }catch(e){ console.warn('音效播放失敗',e); }
}
/* 提醒用的柔和提示音 —— 不要用警報，會嚇到全班 */
function chime(){ try{ beep(660,.3,0,.16); beep(880,.42,.22,.14); }catch(e){} }

/* ══════════ 節次判斷 ══════════ */
function currentPeriod(){
  const n=nowMin();
  for(const p of PERIODS){
    const s=hm2min(p.s), e=hm2min(p.e);
    if(n>=s && n<e) return { p, left:e-n, total:e-s };
  }
  return null;
}
function nextPeriod(){
  const n=nowMin();
  return PERIODS.find(p=>hm2min(p.s)>n) || null;
}

/* ══════════ 介面骨架 ══════════ */
const rail = el('div','mhh-rail');
rail.innerHTML = `
  <div class="mhh-grip" id="mhh-grip" title="按住這裡可以把工具列拖到別的地方">
    <span class="mhh-grip-dots"></span>
    <button class="mhh-mini" id="mhh-pip" title="浮出成獨立小窗，可蓋在 PowerPoint 等其他程式上面">⧉</button>
    <button class="mhh-mini" id="mhh-mini" title="縮成小點">－</button>
  </div>
  <button class="mhh-rbtn" data-open="timer" title="倒數計時">⏱<i>計時</i></button>
  <button class="mhh-rbtn" data-open="period" title="節次與下課提醒">🔔<i>節次</i></button>
  <button class="mhh-rbtn" id="mhh-ink" title="在螢幕上畫記（Esc 離開）">✏️<i>畫記</i></button>
  <button class="mhh-rbtn" data-go="p-seat" title="跳到座位表">🪑<i>座位</i></button>
  <button class="mhh-rbtn" data-go="p-live" title="跳到課堂互動加分">⚡<i>加分</i></button>
  <button class="mhh-rbtn" data-go="p-task" title="跳到職位工作，推上投影幕">📋<i>工作</i></button>
  <div class="mhh-clock" id="mhh-clock">--:--</div>`;
document.body.appendChild(rail);

/* 收合後顯示的小點。獨立一顆元素，不是把 rail 縮小 ——
   這樣 rail 裡面的計時器、節次提醒都還活著（收合只是不顯示，不是停掉）。 */
const dot = el('button','mhh-dot','🌈');
dot.id='mhh-dot'; dot.title='展開課堂工具列';
document.body.appendChild(dot);

/* 計時器面板 */
const pTimer = el('div','mhh-pop', `
  <h4>⏱ 倒數計時</h4>
  <div class="mhh-big" id="mhh-tdisp">00:00</div>
  <div class="mhh-quick">
    ${[1,2,3,5,10,15].map(m=>`<button data-min="${m}">${m} 分</button>`).join('')}
  </div>
  <div class="mhh-row">
    <input type="number" id="mhh-tcustom" min="1" max="120" placeholder="自訂分鐘">
    <button class="mhh-b" id="mhh-tset">設定</button>
  </div>
  <div class="mhh-row">
    <button class="mhh-b pri" id="mhh-tgo">開始</button>
    <button class="mhh-b" id="mhh-tpause">暫停</button>
    <button class="mhh-b" id="mhh-treset">歸零</button>
  </div>
  <label class="mhh-lab">結束提示音
    <select id="mhh-level">
      <option value="simple">簡單（一聲）</option>
      <option value="medium">中等（三聲）</option>
      <option value="strong">強烈（警報）</option>
    </select>
  </label>
  <button class="mhh-b tiny" id="mhh-ttest">試聽</button>
  <p class="mhh-note">時間到會全螢幕閃紅提示，切到別的分頁一樣會響。</p>`);
pTimer.id='mhh-pop-timer'; document.body.appendChild(pTimer);

/* 節次面板 */
const pPeriod = el('div','mhh-pop', `
  <h4>🔔 節次與下課提醒</h4>
  <div class="mhh-now" id="mhh-now">—</div>
  <label class="mhh-chk"><input type="checkbox" id="mhh-remind"> 下課前 10／5 分鐘自動提醒</label>
  <p class="mhh-note">提醒的說法每次不一樣，避免聽久了沒感覺。<br>
    只要這個網頁還開著就會運作，切到哪個分頁都一樣。</p>
  <div class="mhh-sched" id="mhh-sched"></div>`);
pPeriod.id='mhh-pop-period'; document.body.appendChild(pPeriod);

/* 畫記工具列 + 畫布 */
const inkWrap = el('div','mhh-ink-wrap');
inkWrap.innerHTML = `<canvas id="mhh-ink-cv"></canvas>
  <div class="mhh-ink-bar">
    <span class="mhh-ink-cols"></span>
    <button data-tool="pen"  class="on">✏️ 筆</button>
    <button data-tool="mark">🖍️ 螢光</button>
    <button data-tool="rect">▭ 方框</button>
    <button data-tool="ell"> ◯ 圈選</button>
    <button data-tool="arrow">➜ 箭頭</button>
    <button id="mhh-ink-undo">↩︎ 復原</button>
    <button id="mhh-ink-clear">🧹 清除</button>
    <button id="mhh-ink-exit" class="exit">✕ 離開（Esc）</button>
  </div>`;
document.body.appendChild(inkWrap);

/* 提醒橫幅 */
const banner = el('div','mhh-banner'); document.body.appendChild(banner);
let bannerT=null;
function showBanner(text, kind){
  banner.className='mhh-banner show'+(kind?' '+kind:'');
  banner.innerHTML=`<span>${text}</span><button title="關閉">✕</button>`;
  banner.querySelector('button').onclick=()=>banner.classList.remove('show');
  clearTimeout(bannerT); bannerT=setTimeout(()=>banner.classList.remove('show'), 15000);
}

/* ══════════ 位置：拖曳移動 ＋ 收合成小點 ══════════ */

/* 把座標夾在畫面內。教室投影機解析度和老師筆電常常不一樣，
   上次拖到右下角，換一台螢幕就跑到畫面外再也點不到 —— 所以每次套用都夾一次。 */
function clampPos(x, y, w, h){
  const m = 4;
  return { x: Math.max(m, Math.min(x, innerWidth  - w - m)),
           y: Math.max(m, Math.min(y, innerHeight - h - m)) };
}

/* 把 CFG.pos 套到畫面上。pos 為 null 就用 CSS 的預設（右側置中）。 */
function applyPos(){
  if(inPip()) return;            /* 小窗裡位置由瀏覽器管，別再套 left/top */
  const target = CFG.mini ? dot : rail;
  [rail, dot].forEach(elm=>{
    elm.style.left=''; elm.style.top=''; elm.style.right=''; elm.style.transform='';
  });
  if(!CFG.pos){ [rail,dot].forEach(e=>e.classList.remove('mhh-moved')); return; }
  [rail,dot].forEach(e=>e.classList.add('mhh-moved'));
  const r = target.getBoundingClientRect();
  const p = clampPos(CFG.pos.x, CFG.pos.y, r.width||56, r.height||56);
  [rail, dot].forEach(elm=>{
    elm.style.left = p.x+'px'; elm.style.top = p.y+'px';
    elm.style.right='auto';    elm.style.transform='none';
  });
  CFG.pos = p;
}

/* 面板要跟著工具列跑，否則工具列拖到左邊、面板還飄在右邊。 */
function placePops(){
  if(inPip()) return;            /* 小窗裡面板是靜態排版，不必算座標 */
  const r = rail.getBoundingClientRect();
  const rightSide = r.left > innerWidth/2;   // 工具列在畫面右半邊 → 面板開在它左邊
  document.querySelectorAll('.mhh-pop').forEach(p=>{
    if(!CFG.pos){ p.style.left=''; p.style.top=''; p.style.right=''; p.style.transform=''; return; }
    const pw = p.offsetWidth || 280, ph = p.offsetHeight || 260;
    let x = rightSide ? r.left - pw - 10 : r.right + 10;
    let y = r.top + r.height/2 - ph/2;
    const c = clampPos(x, y, pw, ph);
    p.style.left=c.x+'px'; p.style.top=c.y+'px';
    p.style.right='auto';  p.style.transform='none';
  });
}

function applyMini(){
  if(inPip()){ rail.style.display='flex'; dot.style.display='none'; return; }
  /* .mhh-dot 在 CSS 裡預設就是 display:none，所以展開時要明寫 'flex'
     —— 用 '' 會落回 CSS 的 none，小點永遠不會出現。 */
  rail.style.display = CFG.mini ? 'none' : 'flex';
  dot.style.display  = CFG.mini ? 'flex' : 'none';
  if(CFG.mini) closeAll();
  applyPos();
}

/* 拖曳。用 Pointer Events 而不是原生 HTML5 drag —— 觸控螢幕上原生拖曳
   完全不作用，教室若是觸控電視就永遠拖不動。門檻 4px，免得單純按一下小點
   被誤判成拖曳、結果點不開。 */
function makeDraggable(handle, mover){
  handle.addEventListener('pointerdown', ev=>{
    if(ev.button!==undefined && ev.button!==0) return;
    /* 把手裡面還住著「縮成小點」那顆按鈕。不擋掉的話，按它會先被這裡接走並
       setPointerCapture，click 事件就被吞掉 —— 按鈕永遠沒反應。
       （2026-08-25 使用者回報「可以移動但不能縮小」就是這個。）

       ★ 但要排除「把手自己就是一顆按鈕」的情況 —— 收合後的小點正是如此。
         只寫 closest('button') 會連小點自己的拖曳一起擋掉，
         症狀是「縮成小點後就固定在那裡動不了」。 */
    if(ev.target !== handle && ev.target.closest && ev.target.closest('button')) return;
    const r = mover.getBoundingClientRect();
    const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
    let moved = false;
    try{ handle.setPointerCapture(ev.pointerId); }catch(e){}

    const onMove = e=>{
      if(!moved){
        if(Math.abs(e.clientX-ev.clientX)<4 && Math.abs(e.clientY-ev.clientY)<4) return;
        moved = true; rail.classList.add('mhh-dragging'); dot.classList.add('mhh-dragging');
      }
      e.preventDefault();
      const rr = mover.getBoundingClientRect();
      CFG.pos = clampPos(e.clientX-dx, e.clientY-dy, rr.width, rr.height);
      applyPos(); placePops();
    };
    const onUp = ()=>{
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      try{ handle.releasePointerCapture(ev.pointerId); }catch(e){}
      rail.classList.remove('mhh-dragging'); dot.classList.remove('mhh-dragging');
      if(moved){ saveCfg(); handle._dragged = true; setTimeout(()=>handle._dragged=false, 0); }
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });
}

/* ══════════ 浮出成獨立小窗（Document Picture-in-Picture）══════════

   使用者要的是「切到其他視窗，工具列還在最上面」。
   **一般網頁做不到這件事** —— 瀏覽器不允許網頁內容蓋在其他應用程式上面，
   否則任何網站都能遮住你的銀行視窗。這是安全邊界，不是可以繞過的限制。

   唯一的正解是 Document Picture-in-Picture：瀏覽器開一個「真的置頂」的
   小視窗，我們把工具列整個搬進去。切到 PowerPoint、Word、其他分頁，
   它都還浮在上面，關掉才消失。Chrome / Edge 116+ 支援。

   ★ 為什麼是「搬移節點」而不是「在小窗重建一份」：
     搬移之後，所有事件處理器仍然是主視窗那份程式的閉包，
     裡面的 document 指的還是主視窗 —— 所以「跳到座位表」「螢幕註記」
     這些作用在主畫面的功能，從浮動小窗按下去照樣有效。
     重建一份就要把整套邏輯再接一次線，而且兩邊遲早漂移。 */

let pipWin = null;
const inPip = () => !!pipWin;

/* PiP 視窗是全新的 document，一行 CSS 都沒有，要自己把樣式搬過去。 */
function copyStylesTo(win){
  [...document.styleSheets].forEach(sheet=>{
    try{
      const css = [...sheet.cssRules].map(r=>r.cssText).join('\n');
      const st = win.document.createElement('style');
      st.textContent = css;
      win.document.head.appendChild(st);
    }catch(e){
      /* 跨網域樣式表讀不到 cssRules，改用 link 重新載入 */
      if(sheet.href){
        const l = win.document.createElement('link');
        l.rel = 'stylesheet'; l.href = sheet.href;
        win.document.head.appendChild(l);
      }
    }
  });
}

async function openPip(){
  if(!('documentPictureInPicture' in window)){
    alert('這個瀏覽器不支援浮動小窗。\n\n'
        + '需要 Chrome 或 Edge 116 以上版本。\n\n'
        + '（一般網頁沒辦法蓋在其他程式上面，那是瀏覽器的安全限制；'
        + '這個功能是官方唯一開的門。）');
    return;
  }
  if(pipWin){ try{ pipWin.focus(); }catch(e){} return; }

  try{
    pipWin = await documentPictureInPicture.requestWindow({ width:300, height:470 });
  }catch(e){
    alert('開啟浮動小窗失敗：' + (e && e.message ? e.message : e));
    pipWin = null; return;
  }

  copyStylesTo(pipWin);
  const d = pipWin.document;
  d.documentElement.setAttribute('data-theme',
    document.documentElement.getAttribute('data-theme') || 'dark');
  d.title = 'MH⋯H 課堂工具';
  d.body.className = 'mhh-pip-body';

  /* 浮出時一定是展開狀態；小點留在主視窗沒有意義 */
  CFG.mini = false; saveCfg();
  rail.style.display = 'flex';
  dot.style.display  = 'none';
  /* 清掉拖曳留下的絕對定位 —— 小窗裡位置由瀏覽器管 */
  [rail, dot].forEach(e=>{
    e.style.left=''; e.style.top=''; e.style.right=''; e.style.transform='';
    e.classList.remove('mhh-moved');
  });

  d.body.appendChild(rail);
  d.body.appendChild(pTimer);
  d.body.appendChild(pPeriod);

  /* 使用者關掉小窗（或瀏覽器收回）→ 把東西搬回主畫面 */
  pipWin.addEventListener('pagehide', restoreFromPip);

  closeAll();
  toast('工具列已浮出，現在它會蓋在其他程式上面');
}

function restoreFromPip(){
  if(!pipWin) return;
  pipWin = null;
  document.body.appendChild(rail);
  document.body.appendChild(pTimer);
  document.body.appendChild(pPeriod);
  applyMini(); applyPos(); placePops();
}

/* ══════════ 開合 ══════════ */
function closeAll(){ document.querySelectorAll('.mhh-pop').forEach(p=>p.classList.remove('show'));
  rail.querySelectorAll('[data-open]').forEach(b=>b.classList.remove('on')); }
rail.querySelectorAll('[data-open]').forEach(b=>{
  b.onclick=()=>{
    const t=b.dataset.open, pop=$('#mhh-pop-'+t), was=pop.classList.contains('show');
    closeAll();
    if(!was){ pop.classList.add('show'); b.classList.add('on');
      if(t==='period') renderSched(); }
  };
});
rail.querySelectorAll('[data-go]').forEach(b=>{
  b.onclick=()=>{ const tab=document.querySelector(`.tab[data-panel="${b.dataset.go}"]`);
    if(tab){ tab.click(); window.scrollTo({top:0,behavior:'smooth'}); } };
});
document.addEventListener('click', e=>{
  if(e.target.closest('.mhh-pop')||e.target.closest('.mhh-rail')) return;
  closeAll();
});

/* 面板開了之後要重新定位。
   直接同步呼叫，不要包 requestAnimationFrame —— 面板隱藏時是 opacity:0
   而不是 display:none，尺寸隨時量得到；而且視窗在背景時 rAF 會被瀏覽器
   節流甚至完全不觸發，面板就會停在上一次的位置。 */
rail.querySelectorAll('[data-open]').forEach(b=>{
  b.addEventListener('click', placePops);
});

$('#mhh-pip').onclick = e=>{ e.stopPropagation(); openPip(); };

$('#mhh-mini').onclick = e=>{
  e.stopPropagation();
  CFG.mini = true; saveCfg(); applyMini();
};
dot.onclick = ()=>{
  if(dot._dragged) return;              // 剛剛是在拖曳，不要順便展開
  CFG.mini = false; saveCfg(); applyMini();
};

makeDraggable($('#mhh-grip'), rail);
makeDraggable(dot, dot);

/* 視窗大小改變（投影機接上、切換解析度）要把工具列拉回畫面內 */
addEventListener('resize', ()=>{ applyPos(); placePops(); });

applyMini();

/* ══════════ 倒數計時 ══════════ */
let tTotal=0, tLeft=0, tRun=false, tTick=null;
const tdisp=()=>{ const m=Math.floor(Math.max(tLeft,0)/60), s=Math.max(tLeft,0)%60;
  $('#mhh-tdisp').textContent=`${pad(m)}:${pad(s)}`;
  $('#mhh-tdisp').className='mhh-big'+(tLeft<=10&&tLeft>0&&tRun?' warn':'')+(tLeft<=0&&tTotal?' done':''); };
function setT(sec){ tTotal=sec; tLeft=sec; stopT(); tdisp(); }
function stopT(){ tRun=false; clearInterval(tTick); tTick=null; $('#mhh-tgo').textContent='開始'; }
function startT(){
  if(tLeft<=0) return;
  ac();                                   // 使用者手勢內先解鎖音訊
  tRun=true; $('#mhh-tgo').textContent='繼續中…';
  clearInterval(tTick);
  tTick=setInterval(()=>{
    tLeft--; tdisp();
    if(tLeft===60||tLeft===30) beep(760,.14,0,.14);
    if(tLeft<=0){ stopT(); alarm(CFG.level); flash();
      showBanner('⏰ 時間到！', 'urgent'); }
  },1000);
}
function flash(){ document.body.classList.add('mhh-flash');
  setTimeout(()=>document.body.classList.remove('mhh-flash'),2600); }

pTimer.querySelectorAll('[data-min]').forEach(b=>
  b.onclick=()=>{ setT(parseInt(b.dataset.min,10)*60); startT(); });
$('#mhh-tset').onclick=()=>{ const v=parseInt($('#mhh-tcustom').value,10);
  if(v>0) { setT(v*60); startT(); } };
$('#mhh-tgo').onclick   =()=>{ if(tRun) return; if(tLeft<=0&&tTotal) tLeft=tTotal; startT(); };
$('#mhh-tpause').onclick=()=>stopT();
$('#mhh-treset').onclick=()=>{ setT(tTotal); };
$('#mhh-level').value=CFG.level;
$('#mhh-level').onchange=e=>{ CFG.level=e.target.value; saveCfg(); };
$('#mhh-ttest').onclick =()=>{ ac(); alarm(CFG.level); };
setT(0);

/* ══════════ 節次提醒 ══════════ */
$('#mhh-remind').checked = CFG.remind;
$('#mhh-remind').onchange = e=>{ CFG.remind=e.target.checked; saveCfg(); };

function renderSched(){
  const cur=currentPeriod();
  $('#mhh-sched').innerHTML = PERIODS.map(p=>{
    const on = cur && cur.p.name===p.name;
    return `<div class="mhh-srow${on?' on':''}"><b>${p.name}</b><span>${p.s}–${p.e}</span></div>`;
  }).join('');
}
function tickClock(){
  const d=new Date();
  $('#mhh-clock').textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const cur=currentPeriod();
  const nowEl=$('#mhh-now');
  if(nowEl){
    if(cur){
      const m=cur.left;
      nowEl.innerHTML=`<b>${cur.p.name}</b>　剩 <u>${m}</u> 分鐘<br>
        <small>${cur.p.s} – ${cur.p.e}</small>`;
      rail.classList.toggle('mhh-soon', m<=10);
    }else{
      const nx=nextPeriod();
      nowEl.innerHTML = nx ? `目前是下課時間<br><small>下一節 ${nx.name} ${nx.s}</small>`
                           : `今天的課都結束了`;
      rail.classList.remove('mhh-soon');
    }
  }
  /* 自動提醒：同一節同一個時間點只提醒一次 */
  if(CFG.remind && cur){
    const key=`${new Date().toDateString()}|${cur.p.name}|${cur.left}`;
    if((cur.left===10||cur.left===5) && CFG.lastNotified!==key){
      CFG.lastNotified=key; saveCfg();
      const pool = cur.left===10 ? SAY_10 : SAY_5;
      const msg  = pool[Math.floor(Math.random()*pool.length)];
      showBanner(`🔔 ${cur.p.name}　${msg}`, cur.left===5?'urgent':'');
      chime();
    }
  }
  renderSchedIfOpen();
}
function renderSchedIfOpen(){ if(pPeriod.classList.contains('show')) renderSched(); }
tickClock(); setInterval(tickClock, 1000*10);
setInterval(()=>{ const d=new Date(); if(d.getSeconds()<10) tickClock(); }, 1000*5);

/* ══════════ 螢幕註記 ══════════ */
const COLS=['#e63946','#f4a300','#2ea86a','#2f7bd6','#8e5bd0','#111111','#ffffff'];
const cv=$('#mhh-ink-cv'); const cx=cv.getContext('2d');
let inkOn=false, tool='pen', col=COLS[0], shapes=[], draft=null;

const colBox=inkWrap.querySelector('.mhh-ink-cols');
COLS.forEach((c,i)=>{ const b=el('button','mhh-col'+(i===0?' on':''));
  b.style.background=c; b.onclick=()=>{ col=c;
    colBox.querySelectorAll('.mhh-col').forEach(x=>x.classList.remove('on')); b.classList.add('on'); };
  colBox.appendChild(b); });
inkWrap.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{
  tool=b.dataset.tool;
  inkWrap.querySelectorAll('[data-tool]').forEach(x=>x.classList.remove('on')); b.classList.add('on');
});
$('#mhh-ink-undo').onclick =()=>{ shapes.pop(); redrawInk(); };
$('#mhh-ink-clear').onclick=()=>{ shapes=[]; redrawInk(); };
$('#mhh-ink-exit').onclick =()=>toggleInk(false);
$('#mhh-ink').onclick      =()=>toggleInk(!inkOn);
addEventListener('keydown', e=>{ if(e.key==='Escape'&&inkOn) toggleInk(false); });

function sizeInk(){ cv.width=innerWidth; cv.height=innerHeight; redrawInk(); }
addEventListener('resize', ()=>{ if(inkOn) sizeInk(); });

function toggleInk(on){
  inkOn=on;
  inkWrap.classList.toggle('on', on);
  $('#mhh-ink').classList.toggle('on', on);
  document.body.classList.toggle('mhh-inking', on);
  if(on) sizeInk();
}
function drawShape(s){
  cx.lineCap='round'; cx.lineJoin='round';
  cx.strokeStyle=s.col; cx.fillStyle=s.col;
  cx.globalAlpha = s.tool==='mark' ? .32 : 1;
  cx.lineWidth   = s.tool==='mark' ? 22 : 4;
  const [a,b]=[s.p0,s.p1||s.p0];
  if(s.tool==='pen'||s.tool==='mark'){
    cx.beginPath(); s.pts.forEach((p,i)=> i?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]));
    if(s.pts.length===1) cx.lineTo(s.pts[0][0]+.1,s.pts[0][1]+.1);
    cx.stroke();
  } else if(s.tool==='rect'){
    cx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
  } else if(s.tool==='ell'){
    cx.beginPath();
    cx.ellipse((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(b[0]-a[0])/2,Math.abs(b[1]-a[1])/2,0,0,7);
    cx.stroke();
  } else if(s.tool==='arrow'){
    const ang=Math.atan2(b[1]-a[1],b[0]-a[0]), h=18;
    cx.beginPath(); cx.moveTo(a[0],a[1]); cx.lineTo(b[0],b[1]); cx.stroke();
    cx.beginPath(); cx.moveTo(b[0],b[1]);
    cx.lineTo(b[0]-h*Math.cos(ang-.4), b[1]-h*Math.sin(ang-.4));
    cx.lineTo(b[0]-h*Math.cos(ang+.4), b[1]-h*Math.sin(ang+.4));
    cx.closePath(); cx.fill();
  }
  cx.globalAlpha=1;
}
function redrawInk(){ cx.clearRect(0,0,cv.width,cv.height);
  shapes.forEach(drawShape); if(draft) drawShape(draft); }

const xy=e=>[e.clientX,e.clientY];
cv.addEventListener('pointerdown', e=>{
  if(!inkOn) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
  draft={ tool, col, p0:xy(e), p1:xy(e), pts:[xy(e)] }; redrawInk();
});
cv.addEventListener('pointermove', e=>{
  if(!draft) return; e.preventDefault();
  draft.p1=xy(e);
  if(draft.tool==='pen'||draft.tool==='mark') draft.pts.push(xy(e));
  redrawInk();
});
const endInk=()=>{ if(draft){ shapes.push(draft); draft=null; redrawInk(); } };
cv.addEventListener('pointerup', endInk);
cv.addEventListener('pointercancel', endInk);

})();
