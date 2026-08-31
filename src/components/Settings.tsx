import { Settings as SettingsIcon, User, Palette, Globe, HelpCircle, Info, LogOut, ChevronLeft, ChevronRight, ChevronDown, Edit2, Trash2, X, Check, Camera, Upload, Image as ImageIcon, Crown, Compass, Sparkles, Bell, Send, Clock, CheckSquare, Square, RefreshCw, ShieldCheck, ShieldAlert, HardDrive, Database, AlertTriangle, ArrowUpRight, Save, FileText, Volume2, Loader2, Play, History as HistoryIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../lib/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getUserPlan } from '../lib/subscriptionService';
import { THEMES, getStoredThemeId, setStoredTheme, useAppTheme } from '../lib/themeService';
import { TermsAndPrivacyModal } from './TermsAndPrivacyModal';
import { adTracker } from '../lib/adTrackingService';
import { 
  requestNotificationPermission, 
  getUserNotificationSettings, 
  saveUserNotificationSettings, 
  triggerTestPushNotification, 
  triggerDailyNotificationEngine, 
  getIOSNotificationSupport,
  TOPIC_LABELS, 
  UserNotificationSettings 
} from '../services/notificationService';

interface SettingsProps {
  onOpenDiscover?: () => void;
  onOpenHistory?: () => void;
  onClose: () => void;
  onLogout: () => void;
  onOpenSubscription?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenAuth?: () => void;
}

export function Settings({ onClose, onLogout, onOpenSubscription, onOpenAdminPanel, onOpenDiscover, onOpenHistory, onOpenAuth }: SettingsProps) {
  const [activeThemeId, setActiveThemeId] = useState(getStoredThemeId());
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('thoth_selected_voice') || 'Puck');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useAppTheme();
  const { t, language, setLanguage } = useLanguage();

  // Admin Role State
  const currentUser = auth.currentUser;
  const isAuth = Boolean(currentUser || localStorage.getItem('isAuth') === 'true');
  const adminEmails = ['onq6974@gmail.com'];
  const userEmailActual = (currentUser?.email || localStorage.getItem('app-user-email') || '').toLowerCase();
  const isAdmin = adminEmails.includes(userEmailActual);

  // Notification States
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notifSettings, setNotifSettings] = useState<UserNotificationSettings>({
    dailyEnabled: true,
    time: '09:00',
    topics: ['AI', 'Technology', 'Programming', 'Gaming', 'Business', 'World']
  });
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [engineResult, setEngineResult] = useState<string | null>(null);
  // [iOS-DIAG] Detect the exact iOS push capability once per render.
  // On non-iOS platforms this returns isIOS=false and renders nothing below.
  const iosNotifSupport = getIOSNotificationSupport();

  useEffect(() => {
    if (currentUser) {
      getUserNotificationSettings(currentUser.uid).then(s => setNotifSettings(s));
    }
  }, [currentUser]);

  const handleRequestPermission = async () => {
    if (!currentUser) return;
    showToast('جاري طلب إذن الإشعارات وتسجيل الـ FCM Token...');
    const result = await requestNotificationPermission(currentUser.uid);
    if (result.success && result.token) {
      setFcmToken(result.token);
      setNotificationPermission('granted');
      showToast('تم تفعيل إشعارات Push بنجاح وتحديث الـ Token!');
    } else {
      showToast(result.error || 'فشل تفعيل الإشعارات.');
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  };

  const handleToggleDaily = async (enabled: boolean) => {
    const updated = { ...notifSettings, dailyEnabled: enabled };
    setNotifSettings(updated);
    if (currentUser) {
      // [iOS-FIX] WebKit only shows the permission prompt inside the tap's user
      // gesture. The previous order (Firestore write first, ask later) broke
      // the gesture chain on iOS — the prompt never appeared. Ask FIRST, then
      // persist. Net behavior on Android/Web is identical.
      if (enabled && 'Notification' in window && Notification.permission === 'default') {
        const result = await requestNotificationPermission(currentUser.uid);
        if (result.success && result.token) {
          setFcmToken(result.token);
          setNotificationPermission('granted');
          showToast('تم تفعيل إذن الإشعارات وتحديث الـ Token بنجاح!');
        } else {
          setNotificationPermission('denied');
          showToast(result.error || 'لم يتم منح إذن الإشعارات.');
        }
      }
      await saveUserNotificationSettings(currentUser.uid, { dailyEnabled: enabled });
      showToast(enabled ? 'تم تفعيل استقبال الإشعارات اليومية' : 'تم تعطيل الإشعارات اليومية');
    }
  };

  const handleToggleTopic = async (topicKey: string) => {
    let currentTopics = [...notifSettings.topics];
    if (currentTopics.includes(topicKey)) {
      if (currentTopics.length === 1) {
        showToast('يرجى اختيار موضوع واحد على الأقل.');
        return;
      }
      currentTopics = currentTopics.filter(t => t !== topicKey);
    } else {
      currentTopics.push(topicKey);
    }

    const updated = { ...notifSettings, topics: currentTopics };
    setNotifSettings(updated);
    if (currentUser) {
      await saveUserNotificationSettings(currentUser.uid, { topics: currentTopics });
      showToast('تم تحديث الاهتمامات بنجاح');
    }
  };

  const handleTimeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    const updated = { ...notifSettings, time: newTime };
    setNotifSettings(updated);
    if (currentUser) {
      await saveUserNotificationSettings(currentUser.uid, { time: newTime });
      showToast(`تم تحديد موعد الإشعار: ${newTime}`);
    }
  };

  const handleSendTestPush = async () => {
    if (!currentUser) return;
    setIsTestingPush(true);
    try {
      let tokenToUse = fcmToken;
      if (!tokenToUse) {
        const res = await requestNotificationPermission(currentUser.uid);
        if (res.success && res.token) {
          tokenToUse = res.token;
          setFcmToken(res.token);
          setNotificationPermission('granted');
        }
      }

      if (!tokenToUse) {
        showToast('يرجى السماح بالإشعارات أولاً لإجراء الاختبار.');
        setIsTestingPush(false);
        return;
      }

      const res = await triggerTestPushNotification(currentUser.uid, tokenToUse);
      if (res.success) {
        showToast('⚡ تم إرسال الإشعار التجريبي عبر FCM! افحص متصفحك أو جهازك الآن.');
      } else {
        showToast(res.error || 'فشل إرسال الإشعار التجريبي.');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بسيرفر الإشعارات.');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleRunDailyEngine = async () => {
    setIsTestingEngine(true);
    setEngineResult(null);
    try {
      const res = await triggerDailyNotificationEngine();
      if (res.success) {
        if (res.status === 'skipped') {
          setEngineResult(`⚠️ تم الفحص: ${res.reason}`);
          showToast(`تم الفحص: ${res.reason}`);
        } else {
          setEngineResult(`✅ تم اختيار إشعار اليوم وإرساله: ${res.eventTitle || ''} (تم الوصول لـ ${res.sentCount || 0} أجهزة)`);
          showToast('تم تشغيل المحرك اليومي وإرسال الإشعار!');
        }
      } else {
        setEngineResult(`❌ فشل المحرك: ${res.reason || 'خطأ غير معروف'}`);
        showToast('فشل تشغيل المحرك اليومي.');
      }
    } catch (err: any) {
      setEngineResult('❌ حدث خطأ في الاتصال بالخادم.');
      showToast('حدث خطأ أثناء تشغيل المحرك.');
    } finally {
      setIsTestingEngine(false);
    }
  };
  const initialName = currentUser?.displayName || localStorage.getItem('app-user-name') || (isAuth ? 'مستخدم' : 'زائر');
  const initialEmail = currentUser?.email || localStorage.getItem('app-user-email') || (isAuth ? 'user@example.com' : 'غير مسجل');
  const initialCountry = localStorage.getItem('app-user-country') || 'الجمهورية المصرية';
  const initialAvatar = currentUser?.photoURL || localStorage.getItem('app-user-avatar') || null;
  const initialAge = localStorage.getItem('app-user-age') || '';
  const initialSchool = localStorage.getItem('app-user-school') || '';
  const initialInterests = localStorage.getItem('app-user-interests') || '';
  const initialFriends = localStorage.getItem('app-user-friends') || '';
  const initialBio = localStorage.getItem('app-user-bio') || '';

  const initialConsent = adTracker.getUserConsent();
  const [allowTrainingConsent, setAllowTrainingConsent] = useState(true);
  const [allowAdvertisingConsent, setAllowAdvertisingConsent] = useState(true);
  const [allowAnalyticsConsent, setAllowAnalyticsConsent] = useState(initialConsent.analyticsConsent);
  const [userName, setUserName] = useState(initialName);
  const [userEmail, setUserEmail] = useState(initialEmail);
  const [userCountry, setUserCountry] = useState(initialCountry);
  const [userAvatar, setUserAvatar] = useState<string | null>(initialAvatar);
  const [userAge, setUserAge] = useState(initialAge);
  const [userSchool, setUserSchool] = useState(initialSchool);
  const [userInterests, setUserInterests] = useState(initialInterests);
  const [userFriends, setUserFriends] = useState(initialFriends);
  const [userBio, setUserBio] = useState(initialBio);

  const [tempName, setTempName] = useState(initialName);
  const [tempEmail, setTempEmail] = useState(initialEmail);
  const [tempCountry, setTempCountry] = useState(initialCountry);
  const [tempAvatar, setTempAvatar] = useState<string | null>(initialAvatar);
  const [tempAge, setTempAge] = useState(initialAge);
  const [tempSchool, setTempSchool] = useState(initialSchool);
  const [tempInterests, setTempInterests] = useState(initialInterests);
  const [tempFriends, setTempFriends] = useState(initialFriends);
  const [tempBio, setTempBio] = useState(initialBio);

  useEffect(() => {
    const fetchUserData = async () => {
      const targetUid = currentUser?.uid || localStorage.getItem('app-user-id');
      if (!targetUid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', targetUid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.country) {
            setUserCountry(data.country);
            setTempCountry(data.country);
            localStorage.setItem('app-user-country', data.country);
          }
          if (data.name) {
            setUserName(data.name);
            setTempName(data.name);
            localStorage.setItem('app-user-name', data.name);
          }
          if (data.email) {
            setUserEmail(data.email);
            setTempEmail(data.email);
            localStorage.setItem('app-user-email', data.email);
          }
          if (data.photoURL) {
            setUserAvatar(data.photoURL);
            setTempAvatar(data.photoURL);
            localStorage.setItem('app-user-avatar', data.photoURL);
          }
          if (data.age) {
            setUserAge(data.age);
            setTempAge(data.age);
            localStorage.setItem('app-user-age', data.age);
          }
          if (data.school) {
            setUserSchool(data.school);
            setTempSchool(data.school);
            localStorage.setItem('app-user-school', data.school);
          }
          if (data.interests) {
            setUserInterests(data.interests);
            setTempInterests(data.interests);
            localStorage.setItem('app-user-interests', data.interests);
          }
          if (data.friends) {
            setUserFriends(data.friends);
            setTempFriends(data.friends);
            localStorage.setItem('app-user-friends', data.friends);
          }
          if (data.bio) {
            setUserBio(data.bio);
            setTempBio(data.bio);
            localStorage.setItem('app-user-bio', data.bio);
          }
          if (data.allowTrainingConsent !== undefined) {
            setAllowTrainingConsent(Boolean(data.allowTrainingConsent));
          }
        }
      } catch (e) {
        console.error('Error fetching user data in Settings:', e);
      }
    };
    fetchUserData();
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setTempAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(tempName);
    setUserEmail(tempEmail);
    setUserCountry(tempCountry);
    setUserAvatar(tempAvatar);
    setUserAge(tempAge);
    setUserSchool(tempSchool);
    setUserInterests(tempInterests);
    setUserFriends(tempFriends);
    setUserBio(tempBio);

    localStorage.setItem('app-user-name', tempName);
    localStorage.setItem('app-user-email', tempEmail);
    localStorage.setItem('app-user-country', tempCountry);
    localStorage.setItem('app-user-age', tempAge);
    localStorage.setItem('app-user-school', tempSchool);
    localStorage.setItem('app-user-interests', tempInterests);
    localStorage.setItem('app-user-friends', tempFriends);
    localStorage.setItem('app-user-bio', tempBio);
    if (tempAvatar) {
      localStorage.setItem('app-user-avatar', tempAvatar);
    } else {
      localStorage.removeItem('app-user-avatar');
    }

    // Trigger storage event so Header re-renders avatar immediately
    window.dispatchEvent(new Event('storage'));

    const targetUid = currentUser?.uid || localStorage.getItem('app-user-id') || (() => {
      const gId = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('app-user-id', gId);
      return gId;
    })();

    const userPath = `users/${targetUid}`;
    try {
      if (currentUser) {
        const updatePayload: { displayName: string; photoURL?: string } = {
          displayName: tempName
        };
        // Firebase Auth photoURL only accepts valid HTTP/HTTPS URLs under 2000 chars (not data URLs)
        if (tempAvatar && !tempAvatar.startsWith('data:') && tempAvatar.length <= 2000) {
          updatePayload.photoURL = tempAvatar;
        } else if (!tempAvatar) {
          updatePayload.photoURL = '';
        }
        try {
          await updateProfile(currentUser, updatePayload);
        } catch (authErr) {
          console.warn('Failed to update Firebase auth profile photoURL:', authErr);
        }
      }
      await setDoc(doc(db, 'users', targetUid), {
        uid: targetUid,
        name: tempName,
        email: tempEmail,
        country: tempCountry,
        age: tempAge,
        school: tempSchool,
        interests: tempInterests,
        friends: tempFriends,
        bio: tempBio,
        photoURL: tempAvatar || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving profile to Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      } catch (e) {}
    }

    setIsEditingProfile(false);
    showToast(t('profileUpdatedSuccess', 'تم تحديث بيانات الملف الشخصي وحفظها في الحساب بنجاح'));
  };

  const handleClearAllData = async () => {
    if (confirm(t('confirmClearData', 'هل أنت متاكد من مسح كافة سجلات وسجلات المحادثات والبيانات؟'))) {
      const user = auth.currentUser;
      if (user) {
        try {
          const collections = ['notes', 'tasks', 'chats', 'classroomCourses', 'classroomAssignments', 'classroomAnnouncements'];
          for (const col of collections) {
            const snap = await getDocs(collection(db, 'users', user.uid, col));
            if (!snap.empty) {
              const batch = writeBatch(db);
              snap.docs.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
        } catch (e) {
          console.error('Error clearing firestore data:', e);
        }
      }
      localStorage.clear();
      showToast(t('dataClearedSuccess', 'تم مسح جميع البيانات بنجاح'));
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const initials = userName && userName !== 'زائر' && userName !== 'مستخدم'
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (isAuth ? 'US' : '?');
  if (isEditingProfile) {
    return (
      <div className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white">{t('editProfile', 'تعديل الحساب')}</h1>
          </div>
          <button 
            onClick={() => setIsEditingProfile(false)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
          >
            {language === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold">
              {toastMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 bg-white/5 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className={`relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr ${theme.previewGradient} shadow-xl`}>
              <div className="w-full h-full bg-[#141824] rounded-full flex items-center justify-center border-2 border-[#1a1c2c] overflow-hidden">
                {tempAvatar ? (
                  <img src={tempAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">{initials}</span>
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`absolute bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} p-2.5 rounded-full ${theme.btnPrimary} shadow-lg border-2 border-[#1a1c2c] hover:scale-110 transition-transform`}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('name', 'الاسم')}</label>
            <input 
              type="text" 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-white/70">{t('email', 'البريد الإلكتروني')}</label>
              <span className="text-[10px] text-white/40">{t('cannotBeModified', 'لا يمكن تعديله')}</span>
            </div>
            <input 
              type="email" 
              value={tempEmail}
              disabled
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white/50 cursor-not-allowed select-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('country', 'الدولة')}</label>
            <div className="relative">
              <select 
                value={tempCountry}
                onChange={(e) => setTempCountry(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                required
              >
                <option value="" disabled className="bg-[#141824] text-white/50">{t('selectCountry', 'اختر الدولة')}</option>
                <optgroup label={t('arabCountries', 'الدول العربية')} className="text-white/50">
                  <option value="الجمهورية المصرية" className="bg-[#141824] text-white">الجمهورية المصرية (Egypt)</option>
                  <option value="المملكة العربية السعودية" className="bg-[#141824] text-white">Saudi Arabia (المملكة العربية السعودية)</option>
                  <option value="الإمارات العربية المتحدة" className="bg-[#141824] text-white">UAE (الإمارات العربية المتحدة)</option>
                  <option value="الكويت" className="bg-[#141824] text-white">Kuwait (الكويت)</option>
                  <option value="قطر" className="bg-[#141824] text-white">Qatar (قطر)</option>
                  <option value="البحرين" className="bg-[#141824] text-white">Bahrain (البحرين)</option>
                  <option value="سلطنة عمان" className="bg-[#141824] text-white">Oman (سلطنة عمان)</option>
                  <option value="الأردن" className="bg-[#141824] text-white">Jordan (الأردن)</option>
                  <option value="لبنان" className="bg-[#141824] text-white">Lebanon (لبنان)</option>
                  <option value="العراق" className="bg-[#141824] text-white">Iraq (العراق)</option>
                  <option value="الجزائر" className="bg-[#141824] text-white">Algeria (الجزائر)</option>
                  <option value="المغرب" className="bg-[#141824] text-white">Morocco (المغرب)</option>
                  <option value="تونس" className="bg-[#141824] text-white">Tunisia (تونس)</option>
                </optgroup>
                <optgroup label={t('foreignCountries', 'دول أخرى')} className="text-white/50">
                  <option value="الولايات المتحدة" className="bg-[#141824] text-white">United States (الولايات المتحدة)</option>
                  <option value="المملكة المتحدة" className="bg-[#141824] text-white">United Kingdom (المملكة المتحدة)</option>
                  <option value="كندا" className="bg-[#141824] text-white">Canada (كندا)</option>
                  <option value="أستراليا" className="bg-[#141824] text-white">Australia (أستراليا)</option>
                  <option value="ألمانيا" className="bg-[#141824] text-white">Germany (ألمانيا)</option>
                  <option value="فرنسا" className="bg-[#141824] text-white">France (فرنسا)</option>
                  <option value="إيطاليا" className="bg-[#141824] text-white">Italy (إيطاليا)</option>
                  <option value="إسبانيا" className="bg-[#141824] text-white">Spain (إسبانيا)</option>
                  <option value="هولندا" className="bg-[#141824] text-white">Netherlands (هولندا)</option>
                  <option value="سويسرا" className="bg-[#141824] text-white">Switzerland (سويسرا)</option>
                  <option value="السويد" className="bg-[#141824] text-white">Sweden (السويد)</option>
                  <option value="النرويج" className="bg-[#141824] text-white">Norway (النرويج)</option>
                  <option value="الدنمارك" className="bg-[#141824] text-white">Denmark (الدنمارك)</option>
                  <option value="بلجيكا" className="bg-[#141824] text-white">Belgium (بلجيكا)</option>
                  <option value="النمسا" className="bg-[#141824] text-white">Austria (النمسا)</option>
                  <option value="تركيا" className="bg-[#141824] text-white">Turkey (تركيا)</option>
                </optgroup>
                <option value="أخرى" className="bg-[#141824] text-white">{t('other', 'أخرى (Other)')}</option>
              </select>
              <ChevronDown className={`w-5 h-5 text-white/50 absolute ${language === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none`} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('age', 'العمر')}</label>
            <input 
              type="text" 
              value={tempAge}
              onChange={(e) => setTempAge(e.target.value)}
              placeholder={t('agePlaceholder', 'مثال: 20')}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('schoolOrUni', 'المدرسة / الجامعة')}</label>
            <input 
              type="text" 
              value={tempSchool}
              onChange={(e) => setTempSchool(e.target.value)}
              placeholder={t('schoolPlaceholder', 'اسم المدرسة أو الكلية')}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('interests', 'الاهتمامات')}</label>
            <input 
              type="text" 
              value={tempInterests}
              onChange={(e) => setTempInterests(e.target.value)}
              placeholder={t('interestsPlaceholder', 'مثال: برمجة، قراءة، كرة قدم')}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('friends', 'الأصحاب / الأصدقاء المقربون')}</label>
            <input 
              type="text" 
              value={tempFriends}
              onChange={(e) => setTempFriends(e.target.value)}
              placeholder={t('friendsPlaceholder', 'أسماء الأصدقاء')}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 px-1">{t('bio', 'نبذة عامة / معلومات شخصية')}</label>
            <textarea 
              value={tempBio}
              onChange={(e) => setTempBio(e.target.value)}
              placeholder={t('bioPlaceholder', 'اكتب أي معلومات أخرى تريد للمساعد معرفتها عنك...')}
              rows={3}
              className="bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          <button 
            type="submit"
            className={`w-full py-4 mt-4 rounded-2xl ${theme.btnPrimary} font-black text-sm shadow-lg flex justify-center items-center gap-2 hover:scale-[1.02] transition-all active:scale-95`}
          >
            <Save className="w-5 h-5" />
            {t('saveChanges', 'حفظ التعديلات')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full pb-28 pt-4 px-3 sm:px-6 md:px-8 max-w-3xl mx-auto overflow-y-auto hide-scrollbar">
      
      {/* Settings Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.previewGradient} p-0.5 shadow-lg`}>
            <div className={`w-full h-full bg-[#141824] rounded-[10px] flex items-center justify-center`}>
              <SettingsIcon className={`w-5 h-5 ${theme.textAccent}`} />
            </div>
          </div>
          <h1 className="text-xl font-black text-white">{t('settings', 'الإعدادات')}</h1>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors border border-white/10"
        >
          {language === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold">
            {toastMessage}
          </div>
        </div>
      )}

      <div className="p-6 flex flex-col items-center gap-3 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shrink-0 relative mb-6 shadow-xl">
        <div className={`relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr ${theme.previewGradient} shadow-xl`}>
          <div className="w-full h-full bg-[#141824] rounded-full flex items-center justify-center border-2 border-[#1a1c2c] overflow-hidden">
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>
          {isAuth && (
            <button 
              onClick={() => {
                setTempName(userName);
                setTempEmail(userEmail);
                setTempCountry(userCountry);
                setTempAvatar(userAvatar);
                setIsEditingProfile(true);
              }}
              className={`absolute bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} p-2 rounded-full ${theme.btnPrimary} shadow-lg border-2 border-[#1a1c2c] hover:scale-110 transition-transform`}
              title={t('editProfile', 'تعديل الحساب')}
            >
              <Camera className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center flex flex-col items-center gap-1">
          <h2 className="text-xl font-bold text-white">{userName}</h2>
          <p className="text-xs text-white/50">{userEmail}</p>
          {!isAuth && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className={`mt-2 px-5 py-2 rounded-full ${theme.btnPrimary} font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer`}
            >
              {language === 'ar' ? 'تسجيل الدخول أو إنشاء حساب' : 'Log In or Sign Up'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col">
          {onOpenSubscription && (
            <>
              <button 
                onClick={onOpenSubscription} 
                className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shadow-lg border border-amber-500/30">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <span className="text-sm font-bold text-white block">{t('subscriptionsAndUsage', 'الاشتراكات وحدود الاستخدام')}</span>
                    <span className="text-[11px] text-amber-300 font-medium">{t('currentPlan', 'الباقة الحالية')}: {getUserPlan().name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-amber-300/60 group-hover:text-amber-300 transition-colors" /> : <ChevronRight className="w-5 h-5 text-amber-300/60 group-hover:text-amber-300 transition-colors" />}
                </div>
              </button>
              <div className="h-px w-full bg-white/10"></div>
            </>
          )}

          {onOpenDiscover && (
            <>
              <button 
                onClick={onOpenDiscover} 
                className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shadow-lg border border-emerald-500/30">
                    <Compass className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <span className="text-sm font-bold text-white block">{t('discoverModels', 'استكشاف النماذج')}</span>
                    <span className="text-[11px] text-white/50">{t('discoverModelsDesc', 'اكتشف قدرات وأدوات THOTH')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />}
                </div>
              </button>
              <div className="h-px w-full bg-white/10"></div>
            </>
          )}

          {isAuth && onOpenHistory && (
            <>
              <button 
                onClick={onOpenHistory} 
                className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${theme.bgAccent} ${theme.textAccent} flex items-center justify-center shadow-lg border ${theme.borderAccent}`}>
                    <HistoryIcon className={`w-5 h-5 ${theme.textAccent}`} />
                  </div>
                  <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <span className="text-sm font-bold text-white block">{t('chatHistory', 'سجل المحادثات')}</span>
                    <span className="text-[11px] text-white/50">{t('chatHistoryDesc', 'عرض والبحث في كافة المحادثات السابقة')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />}
                </div>
              </button>
              <div className="h-px w-full bg-white/10"></div>
            </>
          )}

          <button 
            onClick={() => {
              setTempName(userName);
              setTempEmail(userEmail);
              setIsEditingProfile(true);
            }} 
            className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shadow-lg border border-indigo-500/30">
                <User className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">{t('editProfile', 'تعديل الحساب')}</span>
            </div>
            {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />}
          </button>
          
          <div className="h-px w-full bg-white/10"></div>
          
          {/* Collapsible Multi-Color Theme Selector */}
          <div className="flex flex-col">
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className={`flex items-center justify-between p-4 hover:bg-white/10 transition-colors group ${language === 'ar' ? 'text-right' : 'text-left'} w-full cursor-pointer`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${theme.bgAccent} ${theme.textAccent} flex items-center justify-center shadow-lg border ${theme.borderAccent} shrink-0`}>
                  <Palette className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-sm font-bold text-white block">{t('appThemes', 'ثيمات وألوان التطبيق')}</span>
                  <span className="text-[11px] text-white/50 block truncate">{t('appThemesDesc', 'اختر المظهر والألوان التي تناسب ذوقك')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${theme.badgeClass}`}>
                  {theme.name.split(' ')[0]}
                </span>
                <ChevronDown className={`w-5 h-5 text-white/40 group-hover:text-white/80 transition-transform duration-300 ${isThemeMenuOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isThemeMenuOpen && (
              <div className="p-4 pt-1 bg-black/20 border-t border-white/5 flex flex-col gap-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEMES.map((th) => {
                    const isSelected = activeThemeId === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={async () => {
                          setActiveThemeId(th.id);
                          setStoredTheme(th.id);
                          showToast(`${t('themeChangedToast', 'تم تغيير ثيم التطبيق إلى: ')}${th.name}`);
                          if (currentUser) {
                            try {
                              await setDoc(doc(db, 'users', currentUser.uid), {
                                theme: th.id,
                                updatedAt: new Date().toISOString()
                              }, { merge: true });
                            } catch (err) {
                              console.error('Error saving theme to account:', err);
                            }
                          }
                        }}
                        className={`p-3 rounded-2xl border ${language === 'ar' ? 'text-right' : 'text-left'} transition-all flex items-center justify-between gap-2 relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? `bg-white/10 ${th.borderAccent} shadow-lg ring-1 ring-white/20`
                            : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Color Preview Swatch */}
                          <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${th.previewGradient} p-0.5 shrink-0 shadow-md`}>
                            <div className={`w-full h-full rounded-[10px] ${th.bgClass}`} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">{th.name}</span>
                            <span className="text-[10px] text-white/50 truncate">{th.desc}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className={`w-5 h-5 rounded-full ${th.bgAccent} border ${th.borderAccent} flex items-center justify-center shrink-0`}>
                            <Check className={`w-3 h-3 ${th.textAccentBright}`} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Gemini Model Voices Selector */}
            <div className="flex flex-col border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                className={`flex items-center justify-between p-4 hover:bg-white/10 transition-colors group ${language === 'ar' ? 'text-right' : 'text-left'} w-full cursor-pointer`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shadow-lg border border-purple-500/30 shrink-0`}>
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="text-sm font-bold text-white block">{t('geminiVoices', 'أصوات النموذج الذكي (Gemini Model Voices)')}</span>
                    <span className="text-[11px] text-white/50 block truncate">{t('geminiVoicesDesc', 'اختر الصوت الأصلي للنموذج عند التحدث والرد الصوتي')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedVoice}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-white/40 group-hover:text-white/80 transition-transform duration-300 ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isVoiceMenuOpen && (
                <div className="p-4 pt-1 bg-black/20 border-t border-white/5 flex flex-col gap-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'Aoede', name: language === 'ar' ? 'Aoede (صوت دافئ متألق)' : 'Aoede (Warm & expressive)', desc: language === 'ar' ? 'صوت أنثوي فصيح وودود متعدد اللغات' : 'Expressive, friendly multilingual female voice' },
                      { id: 'Puck', name: language === 'ar' ? 'Puck (صوت حيوي ومرح)' : 'Puck (Lively & playful)', desc: language === 'ar' ? 'صوت شبابي مفعم بالحيوية والتفاعل (الافتراضي)' : 'Energetic, upbeat natural voice (Default)' },
                      { id: 'Charon', name: language === 'ar' ? 'Charon (صوت عميق ورزين)' : 'Charon (Deep & resonant)', desc: language === 'ar' ? 'صوت رجالي عميق وواضح ورسمي' : 'Deep, clear and confident male voice' },
                      { id: 'Kore', name: language === 'ar' ? 'Kore (صوت هادئ ولطيف)' : 'Kore (Calm & soothing)', desc: language === 'ar' ? 'صوت ناعم ومريح ومناسب للقراءة والشرح' : 'Gentle, soothing tone ideal for tutoring' },
                      { id: 'Fenrir', name: language === 'ar' ? 'Fenrir (صوت قوي ونشط)' : 'Fenrir (Strong & bold)', desc: language === 'ar' ? 'صوت رجالي حماسي وواضح النبرة' : 'Dynamic, assertive and engaging male tone' },
                      { id: 'Zephyr', name: language === 'ar' ? 'Zephyr (صوت نقي ومتزن)' : 'Zephyr (Smooth & balanced)', desc: language === 'ar' ? 'صوت متوازن وواضح ومناسب لكافة المهام' : 'Crisp, articulate and versatile voice' }
                    ].map((v) => {
                      const isSelected = selectedVoice === v.id;
                      const isPreviewing = previewingVoice === v.id;
                      return (
                        <div
                          key={v.id}
                          className={`p-3 rounded-2xl border ${language === 'ar' ? 'text-right' : 'text-left'} transition-all flex items-center justify-between gap-2 relative ${
                            isSelected
                              ? 'bg-purple-500/15 border-purple-500/40 shadow-lg ring-1 ring-purple-500/30'
                              : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div 
                            onClick={() => {
                              setSelectedVoice(v.id);
                              localStorage.setItem('thoth_selected_voice', v.id);
                              localStorage.setItem('thoth_live_voice', v.id);
                              window.dispatchEvent(new Event('thoth_voice_changed'));
                              showToast(`${t('voiceSelectedToast', 'تم اختيار صوت النموذج: ')}${v.name.split(' ')[0]}`);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-xl ${isSelected ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/60'} flex items-center justify-center shrink-0`}>
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate">{v.name}</span>
                              <span className="text-[10px] text-white/50 truncate">{v.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setPreviewingVoice(v.id);
                                try {
                                  const promptText = language === 'ar' 
                                    ? `مرحباً، أنا المساعد THOTH، أتحدث إليك بصوت ${v.id}. كيف يمكنني مساعدتك اليوم؟`
                                    : `Hello! I am THOTH AI assistant, speaking with voice ${v.id}. How can I help you today?`;
                                  const res = await fetch('/api/tts', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      text: promptText,
                                      voice: v.id
                                    })
                                  });
                                  const data = await res.json();
                                  if (data.success && data.audioData) {
                                    const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioData}`);
                                    audio.onended = () => setPreviewingVoice(null);
                                    audio.onerror = () => setPreviewingVoice(null);
                                    audio.play();
                                  } else {
                                    setPreviewingVoice(null);
                                  }
                                } catch (err) {
                                  setPreviewingVoice(null);
                                }
                              }}
                              title={language === 'ar' ? 'استمع لعينة من هذا الصوت' : 'Listen to voice sample'}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all text-[11px] flex items-center gap-1"
                            >
                              {isPreviewing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span className="text-[10px] hidden sm:inline">{t('previewVoice', 'معاينة')}</span>
                            </button>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-white/5 bg-black/10">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shadow-lg border border-blue-500/30 shrink-0`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-sm font-bold text-white block">{t('platformLanguage', 'لغة المنصة / Language')}</span>
                  <span className="text-[11px] text-white/50 block truncate">{t('platformLanguageDesc', 'اختر اللغة المفضلة / Select preferred language')}</span>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as 'ar' | 'en');
                }}
                className="bg-white/10 border border-white/20 text-white text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              >
                <option value="ar" className="bg-[#1a1c2c] text-white">العربية (Arabic)</option>
                <option value="en" className="bg-[#1a1c2c] text-white">English</option>
              </select>
            </div>
            
          </div>
        </div>

        {/* Daily Notifications Section */}
        <div>
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t('dailyNotifications', 'إشعارات THOTH اليومية (FCM)')}</h3>
            {isAdmin && onOpenAdminPanel && (
              <button
                onClick={onOpenAdminPanel}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <span>{t('adminPanelNav', 'لوحة التحكم والإدارة')}</span>
                {language === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col p-4 space-y-4">
            
            {/* Admin Quick Entry Banner (Visible to Admin Users) */}
            {isAdmin && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-black/40 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-white block">{t('adminTools', 'أدوات إشراف مدير النظام (Admin)')}</span>
                    <span className="text-[10px] text-white/60 block">{t('adminToolsDesc', 'إشعارات جماعية، محرك الإرسال، وإحصائيات المستخدمين')}</span>
                  </div>
                </div>

                {onOpenAdminPanel && (
                  <button
                    onClick={onOpenAdminPanel}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    {t('openAdminPanel', 'فتح لوحة الأدمن')}
                  </button>
                )}
              </div>
            )}

            {/* 1. Toggle Daily Push (Regular User Feature) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${theme.bgAccent} ${theme.textAccentBright} flex items-center justify-center border ${theme.borderAccent}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">{t('dailyNotificationsToggle', 'إشعارات THOTH اليومية')}</span>
                  <span className="text-[11px] text-white/50 block">{t('dailyNotificationsDesc', 'تفعيل أو إيقاف الإشعارات اليومية')}</span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifSettings.dailyEnabled}
                  onChange={(e) => handleToggleDaily(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
              </label>
            </div>

            {/* [iOS-DIAG] iPhone-specific guidance — WebKit only allows web push
                from a Home-Screen web app (iOS 16.4+). Hidden on all other platforms. */}
            {iosNotifSupport.isIOS && !iosNotifSupport.pushCapable && (
              <div className="mt-3 p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-[11px] text-white/70 leading-relaxed">
                {iosNotifSupport.needsHomeScreenInstall
                  ? '📱 على الآيفون: iOS بيسمح بالإشعارات بس لما THOTH يكون على الشاشة الرئيسية. افتح الموقع في Safari ← زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية»، وافتح التطبيق من الأيقونة وفعّل الإشعارات من هنا تاني.'
                  : '📱 نسخة iOS عندك (' + (iosNotifSupport.iosVersion ? `${iosNotifSupport.iosVersion.major}.${iosNotifSupport.iosVersion.minor}` : 'غير معروفة') + ') مش بتدعم إشعارات الويب — محتاج iOS 16.4 أو أحدث: الإعدادات ← عام ← تحديث البرامج.'}
              </div>
            )}
            {iosNotifSupport.isIOS && iosNotifSupport.pushCapable && 'Notification' in window && Notification.permission === 'denied' && (
              <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-white/70 leading-relaxed">
                ⚠️ إذن الإشعارات مترفض من قبل. امسح تطبيق THOTH من الشاشة الرئيسية وضيفه تاني (Safari ← مشاركة ⬆️ ← إضافة إلى الشاشة الرئيسية) واضغط «السماح».
              </div>
            )}

          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-4 mb-3">{t('infoAndData', 'معلومات والبيانات')}</h3>
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden flex flex-col">
            <button onClick={() => showToast(t('helpToast', 'للمساعدة تواصل مع الدعم عبر البريد الإلكتروني'))} className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center shadow-lg border border-white/10">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-white">{t('helpAndSupport', 'المساعدة والدعم')}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />}
            </button>
            
            <div className="h-px w-full bg-white/10"></div>
            
            <button onClick={() => showToast(t('aboutToast', 'تطبيق الذكاء الاصطناعي - الإصدار 1.0.0'))} className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-white/70 flex items-center justify-center shadow-lg border border-white/10">
                  <Info className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-white">{t('aboutApp', 'حول التطبيق')}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />}
            </button>

            <div className="h-px w-full bg-white/10"></div>

            <button
              onClick={() => setShowTermsModal(true)}
              className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shadow-lg border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-white">{t('viewPrivacyAndTerms', 'شروط الخدمة وسياسة الخصوصية')}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" /> : <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />}
            </button>

            <div className="h-px w-full bg-white/10"></div>

            <button onClick={handleClearAllData} className="flex items-center justify-between p-4 hover:bg-red-500/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center shadow-lg border border-red-500/30">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-red-300">{t('clearDataAndMemory', 'مسح جميع البيانات والذاكرة')}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="w-5 h-5 text-red-300/40 group-hover:text-red-300/70 transition-colors" /> : <ChevronRight className="w-5 h-5 text-red-300/40 group-hover:text-red-300/70 transition-colors" />}
            </button>
          </div>
        </div>

        {isAuth && (
          <button 
            onClick={onLogout}
            className="mt-4 w-full py-4 flex items-center justify-center gap-2 rounded-2xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all font-bold text-sm shadow-lg active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />{t('logout', 'تسجيل الخروج')}
          </button>
        )}
      </div>

      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
}
