const fs = require('fs');
let content = fs.readFileSync('src/components/Chat.tsx', 'utf8');
content = content.replace(
  /      \{\/\* Subscription Overlay Modal when Limit Reached \*\/\}[\s\S]*?      \}\)\}/,
  ""
);
content = content.replace(
  "    if (!check.allowed) {\n      setLimitModalType('voice');\n      return;\n    }",
  "    if (!check.allowed) {\n      if (onNavigate) onNavigate('subscription');\n      return;\n    }"
);
fs.writeFileSync('src/components/Chat.tsx', content);
