/* Reliable QR adapter for qrcode-generator 1.4.4 (MIT).
   Keeps the existing MHHQR API used by push.js. */
(function (global) {
'use strict';
function make(text) {
  if (typeof global.qrcode !== 'function') throw new Error('QR 引擎尚未載入');
  const qr = global.qrcode(0, 'M');
  qr.addData(String(text), 'Byte'); qr.make();
  const size = qr.getModuleCount();
  const modules = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => qr.isDark(r, c)));
  return { size, modules };
}
function toCanvas(canvas, text, opt) {
  const o = Object.assign({ scale: 8, margin: 4, dark: '#000', light: '#fff' }, opt || {}), q = make(text);
  const px = (q.size + o.margin * 2) * o.scale; canvas.width = px; canvas.height = px;
  const cx = canvas.getContext('2d'); cx.imageSmoothingEnabled = false;
  cx.fillStyle = o.light; cx.fillRect(0, 0, px, px); cx.fillStyle = o.dark;
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) if (q.modules[r][c]) cx.fillRect((c + o.margin) * o.scale, (r + o.margin) * o.scale, o.scale, o.scale);
  return q;
}
function toSVG(text, opt) {
  const o = Object.assign({ margin: 4, dark: '#000', light: '#fff' }, opt || {}), q = make(text), n = q.size + o.margin * 2;
  let d = '';
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) if (q.modules[r][c]) d += `M${c + o.margin} ${r + o.margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${o.light}"/><path d="${d}" fill="${o.dark}"/></svg>`;
}
global.MHHQR = { make, toCanvas, toSVG };
})(window);