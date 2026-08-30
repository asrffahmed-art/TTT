import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface LegalSection {
  id: string;
  number: string;
  titleAr: string;
  titleEn: string;
  iconName: string;
  summaryAr: string;
  summaryEn: string;
  contentAr: string[];
  contentEn: string[];
  badgeAr?: string;
  badgeEn?: string;
  highlightCardAr?: {
    title: string;
    description: string;
    type: 'info' | 'warning' | 'success' | 'shield';
  };
  highlightCardEn?: {
    title: string;
    description: string;
    type: 'info' | 'warning' | 'success' | 'shield';
  };
}

export interface LegalDocumentConfig {
  termsVersion: string;
  privacyVersion: string;
  lastUpdated: string;
  publishedBy?: string;
  sections: LegalSection[];
}

export const DEFAULT_LEGAL_CONFIG: LegalDocumentConfig = {
  termsVersion: '1.1',
  privacyVersion: '1.1',
  lastUpdated: '2026-08-09',
  sections: [
    {
      id: 'acceptance',
      number: '01',
      titleAr: 'قبول الشروط والعقد الرقمي',
      titleEn: 'Acceptance of Terms & Digital Contract',
      iconName: 'FileCheck',
      summaryAr: 'الموافقة على هذه الشروط تُعد عقداً ملزماً قانوناً لاستخدام منصة THOTH AI.',
      summaryEn: 'Acceptance of these terms constitutes a legally binding contract for using THOTH AI.',
      badgeAr: 'ملزم قانوناً',
      badgeEn: 'Legally Binding',
      contentAr: [
        'مرحباً بك في منصة THOTH AI التابعة والمملوكة لشركة TIDEIN (المشار إليها بـ "الشركة"). بدخولك إلى التطبيق، أو إنشاء حساب، أو استخدام أي خدمة من خدمات الذكاء الاصطناعي التابعة لنا، فإنك تقر وتوافق صراحة على الالتزام بجميع بنود وشروط هذه الاتفاقية.',
        'إذا كنت لا توافق على أي جزء من هذه الشروط، فيجب عليك التوقف فوراً عن استخدام المنصة والخدمات المرتبطة بها.',
        'يُشترط أن تكون بالأهلية القانونية الكاملة لإبرام العقود، أو حاصلات على موافقة ولي الأمر إذا كنت دون السن القانونية المعتمدة في دولتك.'
      ],
      contentEn: [
        'Welcome to THOTH AI, a product of TIDEIN startup company (referred to as "the Company"). By accessing the application, creating an account, or using any of our AI services, you expressly agree to be bound by all terms and conditions of this agreement.',
        'If you do not agree with any part of these terms, you must immediately cease using the platform and its associated services.',
        'You must have full legal capacity to enter into contracts or possess parental consent if under the legal age in your jurisdiction.'
      ],
      highlightCardAr: {
        title: 'عقد استخدام رسمي',
        description: 'إنشاء الحساب أو استخدام أي ميزة هو إقرار كامل بالاطلاع والالتزام ببنود الاتفاقية.',
        type: 'info'
      },
      highlightCardEn: {
        title: 'Official Terms Contract',
        description: 'Account creation or using any feature constitutes full acknowledgment and binding agreement.',
        type: 'info'
      }
    },
    {
      id: 'account',
      number: '02',
      titleAr: 'الحساب والأمان والمسؤولية',
      titleEn: 'Account, Security & Responsibility',
      iconName: 'UserCheck',
      summaryAr: 'مسؤوليتك الكاملة عن سرية بيانات الحساب وجميع الأنشطة الصادرة منه.',
      summaryEn: 'Your full responsibility for account confidentiality and all associated activities.',
      badgeAr: 'أمان الحساب',
      badgeEn: 'Account Security',
      contentAr: [
        'يتطلب الاستخدام الكامل لخدمات THOTH إنشاء حساب وتوفير معلومات صحيحة ودقيقة.',
        'أنت المسؤول الأول والوحيد عن المحافظة على سرية بيانات تسجيل الدخول (كلمات المرور، المفاتيح السرية، أو جلسات OAuth) وعن كافة الأنشطة الصادرة من حسابك.',
        'يجب إبلاغ إدارة المنصة فوراً عند اكتشاف أي اختراق، أو وصول غير مصرح به، أو استخدام مشبوه لحسابك.',
        'تحتفظ إدارة المنصة بالحق في إيقاف أو تقييد أي حساب يعتمد بيانات مزيفة أو يتسبب في مخاطر أمنية.'
      ],
      contentEn: [
        'Full utilization of THOTH services requires account creation and providing accurate information.',
        'You are solely responsible for maintaining the confidentiality of your credentials (passwords, tokens, OAuth sessions) and for all actions originating from your account.',
        'You must notify platform support immediately upon discovering any unauthorized access, breach, or suspicious account usage.',
        'The platform reserves the right to suspend or restrict any account using fraudulent information or posing security risks.'
      ]
    },
    {
      id: 'services',
      number: '03',
      titleAr: 'خدمات THOTH ونطاق التشغيل',
      titleEn: 'THOTH Services & Scope of Operation',
      iconName: 'Cpu',
      summaryAr: 'نطاق وتحديثات منصة THOTH الذكية وما تنطوي عليه الخدمات.',
      summaryEn: 'The scope, updates, and nature of THOTH intelligent platform services.',
      contentAr: [
        'تقدم منصة THOTH مجموعة من أدوات الذكاء الاصطناعي المتقدمة، تشمل المحادثة الذكية، المحركات البحثية الحية، الترجمة الفورية، توليد وتعديل الصور، والمعالجة الصوتية.',
        'نعمل باستمرار على تطوير وتحديث الخدمات، وقد نقوم بإضافة ميزات جديدة، أو تعديل الميزات الحالية، أو تحسين خوارزميات الاستجابة دون إشعار مسبق.',
        'تحتفظ المنصة بالحق في وضع حدود استخدام أو حظر مؤقت لبعض الميزات في حالات الضغط العالي أو الصيانة الدورية لضمان استقرار الخدمة.'
      ],
      contentEn: [
        'THOTH platform offers advanced AI tools including intelligent chat, live search engines, instant translation, image generation/editing, and voice processing.',
        'We continuously develop and upgrade services, and may introduce new features, alter existing functionalities, or refine response algorithms without prior notice.',
        'The platform reserves the right to apply usage limits or temporary maintenance throttles to ensure overall system stability.'
      ]
    },
    {
      id: 'ai_disclaimer',
      number: '04',
      titleAr: 'إخلاء مسؤولية الذكاء الاصطناعي (AI Disclaimer)',
      titleEn: 'AI Disclaimer & Output Limitations',
      iconName: 'AlertTriangle',
      summaryAr: 'تنبه هام بخصوص مخرجات ونصوص الذكاء الاصطناعي وحدود الاعتماد عليها.',
      summaryEn: 'Crucial disclaimer regarding AI outputs, errors, and reliance boundaries.',
      badgeAr: 'تنبيه مهم جداً',
      badgeEn: 'Critical Disclaimer',
      contentAr: [
        'تعتمد المخرجات والنصوص والإجابات في THOTH على خوارزميات نماذج الذكاء الاصطناعي التوليدية، وقد تحتمل الخطأ، أو عدم الدقة، أو الصياغة غير المكتملة.',
        'الخدمة للاستخدام الاسترشادي والتعليمي والتثقيفي فقط، ولا تُعد بديلًا قانونياً أو طبياً أو مالياً أو أمنياً عن الاستشارات التخصصية المباشرة من أصحاب الاختصاص والمرخصين.',
        'يجب على المستخدم التحقق بنفسه من المعلومات الحساسة والمهمة قبل اتخاذ أي قرارات عالية المخاطر.',
        'لا تتحمل منصة THOTH أي مسؤولية عن أي خسائر، أو أضرار، أو قرارات خاطئة يتخذها المستخدم اعتماداً فقط على مخرجات الذكاء الاصطناعي.'
      ],
      contentEn: [
        'Outputs, texts, and responses in THOTH are generated by generative AI algorithms and may contain errors, inaccuracies, or incomplete formulations.',
        'Services are provided for informational, educational, and guidance purposes only, and do NOT constitute professional medical, legal, financial, or safety advice.',
        'Users must independently verify critical information before making high-risk decisions.',
        'THOTH disclaims any liability for losses, damages, or adverse decisions resulting solely from reliance on AI-generated outputs.'
      ],
      highlightCardAr: {
        title: 'حدود الاعتماد على الذكاء الاصطناعي',
        description: 'إجابات AI قد تحتوي على أخطاء. لا تستخدم المخرجات كبديل للمستشارين المرخصين في الأمور الحساسة.',
        type: 'warning'
      },
      highlightCardEn: {
        title: 'AI Reliance Boundaries',
        description: 'AI responses may contain errors. Never replace licensed professional advice in critical matters.',
        type: 'warning'
      }
    },
    {
      id: 'user_content',
      number: '05',
      titleAr: 'ملكية المحتوى والترخيص المحدود',
      titleEn: 'User Content Ownership & Limited License',
      iconName: 'Sparkles',
      summaryAr: 'حقوق ملكيتك للمحتوى والترخيص الممنوح لتشغيل الخدمة.',
      summaryEn: 'Your ownership rights over content and the limited operational license granted.',
      badgeAr: 'ملكية المحتوى لك',
      badgeEn: 'You Own Your Content',
      contentAr: [
        'تظل جميع الأوامر (Prompts)، والرسائل، والملفات المرفوعة، والمخرجات المنشأة مملوكة لك حصرياً وبشكل كامل.',
        'لا تدعي منصة THOTH أي حق ملكية على محتواك الشخصي لمجرد استخدامك للمنصة.',
        'بإدخالك للمحتوى، تمنح THOTH ترخيصاً محدوداً، غير حصري، ومجانياً فقط بالقدر اللازم تقنياً لتشغيل الخدمة، وتوليد الاستجابات، وعرضها لك داخل التطبيق.',
        'أنت المسؤول القانوني عن ضمان ملكيتك أو امتلاكك للحقوق والترخيص اللازمة لأي محتوى أو ملفات تقوم برفعها للمنصة.'
      ],
      contentEn: [
        'All prompts, messages, uploaded files, and generated outputs remain strictly and fully your property.',
        'THOTH does NOT claim ownership of your personal content simply because you used the platform.',
        'By inputting content, you grant THOTH a limited, non-exclusive, royalty-free license solely to technically process, render, and display the service to you.',
        'You are legally responsible for ensuring you possess appropriate rights and licenses for any content or files you upload.'
      ],
      highlightCardAr: {
        title: 'الملكية الفكرية للمستخدم',
        description: 'محتواك ورسائلك ملكك بالكامل. نحصل فقط على ترخيص تشغيلي محدود لعرض الخدمة لك.',
        type: 'success'
      },
      highlightCardEn: {
        title: 'User Intellectual Property',
        description: 'Your messages and uploads belong to you. We only hold a limited license to render the service for you.',
        type: 'success'
      }
    },
    {
      id: 'files_data',
      number: '06',
      titleAr: 'معالجة وتخزين الملفات المرفوعة',
      titleEn: 'Uploaded Files & Processing Policy',
      iconName: 'FolderLock',
      summaryAr: 'شروط رفع وتخزين وحذف الملفات والمستندات عبر التطبيق.',
      summaryEn: 'Terms for uploading, processing, storing, and deleting files via the app.',
      contentAr: [
        'عند رفع صور أو ملفات مستندات للمعالجة الذكية، يتم تشفير ونقل الملفات بأمان ومعالجتها عبر الخوادم لتلبية طلبك.',
        'يتم تخزين الملفات والمستندات المؤقتة في بنية Firestore / Cloud Storage المخصصة لاستخدامك الشخصي فقط.',
        'يُحظر رفع ملفات تحتوي على برمجيات خبيثة، أو بيانات مقرصنة، أو معلومات سرية لا تملك حق مشاركتها.',
        'يمكن للمستخدم حذف ملفاته وسجلاته في أي وقت من خلال خيارات الإدارة بصفحة الإعدادات أو المحادثات.'
      ],
      contentEn: [
        'When uploading images or documents for AI processing, files are encrypted during transfer and processed safely to fulfill your request.',
        'Uploaded temporary assets are stored in designated Firestore / Cloud Storage infrastructure restricted strictly to your account.',
        'Uploading malicious software, pirated media, or confidential data without authorization is strictly prohibited.',
        'Users may delete their files and history at any time through the app Settings and Chat controls.'
      ]
    },
    {
      id: 'ai_training',
      number: '07',
      titleAr: 'سياسة تدريب النماذج وتخصيص البيانات (متطلب إجباري)',
      titleEn: 'AI Model Improvement & Training Policy (Mandatory)',
      iconName: 'Cpu',
      summaryAr: 'مشاركة التفاعلات المجردة لتطوير وتدريب النماذج بخصوصية تامة كمتطلب إجباري لاستخدام الخدمة.',
      summaryEn: 'Anonymized interaction data processing for model refinement required for service usage.',
      badgeAr: 'متطلب إجباري للخدمة',
      badgeEn: 'Mandatory Requirement',
      contentAr: [
        'تعد مشاركة التفاعلات المجردة والمفلترة لتطوير وتدريب نماذج الذكاء الاصطناعي متطلباً أساسياً وإجبارياً لاستخدام منصة THOTH.',
        'يتم تجهيل البيانات المخصصة للتحسين تلقائياً وتجريدها تماماً من أي معلومات هوية شخصية (Zero-PII) مثل الأسماء، البريد الإلكتروني، أو مفاتيح API.',
        'لا يتم استخدام المحادثات أو الملفات الخاصة الحساسة؛ بل يقتصر ذلك على التفاعلات العامة المصفاة لضمان جودة الاستجابات.',
        'تُفعل هذه الموافقة تلقائياً كجزء من أسباب وشروط تقديم الخدمة المجانية والمتقدمة لكافة المستخدمين.'
      ],
      contentEn: [
        'Sharing anonymized interaction telemetry for model improvement is a mandatory requirement for accessing THOTH services.',
        'Data processed for model refinement is automatically anonymized (Zero-PII), removing names, emails, credentials, or private files.',
        'Processing is restricted to filtered interaction telemetry to ensure model safety and quality.',
        'This agreement is active by default as a core foundation for service provision.'
      ],
      highlightCardAr: {
        title: 'حماية الهوية وبند الخدمة',
        description: 'تجهيل تام وبيانات مجردة من الهوية (Zero-PII)، مفعلة بشكل أساسي مع اشتراطات استخدام المنصة.',
        type: 'shield'
      },
      highlightCardEn: {
        title: 'Identity Protection & Core Term',
        description: 'Fully anonymized Zero-PII processing required as a condition of service.',
        type: 'shield'
      }
    },
    {
      id: 'privacy_policy',
      number: '08',
      titleAr: 'سياسة الخصوصية وجمع البيانات',
      titleEn: 'Privacy Policy & Data Collection',
      iconName: 'ShieldCheck',
      summaryAr: 'أنواع البيانات المجمعة، أسباب الجمع، وكيفية حمايتها.',
      summaryEn: 'Categories of collected data, collection purposes, and safeguards.',
      badgeAr: 'خصوصية مشددة',
      badgeEn: 'Strict Privacy',
      contentAr: [
        'نجمع البيانات الأساسية اللازمة لتقديم الخدمة: بيانات الحساب (الاسم، البريد الإلكتروني، الدولة)، بيانات الاستخدام الفني (حدود الاستخدام اليومية، أوقات التفاعل)، والمحتوى المدخل لتوليد الاستجابات.',
        'أسباب الجمع: تقديم وتشغيل الخدمة، التأكد من أمان الحسابات، تنفيذ حدود الباقات، منع الاستخدام التعسفي، وتحسين تجربة المستخدم.',
        'مشاركة البيانات: تتم المشاركة فقط مع المزودين البنيويين المعتمدين لتشغيل الخدمة (مثل خوادم Google Cloud / Firestore، ومزودي نماذج Gemini API، ومحرك Tavily Search للبحث الحي).',
        'نلتزم بعدم بيع، أو تأجير، أو الإفصاح عن بياناتك الشخصية لأي جهات تسويقية خارجية.'
      ],
      contentEn: [
        'We collect essential operational data: account credentials (name, email, country), technical usage metrics (daily quota limits, interaction logs), and input prompts required for responses.',
        'Purposes: Operating the service, enforcing security and quota boundaries, preventing abuse, and enhancing user experience.',
        'Data Sharing: Shared exclusively with essential infrastructure providers needed to run the app (Google Cloud / Firestore, Gemini API providers, and Tavily Search engine for web search).',
        'We strictly commit to NEVER selling, renting, or disclosing your personal identity data to external marketing vendors.'
      ]
    },
    {
      id: 'advertising',
      number: '09',
      titleAr: 'الإعلانات وجمع البيانات لشركات الإعلانات (متطلب إجباري - Zero-PII)',
      titleEn: 'Advertising & Ad Data Collection Policy (Mandatory - Zero-PII)',
      iconName: 'Megaphone',
      summaryAr: 'جمع بيانات التفاعل الفنية والمجردة لمشاركتها مع الشركاء وشركات الإعلانات لتمويل الاستخدام المجاني كمتطلب إجباري للخدمة.',
      summaryEn: 'Anonymized interaction and telemetry data collection for ad partners required to fund the service.',
      badgeAr: 'متطلب إجباري للخدمة',
      badgeEn: 'Mandatory Requirement',
      contentAr: [
        'تعد موافقة المستخدم على عرض الإعلانات وجمع بيانات التفاعل المجردة (Zero-PII) لمشاركتها مع شركات الإعلانات والشركاء متطلباً إجبارياً وأساسياً لاستخدام منصة THOTH والاستفادة من خدماتها.',
        'يتم جمع وتجهيل البيانات الفنية وعادات الاستخدام العامة بشكل كامل دون ربطها باسمك أو بريدك الإلكتروني أو هوية حسابك الشخصية.',
        'ضمان قاطع: لا تحصل شركات الإعلانات على أي بيانات شخصية (PII) مثل كلمات المرور، أو المحادثات الخاصة، أو الملفات المرفوعة، أو مفاتيح API الخاص بك.',
        'تُمكّن هذه المشاركة المنصة من تغطية تكاليف التشغيل ونماذج الذكاء الاصطناعي وتقديم الخدمات والميزات لكافة المستخدمين.'
      ],
      contentEn: [
        'Consent for advertising display and anonymized interaction data collection (Zero-PII) for ad partners is a mandatory condition for using THOTH services.',
        'Technical telemetry and usage signals are fully anonymized before sharing with ad networks, without linking to your real name, email, or user account.',
        'Strict Guarantee: Ad partners NEVER receive Personally Identifiable Information (PII), private prompt content, uploaded files, or API keys.',
        'This monetization structure enables THOTH to sustain infrastructure costs and provide advanced AI capabilities.'
      ]
    },
    {
      id: 'cookies',
      number: '10',
      titleAr: 'ملفات تعريف الارتباط (Cookies) والتخزين المحلي',
      titleEn: 'Cookies & Local Storage Usage',
      iconName: 'Cookie',
      summaryAr: 'استخدام التخزين المحلي وملفات الكوكيز الضرورية للحلسة.',
      summaryEn: 'Essential cookies and local storage utilized for session state.',
      contentAr: [
        'نستخدم تقنيات التخزين المحلي (localStorage / sessionStorage) وملفات تعريف الارتباط الضرورية لحفظ جلسة تسجيل الدخول، والمظهر المفضل، وإعدادات الخصوصية.',
        'ملفات تعريف الارتباط الأساسية (Essential Cookies) ملزمة لتشغيل التطبيق والتحقق من هوية الحساب.',
        'ملفات تعريف الارتباط التحليلية تُستخدم فقط لتحسين سرعة الاستجابة وأداء واجهة المستخدم.'
      ],
      contentEn: [
        'We utilize browser local storage (localStorage / sessionStorage) and essential cookies to maintain sign-in sessions, UI theme preferences, and privacy toggles.',
        'Essential cookies are mandatory for application security and session verification.',
        'Analytics cookies are strictly used to evaluate interface responsiveness and load speed.'
      ]
    },
    {
      id: 'subscriptions',
      number: '11',
      titleAr: 'الاشتراكات والمدفوعات وسياسة الاسترداد',
      titleEn: 'Subscriptions, Billing & Cancellation',
      iconName: 'CreditCard',
      summaryAr: 'شروط الباقات المجانية والمدفوعة والدفع وإلغاء الاشتراك.',
      summaryEn: 'Terms for Free/Paid plans, billing cycles, and cancellation policy.',
      contentAr: [
        'توفر منصة THOTH باقات مجانية وباقات مدفوعة (Basic, Pro, Ultra, Max) تمنح حدود استخدام موسعة وأدوات متقدمة.',
        'يتم تحديد رسوم وتفاصيل الاشتراكات بوضوح في صفحة الباقات والاشتراكات داخل التطبيق.',
        'يمكن للمستخدم إلغاء تجديد الاشتراك في أي وقت قبل حلول دورة التجديد القادمة من خلال إدارة حسابه.',
        'سياسة الاسترداد (Refund Policy): [تحدد بواسطة مالك الخدمة].'
      ],
      contentEn: [
        'THOTH provides free tiers and paid tiers (Basic, Pro, Ultra, Max) offering expanded quota limits and advanced capabilities.',
        'Subscription pricing and feature details are clearly outlined in the app Subscription page.',
        'Users can cancel automatic renewal at any time prior to the next billing cycle.',
        'Refund Policy: [To be determined by service owner].'
      ],
      highlightCardAr: {
        title: 'سياسة الاسترداد والشفافية',
        description: 'يمكنك إلغاء الاشتراك في أي وقت. سياسة الاسترداد: [تحدد بواسطة مالك الخدمة].',
        type: 'info'
      },
      highlightCardEn: {
        title: 'Refund Policy & Transparency',
        description: 'Subscriptions can be cancelled anytime. Refund Policy: [To be determined by service owner].',
        type: 'info'
      }
    },
    {
      id: 'prohibited_use',
      number: '12',
      titleAr: 'الاستخدام المحظور وقواعد السلوك',
      titleEn: 'Prohibited Uses & Conduct Rules',
      iconName: 'Ban',
      summaryAr: 'قائمة الأنشطة والاستخدامات الممنوعة لحماية الخدمة والمستخدمين.',
      summaryEn: 'Prohibited activities and unacceptable conduct guidelines.',
      badgeAr: 'حظر فوري',
      badgeEn: 'Immediate Ban',
      contentAr: [
        'يُحظر تماماً استخدام منصة THOTH لأي من الأغراض التالية:',
        '• توليد أو نشر محتوى غير قانوني، أوالتحريض على العنف، أوالكراهية، أوالاحتيال.',
        '• محاولة هندسة عكسية للخوارزميات، أو سرقة مفاتيح API، أو اختراق خوادم المنصة.',
        '• استخدام برامج الأتمتة (Bots/Scrapers) لإغراق الخوادم أو التحايل على قيود الاستخدام اليومية.',
        '• إدخال برمجيات خبيثة أو استخدام الخدمة في أنشطة اختراق وتهديد للأمن السيبراني.',
        'يؤدي إثبات أي مخالفة إلى الحظر الفوري والدائم للحساب دون إشعار مسبق.'
      ],
      contentEn: [
        'The following activities are strictly prohibited on THOTH:',
        '• Generating illegal content, inciting violence, hate speech, or scamming.',
        '• Attempting reverse engineering, API key theft, or unauthorized server penetration.',
        '• Using automated scripts or scrapers to overload servers or bypass quota controls.',
        '• Deploying malware or conducting cyber threat activities via the platform.',
        'Violations result in immediate permanent account suspension without prior notice.'
      ]
    },
    {
      id: 'termination',
      number: '13',
      titleAr: 'حقوق المستخدم وإلغاء الحساب',
      titleEn: 'User Rights & Account Termination',
      iconName: 'UserX',
      summaryAr: 'حقوقك في تصدير وحذف بياناتك وإجراءات إغلاق الحساب.',
      summaryEn: 'Your rights to delete data and platform termination rights.',
      contentAr: [
        'يحق للمستخدم طلب إغلاق حسابه وحذف كافّة بياناته الشخصية وسجلاته في أي وقت.',
        'عند حذف الحساب، يتم مسح بيانات المحادثات والمستندات نهائياً من قاعدة البيانات، باستثناء السجلات التي يفرض القانون أو متطلبات الأمان الاحتفاظ بها لفترة محددة.',
        'تحتفظ إدارة المنصة بالحق في تعليق أو إغلاق الحسابات الانتهاكية أو غير النشطة لفترات طويلة وفق تقديرها.'
      ],
      contentEn: [
        'Users reserve the right to request full account deletion and erasure of personal data at any time.',
        'Upon deletion, chat histories and documents are permanently purged from database records, except data required by law or audit requirements.',
        'The platform reserves the right to terminate accounts that violate terms or remain inactive for prolonged periods.'
      ]
    },
    {
      id: 'modifications',
      number: '14',
      titleAr: 'تحديث الشروط والإخطارات والنسخ',
      titleEn: 'Changes to Terms & Document Versioning',
      iconName: 'History',
      summaryAr: 'آلية تحديث الاتفاقية وإخطار المستخدمين بالنسخ الجديدة.',
      summaryEn: 'How agreement terms are updated and versions published.',
      badgeAr: 'v1.1 محدثة',
      badgeEn: 'v1.1 Updated',
      contentAr: [
        'قد نقوم بتحديث بنود هذه الاتفاقية وسياسة الخصوصية من وقت لآخر للتوافق مع التطورات التقنية أو التنظيمية.',
        'عند إجراء أي تغيير جوهري، سيتم تحديث تاريخ "آخر تحديث" وإصدار النسخة (Versioning)، وتوجيه إشعار للمستخدمين داخل التطبيق.',
        'استمرارك في استخدام THOTH بعد نشر الشروط المحدثة يُعتبر موافقة وقبولاً صريحاً بالبنود الجديدة.'
      ],
      contentEn: [
        'We may revise these terms and privacy policies periodically to adapt to technological or legal developments.',
        'Upon material updates, we will update the "Last Updated" timestamp, increment the Version number, and notify users in-app.',
        'Continued usage of THOTH following published revisions constitutes full acceptance of updated terms.'
      ]
    },
    {
      id: 'contact',
      number: '15',
      titleAr: 'التواصل والاستفسارات القانونية',
      titleEn: 'Contact & Legal Inquiries',
      iconName: 'HelpCircle',
      summaryAr: 'كيفية التواصل مع الفريق القانوني والدعم الفني.',
      summaryEn: 'How to contact legal support and compliance teams.',
      contentAr: [
        'إذا كان لديك أي استفسارات أو ملاحظات بخصوص شروط الخدمة أو سياسة الخصوصية، يمكنك التواصل معنا عبر:',
        '• البريد الإلكتروني المخصص للدعم القانوني: legal@thoth.app',
        '• أو عبر نموذج التواصل والمساعدة داخل قسم الإعدادات.',
        'فريقنا المخصص متواجد لمساعدتك والإجابة على كافة الاستفسارات المراسلة.'
      ],
      contentEn: [
        'For any questions or compliance inquiries regarding terms or privacy policy, contact us at:',
        '• Legal Support Email: legal@thoth.app',
        '• Or via the Help & Support modal inside App Settings.',
        'Our compliance team is ready to assist with all regulatory and data requests.'
      ]
    }
  ]
};

export async function getLegalDocumentConfig(): Promise<LegalDocumentConfig> {
  try {
    const docRef = doc(db, 'systemConfig', 'legal');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as LegalDocumentConfig;
      if (data && data.sections && data.sections.length > 0) {
        return {
          termsVersion: data.termsVersion || DEFAULT_LEGAL_CONFIG.termsVersion,
          privacyVersion: data.privacyVersion || DEFAULT_LEGAL_CONFIG.privacyVersion,
          lastUpdated: data.lastUpdated || DEFAULT_LEGAL_CONFIG.lastUpdated,
          publishedBy: data.publishedBy || 'TIDEIN',
          sections: data.sections
        };
      }
    }
  } catch (err) {
    console.warn('Error fetching custom legal document config, using default:', err);
  }
  return DEFAULT_LEGAL_CONFIG;
}

export async function publishLegalDocumentConfig(
  config: Partial<LegalDocumentConfig>,
  publishedByEmail: string = 'admin@thoth.app'
): Promise<boolean> {
  try {
    const docRef = doc(db, 'systemConfig', 'legal');
    const existing = await getLegalDocumentConfig();
    
    const newConfig: LegalDocumentConfig = {
      termsVersion: config.termsVersion || existing.termsVersion,
      privacyVersion: config.privacyVersion || existing.privacyVersion,
      lastUpdated: config.lastUpdated || new Date().toISOString().split('T')[0],
      publishedBy: publishedByEmail,
      sections: config.sections || existing.sections
    };

    await setDoc(docRef, newConfig, { merge: true });
    return true;
  } catch (err) {
    console.error('Error publishing legal document config to Firestore:', err);
    return false;
  }
}
