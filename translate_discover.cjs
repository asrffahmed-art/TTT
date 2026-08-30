const fs = require('fs');
let content = fs.readFileSync('src/components/Discover.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { Code, Edit,", "import { useLanguage } from '../lib/LanguageContext';\nimport { Code, Edit,");
    content = content.replace("export function Discover({ onAction }: DiscoverProps) {", "export function Discover({ onAction }: DiscoverProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['اكتشف', 'Discover'],
    ['نماذج وقوالب جاهزة', 'Ready-made templates and models'],
    ['تصفح مجموعة من النماذج المساعدة التي صممت خصيصاً لمساعدتك في مختلف المهام بضغطة زر.', 'Browse a collection of helpful templates designed specifically to assist you with various tasks at the click of a button.'],
    ['مساعد البرمجة', 'Programming Assistant'],
    ['تحليل وتصحيح وكتابة الأكواد البرمجية بمختلف اللغات.', 'Analyze, debug, and write code in various languages.'],
    ['كتابة المقالات', 'Article Writing'],
    ['كتابة مقالات احترافية متوافقة مع السيو (SEO).', 'Write professional SEO-friendly articles.'],
    ['التلخيص الذكي', 'Smart Summarization'],
    ['تلخيص النصوص والمقالات الطويلة بشكل دقيق ومباشر.', 'Summarize long texts and articles accurately and directly.'],
    ['مترجم احترافي', 'Professional Translator'],
    ['ترجمة النصوص بين اللغات بدقة مع الحفاظ على السياق.', 'Accurately translate texts between languages while maintaining context.'],
    ['تخطيط السفر', 'Travel Planning'],
    ['إنشاء خطط سفر وجداول سياحية متكاملة لرحلتك القادمة.', 'Create comprehensive travel plans and itineraries for your next trip.'],
    ['مدرب رياضي', 'Fitness Coach'],
    ['جداول تمارين وأنظمة غذائية مخصصة للياقتك البدنية.', 'Custom workout schedules and diet plans for your physical fitness.'],
    ['تجربة النموذج', 'Try Model'],
];

for (const [ar, en] of translations) {
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
    
    // Replace strings inside single or double quotes
    const regexStr1 = new RegExp(`'${ar}'`, 'g');
    content = content.replace(regexStr1, `(language === 'ar' ? '${ar}' : '${en}')`);
    
    const regexStr2 = new RegExp(`"${ar}"`, 'g');
    content = content.replace(regexStr2, `(language === 'ar' ? "${ar}" : "${en}")`);
}

fs.writeFileSync('src/components/Discover.tsx', content);
console.log('Discover translated');
