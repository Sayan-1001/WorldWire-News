import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Clock,
  ExternalLink,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
} from 'lucide-react';
import { getCategoryBySlug, SITE_CONFIG } from '../config/site.ts';
import { useApp } from '../context/AppContext.tsx';
import {
  AiSummaryRecord,
  ArticleItem,
  DevelopingEventItem,
  EventTimelineUpdate,
} from '../types/news.ts';
import { EditorialImage } from '../components/EditorialImage.tsx';
import { formatRelativeTime, StoryCard } from '../components/StoryCard.tsx';

type BulletinTab =
  | 'briefing30s'
  | 'shortBulletin'
  | 'detailedSummary'
  | 'context'
  | 'verification';

export const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { bookmarkedIds, toggleBookmark } = useApp();

  const [article, setArticle] = useState<ArticleItem | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryRecord | null>(null);
  const [event, setEvent] = useState<DevelopingEventItem | null>(null);
  const [timeline, setTimeline] = useState<EventTimelineUpdate[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<BulletinTab>('briefing30s');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${slug}`);
      if (!res.ok) throw new Error('Article record not found');
      const data = await res.json();
      setArticle(data.article);
      setAiSummary(data.aiSummary);
      setEvent(data.event);
      setTimeline(data.timeline || []);
      setCorrections(data.corrections || []);
      setRelatedArticles(data.relatedArticles || []);
      if (data.article?.title) {
        document.title = `${data.article.title} — ${SITE_CONFIG.name}`;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load article');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handleGenerateAiBulletin = async () => {
    if (!article) return;
    setGeneratingAi(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/generate-ai-bulletin`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.aiSummary);
      }
    } catch (err) {
      console.error('Failed to generate AI bulletin:', err);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  if (loading) {
    return (
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-12 animate-pulse space-y-6">
        <div className="h-4 bg-stone-200 dark:bg-slate-800 w-48 rounded" />
        <div className="h-12 bg-stone-200 dark:bg-slate-800 w-4/5 rounded" />
        <div className="h-80 bg-stone-200 dark:bg-slate-800 rounded" />
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white mb-3">
          Article Not Found
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-400 mb-6">
          {error || 'The requested dispatch may have expired or been moved.'}
        </p>
        <Link
          to="/"
          className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded"
        >
          Return to Front Page
        </Link>
      </main>
    );
  }

  const category = getCategoryBySlug(article.categorySlug);
  const isSaved = bookmarkedIds.includes(article.id);
  const pubFormatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(article.publishedAt));

  return (
    <main className="max-w-[1220px] mx-auto px-4 sm:px-6 py-10">
      {/* Dynamic JSON-LD NewsArticle Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            description: article.summary,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt || article.publishedAt,
            author: {
              '@type': 'Organization',
              name: article.author || article.sourceName,
            },
            publisher: {
              '@type': 'Organization',
              name: SITE_CONFIG.name,
            },
            mainEntityOfPage: window.location.href,
          }),
        }}
      />

      {/* Editorial Header & Metadata */}
      <header className="max-w-4xl border-b border-stone-200 dark:border-slate-800 pb-6 mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mb-3">
          {article.isBreaking && (
            <>
              <span className="font-semibold uppercase tracking-wider text-[#B91C1C] dark:text-red-400">
                Breaking Dispatch
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <Link
            to={`/category/${article.categorySlug}`}
            className="font-semibold text-stone-800 dark:text-slate-200 hover:underline"
          >
            {category.name}
          </Link>
          <span aria-hidden="true">·</span>
          <Link to={`/country/${article.countryCode}`} className="hover:underline">
            {article.regionName} ({article.countryCode})
          </Link>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            Editorial Importance: {article.importanceScore}/100
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-editorial font-bold leading-[1.14] text-stone-950 dark:text-white mb-4">
          {article.title}
        </h1>

        {article.subheading && (
          <p className="text-lg text-stone-600 dark:text-slate-300 leading-relaxed mb-5">
            {article.subheading}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-200/80 dark:border-slate-800 text-xs text-stone-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Primary Reporting:{' '}
              <strong className="font-semibold text-stone-900 dark:text-white">
                {article.sourceName}
              </strong>
            </span>
            {article.author && (
              <>
                <span aria-hidden="true">·</span>
                <span>By {article.author}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-tabular">
              <Clock className="w-3.5 h-3.5" />
              Published {pubFormatted}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleBookmark(article.id)}
              className="inline-flex items-center gap-1.5 font-medium text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white cursor-pointer"
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? 'fill-current text-[#1E3A8A]' : ''}`}
              />
              <span>{isSaved ? 'Saved' : 'Save Story'}</span>
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 font-medium text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Link Copied' : 'Share'}</span>
            </button>
            <a
              href={article.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded transition-colors"
            >
              <span>Read at {article.sourceName}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Corrections Notice if applicable */}
      {(article.correctionNotice || corrections.length > 0) && (
        <div className="max-w-4xl p-4 mb-8 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-stone-800 dark:text-amber-200">
          <div className="font-mono-tabular uppercase font-semibold mb-1">
            Editorial Correction / Update Notice
          </div>
          {article.correctionNotice && <p>{article.correctionNotice}</p>}
          {corrections.map((c) => (
            <p key={c.id} className="mt-1">
              {c.correctionText} — <em>Logged by {c.correctedByEmail}</em>
            </p>
          ))}
        </div>
      )}

      {/* Asymmetric Reading Canvas: 8 Cols Main + 4 Cols Developing Event & Metadata Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {/* Featured Image with Attribution */}
          <EditorialImage
            src={article.imageUrl}
            alt={article.title}
            categorySlug={article.categorySlug}
            sourceName={article.sourceName}
            attribution={article.imageAttribution}
            aspectClass="aspect-[16/9]"
            showCaption={true}
          />

          {/* Cautious Domain Advisory */}
          {(category.isCautiousDomain || aiSummary?.cautiousDomainWarning) && (
            <div className="p-4 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-300 dark:border-slate-700 flex items-start gap-3 text-xs text-stone-700 dark:text-slate-300">
              <AlertTriangle className="w-4 h-4 text-[#9A3412] dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-stone-900 dark:text-white">
                  Editorial Verification Advisory ({category.name}):
                </strong>{' '}
                {aiSummary?.cautiousDomainWarning || category.cautiousNotice} Always consult the
                linked primary publisher or official institutional release for complete technical
                context.
              </div>
            </div>
          )}

          {/* AI-Powered Multi-Format News Bulletin */}
          <section
            aria-label="AI-Powered News Intelligence Bulletin"
            className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-stone-300 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-wider text-[#1E3A8A] dark:text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI-Generated News Bulletin · Clearly Labeled</span>
                </div>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                  Synthesized from metadata & excerpts provided by {article.sourceName} · Model:{' '}
                  <span className="font-mono-tabular">
                    {aiSummary?.modelName || 'gemini-3.8-flash'}
                  </span>
                </p>
              </div>

              <button
                onClick={handleGenerateAiBulletin}
                disabled={generatingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded hover:bg-stone-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingAi ? 'animate-spin' : ''}`} />
                <span>{generatingAi ? 'Synthesizing with Gemini…' : 'Refresh AI Bulletin'}</span>
              </button>
            </div>

            {/* Interactive Summary Format Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-slate-950 rounded mb-5">
              {[
                { id: 'briefing30s', label: '30-Second Briefing' },
                { id: 'shortBulletin', label: 'Short Bulletin' },
                { id: 'detailedSummary', label: 'Detailed Summary' },
                { id: 'context', label: 'What Happened & Why It Matters' },
                { id: 'verification', label: 'Known vs. Uncertain' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as BulletinTab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-white dark:bg-slate-800 text-stone-950 dark:text-white shadow-xs'
                      : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {aiSummary ? (
              <div className="space-y-4 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
                <div className="pb-3 border-b border-stone-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                    One-Line Bulletin Headline
                  </span>
                  <p className="font-editorial font-semibold text-base text-stone-950 dark:text-white">
                    {aiSummary.oneLineHeadline}
                  </p>
                </div>

                {activeTab === 'briefing30s' && (
                  <div>
                    <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                      30-Second Executive Briefing
                    </span>
                    <p>{aiSummary.briefing30s}</p>
                  </div>
                )}

                {activeTab === 'shortBulletin' && (
                  <div>
                    <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                      Short Bulletin
                    </span>
                    <p>{aiSummary.shortBulletin}</p>
                  </div>
                )}

                {activeTab === 'detailedSummary' && (
                  <div>
                    <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                      Detailed Multi-Point Synthesis
                    </span>
                    <p className="mb-3">{aiSummary.detailedSummary}</p>
                    <h4 className="text-xs font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-2">
                      Key Verified Facts
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      {aiSummary.keyFacts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'context' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/80 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                      <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                        What Happened?
                      </span>
                      <p className="text-xs leading-relaxed">{aiSummary.whatHappened}</p>
                    </div>
                    <div className="p-4 bg-white/80 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                      <span className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400 block mb-1">
                        Why It Matters
                      </span>
                      <p className="text-xs leading-relaxed">{aiSummary.whyItMatters}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'verification' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/80 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                        <span className="text-[11px] font-mono-tabular uppercase text-emerald-700 dark:text-emerald-400 font-semibold block mb-2">
                          What We Know (Supported by Source)
                        </span>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs">
                          {aiSummary.whatWeKnow.map((k, i) => (
                            <li key={i}>{k}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 bg-white/80 dark:bg-slate-950 border border-stone-200 dark:border-slate-800">
                        <span className="text-[11px] font-mono-tabular uppercase text-[#9A3412] dark:text-amber-400 font-semibold block mb-2">
                          What Remains Uncertain / Unconfirmed
                        </span>
                        <ul className="list-disc pl-4 space-y-1.5 text-xs">
                          {aiSummary.whatRemainsUncertain.map((u, i) => (
                            <li key={i}>{u}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="p-3 bg-white/60 dark:bg-slate-950/60 border border-stone-200 dark:border-slate-800 text-xs">
                      <strong className="font-semibold">What to Watch Next:</strong>{' '}
                      {aiSummary.whatToWatchNext}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-600 dark:text-slate-300">{article.summary}</p>
            )}
          </section>

          {/* Licensed Excerpt / Original Publisher Link Policy */}
          <section
            aria-label="Original Dispatch Content and Attribution"
            className="max-w-prose space-y-4 text-base text-stone-800 dark:text-slate-200 leading-relaxed"
          >
            <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
              Original Dispatch Summary & Publisher Attribution
            </h2>
            <p className="first-letter:text-4xl first-letter:font-editorial first-letter:font-bold first-letter:float-left first-letter:mr-3">
              {article.contentSnippet || article.summary}
            </p>

            <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mt-6">
              <div className="text-xs font-mono-tabular uppercase text-stone-500 dark:text-slate-400 mb-1">
                Publisher Licensing & Full-Text Notice
              </div>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-4">
                {article.fullTextPermitted
                  ? `This institutional release from ${article.sourceName} permits public redistribution. We preserve direct links to the primary document.`
                  : `In compliance with copyright and publisher licensing standards, ${SITE_CONFIG.name} displays only licensed metadata and original AI-synthesized bulletins rather than scraping or republishing full articles from ${article.sourceName}.`}
              </p>
              <a
                href={article.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded"
              >
                <span>Read Complete Original Article at {article.sourceName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>

        {/* Right 4 Columns: Developing Story Timeline & Ranking Transparency */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Why It Matters & Editorial Score Breakdown */}
          <div className="p-5 border border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-slate-900/40">
            <h3 className="text-sm font-mono-tabular uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">
              Editorial Ranking Transparency
            </h3>
            <div className="text-2xl font-mono-tabular font-bold text-stone-950 dark:text-white mb-2">
              {article.importanceScore} / 100
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-3">
              {article.selectionReason ||
                'Evaluated using source reliability, public impact, corroboration, and recency.'}
            </p>
            {article.whyItMatters && (
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800 text-xs text-stone-700 dark:text-slate-300">
                <strong className="font-semibold text-stone-950 dark:text-white block mb-1">
                  Why This Matters:
                </strong>
                {article.whyItMatters}
              </div>
            )}
          </div>

          {/* Attached Developing Event & Chronological Timeline */}
          {event && (
            <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-[#B91C1C] dark:text-red-400 font-semibold mb-2">
                <Radio className="w-3.5 h-3.5" />
                <span>Developing Event ({event.status})</span>
              </div>
              <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white mb-2">
                <Link to={`/event/${event.slug}`} className="hover:underline">
                  {event.title}
                </Link>
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed mb-4">
                {event.overview}
              </p>

              {timeline.length > 0 && (
                <div className="border-t border-stone-300 dark:border-slate-800 pt-3 space-y-3 mb-4">
                  <div className="text-[11px] font-mono-tabular uppercase text-stone-500 dark:text-slate-400">
                    Chronological Event Timeline
                  </div>
                  {timeline.slice(0, 4).map((t) => (
                    <div
                      key={t.id}
                      className="text-xs pb-2.5 border-b border-stone-200/70 dark:border-slate-800 last:border-none"
                    >
                      <div className="font-mono-tabular text-[11px] text-stone-500 dark:text-slate-400">
                        {formatRelativeTime(t.timestamp)} · {t.sourceName}
                      </div>
                      <div className="font-medium text-stone-900 dark:text-white mt-0.5">
                        {t.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to={`/event/${event.slug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] dark:text-blue-400 hover:underline"
              >
                <span>Open Full Multi-Source Event Page →</span>
              </Link>
            </div>
          )}

          {/* Identified Entities & Tags */}
          {aiSummary?.entities && (
            <div className="p-5 border border-stone-200 dark:border-slate-800 text-xs space-y-3">
              <div className="font-mono-tabular uppercase text-stone-500 dark:text-slate-400">
                Identified Geography, Institutions & Subjects
              </div>
              <div>
                <span className="text-stone-500 dark:text-slate-400">Regions: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {aiSummary.entities.countries.join(' · ')}
                </span>
              </div>
              <div>
                <span className="text-stone-500 dark:text-slate-400">Organizations: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {aiSummary.entities.organizations.join(' · ')}
                </span>
              </div>
              <div>
                <span className="text-stone-500 dark:text-slate-400">Topics: </span>
                <span className="font-medium text-stone-900 dark:text-white">
                  {aiSummary.entities.topics.join(' · ')}
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Corroborating & Related Reports from Multiple Publishers */}
      {relatedArticles.length > 0 && (
        <section className="mt-14 pt-10 border-t border-stone-200 dark:border-slate-800">
          <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white mb-6">
            Related Dispatches & Multi-Publisher Coverage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedArticles.slice(0, 3).map((rel) => (
              <StoryCard key={rel.id} article={rel} variant="featured" showImage={true} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
};
