import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('reader'), // 'reader' | 'editor' | 'admin'
  createdAt: timestamp('created_at').defaultNow(),
});

export const newsSources = pgTable('news_sources', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  providerType: text('provider_type').notNull(), // 'rss' | 'gdelt' | 'newsapi' | 'official'
  endpointUrl: text('endpoint_url').notNull(),
  websiteUrl: text('website_url').notNull(),
  countryCode: text('country_code').notNull().default('GLOBAL'),
  regionName: text('region_name').notNull().default('Global'),
  defaultCategory: text('default_category').notNull().default('world'),
  reliabilityScore: integer('reliability_score').notNull().default(88),
  isBreakingPriority: boolean('is_breaking_priority').notNull().default(false),
  allowsFullText: boolean('allows_full_text').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  requiresApiKeyEnv: text('requires_api_key_env'),
  refreshIntervalMinutes: integer('refresh_interval_minutes').notNull().default(15),
  lastFetchedAt: timestamp('last_fetched_at'),
  lastStatus: text('last_status').notNull().default('idle'), // 'idle' | 'ok' | 'error' | 'missing_key'
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  displayOrder: integer('display_order').notNull().default(10),
  isFeatured: boolean('is_featured').notNull().default(true),
});

export const countriesRegions = pgTable('countries_regions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull().default('country'), // 'country' | 'region' | 'continent'
  continent: text('continent').notNull().default('Global'),
  summary: text('summary'),
  featured: boolean('featured').notNull().default(true),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  overview: text('overview').notNull(),
  status: text('status').notNull().default('developing'), // 'developing' | 'ongoing' | 'monitoring' | 'concluded'
  isBreaking: boolean('is_breaking').notNull().default(false),
  importanceScore: integer('importance_score').notNull().default(75),
  categorySlug: text('category_slug').notNull().default('world'),
  countryCode: text('country_code').notNull().default('GLOBAL'),
  regionName: text('region_name').notNull().default('Global'),
  keyFacts: jsonb('key_facts').$type<string[]>().notNull().default([]),
  knownFacts: jsonb('known_facts').$type<string[]>().notNull().default([]),
  unconfirmedClaims: jsonb('unconfirmed_claims').$type<string[]>().notNull().default([]),
  entities: jsonb('entities')
    .$type<{ people: string[]; organizations: string[]; locations: string[] }>()
    .notNull()
    .default({ people: [], organizations: [], locations: [] }),
  backgroundContext: text('background_context').notNull().default(''),
  whatToWatch: text('what_to_watch').notNull().default(''),
  sourceCount: integer('source_count').notNull().default(1),
  adminOverride: boolean('admin_override').notNull().default(false),
  lastVerifiedAt: timestamp('last_verified_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const eventTimelineUpdates = pgTable('event_timeline_updates', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  isVerified: boolean('is_verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  canonicalUrl: text('canonical_url').notNull().unique(),
  urlHash: text('url_hash').notNull().unique(),
  title: text('title').notNull(),
  originalTitle: text('original_title').notNull(),
  subheading: text('subheading'),
  summary: text('summary').notNull(),
  contentSnippet: text('content_snippet'),
  fullTextPermitted: boolean('full_text_permitted').notNull().default(false),
  imageUrl: text('image_url'),
  imageAttribution: text('image_attribution'),
  author: text('author'),
  sourceId: integer('source_id').references(() => newsSources.id),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url').notNull(),
  categorySlug: text('category_slug').notNull().default('world'),
  countryCode: text('country_code').notNull().default('GLOBAL'),
  regionName: text('region_name').notNull().default('Global'),
  language: text('language').notNull().default('en'),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  ingestedAt: timestamp('ingested_at').defaultNow(),
  importanceScore: integer('importance_score').notNull().default(65),
  isBreaking: boolean('is_breaking').notNull().default(false),
  isLeadCandidate: boolean('is_lead_candidate').notNull().default(false),
  whyItMatters: text('why_it_matters').notNull().default(''),
  selectionReason: text('selection_reason').notNull().default(''),
  duplicateOfId: integer('duplicate_of_id'),
  eventId: integer('event_id').references(() => events.id),
  processingStatus: text('processing_status').notNull().default('processed'), // 'pending' | 'processed' | 'ai_enriched' | 'failed'
  correctionNotice: text('correction_notice'),
});

export const aiSummaries = pgTable('ai_summaries', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id)
    .notNull()
    .unique(),
  oneLineHeadline: text('one_line_headline').notNull(),
  briefing30s: text('briefing_30s').notNull(),
  shortBulletin: text('short_bulletin').notNull(),
  detailedSummary: text('detailed_summary').notNull(),
  whatHappened: text('what_happened').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  whatWeKnow: jsonb('what_we_know').$type<string[]>().notNull().default([]),
  whatRemainsUncertain: jsonb('what_remains_uncertain')
    .$type<string[]>()
    .notNull()
    .default([]),
  whatToWatchNext: text('what_to_watch_next').notNull(),
  keyFacts: jsonb('key_facts').$type<string[]>().notNull().default([]),
  entities: jsonb('entities')
    .$type<{ countries: string[]; organizations: string[]; topics: string[] }>()
    .notNull()
    .default({ countries: [], organizations: [], topics: [] }),
  cautiousDomainWarning: text('cautious_domain_warning'),
  modelName: text('model_name').notNull().default('gemini-3.8-flash'),
  generatedAt: timestamp('generated_at').defaultNow(),
  reviewedByAdmin: boolean('reviewed_by_admin').notNull().default(false),
});

export const briefings = pgTable('briefings', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // 'morning' | 'evening' | 'last24h' | 'weekly' | 'country' | 'topic' | 'explainer'
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  scopeFilter: text('scope_filter').notNull().default('global'),
  coveragePeriod: text('coverage_period').notNull(),
  leadSynthesis: text('lead_synthesis').notNull(),
  items: jsonb('items')
    .$type<
      Array<{
        eventTitle: string;
        whatHappened: string;
        whyItMatters: string;
        latestDevelopment: string;
        sources: Array<{ name: string; url: string }>;
      }>
    >()
    .notNull()
    .default([]),
  backgroundContext: text('background_context').notNull().default(''),
  uncertaintyNotes: text('uncertainty_notes').notNull().default(''),
  modelName: text('model_name').notNull().default('gemini-3.8-flash'),
  generatedAt: timestamp('generated_at').defaultNow(),
});

export const upcomingEvents = pgTable('upcoming_events', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  timezone: text('timezone').notNull().default('UTC'),
  isTentativeDate: boolean('is_tentative_date').notNull().default(false),
  location: text('location').notNull(),
  countryCode: text('country_code').notNull().default('GLOBAL'),
  category: text('category').notNull(),
  officialSourceName: text('official_source_name').notNull(),
  officialSourceUrl: text('official_source_url').notNull(),
  importance: text('importance').notNull().default('high'), // 'critical' | 'high' | 'moderate'
  status: text('status').notNull().default('scheduled'), // 'scheduled' | 'tentative' | 'in_progress' | 'completed'
  relatedEventId: integer('related_event_id').references(() => events.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rankingConfig = pgTable('ranking_config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique().default('default'),
  sourceReliabilityWeight: integer('source_reliability_weight').notNull().default(25),
  severityImpactWeight: integer('severity_impact_weight').notNull().default(20),
  globalSignificanceWeight: integer('global_significance_weight').notNull().default(20),
  independentCorroborationWeight: integer('independent_corroboration_weight').notNull().default(15),
  recencyWeight: integer('recency_weight').notNull().default(10),
  noveltyWeight: integer('novelty_weight').notNull().default(5),
  geographicReachWeight: integer('geographic_reach_weight').notNull().default(5),
  breakingThresholdScore: integer('breaking_threshold_score').notNull().default(84),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  articleId: integer('article_id')
    .references(() => articles.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull().unique(),
  followedCountries: jsonb('followed_countries').$type<string[]>().notNull().default(['IN', 'US', 'GLOBAL']),
  followedCategories: jsonb('followed_categories')
    .$type<string[]>()
    .notNull()
    .default(['world', 'technology', 'business', 'science']),
  preferredLanguage: text('preferred_language').notNull().default('en'),
  breakingAlertsEnabled: boolean('breaking_alerts_enabled').notNull().default(true),
  importanceThreshold: integer('importance_threshold').notNull().default(75),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ingestionLogs = pgTable('ingestion_logs', {
  id: serial('id').primaryKey(),
  jobType: text('job_type').notNull(),
  providerSlug: text('provider_slug').notNull(),
  status: text('status').notNull(), // 'running' | 'completed' | 'failed' | 'skipped'
  articlesFetched: integer('articles_fetched').notNull().default(0),
  articlesInserted: integer('articles_inserted').notNull().default(0),
  duplicatesSkipped: integer('duplicates_skipped').notNull().default(0),
  eventsUpdated: integer('events_updated').notNull().default(0),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms').notNull().default(0),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const editorialCorrections = pgTable('editorial_corrections', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id)
    .notNull(),
  correctionText: text('correction_text').notNull(),
  correctedByEmail: text('corrected_by_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorEmail: text('actor_email').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const articlesRelations = relations(articles, ({ one }) => ({
  source: one(newsSources, {
    fields: [articles.sourceId],
    references: [newsSources.id],
  }),
  event: one(events, {
    fields: [articles.eventId],
    references: [events.id],
  }),
  aiSummary: one(aiSummaries, {
    fields: [articles.id],
    references: [aiSummaries.articleId],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  articles: many(articles),
  timelineUpdates: many(eventTimelineUpdates),
}));
