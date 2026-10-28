import React, { useEffect, useState } from 'react';
import { Bell, Bookmark, Check, Globe, UserCheck } from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { useApp } from '../context/AppContext.tsx';
import { ArticleItem } from '../types/news.ts';
import { StoryCard } from '../components/StoryCard.tsx';

export const SavedPersonalizationPage: React.FC = () => {
  const {
    firebaseUser,
    bookmarkedIds,
    preferences,
    savePreferences,
    signInWithGoogle,
  } = useApp();

  const [allArticles, setAllArticles] = useState<ArticleItem[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    document.title = `Saved Stories & Personalization — ${SITE_CONFIG.name}`;
    fetch('/api/articles?limit=100')
      .then((r) => r.json())
      .then((data) => setAllArticles(data.articles || []))
      .catch((err) => console.error('Failed to load articles:', err));
  }, []);

  const savedArticles = allArticles.filter((a) => bookmarkedIds.includes(a.id));

  const personalizedFeed = allArticles.filter(
    (a) =>
      preferences.followedCountries.includes(a.countryCode) ||
      preferences.followedCategories.includes(a.categorySlug)
  );

  const toggleCountryFollow = async (code: string) => {
    const exists = preferences.followedCountries.includes(code);
    const nextCountries = exists
      ? preferences.followedCountries.filter((c) => c !== code)
      : [...preferences.followedCountries, code];
    await savePreferences({ ...preferences, followedCountries: nextCountries });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const toggleCategoryFollow = async (slug: string) => {
    const exists = preferences.followedCategories.includes(slug);
    const nextCats = exists
      ? preferences.followedCategories.filter((c) => c !== slug)
      : [...preferences.followedCategories, slug];
    await savePreferences({ ...preferences, followedCategories: nextCats });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
      <header className="border-b border-stone-900 dark:border-slate-300 pb-6 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-1">
            Reader Dossier & Custom Wire Preferences
          </p>
          <h1 className="text-3xl sm:text-5xl font-editorial font-bold text-stone-950 dark:text-white">
            Saved Stories & Personalization
          </h1>
        </div>

        {!firebaseUser && (
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign In with Google to Sync Across Devices</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left 8 Cols: Saved Bookmarks & Personalized Feed */}
        <div className="lg:col-span-8 space-y-12">
          <section>
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-2 mb-6">
              <Bookmark className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
              <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white">
                Bookmarked Dispatches ({savedArticles.length})
              </h2>
            </div>

            {savedArticles.length === 0 ? (
              <div className="p-8 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-center">
                <p className="text-sm text-stone-700 dark:text-slate-300 mb-1">
                  You have not bookmarked any stories yet.
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Click the bookmark icon on any story card across {SITE_CONFIG.name} to save it for
                  focused reading.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedArticles.map((art) => (
                  <StoryCard key={art.id} article={art} variant="featured" showImage={true} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 border-b border-stone-200 dark:border-slate-800 pb-2 mb-6">
              <Globe className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
              <h2 className="text-2xl font-editorial font-bold text-stone-950 dark:text-white">
                Your Personalized Wire ({personalizedFeed.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {personalizedFeed.slice(0, 6).map((art) => (
                <StoryCard key={art.id} article={art} variant="featured" showImage={false} />
              ))}
            </div>
          </section>
        </div>

        {/* Right 4 Cols: Personalization & Notification Controls */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-[#F4F0E8] dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-editorial font-bold text-stone-950 dark:text-white">
                Followed Countries & Desks
              </h3>
              {savedNotice && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-2">
                Followed Countries & Regions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES_REGIONS_TAXONOMY.map((c) => {
                  const active = preferences.followedCountries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggleCountryFollow(c.code)}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                        active
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-tabular uppercase text-stone-500 mb-2">
                Followed Topics
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES_TAXONOMY.map((cat) => {
                  const active = preferences.followedCategories.includes(cat.slug);
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => toggleCategoryFollow(cat.slug)}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                        active
                          ? 'bg-[#1E3A8A] text-white'
                          : 'bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                      }`}
                    >
                      {cat.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-300 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono-tabular uppercase text-stone-500">
                <Bell className="w-3.5 h-3.5" />
                <span>Breaking Alert Threshold & Anti-Spam</span>
              </div>

              <label className="flex items-center justify-between text-xs text-stone-800 dark:text-slate-200 cursor-pointer">
                <span>Enable Verified Breaking Alerts</span>
                <input
                  type="checkbox"
                  checked={preferences.breakingAlertsEnabled}
                  onChange={(e) =>
                    savePreferences({
                      ...preferences,
                      breakingAlertsEnabled: e.target.checked,
                    })
                  }
                />
              </label>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Minimum Importance Score</span>
                  <span className="font-mono-tabular font-semibold">
                    {preferences.importanceThreshold} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={95}
                  value={preferences.importanceThreshold}
                  onChange={(e) =>
                    savePreferences({
                      ...preferences,
                      importanceThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Prevents alert fatigue by dispatching notifications only when corroborated events
                  exceed your importance threshold.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
