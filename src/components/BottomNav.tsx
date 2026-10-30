import { Tv, Activity, CalendarDays, PlusCircle, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  activeDownloadsCount: number;
}

export function BottomNav({ currentTab, onTabChange, activeDownloadsCount }: BottomNavProps) {
  const tabs = [
    { id: 'series', label: 'Series', icon: Tv },
    { id: 'activity', label: 'Activity', icon: Activity, badge: activeDownloadsCount },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'add', label: 'Add Series', icon: PlusCircle },
    { id: 'system', label: 'System', icon: Settings }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 pb-safe shadow-xl select-none">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[48px] relative group transition-transform active:scale-95"
              aria-label={tab.label}
            >
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-slate-950 text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center animate-pulse shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-sky-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
