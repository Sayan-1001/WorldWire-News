/**
 * Central Configuration File for WORLDWIRE
 * Changing SITE_CONFIG.name updates the platform brand identity across all pages,
 * SEO tags, RSS feeds, structured data, and editorial headers.
 */

export interface CategoryConfig {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  displayOrder: number;
  isFeatured: boolean;
  isCautiousDomain?: boolean;
  cautiousNotice?: string;
}

export interface CountryRegionConfig {
  code: string;
  name: string;
  type: 'country' | 'region' | 'continent';
  continent: string;
  summary: string;
  featured: boolean;
  coordinates?: { x: number; y: number }; // Normalized SVG map coordinates (0-1000, 0-500)
}

export const SITE_CONFIG = {
  name: 'WORLDWIRE',
  tagline: 'Global News Intelligence & Live Event Tracker',
  editionLabel: 'International & India Edition',
  description:
    'Centralized global news intelligence platform aggregating verified reporting, tracking developing international events, and synthesizing transparent AI-assisted briefings.',
  defaultRefreshMinutes: 15,
  topNavLinks: [
    { label: 'World', href: '/category/world' },
    { label: 'India', href: '/country/IN' },
    { label: 'Politics', href: '/category/politics' },
    { label: 'Business', href: '/category/business' },
    { label: 'Technology', href: '/category/technology' },
    { label: 'Science', href: '/category/science' },
    { label: 'Health', href: '/category/health' },
    { label: 'Climate', href: '/category/climate' },
    { label: 'Sports', href: '/category/sports' },
  ],
  secondaryNavLinks: [
    { label: 'Developing Events', href: '/events' },
    { label: 'Daily Briefings & Explained', href: '/briefings' },
    { label: 'Upcoming Calendar', href: '/calendar' },
    { label: 'Saved Stories', href: '/saved' },
  ],
};

export const CATEGORIES_TAXONOMY: CategoryConfig[] = [
  {
    slug: 'world',
    name: 'World',
    shortName: 'World',
    description: 'Major international developments, cross-border affairs, and global dispatches.',
    displayOrder: 1,
    isFeatured: true,
  },
  {
    slug: 'india',
    name: 'India',
    shortName: 'India',
    description: 'National governance, economic policy, infrastructure, regional states, and foreign affairs across India.',
    displayOrder: 2,
    isFeatured: true,
  },
  {
    slug: 'politics',
    name: 'Politics',
    shortName: 'Politics',
    description: 'Legislative actions, executive policy, parliamentary debates, and governance worldwide.',
    displayOrder: 3,
    isFeatured: true,
    isCautiousDomain: true,
    cautiousNotice: 'Political and governance coverage distinguishes official legislative records from partisan commentary.',
  },
  {
    slug: 'business',
    name: 'Business and Economy',
    shortName: 'Business',
    description: 'Macroeconomic indicators, central banks, global trade supply chains, and corporate strategy.',
    displayOrder: 4,
    isFeatured: true,
    isCautiousDomain: true,
    cautiousNotice: 'Economic and financial reporting is for informational purposes only and does not constitute investment advice.',
  },
  {
    slug: 'markets',
    name: 'Financial Markets',
    shortName: 'Markets',
    description: 'Sovereign debt, equities, commodities, foreign exchange, and monetary policy decisions.',
    displayOrder: 5,
    isFeatured: true,
    isCautiousDomain: true,
    cautiousNotice: 'Market data and analysis reflect historical reporting, not financial or trading recommendations.',
  },
  {
    slug: 'technology',
    name: 'Technology and AI',
    shortName: 'Technology',
    description: 'Artificial intelligence, semiconductors, cybersecurity, digital regulation, and computing infrastructure.',
    displayOrder: 6,
    isFeatured: true,
  },
  {
    slug: 'science',
    name: 'Science and Research',
    shortName: 'Science',
    description: 'Peer-reviewed discoveries, physics, materials science, biotechnology, and fundamental research.',
    displayOrder: 7,
    isFeatured: true,
  },
  {
    slug: 'space',
    name: 'Space and Astronomy',
    shortName: 'Space',
    description: 'Orbital launches, planetary missions, deep-space observatories, and international space agencies.',
    displayOrder: 8,
    isFeatured: true,
  },
  {
    slug: 'health',
    name: 'Health and Medicine',
    shortName: 'Health',
    description: 'Public health epidemiology, clinical trials, regulatory approvals, and global healthcare systems.',
    displayOrder: 9,
    isFeatured: true,
    isCautiousDomain: true,
    cautiousNotice: 'Medical and public health summaries reference institutional releases and do not substitute professional clinical advice.',
  },
  {
    slug: 'climate',
    name: 'Climate and Environment',
    shortName: 'Climate',
    description: 'Atmospheric science, biodiversity conservation, decarbonization treaties, and environmental policy.',
    displayOrder: 10,
    isFeatured: true,
  },
  {
    slug: 'energy',
    name: 'Energy',
    shortName: 'Energy',
    description: 'Grid transition, renewable generation, nuclear power, LNG markets, and critical minerals.',
    displayOrder: 11,
    isFeatured: false,
  },
  {
    slug: 'conflicts',
    name: 'Conflicts and Security',
    shortName: 'Security',
    description: 'Armed conflicts, defense postures, peacekeeping operations, and humanitarian corridors.',
    displayOrder: 12,
    isFeatured: false,
    isCautiousDomain: true,
    cautiousNotice: 'Conflict reporting separates independently corroborated facts from unverified battlefield claims by belligerents.',
  },
  {
    slug: 'diplomacy',
    name: 'International Relations',
    shortName: 'Diplomacy',
    description: 'Bilateral treaties, multilateral summits, UN resolutions, sanctions, and diplomatic alliances.',
    displayOrder: 13,
    isFeatured: false,
  },
  {
    slug: 'elections',
    name: 'Elections',
    shortName: 'Elections',
    description: 'National polls, electoral commission announcements, constitutional referendums, and voter turnout.',
    displayOrder: 14,
    isFeatured: false,
    isCautiousDomain: true,
    cautiousNotice: 'Electoral coverage relies on certified electoral authorities; exit polls and projections are explicitly labeled.',
  },
  {
    slug: 'education',
    name: 'Education',
    shortName: 'Education',
    description: 'Higher education policy, academic research funding, literacy initiatives, and workforce skills.',
    displayOrder: 15,
    isFeatured: false,
  },
  {
    slug: 'society',
    name: 'Society and Culture',
    shortName: 'Society',
    description: 'Demographics, urban development, cultural heritage, media, and civil institutions.',
    displayOrder: 16,
    isFeatured: false,
  },
  {
    slug: 'sports',
    name: 'Sports',
    shortName: 'Sports',
    description: 'International tournaments, cricket, football, Olympic competition, and athletics governance.',
    displayOrder: 17,
    isFeatured: true,
  },
  {
    slug: 'disasters',
    name: 'Disasters and Emergencies',
    shortName: 'Emergencies',
    description: 'Seismic events, cyclones, extreme weather alerts, and civil emergency response.',
    displayOrder: 18,
    isFeatured: false,
    isCautiousDomain: true,
    cautiousNotice: 'Emergency reports cite meteorological and civil defense authorities. Follow local official evacuation directives.',
  },
];

export const COUNTRIES_REGIONS_TAXONOMY: CountryRegionConfig[] = [
  {
    code: 'GLOBAL',
    name: 'Global / Multilateral',
    type: 'region',
    continent: 'Global',
    summary: 'Cross-continental treaties, United Nations bodies, and worldwide economic & scientific developments.',
    featured: true,
    coordinates: { x: 500, y: 240 },
  },
  {
    code: 'IN',
    name: 'India',
    type: 'country',
    continent: 'Asia',
    summary: 'Comprehensive coverage of Indian parliament, RBI monetary policy, ISRO space missions, digital public infrastructure, and regional states.',
    featured: true,
    coordinates: { x: 705, y: 245 },
  },
  {
    code: 'US',
    name: 'United States',
    type: 'country',
    continent: 'North America',
    summary: 'Federal policy, US Congress, Federal Reserve decisions, technology leadership, and foreign relations.',
    featured: true,
    coordinates: { x: 225, y: 195 },
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    type: 'country',
    continent: 'Europe',
    summary: 'Westminster parliamentary updates, Bank of England policy, scientific research, and European relations.',
    featured: true,
    coordinates: { x: 478, y: 155 },
  },
  {
    code: 'EU',
    name: 'European Union',
    type: 'region',
    continent: 'Europe',
    summary: 'European Commission directives, ECB monetary policy, industrial competitiveness, and continental security.',
    featured: true,
    coordinates: { x: 515, y: 168 },
  },
  {
    code: 'CN',
    name: 'China',
    type: 'country',
    continent: 'Asia',
    summary: 'Industrial output, trade policy, clean-energy manufacturing, space exploration, and East Asian diplomacy.',
    featured: true,
    coordinates: { x: 775, y: 210 },
  },
  {
    code: 'RU',
    name: 'Russia',
    type: 'country',
    continent: 'Europe',
    summary: 'Eurasian security, energy exports, sanctions impacts, and diplomatic developments.',
    featured: false,
    coordinates: { x: 640, y: 135 },
  },
  {
    code: 'ME',
    name: 'Middle East',
    type: 'region',
    continent: 'Asia',
    summary: 'Regional diplomacy, maritime trade corridors, energy transition, and humanitarian negotiations.',
    featured: true,
    coordinates: { x: 595, y: 235 },
  },
  {
    code: 'AF',
    name: 'Africa',
    type: 'continent',
    continent: 'Africa',
    summary: 'African Union trade integration, critical minerals, demographic growth, and climate adaptation.',
    featured: true,
    coordinates: { x: 535, y: 315 },
  },
  {
    code: 'SA',
    name: 'South Asia',
    type: 'region',
    continent: 'Asia',
    summary: 'Regional connectivity, monsoon resilience, trade corridors, and diplomatic affairs across South Asia.',
    featured: true,
    coordinates: { x: 715, y: 255 },
  },
  {
    code: 'EA',
    name: 'East Asia & Pacific',
    type: 'region',
    continent: 'Asia',
    summary: 'Semiconductor supply chains, maritime security, ASEAN economic integration, and Pacific diplomacy.',
    featured: true,
    coordinates: { x: 825, y: 235 },
  },
  {
    code: 'LA',
    name: 'Latin America',
    type: 'region',
    continent: 'South America',
    summary: 'Amazon basin conservation, nearshoring manufacturing, agricultural exports, and regional governance.',
    featured: true,
    coordinates: { x: 315, y: 360 },
  },
];

export function getCategoryBySlug(slug: string): CategoryConfig {
  return (
    CATEGORIES_TAXONOMY.find((c) => c.slug.toLowerCase() === slug.toLowerCase()) ||
    CATEGORIES_TAXONOMY[0]
  );
}

export function getCountryByCode(code: string): CountryRegionConfig {
  return (
    COUNTRIES_REGIONS_TAXONOMY.find((c) => c.code.toUpperCase() === code.toUpperCase()) ||
    COUNTRIES_REGIONS_TAXONOMY[0]
  );
}
