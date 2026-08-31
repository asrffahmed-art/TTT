import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowLeft, ArrowRight, Loader2, Globe, ShieldCheck, Eye, EyeOff, ChevronDown, X } from 'lucide-react';
import { useAppTheme } from '../lib/themeService';
import { useLanguage } from '../lib/LanguageContext';
import { signInWithGoogle, registerWithEmail, loginWithEmail, saveUserConsent } from '../lib/firebase';
import { requestNotificationPermission } from '../services/notificationService';
import { TermsAndPrivacyModal } from './TermsAndPrivacyModal';
import { OtpVerificationView } from './OtpVerificationView';
import { sendOtp, getDeviceId, getDeviceInfo } from '../lib/otpService';

interface AuthProps {
  onAuth: () => void;
  onClose?: () => void;
}

export function Auth({ onAuth, onClose }: AuthProps) {
  const theme = useAppTheme();
  const { t, language } = useLanguage();
  const isAr = language === 'ar';

  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(isAr ? 'الجمهورية المصرية' : 'Egypt');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
  } | null>(null);

  const [pendingOtp, setPendingOtp] = useState<{
    purpose: 'register' | 'login_new_device';
    email: string;
    name?: string;
    password?: string;
    country?: string;
    userId?: string;
    previewOtp?: string;
  } | null>(null);

  // Check if current user is logged into Firebase Auth but hasn't completed their Firestore document
  useEffect(() => {
    const checkCurrentAuth = async () => {
      if (auth.currentUser && !pendingOtp) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const userData = userDoc.exists() ? (userDoc.data() as any) : null;
          if (userDoc.exists() && userData?.termsAccepted && userData?.country) {
            onAuth();
          } else {
            setPendingGoogleUser({
              uid: auth.currentUser.uid,
              email: auth.currentUser.email || '',
              displayName: auth.currentUser.displayName || t('authGoogleGuest', 'مستخدم جوجل'),
              photoURL: auth.currentUser.photoURL || ''
            });
          }
        } catch (err) {
          console.warn('Error checking user profile in Firestore:', err);
        }
      }
    };
    checkCurrentAuth();
  }, []);

  const handleCancelGoogleOnboarding = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Signout note:', err);
    }
    setPendingGoogleUser(null);
    setAuthError(null);
  };

  const handleCancelOtp = async () => {
    if (pendingOtp?.purpose === 'login_new_device') {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Signout on OTP cancel:', err);
      }
    }
    setPendingOtp(null);
    setAuthError(null);
  };

  // Ask for notification permission the moment login completes, so the browser
  // prompt appears right after signing in (fire-and-forget, never blocks login).
  const triggerNotificationPermission = (uid?: string) => {
    if (!uid) return;
    requestNotificationPermission(uid).catch((e) => console.warn('Notification permission request note:', e));
  };

  const handleOtpVerified = async () => {
    if (!pendingOtp) return;
    setIsLoading(true);
    setAuthError(null);

    try {
      const currentDeviceInfo = getDeviceInfo();

      if (pendingOtp.purpose === 'register' && pendingOtp.password) {
        // 1. Create account in Firebase Auth
        const user = await registerWithEmail(pendingOtp.email, pendingOtp.password, pendingOtp.name || '');
        
        // 2. Save full user record into Firestore database
        await setDoc(doc(db, 'users', user.uid), {
          name: pendingOtp.name || '',
          email: user.email || pendingOtp.email,
          country: pendingOtp.country || selectedCountry,
          plan: 'free',
          authType: 'email',
          emailVerified: true,
          trustedDevices: [{
            deviceId: currentDeviceInfo.deviceId,
            deviceName: currentDeviceInfo.name,
            browser: currentDeviceInfo.browser,
            os: currentDeviceInfo.os,
            verifiedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString()
          }],
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        }, { merge: true });

        await saveUserConsent(user.uid);
        localStorage.setItem('app-user-id', user.uid);
        localStorage.setItem('app-user-name', pendingOtp.name || '');
        localStorage.setItem('app-user-email', user.email || pendingOtp.email);
        localStorage.setItem('app-user-country', pendingOtp.country || selectedCountry);
        localStorage.setItem('app-terms-accepted', 'true');
        localStorage.setItem('app-user-auth-type', 'email');
        triggerNotificationPermission(user.uid);
        setPendingOtp(null);
        onAuth();
      } else if (pendingOtp.purpose === 'login_new_device') {
        const uid = pendingOtp.userId || auth.currentUser?.uid;
        if (uid) {
          const userDocRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userDocRef);
          const userData = userSnap.exists() ? (userSnap.data() as any) : null;
          
          const existingDevices: any[] = userData?.trustedDevices || [];
          const updatedDevices = existingDevices.filter((d: any) => d.deviceId !== currentDeviceInfo.deviceId);
          updatedDevices.push({
            deviceId: currentDeviceInfo.deviceId,
            deviceName: currentDeviceInfo.name,
            browser: currentDeviceInfo.browser,
            os: currentDeviceInfo.os,
            verifiedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString()
          });

          await setDoc(userDocRef, {
            trustedDevices: updatedDevices,
            emailVerified: true,
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await saveUserConsent(uid);
          localStorage.setItem('app-user-id', uid);
          localStorage.setItem('app-user-name', userData?.name || auth.currentUser?.displayName || pendingOtp.email.split('@')[0]);
          localStorage.setItem('app-user-email', auth.currentUser?.email || pendingOtp.email);
          if (userData?.country) localStorage.setItem('app-user-country', userData.country);
          if (userData?.avatar || auth.currentUser?.photoURL) localStorage.setItem('app-user-avatar', userData?.avatar || auth.currentUser?.photoURL);
          localStorage.setItem('app-terms-accepted', 'true');
          localStorage.setItem('app-user-auth-type', 'email');
        }
        triggerNotificationPermission(uid || auth.currentUser?.uid);
        setPendingOtp(null);
        onAuth();
      }
    } catch (err: any) {
      console.error('Error completing OTP verification:', err);
      setAuthError(err?.message || 'حدث خطأ أثناء استكمال عملية التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(t('authInvalidEmail', 'يرجى إدخال بريد إلكتروني صالح'));
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setAuthError(t('authWeakPassword', 'كلمة المرور يجب أن تتكون من 6 أحرف أو أكثر'));
      return;
    }

    if (!isLogin && !nameInput.trim()) {
      setAuthError(t('authEnterFullName', 'يرجى إدخال الاسم الكامل'));
      return;
    }

    if (!isLogin && !agreedToTerms) {
      setAuthError(t('authMustAgreeTerms', 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.'));
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // 1. Authenticate with credentials
        const user = await loginWithEmail(cleanEmail, passwordInput);
        
        // 2. Query Firestore to verify device trust status
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? (userSnap.data() as any) : null;
        
        const currentDeviceId = getDeviceId();
        const trustedDevices: any[] = userData?.trustedDevices || [];
        const isAlreadyTrusted = trustedDevices.some(d => d.deviceId === currentDeviceId);

        if (isAlreadyTrusted) {
          // Device is verified -> update last used and proceed directly
          const updatedDevices = trustedDevices.map(d => 
            d.deviceId === currentDeviceId ? { ...d, lastUsedAt: new Date().toISOString() } : d
          );
          await setDoc(userDocRef, {
            trustedDevices: updatedDevices,
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await saveUserConsent(user.uid);
          localStorage.setItem('app-user-id', user.uid);
          localStorage.setItem('app-user-name', userData?.name || user.displayName || cleanEmail.split('@')[0]);
          localStorage.setItem('app-user-email', user.email || cleanEmail);
          if (userData?.country) localStorage.setItem('app-user-country', userData.country);
          if (userData?.avatar || user.photoURL) localStorage.setItem('app-user-avatar', userData?.avatar || user.photoURL);
          localStorage.setItem('app-terms-accepted', 'true');
          localStorage.setItem('app-user-auth-type', 'email');
          triggerNotificationPermission(user.uid);
          onAuth();
        } else {
          // New device or first login from this browser -> Send OTP code
          const sendResult = await sendOtp(cleanEmail, 'login_new_device', userData?.name || user.displayName || cleanEmail.split('@')[0]);
          if (!sendResult.success) {
            setAuthError(sendResult.error || 'تعذر إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
            await signOut(auth);
            setIsLoading(false);
            return;
          }

          setPendingOtp({
            purpose: 'login_new_device',
            email: cleanEmail,
            userId: user.uid,
            name: userData?.name || user.displayName,
            previewOtp: sendResult.previewOtp
          });
        }
      } else {
        // Registering a new account -> send OTP to confirm email
        const sendResult = await sendOtp(cleanEmail, 'register', nameInput.trim());
        if (!sendResult.success) {
          setAuthError(sendResult.error || 'تعذر إرسال رمز التحقق. يرجى التأكد من البريد والمحاولة ثانية.');
          setIsLoading(false);
          return;
        }

        setPendingOtp({
          purpose: 'register',
          email: cleanEmail,
          name: nameInput.trim(),
          password: passwordInput,
          country: selectedCountry,
          previewOtp: sendResult.previewOtp
        });
      }
    } catch (err: any) {
      console.warn('THOTH Email Auth note:', err?.code || err?.message);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setAuthError(t('authEmailInUse', 'البريد الإلكتروني مستخدم بالفعل. يمكنك تسجيل الدخول.'));
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError(t('authInvalidCredentials', 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.'));
      } else if (code === 'auth/weak-password') {
        setAuthError(t('authWeakPassword', 'كلمة المرور ضعيفة. يجب أن تتكون من 6 أحرف أو أكثر.'));
      } else {
        setAuthError(t('authServerUnavailable', 'تعذر الاتصال بخادم الحسابات. يرجى المحاولة لاحقاً.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      const userName = user.displayName || t('authGoogleGuest', 'مستخدم جوجل');
      const userAvatar = user.photoURL || '';

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? (userDoc.data() as any) : null;

      // If user document already exists with country and terms accepted, log them in directly
      if (userDoc.exists() && userData?.termsAccepted && userData?.country) {
        await setDoc(doc(db, 'users', user.uid), {
          lastLoginAt: new Date().toISOString()
        }, { merge: true });

        await saveUserConsent(user.uid);
        localStorage.setItem('app-user-id', user.uid);
        localStorage.setItem('app-user-name', userData.name || userName);
        localStorage.setItem('app-user-email', user.email || '');
        localStorage.setItem('app-user-country', userData.country);
        localStorage.setItem('app-terms-accepted', 'true');
        if (userData.avatar || userAvatar) {
          localStorage.setItem('app-user-avatar', userData.avatar || userAvatar);
        }
        localStorage.setItem('app-user-auth-type', 'google');
        triggerNotificationPermission(user.uid);
        onAuth();
      } else {
        // New Google account (or incomplete onboarding) -> Prompt them to choose Country and accept Terms
        setPendingGoogleUser({
          uid: user.uid,
          email: user.email || '',
          displayName: userName,
          photoURL: userAvatar
        });
        setAgreedToTerms(false);
      }
    } catch (err: any) {
      console.warn('THOTH Sign-In note:', err?.code || err?.message);
      const errMsg = err?.message || '';
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'domain';
        setAuthError(t('authUnauthorizedDomain', `النطاق الحالي (${currentDomain}) غير معتمد لتسجيل الدخول في مشروع Firebase الخاص بك. يرجى إضافته إلى قائمة "Authorized Domains" في لوحة تحكم Firebase (Authentication -> Settings -> Authorized domains).`));
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError(t('authOperationNotAllowed', 'تسجيل الدخول عبر Google غير مفعّل في مشروع Firebase الخاص بك. يرجى تفعيله من لوحة تحكم Firebase (Authentication -> Sign-in method -> Google).'));
      } else if (code === 'auth/popup-blocked') {
        setAuthError(t('authPopupBlocked', 'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع وإعادة المحاولة.'));
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-disabled') {
        setAuthError(t('authInvalidCredentials', 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.'));
      } else if (errMsg.includes('access_denied') || errMsg.includes('403') || code === 'auth/access-denied' || errMsg.includes('popup-closed')) {
        setAuthError(t('authPopupClosed', 'تم إغلاق النافذة أو تعذر تأكيد حسابك.'));
      } else {
        setAuthError(t('authServerUnavailable', 'تعذر تسجيل الدخول السريع. يرجى التأكد من تفعيل Google في خيارات Firebase أو استخدام البريد الإلكتروني.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;
    setAuthError(null);

    if (!agreedToTerms) {
      setAuthError(t('authMustAgreeTerms', 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.'));
      return;
    }

    setIsLoading(true);
    try {
      const { uid, email, displayName, photoURL } = pendingGoogleUser;
      await setDoc(doc(db, 'users', uid), {
        name: displayName,
        email: email,
        country: selectedCountry,
        avatar: photoURL,
        plan: 'free',
        authType: 'google',
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }, { merge: true });

      await saveUserConsent(uid);
      localStorage.setItem('app-user-id', uid);
      localStorage.setItem('app-user-name', displayName);
      localStorage.setItem('app-user-email', email);
      localStorage.setItem('app-user-country', selectedCountry);
      localStorage.setItem('app-terms-accepted', 'true');
      if (photoURL) localStorage.setItem('app-user-avatar', photoURL);
      localStorage.setItem('app-user-auth-type', 'google');

      triggerNotificationPermission(uid);
      onAuth();
    } catch (err: any) {
      console.error('Error completing Google registration:', err);
      setAuthError(t('authServerUnavailable', 'حدث خطأ أثناء حفظ بيانات الحساب. يرجى المحاولة لاحقاً.'));
    } finally {
      setIsLoading(false);
    }
  };

  const countryList = isAr ? [
    { value: 'الجمهورية المصرية', label: '🇪🇬 الجمهورية المصرية' },
    { value: 'المملكة العربية السعودية', label: '🇸🇦 المملكة العربية السعودية' },
    { value: 'الإمارات العربية المتحدة', label: '🇦🇪 الإمارات العربية المتحدة' },
    { value: 'تركيا', label: '🇹🇷 تركيا' },
    { value: 'ألمانيا', label: '🇩🇪 ألمانيا' },
    { value: 'فرنسا', label: '🇫🇷 فرنسا' },
    { value: 'إيطاليا', label: '🇮🇹 إيطاليا' },
    { value: 'إسبانيا', label: '🇪🇸 إسبانيا' },
    { value: 'المملكة المتحدة', label: '🇬🇧 المملكة المتحدة' },
    { value: 'هولندا', label: '🇳🇱 هولندا' },
    { value: 'سويسرا', label: '🇨🇭 سويسرا' },
    { value: 'السويد', label: '🇸🇪 السويد' },
    { value: 'النرويج', label: '🇳🇴 النرويج' },
    { value: 'الدنمارك', label: '🇩🇰 الدنمارك' },
    { value: 'بلجيكا', label: '🇧🇪 بلجيكا' },
    { value: 'النمسا', label: '🇦🇹 النمسا' },
    { value: 'بولندا', label: '🇵🇱 بولندا' },
    { value: 'اليونان', label: '🇬🇷 اليونان' },
    { value: 'البرتغال', label: '🇵🇹 البرتغال' },
    { value: 'أيرلندا', label: '🇮🇪 أيرلندا' },
    { value: 'فنلندا', label: '🇫🇮 فنلندا' },
    { value: 'الولايات المتحدة الأمريكية', label: '🇺🇸 الولايات المتحدة الأمريكية' },
    { value: 'كندا', label: '🇨🇦 كندا' },
    { value: 'الصين', label: '🇨🇳 الصين' },
    { value: 'اليابان', label: '🇯🇵 اليابان' },
    { value: 'كوريا الجنوبية', label: '🇰🇷 كوريا الجنوبية' },
    { value: 'الهند', label: '🇮🇳 الهند' },
    { value: 'البرازيل', label: '🇧🇷 البرازيل' },
    { value: 'أستراليا', label: '🇦🇺 أستراليا' },
    { value: 'سنغافورة', label: '🇸🇬 سنغافورة' },
    { value: 'دولة أخرى', label: '🌐 دولة أخرى' },
  ] : [
    { value: 'Egypt', label: '🇪🇬 Egypt' },
    { value: 'Saudi Arabia', label: '🇸🇦 Saudi Arabia' },
    { value: 'United Arab Emirates', label: '🇦🇪 United Arab Emirates' },
    { value: 'Turkey', label: '🇹🇷 Turkey' },
    { value: 'Germany', label: '🇩🇪 Germany' },
    { value: 'France', label: '🇫🇷 France' },
    { value: 'Italy', label: '🇮🇹 Italy' },
    { value: 'Spain', label: '🇪🇸 Spain' },
    { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
    { value: 'Netherlands', label: '🇳🇱 Netherlands' },
    { value: 'Switzerland', label: '🇨🇭 Switzerland' },
    { value: 'Sweden', label: '🇸🇪 Sweden' },
    { value: 'Norway', label: '🇳🇴 Norway' },
    { value: 'Denmark', label: '🇩🇰 Denmark' },
    { value: 'Belgium', label: '🇧🇪 Belgium' },
    { value: 'Austria', label: '🇦🇹 Austria' },
    { value: 'Poland', label: '🇵🇱 Poland' },
    { value: 'Greece', label: '🇬🇷 Greece' },
    { value: 'Portugal', label: '🇵🇹 Portugal' },
    { value: 'Ireland', label: '🇮🇪 Ireland' },
    { value: 'Finland', label: '🇫🇮 Finland' },
    { value: 'United States', label: '🇺🇸 United States' },
    { value: 'Canada', label: '🇨🇦 Canada' },
    { value: 'China', label: '🇨🇳 China' },
    { value: 'Japan', label: '🇯🇵 Japan' },
    { value: 'South Korea', label: '🇰🇷 South Korea' },
    { value: 'India', label: '🇮🇳 India' },
    { value: 'Brazil', label: '🇧🇷 Brazil' },
    { value: 'Australia', label: '🇦🇺 Australia' },
    { value: 'Singapore', label: '🇸🇬 Singapore' },
    { value: 'Other Country', label: '🌐 Other Country' },
  ];

  return (
    <div className="flex flex-col w-full min-h-full items-center justify-center px-3 sm:px-6 pt-24 pb-28 relative overflow-y-auto bg-gradient-to-br from-[#0b0f19] via-[#121526] to-[#0a0d18]" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full ${theme.ambientLight1} blur-[120px] mix-blend-screen opacity-15`}></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-screen opacity-15"></div>
      </div>

      <div className="w-full max-w-md z-10 flex flex-col items-center py-4 relative">
        {onClose && (
          <button
            onClick={() => {
              if (pendingOtp) {
                handleCancelOtp();
              } else if (pendingGoogleUser) {
                handleCancelGoogleOnboarding();
              } else {
                onClose();
              }
            }}
            className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10`}
            title={t('authBack', 'الرجوع')}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {pendingOtp ? (
          <OtpVerificationView
            email={pendingOtp.email}
            purpose={pendingOtp.purpose}
            userId={pendingOtp.userId}
            initialPreviewOtp={pendingOtp.previewOtp}
            onVerified={handleOtpVerified}
            onBack={handleCancelOtp}
          />
        ) : pendingGoogleUser ? (
          /* Google Onboarding Form for New Users */
          <>
            <div className="text-center mb-4 sm:mb-6 w-full">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
                {t('authCompleteGoogleTitle', 'استكمال بيانات الحساب')}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/60">
                {t('authCompleteGoogleSubtitle', 'يرجى اختيار بلدك والموافقة على الشروط للمتابعة إلى التطبيق')}
              </p>
            </div>

            <div className="w-full bg-[#141824]/80 backdrop-blur-xl p-4 sm:p-7 rounded-2xl sm:rounded-[28px] shadow-2xl border border-white/10 relative">
              {/* Google Account Summary Card */}
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl mb-4">
                {pendingGoogleUser.photoURL ? (
                  <img
                    src={pendingGoogleUser.photoURL}
                    alt={pendingGoogleUser.displayName}
                    className="w-10 h-10 rounded-full border border-white/20 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600/50 border border-indigo-400/30 flex items-center justify-center text-white font-bold shrink-0">
                    {pendingGoogleUser.displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                    <span>{pendingGoogleUser.displayName}</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="text-[11px] text-white/50 truncate font-mono" dir="ltr">
                    {pendingGoogleUser.email}
                  </div>
                </div>
              </div>

              <form className="flex flex-col gap-3 sm:gap-4 relative z-10" onSubmit={handleCompleteGoogleRegistration}>
                {/* Country Selection */}
                <div className="flex flex-col gap-1 sm:gap-1.5 group">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="google-country">
                    {t('authCountryRegion', 'البلد / المنطقة')}
                  </label>
                  <div className={`relative flex items-center bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus-within:${theme.borderAccent} focus-within:bg-white/10 transition-all shadow-md`}>
                    <Globe className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-white/40 group-focus-within:${theme.textAccent} transition-colors pointer-events-none`} />
                    <select 
                      id="google-country" 
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className={`w-full bg-transparent text-white font-medium py-2.5 sm:py-3.5 ${isAr ? 'pl-8 pr-10 text-right' : 'pr-8 pl-10 text-left'} outline-none cursor-pointer text-xs sm:text-sm appearance-none [&>option]:bg-[#141824] [&>option]:text-white`}
                    >
                      {countryList.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute ${isAr ? 'left-3.5' : 'right-3.5'} w-4 h-4 text-white/40 pointer-events-none`} />
                  </div>
                </div>

                {/* Terms Consent Box */}
                <div className="flex items-start gap-2.5 p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all group">
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      id="googleAgreeTerms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-white/30 bg-black/40 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500 transition-transform group-hover:scale-105"
                    />
                  </div>
                  <label htmlFor="googleAgreeTerms" className="text-[11px] sm:text-xs text-white/85 leading-snug cursor-pointer select-none">
                    {t('authAgreeTerms', 'أوافق على ')}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="font-bold text-white hover:text-white/80 underline underline-offset-2 inline-flex items-center gap-1 mx-0.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                      <span>{t('authTermsAndPrivacy', 'شروط الخدمة والخصوصية')}</span>
                    </button>
                    {t('authTermsSuffix', 'شاملة الإعلانات غير الشخصية (Zero-PII) ومشاركة التفاعلات لتطوير النماذج كبند إجباري لاستخدام الخدمة.')}
                  </label>
                </div>

                {authError && (
                  <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs text-center font-bold">
                    {authError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || !agreedToTerms}
                  className={`mt-1 w-full ${theme.btnPrimary} font-bold py-3 sm:py-3.5 px-5 rounded-xl sm:rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 text-xs sm:text-sm cursor-pointer`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{t('authCompleteContinueBtn', 'إتمام التسجيل والبدء')}</span>
                      {isAr ? (
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform" />
                      ) : (
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:translate-x-1 transition-transform" />
                      )}
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={handleCancelGoogleOnboarding}
                className="text-xs text-white/50 hover:text-white transition-colors underline cursor-pointer"
              >
                {t('authChangeAccount', 'تسجيل بحساب آخر')}
              </button>
            </div>
          </>
        ) : (
          /* Standard Login & Register Forms */
          <>
            <div className="text-center mb-4 sm:mb-6 w-full">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
                {isLogin ? t('authWelcomeBack', 'مرحباً بعودتك') : t('authCreateAccount', 'إنشاء حساب جديد')}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/60">
                {isLogin ? t('authLoginSubtitle', 'أدخل بياناتك للمتابعة إلى التطبيق') : t('authRegisterSubtitle', 'انضم إلينا واستكشف كافة الميزات الذكية')}
              </p>
            </div>

            <div className="w-full bg-[#141824]/80 backdrop-blur-xl p-4 sm:p-7 rounded-2xl sm:rounded-[28px] shadow-2xl border border-white/10 relative">
              <form className="flex flex-col gap-3 sm:gap-4 relative z-10" onSubmit={handleFormSubmit}>
                {!isLogin && (
                  <>
                    <div className="flex flex-col gap-1 sm:gap-1.5 group">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="name">
                        {t('authFullName', 'الاسم الكامل')}
                      </label>
                      <div className={`relative flex items-center bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus-within:${theme.borderAccent} focus-within:bg-white/10 transition-all shadow-md`}>
                        <User className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-white/40 group-focus-within:${theme.textAccent} transition-colors`} />
                        <input 
                          type="text" 
                          id="name" 
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className={`w-full bg-transparent text-white font-medium py-2.5 sm:py-3.5 ${isAr ? 'pl-3 pr-10 text-right' : 'pr-3 pl-10 text-left'} outline-none placeholder:text-white/30 text-xs sm:text-sm`} 
                          placeholder={t('authFullNamePlaceholder', 'أدخل اسمك الكامل')}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:gap-1.5 group">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="country">
                        {t('authCountryRegion', 'البلد / المنطقة')}
                      </label>
                      <div className={`relative flex items-center bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus-within:${theme.borderAccent} focus-within:bg-white/10 transition-all shadow-md`}>
                        <Globe className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-white/40 group-focus-within:${theme.textAccent} transition-colors pointer-events-none`} />
                        <select 
                          id="country" 
                          value={selectedCountry}
                          onChange={(e) => setSelectedCountry(e.target.value)}
                          className={`w-full bg-transparent text-white font-medium py-2.5 sm:py-3.5 ${isAr ? 'pl-8 pr-10 text-right' : 'pr-8 pl-10 text-left'} outline-none cursor-pointer text-xs sm:text-sm appearance-none [&>option]:bg-[#141824] [&>option]:text-white`}
                        >
                          {countryList.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute ${isAr ? 'left-3.5' : 'right-3.5'} w-4 h-4 text-white/40 pointer-events-none`} />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1 sm:gap-1.5 group">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="email">
                    {t('authEmail', 'البريد الإلكتروني')}
                  </label>
                  <div className={`relative flex items-center bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus-within:${theme.borderAccent} focus-within:bg-white/10 transition-all shadow-md`}>
                    <Mail className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-white/40 group-focus-within:${theme.textAccent} transition-colors`} />
                    <input 
                      type="email" 
                      id="email" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      dir="ltr"
                      className={`w-full bg-transparent text-white font-medium py-2.5 sm:py-3.5 ${isAr ? 'pl-3 pr-10' : 'pr-3 pl-10'} text-left outline-none placeholder:text-white/30 text-xs sm:text-sm`} 
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 sm:gap-1.5 group">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/50" htmlFor="password">
                      {t('authPassword', 'كلمة المرور')}
                    </label>
                  </div>
                  <div className={`relative flex items-center bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus-within:${theme.borderAccent} focus-within:bg-white/10 transition-all shadow-md`}>
                    <Lock className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} w-4 h-4 text-white/40 group-focus-within:${theme.textAccent} transition-colors`} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      dir="ltr"
                      className={`w-full bg-transparent text-white font-medium py-2.5 sm:py-3.5 ${isAr ? 'pl-10 pr-10' : 'pl-10 pr-10'} text-left outline-none placeholder:text-white/30 text-xs sm:text-sm tracking-[0.2em]`} 
                      placeholder="••••••••"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isAr ? 'left-3.5' : 'right-3.5'} text-white/40 hover:text-white transition-colors`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Consent Box */}
                {!isLogin && (
                  <div className="flex items-start gap-2.5 p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all group">
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-white/30 bg-black/40 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500 transition-transform group-hover:scale-105"
                      />
                    </div>
                    <label htmlFor="agreeTerms" className="text-[11px] sm:text-xs text-white/85 leading-snug cursor-pointer select-none">
                      {t('authAgreeTerms', 'أوافق على ')}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="font-bold text-white hover:text-white/80 underline underline-offset-2 inline-flex items-center gap-1 mx-0.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                        <span>{t('authTermsAndPrivacy', 'شروط الخدمة والخصوصية')}</span>
                      </button>
                      {t('authTermsSuffix', 'شاملة الإعلانات غير الشخصية (Zero-PII) ومشاركة التفاعلات لتطوير النماذج كبند إجباري لاستخدام الخدمة.')}
                    </label>
                  </div>
                )}

                {authError && (
                  <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs text-center font-bold">
                    {authError}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading || (!isLogin && !agreedToTerms)}
                  className={`mt-1 w-full ${theme.btnPrimary} font-bold py-3 sm:py-3.5 px-5 rounded-xl sm:rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 text-xs sm:text-sm cursor-pointer`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{isLogin ? t('authLoginBtn', 'تسجيل الدخول') : t('authRegisterBtn', 'إنشاء الحساب')}</span>
                      {isAr ? (
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform" />
                      ) : (
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:translate-x-1 transition-transform" />
                      )}
                    </>
                  )}
                </button>
              </form>

              <div className="w-full flex items-center gap-3 my-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {t('authOrContinueWith', 'أو المتابعة عبر')}
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <div className="flex gap-2.5 w-full">
                <button 
                  type="button"
                  onClick={handleGoogleSignIn} 
                  disabled={isLoading}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-md border border-white/20 hover:scale-[1.02] active:scale-95 group disabled:opacity-50 cursor-pointer"
                  title="Google Sign-In"
                >
                  <svg className={`w-4 h-4 ${isAr ? 'ml-1.5' : 'mr-1.5'} shrink-0`} viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
                  <span className="text-xs font-bold truncate">{t('authQuickGoogle', 'تسجيل سريع عبر Google')}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 text-center flex flex-col gap-2">
              <p className="text-xs sm:text-sm text-white/60">
                {isLogin ? t('authNoAccount', 'ليس لديك حساب؟ ') : t('authHaveAccount', 'لديك حساب بالفعل؟ ')}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className={`${theme.textAccent} font-bold hover:underline transition-colors inline-block ${isAr ? 'mr-1' : 'ml-1'} cursor-pointer`}
                >
                  {isLogin ? t('authRegisterBtn', 'إنشاء حساب') : t('authLoginBtn', 'تسجيل الدخول')}
                </button>
              </p>
            </div>
          </>
        )}
      </div>

      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        showAcceptButton={true}
        onAccept={() => {
          setAgreedToTerms(true);
          setShowTermsModal(false);
        }}
      />
    </div>
  );
}

