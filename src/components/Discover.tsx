import { useLanguage } from '../lib/LanguageContext';
import { Code, Edit, Plane, Languages, Sparkles, Radio } from 'lucide-react';
import { useState } from 'react';

interface DiscoverProps {
  isEmbedded?: boolean;
  onAction: (msg: string) => void;
  onNavigate?: (tab: string) => void;
}

export function Discover({ onAction, onNavigate, isEmbedded }: DiscoverProps) {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('الكل');

  const categories = ['الكل', 'صوتي ولغات', 'كتابة', 'برمجة', 'تعليم', 'ترفيه'];

  const cards = [
    {
      id: 1,
      title: "المحادثة الصوتية المباشرة",
      desc: "حوار صوتی تفاعلي طبيعي وسلس ومباشر باستخدام تقنية THOTH Live Audio Stream.",
      icon: Radio,
      colorClass: "emerald",
      actionMsg: "ابدأ محادثة صوتية حية مع THOTH Live",
      category: "صوتي ولغات"
    },
    {
      id: 2,
      title: "الترجمة الفورية المباشرة",
      desc: "ترجمة فورية فائقة الدقة والسلاسة عبر اللغات بـ THOTH Live Translate.",
      icon: Languages,
      colorClass: "blue",
      actionMsg: "ترجم هذا النص فورياً باستخدام THOTH Translate",
      category: "صوتي ولغات"
    },
    {
      id: 3,
      title: "مساعد الكود",
      desc: "اكتب، راجع، واكتشف أخطاء الكود البرمجي في ثوانٍ. يدعم مختلف اللغات البرمجية.",
      icon: Code,
      colorClass: "indigo",
      actionMsg: "ساعدني في مراجعة كود برمجي عبر THOTH Coder",
      category: "برمجة"
    },
    {
      id: 4,
      title: "مؤلف المقالات",
      desc: "أنشئ مقالات، مدونات، ومحتوى تسويقي جذاب بأسلوب احترافي مخصص لاحتياجاتك.",
      icon: Edit,
      colorClass: "pink",
      actionMsg: "اكتب لي مقالاً إبداعياً بأسلوب THOTH",
      category: "كتابة"
    },
    {
      id: 5,
      title: "مخطط رحلات",
      desc: "صمم مسارات سياحية متكاملة، اكتشف أفضل المعالم، ونظم جدول إجازتك بسهولة.",
      icon: Plane,
      colorClass: "emerald",
      actionMsg: "اقترح خطة سياحية استثنائية مع THOTH",
      category: "ترفيه"
    }
  ];

  const filteredCards = activeCategory === 'الكل' ? cards : cards.filter(c => c.category === activeCategory);

  return (
    <div className={`flex flex-col w-full h-full ${isEmbedded ? 'pb-4 pt-4' : 'pb-28 pt-20'} px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar`}>
      <section className="px-6 flex flex-col gap-2 mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">استكشف قدرات THOTH</h2>
        <p className="text-sm text-white/50">اكتشف أفكاراً جديدة ومساعدين متخصصين لإنجاز مهامك بسرعة وإبداع.</p>
      </section>

      <section className="px-6 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {categories.map((cat, i) => (
            <button 
              key={i}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg ${
                activeCategory === cat 
                  ? 'bg-white text-indigo-900 border border-transparent' 
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {filteredCards.map(card => {
          const Icon = card.icon;
          return (
            <div 
              key={card.id} 
              onClick={() => {
                if (card.id === 1 && onNavigate) {
                  onNavigate('voice');
                } else if (card.id === 2 && onNavigate) {
                  onNavigate('translate');
                } else {
                  onAction(card.actionMsg);
                }
              }} 
              className="flex flex-col p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 hover:bg-white/10 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl transition-all ${
                card.colorClass === 'indigo' ? 'bg-indigo-500/20 group-hover:bg-indigo-500/30' :
                card.colorClass === 'pink' ? 'bg-pink-500/20 group-hover:bg-pink-500/30' :
                card.colorClass === 'amber' ? 'bg-amber-500/20 group-hover:bg-amber-500/30' :
                'bg-emerald-500/20 group-hover:bg-emerald-500/30'
              }`}></div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border shadow-lg ${
                card.colorClass === 'indigo' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                card.colorClass === 'pink' ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' :
                card.colorClass === 'amber' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white mb-2 relative z-10">{card.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed relative z-10">{card.desc}</p>
            </div>
          )
        })}
      </section>

      <section className="px-6 mt-auto">
        <div onClick={() => onAction("اريد توليد صورة فنية مذهلة عبر THOTH Vision")} className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-indigo-500/20 border border-white/10 p-6 flex flex-col justify-end min-h-[160px] group cursor-pointer">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-pink-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-pink-300">ميزة جديدة</span>
            </div>
            <h3 className="font-bold text-lg text-white mb-1">توليد الصور بالذكاء الاصطناعي</h3>
            <p className="text-xs text-white/60 line-clamp-1">صِف خيالك، ودعنا نحوله إلى واقع مرئي مذهل.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
