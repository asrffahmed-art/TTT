const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

const regex = /\} else \{\s*if \(!nameInput\.trim\(\)\) \{\s*setAuthError\('يرجى إدخال الاسم الكامل'\);\s*setIsLoading\(false\);\s*return;\s*\}\s*const user = await registerWithEmail\(emailInput\.trim\(\), passwordInput, nameInput\.trim\(\)\);\s*await saveUserConsent\(user\.uid\);\s*localStorage\.setItem\('app-user-name', nameInput\.trim\(\)\);\s*localStorage\.setItem\('app-user-email', user\.email \|\| emailInput\);\s*localStorage\.setItem\('app-user-country', selectedCountry\);\s*localStorage\.setItem\('app-terms-accepted', 'true'\);\s*localStorage\.setItem\('app-user-auth-type', 'email'\);\s*onAuth\(\);\s*\}/;

code = code.replace(regex, '');

fs.writeFileSync('src/components/Auth.tsx', code);
