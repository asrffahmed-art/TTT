const fs = require('fs');

// 1. Fix App.tsx onAuthStateChanged to properly log out if no user
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

const replacementApp = `
      } else {
        const authType = localStorage.getItem('app-user-auth-type');
        if (authType !== 'guest') {
          setIsAuthenticated(false);
          localStorage.removeItem('isAuth');
        }
        syncUsageFromServer('guest');
        setCurrentUser(null);
      }
`;

appCode = appCode.replace(/\} else \{\s*syncUsageFromServer\('guest'\);\s*setCurrentUser\(null\);\s*\}/, replacementApp.trim());
fs.writeFileSync('src/App.tsx', appCode);

