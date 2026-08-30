import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

export const translations: Record<string, Record<Language, string>> = {
  newChat: { ar: 'محادثة جديدة', en: 'New Chat' },
  discover: { ar: 'اكتشف', en: 'Discover' },
  history: { ar: 'السجل', en: 'History' },
  keepNotes: { ar: 'ملاحظات Keep', en: 'Keep Notes' },
  tasks: { ar: 'المهام', en: 'Tasks' },
  classroom: { ar: 'الفصول الدراسية', en: 'Classroom' },
  liveTranslate: { ar: 'الترجمة الحية', en: 'Live Translate' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  adminPanel: { ar: 'لوحة التحكم', en: 'Admin Panel' },
  upgrade: { ar: 'ترقية', en: 'Upgrade' },
  search: { ar: 'بحث...', en: 'Search...' },
  languageSettings: { ar: 'لغة الواجهة', en: 'Interface Language' },
  selectLanguage: { ar: 'اختر لغة المنصة', en: 'Select platform language' },
  
  // Settings Tab
  profileSettings: { ar: 'إعدادات الملف الشخصي', en: 'Profile Settings' },
  appSettings: { ar: 'إعدادات التطبيق', en: 'App Settings' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  dataAndStorage: { ar: 'البيانات والتخزين', en: 'Data & Storage' },
  aboutAndSupport: { ar: 'حول والدعم', en: 'About & Support' },

  // Settings screen specific translations
  editProfile: { ar: 'تعديل الحساب', en: 'Edit Profile' },
  name: { ar: 'الاسم', en: 'Name' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  cannotBeModified: { ar: 'لا يمكن تعديله', en: 'Cannot be changed' },
  country: { ar: 'الدولة', en: 'Country' },
  selectCountry: { ar: 'اختر الدولة', en: 'Select Country' },
  arabCountries: { ar: 'الدول العربية', en: 'Arab Countries' },
  foreignCountries: { ar: 'دول أخرى', en: 'Other Countries' },
  other: { ar: 'أخرى', en: 'Other' },
  age: { ar: 'العمر', en: 'Age' },
  agePlaceholder: { ar: 'مثال: 20', en: 'e.g. 20' },
  schoolOrUni: { ar: 'المدرسة / الجامعة', en: 'School / University' },
  schoolPlaceholder: { ar: 'اسم المدرسة أو الكلية', en: 'School or university name' },
  interests: { ar: 'الاهتمامات', en: 'Interests' },
  interestsPlaceholder: { ar: 'مثال: برمجة، قراءة، كرة قدم', en: 'e.g. Coding, Reading, Football' },
  friends: { ar: 'الأصحاب / الأصدقاء المقربون', en: 'Close Friends' },
  friendsPlaceholder: { ar: 'أسماء الأصدقاء', en: 'Friends names' },
  bio: { ar: 'نبذة عامة / معلومات شخصية', en: 'Bio / Personal Notes' },
  bioPlaceholder: { ar: 'اكتب أي معلومات أخرى تريد للمساعد معرفتها عنك...', en: 'Add any details you want the AI assistant to know about you...' },
  saveChanges: { ar: 'حفظ التعديلات', en: 'Save Changes' },

  // Main settings items
  subscriptionsAndUsage: { ar: 'الاشتراكات وحدود الاستخدام', en: 'Subscriptions & Limits' },
  currentPlan: { ar: 'الباقة الحالية', en: 'Current Plan' },
  discoverModels: { ar: 'استكشاف النماذج', en: 'Discover Models' },
  discoverModelsDesc: { ar: 'اكتشف قدرات وأدوات THOTH', en: 'Explore THOTH tools and capabilities' },
  chatHistory: { ar: 'سجل المحادثات', en: 'Chat History' },
  chatHistoryDesc: { ar: 'عرض والبحث في كافة المحادثات السابقة', en: 'View and search past conversations' },
  
  // Theme & Voice
  appThemes: { ar: 'ثيمات وألوان التطبيق', en: 'App Themes & Colors' },
  appThemesDesc: { ar: 'اختر المظهر والألوان التي تناسب ذوقك', en: 'Choose your preferred look and colors' },
  geminiVoices: { ar: 'أصوات النموذج الذكي (Gemini Model Voices)', en: 'AI Model Voices' },
  geminiVoicesDesc: { ar: 'اختر الصوت الأصلي للنموذج عند التحدث والرد الصوتي', en: 'Choose the voice used for voice replies' },
  previewVoice: { ar: 'معاينة', en: 'Preview' },
  platformLanguage: { ar: 'لغة المنصة / Language', en: 'Platform Language / اللغة' },
  platformLanguageDesc: { ar: 'اختر اللغة المفضلة / Select preferred language', en: 'Select preferred platform language' },

  // Privacy & Policy
  privacyAndTerms: { ar: 'الخصوصية وشروط الخدمة', en: 'Privacy & Terms of Service' },
  viewPrivacyAndTerms: { ar: 'استعراض شروط الخدمة وسياسة الخصوصية ونظام تدريب البيانات', en: 'Review Terms of Service, Privacy Policy & Data Training' },

  // Notifications
  dailyNotifications: { ar: 'إشعارات THOTH اليومية (FCM)', en: 'THOTH Daily Notifications (FCM)' },
  dailyNotificationsToggle: { ar: 'إشعارات THOTH اليومية', en: 'THOTH Daily Notifications' },
  dailyNotificationsDesc: { ar: 'تفعيل أو إيقاف الإشعارات اليومية', en: 'Enable or disable daily push notifications' },
  adminTools: { ar: 'أدوات إشراف مدير النظام (Admin)', en: 'Admin Supervision Tools' },
  adminToolsDesc: { ar: 'إشعارات جماعية، محرك الإرسال، وإحصائيات المستخدمين', en: 'Broadcast push, trigger engine & stats' },
  openAdminPanel: { ar: 'فتح لوحة الأدمن', en: 'Open Admin Panel' },
  adminPanelNav: { ar: 'لوحة التحكم والإدارة', en: 'Admin Management Panel' },

  // Info & Data
  infoAndData: { ar: 'معلومات والبيانات', en: 'Information & Data' },
  helpAndSupport: { ar: 'المساعدة والدعم', en: 'Help & Support' },
  aboutApp: { ar: 'حول التطبيق', en: 'About App' },
  clearDataAndMemory: { ar: 'مسح جميع البيانات والذاكرة', en: 'Clear All Data & Cache' },
  logout: { ar: 'تسجيل الخروج', en: 'Log out' },

  // Confirmation & toasts
  confirmClearData: { ar: 'هل أنت متاكد من مسح كافة سجلات وسجلات المحادثات والبيانات؟', en: 'Are you sure you want to clear all history, conversations and data?' },
  dataClearedSuccess: { ar: 'تم مسح جميع البيانات بنجاح', en: 'All data cleared successfully' },
  profileUpdatedSuccess: { ar: 'تم تحديث بيانات الملف الشخصي وحفظها في الحساب بنجاح', en: 'Profile details saved successfully' },
  themeChangedToast: { ar: 'تم تغيير ثيم التطبيق إلى: ', en: 'App theme changed to: ' },
  voiceSelectedToast: { ar: 'تم اختيار صوت النموذج: ', en: 'AI voice selected: ' },
  helpToast: { ar: 'للمساعدة تواصل مع الدعم عبر البريد الإلكتروني', en: 'For assistance, please contact support via email' },
  aboutToast: { ar: 'تطبيق الذكاء الاصطناعي - الإصدار 1.0.0', en: 'THOTH AI Platform - Version 1.0.0' },

  // Subscription Page Translations
  returnToChat: { ar: 'العودة للمحادثة', en: 'Back to Chat' },
  dailyLimitReached: { ar: 'وصلت إلى الحد اليومي للباقة الحالية!', en: 'Daily usage limit reached for current plan!' },
  dailyLimitReachedDesc: { ar: 'قم بالترقية إلى THOTH Pro أو Ultra لمتابعة الاستخدام.', en: 'Upgrade to THOTH Pro or Ultra to continue unlimited usage.' },
  currentSubscription: { ar: 'اشتراكك الحالي:', en: 'Current Subscription:' },
  freeStatus: { ar: 'مجاني', en: 'Free' },
  activeStatus: { ar: 'نشط', en: 'Active' },
  freePlanDesc: { ar: 'استمتع بالحد اليومي المتاح أو اختر إحدى الباقات للترقية لخصائص فائقة.', en: 'Enjoy your daily quota or pick a plan to unlock advanced features.' },
  activePlanDesc: { ar: 'الباقة مفعّلة ومزامنة مع حسابك في قاعدة البيانات.', en: 'Plan active and synchronized with your account in the cloud database.' },
  autoRenewEnabledDesc: { ar: 'التجديد التلقائي مفّعل.', en: 'Auto-renewal is enabled.' },
  autoRenewDisabledDesc: { ar: 'التجديد التلقائي متوقف.', en: 'Auto-renewal is disabled.' },
  autoRenew: { ar: 'التجديد التلقائي', en: 'Auto-Renew' },
  cancelSubscription: { ar: 'إلغاء الاشتراك', en: 'Cancel Subscription' },
  availablePlans: { ar: 'باقات الاشتراك المتاحة', en: 'Available Subscription Plans' },
  availablePlansTitle: { ar: 'باقات الاشتراك المتاحة', en: 'Available Subscription Plans' },
  monthly: { ar: 'شهرياً', en: 'Monthly' },
  annually: { ar: 'سنوياً', en: 'Annually' },
  save16: { ar: 'وفر 16%', en: 'Save 16%' },
  freePrice: { ar: 'مجاناً', en: 'Free' },
  perMonth: { ar: ' / شهرياً', en: ' / month' },
  perYear: { ar: ' / سنوياً', en: ' / year' },
  currentPlanButton: { ar: 'الباقة الحالية', en: 'Current Plan' },
  choosePlan: { ar: 'اختيار الباقة', en: 'Select Plan' },
  switchToPlan: { ar: 'تغيير إلى هذه الباقة', en: 'Switch to this plan' },
  promoSectionTitle: { ar: 'طريقة تفعيل بديلة: كود استرداد أو كود خصم', en: 'Alternative Activation: Voucher or Promo Code' },
  promoSectionDesc: { ar: 'أدخل رمز الكود الخاص بك أدناه لترقية حسابك مباشرة وحفظ الاشتراك في قاعدة البيانات', en: 'Enter your voucher code below to upgrade your account and sync with database' },
  promoPlaceholder: { ar: 'أدخل رمز الكود (مثال: PRO2026 أو EGYPT)', en: 'Enter promo code (e.g. PRO2026 or EGYPT)' },
  promoApplyBtn: { ar: 'تطبيق الكود وتفعيل الحساب', en: 'Apply Code & Activate' },
  loadingSecurePayment: { ar: 'جاري تحميل صفحة الدفع الآمنة...', en: 'Loading secure payment gateway...' },
  completeUpgradeModalTitle: { ar: 'إتمام الاشتراك والترقية', en: 'Complete Subscription & Upgrade' },
  planNamePrefix: { ar: 'باقة ', en: 'Plan: ' },
  totalValue: { ar: 'القيمة الكلية', en: 'Total Amount' },
  annualPlanDiscount: { ar: 'باقة سنوية (خصم حاد)', en: 'Annual Plan (Discounted)' },
  monthlyPlanLabel: { ar: 'باقة شهرية', en: 'Monthly Plan' },
  allTaxesIncluded: { ar: 'شاملة كافة الضرائب', en: 'All taxes included' },
  selectPaymentMethod: { ar: 'اختر طريقة الدفع أو التفعيل', en: 'Select Payment or Activation Method' },
  bankCard: { ar: 'بطاقة بنكية', en: 'Credit/Debit Card' },
  visaMastercard: { ar: 'فيزا وماستركارد', en: 'Visa & Mastercard' },
  internationalAccounts: { ar: 'حسابات دولية', en: 'International Accounts' },
  activationCode: { ar: 'كود تفعيل', en: 'Promo / Voucher' },
  discountOrGift: { ar: 'كود خصم أو هدية', en: 'Discount or Voucher' },
  savePaymentMethodForAutoRenew: { ar: 'حفظ طريقة الدفع للتجديد التلقائي', en: 'Save payment method for auto-renewal' },
  savePreferencesSync: { ar: 'حفظ التفضيلات ومزامنتها مع حسابك', en: 'Save preferences and sync with account' },
  enterVoucherForPlan: { ar: 'أدخل كود التفعيل أو الاسترداد الخاص بالباقة:', en: 'Enter voucher or promo code for this plan:' },
  activateBtn: { ar: 'تفعيل', en: 'Activate' },
  confirmPayPaymob: { ar: 'تأكيد ودفع عبر Paymob', en: 'Confirm & Pay via Paymob' },
  processingPayment: { ar: 'جاري معالجة وتأكيد الدفع...', en: 'Processing payment securely...' },
  encryptedSecurePaymob: { ar: 'معاملة حقيقية مشفرة ومحمية بالكامل عبر Paymob', en: 'Encrypted and protected transaction powered by Paymob' },
  planSummary: { ar: 'ملخص الباقة', en: 'Plan Summary' },
  featuresIncluded: { ar: 'المميزات المتضمنة في الباقة', en: 'Included Plan Features' },
  billingDetails: { ar: 'تفاصيل الدفع والفوترة', en: 'Payment & Billing' },
  instantActivation: { ar: 'تفعيل فوري وحفظ بالسحابة', en: 'Instant Cloud Activation' },
  cancelAnytime: { ar: 'إلغاء في أي وقت بدون التزامات', en: 'Cancel anytime, no commitment' },
  securePaymentGuarantee: { ar: 'دفع آمن ومشفر 100%', en: '100% Secure & Encrypted' },
  changeBillingCycle: { ar: 'دورة الفوترة', en: 'Billing Cycle' },
  orderSummary: { ar: 'ملخص الطلب', en: 'Order Summary' },
  dueToday: { ar: 'المستحق اليوم', en: 'Due Today' },
  payWithPaypal: { ar: 'متابعة الدفع عبر PayPal', en: 'Continue with PayPal' },
  payWithStripe: { ar: 'متابعة الدفع عبر Stripe', en: 'Continue with Stripe' },
  cancelModalTitle: { ar: 'إلغاء الاشتراك الحالي', en: 'Cancel Current Subscription' },
  cancelModalDesc: { ar: 'عند إقرار إلغاء الاشتراك، سيتم إيقاف التجديد التلقائي والتحويل إلى الباقات المجانية فوراً وتحديث بياناتك في قاعدة البيانات.', en: 'Upon cancelling, auto-renewal will stop and your plan will revert to the Free tier.' },
  goBack: { ar: 'تراجع', en: 'Go Back' },
  confirmCancelBtn: { ar: 'تأكيد إلغاء الاشتراك', en: 'Confirm Cancellation' },
  cancelSuccessAlert: { ar: 'تم إلغاء الاشتراك بنجاح والتحويل إلى الباقة المجانية.', en: 'Subscription cancelled successfully and reverted to Free tier.' },
  cancelErrorAlert: { ar: 'حدث خطأ أثناء إلغاء الاشتراك. حاول مرة أخرى.', en: 'An error occurred while cancelling subscription. Please try again.' },

  // Authentication screen translations
  authWelcomeBack: { ar: 'مرحباً بعودتك', en: 'Welcome Back' },
  authCreateAccount: { ar: 'إنشاء حساب جديد', en: 'Create New Account' },
  authLoginSubtitle: { ar: 'أدخل بياناتك للمتابعة إلى التطبيق', en: 'Enter your credentials to continue to the app' },
  authRegisterSubtitle: { ar: 'انضم إلينا واستكشف كافة الميزات الذكية', en: 'Join us and explore all intelligent AI features' },
  authFullName: { ar: 'الاسم الكامل', en: 'Full Name' },
  authFullNamePlaceholder: { ar: 'أدخل اسمك الكامل', en: 'Enter your full name' },
  authCountryRegion: { ar: 'البلد / المنطقة', en: 'Country / Region' },
  authEmail: { ar: 'البريد الإلكتروني', en: 'Email Address' },
  authPassword: { ar: 'كلمة المرور', en: 'Password' },
  authAgreeTerms: { ar: 'أوافق على ', en: 'I agree to the ' },
  authTermsAndPrivacy: { ar: 'شروط الخدمة والخصوصية', en: 'Terms of Service & Privacy' },
  authTermsSuffix: { ar: 'شاملة الإعلانات غير الشخصية (Zero-PII) ومشاركة التفاعلات لتطوير النماذج كبند إجباري لاستخدام الخدمة.', en: 'including Zero-PII non-personalized advertising and interactions sharing for model optimization as a mandatory condition.' },
  authLoginBtn: { ar: 'تسجيل الدخول', en: 'Sign In' },
  authRegisterBtn: { ar: 'إنشاء الحساب', en: 'Sign Up' },
  authOrContinueWith: { ar: 'أو المتابعة عبر', en: 'or continue with' },
  authQuickGoogle: { ar: 'تسجيل سريع عبر Google', en: 'Quick Sign In with Google' },
  authNoAccount: { ar: 'ليس لديك حساب؟ ', en: "Don't have an account? " },
  authHaveAccount: { ar: 'لديك حساب بالفعل؟ ', en: 'Already have an account? ' },
  authMustAgreeTerms: { ar: 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.', en: 'You must agree to the Terms of Service & Privacy Policy to proceed.' },
  authEnterFullName: { ar: 'يرجى إدخال الاسم الكامل', en: 'Please enter your full name' },
  authEmailInUse: { ar: 'البريد الإلكتروني مستخدم بالفعل. يمكنك تسجيل الدخول.', en: 'Email is already in use. You can sign in.' },
  authInvalidCredentials: { ar: 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.', en: 'Invalid credentials. Please verify your email and password.' },
  authWeakPassword: { ar: 'كلمة المرور ضعيفة. يجب أن تتكون من 6 أحرف أو أكثر.', en: 'Weak password. It must be at least 6 characters.' },
  authServerUnavailable: { ar: 'تعذر الاتصال بخادم الحسابات. يرجى المحاولة لاحقاً.', en: 'Could not connect to authentication server. Please try again.' },
  authPopupClosed: { ar: 'تم إغلاق النافذة أو تعذر تأكيد حسابك.', en: 'Popup was closed or could not verify account.' },
  authGoogleGuest: { ar: 'مستخدم جوجل', en: 'Google User' },
  authBack: { ar: 'الرجوع', en: 'Back' },
  authCompleteGoogleTitle: { ar: 'استكمال بيانات الحساب', en: 'Complete Account Setup' },
  authCompleteGoogleSubtitle: { ar: 'يرجى اختيار بلدك والموافقة على الشروط للمتابعة إلى التطبيق', en: 'Please select your country and accept terms to proceed to the app' },
  authCompleteContinueBtn: { ar: 'إتمام التسجيل والبدء', en: 'Complete Registration & Start' },
  authGoogleConnectedAs: { ar: 'حساب جوجل المتصل:', en: 'Connected Google account:' },
  authChangeAccount: { ar: 'تسجيل بحساب آخر', en: 'Sign in with another account' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = (key: string, fallback?: string) => {
    if (translations[key]) {
      return translations[key][language];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
