const fs = require('fs');

// 1. App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(/if \(!isAuthenticated\) \{\s*return <Auth onAuth=\{handleAuth\} \/>;\s*\}/, '');

const mainRegex = /(<main className="flex-1 overflow-hidden relative z-0">)([\s\S]*?)(<\/main>)/;
const match = appCode.match(mainRegex);
if (match) {
  const newMain = `${match[1]}
        {(!isAuthenticated && activeTab !== 'chat') ? (
          <div className="flex flex-col h-full w-full overflow-y-auto">
             <Auth onAuth={handleAuth} />
          </div>
        ) : (
          <>
${match[2]}
          </>
        )}
${match[3]}`;
  appCode = appCode.replace(mainRegex, newMain);
}
fs.writeFileSync('src/App.tsx', appCode);

// 2. Auth.tsx
let authCode = fs.readFileSync('src/components/Auth.tsx', 'utf8');
authCode = authCode.replace(/min-h-screen/, 'min-h-full');
fs.writeFileSync('src/components/Auth.tsx', authCode);

