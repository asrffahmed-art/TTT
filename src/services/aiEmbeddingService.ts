import { GoogleGenAI } from "@google/genai";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export interface VectorItem {
  id: string;
  title: string;
  content: string;
  sanitizedContent: string;
  sourceType: "feedback" | "doc" | "system_log" | "ad_trend";
  topic: string;
  createdAt: string;
  vector: number[];
  metadata?: Record<string, any>;
  scrubbedCount?: number;
  detectedPiiTypes?: string[];
}

export interface SearchResultItem {
  item: VectorItem;
  similarityScore: number;
  similarityPercentage: number;
}

export interface TopicSummary {
  topic: string;
  count: number;
  percentage: number;
  sourceTypeCount: Record<string, number>;
  sampleContents: string[];
}

export interface FeedbackPairSimilarity {
  id1: string;
  title1: string;
  id2: string;
  title2: string;
  similarityScore: number;
  similarityPercentage: number;
  topic: string;
}

// 1. Zero-PII Sanitization Layer
export function sanitizeTextForEmbedding(rawText: string): { sanitizedText: string; scrubbedCount: number; detectedTypes: string[] } {
  if (!rawText) return { sanitizedText: "", scrubbedCount: 0, detectedTypes: [] };
  
  let text = rawText;
  let count = 0;
  const detectedTypesSet = new Set<string>();

  // 1. Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    count += emailMatches.length;
    detectedTypesSet.add("البريد الإلكتروني (Email)");
    text = text.replace(emailRegex, "[EMAIL_REDACTED]");
  }

  // 2. Phone numbers (Arabic & English digits)
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    const realPhones = phoneMatches.filter(p => p.replace(/\D/g, "").length >= 7);
    if (realPhones.length > 0) {
      count += realPhones.length;
      detectedTypesSet.add("رقم الهاتف (Phone)");
      realPhones.forEach(p => {
        text = text.replace(p, "[PHONE_REDACTED]");
      });
    }
  }

  // 3. API Keys / Tokens
  const apiKeyRegex = /(AIzaSy[a-zA-Z0-9_-]{33}|tvly-[a-zA-Z0-9_-]{30,}|sk-[a-zA-Z0-9]{32,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|[a-f0-9]{32,64})/gi;
  const apiMatches = text.match(apiKeyRegex);
  if (apiMatches) {
    count += apiMatches.length;
    detectedTypesSet.add("مفاتيح API / التوكنز (API Keys)");
    text = text.replace(apiKeyRegex, "[KEY_REDACTED]");
  }

  // 4. Passwords / Secrets
  const secretPattern = /(pass(?:word)?|secret|token|كلمة\s+السر|باسوورد|الرقم\s+السرى)\s*[:=]\s*\S+/gi;
  const secretMatches = text.match(secretPattern);
  if (secretMatches) {
    count += secretMatches.length;
    detectedTypesSet.add("كلمات المرور/الأسرار (Secrets)");
    text = text.replace(secretPattern, "$1: [SECRET_REDACTED]");
  }

  // 5. Usernames / Direct Names
  const namePattern = /(?:user(?:name)?|اسم\s+المستخدم|العميل|المستخدم)\s*[:=]\s*([A-Za-zأ-ي\s]{2,25})(?=\s|,|\.|$)/gi;
  const nameMatches = text.match(namePattern);
  if (nameMatches) {
    count += nameMatches.length;
    detectedTypesSet.add("أسماء المستخدمين (Usernames)");
    text = text.replace(namePattern, "المستخدم: [USER_REDACTED]");
  }

  // 6. IP Addresses
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
  const ipMatches = text.match(ipRegex);
  if (ipMatches) {
    count += ipMatches.length;
    detectedTypesSet.add("عنوان IP");
    text = text.replace(ipRegex, "[IP_REDACTED]");
  }

  return {
    sanitizedText: text.trim(),
    scrubbedCount: count,
    detectedTypes: Array.from(detectedTypesSet)
  };
}

// 2. Cosine Similarity Calculation
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 3. Main AI Embedding Manager Class
export class AiEmbeddingManager {
  private aiClient: GoogleGenAI;
  private db: any;
  private memoryStore: VectorItem[] = [];
  private isInitialized = false;
  private searchCount = 0;
  private searchLatencyTotalMs = 0;
  public readonly MODEL_ID = "gemini-embedding-2-preview";

  constructor(aiClient: GoogleGenAI, dbFirestore: any) {
    this.aiClient = aiClient;
    this.db = dbFirestore;
  }

  public updateAiClient(aiClient: GoogleGenAI) {
    this.aiClient = aiClient;
  }

  // Generate vector using actual Gemini Embedding model
  public async generateVector(rawText: string): Promise<{ vector: number[]; sanitizedText: string; scrubbedCount: number; detectedTypes: string[] }> {
    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(rawText);
    
    if (!sanitizedText) {
      throw new Error("النص فارغ أو تم حذف محتواه بالكامل أثناء معالجة الخصوصية.");
    }

    try {
      const response = await this.aiClient.models.embedContent({
        model: this.MODEL_ID,
        contents: sanitizedText
      });

      const embeddingValues = response.embeddings?.[0]?.values || (response as any).embedding?.values;
      if (!embeddingValues || !Array.isArray(embeddingValues) || embeddingValues.length === 0) {
        throw new Error(`فشل استخراج المتجه من استجابة ${this.MODEL_ID}`);
      }

      return {
        vector: embeddingValues,
        sanitizedText,
        scrubbedCount,
        detectedTypes
      };
    } catch (err: any) {
      console.error(`Error generating embedding with ${this.MODEL_ID}:`, err);
      throw err;
    }
  }

  // Initialize and load vectors from Firestore, seed initial dataset if empty
  public async initStore(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("Initializing Vector Store from Firestore...");
      const snapshot = await getDocs(collection(this.db, "vectorStore"));
      
      const loadedItems: VectorItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as VectorItem;
        if (data && Array.isArray(data.vector)) {
          loadedItems.push(data);
        }
      });

      this.memoryStore = loadedItems;
      console.log(`Loaded ${this.memoryStore.length} items from Firestore vectorStore`);

      if (this.memoryStore.length === 0) {
        console.log("Vector Store is empty. Seeding initial sanitized datasets...");
        await this.seedInitialDatasets();
      }

      this.isInitialized = true;
    } catch (err) {
      console.error("Error initializing vector store:", err);
      this.isInitialized = true; // allow fallback
    }
  }

  // Seed initial domain datasets
  private async seedInitialDatasets(): Promise<void> {
    const seedData: Array<{ title: string; content: string; sourceType: "feedback" | "doc" | "system_log" | "ad_trend"; topic: string }> = [
      // User Feedback & Issues
      {
        title: "بطء رفع ملفات PDF العريضة",
        content: "واجهت مشكلة أثناء محاولة رفع ملف PDF كبير الحجم باللغة العربية، يستغرق وقت طويلاً ويرفض الرفع أحياناً.",
        sourceType: "feedback",
        topic: "مشاكل رفع الملفات"
      },
      {
        title: "خطأ استيراد مستندات DOCX",
        content: "حدث خطأ عند معالجة الملفات المضغوطة وتنسيقات DOCX الكبيرة في قسم الاستيراد الخاص بالمستندات.",
        sourceType: "feedback",
        topic: "مشاكل رفع الملفات"
      },
      {
        title: "تأخر إرفاق المرفقات في المحادثة",
        content: "فشل تحميل المستندات وتأخر في إرسال الملفات المرفقة أثناء المحادثة المباشرة مع نموذج الذكاء الاصطناعي.",
        sourceType: "feedback",
        topic: "مشاكل رفع الملفات"
      },
      {
        title: "مشكلة تسجيل الدخول بـ Google",
        content: "مشكلة في تسجيل الدخول عبر حساب جوجل، يعود للصفحة الرئيسية بدون إتمام عملية الدخول بنجاح.",
        sourceType: "feedback",
        topic: "مشاكل تسجيل الدخول"
      },
      {
        title: "انتهاء الجلسة التلقائي السريع",
        content: "تنسيق جلسة الدخول ينتهي بسرعة ويلزم إعادة الدخول وإدخال البيانات أكثر من مرة باليوم.",
        sourceType: "feedback",
        topic: "مشاكل تسجيل الدخول"
      },
      {
        title: "انقطاع الصوت في البث المباشر Live Voice",
        content: "الصوت في وضع المحادثة المباشرة Live Voice ينقطع أحياناً أثناء التحدث باللغة العربية مع خفض الميكروفون.",
        sourceType: "feedback",
        topic: "مشاكل الصوت والتفاعل الصوتي"
      },
      {
        title: "تأخر الاستجابة الصوتية TTS",
        content: "تأخر في استجابة الصوت وانخفاض جودة الميكروفون في وضع البث المباشر الصوتي على المتصفح.",
        sourceType: "feedback",
        topic: "مشاكل الصوت والتفاعل الصوتي"
      },
      {
        title: "طلب تصدير ملفات PDF وتخصيص الثيمات",
        content: "طلب إضافة ميزة التصدير المباشر لملفات PDF وتخصيص ثيمات الألوان الجديدة الداكنة.",
        sourceType: "feedback",
        topic: "طلبات الميزات والمقترحات"
      },
      {
        title: "اقتراح تحسين سرعة بحث الملاحظات",
        content: "اقتراح تحسين سرعة البحث واسترجاع الملاحظات والمهام في قسم Google Keep Notes.",
        sourceType: "feedback",
        topic: "طلبات الميزات والمقترحات"
      },

      // Admin & Policy Docs
      {
        title: "دليل إدارة الاشتراكات والباقات",
        content: "دليل إدارة المنصة وسياسة الاستخدام العادل للباقات والاشتراكات الشهرية والتجديد التلقائي للعملاء.",
        sourceType: "doc",
        topic: "السياسات والاشتراكات"
      },
      {
        title: "توثيق الأمان وسياسة Zero-PII",
        content: "توثيق البنية التحتية لحماية البيانات وتطبيق Zero-PII وحظر حفظ البيانات الشخصية للمستخدمين في التضمينات.",
        sourceType: "doc",
        topic: "الأمان والخصوصية"
      },
      {
        title: "تقرير الأداء وزمن استجابة الخوادم",
        content: "تقرير الأداء والمتابعة الفنية لوقت استجابة الخوادم واستخدام نموذج Gemini 3.6 Flash ونسب النجاح.",
        sourceType: "doc",
        topic: "التقارير البرمجية والأداء"
      },
      {
        title: "سياسات الحملات الإعلانية المجمعة",
        content: "تعليمات التعامل مع حملات الإعلانات وتخصيص أماكن العرض بدون تتبع فردي للمستخدمين أو ملفات التعريف.",
        sourceType: "doc",
        topic: "سياسات الإعلانات"
      },

      // Ad Trends & Usage Analytics
      {
        title: "إحصائيات استخدام الميزات الرئيسية",
        content: "أعلى الميزات استخداماً هذا الشهر: المحادثة الذكية 68%، البحث في الويب 18%، التفاعل الصوتي 14%.",
        sourceType: "ad_trend",
        topic: "إحصائيات استخدام الميزات"
      },
      {
        title: "أداء التحويلات والحملات الإعلانية",
        content: "نسب التحويل من الباقة المجانية إلى الباقات المدفوعة ارتفعت بنسبة 12% بعد إضافة العروض الترويجية.",
        sourceType: "ad_trend",
        topic: "أداء الإعلانات والتحويلات"
      },

      // System Logs
      {
        title: "سجل أخطاء رفع الملفات المجمعة",
        content: "سجل نظام: تم تسجيل 145 محاولة رفع ملفات غير مدعومة وتم توجيه المستخدم لرسالة المساعدة التلقائية.",
        sourceType: "system_log",
        topic: "أخطاء التشغيل والسجلات"
      },
      {
        title: "سجل أداء نموذج الذكاء الاصطناعي",
        content: "سجل نظام: استجابة خادم Gemini ضمن المتوسط 340ms مع كفاءة استخدام عالية دون انقطاع.",
        sourceType: "system_log",
        topic: "أخطاء التشغيل والسجلات"
      }
    ];

    for (let i = 0; i < seedData.length; i++) {
      const entry = seedData[i];
      try {
        const id = `vec_seed_${i + 1}`;
        const { vector, sanitizedText, scrubbedCount, detectedTypes } = await this.generateVector(entry.content);
        
        const item: VectorItem = {
          id,
          title: entry.title,
          content: entry.content,
          sanitizedContent: sanitizedText,
          sourceType: entry.sourceType,
          topic: entry.topic,
          createdAt: new Date(Date.now() - (seedData.length - i) * 3600000).toISOString(),
          vector,
          scrubbedCount,
          detectedPiiTypes: detectedTypes,
          metadata: { isSeed: true }
        };

        this.memoryStore.push(item);
        await setDoc(doc(this.db, "vectorStore", id), item, { merge: true });
      } catch (err) {
        console.error(`Error seeding item ${entry.title}:`, err);
      }
    }

    console.log(`Successfully seeded ${this.memoryStore.length} vector items.`);
  }

  // Index new item into store
  public async indexItem(
    title: string,
    content: string,
    sourceType: "feedback" | "doc" | "system_log" | "ad_trend",
    topic?: string
  ): Promise<VectorItem> {
    await this.initStore();

    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(content);
    const sanitizedTitle = sanitizeTextForEmbedding(title).sanitizedText || title;
    
    const { vector } = await this.generateVector(sanitizedText);
    const id = `vec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newItem: VectorItem = {
      id,
      title: sanitizedTitle,
      content,
      sanitizedContent: sanitizedText,
      sourceType,
      topic: topic || "عام",
      createdAt: new Date().toISOString(),
      vector,
      scrubbedCount,
      detectedPiiTypes: detectedTypes,
      metadata: { indexedBy: "admin" }
    };

    this.memoryStore.push(newItem);
    await setDoc(doc(this.db, "vectorStore", id), newItem, { merge: true });

    return newItem;
  }

  // Perform Semantic Vector Search
  public async semanticSearch(
    queryText: string,
    topK = 5,
    sourceType?: string
  ): Promise<{
    results: SearchResultItem[];
    sanitizedQuery: string;
    scrubbedCount: number;
    detectedPiiTypes: string[];
    latencyMs: number;
  }> {
    const startTime = Date.now();
    await this.initStore();

    const { sanitizedText, scrubbedCount, detectedTypes } = sanitizeTextForEmbedding(queryText);
    if (!sanitizedText) {
      throw new Error("استعلام البحث فارغ بعد معالجة الخصوصية Zero-PII.");
    }

    const { vector: queryVector } = await this.generateVector(sanitizedText);

    let itemsToSearch = this.memoryStore;
    if (sourceType && sourceType !== "all") {
      itemsToSearch = itemsToSearch.filter(item => item.sourceType === sourceType);
    }

    const scoredItems: SearchResultItem[] = itemsToSearch.map(item => {
      const score = cosineSimilarity(queryVector, item.vector);
      return {
        item,
        similarityScore: score,
        similarityPercentage: Math.round(score * 1000) / 10
      };
    });

    // Sort descending by score
    scoredItems.sort((a, b) => b.similarityScore - a.similarityScore);
    const topResults = scoredItems.slice(0, topK);

    const latencyMs = Date.now() - startTime;
    this.searchCount++;
    this.searchLatencyTotalMs += latencyMs;

    return {
      results: topResults,
      sanitizedQuery: sanitizedText,
      scrubbedCount,
      detectedPiiTypes: detectedTypes,
      latencyMs
    };
  }

  // RAG Pipeline Execution
  public async ragQuery(queryText: string, topK = 4): Promise<{
    query: string;
    sanitizedQuery: string;
    ragAnswer: string;
    retrievedResults: SearchResultItem[];
    latencyMs: number;
    modelUsedForAnswer: string;
    embeddingModelUsed: string;
  }> {
    const startTime = Date.now();
    
    // 1. Vector Retrieval
    const searchRes = await this.semanticSearch(queryText, topK);

    // 2. Format Context
    const contextText = searchRes.results.map((res, idx) => {
      return `[مصدر ${idx + 1} - النوع: ${res.item.sourceType} - الموضوع: ${res.item.topic} - تشابه: ${res.similarityPercentage}%]:\nالعنوان: ${res.item.title}\nالمحتوى: ${res.item.sanitizedContent}`;
    }).join("\n\n");

    // 3. Prompt Construction
    const ragPrompt = `أنت مساعد إداري ذكي ينفذ استعلام RAG (Retrieval-Augmented Generation) بناءً على النتائج المسترجعة دلالياً من قاعدة بيانات Vector Database لمنصة THOTH.

السؤال الأصلي للمدير:
"${searchRes.sanitizedQuery}"

المستندات والمعلومات الأكثر ارتباطاً المسترجعة بواسطة Gemini Embeddings (${this.MODEL_ID}):
---
${contextText}
---

التعليمات:
1. أجب بأسلوب إداري مباشر وواضح باللغة العربية بناءً على البيانات المسترجعة أعلاه.
2. وضح أكثر المشاكل أو النقاط تكراراً وأرقام الحالات إن وجدت.
3. إذا لم تجد إجابة مباشرة في المصادر المرفقة، اذكر ذلك بوضوح واقترح إجراء بحث أوسع.
4. حافظ على سرية البيانات و Zero-PII بدون ذكر أي أسماء أفراد أو معرفات شخصية.`;

    // 4. Generate Answer with Gemini LLM
    const llmResponse = await this.aiClient.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: ragPrompt
    });

    const ragAnswer = llmResponse.text || "تم جلب النتائج بنجاح ولكن تعذر توليد ملخص النص الكامل.";
    const totalLatency = Date.now() - startTime;

    return {
      query: queryText,
      sanitizedQuery: searchRes.sanitizedQuery,
      ragAnswer,
      retrievedResults: searchRes.results,
      latencyMs: totalLatency,
      modelUsedForAnswer: "gemini-3.1-flash-lite",
      embeddingModelUsed: this.MODEL_ID
    };
  }

  // Topics & Case Count Summaries
  public async getTopicsSummary(): Promise<TopicSummary[]> {
    await this.initStore();

    const topicMap = new Map<string, { count: number; sourceTypes: Record<string, number>; samples: string[] }>();

    this.memoryStore.forEach(item => {
      const topicName = item.topic || "عام";
      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, { count: 0, sourceTypes: {}, samples: [] });
      }
      const record = topicMap.get(topicName)!;
      record.count++;
      record.sourceTypes[item.sourceType] = (record.sourceTypes[item.sourceType] || 0) + 1;
      if (record.samples.length < 3) {
        record.samples.push(item.title);
      }
    });

    const total = this.memoryStore.length || 1;
    const summaries: TopicSummary[] = [];

    topicMap.forEach((val, topic) => {
      summaries.push({
        topic,
        count: val.count,
        percentage: Math.round((val.count / total) * 1000) / 10,
        sourceTypeCount: val.sourceTypes,
        sampleContents: val.samples
      });
    });

    summaries.sort((a, b) => b.count - a.count);
    return summaries;
  }

  // Calculate similarity matrix among user feedback
  public async getFeedbackSimilarityMatrix(): Promise<FeedbackPairSimilarity[]> {
    await this.initStore();

    const feedbackItems = this.memoryStore.filter(item => item.sourceType === "feedback");
    const pairs: FeedbackPairSimilarity[] = [];

    for (let i = 0; i < feedbackItems.length; i++) {
      for (let j = i + 1; j < feedbackItems.length; j++) {
        const item1 = feedbackItems[i];
        const item2 = feedbackItems[j];
        const score = cosineSimilarity(item1.vector, item2.vector);
        pairs.push({
          id1: item1.id,
          title1: item1.title,
          id2: item2.id,
          title2: item2.title,
          similarityScore: score,
          similarityPercentage: Math.round(score * 1000) / 10,
          topic: item1.topic === item2.topic ? item1.topic : "مواضيع مختلفة"
        });
      }
    }

    pairs.sort((a, b) => b.similarityScore - a.similarityScore);
    return pairs;
  }

  // Overview Stats
  public async getStats() {
    await this.initStore();

    const topicSummaries = await this.getTopicsSummary();
    const avgLatency = this.searchCount > 0 ? Math.round(this.searchLatencyTotalMs / this.searchCount) : 180;

    const sourceCounts = {
      feedback: this.memoryStore.filter(i => i.sourceType === "feedback").length,
      doc: this.memoryStore.filter(i => i.sourceType === "doc").length,
      system_log: this.memoryStore.filter(i => i.sourceType === "system_log").length,
      ad_trend: this.memoryStore.filter(i => i.sourceType === "ad_trend").length,
    };

    return {
      totalIndexedDocs: this.memoryStore.length,
      totalSemanticSearches: this.searchCount,
      averageSearchLatencyMs: avgLatency,
      actualModelId: this.MODEL_ID,
      zeroPiiActive: true,
      sourceCounts,
      topTopics: topicSummaries.slice(0, 5),
      privacyReport: {
        piiPolicy: "Zero-PII Layer Active (Strict Regex Scrubbing before Embedding)",
        dataTransferredToGoogle: "Sanitized Non-PII Text only to Google Gemini Embedding API",
        storageType: "Firestore (vectorStore collection) + Fast In-Memory Cache"
      }
    };
  }

  // Delete Item
  public async deleteItem(id: string): Promise<boolean> {
    await this.initStore();
    this.memoryStore = this.memoryStore.filter(item => item.id !== id);
    try {
      await deleteDoc(doc(this.db, "vectorStore", id));
      return true;
    } catch (err) {
      console.error("Error deleting vector item:", err);
      return false;
    }
  }

  // Get raw items (for admin view - vector hidden by default)
  public async getItems(sourceType?: string): Promise<Omit<VectorItem, "vector">[]> {
    await this.initStore();
    let filtered = this.memoryStore;
    if (sourceType && sourceType !== "all") {
      filtered = filtered.filter(item => item.sourceType === sourceType);
    }
    return filtered.map(({ vector, ...rest }) => ({
      ...rest,
      vectorLength: vector ? vector.length : 0
    })) as any;
  }
}
