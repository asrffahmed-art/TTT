import React, { useState, useEffect } from 'react';
import { 
  Crown, Star, User, Gem, Rocket, 
  Check, 
  Zap, 
  ShieldCheck, 
  MessageSquare, 
  Globe,
  Mic, 
  Languages, 
  CreditCard, 
  Gift, 
  Sparkles, 
  X, 
  ChevronRight,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { 
  SUBSCRIPTION_PLANS, 
  getUserPlan, 
  getTodayUsage, 
  upgradeUserPlan, 
  redeemPromoCode, 
  initSubscriptionPlans,
  cancelUserSubscription,
  PlanDetails, 
  UsageData 
} from '../lib/subscriptionService';
import { useAppTheme } from '../lib/themeService';
import { useLanguage } from '../lib/LanguageContext';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { StripePaymentWrapper, PayPalPaymentWrapper } from "./PaymentForms";

interface SubscriptionProps {
  onClose?: () => void;
  highlightLimitType?: 'chat' | 'voice' | 'translate' | null;
}

import { PaymobEmbeddedCheckout } from './PaymobEmbeddedCheckout';

const PLAN_TRANSLATIONS: Record<string, {
  name: { ar: string; en: string };
  badge?: { ar: string; en: string };
  features: { ar: string[]; en: string[] };
}> = {
  guest: {
    name: { ar: 'زائر', en: 'Guest' },
    badge: { ar: 'زائر', en: 'Guest' },
    features: {
      ar: ['تجربة أولية للدردشة السريعة', 'تفكير عميق واستنتاج تجريبي', 'بحث ويب مباشر', 'محادثة صوتية حية THOTH Live', 'يتطلب التسجيل للوصول الكامل'],
      en: ['Quick initial chat trial', 'Deep reasoning trial', 'Direct web search', 'THOTH Live voice chat', 'Sign-in required for full access']
    }
  },
  free: {
    name: { ar: 'الباقة المجانية', en: 'Free Plan' },
    badge: { ar: 'الأساسية', en: 'Starter' },
    features: {
      ar: [
        'ردود سريعة وذكية للمحادثات اليومية',
        'تفكير عميق وتحليل منطقي متقدم',
        'بحث مباشر في الويب مع مصادر حية',
        'ملخص صوتي وبودكاست ذكي يومي',
        'تلخيص نصي للمستندات والروابط',
        'حوار صوتي تفاعلي THOTH Live'
      ],
      en: [
        'Fast AI responses for daily conversations',
        'Advanced deep reasoning and logic',
        'Live web search with verified sources',
        'Daily smart audio podcast summary',
        'Document & link summarization',
        'THOTH Live interactive voice chat'
      ]
    }
  },
  basic: {
    name: { ar: 'الباقة الأساسية', en: 'Basic Plan' },
    badge: { ar: 'شائعة', en: 'Popular' },
    features: {
      ar: [
        'محادثات ذكية موسعة وسريعة',
        'تفكير عميق وتحليل مسائل مطور',
        'بحث ويب حي مع روابط موثوقة',
        'ملخصات صوتية وبودكاست ذكي متعدد',
        'تلخيص شامل للمستندات والملفات',
        'جلسات حوار صوتي THOTH Live أطول'
      ],
      en: [
        'Expanded fast AI conversations',
        'Enhanced deep reasoning and analysis',
        'Real-time web search with source links',
        'Multiple smart audio podcasts',
        'Comprehensive document & file summaries',
        'Extended THOTH Live voice sessions'
      ]
    }
  },
  pro: {
    name: { ar: 'الباقة الاحترافية (THOTH Pro)', en: 'THOTH Pro' },
    badge: { ar: 'الأكثر اختياراً', en: 'Most Popular' },
    features: {
      ar: [
        'محادثات ذكية سريعة ومكثفة',
        'تفكير واستنتاج منطقي دقيق وموسع',
        'بحث واستقصاء ويب فوري ومحدث',
        'استوديو متقدم للبودكاست الصوتي',
        'تلخيص احترافي لكافة المستندات',
        'حوار صوتي THOTH Live عالي الدقة',
        'تكامل كامل مع THOTH Workspace'
      ],
      en: [
        'High-capacity fast AI conversations',
        'Expanded deep logic & reasoning',
        'Continuous real-time web research',
        'Advanced podcast studio & audio summaries',
        'Professional full document analysis',
        'High-definition THOTH Live voice chat',
        'Full THOTH Workspace integration'
      ]
    }
  },
  max: {
    name: { ar: 'الباقة القصوى (Max)', en: 'THOTH Max' },
    badge: { ar: 'الأفضل للأعمال', en: 'Best for Business' },
    features: {
      ar: [
        'سعة محادثات ضخمة واستجابة فائقة',
        'تحليل منطقي وتفكير عميق مكثف',
        'بحث ويب تحليلي متقدم وشامل',
        'ملخصات صوتية وبودكاست متعددة',
        'معالجة وتحليل متقدم للملفات الكبيرة',
        'حوار صوتي حي مطول وأولوية معالجة',
        'دعم فني وأولوية قصوى'
      ],
      en: [
        'Massive conversation capacity & rapid response',
        'Heavy deep reasoning & complex synthesis',
        'Advanced analytics web research',
        'Extensive audio podcast generation',
        'Deep analysis for large files & docs',
        'Extended HD Live voice with priority queue',
        'Priority support & processing power'
      ]
    }
  },
  ultra: {
    name: { ar: 'الباقة الفائقة (THOTH Ultra)', en: 'THOTH Ultra' },
    badge: { ar: 'سعة فائقة', en: 'Ultra Capacity' },
    features: {
      ar: [
        'أعلى سعة للردود السريعة ومحادثات الذكاء الاصطناعي',
        'استنتاج عميق وتفكير تحليلي بأعلى دقة',
        'بحث واستقصاء ويب فوري مستمر',
        'استوديو صوتي وبودكاست متكامل',
        'تحليل واستيعاب شامل لكافة المستندات',
        'حوار صوتي مستمر THOTH Live بأعلى جودة',
        'أولوية مطلقة على سيرفرات المعالجة الفائقة'
      ],
      en: [
        'Ultimate capacity for fast AI chats',
        'Maximum depth reasoning & analysis',
        'Unrestricted real-time web research',
        'Complete smart audio & podcast suite',
        'Comprehensive document understanding',
        'Continuous ultra-HD live voice chat',
        'Top priority on ultra-compute servers'
      ]
    }
  }
};

const PaymobInlineWrapper = ({ plan, isAnnual, onSuccess, onError, email, userId, name, onStateChange }: any) => {
  const { language } = useLanguage();
  const [clientSecret, setClientSecret] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchIntent = async () => {
      setLoading(true);
      setError('');
      if (onStateChange) onStateChange({ status: 'loading' });

      try {
        const planBasePrice = plan.priceEgp ?? SUBSCRIPTION_PLANS[plan.id]?.priceEgp ?? 0;
        const amount = isAnnual ? planBasePrice * 10 : planBasePrice;
        
        const res = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            planId: plan.id,
            amount,
            paymentMethod: 'paymob',
            email,
            phone: '01000000000',
            name
          })
        });
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
        if (isMounted) {
          if (data.paymobClientSecret) {
            setClientSecret(data.paymobClientSecret);
            setPublicKey(data.paymobPublicKey || '');
            if (onStateChange) onStateChange({ status: 'pixel' });
          }
          if (data.paymentUrl) {
            setPaymentUrl(data.paymentUrl);
            if (!data.paymobClientSecret && onStateChange) {
              onStateChange({ status: 'iframe', paymentUrl: data.paymentUrl });
            }
          }
          if (!data.paymobClientSecret && !data.paymentUrl) {
            const errText = data.error || (language === 'ar' ? 'لم يتم العثور على مفاتيح Paymob المعتمدة في السيرفر.' : 'No verified Paymob keys found on server.');
            setError(errText);
            if (onStateChange) onStateChange({ status: 'error', errorMsg: errText });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const errText = err.message || (language === 'ar' ? 'خطأ أثناء الاتصال بخوادم Paymob' : 'Error connecting to Paymob servers');
          setError(errText);
          if (onStateChange) onStateChange({ status: 'error', errorMsg: errText });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchIntent();
    return () => { isMounted = false; };
  }, [plan, isAnnual, email, userId, name, language]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <span className="animate-spin rounded-full h-8 w-8 border-4 border-[#e63946]/30 border-t-[#e63946]"></span>
      <span className="text-white/60 text-sm font-medium">
        {language === 'ar' ? 'جاري الاتصال بخوادم Paymob وتهيئة الجلسة...' : 'Connecting to Paymob servers & initializing session...'}
      </span>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs leading-relaxed space-y-3">
      <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
        <span className="material-symbols-outlined text-base">warning</span>
        <span>{language === 'ar' ? 'ربط Paymob الحقيقي يحتاج مفاتيح API الخاصة بحسابك' : 'Real Paymob integration requires API credentials'}</span>
      </div>
      <p className="text-white/80">{error}</p>
      <div className="pt-2 border-t border-amber-500/20 text-white/70">
        <p className="font-semibold text-white mb-1.5">{language === 'ar' ? 'خطوات ربط حسابتك في Paymob لعمليات دفع حقيقية:' : 'Steps to link your Paymob account:'}</p>
        <ol className="list-decimal list-inside space-y-1 text-[11px] text-white/60">
          {language === 'ar' ? (
            <>
              <li>سجل الدخول في <a href="https://accept.paymob.com" target="_blank" rel="noreferrer" className="underline text-amber-300">لوحة Paymob</a>.</li>
              <li>اذهب إلى Developers {"->"} API Keys وانسخ (API Key و Public Key).</li>
              <li>اذهب إلى Developers {"->"} Payment Integrations وانسخ (Integration ID).</li>
              <li>ضع هذه البيانات في <strong>لوحة تحكم الأدمن (/admin)</strong> بتبويب مفاتيح API.</li>
            </>
          ) : (
            <>
              <li>Sign in to <a href="https://accept.paymob.com" target="_blank" rel="noreferrer" className="underline text-amber-300">Paymob Dashboard</a>.</li>
              <li>Go to Developers {"->"} API Keys and copy (API Key & Public Key).</li>
              <li>Go to Developers {"->"} Payment Integrations and copy (Integration ID).</li>
              <li>Paste credentials in the <strong>Admin Panel (/admin)</strong> under API Keys.</li>
            </>
          )}
        </ol>
      </div>
      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            if (onSuccess) onSuccess('demo_paymob_simulated');
          }}
          className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg transition-colors border border-amber-500/30 flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">play_circle</span>
          <span>{language === 'ar' ? 'تفعيل الترقية الفورية الآن (Demo Activation)' : 'Activate Instant Upgrade Now (Demo)'}</span>
        </button>
      </div>
    </div>
  );

  if (clientSecret) {
    return (
      <div className="w-full">
        <PaymobEmbeddedCheckout 
          clientSecret={clientSecret} 
          publicKey={publicKey} 
          onClose={() => {}} 
          onSuccess={onSuccess} 
        />
      </div>
    );
  }

  if (paymentUrl) {
    return (
      <div className="w-full space-y-3 py-2">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
          <span>{language === 'ar' ? 'تم إنشاء جلسة الدفع بنجاح عبر Paymob' : 'Payment session created successfully via Paymob'}</span>
        </div>
        <iframe
          src={paymentUrl}
          className="w-full h-[320px] rounded-xl border border-white/10 bg-white/[0.02]"
          title="Paymob Unified Checkout"
        />
        <a
          href={paymentUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">open_in_new</span>
          <span>{language === 'ar' ? 'فتح نافذة Paymob الرسمية في تبويب مستقل' : 'Open official Paymob checkout in new tab'}</span>
        </a>
      </div>
    );
  }

  return null;
};

export function Subscription({ onClose, highlightLimitType }: SubscriptionProps) {
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [plansTrigger, setPlansTrigger] = useState(0);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  const getLocalizedPlanName = (plan: PlanDetails | { id: string; name?: string } | null) => {
    if (!plan) return '';
    if (PLAN_TRANSLATIONS[plan.id]?.name[language]) {
      return PLAN_TRANSLATIONS[plan.id].name[language];
    }
    return plan.name || plan.id;
  };

  const getLocalizedBadge = (plan: PlanDetails) => {
    if (PLAN_TRANSLATIONS[plan.id]?.badge?.[language]) {
      return PLAN_TRANSLATIONS[plan.id].badge![language];
    }
    return plan.badge;
  };

  const getLocalizedFeatures = (plan: PlanDetails) => {
    if (PLAN_TRANSLATIONS[plan.id]?.features[language]) {
      return PLAN_TRANSLATIONS[plan.id].features[language];
    }
    return plan.features;
  };

  useEffect(() => {
    fetch("/api/payment/config")
      .then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : null)
      .then(d => d && setPaymentConfig(d))
      .catch(console.error);
  }, []);

  useEffect(() => {
    initSubscriptionPlans();
    const handlePlansLoaded = () => {
      setPlansTrigger(prev => prev + 1);
      setCurrentPlan(getUserPlan());
    };
    window.addEventListener('thoth_plans_loaded', handlePlansLoaded);
    return () => window.removeEventListener('thoth_plans_loaded', handlePlansLoaded);
  }, []);

  const theme = useAppTheme();
  const [currentPlan, setCurrentPlan] = useState<PlanDetails>(getUserPlan());
  const [usage, setUsage] = useState<UsageData>(getTodayUsage());
  const [promoCode, setPromoCode] = useState('');
  const [isAnnual, setIsAnnual] = useState(false);
  const planLevels: Record<string, number> = { guest: 0, free: 1, basic: 2, pro: 3, max: 4, ultra: 5 };
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPlanForPay, setSelectedPlanForPay] = useState<PlanDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paymob' | 'paypal' | 'stripe' | 'card' | 'promo'>('paymob');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [paymobEmbeddedData, setPaymobEmbeddedData] = useState<{clientSecret: string, publicKey: string} | null>(null);
  const [paymobActiveState, setPaymobActiveState] = useState<{ status: 'loading' | 'pixel' | 'iframe' | 'error' | 'demo', paymentUrl?: string, errorMsg?: string }>({ status: 'loading' });
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState<boolean>(true);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const handleConfirmCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      await cancelUserSubscription();
      setCurrentPlan(getUserPlan());
      setShowCancelModal(false);
      alert(t('cancelSuccessAlert', 'تم إلغاء الاشتراك بنجاح والتحويل إلى الباقة المجانية.'));
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      alert(t('cancelErrorAlert', 'حدث خطأ أثناء إلغاء الاشتراك. حاول مرة أخرى.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const [currencyInfo, setCurrencyInfo] = useState({ currency: 'EGP', rate: 1, isEgypt: true, loaded: false });

  useEffect(() => {
    async function fetchCurrencyAndRate() {
      try {
        const userCountry = localStorage.getItem('app-user-country') || 'الجمهورية المصرية';
        const normCountry = (userCountry || '').toLowerCase().trim();
        
        const isEgypt = normCountry.includes('مصر') || 
                        normCountry.includes('egypt') || 
                        normCountry.includes('الجمهورية المصرية') ||
                        normCountry.includes('جمهورية مصر العربية') ||
                        normCountry === 'eg';

        if (isEgypt || !userCountry) {
          setCurrencyInfo({ currency: 'EGP', rate: 1, isEgypt: true, loaded: true });
          return;
        }

        const countryCurrencyMap: Record<string, string> = {
          "المملكة العربية السعودية": "SAR",
          "الإمارات العربية المتحدة": "AED",
          "الكويت": "KWD",
          "قطر": "QAR",
          "البحرين": "BHD",
          "سلطنة عمان": "OMR",
          "الأردن": "JOD",
          "لبنان": "LBP",
          "العراق": "USD",
          "الجزائر": "DZD",
          "المغرب": "MAD",
          "تونس": "TND",
          "الولايات المتحدة": "USD",
          "المملكة المتحدة": "GBP",
          "كندا": "CAD",
          "أستراليا": "AUD",
          "تركيا": "TRY",
          "ألمانيا": "EUR",
          "فرنسا": "EUR",
          "إيطاليا": "EUR",
          "إسبانيا": "EUR",
          "هولندا": "EUR",
          "سويسرا": "CHF",
          "أخرى": "EGP"
        };
        
        const selectedCurrency = countryCurrencyMap[userCountry] || 'EGP';
        
        if (selectedCurrency === 'EGP') {
          setCurrencyInfo({ currency: 'EGP', rate: 1, isEgypt: true, loaded: true });
          return;
        }

        const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const rateContentType = rateRes.headers.get("content-type") || "";
        const rateData = rateContentType.includes("application/json") ? await rateRes.json().catch(() => ({ rates: {} })) : { rates: {} };
        const rate = rateData.rates[selectedCurrency] || 1;
        
        setCurrencyInfo({ currency: selectedCurrency, rate: rate, isEgypt: false, loaded: true });
      } catch (e) {
        setCurrencyInfo({ currency: 'EGP', rate: 1, isEgypt: true, loaded: true });
      }
    }
    
    fetchCurrencyAndRate();
    
    const handleStorageChange = () => {
      fetchCurrencyAndRate();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getPlanBaseEgp = (plan: PlanDetails) => {
    if (plan.priceEgp && plan.priceEgp > 0) return plan.priceEgp;
    const defaults: Record<string, number> = { basic: 99, pro: 199, max: 399, ultra: 599 };
    return defaults[plan.id] || 99;
  };

  const getPlanBaseUsd = (plan: PlanDetails) => {
    if (plan.priceUsd && plan.priceUsd > 0) return plan.priceUsd;
    const defaults: Record<string, number> = { basic: 5, pro: 10, max: 20, ultra: 30 };
    return defaults[plan.id] || 5;
  };

  const formatPrice = (plan: PlanDetails) => {
    if (plan.id === 'guest' || plan.id === 'free') return t('freePrice', 'مجاناً');
    if (!currencyInfo.loaded) return '...';
    
    const egpAmount = getPlanBaseEgp(plan);
    const usdAmount = getPlanBaseUsd(plan);
    const periodSuffix = isAnnual ? t('perYear', ' / سنوياً') : t('perMonth', ' / شهرياً');

    if (currencyInfo.isEgypt || currencyInfo.currency === 'EGP') {
      const priceVal = isAnnual ? egpAmount * 10 : egpAmount;
      return `${priceVal} £${periodSuffix}`;
    }

    const convertedPrice = Math.round(usdAmount * currencyInfo.rate);
    const finalPrice = isAnnual ? convertedPrice * 10 : convertedPrice;

    if (currencyInfo.currency === 'SAR') {
      return `${finalPrice} ${language === 'ar' ? 'ر.س' : 'SAR'}${periodSuffix}`;
    } else if (currencyInfo.currency === 'AED') {
      return `${finalPrice} ${language === 'ar' ? 'د.إ' : 'AED'}${periodSuffix}`;
    } else if (currencyInfo.currency === 'KWD') {
      return `${finalPrice} ${language === 'ar' ? 'د.ك' : 'KWD'}${periodSuffix}`;
    } else if (currencyInfo.currency === 'USD') {
      return `$${finalPrice}${periodSuffix}`;
    } else if (currencyInfo.currency === 'EUR') {
      return `€${finalPrice}${periodSuffix}`;
    } else if (currencyInfo.currency === 'GBP') {
      return `£${finalPrice}${periodSuffix}`;
    }

    return `${finalPrice} ${currencyInfo.currency}${periodSuffix}`;
  };

  const formatPriceShort = (plan: PlanDetails) => {
    if (plan.id === 'guest' || plan.id === 'free') return t('freePrice', 'مجاناً');
    if (!currencyInfo.loaded) return '...';

    const egpAmount = getPlanBaseEgp(plan);
    const usdAmount = getPlanBaseUsd(plan);

    if (currencyInfo.isEgypt || currencyInfo.currency === 'EGP') {
      const priceVal = isAnnual ? egpAmount * 10 : egpAmount;
      return `${priceVal} £`;
    }

    const convertedPrice = Math.round(usdAmount * currencyInfo.rate);
    const finalPrice = isAnnual ? convertedPrice * 10 : convertedPrice;

    if (currencyInfo.currency === 'USD') return `$${finalPrice}`;
    if (currencyInfo.currency === 'EUR') return `€${finalPrice}`;
    if (currencyInfo.currency === 'GBP') return `£${finalPrice}`;
    if (currencyInfo.currency === 'SAR') return `${finalPrice} ${language === 'ar' ? 'ر.س' : 'SAR'}`;
    if (currencyInfo.currency === 'AED') return `${finalPrice} ${language === 'ar' ? 'د.إ' : 'AED'}`;

    return `${finalPrice} ${currencyInfo.currency}`;
  };


  useEffect(() => {
    const fetchAutoRenewStatus = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.autoRenew !== undefined) {
              setAutoRenew(data.autoRenew);
            }
          }
        } catch (err) {
          console.error("Error fetching autoRenew status:", err);
        }
      }
    };
    fetchAutoRenewStatus();

    const refreshData = () => {
      setCurrentPlan(getUserPlan());
      setUsage(getTodayUsage());
    };
    refreshData();
    window.addEventListener('thoth_plan_updated', refreshData);
    window.addEventListener('thoth_usage_updated', refreshData);
    return () => {
      window.removeEventListener('thoth_plan_updated', refreshData);
      window.removeEventListener('thoth_usage_updated', refreshData);
    };
  }, []);

  
  const handleToggleAutoRenew = async () => {
    if (!auth.currentUser) return;
    setIsUpdatingAutoRenew(true);
    const newValue = !autoRenew;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        autoRenew: newValue
      });
      setAutoRenew(newValue);
    } catch (err) {
      console.error("Error updating autoRenew:", err);
      alert("حدث خطأ أثناء تحديث حالة التجديد التلقائي.");
    } finally {
      setIsUpdatingAutoRenew(false);
    }
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const res = await redeemPromoCode(promoCode);
    setPromoResult(res);
    if (res.success) {
      setPromoCode('');
      setCurrentPlan(getUserPlan());
      setTimeout(() => {
        setPromoResult(null);
      }, 4000);
    }
  };

  
  const triggerVerificationModal = (status: 'verifying' | 'success' | 'failed', orderIdVal?: string, errorMsg?: string) => {
    const basePrice = selectedPlanForPay ? (selectedPlanForPay.priceEgp ?? SUBSCRIPTION_PLANS[selectedPlanForPay.id]?.priceEgp ?? 0) : 0;
    const finalAmount = isAnnual ? basePrice * 10 : basePrice;

    window.dispatchEvent(new CustomEvent('open-payment-modal', {
      detail: {
        status,
        orderId: orderIdVal || localStorage.getItem('thoth_last_order_id') || 'THOTH-PAYMOB-82190',
        planId: selectedPlanForPay?.id || 'pro',
        planName: selectedPlanForPay?.name || 'باقة المحترفين Pro',
        amount: finalAmount,
        currency: currencyInfo.isEgypt ? 'ج.م' : '$',
        paymentMethod: paymentMethod === 'paymob' ? 'بوابة Paymob - بطاقة بنكية' : paymentMethod === 'paypal' ? 'حساب PayPal' : 'بطاقة ائتمانية',
        failureReason: errorMsg,
        completedAt: new Date().toISOString()
      }
    }));
  };

  const handleDirectSuccess = (orderId: string) => {
    setPaymentSuccess(true);
    if (selectedPlanForPay) {
      localStorage.setItem('thoth_user_plan', selectedPlanForPay.id);
      window.dispatchEvent(new Event('thoth_plan_updated'));

      if (auth.currentUser) {
        try {
          updateDoc(doc(db, 'users', auth.currentUser.uid), {
            plan: selectedPlanForPay.id,
            autoRenew: savePaymentMethod,
            savedPaymentMethod: paymentMethod,
            subscriptionStatus: 'active',
            subscriptionDate: new Date().toISOString()
          }).catch(() => {});
        } catch(e) {}
      }

      setSelectedPlanForPay(null);
      triggerVerificationModal('verifying', orderId);
    }
  };

  const handleDirectError = (err: string) => {
    setSelectedPlanForPay(null);
    triggerVerificationModal('failed', undefined, err);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'paymob_payment_status') {
        if (event.data.status === 'success') {
          handleDirectSuccess('paymob');
          setIframeUrl(null);
          setPaymobEmbeddedData(null);
        } else {
          handleDirectError(event.data.reason || 'تم رفض المعاملة من البنك المصدر للبطاقة.');
          setIframeUrl(null);
          setPaymobEmbeddedData(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedPlanForPay]);

  const handleConfirmPayment = async () => {
    if (!selectedPlanForPay) return;
    setIsProcessingPayment(true);
    try {
      const userId = auth.currentUser ? auth.currentUser.uid : 'guest';
      const email = auth.currentUser?.email || localStorage.getItem('app-user-email') || 'user@thoth.ai';
      const planBasePrice = selectedPlanForPay.priceEgp ?? SUBSCRIPTION_PLANS[selectedPlanForPay.id]?.priceEgp ?? 0;
      const amount = isAnnual ? planBasePrice * 10 : planBasePrice;

      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planId: selectedPlanForPay.id,
          amount,
          paymentMethod,
          email,
          phone: '01000000000',
          name: auth.currentUser?.displayName || 'مستخدم THOTH'
        })
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const textResponse = await res.text();
        console.error("Non-JSON payment response:", res.status, textResponse);
        data = { success: false, error: `استجابة غير متوقعة من السيرفر (رمز الحالة ${res.status}).` };
      }
      if (res.ok && data.success) {
        if (data.directActivated) {
          handleDirectSuccess(data.orderId || 'free');
          setIsProcessingPayment(false);
          return;
        }
        if (data.paymentUrl || data.paymobClientSecret) {
          if (paymentMethod === 'paymob' || paymentMethod === 'card') {
            if (data.paymobClientSecret && data.paymobPublicKey) {
               setPaymobEmbeddedData({ clientSecret: data.paymobClientSecret, publicKey: data.paymobPublicKey });
            } else if (data.paymentUrl) {
               setIframeUrl(data.paymentUrl);
               setIframeLoading(true);
            } else {
               window.location.href = data.paymentUrl;
            }
          } else {
            // Redirect directly to Paymob/PayPal/Stripe secure checkout page for seamless payment experience
            window.location.href = data.paymentUrl;
          }
          setIsProcessingPayment(false);
          return;
        }
        alert('عذراً، لم يتم إرجاع رابط الدفع من بوابة Paymob. يرجى التحقق من إعداد المفاتيح (API Keys & Integration ID) في لوحة تحكم الأدمن.');
        setIsProcessingPayment(false);
        return;
      } else {
        const errorMsg = data.error || 'فشل معالجة الدفع.';
        if (errorMsg.includes('Integration ID')) {
           alert('⚠️ تنبيه هام لربط Paymob:\n\n' + errorMsg + '\n\nكيفية الحصول عليه:\n1. سجل الدخول إلى لوحة Paymob (accept.paymob.com).\n2. توجه إلى Developers -> Payment Integrations.\n3. انسخ رقم Integration ID الخاص بطريقة الدفع (مثل Card أو Wallet).\n4. أضفه في لوحة تحكم الأدمن في التطبيق (Paymob Integration ID).');
        } else if (errorMsg.includes('Public Key')) {
           alert('⚠️ مطلوب المفتاح العام (Paymob Public Key):\n\n' + errorMsg + '\n\nكيفية الحصول عليه:\n1. سجل الدخول إلى حسابك في Paymob (accept.paymob.com).\n2. اذهب إلى Developers -> API Keys.\n3. انسخ Public Key (يبدأ بـ egy_pk_...).\n4. الصقه في لوحة تحكم الأدمن بالبرنامج (Paymob Public Key).');
        } else {
           alert(errorMsg);
        }
        setIsProcessingPayment(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('حدث خطأ في الاتصال ببوابة الدفع. تأكد من إعداداتك.');
      setIsProcessingPayment(false);
    }
  };

  // Percentages for usage
  const chatPercent = currentPlan.chatLimit >= 999999 ? 0 : Math.min(100, Math.round((usage.chatUsed / currentPlan.chatLimit) * 100));
  const voiceMinsUsed = Math.floor(usage.voiceSecUsed / 60);
  const voiceMinsLimit = Math.floor(currentPlan.voiceLimitSec / 60);
  const voicePercent = currentPlan.voiceLimitSec >= 999999 ? 0 : Math.min(100, Math.round((usage.voiceSecUsed / currentPlan.voiceLimitSec) * 100));
  const translatePercent = currentPlan.translateLimit >= 999999 ? 0 : Math.min(100, Math.round((usage.translateUsed / currentPlan.translateLimit) * 100));

  return (
    <div className={`flex flex-col w-full h-full pb-24 pt-3 sm:pt-6 px-3.5 sm:px-6 md:px-8 max-w-7xl mx-auto overflow-y-auto hide-scrollbar font-sans ${isRtl ? 'text-right' : 'text-left'}`}>
      
      {/* Return Button */}
      {onClose && (
        <div className="flex items-center justify-start mb-4 sm:mb-6">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl glass-card bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition-all text-xs sm:text-sm font-bold cursor-pointer backdrop-blur-xl shadow-lg active:scale-95 min-h-[40px]"
          >
            {isRtl ? <ArrowRight className="w-4 h-4 text-white/80" /> : <ArrowLeft className="w-4 h-4 text-white/80" />}
            <span>{t('returnToChat', 'العودة للمحادثة')}</span>
          </button>
        </div>
      )}

      {/* Header Title & Subtitle */}
      <div className="text-center mb-6 sm:mb-8 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card bg-white/[0.04] border border-white/10 text-white/90 text-xs font-semibold mb-3 backdrop-blur-xl shadow-sm">
          <Sparkles className={`w-3.5 h-3.5 ${theme.textAccent}`} />
          <span>{t('upgradeTitleTag', 'ارتقِ بتجربتك مع نماذج THOTH الفائقة')}</span>
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2 leading-snug">
          {t('plansHeading', 'اختر الخطة المثالية لإطلاق كامل طاقتك')}
        </h1>
        <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto leading-relaxed px-2">
          {t('plansSubheading', 'محادثات ذكية غير محدودة، ملخصات بودكاست صوتية فورية، وتحليل فائق للمستندات بسرعة قصوى.')}
        </p>
      </div>
      
      {/* Alert Banner if opened due to reaching limit */}
      {highlightLimitType && (
        <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 animate-in fade-in backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-300">{t('dailyLimitReached', 'وصلت إلى الحد اليومي للباقة الحالية!')}</h4>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {t('dailyLimitReachedDesc', 'قم بالترقية إلى THOTH Pro أو Ultra لمتابعة الاستخدام فوراً.')}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-amber-300 hover:text-white rounded-lg cursor-pointer transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Current Subscription & Auto-Renew / Cancellation Banner */}
      <div className="mb-6 sm:mb-8 p-4 sm:p-5 rounded-2xl sm:rounded-3xl glass-card bg-white/[0.04] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl backdrop-blur-2xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme.bgAccent} ${theme.textAccent} border ${theme.borderAccent} shadow-md`}>
            <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white">
                {t('currentSubscription', 'اشتراكك الحالي:')} <span className={theme.textAccent}>{getLocalizedPlanName(currentPlan)}</span>
              </h3>
              <span className={`text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${currentPlan.id === 'free' || currentPlan.id === 'guest' ? 'bg-white/10 text-white/60 border-white/10' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm'}`}>
                {currentPlan.id === 'free' || currentPlan.id === 'guest' ? t('freeStatus', 'مجاني') : t('activeStatus', 'نشط ومفعل')}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">
              {currentPlan.id === 'free' || currentPlan.id === 'guest'
                ? t('freePlanDesc', 'استمتع بالحد اليومي المتاح أو اختر إحدى الباقات للترقية لخصائص فائقة.')
                : `${t('activePlanDesc', 'الباقة مفعّلة ومزامنة مع حسابك في قاعدة البيانات.')} ${autoRenew ? t('autoRenewEnabledDesc', 'التجديد التلقائي مفّعل.') : t('autoRenewDisabledDesc', 'التجديد التلقائي متوقف.')}`}
            </p>
          </div>
        </div>

        {currentPlan.id !== 'free' && currentPlan.id !== 'guest' && (
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 flex-wrap border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
            {/* Auto-renew Toggle */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md">
              <span className="text-xs font-medium text-white/80">{t('autoRenew', 'التجديد التلقائي')}</span>
              <button
                type="button"
                disabled={isUpdatingAutoRenew}
                onClick={handleToggleAutoRenew}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoRenew ? 'bg-emerald-500' : 'bg-white/20'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoRenew ? (isRtl ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Cancel Subscription Button */}
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('cancelSubscription', 'إلغاء الاشتراك')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Subscription Plans Section */}
      <div className="mb-8">
        {/* Billing Cycle Switcher */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="glass-card bg-black/40 p-1.5 rounded-2xl border border-white/15 flex items-center gap-1 relative shadow-xl backdrop-blur-2xl">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[38px] ${!isAnnual ? 'bg-white/15 text-white shadow-md' : 'text-white/50 hover:text-white/80'}`}
            >
              {t('monthly', 'شهرياً')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer min-h-[38px] ${isAnnual ? `${theme.btnPrimary} text-white shadow-md` : 'text-white/50 hover:text-white/80'}`}
            >
              <span>{t('annually', 'سنوياً')}</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">{t('save16', 'وفر 16%')}</span>
            </button>
          </div>
        </div>

        {/* Plans Grid: Responsive for Mobile & Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
          {Object.values(SUBSCRIPTION_PLANS).filter(p => p.id !== 'guest').map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const isFree = plan.id === 'free';
            const isBasic = plan.id === 'basic';
            const isPro = plan.id === 'pro';
            const isMax = plan.id === 'max';
            const isUltra = plan.id === 'ultra';

            const localizedBadge = getLocalizedBadge(plan);
            const localizedFeatures = getLocalizedFeatures(plan);
            const localizedName = getLocalizedPlanName(plan);

            return (
              <div 
                key={plan.id}
                className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 border glass-card ${
                  isPro 
                    ? `${theme.bgAccent} ${theme.borderAccent} shadow-2xl ring-1 ring-white/20 transform lg:-translate-y-1` 
                    : isUltra
                      ? 'bg-gradient-to-b from-pink-950/25 to-black/60 border-pink-500/30 shadow-xl'
                      : isMax
                        ? 'bg-gradient-to-b from-purple-950/20 to-black/60 border-purple-500/25 shadow-lg'
                        : isBasic
                          ? 'bg-gradient-to-b from-blue-950/20 to-black/60 border-blue-500/20 shadow-md'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Highlight Badge */}
                {localizedBadge && (
                  <div className={`absolute -top-2.5 ${isRtl ? 'right-4' : 'left-4'} px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-md ${
                    isPro 
                      ? `${theme.btnPrimary} border-white/20 text-white` 
                      : isUltra 
                        ? `${theme.badgeClass} border-white/30`
                        : 'bg-white/15 text-white/90 border-white/20'
                  }`}>
                    {localizedBadge}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isFree ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      isBasic ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      isPro ? `${theme.bgAccent} ${theme.textAccent} ${theme.borderAccent}` :
                      isMax ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-pink-500/10 text-pink-400 border-pink-500/20'
                    }`}>
                      {isFree && <User className="w-4 h-4" />}
                      {isBasic && <Star className="w-4 h-4" />}
                      {isPro && <Zap className="w-4 h-4" />}
                      {isMax && <Crown className="w-4 h-4" />}
                      {isUltra && <Rocket className="w-4 h-4" />}
                    </div>
                    <h4 className="text-base font-black text-white">{localizedName}</h4>
                  </div>

                  {/* Price Display */}
                  <div className="my-2.5 pb-2.5 border-b border-white/10">
                    <p className={`text-xl sm:text-2xl font-black ${isPro ? theme.textAccent : isUltra ? 'text-pink-300' : 'text-white'} font-mono tracking-tight`} dir="ltr">
                      {formatPrice(plan)}
                    </p>
                    {isAnnual && !isFree && (
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                        {t('billedAnnually', 'فاتورة سنوية مخفضة')}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 mb-5">
                    {localizedFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-white/80 leading-relaxed">
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isPro ? theme.textAccent : isMax ? 'text-purple-400' : isUltra ? 'text-pink-400' : isBasic ? 'text-blue-400' : 'text-white/40'
                        }`} />
                        <span className="leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action Button */}
                <div>
                  {isCurrent ? (
                    <button disabled className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-default bg-white/10 text-white/50 border border-white/10 min-h-[42px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{t('currentPlanButton', 'الباقة الحالية')}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPaymentMethod('paymob');
                        setSelectedPlanForPay(plan);
                      }}
                      className={`w-full py-2.5 sm:py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 min-h-[42px] ${
                        isPro 
                          ? `${theme.btnPrimary} text-white hover:brightness-110` 
                          : isUltra
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white'
                            : isMax
                              ? 'bg-purple-600 hover:bg-purple-500 text-white'
                              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{planLevels[plan.id] < planLevels[currentPlan.id] ? t('switchToPlan', 'تغيير إلى هذه الباقة') : t('choosePlan', 'ترقية الحساب')}</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Promo Code / Voucher Redeem Section */}
        <div className="mt-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 mb-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0 shadow-inner">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{t('promoSectionTitle', 'طريقة تفعيل بديلة: كود استرداد أو كود خصم')}</h3>
                <p className="text-xs text-white/50 mt-0.5">{t('promoSectionDesc', 'أدخل رمز الكود الخاص بك أدناه لترقية حسابك مباشرة وحفظ الاشتراك في قاعدة البيانات')}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div className="relative w-full flex-1">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder={t('promoPlaceholder', 'أدخل رمز الكود (مثال: PRO2026 أو EGYPT)')}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-xs text-white font-mono uppercase font-bold outline-none focus:border-pink-500 transition-all placeholder:text-white/30 placeholder:font-sans min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              disabled={!promoCode.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('promoApplyBtn', 'تطبيق الكود وتفعيل الحساب')}</span>
            </button>
          </form>

          {promoResult && (
            <div className={`mt-3.5 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              promoResult.success 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
                : 'bg-red-500/20 border-red-500/40 text-red-200'
            }`}>
              {promoResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{promoResult.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Legacy Iframe support for Classic API */}
      {iframeUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-4xl h-[90vh] bg-[#0d111c] border border-white/15 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">{t('loadingSecurePayment', 'بوابة الدفع الآمنة')}</span>
              </div>
              <button 
                onClick={() => {
                  setIframeUrl(null);
                  setIframeLoading(true);
                  setIsProcessingPayment(false);
                }}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative flex-1 w-full h-full bg-[#0d111c]">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d111c] z-10">
                  <span className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-emerald-500 mb-4"></span>
                  <span className="text-white/60 text-xs font-bold">{t('loadingSecurePayment', 'جاري تحميل صفحة الدفع الآمنة...')}</span>
                </div>
              )}
              <iframe 
                src={iframeUrl}
                className="w-full h-full relative z-1 border-0"
                onLoad={() => setIframeLoading(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Exact Checkout Modal from user template matching colors & fonts with full SDK preservation */}
      {selectedPlanForPay && (() => {
        const localizedName = getLocalizedPlanName(selectedPlanForPay);
        const baseEgp = getPlanBaseEgp(selectedPlanForPay);
        const planPriceNum = isAnnual 
          ? (baseEgp * 10) 
          : baseEgp;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 font-['Tajawal',sans-serif]" dir="rtl">
            {/* Transparent Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setSelectedPlanForPay(null);
                setIsProcessingPayment(false);
              }}
            />
            
            {/* Screen Box Matching Exact CSS Template */}
            <div className="relative w-full max-w-[440px] bg-[#0f0d12] border border-[rgba(255,255,255,0.09)] rounded-3xl p-5 sm:p-6 text-[#f2eef8] shadow-2xl flex flex-col max-h-[92dvh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150 z-10">
              
              {/* Top: Title & Close */}
              <div className="flex items-center justify-between mb-5">
                <span className="font-extrabold text-base text-[#f2eef8]">{t('completeUpgradeModalTitle', 'إتمام الاشتراك')}</span>
                <button 
                  onClick={() => {
                    setSelectedPlanForPay(null);
                    setIsProcessingPayment(false);
                  }}
                  className="text-[#8f889c] hover:text-[#f2eef8] text-base bg-transparent border-0 cursor-pointer p-1 transition-colors leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Plan Row */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[rgba(255,255,255,0.09)]">
                <div className="text-right">
                  <div className="font-bold text-[15px] text-[#f2eef8]">
                    {localizedName}
                    <span className="block text-xs text-[#8f889c] font-normal mt-0.5">
                      {isAnnual ? t('annualPlanLabel', 'باقة سنوية') : t('monthlyPlanLabel', 'باقة شهرية')}
                      <button 
                        type="button" 
                        onClick={() => setIsAnnual(!isAnnual)}
                        className="text-[#7c5cff] hover:underline cursor-pointer mr-1.5 text-[11px] font-medium"
                      >
                        ({isAnnual ? t('switchToMonthly', 'شهرياً') : t('save16Annual', 'وفر 16% سنوياً')})
                      </button>
                    </span>
                  </div>
                </div>

                <div className="font-['JetBrains_Mono',monospace] font-semibold text-[17px] text-[#7c5cff] flex items-baseline gap-1" dir="ltr">
                  <span>{planPriceNum}</span>
                  <small className="text-[11px] text-[#8f889c] font-normal font-['Tajawal',sans-serif]">£/{isAnnual ? 'سنة' : 'شهر'}</small>
                </div>
              </div>

              {/* Method Label */}
              <p className="text-xs text-[#8f889c] mb-2.5 m-0 font-medium">{t('selectPaymentMethod', 'طريقة الدفع')}</p>

              {/* Methods Tabs */}
              <div className="flex gap-2 mb-4.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paymob')}
                  className={`flex-1 text-center py-2.5 px-1 border rounded-xl text-[12.5px] font-medium cursor-pointer transition-all ${
                    paymentMethod === 'paymob' || paymentMethod === 'card'
                      ? 'border-[#7c5cff] text-[#f2eef8] bg-[rgba(124,92,255,0.14)]'
                      : 'border-[rgba(255,255,255,0.09)] text-[#8f889c] bg-[#18151c] hover:text-[#f2eef8]'
                  }`}
                >
                  {t('bankCard', 'بطاقة بنكية')}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`flex-1 text-center py-2.5 px-1 border rounded-xl text-[12.5px] font-medium cursor-pointer transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-[#7c5cff] text-[#f2eef8] bg-[rgba(124,92,255,0.14)]'
                      : 'border-[rgba(255,255,255,0.09)] text-[#8f889c] bg-[#18151c] hover:text-[#f2eef8]'
                  }`}
                >
                  PayPal
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('promo')}
                  className={`flex-1 text-center py-2.5 px-1 border rounded-xl text-[12.5px] font-medium cursor-pointer transition-all ${
                    paymentMethod === 'promo'
                      ? 'border-[#7c5cff] text-[#f2eef8] bg-[rgba(124,92,255,0.14)]'
                      : 'border-[rgba(255,255,255,0.09)] text-[#8f889c] bg-[#18151c] hover:text-[#f2eef8]'
                  }`}
                >
                  {t('activationCode', 'كوبون')}
                </button>
              </div>

              {/* Pane: Card / Paymob Inline SDK */}
              {(paymentMethod === 'paymob' || paymentMethod === 'card') && (
                <div className="w-full mb-1 animate-in fade-in duration-150">
                  <PaymobInlineWrapper 
                    plan={selectedPlanForPay}
                    isAnnual={isAnnual}
                    email={auth.currentUser?.email || localStorage.getItem('app-user-email') || 'user@thoth.ai'}
                    userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
                    name={auth.currentUser?.displayName || 'مستخدم THOTH'}
                    onStateChange={(st: any) => setPaymobActiveState(st)}
                    onSuccess={() => {
                      setSelectedPlanForPay(null);
                      handleDirectSuccess('paymob');
                    }}
                  />
                </div>
              )}

              {/* Pane: PayPal */}
              {paymentMethod === 'paypal' && (
                <div className="w-full mb-2 animate-in fade-in duration-150">
                  <p className="text-[13px] text-[#8f889c] mb-3.5 leading-relaxed m-0 pb-1">
                    {t('paypalRedirectNote', 'هيتم تحويلك لصفحة PayPal لإتمام الدفع بأمان.')}
                  </p>
                  <PayPalPaymentWrapper
                    amount={isAnnual ? baseEgp * 10 : baseEgp}
                    planId={selectedPlanForPay.id}
                    userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
                    onPaymentSuccess={handleDirectSuccess}
                    onPaymentError={handleDirectError}
                    config={paymentConfig}
                  />
                </div>
              )}

              {/* Pane: Coupon / Voucher */}
              {paymentMethod === 'promo' && (
                <div className="space-y-3 mb-2 animate-in fade-in duration-150">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleRedeemCode(e);
                  }} className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="ادخل كود الكوبون"
                        className="w-full bg-[#18151c] border border-[rgba(255,255,255,0.09)] rounded-xl p-3.5 text-[#f2eef8] font-['Tajawal',sans-serif] text-sm text-right outline-none focus:border-[#7c5cff] transition-colors placeholder:text-[#5f5871]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!promoCode.trim()}
                      className="w-full border-none cursor-pointer p-3.5 rounded-xl bg-[#7c5cff] text-white font-['Tajawal',sans-serif] font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 inline" />
                      <span>{t('activateBtn', 'تفعيل الكوبون')}</span>
                    </button>
                  </form>

                  {promoResult && (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                      promoResult.success 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
                        : 'bg-red-500/20 border-red-500/40 text-red-200'
                    }`}>
                      {promoResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      <span>{promoResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Auto-renew Switch */}
              {paymentMethod !== 'promo' && (
                <div className="flex items-center justify-between my-5 text-[13px] text-[#8f889c]">
                  <span>{isAnnual ? 'تجديد تلقائي سنوياً' : 'تجديد تلقائي شهرياً'}</span>
                  <div 
                    onClick={() => setSavePaymentMethod(!savePaymentMethod)}
                    className={`w-10 h-6 rounded-full relative cursor-pointer shrink-0 transition-colors duration-200 ${
                      savePaymentMethod ? 'bg-[#7c5cff]' : 'bg-[#312c3c]'
                    }`}
                  >
                    <div 
                      className={`absolute top-[3px] right-[3px] w-[18px] h-[18px] rounded-full bg-white transition-transform duration-200 ${
                        savePaymentMethod ? 'translate-x-0' : '-translate-x-4'
                      }`} 
                    />
                  </div>
                </div>
              )}

              {/* Main Pay Button */}
              {(!paymentMethod || paymentMethod === 'paymob' || paymentMethod === 'card') && (
                <div className="space-y-3 pt-1">
                  <button 
                    disabled={isProcessingPayment}
                    onClick={() => {
                      setIsProcessingPayment(true);

                      if (paymobActiveState.status === 'error') {
                        setIsProcessingPayment(false);
                        triggerVerificationModal('failed', undefined, paymobActiveState.errorMsg || (language === 'ar' ? 'فشل الاتصال ببوّابة Paymob.' : 'Failed to connect to Paymob gateway.'));
                        return;
                      }

                      if (paymobActiveState.status === 'iframe' && paymobActiveState.paymentUrl) {
                        window.open(paymobActiveState.paymentUrl, '_blank');
                        setIsProcessingPayment(false);
                        triggerVerificationModal('verifying');
                        return;
                      }

                      window.dispatchEvent(new CustomEvent('payFromOutside', {
                        detail: {
                          fallback: () => {
                            triggerVerificationModal('verifying');
                          }
                        }
                      }));

                      setTimeout(() => {
                        setIsProcessingPayment(false);
                      }, 3500);
                    }}
                    className="w-full border-none cursor-pointer p-4 rounded-xl bg-[#7c5cff] text-white font-['Tajawal',sans-serif] font-bold text-[15px] hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-[#7c5cff]/20 flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                        <span>{t('processingPayment', 'جاري معالجة وتأكيد الدفع...')}</span>
                      </>
                    ) : (
                      <span>تأكيد الدفع — {planPriceNum} £</span>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-[#5f5871] mt-4 mb-0 font-['Tajawal',sans-serif]">دفع آمن ومشفّر عبر Paymob</p>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Cancel Subscription Confirmation Modal with Glass-Card Styling */}
      {showCancelModal && (
        <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 ${isRtl ? 'rtl text-right' : 'ltr text-left'} animate-in fade-in duration-200 font-sans`}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setShowCancelModal(false)} />
          <div className="relative w-full max-w-md glass-card bg-[#101418]/95 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 shadow-sm">
              <X className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">{t('cancelModalTitle', 'إلغاء الاشتراك الحالي')}</h3>
            <p className="text-xs sm:text-sm text-white/60 mb-6 leading-relaxed">
              {t('cancelModalDesc', 'عند إقرار إلغاء الاشتراك، سيتم إيقاف التجديد التلقائي والتحويل إلى الباقات المجانية فوراً وتحديث بياناتك في قاعدة البيانات.')}
            </p>
            <div className={`flex items-center gap-3 ${isRtl ? 'justify-end' : 'justify-end'}`}>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors cursor-pointer min-h-[40px]"
              >
                {t('goBack', 'تراجع')}
              </button>
              <button
                disabled={isCancelling}
                onClick={handleConfirmCancelSubscription}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 min-h-[40px]"
              >
                {isCancelling ? <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" /> : null}
                <span>{t('confirmCancelBtn', 'تأكيد إلغاء الاشتراك')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};