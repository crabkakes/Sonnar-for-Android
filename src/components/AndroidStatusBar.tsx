import { useState, useEffect } from 'react';
import { Wifi, Signal, BatteryMedium } from 'lucide-react';

interface AndroidStatusBarProps {
  activeDownloadsCount?: number;
}

export function AndroidStatusBar({ activeDownloadsCount = 0 }: AndroidStatusBarProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-slate-950 text-slate-300 px-4 py-1.5 flex items-center justify-between text-xs font-medium select-none z-50 border-b border-slate-900/60">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-200 tracking-tight">{time || '09:41'}</span>
        {activeDownloadsCount > 0 && (
          <div className="flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded text-[10px] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
            <span>{activeDownloadsCount} downloading</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <Wifi className="w-3.5 h-3.5" />
        <Signal className="w-3.5 h-3.5" />
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] font-mono">88%</span>
          <BatteryMedium className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </div>
  );
}
