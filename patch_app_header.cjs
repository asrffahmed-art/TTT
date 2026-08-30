const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<Header \n\s*title=\{getTitle\(\)\}/, "<Header \n              isAuthenticated={isAuthenticated}\n              title={getTitle()}");

fs.writeFileSync('src/App.tsx', code);
