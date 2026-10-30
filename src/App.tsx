import { useState, useEffect, useMemo } from 'react';
import { Plus, SlidersHorizontal, ArrowUpDown, Filter, RotateCw, Loader2, Sparkles } from 'lucide-react';
import { Series, Episode, QueueItem, SonarrConfig } from './types/sonarr';
import { sonarrApi } from './services/sonarrApi';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { TopAppBar } from './components/TopAppBar';
import { BottomNav } from './components/BottomNav';
import { SeriesCard } from './components/SeriesCard';
import { SeriesDetailModal } from './components/SeriesDetailModal';
import { ActivityScreen } from './components/ActivityScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { AddSeriesScreen } from './components/AddSeriesScreen';
import { SystemScreen } from './components/SystemScreen';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  const [config, setConfig] = useState<SonarrConfig>(() => sonarrApi.getConfig());
  const [currentTab, setCurrentTab] = useState<'series' | 'activity' | 'calendar' | 'add' | 'system'>('series');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Series library state
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [isLoadingSeries, setIsLoadingSeries] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  // Filter & View options
  const [viewMode, setViewMode] = useState<'poster' | 'banner' | 'table'>('poster');
  const [filterStatus, setFilterStatus] = useState<'all' | 'continuing' | 'ended' | 'monitored' | 'missing'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'progress' | 'seasons'>('title');
  const [searchQuery, setSearchQuery] = useState('');

  // Downloads & Activity count state
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0);

  // Toast feedback state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({
      id: String(Date.now()),
      type,
      message
    });
  };

  // Sync dark class on document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load series data
  const loadSeries = async (silent = false) => {
    if (!silent) setIsLoadingSeries(true);
    else setIsRefreshing(true);
    try {
      const data = await sonarrApi.getSeries();
      setSeriesList(data);
    } catch (e: unknown) {
      const error = e as Error;
      showToast('error', error.message || 'Failed to load series');
    } finally {
      setIsLoadingSeries(false);
      setIsRefreshing(false);
    }
  };

  // Check downloads queue count for status bar & bottom nav badge
  const updateQueueCount = async () => {
    try {
      const q = await sonarrApi.getQueue();
      const downloading = q.filter((item) => item.status === 'downloading' || item.status === 'queued');
      setActiveDownloadsCount(downloading.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSeries();
    updateQueueCount();

    // Poll downloads count every 4 seconds
    const interval = setInterval(updateQueueCount, 4000);
    return () => clearInterval(interval);
  }, [config]);

  // Handle configuration update
  const handleConfigUpdated = (newConfig: Partial<SonarrConfig>) => {
    sonarrApi.saveConfig(newConfig);
    setConfig(sonarrApi.getConfig());
  };

  // Filter and sort series
  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesNetwork = s.network?.toLowerCase().includes(q);
        const matchesGenre = s.genres?.some((g) => g.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNetwork && !matchesGenre) return false;
      }

      // Status chip filter
      if (filterStatus === 'continuing') return s.status === 'continuing';
      if (filterStatus === 'ended') return s.status === 'ended';
      if (filterStatus === 'monitored') return s.monitored;
      if (filterStatus === 'missing') {
        const percent = s.statistics?.percentOfEpisodes ?? 100;
        return percent < 100;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return (a.sortTitle || a.title).localeCompare(b.sortTitle || b.title);
      }
      if (sortBy === 'year') {
        return (b.year || 0) - (a.year || 0);
      }
      if (sortBy === 'progress') {
        const progA = a.statistics?.percentOfEpisodes ?? 0;
        const progB = b.statistics?.percentOfEpisodes ?? 0;
        return progB - progA;
      }
      if (sortBy === 'seasons') {
        return (b.seasons?.length || 0) - (a.seasons?.length || 0);
      }
      return 0;
    });
  }, [seriesList, searchQuery, filterStatus, sortBy]);

  const handleToggleMonitored = async (s: Series, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await sonarrApi.toggleSeriesMonitored(s.id, !s.monitored);
      setSeriesList((prev) => prev.map((item) => (item.id === s.id ? updated : item)));
      showToast('info', `${s.title} ${!s.monitored ? 'monitored' : 'unmonitored'}`);
    } catch {
      showToast('error', 'Failed to toggle monitored status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Android System Status Bar */}
      <AndroidStatusBar activeDownloadsCount={activeDownloadsCount} />

      {/* Top App Bar with Sonarr branding & view controls */}
      <TopAppBar
        currentTab={currentTab}
        config={config}
        isConnected={!config.demoMode && Boolean(config.apiKey)}
        isConnecting={false}
        onOpenSettings={() => setCurrentTab('system')}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onRefresh={() => loadSeries(true)}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Dynamic Viewport Container */}
      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto">
        {/* TAB 1: SERIES LIBRARY */}
        {currentTab === 'series' && (
          <div className="flex-1 flex flex-col p-4 w-full pb-24">
            {/* Filter Chips Bar (Horizontal mobile scrollable) */}
            <div className="flex items-center justify-between gap-2 pb-3 overflow-x-auto no-scrollbar select-none">
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { id: 'all', label: 'All Shows' },
                  { id: 'continuing', label: 'Continuing' },
                  { id: 'ended', label: 'Ended' },
                  { id: 'monitored', label: 'Monitored' },
                  { id: 'missing', label: 'Missing Eps' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
                      filterStatus === f.id
                        ? 'bg-sky-500 text-slate-950 font-semibold shadow-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-1 shrink-0 ml-auto pl-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 hidden xs:inline font-mono">
                  <ArrowUpDown className="w-3 h-3" /> Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="title">Title</option>
                  <option value="year">Year</option>
                  <option value="progress">Progress</option>
                  <option value="seasons">Seasons</option>
                </select>
              </div>
            </div>

            {/* Series Cards Container */}
            {isLoadingSeries ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                <span className="text-xs font-mono">Loading TV series library...</span>
              </div>
            ) : filteredSeries.length === 0 ? (
              <div className="py-20 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-200">No series found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `No TV shows matching "${searchQuery}". Clear your search query or add a new show.`
                    : 'Your library is empty. Tap the button below to search and add shows to Sonarr.'}
                </p>
                <button
                  onClick={() => setCurrentTab('add')}
                  className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Search New Series</span>
                </button>
              </div>
            ) : viewMode === 'poster' ? (
              /* POSTER GRID: Responsive 2-column mobile, 3-4 column tablet, 5 column desktop */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredSeries.map((s) => (
                  <SeriesCard
                    key={s.id}
                    series={s}
                    viewMode="poster"
                    onClick={() => setSelectedSeries(s)}
                    onToggleMonitored={(e) => handleToggleMonitored(s, e)}
                  />
                ))}
              </div>
            ) : viewMode === 'banner' ? (
              /* BANNER VIEW */
              <div className="space-y-3">
                {filteredSeries.map((s) => (
                  <SeriesCard
                    key={s.id}
                    series={s}
                    viewMode="banner"
                    onClick={() => setSelectedSeries(s)}
                    onToggleMonitored={(e) => handleToggleMonitored(s, e)}
                  />
                ))}
              </div>
            ) : (
              /* COMPACT TABLE / LIST VIEW */
              <div className="space-y-2">
                {filteredSeries.map((s) => (
                  <SeriesCard
                    key={s.id}
                    series={s}
                    viewMode="table"
                    onClick={() => setSelectedSeries(s)}
                    onToggleMonitored={(e) => handleToggleMonitored(s, e)}
                  />
                ))}
              </div>
            )}

            {/* Floating Action Button (FAB) on Series screen */}
            <div className="fixed bottom-20 right-4 sm:right-8 z-30">
              <button
                onClick={() => setCurrentTab('add')}
                className="w-14 h-14 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-transform group"
                aria-label="Add new series"
                title="Add new series"
              >
                <Plus className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-90 duration-200" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY & DOWNLOAD MONITORING */}
        {currentTab === 'activity' && (
          <ActivityScreen
            onShowToast={showToast}
            onQueueUpdated={updateQueueCount}
          />
        )}

        {/* TAB 3: CALENDAR & UPCOMING AIRINGS */}
        {currentTab === 'calendar' && (
          <CalendarScreen onShowToast={showToast} />
        )}

        {/* TAB 4: ADD SERIES & SEARCH */}
        {currentTab === 'add' && (
          <AddSeriesScreen
            existingSeries={seriesList}
            onSeriesAdded={(newSeries) => {
              setSeriesList((prev) => [newSeries, ...prev]);
              setSelectedSeries(newSeries);
            }}
            onShowToast={showToast}
            onSelectSeries={(series) => {
              setSelectedSeries(series);
            }}
          />
        )}

        {/* TAB 5: SYSTEM & CONNECTION SETTINGS */}
        {currentTab === 'system' && (
          <SystemScreen
            config={config}
            onConfigUpdated={handleConfigUpdated}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Series Detail Modal (Opens when tapping any series card) */}
      {selectedSeries && (
        <SeriesDetailModal
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onSeriesUpdated={() => {
            loadSeries(true);
            updateQueueCount();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as any)}
        activeDownloadsCount={activeDownloadsCount}
      />

      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
