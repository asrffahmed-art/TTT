const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useEffect }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useEffect }");
    content = content.replace("export function AdminPanel({ onClose }: AdminPanelProps) {", "export function AdminPanel({ onClose }: AdminPanelProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['لوحة تحكم إدارة النظام', 'System Administration Panel'],
    ['لوحة التحكم', 'Admin Panel'],
    ['المستخدمون', 'Users'],
    ['إدارة الذكاء الاصطناعي', 'AI Management'],
    ['مجموعات البيانات', 'Datasets'],
    ['إعدادات النظام', 'System Settings'],
    ['نظرة عامة', 'Overview'],
    ['الأمان والصلاحيات', 'Security & Permissions'],
    ['إحصائيات النظام', 'System Statistics'],
    ['قواعد البيانات', 'Databases'],
    ['المشتركون', 'Subscribers'],
];

for (const [ar, en] of translations) {
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
}

fs.writeFileSync('src/components/AdminPanel.tsx', content);
console.log('AdminPanel translated');
