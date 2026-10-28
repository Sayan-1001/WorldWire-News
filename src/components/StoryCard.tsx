import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink } from 'lucide-react';
import { ArticleItem } from '../types/news.ts';
import { getCategoryBySlug } from '../config/site.ts';
import { useApp } from '../context/AppContext.tsx';
import { EditorialImage } from './EditorialImage.tsx';

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoDate));
}

interface StoryCardProps {
  article: ArticleItem;
  variant?: 'lead' | 'featured' | 'compact' | 'numbered';
  indexNumber?: number;
  showImage?: boolean;
  showWhyItMatters?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  article,
  variant = 'featured',
  indexNumber,
  showImage = true,
  showWhyItMatters = false,
}) => {
  const { bookmarkedIds, toggleBookmark } = useApp();
  const isSaved = bookmarkedIds.includes(article.id);
  const category = getCategoryBySlug(article.categorySlug);

  if (variant === 'lead') {
    return (
      <article className="group border-b border-stone-200 dark:border-slate-800 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Unboxed Editorial Kicker */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mb-3">
                {article.isBreaking && (
                  <>
                    <span className="font-semibold uppercase tracking-wider text-[#B91C1C] dark:text-red-400">
                      Breaking Lead
                    </span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                {article.event && (
                  <>
                    <Link
                      to={`/event/${article.event.slug}`}
                      className="font-medium text-[#1E3A8A] dark:text-blue-400 hover:underline"
                    >
                      Developing Event ({article.event.sourceCount} Sources)
                    </Link>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <Link
                  to={`/category/${article.categorySlug}`}
                  className="font-medium text-stone-700 dark:text-slate-300 hover:underline"
                >
                  {category.name}
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to={`/country/${article.countryCode}`}
                  className="hover:underline"
                >
                  {article.regionName}
                </Link>
              </div>

              <h1 className="text-2xl sm:text-4xl font-editorial font-bold leading-[1.15] text-stone-950 dark:text-white mb-4">
                <Link
                  to={`/article/${article.slug}`}
                  className="hover:text-[#1E3A8A] dark:hover:text-blue-300 transition-colors"
                >
                  {article.title}
                </Link>
              </h1>

              <p className="text-base text-stone-700 dark:text-slate-300 leading-relaxed mb-5 max-w-2xl">
                {article.summary}
              </p>

              {/* Why It Matters Box — hairline border, no thick left bar */}
              {article.whyItMatters && (
                <div className="p-4 bg-[#F4F0E8] dark:bg-slate-900/80 border border-stone-200 dark:border-slate-800 mb-5">
                  <div className="text-xs font-mono-tabular uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-1">
                    Why This Development Matters · Editorial Significance {article.importanceScore}/100
                  </div>
                  <p className="text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
                    {article.whyItMatters}
                  </p>
                  {article.selectionReason && (
                    <p className="text-xs text-stone-500 dark:text-slate-400 mt-1.5">
                      {article.selectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-stone-200/80 dark:border-slate-800 text-xs text-stone-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-stone-800 dark:text-slate-200">
                  {article.sourceName}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt} className="font-mono-tabular">
                  {formatRelativeTime(article.publishedAt)}
                </time>
                <span aria-hidden="true">·</span>
                <a
                  href={article.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-stone-900 dark:hover:text-white underline"
                >
                  <span>Original Dispatch</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleBookmark(article.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white cursor-pointer"
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      isSaved ? 'fill-current text-[#1E3A8A] dark:text-blue-400' : ''
                    }`}
                  />
                  <span>{isSaved ? 'Saved' : 'Save Story'}</span>
                </button>
                <Link
                  to={`/article/${article.slug}`}
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline whitespace-nowrap"
                >
                  Read AI Bulletin & Analysis →
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Link to={`/article/${article.slug}`} className="block h-full">
              <EditorialImage
                src={article.imageUrl}
                alt={article.title}
                categorySlug={article.categorySlug}
                sourceName={article.sourceName}
                attribution={article.imageAttribution}
                aspectClass="aspect-[16/10] lg:h-full"
                showCaption={true}
              />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'numbered' && typeof indexNumber === 'number') {
    return (
      <article className="py-4 border-b border-stone-200 dark:border-slate-800 flex items-start gap-4">
        <span className="font-mono-tabular text-lg font-semibold text-stone-400 dark:text-slate-500 pt-0.5 select-none">
          {String(indexNumber).padStart(2, '0')}.
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mb-1">
            <Link
              to={`/category/${article.categorySlug}`}
              className="font-medium text-stone-700 dark:text-slate-300 hover:underline"
            >
              {category.shortName}
            </Link>
            <span aria-hidden="true">·</span>
            <Link to={`/country/${article.countryCode}`} className="hover:underline">
              {article.regionName}
            </Link>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">Score {article.importanceScore}/100</span>
          </div>

          <h3 className="text-base font-editorial font-semibold leading-snug text-stone-900 dark:text-white mb-1.5">
            <Link
              to={`/article/${article.slug}`}
              className="hover:text-[#1E3A8A] dark:hover:text-blue-300 transition-colors"
            >
              {article.title}
            </Link>
          </h3>

          {showWhyItMatters && article.whyItMatters && (
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-2">
              <strong className="font-medium text-stone-800 dark:text-slate-200">
                Why it matters:
              </strong>{' '}
              {article.whyItMatters}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>{article.sourceName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={article.publishedAt} className="font-mono-tabular">
                {formatRelativeTime(article.publishedAt)}
              </time>
            </div>
            <button
              onClick={() => toggleBookmark(article.id)}
              aria-label={isSaved ? 'Remove bookmark' : 'Bookmark story'}
              className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#1E3A8A]' : ''}`} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'compact') {
    return (
      <article className="py-3.5 border-b border-stone-200/80 dark:border-slate-800/80 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400 mb-1">
            {article.isBreaking && (
              <>
                <span className="font-semibold text-[#B91C1C] dark:text-red-400">Breaking</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <Link
              to={`/category/${article.categorySlug}`}
              className="font-medium text-stone-700 dark:text-slate-300 hover:underline"
            >
              {category.shortName}
            </Link>
            <span aria-hidden="true">·</span>
            <span>{article.regionName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt} className="font-mono-tabular">
              {formatRelativeTime(article.publishedAt)}
            </time>
          </div>

          <h3 className="text-base font-editorial font-semibold leading-snug text-stone-900 dark:text-white mb-1.5">
            <Link
              to={`/article/${article.slug}`}
              className="hover:text-[#1E3A8A] dark:hover:text-blue-300 transition-colors"
            >
              {article.title}
            </Link>
          </h3>

          <p className="text-xs text-stone-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
            {article.summary}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
          <span className="truncate max-w-[200px]">{article.sourceName}</span>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => toggleBookmark(article.id)}
              aria-label="Save story"
              className="hover:text-stone-900 dark:hover:text-white cursor-pointer"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#1E3A8A]' : ''}`} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Default: 'featured' card
  return (
    <article className="group flex flex-col justify-between border-b border-stone-200 dark:border-slate-800 pb-5">
      <div>
        {showImage && (
          <Link to={`/article/${article.slug}`} className="block mb-3">
            <EditorialImage
              src={article.imageUrl}
              alt={article.title}
              categorySlug={article.categorySlug}
              sourceName={article.sourceName}
              aspectClass="aspect-[16/10]"
            />
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400 mb-1.5">
          {article.isBreaking && (
            <>
              <span className="font-semibold text-[#B91C1C] dark:text-red-400">Breaking</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <Link
            to={`/category/${article.categorySlug}`}
            className="font-medium text-stone-700 dark:text-slate-300 hover:underline"
          >
            {category.shortName}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={`/country/${article.countryCode}`} className="hover:underline">
            {article.regionName}
          </Link>
        </div>

        <h3 className="text-lg font-editorial font-semibold leading-snug text-stone-950 dark:text-white mb-2">
          <Link
            to={`/article/${article.slug}`}
            className="hover:text-[#1E3A8A] dark:hover:text-blue-300 transition-colors"
          >
            {article.title}
          </Link>
        </h3>

        <p className="text-sm text-stone-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
          {article.summary}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 pt-2 border-t border-stone-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-medium text-stone-700 dark:text-slate-300">
            {article.sourceName}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt} className="font-mono-tabular whitespace-nowrap">
            {formatRelativeTime(article.publishedAt)}
          </time>
        </div>
        <button
          onClick={() => toggleBookmark(article.id)}
          aria-label="Bookmark story"
          className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white shrink-0 cursor-pointer"
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#1E3A8A]' : ''}`} />
        </button>
      </div>
    </article>
  );
};
