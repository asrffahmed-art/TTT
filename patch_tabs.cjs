const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /const tabs = \[\s*\{ id: 'chat', label: t\('newChat', 'المحادثة'\), icon: MessageSquare \},/,
  "const tabs = [\n    { id: 'chat', label: t('newChat', 'المحادثة'), icon: MessageSquare },\n    { id: 'discover', label: language === 'ar' ? 'الاستكشاف' : 'Discover', icon: Compass },"
);
fs.writeFileSync('src/App.tsx', code);
