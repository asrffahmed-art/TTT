import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Send, 
  RefreshCw, 
  Users, 
  Bell, 
  Radio, 
  CheckCircle, 
  AlertCircle, 
  Sliders, 
  Database, 
  FileText, 
  ExternalLink,
  X,
  UserX,
  UserCheck,
  Trash2, Volume2,
  Plus,
  Megaphone,
  Lock,
  Activity,
  Check,
  Award,
  Crown,
  Gift,
  Bot,
  Zap,
  Mail,
  HardDrive,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Settings
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAppTheme } from '../lib/themeService';
import { formatBytes } from '../lib/subscriptionService';
import { AdvertisingManager } from './admin/AdvertisingManager';
import { AdminAudioDiagnostics } from './admin/AdminAudioDiagnostics';
import { LegalManager } from './admin/LegalManager';
import { AdminAiInsights } from './AdminAiInsights';
import { AiMonitoringManager } from './admin/AiMonitoringManager';
import { 
  requestNotificationPermission, 
  triggerTestPushNotification, 
  triggerDailyNotificationEngine 
} from '../services/notificationService';

interface AdminPanelProps {
  onClose?: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { t, language } = useLanguage();
  const theme = useAppTheme();
  const currentUser = auth.currentUser;
  const adminEmails = ['onq6974@gmail.com', 'admin@thoth.app', 'demo@thoth.app'];
  const userEmail = (currentUser?.email || localStorage.getItem('app-user-email') || 'onq6974@gmail.com').toLowerCase();
  const isAuthorized = adminEmails.includes(userEmail) || localStorage.getItem('app-user-role') === 'admin' || localStorage.getItem('is-admin') === 'true' || userEmail.includes('admin');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_insights' | 'ai_monitoring' | 'users' | 'storage' | 'content' | 'broadcast' | 'ai_config' | 'db_tools' | 'config' | 'promo_codes' | 'plans' | 'payment_orders' | 'api_keys' | 'email_settings' | 'system_logs' | 'training_models' | 'advertising' | 'legal' | 'audio_diagnostics'>('overview');

  // Custom confirmation modal state to avoid native confirm blocked inside sandboxed iframe
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Model Training Platform State
  const [trainingSubTab, setTrainingSubTab] = useState<'review' | 'datasets' | 'jobs' | 'b2b' | 'data_program'>('review');
  const [dataProgramStats, setDataProgramStats] = useState<any>(null);
  const [trainingStats, setTrainingStats] = useState<any>({
    totalExamples: 0,
    pendingExamples: 0,
    approvedExamples: 0,
    rejectedExamples: 0,
    totalDatasets: 0,
    activeJobs: 0,
    customerProjects: 0
  });
  const [trainingExamples, setTrainingExamples] = useState<any[]>([]);
  const [trainingDatasets, setTrainingDatasets] = useState<any[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<any[]>([]);
  const [customerProjects, setCustomerProjects] = useState<any[]>([]);
  const [isLoadingTrainingData, setIsLoadingTrainingData] = useState(false);
  const [exampleStatusFilter, setExampleStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Form States for Training
  const [datasetForm, setDatasetForm] = useState({ name: '', version: 'v1.0', category: 'General', description: '' });
  const [jobForm, setJobForm] = useState({ baseModel: 'Gemma 4 31B', datasetId: '', epochs: '3', learningRate: '0.0001' });
  const [customerProjectForm, setCustomerProjectForm] = useState({ customerName: '', customerEmail: '', projectName: '', targetModel: 'Gemma 4 Custom' });

  const fetchTrainingPlatformData = async () => {
    setIsLoadingTrainingData(true);
    try {
      const headers = { 'x-admin-email': userEmail };
      const [statsRes, examplesRes, datasetsRes, jobsRes, projectsRes, dpRes] = await Promise.all([
        fetch('/api/admin/training/stats', { headers }),
        fetch(`/api/admin/training/examples?status=${exampleStatusFilter}`, { headers }),
        fetch('/api/admin/training/datasets', { headers }),
        fetch('/api/admin/training/jobs', { headers }),
        fetch('/api/admin/training/customer-projects', { headers }),
        fetch('/api/data-program/stats', { headers })
      ]);

      const safeJson = async (res: Response) => {
        const contentType = res.headers.get('content-type') || '';
        return (res.ok && contentType.includes('application/json')) ? await res.json().catch(() => null) : null;
      };

      const [statsData, dpData, examplesData, datasetsData, jobsData, projectsData] = await Promise.all([
        safeJson(statsRes), safeJson(dpRes), safeJson(examplesRes), safeJson(datasetsRes), safeJson(jobsRes), safeJson(projectsRes)
      ]);

      if (statsData) setTrainingStats(statsData.stats || {});
      if (dpData) setDataProgramStats(dpData);
      if (examplesData) setTrainingExamples(examplesData.examples || []);
      if (datasetsData) setTrainingDatasets(datasetsData.datasets || []);
      if (jobsData) setTrainingJobs(jobsData.jobs || []);
      if (projectsData) setCustomerProjects(projectsData.projects || []);
    } catch (err) {
      console.error('Error fetching training platform data:', err);
    } finally {
      setIsLoadingTrainingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'training_models') {
      fetchTrainingPlatformData();
    }
  }, [activeTab, exampleStatusFilter]);

  // System Logs & Export State
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isLoadingSystemLogs, setIsLoadingSystemLogs] = useState(false);

  const fetchSystemLogs = async () => {
    setIsLoadingSystemLogs(true);
    try {
      const res = await fetch('/api/admin/system-logs', {
        headers: { 'x-admin-email': userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching system logs:', err);
    } finally {
      setIsLoadingSystemLogs(false);
    }
  };

  const handleExportDb = async () => {
    try {
      const res = await fetch('/api/admin/export-db', {
        headers: { 'x-admin-email': userEmail }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thoth-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('فشل تصدير قاعدة البيانات.');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء تصدير قاعدة البيانات.');
    }
  };

  // API Keys / Environment Config State
  const [apiKeysState, setApiKeysState] = useState({
    geminiApiKey: '',
    paymobApiKey: '',
    paymobPublicKey: '',
    paymobIntegrationId: '',
    paymobIframeId: '',
    paymobHmacSecret: '',
    paypalClientId: '',
    paypalClientSecret: '',
    paypalMode: 'sandbox',
    firebaseProjectId: '',
    firebaseApiKey: '',
    jwtSecret: '',
    stripeSecretKey: '',
    telegramBotToken: '',
    openaiApiKey: '',
    googleSearchApiKey: '',
    googleSearchCx: '',
    customWebhookUrl: '',
    corsAllowedOrigins: '',
    rateLimitMaxRequests: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: '',
    resendApiKey: '', // Security: keys are configured through the admin panel or environment variables only
    resendFrom: 'THOTH AI <onboarding@resend.dev>'
  });
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isSavingApiKeys, setIsSavingApiKeys] = useState(false);
  const [apiKeysResult, setApiKeysResult] = useState<string | null>(null);

  // Resend API Testing State
  const [testResendEmail, setTestResendEmail] = useState('onq6974@gmail.com');
  const [isTestingResend, setIsTestingResend] = useState(false);
  const [resendTestResult, setResendTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestResend = async () => {
    setIsTestingResend(true);
    setResendTestResult(null);
    try {
      const res = await fetch('/api/admin/test-resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com'
        },
        body: JSON.stringify({
          toEmail: testResendEmail,
          resendApiKey: apiKeysState.resendApiKey,
          resendFrom: apiKeysState.resendFrom
        })
      });
      const data = await res.json();
      if (data.success) {
        setResendTestResult({ success: true, message: `تم إرسال البريد بنجاح عبر Resend! (ID: ${data.id})` });
      } else {
        setResendTestResult({ success: false, message: `خطأ Resend: ${data.error}` });
      }
    } catch (err: any) {
      setResendTestResult({ success: false, message: err?.message || 'خطأ غير متوقع عند الاختبار' });
    } finally {
      setIsTestingResend(false);
    }
  };

  const [showKeysMap, setShowKeysMap] = useState<{ [key: string]: boolean }>({});
  const [copiedKeyName, setCopiedKeyName] = useState<string | null>(null);
  const [testingKeyType, setTestingKeyType] = useState<string | null>(null);
  const [testKeyResults, setTestKeyResults] = useState<{ [key: string]: { success?: boolean; message?: string } }>({});

  const toggleShowKey = (keyName: string) => {
    setShowKeysMap(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const handleCopyKey = (keyName: string, val: string) => {
    navigator.clipboard.writeText(val || '');
    setCopiedKeyName(keyName);
    setTimeout(() => setCopiedKeyName(null), 2000);
  };

  const handleTestKey = async (keyType: string, keyValue: string) => {
    setTestingKeyType(keyType);
    try {
      const res = await fetch('/api/admin/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ keyType, keyValue })
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
      setTestKeyResults(prev => ({
        ...prev,
        [keyType]: { success: data.success, message: data.message || data.error }
      }));
    } catch (err) {
      setTestKeyResults(prev => ({
        ...prev,
        [keyType]: { success: false, message: 'فشل الاتصال بخدمة الاختبار' }
      }));
    } finally {
      setTestingKeyType(null);
    }
  };

  const fetchApiKeys = async () => {
    setIsLoadingApiKeys(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        headers: {
          'x-admin-email': userEmail || 'onq6974@gmail.com',
          'x-admin-role': 'admin'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.keys) {
          setApiKeysState(data.keys);
        }
      }
    } catch (err) {
      console.error('Error fetching api keys:', err);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingApiKeys(true);
    setApiKeysResult(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com',
          'x-admin-role': 'admin'
        },
        body: JSON.stringify(apiKeysState)
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeysResult('✅ ' + data.message);
        fetchApiKeys();
      } else {
        setApiKeysResult('❌ ' + (data.error || 'فشل حفظ مفاتيح النظام'));
      }
    } catch (err) {
      setApiKeysResult('❌ خطأ في الاتصال بالخادم');
    } finally {
      setIsSavingApiKeys(false);
    }
  };

  // State and Handlers for saving each option / group individually (عايز كل خيار لي زر حفظ)
  const [savingKeyName, setSavingKeyName] = useState<string | null>(null);
  const handleSaveSingleApiKey = async (keyName: string, keyValue: string) => {
    setSavingKeyName(keyName);
    setApiKeysResult(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com',
          'x-admin-role': 'admin'
        },
        body: JSON.stringify({ [keyName]: keyValue })
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeysResult(`✅ تم حفظ المفتاح "${keyName}" بنجاح في قاعدة البيانات والسيرفر!`);
        fetchApiKeys();
      } else {
        setApiKeysResult(`❌ ${data.error || 'فشل حفظ مفتاح النظام'}`);
      }
    } catch (err) {
      setApiKeysResult('❌ خطأ في الاتصال بالخادم عند حفظ المفتاح الفردي');
    } finally {
      setSavingKeyName(null);
    }
  };

  const [savingConfigType, setSavingConfigType] = useState<string | null>(null);
  const handleSaveSpecificSysConfig = async (type: 'maintenance' | 'announcement' | 'features') => {
    setSavingConfigType(type);
    setConfigSaveResult(null);
    try {
      let payload: any = {};
      if (type === 'maintenance') {
        payload = {
          maintenanceMode: sysConfig.maintenanceMode,
          maintenanceMessage: sysConfig.maintenanceMessage
        };
      } else if (type === 'announcement') {
        payload = {
          announcement: {
            enabled: sysConfig.announcementEnabled,
            text: sysConfig.announcementText,
            type: sysConfig.announcementType
          }
        };
      } else if (type === 'features') {
        payload = {
          aiEnabled: sysConfig.aiEnabled,
          dailyPushEnabled: sysConfig.dailyPushEnabled
        };
      }

      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSaveResult(`✅ تم تحديث إعدادات ${type === 'maintenance' ? 'وضع الصيانة' : type === 'announcement' ? 'الشريط الإعلاني' : 'الخدمات الذكية'} بنجاح في Firestore!`);
        fetchSysConfig();
      } else {
        setConfigSaveResult(`❌ ${data.error || 'فشل حفظ الإعدادات'}`);
      }
    } catch (err) {
      setConfigSaveResult('❌ خطأ في الاتصال بالخادم عند حفظ إعدادات النظام الفردية');
    } finally {
      setSavingConfigType(null);
    }
  };

  const [savingStoragePlanKey, setSavingStoragePlanKey] = useState<string | null>(null);
  const handleSaveSpecificStoragePlan = async (planKey: 'free' | 'pro' | 'ultra', limitMb: number) => {
    setSavingStoragePlanKey(planKey);
    setStoragePlansResult(null);
    try {
      const res = await fetch('/api/admin/storage-plans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          plans: {
            free: (planKey === 'free' ? limitMb : storagePlans.freeLimitMb) * 1024 * 1024,
            pro: (planKey === 'pro' ? limitMb : storagePlans.proLimitMb) * 1024 * 1024,
            ultra: (planKey === 'ultra' ? limitMb : storagePlans.ultraLimitMb) * 1024 * 1024
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStoragePlansResult(`✅ تم تحديث حد تخزين باقة ${planKey === 'free' ? 'المجانية' : planKey === 'pro' ? 'الاحترافية' : 'الفائقة'} بنجاح!`);
        fetchAdminStorageStats();
      } else {
        setStoragePlansResult(`❌ ${data.error || 'فشل الحفظ'}`);
      }
    } catch (err) {
      setStoragePlansResult('❌ خطأ في الاتصال بالخادم عند تحديث مساحة تخزين الخطط');
    } finally {
      setSavingStoragePlanKey(null);
    }
  };

  const [savingUsagePlanKey, setSavingUsagePlanKey] = useState<string | null>(null);
  const handleSaveSpecificUsagePlan = async (planKey: string) => {
    setSavingUsagePlanKey(planKey);
    setUsagePlansSaveResult(null);
    try {
      const res = await fetch('/api/admin/usage-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ 
          plans: {
            ...usagePlansData,
            [planKey]: usagePlansData[planKey]
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsagePlansSaveResult(`🎉 تم تحديث حدود واستخدام باقة ${usagePlansData[planKey]?.name || planKey} بنجاح!`);
        fetchUsagePlans();
      } else {
        setUsagePlansSaveResult(`❌ ${data.error || 'فشل الحفظ'}`);
      }
    } catch (err) {
      setUsagePlansSaveResult('❌ خطأ في الاتصال بالسيرفر عند حفظ الباقة الفردية');
    } finally {
      setSavingUsagePlanKey(null);
    }
  };

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const handleAddCustomKey = () => {
    const trimmed = newKeyName.trim();
    if (!trimmed) return;
    setApiKeysState(prev => ({
      ...prev,
      [trimmed]: newKeyValue
    }));
    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleRemoveCustomKey = (keyName: string) => {
    setApiKeysState(prev => {
      const copy: Record<string, any> = { ...prev };
      delete copy[keyName];
      return copy as typeof prev;
    });
  };

  // Promo / Redeem Codes State
  const [promoCodesList, setPromoCodesList] = useState<any[]>([]);
  const [promoRedemptionsList, setPromoRedemptionsList] = useState<any[]>([]);
  const [isLoadingPromoCodes, setIsLoadingPromoCodes] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPlan, setNewPromoPlan] = useState('pro');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState(100);
  const [newPromoDurationDays, setNewPromoDurationDays] = useState(30);
  const [newPromoExpiresInDays, setNewPromoExpiresInDays] = useState(30);
  const [promoFormMessage, setPromoFormMessage] = useState<string | null>(null);

  // Payment Orders State
  const [paymentOrdersList, setPaymentOrdersList] = useState<any[]>([]);
  const [isLoadingPaymentOrders, setIsLoadingPaymentOrders] = useState(false);

  // Storage Management State
  const [adminStorageStats, setAdminStorageStats] = useState<any | null>(null);
  const [isLoadingAdminStorage, setIsLoadingAdminStorage] = useState(false);
  const [recalcUserId, setRecalcUserId] = useState('');
  const [recalcResult, setRecalcResult] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Storage Plans Config State
  const [storagePlans, setStoragePlans] = useState({
    freeLimitMb: 5,
    proLimitMb: 100,
    ultraLimitMb: 1024
  });
  const [isSavingStoragePlans, setIsSavingStoragePlans] = useState(false);
  const [storagePlansResult, setStoragePlansResult] = useState<string | null>(null);

  // Usage Plans Config State (Chat, Thinking, Search, Voice, Translate Limits)
  const [usagePlansData, setUsagePlansData] = useState<Record<string, any>>({
    guest: { name: 'زائر (غير مسجل)', normalChat: 5, thinkingChat: 2, webSearch: 1, liveVoiceSec: 120, translation: 5, audioSummary: 0, textSummary: 0 },
    free: { name: 'الباقة المجانية', normalChat: 20, thinkingChat: 15, webSearch: 3, liveVoiceSec: 300, translation: 15, audioSummary: 1, textSummary: 2 },
    basic: { name: 'الباقة الأساسية', normalChat: 60, thinkingChat: 40, webSearch: 5, liveVoiceSec: 1200, translation: 50, audioSummary: 2, textSummary: 5 },
    pro: { name: 'الباقة الاحترافية (Pro)', normalChat: 180, thinkingChat: 120, webSearch: 12, liveVoiceSec: 2400, translation: 150, audioSummary: 5, textSummary: 15 },
    max: { name: 'الباقة القصوى (Max)', normalChat: 400, thinkingChat: 250, webSearch: 25, liveVoiceSec: 4800, translation: 400, audioSummary: 10, textSummary: 30 },
    ultra: { name: 'الباقة الفائقة (Ultra)', normalChat: 1000, thinkingChat: 600, webSearch: 50, liveVoiceSec: 10800, translation: 1000, audioSummary: 25, textSummary: 60 }
  });
  const [isLoadingUsagePlans, setIsLoadingUsagePlans] = useState(false);
  const [isSavingUsagePlans, setIsSavingUsagePlans] = useState(false);
  const [usagePlansSaveResult, setUsagePlansSaveResult] = useState<string | null>(null);

  // Plan Edit Modal State
  const [editingPlanModalKey, setEditingPlanModalKey] = useState<string | null>(null);
  const [editingPlanData, setEditingPlanData] = useState<any | null>(null);
  const [isSavingPlanModal, setIsSavingPlanModal] = useState(false);
  const [planModalMsg, setPlanModalMsg] = useState<string | null>(null);

  // Subscription Add/Edit Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingSubData, setEditingSubData] = useState<{
    id?: string;
    userEmail: string;
    userId?: string;
    planId: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    expiresAt: string;
  }>({
    userEmail: '',
    planId: 'pro',
    provider: 'manual',
    status: 'active',
    amount: 150,
    currency: 'EGP',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [isSavingSubModal, setIsSavingSubModal] = useState(false);
  const [subModalMsg, setSubModalMsg] = useState<string | null>(null);

  // Overall System Stats State
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeTokens: number;
    suspendedUsers: number;
    totalDailyNotifications: number;
    sentEventsCount: number;
    broadcastsCount: number;
  } | null>(null);

  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Selected User Badge Edit State
  const [selectedUserForBadge, setSelectedUserForBadge] = useState<any | null>(null);
  const [badgeInput, setBadgeInput] = useState('');
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isSavingBadge, setIsSavingBadge] = useState(false);

  // Selected User Usage Modal State
  const [selectedUserForUsage, setSelectedUserForUsage] = useState<any | null>(null);
  const [isResettingUsage, setIsResettingUsage] = useState(false);

  // Content (Daily Notifications) State
  const [dailyNotifications, setDailyNotifications] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // New Content Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState('عام');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [contentFormMessage, setContentFormMessage] = useState<string | null>(null);

  // Broadcast State
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [customLink, setCustomLink] = useState('');
  const [customTopic, setCustomTopic] = useState('AI');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>([]);

  // Engine Run State
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [engineLog, setEngineLog] = useState<string | null>(null);

  // Device Test Push State
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState<string | null>(null);

  // Global Config State
  const [sysConfig, setSysConfig] = useState({
    maintenanceMode: false,
    maintenanceMessage: 'الموقع قيد الصيانة الدورية لتحديث الأنظمة، سنعود قريباً!',
    announcementEnabled: false,
    announcementText: 'مرحباً بكم في منصة THOTH الذكية للأخبار والتحليلات!',
    announcementType: 'info' as 'info' | 'warning' | 'alert',
    aiEnabled: true,
    dailyPushEnabled: true
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveResult, setConfigSaveResult] = useState<string | null>(null);

  // AI Rules State
  const [aiConfig, setAiConfig] = useState({
    systemInstructions: 'أنت المساعد الذكي الخاص بـ THOTH، تقدم إجابات ملخصة، دقيقة، وموثوقة بنفس لغة المستخدم.',
    preferredModel: 'gemini-3.7-flash',
    temperature: 0.7,
    maxTokens: 2048,
    customTone: 'مهني ومشجع'
  });
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);
  const [aiConfigResult, setAiConfigResult] = useState<string | null>(null);

  // DB Cleanup State
  const [isCleaningDb, setIsCleaningDb] = useState(false);
  const [dbCleanupLog, setDbCleanupLog] = useState<string | null>(null);
  const [dbStats, setDbStats] = useState<any | null>(null);
  const [isLoadingDbStats, setIsLoadingDbStats] = useState(false);

  const fetchDbStats = async () => {
    setIsLoadingDbStats(true);
    try {
      const res = await fetch('/api/admin/db-stats', {
        headers: { 'x-admin-email': userEmail }
      });
      if (res.ok) {
        const data = await res.json();
        setDbStats(data.stats);
      }
    } catch (e) {
      console.error('Error fetching db stats:', e);
    } finally {
      setIsLoadingDbStats(false);
    }
  };

  // Fetch Stats & General Overview
  const fetchStats = async () => {
    if (!isAuthorized) return;
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com', 'x-admin-role': 'admin' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data) {
          setStats(data.stats || data);
        }
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Users List
  const fetchUsers = async () => {
    if (!isAuthorized) return;
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data) {
          setUsersList(data.users || []);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch Content / Daily Notifications
  const fetchContent = async () => {
    setIsLoadingContent(true);
    try {
      const res = await fetch('/api/daily-notifications');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data) {
          setDailyNotifications(data.items || []);
        }
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Fetch Broadcast Logs
  const fetchBroadcastLogs = async () => {
    try {
      const res = await fetch('/api/admin/broadcasts', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data) {
          setBroadcastLogs(data.broadcasts || []);
        }
      }
    } catch (err) {
      console.error('Error fetching broadcast logs:', err);
    }
  };

  // Fetch System Config
  const fetchSysConfig = async () => {
    try {
      const res = await fetch('/api/admin/system-config', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.config) {
          setSysConfig({
            maintenanceMode: !!data.config.maintenanceMode,
            maintenanceMessage: data.config.maintenanceMessage || 'الموقع قيد الصيانة الدورية.',
            announcementEnabled: !!data.config.announcement?.enabled,
            announcementText: data.config.announcement?.text || '',
            announcementType: data.config.announcement?.type || 'info',
            aiEnabled: data.config.aiEnabled !== false,
            dailyPushEnabled: data.config.dailyPushEnabled !== false
          });
        }
      }
    } catch (err) {
      console.error('Error fetching system config:', err);
    }
  };

  // Fetch AI Config
  const fetchAiConfig = async () => {
    try {
      const res = await fetch('/api/admin/ai-config', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.config) {
          setAiConfig({
            systemInstructions: data.config.systemInstructions || '',
            preferredModel: data.config.preferredModel || 'gemini-3.6-flash',
            temperature: data.config.temperature ?? 0.7,
            maxTokens: data.config.maxTokens ?? 2048,
            customTone: data.config.customTone || 'مهني'
          });
        }
      }
    } catch (err) {
      console.error('Error fetching AI config:', err);
    }
  };

  const fetchAdminStorageStats = async () => {
    setIsLoadingAdminStorage(true);
    try {
      const res = await fetch('/api/admin/storage-stats', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          setAdminStorageStats(data);
          if (data.plans) {
            setStoragePlans({
              freeLimitMb: Math.round((data.plans.free || 5 * 1024 * 1024) / (1024 * 1024)),
              proLimitMb: Math.round((data.plans.pro || 100 * 1024 * 1024) / (1024 * 1024)),
              ultraLimitMb: Math.round((data.plans.ultra || 1024 * 1024 * 1024) / (1024 * 1024))
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin storage stats:', err);
    } finally {
      setIsLoadingAdminStorage(false);
    }
  };

  const handleRecalculateStorage = async (targetUserId?: string) => {
    const uid = targetUserId || recalcUserId;
    if (!uid.trim()) return;
    setIsRecalculating(true);
    setRecalcResult(null);
    try {
      const res = await fetch('/api/admin/recalculate-user-storage', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com'
        },
        body: JSON.stringify({ userId: uid.trim() })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setRecalcResult(`✅ تم إعادة احتساب مساحة المستخدم بنجاح! الاستهلاك الجديد: ${formatBytes(data.storageUsed)} (${data.messageCount} رسالة في ${data.chatCount} محادثات)`);
          fetchAdminStorageStats();
        } else {
          setRecalcResult(`❌ ${data?.error || 'فشل إعادة احتساب التخزين'}`);
        }
      } else {
        setRecalcResult('❌ فشل معالجة الطلب من الخادم.');
      }
    } catch (err) {
      setRecalcResult('❌ حدث خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveStoragePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStoragePlans(true);
    setStoragePlansResult(null);
    try {
      const res = await fetch('/api/admin/storage-plans', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com'
        },
        body: JSON.stringify({
          plans: {
            free: storagePlans.freeLimitMb * 1024 * 1024,
            pro: storagePlans.proLimitMb * 1024 * 1024,
            ultra: storagePlans.ultraLimitMb * 1024 * 1024
          }
        })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setStoragePlansResult('✅ تم تحديث وتطبيق حدود التخزين للخطط بنجاح!');
          fetchAdminStorageStats();
        } else {
          setStoragePlansResult(`❌ ${data?.error || 'فشل الحفظ'}`);
        }
      }
    } catch (err) {
      setStoragePlansResult('❌ خطأ أثناء الاتصال بالسيرفر.');
    } finally {
      setIsSavingStoragePlans(false);
    }
  };

  const fetchUsagePlans = async () => {
    setIsLoadingUsagePlans(true);
    try {
      const res = await fetch('/api/admin/usage-plans', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.plans) {
          setUsagePlansData(prev => ({ ...prev, ...data.plans }));
        }
      }
    } catch (err) {
      console.error('Error fetching usage plans in admin:', err);
    } finally {
      setIsLoadingUsagePlans(false);
    }
  };

  const handleSaveUsagePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUsagePlans(true);
    setUsagePlansSaveResult(null);
    try {
      const res = await fetch('/api/admin/usage-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail || 'onq6974@gmail.com'
        },
        body: JSON.stringify({ plans: usagePlansData })
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.success) {
          setUsagePlansSaveResult('🎉 تم تحديث وحدود الاستخدام للباقات على الخادم بنجاح!');
        } else {
          setUsagePlansSaveResult(`❌ ${data?.error || 'فشل الحفظ'}`);
        }
      }
    } catch (err) {
      setUsagePlansSaveResult('❌ خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsSavingUsagePlans(false);
    }
  };

  const fetchPromoCodes = async () => {
    setIsLoadingPromoCodes(true);
    try {
      const headers = { 'x-admin-email': userEmail || 'onq6974@gmail.com' };
      const [codesRes, redemptionsRes] = await Promise.all([
        fetch('/api/admin/promo-codes', { headers }),
        fetch('/api/admin/promo-redemptions', { headers })
      ]);
      if (codesRes.ok) {
        const data = await codesRes.json().catch(() => null);
        if (data?.codes) setPromoCodesList(data.codes || []);
      }
      if (redemptionsRes.ok) {
        const redData = await redemptionsRes.json().catch(() => null);
        if (redData?.redemptions) setPromoRedemptionsList(redData.redemptions || []);
      }
    } catch (e) {
      console.error('Error fetching promo codes or redemptions:', e);
    } finally {
      setIsLoadingPromoCodes(false);
    }
  };

  const fetchPaymentOrders = async () => {
    setIsLoadingPaymentOrders(true);
    try {
      const res = await fetch('/api/admin/payment-orders', {
        headers: { 'x-admin-email': userEmail || 'onq6974@gmail.com' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.orders) {
          setPaymentOrdersList(data.orders || []);
        }
      }
    } catch (e) {
      console.error('Error fetching payment orders:', e);
    } finally {
      setIsLoadingPaymentOrders(false);
    }
  };

  const handleUpdatePaymentOrder = async (orderId: string, status: string, userId: string, planId: string) => {
    try {
      const res = await fetch('/api/admin/payment-orders/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ orderId, status, userId, planId })
      });
      if (res.ok) {
        fetchPaymentOrders();
        alert('تم تحديث طلب الدفع وتفعيل الباقة للمستخدم بنجاح!');
      }
    } catch (err) {
      console.error('Error updating payment order:', err);
    }
  };

  const handleSavePlanFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanModalKey || !editingPlanData) return;
    setIsSavingPlanModal(true);
    setPlanModalMsg(null);
    try {
      const updatedPlans = {
        ...usagePlansData,
        [editingPlanModalKey]: editingPlanData
      };
      const res = await fetch('/api/admin/usage-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ plans: updatedPlans })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsagePlansData(updatedPlans);
        setPlanModalMsg('✅ تم حفظ الخطة بنجاح!');
        setTimeout(() => {
          setEditingPlanModalKey(null);
          setEditingPlanData(null);
          setPlanModalMsg(null);
        }, 1000);
      } else {
        setPlanModalMsg(`❌ ${data.error || 'فشل حفظ الخطة'}`);
      }
    } catch (err) {
      setPlanModalMsg('❌ حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSavingPlanModal(false);
    }
  };

  const handleSaveSubscriptionFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubData.userEmail.trim()) {
      setSubModalMsg('❌ البريد الإلكتروني للمستخدم مطلوب');
      return;
    }
    setIsSavingSubModal(true);
    setSubModalMsg(null);
    try {
      const res = await fetch('/api/admin/subscriptions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify(editingSubData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubModalMsg('✅ تم تفعيل الاشتراك بنجاح!');
        fetchPaymentOrders();
        fetchUsers();
        setTimeout(() => {
          setShowSubscriptionModal(false);
          setSubModalMsg(null);
        }, 1000);
      } else {
        setSubModalMsg(`❌ ${data.error || 'فشل حفظ الاشتراك'}`);
      }
    } catch (err) {
      setSubModalMsg('❌ حدث خطأ أثناء الاتصال بالسيرفر');
    } finally {
      setIsSavingSubModal(false);
    }
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: string) => {
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ userId, plan: newPlan })
      });
      if (res.ok) {
        fetchUsers();
        alert('تم تحديث باقة المستخدم بنجاح في قاعدة البيانات!');
      }
    } catch (err) {
      console.error('Error updating user plan:', err);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          code: newPromoCode,
          planId: newPromoPlan,
          maxUses: newPromoMaxUses,
          durationDays: newPromoDurationDays,
          expiresInDays: newPromoExpiresInDays
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoFormMessage(data.message);
        setNewPromoCode('');
        fetchPromoCodes();
        setTimeout(() => setPromoFormMessage(null), 4000);
      } else {
        setPromoFormMessage(data.error || 'فشل إنشاء الكود.');
      }
    } catch (err) {
      setPromoFormMessage('حدث خطأ في الاتصال.');
    }
  };

  const executeDeletePromoCode = async (codeId: string) => {
    try {
      const res = await fetch(`/api/admin/promo-codes/${codeId}`, {
        method: 'DELETE',
        headers: { 'x-admin-email': userEmail }
      });
      if (res.ok) {
        fetchPromoCodes();
      }
    } catch (err) {
      console.error('Error deleting promo code:', err);
    } finally {
      setConfirmModal(null);
    }
  };

  const handleDeletePromoCode = (codeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الكود الترويجي',
      message: 'هل أنت متأكد من حذف هذا الكود الترويجي؟ لن يتمكن المستخدمون من استخدامه بعد الآن.',
      onConfirm: () => executeDeletePromoCode(codeId)
    });
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
      fetchSysConfig();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'storage') fetchAdminStorageStats();
    if (activeTab === 'plans') fetchUsagePlans();
    if (activeTab === 'promo_codes') fetchPromoCodes();
    if (activeTab === 'payment_orders') fetchPaymentOrders();
    if (activeTab === 'content') fetchContent();
    if (activeTab === 'broadcast') fetchBroadcastLogs();
    if (activeTab === 'ai_config') fetchAiConfig();
    if (activeTab === 'config') fetchSysConfig();
    if (activeTab === 'db_tools') fetchDbStats();
    if (activeTab === 'api_keys' || activeTab === 'email_settings') fetchApiKeys();
    if (activeTab === 'system_logs') fetchSystemLogs();
  }, [activeTab, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">وصول مرفوض (403 Access Denied)</h2>
        <p className="text-sm text-white/60 max-w-md mb-6 leading-relaxed">
          عذراً، هذه اللوحة مخصصة حصرياً لمدير النظام المعين ({adminEmails[0]}). لا تمتلك الصلاحيات الكافية لاستخدام أو عرض هذه البيانات.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all"
          >
            العودة للإعدادات
          </button>
        )}
      </div>
    );
  }

  // Admin User Status Toggle
  const handleToggleUserSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          userId,
          isSuspended: !currentStatus
        })
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error('Error toggling user suspend status:', err);
    }
  };

  const executeDeleteUser = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setConfirmModal(null);
    }
  };

  // Admin Delete User
  const handleDeleteUser = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف حساب مستخدم نهائياً',
      message: 'هل أنت متأكد من إرادة حذف حساب هذا المستخدم نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: () => executeDeleteUser(userId)
    });
  };

  // Admin User Role Toggle
  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          userId,
          role: nextRole
        })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  // Save User Badge & Note
  const handleSaveUserBadge = async () => {
    if (!selectedUserForBadge) return;
    setIsSavingBadge(true);
    try {
      const res = await fetch('/api/admin/users/badge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          userId: selectedUserForBadge.id,
          badge: badgeInput,
          adminNote: adminNoteInput
        })
      });
      if (res.ok) {
        setSelectedUserForBadge(null);
        setBadgeInput('');
        setAdminNoteInput('');
        fetchUsers();
      }
    } catch (err) {
      console.error('Error saving user badge:', err);
    } finally {
      setIsSavingBadge(false);
    }
  };

  // Reset User Daily Usage
  const handleResetUserUsage = async (userId: string) => {
    setIsResettingUsage(true);
    try {
      const res = await fetch('/api/admin/users/reset-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'تم تصفير استهلاك المستخدم اليومي بنجاح!');
        fetchUsers();
        if (selectedUserForUsage && selectedUserForUsage.id === userId) {
          setSelectedUserForUsage((prev: any) => ({
            ...prev,
            dailyUsageToday: {
              fastChat: 0,
              deepReasoning: 0,
              webSearch: 0,
              liveVoiceMins: 0,
              audioSummaries: 0,
              textSummaries: 0,
              translations: 0
            }
          }));
        }
      } else {
        alert(data.error || 'فشل تصفير استهلاك المستخدم.');
      }
    } catch (err) {
      console.error('Error resetting user usage:', err);
    } finally {
      setIsResettingUsage(false);
    }
  };

  // Trigger Central Engine
  const handleRunDailyEngine = async () => {
    setIsEngineRunning(true);
    setEngineLog(null);
    try {
      const res = await triggerDailyNotificationEngine();
      if (res.success) {
        if (res.status === 'skipped') {
          setEngineLog(`⚠️ تم التخطي: ${res.reason}`);
        } else {
          setEngineLog(`✅ تم إرسال إشعار اليوم بنجاح!\n• العنوان: ${res.eventTitle || ''}\n• الفئة: ${res.topic || ''}\n• الأجهزة المستلمة: ${res.sentCount || 0}`);
        }
        fetchStats();
        if (activeTab === 'content') fetchContent();
      } else {
        setEngineLog(`❌ فشل المحرك: ${res.reason || 'خطأ غير معروف'}`);
      }
    } catch (err: any) {
      setEngineLog('❌ حدث خطأ أثناء الاتصال بالسيرفر.');
    } finally {
      setIsEngineRunning(false);
    }
  };

  // Create Manual Daily Notification/Event
  const handleCreateDailyContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    setIsAddingContent(true);
    setContentFormMessage(null);
    try {
      const res = await fetch('/api/admin/events/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          title: newTitle,
          summary: newSummary,
          category: newCategory,
          linkUrl: newLinkUrl,
          imageUrl: newImageUrl
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContentFormMessage('🎉 تم نشر الخبر/الحدث بنجاح في قاعدة البيانات!');
        setNewTitle('');
        setNewSummary('');
        setNewLinkUrl('');
        setNewImageUrl('');
        fetchContent();
        fetchStats();
      } else {
        setContentFormMessage(`❌ ${data.error || 'فشل النشر'}`);
      }
    } catch (err) {
      setContentFormMessage('❌ خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsAddingContent(false);
    }
  };

  const executeDeleteEventItem = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/events/delete?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-email': userEmail }
      });
      if (res.ok) {
        fetchContent();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setConfirmModal(null);
    }
  };

  // Delete Event Item
  const handleDeleteEventItem = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الخبر / الإشعار',
      message: 'هل أنت متأكد من حذف هذا الخبر/الإشعار من قاعدة البيانات؟ لن يظهر للمستخدمين بعد الآن.',
      onConfirm: () => executeDeleteEventItem(id)
    });
  };

  // Broadcast Push
  const handleSendCustomBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customBody.trim()) return;

    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const res = await fetch('/api/admin/broadcast-push', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          title: customTitle,
          body: customBody,
          imageUrl: customImage,
          linkUrl: customLink,
          topic: customTopic,
          adminEmail: userEmail
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastResult(`🎉 ${data.message}`);
        setCustomTitle('');
        setCustomBody('');
        setCustomImage('');
        setCustomLink('');
        fetchStats();
        fetchBroadcastLogs();
      } else {
        setBroadcastResult(`❌ ${data.error || 'فشل إرسال الإشعار الجماعي'}`);
      }
    } catch (err) {
      setBroadcastResult('❌ حدث خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Device Test Push
  const handleTestPushAdmin = async () => {
    if (!currentUser) return;
    setIsTestingPush(true);
    setTestPushResult(null);
    try {
      const result = await requestNotificationPermission(currentUser.uid);
      if (!result.success || !result.token) {
        setTestPushResult(`⚠️ ${result.error || 'يرجى تفعيل إذن الإشعارات للمتصفح أولاً'}`);
        setIsTestingPush(false);
        return;
      }

      const res = await triggerTestPushNotification(currentUser.uid, result.token);
      if (res.success) {
        setTestPushResult('✅ تم إرسال إشعار تجريبي لجهازك بنجاح!');
      } else {
        setTestPushResult(`❌ ${res.error || 'فشل الإرسال'}`);
      }
    } catch (err) {
      setTestPushResult('❌ خطأ في الاتصال.');
    } finally {
      setIsTestingPush(false);
    }
  };

  // Save System Config
  const handleSaveSysConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveResult(null);
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({
          maintenanceMode: sysConfig.maintenanceMode,
          maintenanceMessage: sysConfig.maintenanceMessage,
          announcement: {
            enabled: sysConfig.announcementEnabled,
            text: sysConfig.announcementText,
            type: sysConfig.announcementType
          },
          aiEnabled: sysConfig.aiEnabled,
          dailyPushEnabled: sysConfig.dailyPushEnabled
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigSaveResult('✅ تم حفظ إعدادات النظام وتحديثها في Firestore بنجاح!');
      } else {
        setConfigSaveResult(`❌ ${data.error || 'فشل حفظ الإعدادات'}`);
      }
    } catch (err) {
      setConfigSaveResult('❌ خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Save AI System Config
  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAiConfig(true);
    setAiConfigResult(null);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify(aiConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAiConfigResult('✅ تم حفظ قواعد وتوجيهات الذكاء الاصطناعي بنجاح!');
      } else {
        setAiConfigResult(`❌ ${data.error || 'فشل الحفظ'}`);
      }
    } catch (err) {
      setAiConfigResult('❌ خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  // DB Maintenance Execution
  const handleRunDbMaintenance = async (action: string) => {
    setIsCleaningDb(true);
    setDbCleanupLog(null);
    try {
      const res = await fetch('/api/admin/db-maintenance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': userEmail
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbCleanupLog(`🎉 ${data.message}`);
        fetchStats();
        fetchDbStats();
      } else {
        setDbCleanupLog(`❌ ${data.error || 'فشلت عملية الصيانة'}`);
      }
    } catch (err) {
      setDbCleanupLog('❌ خطأ في الاتصال بالسيرفر.');
    } finally {
      setIsCleaningDb(false);
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.id?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full pb-28 pt-20 px-3 sm:px-6 md:px-8 max-w-5xl mx-auto overflow-y-auto hide-scrollbar">
      
      {/* Top Header Card */}
      <div className="p-6 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-black/40 backdrop-blur-xl rounded-3xl border border-purple-500/30 mb-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg border border-white/20 shrink-0">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">لوحة تحكم الأدمن المطلقة</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-extrabold">
                تحكم كامل بالمستخدمين وقواعد البيانات
              </span>
            </div>
            <p className="text-xs text-white/60 mt-1">
              إدارة الحسابات، الأوسمة، قواعد الذكاء الاصطناعي، صيانة Firestore، والبث الجماعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'content') fetchContent();
              if (activeTab === 'broadcast') fetchBroadcastLogs();
              if (activeTab === 'ai_config') fetchAiConfig();
              if (activeTab === 'config') fetchSysConfig();
            }}
            disabled={isLoadingStats}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex flex-wrap items-center gap-2 pb-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>الملخص والتحليلات</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_insights')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'ai_insights'
              ? 'bg-emerald-600/40 text-emerald-300 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/50'
              : 'bg-emerald-950/40 text-emerald-300/80 hover:bg-emerald-900/40 border-emerald-500/30'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>التحليل الذكي والبحث الدلالي (AI Insights)</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_monitoring')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'ai_monitoring'
              ? 'bg-purple-600/40 text-purple-300 border-purple-500/60 shadow-lg ring-1 ring-purple-500/50'
              : 'bg-purple-950/40 text-purple-300/80 hover:bg-purple-900/40 border-purple-500/30'
          }`}
        >
          <Activity className="w-4 h-4 text-purple-400" />
          <span>استهلاك ومراقبة الذكاء الاصطناعي (AI Monitoring)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المستخدمين والحسابات ({stats?.totalUsers ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <HardDrive className="w-4 h-4 text-purple-400" />
          <span>مراقبة التخزين</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>إدارة الخطط والأسعار</span>
        </button>

        <button
          onClick={() => setActiveTab('promo_codes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'promo_codes'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Gift className="w-4 h-4 text-pink-400" />
          <span>أكواد الاسترداد والخصم</span>
        </button>

        <button
          onClick={() => setActiveTab('payment_orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'payment_orders'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>طلبات الدفع (Paymob)</span>
        </button>

        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'content'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>إدارة الأخبار والمحتوى</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>البث الجماعي الفوري</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'ai_config'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>قواعد الذكاء الاصطناعي</span>
        </button>

        <button
          onClick={() => setActiveTab('db_tools')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'db_tools'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>صيانة قاعدة البيانات</span>
        </button>

        <button
          onClick={() => setActiveTab('api_keys')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'api_keys'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>مفاتيح ومصادر المشروع</span>
        </button>

        <button
          onClick={() => setActiveTab('email_settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'email_settings'
              ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Mail className="w-4 h-4 text-emerald-400" />
          <span>إدارة البريد و Resend</span>
        </button>

        <button
          onClick={() => setActiveTab('advertising')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'advertising'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Megaphone className="w-4 h-4 text-purple-400" />
          <span>الإعلانات والتحليلات الإعلانية</span>
        </button>

        <button
          onClick={() => setActiveTab('legal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'legal'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>الشروط والسياسات القانونية</span>
        </button>
        <button
          onClick={() => setActiveTab('audio_diagnostics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'audio_diagnostics'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio Diagnostics</span>
        </button>


        <button
          onClick={() => setActiveTab('training_models')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'training_models'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>تدريب النماذج والبيانات</span>
        </button>

        <button
          onClick={() => setActiveTab('system_logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'system_logs'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>سجلات وأحداث النظام</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
            activeTab === 'config'
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات النظام والصيانة</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-white/40">المستخدمين</span>
              </div>
              <span className="text-2xl font-black text-white">{isLoadingStats ? '...' : stats?.totalUsers ?? 0}</span>
              <span className="text-[10px] text-white/50 mt-1">حساب مسجل في Firestore</span>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <Radio className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-white/40">الأجهزة المفعلة</span>
              </div>
              <span className="text-2xl font-black text-emerald-400">{isLoadingStats ? '...' : stats?.activeTokens ?? 0}</span>
              <span className="text-[10px] text-white/50 mt-1">FCM Tokens</span>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-red-400 mb-2">
                <UserX className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-white/40">الموقوفين</span>
              </div>
              <span className="text-2xl font-black text-red-400">{isLoadingStats ? '...' : stats?.suspendedUsers ?? 0}</span>
              <span className="text-[10px] text-white/50 mt-1">حساب موقوف عن العمل</span>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-pink-400 mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-white/40">الإشعارات اليومية</span>
              </div>
              <span className="text-2xl font-black text-pink-400">{isLoadingStats ? '...' : stats?.totalDailyNotifications ?? 0}</span>
              <span className="text-[10px] text-white/50 mt-1">ملخص تم إنشاؤه</span>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <Megaphone className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-white/40">البث الجماعي</span>
              </div>
              <span className="text-2xl font-black text-amber-400">{isLoadingStats ? '...' : stats?.broadcastsCount ?? 0}</span>
              <span className="text-[10px] text-white/50 mt-1">حملة إشعار جماعي</span>
            </div>
          </div>

          {/* Automated Engine Box */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} flex items-center justify-center shadow-md`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تشغيل محرك THOTH Push التلقائي</h3>
                  <p className="text-xs text-white/50">توليد أحدث ملخص وإرساله فوراً عبر FCM لجميع الأجهزة</p>
                </div>
              </div>

              <button
                onClick={handleRunDailyEngine}
                disabled={isEngineRunning}
                className={`px-4 py-2.5 rounded-xl ${theme.btnPrimary} text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50`}
              >
                {isEngineRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>تشغيل المحرك الآن</span>
              </button>
            </div>

            {engineLog && (
              <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/30 text-xs text-white/90 font-mono whitespace-pre-line leading-relaxed shadow-inner">
                {engineLog}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">إدارة قاعدة بيانات المستخدمين (Users DB)</h3>
              <p className="text-xs text-white/50">التحكم الفوري بالحسابات، الصلاحيات، منح الأوسمة، والتجميد من Firestore</p>
            </div>

            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="البحث بالبريد أو الاسم..."
              className="bg-black/30 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500 w-full sm:w-64"
            />
          </div>

          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-12 text-white/50 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              <span>جاري تحميل قائمة المستخدمين من Firestore...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-xs">
              لم يتم العثور على مستخدمين مطاطبقين مع معلمة البحث.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div 
                  key={u.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    u.isSuspended ? 'bg-red-950/20 border-red-500/30' : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {u.displayName?.substring(0, 1) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{u.displayName}</span>
                        {u.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                            {u.badge}
                          </span>
                        )}
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold">
                            أدمن
                          </span>
                        )}
                        {u.isSuspended && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[9px] font-bold">
                            موقوف
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/50 block">{u.email}</span>
                      
                      {/* User Usage & Stats Summary Badges */}
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/60 mt-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold uppercase border border-amber-500/20">
                          الباقة: {u.plan || 'free'}
                        </span>

                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70">
                          <HardDrive className="w-3 h-3 text-cyan-400" />
                          <span>التخزين: {formatBytes(u.storageUsed || 0)} / {formatBytes(u.storageLimit || 5242880)} ({u.storagePercentage || 0}%)</span>
                        </span>

                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70">
                          <Bot className="w-3 h-3 text-purple-400" />
                          <span>{u.chatsCount || 0} محادثة • {u.totalMessageCount || 0} رسالة</span>
                        </span>

                        <span>📱 {u.fcmTokensCount} FCM</span>

                        {u.adminNote && <span className="text-indigo-300 font-medium">📝 ملاحظة: {u.adminNote}</span>}
                      </div>

                      {/* Storage Progress Bar */}
                      <div className="w-full max-w-xs bg-black/40 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            (u.storagePercentage || 0) > 90 
                              ? 'bg-red-500' 
                              : (u.storagePercentage || 0) > 70 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, u.storagePercentage || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-0 border-white/5 shrink-0">
                    <button
                      onClick={() => setSelectedUserForUsage(u)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="عرض إحصائيات استهلاك الخدمات اليومية والتخزين"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>استهلاك المستخدم</span>
                    </button>

                    <select
                      value={u.plan || 'free'}
                      onChange={(e) => handleUpdateUserPlan(u.id, e.target.value)}
                      className="bg-black/50 border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold outline-none cursor-pointer"
                      title="تغيير باقة المستخدم"
                    >
                      <option value="free">مجانية (Free)</option>
                      <option value="basic">أساسية (Basic)</option>
                      <option value="pro">احترافية (Pro)</option>
                      <option value="max">قصوى (Max)</option>
                      <option value="ultra">فائقة (Ultra)</option>
                    </select>

                    <button
                      onClick={() => {
                        setSelectedUserForBadge(u);
                        setBadgeInput(u.badge || '');
                        setAdminNoteInput(u.adminNote || '');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="منح وسام وملاحظة أدمن"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>وسام/ملاحظة</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserSuspend(u.id, u.isSuspended)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                        u.isSuspended 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                      }`}
                      title={u.isSuspended ? 'إلغاء التجميد' : 'تجميد الحساب'}
                    >
                      {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{u.isSuspended ? 'تفعيل' : 'تجميد'}</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserRole(u.id, u.role)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="تغيير مستوى الصلاحيات"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{u.role === 'admin' ? 'تخفيض لمستخدم' : 'ترقية لأدمن'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer"
                      title="حذف الحساب نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* User Detailed Usage Modal */}
          {selectedUserForUsage && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#141824] border border-cyan-500/40 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">تفاصيل استهلاك المستخدم الكاملة</h3>
                      <p className="text-xs text-white/50">{selectedUserForUsage.displayName} ({selectedUserForUsage.email})</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUserForUsage(null)}
                    className="p-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Storage Quota Breakdown */}
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      استهلاك مساحة قاعدة البيانات (Storage Quota)
                    </span>
                    <span className="text-cyan-300 font-bold">
                      {formatBytes(selectedUserForUsage.storageUsed || 0)} من أصل {formatBytes(selectedUserForUsage.storageLimit || 5242880)}
                    </span>
                  </div>

                  <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        (selectedUserForUsage.storagePercentage || 0) > 90 
                          ? 'bg-red-500' 
                          : (selectedUserForUsage.storagePercentage || 0) > 70 
                          ? 'bg-amber-500' 
                          : 'bg-cyan-500'
                      }`}
                      style={{ width: `${Math.min(100, selectedUserForUsage.storagePercentage || 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                    <span>نسبة الاستهلاك: <strong className="text-white">{selectedUserForUsage.storagePercentage || 0}%</strong></span>
                    <span>المساحة المتبقية: <strong className="text-emerald-400">{formatBytes(Math.max(0, (selectedUserForUsage.storageLimit || 5242880) - (selectedUserForUsage.storageUsed || 0)))}</strong></span>
                  </div>
                </div>

                {/* Chat & Messages Counters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                      <Bot className="w-4 h-4" />
                      <span>إجمالي المحادثات</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">
                      {selectedUserForUsage.chatsCount || 0} <span className="text-xs font-normal text-white/50">محادثة</span>
                    </div>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                      <FileText className="w-4 h-4" />
                      <span>إجمالي الرسائل</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">
                      {selectedUserForUsage.totalMessageCount || 0} <span className="text-xs font-normal text-white/50">رسالة</span>
                    </div>
                  </div>
                </div>

                {/* Daily Features Usage Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white/80 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      استهلاك الخدمات اليومية لليوم الحالي
                    </h4>
                    <span className="text-[10px] text-white/40">تاريخ اليوم الحالي</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">⚡ محادثات سريعة (Fast Chat)</span>
                      <span className="font-extrabold text-amber-300">{selectedUserForUsage.dailyUsageToday?.fastChat || 0} طلب</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">🧠 تفكير عميق (Deep Reasoning)</span>
                      <span className="font-extrabold text-purple-300">{selectedUserForUsage.dailyUsageToday?.deepReasoning || 0} طلب</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">🔍 بحث في الويب (Web Search)</span>
                      <span className="font-extrabold text-cyan-300">{selectedUserForUsage.dailyUsageToday?.webSearch || 0} بحث</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">🎙️ محادثة صوتية حية (THOTH Live)</span>
                      <span className="font-extrabold text-emerald-300">{selectedUserForUsage.dailyUsageToday?.liveVoiceMins || 0} دقيقة</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">🎧 ملخصات صوتية (Audio Summaries)</span>
                      <span className="font-extrabold text-indigo-300">{selectedUserForUsage.dailyUsageToday?.audioSummaries || 0} ملخص</span>
                    </div>

                    <div className="bg-black/20 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-white/70">🌐 ترجمة فورية (Translations)</span>
                      <span className="font-extrabold text-blue-300">{selectedUserForUsage.dailyUsageToday?.translations || 0} ترجمة</span>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  <button
                    onClick={() => handleResetUserUsage(selectedUserForUsage.id)}
                    disabled={isResettingUsage}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResettingUsage ? 'animate-spin' : ''}`} />
                    <span>تصفير استهلاك اليوم للمستخدم</span>
                  </button>

                  <button
                    onClick={() => setSelectedUserForUsage(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Badge Edit Modal */}
          {selectedUserForBadge && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#141824] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">منح وسام/ملاحظة للمستخدم</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedUserForBadge(null)}
                    className="p-1 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-white/60">
                  المستخدم: <strong className="text-white">{selectedUserForBadge.displayName}</strong> ({selectedUserForBadge.email})
                </p>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">شارة / وسام الحساب (Badge)</label>
                  <input
                    type="text"
                    value={badgeInput}
                    onChange={(e) => setBadgeInput(e.target.value)}
                    placeholder="مثال: VIP 👑, محرر أخبار ✍️, مشترك ذهبي 🏆"
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">ملاحظات إدارية خاصة (Admin Note)</label>
                  <input
                    type="text"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="ملاحظة داخلية يراها فقط الأدمن..."
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    onClick={() => setSelectedUserForBadge(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveUserBadge}
                    disabled={isSavingBadge}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 flex items-center gap-1"
                  >
                    {isSavingBadge ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>حفظ الوسام في Firestore</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHAT STORAGE LIMITS & MONITORING */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Top Storage Overview Card */}
          <div className="bg-gradient-to-r from-purple-950/50 via-indigo-900/40 to-black/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-lg">
                  <HardDrive className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">نظام إدارة وتتبع تخزين المحادثات (Chat Storage Limits)</h3>
                  <p className="text-xs text-white/60">تحقق كامل Server-Side من مساحات المستخدمين وإعادة احتساب الحجم تلقائياً</p>
                </div>
              </div>

              <button
                onClick={fetchAdminStorageStats}
                disabled={isLoadingAdminStorage}
                className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingAdminStorage ? 'animate-spin' : ''}`} />
                <span>تحديث البيانات</span>
              </button>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-white/50 font-bold block mb-1">إجمالي استهلاك السيرفر</span>
                <span className="text-xl font-black text-purple-300 block">
                  {adminStorageStats ? formatBytes(adminStorageStats.totalStorageUsed) : 'جاري التحميل...'}
                </span>
                <span className="text-[11px] text-white/40 block mt-1">مساحة النصوص والوسائط المخزنة</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-white/50 font-bold block mb-1">إجمالي المستخدمين المسجلين</span>
                <span className="text-xl font-black text-indigo-300 block">
                  {adminStorageStats?.userCount ?? 0} مستخدم
                </span>
                <span className="text-[11px] text-white/40 block mt-1">حسابات نشطة في النظام</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-white/50 font-bold block mb-1">حالة السيرفر والتحقق</span>
                <span className="text-xl font-black text-emerald-400 block flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Server-Side Enforced</span>
                </span>
                <span className="text-[11px] text-white/40 block mt-1">حماية Firestore Rules والتعديل المباشر</span>
              </div>
            </div>
          </div>

          {/* Storage Plans Config Section */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تعديل حدود التخزين للباقات (Storage Plan Limits)</h3>
                <p className="text-xs text-white/50">تغيير الحد الأقصى لمساحة التخزين بالميجابايت لكل باقة على السيرفر</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-white/80 block">الباقة المجانية (Free Plan)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={storagePlans.freeLimitMb}
                        onChange={(e) => setStoragePlans({ ...storagePlans, freeLimitMb: Number(e.target.value) })}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
                        required
                      />
                      <span className="text-xs font-bold text-white/60">MB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSpecificStoragePlan('free', storagePlans.freeLimitMb)}
                    disabled={savingStoragePlanKey === 'free'}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {savingStoragePlanKey === 'free' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>حفظ الحد المجاني</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-white/80 block">الباقة الاحترافية (Pro Plan)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={storagePlans.proLimitMb}
                        onChange={(e) => setStoragePlans({ ...storagePlans, proLimitMb: Number(e.target.value) })}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
                        required
                      />
                      <span className="text-xs font-bold text-white/60">MB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSpecificStoragePlan('pro', storagePlans.proLimitMb)}
                    disabled={savingStoragePlanKey === 'pro'}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {savingStoragePlanKey === 'pro' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>حفظ الحد الاحترافي</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-white/80 block">الباقة الفائقة (Ultra Plan)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={storagePlans.ultraLimitMb}
                        onChange={(e) => setStoragePlans({ ...storagePlans, ultraLimitMb: Number(e.target.value) })}
                        className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500"
                        required
                      />
                      <span className="text-xs font-bold text-white/60">MB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveSpecificStoragePlan('ultra', storagePlans.ultraLimitMb)}
                    disabled={savingStoragePlanKey === 'ultra'}
                    className="w-full mt-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {savingStoragePlanKey === 'ultra' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>حفظ الحد الفائق</span>
                  </button>
                </div>
              </div>

              {storagePlansResult && (
                <div className="p-3 rounded-xl bg-white/10 text-xs font-bold text-amber-300 border border-white/10">
                  {storagePlansResult}
                </div>
              )}
            </div>
          </div>

          {/* Feature Usage Limits Config Section (Server-Side Enforced) */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">حدود استخدام الميزات للباقات (Server-Side Feature Limits)</h3>
                  <p className="text-xs text-white/50">تحديد الحدود اليومية الحقيقية التي يتحقق منها الخادم (المحادثات، التفكير، البحث، الصوت، الترجمة)</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={fetchUsagePlans}
                disabled={isLoadingUsagePlans}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsagePlans ? 'animate-spin' : ''}`} />
                <span>تحديث الحدود</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(usagePlansData).map((planKey) => {
                  const plan = usagePlansData[planKey] || {};
                  return (
                    <div key={planKey} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                          <span className="text-xs font-bold text-cyan-300 uppercase">{plan.name || planKey}</span>
                          
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/60 font-mono">{planKey}</span>
                        <button type="button" onClick={() => {
                          const copy = {...usagePlansData};
                          delete copy[planKey];
                          setUsagePlansData(copy);
                        }} className="text-red-400 hover:text-red-300 mr-2 text-xs bg-red-500/10 px-2 py-1 rounded-md">حذف</button>

                        </div>

                        <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-white/60 block mb-1">السعر (ج.م)</label>
                            <input type="number" value={plan.priceEgp ?? 0} onChange={(e) => setUsagePlansData({...usagePlansData, [planKey]: { ...plan, priceEgp: Number(e.target.value) }})} className="w-full bg-black/50 border border-white/15 rounded-xl px-2 py-1.5 text-white font-bold outline-none focus:border-amber-500" />
                          </div>
                          <div>
                            <label className="text-white/60 block mb-1">السعر ($)</label>
                            <input type="number" value={plan.priceUsd ?? 0} onChange={(e) => setUsagePlansData({...usagePlansData, [planKey]: { ...plan, priceUsd: Number(e.target.value) }})} className="w-full bg-black/50 border border-white/15 rounded-xl px-2 py-1.5 text-white font-bold outline-none focus:border-amber-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/60 block mb-1">نص السعر الترويجي</label>
                          <input type="text" value={plan.price || ''} onChange={(e) => setUsagePlansData({...usagePlansData, [planKey]: { ...plan, price: e.target.value }})} className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-white/60 block mb-1">الشارة (Badge)</label>
                          <input type="text" value={plan.badge || ''} onChange={(e) => setUsagePlansData({...usagePlansData, [planKey]: { ...plan, badge: e.target.value }})} className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-white/60 block mb-1">الميزات (مفصولة بفاصلة)</label>
                          <textarea rows={2} value={(plan.features || []).join(', ')} onChange={(e) => setUsagePlansData({...usagePlansData, [planKey]: { ...plan, features: e.target.value.split(',').map(s=>s.trim()) }})} className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white outline-none focus:border-amber-500 text-[10px] leading-relaxed resize-none"></textarea>
                        </div>

                          <div>
                            <label className="text-white/60 block mb-1">المحادثات العادية (Normal Chat)</label>
                            <input
                              type="number"
                              value={plan.normalChat ?? 0}
                              onChange={(e) => setUsagePlansData({
                                ...usagePlansData,
                                [planKey]: { ...plan, normalChat: Number(e.target.value) }
                              })}
                              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-white/60 block mb-1">المحادثات العميقة (Thinking Chat)</label>
                            <input
                              type="number"
                              value={plan.thinkingChat ?? 0}
                              onChange={(e) => setUsagePlansData({
                                ...usagePlansData,
                                [planKey]: { ...plan, thinkingChat: Number(e.target.value) }
                              })}
                              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-white/60 block mb-1">بحث الويب المباشر (Web Search)</label>
                            <input
                              type="number"
                              value={plan.webSearch ?? 0}
                              onChange={(e) => setUsagePlansData({
                                ...usagePlansData,
                                [planKey]: { ...plan, webSearch: Number(e.target.value) }
                              })}
                              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-white/60 block mb-1">الصوت الحي بالثواني (Live Voice Sec)</label>
                            <input
                              type="number"
                              value={plan.liveVoiceSec ?? 0}
                              onChange={(e) => setUsagePlansData({
                                ...usagePlansData,
                                [planKey]: { ...plan, liveVoiceSec: Number(e.target.value) }
                              })}
                              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="text-white/60 block mb-1">الترجمة الفورية (Translation)</label>
                            <input
                              type="number"
                              value={plan.translation ?? 0}
                              onChange={(e) => setUsagePlansData({
                                ...usagePlansData,
                                [planKey]: { ...plan, translation: Number(e.target.value) }
                              })}
                              className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveSpecificUsagePlan(planKey)}
                        disabled={savingUsagePlanKey === planKey}
                        className="w-full mt-3 px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {savingUsagePlanKey === planKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ حدود {plan.name || planKey}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {usagePlansSaveResult && (
                <div className="p-3 rounded-xl bg-white/10 text-xs font-bold text-cyan-300 border border-white/10">
                  {usagePlansSaveResult}
                </div>
              )}
            </div>
          </div>

          {/* Manual Recalculate User Storage Tool */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إعادة احتساب مساحة المستخدم (Recalculate User Storage)</h3>
                <p className="text-xs text-white/50">وظيفة إدارية لحساب مجموع أحجام الرسائل والمرفقات وتصحيح storageUsed في Firestore</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={recalcUserId}
                onChange={(e) => setRecalcUserId(e.target.value)}
                placeholder="أدخل معرف المستخدم (User ID / UID)..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleRecalculateStorage()}
                disabled={isRecalculating || !recalcUserId.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                {isRecalculating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الفحص والإعادة...</span>
                  </>
                ) : (
                  <span>إعادة الاحتساب الآن</span>
                )}
              </button>
            </div>

            {recalcResult && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/15 text-xs font-bold text-indigo-200 leading-relaxed">
                {recalcResult}
              </div>
            )}
          </div>

          {/* User Storage Usage List / Ranking */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>أعلى المستخدمين استهلاكاً لمساحة المحادثات</span>
              </h3>
              <span className="text-xs text-white/40">
                {adminStorageStats?.topUsersByStorage?.length || 0} مستخدمين متوفرين
              </span>
            </div>

            {!adminStorageStats?.topUsersByStorage || adminStorageStats.topUsersByStorage.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40">
                لا توجد بيانات استهلاك متاحة حالياً. يمكنك إجراء عملية إعادة الاحتساب لأي مستخدم أعلاه.
              </div>
            ) : (
              <div className="space-y-3">
                {adminStorageStats.topUsersByStorage.map((u: any) => {
                  const used = u.storageUsed || 0;
                  const limit = u.storageLimit || 5 * 1024 * 1024;
                  const pct = Math.round((used / limit) * 100);

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/40 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{u.displayName || 'مستخدم بدون اسم'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {u.plan || 'free'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 font-mono">{u.email || u.id}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right sm:text-left min-w-[120px]">
                          <span className="text-xs font-bold text-purple-300 block">
                            {formatBytes(used)} / {formatBytes(limit)}
                          </span>
                          <span className="text-[10px] text-white/40 block">
                            نسبة الاستهلاك: {pct}%
                          </span>
                        </div>

                        <button
                          onClick={() => handleRecalculateStorage(u.id)}
                          disabled={isRecalculating}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          title="إعادة احتساب مساحة هذا المستخدم"
                        >
                          إعادة احتساب
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Add New Daily Content Form */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shadow-md">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إضافة حدث / خبر يومي جديد لقاعدة البيانات</h3>
                <p className="text-xs text-white/50">سيتم حفظ الخبر ونشره في التطبيق وإرساله كإشعار للمستخدمين المهتمين</p>
              </div>
            </div>

            <form onSubmit={handleCreateDailyContent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">عنوان الخبر / الحدث *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: إطلاق نموذج Gemini 2.5 الفائق..."
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">الفئة والاهتمام</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="الذكاء الاصطناعي">🤖 الذكاء الاصطناعي</option>
                    <option value="تكنولوجيا">📱 تكنولوجيا وهواتف</option>
                    <option value="البرمجة">💻 البرمجة والتطوير</option>
                    <option value="العاب">🎮 ألعاب إلكترونية</option>
                    <option value="اقتصاد">💼 اقتصاد وأعمال</option>
                    <option value="عام">🌍 عام</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">ملخص الخبر / التفاصيل *</label>
                <textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="اكتب شرحاً وافياً وموجزاً عن الخبر..."
                  rows={3}
                  className="w-full bg-black/30 border border-white/15 rounded-xl p-3.5 text-xs text-white outline-none focus:border-purple-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">رابط المصدر الخارجية (اختياري)</label>
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://news.google.com/..."
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">رابط الصورة التوضيحية (اختياري)</label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isAddingContent}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAddingContent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>نشر الخبر بقاعدة البيانات الآن</span>
                </button>
              </div>

              {contentFormMessage && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-medium">
                  {contentFormMessage}
                </div>
              )}
            </form>
          </div>

          {/* List of Content Items */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">الأخبار والأحداث المخزنة في Firestore</h3>
              <span className="text-xs font-bold text-white/40">{dailyNotifications.length} عنصر</span>
            </div>

            {isLoadingContent ? (
              <div className="text-center py-8 text-white/50 text-xs">جاري تحميل المحتوى...</div>
            ) : dailyNotifications.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs">لا توجد عناصر محفوظة حتى الآن.</div>
            ) : (
              <div className="space-y-3">
                {dailyNotifications.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-0.5 rounded-full">
                        {item.category || item.topic || 'عام'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/40 font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('ar-EG') : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteEventItem(item.id)}
                          className="p-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer"
                          title="حذف من القاعدة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{item.title || item.eventTitle}</h4>
                    <p className="text-xs text-white/70 leading-relaxed">{item.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST PUSH CENTER */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إرسال إشعار جماعي مخصص (Broadcast Push)</h3>
                <p className="text-xs text-white/50">كتابة وإرسال إشعار فوري لجميع الأجهزة وحفظ العملية في Firestore</p>
              </div>
            </div>

            <form onSubmit={handleSendCustomBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">عنوان الإشعار *</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="مثال: 🚀 تحديث جديد في THOTH AI"
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">الفئة / الموضوع</label>
                  <select
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="AI">🤖 الذكاء الاصطناعي</option>
                    <option value="Technology">📱 التكنولوجيا والتقنية</option>
                    <option value="Programming">💻 البرمجة والتطوير</option>
                    <option value="Gaming">🎮 الألعاب الإلكترونية</option>
                    <option value="Business">💼 المال والأعمال</option>
                    <option value="World">🌍 أحداث العالم</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">نص الرسالة والإشعار *</label>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="اكتب تفاصيل الإشعار التي ستظهر للمستخدمين على شاشاتهم..."
                  rows={3}
                  className="w-full bg-black/30 border border-white/15 rounded-xl p-3.5 text-xs text-white outline-none focus:border-purple-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">رابط صورة الإشعار (اختياري)</label>
                  <input
                    type="url"
                    value={customImage}
                    onChange={(e) => setCustomImage(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1.5">الرابط المباشر عند النقر (Deep Link)</label>
                  <input
                    type="text"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="/"
                    className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isBroadcasting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال الإشعار الجماعي الآن</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestPushAdmin}
                  disabled={isTestingPush}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isTestingPush ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5 text-purple-400" />}
                  <span>اختبار على جهازي</span>
                </button>
              </div>

              {broadcastResult && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-medium">
                  {broadcastResult}
                </div>
              )}

              {testPushResult && (
                <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-purple-200 font-medium">
                  {testPushResult}
                </div>
              )}
            </form>
          </div>

          {/* Broadcast Logs from Firestore */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">سجل حملات البث السابقة (Broadcast Logs)</h3>
              <span className="text-xs font-bold text-white/40">{broadcastLogs.length} حملة</span>
            </div>

            {broadcastLogs.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-xs">لا توجد سجلات بث سابقة حتى الآن.</div>
            ) : (
              <div className="space-y-3">
                {broadcastLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300">{log.title}</span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG') : ''}
                      </span>
                    </div>
                    <p className="text-xs text-white/70">{log.body}</p>
                    <div className="flex items-center gap-4 text-[10px] text-white/50 pt-2 border-t border-white/5">
                      <span className="text-emerald-400">✅ المستلمين: {log.sentCount ?? 0}</span>
                      <span className="text-red-400">❌ الفشل: {log.failureCount ?? 0}</span>
                      <span>🏷️ الفئة: {log.topic || 'General'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AI SYSTEM RULES & PROMPT CONTROLS */}
      {activeTab === 'ai_config' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">تخصيص قواعد وتوجيهات الذكاء الاصطناعي (AI System Prompt)</h3>
              <p className="text-xs text-white/50">توجيه سلوك المساعد، اختيار نموذج Gemini، والتحكم في النبرة والإبداع</p>
            </div>
          </div>

          <form onSubmit={handleSaveAiConfig} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-white/70 block mb-1.5">التعليمات الثابتة للمساعد الذكي (System Instructions Prompt)</label>
              <textarea
                value={aiConfig.systemInstructions}
                onChange={(e) => setAiConfig({ ...aiConfig, systemInstructions: e.target.value })}
                rows={5}
                className="w-full bg-black/40 border border-white/15 rounded-xl p-3.5 text-xs text-white outline-none focus:border-purple-500 leading-relaxed font-mono"
                placeholder="اكتب التوجيهات التي ستحدد أسلوب رد الذكاء الاصطناعي..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">نموذج Gemini المفضل</label>
                <select
                  value={aiConfig.preferredModel}
                  onChange={(e) => setAiConfig({ ...aiConfig, preferredModel: e.target.value })}
                  className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (الافتراضي فائق الذكاء)</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash (سريع ودقيق)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (خفيف وفائق السرعة)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (استدلال متقدم)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">أسلوب ونبرة المساعد (Tone)</label>
                <input
                  type="text"
                  value={aiConfig.customTone}
                  onChange={(e) => setAiConfig({ ...aiConfig, customTone: e.target.value })}
                  placeholder="مثال: مهني، ودود، مشجع، موجز جداً"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">درجة الإبداع والعشوائية (Temperature: {aiConfig.temperature})</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer mt-2"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">أقصى عدد للكلمات/التوكنز (Max Tokens)</label>
                <input
                  type="number"
                  value={aiConfig.maxTokens}
                  onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) || 2048 })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isSavingAiConfig}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSavingAiConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                <span>حفظ توجيهات الذكاء الاصطناعي في Firestore</span>
              </button>
            </div>

            {aiConfigResult && (
              <div className="p-3 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-purple-200 font-medium">
                {aiConfigResult}
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 6: DATABASE MAINTENANCE & CLEANUP */}
      {activeTab === 'db_tools' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-md">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">أدوات تنظيف وصيانة قاعدة البيانات (Firestore Tools & Metrics)</h3>
                <p className="text-xs text-white/50">إحصائيات حية للمجموعات، تنظيف السجلات القديمة، وإعادة حساب مساحات التخزين</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDb}
                className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير نسخة احتياطية (JSON)</span>
              </button>
              <button
                onClick={fetchDbStats}
                disabled={isLoadingDbStats}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDbStats ? 'animate-spin' : ''}`} />
                <span>تحديث الإحصائيات</span>
              </button>
            </div>
          </div>

          {/* Database Collections Live Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-white/50 mb-1">المستخدمين (Users)</div>
              <div className="text-lg font-mono font-bold text-emerald-400">{dbStats?.totalUsers ?? '...'}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-white/50 mb-1">طلبات الدفع (Orders)</div>
              <div className="text-lg font-mono font-bold text-purple-400">{dbStats?.totalPaymentOrders ?? '...'}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-white/50 mb-1">أكواد الخصم (Promo)</div>
              <div className="text-lg font-mono font-bold text-amber-400">{dbStats?.totalPromoCodes ?? '...'}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-white/50 mb-1">سجلات البث (Broadcasts)</div>
              <div className="text-lg font-mono font-bold text-indigo-400">{dbStats?.totalBroadcastLogs ?? '...'}</div>
            </div>
            <div className="col-span-2 md:col-span-1 p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div className="text-[10px] text-white/50 mb-1">أحداث النظام (Events)</div>
              <div className="text-lg font-mono font-bold text-pink-400">{dbStats?.totalSentEvents ?? '...'}</div>
            </div>
          </div>

          {dbStats && (
            <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex flex-wrap items-center justify-between text-xs text-white/60">
              <span>نوع قاعدة البيانات: <strong className="text-white font-mono">{dbStats.databaseType}</strong></span>
              <span>إصدار Node.js: <strong className="text-white font-mono">{dbStats.nodeVersion}</strong></span>
              <span>وقت تشغيل السيرفر: <strong className="text-white font-mono">{Math.round(dbStats.serverUptime / 60)} دقائق</strong></span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>تنظيف سجلات البث الجماعي القديمة</span>
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                حذف حملات الإشعارات الجماعية المخزنة التي مر عليها أكثر من 30 يوماً لتوفير المساحة.
              </p>
              <button
                onClick={() => handleRunDbMaintenance('clean_old_broadcasts')}
                disabled={isCleaningDb}
                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCleaningDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>تنفيذ التنظيف الآن</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>تنظيف سجلات الأحداث القديمة (60+ يوماً)</span>
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                حذف أرشفة أحداث اليوم والإشعارات القديمة جداً من Firestore.
              </p>
              <button
                onClick={() => handleRunDbMaintenance('clean_old_events')}
                disabled={isCleaningDb}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCleaningDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>تنفيذ التنظيف الآن</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>إعادة حساب مساحات التخزين للجميع</span>
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                فحص ومزامنة إجمالي استهلاك التخزين لجميع حسابات المستخدمين في قاعدة البيانات.
              </p>
              <button
                onClick={() => handleRunDbMaintenance('recalculate_all_storage')}
                disabled={isCleaningDb}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCleaningDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>إعادة حساب التخزين</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>تفريغ الذاكرة المؤقتة (Vacuum Cache)</span>
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                إعادة ضبط الذاكرة المؤقتة المؤقتة في الخادم لتحسين أداء استجابة API.
              </p>
              <button
                onClick={() => handleRunDbMaintenance('vacuum_cache')}
                disabled={isCleaningDb}
                className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCleaningDb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>تفريغ الكاش</span>
              </button>
            </div>
          </div>

          {dbCleanupLog && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-indigo-500/30 text-xs text-indigo-200 font-medium">
              {dbCleanupLog}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SYSTEM CONFIG & MAINTENANCE */}
      {activeTab === 'config' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">إعدادات النظام، الصيانة، والإعلانات</h3>
              <p className="text-xs text-white/50">التحكم المباشر في حالة عمل التطبيق والشريط الإعلاني العلوي</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Maintenance Mode Option */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className={`w-5 h-5 ${sysConfig.maintenanceMode ? 'text-red-400' : 'text-emerald-400'}`} />
                  <div>
                    <span className="text-sm font-bold text-white block">وضع الصيانة الكامل (Maintenance Mode)</span>
                    <span className="text-[11px] text-white/50 block">إيقاف الوصول للتطبيق وإظهار رسالة صيانة للمستخدمين العاديين</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysConfig.maintenanceMode}
                    onChange={(e) => setSysConfig({ ...sysConfig, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {sysConfig.maintenanceMode && (
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">رسالة الصيانة التي ستظهر للمستخدمين:</label>
                  <input
                    type="text"
                    value={sysConfig.maintenanceMessage}
                    onChange={(e) => setSysConfig({ ...sysConfig, maintenanceMessage: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveSpecificSysConfig('maintenance')}
                  disabled={savingConfigType === 'maintenance'}
                  className="px-4 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingConfigType === 'maintenance' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>حفظ وضع الصيانة</span>
                </button>
              </div>
            </div>

            {/* Announcement Banner Settings */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-purple-400" />
                  <div>
                    <span className="text-sm font-bold text-white block">الشريط الإعلاني العلوي (Announcement Banner)</span>
                    <span className="text-[11px] text-white/50 block">عرض شريط تنويه ثابت أعلى شاشة التطبيق لجميع الزوار</span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysConfig.announcementEnabled}
                    onChange={(e) => setSysConfig({ ...sysConfig, announcementEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {sysConfig.announcementEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-white/70 block mb-1">نص التنويه الإعلاني:</label>
                    <input
                      type="text"
                      value={sysConfig.announcementText}
                      onChange={(e) => setSysConfig({ ...sysConfig, announcementText: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-white/70 block mb-1">نوع الشريط:</label>
                    <select
                      value={sysConfig.announcementType}
                      onChange={(e) => setSysConfig({ ...sysConfig, announcementType: e.target.value as any })}
                      className="bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="info">ℹ️ معلومات عادي (أزرق/بنفسجي)</option>
                      <option value="warning">⚠️ تحذير مهم (أصفر/برتقالي)</option>
                      <option value="alert">🚨 تنبيه عاجل (أحمر)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveSpecificSysConfig('announcement')}
                  disabled={savingConfigType === 'announcement'}
                  className="px-4 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingConfigType === 'announcement' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>حفظ الشريط الإعلاني</span>
                </button>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">تفعيل الميزات الرئيسية</h4>

              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-white">محرك الذكاء الاصطناعي والتحليلات (Gemini AI)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysConfig.aiEnabled}
                    onChange={(e) => setSysConfig({ ...sysConfig, aiEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">محرك الإشعارات اليومية الدورية (Push Engine)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sysConfig.dailyPushEnabled}
                    onChange={(e) => setSysConfig({ ...sysConfig, dailyPushEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveSpecificSysConfig('features')}
                  disabled={savingConfigType === 'features'}
                  className="px-4 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingConfigType === 'features' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ الميزات المفعّلة</span>
                </button>
              </div>
            </div>

            {configSaveResult && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-medium">
                {configSaveResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PLANS & PRICING CONTROL */}
      {activeTab === 'plans' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إدارة الخطط، الأسعار، وحدود الميزات (Subscription Plans CRUD)</h3>
                <p className="text-xs text-white/50">تحكم كامل من لوحة الأدمن في تسعير الباقات ومحددات الاستخدام المخزنة في قاعدة البيانات</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newKey = `plan_${Date.now()}`;
                  setEditingPlanModalKey(newKey);
                  setEditingPlanData({
                    name: 'باقة جديدة',
                    priceEgp: 200,
                    priceUsd: 10,
                    price: '200 ج.م / شهرياً',
                    badge: 'باقة مخصصة',
                    features: ['ميزة 1', 'ميزة 2'],
                    normalChat: 50,
                    thinkingChat: 50,
                    webSearch: 10,
                    liveVoiceSec: 600,
                    translation: 100
                  });
                }}
                className="px-4 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة خطة جديدة</span>
              </button>

              <button
                onClick={fetchUsagePlans}
                disabled={isLoadingUsagePlans}
                className="px-4 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsagePlans ? 'animate-spin' : ''}`} />
                <span>تحديث الخطط</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveUsagePlans} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(usagePlansData).map((planKey) => {
                const plan = usagePlansData[planKey] || {};
                return (
                  <div key={planKey} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <input
                          type="text"
                          value={plan.name || planKey}
                          onChange={(e) => setUsagePlansData({
                            ...usagePlansData,
                            [planKey]: { ...plan, name: e.target.value }
                          })}
                          className="bg-transparent border-b border-amber-500/40 text-xs font-bold text-amber-300 outline-none pb-1 w-2/3"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlanModalKey(planKey);
                              setEditingPlanData({ ...usagePlansData[planKey] });
                            }}
                            className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="تعديل التفاصيل المتقدمة"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white/60 font-mono">{planKey}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-white/60 block mb-1">المحادثات العادية (Normal Chat)</label>
                          <input
                            type="number"
                            value={plan.normalChat ?? 0}
                            onChange={(e) => setUsagePlansData({
                              ...usagePlansData,
                              [planKey]: { ...plan, normalChat: Number(e.target.value) }
                            })}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-white/60 block mb-1">المحادثات العميقة (Thinking)</label>
                          <input
                            type="number"
                            value={plan.thinkingChat ?? 0}
                            onChange={(e) => setUsagePlansData({
                              ...usagePlansData,
                              [planKey]: { ...plan, thinkingChat: Number(e.target.value) }
                            })}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-white/60 block mb-1">البحث الذكي (Web Search)</label>
                          <input
                            type="number"
                            value={plan.webSearch ?? 0}
                            onChange={(e) => setUsagePlansData({
                              ...usagePlansData,
                              [planKey]: { ...plan, webSearch: Number(e.target.value) }
                            })}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-white/60 block mb-1">المساعد الصوتي (ثواني)</label>
                          <input
                            type="number"
                            value={plan.liveVoiceSec ?? 0}
                            onChange={(e) => setUsagePlansData({
                              ...usagePlansData,
                              [planKey]: { ...plan, liveVoiceSec: Number(e.target.value) }
                            })}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-white/60 block mb-1">الترجمة الفورية (كلمة)</label>
                          <input
                            type="number"
                            value={plan.translation ?? 0}
                            onChange={(e) => setUsagePlansData({
                              ...usagePlansData,
                              [planKey]: { ...plan, translation: Number(e.target.value) }
                            })}
                            className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {usagePlansSaveResult && (
                <div className="p-3 rounded-xl bg-white/10 text-xs font-bold text-amber-300 border border-white/10">
                  {usagePlansSaveResult}
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingUsagePlans}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition-all shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isSavingUsagePlans ? 'جاري الحفظ...' : 'حفظ وتحديث الخطط والحدود في قاعدة البيانات'}
              </button>
            </form>
        </div>
      )}

      {/* TAB: PROMO / REDEEM CODES CONTROL */}
      {activeTab === 'promo_codes' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shadow-md">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إدارة وتوليد أكواد الاسترداد والخصم (Promo & Redeem Codes)</h3>
                <p className="text-xs text-white/50">إنشاء أكواد تفعيل مخصصة لترقية المستخدمين تلقائياً إلى الباقات المدفوعة</p>
              </div>
            </div>

            <button
              onClick={fetchPromoCodes}
              disabled={isLoadingPromoCodes}
              className="px-4 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/40 text-pink-300 border border-pink-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPromoCodes ? 'animate-spin' : ''}`} />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {/* Create Promo Code Form */}
          <form onSubmit={handleCreatePromoCode} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">إنشاء كود استرداد جديد وحساب المدد والتاريخ</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">رمز الكود (مثال: EGYPT2026):</label>
                <input
                  type="text"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  placeholder="THOTHVIP"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono uppercase font-bold outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">الباقة المستهدفة عند الاسترداد:</label>
                <select
                  value={newPromoPlan}
                  onChange={(e) => setNewPromoPlan(e.target.value)}
                  className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500 cursor-pointer font-bold"
                >
                  <option value="basic">الباقة الأساسية (Basic)</option>
                  <option value="pro">الباقة الاحترافية (Pro)</option>
                  <option value="max">الباقة القصوى (Max)</option>
                  <option value="ultra">الباقة الفائقة (Ultra)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">مدة الاشتراك الممنوحة:</label>
                <select
                  value={newPromoDurationDays}
                  onChange={(e) => setNewPromoDurationDays(Number(e.target.value))}
                  className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500 cursor-pointer font-bold"
                >
                  <option value={7}>أسبوع واحد (7 أيام)</option>
                  <option value={30}>شهر واحد (30 يوماً)</option>
                  <option value={90}>3 أشهر (90 يوماً)</option>
                  <option value={180}>6 أشهر (180 يوماً)</option>
                  <option value={365}>سنة كاملة (365 يوماً)</option>
                  <option value={9999}>اشتراك دائم (مدى الحياة)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">صلاحية استرداد الكود نفسه:</label>
                <select
                  value={newPromoExpiresInDays}
                  onChange={(e) => setNewPromoExpiresInDays(Number(e.target.value))}
                  className="w-full bg-[#141824] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-pink-500 cursor-pointer font-bold"
                >
                  <option value={7}>صالح لمدة أسبوع (7 أيام)</option>
                  <option value={30}>صالح لمدة شهر (30 يوماً)</option>
                  <option value={90}>صالح لمدة 3 أشهر (90 يوماً)</option>
                  <option value={365}>صالح لمدة سنة (365 يوماً)</option>
                  <option value={9999}>دائم (بدون تاريخ انتهاء)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">الحد الأقصى للاستخدام:</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={newPromoMaxUses}
                  onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-pink-500"
                  required
                />
              </div>
            </div>

            {promoFormMessage && (
              <div className="p-3 rounded-xl bg-pink-500/20 border border-pink-500/40 text-xs font-bold text-pink-200">
                {promoFormMessage}
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              إنشاء وحفظ الكود في قاعدة البيانات
            </button>
          </form>

          {/* Existing Promo Codes Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">أكواد التفعيل النشطة في قاعدة البيانات</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-3 px-4">الكود</th>
                    <th className="py-3 px-4">الباقة</th>
                    <th className="py-3 px-4">مدة الاشتراك</th>
                    <th className="py-3 px-4">انتهاء الكود</th>
                    <th className="py-3 px-4">الاستخدامات</th>
                    <th className="py-3 px-4">تاريخ الإنشاء</th>
                    <th className="py-3 px-4">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {promoCodesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-white/40">لا توجد أكواد استرداد مسجلة حالياً.</td>
                    </tr>
                  ) : (
                    promoCodesList.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-pink-300">{item.code}</td>
                        <td className="py-3 px-4 font-bold text-amber-300 uppercase">{item.planId}</td>
                        <td className="py-3 px-4 font-bold text-emerald-300">
                          {item.durationDays ? (item.durationDays >= 9000 ? 'مدى الحياة' : `${item.durationDays} يوماً`) : '30 يوماً'}
                        </td>
                        <td className="py-3 px-4 text-white/80">
                          {item.expiresAt ? (item.expiresAt === 'never' ? 'دائم' : new Date(item.expiresAt).toLocaleDateString('ar-EG')) : '30 يوماً'}
                        </td>
                        <td className="py-3 px-4 text-white/80">{item.usedCount || 0} / {item.maxUses || 100}</td>
                        <td className="py-3 px-4 text-white/50">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeletePromoCode(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold transition-all cursor-pointer"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Redemptions Log Table */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <span>سجل تفعيلات الحسابات بالأكواد في قاعدة البيانات (Firestore)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">محدث فورياً</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-3 px-4">المستخدم (الإيميل / المعرف)</th>
                    <th className="py-3 px-4">الكود المسترد</th>
                    <th className="py-3 px-4">الباقة المفعلة</th>
                    <th className="py-3 px-4">مدة الاشتراك</th>
                    <th className="py-3 px-4">تاريخ التفعيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {promoRedemptionsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-white/40">لا توجد عمليات تفعيل سابقة مسجلة.</td>
                    </tr>
                  ) : (
                    promoRedemptionsList.map((red) => (
                      <tr key={red.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{red.userEmail || 'غير معروف'}</span>
                          <span className="text-[10px] text-white/40 font-mono">{red.userId}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-pink-300">{red.code}</td>
                        <td className="py-3 px-4 font-bold text-amber-300 uppercase">{red.planId}</td>
                        <td className="py-3 px-4 text-emerald-300 font-bold">
                          {red.durationDays ? (red.durationDays >= 9000 ? 'مدى الحياة' : `${red.durationDays} يوماً`) : '30 يوماً'}
                        </td>
                        <td className="py-3 px-4 text-white/60">
                          {red.redeemedAt ? new Date(red.redeemedAt).toLocaleString('ar-EG') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT ORDERS (PAYMOB) */}
      {activeTab === 'payment_orders' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">متابعة طلبات الدفع ومعاملات بوابة Paymob</h3>
                <p className="text-xs text-white/50">الاطلاع على جميع طلبات الدفع، المبالغ، الحالات، وتفعيل الباقات يدوياً عند الحاجة</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSubData({
                    userEmail: '',
                    planId: 'pro',
                    provider: 'manual',
                    status: 'active',
                    amount: 150,
                    currency: 'EGP',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  });
                  setShowSubscriptionModal(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-blue-300" />
                <span>إضافة اشتراك يدوي</span>
              </button>

              <button
                onClick={fetchPaymentOrders}
                disabled={isLoadingPaymentOrders}
                className="px-4 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPaymentOrders ? 'animate-spin' : ''}`} />
                <span>تحديث الطلبات</span>
              </button>
            </div>
          </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-3 px-4">رقم الطلب (ID)</th>
                    <th className="py-3 px-4">المستخدم / البريد</th>
                    <th className="py-3 px-4">الباقة</th>
                    <th className="py-3 px-4">المبلغ (ج.م)</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/40">لا توجد طلبات دفع مسجلة حالياً في قاعدة البيانات.</td>
                    </tr>
                  ) : (
                    paymentOrdersList.map((order) => (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-300">{order.orderId || order.id}</td>
                        <td className="py-3 px-4 text-white">
                          <div className="font-bold">{order.customerName || 'مستخدم'}</div>
                          <div className="text-[10px] text-white/50">{order.customerEmail || order.userId}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-300 uppercase">{order.planId}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white">{order.amount} EGP</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            order.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {order.status === 'completed' ? 'مكتمل (مدفوع)' : 'معلق (Pending)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/50">{order.createdAt ? new Date(order.createdAt).toLocaleString('ar-EG') : '-'}</td>
                        <td className="py-3 px-4 flex items-center gap-2">
                          {order.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdatePaymentOrder(order.orderId || order.id, 'completed', order.userId, order.planId)}
                              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold transition-all cursor-pointer"
                            >
                              تأكيد وتفعيل الباقة
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdatePaymentOrder(order.orderId || order.id, 'cancelled', order.userId, order.planId)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold transition-all cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* TAB: EMAIL & RESEND MANAGEMENT */}
      {activeTab === 'email_settings' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">إدارة البريد الإلكتروني و Resend API</h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                    Firestore Database Connected
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">
                  لوحة التحكم الكاملة في إعدادات البريد، مفتاح Resend API، خوادم SMTP، واختبار الإرسال المباشر بقاعدة البيانات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchApiKeys}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiKeys ? 'animate-spin' : ''}`} />
                <span>مزامنة من قاعدة البيانات</span>
              </button>
            </div>
          </div>

          {/* Key Status Overview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-white/50">حالة المفتاح في قاعدة البيانات</div>
                <div className="text-xs font-bold text-emerald-300 font-mono">
                  {apiKeysState.resendApiKey ? 'مفعل ومحفوظ في DB' : 'غير مسجل'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-indigo-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-white/50">مزود البريد النشط</div>
                <div className="text-xs font-bold text-indigo-300">
                  Resend API (توصيل حقيقي)
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-white/50">خيار الاحتياط السريع</div>
                <div className="text-xs font-bold text-amber-300">
                  SMTP + الرمز المباشر (Active)
                </div>
              </div>
            </div>
          </div>

          {/* Resend Main Key & Sender Form */}
          <div className="p-5 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>إعدادات مفتاح Resend API و عنوان المرسل</span>
              </h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Resend Platform
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resend Key */}
              <div className="space-y-1 bg-white/5 p-3.5 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                  <span>مفتاح Resend API Key</span>
                  <span className="text-[10px] text-emerald-400 font-mono">re_FY2tdy1c...</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeysMap['resendApiKey'] ? 'text' : 'password'}
                    value={apiKeysState.resendApiKey || ''}
                    onChange={(e) => setApiKeysState({ ...apiKeysState, resendApiKey: e.target.value })}
                    placeholder="re_..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-200 font-mono outline-none focus:border-emerald-500/50 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeysMap({ ...showKeysMap, resendApiKey: !showKeysMap['resendApiKey'] })}
                    className="absolute left-2 text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {showKeysMap['resendApiKey'] ? 'إخفاء' : 'إظهار'}
                  </button>
                </div>
              </div>

              {/* Resend From Email */}
              <div className="space-y-1 bg-white/5 p-3.5 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-emerald-300">عنوان بريد المرسل (Resend From Email)</label>
                <input
                  type="text"
                  value={apiKeysState.resendFrom || ''}
                  onChange={(e) => setApiKeysState({ ...apiKeysState, resendFrom: e.target.value })}
                  placeholder="THOTH AI <onboarding@resend.dev>"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-white/50">اختيارات سريعة للمرسل:</span>
              <button
                type="button"
                onClick={() => setApiKeysState({ ...apiKeysState, resendFrom: 'THOTH AI <onboarding@resend.dev>' })}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/80 border border-white/10 transition-colors cursor-pointer"
              >
                الافتراضي: onboarding@resend.dev
              </button>
              <button
                type="button"
                onClick={() => setApiKeysState({ ...apiKeysState, resendFrom: 'THOTH AI <noreply@thoth-ai.com>' })}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-white/80 border border-white/10 transition-colors cursor-pointer"
              >
                نطاقك الخاص: noreply@thoth-ai.com
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleSaveSingleApiKey('resendApiKey', apiKeysState.resendApiKey);
                  handleSaveSingleApiKey('resendFrom', apiKeysState.resendFrom);
                }}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ مفتاح Resend وبياانته في قاعدة البيانات الحية</span>
              </button>
            </div>
          </div>

          {/* Domain Linking Banner */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200 leading-relaxed space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>معلومات توثيق النطاق الخاص (Custom Domain setup in Resend)</span>
            </div>
            <p className="text-white/80">
              باستخدام النطاق الافتراضي المجاني <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">onboarding@resend.dev</code>، تسمح منصة Resend بالإرسال الحقيقي إلى بريد صاحب الحساب (<code className="text-amber-200">alialhawy868@gmail.com</code>). لربط نطاقك المخصص وإرسال الرسائل لكافة مستخدمي التطبيق دون استثناء:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-colors flex items-center gap-1.5"
              >
                <span>توثيق النطاق في Resend Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Interactive Live Email Tester */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
            <div className="text-xs font-bold text-emerald-200 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>اختبار إرسال بريد إلكتروني تجريبي فورياً عبر Resend</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testResendEmail}
                onChange={(e) => setTestResendEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني لتلقي الرسالة التجريبية"
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                disabled={isTestingResend}
                onClick={handleTestResend}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isTestingResend ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال بريد تجريبي الآن</span>
                  </>
                )}
              </button>
            </div>

            {resendTestResult && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in ${
                resendTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {resendTestResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{resendTestResult.message}</span>
              </div>
            )}
          </div>

          {/* SMTP Backup Settings */}
          <div className="p-5 rounded-2xl bg-black/50 border border-indigo-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>إعدادات خادم البريد الاحتياطي (SMTP Server)</span>
              </h4>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Secondary SMTP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-white/80">خادم البريد (SMTP Host)</label>
                <input
                  type="text"
                  value={apiKeysState.smtpHost || ''}
                  onChange={(e) => setApiKeysState({ ...apiKeysState, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com أو smtp.sendgrid.net"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-white/80">منفذ الاتصال (SMTP Port)</label>
                <input
                  type="text"
                  value={apiKeysState.smtpPort || '587'}
                  onChange={(e) => setApiKeysState({ ...apiKeysState, smtpPort: e.target.value })}
                  placeholder="587 أو 465"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-white/80">اسم المستخدم (SMTP User)</label>
                <input
                  type="text"
                  value={apiKeysState.smtpUser || ''}
                  onChange={(e) => setApiKeysState({ ...apiKeysState, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                <label className="text-[11px] font-bold text-white/80">كلمة المرور (SMTP Pass)</label>
                <input
                  type="password"
                  value={apiKeysState.smtpPass || ''}
                  onChange={(e) => setApiKeysState({ ...apiKeysState, smtpPass: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleSaveSingleApiKey('smtpHost', apiKeysState.smtpHost);
                  handleSaveSingleApiKey('smtpPort', apiKeysState.smtpPort);
                  handleSaveSingleApiKey('smtpUser', apiKeysState.smtpUser);
                  handleSaveSingleApiKey('smtpPass', apiKeysState.smtpPass);
                  handleSaveSingleApiKey('smtpFrom', apiKeysState.smtpFrom);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ إعدادات SMTP في قاعدة البيانات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: API KEYS & ENVIRONMENT CONFIG */}
      {activeTab === 'api_keys' && (
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إدارة وإعدادات المفاتيح والأسرار الحساسة (Modular Secret Control Center)</h3>
                <p className="text-xs text-white/50">تحكم مفصل في أقسام المفاتيح مع إمكانية النسخ الفوري، إظهار/إخفاء المفاتيح، واختبار الاتصال المباشر</p>
              </div>
            </div>

            <button
              onClick={fetchApiKeys}
              disabled={isLoadingApiKeys}
              className="px-4 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApiKeys ? 'animate-spin' : ''}`} />
              <span>إعادة تحميل المفاتيح</span>
            </button>
          </div>

            <div className="space-y-6">
              
              {/* Card 1: AI Engines & Google Search */}
              <div className="p-5 rounded-2xl bg-black/50 border border-amber-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-amber-400" />
                    <span>مفتاح محركات الذكاء الاصطناعي وشات البحث (Gemini & Search AI)</span>
                  </h4>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">الذكاء الاصطناعي</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gemini Key */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Google Gemini API Key</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleShowKey('geminiApiKey')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                          title="إظهار/إخفاء المفتاح"
                        >
                          {showKeysMap['geminiApiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyKey('geminiApiKey', apiKeysState.geminiApiKey)}
                          className="p-1 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-all text-xs flex items-center gap-1"
                          title="نسخ المفتاح"
                        >
                          {copiedKeyName === 'geminiApiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKeyName === 'geminiApiKey' && <span className="text-[10px] text-emerald-400">تم النسخ!</span>}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={showKeysMap['geminiApiKey'] ? 'text' : 'password'}
                        value={apiKeysState.geminiApiKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, geminiApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestKey('geminiApiKey', apiKeysState.geminiApiKey)}
                        disabled={testingKeyType === 'geminiApiKey'}
                        className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {testingKeyType === 'geminiApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>اختبار</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('geminiApiKey', apiKeysState.geminiApiKey)}
                        disabled={savingKeyName === 'geminiApiKey'}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        title="حفظ هذا الخيار مفرداً"
                      >
                        {savingKeyName === 'geminiApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                    {testKeyResults['geminiApiKey'] && (
                      <p className={`text-[11px] font-bold ${testKeyResults['geminiApiKey'].success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testKeyResults['geminiApiKey'].message}
                      </p>
                    )}
                    <span className="text-[10px] text-white/40 block">مفتاح تشغيل النماذج الذكية والتحليلات الآلية.</span>
                  </div>

                  {/* Google Search API Key */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Google Search API Key (شات البحث)</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleShowKey('googleSearchApiKey')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                        >
                          {showKeysMap['googleSearchApiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyKey('googleSearchApiKey', apiKeysState.googleSearchApiKey)}
                          className="p-1 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-all text-xs flex items-center gap-1"
                        >
                          {copiedKeyName === 'googleSearchApiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKeyName === 'googleSearchApiKey' && <span className="text-[10px] text-emerald-400">تم النسخ!</span>}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={showKeysMap['googleSearchApiKey'] ? 'text' : 'password'}
                        value={apiKeysState.googleSearchApiKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, googleSearchApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestKey('googleSearchApiKey', apiKeysState.googleSearchApiKey)}
                        disabled={testingKeyType === 'googleSearchApiKey'}
                        className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {testingKeyType === 'googleSearchApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>اختبار</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('googleSearchApiKey', apiKeysState.googleSearchApiKey)}
                        disabled={savingKeyName === 'googleSearchApiKey'}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        title="حفظ هذا الخيار مفرداً"
                      >
                        {savingKeyName === 'googleSearchApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                    {testKeyResults['googleSearchApiKey'] && (
                      <p className={`text-[11px] font-bold ${testKeyResults['googleSearchApiKey'].success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testKeyResults['googleSearchApiKey'].message}
                      </p>
                    )}
                    <span className="text-[10px] text-white/40 block">مفتاح Google Custom Search API للبحث الحي في الإنترنت.</span>
                  </div>

                  {/* Google Search CX */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Google Search Engine ID (CX)</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('googleSearchCx', apiKeysState.googleSearchCx)}
                        className="p-1 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'googleSearchCx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKeyName === 'googleSearchCx' && <span className="text-[10px] text-emerald-400">تم النسخ!</span>}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.googleSearchCx}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, googleSearchCx: e.target.value })}
                        placeholder="e.g. 017576662512..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('googleSearchCx', apiKeysState.googleSearchCx)}
                        disabled={savingKeyName === 'googleSearchCx'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                        title="حفظ هذا الخيار مفرداً"
                      >
                        {savingKeyName === 'googleSearchCx' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-white/40 block">معرف محرك البحث المخصص (Search Engine ID).</span>
                  </div>

                  {/* OpenAI Key */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">OpenAI API Key (اختياري)</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleShowKey('openaiApiKey')}
                          className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1"
                        >
                          {showKeysMap['openaiApiKey'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyKey('openaiApiKey', apiKeysState.openaiApiKey)}
                          className="p-1 rounded-lg hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-all text-xs flex items-center gap-1"
                        >
                          {copiedKeyName === 'openaiApiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKeyName === 'openaiApiKey' && <span className="text-[10px] text-emerald-400">تم النسخ!</span>}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type={showKeysMap['openaiApiKey'] ? 'text' : 'password'}
                        value={apiKeysState.openaiApiKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, openaiApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('openaiApiKey', apiKeysState.openaiApiKey)}
                        disabled={savingKeyName === 'openaiApiKey'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                        title="حفظ هذا الخيار مفرداً"
                      >
                        {savingKeyName === 'openaiApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-white/40 block">مفتاح OpenAI GPT الإضافي.</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Payment Gateways */}
              <div className="p-5 rounded-2xl bg-black/50 border border-emerald-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>بوابات الدفع الإلكتروني (Paymob & PayPal & Stripe)</span>
                  </h4>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20">المدفوعات</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PayPal Client ID */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-blue-500/20">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-blue-300">PayPal Client ID</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paypalClientId', apiKeysState.paypalClientId)}
                        className="p-1 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paypalClientId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.paypalClientId}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paypalClientId: e.target.value })}
                        placeholder="A... or Client ID"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paypalClientId', apiKeysState.paypalClientId)}
                        disabled={savingKeyName === 'paypalClientId'}
                        className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paypalClientId' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* PayPal Client Secret */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-blue-500/20">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-blue-300">PayPal Client Secret</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paypalClientSecret', apiKeysState.paypalClientSecret)}
                        className="p-1 rounded-lg hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paypalClientSecret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.paypalClientSecret}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paypalClientSecret: e.target.value })}
                        placeholder="E..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-blue-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paypalClientSecret', apiKeysState.paypalClientSecret)}
                        disabled={savingKeyName === 'paypalClientSecret'}
                        className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paypalClientSecret' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* PayPal Mode (Sandbox / Live) */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-blue-500/20 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-blue-300">وضع بيئة PayPal (PayPal Environment Mode)</label>
                    </div>
                    <div className="flex gap-3 items-center">
                      <select
                        value={apiKeysState.paypalMode || 'sandbox'}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paypalMode: e.target.value })}
                        className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-blue-500/50 cursor-pointer flex-1"
                      >
                        <option value="sandbox">Sandbox (بيئة الاختبار والتجربة)</option>
                        <option value="live">Live (بيئة الإنتاج الحقيقية)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paypalMode', apiKeysState.paypalMode)}
                        disabled={savingKeyName === 'paypalMode'}
                        className="px-4 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paypalMode' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ الوضع</span>
                      </button>
                    </div>
                  </div>
                  {/* Paymob Secret API Key */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Paymob Secret API Key</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paymobApiKey', apiKeysState.paymobApiKey)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paymobApiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.paymobApiKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paymobApiKey: e.target.value })}
                        placeholder="eyJhbGci..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paymobApiKey', apiKeysState.paymobApiKey)}
                        disabled={savingKeyName === 'paymobApiKey'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paymobApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Paymob Public Key (for Unified Checkout) */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Paymob Public Key (egy_pk_...)</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paymobPublicKey', apiKeysState.paymobPublicKey)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paymobPublicKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.paymobPublicKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paymobPublicKey: e.target.value })}
                        placeholder="egy_pk_test_..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paymobPublicKey', apiKeysState.paymobPublicKey)}
                        disabled={savingKeyName === 'paymobPublicKey'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paymobPublicKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Paymob Integration ID */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Paymob Integration ID</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paymobIntegrationId', apiKeysState.paymobIntegrationId)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paymobIntegrationId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.paymobIntegrationId}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paymobIntegrationId: e.target.value })}
                        placeholder="123456"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paymobIntegrationId', apiKeysState.paymobIntegrationId)}
                        disabled={savingKeyName === 'paymobIntegrationId'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paymobIntegrationId' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Paymob Iframe ID */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Paymob Iframe ID</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paymobIframeId', apiKeysState.paymobIframeId)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paymobIframeId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.paymobIframeId}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paymobIframeId: e.target.value })}
                        placeholder="654321"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paymobIframeId', apiKeysState.paymobIframeId)}
                        disabled={savingKeyName === 'paymobIframeId'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paymobIframeId' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Paymob HMAC Secret */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Paymob HMAC Secret</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('paymobHmacSecret', apiKeysState.paymobHmacSecret)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'paymobHmacSecret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.paymobHmacSecret}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, paymobHmacSecret: e.target.value })}
                        placeholder="HMAC..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('paymobHmacSecret', apiKeysState.paymobHmacSecret)}
                        disabled={savingKeyName === 'paymobHmacSecret'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'paymobHmacSecret' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Stripe Secret Key */}
                  <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/5 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Stripe Secret Key (بديل الدفع العالمي)</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('stripeSecretKey', apiKeysState.stripeSecretKey)}
                        className="p-1 rounded-lg hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'stripeSecretKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.stripeSecretKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, stripeSecretKey: e.target.value })}
                        placeholder="sk_live_..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('stripeSecretKey', apiKeysState.stripeSecretKey)}
                        disabled={savingKeyName === 'stripeSecretKey'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'stripeSecretKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Firebase & Database & Security Tokens */}
              <div className="p-5 rounded-2xl bg-black/50 border border-purple-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>قاعدة البيانات والمصادقة (Firebase & Security Tokens)</span>
                  </h4>
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20">الأمان</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Firebase Project ID */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Firebase Project ID</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('firebaseProjectId', apiKeysState.firebaseProjectId)}
                        className="p-1 rounded-lg hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'firebaseProjectId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.firebaseProjectId}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, firebaseProjectId: e.target.value })}
                        placeholder="ai-studio-..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('firebaseProjectId', apiKeysState.firebaseProjectId)}
                        disabled={savingKeyName === 'firebaseProjectId'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'firebaseProjectId' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Firebase Web API Key */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Firebase Web API Key</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('firebaseApiKey', apiKeysState.firebaseApiKey)}
                        className="p-1 rounded-lg hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'firebaseApiKey' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.firebaseApiKey}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, firebaseApiKey: e.target.value })}
                        placeholder="AIza..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('firebaseApiKey', apiKeysState.firebaseApiKey)}
                        disabled={savingKeyName === 'firebaseApiKey'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'firebaseApiKey' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* JWT Secret Key */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">JWT Secret Key</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('jwtSecret', apiKeysState.jwtSecret)}
                        className="p-1 rounded-lg hover:bg-white/10 text-purple-400 hover:text-purple-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'jwtSecret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.jwtSecret}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, jwtSecret: e.target.value })}
                        placeholder="secret..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('jwtSecret', apiKeysState.jwtSecret)}
                        disabled={savingKeyName === 'jwtSecret'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'jwtSecret' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Notifications & Webhooks & Network Settings */}
              <div className="p-5 rounded-2xl bg-black/50 border border-indigo-500/20 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>الإشعارات والربط والشبكة (Telegram & Webhooks & CORS)</span>
                  </h4>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">الشبكة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Telegram Bot Token */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Telegram Bot Token</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyKey('telegramBotToken', apiKeysState.telegramBotToken)}
                          className="p-1 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-all text-xs flex items-center gap-1"
                        >
                          {copiedKeyName === 'telegramBotToken' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeysState.telegramBotToken}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, telegramBotToken: e.target.value })}
                        placeholder="123456:ABC..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestKey('telegramBotToken', apiKeysState.telegramBotToken)}
                        disabled={testingKeyType === 'telegramBotToken'}
                        className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {testingKeyType === 'telegramBotToken' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        <span>اختبار</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('telegramBotToken', apiKeysState.telegramBotToken)}
                        disabled={savingKeyName === 'telegramBotToken'}
                        className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'telegramBotToken' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                    {testKeyResults['telegramBotToken'] && (
                      <p className={`text-[11px] font-bold ${testKeyResults['telegramBotToken'].success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testKeyResults['telegramBotToken'].message}
                      </p>
                    )}
                  </div>

                  {/* Custom Webhook URL */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">Custom Webhook URL</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('customWebhookUrl', apiKeysState.customWebhookUrl)}
                        className="p-1 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'customWebhookUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.customWebhookUrl}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, customWebhookUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('customWebhookUrl', apiKeysState.customWebhookUrl)}
                        disabled={savingKeyName === 'customWebhookUrl'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'customWebhookUrl' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* CORS Allowed Origins */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white/90">CORS Allowed Origins</label>
                      <button
                        type="button"
                        onClick={() => handleCopyKey('corsAllowedOrigins', apiKeysState.corsAllowedOrigins)}
                        className="p-1 rounded-lg hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-all text-xs flex items-center gap-1"
                      >
                        {copiedKeyName === 'corsAllowedOrigins' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKeysState.corsAllowedOrigins}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, corsAllowedOrigins: e.target.value })}
                        placeholder="*"
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSingleApiKey('corsAllowedOrigins', apiKeysState.corsAllowedOrigins)}
                        disabled={savingKeyName === 'corsAllowedOrigins'}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        {savingKeyName === 'corsAllowedOrigins' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>حفظ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: SMTP Email Server Config */}
              <div className="p-5 rounded-2xl bg-black/50 border border-indigo-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>إعدادات سيرفر البريد الإلكتروني (SMTP Email Server) لإرسال أكواد OTP</span>
                  </h4>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Nodemailer SMTP
                  </span>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  قم بضبط إعدادات سيرفر البريد (مثل Gmail SMTP أو SendGrid أو Mailgun) لإرسال رسائل التحقق (OTP) والإشعارات إلى البريد الوارد للمستخدمين. (ملاحظة: في حال ترك الخانات فارغة، سيتم استخدام التفعيل المباشر كخيار احتياطي).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* SMTP Host */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-white/80">خادم البريد (SMTP Host)</label>
                    <input
                      type="text"
                      value={apiKeysState.smtpHost || ''}
                      onChange={(e) => setApiKeysState({ ...apiKeysState, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com أو smtp.sendgrid.net"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* SMTP Port */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-white/80">منفذ الاتصال (SMTP Port)</label>
                    <input
                      type="text"
                      value={apiKeysState.smtpPort || '587'}
                      onChange={(e) => setApiKeysState({ ...apiKeysState, smtpPort: e.target.value })}
                      placeholder="587 أو 465"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* SMTP User */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-white/80">اسم المستخدم / البريد (SMTP User)</label>
                    <input
                      type="text"
                      value={apiKeysState.smtpUser || ''}
                      onChange={(e) => setApiKeysState({ ...apiKeysState, smtpUser: e.target.value })}
                      placeholder="your-email@gmail.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  {/* SMTP Pass */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-white/80">كلمة مرور البريد / App Password</label>
                    <input
                      type="password"
                      value={apiKeysState.smtpPass || ''}
                      onChange={(e) => setApiKeysState({ ...apiKeysState, smtpPass: e.target.value })}
                      placeholder="••••••••••••••••"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {/* SMTP From */}
                <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                  <label className="text-[11px] font-bold text-white/80">عنوان المرسل الظاهر (SMTP From)</label>
                  <input
                    type="text"
                    value={apiKeysState.smtpFrom || ''}
                    onChange={(e) => setApiKeysState({ ...apiKeysState, smtpFrom: e.target.value })}
                    placeholder='"THOTH AI" <noreply@thoth-ai.com>'
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSingleApiKey('smtpHost', apiKeysState.smtpHost);
                      handleSaveSingleApiKey('smtpPort', apiKeysState.smtpPort);
                      handleSaveSingleApiKey('smtpUser', apiKeysState.smtpUser);
                      handleSaveSingleApiKey('smtpPass', apiKeysState.smtpPass);
                      handleSaveSingleApiKey('smtpFrom', apiKeysState.smtpFrom);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ إعدادات البريد SMTP</span>
                  </button>
                </div>
              </div>

              {/* Card 5.5: Resend API Platform Integration */}
              <div className="p-5 rounded-2xl bg-black/50 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>إدارة منصة Resend للبريد الإلكتروني المباشر (Resend Platform)</span>
                  </h4>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30 text-[10px] font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Resend Connected</span>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  تتميز منصة Resend بأعلى معدل وصول وإمكانية تسليم فورية لأكواد الـ OTP والإشعارات الحية بدون الحاجة إلى إعداد خوادم SMTP معقدة.
                </p>

                {apiKeysState.resendFrom?.includes('onboarding@resend.dev') && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">ملاحظة بشأن النطاق التجريبي المجاني (onboarding@resend.dev):</span>
                      <br />
                      تسمح منصة Resend بالنطاق الافتراضي بالإرسال فقط إلى بريد مالك الحساب (alialhawy868@gmail.com). لإرسال الرسائل الحية لكافة إيميلات المستخدمين، قم بإضافة وتوثيق نطاقك الخاص بـ <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline text-amber-300 font-semibold">resend.com/domains</a> وتحديث بريد المرسل أعلاه. (في غضون ذلك، يفعّل النظام تلقائياً الرمز المباشر السريع لبقية المستخدمين لتفادي تعطيلهم).
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Resend API Key */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                      <span>مفتاح Resend API Key</span>
                      <span className="text-[10px] text-emerald-400/80 font-normal">تأثير فوري</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showKeysMap['resendApiKey'] ? 'text' : 'password'}
                        value={apiKeysState.resendApiKey || ''}
                        onChange={(e) => setApiKeysState({ ...apiKeysState, resendApiKey: e.target.value })}
                        placeholder="re_..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-200 font-mono outline-none focus:border-emerald-500/50 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeysMap({ ...showKeysMap, resendApiKey: !showKeysMap['resendApiKey'] })}
                        className="absolute left-2 text-[10px] bg-white/10 hover:bg-white/20 text-white/80 px-2 py-1 rounded-lg transition-colors"
                      >
                        {showKeysMap['resendApiKey'] ? 'إخفاء' : 'إظهار'}
                      </button>
                    </div>
                  </div>

                  {/* Resend From Email */}
                  <div className="space-y-1 bg-white/5 p-3 rounded-xl border border-white/5">
                    <label className="text-[11px] font-bold text-emerald-300">عنوان بريد المرسل (Resend From)</label>
                    <input
                      type="text"
                      value={apiKeysState.resendFrom || ''}
                      onChange={(e) => setApiKeysState({ ...apiKeysState, resendFrom: e.target.value })}
                      placeholder="THOTH AI <onboarding@resend.dev>"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                {/* Resend Test Dispatcher */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>اختبار إرسال رسالة تجريبية عبر منصة Resend:</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testResendEmail}
                      onChange={(e) => setTestResendEmail(e.target.value)}
                      placeholder="أدخل بريدك الإلكتروني لتلقي رسالة الاختبار"
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                    />
                    <button
                      type="button"
                      disabled={isTestingResend}
                      onClick={handleTestResend}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isTestingResend ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال بريد تجريبي الآن</span>
                        </>
                      )}
                    </button>
                  </div>

                  {resendTestResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in ${
                      resendTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {resendTestResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      <span>{resendTestResult.message}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveSingleApiKey('resendApiKey', apiKeysState.resendApiKey);
                      handleSaveSingleApiKey('resendFrom', apiKeysState.resendFrom);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>حفظ مفتاح وإعدادات Resend</span>
                  </button>
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-black/50 border border-amber-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>جميع المفاتيح والأسرار الإضافية المسجلة في قاعدة البيانات (Database Secrets)</span>
                  </h4>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {Object.keys(apiKeysState).length} مفتاح في القاعدة
                  </span>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                  تظهر هنا جميع المفاتيح والأسرار المخزنة في قاعدة البيانات (Firestore systemConfig). يمكنك تعديل قيمها، نسخها، إخفاءها/إظهارها، إضافة مفاتيح جديدة، أو حفظ كل مفتاح منفرداً أو حذفه.
                </p>

                {/* Render custom non-standard keys */}
                <div className="space-y-3">
                  {Object.keys(apiKeysState)
                    .filter(key => ![
                      'geminiApiKey', 'paymobApiKey', 'paymobPublicKey', 'paymobIntegrationId', 'paymobIframeId', 'paymobHmacSecret',
                      'firebaseProjectId', 'firebaseApiKey', 'jwtSecret', 'stripeSecretKey', 'telegramBotToken',
                      'openaiApiKey', 'googleSearchApiKey', 'googleSearchCx', 'customWebhookUrl',
                      'corsAllowedOrigins', 'rateLimitMaxRequests',
                      'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom',
                      'resendApiKey', 'resendFrom'
                    ].includes(key))
                    .map((customKey) => (
                      <div key={customKey} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                        <div className="w-full sm:w-1/3 text-xs font-bold font-mono text-amber-300 truncate">
                          {customKey}
                        </div>
                        <div className="w-full sm:w-2/3 flex gap-2">
                          <input
                            type={showKeysMap[customKey] ? 'text' : 'password'}
                            value={(apiKeysState as any)[customKey] || ''}
                            onChange={(e) => setApiKeysState({ ...apiKeysState, [customKey]: e.target.value })}
                            placeholder="قيمة المفتاح..."
                            className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowKey(customKey)}
                            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs"
                            title="إظهار/إخفاء"
                          >
                            {showKeysMap[customKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(customKey, (apiKeysState as any)[customKey])}
                            className="p-2 rounded-xl hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-all text-xs"
                            title="نسخ"
                          >
                            {copiedKeyName === customKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveSingleApiKey(customKey, (apiKeysState as any)[customKey])}
                            disabled={savingKeyName === customKey}
                            className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/30 text-xs transition-all flex items-center justify-center cursor-pointer"
                            title="حفظ هذا الخيار"
                          >
                            {savingKeyName === customKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomKey(customKey)}
                            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-all text-xs cursor-pointer"
                            title="حذف المفتاح"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Add new key form row */}
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-white/90 block mb-2">إضافة مفتاح جديد لقاعدة البيانات:</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="اسم المفتاح (مثال: tavilyApiKey)"
                      className="w-full sm:w-1/3 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                    />
                    <input
                      type="text"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      placeholder="قيمة المفتاح..."
                      className="w-full sm:w-2/3 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomKey}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة</span>
                    </button>
                  </div>
                </div>
              </div>

              {apiKeysResult && (
                <div className={`p-3.5 rounded-xl text-xs font-bold ${apiKeysResult.startsWith('✅') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {apiKeysResult}
                </div>
              )}
            </div>
        </div>
      )}

      {/* TAB: SYSTEM LOGS & AUDIT */}
      {activeTab === 'system_logs' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950/40 via-purple-950/40 to-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/30 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">سجلات وأحداث النظام الحية (System Audit Logs)</h3>
                  <p className="text-xs text-white/60">متابعة أحدث العمليات، الأحداث المسجلة، وأنشطة النظام على مدار الساعة</p>
                </div>
              </div>

              <button
                onClick={fetchSystemLogs}
                disabled={isLoadingSystemLogs}
                className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSystemLogs ? 'animate-spin' : ''}`} />
                <span>تحديث السجلات</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="py-3 px-4">رقم الحدث (ID)</th>
                    <th className="py-3 px-4">نوع الحدث / الإجراء</th>
                    <th className="py-3 px-4">المستلم / التفاصيل</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {systemLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-white/40">لا توجد سجلات أحداث مسجلة حالياً.</td>
                    </tr>
                  ) : (
                    systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-300">{log.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{log.title || log.type || 'حدث نظام'}</td>
                        <td className="py-3 px-4 text-white/80 max-w-xs truncate">{log.body || log.message || JSON.stringify(log)}</td>
                        <td className="py-3 px-4 text-white/50">{log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MODEL TRAINING & DATASETS PLATFORM */}
      {activeTab === 'training_models' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/60 to-black/80 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-6 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">منصة تجميع بيانات التدريب وتطوير النماذج (Training & Model Pipeline)</h3>
                  <p className="text-xs text-white/60">بنية تحتية لتنقية تفاعلات المستخدمين الموافقين، إزالة المعلومات الحساسة تلقائياً، إعداد مجموعات البيانات، وتدريب نماذج THOTH الذكية</p>
                </div>
              </div>

              <button
                onClick={fetchTrainingPlatformData}
                disabled={isLoadingTrainingData}
                className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTrainingData ? 'animate-spin' : ''}`} />
                <span>تحديث منصة التدريب</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-white/50 block font-bold">إجمالي عينات التجميع</span>
                <span className="text-xl font-black text-white">{trainingStats.totalExamples || 0}</span>
              </div>
              <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-amber-300/80 block font-bold">قيد المراجعة</span>
                <span className="text-xl font-black text-amber-300">{trainingStats.pendingExamples || 0}</span>
              </div>
              <div className="bg-black/40 border border-emerald-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-emerald-300/80 block font-bold">معتمدة للتدريب</span>
                <span className="text-xl font-black text-emerald-400">{trainingStats.approvedExamples || 0}</span>
              </div>
              <div className="bg-black/40 border border-purple-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-purple-300/80 block font-bold">{language === 'ar' ? 'مجموعات البيانات' : 'Datasets'}</span>
                <span className="text-xl font-black text-purple-300">{trainingStats.totalDatasets || 0}</span>
              </div>
              <div className="bg-black/40 border border-cyan-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-cyan-300/80 block font-bold">مهام التدريب النشطة</span>
                <span className="text-xl font-black text-cyan-300">{trainingStats.activeJobs || 0}</span>
              </div>
              <div className="bg-black/40 border border-pink-500/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-pink-300/80 block font-bold">مشاريع المؤسسات</span>
                <span className="text-xl font-black text-pink-300">{trainingStats.customerProjects || 0}</span>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setTrainingSubTab('review')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  trainingSubTab === 'review'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
                }`}
              >
                1. مراجعة وتنقية عينات التجميع
              </button>

              <button
                onClick={() => setTrainingSubTab('datasets')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  trainingSubTab === 'datasets'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
                }`}
              >
                2. مجموعات البيانات والتصدير (Datasets)
              </button>

              <button
                onClick={() => setTrainingSubTab('jobs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  trainingSubTab === 'jobs'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
                }`}
              >
                3. مهام التدريب والنماذج (Training Jobs)
              </button>

              <button
                onClick={() => setTrainingSubTab('b2b')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                  trainingSubTab === 'b2b'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
                }`}
              >
                4. مشاريع المؤسسات والعملاء (Enterprise Fine-tuning)
              </button>

              <button
                onClick={() => setTrainingSubTab('data_program')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer flex items-center gap-1.5 ${
                  trainingSubTab === 'data_program'
                    ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white border-amber-400 shadow-lg'
                    : 'bg-white/5 text-amber-300/80 hover:bg-white/10 border-amber-500/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>5. برنامج البيانات عالي القيمة (THOTH Data Program)</span>
              </button>
            </div>

            {/* SUB-TAB 1: REVIEW & FILTER STAGED EXAMPLES */}
            {trainingSubTab === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70">تصفية العينات حسب الحالة:</span>
                  <div className="flex items-center gap-2">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setExampleStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          exampleStatusFilter === st
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-black/40 text-white/60 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {st === 'all' && 'الكل'}
                        {st === 'pending' && 'قيد المراجعة'}
                        {st === 'approved' && 'المعتمدة'}
                        {st === 'rejected' && 'المستبعدة'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="py-3 px-3">المعرف / النموذج</th>
                        <th className="py-3 px-3">مدخل المستخدم (Input)</th>
                        <th className="py-3 px-3">إجابة المساعد (Output)</th>
                        <th className="py-3 px-3">الحالة والجودة</th>
                        <th className="py-3 px-3">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trainingExamples.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-white/40">لا توجد عينات تدريب مطابقة للتصفية حالياً.</td>
                        </tr>
                      ) : (
                        trainingExamples.map((ex) => (
                          <tr key={ex.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-mono text-purple-300 font-bold block">{ex.id}</span>
                              <span className="text-[10px] text-white/40 block">{ex.model || 'Gemma 4'}</span>
                            </td>
                            <td className="py-3 px-3 max-w-xs">
                              <p className="line-clamp-2 text-white/90 font-medium bg-black/30 p-2 rounded-lg border border-white/5">{ex.input || '-'}</p>
                            </td>
                            <td className="py-3 px-3 max-w-xs">
                              <p className="line-clamp-2 text-white/70 bg-black/30 p-2 rounded-lg border border-white/5">{ex.output || '-'}</p>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                ex.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                ex.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {ex.status === 'approved' ? 'معتمدة' : ex.status === 'rejected' ? 'مستبعدة' : 'قيد المراجعة'}
                              </span>
                              <span className="text-[10px] text-white/50 block mt-1">التقييم: {ex.qualityScore || 100}%</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={async () => {
                                    await fetch('/api/admin/training/examples/review', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                                      body: JSON.stringify({ exampleId: ex.id, status: 'approved', qualityScore: 95 })
                                    });
                                    fetchTrainingPlatformData();
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 text-[10px] font-bold transition-all border border-emerald-500/40 cursor-pointer"
                                >
                                  اعتماد
                                </button>

                                <button
                                  onClick={async () => {
                                    await fetch('/api/admin/training/examples/review', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                                      body: JSON.stringify({ exampleId: ex.id, status: 'rejected' })
                                    });
                                    fetchTrainingPlatformData();
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-red-600/30 hover:bg-red-600/60 text-red-300 text-[10px] font-bold transition-all border border-red-500/40 cursor-pointer"
                                >
                                  استبعاد
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: DATASETS MANAGEMENT */}
            {trainingSubTab === 'datasets' && (
              <div className="space-y-6">
                {/* Create Dataset Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!datasetForm.name) return;
                    await fetch('/api/admin/training/datasets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                      body: JSON.stringify(datasetForm)
                    });
                    setDatasetForm({ name: '', version: 'v1.0', category: 'General', description: '' });
                    fetchTrainingPlatformData();
                  }}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4"
                >
                  <h4 className="text-sm font-bold text-white">إنشاء حزمة بيانات جديدة (Dataset Release)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="اسم المجموعة (مثال: THOTH Arabic Fine-tune)"
                      value={datasetForm.name}
                      onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="الإصدار (مثال: v1.0)"
                      value={datasetForm.version}
                      onChange={(e) => setDatasetForm({ ...datasetForm, version: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="التصنيف (مثال: Reasoning, Coding)"
                      value={datasetForm.category}
                      onChange={(e) => setDatasetForm({ ...datasetForm, category: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                    >
                      إنشاء حزمة البيانات
                    </button>
                  </div>
                </form>

                {/* Dataset List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="py-3 px-3">اسم المجموعة</th>
                        <th className="py-3 px-3">الإصدار</th>
                        <th className="py-3 px-3">التصنيف</th>
                        <th className="py-3 px-3">تاريخ الإنشاء</th>
                        <th className="py-3 px-3">التصدير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trainingDatasets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-white/40">لا توجد مجموعات بيانات مسجلة حالياً.</td>
                        </tr>
                      ) : (
                        trainingDatasets.map((ds) => (
                          <tr key={ds.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 font-bold text-white">{ds.name}</td>
                            <td className="py-3 px-3 font-mono text-purple-300 font-bold">{ds.version}</td>
                            <td className="py-3 px-3 text-white/70">{ds.category || 'General'}</td>
                            <td className="py-3 px-3 text-white/50">{ds.createdAt ? new Date(ds.createdAt).toLocaleDateString('ar-EG') : '-'}</td>
                            <td className="py-3 px-3">
                              <a
                                href={`/api/admin/training/datasets/export/${ds.id}`}
                                download
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 text-[10px] font-bold transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>تصدير JSON</span>
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: TRAINING JOBS */}
            {trainingSubTab === 'jobs' && (
              <div className="space-y-6">
                {/* Start Job Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!jobForm.datasetId) {
                      alert("يرجى اختيار مجموعة البيانات أولاً");
                      return;
                    }
                    await fetch('/api/admin/training/jobs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                      body: JSON.stringify(jobForm)
                    });
                    fetchTrainingPlatformData();
                  }}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4"
                >
                  <h4 className="text-sm font-bold text-white">إدراج مهمة تدريب جديدة في السيرفر (Queue Fine-Tuning Job)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <select
                      value={jobForm.baseModel}
                      onChange={(e) => setJobForm({ ...jobForm, baseModel: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    >
                      <option value="Gemma 4 31B">Gemma 4 31B (Base)</option>
                      <option value="Gemma 4 26B">Gemma 4 26B (Lightweight)</option>
                      <option value="THOTH Reasoning Model">THOTH Custom Reasoning v1</option>
                    </select>

                    <select
                      value={jobForm.datasetId}
                      onChange={(e) => setJobForm({ ...jobForm, datasetId: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                      required
                    >
                      <option value="">اختر مجموعة البيانات...</option>
                      {trainingDatasets.map(ds => (
                        <option key={ds.id} value={ds.id}>{ds.name} ({ds.version})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Epochs (3)"
                      value={jobForm.epochs}
                      onChange={(e) => setJobForm({ ...jobForm, epochs: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    />

                    <input
                      type="text"
                      placeholder="Learning Rate (0.0001)"
                      value={jobForm.learningRate}
                      onChange={(e) => setJobForm({ ...jobForm, learningRate: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                    >
                      بدء عملية التدريب
                    </button>
                  </div>
                </form>

                {/* Job List Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="py-3 px-3">رقم المهمة</th>
                        <th className="py-3 px-3">النموذج الأصلي</th>
                        <th className="py-3 px-3">الحالة والتقدم</th>
                        <th className="py-3 px-3">التاريخ</th>
                        <th className="py-3 px-3">التحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trainingJobs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-white/40">لا توجد مهام تدريب في القائمة حالياً.</td>
                        </tr>
                      ) : (
                        trainingJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 font-mono text-purple-300 font-bold">{job.id}</td>
                            <td className="py-3 px-3 font-bold text-white">{job.baseModel}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                job.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                job.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                                'bg-cyan-500/20 text-cyan-300'
                              }`}>
                                {job.status === 'completed' ? 'مكتملة' : job.status === 'failed' ? 'فشلت' : 'قيد الانتظار/التدريب'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-white/50">{job.createdAt ? new Date(job.createdAt).toLocaleString('ar-EG') : '-'}</td>
                            <td className="py-3 px-3">
                              <button
                                onClick={async () => {
                                  await fetch('/api/admin/training/jobs/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                                    body: JSON.stringify({ jobId: job.id, status: 'completed', progress: 100 })
                                  });
                                  fetchTrainingPlatformData();
                                }}
                                className="px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 text-[10px] font-bold transition-all border border-emerald-500/40 cursor-pointer"
                              >
                                تمكين النموذج
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: ENTERPRISE B2B PROJECTS */}
            {trainingSubTab === 'b2b' && (
              <div className="space-y-6">
                {/* B2B Customer Project Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!customerProjectForm.customerName || !customerProjectForm.projectName) return;
                    await fetch('/api/admin/training/customer-projects', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'x-admin-email': userEmail },
                      body: JSON.stringify(customerProjectForm)
                    });
                    setCustomerProjectForm({ customerName: '', customerEmail: '', projectName: '', targetModel: 'Gemma 4 Custom' });
                    fetchTrainingPlatformData();
                  }}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4"
                >
                  <h4 className="text-sm font-bold text-white">إضافة مشروع تدريب نموذج مخصص لعميل مؤسسي (Enterprise Model Customization)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="اسم المؤسسة/العميل"
                      value={customerProjectForm.customerName}
                      onChange={(e) => setCustomerProjectForm({ ...customerProjectForm, customerName: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                      required
                    />
                    <input
                      type="email"
                      placeholder="بريد التواصل"
                      value={customerProjectForm.customerEmail}
                      onChange={(e) => setCustomerProjectForm({ ...customerProjectForm, customerEmail: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="اسم المشروع"
                      value={customerProjectForm.projectName}
                      onChange={(e) => setCustomerProjectForm({ ...customerProjectForm, projectName: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="اسم النموذج المستهدف"
                      value={customerProjectForm.targetModel}
                      onChange={(e) => setCustomerProjectForm({ ...customerProjectForm, targetModel: e.target.value })}
                      className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                    >
                      تسجيل مشروع العميل
                    </button>
                  </div>
                </form>

                {/* Customer Projects Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/50">
                        <th className="py-3 px-3">اسم العميل/المؤسسة</th>
                        <th className="py-3 px-3">اسم المشروع</th>
                        <th className="py-3 px-3">النموذج المخصص</th>
                        <th className="py-3 px-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {customerProjects.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-white/40">لا توجد مشاريع تدريب عملاء مسجلة حالياً.</td>
                        </tr>
                      ) : (
                        customerProjects.map((p) => (
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3 font-bold text-white">{p.customerName}</td>
                            <td className="py-3 px-3 text-purple-300 font-bold">{p.projectName}</td>
                            <td className="py-3 px-3 text-white/80">{p.targetModel || 'Gemma 4 Custom'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                                {p.status || 'نشط'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: HIGH-VALUE THOTH AI DATA PROGRAM REPORT & EXPORTS */}
            {trainingSubTab === 'data_program' && (
              <div className="space-y-6">
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>أولويات القيمة التجارية لبيانات التدريب (Business Value Priorities)</span>
                      </h4>
                      <p className="text-xs text-white/60">تقارير التجميع المقيدة بالموافقة المسبقة وتنقيتها عبر فلاتر الأمان والخصوصية (Zero-PII & Zero-Secrets)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href="/api/data-program/export?type=all&format=jsonl"
                        download
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير البيانات JSONL</span>
                      </a>
                    </div>
                  </div>

                  {/* Priority Tiers Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Priority 1 */}
                    <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full">
                          أولوية 1 ⭐⭐⭐⭐⭐
                        </span>
                        <span className="text-xs text-purple-300 font-bold">RLHF Preference</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">تفضيلات العنصر البشري (Human Preference)</h5>
                      <p className="text-[11px] text-white/50">تفضيلات الردود A/B، إشارات الجودة، والتقييمات البشرية لتدريب RLHF/DPO.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">العينات المسجلة:</span>
                        <span className="text-base font-black text-purple-300">{dataProgramStats?.preferenceCount || 0}</span>
                      </div>
                    </div>

                    {/* Priority 2 */}
                    <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full">
                          أولوية 2 ⭐⭐⭐⭐
                        </span>
                        <span className="text-xs text-emerald-300 font-bold">Egyptian & MSA</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">اللهجة المصرية والعربية الفصحى</h5>
                      <p className="text-[11px] text-white/50">بيانات اللهجات العربية المتنوعة مع التركيز على اللغة المصرية المحكية لضبط النماذج المحلية.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">مصرية / عربية:</span>
                        <span className="text-base font-black text-emerald-300">
                          {dataProgramStats?.egyptianCount || 0} / {dataProgramStats?.arabicCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Priority 3 */}
                    <div className="bg-white/5 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.5 rounded-full">
                          أولوية 3 ⭐⭐⭐⭐
                        </span>
                        <span className="text-xs text-indigo-300 font-bold">SFT & Reasoning</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">التعديلات البشرية والتفكير المنطقي</h5>
                      <p className="text-[11px] text-white/50">تعديلات المستخدمين المباشرة للردود (SFT) وسلسلة الخطوات المنطقية الخالية من الأسرار.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">عينات SFT المحسنة:</span>
                        <span className="text-base font-black text-indigo-300">{dataProgramStats?.sftCount || 0}</span>
                      </div>
                    </div>

                    {/* Priority 4 */}
                    <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full">
                          أولوية 4 ⭐⭐⭐
                        </span>
                        <span className="text-xs text-amber-300 font-bold">Domain & Coding</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">التخصصات والبرمجة (Coding & Domains)</h5>
                      <p className="text-[11px] text-white/50">بيانات الأكواد البرمجية، المجالات القانونية، المالية، والتعليمية ذات القيمة العالية.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">برمجة / مجالات:</span>
                        <span className="text-base font-black text-amber-300">
                          {dataProgramStats?.codingCount || 0} / {dataProgramStats?.domainCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Priority 5 */}
                    <div className="bg-white/5 border border-cyan-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 px-2 py-0.5 rounded-full">
                          أولوية 5 ⭐⭐⭐
                        </span>
                        <span className="text-xs text-cyan-300 font-bold">Evaluation Sets</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">مجموعات التقييم والـ Benchmark</h5>
                      <p className="text-[11px] text-white/50">اختبارات دقة النماذج، الاستجابة للأوامر الصعبة، ومقاييس الجودة الأكاديمية.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">عينات التقييم:</span>
                        <span className="text-base font-black text-cyan-300">{dataProgramStats?.evalCount || 0}</span>
                      </div>
                    </div>

                    {/* Priority 6 */}
                    <div className="bg-white/5 border border-pink-500/30 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-pink-500/30 text-pink-200 border border-pink-400/40 px-2 py-0.5 rounded-full">
                          أولوية 6 ⭐⭐
                        </span>
                        <span className="text-xs text-pink-300 font-bold">Multimodal</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">البيانات متعددة الوسائط (Multimodal)</h5>
                      <p className="text-[11px] text-white/50">تفاعلات الصور، النصوص المصورة، والوسائط المتعددة المدعومة بأوصاف دقيقة.</p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs text-white/60">عينات الوسائط:</span>
                        <span className="text-base font-black text-pink-300">{dataProgramStats?.multimodalCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security & Scrubbing Audit Banner */}
                  <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 space-y-3 mt-4">
                    <h5 className="text-xs font-extrabold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>سجل أمان وخصوصية البيانات (Privacy & Security Filter Audit)</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/50 block font-bold">إجمالي البيانات المؤهلة</span>
                        <span className="text-lg font-black text-white">{dataProgramStats?.totalEligible || 0}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-300 block font-bold">تطهير البيانات الشخصية (PII Cleansed)</span>
                        <span className="text-lg font-black text-emerald-400">{dataProgramStats?.piiFilteredCount || 0} عينة</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-amber-500/20">
                        <span className="text-[10px] text-amber-300 block font-bold">حجب الأسرار ومفاتيح API (Secrets Redacted)</span>
                        <span className="text-lg font-black text-amber-300">{dataProgramStats?.secretFilteredCount || 0} عينة</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-purple-500/20">
                        <span className="text-[10px] text-purple-300 block font-bold">حالة الـ Pipeline</span>
                        <span className="text-lg font-black text-purple-300">نشط وزيرو PII 🛡️</span>
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Flowchart Visual */}
                  <div className="pt-3 border-t border-white/10">
                    <label className="text-xs font-bold text-white/60 block mb-2">مخطط تدفق البيانات الذكي (THOTH Data Pipeline):</label>
                    <div className="flex items-center justify-between gap-2 overflow-x-auto p-3 bg-black/40 rounded-2xl border border-white/10 text-[11px] text-white/70">
                      <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-bold">1. فحص موافقة المستخدم</span>
                      </div>
                      <span className="text-white/30">➔</span>
                      <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                        <span className="font-bold">2. فلترة PII والأسرار</span>
                      </div>
                      <span className="text-white/30">➔</span>
                      <div className="flex items-center gap-1.5 shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        <span className="font-bold">3. تصنيف وتحديد الجودة</span>
                      </div>
                      <span className="text-white/30">➔</span>
                      <div className="flex items-center gap-1.5 shrink-0 bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-xl text-purple-200">
                        <Download className="w-3.5 h-3.5 text-purple-300" />
                        <span className="font-bold">4. الحفظ وتجهيز Dataset</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights & Semantic Search Tab */}
      {activeTab === 'ai_insights' && <AdminAiInsights adminEmail={userEmail} />}

      {/* AI Monitoring Tab */}
      {activeTab === 'ai_monitoring' && <AiMonitoringManager />}

      {/* Advertising Data & Analytics Tab */}
      {activeTab === 'advertising' && <AdvertisingManager adminEmail={userEmail} />}

      {/* Legal Documents Manager Tab */}
      {activeTab === 'legal' && <LegalManager />}
      {activeTab === 'audio_diagnostics' && <AdminAudioDiagnostics />}


      {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0d111d] border border-red-500/30 rounded-3xl p-6 space-y-4 text-white shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />
            <h3 className="font-extrabold text-base text-white border-b border-white/10 pb-2 flex items-center gap-2">
              <span className="text-red-500">⚠️</span> {confirmModal.title}
            </h3>
            <p className="text-xs text-white/80 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN EDIT MODAL */}
      {editingPlanModalKey && editingPlanData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0d111d] border border-purple-500/30 rounded-3xl p-6 space-y-5 text-white shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-base text-white">تعديل تفاصيل باقة: {editingPlanData.name || editingPlanModalKey}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPlanModalKey(null);
                  setEditingPlanData(null);
                }}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanFromModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">اسم الباقة (العنوان)</label>
                  <input
                    type="text"
                    value={editingPlanData.name || ''}
                    onChange={(e) => setEditingPlanData({ ...editingPlanData, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">الشارة الترويجية (Badge)</label>
                  <input
                    type="text"
                    value={editingPlanData.badge || ''}
                    onChange={(e) => setEditingPlanData({ ...editingPlanData, badge: e.target.value })}
                    placeholder="مثال: الأكثر شعبية 🔥"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">السعر بالجنيه (EGP)</label>
                  <input
                    type="number"
                    value={editingPlanData.priceEgp ?? 0}
                    onChange={(e) => setEditingPlanData({ ...editingPlanData, priceEgp: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">السعر بالدولار ($ USD)</label>
                  <input
                    type="number"
                    value={editingPlanData.priceUsd ?? 0}
                    onChange={(e) => setEditingPlanData({ ...editingPlanData, priceUsd: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">نص السعر المخصص</label>
                  <input
                    type="text"
                    value={editingPlanData.price || ''}
                    onChange={(e) => setEditingPlanData({ ...editingPlanData, price: e.target.value })}
                    placeholder="150 ج.م / شهرياً"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-purple-300">الحدود اليومية للميزات (Server-Side Limits)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1">محادثات عادية</label>
                    <input
                      type="number"
                      value={editingPlanData.normalChat ?? 0}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, normalChat: Number(e.target.value) })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">تفكير عميق</label>
                    <input
                      type="number"
                      value={editingPlanData.thinkingChat ?? 0}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, thinkingChat: Number(e.target.value) })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">بحث الويب</label>
                    <input
                      type="number"
                      value={editingPlanData.webSearch ?? 0}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, webSearch: Number(e.target.value) })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">صوت حي (ثانية)</label>
                    <input
                      type="number"
                      value={editingPlanData.liveVoiceSec ?? 0}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, liveVoiceSec: Number(e.target.value) })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">ترجمة (كلمة/حرف)</label>
                    <input
                      type="number"
                      value={editingPlanData.translation ?? 0}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, translation: Number(e.target.value) })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Gateway Mapping IDs */}
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-emerald-300">معرفات الربط ببوابات الدفع (Payment Gateway IDs)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-white/60 block mb-1">Paymob Integration ID</label>
                    <input
                      type="text"
                      value={editingPlanData.paymobIntegrationId || ''}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, paymobIntegrationId: e.target.value })}
                      placeholder="e.g. 483920"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">PayPal Plan ID</label>
                    <input
                      type="text"
                      value={editingPlanData.paypalPlanId || ''}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, paypalPlanId: e.target.value })}
                      placeholder="e.g. P-382910"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">Stripe Price ID</label>
                    <input
                      type="text"
                      value={editingPlanData.stripePriceId || ''}
                      onChange={(e) => setEditingPlanData({ ...editingPlanData, stripePriceId: e.target.value })}
                      placeholder="e.g. price_1N..."
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-mono text-[11px] outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">قائمة الميزات (تفصل بفاصلة)</label>
                <textarea
                  rows={3}
                  value={Array.isArray(editingPlanData.features) ? editingPlanData.features.join(', ') : (editingPlanData.features || '')}
                  onChange={(e) => setEditingPlanData({ ...editingPlanData, features: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-xs text-white outline-none focus:border-purple-500 resize-none"
                  placeholder="محادثات غير محدودة, سرعة فائقة, إمكانية الوصول إلى Gemini Pro..."
                />
              </div>

              {planModalMsg && (
                <div className="p-3 rounded-xl bg-purple-900/40 border border-purple-500/30 text-xs font-bold text-purple-200">
                  {planModalMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlanModalKey(null);
                    setEditingPlanData(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlanModal}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPlanModal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ التعديلات على الخطة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL SUBSCRIPTION ADD/EDIT MODAL */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0d111d] border border-blue-500/30 rounded-3xl p-6 space-y-5 text-white shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-base text-white">
                  {editingSubData.id ? 'تعديل اشتراك حالي' : 'إضافة اشتراك يدوي لمستخدم'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubModalMsg(null);
                }}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscriptionFromModal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">البريد الإلكتروني للمستخدم *</label>
                <input
                  type="email"
                  value={editingSubData.userEmail || ''}
                  onChange={(e) => setEditingSubData({ ...editingSubData, userEmail: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">الخطة / الباقة المطلوبة</label>
                  <select
                    value={editingSubData.planId || 'pro'}
                    onChange={(e) => setEditingSubData({ ...editingSubData, planId: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="free" className="bg-[#0d111d]">المجانية (Free)</option>
                    <option value="basic" className="bg-[#0d111d]">الأساسية (Basic)</option>
                    <option value="pro" className="bg-[#0d111d]">الاحترافية (Pro)</option>
                    <option value="ultra" className="bg-[#0d111d]">الفائقة (Ultra)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">بوابة / مصدر الاشتراك</label>
                  <select
                    value={editingSubData.provider || 'manual'}
                    onChange={(e) => setEditingSubData({ ...editingSubData, provider: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="manual" className="bg-[#0d111d]">إضافة يدوية (Admin Manual)</option>
                    <option value="paymob" className="bg-[#0d111d]">Paymob</option>
                    <option value="paypal" className="bg-[#0d111d]">PayPal</option>
                    <option value="stripe" className="bg-[#0d111d]">Stripe</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">حالة الاشتراك</label>
                  <select
                    value={editingSubData.status || 'active'}
                    onChange={(e) => setEditingSubData({ ...editingSubData, status: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="active" className="bg-[#0d111d]">نشط (Active)</option>
                    <option value="trial" className="bg-[#0d111d]">تجريبي (Trial)</option>
                    <option value="expired" className="bg-[#0d111d]">منتهي (Expired)</option>
                    <option value="canceled" className="bg-[#0d111d]">ملغى (Canceled)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={editingSubData.expiresAt ? editingSubData.expiresAt.split('T')[0] : ''}
                    onChange={(e) => setEditingSubData({ ...editingSubData, expiresAt: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">المبلغ المكتسب</label>
                  <input
                    type="number"
                    value={editingSubData.amount ?? 0}
                    onChange={(e) => setEditingSubData({ ...editingSubData, amount: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/70 block mb-1">العملة</label>
                  <select
                    value={editingSubData.currency || 'EGP'}
                    onChange={(e) => setEditingSubData({ ...editingSubData, currency: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="EGP" className="bg-[#0d111d]">جنيه مصري (EGP)</option>
                    <option value="USD" className="bg-[#0d111d]">دولار أمريكي (USD)</option>
                  </select>
                </div>
              </div>

              {subModalMsg && (
                <div className="p-3 rounded-xl bg-blue-900/40 border border-blue-500/30 text-xs font-bold text-blue-200">
                  {subModalMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setSubModalMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubModal}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSubModal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ وتفعيل الاشتراك</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
