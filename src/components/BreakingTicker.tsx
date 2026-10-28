import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ArticleItem } from '../types/news.ts';

interface BreakingTickerProps {
  stories: ArticleItem[];
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const BreakingTicker: React.FC<BreakingTickerProps> = ({
  stories,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!stories || stories.length === 0) {
    return null;
  }

  const safeIndex = activeIndex % stories.length;
  const current = stories[safeIndex];

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(current.publishedAt || lastUpdated || Date.now()));

  return (
    <section
      aria-label="Breaking News Alert Strip"
      className="border-b border-stone-200 dark:border-slate-800 bg-[#F7F1ED] dark:bg-red-950/25"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[#B91C1C] dark:text-red-400 whitespace-nowrap shrink-0">
            Breaking Dispatch
          </span>
          <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">
            ·
          </span>
          <span className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            {formattedTime} UTC
          </span>
          <span aria-hidden="true" className="text-stone-300 dark:text-slate-700 hidden sm:inline">
            ·
          </span>
          <Link
            to={`/article/${current.slug}`}
            className="text-sm font-medium text-stone-900 dark:text-white hover:underline truncate"
          >
            {current.title}
          </Link>
          <span className="hidden md:inline text-xs text-stone-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            — {current.sourceName}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stories.length > 1 && (
            <div className="flex items-center gap-1 text-xs font-mono-tabular text-stone-600 dark:text-slate-400">
              <button
                onClick={() =>
                  setActiveIndex((prev) => (prev - 1 + stories.length) % stories.length)
                }
                aria-label="Previous breaking headline"
                className="p-1 hover:text-stone-950 dark:hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {safeIndex + 1}/{stories.length}
              </span>
              <button
                onClick={() => setActiveIndex((prev) => (prev + 1) % stories.length)}
                aria-label="Next breaking headline"
                className="p-1 hover:text-stone-950 dark:hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Breaking Wire"
              className="p-1 text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <Link
            to={`/article/${current.slug}`}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#B91C1C] dark:text-red-400 hover:underline whitespace-nowrap shrink-0"
          >
            <span>Full Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
