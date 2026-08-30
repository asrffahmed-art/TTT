const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<Settings\s+onClose=\{\(\) => setActiveTab\('chat'\)\}\s+onLogout=\{handleLogout\}\s+onOpenSubscription=\{\(\) => setActiveTab\('subscription'\)\}\s+onOpenAdminPanel=\{\(\) => setActiveTab\('admin'\)\}\s*\/>/,
  `<Settings 
            onClose={() => setActiveTab('chat')}
            onLogout={handleLogout} 
            onOpenSubscription={() => setActiveTab('subscription')} 
            onOpenAdminPanel={() => setActiveTab('admin')} 
            onOpenDiscover={() => setActiveTab('discover')}
          />`
);

fs.writeFileSync('src/App.tsx', code);
