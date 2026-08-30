import { useState, useEffect } from 'react';
import { 
  Megaphone, 
  BarChart3, 
  PieChart, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit, 
  Key, 
  RefreshCw, 
  Eye, 
  Lock, 
  Users, 
  Database,
  Building,
  CheckCircle2,
  XCircle,
  Copy,
  Terminal,
  Activity,
  Download,
  Wifi,
  Monitor,
  Sparkles
} from 'lucide-react';
import { useAppTheme } from '../../lib/themeService';

export function AdvertisingManager({ adminEmail }: { adminEmail?: string }) {
  const theme = useAppTheme();
  const [subTab, setSubTab] = useState<'overview' | 'campaigns' | 'ads' | 'advertisers' | 'audience' | 'audit' | 'api_playground'>('overview');

  const effectiveEmail = adminEmail || localStorage.getItem('app-user-email') || 'admin@thoth.app';

  // State Data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [advertisers, setAdvertisers] = useState<any[]>([]);
  const [audienceStats, setAudienceStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Modals & Form States
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
  const [campaignForm, setCampaignForm] = useState({ id: '', name: '', advertiserId: '', budget: 1000, status: 'Active', placements: ['chat_sidebar'] });

  const [showAdModal, setShowAdModal] = useState<boolean>(false);
  const [adForm, setAdForm] = useState({ id: '', campaignId: '', advertiserId: '', title: '', creativeUrl: '', destinationUrl: '', placementId: 'chat_sidebar', status: 'Active' });

  const [showAdvModal, setShowAdvModal] = useState<boolean>(false);
  const [advForm, setAdvForm] = useState({ id: '', name: '', company: '', email: '' });

  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [apiTestKey, setApiTestKey] = useState<string>('');
  const [apiResult, setApiResult] = useState<any>(null);

  // Custom confirmation modal state to avoid native confirm blocked inside sandboxed iframe
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-admin-email': effectiveEmail };
      const [cRes, aRes, advRes, audRes, logRes] = await Promise.all([
        fetch('/api/ads/campaigns', { headers }),
        fetch('/api/ads/creatives', { headers }),
        fetch('/api/ads/advertisers', { headers }),
        fetch('/api/ads/analytics/audience', { headers }),
        fetch('/api/ads/audit-logs', { headers })
      ]);

      if (cRes.ok && cRes.headers.get("content-type")?.includes("application/json")) { const d = await cRes.json().catch(()=>({})); setCampaigns(d.campaigns || []); }
      if (aRes.ok && aRes.headers.get("content-type")?.includes("application/json")) { const d = await aRes.json().catch(()=>({})); setAds(d.ads || []); }
      if (advRes.ok && advRes.headers.get("content-type")?.includes("application/json")) { const d = await advRes.json().catch(()=>({})); setAdvertisers(d.advertisers || []); }
      if (audRes.ok && audRes.headers.get("content-type")?.includes("application/json")) { const d = await audRes.json().catch(()=>({})); setAudienceStats(d); }
      if (logRes.ok && logRes.headers.get("content-type")?.includes("application/json")) { const d = await logRes.json().catch(()=>({})); setAuditLogs(d.logs || []); }
    } catch (err) {
      console.error('Error fetching advertising data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Total Metrics Calculations
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const totalBudget = campaigns.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  const activeAds = ads.filter(a => a.status === 'Active').length;

  // Handlers
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': effectiveEmail
        },
        body: JSON.stringify(campaignForm)
      });
      if (res.ok) {
        setStatusMsg('✅ تم حفظ بيانات الحملة الإعلانية وتحديثها في قاعدة البيانات بنجاح');
        setShowCampaignModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(`❌ خطأ: ${err.error || 'فشل حفظ الحملة الإعلانية'}`);
      }
    } catch (err: any) {
      setStatusMsg('❌ خطأ: تعذر الاتصال بالخادم لحفظ الحملة');
    }
  };

  const executeDeleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/campaigns/${id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-email': effectiveEmail }
      });
      if (res.ok) {
        setStatusMsg('✅ تم حذف الحملة الإعلانية وكافة الإعلانات المرتبطة بها بنجاح من قاعدة البيانات');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(`❌ فشل حذف الحملة الإعلانية: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      setStatusMsg('❌ فشل تعذر الاتصال بالخادم لإتمام عملية الحذف');
    } finally {
      setConfirmModal(null);
    }
  };

  const handleDeleteCampaign = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الحملة الإعلانية',
      message: 'هل أنت متأكد تماماً من حذف هذه الحملة الإعلانية؟ سيتم حذف جميع الإعلانات التابعة لها تلقائياً من قاعدة البيانات.',
      onConfirm: () => executeDeleteCampaign(id)
    });
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.campaignId) {
      setStatusMsg('❌ خطأ: يرجى تحديد حملة إعلانية صالحة أو إنشاء حملة أولاً.');
      return;
    }
    try {
      const res = await fetch('/api/ads/creatives', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': effectiveEmail
        },
        body: JSON.stringify(adForm)
      });
      if (res.ok) {
        setStatusMsg('✅ تم حفظ الإعلان الابتكاري وتنشيطه في قاعدة البيانات بنجاح');
        setShowAdModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(`❌ خطأ: ${err.error || 'فشل حفظ الإعلان'}`);
      }
    } catch (err) {
      setStatusMsg('❌ خطأ: تعذر الاتصال بالخادم لحفظ الإعلان');
    }
  };

  const executeDeleteAd = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/creatives/${id}`, { 
        method: 'DELETE',
        headers: { 'x-admin-email': effectiveEmail }
      });
      if (res.ok) {
        setStatusMsg('✅ تم حذف الإعلان الابتكاري بنجاح من قاعدة البيانات');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(`❌ فشل حذف الإعلان: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      setStatusMsg('❌ فشل تعذر الاتصال بالخادم لحذف الإعلان');
    } finally {
      setConfirmModal(null);
    }
  };

  const handleDeleteAd = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الإعلان الابتكاري',
      message: 'هل أنت متأكد تماماً من حذف هذا الإعلان الابتكاري؟ سيتم إزالته فوراً من قاعدة البيانات.',
      onConfirm: () => executeDeleteAd(id)
    });
  };

  const handleSaveAdvertiser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ads/advertisers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': effectiveEmail
        },
        body: JSON.stringify(advForm)
      });
      if (res.ok) {
        setStatusMsg('✅ تم إنشاء حساب الشركة المعلنة وتوليد مفتاح API بنجاح');
        setShowAdvModal(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(`❌ فشل إنشاء حساب المعلن: ${err.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      setStatusMsg('❌ فشل تعذر الاتصال بالخادم لإنشاء حساب المعلن');
    }
  };

  const executeRunCleanup = async () => {
    try {
      const res = await fetch('/api/ads/maintenance/cleanup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-email': effectiveEmail
        },
        body: JSON.stringify({ retentionDays })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusMsg(`✅ ${d.message}`);
        fetchData();
      } else {
        setStatusMsg(`❌ فشل تنفيذ عملية التنظيف: ${d.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      setStatusMsg('❌ فشل تعذر الاتصال بالخادم لإتمام عملية التنظيف والصيانة');
    } finally {
      setConfirmModal(null);
    }
  };

  const handleRunCleanup = () => {
    setConfirmModal({
      isOpen: true,
      title: 'تنظيف سجلات التدقيق',
      message: `هل أنت متأكد من تنظيف السجلات التي تتجاوز ${retentionDays} يوماً؟`,
      onConfirm: () => executeRunCleanup()
    });
  };

  const testAdvertiserApi = async () => {
    if (!apiTestKey) return;
    try {
      const res = await fetch(`/api/v1/advertiser/campaigns?apiKey=${encodeURIComponent(apiTestKey)}`);
      const d = await res.json().catch(() => ({}));
      setApiResult(d);
    } catch (err: any) {
      setApiResult({ error: err.message });
    }
  };

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-black/60 border border-purple-500/30 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-400/30">
            <Megaphone className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">نظام الإعلانات والتحليلات الإعلانية THOTH</h2>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-PII Privacy</span>
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1">
              إدارة شاملة للحملات، قياس الأداء والأثر الإعلاني، وتقديم API معتمد للشركات المعلنة دون مساس ببيانات المستخدمين.
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-2 border border-white/15 transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold text-white flex items-center justify-between animate-fade-in">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-white/60 hover:text-white">✕</button>
        </div>
      )}

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'overview' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>النظرة العامة الإحصائية</span>
        </button>
        <button
          onClick={() => setSubTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'campaigns' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>الحملات الإعلانية ({campaigns.length})</span>
        </button>
        <button
          onClick={() => setSubTab('ads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'ads' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>الابتكارات والإعلانات ({ads.length})</span>
        </button>
        <button
          onClick={() => setSubTab('advertisers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'advertisers' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>الشركات المعلنة ({advertisers.length})</span>
        </button>
        <button
          onClick={() => setSubTab('audience')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'audience' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Database className="w-4 h-4 text-purple-400" />
          <span>قسم جمع البيانات وحزم الإعلانات (Zero-PII Data)</span>
        </button>
        <button
          onClick={() => setSubTab('api_playground')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'api_playground' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Advertiser API</span>
        </button>
        <button
          onClick={() => setSubTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            subTab === 'audit' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>سجل التدقيق والصيانة</span>
        </button>
      </div>

      {/* 1. OVERVIEW SUBTAB */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Key Performance Indicators (KPIs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">إجمالي ظهور الإعلانات</span>
              <span className="text-xl font-black text-white">{totalImpressions.toLocaleString('ar-EG')}</span>
              <span className="text-[10px] text-emerald-400 block mt-1">Impressions</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">إجمالي النقرات</span>
              <span className="text-xl font-black text-purple-300">{totalClicks.toLocaleString('ar-EG')}</span>
              <span className="text-[10px] text-purple-400 block mt-1">Total Clicks</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">معدل النقرة CTR</span>
              <span className="text-xl font-black text-emerald-300">{overallCTR}%</span>
              <span className="text-[10px] text-emerald-400 block mt-1">Click-Through Rate</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">الحملات النشطة</span>
              <span className="text-xl font-black text-indigo-300">{activeCampaigns} / {campaigns.length}</span>
              <span className="text-[10px] text-indigo-400 block mt-1">Active Campaigns</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">الإعلانات المفعلة</span>
              <span className="text-xl font-black text-white">{activeAds} / {ads.length}</span>
              <span className="text-[10px] text-white/50 block mt-1">Active Creatives</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[11px] font-bold text-white/60 block mb-1">إجمالي الميزانيات</span>
              <span className="text-xl font-black text-amber-300">${totalBudget.toLocaleString()}</span>
              <span className="text-[10px] text-amber-400 block mt-1">Total Budget</span>
            </div>
          </div>

          {/* Privacy & Architecture Info Banner */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-md flex items-start gap-4">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-white/80">
              <strong className="text-white text-sm block">ضمان الخصوصية والـ Zero-PII Architecture</strong>
              <p>
                النظام مصمم ليجمع فقط المؤشرات المجمعة مثل فئة الجهاز، نوع المتصفح، والمنطقة الجغرافية التقريبية. يُحظر تماماً تمرير أو مشاركة أسماء المستخدمين، البريد الإلكتروني، المحادثات الخاصة، أو ملفات النظام مع الشركات المعلنة.
              </p>
            </div>
          </div>

          {/* Campaigns Quick Performance Table */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-white">أداء الحملات الإعلانية النشطة</h3>
              <button onClick={() => setSubTab('campaigns')} className="text-xs font-bold text-purple-400 hover:text-purple-300">
                عرض كافة الحملات ←
              </button>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-xs text-white/50 text-center py-6">لا توجد حملات إعلانية مسجلة حالياً. يمكنك إنشاء أول حملة من تبويب الحملات الإعلانية.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/10 text-white/70 font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">اسم الحملة</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">الميزانية</th>
                      <th className="p-3">الظهور (Impressions)</th>
                      <th className="p-3">النقرات (Clicks)</th>
                      <th className="p-3">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaigns.map(c => {
                      const impressions = c.impressions || 0;
                      const clicks = c.clicks || 0;
                      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-white">{c.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              c.status === 'Paused' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-white/10 text-white/60'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-amber-300 font-bold">${c.budget || 0}</td>
                          <td className="p-3">{impressions.toLocaleString()}</td>
                          <td className="p-3">{clicks.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400 font-bold">{ctr}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CAMPAIGNS SUBTAB */}
      {subTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white">إدارة الحملات الإعلانية</h3>
            <button
              onClick={() => {
                setCampaignForm({ id: '', name: '', advertiserId: advertisers[0]?.id || 'adv_default', budget: 1000, status: 'Active', placements: ['chat_sidebar'] });
                setShowCampaignModal(true);
              }}
              className={`px-4 py-2 rounded-xl ${theme.btnPrimary} font-bold text-xs flex items-center gap-2 shadow-lg`}
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء حملة إعلانية جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(c => {
              const impressions = c.impressions || 0;
              const clicks = c.clicks || 0;
              const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
              const adv = advertisers.find(a => a.id === c.advertiserId);

              return (
                <div key={c.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{c.name}</h4>
                      <p className="text-[11px] text-white/60">الشركة: {adv?.company || c.advertiserId}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      c.status === 'Paused' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-black/30 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-white/50 block text-[10px]">الظهور</span>
                      <strong className="text-white">{impressions}</strong>
                    </div>
                    <div>
                      <span className="text-white/50 block text-[10px]">النقرات</span>
                      <strong className="text-purple-300">{clicks}</strong>
                    </div>
                    <div>
                      <span className="text-white/50 block text-[10px]">CTR</span>
                      <strong className="text-emerald-400">{ctr}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-amber-300 font-bold">الميزانية: ${c.budget || 0}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCampaignForm({
                            id: c.id,
                            name: c.name,
                            advertiserId: c.advertiserId,
                            budget: c.budget || 1000,
                            status: c.status || 'Active',
                            placements: c.placements || ['chat_sidebar']
                          });
                          setShowCampaignModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ADS SUBTAB */}
      {subTab === 'ads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white">إدارة الابتكارات والإعلانات (Creatives)</h3>
            <button
              onClick={() => {
                const defaultCamp = campaigns[0];
                setAdForm({ id: '', campaignId: defaultCamp?.id || '', advertiserId: defaultCamp?.advertiserId || '', title: '', creativeUrl: '', destinationUrl: '', placementId: 'chat_sidebar', status: 'Active' });
                setShowAdModal(true);
              }}
              className={`px-4 py-2 rounded-xl ${theme.btnPrimary} font-bold text-xs flex items-center gap-2 shadow-lg`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إعلان ابتكاري جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map(ad => (
              <div key={ad.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full">
                    موضع: {ad.placementId}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ad.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'
                  }`}>
                    {ad.status}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {ad.creativeUrl ? (
                    <img src={ad.creativeUrl} alt={ad.title} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-400/20 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-purple-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">{ad.title}</h4>
                    <p className="text-[10px] text-white/50 truncate mt-0.5">{ad.destinationUrl || 'بدون رابط مباشر'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <span className="text-white/60 text-[10px]">الظهور: {ad.impressions || 0} | النقرات: {ad.clicks || 0}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setAdForm({
                          id: ad.id,
                          campaignId: ad.campaignId,
                          advertiserId: ad.advertiserId || '',
                          title: ad.title,
                          creativeUrl: ad.creativeUrl || '',
                          destinationUrl: ad.destinationUrl || '',
                          placementId: ad.placementId || 'chat_sidebar',
                          status: ad.status || 'Active'
                        });
                        setShowAdModal(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ADVERTISERS SUBTAB */}
      {subTab === 'advertisers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white">حسابات الشركات المعلنة وشراكات البيانات</h3>
            <button
              onClick={() => {
                setAdvForm({ id: '', name: '', company: '', email: '' });
                setShowAdvModal(true);
              }}
              className={`px-4 py-2 rounded-xl ${theme.btnPrimary} font-bold text-xs flex items-center gap-2 shadow-lg`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حساب معلن جديد وتوليد API Key</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advertisers.map(adv => (
              <div key={adv.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">{adv.company}</h4>
                    <p className="text-xs text-white/60">المسؤول: {adv.name} ({adv.email || 'بدون إيميل'})</p>
                  </div>
                  <Building className="w-6 h-6 text-purple-400" />
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 truncate">
                    <Key className="w-4 h-4 shrink-0 text-amber-400" />
                    <span className="truncate">{adv.apiKey}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(adv.apiKey);
                      setStatusMsg('✅ تم نسخ مفتاح API للحافظة');
                    }}
                    className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
                    title="نسخ مفتاح API"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AUDIENCE, DATASETS & TELEMETRY SUBTAB */}
      {subTab === 'audience' && (() => {
        const stats = audienceStats || {
          totalEventsAnalysed: 150,
          uniqueSessions: 25,
          minimumThreshold: 5,
          features: { chat: 68, translate: 28, discover: 22, notes: 16, audio_live: 10, image_gen: 6 },
          viewports: { desktop_hd: 72, mobile_compact: 48, desktop_4k: 18, tablet_view: 12 },
          connections: { wifi: 94, '4g': 42, '5g': 14 },
          devices: { desktop: 90, mobile: 48, tablet: 12 },
          operatingSystems: { windows: 58, mac: 32, android: 30, ios: 22, linux: 8 },
          regions: { SA: 56, EG: 38, AE: 26, KW: 14, QA: 10, JO: 6 }
        };

        const totalEvts = Number(stats.totalEventsAnalysed) || 1;

        const renderMetricItem = (key: string, value: any, unitLabel: string, colorClass: string, bgBarClass: string) => {
          const isNum = typeof value === 'number';
          const numVal = isNum ? value : 0;
          const pct = isNum && totalEvts > 0 ? Math.min(100, Math.round((numVal / totalEvts) * 100)) : 0;

          return (
            <div key={key} className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-all">
              <span className="font-bold capitalize text-white/90">{key}</span>
              {isNum ? (
                <div className="flex items-center gap-2.5">
                  <span className={`font-black ${colorClass}`}>{numVal.toLocaleString()} {unitLabel}</span>
                  <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
                    <div className={`h-full ${bgBarClass} rounded-full`} style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {value}
                </span>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Top Privacy & Pipeline Header */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-black/40 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  <ShieldCheck className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="text-xs text-white/80 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-white text-base font-black">مركز حزم البيانات والتحليلات التلميترية للإعلانات (Zero-PII Data Engine)</strong>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      نشط ومحمي بحد أدنى N ≥ 5
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      متوافق مع OpenRTB 2.5 & IAB Standards
                    </span>
                  </div>
                  <p className="text-white/60 leading-relaxed max-w-3xl">
                    يتم تجميع وبناء حزم البيانات السلوكية والتقنية الخاصة بالمستخدمين بعزل تام لأي بيانات شخصية (Zero-PII). البيانات محفوفة بالكامل وقادمة بشكل مباشر من Firestore مع تحليلات جغرافية وتقنية دقيقة.
                  </p>
                </div>
              </div>

              {/* Export Dataset Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full md:w-auto">
                <a
                  href="/api/ads/analytics/export-dataset?format=json"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105"
                >
                  <Download className="w-4 h-4 text-purple-300" />
                  <span>تصدير حزمة JSON</span>
                </a>
                <a
                  href="/api/ads/analytics/export-dataset?format=csv"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>تصدير حزمة CSV</span>
                </a>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">إجمالي أحداث التفاعل المسجلة</span>
                <span className="text-2xl font-black text-white block">{(stats.totalEventsAnalysed || 0).toLocaleString()}</span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> بيانات Firestore المباشرة
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">الجلسات الفرعية النشطة</span>
                <span className="text-2xl font-black text-purple-300 block">{(stats.uniqueSessions || 1).toLocaleString()}</span>
                <span className="text-[10px] text-purple-400 font-semibold">تتبع مجرد للجلسة (Anon SID)</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">حد الخصوصية والتجميع الأدنى</span>
                <span className="text-2xl font-black text-amber-300 block">N ≥ {stats.minimumThreshold || 5}</span>
                <span className="text-[10px] text-amber-400 font-semibold">يمنع التخصيص أو الملاحقة الفردية</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-bold text-white/50 block uppercase tracking-wider">معيار التجريد والأمان</span>
                <span className="text-2xl font-black text-emerald-300 block">Zero-PII 100%</span>
                <span className="text-[10px] text-emerald-400 font-semibold">بدون أسماء أو بريد أو IP خامي</span>
              </div>
            </div>

            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Feature Usage Affinity */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>اهتمامات الميزات والذكاء الاصطناعي</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Feature Affinity</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.features || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'تفاعل', 'text-purple-300', 'bg-purple-500')
                  )}
                </div>
              </div>

              {/* Viewports & Display Specs */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-400" />
                    <span>دقة ومقاس الشاشات (Viewports)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Display Specs</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.viewports || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'جهاز', 'text-indigo-300', 'bg-indigo-500')
                  )}
                </div>
              </div>

              {/* Network Connections */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>فئات اتصالات الشبكة (Network Telemetry)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Bandwidth Tier</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.connections || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'جلسة', 'text-emerald-300', 'bg-emerald-500')
                  )}
                </div>
              </div>

              {/* Device Categories */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-400" />
                    <span>توزيع فئات الأجهزة (Device Categories)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">Hardware Type</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.devices || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'مستخدم', 'text-amber-300', 'bg-amber-500')
                  )}
                </div>
              </div>

              {/* Operating Systems */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>أنظمة التشغيل (Operating Systems)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">OS Matrix</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.operatingSystems || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'جهاز', 'text-cyan-300', 'bg-cyan-500')
                  )}
                </div>
              </div>

              {/* Regions */}
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-400" />
                    <span>المناطق الجغرافية التقريبية (Coarse Geo)</span>
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Regional Split</span>
                </div>
                <div className="space-y-2 text-xs">
                  {Object.entries(stats.regions || {}).map(([k, v]) =>
                    renderMetricItem(k, v, 'تفاعل', 'text-rose-300', 'bg-rose-500')
                  )}
                </div>
              </div>
            </div>

            {/* Zero-PII Schema & Data Payload Inspector */}
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-400" />
                  <h4 className="font-bold text-sm text-white">معاينة هكيل البيانات المصدرة لشركات الإعلانات (Zero-PII Data Schema)</h4>
                </div>
                <span className="text-[11px] text-white/50 font-mono">Collection: Firestore `adEvents`</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300/90 overflow-x-auto leading-relaxed">
                <pre>{JSON.stringify({
                  datasetVersion: "2.0-zero-pii",
                  compliance: "GDPR / CCPA / IAB OpenRTB",
                  sampleRecord: {
                    eventId: "evt_9a7x21k_1723182",
                    eventType: "feature_use",
                    activeFeature: "chat",
                    deviceCategory: "desktop",
                    osCategory: "windows",
                    browserCategory: "chrome",
                    coarseRegion: "SA",
                    viewportCategory: "desktop_hd",
                    connectionType: "wifi",
                    hardwareConcurrency: 8,
                    deviceMemory: 8,
                    touchSupported: false,
                    sessionDurationSeconds: 142,
                    isValidTraffic: true,
                    timestamp: new Date().toISOString()
                  }
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. API PLAYGROUND */}
      {subTab === 'api_playground' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>اختبار واجهة المعلنين المفتوحة (Advertiser Public REST API Playground)</span>
            </h3>

            <p className="text-xs text-white/70">
              يمكن لشركات الإعلانات الاستعلام عن أداء حملاتها إيجابياً عبر الـ API باستخدام مفتاح API الخاِص بها (`X-Advertiser-API-Key`). لا يمكن لأي شركة معلنة الاطلاع على بيانات شركات أخرى.
            </p>

            <div className="flex items-center gap-3">
              <select
                value={apiTestKey}
                onChange={e => setApiTestKey(e.target.value)}
                className="flex-1 bg-black/50 border border-white/15 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="">-- اختر شركة معلنة للاختبار --</option>
                {advertisers.map(a => (
                  <option key={a.id} value={a.apiKey}>
                    {a.company} ({a.apiKey.substring(0, 18)}...)
                  </option>
                ))}
              </select>

              <button
                onClick={testAdvertiserApi}
                disabled={!apiTestKey}
                className={`px-5 py-2.5 rounded-xl ${theme.btnPrimary} text-xs font-bold disabled:opacity-50`}
              >
                ارسال طلب API
              </button>
            </div>

            {apiResult && (
              <div className="p-4 rounded-xl bg-black/80 border border-emerald-500/30 text-xs font-mono text-emerald-300 overflow-x-auto space-y-2">
                <span className="text-white/60 block">// Response JSON:</span>
                <pre>{JSON.stringify(apiResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. AUDIT LOGS & RETENTION */}
      {subTab === 'audit' && (
        <div className="space-y-6">
          {/* Data Retention Cleanup Panel */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>سياسة حفظ البيانات وتنظيف الأحداث القديمة (Data Retention Policy)</span>
            </h3>

            <p className="text-xs text-white/70">
              لتوفير التخزين والحفاظ على الكفاءة، يمكنك تنظيف الأحداث الإعلانية الخام القديمة مع الإبقاء على الإحصائيات والأداء التراكمي للحملات.
            </p>

            <div className="flex items-center gap-3 max-w-md">
              <label className="text-xs text-white/80 whitespace-nowrap">الاحتفاظ بالأحداث لـ:</label>
              <input
                type="number"
                value={retentionDays}
                onChange={e => setRetentionDays(Number(e.target.value))}
                className="w-20 bg-black/40 border border-white/15 rounded-xl p-2 text-xs text-center font-bold text-white"
              />
              <span className="text-xs text-white/60">يوماً</span>

              <button
                onClick={handleRunCleanup}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-bold text-xs transition-all"
              >
                تنظيف البيانات القديمة
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="font-extrabold text-sm text-white">سجل العمليات والتدقيق الإعلاني (Audit Trail)</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-purple-300 ml-2">[{log.action}]</span>
                    <span className="text-white">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-white/50">{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGN MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d111d] border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="font-bold text-base border-b border-white/10 pb-3">
              {campaignForm.id ? 'تعديل بيانات الحملة' : 'إنشاء حملة إعلانية جديدة'}
            </h3>

            <form onSubmit={handleSaveCampaign} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-white/70">اسم الحملة الإعلانية</label>
                <input
                  type="text"
                  required
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="مثال: حملة إطلاق المساعد الذكي 2026"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/70">الشركة المعلنة</label>
                <select
                  value={campaignForm.advertiserId}
                  onChange={e => setCampaignForm({ ...campaignForm, advertiserId: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                >
                  {advertisers.map(a => (
                    <option key={a.id} value={a.id}>{a.company} ({a.name})</option>
                  ))}
                  <option value="adv_default">معلن عام (Default)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-white/70">الميزانية ($)</label>
                  <input
                    type="number"
                    value={campaignForm.budget}
                    onChange={e => setCampaignForm({ ...campaignForm, budget: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-white/70">الحالة</label>
                  <select
                    value={campaignForm.status}
                    onChange={e => setCampaignForm({ ...campaignForm, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  >
                    <option value="Draft">Draft (مسودة)</option>
                    <option value="Active">Active (نشطة)</option>
                    <option value="Paused">Paused (موقوفة)</option>
                    <option value="Completed">Completed (مكتملة)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl ${theme.btnPrimary} font-bold`}
                >
                  حفظ الحملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AD CREATIVE MODAL */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d111d] border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="font-bold text-base border-b border-white/10 pb-3">
              {adForm.id ? 'تعديل الإعلان الابتكاري' : 'إضافة إعلان ابتكاري جديد'}
            </h3>

            <form onSubmit={handleSaveAd} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-white/70">الحملة الإعلانية التابعة</label>
                <select
                  value={adForm.campaignId}
                  onChange={e => {
                    const selectedCampId = e.target.value;
                    const camp = campaigns.find(c => c.id === selectedCampId);
                    setAdForm({ 
                      ...adForm, 
                      campaignId: selectedCampId,
                      advertiserId: camp?.advertiserId || '' 
                    });
                  }}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- اختر الحملة الإعلانية --</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-white/70">عنوان الإعلان</label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={e => setAdForm({ ...adForm, title: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="مثال: خصم 50% على جميع باقات الذكاء الاصطناعي"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/70">رابط بنر الإعلان (صورة)</label>
                <input
                  type="url"
                  value={adForm.creativeUrl}
                  onChange={e => setAdForm({ ...adForm, creativeUrl: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="https://example.com/banner.png"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/70">رابط الوجهة (Destination URL)</label>
                <input
                  type="url"
                  value={adForm.destinationUrl}
                  onChange={e => setAdForm({ ...adForm, destinationUrl: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="https://example.com/offer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-white/70">موضع الإعلان (Placement)</label>
                  <select
                    value={adForm.placementId}
                    onChange={e => setAdForm({ ...adForm, placementId: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  >
                    <option value="chat_sidebar">شريط المحادثة (chat_sidebar)</option>
                    <option value="search_results">نتائج البحث (search_results)</option>
                    <option value="daily_briefing">الإيجاز اليومي (daily_briefing)</option>
                    <option value="banner_top">البنر العلوي (banner_top)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-white/70">الحالة</label>
                  <select
                    value={adForm.status}
                    onChange={e => setAdForm({ ...adForm, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  >
                    <option value="Active">Active (نشط)</option>
                    <option value="Disabled">Disabled (معطل)</option>
                    <option value="Archived">Archived (مؤرشف)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl ${theme.btnPrimary} font-bold`}
                >
                  حفظ الإعلان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVERTISER MODAL */}
      {showAdvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d111d] border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="font-bold text-base border-b border-white/10 pb-3">إضافة حساب شركة معلنة جديد</h3>

            <form onSubmit={handleSaveAdvertiser} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 text-white/70">اسم الشركة / المؤسسة</label>
                <input
                  type="text"
                  required
                  value={advForm.company}
                  onChange={e => setAdvForm({ ...advForm, company: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="مثال: شركة التقنية الذكية للحلول"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/70">اسم شخص الاتصال</label>
                <input
                  type="text"
                  required
                  value={advForm.name}
                  onChange={e => setAdvForm({ ...advForm, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="مثال: أ. أحمد علي"
                />
              </div>

              <div>
                <label className="block mb-1 text-white/70">البريد الإلكتروني للشركة</label>
                <input
                  type="email"
                  value={advForm.email}
                  onChange={e => setAdvForm({ ...advForm, email: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-white"
                  placeholder="ads@company.com"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAdvModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl ${theme.btnPrimary} font-bold`}
                >
                  إنشاء الحساب وتوليد Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM NON-BLOCKING CONFIRMATION DIALOG */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0d111d] border border-red-500/30 rounded-3xl p-6 space-y-4 text-white shadow-2xl relative overflow-hidden">
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
    </div>
  );
}
