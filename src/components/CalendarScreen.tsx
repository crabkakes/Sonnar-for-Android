import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Tv, Search, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Episode } from '../types/sonarr';
import { sonarrApi } from '../services/sonarrApi';
import { formatDate, formatTime } from '../utils/formatters';

interface CalendarScreenProps {
  onSelectEpisode?: (episode: Episode) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function CalendarScreen({ onShowToast }: CalendarScreenProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [daysWindow, setDaysWindow] = useState<{ dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[]>([]);

  useEffect(() => {
    // Generate 14-day sliding window centered around today
    const days: { dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -3; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNumber = d.getDate();
      days.push({
        dateStr,
        dayName,
        dayNumber,
        isToday: i === 0
      });
    }
    setDaysWindow(days);

    async function loadCalendar() {
      try {
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        const end = new Date(today);
        end.setDate(today.getDate() + 14);

        const eps = await sonarrApi.getCalendar(start.toISOString(), end.toISOString());
        setEpisodes(eps);
      } catch (e) {
        console.error('Failed to load calendar', e);
      }
    }
    loadCalendar();
  }, []);

  // Filter episodes for the currently selected date or show upcoming
  const episodesForDate = episodes.filter((ep) => {
    if (!ep.airDateUtc && !ep.airDate) return false;
    const epDateStr = (ep.airDateUtc || ep.airDate || '').split('T')[0];
    return epDateStr === selectedDate;
  });

  const allUpcoming = [...episodes].sort((a, b) => {
    const timeA = new Date(a.airDateUtc || a.airDate || 0).getTime();
    const timeB = new Date(b.airDateUtc || b.airDate || 0).getTime();
    return timeA - timeB;
  });

  return (
    <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full pb-24">
      {/* Month & Year header */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider">
            {new Date(selectedDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button
          onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          Today
        </button>
      </div>

      {/* Horizontal Day Carousel / Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar select-none">
        {daysWindow.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const hasEpisodes = episodes.some((e) => (e.airDateUtc || e.airDate || '').startsWith(day.dateStr));

          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-16 rounded-2xl border transition-all shrink-0 relative active:scale-95 ${
                isSelected
                  ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900/90 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`text-[10px] uppercase font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                {day.dayName}
              </span>
              <span className={`text-base font-mono leading-none mt-1 ${isSelected ? 'text-slate-950' : 'text-slate-100'}`}>
                {day.dayNumber}
              </span>
              {hasEpisodes && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 absolute bottom-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="mt-2 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{formatDate(selectedDate)}</span>
          <span>{episodesForDate.length} {episodesForDate.length === 1 ? 'episode' : 'episodes'} airing</span>
        </div>

        {episodesForDate.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-300">No episodes scheduled for this date</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Check other days on the carousel above or view all upcoming episodes below.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {episodesForDate.map((ep) => (
              <div
                key={ep.id}
                className="p-3.5 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-start justify-between gap-3 shadow-xs hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-sky-400 shrink-0" />
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {ep.series?.title || 'Series'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-sky-400 shrink-0">
                      S{String(ep.seasonNumber).padStart(2, '0')}E{String(ep.episodeNumber).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-200 font-medium truncate mt-0.5">
                    {ep.title}
                  </div>

                  {ep.overview && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ep.overview}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-2">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-sky-400" />
                      {formatTime(ep.airDateUtc) || 'TBA'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{ep.series?.network || 'TV'}</span>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  {ep.hasFile ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Downloaded
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Airing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Next Airing Feed */}
        <div className="pt-6">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
            All Upcoming Airings
          </h3>

          <div className="space-y-2">
            {allUpcoming.slice(0, 5).map((ep) => (
              <div
                key={ep.id}
                className="p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 truncate">{ep.series?.title}</span>
                    <span className="text-[11px] font-mono text-sky-400">
                      S{ep.seasonNumber}E{ep.episodeNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {ep.title}
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono text-[11px] text-slate-400">
                  {formatDate(ep.airDateUtc || ep.airDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
