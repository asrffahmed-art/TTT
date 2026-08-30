const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

code = code.replace(
  /<div className="fixed bottom-16 left-0 w-full z-40 bg-gradient-to-t from-\[#0d0f17\] via-\[#0d0f17\]\/95 to-transparent pt-4 pb-2 px-3 sm:px-6 pointer-events-none">/,
  `<div className={\`fixed \${isAuth ? 'bottom-16' : 'bottom-0 pb-4'} left-0 w-full z-40 bg-gradient-to-t from-[#0d0f17] via-[#0d0f17]/95 to-transparent pt-4 px-3 sm:px-6 pointer-events-none\`}>`
);

fs.writeFileSync('src/components/Chat.tsx', code);
