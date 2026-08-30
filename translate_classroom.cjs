const fs = require('fs');
let content = fs.readFileSync('src/components/Classroom.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useEffect }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useEffect }");
    content = content.replace("export function Classroom({ onStartAiChat }: ClassroomProps) {", "export function Classroom({ onStartAiChat }: ClassroomProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['الفصول الدراسية', 'Classrooms'],
    ['فصل جديد', 'New Class'],
    ['المهام الدراسية', 'Assignments'],
    ['إعلان جديد', 'New Announcement'],
    ['لا توجد فصول دراسية', 'No Classrooms'],
    ['لم تقم بإنشاء أو الانضمام لأي فصل بعد.', 'You haven\'t created or joined any class yet.'],
    ['تنبيه', 'Alert'],
];

for (const [ar, en] of translations) {
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
}

fs.writeFileSync('src/components/Classroom.tsx', content);
console.log('Classroom translated');
