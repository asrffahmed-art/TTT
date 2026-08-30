const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf8');
const modalStart = "      {/* Subscription Overlay Modal when Limit Reached */}";
const idx = content.indexOf(modalStart);
if (idx !== -1) {
  const endIdx = content.indexOf("    </div>\n  );\n}");
  if (endIdx !== -1) {
    content = content.substring(0, idx) + content.substring(endIdx);
  }
}
fs.writeFileSync('src/components/Chat.tsx', content);
