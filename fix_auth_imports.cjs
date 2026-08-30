const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

if (!code.includes("import { doc, setDoc, getDoc }")) {
  code = `import { doc, setDoc, getDoc } from 'firebase/firestore';\n` + code;
}
if (!code.includes("import { db }")) {
  code = `import { db } from '../lib/firebase';\n` + code;
}

fs.writeFileSync('src/components/Auth.tsx', code);
