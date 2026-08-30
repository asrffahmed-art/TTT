const fs = require('fs');
let code = fs.readFileSync('src/components/Subscription.tsx', 'utf8');

const oldClass = 'className="payment-method-card bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-outline-variant peer-checked:border-primary-container peer-checked:ring-2 peer-checked:ring-primary-container/50 transition-all"';
const newClass = 'className="payment-method-card bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-white/10 peer-checked:border-[#e63946] peer-checked:bg-[#e63946]/10 peer-checked:ring-2 peer-checked:ring-[#e63946]/50 transition-all"';

code = code.replaceAll(oldClass, newClass);

fs.writeFileSync('src/components/Subscription.tsx', code);
