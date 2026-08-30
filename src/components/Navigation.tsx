import { LucideIcon } from 'lucide-react';
import { useAppTheme } from '../lib/themeService';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: { id: string; label: string; icon: LucideIcon }[];
}

export function Navigation({ activeTab, setActiveTab, tabs }: NavigationProps) {
  const theme = useAppTheme();

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-[#0f111a]/85 backdrop-blur-2xl border-t border-white/10 shrink-0">
      <div className="flex justify-around items-center h-16 px-3 max-w-xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[60px] h-12 transition-all rounded-xl px-2.5 py-1 ${
                isActive 
                  ? theme.activeTabClass 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? `scale-110 ${theme.textAccent}` : ''}`} />
              <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              {isActive && (
                <span className={`absolute -bottom-1 w-6 h-0.5 rounded-full ${theme.activeIndicator}`} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

