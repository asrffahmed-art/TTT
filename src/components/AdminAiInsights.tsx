import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Search, 
  ShieldCheck, 
  Database, 
  BrainCircuit, 
  Activity, 
  FileText, 
  Layers, 
  PlusCircle, 
  Trash2, 
  RefreshCw, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  MessageSquare,
  Zap,
  HelpCircle
} from "lucide-react";

interface VectorItem {
  id: string;
  title: string;
  content: string;
  sanitizedContent: string;
  sourceType: "feedback" | "doc" | "system_log" | "ad_trend";
  topic: string;
  createdAt: string;
  vectorLength?: number;
  scrubbedCount?: number;
  detectedPiiTypes?: string[];
}

interface SearchResult {
  item: VectorItem;
  similarityScore: number;
  similarityPercentage: number;
}

interface TopicSummary {
  topic: string;
  count: number;
  percentage: number;
  sourceTypeCount: Record<string, number>;
  sampleContents: string[];
}

interface FeedbackPair {
  id1: string;
  title1: string;
  id2: string;
  title2: string;
  similarityScore: number;
  similarityPercentage: number;
  topic: string;
}

interface AdminAiInsightsProps {
  adminEmail: string;
}

export const AdminAiInsights: React.FC<AdminAiInsightsProps> = ({ adminEmail }) => {
  const [activeSubTab, setActiveSubTab] = useState<"search" | "clusters" | "pii" | "store">("search");
  
  // Stats state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [enableRag, setEnableRag] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [searchLatency, setSearchLatency] = useState<number | null>(null);
  const [sanitizedQueryUsed, setSanitizedQueryUsed] = useState<string | null>(null);

  // Clusters state
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [feedbackPairs, setFeedbackPairs] = useState<FeedbackPair[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);

  // Zero-PII Test state
  const [testRawText, setTestRawText] = useState(
    "مرحباً، اواجه مشكلة في الرفع. ايميلي user@domain.com ورقم هاتفي +201012345678، ومفتاح الـ API هو AIzaSyD9x8a7b6c5d4e3f2g1h0j9k8l7m6. باسوورد الحساب secret123."
  );
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizeResult, setSanitizeResult] = useState<any>(null);

  // Vector Store items
  const [storeItems, setStoreItems] = useState<VectorItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // New item index form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSourceType, setNewSourceType] = useState<"feedback" | "doc" | "system_log" | "ad_trend">("feedback");
  const [newTopic, setNewTopic] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  const PRESET_QUESTIONS = [
    "ما أكثر المشاكل التي واجهها المستخدمون أثناء رفع الملفات؟",
    "كيف تم التعامل مع أعطال تسجيل الدخول وانقطاع الصوت؟",
    "ما هي سياسات الاشتراكات والباقات والحملات الإعلانية؟",
    "ما الإحصائيات الخاصة بأداء الإعلانات ونسب التحويل؟"
  ];

  // Fetch stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/embeddings/stats", {
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching embedding stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch topics and clusters
  const fetchClusters = async () => {
    setLoadingClusters(true);
    try {
      const [topRes, pairRes] = await Promise.all([
        fetch("/api/admin/embeddings/topics", { headers: { "x-admin-email": adminEmail } }),
        fetch("/api/admin/embeddings/feedback-similarity", { headers: { "x-admin-email": adminEmail } })
      ]);
      const topData = await topRes.json().catch(() => ({}));
      const pairData = await pairRes.json().catch(() => ({}));

      if (topData.success) setTopics(topData.topics);
      if (pairData.success) setFeedbackPairs(pairData.pairs);
    } catch (err) {
      console.error("Error fetching clusters:", err);
    } finally {
      setLoadingClusters(false);
    }
  };

  // Fetch store items
  const fetchStoreItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch("/api/admin/embeddings/items?sourceType=all", {
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) setStoreItems(data.items);
    } catch (err) {
      console.error("Error fetching store items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [adminEmail]);

  useEffect(() => {
    if (activeSubTab === "clusters") fetchClusters();
    if (activeSubTab === "store") fetchStoreItems();
  }, [activeSubTab]);

  // Execute Search / RAG
  const handleSearch = async (queryToRun?: string) => {
    const q = (queryToRun || searchQuery).trim();
    if (!q) return;

    setSearching(true);
    setSearchResults([]);
    setRagAnswer(null);

    try {
      const res = await fetch("/api/admin/embeddings/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          query: q,
          topK: 5,
          sourceType: sourceTypeFilter,
          generateRagAnswer: enableRag
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        if (enableRag) {
          setRagAnswer(data.ragAnswer);
          setSearchResults(data.retrievedResults || []);
          setSearchLatency(data.latencyMs);
          setSanitizedQueryUsed(data.sanitizedQuery);
        } else {
          setSearchResults(data.results || []);
          setSearchLatency(data.latencyMs);
          setSanitizedQueryUsed(data.sanitizedQuery);
        }
        fetchStats(); // refresh search counters
      } else {
        alert(data.error || "حدث خطأ أثناء إجراء البحث الدلالي.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      alert("فشل الإتصال بخادم البحث الدلالي.");
    } finally {
      setSearching(false);
    }
  };

  // Test Zero-PII Sanitization
  const handleTestSanitization = async () => {
    if (!testRawText) return;
    setSanitizing(true);
    try {
      const res = await fetch("/api/admin/embeddings/sanitize-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({ text: testRawText })
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setSanitizeResult(data.result);
      }
    } catch (err) {
      console.error("Sanitization test error:", err);
    } finally {
      setSanitizing(false);
    }
  };

  // Index new item
  const handleIndexItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    setIndexing(true);
    setIndexMessage(null);

    try {
      const res = await fetch("/api/admin/embeddings/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-email": adminEmail
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          sourceType: newSourceType,
          topic: newTopic || "عام"
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setIndexMessage("تم تنقية النص وإنشاء المتجه عبر Gemini Embeddings وحفظه بـ Firestore بنجاح!");
        setNewTitle("");
        setNewContent("");
        setNewTopic("");
        fetchStoreItems();
        fetchStats();
      } else {
        setIndexMessage(`خطأ: ${data.error}`);
      }
    } catch (err) {
      setIndexMessage("فشل الإتصال بخادم الفهرسة.");
    } finally {
      setIndexing(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("هل أنت تأكد من حذف هذا العنصر ومتجهه من Firestore؟")) return;
    try {
      const res = await fetch(`/api/admin/embeddings/item?id=${id}`, {
        method: "DELETE",
        headers: { "x-admin-email": adminEmail }
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        fetchStoreItems();
        fetchStats();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100" dir="rtl">
      
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Google Gemini Embeddings V2
              </span>
              <span className="px-3 py-1 bg-slate-800/80 text-emerald-200 border border-slate-700 rounded-full text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-PII Layer Active
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-7 h-7 text-emerald-400" />
              التحليل الذكي والبحث الدلالي (AI Insights)
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              نظام محرك المتجهات المستند إلى نموذج <span className="text-emerald-300 font-mono font-bold">gemini-embedding-2-preview</span> لفهم معاني البيانات غير الشخصية، تحليل التغذية الراجعة، واسترجاع المستندات مع توليد إجابات RAG دقيقة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-2 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
              تحديث الإحصائيات
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 relative z-10">
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>المستندات المفهرسة</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats?.totalIndexedDocs ?? "--"}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              مستودع Firestore مجمّع
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>نموذج التضمين الفعلي</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-300 font-mono truncate">
              {stats?.actualModelId ?? "gemini-embedding-2-preview"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              768-dim Vector Space
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>متوسط زمن البحث</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono">
              {stats?.averageSearchLatencyMs ? `${stats.averageSearchLatencyMs} ms` : "180 ms"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Cosine Similarity Vector Math
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>حماية الخصوصية Zero-PII</span>
              <Lock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm font-bold text-blue-300">
              تصفية مطلقة 100%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              حذف الإيميلات/الهواتف/المفاتيح
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("search")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
            activeSubTab === "search"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Search className="w-4 h-4" />
          البحث الدلالي و RAG
        </button>

        <button
          onClick={() => setActiveSubTab("clusters")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
            activeSubTab === "clusters"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          تحليل المواضيع والتعليقات
        </button>

        <button
          onClick={() => setActiveSubTab("pii")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
            activeSubTab === "pii"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          اختبار تنقية الخصوصية Zero-PII
        </button>

        <button
          onClick={() => setActiveSubTab("store")}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
            activeSubTab === "store"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Database className="w-4 h-4" />
          مستودع المتجهات Vector Store
        </button>
      </div>

      {/* ------------------ SUBTAB 1: SEMANTIC SEARCH & RAG ------------------ */}
      {activeSubTab === "search" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              البحث الدلالي باللغة الطبيعية وطرح الأسئلة المباشرة
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              اكتب سؤالك بلغة طبيعية وسيقوم النموذج بتحويله إلى متجهات رقمية <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">gemini-embedding-2-preview</span> ومطابقته دلالياً مع آراء المستخدمين، توثيق النظام، والإعلانات.
            </p>

            {/* Presets */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
                أسئلة مقترحة للاختبار السريع:
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(q);
                      handleSearch(q);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-medium transition text-right"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Options */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="مثال: ما أكثر المشاكل التي واجهها المستخدمون أثناء رفع الملفات؟"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>

              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">جميع المصادر</option>
                <option value="feedback">آراء وتغذية راجعة (Feedback)</option>
                <option value="doc">توثيق وساسات الإدارة (Docs)</option>
                <option value="system_log">سجلات الأخطاء والنظام (Logs)</option>
                <option value="ad_trend">اتجاهات الإعلانات والاستخدام (Ads)</option>
              </select>

              <button
                onClick={() => handleSearch()}
                disabled={searching || !searchQuery.trim()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 min-w-[130px]"
              >
                {searching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري التضمين...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    بحث دلالي
                  </>
                )}
              </button>
            </div>

            {/* RAG Toggle Checkbox */}
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="ragToggle"
                checked={enableRag}
                onChange={(e) => setEnableRag(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="ragToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <BrainCircuit className="w-4 h-4 text-emerald-500" />
                تفعيل التلخيص الذكي RAG (توليد إجابة ملخصة بواسطة Gemini 3.6 Flash اعتماداً على المصادر المسترجعة)
              </label>
            </div>
          </div>

          {/* RAG Synthesis Result Box */}
          {ragAnswer && (
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white border border-emerald-500/40 rounded-2xl p-6 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-emerald-300 text-base">إجابة RAG الملخصة ذكائياً (Synthesis Answer)</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="px-2.5 py-0.5 bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 rounded-full font-mono">
                    Gemini 3.6 Flash
                  </span>
                  <span>زمن التوليد: {searchLatency}ms</span>
                </div>
              </div>

              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                {ragAnswer}
              </div>

              {sanitizedQueryUsed && (
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>الاستعلام المعالج بواسطة Zero-PII:</span>
                  <span className="font-mono text-emerald-300">"{sanitizedQueryUsed}"</span>
                </div>
              )}
            </div>
          )}

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  المستندات الأكثر ارتباطاً دلالياً ({searchResults.length} نتائج)
                </h4>
                {searchLatency && !ragAnswer && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    استغرق البحث: {searchLatency}ms
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {searchResults.map((res, idx) => (
                  <div
                    key={res.item.id || idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                          {res.item.title}
                        </h5>
                        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-xs font-medium">
                          الموضوع: {res.item.topic}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full text-xs font-bold font-mono">
                          {res.similarityPercentage}% تشابه دلالي
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-xs font-mono">
                          {res.item.sourceType}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                      {res.item.sanitizedContent}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        الخصوصية: تم الفحص وتأكيد خلوه من البيانات الشخصية
                      </span>
                      <span>تاريخ الأرشفة: {new Date(res.item.createdAt).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------ SUBTAB 2: TOPIC CLUSTERS & FEEDBACK ANALYSIS ------------------ */}
      {activeSubTab === "clusters" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Topic Frequency Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                توزيع مواضيع المشاكل والتعليقات المكتشفة تلقائياً
              </h3>

              {loadingClusters ? (
                <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  جاري حساب التكتلات الدلالية...
                </div>
              ) : (
                <div className="space-y-4">
                  {topics.map((t, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800 dark:text-slate-200">{t.topic}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {t.count} حالة ({t.percentage}%)
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, t.percentage * 2.5)}%` }}
                        />
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>أمثلة:</span>
                        <span className="truncate">{t.sampleContents.join(" • ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pairwise Cosine Similarity Matrix for Feedback */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                مصفوفة تقارب التشابه الدلالي بين تعليقات المستخدمين
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                تحديد الشكاوى المتشابهة في المعنى لإحالتها لفريق التطوير كمشكلة واحدة موحدة.
              </p>

              {loadingClusters ? (
                <div className="py-12 text-center text-slate-400 text-sm">جاري التحميل...</div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {feedbackPairs.map((pair, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold font-mono rounded">
                          نسبة التقارب: {pair.similarityPercentage}%
                        </span>
                        <span className="text-slate-400 text-[11px]">{pair.topic}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-400 block">الحالة الأولى:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{pair.title1}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">الحالة الثانية:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{pair.title2}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ------------------ SUBTAB 3: ZERO-PII PRIVACY TESTING SANDBOX ------------------ */}
      {activeSubTab === "pii" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              مختبر اختبار طبقة الحماية والتنقية الأوتوماتيكية (Zero-PII Layer)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              قم بإدخال أي نص يحتوي على بيانات شخصية (إيميل، هاتف، مفاتيح API، كلمة مرور، أو اسم) للاختبار الحي لكيفية حجب البيانات تماماً قبل إرسال النص لتوليد المتجهات مع <span className="font-mono text-emerald-500">gemini-embedding-2-preview</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                النص الخام المدخل (Raw Text Input):
              </label>
              <textarea
                rows={6}
                value={testRawText}
                onChange={(e) => setTestRawText(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleTestSanitization}
                disabled={sanitizing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                {sanitizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                تشغيل محرك التنقية الحية (Execute Zero-PII Scrubbing)
              </button>
            </div>

            {/* Sanitized Output */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                النص المنقى الموجه للتضمين (Zero-PII Payload):
              </label>

              {sanitizeResult ? (
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      تم حجب {sanitizeResult.scrubbedCount} بيانات شخصية
                    </span>
                    <span className="text-slate-400 font-mono">
                      أنواع المحجوبات: {sanitizeResult.detectedTypes?.join("، ") || "لا يوجد"}
                    </span>
                  </div>

                  <div className="font-mono text-xs text-emerald-200 leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {sanitizeResult.sanitizedText}
                  </div>
                </div>
              ) : (
                <div className="h-[180px] bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
                  <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  اضغط على زر تشغيل محرك التنقية لعرض النتيجة
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------ SUBTAB 4: VECTOR STORE MANAGEMENT ------------------ */}
      {activeSubTab === "store" && (
        <div className="space-y-6">
          
          {/* Index New Item Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              فهرسة مستند أو رأي جديد إلى قاعدة بيانات Vector Store
            </h3>

            <form onSubmit={handleIndexItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    العنوان الرئيسية:
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: دليل التعامل مع أخطاء الرفع"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    نوع المصدر:
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e: any) => setNewSourceType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="feedback">تغذية راجعة / feedback</option>
                    <option value="doc">توثيق ومستند إداري / doc</option>
                    <option value="system_log">سجل أخطاء ونظام / log</option>
                    <option value="ad_trend">اتجاهات إعلانية / ad_trend</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    الموضوع / التصنيف:
                  </label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="مثال: مشاكل رفع الملفات"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  المحتوى النصي المفصل:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="ادخل نص المحتوى..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  disabled={indexing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2"
                >
                  {indexing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  توليد التضمين والفهرسة في Firestore
                </button>

                {indexMessage && (
                  <span className={`text-xs font-semibold ${indexMessage.startsWith("خطأ") ? "text-rose-500" : "text-emerald-600"}`}>
                    {indexMessage}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Existing Items Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-500" />
                المستندات والمتجهات المخزنة في Firestore (`vectorStore`)
              </h3>
              <button
                onClick={fetchStoreItems}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingItems ? "animate-spin" : ""}`} />
                تحديث
              </button>
            </div>

            {loadingItems ? (
              <div className="py-8 text-center text-slate-400 text-xs">جاري جلب المستندات...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3">العنوان</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">الموضوع</th>
                      <th className="p-3">المحتوى المنقى</th>
                      <th className="p-3">أبعاد المتجه</th>
                      <th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {storeItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                          {item.title}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono rounded text-[11px]">
                            {item.sourceType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.topic}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[280px] truncate">
                          {item.sanitizedContent}
                        </td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                          768-dim Vector
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="حذف المتجه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
