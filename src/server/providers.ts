import {
  isSafeExternalUrl,
  normalizeUrl,
  sanitizeUntrustedText,
} from './normalizer.ts';

export interface SourceDescriptor {
  id?: number;
  slug: string;
  name: string;
  providerType: 'rss' | 'gdelt' | 'newsapi' | 'official';
  endpointUrl: string;
  websiteUrl: string;
  countryCode: string;
  regionName: string;
  defaultCategory: string;
  reliabilityScore: number;
  isBreakingPriority: boolean;
  allowsFullText: boolean;
  enabled: boolean;
  requiresApiKeyEnv?: string | null;
}

export interface NormalizedRawArticle {
  canonicalUrl: string;
  title: string;
  summary: string;
  contentSnippet?: string;
  imageUrl?: string | null;
  imageAttribution?: string | null;
  author?: string | null;
  publishedAt: Date;
  sourceSlug: string;
  sourceName: string;
  sourceUrl: string;
  defaultCategory: string;
  defaultCountryCode: string;
  reliabilityScore: number;
  isBreakingPriority: boolean;
  allowsFullText: boolean;
}

export interface ProviderFetchResult {
  sourceSlug: string;
  status: 'ok' | 'error' | 'missing_key';
  articles: NormalizedRawArticle[];
  errorMessage?: string;
}

export interface NewsProviderAdapter {
  fetchArticles(source: SourceDescriptor): Promise<ProviderFetchResult>;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeoutMs = 9000
): Promise<Response> {
  if (!isSafeExternalUrl(url)) {
    throw new Error(`Blocked unsafe external URL: ${url}`);
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'WorldWireNewsPlatform/1.0 (+https://worldwire.org)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);
      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
        continue;
      }
      return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError || new Error('Network request failed after retries.');
}

function extractTagValue(block: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
}

function extractAttributeValue(block: string, tagPattern: string, attrName: string): string {
  const regex = new RegExp(`<${tagPattern}[^>]*\\s${attrName}=["']([^"']+)["'][^>]*>`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

export function parseXmlFeed(xml: string, source: SourceDescriptor): NormalizedRawArticle[] {
  const items: NormalizedRawArticle[] = [];
  const itemBlocks =
    xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ||
    xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ||
    [];

  for (const block of itemBlocks.slice(0, 22)) {
    const rawTitle = extractTagValue(block, 'title');
    const title = sanitizeUntrustedText(rawTitle, 240);
    if (!title || title.length < 10) continue;

    let rawLink = extractTagValue(block, 'link');
    if (!rawLink) {
      rawLink = extractAttributeValue(block, 'link', 'href');
    }
    const canonicalUrl = normalizeUrl(rawLink);
    if (!canonicalUrl || !isSafeExternalUrl(canonicalUrl)) continue;

    const rawDesc =
      extractTagValue(block, 'description') ||
      extractTagValue(block, 'summary') ||
      extractTagValue(block, 'content:encoded') ||
      extractTagValue(block, 'content');
    const summary = sanitizeUntrustedText(rawDesc, 450) || title;

    const rawDate =
      extractTagValue(block, 'pubDate') ||
      extractTagValue(block, 'published') ||
      extractTagValue(block, 'updated') ||
      extractTagValue(block, 'dc:date');
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const publishedAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const rawAuthor =
      extractTagValue(block, 'dc:creator') ||
      extractTagValue(block, 'author') ||
      '';
    const author = sanitizeUntrustedText(rawAuthor, 100) || null;

    let imageUrl =
      extractAttributeValue(block, 'media:thumbnail', 'url') ||
      extractAttributeValue(block, 'media:content', 'url') ||
      extractAttributeValue(block, 'enclosure', 'url') ||
      null;
    if (imageUrl && !isSafeExternalUrl(imageUrl)) {
      imageUrl = null;
    }

    items.push({
      canonicalUrl,
      title,
      summary,
      contentSnippet: sanitizeUntrustedText(rawDesc, 950) || summary,
      imageUrl,
      imageAttribution: imageUrl ? `Photograph via ${source.name}` : null,
      author,
      publishedAt,
      sourceSlug: source.slug,
      sourceName: source.name,
      sourceUrl: source.websiteUrl,
      defaultCategory: source.defaultCategory,
      defaultCountryCode: source.countryCode,
      reliabilityScore: source.reliabilityScore,
      isBreakingPriority: source.isBreakingPriority,
      allowsFullText: source.allowsFullText,
    });
  }

  return items;
}

export class RssProviderAdapter implements NewsProviderAdapter {
  async fetchArticles(source: SourceDescriptor): Promise<ProviderFetchResult> {
    try {
      const response = await fetchWithRetry(source.endpointUrl);
      if (!response.ok) {
        return {
          sourceSlug: source.slug,
          status: 'error',
          articles: [],
          errorMessage: `HTTP ${response.status} from ${source.name}`,
        };
      }
      const xmlText = await response.text();
      const articles = parseXmlFeed(xmlText, source);
      return {
        sourceSlug: source.slug,
        status: 'ok',
        articles,
      };
    } catch (error: any) {
      return {
        sourceSlug: source.slug,
        status: 'error',
        articles: [],
        errorMessage: error?.message || 'RSS fetch failed',
      };
    }
  }
}

function parseGdeltDate(seendate: string | undefined): Date {
  if (!seendate) return new Date();
  // Format: YYYYMMDDTHHMMSSZ
  const m = seendate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (m) {
    return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  }
  const d = new Date(seendate);
  return isNaN(d.getTime()) ? new Date() : d;
}

export class GdeltProviderAdapter implements NewsProviderAdapter {
  async fetchArticles(source: SourceDescriptor): Promise<ProviderFetchResult> {
    try {
      const baseUrl =
        process.env.GDELT_API_BASE_URL && isSafeExternalUrl(process.env.GDELT_API_BASE_URL)
          ? process.env.GDELT_API_BASE_URL
          : source.endpointUrl;

      const url = baseUrl.includes('?')
        ? baseUrl
        : `${baseUrl}?query=(world OR economy OR science OR climate OR india) sourcelang:eng&mode=artlist&maxrecords=20&format=json&sort=DateDesc`;

      const response = await fetchWithRetry(url);
      if (!response.ok) {
        return {
          sourceSlug: source.slug,
          status: 'error',
          articles: [],
          errorMessage: `GDELT HTTP ${response.status}`,
        };
      }
      const data = await response.json();
      const rawList = Array.isArray(data?.articles) ? data.articles : [];
      const articles: NormalizedRawArticle[] = [];

      for (const item of rawList.slice(0, 18)) {
        const title = sanitizeUntrustedText(item.title, 240);
        const canonicalUrl = item.url ? normalizeUrl(item.url) : '';
        if (!title || title.length < 15 || !canonicalUrl || !isSafeExternalUrl(canonicalUrl)) {
          continue;
        }
        const domain = sanitizeUntrustedText(item.domain, 80) || 'GDELT Wire';
        const imageUrl =
          item.socialimage && isSafeExternalUrl(item.socialimage) ? item.socialimage : null;

        articles.push({
          canonicalUrl,
          title,
          summary: `International dispatch monitored via GDELT Global Knowledge Graph from ${domain}.`,
          contentSnippet: `Global event monitoring report published by ${domain}. Follow the source link for full original coverage.`,
          imageUrl,
          imageAttribution: imageUrl ? `Image via ${domain}` : null,
          author: domain,
          publishedAt: parseGdeltDate(item.seendate),
          sourceSlug: source.slug,
          sourceName: `${domain} (via GDELT)`,
          sourceUrl: `https://${domain}`,
          defaultCategory: source.defaultCategory,
          defaultCountryCode: source.countryCode,
          reliabilityScore: source.reliabilityScore,
          isBreakingPriority: source.isBreakingPriority,
          allowsFullText: false,
        });
      }

      return {
        sourceSlug: source.slug,
        status: 'ok',
        articles,
      };
    } catch (error: any) {
      return {
        sourceSlug: source.slug,
        status: 'error',
        articles: [],
        errorMessage: error?.message || 'GDELT fetch failed',
      };
    }
  }
}

export class NewsApiProviderAdapter implements NewsProviderAdapter {
  async fetchArticles(source: SourceDescriptor): Promise<ProviderFetchResult> {
    const apiKey = process.env.NEWS_API_KEY?.trim();
    if (!apiKey || apiKey === 'YOUR_NEWSAPI_ORG_KEY' || apiKey === 'MY_NEWS_API_KEY') {
      return {
        sourceSlug: source.slug,
        status: 'missing_key',
        articles: [],
        errorMessage: 'Awaiting NEWS_API_KEY in environment secrets.',
      };
    }

    try {
      const url = `${source.endpointUrl}?language=en&pageSize=20`;
      const response = await fetchWithRetry(url, {
        headers: {
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) {
        return {
          sourceSlug: source.slug,
          status: 'error',
          articles: [],
          errorMessage: `NewsAPI HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const rawList = Array.isArray(data?.articles) ? data.articles : [];
      const articles: NormalizedRawArticle[] = [];

      for (const item of rawList) {
        const title = sanitizeUntrustedText(item.title, 240);
        if (!title || title === '[Removed]') continue;
        const canonicalUrl = item.url ? normalizeUrl(item.url) : '';
        if (!canonicalUrl || !isSafeExternalUrl(canonicalUrl)) continue;

        const summary =
          sanitizeUntrustedText(item.description, 450) ||
          sanitizeUntrustedText(item.content, 450) ||
          title;
        const pubName = sanitizeUntrustedText(item.source?.name, 80) || source.name;
        const imageUrl =
          item.urlToImage && isSafeExternalUrl(item.urlToImage) ? item.urlToImage : null;

        articles.push({
          canonicalUrl,
          title,
          summary,
          contentSnippet: sanitizeUntrustedText(item.content, 900) || summary,
          imageUrl,
          imageAttribution: imageUrl ? `Photograph via ${pubName}` : null,
          author: sanitizeUntrustedText(item.author, 100) || null,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          sourceSlug: source.slug,
          sourceName: pubName,
          sourceUrl: source.websiteUrl,
          defaultCategory: source.defaultCategory,
          defaultCountryCode: source.countryCode,
          reliabilityScore: source.reliabilityScore,
          isBreakingPriority: source.isBreakingPriority,
          allowsFullText: false,
        });
      }

      return {
        sourceSlug: source.slug,
        status: 'ok',
        articles,
      };
    } catch (error: any) {
      return {
        sourceSlug: source.slug,
        status: 'error',
        articles: [],
        errorMessage: error?.message || 'NewsAPI request failed',
      };
    }
  }
}

const rssAdapter = new RssProviderAdapter();
const gdeltAdapter = new GdeltProviderAdapter();
const newsApiAdapter = new NewsApiProviderAdapter();

export function getAdapterForProvider(providerType: string): NewsProviderAdapter {
  switch (providerType) {
    case 'gdelt':
      return gdeltAdapter;
    case 'newsapi':
      return newsApiAdapter;
    case 'rss':
    case 'official':
    default:
      return rssAdapter;
  }
}
