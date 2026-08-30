const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(/interface HeaderProps \{/, "interface HeaderProps {\n  isAuthenticated?: boolean;");

const replaceHeader = `
  const [initials, setInitials] = useState('SA');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planBadge, setPlanBadge] = useState('مجاني');
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
        setInitials(inits);
      } else {
        setInitials('US');
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
`;

code = code.replace(/const \[initials, setInitials\] = useState\('SA'\);[\s\S]*?setPlanBadge\(planNamesEn\[plan\.id\] \|\| 'Free'\);\n    \};/, replaceHeader.trim());

const replaceRightSection = `
      {/* Right section: Settings & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isAuth ? (
           <button
             onClick={onOpenSettings}
             className={\`px-4 py-1.5 rounded-full \${theme.btnPrimary} font-bold text-xs shadow-lg transition-transform active:scale-95 whitespace-nowrap\`}
           >
             {language === 'ar' ? 'تسجيل الدخول' : 'Log In'}
           </button>
        ) : (
          <>
            <button
              onClick={onOpenSettings}
              title={t('settings', 'الإعدادات')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-md"
            >
              <Settings className={\`w-4 h-4 \${theme.textAccent} shrink-0\`} />
              <span className="hidden sm:inline">{t('settings', 'الإعدادات')}</span>
            </button>
            <div className={\`w-8 h-8 rounded-full bg-gradient-to-tr \${theme.previewGradient} border border-white/20 flex items-center justify-center font-bold text-xs shadow-xl text-white overflow-hidden shrink-0\`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={language === 'ar' ? 'صورة الملف الشخصي' : 'Profile Picture'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </>
        )}
      </div>
`;

code = code.replace(/\{\/\* Right section: Settings & Profile \*\/\}[\s\S]*?<\/div>\n    <\/header>/, replaceRightSection.trim() + "\n    </header>");

fs.writeFileSync('src/components/Header.tsx', code);
