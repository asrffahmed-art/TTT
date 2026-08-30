const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf8');
content = content.replace("  const [limitModalType, setLimitModalType] = useState<'chat' | 'voice' | null>(null);\n", "");
fs.writeFileSync('src/components/Chat.tsx', content);
