export interface AiSummaryRecord {
  id: number;
  articleId: number;
  oneLineHeadline: string;
  briefing30s: string;
  shortBulletin: string;
  detailedSummary: string;
  whatHappened: string;
  whyItMatters: string;
  whatWeKnow: string[];
  whatRemainsUncertain: string[];
  whatToWatchNext: string;
  keyFacts: string[];
  entities: {
    countries: string[];
    organizations: string[];
    topics: string[];
  };
  cautiousDomainWarning: string | null;
  modelName: string;
  generatedAt: string;
  reviewedByAdmin: boolean;
}

export interface DevelopingEventItem {
  id: number;
  slug: string;
  title: string;
  overview: string;
  status: 'developing' | 'ongoing' | 'monitoring' | 'concluded';
  isBreaking: boolean;
  importanceScore: number;
  categorySlug: string;
  countryCode: string;
  regionName: string;
  keyFacts: string[];
  knownFacts: string[];
  unconfirmedClaims: string[];
  entities: {
    people: string[];
    organizations: string[];
    locations: string[];
  };
  backgroundContext: string;
  whatToWatch: string;
  sourceCount: number;
  adminOverride: boolean;
  lastVerifiedAt: string;
  updatedAt: string;
  createdAt: string;
  relatedArticles?: ArticleItem[];
}

export interface EventTimelineUpdate {
  id: number;
  eventId: number;
  timestamp: string;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  isVerified: boolean;
}

export interface ArticleItem {
  id: number;
  slug: string;
  canonicalUrl: string;
  title: string;
  originalTitle: string;
  subheading: string | null;
  summary: string;
  contentSnippet: string | null;
  fullTextPermitted: boolean;
  imageUrl: string | null;
  imageAttribution: string | null;
  author: string | null;
  sourceId: number | null;
  sourceName: string;
  sourceUrl: string;
  categorySlug: string;
  countryCode: string;
  regionName: string;
  language: string;
  publishedAt: string;
  updatedAt: string;
  ingestedAt: string;
  importanceScore: number;
  isBreaking: boolean;
  isLeadCandidate: boolean;
  whyItMatters: string;
  selectionReason: string;
  eventId: number | null;
  processingStatus: string;
  correctionNotice: string | null;
  aiSummary?: AiSummaryRecord | null;
  event?: DevelopingEventItem | null;
}

export interface BriefingRecord {
  id: number;
  slug: string;
  type: 'morning' | 'evening' | 'last24h' | 'weekly' | 'country' | 'topic' | 'explainer';
  title: string;
  subtitle: string;
  scopeFilter: string;
  coveragePeriod: string;
  leadSynthesis: string;
  items: Array<{
    eventTitle: string;
    whatHappened: string;
    whyItMatters: string;
    latestDevelopment: string;
    sources: Array<{ name: string; url: string }>;
  }>;
  backgroundContext: string;
  uncertaintyNotes: string;
  modelName: string;
  generatedAt: string;
}

export interface UpcomingCalendarEvent {
  id: number;
  slug: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  timezone: string;
  isTentativeDate: boolean;
  location: string;
  countryCode: string;
  category: string;
  officialSourceName: string;
  officialSourceUrl: string;
  importance: 'critical' | 'high' | 'moderate';
  status: 'scheduled' | 'tentative' | 'in_progress' | 'completed';
  relatedEventId: number | null;
}

export interface HomepagePayload {
  leadStory: ArticleItem | null;
  breakingNews: ArticleItem[];
  topHeadlines: ArticleItem[];
  top10Today: ArticleItem[];
  latestFeed: ArticleItem[];
  developingEvents: DevelopingEventItem[];
  briefings: BriefingRecord[];
  upcomingEvents: UpcomingCalendarEvent[];
  sources: Array<{
    id: number;
    slug: string;
    name: string;
    countryCode: string;
    reliabilityScore: number;
    lastStatus: string;
  }>;
  lastUpdated: string;
}
