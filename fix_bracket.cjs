const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

code = code.replace(/onAuth\(\);\n      \n    \} catch/g, "onAuth();\n      }\n    } catch");

fs.writeFileSync('src/components/Auth.tsx', code);
