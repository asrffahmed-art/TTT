const fs = require('fs');
let content = fs.readFileSync('src/components/LiveTranslate.tsx', 'utf8');
const modalStart = "      {/* Subscription Modal */}";
const idx = content.indexOf(modalStart);
if (idx !== -1) {
  const endIdx = content.indexOf("    </div>\n  );\n}");
  if (endIdx !== -1) {
    content = content.substring(0, idx) + content.substring(endIdx);
  }
}
fs.writeFileSync('src/components/LiveTranslate.tsx', content);
