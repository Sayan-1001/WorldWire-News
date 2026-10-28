import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import path from 'path';
import { db } from './src/db/index.ts';
import {
  aiSummaries,
  articles,
  auditLogs,
  bookmarks,
  briefings,
  categories,
  countriesRegions,
  editorialCorrections,
  events,
  eventTimelineUpdates,
  ingestionLogs,
  newsSources,
  rankingConfig,
  upcomingEvents,
  userPreferences,
} from './src/db/schema.ts';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { requireAdmin, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { listAllUsers, updateUserRole } from './src/db/users.ts';
import { ensureSeededAndIngested } from './src/db/seed.ts';
import { getActiveRankingWeights, runIngestionPipeline } from './src/server/pipeline.ts';
import {
  generateArticleAiBulletin,
  generateEditorialBriefingWithAi,
  isGeminiConfigured,
} from './src/server/ai.ts';
import {
  calculateImportanceScore,
  createSlug,
  sanitizeUntrustedText,
} from './src/server/normalizer.ts';
import { SITE_CONFIG } from './src/config/site.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple server-side TTL cache
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const serverCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    serverCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = 60_000): void {
  serverCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function clearServerCache(): void {
  serverCache.clear();
}

// Rate limiter for expensive AI / ingestion endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'local';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before making additional requests.',
      });
    }
    record.count++;
    next();
  };
}

// ============================================================================
// SEO, ROBOTS.TXT, SITEMAP.XML & PUBLIC RSS FEEDS
// ============================================================================

app.get('/robots.txt', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(100);
    const allEvents = await db.select().from(events).limit(40);

    const staticUrls = [
      '/',
      '/events',
      '/briefings',
      '/calendar',
      '/search',
      '/editorial-policy',
      '/corrections',
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const u of staticUrls) {
      xml += `  <url><loc>${baseUrl}${u}</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>\n`;
    }
    for (const ev of allEvents) {
      xml += `  <url><loc>${baseUrl}/event/${ev.slug}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>\n`;
    }
    for (const art of allArticles) {
      xml += `  <url><loc>${baseUrl}/article/${art.slug}</loc><lastmod>${art.publishedAt.toISOString()}</lastmod><priority>0.7</priority></url>\n`;
    }
    xml += `</urlset>`;
    res.type('application/xml').send(xml);
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>');
  }
});

app.get('/rss/:category.xml', async (req: Request, res: Response) => {
  try {
    const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const catParam = (req.params.category || 'world').replace(/\.xml$/, '');
    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(40);
    const filtered =
      catParam === 'all'
        ? allArticles
        : allArticles.filter((a) => a.categorySlug === catParam);

    let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n<channel>\n`;
    rss += `  <title>${SITE_CONFIG.name} — ${catParam.toUpperCase()} Feed</title>\n`;
    rss += `  <link>${baseUrl}</link>\n`;
    rss += `  <description>${SITE_CONFIG.description}</description>\n`;
    for (const a of filtered.slice(0, 25)) {
      const safeTitle = a.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeDesc = a.summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      rss += `  <item>\n    <title>${safeTitle}</title>\n    <link>${baseUrl}/article/${a.slug}</link>\n    <description>${safeDesc}</description>\n    <pubDate>${a.publishedAt.toUTCString()}</pubDate>\n    <source url="${a.sourceUrl}">${a.sourceName.replace(/&/g, '&amp;')}</source>\n  </item>\n`;
    }
    rss += `</channel>\n</rss>`;
    res.type('application/rss+xml').send(rss);
  } catch (error) {
    console.error('RSS generation failed:', error);
    res.status(500).send('Failed to generate RSS feed');
  }
});

// ============================================================================
// HEALTH & SYSTEM STATUS
// ============================================================================

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const sources = await db.select().from(newsSources);
    const logs = await db
      .select()
      .from(ingestionLogs)
      .orderBy(desc(ingestionLogs.startedAt))
      .limit(5);

    res.json({
      status: 'ok',
      platform: SITE_CONFIG.name,
      timestamp: new Date().toISOString(),
      aiConfigured: isGeminiConfigured(),
      newsApiKeyConfigured: Boolean(
        process.env.NEWS_API_KEY &&
          process.env.NEWS_API_KEY !== 'YOUR_NEWSAPI_ORG_KEY'
      ),
      activeProviders: sources.filter((s) => s.enabled).length,
      cacheEntries: serverCache.size,
      recentJobs: logs,
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'degraded', error: 'Database connectivity check failed' });
  }
});

// ============================================================================
// PUBLIC NEWS & HOMEPAGE INTELLIGENCE ENDPOINTS
// ============================================================================

app.get('/api/homepage', async (_req: Request, res: Response) => {
  try {
    const cached = getCached<any>('homepage_payload');
    if (cached) {
      return res.json(cached);
    }

    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(220);

    const allSummaries = await db.select().from(aiSummaries);
    const summaryByArticleId = new Map(allSummaries.map((s) => [s.articleId, s]));

    const allEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.importanceScore), desc(events.updatedAt));

    const eventById = new Map(allEvents.map((e) => [e.id, e]));

    const enrichedArticles = allArticles.map((a) => ({
      ...a,
      aiSummary: summaryByArticleId.get(a.id) || null,
      event: a.eventId ? eventById.get(a.eventId) || null : null,
    }));

    // Rank by editorial importance + recency for Lead Story and Top 10
    const rankedByImportance = [...enrichedArticles].sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const leadStory = rankedByImportance[0] || null;
    const top10Today = rankedByImportance.slice(0, 10);
    const topHeadlines = rankedByImportance
      .filter((a) => a.id !== leadStory?.id)
      .slice(0, 8);

    const breakingNews = enrichedArticles
      .filter((a) => a.isBreaking)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 8);

    const latestFeed = [...enrichedArticles]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 80);

    const allBriefings = await db
      .select()
      .from(briefings)
      .orderBy(desc(briefings.generatedAt))
      .limit(8);

    const allUpcoming = await db
      .select()
      .from(upcomingEvents)
      .orderBy(upcomingEvents.startDate)
      .limit(10);

    const allSources = await db.select().from(newsSources);
    const allCountries = await db.select().from(countriesRegions);
    const allCategories = await db.select().from(categories);

    const payload = {
      leadStory,
      breakingNews,
      topHeadlines,
      top10Today,
      latestFeed,
      developingEvents: allEvents,
      briefings: allBriefings,
      upcomingEvents: allUpcoming,
      sources: allSources.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        countryCode: s.countryCode,
        reliabilityScore: s.reliabilityScore,
        lastStatus: s.lastStatus,
      })),
      countries: allCountries,
      categories: allCategories,
      lastUpdated: new Date().toISOString(),
    };

    setCached('homepage_payload', payload, 45_000);
    res.json(payload);
  } catch (error: any) {
    console.error('Failed to build homepage payload:', error);
    res.status(500).json({ error: 'Unable to load news intelligence feed.' });
  }
});

app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string | undefined)?.trim().toLowerCase() || '';
    const category = (req.query.category as string | undefined)?.trim().toLowerCase() || '';
    const country = (req.query.country as string | undefined)?.trim().toUpperCase() || '';
    const source = (req.query.source as string | undefined)?.trim() || '';
    const sort = (req.query.sort as string | undefined) || 'recency';
    const timeRange = (req.query.timeRange as string | undefined) || 'all';
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '40'), 10)));

    const rows = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(200);

    const allSummaries = await db.select().from(aiSummaries);
    const summaryMap = new Map(allSummaries.map((s) => [s.articleId, s]));
    const allEvents = await db.select().from(events);
    const eventMap = new Map(allEvents.map((e) => [e.id, e]));

    const now = Date.now();
    let filtered = rows.filter((a) => {
      if (category && category !== 'all') {
        if (category === 'india') {
          if (a.categorySlug !== 'india' && a.countryCode !== 'IN') return false;
        } else if (a.categorySlug !== category) {
          return false;
        }
      }
      if (country && country !== 'ALL') {
        if (a.countryCode !== country && !(country === 'IN' && a.categorySlug === 'india')) {
          return false;
        }
      }
      if (source && source !== 'all') {
        if (a.sourceName.toLowerCase() !== source.toLowerCase()) return false;
      }
      if (timeRange === '24h') {
        if (now - new Date(a.publishedAt).getTime() > 24 * 3600 * 1000) return false;
      } else if (timeRange === '7d') {
        if (now - new Date(a.publishedAt).getTime() > 7 * 24 * 3600 * 1000) return false;
      }
      if (q) {
        const hay = `${a.title} ${a.summary} ${a.sourceName} ${a.regionName} ${a.categorySlug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'importance') {
      filtered.sort((a, b) => b.importanceScore - a.importanceScore);
    } else {
      filtered.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    const result = filtered.slice(0, limit).map((a) => ({
      ...a,
      aiSummary: summaryMap.get(a.id) || null,
      event: a.eventId ? eventMap.get(a.eventId) || null : null,
    }));

    res.json({ articles: result, total: filtered.length });
  } catch (error) {
    console.error('Failed to query articles:', error);
    res.status(500).json({ error: 'Failed to query stored articles.' });
  }
});

app.get('/api/articles/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const rows = await db.select().from(articles).where(eq(articles.slug, slug));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const article = rows[0];

    const summaryRows = await db
      .select()
      .from(aiSummaries)
      .where(eq(aiSummaries.articleId, article.id));

    let event = null;
    let timeline: any[] = [];
    if (article.eventId) {
      const evRows = await db
        .select()
        .from(events)
        .where(eq(events.id, article.eventId));
      event = evRows[0] || null;
      timeline = await db
        .select()
        .from(eventTimelineUpdates)
        .where(eq(eventTimelineUpdates.eventId, article.eventId))
        .orderBy(desc(eventTimelineUpdates.timestamp));
    }

    const corrections = await db
      .select()
      .from(editorialCorrections)
      .where(eq(editorialCorrections.articleId, article.id))
      .orderBy(desc(editorialCorrections.createdAt));

    const recentArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(60);

    const relatedArticles = recentArticles
      .filter(
        (a) =>
          a.id !== article.id &&
          ((article.eventId && a.eventId === article.eventId) ||
            a.categorySlug === article.categorySlug ||
            a.countryCode === article.countryCode)
      )
      .slice(0, 6);

    res.json({
      article,
      aiSummary: summaryRows[0] || null,
      event,
      timeline,
      corrections,
      relatedArticles,
    });
  } catch (error) {
    console.error('Failed to fetch article detail:', error);
    res.status(500).json({ error: 'Failed to load article details.' });
  }
});

app.post(
  '/api/articles/:id/generate-ai-bulletin',
  rateLimit(15, 60_000),
  async (req: Request, res: Response) => {
    try {
      const articleId = parseInt(req.params.id, 10);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: 'Invalid article ID' });
      }

      const rows = await db.select().from(articles).where(eq(articles.id, articleId));
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      const art = rows[0];

      const bulletin = await generateArticleAiBulletin({
        title: art.title,
        summary: art.summary,
        contentSnippet: art.contentSnippet,
        sourceName: art.sourceName,
        sourceUrl: art.sourceUrl,
        categorySlug: art.categorySlug,
        countryCode: art.countryCode,
        whyItMatters: art.whyItMatters,
      });

      const savedRows = await db
        .insert(aiSummaries)
        .values({
          articleId: art.id,
          oneLineHeadline: bulletin.oneLineHeadline,
          briefing30s: bulletin.briefing30s,
          shortBulletin: bulletin.shortBulletin,
          detailedSummary: bulletin.detailedSummary,
          whatHappened: bulletin.whatHappened,
          whyItMatters: bulletin.whyItMatters,
          whatWeKnow: bulletin.whatWeKnow,
          whatRemainsUncertain: bulletin.whatRemainsUncertain,
          whatToWatchNext: bulletin.whatToWatchNext,
          keyFacts: bulletin.keyFacts,
          entities: bulletin.entities,
          cautiousDomainWarning: bulletin.cautiousDomainWarning,
          modelName: bulletin.modelName,
        })
        .onConflictDoUpdate({
          target: aiSummaries.articleId,
          set: {
            oneLineHeadline: bulletin.oneLineHeadline,
            briefing30s: bulletin.briefing30s,
            shortBulletin: bulletin.shortBulletin,
            detailedSummary: bulletin.detailedSummary,
            whatHappened: bulletin.whatHappened,
            whyItMatters: bulletin.whyItMatters,
            whatWeKnow: bulletin.whatWeKnow,
            whatRemainsUncertain: bulletin.whatRemainsUncertain,
            whatToWatchNext: bulletin.whatToWatchNext,
            keyFacts: bulletin.keyFacts,
            entities: bulletin.entities,
            cautiousDomainWarning: bulletin.cautiousDomainWarning,
            modelName: bulletin.modelName,
            generatedAt: new Date(),
          },
        })
        .returning();

      await db
        .update(articles)
        .set({
          whyItMatters: bulletin.whyItMatters,
          processingStatus: 'ai_enriched',
          updatedAt: new Date(),
        })
        .where(eq(articles.id, art.id));

      clearServerCache();
      res.json({ aiSummary: savedRows[0] });
    } catch (error: any) {
      console.error('Failed to generate AI bulletin:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate AI bulletin.',
      });
    }
  }
);

// ============================================================================
// DEVELOPING EVENTS & LIVE EVENT TRACKING ENDPOINTS
// ============================================================================

app.get('/api/events', async (_req: Request, res: Response) => {
  try {
    const allEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.importanceScore), desc(events.updatedAt));
    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt));

    const enriched = allEvents.map((ev) => ({
      ...ev,
      relatedArticles: allArticles.filter((a) => a.eventId === ev.id).slice(0, 6),
    }));

    res.json({ events: enriched });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to load developing events.' });
  }
});

app.get('/api/events/:slug', async (req: Request, res: Response) => {
  try {
    const evRows = await db
      .select()
      .from(events)
      .where(eq(events.slug, req.params.slug));
    if (evRows.length === 0) {
      return res.status(404).json({ error: 'Developing event not found' });
    }
    const event = evRows[0];

    const timeline = await db
      .select()
      .from(eventTimelineUpdates)
      .where(eq(eventTimelineUpdates.eventId, event.id))
      .orderBy(desc(eventTimelineUpdates.timestamp));

    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(100);

    const relatedArticles = allArticles.filter(
      (a) => a.eventId === event.id || a.categorySlug === event.categorySlug
    );

    res.json({
      event,
      timeline,
      relatedArticles: relatedArticles.slice(0, 12),
    });
  } catch (error) {
    console.error('Failed to fetch event detail:', error);
    res.status(500).json({ error: 'Failed to load event tracking page.' });
  }
});

// ============================================================================
// DAILY BRIEFINGS, NEWS EXPLAINED & UPCOMING CALENDAR ENDPOINTS
// ============================================================================

app.get('/api/briefings', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(briefings)
      .orderBy(desc(briefings.generatedAt));
    res.json({ briefings: rows });
  } catch (error) {
    console.error('Failed to load briefings:', error);
    res.status(500).json({ error: 'Failed to load briefings.' });
  }
});

app.post(
  '/api/briefings/generate',
  rateLimit(10, 60_000),
  async (req: Request, res: Response) => {
    try {
      const { type = 'morning', scopeFilter = 'global' } = req.body || {};

      const allArticles = await db
        .select()
        .from(articles)
        .orderBy(desc(articles.importanceScore), desc(articles.publishedAt))
        .limit(60);

      const scopedArticles = allArticles.filter((a) => {
        if (!scopeFilter || scopeFilter === 'global') return true;
        if (scopeFilter.toUpperCase() === a.countryCode) return true;
        if (scopeFilter.toLowerCase() === a.categorySlug) return true;
        return false;
      });

      const sourcePool = scopedArticles.length >= 2 ? scopedArticles : allArticles;

      const titleMap: Record<string, string> = {
        morning: 'Global Morning Executive Briefing',
        evening: 'Global Evening Intelligence Wrap',
        last24h: '24-Hour Global Situation Digest',
        weekly: 'Weekly World Intelligence Review',
        country: `Regional Briefing: ${scopeFilter.toUpperCase()}`,
        topic: `Sector Briefing: ${scopeFilter}`,
        explainer: `News Explained: ${scopeFilter === 'global' ? 'Key Global Developments' : scopeFilter}`,
      };

      const title = titleMap[type] || 'Executive News Briefing';
      const coveragePeriod = `Generated ${new Date().toUTCString()}`;

      const generated = await generateEditorialBriefingWithAi({
        type,
        title,
        scopeFilter,
        coveragePeriod,
        articles: sourcePool.slice(0, 6),
      });

      const slug = createSlug(`${title}-${scopeFilter}`, String(Date.now()).slice(-5));

      const inserted = await db
        .insert(briefings)
        .values({
          slug,
          type,
          title,
          subtitle: `Synthesized from ${ Math.min(6, sourcePool.length) } corroborated dispatches (${scopeFilter})`,
          scopeFilter,
          coveragePeriod,
          leadSynthesis: generated.leadSynthesis,
          items: generated.items,
          backgroundContext: generated.backgroundContext,
          uncertaintyNotes: generated.uncertaintyNotes,
          modelName: generated.modelName,
        })
        .returning();

      clearServerCache();
      res.json({ briefing: inserted[0] });
    } catch (error: any) {
      console.error('Failed to generate briefing:', error);
      res.status(500).json({ error: error.message || 'Failed to generate briefing.' });
    }
  }
);

app.get('/api/calendar', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(upcomingEvents)
      .orderBy(upcomingEvents.startDate);
    res.json({ upcomingEvents: rows });
  } catch (error) {
    console.error('Failed to load upcoming events calendar:', error);
    res.status(500).json({ error: 'Failed to load upcoming events calendar.' });
  }
});

// ============================================================================
// AUTHENTICATED USER ENDPOINTS (BOOKMARKS & PERSONALIZATION)
// ============================================================================

app.get('/api/user/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const userBookmarks = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userUid, uid));

    const prefsRows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userUid, uid));

    res.json({
      user: req.dbUser,
      bookmarkedArticleIds: userBookmarks.map((b) => b.articleId),
      preferences: prefsRows[0] || null,
    });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({ error: 'Failed to load user profile.' });
  }
});

app.post('/api/user/bookmarks', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const articleId = parseInt(String(req.body?.articleId), 10);
    if (isNaN(articleId)) {
      return res.status(400).json({ error: 'Valid articleId is required' });
    }

    const existing = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userUid, uid), eq(bookmarks.articleId, articleId)));

    if (existing.length > 0) {
      await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
      return res.json({ bookmarked: false, articleId });
    } else {
      await db.insert(bookmarks).values({ userUid: uid, articleId });
      return res.json({ bookmarked: true, articleId });
    }
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
    res.status(500).json({ error: 'Failed to update bookmark.' });
  }
});

app.put('/api/user/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const {
      followedCountries = ['IN', 'US', 'GLOBAL'],
      followedCategories = ['world', 'technology', 'business'],
      preferredLanguage = 'en',
      breakingAlertsEnabled = true,
      importanceThreshold = 75,
    } = req.body || {};

    const updated = await db
      .insert(userPreferences)
      .values({
        userUid: uid,
        followedCountries,
        followedCategories,
        preferredLanguage,
        breakingAlertsEnabled: Boolean(breakingAlertsEnabled),
        importanceThreshold: Number(importanceThreshold) || 75,
      })
      .onConflictDoUpdate({
        target: userPreferences.userUid,
        set: {
          followedCountries,
          followedCategories,
          preferredLanguage,
          breakingAlertsEnabled: Boolean(breakingAlertsEnabled),
          importanceThreshold: Number(importanceThreshold) || 75,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ preferences: updated[0] });
  } catch (error) {
    console.error('Failed to save user preferences:', error);
    res.status(500).json({ error: 'Failed to save user preferences.' });
  }
});

// ============================================================================
// PROTECTED ADMINISTRATIVE ENDPOINTS (SERVER-SIDE AUTHORIZATION)
// ============================================================================

app.get('/api/admin/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const allSources = await db.select().from(newsSources);
    const allArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(80);
    const allEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.updatedAt));
    const weights = await getActiveRankingWeights();
    const recentLogs = await db
      .select()
      .from(ingestionLogs)
      .orderBy(desc(ingestionLogs.startedAt))
      .limit(25);
    const recentAudits = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(30);
    const allUsers = await listAllUsers();

    res.json({
      sources: allSources,
      articles: allArticles,
      events: allEvents,
      rankingConfig: weights,
      ingestionLogs: recentLogs,
      auditLogs: recentAudits,
      users: allUsers,
      environmentStatus: {
        geminiConfigured: isGeminiConfigured(),
        newsApiKeyConfigured: Boolean(
          process.env.NEWS_API_KEY &&
            process.env.NEWS_API_KEY !== 'YOUR_NEWSAPI_ORG_KEY'
        ),
        gdeltConfigured: true,
      },
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Failed to load administrative overview.' });
  }
});

app.post(
  '/api/admin/ingest',
  requireAdmin,
  rateLimit(8, 60_000),
  async (req: AuthRequest, res: Response) => {
    try {
      const providerSlug = req.body?.providerSlug as string | undefined;
      const enrichTopWithAi = Boolean(req.body?.enrichTopWithAi);
      const summary = await runIngestionPipeline({ providerSlug, enrichTopWithAi });

      await db.insert(auditLogs).values({
        actorEmail: req.dbUser?.email || 'admin',
        action: 'MANUAL_INGESTION_TRIGGER',
        targetType: 'pipeline',
        targetId: providerSlug || 'all_enabled',
        details: `Fetched ${summary.articlesFetched}, inserted ${summary.articlesInserted}, skipped ${summary.duplicatesSkipped} duplicates.`,
      });

      clearServerCache();
      res.json({ result: summary });
    } catch (error: any) {
      console.error('Manual ingestion failed:', error);
      res.status(500).json({ error: error.message || 'Ingestion pipeline failed.' });
    }
  }
);

app.patch('/api/admin/sources/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sourceId = parseInt(req.params.id, 10);
    const { enabled, reliabilityScore, isBreakingPriority, refreshIntervalMinutes } = req.body || {};

    const updateSet: Record<string, any> = {};
    if (typeof enabled === 'boolean') updateSet.enabled = enabled;
    if (typeof reliabilityScore === 'number') {
      updateSet.reliabilityScore = Math.min(100, Math.max(10, reliabilityScore));
    }
    if (typeof isBreakingPriority === 'boolean') {
      updateSet.isBreakingPriority = isBreakingPriority;
    }
    if (typeof refreshIntervalMinutes === 'number') {
      updateSet.refreshIntervalMinutes = Math.max(5, refreshIntervalMinutes);
    }

    const updated = await db
      .update(newsSources)
      .set(updateSet)
      .where(eq(newsSources.id, sourceId))
      .returning();

    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'UPDATE_NEWS_SOURCE',
      targetType: 'news_source',
      targetId: String(sourceId),
      details: JSON.stringify(updateSet),
    });

    clearServerCache();
    res.json({ source: updated[0] });
  } catch (error) {
    console.error('Failed to update source:', error);
    res.status(500).json({ error: 'Failed to update source configuration.' });
  }
});

app.patch('/api/admin/articles/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    const {
      title,
      categorySlug,
      countryCode,
      isBreaking,
      importanceScore,
      eventId,
      correctionNotice,
    } = req.body || {};

    const updateSet: Record<string, any> = { updatedAt: new Date() };
    if (typeof title === 'string' && title.trim()) {
      updateSet.title = sanitizeUntrustedText(title, 240);
    }
    if (typeof categorySlug === 'string' && categorySlug.trim()) {
      updateSet.categorySlug = categorySlug.trim();
    }
    if (typeof countryCode === 'string' && countryCode.trim()) {
      updateSet.countryCode = countryCode.trim().toUpperCase();
    }
    if (typeof isBreaking === 'boolean') {
      updateSet.isBreaking = isBreaking;
    }
    if (typeof importanceScore === 'number') {
      updateSet.importanceScore = Math.min(99, Math.max(1, importanceScore));
    }
    if (eventId !== undefined) {
      updateSet.eventId = eventId ? Number(eventId) : null;
    }
    if (typeof correctionNotice === 'string') {
      updateSet.correctionNotice = correctionNotice.trim() || null;
      if (correctionNotice.trim()) {
        await db.insert(editorialCorrections).values({
          articleId,
          correctionText: correctionNotice.trim(),
          correctedByEmail: req.dbUser?.email || 'editor@worldwire.org',
        });
      }
    }

    const updated = await db
      .update(articles)
      .set(updateSet)
      .where(eq(articles.id, articleId))
      .returning();

    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'UPDATE_ARTICLE_EDITORIAL',
      targetType: 'article',
      targetId: String(articleId),
      details: JSON.stringify(updateSet),
    });

    clearServerCache();
    res.json({ article: updated[0] });
  } catch (error) {
    console.error('Failed to update article:', error);
    res.status(500).json({ error: 'Failed to update article.' });
  }
});

app.patch('/api/admin/events/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { status, isBreaking, importanceScore, title, overview, timelineNote } = req.body || {};

    const updateSet: Record<string, any> = {
      updatedAt: new Date(),
      lastVerifiedAt: new Date(),
      adminOverride: true,
    };
    if (typeof status === 'string') updateSet.status = status;
    if (typeof isBreaking === 'boolean') updateSet.isBreaking = isBreaking;
    if (typeof importanceScore === 'number') updateSet.importanceScore = importanceScore;
    if (typeof title === 'string' && title.trim()) updateSet.title = title.trim();
    if (typeof overview === 'string' && overview.trim()) updateSet.overview = overview.trim();

    const updated = await db
      .update(events)
      .set(updateSet)
      .where(eq(events.id, eventId))
      .returning();

    if (typeof timelineNote === 'string' && timelineNote.trim()) {
      await db.insert(eventTimelineUpdates).values({
        eventId,
        timestamp: new Date(),
        title: 'Editorial Desk Verification Update',
        summary: timelineNote.trim(),
        sourceName: `WORLDWIRE Desk (${req.dbUser?.email || 'Editor'})`,
        sourceUrl: '/',
        isVerified: true,
      });
    }

    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'UPDATE_DEVELOPING_EVENT',
      targetType: 'event',
      targetId: String(eventId),
      details: JSON.stringify(updateSet),
    });

    clearServerCache();
    res.json({ event: updated[0] });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ error: 'Failed to update developing event.' });
  }
});

app.post('/api/admin/events/merge', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sourceEventId = parseInt(String(req.body?.sourceEventId), 10);
    const targetEventId = parseInt(String(req.body?.targetEventId), 10);
    if (isNaN(sourceEventId) || isNaN(targetEventId) || sourceEventId === targetEventId) {
      return res.status(400).json({ error: 'Two distinct event IDs are required to merge.' });
    }

    await db
      .update(articles)
      .set({ eventId: targetEventId })
      .where(eq(articles.eventId, sourceEventId));

    await db
      .update(eventTimelineUpdates)
      .set({ eventId: targetEventId })
      .where(eq(eventTimelineUpdates.eventId, sourceEventId));

    await db
      .update(events)
      .set({ status: 'concluded', isBreaking: false })
      .where(eq(events.id, sourceEventId));

    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'MERGE_DUPLICATE_EVENTS',
      targetType: 'event',
      targetId: `${sourceEventId}->${targetEventId}`,
      details: `Merged event #${sourceEventId} into primary event #${targetEventId}`,
    });

    clearServerCache();
    res.json({ merged: true, sourceEventId, targetEventId });
  } catch (error) {
    console.error('Failed to merge events:', error);
    res.status(500).json({ error: 'Failed to merge events.' });
  }
});

app.put('/api/admin/ranking-config', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      sourceReliabilityWeight = 25,
      severityImpactWeight = 20,
      globalSignificanceWeight = 20,
      independentCorroborationWeight = 15,
      recencyWeight = 10,
      noveltyWeight = 5,
      geographicReachWeight = 5,
      breakingThresholdScore = 84,
    } = req.body || {};

    const newWeights = {
      sourceReliabilityWeight: Number(sourceReliabilityWeight),
      severityImpactWeight: Number(severityImpactWeight),
      globalSignificanceWeight: Number(globalSignificanceWeight),
      independentCorroborationWeight: Number(independentCorroborationWeight),
      recencyWeight: Number(recencyWeight),
      noveltyWeight: Number(noveltyWeight),
      geographicReachWeight: Number(geographicReachWeight),
      breakingThresholdScore: Number(breakingThresholdScore),
    };

    await db
      .insert(rankingConfig)
      .values({
        key: 'default',
        ...newWeights,
      })
      .onConflictDoUpdate({
        target: rankingConfig.key,
        set: {
          ...newWeights,
          updatedAt: new Date(),
        },
      });

    // Re-score recent articles using updated weights
    const recentArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(80);

    for (const art of recentArticles) {
      const rescored = calculateImportanceScore(
        {
          title: art.title,
          summary: art.summary,
          sourceReliability: 90,
          corroboratingSourcesCount: art.eventId ? 3 : 1,
          publishedAt: new Date(art.publishedAt),
          categorySlug: art.categorySlug,
          countryCode: art.countryCode,
        },
        newWeights
      );
      await db
        .update(articles)
        .set({
          importanceScore: rescored.importanceScore,
          selectionReason: rescored.selectionReason,
        })
        .where(eq(articles.id, art.id));
    }

    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'UPDATE_RANKING_WEIGHTS',
      targetType: 'ranking_config',
      targetId: 'default',
      details: JSON.stringify(newWeights),
    });

    clearServerCache();
    res.json({ rankingConfig: newWeights });
  } catch (error) {
    console.error('Failed to update ranking config:', error);
    res.status(500).json({ error: 'Failed to update ranking configuration.' });
  }
});

app.patch('/api/admin/users/:uid/role', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.params;
    const { role } = req.body || {};
    if (!['reader', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const updated = await updateUserRole(uid, role);
    await db.insert(auditLogs).values({
      actorEmail: req.dbUser?.email || 'admin',
      action: 'UPDATE_USER_ROLE',
      targetType: 'user',
      targetId: uid,
      details: `Role set to ${role}`,
    });
    res.json({ user: updated });
  } catch (error) {
    console.error('Failed to update user role:', error);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// ============================================================================
// SERVER INITIALIZATION & VITE MIDDLEWARE
// ============================================================================

async function startServer() {
  // Run database seed and initial live news ingestion asynchronously after binding port
  setTimeout(() => {
    ensureSeededAndIngested()
      .then(() => {
        clearServerCache();
        console.log('WORLDWIRE database seeded and live providers synchronized.');
      })
      .catch((err) => {
        console.error('Initial seed/ingestion warning:', err);
      });
  }, 500);

  // Background scheduled job every 15 minutes
  setInterval(() => {
    runIngestionPipeline({ enrichTopWithAi: false })
      .then(() => clearServerCache())
      .catch((err) => console.error('Scheduled ingestion job error:', err));
  }, 15 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${SITE_CONFIG.name} server running on http://localhost:${PORT}`);
  });
}

startServer();
