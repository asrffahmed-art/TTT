const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

const replacement = `
      if (isLogin) {
        const user = await loginWithEmail(emailInput.trim(), passwordInput);
        await saveUserConsent(user.uid);
        localStorage.setItem('app-user-name', user.displayName || emailInput.split('@')[0]);
        localStorage.setItem('app-user-email', user.email || emailInput);
        localStorage.setItem('app-terms-accepted', 'true');
        localStorage.setItem('app-user-auth-type', 'email');
        onAuth();
      } else {
        if (!nameInput.trim()) {
          setAuthError('يرجى إدخال الاسم الكامل');
          setIsLoading(false);
          return;
        }
        const user = await registerWithEmail(emailInput.trim(), passwordInput, nameInput.trim());
        
        // Save full profile to Firestore
        const { doc, setDoc } = require('firebase/firestore');
        const { db } = require('../lib/firebase');
        await setDoc(doc(db, 'users', user.uid), {
          name: nameInput.trim(),
          email: user.email || emailInput,
          country: selectedCountry,
          plan: 'free',
          authType: 'email',
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        localStorage.setItem('app-user-name', nameInput.trim());
        localStorage.setItem('app-user-email', user.email || emailInput);
        localStorage.setItem('app-user-country', selectedCountry);
        localStorage.setItem('app-terms-accepted', 'true');
        localStorage.setItem('app-user-auth-type', 'email');
        onAuth();
      }
`;

code = code.replace(/if \(isLogin\) \{[\s\S]*?onAuth\(\);\n      \}/, replacement.trim());

const googleReplacement = `
      const user = await signInWithGoogle();
      const userName = user.displayName || 'مستخدم جوجل';
      const userCountry = selectedCountry;
      const userAvatar = user.photoURL || '';

      const { doc, setDoc, getDoc } = require('firebase/firestore');
      const { db } = require('../lib/firebase');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: userName,
          email: user.email,
          country: userCountry,
          avatar: userAvatar,
          plan: 'free',
          authType: 'google',
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });
      }

      await saveUserConsent(user.uid);
      localStorage.setItem('app-user-name', userName);
`;

code = code.replace(/const user = await signInWithGoogle\(\);[\s\S]*?localStorage\.setItem\('app-user-name', userName\);/, googleReplacement.trim());

fs.writeFileSync('src/components/Auth.tsx', code);
