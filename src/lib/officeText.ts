// [TASK 56] قارئ مستندات أوفيس على الكلاينت — Word / Excel / PowerPoint / CSV
// ============================================================================
// المشكلة: Gemini API مش بيدعم أنواع MIME بتاعة أوفيس (docx/xlsx/pptx) في
// fileData — فالطالب لما يرفع مستند Word أو شيت Excel كان الطلب بيقع.
// الحل: ملفات أوفيس الحديثة (OOXML) هي أصلًا ZIP فيه XML — بنفك الضغط محليًا
// على جهاز المستخدم بـ DecompressionStream (موجود في كل المتصفحات الحديثة)
// وبنستخرج النص بدون أي مكتبة خارجية، والنص بيتبعت للموديل كرسالة عادية.
// الصيغ القديمة (.doc/.xls/.ppt — صيغة OLE الثنائية) بنستخرج منها نص تقريبي
// بbest-effort، وCSV بيتقري كنص عادي.

export type OfficeKind = 'docx' | 'xlsx' | 'pptx' | 'csv' | 'legacy';

export interface OfficeExtraction {
  kind: OfficeKind;
  text: string;
  warning?: string;
}

const MAX_TOTAL_CHARS = 240000; // سقف النص النهائي المبعوت للموديل
const MAX_CELL_CHARS = 5000; // سقف نص الخلية الواحدة في Excel
const MAX_SHEET_ROWS = 500; // سقف صفوف الورقة الواحدة

const utf8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
const latinDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('windows-1252') : null;

// ---------- أنواع الملفات ----------

export function officeKindFromName(name: string, mime?: string): OfficeKind | null {
  const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)\s*$/);
  const ext = m ? m[1] : '';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx' || ext === 'xlsm') return 'xlsx';
  if (ext === 'pptx') return 'pptx';
  if (ext === 'csv') return 'csv';
  if (ext === 'doc' || ext === 'xls' || ext === 'ppt') return 'legacy';
  // احتياط لو الامتداد مش موجود — نجرب من نوع MIME
  const mt = mime || '';
  if (mt.includes('wordprocessingml')) return 'docx';
  if (mt.includes('spreadsheetml')) return 'xlsx';
  if (mt.includes('presentationml')) return 'pptx';
  if (mt === 'application/msword' || mt === 'application/vnd.ms-excel' || mt === 'application/vnd.ms-powerpoint') return 'legacy';
  if (mt === 'text/csv' || mt === 'application/csv') return 'csv';
  return null;
}

const KIND_LABEL_AR: Record<OfficeKind, string> = {
  docx: 'مستند Word',
  xlsx: 'جدول Excel',
  pptx: 'عرض PowerPoint',
  csv: 'ملف CSV',
  legacy: 'مستند أوفيس'
};

export function wrapOfficeAttachmentText(text: string, name: string, note?: string): string {
  const kind = officeKindFromName(name) || 'legacy';
  const head = `[📄 ${KIND_LABEL_AR[kind]} مرفق: ${name}]\n`;
  const tail = note ? `\n(${note})\n` : '\n';
  return `${head}\n${text}\n${tail}[نهاية محتوى الملف]`;
}

// ---------- أدوات XML ----------

function safeFromCode(c: number): string {
  return c > 0 && c < 0x110000 && !(c >= 0xD800 && c <= 0xDFFF) ? String.fromCodePoint(c) : '';
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => safeFromCode(parseInt(n, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); // &amp; آخر واحد عشان &amp;lt; تطلع &lt; صح
}

function cleanText(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
}

// ---------- قارئ ZIP مصغّر (Central Directory + deflate-raw) ----------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('NO_DECOMPRESSION_STREAM');
  }
  const ds = new DecompressionStream('deflate-raw');
  const blob = new Blob([data as unknown as BlobPart]);
  const out = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(out);
}

async function readZipFiles(buf: ArrayBuffer, want: (name: string) => boolean): Promise<Map<string, Uint8Array>> {
  const d = new Uint8Array(buf);
  const u16 = (o: number) => d[o] | (d[o + 1] << 8);
  const u32 = (o: number) => (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | d[o + 3] * 0x1000000) >>> 0;

  // EOCD: بنلاقي توقيع نهاية الأرشيف في آخر 64 كيلو
  const scanFrom = Math.max(0, d.length - 66000);
  let eocd = -1;
  for (let i = d.length - 22; i >= scanFrom; i--) {
    if (d[i] === 0x50 && d[i + 1] === 0x4b && d[i + 2] === 0x05 && d[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('NOT_A_ZIP');

  let off = u32(eocd + 16);
  const cdEnd = Math.min(d.length, off + u32(eocd + 12));
  let remaining = u16(eocd + 10) || 4096;

  const out = new Map<string, Uint8Array>();
  while (off + 46 <= cdEnd && remaining-- > 0) {
    if (!(d[off] === 0x50 && d[off + 1] === 0x4b && d[off + 2] === 0x01 && d[off + 3] === 0x02)) break;
    const method = u16(off + 10);
    const csize = u32(off + 20);
    const nameLen = u16(off + 28);
    const extraLen = u16(off + 30);
    const commentLen = u16(off + 32);
    const lho = u32(off + 42);
    const nameBytes = d.subarray(off + 46, off + 46 + nameLen);
    const name = latinDecoder ? latinDecoder.decode(nameBytes) : String.fromCharCode(...Array.from(nameBytes));
    off += 46 + nameLen + extraLen + commentLen;

    if (!want(name) || out.has(name)) continue;

    const nl = u16(lho + 26);
    const el = u16(lho + 28);
    const start = lho + 30 + nl + el;
    if (start < 0 || start + csize > d.length) continue;
    const raw = d.subarray(start, start + csize);

    try {
      if (method === 0) {
        out.set(name, raw);
      } else if (method === 8) {
        out.set(name, await inflateRaw(raw));
      }
    } catch {
      // مدخل تالف — نتجاهله ونكمل
    }
  }
  return out;
}

function zipText(entries: Map<string, Uint8Array>, name: string): string | null {
  const data = entries.get(name);
  if (!data || !utf8Decoder) return null;
  return utf8Decoder.decode(data);
}

// ---------- DOCX ----------

function docxToText(xml: string): string {
  let s = xml
    .replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, '')
    .replace(/<w:delText[\s\S]*?<\/w:delText>/g, '')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<w:cr\b[^>]*\/?>/g, '\n')
    // خلايا الجداول قبل فقراتها — عشان نهاية الفقرة جوه الخلية متولّدش سطر فاضي
    .replace(/<\/w:p>\s*<\/w:tc>/g, '\t')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n');
  s = s.replace(/<[^>]+>/g, ''); // النص داخل w:t بيفضل بعد شيل الوسوم
  return cleanText(decodeXmlEntities(s));
}

// ---------- XLSX ----------

function colToIndex(ref: string): number {
  let n = 0;
  let ok = false;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) { n = n * 26 + (c - 64); ok = true; }
    else if (c >= 97 && c <= 122) { n = n * 26 + (c - 96); ok = true; }
    else break;
  }
  return ok ? n - 1 : -1;
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>|<si\s*\/>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    if (!m[1]) { out.push(''); continue; }
    let v = '';
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g;
    let t;
    while ((t = tRe.exec(m[1]))) v += t[1] || '';
    out.push(decodeXmlEntities(v));
  }
  return out;
}

// خريطة أنماط التاريخ: numFmtId -> 'date' | 'datetime' | 'time'
function detectDateFormats(stylesXml: string | null): Map<number, 'date' | 'datetime' | 'time'> {
  const map = new Map<number, 'date' | 'datetime' | 'time'>();
  const builtin: Array<[number, 'date' | 'datetime' | 'time']> = [
    [14, 'date'], [15, 'date'], [16, 'date'], [17, 'date'],
    [18, 'time'], [19, 'time'], [20, 'time'], [21, 'time'],
    [22, 'datetime'], [45, 'time'], [46, 'time'], [47, 'time']
  ];
  builtin.forEach(([id, k]) => map.set(id, k));
  if (!stylesXml) return map;

  const nfRe = /<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"[^>]*\/?>/g;
  let m;
  while ((m = nfRe.exec(stylesXml))) {
    const id = parseInt(m[1], 10);
    if (map.has(id)) continue;
    let code = '';
    try { code = decodeXmlEntities(m[2]); } catch { continue; }
    const stripped = code.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"/g, '').replace(/\\./g, '');
    const hasDate = /[yYdD]/.test(stripped);
    const hasTime = /[hHsS]/.test(stripped);
    if (hasDate && hasTime) map.set(id, 'datetime');
    else if (hasDate) map.set(id, 'date');
    else if (hasTime && code.includes(':')) map.set(id, 'time');
  }
  return map;
}

function xfNumFmtIds(stylesXml: string | null): number[] {
  if (!stylesXml) return [];
  const block = stylesXml.match(/<cellXfs[\s\S]*?<\/cellXfs>/);
  if (!block) return [];
  const ids: number[] = [];
  const xfRe = /<xf\b[^>]*\/?>(?:<\/xf>)?/g;
  let x;
  while ((x = xfRe.exec(block[0]))) {
    const tag = x[0];
    const nid = tag.match(/numFmtId="(\d+)"/);
    const rejected = /applyNumberFormat="0"/.test(tag);
    ids.push(nid && !rejected ? parseInt(nid[1], 10) : 0);
  }
  return ids;
}

function pad2(x: number): string { return String(x).padStart(2, '0'); }

function formatExcelSerial(serial: number, kind: 'date' | 'datetime' | 'time'): string {
  const ms = Math.round((serial - 25569) * 86400000); // 25569: 1899-12-30 -> 1970-01-01
  const d = new Date(ms);
  if (isNaN(d.getTime()) || serial < 0 || serial > 2958465) return String(serial);
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  if (kind === 'time') return time;
  // سلوك Excel: serial أقل من 1 مع تنسيق تاريخ+وقت بيتعرض كوقت فقط (يوم صفر)
  if (kind === 'datetime') return serial < 1 ? time : `${date} ${time}`;
  return date;
}

function cellValue(attrs: string, inner: string, sst: string[], numFmtIds: number[], dateMap: Map<number, 'date' | 'datetime' | 'time'>): string {
  const t = (attrs.match(/\bt="([^"]+)"/) || [])[1] || 'n';
  const vMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  if (t === 's') {
    const idx = vMatch ? parseInt(vMatch[1], 10) : -1;
    return idx >= 0 && idx < sst.length ? sst[idx] : '';
  }
  if (t === 'inlineStr') {
    let v = '';
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g;
    let tm;
    while ((tm = tRe.exec(inner))) v += tm[1] || '';
    return decodeXmlEntities(v);
  }
  if (t === 'b') {
    return vMatch && vMatch[1].trim() === '1' ? 'TRUE' : 'FALSE';
  }
  if (t === 'str' || t === 'e') {
    return vMatch ? decodeXmlEntities(vMatch[1]) : '';
  }
  // رقمي — ممكن يكون تاريخ حسب النمط
  const raw = vMatch ? vMatch[1].trim() : '';
  if (!raw) return '';
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  const sAttr = (attrs.match(/\bs="(\d+)"/) || [])[1];
  const nfid = sAttr ? (numFmtIds[parseInt(sAttr, 10)] || 0) : 0;
  const dateKind = dateMap.get(nfid);
  if (dateKind) return formatExcelSerial(num, dateKind);
  return raw;
}

function sheetToText(sheetXml: string, sst: string[], numFmtIds: number[], dateMap: Map<number, 'date' | 'datetime' | 'time'>): string {
  const rows: string[] = [];
  const rowRe = /<row\b[^>]*?>([\s\S]*?)<\/row>|<row\b[^>]*?\s\/>/g;
  const cellRe = /<c\b([^>]*?)\s\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g;
  let rm;
  let count = 0;
  let truncated = false;
  while ((rm = rowRe.exec(sheetXml))) {
    if (count >= MAX_SHEET_ROWS) { truncated = true; break; }
    const rowXml = rm[1] || '';
    const cells: string[] = [];
    let cm;
    while ((cm = cellRe.exec(rowXml))) {
      const attrs = cm[1] || cm[2] || '';
      const inner = cm[3] || '';
      const ref = (attrs.match(/\br="([A-Za-z]+[0-9]+)"/) || [])[1] || '';
      const col = ref ? colToIndex(ref) : cells.length;
      if (col < 0 || col > 255) continue;
      while (cells.length < col) cells.push('');
      let val = cellValue(attrs, inner, sst, numFmtIds, dateMap);
      if (val.length > MAX_CELL_CHARS) val = val.slice(0, MAX_CELL_CHARS) + '…';
      cells[col] = val;
    }
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    if (cells.length) rows.push(cells.join('\t'));
    count++;
  }
  let text = rows.join('\n');
  if (truncated) text += `\n…[اتقطع العرض عند ${MAX_SHEET_ROWS} صف]`;
  return text;
}

// ---------- PPTX ----------

function oxmlSlidesToText(xml: string): string {
  let s = xml
    .replace(/<a:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/a:p>/g, '\n');
  s = s.replace(/<[^>]+>/g, '');
  return cleanText(decodeXmlEntities(s));
}

function numberedNames(names: string[], re: RegExp): Array<{ n: number; name: string }> {
  const out: Array<{ n: number; name: string }> = [];
  for (const nm of names) {
    const m = nm.match(re);
    if (m) out.push({ n: parseInt(m[1], 10), name: nm });
  }
  out.sort((a, b) => a.n - b.n);
  return out;
}

// ---------- الصيغ القديمة (.doc/.xls/.ppt — OLE ثنائي): best-effort ----------

function legacyBestEffort(data: Uint8Array): string {
  const lines = new Set<string>();
  const scanLen = Math.min(data.length, 8 * 1024 * 1024);
  const push = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length < 10) return;
    const letters = (t.match(/[\p{L}\p{N}]/gu) || []).length;
    if (letters / t.length >= 0.55) lines.add(t);
  };

  // 1) نصوص UTF-16LE (المستندات الغربية والعربية الحديثة القديمة)
  try {
    const td = new TextDecoder('utf-16le');
    let cur = '';
    for (let i = 0; i + 1 < scanLen; i += 2) {
      const c = data[i] | (data[i + 1] << 8);
      const printable = (c >= 0x20 && c < 0xFFFD && !(c >= 0xD800 && c <= 0xDFFF)) || c === 9 || c === 10 || c === 13;
      if (printable) cur += String.fromCodePoint(c);
      else { if (cur.trim().length >= 8) push(cur); cur = ''; }
    }
    if (cur.trim().length >= 8) push(cur);
  } catch { /* ignore */ }

  // 2) نصوص windows-1256 (عربي) / cp1252
  try {
    const td = new TextDecoder('windows-1256');
    let cur = '';
    for (let i = 0; i < scanLen; i++) {
      const b = data[i];
      const ok = (b >= 0x20 && b < 0x7f) || b >= 0x80 || b === 9 || b === 10 || b === 13;
      if (ok) cur += td.decode(data.subarray(i, i + 1));
      else { if (cur.trim().length >= 12) push(cur); cur = ''; }
    }
    if (cur.trim().length >= 12) push(cur);
  } catch { /* ignore */ }

  return Array.from(lines).slice(0, 2000).join('\n');
}

// ---------- الدالة الرئيسية ----------

export async function extractOfficeText(file: File): Promise<OfficeExtraction> {
  const kind = officeKindFromName(file.name, file.type);
  if (!kind) throw new Error('NOT_OFFICE');

  // CSV: نص عادي
  if (kind === 'csv') {
    let text = utf8Decoder ? utf8Decoder.decode(await file.arrayBuffer()) : '';
    text = text.replace(/^\uFEFF/, '');
    if ((text.match(/\u0000/g) || []).length > 16) {
      return { kind, text: '', warning: 'الملف مش CSV نصي صالح للقراءة' };
    }
    return { kind, text: cleanText(text).slice(0, MAX_TOTAL_CHARS) };
  }

  const buf = await file.arrayBuffer();
  const d = new Uint8Array(buf);

  // صيغة OLE قديمة؟
  if (d.length > 4 && d[0] === 0xD0 && d[1] === 0xCF && d[2] === 0x11 && d[3] === 0xE0) {
    const text = legacyBestEffort(d).slice(0, MAX_TOTAL_CHARS);
    return {
      kind,
      text,
      warning: text
        ? 'الصيغة قديمة — الاستخراج تقريبي؛ للحصول على أفضل نتيجة احفظ الملف بصيغة حديثة (docx أو xlsx أو pptx)'
        : 'الصيغة قديمة ومش قدرنا نستخرج نص منها — احفظ الملف بصيغة حديثة (docx أو xlsx أو pptx) وارفعه تاني'
    };
  }

  // ZIP? (OOXML)
  if (!(d.length > 3 && d[0] === 0x50 && d[1] === 0x4b)) {
    throw new Error('UNSUPPORTED_BINARY');
  }

  let text = '';
  if (kind === 'docx') {
    const entries = await readZipFiles(buf, n => n === 'word/document.xml');
    const xml = zipText(entries, 'word/document.xml');
    if (!xml) throw new Error('BAD_DOCX');
    text = docxToText(xml);
  } else if (kind === 'xlsx') {
    const entries = await readZipFiles(
      buf,
      n =>
        n === 'xl/sharedStrings.xml' ||
        n === 'xl/workbook.xml' ||
        n === 'xl/_rels/workbook.xml.rels' ||
        n === 'xl/styles.xml' ||
        /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
    );
    const workbookXml = zipText(entries, 'xl/workbook.xml');
    const relsXml = zipText(entries, 'xl/_rels/workbook.xml.rels');
    const stylesXml = zipText(entries, 'xl/styles.xml') || null;
    const sstXml = zipText(entries, 'xl/sharedStrings.xml');
    const sst = sstXml ? sharedStrings(sstXml) : [];
    const dateMap = detectDateFormats(stylesXml);
    const numFmtIds = xfNumFmtIds(stylesXml);

    // اسم الورقة -> مسار الملف عبر الـ rels
    const relMap = new Map<string, string>();
    if (relsXml) {
      const relRe = /<Relationship\b[^>]*>/g;
      let r;
      while ((r = relRe.exec(relsXml))) {
        const id = (r[0].match(/Id="([^"]+)"/) || [])[1];
        let target = (r[0].match(/Target="([^"]+)"/) || [])[1];
        if (!id || !target) continue;
        target = target.replace(/^\//, '');
        if (!target.startsWith('xl/')) target = 'xl/' + target.replace(/^xl\//, '');
        relMap.set(id, target);
      }
    }

    const sheets: Array<{ name: string; path: string }> = [];
    if (workbookXml) {
      const sheetRe = /<sheet\b[^>]*>/g;
      let sh;
      while ((sh = sheetRe.exec(workbookXml))) {
        const nm = (sh[0].match(/\bname="([^"]*)"/) || [])[1] || '';
        const rid = (sh[0].match(/r:id="(rId\d+)"/) || [])[1] || '';
        const path = relMap.get(rid);
        if (path) sheets.push({ name: nm ? decodeXmlEntities(nm) : path, path });
      }
    }

    const parts: string[] = [];
    const list = sheets.length
      ? sheets
      : Array.from(entries.keys()).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
          .map(n => ({ name: n.replace('xl/worksheets/', '').replace('.xml', ''), path: n }));
    for (const sheet of list) {
      const xml = zipText(entries, sheet.path);
      if (!xml) continue;
      const body = sheetToText(xml, sst, numFmtIds, dateMap);
      if (body.trim()) parts.push(`### ${sheet.name}\n${body}`);
    }
    text = parts.join('\n\n');
  } else {
    // pptx
    const entries = await readZipFiles(
      buf,
      n => /^ppt\/slides\/slide\d+\.xml$/.test(n) || /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n)
    );
    const names = Array.from(entries.keys());
    const slides = numberedNames(names, /^ppt\/slides\/slide(\d+)\.xml$/);
    const notes = new Map<number, string>();
    for (const { n, name } of numberedNames(names, /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/)) {
      const xml = zipText(entries, name);
      if (xml) notes.set(n, oxmlSlidesToText(xml));
    }
    const parts: string[] = [];
    slides.forEach((s, i) => {
      const xml = zipText(entries, s.name);
      if (!xml) return;
      const body = oxmlSlidesToText(xml);
      if (!body) return;
      parts.push(`--- الشريحة ${i + 1} ---\n${body}`);
      const note = notes.get(s.n);
      if (note) parts.push(`[ملاحظات الشريحة ${i + 1}]:\n${note}`);
    });
    text = parts.join('\n\n');
  }

  text = cleanText(text);
  let warning: string | undefined;
  if (text.length > MAX_TOTAL_CHARS) {
    text = text.slice(0, MAX_TOTAL_CHARS);
    warning = 'تم اقتطاع جزء من النص لأن المستند طويل جدًا — بقية المحتوى موجودة في الملف الأصلي';
  } else if (!text) {
    warning = 'المستند مفيهوش نص قابل للقراءة — يمكن يكون صور ممسوحة ضوئيًا (scanned)';
  }

  return { kind, text, warning };
}
