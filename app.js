/* ==========================================================================
   閱讀思考 · 課堂儀表板  app.js
   六組蜂巢座位 × 彩虹職位（正1/正2）× 課堂即時加減分 × 雲端累積
   ========================================================================== */

/* ---------------- 1. 職位（依課程類型有兩套） ----------------
   高一 閱讀思考：彩虹六職位，職位綁在位子上、每輪轉一格。
   高二 探究實作（水質）：四個「長」，原始設計是「做滿一學期不換」，
     所以預設就停在第 1 輪；真要換人時把「職位輪次」切到第 2 輪即可
     —— 輪動機制照舊沿用，不另外做一套分支。 */
const ROLES_R6 = [
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

/* 高二 探究實作（水質）的四個「長」。
   來源：`AI x 探究實作(水質)/01_Claude編制/06_第1堂_定題與職位/`
     簡報 v4 第 37 頁「四個『長』：你是 leader，不是承包商」
     ＋ 逐字稿 S8／S9（職場對應、課堂主責、期末報告主筆段落與配分）。

   ★ 口頭禪（say）原始教材裡沒有，是依各自主責起草的，老師可自行改寫。
   ★ 用 --c1..--c6 這六個顏色變數裡的四個，才能沿用既有的彩虹配色與淺色（正2）。 */
const ROLES_R4 = [
  { key:'pm',  code:'A', color:'--c2', light:'--c2l', name:'場控長',
    en:'A · 專案 PM｜實驗設計・控制變因',
    duty:['實驗設計，盯住<b>控制變因</b>：哪些條件必須每次都一樣',
          '器材借還與清點、實驗桌動線','計時：每個環節剩幾分鐘',
          '安全與清潔，收拾到能交還為止',
          '期末報告主筆：<b>定題＋動機、實驗器材</b>'],
    say:'「這一輪有哪些條件必須跟上一輪一樣？不一樣就不能拿來比。」'},
  { key:'coo', code:'B', color:'--c1', light:'--c1l', name:'執行長',
    en:'B · 營運 COO｜操縱變因',
    duty:['動手操作，負責<b>操縱變因</b>：我們刻意改變的是哪一個',
          '秤重、量水、實際操作','儀器校正、重複測量',
          '期末報告主筆：<b>方法流程</b>（嚴謹規劃與高品質數據 30 分）'],
    say:'「這次我只改一個東西，其他都不准動。」'},
  { key:'qa',  code:'C', color:'--c4', light:'--c4l', name:'記錄長',
    en:'C · 品保 QA｜應變變因',
    duty:['觀察與判定，記下<b>應變變因</b>：跟著變的是什麼',
          '填數據，把判定有爭議的地方記下來，不要偷偷決定',
          '缺值、異常值要註明怎麼處理的',
          '期末報告主筆：<b>歷程＋結論</b>'],
    say:'「這一格到底算不算變色？兩個人看法不一樣，我先照實記下來。」'},
  { key:'cio', code:'D', color:'--c6', light:'--c6l', name:'資訊長',
    en:'D · 分析 CIO｜圖表製作',
    duty:['把數據變成看得懂的<b>圖表</b>','拍照上傳、共編簡報、算統計',
          '期末報告主筆：<b>分析＋討論</b>（數據趨勢 30 ＋ 建立模型 18）'],
    say:'「這張圖的橫軸是什麼？看不懂的圖等於沒做。」'}
];

/* 課程類型：決定用哪一套職位、預設哪一種座位配置。掛在班級上，切班級就自動換。 */
const COURSES = {
  read6: { name:'高一 閱讀思考', short:'📖 高一 閱讀思考', roles:ROLES_R6, layout:'hex6',
           title:'彩虹六職位（正1 / 正2）',
           note:'沒有「副手」—— 兩個都是正職，只差<b>深色＝正1、淺色＝正2</b>。'
                +'職責完全相同，而且<b>各自有一盞燈</b>，兩個人都要開口這組才會貫通。' },
  inq4:  { name:'高二 探究實作', short:'🔬 高二 探究實作', roles:ROLES_R4, layout:'quad9',
           title:'四個「長」：你是 leader，不是承包商',
           note:'老師給分工，是因為你在那方面天分較高，<b>由你帶頭</b>。'
                +'「帶頭寫」不等於「一個人寫」—— 報告是一份，不是四份拼起來。<br>'
                +'原始設計是<b>做滿一學期不換</b>，所以輪次預設停在第 1 輪；'
                +'真要換人時把右上角「職位輪次」切到第 2 輪即可。' }
  ,
  /* ★ 化學（2026-08-30 新增）。跟前兩個課程的差別不在職位，而在「沒有小組」：
     教室是老師自己排的、學生不圍桌，所以
       · 座位表 = 老師匯入的一張照片（seatMode:'photo'），不是蜂巢也不是方桌
       · 計分 = 依座號的格子（scoreMode:'byNo'），不是組卡片
       · 抽籤 = 直接開「只抽號碼」那一頁
     roles 借用六職位那一套並不是偷懶：整份程式有幾十處會問「這個位子是什麼職位」，
     給空陣列會到處爆掉。化學模式下畫面根本不顯示職位，借用只是讓那些呼叫有東西可回。 */
  chem:  { name:'化學（不分組）', short:'🧪 化學', roles:ROLES_R6, layout:'hex6',
           seatMode:'photo', scoreMode:'byNo',
           title:'沒有小組，一人一個座號',
           note:'座位表是<b>老師自己匯入的照片</b>（實驗桌、單人座都可以），'
                +'計分改成<b>依座號</b>的格子，抽籤直接用<b>只抽號碼</b>那一套。<br>'
                +'不分組，所以沒有全組加分，也沒有彩虹貫通。' }
};
const DEF_COURSE = 'read6';

/* ★ 2026-08-30：班級名稱後面一律掛課程名稱。
   分數、點名、座位、抽籤全部掛在「班級」上，而一個班級只有一門課的一份分數
   （見變更紀錄「一個班級 = 一門課 = 一份分數」）。
   下拉選單裡如果兩個班都叫「115 高一忠」，老師上化學課點到閱讀思考那一份，
   分就加到別門課去了，而畫面上完全看不出來 —— 期末才發現，而且拆不開。

   ★ 做在「顯示端」而不是只在建立時改名：既有的班級不必手動改名，
     也會立刻帶出課程；老師自己已經打了「· 化學」的也不會變成「· 化學 · 化學」。 */
function courseTag(ck){
  const co = COURSES[ck] || COURSES[DEF_COURSE];
  return co.name.replace(/^高[一二三]\s*/,'').replace(/（.*$/,'').trim();
}
function clsLabel(c){
  if(!c) return '';
  const t = courseTag(c.course);
  return (c.name||'').includes(t) ? c.name : `${c.name} · ${t}`;
}
/* 建立班級時就把課程寫進名稱裡（試算表、Excel 檔名也才帶得到） */
function withCourse(name, ck){
  const t = courseTag(ck);
  return String(name||'').includes(t) ? String(name).trim() : `${String(name).trim()} · ${t}`;
}
/* 這個課程用哪一種座位表／計分方式。沒寫就是原本的分組模式。 */
function seatMode(){ return CO().seatMode || 'group'; }
function scoreMode(){ return CO().scoreMode || 'group'; }

/* 計分板要「依小組」還是「依個人」排。
   ★ 這只是排列方式，不是兩套計分規則 ——
     依個人排的時候，點下去走的仍然是 addPoint(座號, 組, 位子)，
     組別、職位、彩虹貫通全部照舊。
     兩種排法各記一套帳的話，同一個班會長出兩種對不起來的紀錄。

   化學課沒有小組可依，所以鎖在 byNo，不給切。 */
function scoreView(){
  if(scoreMode()==='byNo') return 'byNo';
  return DB.scoreView==='byNo' ? 'byNo' : 'group';
}
function setScoreView(v){
  DB.scoreView = (v==='byNo') ? 'byNo' : 'group';
  save(); renderScoreboard(); syncScoreViewUI();
}
function syncScoreViewUI(){
  const box=$('#score-view-tabs'); if(!box) return;
  const locked = scoreMode()==='byNo';       // 化學：沒有小組可依
  box.style.display = locked ? 'none' : '';
  const v=scoreView();
  box.querySelectorAll('[data-sv]').forEach(b=>
    b.classList.toggle('on', b.dataset.sv===v));
}
function courseKey(){ const c=curClass();
  return (c && COURSES[c.course]) ? c.course : DEF_COURSE; }
function CO(){ return COURSES[courseKey()]; }
/* 目前這個班用哪一套職位。所有讀 ROLES 的地方都改走這裡。 */
function ROLESET(){ return CO().roles; }

/* 蜂巢座位：0..11（每 30°，0 = 12 點鐘）。
   偶數 slot = 內圈（正1，直接貼著中心桌）；奇數 slot = 外圈（正2，卡在兩個正1中間） */
const RING1_SLOTS = [0,2,4,6,8,10];
const RING2_SLOTS = [1,3,5,7,9,11];

/* ---------------- 1b. 教室座位配置 ----------------
   同一個班可能在不同教室上課，桌子排法不一樣，所以做成可切換。

   兩種「方桌」配置的共通規則（使用者 2026-08-25 指定）：
     學生預設坐在與黑板**平行**的兩側，每側 side 人，共 2×side 人。
     人數超過時，多的人坐在桌子**左右兩側**（與黑板垂直）。

   為什麼側邊位只給 2 個：那是「這一組多出來的人」，不是常態編制。
   多到需要第 3 個側邊位，代表該分更多組而不是硬塞。

   ★ order 是「畫面上的排列順序」，不是組別編號。
     講台在最下方，所以最後一列（最靠近講台）放編號最小的組，
     老師站在台上看到的順序才跟點名順序一致。

   ★ 2026-08-30：三種配置的起點統一成「右下角＝第 1 組」，往左、往上遞增。
     之前 quad9 與 hex6r 的最後一列是 [1,2,3] / [1,2]，第 1 組在**左**下角，
     只有蜂巢是右下角。老師切配置時第 1 組會在畫面上跳到對面，
     而點名、計分、抽籤全都念「第 1 組」—— 一個晚上就會叫錯組。
     排法可以不一樣，起點不能不一樣。 */
const LAYOUTS = {
  hex6:  { name:'蜂巢 6 組',  short:'🐝 蜂巢 6 組',  kind:'hex',
           tables:6, perRow:3, base:6, max:12, order:[4,5,6,3,2,1],
           hint:'六角形蜂巢，一桌六人圍坐，第 7 人起補外圈。' },
  quad9: { name:'四人 9 組',  short:'▦ 四人 9 組',  kind:'rect',
           tables:9, perRow:3, side:2, base:4, max:6, order:[9,8,7,6,5,4,3,2,1],
           hint:'一橫列三組、共三列。每組面對面各坐 2 人；第 5、6 人坐左右側邊。' },
  hex6r: { name:'六人 6 組',  short:'▤ 六人 6 組',  kind:'rect',
           tables:6, perRow:2, side:3, base:6, max:8, order:[6,5,4,3,2,1],
           hint:'一橫列兩組、共三列。每組面對面各坐 3 人；第 7、8 人坐左右側邊。' }
};
const DEF_LAYOUT = 'hex6';

function layoutKey(){ const c=curClass();
  return (c && LAYOUTS[c.layout]) ? c.layout : DEF_LAYOUT; }
function LO(){ return LAYOUTS[layoutKey()]; }
/* 邏輯用：由小到大的組別編號。畫面用：tableOrder() 的排列順序。 */
function TABLES(){ const L=LO();
  return Array.from({length:L.tables},(_,i)=>i+1); }
function tableOrder(){ const L=LO(); return L.order || TABLES(); }

/* 各組底色（與職位彩虹無關，純粹讓老師一眼看出組別分佈）。
   四人 9 組要用到 7～9，所以備到九個。 */
const GROUP_TINT = {
  1:'#7f9cf5', 2:'#68c9a3', 3:'#e2a35c',
  4:'#c98bd6', 5:'#6fb7d8', 6:'#d98a94',
  7:'#8fc98b', 8:'#d6b06b', 9:'#9d93e0'
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
const GAS_SESSION_KEY = 'mhh_gas_token_session_v1';
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
function save(){
  /* c.seats 是「目前配置」那一份的指標，但有幾處會直接 c.seats={} 重新指派
     （清空座位、自動排入），指標就斷了。與其逐處修補，不如在存檔的當下
     一律把 c.seats 寫回 c.layouts —— 只有這裡是所有變更的必經之路。 */
  const c = DB.classes[DB.activeClass];
  if(c){ c.layouts = c.layouts || {}; c.layouts[c.layout || DEF_LAYOUT] = c.seats || {}; }
  DB.updatedAt=Date.now();
  if(DB.gasToken) sessionStorage.setItem(GAS_SESSION_KEY, DB.gasToken);
  else sessionStorage.removeItem(GAS_SESSION_KEY);
  /* GAS 金鑰只活在本分頁，不寫進永久 localStorage。 */
  localStorage.setItem(LS_KEY, JSON.stringify(Object.assign({}, DB, {gasToken:''})));
}
function load(){ try{ const raw=localStorage.getItem(LS_KEY); if(raw) DB=Object.assign(DB,JSON.parse(raw));
                       DB.gasToken=sessionStorage.getItem(GAS_SESSION_KEY)||''; }
                 catch(e){ console.warn('讀取本機資料失敗',e); }
                 migrateAllLayouts(); }
function curClass(){ return DB.classes[DB.activeClass]||null; }

/* ---- 座位依配置分層存放 ----
   同一班在不同教室有不同排法，切過去不該把另一種排法洗掉。
   c.layouts = { hex6:{1:[..],..}, quad9:{...}, hex6r:{...} }
   c.seats 永遠指向「目前這個配置」那一份 —— 這樣既有的 36 處 c.seats
   完全不用改，換配置時只是把指標換過去。 */
function migrateLayouts(c){
  if(!c) return;
  /* 課程類型：舊資料一律當高一閱讀思考（這套系統本來就是為它做的）。 */
  c.course  = COURSES[c.course] ? c.course : DEF_COURSE;
  c.layout  = LAYOUTS[c.layout] ? c.layout : DEF_LAYOUT;
  c.layouts = c.layouts || {};
  /* 舊資料只有 c.seats，那份就是蜂巢的排法 */
  if(!c.layouts[c.layout]) c.layouts[c.layout] = c.seats || {};
  c.seats = c.layouts[c.layout];
}
function migrateAllLayouts(){ Object.values(DB.classes||{}).forEach(migrateLayouts); }

/* 切換課程類型。連帶把座位配置換成該課程的預設排法
   （高一→蜂巢 6 組、高二→四人 9 組），但老師之後仍可自由再切配置。 */
/* ---- 同一個班的另一門課（2026-08-30）----
   使用者的實際情況：同一個班可能同時上閱讀思考、探究實作、化學。

   ★ 為什麼要「各開一個班級」而不是「一個班級掛多門課」：
     分數是掛在班級上的（`Records` 只有 classId，沒有課程欄位），
     一個班級就是一份累積分數。同一個班級切課程只是換職位表與座位表，
     分數會全部加在一起 —— 那是使用者親自決定要避免的。

   代價是名單要重複匯入，所以給這顆按鈕：**只複製名單**，
   分數、點名、座位、任務草稿一律不複製（那些本來就該各課各的）。 */
function cloneClassForCourse(){
  const src=curClass();
  if(!src) return alert('請先選擇要複製的班級');
  if(!(src.students||[]).length) return alert('這個班還沒有名單，先匯入名單再複製');

  const opts=Object.keys(COURSES);
  const menu=opts.map((k,i)=>`${i+1}. ${COURSES[k].name}`).join('\n');
  const pick=prompt(`新的班級要上哪一門課？輸入編號：\n\n${menu}`, '3');
  if(pick===null) return;
  const ck=opts[parseInt(pick,10)-1];
  if(!ck) return alert('沒有這個編號');

  /* 預設名稱直接把課程掛在後面 —— 下拉選單裡要一眼分得出是哪一門課的那一份 */
  const base=src.name.replace(/\s*·\s*(閱讀思考|探究實作|化學).*$/,'');
  const suggest=withCourse(base, ck);
  const name=prompt('新班級的名稱：', suggest);
  if(!name || !name.trim()) return;
  const nm=name.trim();

  if(Object.values(DB.classes).some(c=>c.year===DB.year&&c.name===nm))
    return alert(`${DB.year} 學年度已經有「${nm}」了，換一個名稱。`);

  const id=uid();
  DB.classes[id]={
    id, year:DB.year, name:nm,
    students: src.students.map(x=>({no:x.no, name:x.name})),   // 只帶名單
    seats:{}, size:src.size||6,
    course:ck, layout:COURSES[ck].layout, layouts:{}
  };
  DB.activeClass=id;
  rosterOwner=null; save(); renderAll();
  toast(`已建立「${nm}」，名單 ${src.students.length} 人。分數與點名是全新的。`, true);
}

function switchCourse(key){
  if(!COURSES[key]) return;
  const c=curClass();
  if(!c){ toast('請先選擇 / 建立班級'); return; }
  if(c.course===key) return;

  /* ★ 防呆：這個班已經有分數了，還要換課程，多半是把「另一門課」開在同一個班級上。
     分數只有一份，換課程不會把它分開 —— 這件事在畫面上完全看不出來，
     等到期末看試算表才會發現三門課的分加在一起，而那時候已經拆不開。 */
  const has=cumRecords().filter(r=>r.type!=='attend').length;
  const changesMode = (COURSES[key].scoreMode||'group') !== (CO().scoreMode||'group');
  if(has && changesMode){
    if(!confirm(
      `「${c.name}」已經有 ${has} 筆加分紀錄了。\n\n`+
      `★ 分數是掛在「班級」上的，換課程不會分開統計 —— `+
      `這一門課的分會跟原本那一門加在一起。\n\n`+
      `如果這是「同一個班的另一門課」，請按取消，改用\n`+
      `「👥 用同一份名單，開這個班的另一門課」。\n\n`+
      `還是要直接換嗎？`)) return;
  }

  c.course=key;
  save();
  /* ★ 切課程 = 換一套職位 ＋ 換一種座位配置。
     switchLayout 裡會處理「新配置沒有座位就依座號排入」，
     所以切過去不會出現「計分板空的、報告循環沒有人、統計全是零」。 */
  switchLayout(COURSES[key].layout);      // 內含 renderSeats 等全部重繪
  renderRoleCards(); renderLegend();
  toast(`已切換到「${COURSES[key].name}」：${COURSES[key].roles.length} 個職位`);
}

/* 切換配置。切之前先把目前這份存回去，免得剛排好的位子掉了。 */
function switchLayout(key){
  if(!LAYOUTS[key]) return;
  const c=curClass();
  if(!c){ toast('請先選擇 / 建立班級'); return; }
  c.layouts = c.layouts || {};
  c.layouts[c.layout || DEF_LAYOUT] = c.seats || {};   // 存回目前這份
  c.layout  = key;
  c.seats   = c.layouts[key] || (c.layouts[key] = {});

  /* ★ 2026-08-30：切過去發現「什麼都不見了」的真正原因。
     座位是**每一種配置各存一份**（c.layouts）。切到一個從來沒排過的配置，
     那一份是空的 —— 於是計分板沒有人、報告循環沒有成員、
     職位工作的舊版燈（綁位子）整片消失、統計全是零。
     老師看到的是「換一個課程，一半的功能就壞了」。

     所以：**目標配置完全沒有人時，直接依座號自動排入。**
     只在「完全空」時才做 —— 排過的那一份是老師手動調的，絕對不能覆蓋。 */
  const empty = !TABLES().some(t=>((c.seats[t])||[]).some(x=>x!=null));
  if(empty && (c.students||[]).length){
    autofillSeats(true);                 // silent：不要再跳一個 toast
  }

  save();
  renderSeats(); renderScoreboard(); renderRoll(); renderStats();
  toast(`已切換到「${LAYOUTS[key].name}」`
    + (empty && (c.students||[]).length ? '，並依座號自動排入座位' : ''));
}

/* ---------------- 3. 職位計算 ---------------- */
/* slot 每 +2 就是螢幕上順時針轉一格（0=12點鐘、2=2點鐘…）。
   「順時針」這個詞會有兩種讀法，兩種都對，但結果相反：
     A 職位牌在桌上順時針移動 → 學生拿到的職位在清單裡「倒著走」
     B 學生拿到的職位順著清單走 → 職位牌在桌上逆時針移動
   吵不完，所以做成可切換，並在圖例用「具體例子」講清楚現在是哪一種。 */
function rotDir(){ return DB.rotDir === -1 ? -1 : 1; }   // +1＝學生職位順著清單走
/* slot 怎麼對到職位，兩種配置規則不同：
     蜂巢：slot 是時鐘位置 0..11，偶數＝內圈正1、奇數＝外圈正2，anchor = slot/2
     方桌：slot 是座位序 0..max-1，前 base 個是正1（anchor＝自己），
           之後的側邊位是正2，跟第 (slot-base) 個正1 共用職位

   四人組只有四個位子，但輪動公式是 (anchor + 輪次) mod 6，
   所以四個位子會**輪過全部六個職位** —— 第1輪策略/營運/品牌/知識，
   第2輪營運/品牌/知識/資訊……六輪之後每個人都當過每個職位。
   這是刻意的：職位輪動的教學目的就是讓每個人都練到每一種角色。 */
function roleAtSlot(slot, round){
  const L = LO();
  let anchorIdx, second;
  if(L.kind === 'hex'){
    anchorIdx = Math.floor(slot/2);
    second    = slot % 2 === 1;
  }else{
    second    = slot >= L.base;
    anchorIdx = second ? (slot - L.base) : slot;
  }
  const n = ROLESET().length;
  const roleIdx = ((anchorIdx + rotDir()*(round-1)) % n + n) % n;
  return { role:ROLESET()[roleIdx], second, anchorIdx };
}
/* 該組有沒有「正2」，決定標籤要不要標 ①②  */
function roleLabel(slot, round, hasSecond){
  const r = roleAtSlot(slot, round);
  return hasSecond ? `${r.role.name}${r.second?'②':'①'}` : r.role.name;
}
/* 帶「哪一組的第幾個位子」的版本 —— 會把老師指定的職務算進去。
   畫面、計分、匯出的 PNG 都走這兩個，才不會各算各的。 */
function seatRoleLabel(tno, idx, slot, hasSecond){
  const r = seatRole(tno, idx, slot);
  return hasSecond ? `${r.role.name}${r.second?'②':'①'}` : r.role.name;
}
function seatRoleColor(tno, idx, slot){
  const r = seatRole(tno, idx, slot);
  return cssVar(r.second ? r.role.light : r.role.color);
}
function roleColor(slot, round){
  const r = roleAtSlot(slot, round);
  return cssVar(r.second ? r.role.light : r.role.color);
}
/* n 人要用哪些 slot。
   蜂巢：先排滿 6 個內圈正1，第 7 人起依序補外圈正2
   方桌：slot 就是座位序，0..side-1 上排、side..base-1 下排、base 起是左右側邊 */
function slotsForSize(n){
  const L = LO();
  if(L.kind !== 'hex'){
    return Array.from({length: Math.min(Math.max(n, L.base), L.max)}, (_,i)=>i);
  }
  /* ★ 不要排序。排序會讓外圈那一格被插進序列中間，
       結果是「加第 7 個位子」把原本坐好的 6 個人全部往後推一格，
       空位反而掉到內圈 —— 使用者回報「第二圈只有固定位置、選不到」就是這個。
       依 內圈 → 外圈 的順序附加，第 7 人才會真的坐到外圈，前 6 人不動。 */
  const out = RING1_SLOTS.slice(0, Math.min(n,6));
  for(let i=0;i<n-6 && i<6;i++) out.push(RING2_SLOTS[i]);
  return out;
}
/* ---- 版面鎖定（2026-08-30）----
   排座位時需要看得到空位才點得下去；但排完之後，空位就只是雜訊 ——
   投影出去、印出來都是一堆「＋ 點我填號」。
   鎖定＝把空位整格隱藏（資料一筆都不刪），順便關掉點擊與拖曳，
   免得上課投影時手滑把人拖走。
   ★ 存在班級上，不是全域：每個班排好的時間點不一樣。 */
function seatLocked(){ const c=curClass(); return !!(c && c.seatLocked); }
function toggleSeatLock(){
  const c=curClass(); if(!c) return alert('請先選擇班級');
  c.seatLocked = !c.seatLocked; save();
  renderSeats(); syncSeatLockBtn();
  toast(c.seatLocked ? '版面已鎖定：空位隱藏，不能再拖動' : '已解除鎖定：空位回來了，可以繼續排');
}
/* 化學模式下，一半的座位表工具是沒有意義的（自動排入、鎖定、每組人數…），
   留在畫面上只會讓人以為壞掉了。整批收起來，切回別的課程就會回來。 */
const GROUP_ONLY_SEAT_UI = ['#btn-autofill','#btn-lockseat','#btn-clearseat',
                            '#btn-export-png','#btn-truesize','#layout-tabs',
                            '#seat-legend','#seat-hint-group','#btn-print','.podium'];
/* 新增班級用的課程下拉。選項就是 COURSES —— 以後多一門課，這裡自動跟著長。 */
function renderNewCourseSelect(){
  const sel=$('#sel-newcourse'); if(!sel) return;
  const keep=sel.value;
  sel.innerHTML=Object.keys(COURSES).map(k=>
    `<option value="${k}">${COURSES[k].short}</option>`).join('');
  sel.value = COURSES[keep] ? keep : (curClass() ? courseKey() : DEF_COURSE);
}

function syncSeatModeUI(){
  const photo = seatMode()==='photo';
  GROUP_ONLY_SEAT_UI.forEach(sel=>{
    const el=$(sel); if(el) el.style.display = photo ? 'none' : '';
  });
  const gs=$('#inp-groupsize');
  if(gs && gs.parentElement) gs.parentElement.style.display = photo ? 'none' : '';
  const zb=document.querySelector('.zoombar');
  if(zb) zb.style.display = photo ? 'none' : '';
  const ph=$('#seat-hint-photo');
  if(ph) ph.style.display = photo ? '' : 'none';
}

function syncSeatLockBtn(){
  const b=$('#btn-lockseat'); if(!b) return;
  const on=seatLocked();
  b.textContent = on ? '🔒 已鎖定' : '🔓 鎖定版面';
  b.classList.toggle('btn-ok', on);
  b.title = on ? '解除鎖定，讓空位回來繼續排'
               : '排好之後鎖起來：空位整格消失，畫面與列印都乾淨';
}

/* ---- 照片座位表（2026-08-30，化學課用）----
   化學課的座位是老師在教室裡自己排的，沒有小組、也不是蜂巢或方桌。
   與其硬要用格子模擬，不如就讓老師拍一張／畫一張匯進來。

   ★ 照片只是「給老師看誰坐哪」，不承擔計分 ——
     要在照片上一個一個標出 36 個座號的位置，建置成本遠高於它省下的時間，
     而計分本來就可以走「依座號」的格子（scoreMode:'byNo'）。

   存在班級上（c.seatPhoto），壓到最長邊 1600、JPEG ——
   localStorage 是整個儀表板共用的，一張沒壓過的手機照片就能把它塞爆。 */
function seatPhotoShrink(dataUrl){
  return new Promise(res=>{
    const im=new Image();
    im.onload=()=>{
      const max=1600, sc=Math.min(1, max/Math.max(im.width,im.height));
      const cv=document.createElement('canvas');
      cv.width=Math.round(im.width*sc); cv.height=Math.round(im.height*sc);
      const cx=cv.getContext('2d');
      cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
      cx.drawImage(im,0,0,cv.width,cv.height);
      let out=cv.toDataURL('image/jpeg',.85);
      if(out.length>700000) out=cv.toDataURL('image/jpeg',.7);
      if(out.length>700000) out=cv.toDataURL('image/jpeg',.55);
      res(out);
    };
    im.onerror=()=>res(dataUrl);
    im.src=dataUrl;
  });
}
async function setSeatPhoto(file){
  const c=curClass(); if(!c) return alert('請先選擇班級');
  if(!file || !/^image\//.test(file.type)) return;
  const raw=await new Promise(r=>{ const fr=new FileReader();
    fr.onload=()=>r(fr.result); fr.readAsDataURL(file); });
  const out=await seatPhotoShrink(raw);
  if(out.length>900000)
    return alert('這張圖太大了（'+Math.round(out.length/1024)+' KB）。\n請先裁切或縮小再匯入。');
  c.seatPhoto=out; save(); renderSeats();
  toast('座位表照片已匯入（'+Math.round(out.length/1024)+' KB）');
}
function clearSeatPhoto(){
  const c=curClass(); if(!c||!c.seatPhoto) return;
  if(!confirm('移除這個班的座位表照片？')) return;
  delete c.seatPhoto; save(); renderSeats();
}

/* 化學模式的座位表：一張照片 ＋ 匯入區。 */
function renderSeatPhoto(){
  const wrap=$('#classroom'); if(!wrap) return;
  const c=curClass();
  wrap.style.gridTemplateColumns=''; wrap.style.width='';
  wrap.className='classroom photo';
  if(!c){ wrap.innerHTML='<p class="hint">請先建立班級。</p>'; return; }

  wrap.innerHTML = c.seatPhoto
    ? `<div class="sp-box">
         <img id="sp-img" src="${c.seatPhoto}" alt="${c.name} 座位表">
         <div class="sp-bar">
           <button class="btn" id="sp-zoom">🔍 放大看</button>
           <button class="btn" id="sp-replace">🔁 換一張</button>
           <button class="btn btn-ghost btn-danger" id="sp-clear">🗑️ 移除</button>
         </div>
       </div>`
    : `<div class="sp-drop" id="sp-drop" tabindex="0">
         <b>把座位表照片拖進來</b>
         <span>或直接 Ctrl+V 貼上　·　或點一下選檔案</span>
         <small>拍教室的座位、掃描手繪的座位表都可以。<br>
           照片只是給你自己看誰坐哪 —— 計分請用「⚡ 課堂互動」的依座號格子。</small>
       </div>`;

  const pick=()=>$('#sp-file').click();
  const drop=$('#sp-drop');
  if(drop){
    drop.onclick=pick;
    drop.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(); } };
    ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{
      e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{
      e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop',e=>setSeatPhoto(e.dataTransfer.files[0]));
  }
  const zb=$('#sp-zoom');
  if(zb) zb.onclick=()=>imgZoom(c.seatPhoto, c.name+'　座位表');
  const ib=$('#sp-img');
  if(ib) ib.onclick=()=>imgZoom(c.seatPhoto, c.name+'　座位表');
  const rb=$('#sp-replace'); if(rb) rb.onclick=pick;
  const cb=$('#sp-clear');   if(cb) cb.onclick=clearSeatPhoto;
}

/* ---- 位子的職務覆寫（2026-08-30）----
   職位本來完全由位子（slot）＋輪次算出來，那對「基本盤」的位子是對的：
   六個內圈位子剛好對到六個職位，每輪轉一格。

   ★ 但人數超過每組基本人數時，多出來的位子（蜂巢的外圈、方桌的側邊）
     是硬套上去的 —— 它算出來的職位不見得是老師實際指派的那一個。
     使用者要的就是這個：多出來的位子除了選名字，還要能選職務。

   存成 c.roleFix['組-位子序']=職位key，null／不存在＝跟著輪次自動算。
   ★ 存位子而不是存座號：職位一直都是綁在位子上的（換位＝換職位），
     存座號會讓「兩個人對調」變成職位跟著人跑，跟既有規則相反。 */
function roleFixKey(tno, idx){ return tno + '-' + idx; }
function roleFixOf(tno, idx){
  const c=curClass(); if(!c || !c.roleFix) return null;
  const k=c.roleFix[roleFixKey(tno,idx)];
  return (k && ROLESET().some(r=>r.key===k)) ? k : null;   // 換課程後職位表不同，對不上就當沒設
}
function setRoleFix(tno, idx, key){
  const c=curClass(); if(!c) return;
  c.roleFix = c.roleFix || {};
  if(key) c.roleFix[roleFixKey(tno,idx)] = key;
  else    delete c.roleFix[roleFixKey(tno,idx)];
  save();
}
/* 這個位子實際上是什麼職位：先看老師有沒有指定，沒有才用輪次算。
   ★ 畫面、計分、匯出的 PNG 全部走這一個，才不會各算各的。 */
function seatRole(tno, idx, slot){
  const rr = roleAtSlot(slot, DB.round);
  const fix = roleFixOf(tno, idx);
  if(!fix) return rr;
  const role = ROLESET().find(r=>r.key===fix) || rr.role;
  return { role, second:rr.second, anchorIdx:rr.anchorIdx, fixed:true };
}
/* 這個位子是不是「多出來的」（超過每組基本人數）。只有這些位子給選職務。 */
function isOverflowSeat(idx){ return idx >= LO().base; }

function tableMembers(tno){
  const c=curClass(); return (c&&c.seats&&c.seats[tno])||[];
}
/* 位子夠不夠坐？不夠就自動長出灰階空位。

   為什麼需要：一班超過 36 人時，六組各 6 個位子就不夠用，
   而原本沒有任何辦法「多加一個位子」—— 只能靠自動排入重排，
   老師想手動微調就卡死。現在只要人數比位子多，就自動補空位，
   老師點一下填座號即可，多出來的空位可以打叉收掉。

   一組最多 12 個（內圈 6 ＋ 外圈 6），這是蜂巢排列的物理上限。 */
function ensureEnoughSeats(){
  const c=curClass(); if(!c) return false;
  const L=LO(), TS=TABLES();
  c.seats=c.seats||{};
  TS.forEach(t=>{ c.seats[t]=c.seats[t]||[]; });
  const need = (c.students||[]).length;
  let changed=false, guard=0;
  const total = () => TS.reduce((s,t)=>s+Math.max(c.seats[t].length, L.base), 0);
  while(total() < need && guard++ < L.tables*L.max){
    /* 補在目前最少的那一組，維持各組人數平均 */
    let best=null;
    for(const t of TS){
      const len=Math.max(c.seats[t].length, L.base);
      if(len>=L.max) continue;
      if(!best || len<best.len) best={t,len};
    }
    if(!best) break;                       // 每組都滿了，補不下去
    while(c.seats[best.t].length < best.len) c.seats[best.t].push(null);
    c.seats[best.t].push(null); changed=true;
  }
  return changed;
}
/* 主動幫某一組加一個空位。

   為什麼需要：原本只有「人數比位子多」時才會自動補位，
   老師想預留一個位子（轉學生、併組、臨時加人）完全沒有辦法。
   使用者回報「第二圈依然只有固定位置，沒有灰色可以選、可以打叉的設計」
   講的就是這件事 —— 自動補位補的是「缺的」，補不出「想要的」。 */
function addSeatSlot(tno){
  const c=curClass(); if(!c) return;
  const L=LO();
  c.seats=c.seats||{}; c.seats[tno]=c.seats[tno]||[];
  const cur=Math.max(c.seats[tno].length, L.base);
  if(cur>=L.max){ toast(`第 ${tno} 組已達上限 ${L.max} 人`); return; }
  while(c.seats[tno].length < cur) c.seats[tno].push(null);   // 先補齊到基本盤
  c.seats[tno].push(null);
  save(); renderSeats(); renderScoreboard(); renderRoll();
  toast(`第 ${tno} 組多了一個空位，點它填座號`);
}

/* 把某一組的第 idx 個空位收掉。只准收空的，有人的位子不能這樣消失。 */
function dropSeatSlot(tno, idx){
  const c=curClass(); if(!c||!c.seats||!c.seats[tno]) return;
  if(c.seats[tno][idx]!=null) return;
  if(c.seats[tno].length <= LO().base) return;   // 基本盤不給收，收了版面會破洞
  c.seats[tno].splice(idx,1);
  save(); renderSeats(); renderScoreboard(); renderRoll();
  toast(`第 ${tno} 組收掉一個空位`);
}
function tableSlots(tno){
  return slotsForSize(Math.max(tableMembers(tno).length, LO().base));
}

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
/* silent=true：切座位配置時自動補位用。
   那時候是「順手幫老師排好」，不是老師自己按的按鈕 ——
   跳 alert 會把切配置變成兩步，跳 toast 會蓋掉 switchLayout 自己的那一則。 */
function autofillSeats(silent){
  const c=curClass(); if(!c) return silent?false:alert('請先選擇 / 建立班級');
  const list=[...c.students].sort((a,b)=>a.no-b.no), n=list.length;
  if(!n) return silent?false:alert('請先匯入名單');
  const L=LO(), cap=L.tables*L.max;
  if(silent && n>cap) return false;
  if(n>cap) return alert(`「${L.name}」每組上限 ${L.max} 人，${L.tables} 組最多 ${cap} 人。
目前 ${n} 人，請換一種座位配置。`);
  const base=Math.floor(n/L.tables), extra=n%L.tables;
  c.seats={}; let i=0;
  for(let t=1;t<=L.tables;t++){ const cnt=base+(t<=extra?1:0);
    c.seats[t]=list.slice(i,i+cnt).map(s=>s.no); i+=cnt; }
  if(c.layouts) c.layouts[c.layout||DEF_LAYOUT]=c.seats;
  c.size=base+(extra?1:0);
  const gs=$('#inp-groupsize'); if(gs) gs.value=c.size;
  if(silent) return true;
  save(); renderSeats(); renderScoreboard();
  toast(`已依座號平均排入：每組 ${base}${extra?'～'+(base+1):''} 人`);
  return true;
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

/* ---- 方桌配置的尺寸 ----
   座位寬度沿用蜂巢的 224px，投影出來字級才一致（老師是站在教室後面看的）。
   側邊位窄一點（170px），視覺上就看得出「那是加出來的位子」。 */
const RSEAT_W = 224, RSEAT_H = 118;
const RSIDE_W = 170, RSIDE_H = 150;      // 側邊位：窄而高，暗示與黑板垂直
const RTABLE_H = 104, RGAP = 12, RTOP = 34;

function rectMetrics(L){
  const innerW = L.side * RSEAT_W;
  const padL   = RSIDE_W + RGAP + 8;
  const unitW  = innerW + 2*padL;
  const unitH  = RTOP + RSEAT_H*2 + RTABLE_H + RGAP*2 + 18;
  return { innerW, padL, unitW, unitH };
}
/* slot → 在 unit 內的像素座標。
   0..side-1     上排（與黑板平行）
   side..base-1  下排（與黑板平行）
   base, base+1  左、右側邊（與黑板垂直，人數溢出時才出現） */
function rectSeatPos(L, slot){
  const M = rectMetrics(L);
  const topY   = RTOP + RSEAT_H/2;
  const tableY = RTOP + RSEAT_H + RGAP + RTABLE_H/2;
  const botY   = RTOP + RSEAT_H + RGAP*2 + RTABLE_H + RSEAT_H/2;
  if(slot < L.side)
    return { x: M.padL + RSEAT_W*(slot + 0.5), y: topY, side:false };
  if(slot < L.base)
    return { x: M.padL + RSEAT_W*(slot - L.side + 0.5), y: botY, side:false };
  const isLeft = (slot === L.base);
  return { x: isLeft ? (RSIDE_W/2 + 8) : (M.unitW - RSIDE_W/2 - 8),
           y: tableY, side:true };
}

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

/* 座位配置的子分頁。畫在座位表面板最上方，切一下就換一間教室的排法。 */
function renderLayoutTabs(){
  /* 課程類型（決定用哪一套職位） */
  const cbox=$('#course-tabs');
  if(cbox){
    const ck=courseKey();
    cbox.innerHTML=`<span class="ltab-lead">課程</span>`+
      Object.keys(COURSES).map(k=>{
        const C=COURSES[k];
        /* 化學不分組，講「幾個職位」是錯的 —— 那一套在化學模式下根本不顯示 */
        const tip = C.scoreMode==='byNo'
          ? '不分組：照片座位表 ＋ 依座號計分'
          : `${C.roles.length} 個職位：${C.roles.map(r=>r.name).join('、')}`;
        return `<button class="ltab course${k===ck?' on':''}" data-course="${k}"
          title="${tip}">${C.short}</button>`;
      }).join('')+
      `<span class="ltab-hint">${COURSES[ck].scoreMode==='byNo'
        ? '不分組 —— 座位表用照片，計分依座號'
        : COURSES[ck].roles.length + ' 個職位：'
          + COURSES[ck].roles.map(r=>r.name).join('、')}</span>`;
    cbox.querySelectorAll('[data-course]').forEach(b=>{
      b.onclick=()=>switchCourse(b.dataset.course);
    });
  }
  /* 教室座位配置 */
  const box=$('#layout-tabs'); if(!box) return;
  const cur=layoutKey();
  box.innerHTML=`<span class="ltab-lead">教室</span>`+
    Object.keys(LAYOUTS).map(k=>{
      const L=LAYOUTS[k];
      return `<button class="ltab${k===cur?' on':''}" data-layout="${k}"
        title="${L.hint}">${L.short}</button>`;
    }).join('')+`<span class="ltab-hint">${LAYOUTS[cur].hint}</span>`;
  box.querySelectorAll('[data-layout]').forEach(b=>{
    b.onclick=()=>{ if(b.dataset.layout!==layoutKey()) switchLayout(b.dataset.layout); };
  });
}

function renderSeats(){
  const wrap=$('#classroom'); wrap.innerHTML='';
  const c=curClass();
  migrateLayouts(c);                   // 換班級／新建班級都會經過這裡
  renderLayoutTabs();
  if(ensureEnoughSeats()) save();      // 人比位子多就先補足，避免有人沒座位可填
  $('#seat-class-tag').textContent = c ? `${DB.year} · ${clsLabel(c)}` : '尚未建立班級';
  if(c) $('#inp-groupsize').value = c.size||6;

  /* 化學課：座位表是一張照片，不走底下整套桌子的幾何。
     放在最前面 return —— 底下每一行都在算桌子的位置，對照片模式全是白工。 */
  if(seatMode()==='photo'){
    renderLayoutTabs();
    $('#seat-class-tag').textContent = c ? `${DB.year} · ${clsLabel(c)}` : '尚未建立班級';
    renderSeatPhoto();
    syncSeatModeUI();
    return;
  }

  /* ★ 2026-08-30 修：photo 模式把 class 改成 'classroom photo'（display:block），
     而分組模式從來沒有把它改回來 —— 化學課切回閱讀思考，六張桌子就變成
     一欄六列的巨大清單，畫面上像是座位表壞了。這裡一律寫回來。 */
  wrap.className='classroom';

  const L = LO();
  const locked = seatLocked();
  syncSeatLockBtn();          // 切班級時按鈕要跟著換成該班的狀態
  syncSeatModeUI();
  const openRing = !!c && (c.students||[]).length > L.tables * L.base;
  const M = L.kind==='hex' ? null : rectMetrics(L);
  const unitW = L.kind==='hex' ? UNIT_W : M.unitW;
  const unitH = L.kind==='hex' ? UNIT_H : M.unitH;
  const canvasW = unitW*L.perRow + 24;

  wrap.style.gridTemplateColumns=`repeat(${L.perRow},1fr)`;
  wrap.style.width=canvasW+'px';
  wrap.dataset.cw=canvasW;

  tableOrder().forEach(tno=>{
    const members = c ? tableMembers(tno) : [];
    /* openRing：全班人數超過「每組基本盤 x 組數」時，把每一組的外圈整圈攤開成灰色空位。

       為什麼要這樣：原本外圈只有「真的有人坐」或「自動補位補出來的那幾格」才會出現，
       所以 40 人的班自動排入之後 6 組全滿、畫面上一個灰色都沒有 ——
       老師想把某個人挪到第 5 組的外圈，根本沒有可以點的目標，
       只剩右上角那顆半透明的「+ 位子」，觸控螢幕上沒有 hover 更是等於看不見。
       使用者兩次回報「第二圈依然沒有灰色可以點擊」講的就是這件事。

       只在超過 36 人（六人組 x 6 組）時攤開，是因為人數在基本盤以內時
       多出來的 6 個灰格只是雜訊，反而看不清楚誰坐哪裡。 */
    const slots = slotsForSize(openRing ? L.max : Math.max(members.length, L.base));
    /* 標不標 (1)(2) 要看「這一組畫出來的位子裡有沒有外圈」，不是看「坐了幾個人」。
       否則外圈攤開後，坐滿 7 人的組標了(1)(2)、只坐 6 人的組沒標，同一畫面兩套規則。 */
    const hasSecond = slots.some(s => roleAtSlot(s, DB.round).second);
    const tint = GROUP_TINT[tno] || '#8b93a7';

    const unit=document.createElement('div');
    unit.className='table-unit';
    unit.style.height=unitH+'px';
    unit.style.setProperty('--tint', tint);

    const label=document.createElement('div');
    label.className='unit-label'; label.textContent=`第 ${tno} 組`;
    unit.appendChild(label);

    /* 主動加位子。放在組別標籤旁邊，老師想預留位子時不必先改名單。 */
    if(c && !openRing && !locked){
      const addb=document.createElement('button');
      addb.className='unit-add';
      addb.textContent='＋ 位子';
      addb.title=`幫第 ${tno} 組加一個空位（上限 ${L.max} 人）
加出來的空位可以點它填座號，不要的按空位上的 ✕ 收掉`;
      addb.onclick=e=>{ e.stopPropagation(); addSeatSlot(tno); };
      unit.appendChild(addb);
    }

    if(L.kind==='hex'){
      const hex=document.createElement('div'); hex.className='hexwrap';
      hex.style.width=HEX_W+'px'; hex.style.height=HEX_H+'px';
      hex.innerHTML=`<b>${tno}</b>`;
      unit.appendChild(hex);
    }else{
      /* 方桌本體。畫成長方形而不是六角形，老師才看得出這是哪一間教室的排法。 */
      const tb=document.createElement('div'); tb.className='tablewrap';
      tb.style.width=M.innerW+'px'; tb.style.height=RTABLE_H+'px';
      tb.style.left=(M.padL + M.innerW/2)+'px';
      tb.style.top =(RTOP + RSEAT_H + RGAP + RTABLE_H/2)+'px';
      tb.innerHTML=`<b>${tno}</b>`;
      unit.appendChild(tb);
    }

    slots.forEach((slot, idx)=>{
      const no = members[idx];
      const rr = seatRole(tno, idx, slot);
      const el = document.createElement('div');
      const col=seatRoleColor(tno, idx, slot);
      if(L.kind==='hex'){
        el.className='seat'+(no==null?' empty':'')+(rr.second?' ring2':'');
        el.style.width=HEX_W+'px'; el.style.height=HEX_H+'px';
        const rad=slot*30*Math.PI/180, R=rr.second?R2:R1;
        el.style.left=`calc(50% + ${(Math.sin(rad)*R).toFixed(1)}px)`;
        el.style.top =`calc(50% - ${(Math.cos(rad)*R).toFixed(1)}px)`;
      }else{
        const p=rectSeatPos(L, slot);
        el.className='seat rect'+(no==null?' empty':'')+(rr.second?' ring2':'')
                     +(p.side?' seat-side':'');
        el.style.width =(p.side?RSIDE_W:RSEAT_W)+'px';
        el.style.height=(p.side?RSIDE_H:RSEAT_H)+'px';
        el.style.left=p.x.toFixed(1)+'px';
        el.style.top =p.y.toFixed(1)+'px';
      }
      el.style.setProperty('--sc', col);
      /* 鎖定後空位整格不畫。用「不畫」而不是 visibility:hidden ——
         隱藏起來的元素還是會吃到點擊與拖曳的判定。 */
      if(locked && no==null) return;
      /* 空位且這一組超過 6 個位子時，給一顆打叉鈕把多出來的空位收掉。
         前 6 個是蜂巢的基本盤，收掉會讓版面破洞，所以不給收。 */
      const stored = idx < members.length;          // 這一格真的存在資料裡嗎
      const canDrop = (no==null && stored && !openRing && members.length > L.base);
      el.innerHTML=
        `<div class="s-in">`+
        `<div class="s-role" style="background:${col};color:${rr.second?'#10131a':'#fff'}">`+
          `${seatRoleLabel(tno,idx,slot,hasSecond)}${rr.fixed?' ✎':''}</div>`+
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
      if(locked) el.classList.add('locked');      // 游標不再是「可拖」的手
      el.addEventListener('pointerdown', ev=>{
        if(locked) return;                        // 鎖定時不給拖，投影時手滑就不會把人搬走
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
      data-id="${c.id}" title="${c.year} 學年度 · ${clsLabel(c)}">${
      c.year!==DB.year?`<i>${c.year}</i> `:''}${clsLabel(c)}
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
    const s=RING1_SLOTS.find(x=>roleAtSlot(x,r).role.name===ROLESET()[0].name);
    return (s===0?12:s)+'點';
  }).join(' → ');
  note.innerHTML=`<span style="color:var(--txt2)">
    <b>第 ${DB.round} 輪</b>　深色＝正1（內圈）　淺色＝正2（外圈）<br>
    坐在 12 點鐘的同學：<b>${seatSeq}</b>（第1→2→3輪）<br>
    「${ROLESET()[0].name}」這塊牌子在桌上：<b>${badgeSeq}</b>
    　→ 牌子${rotDir()===1?'逆':'順'}時針移動</span>`;
  lg.appendChild(note);
}
function slotClock(slot){ return `${slot===0?12:slot} 點鐘`; }

/* 自動縮放。
   ★ 2026-08-30 改回「A4 橫印一頁」的模式。
     舞台的形狀就是橫向 A4（297:210），整張座位表縮到**剛好塞得進去**，
     不用捲、不用滾。

     上一版只 fit 寬度：六組蜂巢在筆電上會往下溢出，投影時老師得捲畫面
     才看得到最後一列，而列印出來卻是完整的一頁 ——
     螢幕上看到的和紙上印出來的不是同一件事，排位子時就會排錯。
     手動 🔍 倍率仍然乘在上面，要放大看某一格照樣可以（那時才會出現捲軸）。 */
const A4_RATIO = 210/297;                  // 橫向 A4 的高/寬
function applyZoom(){
  const wrap=$('#classroom'), box=$('.classroom-scroll');
  if(!wrap||!box) return;
  const manual=parseFloat($('#inp-zoom')?.value||'1');
  const canvasW=parseFloat(wrap.dataset.cw)||CANVAS_W;
  const avail=box.clientWidth||wrap.parentElement.clientWidth||(innerWidth-60);
  /* 先把縮放拿掉才量得到「原始高度」；量完馬上蓋回去，畫面不會閃 */
  wrap.style.transform='none';
  const canvasH=wrap.scrollHeight||1;
  const pageH=Math.max(240,(avail-4)*A4_RATIO);
  const fit=Math.min(1.35,(avail-4)/canvasW, pageH/canvasH);
  const s=Math.max(.35,fit*manual);
  wrap.style.transform=`scale(${s})`;
  box.style.height=(canvasH*s+10)+'px';
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
    `${DB.year} 學年度　${c?clsLabel(c):''}　座位表（第 ${DB.round} 輪）　`+
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
  const rr=seatRole(table,index,slot);
  $('#seat-modal-title').textContent=
    `第 ${table} 組 · ${rr.role.name}${rr.fixed?'（老師指定）':''}`;
  renderSeatRolePicker(table,index,slot);
  $('#inp-seatno').value=cur==null?'':cur;
  $('#seat-preview').textContent=cur==null?'—':(studentName(cur)||'查無此座號');
  $('#inp-seatsearch').value='';
  renderSeatPicker();
  $('#modal-seat').classList.add('show');
  setTimeout(()=>$('#inp-seatno').focus(),50);
}

/* 職務下拉：只有「多出來的位子」給選。
   ★ 基本盤的位子不給選，是因為那六個位子的職位就是輪動制度本身 ——
     開放去改，「每輪轉一格」這件事就沒有意義了，而那是這套座位表的核心。 */
function renderSeatRolePicker(tno, idx, slot){
  const wrap=$('#seat-role-wrap'), sel=$('#sel-seatrole'), hint=$('#seat-role-hint');
  if(!wrap||!sel) return;
  if(!isOverflowSeat(idx)){
    wrap.style.display='none';
    if(hint) hint.textContent='';
    return;
  }
  wrap.style.display='';
  const auto=roleAtSlot(slot,DB.round).role;
  const fix=roleFixOf(tno,idx);
  sel.innerHTML = `<option value="">跟著輪次自動算（目前：${auto.name}）</option>`
    + ROLESET().map(r=>
        `<option value="${r.key}"${r.key===fix?' selected':''}>${r.name}</option>`).join('');
  if(hint) hint.innerHTML='這是<b>多出來的位子</b>（超過每組基本人數），'
    + '所以可以自己指定職務。選「自動」就跟著輪次走。';
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

  /* 職務指定跟著這一次「確定」一起存。
     ★ 只在多出來的位子存 —— 基本盤的位子沒有這個下拉，
       硬存會讓「每輪轉一格」失效，而那是這套座位表的核心規則。 */
  const rsel=$('#sel-seatrole');
  if(rsel && isOverflowSeat(index)) setRoleFix(table, index, rsel.value||null);

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
  /* 職務可能被老師指定過，所以要用「這個人坐在第幾個位子」去查，不能只看 slot */
  const idx=tableMembers(table).indexOf(no);
  const rr=idx>=0 ? seatRole(table, idx, slot) : roleAtSlot(slot,DB.round);
  addRecord({ no, name:studentName(no)||('座號'+no), table, slot,
    roleKey:rr.role.key,
    roleName:idx>=0 ? seatRoleLabel(table,idx,slot,hasSecond) : roleLabel(slot,DB.round,hasSecond),
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
  /* 彩虹貫通一堂課可能發生五六次，固定同一個特效放到後面就沒感覺了，
     所以跟工作看板共用同一組輪替特效。 */
  const _cn=celebrate();
  toast(`🌈 第 ${table} 組 全員發言，彩虹貫通！全組每人 +${RAINBOW_BONUS} 分（第 ${rounds} 次）${_cn?'　'+_cn:''}`, true);
}

/* 依座號計分（化學課用）。沒有小組，所以：
   一人一格、點一下 +1、右邊的「−」扣 1，沒有全組加分、沒有彩虹貫通。
   紀錄一樣寫進 Records（table 記 0），所以雲端統計、Summary 全部照舊 ——
   不分組不代表要另開一套帳。 */
function renderScoreboardByNo(){
  const box=$('#scoreboard'); box.innerHTML='';
  const c=curClass();
  const sr=sessionRecords();
  const list=(c.students||[]).slice().sort((a,b)=>Number(a.no)-Number(b.no));
  if(!list.length){
    box.innerHTML='<p class="hint">這個班還沒有名單。到「⚙️ 名單與雲端」匯入座號與姓名。</p>';
    return;
  }
  const grid=document.createElement('div');
  grid.className='nogrid';
  let spoke=0, silent=0;
  list.forEach(st=>{
    const no=st.no;
    const p=cumRecords().filter(r=>String(r.no)===String(no)).reduce((a,r)=>a+r.points,0);
    const sc=speakCount(sr,no);
    if(sc>0) spoke+=sc; else silent++;
    const el=document.createElement('div');
    el.className='nostu'+(sc>0?' spoke':' zero');
    const at0 = scoreMode()==='byNo' ? null : seatOf(no);
    el.innerHTML=`<span class="nono">${no}</span>
      <span class="noname">${studentName(no)||'—'}${
        at0 ? `<span class="nogrp">第 ${at0.table} 組</span>` : ''}</span>
      <span class="nopts">${p}</span>
      <button class="mini-btn minus" title="扣 1 分">−</button>`;
    /* ★ 有座位的人一律走 addPoint —— 組別、職位、彩虹貫通全部照舊。
       只有真的沒座位的人（化學課、或還沒排進座位表）才記成 table:0。
       不這樣做的話，同一個班「依小組」與「依個人」會長出兩種對不起來的紀錄。 */
    /* ★ 化學課一律不查座位。
       座位資料（c.seats）是整個班共用的，化學課如果去查，
       會查到這個班上「閱讀思考」時排的座位，把化學的分數掛到那邊的組別上，
       甚至誤觸彩虹貫通 —— 那是完全錯的帳。
       閱讀思考切到「依個人」排列時才查，因為那時候組別本來就成立。 */
    const at = scoreMode()==='byNo' ? null : seatOf(no);
    const slotOf = at ? (tableSlots(at.table)[at.index] ?? -1) : -1;
    const give = (pts, type, why) => {
      if(at && slotOf>=0) addPoint(no, at.table, slotOf, pts, type, why);
      else addRecord({ no, name:studentName(no)||('座號'+no), table:0, slot:-1,
        roleName:'', points:pts, type, note:why });
      renderScoreboard();
    };
    el.querySelector('.minus').onclick=e=>{
      e.stopPropagation();
      give(-1,'deduct','依座號扣分');
      toast(`${studentName(no)||no} −1`);
    };
    el.onclick=e=>{
      give(1,'answer','依座號加分');
      pop(e.clientX,e.clientY,'#4f8cff');
    };
    grid.appendChild(el);
  });
  box.appendChild(grid);

  $('#live-total').textContent   = sr.reduce((a,r)=>a+r.points,0);
  $('#live-spoke').textContent   = sr.filter(r=>r.type==='answer').length;
  /* 不分組（化學）才沒有貫通這件事；閱讀思考只是換個排法，貫通照樣在跑 */
  $('#live-rainbow').textContent = scoreMode()==='byNo' ? '—' : totalRainbow();
  $('#live-silent').textContent  = silent;
}

function renderScoreboard(){
  const box=$('#scoreboard'); box.innerHTML='';
  const c=curClass();
  if(!c){ box.innerHTML='<p class="hint">請先到「名單與雲端」建立班級並匯入名單。</p>'; return; }
  syncScoreViewUI();
  if(scoreView()==='byNo') return renderScoreboardByNo();
  const sr=sessionRecords();
  let spokeCnt=0, silent=0;

  TABLES().forEach(tno=>{
    const members=tableMembers(tno);
    const slots=tableSlots(tno);
    const hasSecond=members.length>6;
    const card=document.createElement('div'); card.className='gcard';
    card.style.setProperty('--tint', GROUP_TINT[tno]);

    const rows=[];
    let gpts=0, allSpoke=members.filter(x=>x!=null).length>0;
    members.forEach((no,idx)=>{
      if(no==null) return;
      const slot=slots[idx], rr=seatRole(tno, idx, slot);
      const p=ptsOf(sr,no), sc=speakCount(sr,no);
      gpts+=p;
      if(sc>0) spokeCnt++; else { silent++; allSpoke=false; }
      rows.push({no,slot,rr,p,sc,idx});      // idx 要留著：職務可能被老師指定過
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

    rows.forEach(({no,slot,rr,p,sc,idx})=>{
      const col=seatRoleColor(tno, idx, slot);
      const s=document.createElement('div');
      s.className='stu'+(sc>0?' spoke':' zero');
      s.innerHTML=`<span class="swatch" style="background:${col}"></span>
        <span class="sname">${studentName(no)||('座號'+no)}
          <span class="srole">${no} · ${rr.role.name}${hasSecond?(rr.second?'②':'①'):''}${
            rr.fixed?' ✎':''}${sc>0?' · 發言 '+sc+' 次':''}</span></span>
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
  $('#roll-class-tag').textContent = c ? `${DB.year} · ${clsLabel(c)} · ${DB.session}` : '尚未建立班級';
  if(!c || !c.students.length){
    wrap.innerHTML='<p class="hint">請先到「⚙️ 名單與雲端」建立班級並匯入名單。</p>';
    $('#roll-stat').innerHTML=''; return;
  }

  const mode=$('#sel-rollsort').value;
  const groups=[];
  if(mode==='group'){
    TABLES().forEach(t=>{
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
      .forEach(x=>TABLES().forEach(t=>gmap[`${x.name} 第${t}組`]=0));
  } else TABLES().forEach(t=>gmap['第'+t+'組']=0);
  rs.forEach(r=>{ if(!r.table) return; gmap[gkey(r)]=(gmap[gkey(r)]||0)+r.points; });
  Object.keys(gmap).forEach(k=>gmapPer[k]=per(gmap[k]));
  bars('#bar-group', gmapPer, 'var(--pri)', null, ' 分/堂');

  const rmap={};
  answers.forEach(r=>{ const ro=ROLESET().find(x=>x.key===r.roleKey);
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
    if(rainbow){ const r=ROLESET().find(x=>x.name===k); if(r) cl=`var(${r.color})`; }
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

/* ---------------- 9.5 圖片放大檢視（2026-08-30） ----------------
   題目附圖與學生作答的手繪圖共用。掛在 window 上是因為 push.js 是 ES module，
   拿不到這個檔案的區域變數 —— 而兩邊各寫一份縮放邏輯遲早會漂移。 */
const IZ = { z:1, x:0, y:0, iw:0, ih:0 };
function izApply(){
  const im=$('#iz-img'); if(!im) return;
  im.style.transform=`translate(${IZ.x}px,${IZ.y}px) scale(${IZ.z})`;
}
function izFit(){
  if(!IZ.iw) return;
  /* 見 student.html 的 lboxFit：視窗比工具列還矮時會扣成負的，圖會顛倒 */
  const h=Math.max(120, innerHeight-80);
  const z=Math.max(.02, Math.min(innerWidth/IZ.iw, h/IZ.ih));
  IZ.z=z; IZ.x=(innerWidth-IZ.iw*z)/2; IZ.y=(h-IZ.ih*z)/2;
  izApply();
}
function izZoomAt(f, cx, cy){
  const nz=Math.max(.05, Math.min(16, IZ.z*f)), k=nz/IZ.z;
  IZ.x=cx-(cx-IZ.x)*k; IZ.y=cy-(cy-IZ.y)*k; IZ.z=nz; izApply();
}
function imgZoom(src, tip){
  const box=$('#imgzoom'), im=$('#iz-img'); if(!box||!im||!src) return;
  const t=$('#iz-tip');
  if(t) t.textContent = tip || '滾輪縮放　·　拖曳移動　·　Esc 關閉';
  im.onload=()=>{ IZ.iw=im.naturalWidth; IZ.ih=im.naturalHeight; izFit(); };
  im.src=src; box.classList.add('show');
  if(im.complete && im.naturalWidth){ IZ.iw=im.naturalWidth; IZ.ih=im.naturalHeight; izFit(); }
}
function izClose(){ const b=$('#imgzoom'); if(b) b.classList.remove('show'); }
window.imgZoom = imgZoom;

function bindImgZoom(){
  const box=$('#imgzoom'); if(!box) return;
  $('#iz-close').onclick=izClose;
  $('#iz-fit').onclick=izFit;
  $('#iz-in').onclick =()=>izZoomAt(1.4, innerWidth/2, innerHeight/2);
  $('#iz-out').onclick=()=>izZoomAt(1/1.4, innerWidth/2, innerHeight/2);
  let drag=null;
  box.addEventListener('pointerdown', e=>{
    if(e.target.closest('.iz-bar')) return;
    drag={x:e.clientX,y:e.clientY}; box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', e=>{
    if(!drag) return;
    IZ.x+=e.clientX-drag.x; IZ.y+=e.clientY-drag.y;
    drag={x:e.clientX,y:e.clientY}; izApply();
  });
  ['pointerup','pointercancel'].forEach(t=>box.addEventListener(t,()=>drag=null));
  box.addEventListener('dblclick', e=>izZoomAt(IZ.z>1.5?1/2:2, e.clientX, e.clientY));
  box.addEventListener('wheel', e=>{ e.preventDefault();
    izZoomAt(e.deltaY<0?1.15:1/1.15, e.clientX, e.clientY); }, {passive:false});
  addEventListener('keydown', e=>{
    if(e.key==='Escape' && box.classList.contains('show')){
      e.stopPropagation(); izClose();
    }
  }, true);
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
  numLotSyncRange();
  /* 化學課沒有分組，開起來就該是「只抽號碼」那一頁 ——
     每次都要老師自己再點一下切換，上課時就是多一個會忘記的步驟。 */
  const wantNum = scoreMode()==='byNo';
  const tab=document.querySelector(`#lot-mode-tabs .ltab[data-lmode="${wantNum?'number':'group'}"]`);
  if(tab) tab.click();
  /* 分組模式的那半邊對化學課完全沒有意義，連分頁鈕都收起來 */
  const gtab=document.querySelector('#lot-mode-tabs .ltab[data-lmode="group"]');
  if(gtab) gtab.style.display = wantNum ? 'none' : '';
  $('#modal-lottery').classList.add('show');
}

/* ---- 號碼模式（2026-08-30）----
   給沒有分組討論的課用（化學課那種老師手動排的座位表）。
   刻意跟分組模式共用同一個彈窗、分頁切換 —— 兩個彈窗會各自漂移，
   而且老師上課時要找的是「抽籤」這一顆按鈕，不是兩顆長得很像的按鈕。

   權重與已抽清單存進 DB，換頁、重整都還在：
   「抽過不再抽」如果一重整就忘光，那它在一整堂課裡等於沒有作用。 */
function numLot(){
  DB.numLot = DB.numLot || { lo:1, hi:0, w:{}, drawn:[], norepeat:true };
  return DB.numLot;
}
/* 範圍預設跟著班級人數走，老師還是可以自己改 */
function numLotSyncRange(){
  const n=numLot();
  if(!n.hi){
    const c=curClass();
    const nos=((c&&c.students)||[]).map(s=>Number(s.no)).filter(Number.isFinite);
    n.hi = nos.length ? Math.max(...nos) : 36;
    save();
  }
  const lo=$('#lot-lo'), hi=$('#lot-hi'), nr=$('#lot-norepeat');
  if(lo) lo.value=n.lo; if(hi) hi.value=n.hi; if(nr) nr.checked=!!n.norepeat;
  numLotRender();
}
function numLotRender(){
  const n=numLot();
  const wl=$('#lot-wlist');
  if(wl){
    const ks=Object.keys(n.w).filter(k=>Number(n.w[k])!==1);
    wl.innerHTML = ks.length
      ? '權重：'+ks.map(k=>`${k} 號 × ${n.w[k]} 張`).join('、')
      : '（全部各 1 張籤）';
  }
  const dl=$('#lot-drawn');
  if(dl){
    const out=outTodayList();
    const outTxt = out.length
      ? `<br><span style="color:var(--warn)">今天不在的 ${out.length} 位已排除：`
        +`${out.map(no=>numLotLabel(no)).join('、')}</span>` : '';
    dl.innerHTML = (n.drawn.length
      ? `已抽 ${n.drawn.length} 位：${n.drawn.map(no=>numLotLabel(no)).join('、')}`
      : '尚未抽過') + outTxt;
  }
}
function numLotLabel(no){
  const nm=studentName(no);
  return nm ? `${no} ${nm}` : String(no);
}
/* 今天「人不在」的狀態。曠課／事假／病假／公假都算 ——
   抽到一個今天請假的人，全班會等他站起來，然後老師才想起他沒來。
   遲到不算：人已經到了。中途離開（leftAt）也不算，因為多半是去洗手間就回來。
   ★ 這是「今天這一堂」的判斷，換一天就自動失效，不必手動清。 */
const OUT_STATUS = ['absent','personal','sick','official'];
function isOutToday(no){ return OUT_STATUS.includes(attendOf(no)); }
function outTodayList(){
  const c=curClass(); if(!c) return [];
  return (c.students||[]).map(x=>Number(x.no)).filter(no=>isOutToday(no));
}

function numLotPool(){
  const n=numLot();
  const lo=Number($('#lot-lo').value)||1, hi=Number($('#lot-hi').value)||lo;
  const no=$('#lot-norepeat').checked;
  n.lo=lo; n.hi=hi; n.norepeat=no; save();
  const pool=[];
  for(let i=lo;i<=hi;i++){
    if(isOutToday(i)) continue;                    // ★ 今天請假／曠課的不進籤筒
    if(no && n.drawn.includes(i)) continue;
    const k = n.w[i]===undefined ? 1 : Number(n.w[i]);
    for(let j=0;j<k;j++) pool.push(i);
  }
  return pool;
}
function numLotPick(){
  const n=numLot(), d=$('#lot-num-display');
  const pool=numLotPool();
  if(!pool.length){
    d.innerHTML='✓<small>這個範圍抽完了，按「重置」再來一輪</small>';
    return;
  }
  let k=0;
  const timer=setInterval(()=>{
    const p=pool[Math.floor(Math.random()*pool.length)];
    d.innerHTML=String(p);
    if(++k>18){
      clearInterval(timer);
      const hit=pool[Math.floor(Math.random()*pool.length)];
      const nm=studentName(hit);
      d.innerHTML=`${nm||hit}<small>座號 ${hit}</small>`;
      if(!n.drawn.includes(hit)) n.drawn.push(hit);
      save(); numLotRender();
      pop(innerWidth/2, innerHeight/2.4, '#f39c12');
    }
  },70);
}
function doLottery(){
  const c=curClass(); if(!c) return;
  const sr=sessionRecords();
  let pool=[];
  TABLES().forEach(t=>{
    const ms=tableMembers(t), slots=tableSlots(t);
    /* ★ 今天請假／曠課的不進籤筒（與號碼模式同一條規則） */
    ms.forEach((no,i)=>{ if(no!=null && !isOutToday(no)) pool.push({no,table:t,slot:slots[i]}); });
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

/* ★ 2026-08-30：欄位改成「跟著課程走」。
   分組的課（閱讀思考／探究實作）要 組別 與 ①②；
   不分組的課（化學）兩樣都是空的 —— 印出兩排永遠空白的欄位，
   老師會以為是自己漏填，而且擠掉了真正要手寫的那 10 個窄欄。

   職位每一輪都會轉，紙本印職位名稱只會過期 → 分組的課只留「①②」標記：
   同一個職位剛好有兩個人時才標，其餘留白。 */
function xlLayout(noGroup){
  const lead = noGroup
    ? [{w:5.0, t:'編號'}, {w:14, t:'姓名'}, {w:6.0, t:'座號'}]
    : [{w:4.2, t:'編號'}, {w:12, t:'姓名'}, {w:5.5, t:'組別'},
       {w:4.6, t:'①②'}, {w:4.6, t:'座號'}];
  const first = lead.length + 1;                       // 第 1 堂在第幾欄
  const cols  = lead
    .concat(Array.from({length:XL_SESSIONS},(_,i)=>({w:4.9, t:String(i+1)})))
    .concat([{w:5.6, t:'缺席'}, {w:12, t:'備註'}]);
  return { noGroup, lead:lead.length, cols, n:cols.length,
           first, absent:first+XL_SESSIONS, note:first+XL_SESSIONS+1 };
}
/* 目前正在產生的那一張工作表用哪一套欄位。
   ★ 一定要在 buildClassSheet 一開頭就設好 —— 下面每一個 xl* 函式都讀它。 */
let XL = xlLayout(false);

function xlEnd(){ return MiniXlsx.colName(XL.n); }
function xlRow(cells,h){ return {h, cells}; }
function xlBlank(n,s){ return Array.from({length:n},()=>({v:'',s})); }
/* 整列合併的說明列 */
function xlFullRow(rows,merges,cell,h){
  const cells=new Array(XL.n).fill(null); cells[0]=cell;
  rows.push({h,cells});
  merges.push(`A${rows.length}:${xlEnd()}${rows.length}`);
}
/* 一位學生的資料列；缺席欄用 COUNTIF 真的去數，不是寫死的數字。
   thick=true 時整列的下框線加粗（依座號頁每 5 個號碼分隔一次）。 */
function xlStudentRow(rows, idx, no, name, grp, mark, thick){
  const r=rows.length+1;
  const a=MiniXlsx.colName(XL.first), b=MiniXlsx.colName(XL.absent-1);
  const C = thick?13:4, L = thick?14:5, B = thick?15:6;   // 置中／靠左／空白
  const lead = XL.noGroup
    ? [{v:idx,s:C,num:true}, {v:name,s:L}, {v:no,s:C,num:true}]
    : [{v:idx,s:C,num:true}, {v:name,s:L}, {v:grp,s:C},
       {v:mark||'',s:C}, {v:no,s:C,num:true}];
  rows.push(xlRow([
    ...lead,
    ...xlBlank(XL_SESSIONS,B),
    {v:`COUNTIF(${a}${r}:${b}${r},"X")`, s:C, f:true},
    {v:'',s:B}
  ],15.75));
}
/* sessFrom：這一頁的窄欄要從第幾堂開始編號。
   化學課正反兩面都是依座號，所以背面接著編 11～20 堂 ——
   兩面都印「1～10」的話，老師雙面印完根本分不出哪一面是哪十堂。 */
function xlHeaderRows(rows, merges, cls, subtitle, sessFrom){
  const from = sessFrom || 1;
  xlFullRow(rows,merges,{v:`${DB.year} 學年度　${clsLabel(cls)}　課堂登記冊（${subtitle}）`,s:1},24);
  xlFullRow(rows,merges,{v:
    `共 ${cls.students.length} 人　｜空白欄打 X＝缺席、U＝病假，「缺席」欄自動統計`+
    (XL.noGroup ? '' : '　｜①② 只在「同一個職位有兩個人」時標示'), s:2},18);
  rows.push(xlRow(XL.cols.map((c,i)=>{
    const isSess = i>=XL.first-1 && i<XL.absent-1;
    return {v: isSess ? String(from + (i-(XL.first-1))) : c.t, s:3};
  }),22));
}

/* 一組之內，哪些人是「同一個職位的兩個人」→ 標 ①②；單獨一人的職位不標。
   刻意不輸出職位名稱，因為職位每輪順時針轉，印在紙上馬上就過期。

   ★ 2026-08-30 修：整組都被標上 ①② 的 bug。
     舊版自己算「anchor = slot / 2」—— 那是**蜂巢**的規則。
     方桌（四人 9 組、六人 6 組）的規則完全不同：
       second = slot >= base、anchor = second ? slot-base : slot
     所以在方桌配置下，slot 0 和 1 會被算成同一個 anchor，
     第 1、2 個人就被標成 ①②，一路標下去整張表都是圈圈。
     而且它連「老師手動指定過的職務」都沒算進去。

     現在一律走 seatRole(tno, idx, slot) —— 跟座位表、計分板、
     報告循環同一個來源。**同一個職位真的出現兩次**才標，
     而且是照 second 標，不是照位置猜。 */
function pairMarks(tno, raw){
  const slots = slotsForSize(Math.max(raw.filter(x=>x!=null).length, LO().base));
  const byRole = {};
  raw.forEach((no,i)=>{
    if(no==null) return;
    const rr = seatRole(tno, i, slots[i] ?? i);
    (byRole[rr.role.key] = byRole[rr.role.key] || []).push({ no, second: !!rr.second });
  });
  const m={};
  Object.keys(byRole).forEach(k=>{
    const arr = byRole[k];
    if(arr.length < 2) return;                     // 這個職位只有一個人 → 不用區分
    /* 兩個人都是「正1」（例如方桌側邊位還沒排滿）時，
       用出現順序當 ①②，總比兩個都不標好 —— 紙本上要分得出誰是誰。 */
    const anySecond = arr.some(x=>x.second);
    arr.forEach((x,i)=>{ m[x.no] = anySecond ? (x.second?'②':'①') : (i===0?'①':'②'); });
  });
  return m;
}
function groupInfo(cls){
  const grpOf={}, markOf={};
  TABLES().forEach(t=>{
    const raw=(cls.seats&&cls.seats[t])||[];
    const marks=pairMarks(t, raw);
    raw.forEach(no=>{ if(no==null) return; grpOf[no]=t; markOf[no]=marks[no]||''; });
  });
  return {grpOf, markOf};
}

/* ---- 一個班 = 一張工作表，剛好兩頁 ----
   分組的課：正面依座號、背面依小組。
   不分組的課（化學）：★ 正反兩面都依座號（使用者 2026-08-30 指定）——
     化學課根本沒有小組，背面印「第 1 組」只是把 36 個人隨機切成六堆，
     點名時反而找不到人。兩面都依座號，差別只在背面接著記第 11～20 堂。
   放在同一張工作表才能直接雙面列印；用手動分頁線切在中間，
   兩段補到一樣長，再配 fitToHeight=2，Excel 就會剛好切成兩頁。 */
function buildClassSheet(cls){
  const noGroup = (COURSES[cls.course] || COURSES[DEF_COURSE]).scoreMode === 'byNo';
  XL = xlLayout(noGroup);                       // ★ 一定要在最前面
  const rows=[], merges=[];
  const {grpOf, markOf}=groupInfo(cls);
  const students=[...cls.students].sort((a,b)=>a.no-b.no);

  /* ===== 第 1 頁　依座號（每 5 個號碼一條粗線） ===== */
  xlHeaderRows(rows,merges,cls, noGroup?'正面：依座號（第 1～10 堂）':'正面：依座號', 1);
  students.forEach((s,i)=>xlStudentRow(rows, i+1, s.no, s.name,
    grpOf[s.no]?('第'+grpOf[s.no]+'組'):'', markOf[s.no]||'',
    (i+1)%5===0));                                   // 第 5、10、15… 列下方加粗
  const page1End=rows.length;

  /* ===== 第 2 頁 ===== */
  const g={rows:[], merges:[]};
  if(noGroup){
    /* 化學：一樣依座號，只是接著記第 11～20 堂 */
    xlHeaderRows(g.rows,g.merges,cls,'背面：依座號（第 11～20 堂）', XL_SESSIONS+1);
    students.forEach((s,i)=>xlStudentRow(g.rows, i+1, s.no, s.name, '', '', (i+1)%5===0));
  }else{
    xlHeaderRows(g.rows,g.merges,cls,'背面：依小組', 1);
    let idx=0;
    TABLES().forEach(t=>{
      /* 直接照「目前座位表」的順序輸出（12 點鐘起順時針），
         所以老師手動調過的位子會原樣反映到紙本上 */
      const raw=(cls.seats&&cls.seats[t])||[];
      const ms=raw.filter(x=>x!=null);
      const marks=pairMarks(t, raw);
      g.rows.push(xlRow([{v:`第 ${t} 組（${ms.length} 人）`,s:7},...xlBlank(XL.n-1,7)],19));
      g.merges.push(`__G${g.rows.length}`);          // 先記相對列號，稍後補上偏移
      raw.forEach(no=>{
        if(no==null) return;
        xlStudentRow(g.rows, ++idx, no, studentName(no)||('座號'+no), '第'+t+'組', marks[no]||'');
      });
    });
  }

  /* 兩段補到一樣長 → fitToHeight=2 會平均切成兩頁，兩頁都塞得下 */
  const half=Math.max(page1End, g.rows.length);
  while(rows.length<half) rows.push(xlRow([],15.75));
  const offset=rows.length;

  g.rows.forEach(r=>rows.push(r));
  const leadEnd=MiniXlsx.colName(XL.lead);
  g.merges.forEach(m=>{
    if(String(m).startsWith('__G')){
      const r=parseInt(String(m).slice(3),10)+offset;
      merges.push(`A${r}:${leadEnd}${r}`);
    }else{
      const mm=String(m).replace(/(\d+)/g,(d)=>String(parseInt(d,10)+offset));
      merges.push(mm);
    }
  });

  /* 缺席欄「0」用極淺灰字，印出來不搶眼；兩頁都要涵蓋 */
  const absCol=MiniXlsx.colName(XL.absent);
  const condFmt=[{sqref:`${absCol}4:${absCol}${rows.length}`}];

  return { name:sheetName(clsLabel(cls)), cols:XL.cols, rows, merges, condFmt,
           rowBreaks:[offset], fitH:2 };
}

function sheetName(s){ return s.replace(/[\\\/\?\*\[\]:]/g,'_').slice(0,31); }

/* ---------------- 11b. 座位表下載（A4 橫向、一頁的 PNG）----------------
   直接畫在 canvas 上，含班級抬頭、六張蜂巢桌、講台。200 dpi 可直接列印。 */
function downloadSeatingPNG(){
  const cls=curClass();
  if(!cls) return alert('請先選擇班級');
  const L=LO(), hex = L.kind==='hex';
  const DPI=200, W=Math.round(297/25.4*DPI), H=Math.round(210/25.4*DPI);   // 2339 × 1654
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const g=cv.getContext('2d');
  const FONT='"Microsoft JhengHei","Noto Sans TC",sans-serif';
  g.fillStyle='#fff'; g.fillRect(0,0,W,H);

  const M=46, TITLE_H=118, PODIUM_H=96;
  /* 抬頭 */
  g.fillStyle='#111'; g.textAlign='center'; g.textBaseline='middle';
  g.font=`bold 52px ${FONT}`;
  g.fillText(`${DB.year} 學年度　${clsLabel(cls)}　座位表`, W/2, M+26);
  g.font=`26px ${FONT}`; g.fillStyle='#555';
  g.fillText(`第 ${DB.round} 輪職位　·　${L.name}　·　日期 ______ / ______　共 ${cls.students.length} 人`,
             W/2, M+78);

  /* 版面：沿用畫面上的幾何，等比縮到可用區域。
     ★ 欄數與一桌的尺寸都要跟著座位配置走 ——
       以前這裡寫死 3 欄與蜂巢尺寸，換成九宮格或方桌就整個跑掉。 */
  const RM = hex ? null : rectMetrics(L);
  const unitW = hex ? UNIT_W : RM.unitW;
  const unitH = hex ? UNIT_H : RM.unitH;
  const cols  = L.perRow || 3;
  const order = tableOrder();
  const rows  = Math.ceil(order.length / cols);

  const areaW=W-M*2, areaH=H-M*2-TITLE_H-PODIUM_H;
  const modelW=unitW*cols+16, modelH=unitH*rows+8;
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

  /* 一格座位的內容（職稱／姓名／座號），兩種配置共用，只是外框形狀不同 */
  const seatText=(x,y,w,h,no,rr,col2,mk)=>{
    const inner=w*0.74;
    const roleTxt=rr.role.name+(mk||'');
    const rf=fit(roleTxt, inner, Math.round(h*0.155), 'bold');
    g.fillStyle=col2; g.font=`bold ${rf}px ${FONT}`;
    g.fillText(roleTxt, x, y-h*0.30);
    const nm=studentName(no)||('座號'+no);
    const nf=fit(nm, inner, Math.round(h*0.28), 'bold');
    g.fillStyle='#111'; g.font=`bold ${nf}px ${FONT}`;
    g.fillText(nm, x, y+h*0.02);
    const sf=Math.round(h*0.15);
    g.fillStyle='#666'; g.font=`${sf}px ${FONT}`;
    g.fillText('座號 '+no, x, y+h*0.27);
  };

  order.forEach((tno,i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const ux=ox+col*unitW*s, uy=oy+row*unitH*s;
    const cx=ux+unitW*s/2, cy=uy+unitH*s/2;
    const raw=(cls.seats&&cls.seats[tno])||[];
    const slots=slotsForSize(Math.max(raw.length, L.base));
    const marks=pairMarks(tno, raw);     // 只有同一職位兩個人時才有 ①②

    /* 組別底色（內縮 2px：3 點鐘的外圈座位剛好貼齊邊界，縮太多會被切到） */
    g.save();
    g.globalAlpha=.10; g.fillStyle=GROUP_TINT[tno];
    g.beginPath(); g.roundRect(ux+2, uy+2, unitW*s-4, unitH*s-4, 26); g.fill();
    g.globalAlpha=1; g.setLineDash([10,7]); g.lineWidth=2;
    g.strokeStyle=GROUP_TINT[tno]; g.stroke(); g.restore();

    if(hex){
      /* 中心桌 */
      const hw=HEX_W*s, hh=HEX_H*s;
      hexPath(cx,cy,hw,hh);
      g.fillStyle='#f2f4f8'; g.fill();
      g.lineWidth=3; g.strokeStyle=GROUP_TINT[tno]; g.stroke();
      g.fillStyle='#8a93a5'; g.textAlign='center'; g.textBaseline='middle';
      g.font=`bold ${Math.round(hh*0.46)}px ${FONT}`;
      g.fillText(String(tno), cx, cy);

      slots.forEach((slot,idx)=>{
        const no=raw[idx]; if(no==null) return;
        const rr=seatRole(tno, idx, slot);
        const R=(rr.second?R2:R1)*s, rad=slot*30*Math.PI/180;
        const x=cx+Math.sin(rad)*R, y=cy-Math.cos(rad)*R;
        const col2=seatRoleColor(tno, idx, slot);
        hexPath(x,y,hw,hh); g.fillStyle=col2; g.fill();
        hexPath(x,y,hw-14*s,hh-14*s); g.fillStyle='#fff'; g.fill();
        seatText(x,y,hw,hh,no,rr,col2,marks[no]);
      });
    }else{
      /* 方桌：桌子是一條橫的長方形，座位在上下兩排，溢出的人坐左右側邊 */
      const tW=RM.innerW*s, tH=RTABLE_H*s;
      const tX=ux+RM.padL*s, tY=uy+(RTOP+RSEAT_H+RGAP)*s;
      g.beginPath(); g.roundRect(tX, tY, tW, tH, 12*s);
      g.fillStyle='#f2f4f8'; g.fill();
      g.lineWidth=3; g.strokeStyle=GROUP_TINT[tno]; g.stroke();
      g.fillStyle='#8a93a5'; g.textAlign='center'; g.textBaseline='middle';
      g.font=`bold ${Math.round(tH*0.6)}px ${FONT}`;
      g.fillText(String(tno), tX+tW/2, tY+tH/2);

      slots.forEach((slot,idx)=>{
        const no=raw[idx]; if(no==null) return;
        const rr=seatRole(tno, idx, slot);
        const p=rectSeatPos(L, slot);
        const w=(p.side?RSIDE_W:RSEAT_W)*s, h=(p.side?RSIDE_H:RSEAT_H)*s;
        const x=ux+p.x*s, y=uy+p.y*s;
        const col2=seatRoleColor(tno, idx, slot);
        g.beginPath(); g.roundRect(x-w/2, y-h/2, w-6*s, h-6*s, 14*s);
        g.fillStyle=col2; g.fill();
        g.beginPath(); g.roundRect(x-w/2+7*s, y-h/2+7*s, w-20*s, h-20*s, 10*s);
        g.fillStyle='#fff'; g.fill();
        seatText(x-3*s, y-3*s, w, h, no, rr, col2, marks[no]);
      });
    }
  });

  /* 講台 */
  const pw=Math.min(760, W*0.42), py=H-M-PODIUM_H/2;
  g.strokeStyle='#444'; g.lineWidth=3; g.setLineDash([]);
  g.beginPath(); g.roundRect(W/2-pw/2, py-38, pw, 76, 14); g.stroke();
  g.fillStyle='#333'; g.textAlign='center'; g.textBaseline='middle';
  g.font=`bold 40px ${FONT}`;
  g.fillText('▲　講　台　▲', W/2, py);

  cv.toBlob(b=>{
    if(!b) return toast('產生圖檔失敗，請再試一次', false);
    dl(b, `${DB.year}_${clsLabel(cls)}_座位表_第${DB.round}輪_${todayStr()}.png`);
    toast('座位表已下載（A4 橫向 200dpi，可直接列印）');
  },'image/png');
}

/* 沒有班級就當場建一個，回傳是否成功 */
function ensureClass(){
  if(curClass()) return true;
  const n=($('#inp-newclass').value.trim())||prompt('請先輸入班級名稱（例如 115 高一忠）','');
  if(!n) return false;
  const id=uid(); DB.classes[id]={id,year:DB.year,name:n,students:[],seats:{},size:6,
      course:DEF_COURSE,layout:DEF_LAYOUT,layouts:{}};
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
  const CS=CO(), rs=ROLESET();
  const h=$('#roles-title'); if(h) h.textContent=CS.title;
  const nt=$('#roles-note'); if(nt) nt.innerHTML=CS.note;
  const dots=['🔴','🟠','🟡','🟢','🔵','🟣'];
  $('#role-cards').innerHTML=rs.map((r,i)=>`
    <div class="role-card" style="border-left-color:var(${r.color})">
      <h4 style="color:var(${r.color})">${dots[i]||'⚪'} ${r.name}</h4>
      <div class="en">${r.en}</div>
      <ul>${r.duty.map(d=>`<li>${d}</li>`).join('')}</ul>
      <div class="say">口頭禪：${r.say}</div>
      <div class="dep">
        <span class="chip" style="background:var(${r.color});color:#fff">${r.name}①　正1</span>
        <span class="chip" style="background:var(${r.light});color:#10131a">${r.name}②　正2</span>
        <div style="margin-top:6px">兩人職責完全相同，<b>各自有一盞燈</b>，都要發言這組才會貫通。</div>
      </div>
    </div>`).join('');
}



/* ---------------- 12c. 慶祝動畫與音效 ----------------
   使用者回報「都一樣，還滿膩的」。一堂課會亮好幾次燈，
   同一個特效放第三次就沒有感覺了 —— 這跟 tools.js 的下課提醒
   要輪替說法是同一個道理。

   做法：六種動畫各配一段音效，每次隨機挑一種，而且不會連續重複。
   音效一律用 Web Audio 即時合成，不依賴音檔 —— 教室電腦常常
   擋外部資源，而且合成的東西不會有版權問題。 */

let _ac=null;
function ac(){
  if(!_ac){ try{ _ac=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
  if(_ac.state==='suspended') _ac.resume();
  return _ac;
}
/* 一個音。type 換波形就換音色：sine 圓潤、triangle 像木琴、square 像電玩 */
function tone(freq, start, dur, vol, type){
  const a=ac(); if(!a) return;
  const t0=a.currentTime+start;
  const o=a.createOscillator(), g=a.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(freq,t0);
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol==null?.22:vol, t0+0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0+dur+0.05);
}
function slide(f1, f2, start, dur, vol, type){
  const a=ac(); if(!a) return;
  const t0=a.currentTime+start;
  const o=a.createOscillator(), g=a.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(f1,t0);
  o.frequency.exponentialRampToValueAtTime(f2, t0+dur);
  g.gain.setValueAtTime(0,t0);
  g.gain.linearRampToValueAtTime(vol==null?.2:vol, t0+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0+dur+0.05);
}
function noiseHit(start, dur, vol){
  const a=ac(); if(!a) return;
  const n=Math.floor(a.sampleRate*dur);
  const buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(); s.buffer=buf;
  const g=a.createGain(); g.gain.value=vol==null?.18:vol;
  const f=a.createBiquadFilter(); f.type='highpass'; f.frequency.value=1200;
  s.connect(f); f.connect(g); g.connect(a.destination);
  s.start(a.currentTime+start);
}

const RB=['#e63946','#f28c28','#e9c716','#2ea86a','#2f7fd8','#6f4bd8','#ffd700'];
function spray(x,y,n,spd,life,size,starRatio){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=Math.random()*spd+2;
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:life,
      c:RB[i%RB.length],s:Math.random()*size+2,star:Math.random()<(starRatio||0.3)});
  }
  runFx();
}

const CELEBRATIONS = [
  /* 1. 彩虹禮炮：正中央一次炸開（原本那個） */
  { name:'彩虹禮炮', run(){
      starBurst();
      [523,659,784,1047].forEach((f,i)=>tone(f,i*0.09,0.5,.2,'triangle'));
  }},
  /* 2. 連環煙火：畫面各處連續炸五發 */
  { name:'連環煙火', run(){
      for(let k=0;k<5;k++){
        const d=k*0.22;
        setTimeout(()=>{
          spray(innerWidth*(0.15+Math.random()*0.7), innerHeight*(0.15+Math.random()*0.45),
                60, 11, 80, 6, 0.35);
        }, d*1000);
        noiseHit(d,0.18,.12);
        slide(300+Math.random()*260, 90, d, 0.32, .16, 'sine');
      }
  }},
  /* 3. 彩帶雨：從畫面上緣灑下來 */
  { name:'彩帶雨', run(){
      for(let i=0;i<180;i++){
        parts.push({x:Math.random()*innerWidth, y:-20-Math.random()*260,
          vx:(Math.random()-.5)*2.2, vy:Math.random()*2+1.2, life:150,
          c:RB[i%RB.length], s:Math.random()*5+3, star:i%4===0});
      }
      runFx();
      [784,880,988,1175].forEach((f,i)=>tone(f,i*0.11,0.9,.14,'sine'));
      for(let i=0;i<6;i++) noiseHit(0.15*i, 0.1, .05);
  }},
  /* 4. 電玩過關：由下往上噴，音效像 8-bit 破關 */
  { name:'過關音效', run(){
      for(let i=0;i<140;i++){
        const a=-Math.PI/2+(Math.random()-.5)*1.1, sp=Math.random()*15+8;
        parts.push({x:innerWidth/2+(Math.random()-.5)*260, y:innerHeight+10,
          vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:110,
          c:RB[i%RB.length], s:Math.random()*6+3, star:i%3===0});
      }
      runFx();
      [392,523,659,784,1047,1319].forEach((f,i)=>tone(f,i*0.075,0.28,.17,'square'));
  }},
  /* 5. 鐘聲齊鳴：兩側對噴，音效像教堂鐘 */
  { name:'鐘聲齊鳴', run(){
      spray(60, innerHeight*0.55, 90, 13, 95, 6, 0.5);
      spray(innerWidth-60, innerHeight*0.55, 90, 13, 95, 6, 0.5);
      [1047,784,1047,1319].forEach((f,i)=>tone(f,i*0.22,1.5,.14,'sine'));
      tone(523,0,2.2,.08,'sine');
  }},
  /* 6. 螺旋上升：粒子繞圈往上，音效滑音上揚 */
  { name:'螺旋上升', run(){
      const cx=innerWidth/2, cy=innerHeight*0.72;
      for(let i=0;i<160;i++){
        const a=i*0.24, r=2+i*0.05;
        parts.push({x:cx+Math.cos(a)*r*6, y:cy+Math.sin(a)*r*2,
          vx:Math.cos(a)*3.2, vy:-Math.random()*7-3, life:120,
          c:RB[i%RB.length], s:Math.random()*5+3, star:i%5===0});
      }
      runFx();
      slide(220, 1400, 0, 1.0, .16, 'triangle');
      [1047,1319,1568].forEach((f,i)=>tone(f,0.85+i*0.1,0.6,.16,'triangle'));
  }}
];

let _lastCeleb=-1;
/* 隨機挑一種，但不連續重複同一種 —— 「不重複」比「隨機」更有感。 */
function celebrate(){
  if(!CELEBRATIONS.length) return;
  let i=Math.floor(Math.random()*CELEBRATIONS.length);
  if(CELEBRATIONS.length>1 && i===_lastCeleb) i=(i+1+Math.floor(Math.random()*(CELEBRATIONS.length-1)))%CELEBRATIONS.length;
  _lastCeleb=i;
  try{ CELEBRATIONS[i].run(); }catch(e){ starBurst(); }
  return CELEBRATIONS[i].name;
}

/* ---------------- 12b. 職位工作推送 ----------------
   老師課前把「這一節每個職位要做什麼」寫好暫存，上課按一下推到投影幕，
   下方列出各組，做完的按一下亮燈。

   幾個刻意的決定：

   ★ 只推到投影幕，不進 Firestore。
     使用者選的就是這個 —— 不需要學生登入、不需要網路、不會有 permission 問題，
     而且投影幕本來就是全班都看得到的地方。要進學生手機是之後的事。

   ★ 沒填工作的職位顯示成灰色，不是隱藏。
     隱藏會讓學生以為「我這個職位這節沒事」；灰色是「這節沒有指定任務，
     但你的職責還在」。使用者明確要求灰色。

   ★ 完成用「亮燈」不是「消滅」。
     消滅會讓做完的組從畫面上消失，失去被看見的獎賞；而且落後的組會越來越孤立
     （「只剩三組沒亮」和「只剩三組還在」的心理感受差很多）。
     亮燈是全班一起把燈點亮，跟既有的「一人一盞燈／彩虹貫通」是同一套語言，
     全部亮完直接放彩虹禮炮。

   ★ 草稿依課程類型分開存。高一六職位和高二四職位的任務內容不一樣，
     共用一份會互相覆蓋。 */

/* ★ 一節課同一個職位可能有好幾件事要做，而且各組進度有快有慢：
   快的組已經在做第三件，慢的組還卡在第一件。
   所以任務不是一份，是 TASK_SETS 份，每一份各自有標題、六職位的內容、
   分數、以及「哪幾組做完了」——**燈是每一件各一排**，
   一眼就看得出誰做到哪裡。共用一排燈的話，慢的組亮了燈，
   老師下一秒就分不出他亮的是第幾件。 */
const TASK_SETS = 3;

/* ★ 2026-08-30：燈從「一組一盞」改成「一個位子一盞」。
   done：{ 組號:true } —— 舊格式，只保留給升級用。
   doneS：{ '組-位子序':true } —— 現行格式，一個人一盞燈，分別計分。

   為什麼要拆到每個人：一件事裡六個職位各有各的工作（記錄長畫表格、
   風控長找反例…），同一組裡做完的人和沒做完的人本來就不一樣。
   一組一盞燈的話，老師只能在「全組都做完了」和「還沒」之間二選一，
   而分數是全組每人一起加 —— 沒做的人照樣拿分，做完的人看在眼裡。
   一個人一盞燈，才跟既有的「一人一盞燈／彩虹貫通」是同一套語言。 */
function newTaskSet(){ return { title:'', items:{}, done:{}, doneS:{}, doneR:{}, pts:1 }; }
/* 燈的鍵：組號-職位。★ 2026-08-30（第六輪）改回這個。

   走過的三版，寫下來免得再繞一次：
     v1 `done[組]`            一組一盞 → 老師分不出六個職位誰做完了
     v2 `doneS[組-位子序]`    一個人一盞、分數只給那一個人
     v3 `doneR[組-職位]`      ← 現在。一個職位對全班六組各一盞，**分數是全組每人加**

   為什麼從 v2 退回來：使用者說「這時候小組是一起完成的」。
   職位工作是分工，但**驗收的單位是這一組** —— 記錄長畫的表格是全組的表格。
   v2 把分數只給那一個人，等於把「分工」誤讀成「各自計分」。

   而且 v2 綁位子序，探究實作切過去時 quad9 的座位是空的（另一份 c.layouts），
   燈就整片消失。**綁職位不綁位子，座位表空的也照樣有燈可以點。**

   ★ 全組加分走 groupApply(..., 'award', ...)，type 不是 'answer'，
     所以**不會**觸發彩虹貫通（使用者明確要求）。 */
function lampKey(tno, idx){ return tno+'-'+idx; }        // v2 舊鍵，只留給升級用
function roleLampKey(tno, roleKey){ return tno+'-'+roleKey; }
/* 燈的鍵：組號-位子序。跟 roleFix 用同一套（綁位子不綁座號），
   兩個人對調位子時，燈跟著「那個位子的工作」走。 */
function lampKey(tno, idx){ return tno+'-'+idx; }

/* 整份草稿（含三件事與目前正在編哪一件） */
function taskDoc(){
  DB.taskDrafts = DB.taskDrafts || {};
  const k = courseKey();
  let d = DB.taskDrafts[k];
  if(!d) d = DB.taskDrafts[k] = { sets:[], active:0 };

  /* 舊格式（單一份任務）就地升級成第 1 件，內容一個字都不動。
     不做這件事的話，老師課前寫好的東西會在改版當下整份消失。 */
  if(!Array.isArray(d.sets)){
    const old = { title:d.title||'', items:d.items||{}, done:d.done||{},
                  pts: d.pts === undefined ? 1 : d.pts };
    d = DB.taskDrafts[k] = { sets:[old], active:0 };
  }
  while(d.sets.length < TASK_SETS) d.sets.push(newTaskSet());
  d.sets.forEach(s=>{
    s.items = s.items || {}; s.done = s.done || {};
    /* 舊格式就地升級。不升級的話，老師課上到一半重整頁面，
       已經亮的燈會整批消失，而分數已經加出去了 —— 熄不掉也對不起來。
         v1 done[組]        → 那一組**每個職位**都算亮著
         v2 doneS[組-位子序] → 查那個位子當時是什麼職位，轉成 doneR */
    if(!s.doneR){
      s.doneR = {};
      const rsAll = ROLESET();
      Object.keys(s.done||{}).forEach(tno=>{
        if(!s.done[tno]) return;
        rsAll.forEach(r=>{ s.doneR[roleLampKey(tno, r.key)] = true; });
      });
      Object.keys(s.doneS||{}).forEach(k=>{
        if(!s.doneS[k]) return;
        const m = String(k).split('-');
        const tno = Number(m[0]), idx = Number(m[1]);
        if(!Number.isFinite(tno) || !Number.isFinite(idx)) return;
        const slots = tableSlots(tno);
        const rr = seatRole(tno, idx, slots[idx] ?? idx);
        s.doneR[roleLampKey(tno, rr.role.key)] = true;
      });
    }
    /* pts 用 undefined 判斷，不能用 `|| 1` —— 那會把老師刻意設的 0 吃掉 */
    if(s.pts === undefined) s.pts = 1;
  });
  if(!(d.active >= 0 && d.active < TASK_SETS)) d.active = 0;
  return d;
}
/* 目前正在編／正在講的那一件。其餘程式碼照舊用 taskStore()。 */
function taskStore(si){
  const d = taskDoc();
  return d.sets[si === undefined ? d.active : si];
}
function taskPts(si){
  const v = Number(taskStore(si).pts);
  return Number.isFinite(v) ? v : 1;
}
/* 有填東西的才算「這一節真的有這一件」 —— 空的那幾件不必推上投影幕 */
function taskSetUsed(si){
  const s = taskStore(si), rs = ROLESET();
  return !!(s.title||'').trim() || rs.some(r=>(s.items[r.key]||'').trim());
}
function usedSetIdx(){
  const list=[];
  for(let i=0;i<TASK_SETS;i++) if(taskSetUsed(i)) list.push(i);
  return list.length ? list : [0];        // 一件都沒填也要有東西可推，否則畫面空白
}

function renderTaskSetTabs(){
  const box=$('#task-set-tabs'); if(!box) return;
  const d=taskDoc(), rs=ROLESET(), TS=TABLES();
  box.innerHTML = d.sets.map((s,i)=>{
    const filled = rs.filter(r=>(s.items[r.key]||'').trim()).length;
    const doneN  = Object.keys(s.doneR||{}).filter(k=>s.doneR[k]).length;
    const name   = (s.title||'').trim();
    return `<button class="ltab${i===d.active?' on':''}" data-tset="${i}">
      第 ${i+1} 件${name?'：'+name.replace(/</g,'&lt;').slice(0,12):''}
      <span class="ltab-hint">${filled?filled+' 職位':'未填'}${doneN?'　💡'+doneN+' 盞':''}</span>
    </button>`;
  }).join('');
  box.querySelectorAll('[data-tset]').forEach(b=>{
    b.onclick=()=>{ taskDoc().active=Number(b.dataset.tset); save(); renderTaskPanel(); };
  });
}

function renderTaskPanel(){
  const box=$('#task-editor'); if(!box) return;
  const t=taskStore(), rs=ROLESET();
  $('#task-course-tag').textContent = CO().name;
  renderTaskSetTabs();
  const ti=$('#task-title');
  if(ti && document.activeElement!==ti) ti.value = t.title||'';
  const tp=$('#task-pts');
  if(tp && document.activeElement!==tp) tp.value = taskPts();

  box.innerHTML = rs.map(r=>`
    <div class="task-row" style="--rc:var(${r.color})">
      <div class="task-role">
        <b>${r.name}</b>
        <small>${r.en}</small>
      </div>
      <textarea class="ctl task-input" data-role="${r.key}" rows="3"
        placeholder="${r.name}這一節要做什麼？留白就是灰色（沒有指定任務）">${
          (t.items[r.key]||'').replace(/</g,'&lt;')}</textarea>
    </div>`).join('');

  box.querySelectorAll('.task-input').forEach(inp=>{
    inp.oninput=()=>{ taskStore().items[inp.dataset.role]=inp.value; save();
                      updateTaskCount(); };
  });
  updateTaskCount();
}
function updateTaskCount(){
  const t=taskStore(), rs=ROLESET();
  const filled=rs.filter(r=>(t.items[r.key]||'').trim()).length;
  const el=$('#task-count');
  if(el) el.textContent = `${filled} / ${rs.length} 個職位已填`;
  renderTaskSetTabs();          // 分頁上的「幾個職位／幾盞燈」要跟著動
}

/* ---- 推上投影幕 ---- */
function pushTaskBoard(){
  const c=curClass();
  if(!c) return alert('請先選擇 / 建立班級');
  const rs=ROLESET();
  const anyFilled = usedSetIdx().some(i=>{
    const s=taskStore(i);
    return rs.some(r=>(s.items[r.key]||'').trim());
  });
  if(!anyFilled && !confirm('三件事都沒有填任何職位的工作，確定要推嗎？\n（推出去會是一整片灰色）')) return;
  buildTaskBoard();
  $('#taskboard').classList.add('show');
  document.body.classList.add('tb-open');
}
function closeTaskBoard(){
  $('#taskboard').classList.remove('show');
  document.body.classList.remove('tb-open');
}

function buildTaskBoard(){
  const d=taskDoc(), rs=ROLESET(), TS=TABLES();
  const c=curClass();                       // 抬頭要印班級名；這裡自己取，不要依賴呼叫端
  const board=$('#taskboard'); if(!board) return;
  const sets=usedSetIdx();
  d.collapsed = d.collapsed || {};

  /* ★ 2026-08-30 改版：一件事就是一個區塊，
     「這一件要做什麼」與「哪幾組做完了」放在同一塊裡，燈就在事情旁邊。

     之前是上面一整片職位卡、下面三排燈 —— 老師要對照「第 2 排的燈是哪一件事」
     得在畫面上下來回看。事情跟它的燈本來就該綁在一起。

     沒填的那幾件不出現（usedSetIdx），老師還可以把做完的那一件收合起來，
     把版面讓給正在進行的那一件。 */
  /* 這一件事有指定工作的職位（都沒填就當成全部職位都要做）。
     沒填的職位不給燈 —— 給了老師就得替「這一節沒事做」的職位也點一下。 */
  const rolesOf = st => {
    const filled = rs.filter(r=>(st.items[r.key]||'').trim());
    return filled.length ? filled : rs;
  };

  const blockFor = si => {
    const st=d.sets[si], per=taskPts(si);
    const rl=rolesOf(st);
    const allN=rl.length*TS.length;
    let litN=0;
    rl.forEach(r=>TS.forEach(tno=>{ if(st.doneR[roleLampKey(tno,r.key)]) litN++; }));
    /* 「幾組完成」＝這一組每一個職位都亮了 */
    const doneN=TS.filter(tno=>rl.every(r=>st.doneR[roleLampKey(tno,r.key)])).length;
    const open = !d.collapsed[si];
    const title=(st.title||'').trim();

    /* 一個職位一列，右邊全班各組各一盞燈。
       六個職位 × 六組 = 36 盞，還要跟另外兩件事共用一個投影幕，所以燈做小。
       ★ 點下去是**全組每人加分**，不是只加那個職位的人 ——
         這一件事是那一組一起完成的（使用者 2026-08-30 指定）。 */
    const lamps = rl.map(r=>{
      const txt=(st.items[r.key]||'').trim();
      const litR=TS.filter(tno=>st.doneR[roleLampKey(tno,r.key)]).length;
      const cells=TS.map(tno=>{
        const on=!!st.doneR[roleLampKey(tno,r.key)];
        return `<button class="tb-cell${on?' on':''}" data-tno="${tno}" data-rk="${r.key}"
          data-si="${si}" style="--gt:${GROUP_TINT[tno]||'#8b93a7'}"
          title="第 ${tno} 組的${r.name}完成了嗎？${
            on?'（再按一次取消，全組退回分數）':'（點一下亮燈，全組每人加分）'}">
          <span class="tb-bulb">${on?'💡':'○'}</span>
          <span class="tb-cell-g">${tno}</span>
        </button>`;
      }).join('');
      return `<div class="tb-rrow${litR===TS.length?' all':''}" style="--rc:var(${r.color})">
        <button class="tb-rall" data-rall="${r.key}" data-si="${si}"
          title="${litR===TS.length?'整列熄燈（全班退回分數）':'全班六組都完成了，一次點亮'}">
          <b>${r.name}</b><small>${litR}/${TS.length} 組</small></button>
        <div class="tb-cells">${cells}</div>
        <div class="tb-rtask">${
          txt ? txt.replace(/</g,'&lt;').replace(/\n/g,'　').slice(0,44)
              : '<span class="tb-notask">這一件沒有指定任務</span>'}</div>
      </div>`;
    }).join('');

    const roleCards = rs.map(r=>{
      const txt=(st.items[r.key]||'').trim();
      return `<div class="tb-role${txt?'':' tb-blank'}" style="--rc:var(${r.color})">
        <div class="tb-role-name">${r.name}</div>
        <div class="tb-role-body">${
          txt ? txt.replace(/</g,'&lt;').replace(/\n/g,'<br>')
              : '這一件沒有指定任務<br><small>你的職責還在，支援同組</small>'}</div>
      </div>`;
    }).join('');

    return `<section class="tb-block${open?'':' folded'}">
      <header class="tb-bhead">
        <button class="tb-fold" data-fold="${si}"
          title="${open?'收起這一件（燈還留著）':'展開這一件'}">${open?'▾':'▸'}</button>
        <b class="tb-bno">第 ${si+1} 件</b>
        <span class="tb-btitle">${title ? title.replace(/</g,'&lt;') : '（未命名）'}</span>
        <span class="tb-bdone"><b data-done="${si}">${doneN}</b>/${TS.length} 組全亮　·
          <b data-lit="${si}">${litN}</b>/${allN} 盞${
          per ? `　·　<b class="tb-pts">全組每人 ${per>0?'+':''}${per} 分</b>` : ''}</span>
      </header>
      <div class="tb-lamps">${lamps}</div>
      ${open ? `<div class="tb-roles" style="--n:${rs.length}">${roleCards}</div>` : ''}
    </section>`;
  };

  board.innerHTML = `
    <div class="tb-inner sets-${sets.length}">
      <div class="tb-head">
        <div>
          <div class="tb-title">${(d.sets[sets[0]].title||'這一節的職位工作').replace(/</g,'&lt;')}</div>
          <div class="tb-sub">${CO().name}　·　${c ? clsLabel(c) : ''}　·
            做完的組請老師點一下，燈就亮起來</div>
        </div>
        <div class="tb-headbtns">
          <button class="tb-mini" id="tb-foldall" title="全部收起／全部展開">⇕ 收合全部</button>
          <button class="tb-close" id="tb-close" title="關閉（Esc）">✕</button>
        </div>
      </div>
      <div class="tb-blocks">${sets.map(blockFor).join('')}</div>
    </div>`;

  board.querySelector('#tb-close').onclick=closeTaskBoard;

  board.querySelectorAll('[data-fold]').forEach(b=>{
    b.onclick=()=>{
      const si=Number(b.dataset.fold);
      const st=taskDoc();
      st.collapsed[si] = !st.collapsed[si];
      save(); buildTaskBoard();
    };
  });

  const fa=board.querySelector('#tb-foldall');
  if(fa) fa.onclick=()=>{
    const st=taskDoc();
    /* 只要還有一件是展開的，就全部收起；全都收著才全部展開 */
    const anyOpen = sets.some(i=>!st.collapsed[i]);
    sets.forEach(i=>{ st.collapsed[i]=anyOpen; });
    save(); buildTaskBoard();
  };

  /* ---- 一盞燈 = 「這一組的這個職位」把這一件事做完了 ----
     ★ 分數是**全組每人加**（groupApply），不是只給那個職位的人 ——
       這一件事是那一組一起完成的。
     ★ type 用 'award' 不是 'answer'：刻意不算成發言，
       所以**不會**觸發彩虹貫通（使用者明確要求）。
     ★ 熄燈對稱退回同樣的分數。老師點錯的機率遠高於「做完又沒做完」，
       不退的話重複切換會愈加愈多，而試算表是真相，事後很難查是哪一筆多的。
     ★ 備註要帶「第幾件 ＋ 職位」：三件事都叫「職位任務完成」的話，
       期末回頭看 Records 分不出這 1 分是哪一件、哪個職位給的。 */
  function lampNote(si, st, roleName, lit){
    const t=(st.title||'').trim().slice(0,20);
    return (lit ? '職位任務完成：' : '職位任務取消：')
      + `第${si+1}件` + (t ? '　'+t : '') + (roleName ? '　'+roleName : '');
  }
  function toggleRoleLamp(si, tno, roleKey, want){
    const st=taskStore(si);
    const k=roleLampKey(tno, roleKey);
    const lit = want===undefined ? !st.doneR[k] : !!want;
    if(!!st.doneR[k] === lit) return false;
    if(lit) st.doneR[k]=true; else delete st.doneR[k];

    const role=ROLESET().find(r=>r.key===roleKey);
    const per=taskPts(si);
    if(per) groupApply(tno, lit?per:-per, 'award',
                       lampNote(si, st, role?role.name:'', lit));
    return true;
  }
  function afterLamp(si, e, tint){
    save(); buildTaskBoard(); renderTaskSetTabs();
    if(e) pop(e.clientX, e.clientY, tint||'#ffd700');
  }

  board.querySelectorAll('.tb-cell').forEach(b=>{
    b.onclick=e=>{
      const tno=Number(b.dataset.tno), si=Number(b.dataset.si), rk=b.dataset.rk;
      const lit=!taskStore(si).doneR[roleLampKey(tno,rk)];
      toggleRoleLamp(si, tno, rk);
      checkTaskAllDone(si);
      afterLamp(si, lit?e:null, GROUP_TINT[tno]);
    };
  });

  /* 整列（同一個職位、全班六組）一次點亮／熄掉。
     全班都做完時一組一組點，投影著等六下，教室就冷掉了。 */
  board.querySelectorAll('[data-rall]').forEach(b=>{
    b.onclick=e=>{
      const rk=b.dataset.rall, si=Number(b.dataset.si);
      const st=taskStore(si), TS2=TABLES();
      const allLit=TS2.every(t=>st.doneR[roleLampKey(t,rk)]);
      const want=!allLit;
      const role=ROLESET().find(r=>r.key===rk);
      if(!want && !confirm(`「${role?role.name:rk}」整列熄燈？\n`
        +'這一件已經加給各組的分數會**全部退回**。')) return;
      TS2.forEach(t=>toggleRoleLamp(si, t, rk, want));
      checkTaskAllDone(si);
      afterLamp(si, want?e:null, '#ffd700');
    };
  });
}

/* 這一件事全班（每一組、每一個有工作的職位）都亮了 → 彩虹禮炮。
   ★ 是「這一件」全班做完才放，不是三件全部 ——
     每做完一件就值得一次，等三件會等到下課。
   ★ 這只是**視覺特效**，不是彩虹貫通，不加分。 */
function checkTaskAllDone(si){
  const st=taskStore(si), rs=ROLESET(), TS=TABLES();
  const filled = rs.filter(r=>(st.items[r.key]||'').trim());
  const rl = filled.length ? filled : rs;
  let all=0, lit=0;
  TS.forEach(tno=>{
    rl.forEach(r=>{ all++; if(st.doneR[roleLampKey(tno,r.key)]) lit++; });
    st.done[tno] = rl.every(r=>!!st.doneR[roleLampKey(tno,r.key)]);
  });
  if(all && lit===all){
    const nm=celebrate();
    toast(`第 ${si+1} 件全班都完成了！🌈　${nm||''}`, true);
  }
}

function resetTaskLamps(){
  const d=taskDoc();
  const lit=d.sets.reduce((n,s)=>n+Object.keys(s.doneR||{}).filter(k=>s.doneR[k]).length, 0);
  if(!lit) return toast('目前沒有亮著的燈');
  /* 這裡刻意「不」退分：熄掉所有燈是「開始下一輪任務」，不是「剛才那些組其實沒做完」。
     已經給出去的分是發生過的事實。要退某一組的分，請單獨點那一盞燈熄掉。
     ★ 三件事一起熄 —— 這顆按鈕的意思是「這一節結束了，下一節重來」。
       只熄目前這一件的話，老師會以為全部熄了，下一節的燈就從別人的進度開始亮。 */
  if(!confirm(`把三件事、所有職位與組別的燈全部熄掉（目前亮著 ${lit} 盞），重新開始？\n\n`
    +'（已經加出去的任務分數會保留。要退回某一組的分，請單獨點那一組的燈熄掉。）')) return;
  d.sets.forEach(s=>{ s.done={}; s.doneS={}; s.doneR={}; }); save();
  renderTaskSetTabs();
  if($('#taskboard').classList.contains('show')) buildTaskBoard();
  toast('燈已全部熄掉');
}

/* ---------------- 13. UI 綁定 ---------------- */
function refreshSelectors(){
  $('#sel-year').innerHTML=DB.years.map(y=>`<option ${y===DB.year?'selected':''}>${y}</option>`).join('');
  const cls=Object.values(DB.classes).filter(c=>c.year===DB.year);
  $('#sel-class').innerHTML=cls.length
    ? cls.map(c=>`<option value="${c.id}" ${c.id===DB.activeClass?'selected':''}>${clsLabel(c)}</option>`).join('')
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
    ? all.map(c=>`<option value="${c.id}" ${c.id===DB.activeClass?'selected':''}>${c.year} · ${clsLabel(c)}</option>`).join('')
    : '<option value="">（尚無班級）</option>';
  $('#sel-moveyear').innerHTML = DB.years.map(y=>`<option value="${y}">${y} 學年度</option>`).join('');

  syncRosterBox();
}
function yearLog(msg){
  const el=$('#year-log'); if(el) el.textContent=`[${new Date().toLocaleTimeString()}] ${msg}`;
  toast(msg);
}
function renderAll(){ refreshSelectors(); renderNewCourseSelect(); renderSeats(); renderScoreboard(); renderRoll(); renderStats(); }

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
  TABLES().forEach(t=>(seats[t]||[]).forEach(x=>{ if(x!=null) seated.push(x); }));
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
    if(t.dataset.panel==='p-task')  renderTaskPanel();
    if(t.dataset.panel==='p-roles') renderRoleCards();
    /* 後加的分頁（cycle.js 等）自己掛進來，
       不要每多一個分頁就回頭改 app.js 這一串 if。 */
    if(typeof window.onPanelShow==='function') window.onPanelShow(t.dataset.panel);
  });

  /* ---- 職位工作推送 ---- */
  const tt=$('#task-title');
  if(tt) tt.oninput=()=>{ taskStore().title=tt.value; save(); };
  const tp=$('#task-pts');
  if(tp) tp.oninput=()=>{
    const v=Number(tp.value);
    taskStore().pts = Number.isFinite(v) ? v : 1;
    save();
    /* 看板開著時要跟著改抬頭，否則老師改了分數但投影幕還寫舊的 */
    if($('#taskboard') && $('#taskboard').classList.contains('show')) buildTaskBoard();
  };
  const bp=$('#btn-task-push');   if(bp) bp.onclick=pushTaskBoard;
  const br=$('#btn-task-reset');  if(br) br.onclick=resetTaskLamps;
  /* Esc 關掉投影看板。用捕獲階段，免得被別的 Esc 處理搶先。 */
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && $('#taskboard') && $('#taskboard').classList.contains('show')){
      e.stopPropagation(); closeTaskBoard();
    }
  }, true);

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
  /* ---- 收合「下方」的說明與設定列：投影時把版面讓給座位表 ----
     ★ 收的不是最上面那條狀態列 —— 學年度／班級／日期／輪次整堂課都在用。 */
  const applyCompact=()=>{
    document.body.classList.toggle('compact', !!DB.compact);
    const b=$('#btn-collapse');
    if(b) b.textContent = DB.compact ? '⌄ 展開說明' : '⌃ 收合下方';
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

  /* ★ 2026-08-30：學年度可以刪掉了（之前只能新增，測試用的 114 一直卡在選單裡）。
     ★ 只有「這個學年度底下一個班級都沒有」時才刪得掉。
       允許連班級一起刪，等於把一整年的分數、點名、座位放在一顆按鈕後面 ——
       誤按一次就沒了，而那是整個系統最不能弄丟的東西。
       真的要刪，請先一個一個刪班級（那裡本來就有自己的確認）。
     ★ 至少要留一個學年度，否則畫面會沒有東西可選。 */
  $('#btn-year-del').onclick=()=>{
    const y=DB.year;
    if(DB.years.length<=1) return alert('至少要留一個學年度。');
    const used=Object.values(DB.classes).filter(c=>c.year===y);
    if(used.length){
      return alert(`「${y}」底下還有 ${used.length} 個班級：\n\n`
        + used.map(c=>'・'+clsLabel(c)).join('\n')
        + `\n\n★ 學年度不會連班級一起刪 —— 那等於把一整年的分數與點名放在一顆按鈕後面。\n`
        + `請先到「⚙️ 名單與雲端」把這些班級一個一個刪掉，再回來刪學年度。`);
    }
    const orphan=DB.records.filter(r=>r.year===y).length;
    if(!confirm(`刪掉學年度「${y}」？\n\n這個學年度底下沒有任何班級`
      + (orphan?`，但還有 ${orphan} 筆沒有班級的舊紀錄（會一起刪掉）`:'')
      + '。\n此動作無法復原。')) return;
    DB.years=DB.years.filter(x=>x!==y);
    DB.records=DB.records.filter(r=>r.year!==y);
    DB.year=DB.years[0];
    save(); renderAll();
    toast(`已刪掉學年度 ${y}，目前是 ${DB.year}`);
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
    const seated=c&&TABLES().some(t=>((c.seats||{})[t]||[]).some(x=>x!=null));
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
  bindImgZoom();

  /* 座位表照片：選檔 ＋ 全域 Ctrl+V（只在座位表分頁、而且是照片模式時收圖） */
  const spf=$('#sp-file');
  if(spf) spf.onchange=e=>{ const f=e.target.files[0]; e.target.value=''; setSeatPhoto(f); };
  document.addEventListener('paste', e=>{
    if(seatMode()!=='photo') return;
    const panel=$('#p-seat');
    if(!panel || !panel.classList.contains('active')) return;
    const it=[...(e.clipboardData?.items||[])].find(i=>/^image\//.test(i.type));
    if(!it) return;
    e.preventDefault(); setSeatPhoto(it.getAsFile());
  });

  $$('#score-view-tabs [data-sv]').forEach(b=>{
    b.onclick=()=>setScoreView(b.dataset.sv);
  });
  $('#btn-do-lottery').onclick=doLottery;
  $('#btn-close-lottery').onclick=()=>$('#modal-lottery').classList.remove('show');

  /* 抽籤兩種模式切換 */
  $$('#lot-mode-tabs .ltab').forEach(b=>{
    b.onclick=()=>{
      const m=b.dataset.lmode;
      $$('#lot-mode-tabs .ltab').forEach(x=>x.classList.toggle('on', x===b));
      $('#lot-group').style.display  = m==='group'  ? '' : 'none';
      $('#lot-number').style.display = m==='number' ? '' : 'none';
      if(m==='number') numLotSyncRange();
    };
  });
  $('#btn-lot-pick').onclick=numLotPick;
  $('#btn-lot-wset').onclick=()=>{
    const n=numLot();
    const no=Number($('#lot-wn').value), t=Number($('#lot-wt').value);
    if(!Number.isFinite(no)||no<1) return toast('請先填要設定的號碼');
    /* 填 0 或 1 就把這一號的權重拿掉 —— 「恢復正常」不該逼老師去別的地方刪 */
    if(!Number.isFinite(t)||t<=1) delete n.w[no]; else n.w[no]=t;
    save(); numLotRender();
    toast(t>1 ? `${no} 號放 ${t} 張籤` : `${no} 號恢復 1 張籤`);
  };
  $('#btn-lot-undo').onclick=()=>{
    const n=numLot();
    if(!n.drawn.length) return toast('還沒抽過');
    const back=n.drawn.pop(); save(); numLotRender();
    $('#lot-num-display').innerHTML='–';
    toast(`已把 ${numLotLabel(back)} 放回籤筒`);
  };
  $('#btn-lot-reset').onclick=()=>{
    const n=numLot();
    if(!n.drawn.length && !Object.keys(n.w).length) return toast('本來就是空的');
    if(!confirm('把已抽名單與所有權重全部清掉，重新開始？')) return;
    n.drawn=[]; n.w={}; save(); numLotRender();
    $('#lot-num-display').innerHTML='–';
  };
  ['#lot-lo','#lot-hi','#lot-norepeat'].forEach(sel=>{
    const el=$(sel); if(!el) return;
    el.onchange=()=>{ const n=numLot();
      n.lo=Number($('#lot-lo').value)||1;
      n.hi=Number($('#lot-hi').value)||n.lo;
      n.norepeat=$('#lot-norepeat').checked; save(); };
  });
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

  $('#btn-cloneclass').onclick=cloneClassForCourse;
  $('#btn-addclass').onclick=()=>{
    const raw=$('#inp-newclass').value.trim(); if(!raw) return alert('請輸入班級名稱');
    /* ★ 課程先讀出來，因為班級名稱要把它掛在後面（見 withCourse 的說明） */
    const nc0=$('#sel-newcourse');
    const ck0=(nc0 && COURSES[nc0.value]) ? nc0.value : DEF_COURSE;
    const n=withCourse(raw, ck0);
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

    /* ★ 課程在「建立班級的當下」就決定。
       建完再切的話，老師很容易把第二門課開在同一個班級上，
       而分數是掛在班級上的 —— 兩門課的分會加在一起，畫面上完全看不出來。 */
    const ck=ck0;

    const id=uid(); DB.classes[id]={id,year:DB.year,name:n,students:[],seats:{},size:6,
      course:ck,layout:COURSES[ck].layout,layouts:{}};
    DB.activeClass=id; $('#inp-newclass').value='';

    if(list.length && !leftover){          // 真的是新貼上的名單 → 一起匯入
      DB.classes[id].students=list; save();
      rosterOwner=id; refreshSelectors(); autofillSeats();
      renderScoreboard(); renderStats();
      return toast(`已新增「${n}」（${COURSES[ck].name}），匯入 ${list.length} 人、自動排入座位`);
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
  /* 本機這份 gas_code.js 的版本戳。改了 gas_code.js 就要同步改這裡，
     否則「測試連線」會一直說線上是舊版。 */
  const GAS_EXPECT='2026-08-30b';
  $('#btn-test').onclick=async()=>{
    try{ const r=await gasPost({action:'ping'});
      if(r.status!=='success'){ logSync('❌ '+r.message); return; }
      logSync('✅ 連線正常，試算表：'+r.sheet);
      /* 舊版沒有 version 欄位，所以「沒回版本」本身就是「跑的是舊版」的證據。 */
      if(!r.version){
        logSync('⚠️ 線上跑的是舊版 GAS（連版本都沒回）。'+
                '請把 gas_code.js 重貼進 Apps Script，再「管理部署作業 → 編輯 → 版本：新版本」。');
      }else if(r.version!==GAS_EXPECT){
        logSync(`⚠️ 線上是 ${r.version}，本機這份是 ${GAS_EXPECT} —— 請重新部署。`);
      }else{
        logSync(`✅ GAS 版本對得上（${r.version}），不用重新部署。`);
      }
      /* ★ 2026-08-30：ping 順便把五張工作表建出來。
         以前「連線成功但試算表裡一張分頁都沒有」看起來就像沒接上 ——
         其實只是還沒有資料，工作表是等到第一次寫入才生的。現在直接回報。 */
      if(r.sheets){
        logSync(`📄 工作表：${r.sheets}`
          + (r.created ? `（這次新建了：${r.created}）` : '（都已存在）'));
      }
      if(r.drive==='no'){
        logSync('⚠️ Drive 還沒授權，作答手繪圖存不進去。'+
                '請到 Apps Script 選函式 `authorizeDrive_` 按執行，依畫面允許一次。');
      }else if(r.drive==='yes'){
        logSync('✅ Drive 已授權，手繪圖可以歸檔。');
      }
    }
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
  $('#btn-lockseat').onclick=toggleSeatLock;

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

  $('#btn-backup').onclick=()=>dl(new Blob([JSON.stringify(Object.assign({},DB,{gasToken:''}),null,2)],{type:'application/json'}),
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
  /* a 必須先掛進 DOM 再 click —— 沒掛進去時有些瀏覽器會靜靜不下載，
     而且完全不報錯，症狀就是「按了沒反應」。 */
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=name;
  a.style.display='none'; document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },3000);
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
