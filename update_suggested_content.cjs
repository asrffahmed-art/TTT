const fs = require('fs');

// Update GoogleTasks.tsx
let tasksContent = fs.readFileSync('src/components/GoogleTasks.tsx', 'utf8');
tasksContent = tasksContent.replace(
  /title: 'مراجعة خريطة الطريق مع THOTH',[\s\S]*?notes: 'مناقشة خطة العمل والتطوير القادمة',/,
  "title: 'استكشاف إمكانيات THOTH',\n        notes: 'تجربة المحادثة الصوتية المباشرة والمساعد الذكي.',"
);
tasksContent = tasksContent.replace(
  /title: 'إنشاء قائمة المهام اليومية مع المهام',[\s\S]*?notes: 'ربط الحساب ومزامنة المهام التفاعلية',/,
  "title: 'إنشاء قائمة المهام اليومية',\n        notes: 'تنظيم يومك وترتيب أولوياتك بمساعدة الذكاء الاصطناعي.',"
);
fs.writeFileSync('src/components/GoogleTasks.tsx', tasksContent);

// Update KeepNotes.tsx
let keepContent = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');
keepContent = keepContent.replace(
  /content: 'يمكنك حفظ أفكارك، ملخصات المحادثة، وإضافة الملاحظات بطريقة الملاحظات وسلسلة الملاحظات هنا!',/,
  "content: 'يمكنك حفظ أفكارك، ملخصات المحادثة، وتنظيمها بسهولة في مساحة عمل THOTH!',"
);
keepContent = keepContent.replace(
  /tags: \['أفكار', 'الملاحظات'\],/,
  "tags: ['أفكار', 'THOTH Workspace'],"
);
fs.writeFileSync('src/components/KeepNotes.tsx', keepContent);

