/* ==========================================================================
   cycle.js — 報告循環面板
   MH⋯H ｜ Where Minds Bond @ TNGS

   一組上台報告時，台下不是「等」，是三種明確的工作同時在跑：

     🎤 報告組    正在台上
     ⚖️ 評審組    上一輪剛報告完的那一組 —— 負責深度回饋與給分
     ⏱️ 計時組    下一輪要報告的那一組 —— 負責計時（老師可改時間）
     👥 其他組    自由點讚／快速評分／一句話回饋（非必要）

   於是每報告完一組，三個角色同步往前推一格，形成一個循環：
   剛報告完的人最懂那份報告，讓他當評審；下一個要上台的人在計時，
   等於被迫先看完別人怎麼講。**沒有一組是閒著的。**

   ── 幾個刻意的決定 ──

   ★ 評審組＝「剛報告完的那一組」，不是隨便指一組。
     使用者明確要求。理由是它同時解決兩件事：評審有脈絡（他剛做過同一件事），
     而且他不會因為「還沒上台」而急著準備自己的東西不專心聽。
     第 1 輪沒有「剛報告完的組」，所以環狀取序列最後一組，老師也能手動改。

   ★ 回饋一定要有句型鷹架，否則會全班都寫「很好」。
     這是使用者點名的問題（「不要讓學生回饋的很空泛」）。用兩套現成的模式：

       · 台風／表現 → 長頸鹿回饋法（非暴力溝通 NVC 四步）
         觀察（只講事實）→ 感受 → 需要 → 請求。
         關鍵是第一步逼你講「我看到你有 11 次看著投影幕念稿」而不是「台風不好」。

       · 實質內容 → CER 論證檢核（主張 Claim／證據 Evidence／推理 Reasoning）
         「你們的主張是＿／證據是＿／我認為這個證據撐不到＿，因為＿」。
         **這裡刻意不用常見的「兩顆星一個願望」** —— 它照樣可以很空泛
         （「你講得很好」也是一顆星）。CER 是本課程的教學本體
         （把「我覺得」變成一句別人可以檢查、而且知道它只能撐到哪裡的話），
         回饋用同一套語言，學生等於又練了一次。

   ★ 評審組內每個職位都有指定工作，不是「你們這組去評分」。
     使用者原話：「就是同一組都有事做就對了」。一組六個人共用一份評分表，
     結果一定是一個人寫、五個人滑手機。所以拆成六份不重疊的工作，
     其中「把台上的問與答逐句記下來」是使用者特別指名要有的。

   ★ 其他組的自由互動走「跑馬燈」。
     使用者要的是新聞台那種即時互動感。點一下就有東西橫著跑過螢幕，
     回饋才會有「被看見」的獎賞 —— 這跟亮燈、彩虹貫通是同一套語言。

   ★ 最下面一定有即時統計與排行榜。
     使用者明確要求。排行榜是「有任務而活著」的收束：
     你剛剛給的那一票，馬上看得到它把誰推上去了。

   ★ 目前只推投影幕，不進 Firestore（沿用職位工作推送第 24 條的決定）。
     不需要學生登入、不需要網路、不會有 permission 問題。
     但每一筆評分／回饋都存成獨立紀錄並帶上 from／to／dim，
     **之後要接學生手機時不用重寫資料結構**，只要換一個讀寫層。

   寫成傳統 script（IIFE），跟 tools.js 一樣，不依賴 module。
   ========================================================================== */
(function(){
'use strict';

/* ---------------- 1. 資料 ---------------- */

/* 一個「循環」屬於某一班的某一堂課。換班級或換日期就是另一場。 */
function cycleKey(){
  const c = curClass();
  return (c ? c.id : 'none') + '__' + DB.session;
}

/* 評審組的職位分工預設值。

   為什麼要有預設：老師課前不一定有時間填，空的分工等於沒有這個功能。
   為什麼還是可以改：每個班的習慣不一樣，而且四職位那一套本來就是起草的。 */
/* ★ 2026-08-30（第六輪）：分工從「只有評審組」擴成**三個角色都有**，
   而且**三門課都有**（原本 chem 根本沒有 key，化學課開起來是一整片空白）。

   為什麼要擴：投影幕上寫「策略長」而沒寫「策略長這一輪要做什麼」，
   學生得自己回想職責表 —— 而職位每一輪都會轉，回想錯的人整段就白坐著。
   報告組與計時組本來也各有各的事（誰主講、誰控時、誰記問答），
   只給評審組分工，等於默認另外兩組「上台就好」。

   結構：ASSIGN_DEF[課程][角色][職位] = 這一輪你要做的事
     角色 = present（報告組）/ judge（評審組）/ timer（計時組）

   ★ 預設值是起草的，老師可以在「報告循環」設定頁改，改完存進 cycleStore().assign。 */
const CY_SIDES = [
  { k:'present', t:'報告組', ic:'🎤' },
  { k:'judge',   t:'評審組', ic:'⚖️' },
  { k:'timer',   t:'計時組', ic:'⏱️' }
];

const ASSIGN_R6 = {
  present: {
    red:    '主講開場 30 秒：我們這一組的主張是什麼，一句話講完',
    orange: '負責「證據」那一段：把數字或原文唸出來，不要只說「資料顯示」',
    yellow: '負責「推理」那一段：證據為什麼撐得住這個主張',
    green:  '準備接一個提問，答不出來就說「我不知道，但我會去查什麼」',
    blue:   '顧投影／學習單，翻頁與指出現在講到哪一段',
    indigo: '收尾 20 秒：我們這個結論**只能撐到哪裡**'
  },
  judge: {
    red:    '主持這一輪回饋：決定我們這組最後給幾分、由誰上台講評',
    orange: '控時，並確保「每個人都講到一句」—— 沒開口的人由你點名',
    yellow: '代表上台講評 30 秒：一個具體優點 ＋ 一個請求 ＋ 一個問題',
    green:  '內容評分：用 CER 檢查他們的主張／證據／推理撐不撐得住',
    blue:   '把台上的「問與答」逐句記下來：誰問的、他怎麼答的',
    indigo: '找一個「他們沒說的那一面」，提出一個真問題（不是考他）'
  },
  timer: {
    red:    '盯著台上，把我們等一下要修的地方記下來（我們是下一組）',
    orange: '報時：剩 1 分鐘出聲提醒台上',
    yellow: '確認我們這組等一下誰先講、誰接第二段',
    green:  '檢查我們的證據還缺什麼，現在補得完的就補',
    blue:   '把台上被問倒的問題抄下來 —— 那題等一下很可能也會問我們',
    indigo: '想我們自己的弱點：等一下最可能被問的是哪一句'
  }
};

const ASSIGN_DEF = {
  read6: ASSIGN_R6,
  /* 化學借用六職位那一套（COURSES.chem.roles 就是 ROLES_R6）。
     化學不分組，這一頁多半用不到，但**不能沒有** ——
     沒有 key 的話開起來是一整片空白，看起來像功能壞了。 */
  chem: ASSIGN_R6,
  inq4: {
    present: {
      pm:  '主講實驗設計：我們控制了哪些變因，為什麼是這幾個',
      coo: '主講操作與數據：我們改了什麼、量到什麼',
      qa:  '主講判定標準：哪一格算變色、有爭議的怎麼處理',
      cio: '主講圖表：這張圖的橫軸縱軸是什麼、看出什麼趨勢'
    },
    judge: {
      pm:  '控時，並確保「每個人都講到一句」—— 沒開口的人由你點名',
      coo: '表現評分：用長頸鹿四步（觀察／感受／需要／請求）寫回饋',
      qa:  '把台上的「問與答」逐句記下來：誰問的、他怎麼答的',
      cio: '內容評分：圖表看不看得懂、數據撐不撐得住他們的結論'
    },
    timer: {
      pm:  '報時：剩 1 分鐘出聲提醒台上',
      coo: '確認我們這組的器材與數據都備好了（我們是下一組）',
      qa:  '把台上被問倒的問題抄下來 —— 那題等一下很可能也會問我們',
      cio: '檢查我們的圖表現在放出來看不看得懂'
    }
  }
};

/* 這個課程、這個角色、這個職位，這一輪要做的事。
   老師改過就用老師的，沒改過用預設。**三門課、三個角色都保證有東西可回。** */
function assignOf(ck, side, roleKey){
  const s = cycleStore();
  const a = (s.assign[ck] && s.assign[ck][side]) || {};
  if(a[roleKey] !== undefined) return a[roleKey];
  const d = (ASSIGN_DEF[ck] && ASSIGN_DEF[ck][side]) || {};
  return d[roleKey] || '';
}

function cycleStore(){
  DB.cycles = DB.cycles || {};
  const k = cycleKey();
  const TS = TABLES();
  let s = DB.cycles[k];
  if(!s){
    s = DB.cycles[k] = {
      order: TS.slice(), idx: 0, minutes: 5,
      pin: { present:null, judge:null, timer:null },   // 老師手動指定，null＝自動
      assign: {}, scores: [], fb: [], likes: [], doneRounds: [],
      form: DEF_FORM
    };
  }
  /* 換座位配置後組數會變（六組 ⇄ 九組），順序表要跟著補齊，
     否則會出現「第 7 組」報告不到、或指到一組不存在的組別。 */
  const set = new Set(s.order);
  s.order = s.order.filter(t=>TS.includes(t)).concat(TS.filter(t=>!set.has(t)));
  if(s.idx >= s.order.length) s.idx = 0;
  s.assign = s.assign || {};
  if(!CONTENT_FORMS[s.form]) s.form = DEF_FORM;   // 舊資料沒有這個欄位
  const ck = courseKey();
  s.assign[ck] = s.assign[ck] || {};
  /* 舊格式：s.assign[ck] 直接就是「評審組」的 {職位: 文字}。
     現在多了一層角色，所以把它整包搬進 judge。
     判斷方式：裡面找不到 present/judge/timer 這三個 key，就是舊的。 */
  const A = s.assign[ck];
  const isNew = CY_SIDES.some(x => A[x.k] !== undefined);
  if(!isNew && Object.keys(A).length){
    s.assign[ck] = { judge: A };
  }
  CY_SIDES.forEach(x => { s.assign[ck][x.k] = s.assign[ck][x.k] || {}; });
  return s;
}

/* 這一輪的三個角色。全部走同一個函式，畫面與統計才不會各算各的。 */
function roles(){
  const s = cycleStore(), o = s.order, n = o.length;
  if(!n) return { present:null, judge:null, timer:null };
  const i = s.idx;
  const auto = {
    present: o[i],
    /* 剛報告完的那一組。第 1 輪沒有「剛報告完」，環狀取最後一組。 */
    judge:   n > 1 ? o[(i - 1 + n) % n] : null,
    /* 下一個要上台的那一組。 */
    timer:   n > 1 ? o[(i + 1) % n] : null
  };
  const p = s.pin || {};
  return {
    present: p.present || auto.present,
    judge:   p.judge   || auto.judge,
    timer:   p.timer   || auto.timer,
    auto
  };
}

/* ---------------- 2. 回饋句型鷹架 ----------------
   每一格都是「半句話」，學生只要把空格補完就是一句可以檢查的回饋。
   刻意不給範例答案 —— 給了就會全班照抄。 */

const NVC = [   /* 長頸鹿回饋法（非暴力溝通四步）。順序不能換，換了就變成評價。 */
  { k:'obs',  t:'① 觀察', hint:'只講你看到／聽到的事實，不要下評語',
    ph:'我看到你們……（例：有幾次轉頭看投影幕）' },
  { k:'feel', t:'② 感受', hint:'講你的感覺，不是講他的問題',
    ph:'我覺得……（例：有點跟不上）' },
  { k:'need', t:'③ 需要', hint:'因為我需要什麼，才會有那個感覺',
    ph:'因為我需要……（例：先聽到結論再聽細節）' },
  { k:'ask',  t:'④ 請求', hint:'具體、做得到、下次就能改的一件事',
    ph:'下次可以請你……嗎？' }
];

/* 追問卡四格（2026-08-30 新增，W6/W7 用）。
   跟 CER 的差別：CER 是「拆解他說了什麼」，追問卡是「壓一下看它會不會垮」。
   第三格才是這張卡的重點 —— 提出一個具體的反例條件，
   逼講的人去想「我的結論撐得住這個情況嗎」。
   第四格把球丟回去：不是「我不同意」，而是「要我同意，你還缺什麼」，
   這樣被追問的那一組拿到的是一件做得到的事，不是一句否定。 */
const PROBE = [
  { k:'claim', t:'① 他的主張', hint:'先用你自己的話說一遍，不要照抄投影片',
    ph:'他們主張……' },
  { k:'basis', t:'② 他憑什麼', hint:'他拿什麼來撐？數據、案例、還是「大家都知道」',
    ph:'他們憑的是……' },
  { k:'probe', t:'③ 我的追問', hint:'★ 這一格是關鍵：舉一個具體的情況，問它還成不成立',
    ph:'如果……，你的結論還成立嗎？' },
  { k:'need',  t:'④ 要我接受，我需要看到', hint:'具體到他下次做得出來，不要寫「更多證據」',
    ph:'要我接受，我需要看到……' }
];

const CER = [   /* 論證檢核。第三格才是重點：證據「撐得到哪裡」。 */
  { k:'claim', t:'主張 C', hint:'我聽到你們的主張是什麼',
    ph:'你們的主張是……' },
  { k:'evid',  t:'證據 E', hint:'你們拿什麼來撐這個主張',
    ph:'你們用的證據是……' },
  { k:'reas',  t:'推理 R', hint:'★ 這一格才是關鍵：它撐得到哪裡、撐不到哪裡',
    ph:'我認為這個證據撐得到／撐不到……，因為……' }
];

/* 內容面向要用哪一套句型，由老師每一輪自己選。
   ★ 為什麼不直接換掉 CER：兩套練的不是同一件事，
     而且課程不同週次要用不同的那一套（W6/W7 用追問卡）。
     換掉的話，之前的週次就沒得用了。 */
const CONTENT_FORMS = {
  cer:   { name:'CER 論證檢核', fields:CER,
           note:'用 CER 檢查，不要只寫「很好」' },
  probe: { name:'追問卡四格',   fields:PROBE,
           note:'壓一下看它會不會垮 —— 重點在第三格的「如果……」' }
};
const DEF_FORM = 'cer';

/* 其他組的快速標籤。刻意有正有負 —— 全部都是好話的按鈕沒有資訊量。 */
const TAGS = [
  { t:'👍 有證據',   good:1 }, { t:'🎯 抓到重點', good:1 },
  { t:'🔥 有說服力', good:1 }, { t:'🖼 圖看得懂',  good:1 },
  { t:'🧊 講太快',   good:0 }, { t:'❓ 沒聽懂',    good:0 },
  { t:'🤔 證據不夠', good:0 }
];

/* ---------------- 3. 設定分頁 ---------------- */

function renderCyclePanel(){
  const box = $('#cycle-editor'); if(!box) return;
  const s = cycleStore(), rs = ROLESET(), ck = courseKey();
  const tag = $('#cycle-course-tag'); if(tag) tag.textContent = CO().name;

  const mi = $('#cycle-minutes');
  if(mi && document.activeElement !== mi) mi.value = s.minutes;

  /* 報告順序：一排可以左右搬動的組別籤 */
  const chips = s.order.map((t,i)=>`
    <span class="cy-chip${i===s.idx?' now':''}" style="--gt:${GROUP_TINT[t]||'#8b93a7'}">
      <button class="cy-mv" data-mv="-1" data-i="${i}" title="往前搬">‹</button>
      <b>第 ${t} 組</b>
      <button class="cy-mv" data-mv="1" data-i="${i}" title="往後搬">›</button>
    </span>`).join('');
  $('#cycle-order').innerHTML = chips;
  $('#cycle-order').querySelectorAll('.cy-mv').forEach(b=>{
    b.onclick=()=>{
      const st=cycleStore(), i=+b.dataset.i, d=+b.dataset.mv, j=i+d;
      if(j<0 || j>=st.order.length) return;
      [st.order[i], st.order[j]] = [st.order[j], st.order[i]];
      save(); renderCyclePanel();
    };
  });

  /* ★ 三個角色各一區塊。報告組、計時組本來也各有各的事，
     只給評審組分工等於默認另外兩組「上台就好」。 */
  box.innerHTML = CY_SIDES.map(sd=>`
    <details class="cy-assign" ${sd.k==='judge'?'open':''}>
      <summary>${sd.ic} ${sd.t}的分工 —— 每個職位一件事</summary>
      ${rs.map(r=>`
        <div class="task-row" style="--rc:var(${r.color})">
          <div class="task-role"><b>${r.name}</b><small>${r.en}</small></div>
          <textarea class="ctl task-input" data-side="${sd.k}" data-role="${r.key}" rows="2"
            placeholder="${r.name}在「${sd.t}」的時候要做什麼？留白＝沿用預設">${
              assignOf(ck, sd.k, r.key).replace(/</g,'&lt;')}</textarea>
        </div>`).join('')}
    </details>`).join('');
  box.querySelectorAll('.task-input').forEach(inp=>{
    inp.oninput=()=>{
      const st=cycleStore(), k=courseKey();
      st.assign[k][inp.dataset.side] = st.assign[k][inp.dataset.side] || {};
      st.assign[k][inp.dataset.side][inp.dataset.role]=inp.value;
      save();
    };
  });

  const st = $('#cycle-status');
  if(st){
    const R = roles();
    st.innerHTML = s.order.length
      ? `第 <b>${s.idx+1}</b> / ${s.order.length} 輪　·
         🎤 第 ${R.present} 組報告　·　⚖️ 第 ${R.judge??'—'} 組評審　·　⏱️ 第 ${R.timer??'—'} 組計時`
      : '目前沒有任何組別';
  }
}

/* ---------------- 4. 全螢幕看板 ---------------- */

let tick = null, left = 0, running = false;

function openBoard(){
  const c = curClass();
  if(!c) return alert('請先選擇 / 建立班級');
  const s = cycleStore();
  if(s.order.length < 2 && !confirm('只有一組，循環會沒有評審組與計時組。確定要開嗎？')) return;
  left = s.minutes * 60; running = false;
  buildBoard();
  $('#cycleboard').classList.add('show');
  document.body.classList.add('tb-open');
}
function closeBoard(){
  stopTimer();
  $('#cycleboard').classList.remove('show');
  document.body.classList.remove('tb-open');
}

function mmss(sec){
  const m = Math.floor(Math.max(sec,0)/60), s = Math.max(sec,0)%60;
  return m + ':' + String(s).padStart(2,'0');
}
function paintTimer(){
  const d = $('#cy-clock'); if(d) d.textContent = mmss(left);
  const w = $('#cy-clock-wrap');
  if(w) w.classList.toggle('over', left <= 0);
}
function stopTimer(){
  running = false; clearInterval(tick); tick = null;
  const g = $('#cy-go'); if(g) g.textContent = '▶ 開始';
}
function startTimer(){
  if(running){ stopTimer(); return; }
  running = true;
  const g = $('#cy-go'); if(g) g.textContent = '⏸ 暫停';
  tick = setInterval(()=>{
    left--; paintTimer();
    if(left === 0){
      stopTimer();
      try{ celebrate(); }catch(e){}
      toast('時間到！請計時組舉手示意', true);
    }
    if(left < -600) stopTimer();     // 忘了關就不要無限跑下去
  }, 1000);
}

/* 一張組別大卡（報告／評審／計時共用同一個樣式，只有顏色與抬頭不同） */
function bigCard(kind, icon, title, tno, sub, body){
  const tint = GROUP_TINT[tno] || '#8b93a7';
  return `<div class="cy-big cy-${kind}" style="--gt:${tint}">
    <div class="cy-big-head"><span class="cy-ic">${icon}</span>
      <span class="cy-big-t">${title}</span></div>
    <div class="cy-big-g">${tno ? '第 '+tno+' 組' : '—'}</div>
    <div class="cy-big-sub">${sub}</div>
    <div class="cy-big-body">${body}</div>
  </div>`;
}

/* ★ 2026-08-30（第六輪）：投影幕上不只是名字＋職位，
   還要直接寫出「你這一輪負責什麼」。

   為什麼：職位每一輪都會轉。只投「策略長　王小明」，王小明得自己回想
   策略長在「報告組」的時候要做什麼 —— 而那張職責表在另一個分頁。
   回想錯的人，整段報告就白坐著。把事情寫在名字旁邊，沒有人需要回想。

   side = present / judge / timer，決定要取哪一套分工。三門課都有預設值。 */
function seatsOf(tno){
  const raw = tableMembers(tno) || [];
  if(!raw.filter(x=>x!=null).length) return [];
  const slots = tableSlots(tno);
  const hasSecond = raw.filter(x=>x!=null).length > 6;
  const out = [];
  raw.forEach((no,idx)=>{
    if(no==null) return;
    const rr = seatRole(tno, idx, slots[idx]);
    out.push({
      no, idx,
      name: studentName(no) || ('座號'+no),
      role: rr.role,
      second: !!rr.second,
      label: seatRoleLabel(tno, idx, slots[idx], hasSecond)
    });
  });
  return out;
}

function memberLine(tno, side){
  const list = seatsOf(tno);
  if(!list.length) return '<small>這組還沒有人</small>';
  const ck = courseKey();
  return '<div class="cy-duties">' + list.map(x=>{
    const job = side ? assignOf(ck, side, x.role.key) : '';
    return `<div class="cy-duty" style="--rc:var(${x.second ? x.role.light : x.role.color})">
      <span class="cy-duty-h"><b>${x.label}</b>${esc(x.name)}</span>
      <span class="cy-duty-b">${
        job ? esc(job) : '<i>這一輪沒有指定任務 —— 你的職責還在，支援同組</i>'}</span>
    </div>`;
  }).join('') + '</div>';
}


function buildBoard(){
  const board = $('#cycleboard'); if(!board) return;
  const s = cycleStore(), R = roles(), rs = ROLESET(), ck = courseKey();
  const c = curClass(), TS = TABLES();

  /* ★ 2026-08-30：職位卡要寫出「這個職位今天是誰」。
     只寫「記錄長要做什麼」，台下的學生得先在腦子裡算一次
     「這一輪轉到我了嗎？我是不是記錄長？」—— 而職位每一輪都會轉，
     算錯的人整段報告就白坐著。名字寫上去，就沒有人需要算。
     ★ 職位一律走 seatRole()，老師指定過的職務才對得上座位表。 */
  const whoHas = (tno, key) => {
    if(!tno) return [];
    const ms = tableMembers(tno) || [], slots = tableSlots(tno);
    const hasSecond = ms.filter(x=>x!=null).length>6;
    const out=[];
    ms.forEach((no,idx)=>{
      if(no==null) return;
      const rr = seatRole(tno, idx, slots[idx]);
      if(rr.role.key!==key) return;
      out.push(`${studentName(no)||('座號'+no)}<small>　${
        seatRoleLabel(tno, idx, slots[idx], hasSecond)}</small>`);
    });
    return out;
  };

  /* 評審組的職位分工卡：把「這一組去評分」拆成每個人一份不重疊的工作 */
  const jobCards = rs.map(r=>{
    const txt = (assignOf(ck,'judge',r.key)||'').trim();
    const who = whoHas(R.judge, r.key);
    return `<div class="cy-job${txt?'':' cy-blank'}" style="--rc:var(${r.color})">
      <div class="cy-job-name">${r.name}</div>
      <div class="cy-job-who">${who.length ? who.join('、') : '<small>這一輪沒有人在這個職位</small>'}</div>
      <div class="cy-job-body">${
        txt ? txt.replace(/</g,'&lt;').replace(/\n/g,'<br>')
            : '這一輪沒有指定任務<br><small>你的職責還在，支援同組</small>'}</div>
    </div>`;
  }).join('');

  const fields = (arr, group) => arr.map(f=>`
    <label class="cy-f">
      <span class="cy-f-t">${f.t}<small>${f.hint}</small></span>
      <textarea class="ctl cy-in" data-g="${group}" data-k="${f.k}" rows="2"
        placeholder="${f.ph}"></textarea>
    </label>`).join('');

  const stars = (group) => [1,2,3,4,5].map(v=>
    `<button class="cy-star" data-sg="${group}" data-v="${v}" title="${v} 顆星">★</button>`).join('');

  const tagBtns = TAGS.map((t,i)=>
    `<button class="cy-tag${t.good?'':' bad'}" data-tag="${i}">${t.t}</button>`).join('');

  const others = s.order.filter(t=>t!==R.present);
  const otherOpts = others.map(t=>`<option value="${t}">第 ${t} 組</option>`).join('');

  board.innerHTML = `
  <div class="cy-inner">
    <div class="tb-head">
      <div>
        <div class="tb-title">報告循環　<span class="cy-round">第 ${s.idx+1} / ${s.order.length} 輪</span></div>
        <div class="tb-sub">${CO().name}　·　${c?c.name:''}　·　${DB.session}</div>
      </div>
      <div class="cy-headbtn">
        <button class="btn btn-ghost" id="cy-prev">‹ 上一輪</button>
        <button class="btn btn-primary" id="cy-next">下一輪 ›</button>
        <button class="tb-close" id="cy-close" title="關閉（Esc）">✕</button>
      </div>
    </div>

    <div class="cy-tri">
      ${bigCard('present','🎤','報告組', R.present, memberLine(R.present,'present'),
        '<div class="cy-note">台上進行中</div>')}
      ${bigCard('judge','⚖️','評審組（剛報告完）', R.judge, memberLine(R.judge,'judge'),
        '<div class="cy-note">深度回饋 ＋ 給分，每個職位都有工作</div>')}
      ${bigCard('timer','⏱️','計時組（下一個上台）', R.timer, memberLine(R.timer,'timer'),
        `<div class="cy-clock-wrap" id="cy-clock-wrap">
           <div class="cy-clock" id="cy-clock">${mmss(left)}</div>
           <div class="cy-clock-btns">
             <button class="btn btn-primary" id="cy-go">▶ 開始</button>
             <button class="btn btn-ghost" id="cy-plus">＋1 分</button>
             <button class="btn btn-ghost" id="cy-reset">↺ 重設</button>
           </div>
         </div>`)}
    </div>

    <div class="cy-pin">
      <span>⚙︎ 老師手動指定（選「自動」就跟著循環走）</span>
      ${['present','judge','timer'].map(k=>`
        <label class="mini">${k==='present'?'報告':k==='judge'?'評審':'計時'}
          <select class="ctl cy-pin-sel" data-k="${k}">
            <option value="">自動（第 ${R.auto[k]??'—'} 組）</option>
            ${TS.map(t=>`<option value="${t}" ${String(s.pin[k])===String(t)?'selected':''}>第 ${t} 組</option>`).join('')}
          </select></label>`).join('')}
    </div>

    <details class="cy-sec" open>
      <summary>⚖️ 評審組的分工 —— 第 ${R.judge??'—'} 組，每個職位一份工作</summary>
      <div class="cy-jobs">${jobCards}</div>
    </details>

    <details class="cy-sec" open>
      <summary>📝 評審組給分與回饋（給第 ${R.present} 組）</summary>
      <div class="cy-grade">
        <div class="cy-dim">
          <div class="cy-dim-h">實質內容
            <select class="ctl cy-form" id="cy-form" title="這一輪的內容回饋要用哪一套句型">
              ${Object.keys(CONTENT_FORMS).map(k=>
                `<option value="${k}"${k===s.form?' selected':''}>${CONTENT_FORMS[k].name}</option>`).join('')}
            </select>
            <small>${CONTENT_FORMS[s.form].note}</small></div>
          <div class="cy-starrow" data-row="content">${stars('content')}
            <span class="cy-sv" id="cy-sv-content">—</span></div>
          ${fields(CONTENT_FORMS[s.form].fields,'content')}
        </div>
        <div class="cy-dim">
          <div class="cy-dim-h">台風與簡報表現　<small>長頸鹿回饋法：先講事實，再講請求</small></div>
          <div class="cy-starrow" data-row="delivery">${stars('delivery')}
            <span class="cy-sv" id="cy-sv-delivery">—</span></div>
          ${fields(NVC,'delivery')}
        </div>
      </div>
      <div class="cy-qa">
        <div class="cy-dim-h">🗒 問與答紀錄　<small>誰問的、他怎麼答的，一問一答記一列</small></div>
        <div class="cy-qa-in">
          <input class="ctl" id="cy-q" placeholder="問：">
          <input class="ctl" id="cy-a" placeholder="答：">
          <button class="btn btn-ghost" id="cy-qa-add">＋ 記下來</button>
        </div>
        <div class="cy-qa-list" id="cy-qa-list"></div>
      </div>
      <div class="row-btns" style="margin-top:12px">
        <button class="btn btn-primary" id="cy-submit">✅ 送出評審回饋</button>
        <button class="btn btn-ghost" id="cy-award">⭐ 評審組全組 +1</button>
      </div>
    </details>

    <details class="cy-sec" open>
      <summary>👥 其他組自由點讚／評分（非必要，隨時可按）</summary>
      <div class="cy-free">
        <label class="mini">我是
          <select class="ctl" id="cy-from">${otherOpts}</select></label>
        <div class="cy-starrow" data-row="free">${stars('free')}
          <span class="cy-sv" id="cy-sv-free">—</span></div>
        <div class="cy-tags">${tagBtns}</div>
        <div class="cy-free-say">
          <input class="ctl" id="cy-say" placeholder="一句話回饋（可留白，按 Enter 送出）">
          <button class="btn btn-ghost" id="cy-say-go">送出</button>
        </div>
      </div>
    </details>

    <div class="cy-stats" id="cy-stats"></div>
  </div>
  <div class="cy-marquee" id="cy-marquee"><div class="cy-mq-track" id="cy-mq-track"></div></div>`;

  wireBoard();
  paintTimer();
  renderQA();
  renderStatsBox();
  renderMarquee();
}

/* ---------------- 5. 看板互動 ---------------- */

let pending = { content:0, delivery:0, free:0 };
let qaDraft = [];

function wireBoard(){
  const s = cycleStore();

  $('#cy-close').onclick = closeBoard;

  /* 換句型組要整個重畫欄位。已經打了一半的字會不見 ——
     這是刻意的：兩套的格子對不起來，硬搬過去只會搬出四不像。
     所以有東西時先問一聲。 */
  const fsel = $('#cy-form');
  if(fsel) fsel.onchange = ()=>{
    const typed = [...document.querySelectorAll('.cy-in[data-g="content"]')]
      .some(t=>t.value.trim());
    if(typed && !confirm('換一套句型會清掉「實質內容」這幾格已經打的字。\n（台風那幾格不受影響。）確定要換嗎？')){
      fsel.value = cycleStore().form; return;
    }
    cycleStore().form = fsel.value; save();
    buildBoard();
  };

  $('#cy-prev').onclick  = ()=>step(-1);
  $('#cy-next').onclick  = ()=>step(1);

  $('#cy-go').onclick    = startTimer;
  $('#cy-plus').onclick  = ()=>{ left += 60; paintTimer(); };
  $('#cy-reset').onclick = ()=>{ stopTimer(); left = cycleStore().minutes*60; paintTimer(); };

  document.querySelectorAll('.cy-pin-sel').forEach(sel=>{
    sel.onchange = ()=>{
      const st = cycleStore();
      st.pin[sel.dataset.k] = sel.value ? +sel.value : null;
      save(); buildBoard();
    };
  });

  document.querySelectorAll('.cy-star').forEach(b=>{
    b.onclick = e=>{
      const g = b.dataset.sg, v = +b.dataset.v;
      pending[g] = (pending[g] === v) ? 0 : v;      // 再按同一顆＝取消
      paintStars(g);
      if(g === 'free' && pending.free) submitFree(e);
    };
  });
  ['content','delivery','free'].forEach(paintStars);

  document.querySelectorAll('.cy-tag').forEach(b=>{
    b.onclick = e=>{
      const t = TAGS[+b.dataset.tag];
      const from = +$('#cy-from').value || 0;
      const R = roles();
      cycleStore().likes.push({ id:uid(), from, to:R.present, tag:t.t,
        good:t.good, ts:Date.now() });
      save();
      pop(e.clientX, e.clientY, GROUP_TINT[from] || '#ffd700');
      renderMarquee(); renderStatsBox();
    };
  });

  const say = $('#cy-say');
  const sayGo = ()=>{
    const v = say.value.trim(); if(!v) return;
    const from = +$('#cy-from').value || 0, R = roles();
    cycleStore().fb.push({ id:uid(), from, to:R.present, kind:'free', text:v, ts:Date.now() });
    save(); say.value = '';
    toast('已送出，看螢幕最下面的跑馬燈');
    renderMarquee(); renderStatsBox();
  };
  $('#cy-say-go').onclick = sayGo;
  say.onkeydown = e=>{ if(e.key === 'Enter'){ e.preventDefault(); sayGo(); } };

  $('#cy-qa-add').onclick = ()=>{
    const q = $('#cy-q').value.trim(), a = $('#cy-a').value.trim();
    if(!q && !a) return;
    qaDraft.push({ q, a });
    $('#cy-q').value = ''; $('#cy-a').value = ''; $('#cy-q').focus();
    renderQA();
  };
  $('#cy-submit').onclick = submitJudge;
  $('#cy-award').onclick  = ()=>{
    const R = roles();
    if(!R.judge) return toast('這一輪沒有評審組');
    /* 走 groupApply 而不是 groupAward，只為了換掉備註。
       試算表是真相 —— 期末回頭看 Records，「全組加分」看不出這 1 分是哪來的，
       「評審組回饋（第 N 組報告）」看得出來。 */
    groupApply(R.judge, 1, 'award', `評審組回饋（第 ${R.present} 組報告）`);
    toast(`第 ${R.judge} 組（評審）全組 +1`, true);
  };
}

function paintStars(g){
  document.querySelectorAll(`.cy-star[data-sg="${g}"]`).forEach(b=>{
    b.classList.toggle('on', +b.dataset.v <= pending[g]);
  });
  const sv = $('#cy-sv-'+g);
  if(sv) sv.textContent = pending[g] ? pending[g] + ' 星' : '—';
}

function renderQA(){
  const box = $('#cy-qa-list'); if(!box) return;
  box.innerHTML = qaDraft.length
    ? qaDraft.map((x,i)=>`<div class="cy-qa-row">
        <b>Q</b> ${esc(x.q)}　<b>A</b> ${esc(x.a)}
        <button class="cy-qa-x" data-i="${i}" title="刪掉這一列">✕</button></div>`).join('')
    : '<div class="cy-qa-empty">還沒有記下任何問答</div>';
  box.querySelectorAll('.cy-qa-x').forEach(b=>{
    b.onclick = ()=>{ qaDraft.splice(+b.dataset.i,1); renderQA(); };
  });
}

function esc(s){ return String(s==null?'':s).replace(/</g,'&lt;'); }

function submitJudge(){
  const s = cycleStore(), R = roles();
  if(!R.judge) return toast('這一輪沒有評審組');
  const texts = {};
  document.querySelectorAll('.cy-in').forEach(t=>{
    const v = t.value.trim(); if(v) texts[t.dataset.g + '.' + t.dataset.k] = v;
  });
  const hasAny = pending.content || pending.delivery ||
                 Object.keys(texts).length || qaDraft.length;
  if(!hasAny) return toast('還沒有填任何東西');

  const ts = Date.now();
  ['content','delivery'].forEach(dim=>{
    if(pending[dim]) s.scores.push({ id:uid(), from:R.judge, to:R.present,
      dim, v:pending[dim], by:'judge', round:s.idx, ts });
  });
  Object.keys(texts).forEach(k=>{
    const [dim, field] = k.split('.');
    s.fb.push({ id:uid(), from:R.judge, to:R.present, kind:dim, field,
      text:texts[k], round:s.idx, ts });
  });
  qaDraft.forEach(x=>{
    s.fb.push({ id:uid(), from:R.judge, to:R.present, kind:'qa',
      text:'Q：' + x.q + '　A：' + x.a, round:s.idx, ts });
  });
  save();

  pending.content = pending.delivery = 0;
  qaDraft = [];
  document.querySelectorAll('.cy-in').forEach(t=>t.value='');
  ['content','delivery'].forEach(paintStars);
  renderQA(); renderMarquee(); renderStatsBox();
  toast('評審回饋已送出 ⚖️', true);
  try{ celebrate(); }catch(e){}
}

function submitFree(e){
  const s = cycleStore(), R = roles();
  const from = +$('#cy-from').value || 0;
  s.scores.push({ id:uid(), from, to:R.present, dim:'free',
    v:pending.free, by:'free', round:s.idx, ts:Date.now() });
  save();
  if(e) pop(e.clientX, e.clientY, GROUP_TINT[from] || '#ffd700');
  pending.free = 0; paintStars('free');
  renderMarquee(); renderStatsBox();
}

/* 前進／後退一輪。刻意不清掉上一輪的資料 —— 排行榜要看整堂課的累積。 */
function step(d){
  const s = cycleStore();
  const n = s.order.length; if(!n) return;
  s.idx = (s.idx + d + n) % n;
  s.pin = { present:null, judge:null, timer:null };   // 換輪就解除手動指定
  save();
  stopTimer(); left = s.minutes * 60;
  pending = { content:0, delivery:0, free:0 }; qaDraft = [];
  buildBoard();
  toast(`第 ${s.idx+1} 輪：第 ${roles().present} 組報告`);
}

/* ---------------- 6. 即時統計與排行榜 ---------------- */

function tally(){
  const s = cycleStore(), TS = TABLES();
  const m = {};
  TS.forEach(t=>m[t] = { t, cN:0, cS:0, dN:0, dS:0, fN:0, fS:0, like:0, cool:0, fb:0 });
  s.scores.forEach(x=>{
    const r = m[x.to]; if(!r) return;
    if(x.dim === 'content'){ r.cN++; r.cS += x.v; }
    else if(x.dim === 'delivery'){ r.dN++; r.dS += x.v; }
    else { r.fN++; r.fS += x.v; }
  });
  s.likes.forEach(x=>{ const r = m[x.to]; if(!r) return; x.good ? r.like++ : r.cool++; });
  s.fb.forEach(x=>{ const r = m[x.to]; if(r) r.fb++; });
  return Object.values(m).map(r=>{
    const avg = (sum,n)=> n ? sum/n : 0;
    r.c = avg(r.cS, r.cN); r.d = avg(r.dS, r.dN); r.f = avg(r.fS, r.fN);
    /* 總分＝評審兩軸各佔一半，再加上其他組自由評分的一半權重。
       自由評分權重較低是刻意的：它沒有句型鷹架，本來就比較隨性，
       不該蓋過寫了四格 NVC 的那一組。 */
    r.total = (r.c + r.d) + (r.f * 0.5);
    r.any = r.cN + r.dN + r.fN + r.like + r.cool + r.fb;
    return r;
  });
}

function renderStatsBox(){
  const box = $('#cy-stats'); if(!box) return;
  const rows = tally().filter(r=>r.any).sort((a,b)=> b.total - a.total || b.like - a.like);
  const medal = i => i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : (i+1);
  const bar = v =>`<span class="cy-bar"><i style="width:${Math.min(v/5*100,100)}%"></i></span>`;
  const R = roles();

  box.innerHTML = `
    <div class="cy-stats-h">🏆 即時排行榜　<small>整堂課累計；報告中的組別會標星號</small></div>
    ${ rows.length ? `<table class="cy-tab">
      <thead><tr><th>名次</th><th>組別</th><th>內容</th><th>表現</th>
        <th>其他組</th><th>👍</th><th>🧊</th><th>回饋則數</th><th>總分</th></tr></thead>
      <tbody>${rows.map((r,i)=>`
        <tr class="${r.t===R.present?'now':''}" style="--gt:${GROUP_TINT[r.t]||'#8b93a7'}">
          <td class="cy-rank">${medal(i)}</td>
          <td class="cy-gcell"><b>第 ${r.t} 組</b>${r.t===R.present?' ★':''}</td>
          <td>${r.cN?r.c.toFixed(1):'—'} ${r.cN?bar(r.c):''}</td>
          <td>${r.dN?r.d.toFixed(1):'—'} ${r.dN?bar(r.d):''}</td>
          <td>${r.fN?r.f.toFixed(1)+`<small>（${r.fN} 票）</small>`:'—'}</td>
          <td>${r.like||''}</td><td>${r.cool||''}</td><td>${r.fb||''}</td>
          <td class="cy-total">${r.total.toFixed(1)}</td>
        </tr>`).join('')}</tbody></table>`
      : '<div class="cy-empty">還沒有任何評分或回饋 —— 按上面的星星或標籤就會出現在這裡</div>' }`;
}

/* 跑馬燈：最新的回饋橫著跑過螢幕底部，像新聞台的即時互動條。
   內容變了就重啟動畫（不重啟的話新加的那則要等上一圈跑完才看得到）。 */
function renderMarquee(){
  const track = $('#cy-mq-track'); if(!track) return;
  const s = cycleStore();
  const items = []
    .concat(s.likes.map(x=>({ ts:x.ts, html:`<b>第 ${x.from||'?'} 組</b> ${esc(x.tag)}` })))
    .concat(s.fb.map(x=>({ ts:x.ts,
      html:`<b>第 ${x.from||'?'} 組</b> ${x.kind==='qa'?'🗒':'💬'} ${esc(x.text).slice(0,60)}` })))
    .concat(s.scores.map(x=>({ ts:x.ts,
      html:`<b>第 ${x.from||'?'} 組</b> 給第 ${x.to} 組 ${'★'.repeat(x.v)}` })))
    .sort((a,b)=> b.ts - a.ts).slice(0, 30);

  if(!items.length){
    track.innerHTML = '<span class="cy-mq-i cy-mq-idle">按一下標籤或星星，你的回饋就會跑過這裡 →</span>';
    track.style.animation = 'none';
    return;
  }
  const one = items.map(i=>`<span class="cy-mq-i">${i.html}</span>`).join('');
  track.innerHTML = one + one;            // 兩份接起來才能無縫循環
  track.style.animation = 'none';
  void track.offsetWidth;                 // 強制回流，動畫才會真的重來
  track.style.animation = `cy-mq ${Math.max(items.length*3.2, 14)}s linear infinite`;
}

/* ---------------- 7. 接上主程式 ---------------- */

/* app.js 的分頁切換會呼叫這個掛鉤。用掛鉤而不是在 app.js 裡多加一行 if，
   是因為以後每多一個分頁就要回頭改 app.js —— 那正是會被忘記的地方。 */
window.onPanelShow = function(panel){
  if(panel === 'p-cycle') renderCyclePanel();
};
window.renderCyclePanel = renderCyclePanel;

function bindOnce(){
  const bo = $('#btn-cycle-open');  if(bo) bo.onclick = openBoard;
  const mi = $('#cycle-minutes');
  if(mi) mi.oninput = ()=>{ cycleStore().minutes = Math.max(1, +mi.value||5); save(); };
  const br = $('#btn-cycle-reset');
  if(br) br.onclick = ()=>{
    const s = cycleStore();
    if(!s.scores.length && !s.fb.length && !s.likes.length) return toast('這一堂還沒有任何評分紀錄');
    if(!confirm('清空「這一堂」的所有評分、回饋與點讚？\n（排行榜會歸零，加分紀錄不受影響）')) return;
    s.scores = []; s.fb = []; s.likes = []; s.idx = 0; save();
    renderCyclePanel();
    if($('#cycleboard').classList.contains('show')) buildBoard();
    toast('已清空這一堂的循環紀錄');
  };
  const bs = $('#btn-cycle-shuffle');
  if(bs) bs.onclick = ()=>{
    const s = cycleStore();
    for(let i=s.order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));
      [s.order[i],s.order[j]]=[s.order[j],s.order[i]]; }
    s.idx = 0; save(); renderCyclePanel(); toast('報告順序已重抽');
  };

  /* Esc 關看板。用捕獲階段，理由同 taskboard。 */
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && $('#cycleboard') && $('#cycleboard').classList.contains('show')){
      e.stopPropagation(); closeBoard();
    }
  }, true);
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindOnce);
else bindOnce();

})();
