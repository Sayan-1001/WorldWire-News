import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Database,
  FileEdit,
  GitMerge,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { useApp } from '../context/AppContext.tsx';

type AdminTab = 'overview' | 'articles' | 'events' | 'ranking' | 'audit';

export const AdminDashboardPage: React.FC = () => {
  const { firebaseUser, dbUser, signInWithGoogle, authFetch } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Article editor modal/inline state
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('world');
  const [editCountry, setEditCountry] = useState('GLOBAL');
  const [editCorrection, setEditCorrection] = useState('');

  // Event merge state
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Ranking weights state
  const [weights, setWeights] = useState({
    sourceReliabilityWeight: 25,
    severityImpactWeight: 20,
    globalSignificanceWeight: 20,
    independentCorroborationWeight: 15,
    recencyWeight: 10,
    noveltyWeight: 5,
    geographicReachWeight: 5,
    breakingThresholdScore: 84,
  });

  const loadAdminOverview = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/admin/overview');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}: Administrative access denied`);
      }
      const data = await res.json();
      setOverview(data);
      if (data.rankingConfig) {
        setWeights(data.rankingConfig);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load administrative console.');
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, authFetch]);

  useEffect(() => {
    document.title = `Editorial & Administrative Console — ${SITE_CONFIG.name}`;
    if (firebaseUser) {
      loadAdminOverview();
    }
  }, [firebaseUser, loadAdminOverview]);

  const handleRunIngestion = async (providerSlug?: string, enrichTopWithAi = false) => {
    setIngesting(true);
    setStatusMessage(null);
    try {
      const res = await authFetch('/api/admin/ingest', {
        method: 'POST',
        body: JSON.stringify({ providerSlug, enrichTopWithAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingestion failed');
      const r = data.result;
      setStatusMessage(
        `Ingestion complete: Fetched ${r.articlesFetched} dispatches, inserted ${r.articlesInserted} new articles, skipped ${r.duplicatesSkipped} duplicates, updated ${r.eventsUpdated} events.`
      );
      await loadAdminOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Manual ingestion failed.');
    } finally {
      setIngesting(false);
    }
  };

  const handleToggleSource = async (sourceId: number, currentEnabled: boolean) => {
    try {
      const res = await authFetch(`/api/admin/sources/${sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleUpdateSourceReliability = async (sourceId: number, reliabilityScore: number) => {
    try {
      const res = await authFetch(`/api/admin/sources/${sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ reliabilityScore }),
      });
      if (res.ok) {
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to update source reliability:', err);
    }
  };

  const handleToggleArticleBreaking = async (articleId: number, currentBreaking: boolean) => {
    try {
      const res = await authFetch(`/api/admin/articles/${articleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBreaking: !currentBreaking }),
      });
      if (res.ok) {
        setStatusMessage(`Updated breaking news status for article #${articleId}.`);
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to toggle breaking status:', err);
    }
  };

  const handleSaveArticleEdits = async (articleId: number) => {
    try {
      const res = await authFetch(`/api/admin/articles/${articleId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          categorySlug: editCategory,
          countryCode: editCountry,
          correctionNotice: editCorrection,
        }),
      });
      if (res.ok) {
        setEditingArticleId(null);
        setStatusMessage(`Saved editorial revisions for article #${articleId}.`);
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to save article edits:', err);
    }
  };

  const handleUpdateEventStatus = async (eventId: number, status: string, isBreaking: boolean) => {
    try {
      const res = await authFetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, isBreaking }),
      });
      if (res.ok) {
        setStatusMessage(`Updated developing event #${eventId} status to ${status}.`);
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleMergeEvents = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    try {
      const res = await authFetch('/api/admin/events/merge', {
        method: 'POST',
        body: JSON.stringify({
          sourceEventId: Number(mergeSourceId),
          targetEventId: Number(mergeTargetId),
        }),
      });
      if (res.ok) {
        setStatusMessage(`Merged duplicate event #${mergeSourceId} into event #${mergeTargetId}.`);
        setMergeSourceId('');
        setMergeTargetId('');
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to merge events:', err);
    }
  };

  const handleSaveRankingWeights = async () => {
    try {
      const res = await authFetch('/api/admin/ranking-config', {
        method: 'PUT',
        body: JSON.stringify(weights),
      });
      if (res.ok) {
        setStatusMessage(
          'Saved editorial ranking weights and recalculated importance scores across stored articles.'
        );
        await loadAdminOverview();
      }
    } catch (err) {
      console.error('Failed to update ranking weights:', err);
    }
  };

  if (!firebaseUser) {
    return (
      <main className="max-w-[920px] mx-auto px-4 sm:px-6 py-16">
        <div className="p-8 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-300 dark:border-slate-800 text-center">
          <Shield className="w-8 h-8 text-[#1E3A8A] dark:text-blue-400 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
            Server-Side Protected Editorial & Admin Console
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-6">
            Administrative endpoints (`/api/admin/*`) are restricted strictly to authorized platform
            administrators. Sign in with an authorized administrator Google account to continue.
          </p>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign In with Administrator Account</span>
          </button>
        </div>
      </main>
    );
  }

  if (dbUser && dbUser.role !== 'admin' && dbUser.role !== 'editor') {
    return (
      <main className="max-w-[920px] mx-auto px-4 sm:px-6 py-16">
        <div className="p-8 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-300 dark:border-slate-800 text-center">
          <AlertTriangle className="w-8 h-8 text-[#9A3412] dark:text-amber-400 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-stone-950 dark:text-white mb-2">
            Access Restricted — Administrator Privileges Required
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            Your account (<span className="font-mono-tabular">{dbUser.email}</span>) is registered
            with the standard <span className="font-mono-tabular uppercase">{dbUser.role}</span>{' '}
            role and does not have permission to access the Editorial & Administrative Console.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1380px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-widest text-[#1E3A8A] dark:text-blue-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>
              Authenticated as {dbUser?.email || firebaseUser.email} · Role:{' '}
              {(dbUser?.role || 'admin').toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-stone-950 dark:text-white">
            Editorial & Administrative Console
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleRunIngestion(undefined, false)}
            disabled={ingesting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
            <span>{ingesting ? 'Ingesting Live Feeds…' : 'Sync All Live News Providers'}</span>
          </button>
          <button
            onClick={() => handleRunIngestion(undefined, true)}
            disabled={ingesting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded hover:bg-stone-100 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A] dark:text-blue-400" />
            <span>Sync & Run Gemini AI Enrichment</span>
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="p-4 mb-6 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4" />
            {statusMessage}
          </span>
          <button onClick={() => setStatusMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </span>
          <button onClick={() => setErrorMessage(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-slate-800 rounded w-fit mb-8">
        {[
          { id: 'overview', label: 'Ingestion & Provider Health', icon: Activity },
          { id: 'articles', label: 'Article Queue & Breaking Management', icon: FileEdit },
          { id: 'events', label: 'Developing Events & Clustering', icon: GitMerge },
          { id: 'ranking', label: 'Importance Ranking Weights', icon: Sliders },
          { id: 'audit', label: 'Audit Logs & Access Roles', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-stone-950 dark:text-white shadow-xs'
                  : 'text-stone-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading && !overview ? (
        <div className="py-12 text-center text-sm text-stone-500">
          Loading administrative telemetry…
        </div>
      ) : !overview ? null : (
        <div>
          {/* TAB 1: INGESTION & PROVIDER HEALTH */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Top KPI Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                  <span className="text-xs font-mono-tabular uppercase text-stone-500">
                    Stored Dispatches
                  </span>
                  <div className="text-3xl font-mono-tabular font-bold text-stone-950 dark:text-white mt-1">
                    {overview.articles?.length || 0}
                  </div>
                </div>
                <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                  <span className="text-xs font-mono-tabular uppercase text-stone-500">
                    Developing Events
                  </span>
                  <div className="text-3xl font-mono-tabular font-bold text-stone-950 dark:text-white mt-1">
                    {overview.events?.length || 0}
                  </div>
                </div>
                <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                  <span className="text-xs font-mono-tabular uppercase text-stone-500">
                    Configured Providers
                  </span>
                  <div className="text-3xl font-mono-tabular font-bold text-stone-950 dark:text-white mt-1">
                    {overview.sources?.filter((s: any) => s.enabled).length || 0} /{' '}
                    {overview.sources?.length || 0}
                  </div>
                </div>
                <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                  <span className="text-xs font-mono-tabular uppercase text-stone-500">
                    Gemini AI Engine
                  </span>
                  <div className="text-lg font-mono-tabular font-bold text-stone-950 dark:text-white mt-2">
                    {overview.environmentStatus?.geminiConfigured
                      ? 'Active (Server-Side)'
                      : 'Awaiting GEMINI_API_KEY'}
                  </div>
                </div>
              </div>

              {/* Provider Management Table */}
              <section className="border border-stone-200 dark:border-slate-800 overflow-x-auto">
                <div className="p-4 bg-[#F4F0E8] dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-base font-editorial font-bold text-stone-950 dark:text-white">
                    News Source Adapters & Reliability Configuration
                  </h2>
                  <span className="text-xs text-stone-500">
                    Enable/disable providers, adjust source reliability scores, or sync individual
                    feeds
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 font-mono-tabular uppercase text-stone-500">
                    <tr>
                      <th className="p-3">Source Name</th>
                      <th className="p-3">Adapter</th>
                      <th className="p-3">Region / Desk</th>
                      <th className="p-3">Reliability (0-100)</th>
                      <th className="p-3">Last Status</th>
                      <th className="p-3">Enabled</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                    {overview.sources?.map((src: any) => (
                      <tr key={src.id}>
                        <td className="p-3 font-medium text-stone-900 dark:text-white">
                          {src.name}
                          {src.requiresApiKeyEnv && (
                            <span className="block text-[10px] font-mono-tabular text-stone-500">
                              Env: {src.requiresApiKeyEnv}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono-tabular uppercase">{src.providerType}</td>
                        <td className="p-3">
                          {src.countryCode} · {src.defaultCategory}
                        </td>
                        <td className="p-3 font-mono-tabular">
                          <input
                            type="number"
                            min={40}
                            max={100}
                            defaultValue={src.reliabilityScore}
                            onBlur={(e) =>
                              handleUpdateSourceReliability(src.id, Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 border border-stone-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950"
                          />
                        </td>
                        <td className="p-3 font-mono-tabular">
                          <span
                            className={
                              src.lastStatus === 'ok'
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : src.lastStatus === 'missing_key'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-stone-600 dark:text-slate-400'
                            }
                          >
                            {src.lastStatus.toUpperCase()}
                          </span>
                          {src.lastError && (
                            <span className="block text-[10px] text-stone-500 truncate max-w-[200px]">
                              {src.lastError}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={src.enabled}
                            onChange={() => handleToggleSource(src.id, src.enabled)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleRunIngestion(src.slug, false)}
                            disabled={ingesting}
                            className="px-2.5 py-1 text-xs font-medium border border-stone-300 dark:border-slate-700 rounded hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Sync Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Recent Ingestion Job Logs */}
              <section className="border border-stone-200 dark:border-slate-800 overflow-x-auto">
                <div className="p-4 bg-[#F4F0E8] dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800">
                  <h2 className="text-base font-editorial font-bold text-stone-950 dark:text-white">
                    Recent Background & Manual Ingestion Logs
                  </h2>
                </div>
                <table className="w-full text-left text-xs font-mono-tabular">
                  <thead className="bg-stone-100 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 uppercase text-stone-500">
                    <tr>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Job Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Fetched</th>
                      <th className="p-3">Inserted</th>
                      <th className="p-3">Duplicates</th>
                      <th className="p-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                    {overview.ingestionLogs?.slice(0, 12).map((log: any) => (
                      <tr key={log.id}>
                        <td className="p-3">{log.providerSlug}</td>
                        <td className="p-3">{log.jobType}</td>
                        <td className="p-3 uppercase">{log.status}</td>
                        <td className="p-3">{log.articlesFetched}</td>
                        <td className="p-3">{log.articlesInserted}</td>
                        <td className="p-3">{log.duplicatesSkipped}</td>
                        <td className="p-3">{log.durationMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* TAB 2: ARTICLE QUEUE & BREAKING NEWS MANAGEMENT */}
          {activeTab === 'articles' && (
            <div className="space-y-4">
              {overview.articles?.slice(0, 25).map((art: any) => (
                <div
                  key={art.id}
                  className="p-4 border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono-tabular text-stone-500">
                      ID #{art.id} · {art.sourceName} · Category: {art.categorySlug} · Country:{' '}
                      {art.countryCode} · Score: {art.importanceScore}/100
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleArticleBreaking(art.id, art.isBreaking)}
                        className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                          art.isBreaking
                            ? 'bg-[#B91C1C] text-white'
                            : 'bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                        }`}
                      >
                        {art.isBreaking ? 'Breaking Alert Active' : 'Mark as Breaking'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingArticleId(editingArticleId === art.id ? null : art.id);
                          setEditTitle(art.title);
                          setEditCategory(art.categorySlug);
                          setEditCountry(art.countryCode);
                          setEditCorrection(art.correctionNotice || '');
                        }}
                        className="px-3 py-1 text-xs font-medium border border-stone-300 dark:border-slate-700 rounded cursor-pointer"
                      >
                        Edit / Issue Correction
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-editorial font-bold text-stone-950 dark:text-white">
                    {art.title}
                  </h3>

                  {editingArticleId === art.id && (
                    <div className="p-4 bg-[#F4F0E8] dark:bg-slate-950 border border-stone-300 dark:border-slate-800 space-y-3 mt-2">
                      <div>
                        <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                          Editorial Headline
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                            Subject Category
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded"
                          >
                            {CATEGORIES_TAXONOMY.map((c) => (
                              <option key={c.slug} value={c.slug}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                            Country / Region Code
                          </label>
                          <select
                            value={editCountry}
                            onChange={(e) => setEditCountry(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded"
                          >
                            {COUNTRIES_REGIONS_TAXONOMY.map((cr) => (
                              <option key={cr.code} value={cr.code}>
                                {cr.name} ({cr.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                          Formal Editorial Correction / Update Notice (Optional)
                        </label>
                        <input
                          type="text"
                          value={editCorrection}
                          onChange={(e) => setEditCorrection(e.target.value)}
                          placeholder="e.g., Updated at 14:30 UTC to clarify central bank policy vote split."
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingArticleId(null)}
                          className="px-3 py-1.5 text-xs border border-stone-300 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveArticleEdits(art.id)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] rounded cursor-pointer"
                        >
                          Save Editorial Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: DEVELOPING EVENTS & CLUSTERING */}
          {activeTab === 'events' && (
            <div className="space-y-8">
              {/* Merge Duplicate Events Tool */}
              <div className="p-5 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                <h2 className="text-base font-editorial font-bold text-stone-950 dark:text-white mb-2">
                  Merge Duplicate Event Clusters
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400 mb-4">
                  Re-attaches all articles and chronological timeline updates from a secondary event
                  into a primary developing event record.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                      Duplicate Event (Source)
                    </label>
                    <select
                      value={mergeSourceId}
                      onChange={(e) => setMergeSourceId(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-2"
                    >
                      <option value="">Select event to merge from…</option>
                      {overview.events?.map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          #{ev.id} — {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-1">
                      Primary Event (Target)
                    </label>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded px-3 py-2"
                    >
                      <option value="">Select primary event…</option>
                      {overview.events?.map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          #{ev.id} — {ev.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleMergeEvents}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] rounded cursor-pointer"
                  >
                    Merge Events
                  </button>
                </div>
              </div>

              {/* Event Status Override List */}
              <div className="space-y-4">
                {overview.events?.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-5 border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="max-w-2xl">
                      <div className="text-xs font-mono-tabular text-stone-500 mb-1">
                        Event #{ev.id} · {ev.regionName} · {ev.sourceCount} Publishers
                      </div>
                      <h3 className="text-base font-editorial font-bold text-stone-950 dark:text-white">
                        {ev.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <select
                        value={ev.status}
                        onChange={(e) =>
                          handleUpdateEventStatus(ev.id, e.target.value, ev.isBreaking)
                        }
                        className="px-3 py-1.5 bg-[#F4F0E8] dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded font-medium"
                      >
                        <option value="developing">Developing</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="concluded">Concluded</option>
                      </select>

                      <button
                        onClick={() =>
                          handleUpdateEventStatus(ev.id, ev.status, !ev.isBreaking)
                        }
                        className={`px-3 py-1.5 font-semibold rounded cursor-pointer ${
                          ev.isBreaking
                            ? 'bg-[#B91C1C] text-white'
                            : 'bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                        }`}
                      >
                        {ev.isBreaking ? 'Breaking Priority' : 'Standard Priority'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: IMPORTANCE RANKING ENGINE WEIGHTS */}
          {activeTab === 'ranking' && (
            <div className="max-w-2xl p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-5">
              <div>
                <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white mb-1">
                  Transparent News-Ranking Engine Weights
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400">
                  Adjusting these weights immediately recalculates editorial importance scores for
                  stored dispatches, governing Lead Story and Today’s Top 10 selection.
                </p>
              </div>

              {[
                { key: 'sourceReliabilityWeight', label: 'Source Reliability Weight' },
                { key: 'severityImpactWeight', label: 'Severity & Public Impact Weight' },
                { key: 'globalSignificanceWeight', label: 'Global / Regional Significance Weight' },
                {
                  key: 'independentCorroborationWeight',
                  label: 'Independent Multi-Source Corroboration Weight',
                },
                { key: 'recencyWeight', label: 'Recency of Development Weight' },
                { key: 'noveltyWeight', label: 'Novelty Weight' },
                { key: 'geographicReachWeight', label: 'Geographic Reach Weight' },
                {
                  key: 'breakingThresholdScore',
                  label: 'Breaking-News Minimum Score Threshold (65-95)',
                },
              ].map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-stone-800 dark:text-slate-200">
                      {item.label}
                    </span>
                    <span className="font-mono-tabular font-semibold">
                      {(weights as any)[item.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={item.key === 'breakingThresholdScore' ? 65 : 0}
                    max={item.key === 'breakingThresholdScore' ? 95 : 50}
                    value={(weights as any)[item.key]}
                    onChange={(e) =>
                      setWeights((prev) => ({
                        ...prev,
                        [item.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              ))}

              <button
                onClick={handleSaveRankingWeights}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded cursor-pointer"
              >
                Save Weights & Recalculate Editorial Rankings
              </button>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & USER ROLES */}
          {activeTab === 'audit' && (
            <div className="space-y-8">
              <section className="border border-stone-200 dark:border-slate-800 overflow-x-auto">
                <div className="p-4 bg-[#F4F0E8] dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800">
                  <h2 className="text-base font-editorial font-bold text-stone-950 dark:text-white">
                    Administrative Audit Trail
                  </h2>
                </div>
                <table className="w-full text-left text-xs font-mono-tabular">
                  <thead className="bg-stone-100 dark:bg-slate-950 border-b border-stone-200 dark:border-slate-800 uppercase text-stone-500">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
                    {overview.auditLogs?.map((log: any) => (
                      <tr key={log.id}>
                        <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3">{log.actorEmail}</td>
                        <td className="p-3 font-semibold">{log.action}</td>
                        <td className="p-3">
                          {log.targetType}:{log.targetId}
                        </td>
                        <td className="p-3 truncate max-w-md">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
