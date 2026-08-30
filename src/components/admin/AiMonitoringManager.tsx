import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Users, ShieldAlert, Database, DollarSign, FileText, 
  RefreshCw, Download, Search, Filter, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Zap, BarChart3, Layers, ChevronRight, ChevronLeft, 
  Settings, ArrowUpRight, Check, Play, Pause, AlertCircle, Eye, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { auth } from '../../lib/firebase';

interface AiMonitoringManagerProps {
  onClose?: () => void;
}

export function AiMonitoringManager({ onClose }: AiMonitoringManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'models' | 'users' | 'plans' | 'quota' | 'embeddings' | 'cost' | 'logs'
  >('overview');

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Main Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [modelsData, setModelsData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [plansData, setPlansData] = useState<any[]>([]);
  const [quotaData, setQuotaData] = useState<any>(null);
  const [embeddingsData, setEmbeddingsData] = useState<any>(null);
  const [pricingConfig, setPricingConfig] = useState<Record<string, { inputPricePer1M: number; outputPricePer1M: number }>>({});
  const [pricingModalOpen, setPricingModalOpen] = useState<boolean>(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, { inputPricePer1M: number; outputPricePer1M: number }>>({});

  // Request Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [logsFilters, setLogsFilters] = useState({
    modelId: 'all',
    userHash: '',
    plan: 'all',
    service: 'all',
    status: 'all',
    date: ''
  });
  const [selectedRequestLog, setSelectedRequestLog] = useState<any | null>(null);

  // User Timeline Search State
  const [selectedUserHash, setSelectedUserHash] = useState<string>('');
  const [userTimeline, setUserTimeline] = useState<any[]>([]);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any | null>(null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState<boolean>(false);

  // Get Admin Auth Headers
  const getAdminHeaders = () => {
    const email = auth.currentUser?.email || localStorage.getItem('app-user-email') || 'onq6974@gmail.com';
    return {
      'Content-Type': 'application/json',
      'x-admin-email': email,
      'x-admin-role': 'admin'
    };
  };

  // Fetch AI Usage Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = getAdminHeaders();

      if (activeSubTab === 'overview') {
        const res = await fetch(`/api/admin/ai-usage/overview?timeRange=${timeRange}`, { headers });
        const data = await res.json().catch(() => ({}));
        setOverviewData(data);
      } else if (activeSubTab === 'models') {
        const res = await fetch(`/api/admin/ai-usage/models?timeRange=${timeRange}`, { headers });
        const data = await res.json().catch(() => ({}));
        setModelsData(data.models || []);
      } else if (activeSubTab === 'users') {
        const res = await fetch(`/api/admin/ai-usage/users`, { headers });
        const data = await res.json().catch(() => ({}));
        setUsersData(data.users || []);
      } else if (activeSubTab === 'plans') {
        const res = await fetch(`/api/admin/ai-usage/plans`, { headers });
        const data = await res.json().catch(() => ({}));
        setPlansData(data.plans || []);
      } else if (activeSubTab === 'quota') {
        const res = await fetch(`/api/admin/ai-usage/quota-status`, { headers });
        const data = await res.json().catch(() => ({}));
        setQuotaData(data);
      } else if (activeSubTab === 'embeddings') {
        const res = await fetch(`/api/admin/ai-usage/embeddings`, { headers });
        const data = await res.json().catch(() => ({}));
        setEmbeddingsData(data);
      } else if (activeSubTab === 'cost') {
        const [modelsRes, pricingRes] = await Promise.all([
          fetch(`/api/admin/ai-usage/models?timeRange=${timeRange}`, { headers }),
          fetch(`/api/admin/ai-usage/pricing`, { headers })
        ]);
        const mData = await modelsRes.json().catch(() => ({}));
        const pData = await pricingRes.json().catch(() => ({}));
        setModelsData(mData.models || []);
        setPricingConfig(pData.pricing || {});
      } else if (activeSubTab === 'logs') {
        await fetchLogs(1);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Error fetching AI monitoring data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Request Logs
  const fetchLogs = async (page = 1) => {
    try {
      const headers = getAdminHeaders();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPagination.limit.toString(),
        modelId: logsFilters.modelId,
        userHash: logsFilters.userHash,
        plan: logsFilters.plan,
        service: logsFilters.service,
        status: logsFilters.status,
        date: logsFilters.date
      });

      const res = await fetch(`/api/admin/ai-usage/logs?${params.toString()}`, { headers });
      const data = await res.json().catch(() => ({}));
      setLogs(data.logs || []);
      setLogsPagination({
        page: data.page || page,
        limit: data.limit || 15,
        total: data.total || 0,
        totalPages: data.totalPages || 1
      });
    } catch (err) {
      console.error("Error fetching request logs:", err);
    }
  };

  // Fetch User Timeline
  const fetchUserTimeline = async (userHash: string) => {
    if (!userHash) return;
    setIsLoadingTimeline(true);
    try {
      const headers = getAdminHeaders();
      const res = await fetch(`/api/admin/ai-usage/user-timeline?userHash=${encodeURIComponent(userHash)}`, { headers });
      const data = await res.json().catch(() => ({}));
      setUserTimeline(data.timeline || []);
      setSelectedUserInfo(data.userInfo || null);
    } catch (err) {
      console.error("Error fetching user timeline:", err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Live Auto Refresh Toggle
  useEffect(() => {
    fetchData();
  }, [activeSubTab, timeRange]);

  useEffect(() => {
    let interval: any = null;
    if (isLive) {
      interval = setInterval(() => {
        fetchData();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, activeSubTab, timeRange]);

  // Save Custom Pricing Settings
  const handleSavePricing = async () => {
    try {
      const headers = getAdminHeaders();
      const res = await fetch('/api/admin/ai-usage/pricing', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pricing: editingPrices })
      });
      if (res.ok) {
        setPricingConfig(editingPrices);
        setPricingModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save pricing settings:", err);
    }
  };

  // Export Data (CSV or JSON)
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const headers = getAdminHeaders();
      const res = await fetch(`/api/admin/ai-usage/export?format=${format}&subTab=${activeSubTab}&timeRange=${timeRange}`, { headers });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_usage_${activeSubTab}_${new Date().toISOString().slice(0,10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Error exporting AI usage data:", err);
    }
  };

  // Helper formatting functions
  const formatTokens = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCost = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined || isNaN(cost) || cost === 0) return 'N/A';
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="space-y-6 text-right font-sans dir-rtl">
      {/* Header & Main Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900/90 via-purple-950/40 to-slate-900/90 border border-purple-500/20 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              نظام مراقبة واستهلاك الذكاء الاصطناعي الشامل
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Backend API Tracking ⚡
              </span>
            </h2>
            <p className="text-xs text-white/60">
              تتبع واسترسال كل طلبات Google GenAI API الفعلية مع مراقبة النماذج، المستخدمين، التكاليف، والـQuota بـ Zero-PII Privacy.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl">
            {(['24h', '7d', '30d', '90d'] as const).map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === tr
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {tr === '24h' ? '24 ساعة' : tr === '7d' ? '7 أيام' : tr === '30d' ? '30 يوم' : '90 يوم'}
              </button>
            ))}
          </div>

          {/* Live Monitoring Toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
              isLive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30 animate-pulse'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? 'التحديث المباشر نشط (Live)' : 'تفعيل المراقبة المباشرة'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => handleExport('csv')}
              className="px-2.5 py-1 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => handleExport('json')}
              className="px-2.5 py-1 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'overview', label: 'الاستخدام الإجمالي', icon: BarChart3 },
          { id: 'models', label: 'مراقبة النماذج (Model IDs)', icon: Cpu },
          { id: 'users', label: 'استخدام المستخدمين & Timeline', icon: Users },
          { id: 'plans', label: 'مراقبة الخطط', icon: Layers },
          { id: 'quota', label: 'الحدود والـQuota & Limits', icon: ShieldAlert },
          { id: 'embeddings', label: 'متجهات Embeddings', icon: Database },
          { id: 'cost', label: 'تقدير التكاليف Cost', icon: DollarSign },
          { id: 'logs', label: 'سجل الطلبات Request Logs', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 shadow-lg ring-1 ring-purple-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-white/50'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- SUB TAB 1: OVERVIEW ---------------- */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">إجمالي الطلبات (All-Time)</span>
              <div className="text-2xl font-black text-white">{overviewData?.summary?.totalRequests?.toLocaleString() || '0'}</div>
              <div className="text-[10px] text-purple-400">منذ بدء التشغيل</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">طلبات اليوم / الشهر</span>
              <div className="text-2xl font-black text-emerald-400">
                {overviewData?.summary?.todayRequests?.toLocaleString() || '0'}
                <span className="text-xs text-white/40 font-normal mr-1">/ {overviewData?.summary?.monthRequests?.toLocaleString() || '0'}</span>
              </div>
              <div className="text-[10px] text-emerald-300/80">تحديث فوري</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">إجمالي الـTokens</span>
              <div className="text-2xl font-black text-amber-400">{formatTokens(overviewData?.summary?.totalTokens || 0)}</div>
              <div className="text-[10px] text-amber-300/80">
                In: {formatTokens(overviewData?.summary?.totalInputTokens || 0)} | Out: {formatTokens(overviewData?.summary?.totalOutputTokens || 0)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">متوسط زمن الاستجابة</span>
              <div className="text-2xl font-black text-cyan-400">{overviewData?.summary?.avgLatencyMs || 0} ms</div>
              <div className="text-[10px] text-cyan-300/80">Latency across GenAI API</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 col-span-2 md:col-span-1">
              <span className="text-[11px] font-semibold text-white/50">نسبة النجاح / الأخطاء</span>
              <div className="text-2xl font-black text-emerald-400">
                {overviewData?.summary?.successRate || '100'}%
                <span className="text-xs text-rose-400 font-normal mr-1">({overviewData?.summary?.errorRate || '0'}% أخطاء)</span>
              </div>
              <div className="text-[10px] text-white/40">استجابات HTTP 200</div>
            </div>
          </div>

          {/* Interactive Responsive SVG Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Requests & Tokens Trend */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  معدل الطلبات واستهلاك الـTokens ({timeRange})
                </h3>
                <span className="text-[10px] text-white/40">موزعة زمنيًا</span>
              </div>

              <div className="h-64 w-full" dir="ltr">
                {overviewData?.timeSeries && overviewData.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewData.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis dataKey="shortLabel" tick={{ fill: '#ffffff80', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#ffffff80', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                        itemStyle={{ color: '#c084fc' }}
                      />
                      <Bar dataKey="requests" name="الطلبات" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                    جاري تجميع البيانات الزمنية للطلبات...
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Latency & Error Rate */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  زمن الاستجابة ومعدل الأخطاء
                </h3>
                <span className="text-[10px] text-white/40">Latency & Errors</span>
              </div>

              <div className="h-64 w-full" dir="ltr">
                {overviewData?.timeSeries && overviewData.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={overviewData.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                      <XAxis dataKey="shortLabel" tick={{ fill: '#ffffff80', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fill: '#ffffff80', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ffffff80', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      />
                      <Bar yAxisId="right" dataKey="errors" name="الأخطاء" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line yAxisId="left" type="monotone" dataKey="latencyMs" name="زمن الاستجابة (ms)" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 3, fill: '#2dd4bf' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                    جاري معالجة بيانات الأداء...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Features Breakdown */}
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              توزيع الاستخدام حسب نوع الخدمة (Services / Operations)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(overviewData?.topFeatures || [
                { name: 'Chat', count: 0 },
                { name: 'Thinking', count: 0 },
                { name: 'Search', count: 0 },
                { name: 'Translation', count: 0 },
                { name: 'Voice', count: 0 },
                { name: 'Embedding', count: 0 },
                { name: 'File analysis', count: 0 },
                { name: 'Admin Tools', count: 0 },
              ]).map((feat: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{feat.name}</div>
                    <div className="text-[10px] text-white/50">{feat.count?.toLocaleString() || 0} طلب</div>
                  </div>
                  <div className="text-xs font-extrabold text-purple-400">{formatTokens(feat.tokens || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 2: MODELS MONITORING ---------------- */}
      {activeSubTab === 'models' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                مراقبة نماذج الذكاء الاصطناعي الفعلية (Actual Model IDs)
              </h3>
              <p className="text-xs text-white/50">
                تسجيل ومتابعة Model ID الحقيقي المرسل إلى Google GenAI API مع تكتشاف النماذج الجديدة تلقائياً بدون قائمة ثابتة.
              </p>
            </div>
          </div>

          {/* Dynamic Models Table */}
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-white/60 font-bold">
                  <tr>
                    <th className="p-4">Actual Model ID</th>
                    <th className="p-4">الطلبات (Requests)</th>
                    <th className="p-4">Input Tokens</th>
                    <th className="p-4">Output Tokens</th>
                    <th className="p-4">Total Tokens</th>
                    <th className="p-4">متوسط الاستجابة</th>
                    <th className="p-4">الأخطاء (Errors)</th>
                    <th className="p-4">التكلفة التقديرية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {modelsData && modelsData.length > 0 ? (
                    modelsData.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-purple-300 flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>{m.actualModelId}</span>
                          {m.displayModelName && m.displayModelName !== m.actualModelId && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-normal">
                              ({m.displayModelName})
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-white">{m.requests?.toLocaleString()}</td>
                        <td className="p-4 text-white/80">{formatTokens(m.inputTokens)}</td>
                        <td className="p-4 text-white/80">{formatTokens(m.outputTokens)}</td>
                        <td className="p-4 font-bold text-amber-400">{formatTokens(m.totalTokens)}</td>
                        <td className="p-4 text-cyan-300 font-semibold">{m.avgLatencyMs} ms</td>
                        <td className="p-4">
                          {m.errorCount > 0 ? (
                            <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                              {m.errorCount} ({m.errorRate}%)
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold">0</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-emerald-400">{formatCost(m.estimatedCost)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-white/40">
                        لا توجد بيانات سجلات نماذج متاحة للفترة المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 3: USER AI USAGE & TIMELINE ---------------- */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                استهلاك المستخدمين لخدمات AI ومتابعة الـTimeline
              </h3>
              <p className="text-xs text-white/50">
                ابحث عن أي مستخدم لمعاينة استهلاكه التفصيلي والجدول الزمني للطلبات (Privacy-First Non-PII IDs).
              </p>
            </div>

            <div className="flex items-center gap-2 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="ابحث بـ Internal User ID (مثال: usr_a1b2c3)..."
                  value={selectedUserHash}
                  onChange={(e) => setSelectedUserHash(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUserTimeline(selectedUserHash)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>
              <button
                onClick={() => fetchUserTimeline(selectedUserHash)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Selected User Overview & Timeline if active */}
          {selectedUserHash && (
            <div className="p-5 rounded-3xl bg-purple-950/20 border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-xs">
                    {selectedUserHash}
                  </div>
                  <span className="text-xs text-white/60">الجدول الزمني لطلبات المستخدم (User Timeline)</span>
                </div>
                <button
                  onClick={() => { setSelectedUserHash(''); setUserTimeline([]); }}
                  className="text-xs text-white/40 hover:text-white"
                >
                  إغلاق التايم لاين
                </button>
              </div>

              {isLoadingTimeline ? (
                <div className="py-8 text-center text-xs text-white/50">جاري تحميل سجل طلبات المستخدم...</div>
              ) : userTimeline.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-500/20">
                  {userTimeline.map((item: any, idx: number) => (
                    <div key={idx} className="mr-8 relative bg-white/5 border border-white/10 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="absolute -right-8 top-3.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-slate-900" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{item.service}</span>
                          <span className="font-mono text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
                            {item.actualModelId}
                          </span>
                          <span className="text-[10px] text-white/40">{new Date(item.timestamp).toLocaleTimeString('ar-EG')}</span>
                        </div>
                        <div className="text-[11px] text-white/60 flex items-center gap-3">
                          <span>Input: {item.inputTokens} tokens</span>
                          <span>Output: {item.outputTokens} tokens</span>
                          <span>Latency: {item.latencyMs}ms</span>
                        </div>
                      </div>

                      <div>
                        {item.success ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            Success 200
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            Failed ({item.httpStatus}) - {item.errorType || 'Error'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-white/40">لم يتم العثور على طلبات لهذا المستخدم.</div>
              )}
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-white/60 font-bold">
                  <tr>
                    <th className="p-4">Internal User ID</th>
                    <th className="p-4">الخطة (Plan)</th>
                    <th className="p-4">إجمالي الطلبات</th>
                    <th className="p-4">اليوم / الشهر</th>
                    <th className="p-4">إجمالي الـTokens</th>
                    <th className="p-4">أكثر Model استخداماً</th>
                    <th className="p-4">أكثر Feature استخداماً</th>
                    <th className="p-4">متوسط الاستجابة</th>
                    <th className="p-4">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersData && usersData.length > 0 ? (
                    usersData.map((u: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-purple-300">{u.internalUserId}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {u.plan}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white">{u.totalRequests?.toLocaleString()}</td>
                        <td className="p-4 text-white/80">{u.todayRequests} / {u.monthRequests}</td>
                        <td className="p-4 font-bold text-amber-400">{formatTokens(u.totalTokens)}</td>
                        <td className="p-4 font-mono text-[11px] text-cyan-300">{u.topModel || 'gemini-3.1-flash-lite'}</td>
                        <td className="p-4 text-white/80">{u.topFeature || 'Chat'}</td>
                        <td className="p-4 text-white/70">{u.avgLatencyMs || 0} ms</td>
                        <td className="p-4">
                          <button
                            onClick={() => { setSelectedUserHash(u.internalUserId); fetchUserTimeline(u.internalUserId); }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 font-bold border border-white/10 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> عرض Timeline
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-white/40">
                        جاري تجميع بيانات استخدام المستخدمين...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 4: PLAN MONITORING ---------------- */}
      {activeSubTab === 'plans' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              مقارنة استهلاك الخطط (Plan AI Usage Comparison)
            </h3>
            <p className="text-xs text-white/50">
              تحليل توزيع الاستهلاك والطلب والـTokens بين خطط Guest, Free, Basic, Pro, Max دون تعديل حدود الخطط الحالية.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-white/60 font-bold">
                  <tr>
                    <th className="p-4">الخطة (Plan)</th>
                    <th className="p-4">عدد المستخدمين النشطين</th>
                    <th className="p-4">إجمالي الطلبات (Requests)</th>
                    <th className="p-4">إجمالي الـTokens</th>
                    <th className="p-4">متوسط Tokens / مستخدم</th>
                    <th className="p-4">نسبة الاستهلاك الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(plansData.length > 0 ? plansData : [
                    { plan: 'Guest', users: 0, requests: 0, tokens: 0, avgPerUser: 0, pct: '0%' },
                    { plan: 'Free', users: 0, requests: 0, tokens: 0, avgPerUser: 0, pct: '0%' },
                    { plan: 'Basic', users: 0, requests: 0, tokens: 0, avgPerUser: 0, pct: '0%' },
                    { plan: 'Pro', users: 0, requests: 0, tokens: 0, avgPerUser: 0, pct: '0%' },
                    { plan: 'Max', users: 0, requests: 0, tokens: 0, avgPerUser: 0, pct: '0%' },
                  ]).map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          p.plan === 'Max' ? 'bg-amber-400' : p.plan === 'Pro' ? 'bg-purple-400' : p.plan === 'Basic' ? 'bg-indigo-400' : 'bg-emerald-400'
                        }`} />
                        <span>{p.plan}</span>
                      </td>
                      <td className="p-4 text-white/80">{p.users?.toLocaleString()}</td>
                      <td className="p-4 font-bold text-white">{p.requests?.toLocaleString()}</td>
                      <td className="p-4 font-bold text-amber-400">{formatTokens(p.tokens)}</td>
                      <td className="p-4 text-cyan-300 font-semibold">{formatTokens(p.avgPerUser)}</td>
                      <td className="p-4 text-purple-300 font-extrabold">{p.pct || '0%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 5: QUOTA & RATE LIMITS ---------------- */}
      {activeSubTab === 'quota' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                مراقبة حدود الاستخدام والـQuota والـRate Limits
              </h3>
              <p className="text-xs text-white/50">
                متابعة معدلات رفض الطلبات، أخطاء 429 و 500 والتنبيهات المباشرة عند اقتراب الحدود.
              </p>
            </div>
          </div>

          {/* Quota Threshold Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-200">🟡 Usage &gt; 70% Alert</div>
                <div className="text-[11px] text-amber-300/80">
                  {quotaData?.alerts?.yellowCount || 0} نموذج أو خدمة تجاوزت 70% من السعة
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-orange-200">🟠 Usage &gt; 85% Alert</div>
                <div className="text-[11px] text-orange-300/80">
                  {quotaData?.alerts?.orangeCount || 0} نموذج أو خدمة اقتربت من أقصى طاقة
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-200">🔴 Usage &gt; 95% Quota Exceeded</div>
                <div className="text-[11px] text-rose-300/80">
                  {quotaData?.alerts?.redCount || 0} طلب تم رفضه بسبب HTTP 429 Rate Limit
                </div>
              </div>
            </div>
          </div>

          {/* HTTP Status Code Distribution */}
          <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-white">توزيع استجابات HTTP Status Codes</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] text-emerald-300 font-bold">HTTP 200 OK</span>
                <div className="text-xl font-black text-emerald-400">{quotaData?.statusCodes?.['200'] || 0}</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[11px] text-amber-300 font-bold">HTTP 429 Rate Limit</span>
                <div className="text-xl font-black text-amber-400">{quotaData?.statusCodes?.['429'] || 0}</div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[11px] text-rose-300 font-bold">HTTP 403 Forbidden</span>
                <div className="text-xl font-black text-rose-400">{quotaData?.statusCodes?.['403'] || 0}</div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[11px] text-purple-300 font-bold">HTTP 500 Server Error</span>
                <div className="text-xl font-black text-purple-400">{quotaData?.statusCodes?.['500'] || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 6: EMBEDDINGS ---------------- */}
      {activeSubTab === 'embeddings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                مراقبة عمليات المتجهات والـEmbeddings
              </h3>
              <p className="text-xs text-white/50">
                إحصائيات توليد الأبعاد، استهلاك Token، وقاعدة بيانات البحث الدلالي Vector Database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">إجمالي عمليات Embedding</span>
              <div className="text-2xl font-black text-white">{embeddingsData?.totalOps?.toLocaleString() || 0}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">Model ID المستعمل</span>
              <div className="text-lg font-mono font-bold text-purple-300">{embeddingsData?.modelId || 'gemini-embedding-2-preview'}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">الأبعاد (Dimensions)</span>
              <div className="text-2xl font-black text-emerald-400">{embeddingsData?.dimensions || 768}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-[11px] font-semibold text-white/50">المتجهات المخزنة بالـDB</span>
              <div className="text-2xl font-black text-amber-400">{embeddingsData?.storedVectorsCount?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 7: COST ESTIMATION ---------------- */}
      {activeSubTab === 'cost' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                تقدير وإدارة تكاليف خدمات الذكاء الاصطناعي (AI Cost Estimation)
              </h3>
              <p className="text-xs text-white/50">
                حساب التكلفة الدقيقة للنماذج والمدخلات والمخرجات مع إمكانية تعديل تسعير الـ1M Tokens لكل موديل.
              </p>
            </div>

            <button
              onClick={() => { setEditingPrices(pricingConfig); setPricingModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Settings className="w-4 h-4" />
              تعديل أسعار النماذج (Model Pricing Config)
            </button>
          </div>

          {/* Pricing Table */}
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-white/60 font-bold">
                  <tr>
                    <th className="p-4">Model ID</th>
                    <th className="p-4">سعر 1M Input Tokens</th>
                    <th className="p-4">سعر 1M Output Tokens</th>
                    <th className="p-4">إجمالي Tokens المستخدمة</th>
                    <th className="p-4">التكلفة التقديرية الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {modelsData && modelsData.length > 0 ? (
                    modelsData.map((m: any, idx: number) => {
                      const p = pricingConfig[m.actualModelId] || { inputPricePer1M: 0.075, outputPricePer1M: 0.30 };
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono font-bold text-purple-300">{m.actualModelId}</td>
                          <td className="p-4 text-white/80">${p.inputPricePer1M} / 1M</td>
                          <td className="p-4 text-white/80">${p.outputPricePer1M} / 1M</td>
                          <td className="p-4 font-bold text-amber-400">{formatTokens(m.totalTokens)}</td>
                          <td className="p-4 font-bold text-emerald-400">{formatCost(m.estimatedCost)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-white/40">
                        جاري احتساب التكاليف التقديرية للنماذج...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB TAB 8: REQUEST LOGS ---------------- */}
      {activeSubTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                سجل طلبات الذكاء الاصطناعي الشامل (AI Request Logs)
              </h3>
              <p className="text-xs text-white/50">
                سجل كامل لجميع الـRequests مع الفلترة والتصفية وZero-PII Compliance.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={logsFilters.date || ''}
                onChange={(e) => { setLogsFilters({ ...logsFilters, date: e.target.value }); }}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              />

              <input
                type="text"
                placeholder="Model ID..."
                value={logsFilters.modelId === 'all' ? '' : logsFilters.modelId}
                onChange={(e) => { setLogsFilters({ ...logsFilters, modelId: e.target.value || 'all' }); }}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white w-32"
              />

              <select
                value={logsFilters.service}
                onChange={(e) => { setLogsFilters({ ...logsFilters, service: e.target.value }); }}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="all">كل الخدمات</option>
                <option value="Chat">Chat</option>
                <option value="Thinking">Thinking</option>
                <option value="Search">Search</option>
                <option value="Translation">Translation</option>
                <option value="Voice">Voice</option>
                <option value="Embedding">Embedding</option>
              </select>

              <select
                value={logsFilters.status}
                onChange={(e) => { setLogsFilters({ ...logsFilters, status: e.target.value }); }}
                className="bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="all">كل الحالات</option>
                <option value="success">ناجحة (HTTP 200)</option>
                <option value="failed">فاشلة / أخطاء</option>
              </select>

              <button
                onClick={() => fetchLogs(1)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer"
              >
                تطبيق الفلترة
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-white/60 font-bold">
                  <tr>
                    <th className="p-4">Request ID</th>
                    <th className="p-4">User Hash</th>
                    <th className="p-4">الخدمة</th>
                    <th className="p-4">Actual Model ID</th>
                    <th className="p-4">الخطة</th>
                    <th className="p-4">Tokens (In/Out)</th>
                    <th className="p-4">Latency</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs && logs.length > 0 ? (
                    logs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono text-[11px] text-white/60">{log.id?.substring(0, 14)}...</td>
                        <td className="p-4 font-mono text-purple-300 font-bold">{log.internalUserId}</td>
                        <td className="p-4 font-bold text-white">{log.service}</td>
                        <td className="p-4 font-mono text-cyan-300 text-[11px]">{log.actualModelId}</td>
                        <td className="p-4 text-white/70">{log.userPlan}</td>
                        <td className="p-4 text-amber-400 font-bold">
                          {log.inputTokens} / {log.outputTokens}
                        </td>
                        <td className="p-4 text-white/80">{log.latencyMs} ms</td>
                        <td className="p-4">
                          {log.success ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                              200 OK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                              {log.httpStatus} {log.errorType || 'Error'}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedRequestLog(log)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 cursor-pointer"
                            title="تفاصيل الطلب الكاملة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-white/40">
                        لا توجد سجلات طلبات مطابقة للفلترة الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
              <div>الصفحة {logsPagination.page} من {logsPagination.totalPages} (إجمالي {logsPagination.total} طلب)</div>
              <div className="flex items-center gap-2">
                <button
                  disabled={logsPagination.page <= 1}
                  onClick={() => fetchLogs(logsPagination.page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 text-white cursor-pointer"
                >
                  السابق
                </button>
                <button
                  disabled={logsPagination.page >= logsPagination.totalPages}
                  onClick={() => fetchLogs(logsPagination.page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 text-white cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {pricingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-lg w-full space-y-5 text-right font-sans dir-rtl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              تعديل أسعار النماذج (Model Pricing per 1M Tokens)
            </h3>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {Object.keys(editingPrices).map((mId) => (
                <div key={mId} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-xs font-mono font-bold text-purple-300">{mId}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1">Input Price ($/1M)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={editingPrices[mId]?.inputPricePer1M ?? 0.075}
                        onChange={(e) => setEditingPrices({
                          ...editingPrices,
                          [mId]: { ...editingPrices[mId], inputPricePer1M: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 block mb-1">Output Price ($/1M)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={editingPrices[mId]?.outputPricePer1M ?? 0.30}
                        onChange={(e) => setEditingPrices({
                          ...editingPrices,
                          [mId]: { ...editingPrices[mId], outputPricePer1M: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPricingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePricing}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                حفظ الأسعار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Request Details Modal */}
      {selectedRequestLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-lg w-full space-y-4 text-right font-sans dir-rtl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                تفاصيل الطلب (Request Telemetry)
              </h3>
              <button onClick={() => setSelectedRequestLog(null)} className="text-xs text-white/40 hover:text-white">
                إغلاق
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-white/80 max-h-[400px] overflow-y-auto pr-1">
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Request ID:</span>
                <span className="text-purple-300 font-bold">{selectedRequestLog.id}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">User ID (Hash):</span>
                <span className="text-white">{selectedRequestLog.internalUserId}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Timestamp:</span>
                <span className="text-white">{selectedRequestLog.timestamp}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Provider:</span>
                <span className="text-white">{selectedRequestLog.apiProvider}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Actual Model ID:</span>
                <span className="text-cyan-300 font-bold">{selectedRequestLog.actualModelId}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Service / Feature:</span>
                <span className="text-white">{selectedRequestLog.service}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">User Plan:</span>
                <span className="text-amber-300 font-bold">{selectedRequestLog.userPlan}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Input Tokens:</span>
                <span className="text-white">{selectedRequestLog.inputTokens}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Output Tokens:</span>
                <span className="text-white">{selectedRequestLog.outputTokens}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Total Tokens:</span>
                <span className="text-amber-400 font-bold">{selectedRequestLog.totalTokens}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">Latency:</span>
                <span className="text-white">{selectedRequestLog.latencyMs} ms</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/40">HTTP Status:</span>
                <span className="text-white">{selectedRequestLog.httpStatus}</span>
              </div>
              {selectedRequestLog.failureReason && (
                <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                  <strong>Failure Reason:</strong> {selectedRequestLog.failureReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
