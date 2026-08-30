const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const regex = /\{onOpenSubscription && \([\s\S]*?<\/div>\s*<\/>\s*\)\}\s*\{onOpenDiscover && \([\s\S]*?<\/div>\s*<\/>\s*\)\}/;

const match = code.match(regex);
if (match) {
  const fullText = match[0];
  const parts = fullText.split(/\{onOpenDiscover && \(/);
  const part1 = parts[0];
  const part2 = "{onOpenDiscover && (" + parts[1];
  code = code.replace(fullText, part2 + "\n" + part1);
  fs.writeFileSync('src/components/Settings.tsx', code);
  console.log("Successfully swapped!");
} else {
  console.log("Not found.");
}
