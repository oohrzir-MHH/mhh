/* ==========================================================================
   閱讀思考 · 課堂儀表板  app.js
   六組蜂巢座位 × 彩虹職位（正1/正2）× 課堂即時加減分 × 雲端累積
   ========================================================================== */

/* ---------------- 1. 彩虹六職位 ---------------- */
const ROLES = [
  { key:'red',    color:'--c1', light:'--c1l', name:'策略長',  en:'CEO · Chief Executive Officer',
    duty:['開場定調：今天這篇文章我們要解決什麼問題','分派任務、決定最後採用哪一個結論','時間到了負責「收攏」，不讓討論散掉'],
    say:'「我們先確認題目在問什麼——A 你先講你看到的證據。」'},
  { key:'orange', color:'--c2', light:'--c2l', name:'營運長',  en:'COO · Chief Operating Officer',
    duty:['掌控時間，每個環節倒數提醒','點名讓「還沒講的人」講話（彩虹能不能亮靠你）','確保學習單每一格都有被填到'],
    say:'「還有 3 分鐘。C 還沒發言，換你說一句。」'},
  { key:'yellow', color:'--c3', light:'--c3l', name:'品牌長',  en:'CMO · Chief Marketing Officer',
    duty:['代表全組上台發表（30 秒摘要 + 一個亮點）','把組內結論翻譯成「別人聽得懂的一句話」','負責小組的標題 / 命名 / 口號'],
    say:'「我們這組的結論一句話是：______，理由有兩個。」'},
  { key:'green',  color:'--c4', light:'--c4l', name:'知識長',  en:'CKO · Chief Knowledge Officer',
    duty:['回文本找證據，標出行號 / 段落','查資料、查名詞定義，判斷來源可不可信','負責回答「你怎麼知道？」'],
    say:'「證據在第 3 段第 2 行，原文寫的是……」'},
  { key:'blue',   color:'--c5', light:'--c5l', name:'資訊長',  en:'CIO · Chief Information Officer',
    duty:['白板 / 學習單書寫紀錄，字要別人看得懂','把討論畫成表格、流程圖、心智圖','管理小組的檔案、照片、上傳'],
    say:'「我把大家講的畫成三欄：現象 / 原因 / 證據。」'},
  { key:'indigo', color:'--c6', light:'--c6l', name:'風控長',  en:'CRO · Chief Risk Officer',
    duty:['當魔鬼代言人：這個推論有沒有漏洞？','找反例、找例外、找「作者沒說的那一面」','提醒「相關不等於因果」'],
    say:'「如果換成另一種情況，這個結論還成立嗎？」'}
];

/* 蜂巢座位：0..11（每 30°，0 = 12 點鐘）。
   偶數 slot = 內圈（正1，直接貼著中心桌）；奇數 slot = 外圈（正2，卡在兩個正1中間） */
const RING1_SLOTS = [0,2,4,6,8,10];
const RING2_SLOTS = [1,3,5,7,9,11];

/* 六桌排列：上排 4 5 6，下排 3 2 1（講台在最下方） */
const TABLE_LAYOUT = [4,5,6,3,2,1];

/* 各組底色（與職位彩虹無關，純粹讓老師一眼看出組別分佈） */
const GROUP_TINT = {
  1:'#7f9cf5', 2:'#68c9a3', 3:'#e2a35c',
  4:'#c98bd6', 5:'#6fb7d8', 6:'#d98a94'
};

/* 求生卡：每組每堂課，每張各限用一次 */
const LIFELINES = [
  { id:'help',    t:'🤝 場外救援',   d:'指定同組一位同學先講三句，你再接下去補充。' },
  { id:'ab',      t:'🅰️🅱️ 二選一', d:'老師給兩個選項，你只要選一個並說出為什麼。' },
  { id:'keyword', t:'🔑 關鍵字提示', d:'老師給你三個關鍵字，用它們串成一句話。' },
  { id:'meeting', t:'⏱️ 30 秒會議',  d:'全組討論 30 秒，你負責把結論說出來（答錯算全組的）。' }
];

const RAINBOW_BONUS = 5;   // 彩虹貫通，全組每人加分

/* ---------------- 2. 狀態 ---------------- */
const LS_KEY = 'rt_dashboard_v1';
let DB = {
  years:['115'], year:'115',
  classes:{},   // id -> {id,year,name,students:[{no,name}],seats:{table:[no,...]},size}
  activeClass:null, round:1, session: todayStr(),
  records:[],   // 見 addRecord()
  gasUrl:'', gasToken:'', autoSync:false, theme:'dark', zoom:1,
  rotDir:1      // +1＝學生職位順著職位表走；-1＝職位牌在桌上順時針移動
};

function todayStr(){ const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
const $  = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];
const cssVar = v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* updatedAt 讓 sync.js 判斷雲端與本機誰比較新 —— 沒有它就無法安全對帳 */
function save(){ DB.updatedAt=Date.now(); localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function load(){ try{ const raw=localStorage.getItem(LS_KEY); if(raw) DB=Object.assign(DB,JSON.parse(raw)); }
                 catch(e){ console.warn('讀取本機資料失敗',e); } }
function curClass(){ return DB.classes[DB.activeClass]||null; }

/* ---------------- 3. 職位計算 ---------------- */
/* slot 每 +2 就是螢幕上順時針轉一格（0=12點鐘、2=2點鐘…）。
   「順時針」這個詞會有兩種讀法，兩種都對，但結果相反：
     A 職位牌在桌上順時針移動 → 學生拿到的職位在清單裡「倒著走」
     B 學生拿到的職位順著清單走 → 職位牌在桌上逆時針移動
   吵不完，所以做成可切換，並在圖例用「具體例子」講清楚現在是哪一種。 */
function rotDir(){ return DB.rotDir === -1 ? -1 : 1; }   // +1＝學生職位順著清單走
function roleAtSlot(slot, round){
  const anchorIdx = Math.floor(slot/2);
  const n = ROLES.length;
  const roleIdx = ((anchorIdx + rotDir()*(round-1)) % n + n) % n;
  return { role:ROLES[roleIdx], second: slot%2===1, anchorIdx };
}
/* 該組有沒有「正2」，決定標籤要不要標 ①②  */
function roleLabel(slot, round, hasSecond){
  const r = roleAtSlot(slot, round);
  return hasSecond ? `${r.role.name}${r.second?'②':'①'}` : r.role.name;
}
function roleColor(slot, round){
  const r = roleAtSlot(slot, round);
  return cssVar(r.second ? r.role.light : r.role.color);
}
/* n 人要用哪些 slot：先排滿 6 個內圈正1，第 7 人起依序補外圈正2 */
function slotsForSize(n){
  const out = RING1_SLOTS.slice(0, Math.min(n,6));
  for(let i=0;i<n-6 && i<6;i++) out.push(RING2_SLOTS[i]);
  return out.sort((a,b)=>a-b);
}
function tableMembers(tno){
  const c=curClass(); return (c&&c.seats&&c.seats[tno])||[];
}
/* 位子夠不夠坐？不夠就自動長出灰階空位。

   為什麼需要：一班超過 36 人時，六組各 6 個位子就不夠用，
   而原本沒有任何辦法「多加一個位子」—— 只能靠自動排入重排，
   老師想手動微調就卡死。現在只要人數比位子多，就自動補空位，
   老師點一下填座號即可，多出來的空位可以打叉收掉。

   一組最多 12 個（內圈 6 ＋ 外圈 6），這是蜂巢排列的物理上限。 */
const MAX_PER_TABLE = 12;
function ensureEnoughSeats(){
  const c=curClass(); if(!c) return false;
  c.seats=c.seats||{};
  for(let t=1;t<=6;t++) c.seats[t]=c.seats[t]||[];
  const need = (c.students||[]).length;
  let changed=false, guard=0;
  const total = () => [1,2,3,4,5,6].reduce((s,t)=>s+Math.max(c.seats[t].length,6),0);
  while(total() < need && guard++ < 72){
    /* 補在目前最少的那一組，維持各組人數平均 */
    let best=null;
    for(let t=1;t<=6;t++){
      const len=Math.max(c.seats[t].length,6);
      if(len>=MAX_PER_TABLE) continue;
      if(!best || len<best.len) best={t,len};
    }
    if(!best) break;                       // 六組都滿 12 人了，補不下去
    while(c.seats[best.t].length < best.len) c.seats[best.t].push(null);
    c.seats[best.t].push(null); changed=true;
  }
  return changed;
}
/* 把某一組的第 idx 個空位收掉。只准收空的，有人的位子不能這樣消失。 */
function dropSeatSlot(tno, idx){
  const c=curClass(); if(!c||!c.seats||!c.seats[tno]) return;
  if(c.seats[tno][idx]!=null) return;
  c.seats[tno].splice(idx,1);
  save(); renderSeats(); renderScoreboard(); renderRoll();
  toast(`第 ${tno} 組收掉一個空位`);
}
function tableSlots(tno){ return slotsForSize(Math.max(tableMembers(tno).length,6)); }

/* ---------------- 4. 名單 ---------------- */
function studentName(no){
  const c=curClass(); if(!c) return '';
  const s=c.students.find(x=>String(x.no)===String(no));
  return s?s.name:'';
}
/* 回傳的陣列上會掛一個 .skipped 陣列 —— 哪幾行沒吃進去、為什麼。
   以前是靜靜丟掉，結果貼了 38 行只進 34 人，老師完全不知道少了誰。 */
function parseRoster(text){
  const out=[], seen=new Map(), skipped=[];
  text.split(/\r?\n/).forEach((line,i)=>{
    const ln=i+1;
    let t=line.replace(/　/g,' ').trim();
    if(!t) return;
    if(/^(座號|號碼|no\.?|number)/i.test(t)) return;               // 表頭，正常略過

    const take=(no,name)=>{
      if(seen.has(no)){
        skipped.push({ln, t, why:`座號 ${no} 重複（已有「${seen.get(no)}」）`});
        return;
      }
      seen.set(no,name); out.push({no,name});
    };

    const m=t.match(/^(\d{1,3})\s*[,，\t、．.\s]+\s*(.+)$/);
    if(m){ const name=m[2].replace(/[,，\t]+$/,'').trim();
      if(name) take(parseInt(m[1],10), name);
      else skipped.push({ln, t, why:'有座號但沒有姓名'});
      return; }
    const m2=t.match(/^(\d{1,3})$/);
    if(m2){ const no=parseInt(m2[1],10); take(no,'座號'+no); return; }
    const m3=t.match(/^(\D+?)\s*[,，\t]\s*(\d{1,3})$/);
    if(m3){ take(parseInt(m3[2],10), m3[1].trim()); return; }

    skipped.push({ln, t, why:'看不出座號和姓名'});
  });
  const res=out.sort((a,b)=>a.no-b.no);
  res.skipped=skipped;
  return res;
}
/* 匯入時把跳過的行攤開給老師看，讓他自己決定要不要修 */
function rosterWarn(list){
  const sk=list.skipped||[];
  if(!sk.length) return true;
  const detail=sk.slice(0,12).map(s=>`  第 ${s.ln} 行「${s.t.slice(0,24)}」→ ${s.why}`).join('\n');
  return confirm(
    `解析到 ${list.length} 人，但有 ${sk.length} 行沒吃進去：\n\n${detail}`+
    (sk.length>12?`\n  …還有 ${sk.length-12} 行`:'')+
    `\n\n按「確定」＝先匯入這 ${list.length} 人\n按「取消」＝回去修正名單再貼一次`);
}
function autofillSeats(){
  const c=curClass(); if(!c) return alert('請先選擇 / 建立班級');
  const list=[...c.students].sort((a,b)=>a.no-b.no), n=list.length;
  if(!n) return alert('請先匯入名單');
  if(n>72) return alert('每組上限 12 人，六組最多 72 人');
  const base=Math.floor(n/6), extra=n%6;
  c.seats={}; let i=0;
  for(let t=1;t<=6;t++){ const cnt=base+(t<=extra?1:0);
    c.seats[t]=list.slice(i,i+cnt).map(s=>s.no); i+=cnt; }
  c.size=base+(extra?1:0);
  const gs=$('#inp-groupsize'); if(gs) gs.value=c.size;
  save(); renderSeats(); renderScoreboard();
  toast(`已依座號平均排入：每組 ${base}${extra?'～'+(base+1):''} 人`);
}

/* ---------------- 5. 蜂巢座位表 ----------------
   正六邊形（平頂）寬 W、高 H = W·√3/2，彼此完全貼合：
     內圈（正1）在中心桌的 6 個鄰居上 → 半徑 r1 = H
     外圈（正2）卡在兩個內圈之間      → 半徑 r2 = 1.5·W
   兩圈都是正圓，12 個位置剛好每 30° 一個，數學上不可能重疊。 */
const HEX_W = 224, HEX_H = Math.round(HEX_W*Math.sqrt(3)/2);   // 224 × 194
const R1 = HEX_H, R2 = HEX_W*1.5;                               // 194 / 336
const UNIT_W = Math.round(2*(R2 + HEX_W/2)) + 16;               // 一桌佔的寬
const UNIT_H = Math.round(2*(R2*Math.cos(Math.PI/6) + HEX_H/2)) + 16;
const CANVAS_W = UNIT_W*3 + 24;

let seatEditing=null;
let dragFrom=null;

/* 兩個位子互換。空位也能換（等於把人搬過去，原位變空）。
   職位綁在位子上，所以換位＝換職位；歷史紀錄不動，
   因為每筆加分在寫入當下就把 roleName 抄進去了。 */
function swapSeats(a, b){
  const c=curClass();
  if(!c || !a || !b || (a.table===b.table && a.index===b.index)) return;
  c.seats=c.seats||{};
  const fix=t=>{ c.seats[t]=c.seats[t]||[]; };
  fix(a.table); fix(b.table);
  const need=(t,i)=>{ while(c.seats[t].length<=i) c.seats[t].push(null); };
  need(a.table,a.index); need(b.table,b.index);

  const A=c.seats[a.table][a.index] ?? null;
  const B=c.seats[b.table][b.index] ?? null;
  c.seats[a.table][a.index]=B;
  c.seats[b.table][b.index]=A;
  save(); renderSeats(); renderScoreboard(); renderRoll();

  const nm=n=>n==null?'空位':(studentName(n)||('座號'+n));
  toast(`${nm(A)} ⇄ ${nm(B)}　職位跟著位子換了`);
}

/* 用 Pointer Events 做拖曳換位。
   為什麼不用原生 HTML5 drag：見 renderSeats() 裡的註解（縮放／clip-path／觸控）。

   要處理的兩件事：
   (1) 點一下要開填號碼的視窗，拖曳則不要開 —— 所以設一個 6px 的門檻，
       超過才算拖曳，沒超過就當成單純的點擊放行。
   (2) 放開時要知道放在誰身上 —— 用 elementFromPoint 反查，
       它算的是螢幕實際座標，縮放與 clip-path 都不影響。 */
const DRAG_THRESHOLD = 6;          // px；手抖不該被當成拖曳
let seatDragMoved = false;         // 這次操作到底有沒有變成拖曳

function clearDropHints(){
  $$('#classroom .seat').forEach(x=>x.classList.remove('drop-on'));
}

/* 找出游標底下的座位（被拖的那個要跳過）。

   ★ 這裡千萬不要用「把 el 設成 pointer-events:none 再 elementFromPoint」那一招。
     el 這時正持有指標擷取（setPointerCapture），Chrome 一旦發現擷取目標變成
     不可命中，就會直接解除擷取 —— 後續的 pointermove / pointerup 全部跑到別的
     元素去，onUp 永遠不執行，放開手什麼事都沒發生。
     2026-08-25 第一版就是栽在這裡：工具列拖得動（它沒改 pointerEvents），
     座位拖不動，症狀差異剛好指向這一行。
   改用 elementsFromPoint（複數）拿整疊命中結果，自己跳過 el 就好，不必動樣式。 */
function seatUnder(x, y, self){
  const stack = document.elementsFromPoint(x, y) || [];
  for(const n of stack){
    const s = n.closest ? n.closest('#classroom .seat') : null;
    if(s && s!==self) return s;
  }
  return null;
}

function startSeatDrag(ev, el, tno, idx){
  const x0=ev.clientX, y0=ev.clientY;
  let dragging=false, lastTarget=null;
  dragFrom={table:tno, index:idx};
  seatDragMoved=false;

  /* 指標擷取：手指／滑鼠滑出六邊形之外也還收得到事件。
     監聽掛在 document 上而不是 el —— 就算擷取因故失效，事件仍然收得到。 */
  try{ el.setPointerCapture(ev.pointerId); }catch(e){}

  const onMove = e=>{
    if(!dragging){
      if(Math.abs(e.clientX-x0) < DRAG_THRESHOLD &&
         Math.abs(e.clientY-y0) < DRAG_THRESHOLD) return;   // 還在門檻內，先不算拖曳
      dragging=true; seatDragMoved=true;
      el.classList.add('dragging');
    }
    e.preventDefault();                                     // 觸控時不要順便捲動頁面
    const seat = seatUnder(e.clientX, e.clientY, el);
    if(seat!==lastTarget){
      clearDropHints();
      if(seat) seat.classList.add('drop-on');
      lastTarget=seat;
    }
  };

  const onUp = e=>{
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('pointercancel', onUp, true);
    try{ el.releasePointerCapture(ev.pointerId); }catch(err){}
    el.classList.remove('dragging');
    clearDropHints();
    if(!dragging){ dragFrom=null; return; }                 // 只是點一下，交給 onclick
    const seat = seatUnder(e.clientX, e.clientY, el);
    if(seat){
      swapSeats(dragFrom, {table:+seat.dataset.t, index:+seat.dataset.i});
    }
    dragFrom=null;
  };

  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('pointercancel', onUp, true);
}

/* 拖曳結束後瀏覽器還是會補一個 click，要把它吃掉，
   否則每拖一次就跳出一個填號碼的視窗。用捕獲階段才攔得到。 */
document.addEventListener('click', ev=>{
  if(!seatDragMoved) return;
  seatDragMoved=false;
  if(ev.target.closest && ev.target.closest('#classroom .seat')){
    ev.stopPropagation(); ev.preventDefault();
  }
}, true);

function renderSeats(){
  const wrap=$('#classroom'); wrap.innerHTML='';
  const c=curClass();
  if(ensureEnoughSeats()) save();      // 人比位子多就先補足，避免有人沒座位可填
  $('#seat-class-tag').textContent = c ? `${DB.year} · ${c.name}` : '尚未建立班級';
  if(c) $('#inp-groupsize').value = c.size||6;

  wrap.style.width=CANVAS_W+'px';
  wrap.dataset.cw=CANVAS_W;

  TABLE_LAYOUT.forEach(tno=>{
    const members = c ? tableMembers(tno) : [];
    const slots = slotsForSize(Math.max(members.length,6));
    const hasSecond = members.length>6;
    const tint = GROUP_TINT[tno];

    const unit=document.createElement('div');
    unit.className='table-unit';
    unit.style.height=UNIT_H+'px';
    unit.style.setProperty('--tint', tint);

    const label=document.createElement('div');
    label.className='unit-label'; label.textContent=`第 ${tno} 組`;
    unit.appendChild(label);

    const hex=document.createElement('div'); hex.className='hexwrap';
    hex.style.width=HEX_W+'px'; hex.style.height=HEX_H+'px';
    hex.innerHTML=`<b>${tno}</b>`;
    unit.appendChild(hex);

    slots.forEach((slot, idx)=>{
      const no = members[idx];
      const rr = roleAtSlot(slot, DB.round);
      const el = document.createElement('div');
      el.className='seat'+(no==null?' empty':'')+(rr.second?' ring2':'');
      el.style.width=HEX_W+'px'; el.style.height=HEX_H+'px';
      const col=roleColor(slot,DB.round);
      el.style.setProperty('--sc', col);
      const rad=slot*30*Math.PI/180, R=rr.second?R2:R1;
      el.style.left=`calc(50% + ${(Math.sin(rad)*R).toFixed(1)}px)`;
      el.style.top =`calc(50% - ${(Math.cos(rad)*R).toFixed(1)}px)`;
      /* 空位且這一組超過 6 個位子時，給一顆打叉鈕把多出來的空位收掉。
         前 6 個是蜂巢的基本盤，收掉會讓版面破洞，所以不給收。 */
      const canDrop = (no==null && slots.length>6);
      el.innerHTML=
        `<div class="s-in">`+
        `<div class="s-role" style="background:${col};color:${rr.second?'#10131a':'#fff'}">`+
          `${roleLabel(slot,DB.round,hasSecond)}</div>`+
        `<div class="s-main">${no==null?'＋':(studentName(no)||'—')}</div>`+
        `<div class="s-no">${no==null?'點我填號':'座號 '+no}</div>`+
        `</div>`+
        (canDrop?`<button class="seat-x" title="收掉這個空位">✕</button>`:'');
      el.onclick=e=>{
        if(e.target.closest('.seat-x')){ e.stopPropagation(); dropSeatSlot(tno, idx); return; }
        openSeatModal(tno, idx, slot);
      };

      /* ---- 拖曳換位：直接把人拖到想要的職位上 ----
         職位是綁在「位子」上的，所以把兩個人對調＝兩個人的職位對調。
         第 7 個人不再被鎖死在正2，想給她正1 就把她跟正1 的人對調。

         2026-08-25 從 HTML5 drag-and-drop 改寫成 Pointer Events。原生拖曳有三個
         擋路的東西：#classroom 套了 transform:scale()（縮放功能）會讓命中判定失效、
         .seat 的 clip-path 把抓取區切掉、而且原生拖曳在觸控螢幕上根本不作用
         —— 教室是觸控電視就永遠拖不動。Pointer Events 三者都不受影響。 */
      el.dataset.t = tno; el.dataset.i = idx;
      el.addEventListener('pointerdown', ev=>{
        if(ev.button!==undefined && ev.button!==0) return;   // 只認左鍵／單指
        startSeatDrag(ev, el, tno, idx);
      });

      unit.appendChild(el);
    });
    wrap.appendChild(unit);
  });
  renderClassBar();
  renderLegend();
  applyZoom();
}

/* 座位表上直接切班。
   這裡「不」只列本學年度 —— 班級如果不小心建在別的學年度，只列本年度會讓它整個消失，
   看起來就像「匯入了卻點不到」。所以全部列出來，別的學年度標上年份，
   點下去連學年度一起切過去。 */
function renderClassBar(){
  const bar=$('#seat-classbar'); if(!bar) return;
  const all=Object.values(DB.classes);
  if(!all.length){
    bar.innerHTML='<span class="hint">還沒有任何班級 —— 到「⚙️ 名單與雲端」建立並匯入名單。</span>';
    return;
  }
  const mine  = all.filter(c=>c.year===DB.year);
  const other = all.filter(c=>c.year!==DB.year)
                   .sort((a,b)=>String(a.year).localeCompare(String(b.year)));

  const chip=c=>`<button class="classchip${c.id===DB.activeClass?' on':''}${c.year!==DB.year?' otheryear':''}"
      data-id="${c.id}" title="${c.year} 學年度 · ${c.name}">${
      c.year!==DB.year?`<i>${c.year}</i> `:''}${c.name}
      <small>${c.students.length} 人</small></button>`;

  bar.innerHTML =
    (mine.length ? mine.map(chip).join('')
                 : `<span class="hint">${DB.year} 學年度還沒有班級。</span>`) +
    (other.length ? `<span class="chipsep" title="這些班級屬於其他學年度，點下去會一起切換學年度">其他學年度 ▸</span>`
                    + other.map(chip).join('') : '');

  $$('#seat-classbar .classchip').forEach(b=>b.onclick=()=>{
    const c=DB.classes[b.dataset.id]; if(!c) return;
    if(c.id===DB.activeClass && c.year===DB.year) return;
    const switched = c.year!==DB.year;
    DB.year=c.year; DB.activeClass=c.id; save(); renderAll();
    toast(switched ? `已切換到 ${c.year} 學年度 · ${c.name}` : `已切換到 ${c.name}`);
  });
}

function renderLegend(){
  const lg=$('#seat-legend'); lg.innerHTML='';
  RING1_SLOTS.forEach(slot=>{
    const r=roleAtSlot(slot,DB.round);
    const d=document.createElement('div'); d.className='lg';
    d.innerHTML=`<span class="dot" style="background:var(${r.role.color})"></span>
      <span class="dot sm" style="background:var(${r.role.light})"></span>
      <b>${r.role.name}</b>
      <span style="color:var(--txt2);font-size:12px">${slotClock(slot)}</span>`;
    lg.appendChild(d);
  });
  /* 用「具體例子」講輪動方向，不用「順／逆時針」這種會各自解讀的詞 */
  const note=document.createElement('div'); note.className='lg wide-lg';
  const seatSeq=[1,2,3].map(r=>roleAtSlot(0,r).role.name).join(' → ');
  const badgeSeq=[1,2,3].map(r=>{
    const s=RING1_SLOTS.find(x=>roleAtSlot(x,r).role.name===ROLES[0].name);
    return (s===0?12:s)+'點';
  }).join(' → ');
  note.innerHTML=`<span style="color:var(--txt2)">
    <b>第 ${DB.round} 輪</b>　深色＝正1（內圈）　淺色＝正2（外圈）<br>
    坐在 12 點鐘的同學：<b>${seatSeq}</b>（第1→2→3輪）<br>
    「${ROLES[0].name}」這塊牌子在桌上：<b>${badgeSeq}</b>
    　→ 牌子${rotDir()===1?'逆':'順'}時針移動</span>`;
  lg.appendChild(note);
}
function slotClock(slot){ return `${slot===0?12:slot} 點鐘`; }

/* 自動縮放 */
function applyZoom(){
  const wrap=$('#classroom'), box=$('.classroom-scroll');
  if(!wrap||!box) return;
  const manual=parseFloat($('#inp-zoom')?.value||'1');
  const canvasW=parseFloat(wrap.dataset.cw)||CANVAS_W;
  const avail=box.clientWidth||wrap.parentElement.clientWidth||(innerWidth-60);
  const fit=Math.min(1.35,(avail-4)/canvasW);
  const s=Math.max(.35,fit*manual);
  wrap.style.transform=`scale(${s})`;
  box.style.height=(wrap.scrollHeight*s+10)+'px';
  const lbl=$('#zoom-label');
  if(lbl) lbl.textContent=`${Math.round(s*100)}%（字 ${(32*s).toFixed(0)}px / ${(24*s).toFixed(0)}pt）`;
  applyZoom._fit=fit;
  if(DB.zoom!==manual){ DB.zoom=manual; save(); }
}
/* ---- 列印：把座位表縮到剛好橫向 A4 一頁 ----
   A4 橫向 297×210mm，扣掉 5mm 邊界 → 287×200mm。
   1mm = 96/25.4 px，再保留標題與講台的高度。 */
function preparePrint(){
  const wrap=$('#classroom'); if(!wrap) return;
  const PX=96/25.4;
  const pageW=(297-10)*PX;                 // ≈ 1085 px
  const pageH=(210-10)*PX;                 // ≈ 756 px
  const RESERVE=90;                        // 標題 + 講台 + 間距
  const cw=parseFloat(wrap.dataset.cw)||CANVAS_W;
  const ch=wrap.scrollHeight||1;
  const s=Math.min(pageW/cw, (pageH-RESERVE)/ch);
  document.documentElement.style.setProperty('--pscale', s);
  const box=$('.classroom-scroll');
  if(box) box.style.height=(ch*s)+'px';
  const c=curClass();
  $('#print-title').innerHTML=
    `<div style="font-size:14pt;font-weight:800;text-align:center;margin:0 0 2mm">`+
    `${DB.year} 學年度　${c?c.name:''}　座位表（第 ${DB.round} 輪）　`+
    `<span style="font-size:9pt;font-weight:400">日期 ____/____</span></div>`;
}
addEventListener('beforeprint', preparePrint);
addEventListener('afterprint', ()=>{ applyZoom(); });

function trueSize(){
  const fit=applyZoom._fit||1, z=$('#inp-zoom');
  const want=Math.min(parseFloat(z.max), 1/fit);
  z.value = Math.abs(parseFloat(z.value)-want)<0.02 ? 1 : want;
  applyZoom();
}
addEventListener('resize',()=>{ clearTimeout(applyZoom._t); applyZoom._t=setTimeout(applyZoom,120); });

function openSeatModal(table, index, slot){
  seatEditing={table,index,slot};
  const c=curClass();
  const cur=c&&c.seats&&c.seats[table]?c.seats[table][index]:null;
  $('#seat-modal-title').textContent=`第 ${table} 組 · ${roleLabel(slot,DB.round,tableMembers(table).length>6)}`;
  $('#inp-seatno').value=cur==null?'':cur;
  $('#seat-preview').textContent=cur==null?'—':(studentName(cur)||'查無此座號');
  $('#inp-seatsearch').value='';
  renderSeatPicker();
  $('#modal-seat').classList.add('show');
  setTimeout(()=>$('#inp-seatno').focus(),50);
}

/* 這個座號現在坐在哪 → {table,index}，沒就座回 null */
function seatOf(no){
  const c=curClass(); if(!c||no==null) return null;
  for(const t of Object.keys(c.seats||{})){
    const i=(c.seats[t]||[]).indexOf(no);
    if(i>=0) return {table:parseInt(t,10), index:i};
  }
  return null;
}
function renderSeatPicker(){
  const box=$('#seat-pick'); const c=curClass(); if(!box) return;
  if(!c||!c.students.length){ box.innerHTML='<p class="hint">本班還沒有名單。</p>'; return; }
  const q=($('#inp-seatsearch').value||'').trim();
  const cur=seatEditing ? ((c.seats[seatEditing.table]||[])[seatEditing.index] ?? null) : null;
  const list=c.students.filter(s=>!q||String(s.no)===q||s.name.includes(q)||String(s.no).startsWith(q));
  box.innerHTML=list.map(s=>{
    const at=seatOf(s.no);
    return `<button class="pick${s.no===cur?' on':''}${at?' seated':''}" data-no="${s.no}">
      <b>${s.no}</b> ${s.name}<small>${at?`第${at.table}組`:'尚未就座'}</small></button>`;
  }).join('')||'<p class="hint">沒有符合的學生。</p>';
  $$('#seat-pick .pick').forEach(b=>b.onclick=()=>commitSeat(parseInt(b.dataset.no,10)));
}

/* 指定座號就座。若那個人本來坐在別的位子，就和這個位子的原主人「對調」，
   而不是把原位留一個洞 —— 老師實際上都是在換位子，不是搬走一個人。 */
function commitSeat(forceNo){
  const c=curClass(); if(!c||!seatEditing) return;
  const no = forceNo!==undefined ? forceNo
           : ($('#inp-seatno').value.trim()===''? null : parseInt($('#inp-seatno').value.trim(),10));
  if(no!=null && !c.students.some(s=>s.no===no)) return toast(`本班沒有座號 ${no}`);

  c.seats=c.seats||{};
  const {table,index}=seatEditing;
  c.seats[table]=c.seats[table]||[];
  while(c.seats[table].length<=index) c.seats[table].push(null);
  const prev=c.seats[table][index] ?? null;      // 這個位子原本坐誰

  if(no!=null){
    const from=seatOf(no);
    if(from && !(from.table===table && from.index===index)){
      c.seats[from.table][from.index]=prev;      // 對調：原主人搬去他原本的位子
    }
  }
  c.seats[table][index]=no;
  save(); renderSeats(); renderScoreboard();
  $('#modal-seat').classList.remove('show');
}

/* ---------------- 6. 課堂互動計分 ---------------- */
function sessionRecords(){
  return DB.records.filter(r=>r.year===DB.year&&r.classId===DB.activeClass&&r.session===DB.session);
}
function cumRecords(){ return DB.records.filter(r=>r.year===DB.year&&r.classId===DB.activeClass); }
function ptsOf(list,no){ return list.filter(r=>String(r.no)===String(no)).reduce((s,r)=>s+r.points,0); }
/* 亮燈看的是「有沒有發言過」，不受扣分影響 */
function speakCount(list,no){ return list.filter(r=>String(r.no)===String(no)&&r.type==='answer').length; }

function addRecord(o){
  const c=curClass(); if(!c) return null;
  const rec=Object.assign({
    id:uid(), ts:new Date().toISOString(), year:DB.year, classId:c.id, className:c.name,
    session:DB.session, round:DB.round, no:'', name:'', table:0, slot:-1,
    roleKey:'', roleName:'', second:0, points:0, type:'answer', note:''
  }, o);
  DB.records.push(rec); save();
  if(DB.autoSync) pushOne(rec);
  return rec;
}
function addPoint(no, table, slot, pts, type='answer', note=''){
  const hasSecond=tableMembers(table).length>6;
  const rr=roleAtSlot(slot,DB.round);
  addRecord({ no, name:studentName(no)||('座號'+no), table, slot,
    roleKey:rr.role.key, roleName:roleLabel(slot,DB.round,hasSecond),
    second:rr.second?1:0, points:pts, type, note });
  if(type==='answer') checkRainbow(table);
  renderScoreboard();
}
/* 全組每人加／扣同樣的分數 */
function groupApply(table, per, type, note){
  const raw=tableMembers(table);
  if(!raw.filter(x=>x!=null).length) return;
  const slots=tableSlots(table);
  raw.forEach((no,idx)=>{
    if(no==null) return;
    addPoint(no, table, slots[idx], per, type, note);
  });
  toast(`第 ${table} 組 全組每人 ${per>0?'+':''}${per} 分`, per>0);
  renderScoreboard();
}
function groupDeduct(table, per=-1){ groupApply(table, per, 'deduct', '全組扣分'); }
/* 全組加分：老師直接給的獎勵分。
   刻意「不」算成發言 —— 否則一鍵就點亮全部燈號、白送一次彩虹貫通（每人再 +5），
   而且會把從沒開口的學生記成已發言，害低互動名單與參與率失真。 */
function groupAward(table, per=1){ groupApply(table, per, 'award', '全組加分'); }

/* 彩虹貫通：全組「每一個人」都發言過算一次；每個人都是獨立一盞燈 */
function comboCount(tno){ return sessionRecords().filter(r=>r.table===tno&&r.type==='rainbow').length; }
function totalRainbow(){ return sessionRecords().filter(r=>r.type==='rainbow').length; }

function checkRainbow(table){
  const raw=tableMembers(table);
  const members=raw.filter(x=>x!=null);
  if(members.length<2) return;
  const sr=sessionRecords();
  const rounds=Math.min(...members.map(no=>speakCount(sr,no)));
  const done=comboCount(table);
  if(rounds<=done) return;

  const slots=tableSlots(table);
  const hasSecond=raw.length>6;
  for(let k=done;k<rounds;k++){
    // ① 事件標記（用來數「貫通了幾次」，本身不帶分數）
    addRecord({ name:`第${table}組 全組`, table, roleKey:'rainbow', roleName:'彩虹貫通',
      points:0, type:'rainbow', note:'第'+(k+1)+'次' });
    // ② 分數要真的落到「每一個人」頭上，個人累積分才算得到這筆
    raw.forEach((no,idx)=>{
      if(no==null) return;
      const rr=roleAtSlot(slots[idx],DB.round);
      addRecord({ no, name:studentName(no)||('座號'+no), table, slot:slots[idx],
        roleKey:rr.role.key, roleName:roleLabel(slots[idx],DB.round,hasSecond),
        second:rr.second?1:0, points:RAINBOW_BONUS, type:'bonus', note:'彩虹貫通' });
    });
  }
  starBurst();
  toast(`🌈 第 ${table} 組 全員發言，彩虹貫通！全組每人 +${RAINBOW_BONUS} 分（第 ${rounds} 次）`, true);
}

function renderScoreboard(){
  const box=$('#scoreboard'); box.innerHTML='';
  const c=curClass();
  if(!c){ box.innerHTML='<p class="hint">請先到「名單與雲端」建立班級並匯入名單。</p>'; return; }
  const sr=sessionRecords();
  let spokeCnt=0, silent=0;

  [1,2,3,4,5,6].forEach(tno=>{
    const members=tableMembers(tno);
    const slots=tableSlots(tno);
    const hasSecond=members.length>6;
    const card=document.createElement('div'); card.className='gcard';
    card.style.setProperty('--tint', GROUP_TINT[tno]);

    const rows=[];
    let gpts=0, allSpoke=members.filter(x=>x!=null).length>0;
    members.forEach((no,idx)=>{
      if(no==null) return;
      const slot=slots[idx], rr=roleAtSlot(slot,DB.round);
      const p=ptsOf(sr,no), sc=speakCount(sr,no);
      gpts+=p;
      if(sc>0) spokeCnt++; else { silent++; allSpoke=false; }
      rows.push({no,slot,rr,p,sc});
    });
    const combo=comboCount(tno);
    if(allSpoke) card.classList.add('complete');

    card.innerHTML=
      `<div class="gcard-head"><b>第 ${tno} 組</b>
        <span class="gpts">本堂 ${gpts} 分 · 累積 ${groupCum(tno)} 分</span></div>`+
      /* 一人一盞燈 */
      `<div class="rainbow-bar">${rows.map(r=>{
        const col=roleColor(r.slot,DB.round);
        return `<i class="${r.sc>0?'on':''}" title="${studentName(r.no)||r.no}"
          style="${r.sc>0?`background:${col};color:${col}`:''}"></i>`;
      }).join('')||'<i></i>'}</div>`+
      (combo?`<div class="combo">⭐ ×${combo}</div>`:'');

    const tools=document.createElement('div'); tools.className='gtools';
    tools.innerHTML=`<span class="gbtns">
        <button class="mini-btn good"   data-act="gplus">全組每人 +1</button>
        <button class="mini-btn danger" data-act="gminus">全組每人 −1</button></span>
      <span class="ghint">${members.filter(x=>x!=null).length} 人 · ${rows.filter(r=>r.sc>0).length} 人已發言</span>`;
    tools.querySelector('[data-act=gplus]').onclick=e=>{
      if(!confirm(`第 ${tno} 組 全組每人 +1 分？`)) return;
      groupAward(tno,1); pop(e.clientX,e.clientY,'#2ecc71');
    };
    tools.querySelector('[data-act=gminus]').onclick=()=>{
      if(confirm(`第 ${tno} 組 全組每人 −1 分？`)) groupDeduct(tno,-1);
    };
    card.appendChild(tools);

    rows.forEach(({no,slot,rr,p,sc})=>{
      const col=roleColor(slot,DB.round);
      const s=document.createElement('div');
      s.className='stu'+(sc>0?' spoke':' zero');
      s.innerHTML=`<span class="swatch" style="background:${col}"></span>
        <span class="sname">${studentName(no)||('座號'+no)}
          <span class="srole">${no} · ${roleLabel(slot,DB.round,hasSecond)}${sc>0?' · 發言 '+sc+' 次':''}</span></span>
        <span class="spts">${p}</span>
        <button class="mini-btn minus" title="扣 1 分">−</button>`;
      s.querySelector('.minus').onclick=e=>{
        e.stopPropagation(); addPoint(no,tno,slot,-1,'deduct'); toast(`${studentName(no)} −1`);
      };
      s.onclick=e=>{ addPoint(no,tno,slot,1); pop(e.clientX,e.clientY,col); };
      card.appendChild(s);
    });

    box.appendChild(card);
  });

  $('#live-total').textContent   = sr.reduce((s,r)=>s+r.points,0);
  $('#live-spoke').textContent   = sr.filter(r=>r.type==='answer').length;
  $('#live-rainbow').textContent = totalRainbow();
  $('#live-silent').textContent  = silent;
}
function groupCum(tno){ return cumRecords().filter(r=>r.table===tno).reduce((s,r)=>s+r.points,0); }

/* ---------------- 6b. 課堂點名與註記 ----------------
   一位學生、一堂課只保留一筆 type='attend' 的紀錄（改狀態＝覆蓋，不是再記一筆），
   所以它和加分紀錄放在同一個 DB.records 裡，走同一條上傳管線、進同一份試算表。 */
/* 六個互斥狀態：回答「今天到底來了沒」，一位學生只能是其中一個。 */
const ATTEND = [
  { k:'present', t:'出席',   c:'#2ea86a', short:'✓' },
  { k:'late',    t:'遲到',   c:'#e9a70f', short:'遲' },
  { k:'absent',  t:'曠課',   c:'#e63946', short:'曠' },
  { k:'personal',t:'事假',   c:'#4f8cff', short:'事' },
  { k:'sick',    t:'病假',   c:'#7a5cd8', short:'病' },
  { k:'official',t:'公假',   c:'#2f9fb0', short:'公' }
];
/* 「中途離開」不在上面那一組。
   它跟那六個不是同一層的東西 —— 那六個問「來了沒」，它問「來了之後有沒有出去過」。
   學生完全可以「有來、還遲到、而且中途離開」，所以它必須能跟其他狀態並存。
   2026-08-25 之前它被塞進同一個互斥清單，結果點了出席再點中途離開，出席就被蓋掉。
   現在改存成 leftAt（離開時間 HH:MM，空字串＝沒離開過）。
   用時間而不是 true/false，是延續點名既有的設計 —— 時間戳記的是事件發生的時刻。 */
const LEFT = { k:'left', t:'中途離開', c:'#d9714f', short:'離' };
const attendMeta = k => ATTEND.find(a=>a.k===k) || null;

function attendRecOf(no){
  return sessionRecords().filter(r=>r.type==='attend'&&String(r.no)===String(no)).pop() || null;
}
/* 舊資料相容：2026-08-25 以前「中途離開」是存在 note 裡的互斥狀態。
   讀到那種紀錄就當成「出席 ＋ 有離開過」，離開時間沿用原本的 atTime。
   不改寫硬碟上的舊紀錄，只在讀的時候翻譯 —— 這樣萬一要退版，舊版仍讀得懂。 */
function attendOf(no){
  const r=attendRecOf(no); if(!r) return '';
  return r.note==='left' ? 'present' : r.note;
}
function attendLeftOf(no){
  const r=attendRecOf(no); if(!r) return '';
  if(r.leftAt) return r.leftAt;
  return r.note==='left' ? (r.atTime||'—') : '';   // 舊資料
}
function attendMemoOf(no){ const r=attendRecOf(no); return r?(r.memo||''):''; }
function attendTimeOf(no){ const r=attendRecOf(no); return r?(r.atTime||''):''; }

function nowHM(){ const d=new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

/* status：ATTEND 的 k；memo：老師手打的備註；
   兩者都是「覆蓋同一筆」，所以改備註不會把狀態洗掉，反之亦然。
   時間只在「第一次標記狀態」時記下 —— 那才是事件發生的時刻，
   之後補打備註不該把遲到時間改掉。 */
/* leftAt 傳 undefined＝不動它；傳字串＝設定；傳 '' ＝清掉。 */
function setAttend(no, status, memo, leftAt){
  const c=curClass(); if(!c) return;
  const old=attendRecOf(no);
  const keepStatus = status===undefined ? attendOf(no) : status;
  const keepMemo   = memo===undefined   ? (old?old.memo||'':'') : memo;
  const keepLeft   = leftAt===undefined ? attendLeftOf(no) : leftAt;

  DB.records=DB.records.filter(r=>!(r.type==='attend' && r.year===DB.year &&
    r.classId===c.id && r.session===DB.session && String(r.no)===String(no)));

  if(keepStatus || keepMemo || keepLeft){
    const at=seatOf(no);
    const slot = at ? tableSlots(at.table)[at.index] : -1;
    const rr = slot>=0 ? roleAtSlot(slot,DB.round) : null;
    /* 狀態沒變就沿用舊時間；狀態改了（或第一次標）才蓋新時間 */
    const sameStatus = old && attendOf(no)===keepStatus && old.atTime;
    addRecord({ no, name:studentName(no)||('座號'+no),
      table:at?at.table:0, slot,
      roleKey:rr?rr.role.key:'', roleName:rr?roleLabel(slot,DB.round,tableMembers(at.table).length>6):'',
      second:rr&&rr.second?1:0,
      points:0, type:'attend', note:keepStatus, leftAt:keepLeft,
      memo:keepMemo, atTime: sameStatus ? old.atTime : (keepStatus ? nowHM() : (old?old.atTime:'')) });
  }else{ save(); }
  renderRoll();
}

/* 切換「中途離開」。開＝記下現在幾點，關＝清掉。
   不會動到出席／遲到那一格，反過來改狀態也不會清掉這個標記。 */
function toggleLeft(no){
  setAttend(no, undefined, undefined, attendLeftOf(no) ? '' : nowHM());
}

function renderRoll(){
  const wrap=$('#rollwrap'); if(!wrap) return;
  const c=curClass();
  $('#roll-class-tag').textContent = c ? `${DB.year} · ${c.name} · ${DB.session}` : '尚未建立班級';
  if(!c || !c.students.length){
    wrap.innerHTML='<p class="hint">請先到「⚙️ 名單與雲端」建立班級並匯入名單。</p>';
    $('#roll-stat').innerHTML=''; return;
  }

  const mode=$('#sel-rollsort').value;
  const groups=[];
  if(mode==='group'){
    [1,2,3,4,5,6].forEach(t=>{
      const ms=tableMembers(t).filter(x=>x!=null);
      if(ms.length) groups.push({title:`第 ${t} 組（${ms.length} 人）`, tint:GROUP_TINT[t], nos:ms});
    });
    /* 還沒排到座位的人不能憑空消失，否則點名會漏人 */
    const seated=new Set(groups.flatMap(g=>g.nos));
    const rest=c.students.filter(s=>!seated.has(s.no)).map(s=>s.no);
    if(rest.length) groups.push({title:`尚未排入座位（${rest.length} 人）`, tint:'#8b93a7', nos:rest});
  }else{
    groups.push({title:`全班依座號（${c.students.length} 人）`, tint:'#8b93a7',
      nos:[...c.students].sort((a,b)=>a.no-b.no).map(s=>s.no)});
  }

  wrap.innerHTML=groups.map(g=>
    `<div class="rollgroup" style="--tint:${g.tint}"><h3>${g.title}</h3>
      <div class="rollrows">${g.nos.map(no=>{
        const st=attendOf(no), m=attendMeta(st);
        const tm=attendTimeOf(no), mm=attendMemoOf(no), lf=attendLeftOf(no);
        return `<div class="rollrow${st||lf?' marked':''}" data-no="${no}">
          <span class="rname"><b>${no}</b> ${studentName(no)||('座號'+no)}</span>
          <span class="rstate" style="${m?`background:${m.c};color:#fff`:''}">${m?m.t:'未點名'}${
            lf?`<i class="rleft-tag">離 ${lf}</i>`:''}</span>
          <span class="rtime" title="標記當下的時間">${tm||''}</span>
          <span class="rbtns">${ATTEND.map(a=>
            `<button class="abtn${st===a.k?' on':''}" data-k="${a.k}"
              style="--ac:${a.c}" title="${a.t}">${a.short}</button>`).join('')}
            <button class="abtn clr" data-k="" title="清除狀態與備註">✕</button>
            <span class="abtn-sep" title="下面這個可以跟左邊的狀態同時成立"></span>
            <button class="abtn lf${lf?' on':''}" data-left="1" style="--ac:${LEFT.c}"
              title="${lf?`中途離開 ${lf}　（再按一次取消）`:'中途離開　可與出席／遲到並存'}"
            >${LEFT.short}</button></span>
          <input class="rmemo${mm?' has':''}" data-memo="${no}" value="${
            String(mm).replace(/"/g,'&quot;')}" placeholder="備註（例：晚 10 分鐘，說去保健室）">
        </div>`;
      }).join('')}</div></div>`).join('');

  $$('#rollwrap .abtn').forEach(b=>b.onclick=()=>{
    const no=parseInt(b.closest('.rollrow').dataset.no,10);
    if(b.dataset.left) toggleLeft(no);                 // 離：獨立切換，不影響狀態
    else if(b.dataset.k==='') setAttend(no,'','','');  // ✕ 狀態、備註、離開全清掉
    else setAttend(no, b.dataset.k);                   // 只改狀態，備註與離開保留
  });
  /* 備註：離開欄位才寫入，免得每打一個字就重繪整張表 */
  $$('#rollwrap .rmemo').forEach(inp=>{
    inp.onchange=()=>setAttend(parseInt(inp.dataset.memo,10), undefined, inp.value.trim());
    inp.onkeydown=e=>{ if(e.key==='Enter') inp.blur(); };
  });

  /* 統計列 */
  const all=c.students.map(s=>s.no);
  const cnt={}; ATTEND.forEach(a=>cnt[a.k]=0);
  let unmarked=0, leftCnt=0;
  all.forEach(no=>{
    const st=attendOf(no); if(st&&cnt[st]!==undefined) cnt[st]++; else unmarked++;
    if(attendLeftOf(no)) leftCnt++;      // 獨立計數，不跟上面互斥
  });
  $('#roll-stat').innerHTML=
    ATTEND.map(a=>`<div class="rollkpi" style="--ac:${a.c}"><b>${cnt[a.k]}</b><small>${a.t}</small></div>`).join('')+
    `<div class="rollkpi" style="--ac:#8b93a7"><b>${unmarked}</b><small>未點名</small></div>`+
    `<div class="rollkpi lf" style="--ac:${LEFT.c}"><b>${leftCnt}</b><small>${LEFT.t}</small></div>`;
}

/* ---------------- 7. 特效 ---------------- */
const cvs=$('#fx-canvas'), ctx=cvs.getContext('2d');
function resizeCvs(){ cvs.width=innerWidth; cvs.height=innerHeight; }
addEventListener('resize',resizeCvs); resizeCvs();
let parts=[], fxRunning=false;
function pop(x,y,color){
  for(let i=0;i<14;i++) parts.push({x,y,vx:(Math.random()-.5)*7,vy:(Math.random()-1.2)*7,
    life:45,c:color||'#4f8cff',s:Math.random()*4+2,star:false});
  runFx();
}
function starBurst(){
  const cx=innerWidth/2, cy=innerHeight/2;
  const cols=['#e63946','#f28c28','#e9c716','#2ea86a','#2f7fd8','#6f4bd8','#ffd700'];
  for(let i=0;i<220;i++){
    const a=Math.random()*Math.PI*2, sp=Math.random()*13+3;
    parts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:95,
      c:cols[i%cols.length],s:Math.random()*7+3,star:i%3===0});
  }
  runFx();
}
function runFx(){
  if(fxRunning) return; fxRunning=true;
  (function loop(){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    parts=parts.filter(p=>p.life>0);
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.22; p.life--;
      ctx.globalAlpha=Math.max(p.life/70,0); ctx.fillStyle=p.c;
      if(p.star) drawStar(p.x,p.y,p.s*1.6);
      else { ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,7); ctx.fill(); } });
    ctx.globalAlpha=1;
    if(parts.length) requestAnimationFrame(loop);
    else { ctx.clearRect(0,0,cvs.width,cvs.height); fxRunning=false; }
  })();
}
function drawStar(x,y,r){
  ctx.beginPath();
  for(let i=0;i<10;i++){ const rr=i%2?r*.45:r, a=Math.PI/5*i-Math.PI/2;
    ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
  ctx.closePath(); ctx.fill();
}
function toast(msg,gold){
  const d=document.createElement('div'); d.className='toast'+(gold?' gold':'');
  d.textContent=msg; $('#toast-wrap').appendChild(d);
  setTimeout(()=>d.remove(),3600);
}

/* ---------------- 8. 統計 ---------------- */
function statScopeRecords(){
  const sc=$('#sel-scope').value;
  if(sc==='year')    return DB.records.filter(r=>r.year===DB.year);
  if(sc==='session') return sessionRecords();
  return cumRecords();
}
function renderStats(){
  const rs=statScopeRecords();
  const answers=rs.filter(r=>r.type==='answer');
  const rainbows=rs.filter(r=>r.type==='rainbow');
  const total=rs.reduce((s,r)=>s+r.points,0);
  const sessions=new Set(rs.map(r=>r.session));
  const S=Math.max(sessions.size,1);
  const per=v=>Math.round(v/S*10)/10;

  const people={};
  rs.filter(r=>r.no!=='').forEach(r=>{ const k=r.classId+'#'+r.no;
    people[k]=people[k]||{name:r.name,cls:r.className,no:r.no,pts:0,say:0,sess:new Set()};
    people[k].pts+=r.points;
    if(r.type==='answer') people[k].say++;
    people[k].sess.add(r.session);
  });
  const c=curClass();
  if(c && $('#sel-scope').value!=='year')
    c.students.forEach(s=>{ const k=c.id+'#'+s.no;
      if(!people[k]) people[k]={name:s.name,cls:c.name,no:s.no,pts:0,say:0,sess:new Set()}; });
  const arr=Object.values(people);
  const spoke=arr.filter(p=>p.say>0).length;

  /* 彩虹最常發生的組別 */
  const rbByGroup={};
  rainbows.forEach(r=>{ const k=(($('#sel-scope').value==='year')?r.className+' ':'')+'第'+r.table+'組';
    rbByGroup[k]=(rbByGroup[k]||0)+1; });
  const rbTop=Object.entries(rbByGroup).sort((a,b)=>b[1]-a[1])[0];

  /* 最常發言（每堂平均） */
  const sayTop=[...arr].sort((a,b)=>b.say-a.say)[0];

  $('#kpi-row').innerHTML=[
    ['總加分（含扣分）', total, `每堂平均 ${per(total)} 分`],
    ['上課堂數', S+' 堂', [...sessions].sort().slice(-1)[0]||'—'],
    ['發言人次', answers.length, `每堂平均 ${per(answers.length)} 人次`],
    ['🌈 彩虹貫通', rainbows.length+' 次', `每堂平均 ${per(rainbows.length)} 次`],
    ['🏆 最常貫通', rbTop?rbTop[0]:'—', rbTop?`${rbTop[1]} 次 · 每堂 ${per(rbTop[1])}`:'尚未發生'],
    ['🎤 最常發言', sayTop&&sayTop.say?sayTop.name:'—', sayTop&&sayTop.say?`${sayTop.say} 次 · 每堂 ${per(sayTop.say)}`:'尚無資料'],
    ['有發言人數', spoke+' / '+arr.length, arr.length?Math.round(spoke/arr.length*100)+'% 參與率':'—'],
    ['扣分次數', rs.filter(r=>r.type==='deduct').length+' 次', `求生卡用掉 ${rs.filter(r=>r.type==='lifeline').length} 張`]
  ].map(([k,v,sub])=>`<div class="kpi"><b>${v}</b><small>${k}</small><em>${sub||''}</em></div>`).join('');

  /* 六組都要列出來（沒紀錄的組顯示 0，才看得出哪一組完全沒動靜） */
  const gkey=r=>($('#sel-scope').value==='year'? r.className+' 第'+r.table+'組':'第'+r.table+'組');
  const gmap={}, gmapPer={};
  if($('#sel-scope').value==='year'){
    Object.values(DB.classes).filter(x=>x.year===DB.year)
      .forEach(x=>[1,2,3,4,5,6].forEach(t=>gmap[`${x.name} 第${t}組`]=0));
  } else [1,2,3,4,5,6].forEach(t=>gmap['第'+t+'組']=0);
  rs.forEach(r=>{ if(!r.table) return; gmap[gkey(r)]=(gmap[gkey(r)]||0)+r.points; });
  Object.keys(gmap).forEach(k=>gmapPer[k]=per(gmap[k]));
  bars('#bar-group', gmapPer, 'var(--pri)', null, ' 分/堂');

  const rmap={};
  answers.forEach(r=>{ const ro=ROLES.find(x=>x.key===r.roleKey);
    const k=ro?ro.name:(r.roleName||'其他'); rmap[k]=(rmap[k]||0)+1; });
  Object.keys(rmap).forEach(k=>rmap[k]=per(rmap[k]));
  bars('#bar-role', rmap, null, true, ' 次/堂');

  const smap={}; rs.forEach(r=>{ smap[r.session]=(smap[r.session]||0)+r.points; });
  bars('#bar-session', smap, 'var(--ok)', null, ' 分');

  const rbmapPer={};
  Object.keys(gmap).forEach(k=>rbmapPer[k]=0);
  Object.keys(rbByGroup).forEach(k=>rbmapPer[k]=per(rbByGroup[k]));
  bars('#bar-rainbow', rbmapPer, 'gold', null, ' 次/堂');

  const hi=[...arr].sort((a,b)=>b.say-a.say||b.pts-a.pts).slice(0,10);
  $('#rank-high').innerHTML=hi.map((p,i)=>
    `<div class="rankrow"><span class="idx">${i+1}</span>
     <span class="nm">${p.name}<small>${p.cls} · ${p.no}號</small></span>
     <span class="vl">${per(p.say)} 次/堂</span><span class="v2">${p.pts} 分</span></div>`).join('')
    ||'<p class="hint">尚無資料</p>';
  const lo=[...arr].sort((a,b)=>a.say-b.say||a.pts-b.pts).slice(0,10);
  $('#rank-low').innerHTML=lo.map((p,i)=>
    `<div class="rankrow cold"><span class="idx">${i+1}</span>
     <span class="nm">${p.name}<small>${p.cls} · ${p.no}號</small></span>
     <span class="vl">${per(p.say)} 次/堂</span><span class="v2">${p.pts} 分</span></div>`).join('')
    ||'<p class="hint">尚無資料</p>';
}
function bars(sel,map,color,rainbow,unit){
  const el=$(sel); if(!el) return;
  const ks=Object.keys(map).sort();
  if(!ks.length){ el.innerHTML='<p class="hint">尚無資料</p>'; return; }
  const max=Math.max(...ks.map(k=>map[k]))||1;
  el.innerHTML=ks.map(k=>{
    let cl=color||'var(--pri)';
    if(rainbow){ const r=ROLES.find(x=>x.name===k); if(r) cl=`var(${r.color})`; }
    return `<div class="barrow"><span>${k}</span>
      <span class="bartrack"><span class="barfill" style="width:${Math.max(map[k]/max*100,0)}%;background:${cl}"></span></span>
      <span class="barval">${map[k]}${unit||''}</span></div>`;
  }).join('');
}

/* ---------------- 9. 雲端同步 ---------------- */
function logSync(msg){
  const el=$('#sync-log');
  el.textContent=`[${new Date().toLocaleTimeString()}] ${msg}\n`+el.textContent;
}
async function gasPost(payload){
  if(!DB.gasUrl) throw new Error('尚未設定 Apps Script 網址');
  const res=await fetch(DB.gasUrl,{ method:'POST', redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(Object.assign({token:DB.gasToken}, payload)) });
  return await res.json();
}
async function pushOne(rec){
  try{ await gasPost({action:'append', data:[rec]}); }
  catch(e){ logSync('即時同步失敗（已存本機）：'+e.message); }
}
async function pushAll(){
  try{
    logSync('上傳中…共 '+DB.records.length+' 筆');
    const r=await gasPost({action:'replace', year:DB.year, data:DB.records});
    if(r.status!=='success') throw new Error(r.message||'伺服器回報錯誤');
    logSync('✅ '+(r.message||'上傳完成')); toast('雲端上傳完成');
  }catch(e){ logSync('❌ 上傳失敗：'+e.message); }
}
async function pullAll(){
  try{
    const url=DB.gasUrl+'?type=records&token='+encodeURIComponent(DB.gasToken||'');
    const res=await fetch(url,{redirect:'follow'});
    const j=await res.json();
    if(j.status!=='success') throw new Error(j.message||'回應錯誤');
    const ids=new Set(DB.records.map(r=>r.id));
    let added=0;
    j.data.forEach(r=>{ if(!ids.has(r.id)){ DB.records.push(r); added++; } });
    save(); renderScoreboard(); renderStats();
    logSync(`✅ 下載完成，新增 ${added} 筆（雲端共 ${j.data.length} 筆）`);
  }catch(e){ logSync('❌ 下載失敗：'+e.message); }
}

/* ---------------- 10. 抽籤 + 求生卡 ---------------- */
let lotteryPick=null;
function lifelineUsed(table,id){
  return sessionRecords().some(r=>r.type==='lifeline'&&r.table===table&&r.note===id);
}
function renderLifelines(){
  const t=lotteryPick?lotteryPick.table:0;
  $('#lifelines').innerHTML=LIFELINES.map(l=>{
    const used=t&&lifelineUsed(t,l.id);
    return `<div class="lifeline${used?' used':''}" data-id="${l.id}">
      <b>${l.t}</b><small>${l.d}</small>
      <span class="ll-state">${used?`第 ${t} 組本堂已用過`:(t?`點我使用（第 ${t} 組本堂剩 1 次）`:'先抽人再選卡')}</span>
    </div>`;
  }).join('');
  $$('#lifelines .lifeline').forEach(el=>{
    el.onclick=()=>{
      if(!lotteryPick) return toast('請先抽人');
      const id=el.dataset.id;
      if(lifelineUsed(lotteryPick.table,id)) return toast('這張卡本堂已經用過了');
      const l=LIFELINES.find(x=>x.id===id);
      addRecord({ no:lotteryPick.no, name:studentName(lotteryPick.no), table:lotteryPick.table,
        slot:lotteryPick.slot, roleName:'求生卡', points:0, type:'lifeline', note:id });
      renderLifelines(); renderStats();
      toast(`第 ${lotteryPick.table} 組使用了「${l.t}」`);
    };
  });
}
function openLottery(){
  lotteryPick=null;
  $('#lottery-display').innerHTML='準備抽籤';
  renderLifelines();
  $('#modal-lottery').classList.add('show');
}
function doLottery(){
  const c=curClass(); if(!c) return;
  const sr=sessionRecords();
  let pool=[];
  [1,2,3,4,5,6].forEach(t=>{
    const ms=tableMembers(t), slots=tableSlots(t);
    ms.forEach((no,i)=>{ if(no!=null) pool.push({no,table:t,slot:slots[i]}); });
  });
  if($('#chk-only-silent').checked){
    const silent=pool.filter(p=>speakCount(sr,p.no)===0);
    if(silent.length) pool=silent;
  }
  if(!pool.length) return toast('沒有可抽的人');
  const d=$('#lottery-display'); let n=0;
  const timer=setInterval(()=>{
    const p=pool[Math.floor(Math.random()*pool.length)];
    d.innerHTML=`${studentName(p.no)||p.no}`;
    if(++n>18){
      clearInterval(timer);
      lotteryPick=pool[Math.floor(Math.random()*pool.length)];
      const hasSecond=tableMembers(lotteryPick.table).length>6;
      d.innerHTML=`${studentName(lotteryPick.no)||lotteryPick.no}
        <small>第 ${lotteryPick.table} 組 · ${roleLabel(lotteryPick.slot,DB.round,hasSecond)} · 座號 ${lotteryPick.no}</small>
        <small style="color:var(--warn)">請選一張求生卡 👇</small>`;
      renderLifelines();
      pop(innerWidth/2, innerHeight/2.4, '#f39c12');
    }
  },70);
}

/* ---------------- 11. 點名登記冊 Excel ----------------
   對齊老師原本的登記冊格式（2.xlsx）：一般欄位、不做奇怪的合併，
   20 個窄欄供每堂課打 X／U，缺席用 COUNTIF 自動統計。
   每個班兩張工作表，各自剛好 A4 直向一頁：
     「班級 依座號」　「班級 依小組」
   座位表不放進 Excel（六張桌子擠在 A4 上會變一團糟），改用網頁列印成橫向 A4 一頁。 */

const XL_SESSIONS = 10;                    // 10 個空白窄欄，供每堂手寫登記
/* 欄寬對齊 2.xlsx：編號 姓名 組別 職位 座號 ... 10 個空白欄 ... 缺席 備註 */
/* 職位每一輪都會轉，紙本印職位名稱只會過期 → 只留「①②」標記：
   同一個職位剛好有兩個人時才標，其餘留白。 */
const XL_COLS = [
  {w:4.2, t:'編號'}, {w:12,  t:'姓名'}, {w:5.5, t:'組別'},
  {w:4.6, t:'①②'}, {w:4.6, t:'座號'}
].concat(Array.from({length:XL_SESSIONS},(_,i)=>({w:4.9, t:String(i+1)})))
 .concat([{w:5.6, t:'缺席'}, {w:12, t:'備註'}]);
const XL_NCOL = XL_COLS.length;            // 5 + 10 + 2 = 17
const XL_FIRST_SESSION = 6;                // 第 1 堂在第 6 欄（F）
const XL_ABSENT_COL = XL_FIRST_SESSION + XL_SESSIONS;          // 缺席欄 = 26 (Z)
const XL_NOTE_COL   = XL_ABSENT_COL + 1;                       // 備註欄 = 27 (AA)

function xlEnd(){ return MiniXlsx.colName(XL_NCOL); }
function xlRow(cells,h){ return {h, cells}; }
function xlBlank(n,s){ return Array.from({length:n},()=>({v:'',s})); }
/* 整列合併的說明列 */
function xlFullRow(rows,merges,cell,h){
  const cells=new Array(XL_NCOL).fill(null); cells[0]=cell;
  rows.push({h,cells});
  merges.push(`A${rows.length}:${xlEnd()}${rows.length}`);
}
/* 一位學生的資料列；缺席欄用 COUNTIF 真的去數，不是寫死的數字。
   thick=true 時整列的下框線加粗（依座號頁每 5 個號碼分隔一次）。 */
function xlStudentRow(rows, idx, no, name, grp, mark, thick){
  const r=rows.length+1;
  const a=MiniXlsx.colName(XL_FIRST_SESSION), b=MiniXlsx.colName(XL_ABSENT_COL-1);
  const C = thick?13:4, L = thick?14:5, B = thick?15:6;   // 置中／靠左／空白
  rows.push(xlRow([
    {v:idx,s:C,num:true}, {v:name,s:L}, {v:grp,s:C}, {v:mark||'',s:C}, {v:no,s:C,num:true},
    ...xlBlank(XL_SESSIONS,B),
    {v:`COUNTIF(${a}${r}:${b}${r},"X")`, s:C, f:true},
    {v:'',s:B}
  ],15.75));
}
function xlHeaderRows(rows, merges, cls, subtitle){
  xlFullRow(rows,merges,{v:`${DB.year} 學年度　${cls.name}　課堂登記冊（${subtitle}）`,s:1},24);
  xlFullRow(rows,merges,{v:
    `共 ${cls.students.length} 人　｜空白欄打 X＝缺席、U＝病假，「缺席」欄自動統計　`+
    `｜①② 只在「同一個職位有兩個人」時標示`, s:2},18);
  rows.push(xlRow(XL_COLS.map(c=>({v:c.t,s:3})),22));
}

/* 一組之內，哪些人是「同一個職位的兩個人」→ 標 ①②；單獨一人的職位不標。
   刻意不輸出職位名稱，因為職位每輪順時針轉，印在紙上馬上就過期。 */
function pairMarks(raw){
  const slots=slotsForSize(Math.max(raw.length,6));
  const byAnchor={};
  raw.forEach((no,i)=>{
    if(no==null) return;
    const a=Math.floor(slots[i]/2);
    (byAnchor[a]=byAnchor[a]||[]).push({no, second: slots[i]%2===1});
  });
  const m={};
  Object.values(byAnchor).forEach(arr=>{
    if(arr.length<2) return;                       // 只有一個人 → 不用區分
    arr.forEach(x=>{ m[x.no]= x.second?'②':'①'; });
  });
  return m;
}
function groupInfo(cls){
  const grpOf={}, markOf={};
  [1,2,3,4,5,6].forEach(t=>{
    const raw=(cls.seats&&cls.seats[t])||[];
    const marks=pairMarks(raw);
    raw.forEach(no=>{ if(no==null) return; grpOf[no]=t; markOf[no]=marks[no]||''; });
  });
  return {grpOf, markOf};
}

/* ---- 一個班 = 一張工作表，剛好兩頁（正面依座號、背面依小組）----
   放在同一張工作表才能直接雙面列印；用手動分頁線切在中間，
   兩段補到一樣長，再配 fitToHeight=2，Excel 就會剛好切成兩頁。 */
function buildClassSheet(cls){
  const rows=[], merges=[];
  const {grpOf, markOf}=groupInfo(cls);

  /* ===== 第 1 頁　依座號（每 5 個號碼一條粗線） ===== */
  const students=[...cls.students].sort((a,b)=>a.no-b.no);
  xlHeaderRows(rows,merges,cls,'正面：依座號');
  students.forEach((s,i)=>xlStudentRow(rows, i+1, s.no, s.name,
    grpOf[s.no]?('第'+grpOf[s.no]+'組'):'', markOf[s.no]||'',
    (i+1)%5===0));                                   // 第 5、10、15… 列下方加粗
  const page1End=rows.length;

  /* ===== 第 2 頁　依小組 ===== */
  const g={rows:[], merges:[]};
  xlHeaderRows(g.rows,g.merges,cls,'背面：依小組');
  let idx=0;
  [1,2,3,4,5,6].forEach(t=>{
    /* 直接照「目前座位表」的順序輸出（12 點鐘起順時針），
       所以老師手動調過的位子會原樣反映到紙本上 */
    const raw=(cls.seats&&cls.seats[t])||[];
    const ms=raw.filter(x=>x!=null);
    const marks=pairMarks(raw);
    g.rows.push(xlRow([{v:`第 ${t} 組（${ms.length} 人）`,s:7},...xlBlank(XL_NCOL-1,7)],19));
    g.merges.push(`__G${g.rows.length}`);            // 先記相對列號，稍後補上偏移
    raw.forEach(no=>{
      if(no==null) return;
      xlStudentRow(g.rows, ++idx, no, studentName(no)||('座號'+no), '第'+t+'組', marks[no]||'');
    });
  });

  /* 兩段補到一樣長 → fitToHeight=2 會平均切成兩頁，兩頁都塞得下 */
  const half=Math.max(page1End, g.rows.length);
  while(rows.length<half) rows.push(xlRow([],15.75));
  const offset=rows.length;

  g.rows.forEach(r=>rows.push(r));
  g.merges.forEach(m=>{
    if(String(m).startsWith('__G')){
      const r=parseInt(String(m).slice(3),10)+offset;
      merges.push(`A${r}:E${r}`);
    }else{
      const mm=String(m).replace(/(\d+)/g,(d)=>String(parseInt(d,10)+offset));
      merges.push(mm);
    }
  });

  /* 缺席欄「0」用極淺灰字，印出來不搶眼；兩頁（依座號／依小組）都要涵蓋 */
  const absCol=MiniXlsx.colName(XL_ABSENT_COL);
  const condFmt=[{sqref:`${absCol}4:${absCol}${rows.length}`}];

  return { name:sheetName(cls.name), cols:XL_COLS, rows, merges, condFmt,
           rowBreaks:[offset], fitH:2 };
}

function sheetName(s){ return s.replace(/[\\\/\?\*\[\]:]/g,'_').slice(0,31); }

/* ---------------- 11b. 座位表下載（A4 橫向、一頁的 PNG）----------------
   直接畫在 canvas 上，含班級抬頭、六張蜂巢桌、講台。200 dpi 可直接列印。 */
function downloadSeatingPNG(){
  const cls=curClass();
  if(!cls) return alert('請先選擇班級');
  const DPI=200, W=Math.round(297/25.4*DPI), H=Math.round(210/25.4*DPI);   // 2339 × 1654
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
  const FONT='"Microsoft JhengHei","Noto Sans TC",sans-serif';
  g.fillStyle='#fff'; g.fillRect(0,0,W,H);

  const M=46, TITLE_H=118, PODIUM_H=96;
  /* 抬頭 */
  g.fillStyle='#111'; g.textAlign='center'; g.textBaseline='middle';
  g.font=`bold 52px ${FONT}`;
  g.fillText(`${DB.year} 學年度　${cls.name}　座位表`, W/2, M+26);
  g.font=`26px ${FONT}`; g.fillStyle='#555';
  g.fillText(`第 ${DB.round} 輪職位　·　深色＝正1（內圈）　淺色＝正2（外圈）　·　日期 ______ / ______　共 ${cls.students.length} 人`,
             W/2, M+78);

  /* 版面：沿用畫面上的蜂巢幾何，等比縮到可用區域 */
  const areaW=W-M*2, areaH=H-M*2-TITLE_H-PODIUM_H;
  const modelW=UNIT_W*3+16, modelH=UNIT_H*2+8;
  const s=Math.min(areaW/modelW, areaH/modelH);
  const ox=(W-modelW*s)/2, oy=M+TITLE_H;

  const hexPath=(cx,cy,w,h)=>{           // 平頂正六邊形
    g.beginPath();
    g.moveTo(cx-w/2+w*0.25, cy-h/2); g.lineTo(cx+w/2-w*0.25, cy-h/2);
    g.lineTo(cx+w/2, cy);              g.lineTo(cx+w/2-w*0.25, cy+h/2);
    g.lineTo(cx-w/2+w*0.25, cy+h/2);   g.lineTo(cx-w/2, cy);
    g.closePath();
  };
  const fit=(txt,max,px,weight)=>{       // 文字塞不下就縮字級
    let f=px;
    do{ g.font=`${weight||''} ${f}px ${FONT}`; if(g.measureText(txt).width<=max) break; f-=1; }
    while(f>8);
    return f;
  };

  TABLE_LAYOUT.forEach((tno,i)=>{
    const col=i%3, row=Math.floor(i/3);
    const cx=ox+(col*UNIT_W+UNIT_W/2)*s, cy=oy+(row*UNIT_H+UNIT_H/2)*s;
    const raw=(cls.seats&&cls.seats[tno])||[];
    const slots=slotsForSize(Math.max(raw.length,6));
    const marks=pairMarks(raw);          // 只有同一職位兩個人時才有 ①②

    /* 組別底色（內縮 2px：3 點鐘的外圈座位剛好貼齊邊界，縮太多會被切到） */
    g.save();
    g.globalAlpha=.10; g.fillStyle=GROUP_TINT[tno];
    g.beginPath(); g.roundRect(ox+col*UNIT_W*s+2, oy+row*UNIT_H*s+2,
                               UNIT_W*s-4, UNIT_H*s-4, 26); g.fill();
    g.globalAlpha=1; g.setLineDash([10,7]); g.lineWidth=2;
    g.strokeStyle=GROUP_TINT[tno]; g.stroke(); g.restore();

    /* 中心桌 */
    const hw=HEX_W*s, hh=HEX_H*s;
    hexPath(cx,cy,hw,hh);
    g.fillStyle='#f2f4f8'; g.fill();
    g.lineWidth=3; g.strokeStyle=GROUP_TINT[tno]; g.stroke();
    g.fillStyle='#8a93a5'; g.textAlign='center'; g.textBaseline='middle';
    g.font=`bold ${Math.round(hh*0.46)}px ${FONT}`;
    g.fillText(String(tno), cx, cy);

    /* 座位 */
    slots.forEach((slot,idx)=>{
      const no=raw[idx]; if(no==null) return;
      const rr=roleAtSlot(slot,DB.round);
      const R=(rr.second?R2:R1)*s, rad=slot*30*Math.PI/180;
      const x=cx+Math.sin(rad)*R, y=cy-Math.cos(rad)*R;
      const col2=roleColor(slot,DB.round);

      hexPath(x,y,hw,hh); g.fillStyle=col2; g.fill();
      hexPath(x,y,hw-14*s,hh-14*s); g.fillStyle='#fff'; g.fill();

      const inner=hw*0.74;
      /* 職稱印小小一行在最上面，方便學生對照；只有「同一職位兩個人」時才加 ①②。
         字級刻意壓小、擺在姓名正上方，不會壓到姓名這個最重要的文字。 */
      const mk=marks[no];
      const roleTxt=rr.role.name+(mk||'');
      const rf=fit(roleTxt, inner, Math.round(hh*0.155), 'bold');
      g.fillStyle=col2; g.font=`bold ${rf}px ${FONT}`;
      g.fillText(roleTxt, x, y-hh*0.30);
      /* 姓名 */
      const nm=studentName(no)||('座號'+no);
      const nf=fit(nm, inner, Math.round(hh*0.28), 'bold');
      g.fillStyle='#111'; g.font=`bold ${nf}px ${FONT}`;
      g.fillText(nm, x, y+hh*0.02);
      /* 座號 */
      const sf=Math.round(hh*0.15);
      g.fillStyle='#666'; g.font=`${sf}px ${FONT}`;
      g.fillText('座號 '+no, x, y+hh*0.27);
    });
  });

  /* 講台 */
  const pw=Math.min(760, W*0.42), py=H-M-PODIUM_H/2;
  g.strokeStyle='#444'; g.lineWidth=3; g.setLineDash([]);
  g.beginPath(); g.roundRect(W/2-pw/2, py-38, pw, 76, 14); g.stroke();
  g.fillStyle='#333'; g.font=`bold 40px ${FONT}`;
  g.fillText('▲　講　台　▲', W/2, py);

  cv.toBlob(b=>{
    dl(b, `${DB.year}_${cls.name}_座位表_第${DB.round}輪_${todayStr()}.png`);
    toast('座位表已下載（A4 橫向 200dpi，可直接列印）');
  },'image/png');
}

/* 沒有班級就當場建一個，回傳是否成功 */
function ensureClass(){
  if(curClass()) return true;
  const n=($('#inp-newclass').value.trim())||prompt('請先輸入班級名稱（例如 115 高一忠）','');
  if(!n) return false;
  const id=uid(); DB.classes[id]={id,year:DB.year,name:n,students:[],seats:{},size:6};
  DB.activeClass=id; $('#inp-newclass').value=''; save(); refreshSelectors();
  return true;
}

function exportRegisterXlsx(){
  if(typeof MiniXlsx==='undefined') return alert('xlsx.js 未載入');

  /* 名單框裡貼了東西但還沒生效 → 先幫他匯入，不要讓他印出一份空白 */
  const pend=rosterPending();
  if(pend){
    if(!curClass() && !ensureClass()) return;
    if(confirm(`名單框裡有 ${pend.length} 位學生還沒生效。\n要先匯入「${curClass().name}」再產生 Excel 嗎？`)){
      commitRoster(pend);
      toast(`已匯入 ${pend.length} 人`);
    }
  }

  const list=Object.values(DB.classes).filter(c=>c.year===DB.year);
  if(!list.length) return alert('這個學年度還沒有班級');
  const empty=list.filter(c=>!c.students.length).map(c=>c.name);
  if(empty.length && !confirm(
      `這些班級沒有學生，印出來會是空白：\n　${empty.join('、')}\n\n仍要繼續產生嗎？`)) return;
  const prev=DB.activeClass;
  const sheets=list.map(c=>{ DB.activeClass=c.id; return buildClassSheet(c); });
  DB.activeClass=prev;
  refreshSelectors();
  dl(MiniXlsx.build(sheets), `${DB.year}學年度_課堂登記冊_${todayStr()}.xlsx`);
  toast(`已產生 ${list.length} 個班級：每班一張工作表，正面依座號、背面依小組，可直接雙面列印`);
}

/* ---------------- 12. 說明頁 ---------------- */
function renderHelp(){
  $('#help-wrap').innerHTML=`
  <div class="card full">
    <h3>🌈 加分機制總覽</h3>
    <p class="big-rule">一個人講話＝一個人的燈；全組的燈都亮＝全組的分。</p>
    <ul>
      <li><b>個人發言 +1</b>：點一下學生卡片。</li>
      <li><b>個人扣分 −1</b>：點卡片右邊的「−」。</li>
      <li><b>全組每人 +1</b>：組卡片上方的綠色按鈕，老師直接給的獎勵分。
        <b>不會算成發言</b>，所以不會點亮燈號、不會白送一次彩虹 —— 彩虹要靠學生真的開口才拿得到。</li>
      <li><b>全組每人 −1</b>：組卡片上方的紅色按鈕（例如用了 30 秒會議卻答錯）。要不要扣、扣誰，老師當場決定。</li>
      <li><b>🌈 彩虹貫通 +${RAINBOW_BONUS}（全組每人）</b>：<b>這一組每一個人</b>本堂都發言過至少一次，整條彩虹亮起 ⭐ 無敵星星，全組加分。</li>
      <li><b>可以無限次疊加</b>：全組每人再各發言一次，就再貫通一次（⭐×2、⭐×3…）。所以講過的人會主動去拉還沒講的人開口。</li>
      <li><b>跨堂累積</b>：本堂可以單獨清空，學年度累積分數會一直留著。</li>
    </ul>
  </div>
  <div class="card">
    <h3>💡 燈號怎麼算（重要）</h3>
    <ul>
      <li><b>一個人一盞燈</b>，不是一個顏色一盞燈。</li>
      <li>7 人的組別就有 <b>7 盞燈</b>：紅、橙、黃、<b>淡黃</b>、綠、藍、靛 —— 淡色那一盞是「正2」自己的燈。</li>
      <li>所以正1 講了不代表正2 的燈會亮，<b>兩個人都要開口</b>，這組才會貫通。</li>
      <li>扣分不會把燈弄熄；燈只看「有沒有講過」。</li>
    </ul>
  </div>
  <div class="card">
    <h3>🎩 正1 / 正2</h3>
    <ul>
      <li>沒有「副手」這種東西 —— 兩個人都是正職，只差<b>深色＝正1（內圈）、淺色＝正2（外圈）</b>。</li>
      <li>同一個職位兩個人一起扛，職責一模一樣。</li>
      <li>座位卡上會標 <b>①②</b>；一組剛好 6 人時不標。</li>
    </ul>
  </div>
  <div class="card">
    <h3>🎲 抽籤與求生卡</h3>
    <ul>
      <li>順序：給等待時間 → 組內討論 → 點志願者 → <b>真的沒人才抽籤</b>。優先抽本堂還沒發言的人。</li>
      <li>抽到的人可任選一張求生卡。<b>每張卡，每組每堂課各限用一次</b>（一組一堂最多 4 次機會），用過會變灰。</li>
      ${LIFELINES.map(l=>`<li>${l.t}：${l.d}</li>`).join('')}
    </ul>
  </div>
  <div class="card">
    <h3>🔁 職位怎麼輪</h3>
    <ul>
      <li>起點固定：<b>12 點鐘方向 = 第 1 輪的紅色（策略長）</b>。</li>
      <li>下次上課切「第 2 輪」→ <b>職位順時針轉一格，學生不用換位子</b>。</li>
      <li>轉六輪，每個人都當過六種職位。</li>
    </ul>
  </div>
  <div class="card">
    <h3>🪑 蜂巢座位</h3>
    <ul>
      <li>學生格本身就是<b>正六邊形</b>，直接貼著中心桌長出去，不浪費空間。</li>
      <li>內圈 6 格緊貼桌子（正1）；第 7 人起長出<b>外圈</b>，卡在兩個內圈中間（正2）。</li>
      <li>每組有<b>自己的淺色底＋虛線框</b>，一眼看出組別分佈。</li>
      <li>最多每組 12 人（6 正1 + 6 正2）。</li>
    </ul>
  </div>`;
}
function renderRoleCards(){
  $('#role-cards').innerHTML=ROLES.map((r,i)=>`
    <div class="role-card" style="border-left-color:var(${r.color})">
      <h4 style="color:var(${r.color})">${['🔴','🟠','🟡','🟢','🔵','🟣'][i]} ${r.name}</h4>
      <div class="en">${r.en}</div>
      <ul>${r.duty.map(d=>`<li>${d}</li>`).join('')}</ul>
      <div class="say">口頭禪：${r.say}</div>
      <div class="dep">
        <span class="chip" style="background:var(${r.color});color:#fff">${r.name}①　正1・內圈</span>
        <span class="chip" style="background:var(${r.light});color:#10131a">${r.name}②　正2・外圈</span>
        <div style="margin-top:6px">兩人職責完全相同，<b>各自有一盞燈</b>，都要發言這組才會貫通。</div>
      </div>
    </div>`).join('');
}

/* ---------------- 13. UI 綁定 ---------------- */
function refreshSelectors(){
  $('#sel-year').innerHTML=DB.years.map(y=>`<option ${y===DB.year?'selected':''}>${y}</option>`).join('');
  const cls=Object.values(DB.classes).filter(c=>c.year===DB.year);
  $('#sel-class').innerHTML=cls.length
    ? cls.map(c=>`<option value="${c.id}" ${c.id===DB.activeClass?'selected':''}>${c.name}</option>`).join('')
    : '<option value="">（尚無班級）</option>';
  if(!cls.length) DB.activeClass=null;                              // 這個學年度沒有班級
  else if(!cls.find(c=>c.id===DB.activeClass)) DB.activeClass=cls[0].id;
  $('#sel-class').value = DB.activeClass || '';
  $('#sel-round').value=DB.round;
  $('#sel-rotdir') && ($('#sel-rotdir').value=String(rotDir()));
  $('#inp-session').value=DB.session;

  /* 「把班級搬到別的學年度」的兩個選單：班級列全部學年度，才搬得動建錯年度的班 */
  const all=Object.values(DB.classes);
  $('#sel-moveclass').innerHTML = all.length
    ? all.map(c=>`<option value="${c.id}" ${c.id===DB.activeClass?'selected':''}>${c.year} · ${c.name}</option>`).join('')
    : '<option value="">（尚無班級）</option>';
  $('#sel-moveyear').innerHTML = DB.years.map(y=>`<option value="${y}">${y} 學年度</option>`).join('');

  syncRosterBox();
}
function yearLog(msg){
  const el=$('#year-log'); if(el) el.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;
  toast(msg);
}
function renderAll(){ refreshSelectors(); renderSeats(); renderScoreboard(); renderRoll(); renderStats(); }

/* ---- 名單文字框：貼上就算數，但「內容屬於哪個班級」必須記牢 ----
   rosterOwner 記錄文字框現在的內容是替哪個班級打的。
   切換班級或學年度時，若擁有者對不上，就一律以「選到的班級」為準重載，
   否則會發生 B 班的名單被當成待匯入內容、寫進 A 班的慘劇。 */
let rosterOwner = null;
function rosterInBox(){ return parseRoster($('#ta-roster').value); }
function sameRoster(a,b){
  return a.length===b.length && a.every((s,i)=>s.no===b[i].no && s.name===b[i].name);
}
/* 文字框裡有東西、屬於目前班級、而且和目前名單不一樣 → 還沒生效 */
function rosterPending(){
  if(rosterOwner!==DB.activeClass) return null;      // 別班留下來的，不算數
  const list=rosterInBox(); if(!list.length) return null;
  const c=curClass();
  return (c && sameRoster(c.students,list)) ? null : list;
}
/* 這份名單是不是某個「既有班級」的內容（用來判斷是不是切換後殘留的）
   只比對同一學年度：不同學年度剛好用了同一份名單是正常的（例如沿用上學期班級），
   不該因此擋下匯入。 */
function rosterMatchesExistingClass(list){
  return Object.values(DB.classes)
    .find(c=>c.year===DB.year && c.students.length && sameRoster(c.students,list)) || null;
}
function syncRosterBox(){
  const ta=$('#ta-roster'), c=curClass();
  const text = c ? c.students.map(s=>`${s.no},${s.name}`).join('\n') : '';
  if(rosterOwner!==DB.activeClass){          // 換班／換學年度 → 一律以選到的班級為準
    ta.value=text; rosterOwner=DB.activeClass;
  }else if(!rosterPending()){                // 同一班且沒有未生效的編輯 → 保持同步
    ta.value=text;
  }
  updateRosterStatus();
}
function updateRosterStatus(){
  const el=$('#roster-count'), c=curClass(), pend=rosterPending();
  if(pend){
    el.innerHTML=`<b style="color:var(--warn)">⚠️ 偵測到 ${pend.length} 位，尚未生效</b>`+
                 `<span style="color:var(--txt2)"> —— 點一下框外，或按「📥 匯入」</span>`;
    $('#btn-import').classList.add('btn-warn');
  }else{
    el.textContent = c ? `✅ 目前 ${c.students.length} 人（已生效）` : '尚未建立班級';
    $('#btn-import').classList.remove('btn-warn');
  }
}
/* 真正把名單寫進班級；沒班級就回報 false 讓呼叫端決定怎麼處理。
   ★ 絕對不能無條件重排座位 —— 老師手動排好的位子必須留著。
     只有「還沒排過」「座位上有人已不在名單」「有人沒座位」才重新自動排。 */
function commitRoster(list){
  const c=curClass(); if(!c) return false;
  const seats=c.seats||{};
  const seated=[];
  [1,2,3,4,5,6].forEach(t=>(seats[t]||[]).forEach(x=>{ if(x!=null) seated.push(x); }));
  const valid=new Set(list.map(s=>s.no));
  const noSeatsYet = seated.length===0;
  const hasStale   = seated.some(no=>!valid.has(no));            // 座位上有已退選的人
  const hasUnseated= list.some(s=>!seated.includes(s.no));       // 有人沒位子
  c.students=list; rosterOwner=c.id; save(); refreshSelectors();
  if(noSeatsYet || hasStale || hasUnseated) autofillSeats();
  else renderSeats();                                            // 保留手動排好的座位
  renderScoreboard(); renderStats(); updateRosterStatus();
  return true;
}

function bind(){
  $$('.tab').forEach(t=>t.onclick=()=>{
    $$('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    $$('.panel').forEach(p=>p.classList.remove('active'));
    $('#'+t.dataset.panel).classList.add('active');
    if(t.dataset.panel==='p-stats') renderStats();
    if(t.dataset.panel==='p-seat')  { renderSeats(); applyZoom(); }
    if(t.dataset.panel==='p-live')  renderScoreboard();
    if(t.dataset.panel==='p-roll')  renderRoll();
  });

  $('#sel-rollsort').onchange=renderRoll;
  $('#btn-roll-allpresent').onclick=()=>{
    const c=curClass(); if(!c) return;
    const todo=c.students.filter(s=>!attendOf(s.no));
    if(!todo.length) return toast('每個人都已經點過名了');
    if(!confirm(`把還沒點名的 ${todo.length} 人全部設為「出席」？\n（已經標記遲到／請假的人不會被覆蓋）`)) return;
    todo.forEach(s=>setAttend(s.no,'present'));
    toast(`已將 ${todo.length} 人設為出席`);
  };
  $('#btn-roll-clear').onclick=()=>{
    const c=curClass(); if(!c) return;
    if(!confirm(`清空「${DB.session}」這一堂的所有點名註記？\n（加分紀錄不受影響）`)) return;
    DB.records=DB.records.filter(r=>!(r.type==='attend'&&r.year===DB.year&&
      r.classId===c.id&&r.session===DB.session));
    save(); renderRoll(); toast('本堂註記已清空');
  };

  $('#btn-theme').onclick=()=>{
    DB.theme = DB.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=DB.theme;
    $('#btn-theme').textContent = DB.theme==='dark'?'🌙':'☀️';
    save(); renderSeats(); renderScoreboard();
  };
  $('#sel-year').onchange=e=>{ DB.year=e.target.value; save(); renderAll(); };
  $('#sel-class').onchange=e=>{ DB.activeClass=e.target.value; save(); renderAll(); };
  /* ---- 收合上方狀態列：投影時把版面讓給座位表 ---- */
  const applyCompact=()=>{
    document.body.classList.toggle('compact', !!DB.compact);
    const b=$('#btn-collapse');
    if(b) b.textContent = DB.compact ? '⌄ 展開設定' : '⌃ 收合上方';
    if(typeof applyZoom==='function') applyZoom();
  };
  $('#btn-collapse').onclick=()=>{ DB.compact=!DB.compact; save(); applyCompact(); };
  addEventListener('keydown',e=>{
    if(e.key!=='h'&&e.key!=='H') return;
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;   // 打字時不要誤觸
    DB.compact=!DB.compact; save(); applyCompact();
  });
  applyCompact();

  /* ---- 學年度：直接在最上面改，不用跑到「名單與雲端」 ---- */
  $('#btn-year-add').onclick=()=>{
    const y=(prompt('新增學年度（例如 115）：','')||'').trim(); if(!y) return;
    if(DB.years.includes(y)){ DB.year=y; save(); renderAll(); return toast(`已切到 ${y}`); }
    DB.years.push(y); DB.years.sort(); DB.year=y; save(); renderAll();
    toast(`已新增學年度 ${y}`);
  };
  $('#btn-year-edit').onclick=()=>{
    const old=DB.year;
    const y=(prompt(`把學年度「${old}」改成：`, old)||'').trim();
    if(!y||y===old) return;
    if(DB.years.includes(y)) return alert(`學年度 ${y} 已經存在。`);
    DB.years=DB.years.map(x=>x===old?y:x).sort();
    Object.values(DB.classes).forEach(c=>{ if(c.year===old) c.year=y; });
    DB.records.forEach(r=>{ if(r.year===old) r.year=y; });
    DB.year=y; save(); renderAll();
    toast(`已把 ${old} 改名為 ${y}（班級與紀錄一併更新）`);
  };

  $('#sel-rotdir').onchange=e=>{
    DB.rotDir=parseInt(e.target.value,10); save(); renderAll();
    toast(DB.rotDir===1 ? '改為：學生的職位順著職位表往下走'
                        : '改為：職位牌在桌上順時針移動');
  };
  $('#sel-round').onchange=e=>{ DB.round=parseInt(e.target.value,10); save(); renderSeats(); renderScoreboard(); };
  $('#inp-session').onchange=e=>{ DB.session=e.target.value||todayStr(); save(); renderScoreboard(); renderRoll(); renderStats(); };

  $('#inp-groupsize').onchange=e=>{ const c=curClass(); if(!c) return;
    c.size=Math.max(4,Math.min(12,parseInt(e.target.value,10)||6)); save(); renderSeats(); };
  $('#btn-autofill').onclick=()=>{
    const c=curClass();
    const seated=c&&[1,2,3,4,5,6].some(t=>((c.seats||{})[t]||[]).some(x=>x!=null));
    if(seated && !confirm('這會用座號順序重新排一次，你手動調整過的位子會被覆蓋。\n確定要重排嗎？')) return;
    autofillSeats();
  };
  $('#btn-clearseat').onclick=()=>{ const c=curClass(); if(!c) return;
    if(confirm('清空本班座位安排？（不會刪除名單與分數）')){ c.seats={}; save(); renderSeats(); renderScoreboard(); } };
  $('#btn-print').onclick=()=>{ preparePrint(); setTimeout(()=>window.print(),60); };
  const zEl=$('#inp-zoom'); if(zEl) zEl.oninput=applyZoom;
  const tEl=$('#btn-truesize'); if(tEl) tEl.onclick=trueSize;

  $('#btn-seat-ok').onclick=()=>commitSeat();
  $('#btn-seat-cancel').onclick=()=>$('#modal-seat').classList.remove('show');
  $('#btn-seat-del').onclick=()=>commitSeat(null);
  $('#inp-seatno').oninput=e=>{ const n=e.target.value.trim();
    $('#seat-preview').textContent = n===''?'—':(studentName(n)||'查無此座號'); };
  $('#inp-seatno').onkeydown=e=>{ if(e.key==='Enter') commitSeat(); };
  $('#inp-seatsearch').oninput=renderSeatPicker;

  $('#btn-clear-session').onclick=()=>{
    if(!confirm(`確定清空「${DB.session}」這一堂的加分？\n（點名註記會保留；要清點名請到「📋 課堂點名」）`)) return;
    DB.records=DB.records.filter(r=>!(r.year===DB.year&&r.classId===DB.activeClass&&
      r.session===DB.session&&r.type!=='attend'));
    save(); renderScoreboard(); renderStats(); toast('本堂加分已清空（點名註記保留）');
  };
  $('#btn-undo').onclick=()=>{
    const idx=[...DB.records].map((r,i)=>({r,i}))
      .filter(x=>x.r.year===DB.year&&x.r.classId===DB.activeClass&&x.r.session===DB.session
                 &&x.r.type!=='attend').pop();
    if(!idx) return toast('本堂沒有可復原的紀錄');
    DB.records.splice(idx.i,1); save(); renderScoreboard(); toast('已復原一筆');
  };

  $('#btn-lottery').onclick=openLottery;
  $('#btn-do-lottery').onclick=doLottery;
  $('#btn-close-lottery').onclick=()=>$('#modal-lottery').classList.remove('show');
  $('#btn-lottery-score').onclick=()=>{
    if(!lotteryPick) return toast('還沒抽人');
    addPoint(lotteryPick.no, lotteryPick.table, lotteryPick.slot, 1);
    toast(`${studentName(lotteryPick.no)} +1`);
    $('#modal-lottery').classList.remove('show');
  };
  $('#btn-lottery-plus').onclick=()=>{
    if(!lotteryPick) return toast('還沒抽人');
    if(!confirm(`第 ${lotteryPick.table} 組 全組每人 +1 分？`)) return;
    groupAward(lotteryPick.table,1);
    /* 刻意不放紙花：紙花＝彩虹貫通的專屬訊號。
       抽籤答對只是全組 +1，不是貫通，放了會讓學生誤以為賺到 +5。 */
    $('#modal-lottery').classList.remove('show');
  };
  $('#btn-lottery-minus').onclick=()=>{
    if(!lotteryPick) return toast('還沒抽人');
    if(!confirm(`第 ${lotteryPick.table} 組 全組每人 −1 分？`)) return;
    groupDeduct(lotteryPick.table,-1);
    $('#modal-lottery').classList.remove('show');
  };

  $('#btn-addclass').onclick=()=>{
    const n=$('#inp-newclass').value.trim(); if(!n) return alert('請輸入班級名稱');
    /* 同一學年度不允許重名 —— 否則下拉選單會出現好幾個一模一樣的班，
       誰是誰分不出來，點名還會挑到空的那個。 */
    const dup=Object.values(DB.classes).find(c=>c.year===DB.year&&c.name===n);
    if(dup){
      if(!confirm(`${DB.year} 學年度已經有「${n}」了（${dup.students.length} 人）。\n\n`+
                  `按「確定」＝直接切過去用那一個（建議）\n按「取消」＝什麼都不做`)) return;
      DB.activeClass=dup.id; $('#inp-newclass').value='';
      rosterOwner=null; save(); renderAll();
      return toast(`已切換到既有的 ${n}`);
    }
    /* 文字框裡如果是「別班留下來的」名單，絕不能跟著複製到新班級 */
    const list=parseRoster($('#ta-roster').value);
    const leftover=list.length ? rosterMatchesExistingClass(list) : null;

    const id=uid(); DB.classes[id]={id,year:DB.year,name:n,students:[],seats:{},size:6};
    DB.activeClass=id; $('#inp-newclass').value='';

    if(list.length && !leftover){          // 真的是新貼上的名單 → 一起匯入
      DB.classes[id].students=list; save();
      rosterOwner=id; refreshSelectors(); autofillSeats();
      renderScoreboard(); renderStats();
      return toast(`已新增班級 ${n}，並匯入 ${list.length} 人、自動排入座位`);
    }
    rosterOwner=null; save(); renderAll();   // rosterOwner 歸零 → 文字框改成新班級的（空的）
    toast(leftover ? `已新增班級 ${n}（文字框裡是「${leftover.name}」的名單，未帶入）`
                   : `已新增班級 ${n}`);
  };
  $('#btn-delclass').onclick=()=>{
    const c=curClass(); if(!c) return;
    if(!confirm(`刪除班級「${c.name}」及其所有加分紀錄？此動作無法復原。`)) return;
    DB.records=DB.records.filter(r=>r.classId!==c.id);
    delete DB.classes[c.id]; DB.activeClass=null; save(); renderAll();
  };
  $('#btn-import').onclick=()=>{
    const list=parseRoster($('#ta-roster').value);
    if(!list.length) return alert('沒有解析到任何學生。\n每行請寫成「座號,姓名」，例如：\n1,王小明');
    if(!rosterWarn(list)) return;
    if(!ensureClass()) return;
    commitRoster(list);
    toast(`已匯入 ${list.length} 人，並自動排入座位`);
  };
  /* 貼上後點一下框外就自動生效，不必記得按匯入 */
  $('#ta-roster').oninput=()=>{ rosterOwner=DB.activeClass; updateRosterStatus(); };
  $('#ta-roster').onchange=()=>{
    const pend=rosterPending(); if(!pend) return;
    if(!curClass()){ updateRosterStatus(); return; }   // 還沒有班級，留給按鈕流程處理
    commitRoster(pend);
    toast(`已自動匯入 ${pend.length} 人並排好座位`);
  };
  const addYear=()=>{
    const y=$('#inp-newyear').value.trim(); if(!y) return;
    if(DB.years.includes(y)){ DB.year=y; $('#inp-newyear').value=''; save(); renderAll();
      return toast(`學年度 ${y} 已存在，直接切過去`); }
    DB.years.push(y); DB.years.sort();
    DB.year=y; $('#inp-newyear').value=''; save(); renderAll();
    toast(`已新增學年度 ${y}`);
  };
  $('#btn-addyear').onclick=addYear;
  $('#inp-newyear').onkeydown=e=>{ if(e.key==='Enter') addYear(); };

  $('#btn-renameyear').onclick=()=>{
    const old=DB.year;
    const y=(prompt(`把學年度「${old}」改成：`, old)||'').trim();
    if(!y||y===old) return;
    if(DB.years.includes(y)) return alert(`學年度 ${y} 已經存在，請先刪除或改用別的名稱。`);
    DB.years=DB.years.map(x=>x===old?y:x).sort();
    Object.values(DB.classes).forEach(c=>{ if(c.year===old) c.year=y; });
    DB.records.forEach(r=>{ if(r.year===old) r.year=y; });
    DB.year=y; save(); renderAll();
    yearLog(`已把 ${old} 改名為 ${y}（班級與紀錄一併更新）`);
  };
  $('#btn-delyear').onclick=()=>{
    if(DB.years.length<=1) return alert('至少要保留一個學年度。');
    const y=DB.year;
    const cls=Object.values(DB.classes).filter(c=>c.year===y);
    const recs=DB.records.filter(r=>r.year===y).length;
    if(!confirm(`刪除學年度「${y}」？\n會一併刪除 ${cls.length} 個班級、${recs} 筆加分紀錄。\n此動作無法復原，建議先「⬇️ 匯出整包 JSON」。`)) return;
    cls.forEach(c=>delete DB.classes[c.id]);
    DB.records=DB.records.filter(r=>r.year!==y);
    DB.years=DB.years.filter(x=>x!==y);
    DB.year=DB.years[0]; DB.activeClass=null; save(); renderAll();
    yearLog(`已刪除學年度 ${y}`);
  };
  $('#btn-moveclass').onclick=()=>{
    const id=$('#sel-moveclass').value, to=$('#sel-moveyear').value;
    const c=DB.classes[id]; if(!c||!to) return;
    if(c.year===to) return toast('本來就在這個學年度');
    const from=c.year;
    if(!confirm(`把「${c.name}」從 ${from} 搬到 ${to}？\n該班的加分紀錄會一起搬過去。`)) return;
    c.year=to;
    DB.records.forEach(r=>{ if(r.classId===id) r.year=to; });
    save(); renderAll();
    yearLog(`已把 ${c.name} 從 ${from} 搬到 ${to}`);
  };

  $('#btn-save-gas').onclick=()=>{
    DB.gasUrl=$('#inp-gas').value.trim(); DB.gasToken=$('#inp-token').value.trim();
    DB.sheetUrl=$('#inp-sheeturl').value.trim();
    save(); logSync('已儲存網址、金鑰與試算表連結'); toast('已儲存');
  };
  /* 一鍵直達後台 —— 不用再翻雲端硬碟找那份試算表 */
  $('#btn-open-sheet').onclick=()=>{
    const u=($('#inp-sheeturl').value||DB.sheetUrl||'').trim();
    if(!u) return alert('還沒填試算表網址。\n\n打開你的後台試算表，把網址列整段複製貼到上面那格，按「儲存」。');
    if(!/docs\.google\.com\/spreadsheets/.test(u))
      return alert('這看起來不是 Google 試算表的網址。\n應該長得像：\nhttps://docs.google.com/spreadsheets/d/XXXX/edit');
    window.open(u,'_blank','noopener');
  };
  /* 從試算表網址推導出它的 Apps Script 編輯器位置 */
  $('#btn-open-gasedit').onclick=()=>{
    const u=($('#inp-sheeturl').value||DB.sheetUrl||'').trim();
    const m=u.match(/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
    if(!m) return alert('請先填好試算表網址，才知道要開哪一份的 Apps Script。');
    /* 試算表 → 擴充功能 → Apps Script 的等效直達網址 */
    window.open(`https://docs.google.com/spreadsheets/d/${m[1]}/edit#gid=0`,'_blank','noopener');
    alert('已開啟試算表。\n\n在那個分頁按「擴充功能 → Apps Script」就會進到程式碼編輯器。\n（Google 不提供從試算表 ID 直接跳編輯器的公開網址，所以只能到這一步。）');
  };
  $('#chk-autosync').onchange=e=>{ DB.autoSync=e.target.checked; save(); };
  $('#btn-push').onclick=pushAll;
  $('#btn-pull').onclick=pullAll;
  $('#btn-test').onclick=async()=>{
    try{ const r=await gasPost({action:'ping'});
      logSync(r.status==='success'?('✅ 連線正常，試算表：'+r.sheet):('❌ '+r.message)); }
    catch(e){ logSync('❌ '+e.message); }
  };
  $('#btn-gencode').onclick=()=>{
    const t=Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,10);
    $('#inp-token').value=t; DB.gasToken=t; save(); toast('已產生金鑰，記得同步貼到 Apps Script');
  };

  $('#sel-scope').onchange=renderStats;
  $('#btn-export-csv').onclick=()=>{
    const rs=statScopeRecords();
    const head=['時間','學年度','班級','日期','輪次','座號','姓名','組別','職位','正1/正2','分數','類型','備註'];
    const rows=rs.map(r=>[r.ts,r.year,r.className,r.session,r.round,r.no,r.name,r.table,r.roleName,
      r.second?'正2':'正1',r.points,r.type,r.note||'']);
    const csv='﻿'+[head,...rows].map(a=>a.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    dl(new Blob([csv],{type:'text/csv'}), `閱讀思考加分_${DB.year}_${todayStr()}.csv`);
  };
  $('#btn-export-xlsx').onclick=exportRegisterXlsx;
  $('#btn-export-xlsx2').onclick=exportRegisterXlsx;
  $('#btn-export-png').onclick=downloadSeatingPNG;

  /* ---- 清理：空班級、同年度重名班級 ---- */
  $('#btn-tidy').onclick=()=>{
    const all=Object.values(DB.classes);
    const usedIds=new Set(DB.records.map(r=>r.classId));
    /* 空班級＝沒名單、沒座位、也沒有任何紀錄，刪掉不會損失東西 */
    const empties=all.filter(c=>!c.students.length &&
      !Object.values(c.seats||{}).flat().filter(x=>x!=null).length && !usedIds.has(c.id));
    /* 同年度同名：保留人數最多的那個，其餘若是空的才刪 */
    const seen={}, dups=[];
    all.sort((a,b)=>b.students.length-a.students.length).forEach(c=>{
      const k=c.year+'||'+c.name;
      if(seen[k] && !c.students.length && !usedIds.has(c.id)) dups.push(c);
      else seen[k]=c;
    });
    const kill=[...new Set([...empties,...dups])];
    if(!kill.length) return alert('沒有可以清理的班級 —— 每個班都有名單或有紀錄。');
    if(!confirm(`要刪掉這 ${kill.length} 個空班級嗎？\n\n`+
      kill.map(c=>`・${c.year} · ${c.name}`).join('\n')+
      `\n\n（有名單或有加分／點名紀錄的班一律不動）`)) return;
    kill.forEach(c=>delete DB.classes[c.id]);
    if(!DB.classes[DB.activeClass]) DB.activeClass=null;
    save(); renderAll();
    logBackup(`已清理 ${kill.length} 個空班級。`);
  };

  /* ---- 全部清空：測試完要正式用之前的一鍵重來 ---- */
  $('#btn-wipe').onclick=()=>{
    const nC=Object.keys(DB.classes).length, nR=DB.records.length;
    if(!confirm(`確定清空全部資料？\n\n`+
      `・${DB.years.length} 個學年度\n・${nC} 個班級\n・${nR} 筆加分與點名紀錄\n\n`+
      `Apps Script 網址與金鑰會保留。\n此動作無法復原 —— 建議先按「⬇️ 匯出整包 JSON」。`)) return;
    if(!confirm('最後確認：真的要全部刪掉嗎？')) return;
    const keep={ gasUrl:DB.gasUrl, gasToken:DB.gasToken, autoSync:DB.autoSync,
                 theme:DB.theme, rotDir:DB.rotDir, compact:DB.compact };
    DB=Object.assign({ years:[String(new Date().getFullYear()-1911)],
      year:String(new Date().getFullYear()-1911),
      classes:{}, activeClass:null, round:1, session:todayStr(), records:[], zoom:1 }, keep);
    Object.keys(localStorage).filter(k=>k.startsWith('mhh_room_'))
      .forEach(k=>localStorage.removeItem(k));
    rosterOwner=null; save(); renderAll();
    $('#ta-roster').value='';
    logBackup('已清空全部資料，可以從乾淨的狀態重新開始。');
  };
  function logBackup(m){ const el=$('#backup-log'); if(el) el.textContent=m; toast(m); }

  $('#btn-backup').onclick=()=>dl(new Blob([JSON.stringify(DB,null,2)],{type:'application/json'}),
    `課堂儀表板備份_${todayStr()}.json`);
  $('#file-restore').onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=()=>{ try{ DB=JSON.parse(rd.result); save(); renderAll();
      $('#backup-log').textContent='✅ 已還原備份'; }catch(err){ alert('檔案格式錯誤'); } };
    rd.readAsText(f);
  };

  [$('#modal-lottery'),$('#modal-seat')].forEach(m=>{
    m.onclick=e=>{ if(e.target===m) m.classList.remove('show'); };
  });
}
function dl(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}

/* ---------------- 14. 啟動 ---------------- */
load();
document.documentElement.dataset.theme=DB.theme||'dark';
$('#btn-theme').textContent=(DB.theme||'dark')==='dark'?'🌙':'☀️';
$('#inp-gas').value=DB.gasUrl||'';
$('#inp-token').value=DB.gasToken||'';
$('#inp-sheeturl').value=DB.sheetUrl||'';
$('#chk-autosync').checked=!!DB.autoSync;
if(DB.zoom) $('#inp-zoom').value=DB.zoom;
if(!DB.session) DB.session=todayStr();
bind();
renderRoleCards();
renderHelp();
renderAll();
