const fs = require('fs');
const path = require('path');

const arabicRegex = /([\u0600-\u06FF]+(?:[\s\d\p{P}]+[\u0600-\u06FF]+)*)/gu;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const strings = new Set();
walkDir('./src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = arabicRegex.exec(content)) !== null) {
            strings.add(match[1].trim());
        }
    }
});

fs.writeFileSync('arabic_strings.txt', Array.from(strings).join('\n'));
