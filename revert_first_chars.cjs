const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `customApiToken: process.env.CUSTOM_API_TOKEN,`;
const replacement = `customApiToken: maskKey(process.env.CUSTOM_API_TOKEN),`;
code = code.replace(target, replacement);

fs.writeFileSync('server.ts', code);
console.log('Re-masked custom token');
