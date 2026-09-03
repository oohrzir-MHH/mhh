/* seat-student-view.js — 學生視角（整張座位表轉 180°）
 *
 * 設計原則：不改 app.js。
 *
 * 為什麼不是直接轉 #classroom：
 *   #classroom 自己被 applyZoom() 用 inline style.transform='scale(s)'
 *   控制縮放，且 style.css 給它 transform-origin:top left。inline style
 *   是整條 transform 一次覆寫，不是疊加，沒辦法「再加一個 rotate」上去
 *   而不被下一次 applyZoom() 洗掉；且 top-left 原點的縮放要疊上 180°
 *   旋轉，數學上得跟著 s 動態換算原點，很脆弱。
 *
 * 為什麼不是直接轉 .classroom-scroll：
 *   試過——幾何上「繞自己中心點對稱」完全正確，但 .classroom-scroll
 *   在 style.css 裡沒設寬度，外層版面給多寬就多寬，不保證等於縮放後
 *   內容的實際寬度。繞一個「不一定貼合內容」的框轉，內容可能被甩位置。
 *
 * 採用的做法：在 #classroom 外面自己包一層 wrapper（只包一次，
 * renderSeats() 只清空 #classroom 的 innerHTML，不動它的父層，包一次
 * 就一直都在）。每當 #classroom 或 .classroom-scroll 的 style 有變化
 * （不管是縮放滑桿、視窗 resize、列印、或任何我們沒預料到的原因—— 用
 * MutationObserver 直接看 style 屬性，不去猜「誰會呼叫 applyZoom」，
 * 因為 app.js 有些地方是先把 applyZoom 存成參照再用
 * （例如 setTimeout(applyZoom,120)），事後覆寫 window.applyZoom
 * 不保證攔得到每一種呼叫方式），我們就把這層 wrapper 的尺寸重新貼齊
 * 「縮放後的實際可視大小」（寬＝dataset.cw × s，高＝app.js 剛寫進
 * .classroom-scroll 的 height 減掉它自己加的 10px），再對 wrapper 做
 * rotate(180deg)（繞自己中心，不用換算原點）。尺寸貼合內容，繞中心轉
 * 180° 就是「整組座位表原地翻轉」，不會跳位置，也不管 app.js 用什麼
 * 方式觸發縮放。
 *
 * 旋轉 180° 等同於：col→cols-1-col、row→rows-1-row、
 * 蜂巢 rad→rad+π、方桌格內 (x,y)→(unitW-x, unitH-y)。
 * 交給瀏覽器算，不是我們自己算。
 *
 * 另外一個容易漏掉的地方：.seat-x／.seat-minus／.unit-add 這些小按鈕
 * 是用「單邊角落」定位（例如 seat-minus 是 right:5%;bottom:8%）。
 * 整組旋轉 180° 之後，它們在畫面上的角落會跟著對調（右下角變左上角），
 * 而職位/姓名/座號文字是「置中」的內容，翻不翻都還是在正中間——
 * 兩者組合起來，按鈕會從「不擋文字的角落」移動到「貼近文字的角落」，
 * 實測在真實座位尺寸下 . seat-minus 會咬到 .s-role 的邊角。
 * 解法：學生視角時把這些按鈕的錨點也對調（right↔left、bottom↔top），
 * 這樣經過整體 180° 旋轉之後，它們在螢幕上又落回原本那個「不擋字」
 * 的視覺角落。
 */
(function () {
  'use strict';

  var CLS = 'mhh-student-view';
  var KEY = 'mhh_student_view_v1';
  var FLIP_ID = 'mhh-seat-flip';

  /* ---------- 樣式 ---------- */
  var CSS = [
    '#' + FLIP_ID + '{overflow:hidden;transition:transform .35s ease;}',
    'body.' + CLS + ' #' + FLIP_ID + '{transform:rotate(180deg);}',

    /* 文字保持正的：置中內容整塊轉回來，位置不變、方向回正。 */
    'body.' + CLS + ' #' + FLIP_ID + ' .s-in,',
    'body.' + CLS + ' #' + FLIP_ID + ' .unit-label,',
    'body.' + CLS + ' #' + FLIP_ID + ' .hexwrap b,',
    'body.' + CLS + ' #' + FLIP_ID + ' .tablewrap b{',
    '  transform:rotate(180deg);',
    '}',

    /* 角落按鈕：文字轉正 ＋ 錨點對調，翻轉後落回原本視覺角落，
       不會跑去貼著置中的文字。 */
    'body.' + CLS + ' #' + FLIP_ID + ' .seat-minus{',
    '  transform:rotate(180deg);',
    '  right:auto; bottom:auto; left:5%; top:8%;',
    '}',
    'body.' + CLS + ' #' + FLIP_ID + ' .seat-x{',
    '  transform:rotate(180deg) translateX(50%);',
    '  top:auto; bottom:14%; left:50%;',
    '}',
    'body.' + CLS + ' #' + FLIP_ID + ' .unit-add{',
    '  transform:rotate(180deg);',
    '  right:auto; top:auto; left:14px; bottom:10px;',
    '}',

    /* 匯入的座位照片：整張圖跟著轉，圖裡的字沒辦法回正——這是預期的，
       照片本來就是老師視角拍的，學生看的時候整張倒過來才對得上真實座位。 */

    /* 講台畫在上方 */
    'body.' + CLS + ' .podium.mhh-podium-top{ margin:0 0 10px; }',

    '#btn-student-view.on{ background:#4f8cff; color:#fff; }'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('mhh-student-view-css')) return;
    var st = document.createElement('style');
    st.id = 'mhh-student-view-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- 包 wrapper ---------- */
  function ensureFlipWrapper() {
    var wrap = document.getElementById('classroom');
    if (!wrap || !wrap.parentNode) return null;
    var flip = document.getElementById(FLIP_ID);
    if (flip && flip.contains(wrap)) return flip;
    flip = document.createElement('div');
    flip.id = FLIP_ID;
    wrap.parentNode.insertBefore(flip, wrap);
    flip.appendChild(wrap);
    return flip;
  }

  /* 把 wrapper 尺寸貼齊縮放後的實際大小。直接讀 app.js 剛算好、
     已經寫進 DOM 的值（wrap.style.transform 的 scale、
     wrap.dataset.cw、.classroom-scroll 的 height），不自己重新推算
     公式——這樣 app.js 以後改縮放邏輯，我們也不用跟著改。 */
  function syncFlipSize() {
    var wrap = document.getElementById('classroom');
    var box = document.querySelector('.classroom-scroll');
    var flip = ensureFlipWrapper();
    if (!wrap || !box || !flip) return;

    var m = /scale\(([\d.]+)\)/.exec(wrap.style.transform || '');
    var s = m ? parseFloat(m[1]) : 1;
    var cw = parseFloat(wrap.dataset.cw);
    if (!cw) cw = wrap.getBoundingClientRect().width / (s || 1);

    var scaledW = cw * s;
    var boxH = parseFloat(box.style.height);
    var scaledH = (boxH ? boxH - 10 : 0) || wrap.getBoundingClientRect().height;

    if (scaledW > 0) flip.style.width = scaledW + 'px';
    if (scaledH > 0) flip.style.height = scaledH + 'px';
  }

  /* 用 MutationObserver 直接看 app.js 寫進 DOM 的結果（style 屬性），
     不去猜「哪些地方呼叫了 applyZoom」——resize、縮放滑桿、鎖定/解鎖、
     列印前後、重新渲染座位，任何一種都會改到這兩個元素的 style，
     一律觸發重算，不會因為 app.js 內部用什麼方式呼叫而漏掉。
     （曾經試過改成直接 monkey-patch window.applyZoom，但 app.js 有
     些地方是先把函式參照存起來再用，事後覆寫全域名稱攔不到，
     所以改成觀察結果而不是攔截呼叫。） */
  var observer = null;
  function ensureObserver() {
    if (observer) return;
    if (typeof MutationObserver === 'undefined') return;
    observer = new MutationObserver(function () { syncFlipSize(); });
    var wrap = document.getElementById('classroom');
    var box = document.querySelector('.classroom-scroll');
    if (wrap) observer.observe(wrap, { attributes: true, attributeFilter: ['style'] });
    if (box) observer.observe(box, { attributes: true, attributeFilter: ['style'] });
  }

  /* ---------- 講台搬家 ---------- */
  function movePodium(on) {
    var podium = document.querySelector('.podium');
    var flip = document.getElementById(FLIP_ID);
    if (!podium || !flip || !flip.parentNode) return;

    if (on) {
      if (podium.nextElementSibling !== flip) {
        flip.parentNode.insertBefore(podium, flip);
      }
      podium.classList.add('mhh-podium-top');
    } else {
      if (podium.previousElementSibling !== flip) {
        if (flip.nextSibling) flip.parentNode.insertBefore(podium, flip.nextSibling);
        else flip.parentNode.appendChild(podium);
      }
      podium.classList.remove('mhh-podium-top');
    }
  }

  /* ---------- 開關 ---------- */
  function isOn() {
    return document.body.classList.contains(CLS);
  }

  function setOn(on) {
    on = !!on;
    ensureFlipWrapper();
    ensureObserver();
    document.body.classList.toggle(CLS, on);
    movePodium(on);

    var btn = document.getElementById('btn-student-view');
    if (btn) {
      btn.classList.toggle('on', on);
      btn.textContent = on ? '🙃 學生視角（開）' : '🙃 學生視角';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    try { sessionStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}

    syncFlipSize();

    if (on && typeof toast === 'function') {
      toast('學生視角：整張轉 180°，投影幕上學生看到的就是自己的方向');
    }
  }

  function toggle() { setOn(!isOn()); }

  /* ---------- 按鈕 ---------- */
  function mountButton() {
    if (document.getElementById('btn-student-view')) return true;
    var anchor = document.getElementById('btn-lockseat');
    if (!anchor || !anchor.parentNode) return false;

    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.id = 'btn-student-view';
    btn.type = 'button';
    btn.textContent = '🙃 學生視角';
    btn.title = '整張座位表轉 180°，變成學生從台下看過來的方向。\n'
              + '投影到布幕上時用這個，學生才不用自己在腦袋裡轉。\n'
              + '文字會保持正的，講台會畫在上方。';
    btn.setAttribute('aria-pressed', 'false');
    btn.onclick = function (e) { e.preventDefault(); toggle(); };

    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    return true;
  }

  /* ---------- 啟動 ---------- */
  function boot() {
    injectCss();
    var tries = 0;
    var t = setInterval(function () {
      var mounted = mountButton();
      var wrapReady = !!ensureFlipWrapper();
      if (wrapReady) ensureObserver();
      if ((mounted && wrapReady) || ++tries > 60) clearInterval(t);
    }, 120);

    var saved = null;
    try { saved = sessionStorage.getItem(KEY); } catch (e) {}
    if (saved === '1') {
      var t2 = setInterval(function () {
        if (document.getElementById('classroom')) {
          clearInterval(t2);
          setOn(true);
        }
      }, 120);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.mhhStudentView = setOn;
  window.mhhStudentViewToggle = toggle;
})();
