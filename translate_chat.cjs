const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf8');

if (!content.includes('useLanguage')) {
    content = content.replace("import { useState, useRef, useEffect }", "import { useLanguage } from '../lib/LanguageContext';\nimport { useState, useRef, useEffect }");
    content = content.replace("export function Chat({ initialMessage, clearInitialMessage, onToggleLiveModal, onNavigate }: ChatProps) {", "export function Chat({ initialMessage, clearInitialMessage, onToggleLiveModal, onNavigate }: ChatProps) {\n  const { t, language } = useLanguage();");
}

const translations = [
    ['هل لديك استفسار؟', 'Do you have a question?'],
    ['أنا THOTH مستعد لمساعدتك..', 'I am THOTH, ready to assist you..'],
    ['اسأل عن أي شيء...', 'Ask about anything...'],
    ['مستندات', 'Documents'],
    ['بحث بالويب', 'Web Search'],
    ['تحليل بيانات', 'Data Analysis'],
    ['إرسال', 'Send'],
    ['التقاط صورة', 'Take Photo'],
    ['اختيار صورة', 'Choose Image'],
    ['مرفق', 'Attachment'],
    ['صورة', 'Image'],
    ['ملف', 'File'],
    ['التحدث', 'Speak'],
    ['إيقاف المايك', 'Mute Mic'],
    ['مايك', 'Mic'],
    ['مشاركة الموقع', 'Share Location'],
    ['ترجمة', 'Translate'],
    ['تسجيل الدخول / إنشاء حساب مجاني', 'Sign in / Create free account'],
    ['قم بتسجيل الدخول للاستمتاع بمحادثات غير محدودة وتجربة متطورة.', 'Sign in to enjoy unlimited chats and an advanced experience.'],
    ['تسجيل الدخول / إنشاء حساب', 'Sign In / Create Account'],
    ['متابعة بدون تسجيل', 'Continue without sign in'],
    ['متابعة كزائر', 'Continue as guest'],
    ['تم الوصول للحد المسموح من الأسئلة', 'Limit of allowed questions reached'],
    ['تم حفظ الملاحظة بنجاح', 'Note saved successfully'],
    ['محادثة جديدة', 'New Chat'],
    ['تم استرجاع المحادثة بنجاح', 'Chat restored successfully'],
    ['محفوظة في Keep', 'Saved in Keep'],
    ['إرسال الرسالة', 'Send message'],
];

for (const [ar, en] of translations) {
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
    
    // Replace placeholder attributes
    const regexPlaceholder = new RegExp(`placeholder="${ar}"`, 'g');
    content = content.replace(regexPlaceholder, `placeholder={language === 'ar' ? '${ar}' : '${en}'}`);

    // Replace titles
    const regexTitle = new RegExp(`title="${ar}"`, 'g');
    content = content.replace(regexTitle, `title={language === 'ar' ? '${ar}' : '${en}'}`);
    
    // Replace strings inside single or double quotes for simple assignments
    const regexStr1 = new RegExp(`'${ar}'`, 'g');
    content = content.replace(regexStr1, `(language === 'ar' ? '${ar}' : '${en}')`);
    
    const regexStr2 = new RegExp(`"${ar}"`, 'g');
    content = content.replace(regexStr2, `(language === 'ar' ? "${ar}" : "${en}")`);
}

fs.writeFileSync('src/components/Chat.tsx', content);
console.log('Chat translated');
