const fs = require('fs');
let content = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useEffect, useRef }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useEffect, useRef }");
    content = content.replace("export function KeepNotes({ onAction, onModalToggle }: KeepNotesProps) {", "export function KeepNotes({ onAction, onModalToggle }: KeepNotesProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['مساحة عمل THOTH', 'THOTH Workspace'],
    ['محفوظات', 'Saved'],
    ['إضافة ملاحظة', 'Add Note'],
    ['أفكار', 'Ideas'],
    ['دراسة', 'Study'],
    ['عمل', 'Work'],
    ['مهم', 'Important'],
    ['اكتب ملاحظاتك هنا...', 'Write your notes here...'],
    ['تثبيت', 'Pin'],
    ['ألوان الملاحظة', 'Note Colors'],
    ['إلغاء التثبيت', 'Unpin'],
    ['تعديل', 'Edit'],
    ['حذف', 'Delete'],
    ['تم نسخ الرابط!', 'Link copied!'],
    ['نسخ رابط الملاحظة', 'Copy note link'],
    ['تم النسخ!', 'Copied!'],
    ['نسخ المحتوى', 'Copy content'],
    ['مشاركة في المحادثة', 'Share in chat'],
    ['هل أنت متأكد من حذف هذه الملاحظة؟', 'Are you sure you want to delete this note?'],
    ['تم حذف الملاحظة', 'Note deleted'],
    ['عنوان الملاحظة', 'Note Title'],
    ['اكتب محتوى الملاحظة هنا...', 'Write note content here...'],
    ['إلغاء', 'Cancel'],
    ['حفظ التغييرات', 'Save Changes'],
    ['إضافة ملاحظة جديدة', 'Add New Note'],
    ['البحث في مساحة العمل...', 'Search workspace...'],
    ['إدارة الوسم', 'Manage Tags'],
    ['إضافة صورة', 'Add Image'],
    ['تصفية بالوسوم', 'Filter by tags'],
    ['الكل', 'All'],
    ['إدارة المهام', 'Task Management'],
    ['تم تحديث الملاحظة بنجاح', 'Note updated successfully'],
];

for (const [ar, en] of translations) {
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
    
    const regexPlaceholder = new RegExp(`placeholder="${ar}"`, 'g');
    content = content.replace(regexPlaceholder, `placeholder={language === 'ar' ? '${ar}' : '${en}'}`);

    const regexTitle = new RegExp(`title="${ar}"`, 'g');
    content = content.replace(regexTitle, `title={language === 'ar' ? '${ar}' : '${en}'}`);
    
    const regexStr1 = new RegExp(`'${ar}'`, 'g');
    content = content.replace(regexStr1, `(language === 'ar' ? '${ar}' : '${en}')`);
    
    const regexStr2 = new RegExp(`"${ar}"`, 'g');
    content = content.replace(regexStr2, `(language === 'ar' ? "${ar}" : "${en}")`);
}

fs.writeFileSync('src/components/KeepNotes.tsx', content);
console.log('KeepNotes translated');
