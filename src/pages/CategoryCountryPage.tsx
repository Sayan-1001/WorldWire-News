import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Radio, Search } from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  getCategoryBySlug,
  getCountryByCode,
  SITE_CONFIG,
} from '../config/site.ts';
import { ArticleItem, DevelopingEventItem } from '../types/news.ts';
import { StoryCard } from '../components/StoryCard.tsx';

interface CategoryCountryPageProps {
  mode: 'category' | 'country';
}

export const CategoryCountryPage: React.FC<CategoryCountryPageProps> = ({ mode }) => {
  const { slug, code } = useParams<{ slug?: string; code?: string }>();
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [events, setEvents] = useState<DevelopingEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'importance' | 'recency'>('importance');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  const categoryInfo = mode === 'category' ? getCategoryBySlug(slug || 'world') : null;
  const countryInfo = mode === 'country' ? getCountryByCode(code || 'IN') : null;

  const pageTitle = mode === 'category' ? categoryInfo!.name : `${countryInfo!.name} Desk`;
  const pageSubtitle =
    mode === 'category' ? categoryInfo!.description : countryInfo!.summary;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mode === 'category' && slug) {
        params.set('category', slug);
      } else if (mode === 'country' && code) {
        params.set('country', code);
      }
      params.set('sort', sortBy);
      params.set('limit', '60');

      const [artRes, evRes] = await Promise.all([
        fetch(`/api/articles?${params.toString()}`),
        fetch('/api/events'),
      ]);

      if (artRes.ok) {
        const artData = await artRes.json();
        setArticles(artData.articles || []);
      }
      if (evRes.ok) {
        const evData = await evRes.json();
        const allEvs: DevelopingEventItem[] = evData.events || [];
        const relevantEvs = allEvs.filter((e) => {
          if (mode === 'category' && slug) {
            return e.categorySlug === slug || slug === 'world';
          }
          if (mode === 'country' && code) {
            return (
              e.countryCode === code.toUpperCase() ||
              (code.toUpperCase() === 'IN' && e.categorySlug === 'india') ||
              e.countryCode === 'GLOBAL'
            );
          }
          return true;
        });
        setEvents(relevantEvs);
      }
    } catch (err) {
      console.error('Failed to load desk data:', err);
    } finally {
      setLoading(false);
    }
  }, [mode, slug, code, sortBy]);

  useEffect(() => {
    document.title = `${pageTitle} — ${SITE_CONFIG.name}`;
    setSubCategoryFilter('all');
    setSearchQuery('');
    loadData();
  }, [pageTitle, loadData]);

  const filteredArticles = articles.filter((a) => {
    if (subCategoryFilter !== 'all' && a.categorySlug !== subCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.sourceName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const leadArticle = filteredArticles[0] || null;
  const remainingArticles = filteredArticles.slice(1);

  return (
    <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10">
      {/* Desk Header */}
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <span className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400">
            {mode === 'category'
              ? `Subject Desk · /category/${categoryInfo?.slug}`
              : `${countryInfo?.continent} · Regional Edition (${countryInfo?.code})`}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
          {pageTitle}
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {pageSubtitle}
        </p>

        {categoryInfo?.isCautiousDomain && categoryInfo.cautiousNotice && (
          <div className="mt-4 p-3.5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-300 dark:border-slate-700 flex items-center gap-2.5 text-xs text-stone-700 dark:text-slate-300">
            <AlertTriangle className="w-4 h-4 text-[#9A3412] dark:text-amber-400 shrink-0" />
            <span>{categoryInfo.cautiousNotice}</span>
          </div>
        )}

        {/* Quick Switcher Ribbon for Categories or Countries */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 mt-5 border-t border-stone-200 dark:border-slate-800">
          {mode === 'category'
            ? CATEGORIES_TAXONOMY.map((c) => (
                <Link
                  key={c.slug}
                  to={`/category/${c.slug}`}
                  className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                    c.slug === slug
                      ? 'bg-[#1E3A8A] text-white dark:bg-blue-700'
                      : 'bg-[#F4F0E8] dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:bg-stone-200/70'
                  }`}
                >
                  {c.shortName}
                </Link>
              ))
            : COUNTRIES_REGIONS_TAXONOMY.map((cr) => (
                <Link
                  key={cr.code}
                  to={`/country/${cr.code}`}
                  className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 ${
                    cr.code === code?.toUpperCase()
                      ? 'bg-[#1E3A8A] text-white dark:bg-blue-700'
                      : 'bg-[#F4F0E8] dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:bg-stone-200/70'
                  }`}
                >
                  {cr.name}
                </Link>
              ))}
        </div>
      </header>

      {/* Search, Sub-Topic & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-8">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${pageTitle} dispatches…`}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded text-stone-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {mode === 'country' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-500 dark:text-slate-400">Beat:</span>
              <select
                value={subCategoryFilter}
                onChange={(e) => setSubCategoryFilter(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs"
              >
                <option value="all">All National & Regional Beats</option>
                <option value="india">National Governance</option>
                <option value="politics">Politics & Parliament</option>
                <option value="business">Economy & Business</option>
                <option value="technology">Technology & AI</option>
                <option value="science">Science & Space</option>
                <option value="diplomacy">International Relations</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-slate-800 rounded">
            <button
              onClick={() => setSortBy('importance')}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                sortBy === 'importance'
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              Editorial Importance
            </button>
            <button
              onClick={() => setSortBy('recency')}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer ${
                sortBy === 'recency'
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              Most Recent
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">
          Loading verified dispatches for {pageTitle}…
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="p-12 border border-stone-200 dark:border-slate-800 text-center">
          <h2 className="text-lg font-editorial font-bold text-stone-900 dark:text-white mb-2">
            No Matching Dispatches in {pageTitle}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">
            We do not fabricate stories when a specific topic or filter has no verified wire
            dispatches. Try clearing your filter or running a live ingestion refresh from the
            Editorial Desk.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded"
          >
            View All Global Headlines
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Lead Story for this Category/Country */}
          {leadArticle && <StoryCard article={leadArticle} variant="lead" />}

          {/* Relevant Developing Stories */}
          {events.length > 0 && (
            <section className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
                  <h2 className="text-lg font-editorial font-bold text-stone-950 dark:text-white">
                    Developing Stories Relevant to {pageTitle}
                  </h2>
                </div>
                <Link
                  to="/events"
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                >
                  All Developing Events →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-800"
                  >
                    <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-1">
                      <span className="uppercase font-semibold text-[#9A3412] dark:text-amber-400">
                        {ev.status}
                      </span>{' '}
                      · {ev.sourceCount} Sources
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

          {/* Remaining Articles Grid */}
          {remainingArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {remainingArticles.map((art) => (
                <StoryCard key={art.id} article={art} variant="featured" showImage={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
