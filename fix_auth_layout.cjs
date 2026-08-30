const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

code = code.replace(
  /className="flex flex-col w-full min-h-full items-center justify-center p-3 sm:p-6 relative overflow-y-auto bg-gradient-to-br from-\[#0b0f19\] via-\[#121526\] to-\[#0a0d18\]"/,
  'className="flex flex-col w-full min-h-full items-center justify-center px-3 sm:px-6 pt-24 pb-28 relative overflow-y-auto bg-gradient-to-br from-[#0b0f19] via-[#121526] to-[#0a0d18]"'
);

fs.writeFileSync('src/components/Auth.tsx', code);
