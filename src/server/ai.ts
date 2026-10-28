import { GoogleGenAI, Type } from '@google/genai';
import { getCategoryBySlug } from '../config/site.ts';
import { sanitizeUntrustedText } from './normalizer.ts';

export interface StructuredAiBulletin {
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
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function validateAiBulletinOutput(
  raw: any,
  fallbackInput: {
    title: string;
    summary: string;
    sourceName: string;
    categorySlug: string;
    whyItMatters: string;
  }
): StructuredAiBulletin {
  const cat = getCategoryBySlug(fallbackInput.categorySlug);
  const defaultWarning = cat.isCautiousDomain ? cat.cautiousNotice || null : null;

  const safeString = (val: unknown, fallback: string) =>
    typeof val === 'string' && val.trim().length > 5 ? val.trim() : fallback;

  const safeStringArray = (val: unknown, fallback: string[]) =>
    Array.isArray(val) && val.every((x) => typeof x === 'string') && val.length > 0
      ? val.map((x) => x.trim()).filter(Boolean)
      : fallback;

  return {
    oneLineHeadline: safeString(raw?.oneLineHeadline, fallbackInput.title),
    briefing30s: safeString(
      raw?.briefing30s,
      `${fallbackInput.title}. Reported by ${fallbackInput.sourceName}: ${fallbackInput.summary}`
    ),
    shortBulletin: safeString(raw?.shortBulletin, fallbackInput.summary),
    detailedSummary: safeString(
      raw?.detailedSummary,
      `${fallbackInput.summary} ${fallbackInput.whyItMatters}`
    ),
    whatHappened: safeString(raw?.whatHappened, fallbackInput.summary),
    whyItMatters: safeString(raw?.whyItMatters, fallbackInput.whyItMatters),
    whatWeKnow: safeStringArray(raw?.whatWeKnow, [
      `Primary dispatch published by ${fallbackInput.sourceName}.`,
      fallbackInput.summary,
    ]),
    whatRemainsUncertain: safeStringArray(raw?.whatRemainsUncertain, [
      'Further independent corroboration and official technical appendices remain pending.',
    ]),
    whatToWatchNext: safeString(
      raw?.whatToWatchNext,
      'Monitor subsequent official institutional briefings and multi-source follow-up dispatches.'
    ),
    keyFacts: safeStringArray(raw?.keyFacts, [
      `Source: ${fallbackInput.sourceName}`,
      fallbackInput.summary,
    ]),
    entities: {
      countries: safeStringArray(raw?.entities?.countries, ['Global']),
      organizations: safeStringArray(raw?.entities?.organizations, [fallbackInput.sourceName]),
      topics: safeStringArray(raw?.entities?.topics, [cat.name]),
    },
    cautiousDomainWarning:
      typeof raw?.cautiousDomainWarning === 'string' && raw.cautiousDomainWarning.trim()
        ? raw.cautiousDomainWarning.trim()
        : defaultWarning,
    modelName: typeof raw?.modelName === 'string' ? raw.modelName : 'gemini-3.8-flash',
  };
}

export async function generateArticleAiBulletin(articleInput: {
  title: string;
  summary: string;
  contentSnippet?: string | null;
  sourceName: string;
  sourceUrl: string;
  categorySlug: string;
  countryCode: string;
  whyItMatters: string;
}): Promise<StructuredAiBulletin> {
  const cat = getCategoryBySlug(articleInput.categorySlug);
  const cleanTitle = sanitizeUntrustedText(articleInput.title, 300);
  const cleanSummary = sanitizeUntrustedText(articleInput.summary, 800);
  const cleanSnippet = sanitizeUntrustedText(articleInput.contentSnippet || '', 1200);

  if (!isGeminiConfigured()) {
    return validateAiBulletinOutput(
      { modelName: 'extractive-baseline (awaiting GEMINI_API_KEY)' },
      {
        title: cleanTitle,
        summary: cleanSummary,
        sourceName: articleInput.sourceName,
        categorySlug: articleInput.categorySlug,
        whyItMatters: articleInput.whyItMatters,
      }
    );
  }

  const ai = getGeminiClient();
  const prompt = `Analyze the following untrusted news dispatch and produce a structured, strictly source-grounded news intelligence bulletin.

<untrusted_article_data>
Headline: ${cleanTitle}
Publisher: ${articleInput.sourceName}
Category: ${cat.name}
Country/Region Code: ${articleInput.countryCode}
Summary: ${cleanSummary}
Excerpt: ${cleanSnippet}
</untrusted_article_data>

Strict Editorial Rules:
1. NEVER invent facts, quotations, statistics, dates, or sources not supported by the text above.
2. If specific details are not present in the excerpt, explicitly state what remains unclear or unconfirmed in "whatRemainsUncertain".
3. Do not present predictions as established facts.
4. Preserve attribution to ${articleInput.sourceName}.
5. ${
    cat.isCautiousDomain
      ? `This story belongs to a sensitive domain (${cat.name}). Use cautious, neutral phrasing and include a clear precautionary note in cautiousDomainWarning.`
      : 'Maintain strict neutral wire-service tone.'
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are the Chief Editorial Intelligence Editor for WORLDWIRE, an international news wire. You summarize and structure news dispatches with rigorous factual fidelity, zero speculation, and explicit attribution.',
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          oneLineHeadline: {
            type: Type.STRING,
            description: 'Concise single-line editorial headline preserving original meaning.',
          },
          briefing30s: {
            type: Type.STRING,
            description: '2-3 sentence 30-second executive briefing with source attribution.',
          },
          shortBulletin: {
            type: Type.STRING,
            description: 'Tight wire-style paragraph summary.',
          },
          detailedSummary: {
            type: Type.STRING,
            description: 'Comprehensive multi-sentence synthesis of the available reporting.',
          },
          whatHappened: {
            type: Type.STRING,
            description: 'Clear explanation of the core verified event.',
          },
          whyItMatters: {
            type: Type.STRING,
            description: 'Explanation of global, regional, policy, or scientific significance.',
          },
          whatWeKnow: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of 2-4 verified facts explicitly stated in the report.',
          },
          whatRemainsUncertain: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of 1-3 open questions, unverified claims, or details not yet available.',
          },
          whatToWatchNext: {
            type: Type.STRING,
            description: 'Upcoming milestones, official decisions, or follow-up developments to monitor.',
          },
          keyFacts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4 concise bullet points summarizing key facts.',
          },
          entities: {
            type: Type.OBJECT,
            properties: {
              countries: { type: Type.ARRAY, items: { type: Type.STRING } },
              organizations: { type: Type.ARRAY, items: { type: Type.STRING } },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['countries', 'organizations', 'topics'],
          },
          cautiousDomainWarning: {
            type: Type.STRING,
            description: 'Precautionary editorial disclaimer if medical, financial, conflict, legal, or election related.',
          },
        },
        required: [
          'oneLineHeadline',
          'briefing30s',
          'shortBulletin',
          'detailedSummary',
          'whatHappened',
          'whyItMatters',
          'whatWeKnow',
          'whatRemainsUncertain',
          'whatToWatchNext',
          'keyFacts',
          'entities',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim());
  parsed.modelName = 'gemini-3.8-flash';
  return validateAiBulletinOutput(parsed, {
    title: cleanTitle,
    summary: cleanSummary,
    sourceName: articleInput.sourceName,
    categorySlug: articleInput.categorySlug,
    whyItMatters: articleInput.whyItMatters,
  });
}

export async function generateEditorialBriefingWithAi(params: {
  type: string;
  title: string;
  scopeFilter: string;
  coveragePeriod: string;
  articles: Array<{
    title: string;
    summary: string;
    sourceName: string;
    canonicalUrl: string;
    whyItMatters: string;
  }>;
}): Promise<{
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
}> {
  const topArticles = params.articles.slice(0, 6);

  const fallbackResult = {
    leadSynthesis: `This ${params.title} synthesizes ${topArticles.length} distinct verified developments across ${params.coveragePeriod}, prioritizing corroborated international and regional reporting.`,
    items: topArticles.map((a) => ({
      eventTitle: a.title,
      whatHappened: a.summary,
      whyItMatters: a.whyItMatters || 'Significant development tracked by WORLDWIRE editors.',
      latestDevelopment: `Reported by ${a.sourceName}.`,
      sources: [{ name: a.sourceName, url: a.canonicalUrl }],
    })),
    backgroundContext:
      'Compiled from stored primary publisher feeds and institutional dispatches. Background context is separated from newly reported developments.',
    uncertaintyNotes:
      'Where coverage relies on initial wire dispatches, subsequent regulatory or diplomatic confirmations are tracked in live event timelines.',
    modelName: isGeminiConfigured() ? 'gemini-3.8-flash' : 'extractive-digest',
  };

  if (!isGeminiConfigured() || topArticles.length === 0) {
    return fallbackResult;
  }

  try {
    const ai = getGeminiClient();
    const serialized = topArticles
      .map(
        (a, idx) =>
          `[${idx + 1}] Title: ${sanitizeUntrustedText(a.title, 200)}\nSource: ${a.sourceName} (${a.canonicalUrl})\nSummary: ${sanitizeUntrustedText(a.summary, 350)}`
      )
      .join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a structured "${params.title}" (${params.coveragePeriod}, Scope: ${params.scopeFilter}) based strictly on these stored reports:\n\n<stored_reports>\n${serialized}\n</stored_reports>\n\nGroup duplicate angles into distinct developments. Do not invent facts or URLs.`,
      config: {
        systemInstruction:
          'You are the Executive Briefing Editor at WORLDWIRE. Synthesize distinct global events clearly, separating what happened, why it matters, and background context without speculation.',
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leadSynthesis: { type: Type.STRING },
            backgroundContext: { type: Type.STRING },
            uncertaintyNotes: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  eventTitle: { type: Type.STRING },
                  whatHappened: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  latestDevelopment: { type: Type.STRING },
                  sourceIndex: {
                    type: Type.INTEGER,
                    description: '1-based index of the primary source from stored_reports.',
                  },
                },
                required: ['eventTitle', 'whatHappened', 'whyItMatters', 'latestDevelopment', 'sourceIndex'],
              },
            },
          },
          required: ['leadSynthesis', 'backgroundContext', 'uncertaintyNotes', 'items'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return fallbackResult;
    }

    return {
      leadSynthesis: parsed.leadSynthesis || fallbackResult.leadSynthesis,
      backgroundContext: parsed.backgroundContext || fallbackResult.backgroundContext,
      uncertaintyNotes: parsed.uncertaintyNotes || fallbackResult.uncertaintyNotes,
      modelName: 'gemini-3.8-flash',
      items: parsed.items.map((item: any, idx: number) => {
        const refIdx = Math.max(0, Math.min(topArticles.length - 1, (item.sourceIndex || idx + 1) - 1));
        const matchedArticle = topArticles[refIdx];
        return {
          eventTitle: item.eventTitle || matchedArticle.title,
          whatHappened: item.whatHappened || matchedArticle.summary,
          whyItMatters: item.whyItMatters || matchedArticle.whyItMatters,
          latestDevelopment: item.latestDevelopment || `Reported by ${matchedArticle.sourceName}`,
          sources: [{ name: matchedArticle.sourceName, url: matchedArticle.canonicalUrl }],
        };
      }),
    };
  } catch (error) {
    console.error('Gemini briefing synthesis fallback triggered:', error);
    return fallbackResult;
  }
}
