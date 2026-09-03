import { syncUsageFromServer, initSubscriptionPlans } from './lib/subscriptionService';
import { handleUserLogoutCleanup, loadAllSessions } from './lib/chatSessionManager';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from './lib/LanguageContext';
import { MessageSquare, Compass, History as HistoryIcon, Settings as SettingsIcon, Bookmark, GraduationCap, ListTodo, Radio, Languages, Sparkles, Bell, X } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db, testFirestoreConnection } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Chat } from './components/Chat';
import { LiveTranslate } from './components/LiveTranslate';
import { Discover } from './components/Discover';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { KeepNotes } from './components/KeepNotes';
import { Classroom } from './components/Classroom';
import { GoogleTasks } from './components/GoogleTasks';
import { Subscription } from './components/Subscription';
import { AdminPanel } from './components/AdminPanel';
import { VoiceDialog } from './components/VoiceDialog';
import { Auth } from './components/Auth';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { DailyBriefingModal } from './components/DailyBriefingModal';
import { startStudyToolsWatcher, playReminderChime } from './lib/studyToolsService';
import { listenToForegroundMessages, listenToBroadcastClicks, autoRequestNotificationsAfterLogin, requestNotificationPermission, getIOSNotificationSupport, logIOS } from './services/notificationService';
import { THEMES, getStoredThemeId, setStoredTheme, useAppTheme } from './lib/themeService';
import { adTracker } from './lib/adTrackingService';

import { PaymentResultModal, PaymentModalData } from './components/PaymentResultModal';

export default function App() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuth') === 'true';
  });
  const [activeTab, setActiveTab] = useState('chat');
  const [initialMessage, setInitialMessage] = useState<any>('');
  const [isLiveAudioOpen, setIsLiveAudioOpen] = useState(false);
  // [STUDY TOOLS] topic for the in-Tasks-page voice lesson (VoiceDialog tutor mode)
  const [voiceLearnTopic, setVoiceLearnTopic] = useState<string | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isDailyBriefingOpen, setIsDailyBriefingOpen] = useState(false);
  const [isKeepModalOpen, setIsKeepModalOpen] = useState(false);

  useEffect(() => {
    initSubscriptionPlans();
    const handleArtifactToggle = (e: any) => {
      setIsArtifactOpen(!!e.detail);
    };
    window.addEventListener('artifact-fullscreen-change', handleArtifactToggle);
    return () => window.removeEventListener('artifact-fullscreen-change', handleArtifactToggle);
  }, []);
  const [dailyNotificationId, setDailyNotificationId] = useState<string | null>(null);
  const [foregroundToast, setForegroundToast] = useState<any>(null);
  const [showNotifPermissionBanner, setShowNotifPermissionBanner] = useState(false);
  // [iOS-DIAG] Guided "Add to Home Screen" flow — WebKit only exposes the Push
  // API inside a Home-Screen web app, so Safari-tab users on iPhone get steps
  // instead of a dead-end error. Android & desktop never see this state.
  const [showIOSNotifGuidance, setShowIOSNotifGuidance] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState<{ text: string; type: 'info' | 'warning' | 'alert' } | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<PaymentModalData | null>(null);

  // Listen to open-payment-modal custom event from Subscription component
  useEffect(() => {
    const handleOpenModal = (e: any) => {
      if (e.detail) {
        setPaymentModalData(e.detail);
      }
    };
    window.addEventListener('open-payment-modal', handleOpenModal);
    return () => window.removeEventListener('open-payment-modal', handleOpenModal);
  }, []);
  const [isMaintenance, setIsMaintenance] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
  const activeTheme = useAppTheme();

  // Active Tab Telemetry Tracking
  useEffect(() => {
    adTracker.setActiveFeature(activeTab);
  }, [activeTab]);

  // Fetch System Config (Announcement Banner & Maintenance Mode)
  useEffect(() => {
    const checkSysConfig = async () => {
      try {
        const res = await fetch('/api/system-config');
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.config) {
            if (data.config.maintenanceMode) {
              const isAdminUser = (localStorage.getItem('app-user-email') || '').toLowerCase() === 'onq6974@gmail.com';
              if (!isAdminUser) {
                setIsMaintenance({ active: true, message: data.config.maintenanceMessage || 'الموقع قيد الصيانة حالياً.' });
              }
            }
            if (data.config.announcement?.enabled && data.config.announcement?.text) {
              setAnnouncementBanner({
                text: data.config.announcement.text,
                type: data.config.announcement.type || 'info'
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading sys config:', err);
      }
    };
    checkSysConfig();
  }, []);

  // Check URL parameters for deep links e.g. ?dailyId=... or #daily-briefing
  useEffect(() => {
    const checkDeepLink = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        
        const paymentStatus = params.get('payment_status');
        if (paymentStatus === 'success' || paymentStatus === 'failed') {
           // If we are inside an iframe (e.g., Paymob iframe), try to break out if frame permissions allow
           if (window !== window.top) {
              try {
                 if (window.top && window.top.location) {
                    window.top.location.href = window.location.href;
                    return;
                 }
              } catch (e) {
                 // Ignore cross-origin frame navigation security errors
                 console.warn('Could not navigate parent frame due to security restrictions:', e);
              }
           }

           const urlOrderId = params.get('orderId') || localStorage.getItem('thoth_last_order_id') || 'THOTH-PAYMOB-ONLINE';
           const urlPlanId = params.get('planId') || localStorage.getItem('thoth_user_plan') || 'pro';

           setPaymentModalData({
             status: paymentStatus === 'success' ? 'verifying' : 'failed',
             orderId: urlOrderId,
             planId: urlPlanId,
             planName: urlPlanId === 'ultra' ? 'باقة ألترا Ultra' : urlPlanId === 'max' ? 'باقة مكس Max' : 'باقة المحترفين Pro',
             paymentMethod: 'بوابة Paymob - بطاقة بنكية',
             failureReason: paymentStatus === 'failed' ? 'تم رفض المعاملة من قبل البنك المصدر أو لم يتم التوثيق بنجاح.' : undefined
           });
           syncUsageFromServer(); // Force immediate refresh of the user's plan from Firestore
           const url = new URL(window.location.href);
           url.searchParams.delete('payment_status');
           url.searchParams.delete('orderId');
           url.searchParams.delete('userId');
           url.searchParams.delete('planId');
           window.history.replaceState({}, document.title, url.pathname + url.search);
        }

        const dailyId = params.get('dailyId');
        if (dailyId) {
          setDailyNotificationId(dailyId);
          setIsDailyBriefingOpen(true);
        } else if (window.location.hash === '#daily-briefing') {
          setIsDailyBriefingOpen(true);
        }
      } catch (err) {
        console.warn('Error checking deep link:', err);
      }
    };

    checkDeepLink();
    window.addEventListener('popstate', checkDeepLink);
    return () => window.removeEventListener('popstate', checkDeepLink);
  }, []);

  // ---- Notification permission banner handlers ----
  const handleEnableNotifications = async () => {
    const uid = currentUser?.uid || localStorage.getItem('app-user-id') || '';
    if (!('Notification' in window)) {
      setShowNotifPermissionBanner(false);
      return;
    }
    // [iOS-DIAG] iOS/WebKit: the Push API only exists inside a Home-Screen web
    // app (iOS 16.4+). Instead of the dead-end "not supported" error, show the
    // exact install steps. Android & desktop keep the original path untouched.
    const iosSupport = getIOSNotificationSupport();
    if (iosSupport.isIOS && !iosSupport.pushCapable) {
      logIOS('Enable tapped while not push-capable — opening install guidance', iosSupport.reason);
      setShowNotifPermissionBanner(false);
      setShowIOSNotifGuidance(true);
      return;
    }
    const result = await requestNotificationPermission(uid);
    if (result.success) {
      setShowNotifPermissionBanner(false);
      setForegroundToast({ title: '🔔 تم تفعيل الإشعارات!', body: 'هتوصلك أهم التحديثات فورًا حتى لو التطبيق مقفول.', notificationId: null, isInfo: true });
      window.dispatchEvent(new Event('thoth_notifications_enabled'));
    } else {
      setForegroundToast({ title: '⚠️ لم يتم منح إذن الإشعارات', body: result.error || 'يمكنك تفعيل الإشعارات لاحقًا من الإعدادات.', notificationId: null, isInfo: true });
      if (Notification.permission === 'denied') setShowNotifPermissionBanner(false);
    }
  };

  const handleDismissNotifBanner = () => {
    sessionStorage.setItem('thoth_notif_banner_dismissed', '1');
    setShowNotifPermissionBanner(false);
  };

  // Listen for Foreground FCM Push Messages
  useEffect(() => {
    const unsubscribeFCM = listenToForegroundMessages((payload) => {
      console.log('App received foreground FCM message:', payload);
      const notifId = payload?.data?.notificationId || payload?.data?.tag || null;
      // [BROADCAST-CLICK] Broadcast campaigns carry a "broadcast_*" id — they
      // get their own CTA that opens the message inside the chat (instead of
      // the daily-briefing modal which has no document for them).
      const isBroadcastPush = typeof notifId === 'string' && notifId.startsWith('broadcast_');
      setForegroundToast({
        title: payload?.notification?.title || '🔔 THOTH Daily',
        body: payload?.notification?.body || 'تم استلام إشعار جديد اليوم!',
        notificationId: notifId,
        isBroadcast: isBroadcastPush,
        category: payload?.data?.category || ''
      });
    });

    return () => {
      if (typeof unsubscribeFCM === 'function') unsubscribeFCM();
    };
  }, []);

  // [BROADCAST-CLICK] When the user taps a broadcast push in the OS tray while
  // the app was closed/backgrounded, the service worker focuses the app and
  // posts THOTH_OPEN_BROADCAST — surface the message inside the chat.
  useEffect(() => {
    const unsubscribeBroadcast = listenToBroadcastClicks((payload) => {
      setActiveTab('chat');
      window.dispatchEvent(new CustomEvent('thoth_inject_broadcast', {
        detail: {
          title: payload?.title || '',
          body: payload?.body || '',
          category: payload?.category || '',
          notificationId: payload?.notificationId || ''
        }
      }));
    });
    return () => {
      if (typeof unsubscribeBroadcast === 'function') unsubscribeBroadcast();
    };
  }, []);

  // [STUDY TOOLS] Local alarm watcher — fires due reminders while the app is
  // open: local chime + in-app toast (reuses foregroundToast) + a system
  // notification when permission was already granted. 100% local: reads the
  // user's own localStorage only; no server or Firestore involvement.
  // OWNER FIX: the chime + toast are SUPPRESSED while a live voice session
  // (lesson or normal call) is open — the WebAudio beep was leaking into the
  // call (owner heard a weird sound "sometimes": it was an alarm firing).
  const isLiveAudioOpenRef = useRef(false);
  useEffect(() => { isLiveAudioOpenRef.current = isLiveAudioOpen; }, [isLiveAudioOpen]);
  useEffect(() => {
    const isArLang = language === 'ar';
    const stopWatcher = startStudyToolsWatcher((r) => {
      if (!isLiveAudioOpenRef.current) {
        playReminderChime();
        setForegroundToast({
          title: isArLang
            ? `⏰ منبه دراسي${r.repeat === 'daily' ? ' (يومي)' : r.repeat === 'weekly' ? ' (أسبوعي)' : ''}`
            : `⏰ Study alarm${r.repeat === 'daily' ? ' (daily)' : r.repeat === 'weekly' ? ' (weekly)' : ''}`,
          body: r.title,
          notificationId: null,
          isInfo: true
        });
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(isArLang ? '⏰ THOTH — منبه دراسي' : '⏰ THOTH — Study alarm', {
              body: r.title,
              icon: '/icons/icon-192.png'
            });
          }
        } catch { /* notification edge cases — toast already fired */ }
      }
      // During a live voice call EVERYTHING is suppressed (owner report: the
      // sound got quieter but was still there — the OS notification was the
      // remaining leak). Alarms still fire normally outside calls.
    });
    return stopWatcher;
  }, [language]);


  useEffect(() => {
    testFirestoreConnection();
    syncUsageFromServer(); // Initial sync (guest or before auth resolves)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          const data = userDocSnap.exists() ? (userDocSnap.data() as any) : null;
          
          // Verify user registration on Firestore database
          const isProfileComplete = data && data.termsAccepted === true && !!data.country;

          if (isProfileComplete) {
            localStorage.setItem('app-user-id', user.uid);
            syncUsageFromServer(user.uid); // Re-sync with explicit user ID
            setCurrentUser(user);
            setIsAuthenticated(true);
            localStorage.setItem('isAuth', 'true');
            window.dispatchEvent(new Event('thoth_auth_changed'));
            if (data.name || user.displayName) localStorage.setItem('app-user-name', data.name || user.displayName);
            if (user.email) localStorage.setItem('app-user-email', user.email);
            if (data.avatar || user.photoURL) localStorage.setItem('app-user-avatar', data.avatar || user.photoURL);
            if (data.country) localStorage.setItem('app-user-country', data.country);
            if (data.authType) localStorage.setItem('app-user-auth-type', data.authType);

            if (data.plan) {
              const cleanPlan = data.plan.toString().toLowerCase().trim();
              localStorage.setItem('thoth_user_plan', cleanPlan);
              window.dispatchEvent(new Event('thoth_plan_updated'));
              window.dispatchEvent(new Event('thoth_usage_updated'));
            }
            if (data.theme) {
              setStoredTheme(data.theme);
            }
            if (data.age) localStorage.setItem('app-user-age', data.age);
            if (data.school) localStorage.setItem('app-user-school', data.school);
            if (data.interests) localStorage.setItem('app-user-interests', data.interests);
            if (data.friends) localStorage.setItem('app-user-friends', data.friends);
            if (data.bio) localStorage.setItem('app-user-bio', data.bio);

            // Notifications: silently refresh the push subscription when the
            // permission is already granted; otherwise surface the in-app
            // enable banner (the banner button provides the user gesture the
            // browser needs to show the permission prompt).
            if ('Notification' in window) {
              logIOS('Permission status', Notification.permission);
              if (Notification.permission === 'granted') {
                autoRequestNotificationsAfterLogin(user.uid);
                setShowNotifPermissionBanner(false);
              } else if (Notification.permission === 'default') {
                if (!sessionStorage.getItem('thoth_notif_banner_dismissed')) {
                  setShowNotifPermissionBanner(true);
                }
              } else {
                setShowNotifPermissionBanner(false);
              }
            }
          } else {
            // User is signed in to Firebase Auth but onboarding is not completed in Firestore database
            setIsAuthenticated(false);
            localStorage.removeItem('isAuth');
            window.dispatchEvent(new Event('thoth_auth_changed'));
            setCurrentUser(user);
            setActiveTab('auth');
          }
        } catch (e) {
          console.error('Error loading user settings from Firestore:', e);
        }
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuth');
        window.dispatchEvent(new Event('thoth_auth_changed'));
        setShowNotifPermissionBanner(false);
        localStorage.removeItem('app-user-name');
        localStorage.removeItem('app-user-email');
        localStorage.removeItem('app-user-avatar');
        localStorage.removeItem('app-user-country');
        localStorage.removeItem('app-user-auth-type');
        handleUserLogoutCleanup();
        syncUsageFromServer('guest');
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setActiveTab('chat');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('isAuth');
    localStorage.removeItem('app-user-id');
    localStorage.removeItem('app-user-name');
    localStorage.removeItem('app-user-email');
    localStorage.removeItem('app-user-avatar');
    localStorage.removeItem('app-user-auth-type');
    handleUserLogoutCleanup();
    setIsAuthenticated(false);
    setActiveTab('chat');
    window.dispatchEvent(new Event('storage'));
  };

  const handleStartAction = (msg: any) => {
    setInitialMessage(msg);
    setActiveTab('chat');
  };

  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);

  

  if (isMaintenance.active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0d1017] text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-20 h-20 rounded-3xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center mb-6 shadow-2xl animate-pulse">
          <Sparkles className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">{language === 'ar' ? 'الموقع قيد الصيانة الدورية' : 'Site under maintenance'}</h1>
        <p className="text-sm text-white/70 max-w-md leading-relaxed mb-8">
          {isMaintenance.message}
        </p>
        <div className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
          {language === 'ar' ? 'شكراً لتفهمكم وصبركم، سنعود للعمل قريباً جداً 🚀' : 'Thank you for your patience, we will be back soon 🚀'}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: t('newChat', 'المحادثة'), icon: MessageSquare },
    { id: 'translate', label: t('liveTranslate', 'ترجمة حية'), icon: Languages },
    { id: 'tasks', label: t('tasks', 'المهام'), icon: ListTodo },
    { id: 'keep', label: t('keepNotes', 'الملاحظات'), icon: Bookmark },
  ];

  const getTitle = () => {
    switch(activeTab) {
      case 'chat': return language === 'ar' ? 'المحادثة الذكية' : 'Smart Chat';
      case 'voice': return language === 'ar' ? 'المحادثة الصوتية المباشرة' : 'Live Voice Chat';
      case 'translate': return language === 'ar' ? 'الترجمة الفورية المباشرة' : 'Live Translation';
      case 'tasks': return language === 'ar' ? 'المهام والدراسة' : 'Tasks & Study';
      case 'classroom': return t('classroom', 'الفصول الدراسية');
      case 'keep': return t('keepNotes', 'الملاحظات');
      case 'history': return t('history', 'سجل المحادثات');
      case 'discover': return language === 'ar' ? 'استكشف النماذج' : 'Discover Models';
      case 'subscription': return language === 'ar' ? 'الاشتراكات وحدود الاستخدام' : 'Subscriptions & Limits';
      case 'settings': return t('settings', 'الإعدادات');
      case 'auth': return language === 'ar' ? 'تسجيل الدخول' : 'Sign In';
      case 'admin': return t('adminPanel', 'لوحة تحكم المسؤول (الأدمن)');
      default: return 'THOTH';
    }
  };

  const isAnyModalOpen = isLiveAudioOpen || isArtifactOpen || isDailyBriefingOpen || (activeTab === 'keep' && isKeepModalOpen) || !!paymentModalData;

  return (
    <div className={`flex flex-col h-screen w-full ${activeTheme.bgClass} text-gray-100 font-sans overflow-hidden relative selection:bg-zinc-700/50 selection:text-white transition-colors duration-500`}>
      {/* Dynamic ambient lighting effects based on theme */}
      <div className={`absolute top-0 right-1/4 w-[500px] h-[300px] ${activeTheme.ambientLight1} blur-[120px] pointer-events-none rounded-full transition-all duration-700`} />
      <div className={`absolute bottom-10 left-1/4 w-[400px] h-[300px] ${activeTheme.ambientLight2} blur-[120px] pointer-events-none rounded-full transition-all duration-700`} />

      <div className={!isAnyModalOpen && activeTab !== 'settings' && activeTab !== 'subscription' && activeTab !== 'history' && activeTab !== 'auth' ? '' : 'hidden'}>
        <Header 
          isAuthenticated={isAuthenticated}
          title={getTitle()} 
          onOpenSettings={() => setActiveTab('settings')} 
          onOpenSubscription={() => setActiveTab('subscription')} 
          onOpenDailyBriefing={() => setIsDailyBriefingOpen(true)}
          onOpenHistory={() => setActiveTab('history')}
          onOpenAuth={() => setActiveTab('auth')}
        />
      </div>

      {/* Payment Result & Verification Modal */}
      {paymentModalData && (
        <PaymentResultModal 
          data={paymentModalData}
          onClose={() => setPaymentModalData(null)}
          onRetry={() => {
            setPaymentModalData(null);
            setActiveTab('subscription');
          }}
          onContactSupport={() => {
            window.location.href = 'mailto:support@thoth.ai';
          }}
        />
      )}

      {/* Global Admin Announcement Banner */}
      {announcementBanner && (
        <div 
          className={`w-full py-2 px-4 text-xs font-bold text-center flex items-center justify-between gap-2 z-30 transition-all ${
            announcementBanner.type === 'alert'
              ? 'bg-red-600/90 text-white border-b border-red-500/50'
              : announcementBanner.type === 'warning'
              ? 'bg-amber-600/90 text-white border-b border-amber-500/50'
              : 'bg-gradient-to-r from-purple-700/90 to-indigo-700/90 text-white border-b border-purple-500/50'
          }`}
         
        >
          <div className="flex items-center gap-2 mx-auto">
            <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>{announcementBanner.text}</span>
          </div>
          <button 
            onClick={() => setAnnouncementBanner(null)}
            className="p-1 text-white/70 hover:text-white rounded-md"
            title="إغلاق الإعلان"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notification Permission Enable Banner (post-login) */}
      {showNotifPermissionBanner && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#141824] border border-pink-500/40 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 flex items-start gap-3 text-right">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-bold text-white">فعّل إشعارات THOTH</h4>
            <p className="text-xs text-white/70">خليك أول من يعرف بأهم أحداث مجالات اهتمامك — محتاجين موافقتك على إذن الإشعارات.</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleEnableNotifications}
                className="text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                السماح بالإشعارات
              </button>
              <button
                onClick={handleDismissNotifBanner}
                className="text-xs text-white/50 hover:text-white px-2 py-1.5"
              >
                ليس الآن
              </button>
            </div>
          </div>
          <button
            onClick={handleDismissNotifBanner}
            className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* [iOS-DIAG] iOS Notification Install Guidance — WebKit only exposes
          the Push API to Home-Screen web apps (iOS 16.4+), so guide the user
          through the exact steps instead of failing silently. */}
      {showIOSNotifGuidance && (() => {
        const ios = getIOSNotificationSupport();
        const deniedBefore = 'Notification' in window && Notification.permission === 'denied';
        return (
          <div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSNotifGuidance(false)}
          >
            <div
              className="bg-[#141824] border border-pink-500/40 rounded-3xl p-6 w-full max-w-md text-right shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowIOSNotifGuidance(false)}
                  className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-base font-bold text-white">الإشعارات على الآيفون 📱</h4>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                نظام iOS مش بيسمح لمواقع الويب تستقبل إشعارات من متصفح Safari العادي — بيسمح بيها بس لما التطبيق يتسجّل على الشاشة الرئيسية. الخطوات دي بتتعمل مرة واحدة بس:
              </p>
              {ios.needsIOSUpdate ? (
                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-white/80 leading-relaxed">
                  ⚠️ نسخة iOS عندك ({ios.iosVersion ? `${ios.iosVersion.major}.${ios.iosVersion.minor}` : 'غير معروفة'}) مش بتدعم إشعارات الويب. محتاج iOS 16.4 أو أحدث: الإعدادات ← عام ← تحديث البرامج، وبعدها طبّق الخطوات اللي تحت.
                </div>
              ) : (
                <ol className="mt-3 space-y-2 text-xs text-white/80 leading-relaxed list-decimal ps-5">
                  <li>افتح thothai.site في Safari واضغط زر المشاركة <span className="font-bold text-pink-400">⬆️</span> (تحت في النص).</li>
                  <li>اختار <span className="font-bold text-white">«إضافة إلى الشاشة الرئيسية»</span> — Add to Home Screen.</li>
                  <li>افتح تطبيق <span className="font-bold text-white">THOTH</span> من الأيقونة اللي ظهرت على شاشة الآيفون.</li>
                  <li>سجّل دخولك، وافتح الإعدادات ← فعّل «إشعارات THOTH اليومية» واضغط <span className="font-bold text-white">السماح</span> لما يظهر الطلب.</li>
                </ol>
              )}
              {deniedBefore && (
                <div className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-white/80 leading-relaxed">
                  ⚠️ إذن الإشعارات مترفض قبل كده. امسح تطبيق THOTH من الشاشة الرئيسية، وضيفه تاني بالخطوات اللي فوق، واضغط «السماح» المرة دي.
                </div>
              )}
              <p className="mt-3 text-[10px] text-white/40 leading-relaxed" dir="ltr">
                {`[iOS Notifications] iOS ${ios.iosVersion ? `${ios.iosVersion.major}.${ios.iosVersion.minor}` : '—'} · standalone: ${ios.standalone ? 'yes ✓' : 'no'} · push: ${ios.pushCapable ? 'ready ✓' : ios.reason}`}
              </p>
              <button
                onClick={() => setShowIOSNotifGuidance(false)}
                className="mt-4 w-full py-3 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold transition-colors"
              >
                فهمت، تمام
              </button>
            </div>
          </div>
        );
      })()}

      {/* Foreground Notification Toast Banner */}
      {foregroundToast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-[#141824] border border-pink-500/50 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 flex items-start gap-3 text-right">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-bold text-white">{foregroundToast.title}</h4>
            <p className="text-xs text-white/70 line-clamp-2">{foregroundToast.body}</p>
            {foregroundToast.isBroadcast ? (
              <button
                onClick={() => {
                  // Broadcast message: open it INSIDE the chat as a THOTH
                  // message so the user can ask follow-up questions about it.
                  setActiveTab('chat');
                  window.dispatchEvent(new CustomEvent('thoth_inject_broadcast', {
                    detail: {
                      title: foregroundToast.title || '',
                      body: foregroundToast.body || '',
                      category: foregroundToast.category || '',
                      notificationId: foregroundToast.notificationId || ''
                    }
                  }));
                  setForegroundToast(null);
                }}
                className="mt-2 text-xs font-bold text-pink-400 hover:text-pink-300 underline"
              >
                {t('broadcast_open_in_chat', language === 'ar' ? 'اقرأ الرسالة واسأل عنها في المحادثة ←' : 'Read the message & ask about it in chat ←')}
              </button>
            ) : !foregroundToast.isInfo && (
              <button
                onClick={() => {
                  if (foregroundToast.notificationId) setDailyNotificationId(foregroundToast.notificationId);
                  setIsDailyBriefingOpen(true);
                  setForegroundToast(null);
                }}
                className="mt-2 text-xs font-bold text-pink-400 hover:text-pink-300 underline"
              >
                عرض حدث اليوم والتفاصيل الكاملة ←
              </button>
            )}
          </div>
          <button
            onClick={() => setForegroundToast(null)}
            className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Daily Briefing Modal */}
      {isDailyBriefingOpen && (
        <DailyBriefingModal
          notificationId={dailyNotificationId}
          onClose={() => {
            setIsDailyBriefingOpen(false);
            setDailyNotificationId(null);
          }}
        />
      )}
      
      <main className="flex-1 overflow-hidden relative z-0">
        <div className={activeTab === 'chat' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Chat 
            initialMessage={initialMessage} 
            clearInitialMessage={() => setInitialMessage('')} 
            activeChatId={activeChatSessionId}
            onSelectChatId={(id) => setActiveChatSessionId(id)}
            onToggleLiveModal={(isOpen) => setIsLiveAudioOpen(isOpen)}
            onToggleArtifactModal={(isOpen) => setIsArtifactOpen(isOpen)}
            onNavigate={(tab) => setActiveTab(tab)}
            isAuthenticated={isAuthenticated}
          />
        </div>
        {(isLiveAudioOpen) && (
          <VoiceDialog 
            onClose={() => { setIsLiveAudioOpen(false); setVoiceLearnTopic(null); }} 
            teachTopic={voiceLearnTopic ?? undefined}
            onOpenAuth={() => {
              setIsLiveAudioOpen(false);
              setVoiceLearnTopic(null);
              setActiveTab('auth');
            }}
          />
        )}
        <div className={activeTab === 'translate' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <LiveTranslate onSendToChat={handleStartAction} onNavigate={(tab) => setActiveTab(tab)} />
        </div>
        <div className={activeTab === 'tasks' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <GoogleTasks onAction={handleStartAction} onVoiceLearn={(topic) => { setVoiceLearnTopic(topic); setIsLiveAudioOpen(true); }} />
        </div>
        <div className={activeTab === 'classroom' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Classroom onStartAiChat={handleStartAction} />
        </div>
        <div className={activeTab === 'keep' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <KeepNotes onAction={handleStartAction} onModalToggle={setIsKeepModalOpen} />
        </div>
        <div className={activeTab === 'discover' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Discover onAction={handleStartAction} onNavigate={(tab) => setActiveTab(tab)} />
        </div>
        <div className={activeTab === 'history' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <History 
            onBack={() => setActiveTab('chat')}
            onSelectChat={(chatId) => {
              setActiveChatSessionId(chatId);
              setActiveTab('chat');
            }}
            onNewChat={() => {
              const newId = `new_${Date.now()}`;
              setActiveChatSessionId(newId);
              setActiveTab('chat');
            }}
            onAction={handleStartAction} 
          />
        </div>
        <div className={activeTab === 'subscription' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Subscription onClose={() => setActiveTab('chat')} />
        </div>
        <div className={activeTab === 'settings' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Settings 
            onClose={() => setActiveTab('chat')}
            onLogout={handleLogout} 
            onOpenSubscription={() => setActiveTab('subscription')} 
            onOpenAdminPanel={() => setActiveTab('admin')} 
            onOpenDiscover={() => setActiveTab('discover')}
            onOpenHistory={() => setActiveTab('history')}
            onOpenAuth={() => setActiveTab('auth')}
          />
        </div>
        <div className={activeTab === 'auth' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <Auth 
            onAuth={handleAuthSuccess}
            onClose={() => setActiveTab('chat')}
          />
        </div>
        <div className={activeTab === 'admin' ? 'flex flex-col h-full w-full overflow-hidden' : 'hidden'}>
          <AdminPanel onClose={() => setActiveTab('settings')} />
        </div>
      </main>

      <div className={!isAnyModalOpen && activeTab !== 'subscription' && activeTab !== 'history' && isAuthenticated ? '' : 'hidden'}>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      </div>
    </div>
  );
}

