import { useState, useEffect } from 'react';

export interface ThemeOption {
  id: string;
  name: string;
  desc: string;
  bgClass: string;
  ambientLight1: string;
  ambientLight2: string;
  previewGradient: string;
  isGlass?: boolean;
  cardBg?: string;
  glassBorder?: string;
  
  // Theme accents
  textAccent: string;
  textAccentBright: string;
  bgAccent: string;
  borderAccent: string;
  btnPrimary: string;
  badgeClass: string;
  activeTabClass: string;
  activeIndicator: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'crystal_glass',
    name: '💎 الزجاج الشفاف الكريستالي (Ultra Crystal Glass)',
    desc: 'تصميم زجاجي شفاف فاخر بمؤثرات بلورية وتدرجات ضوئية مشعة',
    bgClass: 'bg-[#080914] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#0a0c16] to-[#04050a]',
    ambientLight1: 'bg-gradient-to-r from-pink-500/25 to-indigo-500/25',
    ambientLight2: 'bg-gradient-to-r from-cyan-400/20 to-purple-600/20',
    previewGradient: 'from-pink-400 via-indigo-400 to-cyan-400',
    isGlass: true,
    cardBg: 'bg-white/[0.04] backdrop-blur-2xl border-white/[0.12] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]',
    glassBorder: 'border-white/[0.15]',
    textAccent: 'text-pink-400',
    textAccentBright: 'text-white',
    bgAccent: 'bg-white/[0.08] backdrop-blur-xl',
    borderAccent: 'border-white/25',
    btnPrimary: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:brightness-110 text-white font-extrabold shadow-[0_0_20px_rgba(236,72,153,0.4)]',
    badgeClass: 'bg-white/[0.08] backdrop-blur-xl border-white/20 text-pink-300 shadow-sm',
    activeTabClass: 'text-white bg-white/[0.12] backdrop-blur-2xl border border-white/30 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    activeIndicator: 'bg-gradient-to-r from-pink-400 to-indigo-400 shadow-[0_0_12px_#f472b6]'
  },
  {
    id: 'glass_dark',
    name: '🔮 الزجاج الدخاني الشفاف (Frosted Smoked Glass)',
    desc: 'زجاج داكن عالي النقاء مع انعكاسات ناعمة وتباين بصري رائع',
    bgClass: 'bg-[#090b10] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/60 via-[#07090e] to-black',
    ambientLight1: 'bg-purple-600/15',
    ambientLight2: 'bg-blue-600/15',
    previewGradient: 'from-purple-500 via-indigo-500 to-slate-400',
    isGlass: true,
    cardBg: 'bg-white/[0.03] backdrop-blur-3xl border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]',
    glassBorder: 'border-white/[0.1]',
    textAccent: 'text-purple-300',
    textAccentBright: 'text-white',
    bgAccent: 'bg-white/[0.06] backdrop-blur-xl',
    borderAccent: 'border-white/20',
    btnPrimary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold shadow-lg',
    badgeClass: 'bg-white/[0.06] backdrop-blur-xl border-white/15 text-purple-200',
    activeTabClass: 'text-white bg-white/[0.1] backdrop-blur-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
    activeIndicator: 'bg-purple-400 shadow-[0_0_10px_#c084fc]'
  },
  {
    id: 'monochrome',
    name: 'الفحم الكلاسيكي (Minimal Dark)',
    desc: 'المظهر الافتراضي الأنيق باللون الفحمي والأسود مع الفضي الكلاسيكي',
    bgClass: 'bg-[#101216]',
    ambientLight1: 'bg-zinc-400/10',
    ambientLight2: 'bg-slate-500/10',
    previewGradient: 'from-zinc-400 via-slate-500 to-zinc-700',
    isGlass: false,
    cardBg: 'bg-zinc-900/80 backdrop-blur-xl border-zinc-800',
    glassBorder: 'border-zinc-700/40',
    textAccent: 'text-zinc-200',
    textAccentBright: 'text-white',
    bgAccent: 'bg-zinc-800/60',
    borderAccent: 'border-zinc-500/40',
    btnPrimary: 'bg-gradient-to-r from-zinc-200 to-slate-100 hover:from-white hover:to-zinc-200 text-zinc-950 font-extrabold',
    badgeClass: 'bg-zinc-800/80 border-zinc-600/50 text-zinc-200',
    activeTabClass: 'text-white bg-zinc-800/80 border border-zinc-500/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]',
    activeIndicator: 'bg-zinc-200 shadow-[0_0_8px_#e4e4e7]'
  },
  {
    id: 'emerald',
    name: 'الزمردي النيون (THOTH Emerald)',
    desc: 'مظهر الزمرد والنيون العصري المضيء',
    bgClass: 'bg-[#0d0f17]',
    ambientLight1: 'bg-emerald-500/15',
    ambientLight2: 'bg-indigo-500/15',
    previewGradient: 'from-emerald-500 via-teal-500 to-indigo-500',
    textAccent: 'text-emerald-400',
    textAccentBright: 'text-emerald-300',
    bgAccent: 'bg-emerald-500/15',
    borderAccent: 'border-emerald-500/30',
    btnPrimary: 'bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    activeTabClass: 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    activeIndicator: 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
  },
  {
    id: 'purple',
    name: 'الليل الملكي (Royal Purple)',
    desc: 'ثيم البنفسجي والأرجواني الفاخر العميق',
    bgClass: 'bg-[#0f0a1c]',
    ambientLight1: 'bg-purple-500/20',
    ambientLight2: 'bg-fuchsia-500/15',
    previewGradient: 'from-purple-500 via-fuchsia-500 to-pink-500',
    textAccent: 'text-purple-400',
    textAccentBright: 'text-purple-300',
    bgAccent: 'bg-purple-500/15',
    borderAccent: 'border-purple-500/30',
    btnPrimary: 'bg-purple-600 hover:bg-purple-700 text-white font-extrabold',
    badgeClass: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    activeTabClass: 'text-purple-300 bg-purple-500/15 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    activeIndicator: 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
  },
  {
    id: 'ocean',
    name: 'الأزرق المحيطي (Deep Ocean)',
    desc: 'أعماق المحيط الهادئة باللون السماوي والأزرق',
    bgClass: 'bg-[#08101e]',
    ambientLight1: 'bg-cyan-500/20',
    ambientLight2: 'bg-blue-600/20',
    previewGradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    textAccent: 'text-cyan-400',
    textAccentBright: 'text-cyan-300',
    bgAccent: 'bg-cyan-500/15',
    borderAccent: 'border-cyan-500/30',
    btnPrimary: 'bg-cyan-500 hover:bg-cyan-600 text-black font-extrabold',
    badgeClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    activeTabClass: 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    activeIndicator: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
  },
  {
    id: 'amber',
    name: 'الغروب الذهبي (Golden Sunset)',
    desc: 'دفء الخريف والغروب الذهبي بألوان دافئة',
    bgClass: 'bg-[#140c08]',
    ambientLight1: 'bg-amber-500/20',
    ambientLight2: 'bg-orange-600/15',
    previewGradient: 'from-amber-500 via-orange-500 to-rose-500',
    textAccent: 'text-amber-400',
    textAccentBright: 'text-amber-300',
    bgAccent: 'bg-amber-500/15',
    borderAccent: 'border-amber-500/30',
    btnPrimary: 'bg-amber-500 hover:bg-amber-600 text-black font-extrabold',
    badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    activeTabClass: 'text-amber-300 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    activeIndicator: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
  },
  {
    id: 'rose',
    name: 'الورد الوردي (Rose Nebula)',
    desc: 'ثيم وردي ساحر وناعم بلمسات السديم',
    bgClass: 'bg-[#180a12]',
    ambientLight1: 'bg-rose-500/20',
    ambientLight2: 'bg-pink-600/15',
    previewGradient: 'from-rose-500 via-pink-500 to-purple-500',
    textAccent: 'text-rose-400',
    textAccentBright: 'text-rose-300',
    bgAccent: 'bg-rose-500/15',
    borderAccent: 'border-rose-500/30',
    btnPrimary: 'bg-rose-500 hover:bg-rose-600 text-white font-extrabold',
    badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
    activeTabClass: 'text-rose-300 bg-rose-500/15 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
    activeIndicator: 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
  }
,
  {
    id: 'crimson',
    name: 'القرمزي الدامي (Crimson Blood)',
    desc: 'لون أحمر قرمزي عميق يوحي بالقوة والطاقة',
    bgClass: 'bg-[#140505]',
    ambientLight1: 'bg-red-600/20',
    ambientLight2: 'bg-rose-700/15',
    previewGradient: 'from-red-600 via-rose-600 to-orange-500',
    textAccent: 'text-red-400',
    textAccentBright: 'text-red-300',
    bgAccent: 'bg-red-500/15',
    borderAccent: 'border-red-500/30',
    btnPrimary: 'bg-red-600 hover:bg-red-700 text-white font-extrabold',
    badgeClass: 'bg-red-500/15 border-red-500/30 text-red-300',
    activeTabClass: 'text-red-300 bg-red-500/15 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
    activeIndicator: 'bg-red-500 shadow-[0_0_8px_#ef4444]'
  },
  {
    id: 'sapphire',
    name: 'الياقوت الأزرق (Royal Sapphire)',
    desc: 'أزرق ياقوتي ملكي مع لمسات ناعمة مضيئة',
    bgClass: 'bg-[#050b14]',
    ambientLight1: 'bg-blue-600/20',
    ambientLight2: 'bg-indigo-600/15',
    previewGradient: 'from-blue-600 via-indigo-500 to-cyan-500',
    textAccent: 'text-blue-400',
    textAccentBright: 'text-blue-300',
    bgAccent: 'bg-blue-500/15',
    borderAccent: 'border-blue-500/30',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white font-extrabold',
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    activeTabClass: 'text-blue-300 bg-blue-500/15 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
    activeIndicator: 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'
  },
  {
    id: 'gold',
    name: 'الذهب الخالص (Pure Gold)',
    desc: 'لون ذهبي براق يعكس الفخامة والرقي',
    bgClass: 'bg-[#121008]',
    ambientLight1: 'bg-yellow-500/20',
    ambientLight2: 'bg-amber-600/15',
    previewGradient: 'from-yellow-400 via-amber-500 to-orange-500',
    textAccent: 'text-yellow-400',
    textAccentBright: 'text-yellow-300',
    bgAccent: 'bg-yellow-500/15',
    borderAccent: 'border-yellow-500/30',
    btnPrimary: 'bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold',
    badgeClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    activeTabClass: 'text-yellow-300 bg-yellow-500/15 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.25)]',
    activeIndicator: 'bg-yellow-400 shadow-[0_0_8px_#eab308]'
  },
  {
    id: 'forest',
    name: 'غابات الصنوبر (Pine Forest)',
    desc: 'أخضر داكن وعميق مستوحى من الغابات الكثيفة',
    bgClass: 'bg-[#051008]',
    ambientLight1: 'bg-green-600/20',
    ambientLight2: 'bg-emerald-700/15',
    previewGradient: 'from-green-600 via-emerald-500 to-teal-500',
    textAccent: 'text-green-400',
    textAccentBright: 'text-green-300',
    bgAccent: 'bg-green-500/15',
    borderAccent: 'border-green-500/30',
    btnPrimary: 'bg-green-600 hover:bg-green-700 text-white font-extrabold',
    badgeClass: 'bg-green-500/15 border-green-500/30 text-green-300',
    activeTabClass: 'text-green-300 bg-green-500/15 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.25)]',
    activeIndicator: 'bg-green-500 shadow-[0_0_8px_#22c55e]'
  },
  {
    id: 'neon',
    name: 'النيون السايبربانك (Cyberpunk Neon)',
    desc: 'ألوان النيون الفاقعة السايبورغية المضيئة والمشعة',
    bgClass: 'bg-[#080512]',
    ambientLight1: 'bg-fuchsia-600/20',
    ambientLight2: 'bg-cyan-500/20',
    previewGradient: 'from-fuchsia-600 via-purple-500 to-cyan-500',
    textAccent: 'text-fuchsia-400',
    textAccentBright: 'text-fuchsia-300',
    bgAccent: 'bg-fuchsia-500/15',
    borderAccent: 'border-fuchsia-500/30',
    btnPrimary: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold',
    badgeClass: 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300',
    activeTabClass: 'text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(192,38,211,0.25)]',
    activeIndicator: 'bg-fuchsia-500 shadow-[0_0_8px_#c026d3]'
  },
  {
    id: 'silver',
    name: 'الفضي المعدني (Metallic Silver)',
    desc: 'فضي ورمادي معدني أنيق ذو طابع مستقبلي وبارد',
    bgClass: 'bg-[#0a0a0c]',
    ambientLight1: 'bg-slate-400/15',
    ambientLight2: 'bg-gray-500/10',
    previewGradient: 'from-slate-300 via-gray-400 to-zinc-500',
    textAccent: 'text-slate-300',
    textAccentBright: 'text-white',
    bgAccent: 'bg-slate-500/15',
    borderAccent: 'border-slate-500/30',
    btnPrimary: 'bg-slate-200 hover:bg-white text-black font-extrabold',
    badgeClass: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
    activeTabClass: 'text-slate-200 bg-slate-500/20 border border-slate-400/40 shadow-[0_0_15px_rgba(148,163,184,0.25)]',
    activeIndicator: 'bg-slate-300 shadow-[0_0_8px_#cbd5e1]'
  }
];

export function getStoredThemeId(): string {
  return localStorage.getItem('app-theme') || 'monochrome';
}

export function getCurrentTheme(): ThemeOption {
  const themeId = getStoredThemeId();
  return THEMES.find(t => t.id === themeId) || THEMES[0];
}

export function setStoredTheme(themeId: string) {
  localStorage.setItem('app-theme', themeId);
  window.dispatchEvent(new Event('themeChange'));
}

export function useAppTheme(): ThemeOption {
  const [theme, setTheme] = useState<ThemeOption>(getCurrentTheme());

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(getCurrentTheme());
    };
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  return theme;
}
