import { useMemo, useState } from 'react';
import { FileText, FileDown, Printer, ChevronDown, Presentation } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// [TASK 57] مولّد الملفات الحقيقية — Word (.docx) + PDF (عبر الطباعة)
// المستخدم كان يطلب «ملف PDF» فيرجع له كود React — الحل بروتوكول thothdoc:
// النموذج يسلّم JSON داخل بلوك ```thothdoc وده المكوّن اللي يحوّله لملف
// حقيقي ينزل على جهاز المستخدم. كل التوليد client-side صفر اعتماديات
// خارجية: ZIP مكتوب يدويًا (طريقة store) + OOXML مبسّط. مفيش أي رفع أو
// تخزين على السيرفر (الضيوف مستثنون من التخزين — خط أحمر محفوظ).
// ═══════════════════════════════════════════════════════════════════

export interface ThothSection { heading?: string; paragraphs?: string[]; bullets?: string[]; }
export interface ThothCover {
  university?: string; faculty?: string; department?: string; course?: string;
  title?: string; subtitle?: string; logoText?: string;
  studentName?: string; studentId?: string; supervisor?: string;
  academicYear?: string; date?: string;
}
export interface ThothDoc {
  kind?: 'cover' | 'document' | 'slides';
  fileName?: string; title?: string; subtitle?: string;
  cover?: ThothCover; sections?: ThothSection[];
}

const S = (v: any): string => (typeof v === 'string' ? v.trim() : '');

// ── محلل متسامح: JSON نضيف ← إزالة فواصل زائدة ← استخراج أول { لآخر } ──
export function parseThothDoc(raw: string): ThothDoc | null {
  const tryParse = (s: string): any => {
    try { return JSON.parse(s); } catch { /* نكمل */ }
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch { /* نكمل */ }
    return null;
  };
  let obj = tryParse(String(raw || '').trim());
  if (!obj) {
    const a = String(raw).indexOf('{');
    const b = String(raw).lastIndexOf('}');
    if (a !== -1 && b > a) obj = tryParse(String(raw).slice(a, b + 1));
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const cover = obj.cover && typeof obj.cover === 'object' ? obj.cover : undefined;
  const sections = Array.isArray(obj.sections)
    ? obj.sections.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
        heading: S(s.heading), paragraphs: Array.isArray(s.paragraphs) ? s.paragraphs.map(S).filter(Boolean) : [],
        bullets: Array.isArray(s.bullets) ? s.bullets.map(S).filter(Boolean) : [],
      })).filter((s: any) => s.heading || s.paragraphs.length || s.bullets.length)
    : [];
  const title = S(obj.title);
  if (!title && !cover && sections.length === 0) return null;
  const kind = obj.kind === 'cover' || obj.kind === 'slides' ? obj.kind : 'document';
  return {
    kind,
    fileName: S(obj.fileName) || title || 'thoth-document',
    title, subtitle: S(obj.subtitle),
    cover: cover ? {
      university: S(cover.university), faculty: S(cover.faculty), department: S(cover.department),
      course: S(cover.course), title: S(cover.title), subtitle: S(cover.subtitle), logoText: S(cover.logoText),
      studentName: S(cover.studentName), studentId: S(cover.studentId), supervisor: S(cover.supervisor),
      academicYear: S(cover.academicYear), date: S(cover.date),
    } : undefined,
    sections,
  };
}

// ── CRC32 + كاتب ZIP (طريقة store — صفر ضغط، كافي لمستندات XML الصغيرة) ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files: { name: string; text: string }[]): Blob {
  const enc = new TextEncoder();
  const local: number[] = []; const central: number[] = [];
  let offset = 0;
  const push = (a: number[], b: ArrayLike<number>) => { for (let i = 0; i < b.length; i++) a.push(b[i]); };
  const U16 = (v: number) => [v & 255, (v >> 8) & 255];
  const U32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = Array.from(enc.encode(f.name));
    const data = Array.from(enc.encode(f.text));
    const crc = crc32(new Uint8Array(data));
    const head = offset;
    push(local, U32(0x04034b50)); push(local, U16(20)); push(local, U16(0x0800)); push(local, U16(0));
    push(local, U16(0)); push(local, U16(0)); push(local, U32(crc));
    push(local, U32(data.length)); push(local, U32(data.length));
    push(local, U16(name.length)); push(local, U16(0));
    push(local, name); push(local, data);
    push(central, U32(0x02014b50)); push(central, U16(20)); push(central, U16(20)); push(central, U16(0x0800)); push(central, U16(0));
    push(central, U16(0)); push(central, U16(0)); push(central, U32(crc));
    push(central, U32(data.length)); push(central, U32(data.length));
    push(central, U16(name.length)); push(central, U16(0)); push(central, U16(0)); push(central, U16(0)); push(central, U16(0));
    push(central, U32(0)); push(central, U32(head)); push(central, name);
    offset = local.length;
  }
  const eocd: number[] = [];
  push(eocd, U32(0x06054b50)); push(eocd, U16(0)); push(eocd, U16(0));
  push(eocd, U16(files.length)); push(eocd, U16(files.length));
  push(eocd, U32(central.length)); push(eocd, U32(offset)); push(eocd, U16(0));
  return new Blob(
    [new Uint8Array(local), new Uint8Array(central), new Uint8Array(eocd)],
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
  );
}

// ── مولّد Word حقيقي (OOXML) — عربي RTL كامل عبر w:bidi + w:rtl ──
const xmlEsc = (s: string) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function dxp(
  runs: { text: string; size?: number; bold?: boolean }[],
  opts: { center?: boolean; after?: number; before?: number } = {}
): string {
  const r = runs.map(rr => `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${rr.bold ? '<w:b/><w:bCs/>' : ''}${rr.size ? `<w:sz w:val="${rr.size}"/><w:szCs w:val="${rr.size}"/>` : ''}<w:rtl/></w:rPr><w:t xml:space="preserve">${xmlEsc(rr.text)}</w:t></w:r>`).join('');
  return `<w:p><w:pPr><w:bidi/><w:spacing${opts.before ? ` w:before="${opts.before}"` : ''} w:after="${opts.after ?? 160}"/>${opts.center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${r}</w:p>`;
}
const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

export function buildDocxXml(doc: ThothDoc): string {
  const c = doc.cover || {};
  const coverTitle = c.title || doc.title || '';
  const hasCover = doc.kind === 'cover' || !!(c.university || c.faculty || c.department || (coverTitle && (c.studentName || c.supervisor)));
  const body: string[] = [];
  if (hasCover) {
    if (c.university) body.push(dxp([{ text: c.university, size: 36, bold: true }], { center: true, after: 80 }));
    if (c.faculty) body.push(dxp([{ text: c.faculty, size: 28 }], { center: true, after: 40 }));
    if (c.department) body.push(dxp([{ text: c.department, size: 24 }], { center: true, after: 120 }));
    if (c.logoText) body.push(dxp([{ text: c.logoText, size: 22 }], { center: true, after: 120 }));
    body.push(dxp([{ text: '' }], { after: 400 }));
    if (doc.kind === 'document' && coverTitle) body.push(dxp([{ text: 'بحث بعنوان:', size: 24 }], { center: true, after: 120 }));
    if (coverTitle) body.push(dxp([{ text: coverTitle, size: 56, bold: true }], { center: true, after: 140 }));
    const sub = c.subtitle || doc.subtitle;
    if (sub) body.push(dxp([{ text: sub, size: 28 }], { center: true, after: 400 }));
    body.push(dxp([{ text: '' }], { after: 300 }));
    if (c.studentName) body.push(dxp([{ text: `إعداد الطالب/ـة: ${c.studentName}`, size: 28, bold: true }], { center: true, after: 60 }));
    if (c.studentId) body.push(dxp([{ text: `الرقم الجامعي: ${c.studentId}`, size: 24 }], { center: true, after: 160 }));
    if (c.supervisor) body.push(dxp([{ text: `إشراف: ${c.supervisor}`, size: 28, bold: true }], { center: true, after: 160 }));
    if (c.course) body.push(dxp([{ text: c.course, size: 24 }], { center: true, after: 160 }));
    if (c.academicYear || c.date) body.push(dxp([{ text: [c.academicYear, c.date].filter(Boolean).join(' — '), size: 24 }], { center: true }));
    body.push(PAGE_BREAK);
  }
  if (!hasCover && doc.title) body.push(dxp([{ text: doc.title, size: 40, bold: true }], { center: true, after: 200 }));
  const sub2 = !hasCover ? doc.subtitle : '';
  if (sub2) body.push(dxp([{ text: sub2, size: 28 }], { center: true, after: 300 }));
  for (const s of doc.sections || []) {
    if (s.heading) body.push(dxp([{ text: s.heading, size: 32, bold: true }], { before: 240, after: 140 }));
    for (const p of s.paragraphs || []) body.push(dxp([{ text: p, size: 28 }], { after: 160 }));
    for (const b of s.bullets || []) body.push(dxp([{ text: `•  ${b}`, size: 28 }], { after: 80 }));
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
}

export function buildDocxBlob(doc: ThothDoc): Blob {
  return zipStore([
    {
      name: '[Content_Types].xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    { name: 'word/document.xml', text: buildDocxXml(doc) },
  ]);
}

export function docFileName(doc: ThothDoc): string {
  return (doc.fileName || doc.title || 'thoth-document')
    .replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'thoth-document';
}

export function downloadWord(doc: ThothDoc): void {
  const blob = buildDocxBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docFileName(doc)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── معاينة PDF: مستند طباعة A4 أنيق (المتصفح بيعرض العربية بشكل مثالي) ──
const htmlEsc = xmlEsc;
const isRtlDoc = (doc: ThothDoc) => /[\u0600-\u06FF]/.test(JSON.stringify(doc || {}));

export function buildPrintHtml(doc: ThothDoc): string {
  const c = doc.cover || {};
  const rtl = isRtlDoc(doc);
  const dirAttr = rtl ? 'dir="rtl" lang="ar"' : 'dir="ltr" lang="en"';
  const coverTitle = c.title || doc.title || '';
  const hasCover = doc.kind === 'cover' || !!(c.university || c.faculty || c.department || (coverTitle && (c.studentName || c.supervisor)));
  const align = rtl ? 'right' : 'left';

  let coverHtml = '';
  if (hasCover) {
    const meta = [
      c.studentName ? `<div class="mrow"><span>${rtl ? 'إعداد الطالب/ـة' : 'Prepared by'}</span><b>${htmlEsc(c.studentName)}</b></div>` : '',
      c.studentId ? `<div class="mrow"><span>${rtl ? 'الرقم الجامعي' : 'Student ID'}</span><b>${htmlEsc(c.studentId)}</b></div>` : '',
      c.supervisor ? `<div class="mrow"><span>${rtl ? 'إشراف' : 'Supervisor'}</span><b>${htmlEsc(c.supervisor)}</b></div>` : '',
      c.course ? `<div class="mrow"><span>${rtl ? 'المقرر' : 'Course'}</span><b>${htmlEsc(c.course)}</b></div>` : '',
      (c.academicYear || c.date) ? `<div class="mrow"><span>${rtl ? 'العام الجامعي' : 'Academic year'}</span><b>${htmlEsc([c.academicYear, c.date].filter(Boolean).join(' — '))}</b></div>` : '',
    ].filter(Boolean).join('');
    coverHtml = `<section class="page cover"><div class="cover-frame"></div>
      <div class="cover-top">
        ${c.university ? `<h2>${htmlEsc(c.university)}</h2>` : ''}
        ${c.faculty ? `<h3>${htmlEsc(c.faculty)}</h3>` : ''}
        ${c.department ? `<h4>${htmlEsc(c.department)}</h4>` : ''}
        ${c.logoText ? `<div class="logo">${htmlEsc(c.logoText)}</div>` : ''}
      </div>
      <div class="cover-mid">
        <div class="rule"></div>
        ${doc.kind === 'document' && coverTitle ? `<div class="pre-title">${rtl ? 'بحث بعنوان' : 'A research on'}</div>` : ''}
        ${coverTitle ? `<h1>${htmlEsc(coverTitle)}</h1>` : ''}
        ${(c.subtitle || doc.subtitle) ? `<p class="sub">${htmlEsc(c.subtitle || doc.subtitle)}</p>` : ''}
        <div class="rule"></div>
      </div>
      <div class="cover-meta">${meta}</div>
    </section>`;
  }

  let contentHtml = '';
  if (doc.kind === 'slides') {
    contentHtml = (doc.sections || []).map((s, i) => `<section class="slide"><div class="slide-num">${i + 1}</div>
      ${s.heading ? `<h2 class="slide-title">${htmlEsc(s.heading)}</h2>` : ''}
      ${(s.paragraphs || []).map(p => `<p class="slide-p">${htmlEsc(p)}</p>`).join('')}
      ${(s.bullets || []).length ? `<ul class="slide-b">${s.bullets.map(b => `<li>${htmlEsc(b)}</li>`).join('')}</ul>` : ''}
    </section>`).join('');
  } else {
    const t = !hasCover && doc.title ? `<h1 class="doc-title">${htmlEsc(doc.title)}</h1>${doc.subtitle && !hasCover ? `<p class="doc-sub">${htmlEsc(doc.subtitle)}</p>` : ''}` : '';
    contentHtml = `<section class="page doc">${t}${(doc.sections || []).map(s => `
      ${s.heading ? `<h2 class="doc-h">${htmlEsc(s.heading)}</h2>` : ''}
      ${(s.paragraphs || []).map(p => `<p class="doc-p">${htmlEsc(p)}</p>`).join('')}
      ${(s.bullets || []).length ? `<ul class="doc-b">${s.bullets.map(b => `<li>${htmlEsc(b)}</li>`).join('')}</ul>` : ''}`).join('')}
    </section>`;
  }

  const slidesCss = `@page{size:A4 landscape;margin:0}.slide{width:297mm;height:209mm;padding:18mm 24mm;page-break-after:always;display:flex;flex-direction:column;justify-content:flex-start;position:relative;background:#fff}
.slide-title{font-size:26pt;font-weight:700;color:#1a1a1a;margin-bottom:10mm;padding-bottom:5mm;border-bottom:1.5pt solid #1a1a1a}
.slide-p{font-size:15pt;line-height:2;color:#222;text-align:${align}}
.slide-b{margin:0;padding-${rtl ? 'right' : 'left'}:8mm;font-size:16pt;line-height:2.1;color:#222;text-align:${align}}
.slide-num{position:absolute;bottom:8mm;${rtl ? 'left' : 'right'}:12mm;font-size:10pt;color:#999}`;
  const docCss = `@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;padding:22mm 20mm;page-break-after:always;background:#fff;position:relative}
.doc-h{font-size:16pt;font-weight:700;color:#1a1a1a;margin:8mm 0 4mm;padding-bottom:2mm;border-bottom:0.75pt solid #bbb;text-align:${align}}
.doc-p{font-size:13pt;line-height:2.05;color:#1c1c1c;text-align:justify;margin-bottom:3.5mm}
.doc-b{padding-${rtl ? 'right' : 'left'}:7mm;font-size:13pt;line-height:2;color:#1c1c1c;text-align:${align}}
.doc-b li{margin-bottom:2mm}
.doc-title{font-size:24pt;font-weight:700;text-align:center;margin:6mm 0 3mm;color:#111}
.doc-sub{font-size:13pt;color:#555;text-align:center;margin-bottom:8mm}`;

  return `<!doctype html><html ${dirAttr}><head><meta charset="utf-8"><title>${htmlEsc(docFileName(doc))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#eceff3}
body{font-family:'Amiri','Traditional Arabic','Times New Roman',serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.no-print{position:sticky;top:0;z-index:9;background:#111827;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:12px;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px}
.no-print button{background:#4f46e5;color:#fff;border:0;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
@media print{.no-print{display:none}html,body{background:#fff}}
${doc.kind === 'slides' ? slidesCss : docCss}
.cover{display:flex;flex-direction:column;justify-content:space-between;text-align:center}
.cover-frame{position:absolute;inset:10mm;border:2.5pt double #1a1a1a;pointer-events:none}
.cover-top{padding-top:14mm}
.cover-top h2{font-size:20pt;font-weight:700;letter-spacing:0.5px}
.cover-top h3{font-size:15pt;font-weight:400;color:#333;margin-top:3mm}
.cover-top h4{font-size:12.5pt;font-weight:400;color:#555;margin-top:1.5mm}
.logo{font-size:11pt;color:#888;margin-top:8mm}
.cover-mid{padding:0 8mm}
.pre-title{font-size:12pt;color:#666;margin-bottom:4mm}
.cover-mid h1{font-size:29pt;font-weight:700;line-height:1.6;color:#111}
.sub{font-size:13.5pt;color:#444;margin-top:4mm;line-height:1.9}
.rule{width:42mm;height:0;border-top:1.2pt solid #1a1a1a;margin:6mm auto}
.cover-meta{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm 10mm;padding:0 12mm 10mm;text-align:${rtl ? 'right' : 'left'}}
.mrow span{display:block;font-size:9.5pt;color:#777;letter-spacing:0.5px}
.mrow b{font-size:12.5pt;font-weight:700;color:#1a1a1a}
</style></head><body>
<div class="no-print"><span>${rtl ? 'اختار «حفظ كـ PDF» من نافذة الطباعة' : 'Choose "Save as PDF" in the print dialog'}</span><button onclick="window.print()">${rtl ? 'فتح الطباعة' : 'Open print'}</button></div>
${coverHtml}${contentHtml}
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},500)});</script>
</body></html>`;
}

export function openPrintView(doc: ThothDoc): boolean {
  const html = buildPrintHtml(doc);
  const w = window.open('', '_blank');
  if (w) {
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
      return true;
    } catch { /* نرجع لخطة الاحتياط */ }
  }
  // احتياط لو المتصفح منع النوافذ المنبثقة: iframe مخفي يطبع مباشرة
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
  f.srcdoc = html;
  f.onload = () => {
    try { f.contentWindow?.focus(); f.contentWindow?.print(); } catch { /* تجاهل */ }
    setTimeout(() => f.remove(), 60000);
  };
  document.body.appendChild(f);
  return true;
}

// ── البطاقة داخل المحادثة: سطر لمعة أثناء التحضير ← بطاقة جاهزة بمعاينة وتحميل ──
function DocPreview({ doc }: { doc: ThothDoc }) {
  const c = doc.cover || {};
  const coverTitle = c.title || doc.title || '';
  const hasCover = doc.kind === 'cover' || !!(c.university || c.faculty || c.department || (coverTitle && (c.studentName || c.supervisor)));
  const rtl = isRtlDoc(doc);
  const serif = { fontFamily: "'Amiri','Traditional Arabic','Times New Roman',serif" } as const;

  if (doc.kind === 'slides') {
    return (
      <div className="mx-3 mb-3 rounded-xl bg-white text-black overflow-hidden max-h-80 overflow-y-auto" dir={rtl ? 'rtl' : 'ltr'}>
        {(doc.sections || []).map((s, i) => (
          <div key={i} className={`px-5 py-4 ${i ? 'border-t border-gray-200' : ''}`}>
            <div className="text-[9px] text-gray-400 font-sans mb-1">{rtl ? `شريحة ${i + 1}` : `Slide ${i + 1}`}</div>
            {s.heading && <div className="text-lg font-bold border-b border-gray-300 pb-1.5 mb-2" style={serif}>{s.heading}</div>}
            {s.paragraphs?.map((p, j) => <p key={j} className="text-[13px] leading-7 text-gray-800 mb-1" style={serif}>{p}</p>)}
            {s.bullets?.length ? (
              <ul className={`text-[13px] leading-7 text-gray-800 list-disc ${rtl ? 'pr-5' : 'pl-5'}`} style={serif}>
                {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 rounded-xl bg-white text-black max-h-80 overflow-y-auto" dir={rtl ? 'rtl' : 'ltr'}>
      {hasCover && (
        <div className="relative px-6 py-7 text-center border-b-4 border-double border-gray-800 m-3 mb-0" style={serif}>
          {c.university && <div className="text-xl font-bold">{c.university}</div>}
          {c.faculty && <div className="text-sm text-gray-700 mt-1">{c.faculty}</div>}
          {c.department && <div className="text-xs text-gray-500 mt-0.5">{c.department}</div>}
          <div className="w-10 h-px bg-gray-900 mx-auto my-4"></div>
          {doc.kind === 'document' && coverTitle && <div className="text-[11px] text-gray-500 mb-1.5">{rtl ? 'بحث بعنوان' : 'A research on'}</div>}
          {coverTitle && <div className="text-[26px] font-bold leading-snug">{coverTitle}</div>}
          {(c.subtitle || doc.subtitle) && <div className="text-[13px] text-gray-500 mt-2 leading-6">{c.subtitle || doc.subtitle}</div>}
          <div className="w-10 h-px bg-gray-900 mx-auto my-4"></div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right mt-4" dir={rtl ? 'rtl' : 'ltr'}>
            {c.studentName && <div><div className="text-[9px] text-gray-400 uppercase tracking-wide">{rtl ? 'إعداد الطالب/ـة' : 'Prepared by'}</div><div className="text-[13px] font-bold">{c.studentName}</div></div>}
            {c.studentId && <div><div className="text-[9px] text-gray-400 uppercase tracking-wide">{rtl ? 'الرقم الجامعي' : 'ID'}</div><div className="text-[13px] font-bold">{c.studentId}</div></div>}
            {c.supervisor && <div><div className="text-[9px] text-gray-400 uppercase tracking-wide">{rtl ? 'إشراف' : 'Supervisor'}</div><div className="text-[13px] font-bold">{c.supervisor}</div></div>}
            {c.course && <div><div className="text-[9px] text-gray-400 uppercase tracking-wide">{rtl ? 'المقرر' : 'Course'}</div><div className="text-[13px] font-bold">{c.course}</div></div>}
            {(c.academicYear || c.date) && <div className="col-span-2"><div className="text-[9px] text-gray-400 uppercase tracking-wide">{rtl ? 'العام الجامعي' : 'Academic year'}</div><div className="text-[13px] font-bold">{[c.academicYear, c.date].filter(Boolean).join(' — ')}</div></div>}
          </div>
        </div>
      )}
      {doc.sections?.length ? (
        <div className="px-5 py-4">
          {!hasCover && doc.title && <div className="text-lg font-bold mb-1" style={serif}>{doc.title}</div>}
          {doc.sections.map((s, i) => (
            <div key={i} className="mb-3">
              {s.heading && <div className="text-[15px] font-bold border-b border-gray-300 pb-1 mb-1.5" style={serif}>{s.heading}</div>}
              {s.paragraphs?.map((p, j) => <p key={j} className="text-[13px] leading-7 text-gray-800 mb-1.5 text-justify" style={serif}>{p}</p>)}
              {s.bullets?.length ? (
                <ul className={`text-[13px] leading-7 text-gray-800 list-disc ${rtl ? 'pr-5' : 'pl-5'}`} style={serif}>
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocumentCard({ raw, writing, isAr }: { raw: string; writing: boolean; isAr: boolean }) {
  const doc = useMemo(() => (writing ? null : parseThothDoc(raw)), [raw, writing]);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<'word' | 'pdf' | null>(null);

  const ping = (k: 'word' | 'pdf') => {
    setFlash(k);
    setTimeout(() => setFlash(cur => (cur === k ? null : cur)), 2600);
  };

  if (writing || !doc) {
    if (writing) {
      return (
        <div className="my-2 flex items-center gap-1.5 py-0.5">
          <ChevronDown className="thoth-thought-chevron" size={15} strokeWidth={2.5} />
          <span className="thoth-status-shimmer text-[14px] font-medium">{isAr ? 'بيجهّز الملف…' : 'Preparing the file…'}</span>
        </div>
      );
    }
    // JSON غير صالح بعد اكتمال البلوك — عرض احتياطي بسيط بدل ما يضيع
    return (
      <details className="my-2 max-w-lg rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <summary className="px-3 py-2 text-[12px] text-white/45 cursor-pointer select-none">{isAr ? 'مستند (صيغة غير معروفة — اعرض الخام)' : 'Document (unknown format — show raw)'}</summary>
        <pre className="px-3 pb-3 text-[10px] font-mono text-white/40 overflow-auto max-h-48 whitespace-pre-wrap" dir="ltr">{raw}</pre>
      </details>
    );
  }

  const kind = doc.kind || 'document';
  const kindLabel = kind === 'cover' ? (isAr ? 'غلاف بحث' : 'Research cover')
    : kind === 'slides' ? (isAr ? 'عرض تقديمي' : 'Presentation')
    : (isAr ? 'مستند' : 'Document');
  const name = docFileName(doc);

  return (
    <div className="my-3 max-w-md rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden shadow-lg">
      <div className="flex items-center gap-3 p-3.5 pb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 border border-white/10 flex items-center justify-center shrink-0">
          {kind === 'slides' ? <Presentation size={19} className="text-indigo-200" /> : <FileText size={19} className="text-indigo-200" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white truncate" title={name}>{name}</div>
          <div className="text-[11px] text-white/45 mt-0.5">{kindLabel} · {isAr ? 'جاهز للتحميل' : 'ready to download'}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          title={isAr ? 'معاينة الملف' : 'Preview'}
          className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ChevronDown className={`thoth-thought-chevron ${open ? 'thoth-open' : ''}`} size={16} strokeWidth={2.5} />
        </button>
      </div>

      {open && <DocPreview doc={doc} />}

      <div className="flex gap-2 px-3.5 pb-2">
        {kind !== 'slides' && (
          <button
            type="button"
            onClick={() => { downloadWord(doc); ping('word'); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/90 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
          >
            <FileDown size={14} />
            {flash === 'word' ? (isAr ? 'نزل الملف ✓' : 'Downloaded ✓') : (isAr ? 'تحميل Word' : 'Download Word')}
          </button>
        )}
        <button
          type="button"
          onClick={() => { openPrintView(doc); ping('pdf'); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 text-xs font-bold transition-all active:scale-[0.98]"
        >
          <Printer size={14} />
          {flash === 'pdf' ? (isAr ? 'فتحنا الطباعة ✓' : 'Print opened ✓') : (isAr ? 'حفظ كـ PDF' : 'Save as PDF')}
        </button>
      </div>
      <div className="px-3.5 pb-3">
        <p className="text-[10px] leading-4 text-white/35">
          {isAr
            ? (kind === 'slides'
              ? 'هتفتح صفحة العرض — اختار «حفظ كـ PDF» من نافذة الطباعة.'
              : 'Word ينزل ملف .docx حقيقي — وPDF هتفتح نافذة الطباعة واختار «حفظ كـ PDF».')
            : (kind === 'slides'
              ? 'Opens the print view — choose "Save as PDF".'
              : 'Downloads a real .docx — PDF opens the print dialog, choose "Save as PDF".')}
        </p>
      </div>
    </div>
  );
}
