# دليل نشر THOTH — إصلاح مشكلة "الموقع لا يعمل بعد الرفع"

## 🔍 ملخص المشكلة التي تم إصلاحها

الموقع السابق كان منشوراً على Vercel **برفع الملفات الثابتة فقط** (Drag & Drop)،
وبالتالي:
- ✅ الواجهة الأمامية (React) كانت تعمل
- ❌ **الباك إند (Express API) لم يكن منشوراً إطلاقاً** — كل نداءات `/api/*` كانت ترجع 404
- ❌ الرسالة "نفد رصيد الاستخدام" كانت تظهر خطأً مع كل رسالة (كانت مجرد استجابة للـ 404)
- ❌THOTH Live (المحادثة الصوتية الحية) والترجمة الحية كانتا معطلتين

### إصلاحات إضافية تمت في هذا الإصدار
1. **Chat.tsx / LiveTranslate.tsx**: الآن الواجهة تميّز بين نفاد الرصيد الحقيقي
   (كود `LIMIT_REACHED` من السيرفر) وبين فشل الخادم/الشبكة (404/500) — وتعرض
   رسالة صحيحة لكل حالة.
2. **package.json**: إزالة حزمة `canvas` غير المستخدمة (كانت تبطئ النشر وتسبب
   أخطاء تجميع)، إضافة `@types/react` الناقصة، إضافة `react-redux` و`immer`
   (اعتماديات recharts المطلوبة).
3. **server.ts**: جعل استيراد إعدادات Firebase متوافقاً مع كل بيئات النشر.
4. **vercel.json**: تحديد منطقة الخادم إلى `iad1` (واشنطن) — **لأن Gemini API
   محجوب من هونج كونج (hkg1)** حيث كان موقعك يعمل، ولهذا حتى لو نُشر الـ API
   كان الذكاء الاصطناعي سيرجع خطأ "User location is not supported".
5. **api/index.ts**: زيادة مهلة التنفيذ إلى 60 ثانية للردود الطويلة.

---

## 🚀 الخيار الأول (الموصى به): Railway — يدعم كل الميزات بما فيها THOTH Live

> لماذا؟ لأن THOTH Live والترجمة الحية تحتاجان WebSocket، وVercel Serverless
> لا يدعم WebSocket أصلاً. Railway يشغّل السيرفر كامل بشكل دائم.

1. ادفع هذا المستودع إلى GitHub (جاهز الآن).
2. ادخل [railway.app](https://railway.app) وسجّل بحساب GitHub.
3. **New Project → Deploy from GitHub repo** واختر المستودع.
4. Railway سيقرأ `railway.json` ويبني المشروع تلقائياً
   (`npm install && npm run build` ثم `npm start`).
5. من تبويب **Variables** أضف:
   ```
   GEMINI_API_KEY=مفتاحك_من_google_ai_studio
   NODE_ENV=production
   ```
6. من تبويب **Settings → Networking → Generate Domain** احصل على رابط
   (مثل `thoth-production.up.railway.app`).
7. اربط الدومين `thothai.site`:
   - في Railway: Settings → Networking → Custom Domain → أدخل `thothai.site`
   - في لوحة مزوّد الدومين: أضف سجل `CNAME` يشير إلى الدومين الذي أعطاك إياه Railway
8. اختر منطقة خوادم أمريكية (us-west أو us-east) عند إنشاء المشروع — **ليس هونج كونج**.

---

## 🌐 الخيار الثاني: Vercel (بدون THOTH Live — الـ WebSocket لا يعمل على Serverless)

> مناسب فقط إذا كنت مستعداً للاستغناء عن المحادثة الصوتية الحية.

1. ادخل [vercel.com/new](https://vercel.com/new) وسجّل بحساب GitHub.
2. **Import Git Repository** واختر المستودع — ⚠️ لا تستخدم السحب والإفلات!
   الرفع اليدوي لا يبني الـ API وهو سبب المشكلة الأصلية.
3. Vercel سيكتشف Vite تلقائياً:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **Root Directory: فارغ (جذر المشروع)** — مهم جداً ليعمل `api/index.ts`
4. قبل الضغط على Deploy، من **Environment Variables** أضف:
   ```
   GEMINI_API_KEY=مفتاحك_من_google_ai_studio
   ```
5. بعد النشر: Settings → Functions → تأكد أن المنطقة `iad1 (Washington, D.C.)`
   (ملف `vercel.json` يضبطها تلقائياً).
6. اربط الدومين: Project → Domains → Add `thothai.site` واتبع تعليمات DNS.

> ⚠️ قيود Vercel حتى مع النشر الصحيح: حد حجم الطلب 4.5MB (الملفات الضخمة عبر
> `/api/files/upload` قد تفشل — الرفع المباشر للوسائط إلى Firebase Storage من
> المتصفح يعمل عادي)، وعدم دعم WebSocket (THOTH Live والترجمة الحية).

---

## 🔑 من أين أحصل على مفتاح Gemini؟
من [Google AI Studio](https://aistudio.google.com/apikey) → Get API key.
المفتاح الجديد يبدأ بـ `AQ.` وهذا طبيعي ويعمل مع `@google/genai`.

**مهم:** لا تضع المفتاح داخل الكود أبداً — فقط في متغيرات البيئة بلوحة تحكم
منصة النشر.

---

## ✅ كيف تتأكد أن النشر نجح؟
افتح هذه الروابط بعد النشر — يجب أن ترجع JSON وليس 404:
```
https://your-domain.com/api/system-config
https://your-domain.com/api/public/subscription-plans
```
ثم جرّب إرسال رسالة في المحادثة.

---

## 📁 هيكل المشروع المهم للنشر
```
├── api/index.ts          ← نقطة دخول الـ API لـ Vercel (من `regions: iad1`)
├── server.ts             ← سيرفر Express + WebSocket الكامل (لـ Railway/Render)
├── vercel.json           ← إعدادات Vercel (المنطقة + الـ rewrites)
├── railway.json          ← إعدادات Railway
├── render.yaml           ← إعدادات Render (بديل عن Railway)
├── .env.example          ← قائمة متغيرات البيئة المطلوبة
└── src/                  ← واجهة React
```
