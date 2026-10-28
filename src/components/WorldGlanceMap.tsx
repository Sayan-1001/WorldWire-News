import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, List } from 'lucide-react';
import { COUNTRIES_REGIONS_TAXONOMY } from '../config/site.ts';
import { ArticleItem } from '../types/news.ts';
import { formatRelativeTime } from './StoryCard.tsx';

interface WorldGlanceMapProps {
  articles: ArticleItem[];
}

export const WorldGlanceMap: React.FC<WorldGlanceMapProps> = ({ articles }) => {
  const [selectedCode, setSelectedCode] = useState<string>('IN');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const selectedRegion =
    COUNTRIES_REGIONS_TAXONOMY.find((c) => c.code === selectedCode) ||
    COUNTRIES_REGIONS_TAXONOMY[1];

  const matchingArticles = articles.filter((a) => {
    if (selectedCode === 'GLOBAL') return true;
    if (selectedCode === 'IN') {
      return a.countryCode === 'IN' || a.categorySlug === 'india';
    }
    return a.countryCode === selectedCode;
  });

  const displayArticles =
    matchingArticles.length > 0 ? matchingArticles.slice(0, 4) : articles.slice(0, 3);

  return (
    <section
      aria-labelledby="world-glance-heading"
      className="py-10 border-b border-stone-200 dark:border-slate-800"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">
            Geographic Intelligence & Regional Editions
          </p>
          <h2
            id="world-glance-heading"
            className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white"
          >
            World at a Glance
          </h2>
        </div>

        {/* Interactive View Switcher (Functional Segmented Buttons) */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-slate-800 rounded">
          <button
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === 'map'
                ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Interactive Map</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Accessible Region Directory</span>
          </button>
        </div>
      </div>

      {/* Region Selection Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-stone-200 dark:border-slate-800">
        {COUNTRIES_REGIONS_TAXONOMY.map((region) => {
          const isActive = region.code === selectedCode;
          return (
            <button
              key={region.code}
              onClick={() => setSelectedCode(region.code)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#1E3A8A] text-white dark:bg-blue-700'
                  : 'bg-[#F4F0E8] dark:bg-slate-900 text-stone-700 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {region.name}
            </button>
          );
        })}
      </div>

      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Interactive SVG Cartographic Projection */}
          <div className="lg:col-span-7 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4 flex flex-col justify-between">
            <div className="relative w-full aspect-[2/1]">
              <svg
                viewBox="0 0 1000 500"
                role="img"
                aria-label="Interactive Global News Coverage Map"
                className="w-full h-full"
              >
                {/* Graticule grid lines */}
                {[100, 200, 300, 400].map((y) => (
                  <line
                    key={`lat-${y}`}
                    x1={0}
                    y1={y}
                    x2={1000}
                    y2={y}
                    stroke="currentColor"
                    className="text-stone-300/60 dark:text-slate-800"
                    strokeDasharray="3 3"
                  />
                ))}
                {[200, 400, 600, 800].map((x) => (
                  <line
                    key={`lon-${x}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={500}
                    stroke="currentColor"
                    className="text-stone-300/60 dark:text-slate-800"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Stylized Continental Silhouettes */}
                {/* North America */}
                <path
                  d="M110,90 L290,85 L315,190 L255,255 L175,245 L120,165 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                {/* South America */}
                <path
                  d="M265,275 L360,295 L350,435 L295,465 L265,365 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                {/* Europe */}
                <path
                  d="M450,95 L595,85 L605,185 L465,195 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                {/* Africa */}
                <path
                  d="M445,215 L600,215 L615,355 L545,425 L485,375 L445,275 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                {/* Eurasia & South/East Asia */}
                <path
                  d="M605,85 L885,95 L895,285 L745,305 L695,285 L615,215 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />
                {/* Australia / Oceania */}
                <path
                  d="M775,345 L895,345 L890,425 L780,420 Z"
                  className="fill-stone-300/70 dark:fill-slate-800 stroke-stone-400 dark:stroke-slate-700"
                  strokeWidth="1"
                />

                {/* Interactive Regional Nodes */}
                {COUNTRIES_REGIONS_TAXONOMY.filter((c) => c.coordinates).map((region) => {
                  const isSelected = region.code === selectedCode;
                  const { x, y } = region.coordinates!;
                  return (
                    <g
                      key={region.code}
                      onClick={() => setSelectedCode(region.code)}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${region.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedCode(region.code);
                        }
                      }}
                    >
                      {isSelected && (
                        <circle
                          cx={x}
                          cy={y}
                          r={18}
                          className="fill-[#1E3A8A]/20 dark:fill-blue-400/25 stroke-[#1E3A8A] dark:stroke-blue-400"
                          strokeWidth="1.5"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isSelected ? 7 : 5}
                        className={
                          isSelected
                            ? 'fill-[#B91C1C] dark:fill-red-400 stroke-white stroke-2'
                            : 'fill-[#1E3A8A] dark:fill-blue-400 hover:fill-[#B91C1C]'
                        }
                      />
                      <text
                        x={x}
                        y={y - 11}
                        textAnchor="middle"
                        className={`text-[11px] font-sans select-none ${
                          isSelected
                            ? 'font-bold fill-stone-950 dark:fill-white'
                            : 'font-medium fill-stone-700 dark:fill-slate-300'
                        }`}
                      >
                        {region.code === 'GLOBAL' ? 'Global' : region.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-200 dark:border-slate-800 text-[11px] text-stone-500 dark:text-slate-400">
              <span>
                Click any regional desk marker to inspect country-specific dispatches.
              </span>
              <span>
                Coverage reflects active wire providers; not exhaustive real-time global telemetry.
              </span>
            </div>
          </div>

          {/* Selected Country / Region Intelligence Panel */}
          <div className="lg:col-span-5 border border-stone-200 dark:border-slate-800 p-6 flex flex-col justify-between bg-[#FBF9F5] dark:bg-slate-900/40">
            <div>
              <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-2">
                <span>
                  {selectedRegion.continent} · {selectedRegion.type.toUpperCase()} EDITION
                </span>
                <span>Code: {selectedRegion.code}</span>
              </div>

              <h3 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
                {selectedRegion.name}
              </h3>

              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-5 pb-4 border-b border-stone-200 dark:border-slate-800">
                {selectedRegion.summary}
              </p>

              <div className="space-y-4">
                {displayArticles.map((art) => (
                  <div
                    key={art.id}
                    className="pb-3 border-b border-stone-200/70 dark:border-slate-800/70 last:border-none"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-slate-400 mb-1">
                      <span>{art.sourceName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {formatRelativeTime(art.publishedAt)}
                      </span>
                    </div>
                    <Link
                      to={`/article/${art.slug}`}
                      className="text-sm font-editorial font-semibold text-stone-900 dark:text-white hover:text-[#1E3A8A] dark:hover:text-blue-300 line-clamp-2"
                    >
                      {art.title}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-200 dark:border-slate-800 flex items-center justify-between">
              <Link
                to={`/country/${selectedRegion.code}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
              >
                <span>Open Full {selectedRegion.name} Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible List-Based Regional Directory */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {COUNTRIES_REGIONS_TAXONOMY.map((region) => {
            const regionStories = articles
              .filter(
                (a) =>
                  a.countryCode === region.code ||
                  (region.code === 'IN' && a.categorySlug === 'india')
              )
              .slice(0, 2);

            return (
              <div
                key={region.code}
                className="p-5 border border-stone-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono-tabular text-stone-500 dark:text-slate-400 mb-1">
                    {region.continent} · {region.code}
                  </div>
                  <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                    <Link to={`/country/${region.code}`} className="hover:underline">
                      {region.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-4">
                    {region.summary}
                  </p>
                  {regionStories.length > 0 && (
                    <ul className="space-y-2 border-t border-stone-200/80 dark:border-slate-800 pt-3 mb-4">
                      {regionStories.map((st) => (
                        <li key={st.id}>
                          <Link
                            to={`/article/${st.slug}`}
                            className="text-xs font-medium text-stone-800 dark:text-slate-200 hover:underline line-clamp-2"
                          >
                            • {st.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link
                  to={`/country/${region.code}`}
                  className="text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
                >
                  Explore {region.name} Coverage →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
