import { db } from '../db/index.ts';
import {
  aiSummaries,
  articles,
  events,
  eventTimelineUpdates,
  ingestionLogs,
  newsSources,
  rankingConfig,
} from '../db/schema.ts';
import { desc, eq } from 'drizzle-orm';
import {
  calculateImportanceScore,
  calculateTitleSimilarity,
  classifyArticleTaxonomy,
  computeUrlHash,
  createSlug,
  DEFAULT_RANKING_WEIGHTS,
  normalizeUrl,
  RankingWeights,
} from './normalizer.ts';
import { getAdapterForProvider, SourceDescriptor } from './providers.ts';
import { generateArticleAiBulletin, validateAiBulletinOutput } from './ai.ts';

export async function getActiveRankingWeights(): Promise<RankingWeights> {
  try {
    const rows = await db
      .select()
      .from(rankingConfig)
      .where(eq(rankingConfig.key, 'default'));
    if (rows.length === 0) return DEFAULT_RANKING_WEIGHTS;
    const r = rows[0];
    return {
      sourceReliabilityWeight: r.sourceReliabilityWeight,
      severityImpactWeight: r.severityImpactWeight,
      globalSignificanceWeight: r.globalSignificanceWeight,
      independentCorroborationWeight: r.independentCorroborationWeight,
      recencyWeight: r.recencyWeight,
      noveltyWeight: r.noveltyWeight,
      geographicReachWeight: r.geographicReachWeight,
      breakingThresholdScore: r.breakingThresholdScore,
    };
  } catch (error) {
    console.error('Failed to read ranking weights, using defaults:', error);
    return DEFAULT_RANKING_WEIGHTS;
  }
}

export async function runIngestionPipeline(options?: {
  providerSlug?: string;
  enrichTopWithAi?: boolean;
}): Promise<{
  providersRun: number;
  articlesFetched: number;
  articlesInserted: number;
  duplicatesSkipped: number;
  eventsUpdated: number;
  errors: string[];
}> {
  const startTime = Date.now();
  let totalFetched = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalEventsUpdated = 0;
  const errors: string[] = [];

  try {
    const allSources = await db.select().from(newsSources);
    const targetSources = allSources.filter((s) =>
      options?.providerSlug ? s.slug === options.providerSlug : s.enabled
    );

    const weights = await getActiveRankingWeights();
    const existingArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(200);
    const activeEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.updatedAt))
      .limit(50);

    const knownUrlHashes = new Set(existingArticles.map((a) => a.urlHash));
    const recentTitles: Array<{ id: number; title: string; sourceName: string; eventId: number | null }> =
      existingArticles.map((a) => ({
        id: a.id,
        title: a.title,
        sourceName: a.sourceName,
        eventId: a.eventId,
      }));

    for (const src of targetSources) {
      const srcStart = Date.now();
      const adapter = getAdapterForProvider(src.providerType);
      const descriptor: SourceDescriptor = {
        id: src.id,
        slug: src.slug,
        name: src.name,
        providerType: src.providerType as any,
        endpointUrl: src.endpointUrl,
        websiteUrl: src.websiteUrl,
        countryCode: src.countryCode,
        regionName: src.regionName,
        defaultCategory: src.defaultCategory,
        reliabilityScore: src.reliabilityScore,
        isBreakingPriority: src.isBreakingPriority,
        allowsFullText: src.allowsFullText,
        enabled: src.enabled,
        requiresApiKeyEnv: src.requiresApiKeyEnv,
      };

      const fetchResult = await adapter.fetchArticles(descriptor);
      let srcInserted = 0;
      let srcDuplicates = 0;
      let srcEventsUpdated = 0;

      if (fetchResult.status === 'ok') {
        totalFetched += fetchResult.articles.length;

        for (const raw of fetchResult.articles) {
          const canonical = normalizeUrl(raw.canonicalUrl);
          const urlHash = computeUrlHash(canonical);

          // 1. Exact duplicate check
          if (knownUrlHashes.has(urlHash)) {
            srcDuplicates++;
            totalDuplicates++;
            continue;
          }

          // 2. Near-duplicate check & Event clustering check
          let matchedDuplicateId: number | null = null;
          let matchedEventId: number | null = null;
          let corroboratingSources = 1;

          for (const existing of recentTitles) {
            const sim = calculateTitleSimilarity(raw.title, existing.title);
            if (sim >= 0.72 && existing.sourceName === raw.sourceName) {
              matchedDuplicateId = existing.id;
              break;
            }
            if (sim >= 0.38) {
              if (existing.sourceName !== raw.sourceName) {
                corroboratingSources++;
              }
              if (existing.eventId) {
                matchedEventId = existing.eventId;
              }
            }
          }

          if (matchedDuplicateId) {
            srcDuplicates++;
            totalDuplicates++;
            continue;
          }

          // Also check against active events directly
          if (!matchedEventId) {
            for (const ev of activeEvents) {
              const evSim = calculateTitleSimilarity(raw.title, `${ev.title} ${ev.overview}`);
              if (evSim >= 0.32) {
                matchedEventId = ev.id;
                corroboratingSources = Math.max(corroboratingSources, ev.sourceCount + 1);
                break;
              }
            }
          }

          // 3. Classify taxonomy
          const taxonomy = classifyArticleTaxonomy(
            raw.title,
            raw.summary,
            raw.defaultCategory,
            raw.defaultCountryCode
          );

          // 4. Calculate importance score
          const ranking = calculateImportanceScore(
            {
              title: raw.title,
              summary: raw.summary,
              sourceReliability: raw.reliabilityScore,
              corroboratingSourcesCount: corroboratingSources,
              publishedAt: raw.publishedAt,
              categorySlug: taxonomy.categorySlug,
              countryCode: taxonomy.countryCode,
              isBreakingPrioritySource: raw.isBreakingPriority,
            },
            weights
          );

          const slug = createSlug(raw.title, urlHash.slice(0, 6));

          // 5. Store article idempotently
          const insertedRows = await db
            .insert(articles)
            .values({
              slug,
              canonicalUrl: canonical,
              urlHash,
              title: raw.title,
              originalTitle: raw.title,
              subheading:
                raw.summary !== raw.title ? raw.summary.slice(0, 180) : null,
              summary: raw.summary,
              contentSnippet: raw.contentSnippet || raw.summary,
              fullTextPermitted: raw.allowsFullText,
              imageUrl: raw.imageUrl || null,
              imageAttribution: raw.imageAttribution || null,
              author: raw.author || null,
              sourceId: src.id,
              sourceName: raw.sourceName,
              sourceUrl: raw.sourceUrl,
              categorySlug: taxonomy.categorySlug,
              countryCode: taxonomy.countryCode,
              regionName: taxonomy.regionName,
              language: 'en',
              publishedAt: raw.publishedAt,
              updatedAt: new Date(),
              ingestedAt: new Date(),
              importanceScore: ranking.importanceScore,
              isBreaking: ranking.isBreaking,
              isLeadCandidate: ranking.importanceScore >= 80,
              whyItMatters: ranking.whyItMatters,
              selectionReason: ranking.selectionReason,
              eventId: matchedEventId,
              processingStatus: 'processed',
            })
            .onConflictDoNothing({ target: articles.urlHash })
            .returning();

          if (insertedRows.length > 0) {
            const inserted = insertedRows[0];
            knownUrlHashes.add(urlHash);
            recentTitles.unshift({
              id: inserted.id,
              title: inserted.title,
              sourceName: inserted.sourceName,
              eventId: inserted.eventId,
            });
            srcInserted++;
            totalInserted++;

            // 6. Create baseline structured summary record (can be upgraded with live Gemini)
            const baselineSummary = validateAiBulletinOutput(
              {
                entities: {
                  countries: [taxonomy.regionName],
                  organizations: taxonomy.entities.organizations,
                  topics: [taxonomy.categorySlug],
                },
                modelName: 'worldwire-pipeline-v1',
              },
              {
                title: inserted.title,
                summary: inserted.summary,
                sourceName: inserted.sourceName,
                categorySlug: inserted.categorySlug,
                whyItMatters: inserted.whyItMatters,
              }
            );

            await db
              .insert(aiSummaries)
              .values({
                articleId: inserted.id,
                oneLineHeadline: baselineSummary.oneLineHeadline,
                briefing30s: baselineSummary.briefing30s,
                shortBulletin: baselineSummary.shortBulletin,
                detailedSummary: baselineSummary.detailedSummary,
                whatHappened: baselineSummary.whatHappened,
                whyItMatters: baselineSummary.whyItMatters,
                whatWeKnow: baselineSummary.whatWeKnow,
                whatRemainsUncertain: baselineSummary.whatRemainsUncertain,
                whatToWatchNext: baselineSummary.whatToWatchNext,
                keyFacts: baselineSummary.keyFacts,
                entities: baselineSummary.entities,
                cautiousDomainWarning: baselineSummary.cautiousDomainWarning,
                modelName: baselineSummary.modelName,
              })
              .onConflictDoNothing({ target: aiSummaries.articleId });

            // 7. If matched to an active event, append to its timeline & update sourceCount
            if (matchedEventId) {
              await db.insert(eventTimelineUpdates).values({
                eventId: matchedEventId,
                timestamp: inserted.publishedAt,
                title: inserted.title,
                summary: inserted.summary,
                sourceName: inserted.sourceName,
                sourceUrl: inserted.canonicalUrl,
                isVerified: true,
              });
              const evRow = activeEvents.find((e) => e.id === matchedEventId);
              if (evRow) {
                const newCount = evRow.sourceCount + 1;
                evRow.sourceCount = newCount;
                await db
                  .update(events)
                  .set({
                    sourceCount: newCount,
                    updatedAt: new Date(),
                    lastVerifiedAt: new Date(),
                  })
                  .where(eq(events.id, matchedEventId));
                srcEventsUpdated++;
                totalEventsUpdated++;
              }
            }
          }
        }
      } else if (fetchResult.status === 'error' && fetchResult.errorMessage) {
        errors.push(`${src.name}: ${fetchResult.errorMessage}`);
      }

      // Update source status
      await db
        .update(newsSources)
        .set({
          lastFetchedAt: new Date(),
          lastStatus: fetchResult.status,
          lastError: fetchResult.errorMessage || null,
        })
        .where(eq(newsSources.id, src.id));

      // Record ingestion log
      await db.insert(ingestionLogs).values({
        jobType: `${src.providerType}_sync`,
        providerSlug: src.slug,
        status: fetchResult.status === 'ok' ? 'completed' : fetchResult.status === 'missing_key' ? 'skipped' : 'failed',
        articlesFetched: fetchResult.articles.length,
        articlesInserted: srcInserted,
        duplicatesSkipped: srcDuplicates,
        eventsUpdated: srcEventsUpdated,
        errorMessage: fetchResult.errorMessage || null,
        durationMs: Date.now() - srcStart,
        startedAt: new Date(srcStart),
        completedAt: new Date(),
      });
    }

    // Optionally enrich top newly inserted articles with Gemini AI
    if (options?.enrichTopWithAi) {
      const topToEnrich = await db
        .select()
        .from(articles)
        .where(eq(articles.processingStatus, 'processed'))
        .orderBy(desc(articles.importanceScore))
        .limit(2);

      for (const art of topToEnrich) {
        try {
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

          await db
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
            });

          await db
            .update(articles)
            .set({
              whyItMatters: bulletin.whyItMatters,
              processingStatus: 'ai_enriched',
            })
            .where(eq(articles.id, art.id));
        } catch (aiErr) {
          console.error('Background AI enrichment skipped for article:', art.id, aiErr);
        }
      }
    }

    return {
      providersRun: targetSources.length,
      articlesFetched: totalFetched,
      articlesInserted: totalInserted,
      duplicatesSkipped: totalDuplicates,
      eventsUpdated: totalEventsUpdated,
      errors,
    };
  } catch (error) {
    console.error('Ingestion pipeline execution error:', error);
    throw new Error('News ingestion pipeline failed to complete.', { cause: error });
  }
}
