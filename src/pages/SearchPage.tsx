import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Search } from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { ArticleItem, DevelopingEventItem } from '../types/news.ts';
import { StoryCard } from '../components/StoryCard.tsx';

const SUGGESTED_SEARCHES = [
  'India',
  'Central Bank',
  'Semiconductor',
  'Climate',
  'ISRO',
  'NASA',
  'United Nations',
  'Artificial Intelligence',
];

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('ALL');
  const [category, setCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [sortBy, setSortBy] = useState<'importance' | 'recency'>('importance');

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [events, setEvents] = useState<DevelopingEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (country !== 'ALL') params.set('country', country);
      if (category !== 'all') params.set('category', category);
      if (timeRange !== 'all') params.set('timeRange', timeRange);
      params.set('sort', sortBy);
      params.set('limit', '60');

      const [artRes, evRes] = await Promise.all([
        fetch(`/api/articles?${params.toString()}`),
        fetch('/api/events'),
      ]);

      if (artRes.ok) {
        const d = await artRes.json();
        setArticles(d.articles || []);
      }
      if (evRes.ok) {
        const ed = await evRes.json();
        const allEvs: DevelopingEventItem[] = ed.events || [];
        const qLower = query.trim().toLowerCase();
        setEvents(
          allEvs.filter((e) => {
            if (country !== 'ALL' && e.countryCode !== country) return false;
            if (category !== 'all' && e.categorySlug !== category) return false;
            if (qLower) {
              return `${e.title} ${e.overview} ${e.regionName}`
                .toLowerCase()
                .includes(qLower);
            }
            return true;
          })
        );
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, country, category, timeRange, sortBy]);

  useEffect(() => {
    document.title = `Global Search & Discovery — ${SITE_CONFIG.name}`;
    runSearch();
  }, [runSearch]);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <p className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">
          Stored Archive & Event Discovery
        </p>
        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white mb-4">
          Global News Search
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines, AI bulletins, countries, institutions, or events…"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded text-stone-950 dark:text-white"
            />
          </div>
          <button
            onClick={runSearch}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded cursor-pointer"
          >
            Search Archive
          </button>
        </div>

        {/* Suggested Related Searches */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
          <span className="text-stone-500 dark:text-slate-400">Suggested Queries:</span>
          {SUGGESTED_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-1 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded text-stone-700 dark:text-slate-300 hover:bg-stone-200/70 cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      </header>

      {/* Filter Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-8">
        <div>
          <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 mb-1">
            Country / Region
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2.5 py-1.5"
          >
            <option value="ALL">All Countries & Regions</option>
            {COUNTRIES_REGIONS_TAXONOMY.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2.5 py-1.5"
          >
            <option value="all">All Categories</option>
            {CATEGORIES_TAXONOMY.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 mb-1">
            Date Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2.5 py-1.5"
          >
            <option value="all">All Stored Dates</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono-tabular uppercase text-stone-500 mb-1">
            Sort Order
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2.5 py-1.5"
          >
            <option value="importance">Editorial Importance</option>
            <option value="recency">Most Recent First</option>
          </select>
        </div>
      </div>

      {/* Matching Developing Events */}
      {events.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#B91C1C]" />
            <span>Matching Developing Event Clusters ({events.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-4 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800"
              >
                <div className="text-xs font-mono-tabular text-stone-500 mb-1">
                  {ev.status.toUpperCase()} · {ev.regionName} · {ev.sourceCount} Sources
                </div>
                <h3 className="text-base font-editorial font-bold text-stone-950 dark:text-white mb-1">
                  <Link to={`/event/${ev.slug}`} className="hover:underline">
                    {ev.title}
                  </Link>
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 line-clamp-2">
                  {ev.overview}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Matching Articles */}
      <section>
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-2 mb-6">
          <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
            Matching Dispatches ({articles.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-stone-500">Searching archive…</div>
        ) : articles.length === 0 ? (
          <div className="p-12 border border-stone-200 dark:border-slate-800 text-center">
            <h3 className="text-lg font-editorial font-bold text-stone-900 dark:text-white mb-2">
              No Stored Dispatches Match Your Search
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">
              Try broadening your geographic or topic filters, or select one of the suggested
              queries above.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setCountry('ALL');
                setCategory('all');
                setTimeRange('all');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded cursor-pointer"
            >
              Reset All Search Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((art) => (
              <StoryCard key={art.id} article={art} variant="featured" showImage={true} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
