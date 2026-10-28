import crypto from 'crypto';

export interface RankingWeights {
  sourceReliabilityWeight: number;
  severityImpactWeight: number;
  globalSignificanceWeight: number;
  independentCorroborationWeight: number;
  recencyWeight: number;
  noveltyWeight: number;
  geographicReachWeight: number;
  breakingThresholdScore: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  sourceReliabilityWeight: 25,
  severityImpactWeight: 20,
  globalSignificanceWeight: 20,
  independentCorroborationWeight: 15,
  recencyWeight: 10,
  noveltyWeight: 5,
  geographicReachWeight: 5,
  breakingThresholdScore: 84,
};

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'rss',
  'at_medium',
  'at_campaign',
]);

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'from', 'this', 'have', 'has', 'had',
  'are', 'was', 'were', 'will', 'would', 'could', 'should', 'into', 'over',
  'after', 'before', 'under', 'amid', 'says', 'said', 'new', 'more', 'amidst',
  'about', 'against', 'between', 'during', 'without', 'within', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'whose', 'why', 'how', 'their',
  'there', 'these', 'those', 'they', 'them', 'then', 'than', 'also', 'been',
]);

/**
 * Validates that an external URL is safe to fetch or link (SSRF & XSS protection).
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by removing tracking query params, fragments, and trailing slashes.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const k of keysToDelete) {
      parsed.searchParams.delete(k);
    }
    parsed.searchParams.sort();
    let result = parsed.toString();
    if (result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return rawUrl.trim();
  }
}

export function computeUrlHash(canonicalUrl: string): string {
  return crypto.createHash('sha256').update(normalizeUrl(canonicalUrl)).digest('hex');
}

export function createSlug(title: string, uniqueSuffix?: string): string {
  const base = title
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  if (uniqueSuffix) {
    return `${base}-${uniqueSuffix}`;
  }
  const shortHash = crypto.createHash('md5').update(title).digest('hex').slice(0, 6);
  return `${base || 'dispatch'}-${shortHash}`;
}

/**
 * Sanitizes untrusted external feed text to prevent XSS and prompt injection.
 */
export function sanitizeUntrustedText(raw: string | undefined | null, maxLength = 1200): string {
  if (!raw) return '';
  const withoutCdata = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  const withoutTags = withoutCdata
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '—');

  // Neutralize prompt-injection attempts embedded in untrusted articles
  const deInjected = decoded.replace(
    /\b(ignore previous instructions|system prompt|you are now|disregard all prior)\b/gi,
    '[redacted]'
  );

  const collapsed = deInjected.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) return collapsed;
  return collapsed.slice(0, maxLength).trim() + '…';
}

export function extractSignificantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/**
 * Calculates similarity (0.0 to 1.0) between two headlines/texts for near-duplicate
 * detection and event clustering.
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const tokensA = extractSignificantTokens(titleA);
  const tokensB = extractSignificantTokens(titleB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  india: ['india', 'new delhi', 'mumbai', 'bengaluru', 'lok sabha', 'rajya sabha', 'rbi', 'isro', 'rupee', 'indian', 'modi', 'sensex', 'nifty'],
  elections: ['election', 'ballot', 'voter', 'polling', 'referendum', 'parliamentary vote', 'electoral', 'runoff', 'coalition talks'],
  conflicts: ['ceasefire', 'airstrike', 'military', 'missile', 'troops', 'armed conflict', 'frontline', 'artillery', 'defense ministry', 'nato', 'insurgent', 'security council'],
  diplomacy: ['summit', 'treaty', 'bilateral', 'ambassador', 'foreign minister', 'sanctions', 'united nations', 'diplomatic', 'g7', 'g20', 'brics', 'asean'],
  markets: ['stock market', 'wall street', 'treasury yield', 'bond market', 'central bank', 'interest rate', 'fed ', 'ecb', 'nikkei', 'ftse', 'equities', 'nasdaq', 'currency'],
  business: ['economy', 'gdp', 'inflation', 'trade deficit', 'supply chain', 'tariff', 'manufacturing', 'imf', 'world bank', 'export', 'corporate', 'semiconductor'],
  technology: ['artificial intelligence', 'ai model', 'cybersecurity', 'quantum computing', 'microchip', 'GPU', 'data center', 'open source', 'robotics', 'cloud computing', 'software'],
  space: ['nasa', 'esa', 'isro', 'spacex', 'orbital', 'astronaut', 'lunar', 'mars', 'telescope', 'satellite', 'spacecraft', 'rocket launch', 'astrophysics'],
  science: ['researchers', 'peer-reviewed', 'genome', 'physics', 'archaeology', 'particle', 'laboratory', 'clinical study', 'biology', 'chemistry', 'fusion'],
  health: ['who ', 'world health', 'vaccine', 'outbreak', 'epidemic', 'pathogen', 'clinical trial', 'hospital', 'public health', 'fda', 'disease', 'medical'],
  climate: ['climate', 'emissions', 'carbon', 'glacier', 'deforestation', 'biodiversity', 'cop30', 'cop31', 'global warming', 'methane', 'sea level', 'drought'],
  energy: ['solar power', 'wind farm', 'nuclear reactor', 'hydrogen', 'lng', 'opec', 'crude oil', 'power grid', 'battery storage', 'renewable energy'],
  disasters: ['earthquake', 'tsunami', 'cyclone', 'typhoon', 'hurricane', 'wildfire', 'flooding', 'evacuation', 'volcano', 'magnitude', 'landslide'],
  sports: [
    'sport', 'sports', 'world cup', 'olympic', 'test match', 'premier league', 'champions league',
    'grand slam', 'cricket', 'tournament', 'fifa', 'uefa', 'icc', 'bcci', 'ipl', 't20', 'odi',
    'athletics', 'football', 'soccer', 'tennis', 'formula 1', 'f1', 'grand prix', 'rugby',
    'golf', 'badminton', 'nba', 'nfl', 'medal', 'championship', 'stadium', 'coach', 'striker',
    'wicket', 'innings', 'league'
  ],
  education: ['university', 'curriculum', 'higher education', 'scholarship', 'literacy', 'student', 'academic'],
  society: ['museum', 'heritage', 'census', 'demographic', 'cultural', 'architecture', 'literature'],
  politics: ['parliament', 'legislation', 'supreme court', 'cabinet', 'constitution', 'senate', 'prime minister', 'president', 'policy'],
};

const COUNTRY_KEYWORDS: Array<{ code: string; name: string; keywords: string[] }> = [
  { code: 'IN', name: 'India', keywords: ['india', 'indian', 'new delhi', 'mumbai', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'rbi', 'isro'] },
  { code: 'US', name: 'United States', keywords: ['united states', 'u.s.', 'washington', 'pentagon', 'white house', 'federal reserve', 'congress', 'american'] },
  { code: 'GB', name: 'United Kingdom', keywords: ['united kingdom', 'britain', 'british', 'london', 'westminster', 'bank of england', 'uk '] },
  { code: 'EU', name: 'European Union', keywords: ['european union', 'brussels', 'european commission', 'eurozone', 'ecb', 'strasbourg', 'france', 'germany', 'berlin', 'paris'] },
  { code: 'CN', name: 'China', keywords: ['china', 'chinese', 'beijing', 'shanghai', 'shenzhen', 'pboc'] },
  { code: 'RU', name: 'Russia', keywords: ['russia', 'russian', 'moscow', 'kremlin'] },
  { code: 'ME', name: 'Middle East', keywords: ['middle east', 'gaza', 'israel', 'lebanon', 'iran', 'saudi', 'riyadh', 'tehran', 'cairo', 'red sea', 'qatar', 'uae'] },
  { code: 'AF', name: 'Africa', keywords: ['africa', 'african union', 'nigeria', 'kenya', 'south africa', 'ethiopia', 'sudan', 'sahel', 'nairobi', 'lagos'] },
  { code: 'SA', name: 'South Asia', keywords: ['south asia', 'bangladesh', 'sri lanka', 'nepal', 'pakistan', 'dhaka', 'colombo'] },
  { code: 'EA', name: 'East Asia & Pacific', keywords: ['japan', 'tokyo', 'south korea', 'seoul', 'taiwan', 'taipei', 'philippines', 'indonesia', 'australia', 'asean'] },
  { code: 'LA', name: 'Latin America', keywords: ['latin america', 'brazil', 'mexico', 'argentina', 'colombia', 'chile', 'amazon'] },
];

export function classifyArticleTaxonomy(
  title: string,
  summary: string,
  defaultCategory = 'world',
  defaultCountry = 'GLOBAL'
): {
  categorySlug: string;
  countryCode: string;
  regionName: string;
  entities: { people: string[]; organizations: string[]; locations: string[] };
} {
  const combined = `${title} ${summary}`.toLowerCase();

  let matchedCategory = defaultCategory;
  let bestCatScore = 0;

  // Dedicated sports feeds should retain 'sports' category even if country/city names appear
  if (defaultCategory !== 'sports') {
    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const w of words) {
        if (combined.includes(w)) {
          score += title.toLowerCase().includes(w) ? 3 : 1;
        }
      }
      if (score > bestCatScore) {
        bestCatScore = score;
        matchedCategory = cat;
      }
    }
  }

  let matchedCountry = defaultCountry;
  let matchedRegion = defaultCountry === 'IN' ? 'India' : 'Global';
  let bestCountryScore = 0;

  for (const entry of COUNTRY_KEYWORDS) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (combined.includes(kw)) {
        score += title.toLowerCase().includes(kw) ? 3 : 1;
      }
    }
    if (score > bestCountryScore) {
      bestCountryScore = score;
      matchedCountry = entry.code;
      matchedRegion = entry.name;
    }
  }

  const orgMatches = [
    'United Nations', 'WHO', 'IMF', 'World Bank', 'NATO', 'European Commission',
    'Reserve Bank of India', 'ISRO', 'NASA', 'ESA', 'Federal Reserve', 'ECB',
    'ASEAN', 'G20', 'BRICS', 'African Union', 'IAEA', 'WTO', 'OPEC'
  ].filter((org) => combined.includes(org.toLowerCase()));

  const locMatches = COUNTRY_KEYWORDS.filter((c) =>
    c.keywords.some((kw) => combined.includes(kw))
  ).map((c) => c.name);

  return {
    categorySlug: matchedCategory,
    countryCode: matchedCountry,
    regionName: matchedRegion,
    entities: {
      people: [],
      organizations: orgMatches.slice(0, 5),
      locations: locMatches.length > 0 ? locMatches.slice(0, 4) : [matchedRegion],
    },
  };
}

const HIGH_SEVERITY_TERMS = [
  'emergency', 'ceasefire', 'treaty', 'summit', 'central bank', 'interest rate',
  'earthquake', 'cyclone', 'outbreak', 'breakthrough', 'satellite', 'launch',
  'election', 'parliament', 'supreme court', 'sanctions', 'humanitarian',
  'inflation', 'gdp', 'quantum', 'semiconductor', 'climate', 'security council'
];

export function calculateImportanceScore(
  params: {
    title: string;
    summary: string;
    sourceReliability: number; // 0-100
    corroboratingSourcesCount: number; // 1+
    publishedAt: Date;
    categorySlug: string;
    countryCode: string;
    isBreakingPrioritySource?: boolean;
  },
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): {
  importanceScore: number;
  isBreaking: boolean;
  selectionReason: string;
  whyItMatters: string;
} {
  const combined = `${params.title} ${params.summary}`.toLowerCase();

  // 1. Source Reliability (0-100 normalized)
  const reliabilityComponent = Math.min(100, Math.max(40, params.sourceReliability));

  // 2. Severity & Public Impact
  let severityHits = 0;
  for (const term of HIGH_SEVERITY_TERMS) {
    if (combined.includes(term)) severityHits++;
  }
  const severityComponent = Math.min(100, 55 + severityHits * 14);

  // 3. Global or Regional Significance
  const highSigCategories = new Set(['world', 'india', 'conflicts', 'diplomacy', 'business', 'markets', 'climate', 'technology', 'science', 'space', 'health', 'disasters']);
  const globalComponent = highSigCategories.has(params.categorySlug) ? 85 : 68;

  // 4. Independent Corroboration (distinct publishers, capped at 5)
  const corroborationComponent = Math.min(100, 50 + (Math.min(5, Math.max(1, params.corroboratingSourcesCount)) - 1) * 15);

  // 5. Recency of development
  const ageHours = Math.max(0, (Date.now() - params.publishedAt.getTime()) / (1000 * 60 * 60));
  const recencyComponent = ageHours <= 3 ? 98 : ageHours <= 12 ? 88 : ageHours <= 24 ? 76 : ageHours <= 48 ? 64 : 50;

  // 6. Novelty & Geographic reach
  const noveltyComponent = severityHits > 0 ? 84 : 68;
  const geoComponent = params.countryCode === 'GLOBAL' ? 90 : 80;

  const totalWeight =
    weights.sourceReliabilityWeight +
    weights.severityImpactWeight +
    weights.globalSignificanceWeight +
    weights.independentCorroborationWeight +
    weights.recencyWeight +
    weights.noveltyWeight +
    weights.geographicReachWeight || 100;

  const weightedRaw =
    (reliabilityComponent * weights.sourceReliabilityWeight +
      severityComponent * weights.severityImpactWeight +
      globalComponent * weights.globalSignificanceWeight +
      corroborationComponent * weights.independentCorroborationWeight +
      recencyComponent * weights.recencyWeight +
      noveltyComponent * weights.noveltyWeight +
      geoComponent * weights.geographicReachWeight) /
    totalWeight;

  const finalScore = Math.round(Math.min(98, Math.max(45, weightedRaw)));
  const isBreaking =
    finalScore >= weights.breakingThresholdScore &&
    ageHours <= 18 &&
    (Boolean(params.isBreakingPrioritySource) || severityHits >= 2 || params.corroboratingSourcesCount >= 2);

  const reasons: string[] = [];
  if (params.sourceReliability >= 90) reasons.push('high-reliability primary reporting');
  if (params.corroboratingSourcesCount >= 2) {
    reasons.push(`corroborated across ${params.corroboratingSourcesCount} independent sources`);
  }
  if (severityHits >= 1) reasons.push('significant policy or public impact');
  if (ageHours <= 6) reasons.push('recent verified development');

  const selectionReason =
    reasons.length > 0
      ? `Selected for ${reasons.join(', ')} (Score ${finalScore}/100).`
      : `Ranked by editorial significance and source reliability (Score ${finalScore}/100).`;

  const whyItMattersMap: Record<string, string> = {
    india: 'Directly shapes national policy, economic trajectory, or public governance across India and South Asia.',
    business: 'Affects global supply chains, macroeconomic stability, and cross-border trade conditions.',
    markets: 'Influences monetary policy expectations, sovereign borrowing costs, and global capital allocation.',
    technology: 'Shifts the trajectory of computing infrastructure, AI safety governance, or international technology standards.',
    science: 'Advances peer-reviewed scientific understanding with long-term implications for research and industry.',
    space: 'Marks an operational milestone in orbital infrastructure and international space exploration.',
    health: 'Carries measurable implications for epidemiological preparedness, clinical standards, and public health systems.',
    climate: 'Impacts international decarbonization targets, climate resilience, and environmental ecosystems.',
    conflicts: 'Alters regional security architecture, humanitarian access, and international peacekeeping efforts.',
    diplomacy: 'Shapes multilateral treaty obligations, bilateral alliances, and geopolitical stability.',
    elections: 'Determines democratic mandate, legislative composition, and future executive policy direction.',
    disasters: 'Requires immediate civil response, infrastructure assessment, and humanitarian coordination.',
    sports: 'Tracks major international tournaments, athletic governance, and competitive milestones across global sports.',
  };

  const whyItMatters =
    whyItMattersMap[params.categorySlug] ||
    'Carries cross-border significance for international policy, institutional governance, and public awareness.';

  return {
    importanceScore: finalScore,
    isBreaking,
    selectionReason,
    whyItMatters,
  };
}
