/* ==========================================================================
   qr.js — 自己實作的 QR Code 產生器（不依賴任何外部程式庫）
   MH⋯H ｜ Where Minds Bond @ TNGS

   為什麼不用現成的 CDN 套件：
     1. GitHub Pages 上線後多一個外部相依，CDN 掛了學生就掃不到碼
     2. 教室網路常常擋外部資源
   支援 Model 2、Byte 模式、錯誤更正等級 M、版本 1–10
   （版本 10 可放 216 位元組，我們的網址約 60 位元組，綽綽有餘）
   ========================================================================== */
(function (global) {
'use strict';

/* ---------- GF(256) 伽羅瓦體，Reed-Solomon 用 ---------- */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(function initGF(){
  let x = 1;
  for (let i = 0; i < 255; i++){
    EXP[i] = x; LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;          // 本原多項式
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

/* 產生 n 次的生成多項式 */
function genPoly(n){
  let poly = [1];
  for (let i = 0; i < n; i++){
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++){
      next[j]     ^= gmul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}
/* 對一個區塊算錯誤更正碼 */
function ecc(data, n){
  const g = genPoly(n);
  const res = new Array(n).fill(0);
  for (const d of data){
    const factor = d ^ res[0];
    res.shift(); res.push(0);
    for (let i = 0; i < n; i++) res[i] ^= gmul(g[i + 1], factor);
  }
  return res;
}

/* ---------- 版本表（錯誤更正等級 M，版本 1–10）----------
   每一列：[總碼字, 每區塊的EC碼字, [ [區塊數, 每塊資料碼字], … ] ] */
const VER = {
  1:  [26,  10, [[1, 16]]],
  2:  [44,  16, [[1, 28]]],
  3:  [70,  26, [[1, 44]]],
  4:  [100, 18, [[2, 32]]],
  5:  [134, 24, [[2, 43]]],
  6:  [172, 16, [[4, 27]]],
  7:  [196, 18, [[4, 31]]],
  8:  [242, 22, [[2, 38], [2, 39]]],
  9:  [292, 22, [[3, 36], [2, 37]]],
  10: [346, 26, [[4, 43], [1, 44]]]
};
const ALIGN = {
  1: [], 2: [6,18], 3: [6,22], 4: [6,26], 5: [6,30],
  6: [6,34], 7: [6,22,38], 8: [6,24,42], 9: [6,26,46], 10: [6,28,50]
};
/* 格式資訊（等級 M，遮罩 0–7），15 位元 */
const FORMAT_M = [0x5412,0x5125,0x5E7C,0x5B4B,0x45F9,0x40CE,0x4F97,0x4AA0];
/* 版本資訊（版本 7 以上才有），18 位元 */
const VERINFO = { 7:0x07C94, 8:0x085BC, 9:0x09A99, 10:0x0A4D3 };

const dataCap = v => VER[v][2].reduce((s, [n, k]) => s + n * k, 0);

/* ---------- 資料編碼 ---------- */
function encode(bytes, version){
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };

  put(0b0100, 4);                                   // Byte 模式
  put(bytes.length, version <= 9 ? 8 : 16);         // 字元數
  bytes.forEach(b => put(b, 8));

  const cap = dataCap(version) * 8;
  if (bits.length > cap) throw new Error('資料超過版本容量');
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);   // 終止符
  while (bits.length % 8) bits.push(0);                            // 補到整位元組

  const words = [];
  for (let i = 0; i < bits.length; i += 8){
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    words.push(b);
  }
  const PAD = [0xEC, 0x11];
  for (let i = 0; words.length < dataCap(version); i++) words.push(PAD[i % 2]);
  return words;
}

/* 分塊、算 EC、交錯 */
function interleave(words, version){
  const [, ecLen, groups] = VER[version];
  const blocks = [];
  let p = 0;
  groups.forEach(([count, size]) => {
    for (let i = 0; i < count; i++){
      const d = words.slice(p, p + size); p += size;
      blocks.push({ d, e: ecc(d, ecLen) });
    }
  });
  const out = [];
  const maxD = Math.max(...blocks.map(b => b.d.length));
  for (let i = 0; i < maxD; i++)
    blocks.forEach(b => { if (i < b.d.length) out.push(b.d[i]); });
  for (let i = 0; i < ecLen; i++)
    blocks.forEach(b => out.push(b.e[i]));
  return out;
}

/* ---------- 矩陣 ---------- */
function buildMatrix(version, words){
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, v) => { m[r][c] = v ? 1 : 0; fixed[r][c] = true; };

  /* 定位圖案 ＋ 分隔線 */
  const finder = (R, C) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++){
      const rr = R + r, cc = C + c;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                 (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                 (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      set(rr, cc, on);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

  /* 校正圖案 */
  const ap = ALIGN[version];
  ap.forEach(r => ap.forEach(c => {
    if ((r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8)) return;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
      set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }));

  /* 時序圖案 */
  for (let i = 8; i < size - 8; i++){ set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  /* 固定的黑點 */
  set(size - 8, 8, true);

  /* 保留格式資訊區 */
  for (let i = 0; i < 9; i++){
    if (!fixed[8][i]) set(8, i, false);
    if (!fixed[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++){
    if (!fixed[8][size - 1 - i]) set(8, size - 1 - i, false);
    if (!fixed[size - 1 - i][8]) set(size - 1 - i, 8, false);
  }
  /* 保留版本資訊區 */
  if (version >= 7){
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++){
      set(size - 11 + j, i, false); set(i, size - 11 + j, false);
    }
  }

  /* 放資料（右下角起，Z 字型，跳過第 6 欄） */
  let bitIdx = 0, dir = -1, row = size - 1;
  const bitAt = i => (i >> 3) < words.length ? (words[i >> 3] >> (7 - (i & 7))) & 1 : 0;
  for (let col = size - 1; col > 0; col -= 2){
    if (col === 6) col--;
    for (;;){
      for (let k = 0; k < 2; k++){
        const c = col - k;
        if (!fixed[row][c]){ m[row][c] = bitAt(bitIdx++); }
      }
      row += dir;
      if (row < 0 || row >= size){ row -= dir; dir = -dir; break; }
    }
  }
  return { m, fixed, size };
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0,
  (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0
];

/* 遮罩懲罰分數（規則 1–4），分數越低越好 */
function penalty(m, size){
  let p = 0;
  const run = line => {
    let n = 1;
    for (let i = 1; i < size; i++){
      if (line[i] === line[i - 1]) n++;
      else { if (n >= 5) p += n - 2; n = 1; }
    }
    if (n >= 5) p += n - 2;
  };
  for (let i = 0; i < size; i++){
    run(m[i]);
    run(m.map(r => r[i]));
  }
  for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++){
    const v = m[r][c];
    if (v === m[r][c+1] && v === m[r+1][c] && v === m[r+1][c+1]) p += 3;
  }
  const PAT = [1,0,1,1,1,0,1,0,0,0,0];
  const hasPat = (arr, i) => PAT.every((v, k) => arr[i + k] === v);
  for (let r = 0; r < size; r++){
    const rowArr = m[r], colArr = m.map(x => x[r]);
    for (let c = 0; c + 11 <= size; c++){
      if (hasPat(rowArr, c)) p += 40;
      if (hasPat(colArr, c)) p += 40;
    }
  }
  let dark = 0;
  m.forEach(r => r.forEach(v => { if (v) dark++; }));
  p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
  return p;
}

function applyFormat(m, size, mask){
  const bits = FORMAT_M[mask];
  const bit = i => (bits >> i) & 1;
  for (let i = 0; i <= 5; i++)  m[8][i] = bit(14 - i);
  m[8][7] = bit(8); m[8][8] = bit(7); m[7][8] = bit(6);
  for (let i = 9; i <= 14; i++) m[14 - i][8] = bit(14 - i);
  /* 第二份副本：位元 0–6 在第 8 欄（由下往上），位元 7–14 在第 8 列（右段）。
     切點必須是 6/7 而不是 7/8 —— (size-8, 8) 是固定黑點，不放格式位元。
     切錯的話第 7 位會整個遺失，掃描器讀不到格式資訊就直接放棄。 */
  for (let i = 0; i <= 6; i++)  m[size - 1 - i][8] = bit(i);
  for (let i = 7; i <= 14; i++) m[8][size - 15 + i] = bit(i);
  m[size - 8][8] = 1;
}
function applyVersion(m, size, version){
  const v = VERINFO[version]; if (!v) return;
  for (let i = 0; i < 18; i++){
    const b = (v >> i) & 1, r = Math.floor(i / 3), c = i % 3;
    m[size - 11 + c][r] = b;
    m[r][size - 11 + c] = b;
  }
}

/* ---------- 對外：產生模組矩陣 ---------- */
function make(text){
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let version = 0;
  for (let v = 1; v <= 10; v++){
    const head = 4 + (v <= 9 ? 8 : 16);
    if (bytes.length * 8 + head <= dataCap(v) * 8){ version = v; break; }
  }
  if (!version) throw new Error('內容太長（超過版本 10 的容量）');

  const words = interleave(encode(bytes, version), version);
  const { m, fixed, size } = buildMatrix(version, words);

  let best = null;
  for (let k = 0; k < 8; k++){
    const t = m.map(r => r.slice());
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++)
      if (!fixed[r][c] && MASKS[k](r, c)) t[r][c] ^= 1;
    applyFormat(t, size, k);
    applyVersion(t, size, version);
    const p = penalty(t, size);
    if (!best || p < best.p) best = { p, t, k };
  }
  return { size, modules: best.t, version, mask: best.k };
}

/* ---------- 對外：畫到 canvas ---------- */
function toCanvas(canvas, text, opt){
  const o = Object.assign({ scale: 8, margin: 4, dark: '#000', light: '#fff' }, opt || {});
  const q = make(text);
  const px = (q.size + o.margin * 2) * o.scale;
  canvas.width = px; canvas.height = px;
  const cx = canvas.getContext('2d');
  cx.fillStyle = o.light; cx.fillRect(0, 0, px, px);
  cx.fillStyle = o.dark;
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++)
    if (q.modules[r][c])
      cx.fillRect((c + o.margin) * o.scale, (r + o.margin) * o.scale, o.scale, o.scale);
  return q;
}

/* ---------- 對外：輸出 SVG（列印用，無限放大不失真） ---------- */
function toSVG(text, opt){
  const o = Object.assign({ margin: 4, dark: '#000', light: '#fff' }, opt || {});
  const q = make(text);
  const n = q.size + o.margin * 2;
  let d = '';
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++)
    if (q.modules[r][c]) d += `M${c + o.margin} ${r + o.margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">`+
         `<rect width="${n}" height="${n}" fill="${o.light}"/>`+
         `<path d="${d}" fill="${o.dark}"/></svg>`;
}

global.MHHQR = { make, toCanvas, toSVG };
})(window);
