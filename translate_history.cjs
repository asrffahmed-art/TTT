const fs = require('fs');
let content = fs.readFileSync('src/components/History.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useEffect }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useEffect }");
    content = content.replace("export function History({ onAction }: HistoryProps) {", "export function History({ onAction }: HistoryProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['سجل نشاط THOTH', 'THOTH Activity Log'],
    ['السجل', 'History'],
    ['محادثات', 'Chats'],
    ['بحث في السجل...', 'Search history...'],
    ['لا يوجد سجل محادثات متاح', 'No chat history available'],
    ['ابحث أو ابدأ محادثة جديدة ليظهر السجل هنا', 'Search or start a new chat for history to appear here'],
    ['حذف السجل', 'Delete history'],
    ['هل أنت متأكد من حذف هذا السجل؟', 'Are you sure you want to delete this log?'],
    ['سيتم حذف جميع السجلات. هل أنت متأكد؟', 'All logs will be deleted. Are you sure?'],
    ['تم حذف جميع السجلات', 'All logs deleted'],
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

fs.writeFileSync('src/components/History.tsx', content);
console.log('History translated');
