import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { SITE_CONFIG } from '../config/site.ts';
import {
  ArticleItem,
  DevelopingEventItem,
  EventTimelineUpdate,
} from '../types/news.ts';
import { formatRelativeTime, StoryCard } from '../components/StoryCard.tsx';

export const EventsListPage: React.FC = () => {
  const [events, setEvents] = useState<DevelopingEventItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Developing Stories & Live Event Tracker — ${SITE_CONFIG.name}`;
    fetch('/api/events')
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || []);
      })
      .catch((err) => console.error('Failed to load events:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(
    (e) => statusFilter === 'all' || e.status === statusFilter
  );

  return (
    <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-[#B91C1C] dark:text-red-400 mb-2">
          <Radio className="w-4 h-4" />
          <span>Multi-Source Live Event Tracking</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
          Developing Global Stories
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Each developing event record clusters reports from multiple independent publishers,
          separates verified facts from unconfirmed claims, and maintains a chronological timeline
          of updates.
        </p>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-slate-800 rounded w-fit mt-6">
          {[
            { id: 'all', label: 'All Tracked Events' },
            { id: 'developing', label: 'Developing' },
            { id: 'ongoing', label: 'Ongoing' },
            { id: 'monitoring', label: 'Monitoring' },
            { id: 'concluded', label: 'Concluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">
          Loading developing event trackers…
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((ev) => (
            <section
              key={ev.id}
              className="p-6 sm:p-8 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-stone-300 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-stone-600 dark:text-slate-400">
                  <span className="uppercase font-semibold text-[#9A3412] dark:text-amber-400">
                    Status: {ev.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{ev.regionName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ev.sourceCount} Publishers Corroborated</span>
                  <span aria-hidden="true">·</span>
                  <span>Importance {ev.importanceScore}/100</span>
                </div>
                <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                  Last Verified {formatRelativeTime(ev.lastVerifiedAt)}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
                <Link to={`/event/${ev.slug}`} className="hover:underline">
                  {ev.title}
                </Link>
              </h2>

              <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed max-w-4xl mb-6">
                {ev.overview}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-mono-tabular uppercase text-emerald-700 dark:text-emerald-400 font-semibold mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Known & Verified Information</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-stone-700 dark:text-slate-300">
                    {(ev.knownFacts.length > 0 ? ev.knownFacts : ev.keyFacts).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-mono-tabular uppercase text-[#9A3412] dark:text-amber-400 font-semibold mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Unconfirmed / Under Investigation</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-stone-700 dark:text-slate-300">
                    {ev.unconfirmedClaims.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-slate-800">
                <span className="text-xs text-stone-500 dark:text-slate-400">
                  What to watch: {ev.whatToWatch}
                </span>
                <Link
                  to={`/event/${ev.slug}`}
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  Open Full Event Timeline & Sources →
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<DevelopingEventItem | null>(null);
  const [timeline, setTimeline] = useState<EventTimelineUpdate[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvent = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setTimeline(data.timeline || []);
        setRelatedArticles(data.relatedArticles || []);
        if (data.event?.title) {
          document.title = `${data.event.title} — Live Event Tracker — ${SITE_CONFIG.name}`;
        }
      }
    } catch (err) {
      console.error('Failed to load event detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  if (loading) {
    return (
      <main className="max-w-[1220px] mx-auto px-4 sm:px-6 py-12 text-sm text-stone-500">
        Loading developing event dossier…
      </main>
    );
  }

  if (!event) {
    return (
      <main className="max-w-[1220px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-editorial font-bold mb-2">Developing Event Not Found</h1>
        <Link to="/events" className="text-xs font-semibold text-[#1E3A8A] underline">
          View All Developing Events
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[1220px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-3">
          <span className="uppercase font-semibold text-[#B91C1C] dark:text-red-400">
            Event Status: {event.status}
          </span>
          <span aria-hidden="true">·</span>
          <Link to={`/country/${event.countryCode}`} className="hover:underline">
            {event.regionName} ({event.countryCode})
          </Link>
          <span aria-hidden="true">·</span>
          <span>{event.sourceCount} Publishers Corroborated</span>
          <span aria-hidden="true">·</span>
          <span>Importance Score {event.importanceScore}/100</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Last Verified {formatRelativeTime(event.lastVerifiedAt)}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-editorial font-bold leading-tight text-stone-950 dark:text-white mb-4">
          {event.title}
        </h1>

        <p className="text-base text-stone-700 dark:text-slate-300 max-w-4xl leading-relaxed">
          {event.overview}
        </p>
      </header>

      {/* Known vs Unconfirmed Separation Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-emerald-700 dark:text-emerald-400 font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmed & Corroborated Facts</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
            {(event.knownFacts.length > 0 ? event.knownFacts : event.keyFacts).map((fact, idx) => (
              <li key={idx}>{fact}</li>
            ))}
          </ul>
        </div>

        <div className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-[#9A3412] dark:text-amber-400 font-semibold mb-3">
            <AlertCircle className="w-4 h-4" />
            <span>Unconfirmed Claims & Open Questions</span>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
            {event.unconfirmedClaims.map((claim, idx) => (
              <li key={idx}>{claim}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left 7 Cols: Chronological Timeline */}
        <div className="lg:col-span-7">
          <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white pb-2 mb-6 border-b border-stone-900 dark:border-slate-300">
            Chronological Event Timeline
          </h2>

          <div className="space-y-6">
            {timeline.map((item, idx) => {
              const dt = new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(item.timestamp));

              return (
                <div
                  key={item.id}
                  className="p-5 border border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-2">
                    <span>
                      Update #{timeline.length - idx} · {dt}
                    </span>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#1E3A8A] dark:text-blue-400 hover:underline"
                    >
                      <span>{item.sourceName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h3 className="text-base font-editorial font-bold text-stone-950 dark:text-white mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Background Context, Entities & What to Watch */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">
              Background & Historical Context
            </h3>
            <p className="text-sm text-stone-800 dark:text-slate-200 leading-relaxed mb-4">
              {event.backgroundContext}
            </p>
            <div className="pt-4 border-t border-stone-300 dark:border-slate-800">
              <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-1">
                What to Watch Next
              </h4>
              <p className="text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
                {event.whatToWatch}
              </p>
            </div>
          </div>

          <div className="p-6 border border-stone-200 dark:border-slate-800 space-y-3 text-xs">
            <h3 className="font-mono-tabular uppercase tracking-wider text-stone-500 dark:text-slate-400">
              Reliably Identified Entities
            </h3>
            {event.entities.organizations.length > 0 && (
              <div>
                <span className="text-stone-500 dark:text-slate-400">Institutions: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {event.entities.organizations.join(' · ')}
                </span>
              </div>
            )}
            {event.entities.locations.length > 0 && (
              <div>
                <span className="text-stone-500 dark:text-slate-400">Locations: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {event.entities.locations.join(' · ')}
                </span>
              </div>
            )}
            {event.entities.people.length > 0 && (
              <div>
                <span className="text-stone-500 dark:text-slate-400">Key Figures: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {event.entities.people.join(' · ')}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Multi-Source Articles Attached to this Event */}
      {relatedArticles.length > 0 && (
        <section className="mt-14 pt-10 border-t border-stone-200 dark:border-slate-800">
          <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white mb-6">
            Corroborating Reports Across Publishers ({relatedArticles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.map((art) => (
              <StoryCard key={art.id} article={art} variant="featured" showImage={true} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
