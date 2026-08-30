const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const regex = /\{onOpenDiscover && \([\s\S]*?<\/div>\s*<\/>\s*\)\}\s*\{onOpenSubscription && \([\s\S]*?<\/div>\s*<\/>\s*\)\}/;

const match = code.match(regex);
if (match) {
  const fullText = match[0];
  const parts = fullText.split(/\{onOpenSubscription && \(/);
  const part1 = parts[0];
  const part2 = "{onOpenSubscription && (" + parts[1];
  code = code.replace(fullText, part2 + "\n" + part1);
  fs.writeFileSync('src/components/Settings.tsx', code);
  console.log("Successfully reverted!");
} else {
  console.log("Not found.");
}
