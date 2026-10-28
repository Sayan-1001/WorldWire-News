import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site.ts';

interface EditorialLegalPageProps {
  section: 'editorial-policy' | 'corrections' | 'privacy' | 'terms' | 'contact';
}

export const EditorialLegalPage: React.FC<EditorialLegalPageProps> = ({ section }) => {
  useEffect(() => {
    document.title = `${section.toUpperCase()} — ${SITE_CONFIG.name}`;
  }, [section]);

  return (
    <main className="max-w-[920px] mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-wrap items-center gap-2 pb-6 mb-8 border-b border-stone-200 dark:border-slate-800 text-xs font-medium">
        {[
          { id: 'editorial-policy', label: 'Editorial & AI Ethics Policy' },
          { id: 'corrections', label: 'Corrections Policy' },
          { id: 'privacy', label: 'Privacy Policy' },
          { id: 'terms', label: 'Terms & Licensing' },
        ].map((item) => (
          <Link
            key={item.id}
            to={`/${item.id}`}
            className={`px-3 py-1.5 rounded ${
              section === item.id
                ? 'bg-[#1E3A8A] text-white'
                : 'bg-[#F4F0E8] dark:bg-slate-900 text-stone-700 dark:text-slate-300'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {section === 'editorial-policy' && (
        <article className="space-y-6 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-stone-950 dark:text-white">
            Editorial Standards, Source Attribution & Responsible AI Policy
          </h1>
          <p>
            {SITE_CONFIG.name} is designed to help readers understand major global developments
            through verified multi-source reporting, transparent editorial ranking, and clearly
            labeled AI-assisted briefings.
          </p>
          <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
            1. Primary Source Attribution & Licensing Compliance
          </h2>
          <p>
            Every story card, developing event timeline, and briefing retains explicit attribution
            and direct canonical links to the original reporting publisher. Unless a public
            institution explicitly licenses full-text redistribution (such as official United
            Nations or NASA press releases), {SITE_CONFIG.name} displays only licensed metadata and
            original synthesized summaries, directing readers to the publisher for the full text. We
            never bypass paywalls or scrape restricted content.
          </p>
          <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
            2. Boundaries of AI News Processing
          </h2>
          <p>
            AI models are used strictly to summarize, classify, cluster, and compare retrieved
            source dispatches. Our system prompts and schema validators prohibit inventing
            quotations, statistics, URLs, or speculative predictions. When source coverage is
            incomplete, our bulletins explicitly state what remains uncertain under “What Remains
            Uncertain.”
          </p>
          <h2 className="text-xl font-editorial font-bold text-stone-950 dark:text-white">
            3. Sensitive & Cautious Reporting Domains
          </h2>
          <p>
            For medical, legal, financial, armed-conflict, election, and emergency reporting,{' '}
            {SITE_CONFIG.name} attaches prominent precautionary advisories and separates confirmed
            institutional facts from unverified claims.
          </p>
        </article>
      )}

      {section === 'corrections' && (
        <article className="space-y-6 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-stone-950 dark:text-white">
            Corrections & Editorial Updates Policy
          </h1>
          <p>
            When a factual error or classification discrepancy is identified in an ingested dispatch
            or AI summary, a formal correction can be logged via the in-app{' '}
            <Link to="/admin" className="text-[#1E3A8A] dark:text-blue-400 underline">
              Editorial Desk
            </Link>
            . Corrections appear in a permanent notice box at the top of the affected article page
            along with the timestamp.
          </p>
        </article>
      )}

      {section === 'privacy' && (
        <article className="space-y-6 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-stone-950 dark:text-white">
            Privacy & Data Minimization Policy
          </h1>
          <p>
            Public news reading on {SITE_CONFIG.name} requires no user account. When optional Google
            Sign-In authentication is used to bookmark articles or customize regional preferences,
            we store only your Firebase UID, email address, and explicit topic/country preferences
            in our PostgreSQL database. Authentication tokens are held strictly in memory and never
            persisted in browser localStorage.
          </p>
        </article>
      )}

      {(section === 'terms' || section === 'contact') && (
        <article className="space-y-6 text-sm text-stone-800 dark:text-slate-200 leading-relaxed">
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-stone-950 dark:text-white">
            Terms of Service & Publisher Rights
          </h1>
          <p>
            All external publisher trademarks, headlines, and linked articles remain the property of
            their respective copyright holders. {SITE_CONFIG.name} operates in compliance with RSS,
            GDELT, and licensed API terms, providing immediate outbound attribution on every item.
          </p>
        </article>
      )}
    </main>
  );
};
