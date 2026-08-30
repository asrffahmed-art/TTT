import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { auth } from '../lib/firebase';
import { getUserPlan } from '../lib/subscriptionService';
import { useAppTheme } from '../lib/themeService';

interface HeaderProps {
  isAuthenticated?: boolean;
  title: string;
  onOpenSettings?: () => void;
  onOpenSubscription?: () => void;
  onOpenDailyBriefing?: () => void;
  onOpenHistory?: () => void;
  onOpenAuth?: () => void;
}

export function Header({ isAuthenticated, title, onOpenSettings, onOpenSubscription, onOpenDailyBriefing, onOpenHistory, onOpenAuth }: HeaderProps) {
  const [initials, setInitials] = useState('?');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planBadge, setPlanBadge] = useState('Free');
  const theme = useAppTheme();
  const { t, language } = useLanguage();
  const isAuth = isAuthenticated ?? (localStorage.getItem('isAuth') === 'true');

  useEffect(() => {
    const updateUserData = () => {
      if (!localStorage.getItem('isAuth')) {
         setInitials('?');
         setAvatarUrl(null);
         return;
      }
      const name = localStorage.getItem('app-user-name');
      const avatar = localStorage.getItem('app-user-avatar') || auth.currentUser?.photoURL || null;
      if (name) {
        const parts = name.trim().split(' ');
        const inits = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
        setInitials(inits || 'U');
      } else {
        setInitials('U');
      }
      setAvatarUrl(avatar);
      
      const plan = getUserPlan();
      const planNamesEn: Record<string, string> = {
        free: 'Free',
        basic: 'Basic',
        pro: 'Pro',
        max: 'Max',
        ultra: 'Ultra'
      };
      setPlanBadge(planNamesEn[plan.id] || 'Free');
    };

    updateUserData();
    window.addEventListener('storage', updateUserData);
    window.addEventListener('thoth_plan_updated', updateUserData);
    return () => {
      window.removeEventListener('storage', updateUserData);
      window.removeEventListener('thoth_plan_updated', updateUserData);
    };
  }, []);

  return (
    <header className="fixed top-0 w-full z-50 h-16 flex items-center justify-between px-3 md:px-6 bg-[#0f111a]/80 backdrop-blur-2xl border-b border-white/10 shrink-0 pt-safe">
      {/* Left section: Brand logo & Subscription badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-extrabold tracking-tight text-white">THOTH</span>
        {isAuth && onOpenSubscription && (
          <button
            onClick={onOpenSubscription}
            title={language === 'ar' ? 'إدارة الاشتراكات وحدود الاستخدام' : 'Manage Subscriptions and Limits'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black transition-all cursor-pointer shadow-sm active:scale-95 ${theme.badgeClass}`}
          >
            <span className="whitespace-nowrap">{planBadge}</span>
          </button>
        )}
      </div>

      {/* Center section: Page Title without absolute positioning collision */}
      <div className="flex-1 text-center min-w-0 px-2">
        <h1 className="text-xs md:text-sm font-bold tracking-wider text-white/90 truncate">
          {title}
        </h1>
      </div>

      {/* Right section: Settings & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isAuth ? (
          <button
            onClick={onOpenAuth || onOpenSettings}
            className={`px-4 py-1.5 rounded-full ${theme.btnPrimary} font-bold text-xs shadow-lg transition-transform active:scale-95 whitespace-nowrap cursor-pointer`}
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Log In'}
          </button>
        ) : (
          <>
            <button
              onClick={onOpenSettings}
              title={t('settings', 'الإعدادات')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
            >
              <Settings className={`w-4 h-4 ${theme.textAccent} shrink-0`} />
              <span className="hidden sm:inline">{t('settings', 'الإعدادات')}</span>
            </button>
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${theme.previewGradient} border border-white/20 flex items-center justify-center font-bold text-xs shadow-xl text-white overflow-hidden shrink-0`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={language === 'ar' ? 'صورة الملف الشخصي' : 'Profile Picture'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}



