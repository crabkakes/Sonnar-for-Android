import { LayoutGrid, List, Layers, RotateCw, Search, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import { SonarrConfig } from '../types/sonarr';

interface TopAppBarProps {
  currentTab: string;
  config: SonarrConfig;
  isConnected: boolean;
  isConnecting: boolean;
  onOpenSettings: () => void;
  viewMode: 'poster' | 'banner' | 'table';
  onChangeViewMode: (mode: 'poster' | 'banner' | 'table') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function TopAppBar({
  currentTab,
  config,
  isConnected,
  isConnecting,
  onOpenSettings,
  viewMode,
  onChangeViewMode,
  onRefresh,
  isRefreshing,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme
}: TopAppBarProps) {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'series': return 'Series';
      case 'activity': return 'Activity';
      case 'calendar': return 'Calendar';
      case 'add': return 'Add Series';
      case 'system': return 'System';
      default: return 'Sonarr';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      {/* Primary App Bar Row */}
      <div className="flex items-center justify-between h-14 px-4 gap-2">
        {/* Brand / Title Zone */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400 font-bold">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none whitespace-nowrap">
                {getTabTitle()}
              </h1>
              {/* Connection Pill */}
              <button
                onClick={onOpenSettings}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                  config.demoMode
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : isConnected
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                }`}
                title="Click to view connection settings"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    config.demoMode ? 'bg-amber-400' : isConnected ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span className="whitespace-nowrap">
                  {config.demoMode ? 'Demo' : isConnected ? 'Live' : 'Offline'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ${
              isRefreshing ? 'animate-spin text-sky-400' : ''
            }`}
            aria-label="Refresh library"
            title="Refresh library"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Theme switch */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* View mode toggle on Series tab */}
          {currentTab === 'series' && (
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 ml-1">
              <button
                onClick={() => onChangeViewMode('poster')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'poster' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label="Poster grid view"
                title="Poster Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeViewMode('banner')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'banner' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label="Banner cards view"
                title="Banner View"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label="Compact list view"
                title="Compact List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter / Search Bar (Present on Series screen) */}
      {currentTab === 'series' && (
        <div className="px-4 pb-2.5 pt-0.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter series by title, network, genre..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-700/50 rounded px-1"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
