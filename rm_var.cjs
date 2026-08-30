const fs = require('fs');
let content = fs.readFileSync('src/components/LiveTranslate.tsx', 'utf8');
content = content.replace("  const [showSubModal, setShowSubModal] = useState(false);\n", "");
fs.writeFileSync('src/components/LiveTranslate.tsx', content);
