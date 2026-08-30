const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const replacementApp = `
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuth');
        localStorage.removeItem('app-user-auth-type');
        syncUsageFromServer('guest');
        setCurrentUser(null);
      }
`;

appCode = appCode.replace(/\} else \{\n\s*const authType = localStorage\.getItem\('app-user-auth-type'\);\n\s*if \(authType !== 'guest'\) \{\n\s*setIsAuthenticated\(false\);\n\s*localStorage\.removeItem\('isAuth'\);\n\s*\}\n\s*syncUsageFromServer\('guest'\);\n\s*setCurrentUser\(null\);\n\s*\}/m, replacementApp.trim());
appCode = appCode.replace(/\} else \{\s*syncUsageFromServer\('guest'\);\s*setCurrentUser\(null\);\s*\}/, replacementApp.trim());
fs.writeFileSync('src/App.tsx', appCode);

// 2. Remove guest login button from Auth.tsx
let authCode = fs.readFileSync('src/components/Auth.tsx', 'utf8');

authCode = authCode.replace(/<button[^>]*onClick=\{handleGuestSignIn\}[^>]*>[\s\S]*?<\/button>/g, '');
authCode = authCode.replace(/const handleGuestSignIn = async \(\) => \{[\s\S]*?onAuth\(\);\s*\};/, '');

fs.writeFileSync('src/components/Auth.tsx', authCode);

