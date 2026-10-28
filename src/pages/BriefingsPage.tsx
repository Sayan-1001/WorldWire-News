import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, Sparkles } from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { BriefingRecord } from '../types/news.ts';

export const BriefingsPage: React.FC = () => {
  const [briefings, setBriefings] = useState<BriefingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generator controls
  const [genType, setGenType] = useState<string>('morning');
  const [genScope, setGenScope] = useState<string>('global');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    document.title = `Daily Briefings & News Explained — ${SITE_CONFIG.name}`;
    fetch('/api/briefings')
      .then((r) => r.json())
      .then((data) => setBriefings(data.briefings || []))
      .catch((err) => console.error('Failed to load briefings:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateBriefing = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/briefings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: genType, scopeFilter: genScope }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          setBriefings((prev) => [data.briefing, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to generate briefing:', err);
    } finally {
      setGenerating(false);
    }
  };

  const filtered = briefings.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'explainer') return b.type === 'explainer';
    if (activeFilter === 'daily') {
      return ['morning', 'evening', 'last24h', 'weekly'].includes(b.type);
    }
    return b.type === activeFilter;
  });

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8">
        <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-[#1E3A8A] dark:text-blue-400 mb-2">
          <FileText className="w-4 h-4" />
          <span>Executive News Intelligence & Background Explainers</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
          Daily Briefings & News Explained
        </h1>
        <p className="text-base text-stone-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Synthesizing distinct global developments — never duplicate wire copies — with clear
          explanations of what happened, why it matters, background context, and direct source
          links.
        </p>
      </header>

      {/* Interactive AI Briefing Generator Panel */}
      <section className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-editorial font-bold text-stone-950 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
              <span>Generate Custom Briefing or Background Explainer</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Synthesizes stored dispatches from the database using Gemini AI while preserving
              primary publisher attribution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
              Briefing Format
            </label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-2"
            >
              <option value="morning">Morning Executive Briefing</option>
              <option value="evening">Evening Wrap</option>
              <option value="last24h">Last 24 Hours Digest</option>
              <option value="weekly">Weekly World Review</option>
              <option value="country">Country / Regional Briefing</option>
              <option value="topic">Topic-Specific Briefing</option>
              <option value="explainer">News Explained (Background & Context)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
              Geographic or Subject Scope
            </label>
            <select
              value={genScope}
              onChange={(e) => setGenScope(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-2"
            >
              <option value="global">Global / Worldwide</option>
              <optgroup label="Countries & Regions">
                {COUNTRIES_REGIONS_TAXONOMY.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Topics">
                {CATEGORIES_TAXONOMY.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <button
              onClick={handleGenerateBriefing}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Synthesizing Briefing…' : 'Generate Briefing Now'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-slate-800 rounded w-fit mb-8">
        {[
          { id: 'all', label: 'All Briefings & Explainers' },
          { id: 'daily', label: 'Daily & Weekly Digests' },
          { id: 'country', label: 'Country Briefings' },
          { id: 'explainer', label: 'News Explained' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveFilter(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
              activeFilter === t.id
                ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">Loading briefings…</div>
      ) : (
        <div className="space-y-10">
          {filtered.map((b) => (
            <article
              key={b.id}
              className="p-6 sm:p-8 border border-stone-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-stone-500 dark:text-slate-400 pb-4 mb-4 border-b border-stone-200 dark:border-slate-800">
                <div>
                  <span className="uppercase font-semibold text-[#1E3A8A] dark:text-blue-400">
                    {b.type === 'explainer' ? 'News Explained' : `${b.type} Briefing`}
                  </span>
                  <span> · Scope: {b.scopeFilter} · </span>
                  <span>{b.coveragePeriod}</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
                {b.title}
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">{b.subtitle}</p>

              <p className="text-base text-stone-800 dark:text-slate-200 leading-relaxed mb-6 p-4 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                {b.leadSynthesis}
              </p>

              <div className="space-y-6 mb-6">
                {b.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="pb-5 border-b border-stone-200/80 dark:border-slate-800 last:border-none"
                  >
                    <div className="text-xs font-mono-tabular text-stone-400 mb-1">
                      0{idx + 1} · DISTINCT DEVELOPMENT
                    </div>
                    <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                      {item.eventTitle}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed mb-3">
                      <div>
                        <strong className="text-stone-900 dark:text-white block mb-0.5">
                          What Happened:
                        </strong>
                        <span className="text-stone-700 dark:text-slate-300">
                          {item.whatHappened}
                        </span>
                      </div>
                      <div>
                        <strong className="text-stone-900 dark:text-white block mb-0.5">
                          Why It Matters:
                        </strong>
                        <span className="text-stone-700 dark:text-slate-300">
                          {item.whyItMatters}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-slate-400">
                      <span>Latest known development: {item.latestDevelopment}</span>
                      <div className="flex items-center gap-3">
                        {item.sources.map((s, si) => (
                          <a
                            key={si}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#1E3A8A] dark:text-blue-400 hover:underline"
                          >
                            <span>{s.name}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-600 dark:text-slate-400">
                <div>
                  <strong className="text-stone-800 dark:text-slate-200">
                    Background Context:
                  </strong>{' '}
                  {b.backgroundContext}
                </div>
                <div>
                  <strong className="text-stone-800 dark:text-slate-200">
                    Coverage & Uncertainty Notes:
                  </strong>{' '}
                  {b.uncertaintyNotes}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};
