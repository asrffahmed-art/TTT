const fs = require('fs');
let code = fs.readFileSync('src/components/Settings.tsx', 'utf8');

const subButton = `          {onOpenSubscription && (
            <>
              <button 
                onClick={onOpenSubscription} 
                className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shadow-lg border border-amber-500/30">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">الاشتراكات وحدود الاستخدام</span>
                    <span className="text-[11px] text-amber-300 font-medium">الباقة الحالية: {getUserPlan().name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5 text-amber-300/60 group-hover:text-amber-300 transition-colors" />
                </div>
              </button>
              <div className="h-px w-full bg-white/10"></div>
            </>
          )}`;

const discoverButton = `          {onOpenDiscover && (
            <>
              <button 
                onClick={onOpenDiscover} 
                className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shadow-lg border border-emerald-500/30">
                    <Compass className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">{language === 'ar' ? 'استكشاف النماذج' : 'Discover Models'}</span>
                    <span className="text-[11px] text-white/50">{language === 'ar' ? 'اكتشف قدرات وأدوات THOTH' : 'Explore THOTH capabilities'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </div>
              </button>
              <div className="h-px w-full bg-white/10"></div>
            </>
          )}`;

code = code.replace(subButton + "\\n" + discoverButton, discoverButton + "\\n" + subButton);
fs.writeFileSync('src/components/Settings.tsx', code);
