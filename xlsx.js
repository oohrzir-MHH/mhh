/* ==========================================================================
   xlsx.js —— 零相依的最小 .xlsx 產生器（純瀏覽器，不需要任何函式庫）
   只實作本專案需要的功能：多工作表、欄寬、合併儲存格、字型/框線/底色、
   列印設定（A4 直向、縮放成一頁寬）、手動分頁線。
   ========================================================================== */
(function(global){

/* ---------- CRC32 ---------- */
const CRC_TABLE = (()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n;
    for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320 ^ (c>>>1)) : (c>>>1);
    t[n]=c>>>0; }
  return t;
})();
function crc32(buf){
  let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF)>>>0;
}

/* ---------- 只用 store（不壓縮）的 ZIP ---------- */
function zipStore(files){                       // files: [{name, data:Uint8Array}]
  const enc=new TextEncoder(), chunks=[], central=[];
  let offset=0;
  files.forEach(f=>{
    const nameBuf=enc.encode(f.name), crc=crc32(f.data), size=f.data.length;
    const lh=new Uint8Array(30+nameBuf.length), dv=new DataView(lh.buffer);
    dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0x0800,true);
    dv.setUint16(8,0,true); dv.setUint16(10,0,true); dv.setUint16(12,0,true);
    dv.setUint32(14,crc,true); dv.setUint32(18,size,true); dv.setUint32(22,size,true);
    dv.setUint16(26,nameBuf.length,true); dv.setUint16(28,0,true);
    lh.set(nameBuf,30);
    chunks.push(lh, f.data);

    const ch=new Uint8Array(46+nameBuf.length), cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true);
    cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true);
    cv.setUint16(12,0,true); cv.setUint16(14,0,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,size,true); cv.setUint32(24,size,true);
    cv.setUint16(28,nameBuf.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true);
    cv.setUint16(34,0,true); cv.setUint16(36,0,true); cv.setUint32(38,0,true);
    cv.setUint32(42,offset,true);
    ch.set(nameBuf,46);
    central.push(ch);
    offset += lh.length + size;
  });
  let cdSize=0; central.forEach(c=>cdSize+=c.length);
  const end=new Uint8Array(22), ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(8,central.length,true);
  ev.setUint16(10,central.length,true); ev.setUint32(12,cdSize,true); ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

/* ---------- helpers ---------- */
const ENC=new TextEncoder();
const u8 = s=>ENC.encode(s);
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                        .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function colName(n){ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-m-1)/26; } return s; }

/* ---------- 樣式表 ----------
   s 索引對照（cellXfs 順序）：
   0 一般 / 1 大標題 / 2 副標題 / 3 表頭 / 4 置中框線 / 5 靠左框線
   6 空白登記格 / 7 組別標題(底色) / 8 小字說明 / 9 置中框線粗底線
*/
const FONT='微軟正黑體';
function stylesXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="8">
<font><sz val="11"/><name val="${FONT}"/></font>
<font><b/><sz val="18"/><name val="${FONT}"/></font>
<font><sz val="11"/><color rgb="FF555555"/><name val="${FONT}"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="${FONT}"/></font>
<font><b/><sz val="12"/><name val="${FONT}"/></font>
<font><sz val="9"/><color rgb="FF666666"/><name val="${FONT}"/></font>
<font><sz val="10"/><name val="${FONT}"/></font>
<font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="${FONT}"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4F6BA8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF7"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF808080"/></left><right style="thin"><color rgb="FF808080"/></right><top style="thin"><color rgb="FF808080"/></top><bottom style="thin"><color rgb="FF808080"/></bottom><diagonal/></border>
<border><left style="medium"><color rgb="FF404040"/></left><right style="medium"><color rgb="FF404040"/></right><top style="medium"><color rgb="FF404040"/></top><bottom style="medium"><color rgb="FF404040"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FF808080"/></left><right style="thin"><color rgb="FF808080"/></right><top style="thin"><color rgb="FF808080"/></top><bottom style="medium"><color rgb="FF333333"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="7" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="3" xfId="0" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="1">
<dxf><font><color rgb="FFD9D9D9"/></font></dxf>
</dxfs>
</styleSheet>`;
}

/* ---------- 單一工作表 ----------
   sheet = { name, cols:[{w}], rows:[{h, cells:[{v,s,num}]}], merges:['A1:H1'], rowBreaks:[n] }
*/
function sheetXml(sheet){
  const cols = (sheet.cols||[]).map((c,i)=>
    `<col min="${i+1}" max="${i+1}" width="${c.w}" customWidth="1"/>`).join('');
  const rows = (sheet.rows||[]).map((row,ri)=>{
    const r=ri+1;
    const cells=(row.cells||[]).map((cell,ci)=>{
      if(cell==null) return '';
      const ref=colName(ci+1)+r, s=cell.s?` s="${cell.s}"`:'';
      if(cell.v===undefined||cell.v===null||cell.v==='') return `<c r="${ref}"${s}/>`;
      if(cell.f)   return `<c r="${ref}"${s}><f>${esc(cell.v)}</f></c>`;   // 公式（不寫死結果）
      if(cell.num) return `<c r="${ref}"${s}><v>${cell.v}</v></c>`;
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`;
    }).join('');
    const h=row.h?` ht="${row.h}" customHeight="1"`:'';
    return `<row r="${r}"${h}>${cells}</row>`;
  }).join('');
  const merges=(sheet.merges&&sheet.merges.length)
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';
  /* 缺席數 = 0 時字體用極淺灰色，印出來不搶眼；有缺席時維持正常黑字 */
  const condFmt=(sheet.condFmt||[]).map((c,i)=>
    `<conditionalFormatting sqref="${c.sqref}">`+
    `<cfRule type="cellIs" dxfId="0" priority="${i+1}" operator="equal"><formula>0</formula></cfRule>`+
    `</conditionalFormatting>`).join('');
  const brks=(sheet.rowBreaks&&sheet.rowBreaks.length)
    ? `<rowBreaks count="${sheet.rowBreaks.length}" manualBreakCount="${sheet.rowBreaks.length}">`+
      sheet.rowBreaks.map(b=>`<brk id="${b}" max="16383" man="1"/>`).join('')+`</rowBreaks>`
    : '';
  const nRows=(sheet.rows||[]).length, nCols=(sheet.cols||[]).length||1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${colName(nCols)}${Math.max(nRows,1)}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
${cols?`<cols>${cols}</cols>`:''}
<sheetData>${rows}</sheetData>
${merges}
${condFmt}
<printOptions horizontalCentered="1"/>
<pageMargins left="0.28" right="0.17" top="0.3" bottom="0.2" header="0.15" footer="0.15"/>
<pageSetup paperSize="9" orientation="${sheet.landscape?'landscape':'portrait'}" fitToWidth="1" fitToHeight="${sheet.fitH!=null?sheet.fitH:(sheet.onePage?1:0)}"/>
${brks}
</worksheet>`;
}

/* ---------- 組裝活頁簿 ---------- */
function build(sheets){
  const n=sheets.length;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets>
</workbook>`;
  const wbRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}
<Relationship Id="rId${n+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const files=[
    {name:'[Content_Types].xml', data:u8(ct)},
    {name:'_rels/.rels',         data:u8(rels)},
    {name:'xl/workbook.xml',     data:u8(wb)},
    {name:'xl/_rels/workbook.xml.rels', data:u8(wbRels)},
    {name:'xl/styles.xml',       data:u8(stylesXml())}
  ];
  sheets.forEach((s,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`, data:u8(sheetXml(s))}));
  return zipStore(files);
}

global.MiniXlsx = { build, colName };
})(window);
