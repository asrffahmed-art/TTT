const fs = require('fs');
let content = fs.readFileSync('src/components/Settings.tsx', 'utf8');

// Insert useLanguage hook
if (!content.includes('useLanguage')) {
    content = content.replace("import { updateProfile }", "import { useLanguage } from '../lib/LanguageContext';\nimport { updateProfile }");
    content = content.replace("const theme = useAppTheme();", "const theme = useAppTheme();\n  const { t, language } = useLanguage();");
}

const translations = [
    ['الإعدادات', 'Settings'],
    ['إعدادات الملف الشخصي', 'Profile Settings'],
    ['إعدادات التطبيق', 'App Settings'],
    ['الإشعارات', 'Notifications'],
    ['البيانات والتخزين', 'Data & Storage'],
    ['حول والدعم', 'About & Support'],
    ['تحديث وتعديل بيانات حسابك', 'Update and modify your account details'],
    ['المظهر والواجهة، اللغة', 'Appearance, Interface, Language'],
    ['إدارة تنبيهات النظام', 'Manage system alerts'],
    ['النسخ الاحتياطي ومسح البيانات', 'Backup and clear data'],
    ['الشروط، الخصوصية والمساعدة', 'Terms, Privacy, and Help'],
    ['تسجيل الخروج من الحساب', 'Log out of account'],
    ['تسجيل الخروج', 'Log out'],
    ['تغيير الصورة', 'Change Picture'],
    ['الاسم', 'Name'],
    ['البريد الإلكتروني', 'Email'],
    ['ترقية الخطة', 'Upgrade Plan'],
    ['معلومات عامة', 'General Information'],
    ['تم تطوير المنصة بواسطة مبرمج مصري', 'The platform was developed by an Egyptian programmer'],
    ['لغة المنصة', 'Platform Language'],
    ['تحديث البيانات', 'Update Data'],
    ['حفظ التغييرات', 'Save Changes'],
    ['تخصيص المظهر', 'Appearance Customization'],
    ['مسح جميع البيانات', 'Clear All Data'],
    ['سيتم مسح جميع سجلات المحادثات والملاحظات والبيانات المحلية', 'All chat history, notes, and local data will be deleted'],
    ['مسح الآن', 'Clear Now'],
    ['حجم الخط الأساسي', 'Base Font Size'],
    ['حفظ السجلات تلقائياً', 'Auto-save records'],
    ['المظهر والواجهة', 'Appearance and Interface'],
    ['بيانات الحساب', 'Account Data'],
    ['صغير', 'Small'],
    ['متوسط', 'Medium'],
    ['كبير', 'Large'],
    ['سياسة الخصوصية والشروط', 'Privacy Policy and Terms'],
    ['مطور مصري', 'Egyptian Developer'],
    ['أحمد أشرف حمزة محمد', 'Ahmed Ashraf Hamza Mohamed'],
    ['ترخيص الاستخدام', 'License of Use'],
    ['تفعيل الإشعارات اليومية', 'Enable Daily Notifications'],
    ['وقت الإشعار', 'Notification Time'],
    ['المواضيع المفضلة', 'Favorite Topics'],
    ['ذكاء اصطناعي', 'Artificial Intelligence'],
    ['برمجة', 'Programming'],
    ['تكنولوجيا', 'Technology'],
    ['إشعارات THOTH اليومية', 'THOTH Daily Notifications'],
    ['حفظ الإعدادات', 'Save Settings'],
    ['مسح كافة سجلات وسجلات المحادثات والبيانات', 'Clear all chat logs and data'],
];

for (const [ar, en] of translations) {
    // Replace text inside elements
    const regexText = new RegExp(`>\\s*${ar}\\s*<`, 'g');
    content = content.replace(regexText, `>{language === 'ar' ? '${ar}' : '${en}'}<`);
    
    // Replace placeholder attributes
    const regexPlaceholder = new RegExp(`placeholder="${ar}"`, 'g');
    content = content.replace(regexPlaceholder, `placeholder={language === 'ar' ? '${ar}' : '${en}'}`);

    // Replace titles
    const regexTitle = new RegExp(`title="${ar}"`, 'g');
    content = content.replace(regexTitle, `title={language === 'ar' ? '${ar}' : '${en}'}`);
}

fs.writeFileSync('src/components/Settings.tsx', content);
console.log('Settings translated');
