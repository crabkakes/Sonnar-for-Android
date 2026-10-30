import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Check,
  Tv,
  Folder,
  Sliders,
  Sparkles,
  Loader2,
  Bookmark,
  ChevronDown,
  Info
} from 'lucide-react';
import { Series, RootFolder, QualityProfile } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';

interface AddSeriesScreenProps {
  existingSeries: Series[];
  onSeriesAdded: (series: Series) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onSelectSeries: (series: Series) => void;
}

export function AddSeriesScreen({
  existingSeries,
  onSeriesAdded,
  onShowToast,
  onSelectSeries
}: AddSeriesScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState<Partial<Series>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Partial<Series> | null>(null);

  // Add form options state
  const [rootFolders, setRootFolders] = useState<RootFolder[]>([]);
  const [selectedRootFolder, setSelectedRootFolder] = useState<string>('/data/media/tv');
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number>(2);
  const [monitorOption, setMonitorOption] = useState<'all' | 'future' | 'missing' | 'none'>('all');
  const [seriesType, setSeriesType] = useState<'standard' | 'daily' | 'anime'>('standard');
  const [seasonFolder, setSeasonFolder] = useState<boolean>(true);
  const [searchForMissingEpisodes, setSearchForMissingEpisodes] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState(false);

  // Load root folders and quality profiles
  useEffect(() => {
    async function loadConfig() {
      try {
        const [folders, profiles] = await Promise.all([
          sonarrApi.getRootFolders(),
          sonarrApi.getQualityProfiles()
        ]);
        setRootFolders(folders);
        if (folders.length > 0) setSelectedRootFolder(folders[0].path);
        setQualityProfiles(profiles);
        if (profiles.length > 0) setSelectedProfileId(profiles[0].id);
      } catch (e) {
        console.error('Failed to load folders/profiles', e);
      }
    }
    loadConfig();
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Execute lookup
  useEffect(() => {
    let isMounted = true;
    async function executeLookup() {
      if (!debouncedTerm.trim()) {
        // Show default popular shows when search is empty
        const defaultLookup = await sonarrApi.lookupSeries('Severance');
        if (isMounted) setResults(defaultLookup);
        return;
      }

      setIsSearching(true);
      try {
        const res = await sonarrApi.lookupSeries(debouncedTerm);
        if (isMounted) setResults(res);
      } catch (e) {
        console.error('Lookup failed', e);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }

    executeLookup();
    return () => { isMounted = false; };
  }, [debouncedTerm]);

  const isAlreadyInCollection = (title?: string) => {
    if (!title) return false;
    return existingSeries.some((s) => s.title.toLowerCase() === title.toLowerCase());
  };

  const getExistingSeries = (title?: string) => {
    if (!title) return null;
    return existingSeries.find((s) => s.title.toLowerCase() === title.toLowerCase()) || null;
  };

  const handleOpenAddModal = (item: Partial<Series>) => {
    setSelectedResult(item);
  };

  const handleConfirmAdd = async () => {
    if (!selectedResult || !selectedResult.title) return;
    setIsAdding(true);
    try {
      const added = await sonarrApi.addSeries({
        title: selectedResult.title,
        tvdbId: selectedResult.tvdbId,
        rootFolderPath: selectedRootFolder,
        qualityProfileId: selectedProfileId,
        monitored: monitorOption !== 'none',
        seasonFolder,
        seriesType,
        searchForMissingEpisodes,
        overview: selectedResult.overview,
        year: selectedResult.year,
        network: selectedResult.network,
        genres: selectedResult.genres
      });

      onSeriesAdded(added);
      setSelectedResult(null);
      onShowToast('success', `Added "${added.title}" to library${searchForMissingEpisodes ? ' & queued search' : ''}`);
    } catch (e: unknown) {
      const error = e as Error;
      onShowToast('error', error.message || 'Failed to add series to Sonarr');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full pb-24">
      {/* Search Input Bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search new series (e.g. Shogun, Severance, Fallout)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors shadow-sm"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
        <span className="font-mono">
          {debouncedTerm ? `Search Results for "${debouncedTerm}"` : 'Popular & Suggested Series'}
        </span>
        {isSearching && (
          <div className="flex items-center gap-1.5 text-sky-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Searching TVDB...</span>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {results.length === 0 && !isSearching ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            No TV shows found matching "{debouncedTerm}". Try searching a different title or keyword.
          </div>
        ) : (
          results.map((item, idx) => {
            const inCollection = isAlreadyInCollection(item.title);
            const existing = inCollection ? getExistingSeries(item.title) : null;

            return (
              <div
                key={item.tvdbId || item.title || idx}
                className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex flex-col sm:flex-row items-start gap-3.5 hover:bg-slate-800/80 transition-colors shadow-xs"
              >
                {/* Poster / Thumbnail placeholder */}
                <div className="w-16 h-24 bg-slate-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-slate-700/60">
                  <Tv className="w-6 h-6 text-sky-400 opacity-70" />
                </div>

                {/* Show Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-100 leading-tight">
                      {item.title}
                    </h3>
                    {inCollection && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> In Library
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <span>{item.year || '2026'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.network || 'Streaming'}</span>
                    {item.ratings?.value && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-400 font-mono">★ {item.ratings.value}</span>
                      </>
                    )}
                    {item.genres && item.genres.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.genres.join(', ')}</span>
                      </>
                    )}
                  </div>

                  {item.overview && (
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {item.overview}
                    </p>
                  )}
                </div>

                {/* Action CTA */}
                <div className="w-full sm:w-auto flex sm:flex-col justify-end shrink-0 pt-2 sm:pt-0">
                  {inCollection ? (
                    <button
                      onClick={() => existing && onSelectSeries(existing)}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Tv className="w-4 h-4 text-sky-400" />
                      <span>View in Library</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenAddModal(item)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-transform shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Sonarr</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Series Configuration Sheet / Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                  Add New Series
                </span>
                <h2 className="text-lg font-bold text-slate-100 truncate">
                  {selectedResult.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Sheet Form Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Root Folder selection */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-sky-400" /> Root Storage Folder
                </label>
                <select
                  value={selectedRootFolder}
                  onChange={(e) => setSelectedRootFolder(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                >
                  {rootFolders.map((rf) => (
                    <option key={rf.id} value={rf.path}>
                      {rf.path}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monitor Option */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-sky-400" /> Monitor Episodes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'All Episodes' },
                    { id: 'future', label: 'Future Only' },
                    { id: 'missing', label: 'Missing Episodes' },
                    { id: 'none', label: 'None' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMonitorOption(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        monitorOption === opt.id
                          ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Profile */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" /> Quality Profile
                </label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {qualityProfiles.map((qp) => (
                    <option key={qp.id} value={qp.id}>
                      {qp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Series Type */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Series Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard', label: 'Standard' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'anime', label: 'Anime' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSeriesType(st.id as any)}
                      className={`py-2 px-3 rounded-xl border text-center transition-colors ${
                        seriesType === st.id
                          ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-semibold'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkboxes */}
              <div className="pt-2 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seasonFolder}
                    onChange={(e) => setSeasonFolder(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-200 font-medium">Create Season Folders</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={searchForMissingEpisodes}
                    onChange={(e) => setSearchForMissingEpisodes(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-500 focus:ring-sky-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-200 font-medium">
                    Start search for missing episodes immediately
                  </span>
                </label>
              </div>
            </div>

            {/* Sheet Footer CTA */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                disabled={isAdding}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 text-xs font-bold flex items-center gap-2 transition-transform shadow-md"
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add Series</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
