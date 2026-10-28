import React, { useEffect, useState } from 'react';
import { Calendar, ExternalLink, Grid, Layers, List, MapPin } from 'lucide-react';
import { SITE_CONFIG } from '../config/site.ts';
import { UpcomingCalendarEvent } from '../types/news.ts';

export const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<UpcomingCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'category'>('list');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'confirmed' | 'tentative'>('all');

  useEffect(() => {
    document.title = `Global Upcoming Events Calendar — ${SITE_CONFIG.name}`;
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((data) => setEvents(data.upcomingEvents || []))
      .catch((err) => console.error('Failed to load calendar:', err))
      .finally(() => setLoading(false));
  }, []);

  const distinctCategories = Array.from(new Set(events.map((e) => e.category)));

  const filtered = events.filter((ev) => {
    if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false;
    if (scheduleFilter === 'confirmed' && ev.isTentativeDate) return false;
    if (scheduleFilter === 'tentative' && !ev.isTentativeDate) return false;
    return true;
  });

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-[#1E3A8A] dark:text-blue-400 mb-2">
          <Calendar className="w-4 h-4" />
          <span>Scheduled International Milestones & Institutional Releases</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
          Global Upcoming Events Calendar
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Tracking central bank rate decisions, international summits, orbital launch windows,
          economic data releases, and scientific milestones from official schedules. Confirmed dates
          are explicitly distinguished from tentative windows.
        </p>

        {/* View Switcher & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 mt-6 border-t border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-slate-800 rounded">
            <button
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Chronological List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Calendar Grid</span>
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                viewMode === 'category'
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Category</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-1.5"
            >
              <option value="all">All Event Categories</option>
              {distinctCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value as any)}
              className="bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-1.5"
            >
              <option value="all">All Dates (Confirmed + Tentative)</option>
              <option value="confirmed">Confirmed Official Dates Only</option>
              <option value="tentative">Tentative Launch / Policy Windows</option>
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">
          Loading official global calendar…
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filtered.map((ev) => {
            const startStr = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date(ev.startDate));

            return (
              <div
                key={ev.id}
                className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
              >
                <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-stone-300 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
                  <div className="text-base font-mono-tabular font-bold text-stone-950 dark:text-white">
                    {startStr}
                  </div>
                  <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mt-1">
                    Timezone: {ev.timezone}
                  </div>
                  <div className="text-xs font-mono-tabular mt-1">
                    {ev.isTentativeDate ? (
                      <span className="text-[#9A3412] dark:text-amber-400 font-semibold">
                        Tentative Window
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Confirmed Official Schedule
                      </span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-6">
                  <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-1">
                    {ev.category} · Importance: {ev.importance.toUpperCase()}
                  </div>
                  <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
                    {ev.name}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                    {ev.description}
                  </p>
                </div>

                <div className="md:col-span-3 flex flex-col justify-between text-xs text-stone-600 dark:text-slate-400 space-y-2">
                  <div className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{ev.location}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Official Authority:</span>
                    <a
                      href={ev.officialSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline mt-0.5"
                    >
                      <span>{ev.officialSourceName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ev) => {
            const d = new Date(ev.startDate);
            const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            const dayNum = d.getDate();

            return (
              <div
                key={ev.id}
                className="p-5 border border-stone-200 dark:border-slate-800 flex flex-col justify-between bg-white/80 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-stone-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-mono-tabular uppercase text-stone-500">
                        {month}
                      </span>
                      <div className="text-3xl font-mono-tabular font-bold text-stone-950 dark:text-white">
                        {String(dayNum).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono-tabular">
                      <span className="block text-stone-500">{ev.category}</span>
                      <span
                        className={
                          ev.isTentativeDate
                            ? 'text-[#9A3412] dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }
                      >
                        {ev.isTentativeDate ? 'Tentative' : 'Confirmed'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                    {ev.name}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-4">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-stone-500 truncate max-w-[160px]">{ev.location}</span>
                  <a
                    href={ev.officialSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                  >
                    Official Schedule →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Category View */
        <div className="space-y-8">
          {distinctCategories.map((cat) => {
            const catItems = filtered.filter((e) => e.category === cat);
            if (catItems.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white border-b border-stone-900 dark:border-slate-300 pb-2 mb-4">
                  {cat}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catItems.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800"
                    >
                      <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-1">
                        {new Date(ev.startDate).toDateString()} · {ev.location} ·{' '}
                        {ev.isTentativeDate ? 'Tentative' : 'Confirmed'}
                      </div>
                      <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                        {ev.name}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-slate-300 mb-3">
                        {ev.description}
                      </p>
                      <a
                        href={ev.officialSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                      >
                        Source: {ev.officialSourceName} →
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};
