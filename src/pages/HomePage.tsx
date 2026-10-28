import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  FileText,
  Filter,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { HomepagePayload } from '../types/news.ts';
import { BreakingTicker } from '../components/BreakingTicker.tsx';
import { formatRelativeTime, StoryCard } from '../components/StoryCard.tsx';
import { WorldGlanceMap } from '../components/WorldGlanceMap.tsx';

export const HomePage: React.FC = () => {
  const [data, setData] = useState<HomepagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest News Feed Filters
  const [feedCountry, setFeedCountry] = useState<string>('ALL');
  const [feedCategory, setFeedCategory] = useState<string>('all');
  const [feedSource, setFeedSource] = useState<string>('all');
  const [feedTimeRange, setFeedTimeRange] = useState<string>('all');
  const [feedVisibleCount, setFeedVisibleCount] = useState<number>(8);

  const loadHomepage = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await fetch('/api/homepage');
      if (!res.ok) throw new Error('Unable to retrieve news intelligence feed');
      const payload: HomepagePayload = await res.json();
      setData(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to load news feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    document.title = `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
    loadHomepage();
  }, [loadHomepage]);

  if (loading && !data) {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-stone-200 dark:bg-slate-800 w-1/3 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="h-10 bg-stone-200 dark:bg-slate-800 rounded w-5/6" />
              <div className="h-24 bg-stone-200 dark:bg-slate-800 rounded" />
              <div className="h-20 bg-stone-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="lg:col-span-5 h-72 bg-stone-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-60 bg-stone-200 dark:bg-slate-800 rounded" />
            <div className="h-60 bg-stone-200 dark:bg-slate-800 rounded" />
            <div className="h-60 bg-stone-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="max-w-lg mx-auto p-8 border border-stone-300 dark:border-slate-800 bg-[#F4F0E8] dark:bg-slate-900">
          <h1 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
            Wire Service Temporarily Unavailable
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => loadHomepage()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded hover:bg-[#172E6E] cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const allPool = [
    ...(data.leadStory ? [data.leadStory] : []),
    ...data.topHeadlines,
    ...data.latestFeed,
  ];
  const uniqueArticlesMap = new Map(allPool.map((a) => [a.id, a]));
  const allUniqueArticles = Array.from(uniqueArticlesMap.values());

  // Apply Latest News Feed client-side filters
  const nowMs = Date.now();
  const filteredLatestFeed = data.latestFeed.filter((art) => {
    if (feedCountry !== 'ALL') {
      if (art.countryCode !== feedCountry && !(feedCountry === 'IN' && art.categorySlug === 'india')) {
        return false;
      }
    }
    if (feedCategory !== 'all' && art.categorySlug !== feedCategory) {
      return false;
    }
    if (feedSource !== 'all' && art.sourceName !== feedSource) {
      return false;
    }
    if (feedTimeRange === '6h' && nowMs - new Date(art.publishedAt).getTime() > 6 * 3600 * 1000) {
      return false;
    }
    if (feedTimeRange === '24h' && nowMs - new Date(art.publishedAt).getTime() > 24 * 3600 * 1000) {
      return false;
    }
    return true;
  });

  const distinctSources = Array.from(new Set(allUniqueArticles.map((a) => a.sourceName)));

  const sectorConfigs = [
    {
      title: 'India National & Regional Desk',
      slug: 'india',
      link: '/country/IN',
      filterFn: (a: any) => a.countryCode === 'IN' || a.categorySlug === 'india',
    },
    {
      title: 'Business, Economy & Financial Markets',
      slug: 'business',
      link: '/category/business',
      filterFn: (a: any) => a.categorySlug === 'business' || a.categorySlug === 'markets',
    },
    {
      title: 'Technology & Artificial Intelligence',
      slug: 'technology',
      link: '/category/technology',
      filterFn: (a: any) => a.categorySlug === 'technology',
    },
    {
      title: 'Science, Research & Space Exploration',
      slug: 'science',
      link: '/category/science',
      filterFn: (a: any) => a.categorySlug === 'science' || a.categorySlug === 'space',
    },
    {
      title: 'Climate, Environment & Energy',
      slug: 'climate',
      link: '/category/climate',
      filterFn: (a: any) => a.categorySlug === 'climate' || a.categorySlug === 'energy',
    },
    {
      title: 'Health, Medicine & Public Safety',
      slug: 'health',
      link: '/category/health',
      filterFn: (a: any) => a.categorySlug === 'health' || a.categorySlug === 'disasters',
    },
    {
      title: 'Sports & International Athletics',
      slug: 'sports',
      link: '/category/sports',
      filterFn: (a: any) => a.categorySlug === 'sports',
    },
  ];

  return (
    <div>
      {/* B. Breaking News Ticker */}
      <BreakingTicker
        stories={data.breakingNews}
        lastUpdated={data.lastUpdated}
        onRefresh={() => loadHomepage(true)}
        isRefreshing={refreshing}
      />

      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-8">
        {/* C. Lead Developing Story */}
        {data.leadStory && (
          <section aria-label="Lead Developing Story" className="mb-10">
            <StoryCard article={data.leadStory} variant="lead" />
          </section>
        )}

        {/* D & E. 3-Tier Editorial Grid: Top Global Headlines (Left 8 cols) + Today's Top 10 (Right 4 cols) */}
        <section
          aria-label="Top Global Headlines and Today's Top 10"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-stone-200 dark:border-slate-800"
        >
          {/* Left 8 Columns: Top Global Developments */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between border-b border-stone-900 dark:border-slate-300 pb-2 mb-6">
              <h2 className="text-xl sm:text-2xl font-editorial font-bold text-stone-950 dark:text-white">
                Top Global Developments
              </h2>
              <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400">
                Multi-Source Curated Grid
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {data.topHeadlines.slice(0, 4).map((article) => (
                <StoryCard key={article.id} article={article} variant="featured" showImage={true} />
              ))}
            </div>

            {data.topHeadlines.length > 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {data.topHeadlines.slice(4, 8).map((article) => (
                  <StoryCard
                    key={article.id}
                    article={article}
                    variant="compact"
                    showImage={false}
                  />
                ))}
              </div>
            )}

            {/* Developing Stories & Live Event Timelines Highlight */}
            {data.developingEvents.length > 0 && (
              <div className="mt-10 pt-8 border-t border-stone-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
                    <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
                      Active Developing Stories & Multi-Source Timelines
                    </h2>
                  </div>
                  <Link
                    to="/events"
                    className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                  >
                    All Live Events →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {data.developingEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-5 bg-[#F4F0E8] dark:bg-slate-900/70 border border-stone-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-2">
                          <span className="uppercase font-semibold text-[#9A3412] dark:text-amber-400">
                            {ev.status}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ev.regionName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ev.sourceCount} Publishers Tracked</span>
                        </div>
                        <h3 className="text-base font-editorial font-bold text-stone-950 dark:text-white mb-2">
                          <Link to={`/event/${ev.slug}`} className="hover:underline">
                            {ev.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-3">
                          {ev.overview}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200/80 dark:border-slate-800">
                        <span className="font-mono-tabular text-stone-500 dark:text-slate-400">
                          Verified {formatRelativeTime(ev.lastVerifiedAt)}
                        </span>
                        <Link
                          to={`/event/${ev.slug}`}
                          className="font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                        >
                          Inspect Timeline →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Columns: E. Today's 10 Most Important Stories */}
          <aside className="lg:col-span-4 lg:border-l lg:border-stone-200 dark:lg:border-slate-800 lg:pl-8">
            <div className="border-b border-stone-900 dark:border-slate-300 pb-2 mb-4">
              <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
                Today’s 10 Most Important Stories
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                Ranked by global significance, human impact, independent corroboration, and source
                reliability — never click volume.
              </p>
            </div>

            <div className="divide-y divide-stone-200 dark:divide-slate-800">
              {data.top10Today.slice(0, 10).map((story, idx) => (
                <StoryCard
                  key={story.id}
                  article={story}
                  variant="numbered"
                  indexNumber={idx + 1}
                  showWhyItMatters={true}
                />
              ))}
            </div>
          </aside>
        </section>

        {/* G. World at a Glance (Interactive World Map + Regional Intelligence) */}
        <WorldGlanceMap articles={allUniqueArticles} />

        {/* H1. Daily Executive Briefing & News Explained Spotlight */}
        {data.briefings.length > 0 && (
          <section
            aria-label="Daily Briefing and News Explained"
            className="py-10 border-b border-stone-200 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">
                  AI-Assisted Synthesis & Structural Context
                </p>
                <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white">
                  Daily Briefings & News Explained
                </h2>
              </div>
              <Link
                to="/briefings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Briefing Center & Generate Custom Digest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.briefings.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-2">
                      <span className="uppercase font-semibold text-[#1E3A8A] dark:text-blue-400">
                        {b.type === 'explainer' ? 'News Explained' : `${b.type} Briefing`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{b.coveragePeriod}</span>
                    </div>
                    <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                      <Link to="/briefings" className="hover:underline">
                        {b.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-4">
                      {b.leadSynthesis}
                    </p>
                    <ul className="space-y-2 border-t border-stone-200/80 dark:border-slate-800 pt-3 mb-4">
                      {b.items.slice(0, 2).map((item, i) => (
                        <li key={i} className="text-xs text-stone-700 dark:text-slate-300">
                          <span className="font-semibold text-stone-900 dark:text-white">
                            {item.eventTitle}:
                          </span>{' '}
                          {item.whyItMatters}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-stone-500 dark:text-slate-400 pt-3 border-t border-stone-200 dark:border-slate-800">
                    <span>Model: {b.modelName}</span>
                    <Link
                      to="/briefings"
                      className="font-sans font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                    >
                      Read Full Digest →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* F. Latest News Feed (Chronological Wire with Filters) + Upcoming Calendar Sidebar */}
        <section
          aria-label="Chronological Latest News Feed"
          className="py-10 border-b border-stone-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-10"
        >
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-900 dark:border-slate-300 pb-3 mb-5">
              <div>
                <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white">
                  Latest Global Dispatches
                </h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Chronological wire feed deduplicated across active publishers
                </p>
              </div>
              <button
                onClick={() => loadHomepage(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-slate-700 rounded hover:bg-stone-200/60 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Wire</span>
              </button>
            </div>

            {/* Interactive Filter Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-6">
              <div>
                <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
                  Country / Region
                </label>
                <select
                  value={feedCountry}
                  onChange={(e) => setFeedCountry(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2 py-1.5 text-stone-800 dark:text-slate-200"
                >
                  <option value="ALL">All Regions</option>
                  {COUNTRIES_REGIONS_TAXONOMY.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
                  Subject Desk
                </label>
                <select
                  value={feedCategory}
                  onChange={(e) => setFeedCategory(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2 py-1.5 text-stone-800 dark:text-slate-200"
                >
                  <option value="all">All Subjects</option>
                  {CATEGORIES_TAXONOMY.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
                  Source Publisher
                </label>
                <select
                  value={feedSource}
                  onChange={(e) => setFeedSource(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2 py-1.5 text-stone-800 dark:text-slate-200"
                >
                  <option value="all">All Sources</option>
                  {distinctSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
                  Time Window
                </label>
                <select
                  value={feedTimeRange}
                  onChange={(e) => setFeedTimeRange(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2 py-1.5 text-stone-800 dark:text-slate-200"
                >
                  <option value="all">All Recent</option>
                  <option value="6h">Past 6 Hours</option>
                  <option value="24h">Past 24 Hours</option>
                </select>
              </div>
            </div>

            {filteredLatestFeed.length === 0 ? (
              <div className="p-8 border border-stone-200 dark:border-slate-800 text-center">
                <Filter className="w-6 h-6 mx-auto text-stone-400 mb-2" />
                <p className="text-sm font-medium text-stone-800 dark:text-slate-200 mb-1">
                  No dispatches match the current filter combination.
                </p>
                <button
                  onClick={() => {
                    setFeedCountry('ALL');
                    setFeedCategory('all');
                    setFeedSource('all');
                    setFeedTimeRange('all');
                  }}
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 underline mt-2 cursor-pointer"
                >
                  Reset Feed Filters
                </button>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-stone-200 dark:divide-slate-800">
                  {filteredLatestFeed.slice(0, feedVisibleCount).map((art) => (
                    <StoryCard key={art.id} article={art} variant="compact" showImage={false} />
                  ))}
                </div>
                {feedVisibleCount < filteredLatestFeed.length && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setFeedVisibleCount((c) => c + 8)}
                      className="px-5 py-2 text-xs font-semibold border border-stone-300 dark:border-slate-700 rounded hover:bg-stone-200/50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Load More Dispatches ({filteredLatestFeed.length - feedVisibleCount}{' '}
                      remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 4 Cols: Upcoming Global Events Calendar + Editorial Importance vs. Reader Attention */}
          <div className="lg:col-span-4 space-y-8">
            <div className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-300 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                  <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white">
                    Upcoming Global Events
                  </h3>
                </div>
                <Link
                  to="/calendar"
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                >
                  Full Calendar →
                </Link>
              </div>

              <div className="space-y-4">
                {data.upcomingEvents.slice(0, 5).map((ev) => {
                  const dateStr = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }).format(new Date(ev.startDate));
                  return (
                    <div
                      key={ev.id}
                      className="pb-3 border-b border-stone-200/80 dark:border-slate-800 last:border-none"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tabular text-stone-500 dark:text-slate-400 mb-1">
                        <span className="font-semibold text-stone-800 dark:text-slate-200">
                          {dateStr}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {ev.isTentativeDate ? 'Tentative Window' : 'Confirmed Schedule'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{ev.category}</span>
                      </div>
                      <h4 className="text-sm font-editorial font-semibold text-stone-900 dark:text-white mb-1">
                        <Link to="/calendar" className="hover:underline">
                          {ev.name}
                        </Link>
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        {ev.location} · Source: {ev.officialSourceName}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most-Read / Trending Stories — Explicitly Distinguished from Editorial Importance */}
            <div className="p-6 border border-stone-200 dark:border-slate-800">
              <div className="pb-3 mb-4 border-b border-stone-200 dark:border-slate-800">
                <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white">
                  Most Followed by Readers
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                  Reflects reader bookmark & engagement activity — separate from WORLDWIRE editorial
                  importance scores.
                </p>
              </div>
              <ul className="space-y-3">
                {allUniqueArticles.slice(0, 5).map((art, i) => (
                  <li
                    key={art.id}
                    className="flex items-start gap-3 text-xs pb-2.5 border-b border-stone-200/60 dark:border-slate-800/60 last:border-none"
                  >
                    <span className="font-mono-tabular font-semibold text-stone-400">
                      0{i + 1}
                    </span>
                    <div>
                      <Link
                        to={`/article/${art.slug}`}
                        className="font-editorial font-semibold text-sm text-stone-900 dark:text-white hover:underline block mb-0.5"
                      >
                        {art.title}
                      </Link>
                      <span className="text-stone-500 dark:text-slate-400">
                        {art.sourceName} · {art.regionName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* H2. Sector & Regional Desks Grid */}
        <section aria-label="Subject Desks Coverage" className="py-10">
          <div className="mb-8">
            <p className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">
              Specialized Beats & Regional Coverage
            </p>
            <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white">
              Global Desks & Subject Intelligence
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {sectorConfigs.map((sec) => {
              const matching = allUniqueArticles.filter(sec.filterFn);
              const storiesToShow =
                matching.length > 0 ? matching.slice(0, 3) : allUniqueArticles.slice(0, 2);

              return (
                <div key={sec.slug} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-900 dark:border-slate-300 pb-2 mb-4">
                      <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white">
                        <Link to={sec.link} className="hover:underline">
                          {sec.title}
                        </Link>
                      </h3>
                      <Link
                        to={sec.link}
                        className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline whitespace-nowrap"
                      >
                        Desk →
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {storiesToShow.map((st, idx) => (
                        <StoryCard
                          key={`${sec.slug}-${st.id}`}
                          article={st}
                          variant={idx === 0 ? 'featured' : 'compact'}
                          showImage={idx === 0}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
