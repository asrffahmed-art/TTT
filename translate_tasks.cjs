const fs = require('fs');
let content = fs.readFileSync('src/components/GoogleTasks.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useEffect }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useEffect }");
    content = content.replace("export function GoogleTasks({ onAction }: GoogleTasksProps) {", "export function GoogleTasks({ onAction }: GoogleTasksProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['إدارة المهام', 'Task Management'],
    ['المهام الذكية', 'Smart Tasks'],
    ['قائمة المهام', 'Task List'],
    ['تم استرجاع المهام بنجاح', 'Tasks retrieved successfully'],
    ['مهمة جديدة...', 'New task...'],
    ['إضافة', 'Add'],
    ['المهام قيد الإنجاز', 'Tasks in progress'],
    ['المهام المكتملة', 'Completed Tasks'],
    ['لا توجد مهام مكتملة', 'No completed tasks'],
    ['لا توجد مهام حالية', 'No current tasks'],
    ['هل أنت متأكد من حذف هذه المهمة؟', 'Are you sure you want to delete this task?'],
    ['تفاصيل المهمة', 'Task details'],
    ['التاريخ', 'Date'],
    ['إرسال إلى الذكاء الاصطناعي', 'Send to AI'],
    ['تم جلب', 'Fetched'],
    ['مهمة من المهام', 'task(s) from tasks'],
    ['تم الحفظ بنجاح', 'Saved successfully'],
    ['المزامنة مع تقويم Google', 'Sync with Google Calendar'],
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

fs.writeFileSync('src/components/GoogleTasks.tsx', content);
console.log('GoogleTasks translated');
