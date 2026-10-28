import React from 'react';
import { Link } from 'react-router-dom';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-stone-300 dark:border-slate-800 bg-[#F4F0E8] dark:bg-[#090D14] text-stone-700 dark:text-slate-300 mt-16">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-stone-300/80 dark:border-slate-800">
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="text-2xl font-editorial font-bold tracking-tight text-stone-950 dark:text-white block mb-3"
            >
              {SITE_CONFIG.name}
            </Link>
            <p className="text-sm text-stone-600 dark:text-slate-400 leading-relaxed max-w-md mb-4">
              {SITE_CONFIG.description}
            </p>
            <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed max-w-md">
              Editorial Independence & AI Transparency: All AI-generated summaries are strictly
              grounded in cited primary publisher dispatches and clearly labeled. Automated
              synthesis never replaces independent reporting or human editorial verification.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
              Subject Desks
            </h3>
            <ul className="space-y-2 text-xs">
              {CATEGORIES_TAXONOMY.slice(0, 10).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="hover:text-stone-950 dark:hover:text-white hover:underline"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
              Regional Editions
            </h3>
            <ul className="space-y-2 text-xs">
              {COUNTRIES_REGIONS_TAXONOMY.map((cr) => (
                <li key={cr.code}>
                  <Link
                    to={`/country/${cr.code}`}
                    className="hover:text-stone-950 dark:hover:text-white hover:underline"
                  >
                    {cr.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
              Standards & Syndication
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/editorial-policy" className="hover:underline">
                  Editorial & AI Ethics Policy
                </Link>
              </li>
              <li>
                <Link to="/corrections" className="hover:underline">
                  Corrections & Updates Log
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:underline">
                  Privacy & Data Retention Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:underline">
                  Terms of Service & Licensing
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 dark:text-slate-400">
          <span>
            © {new Date().getFullYear()} {SITE_CONFIG.name}. Original publisher copyrights and links
            preserved in accordance with international press standards.
          </span>
          <div className="flex items-center gap-4">
            <Link to="/events" className="hover:underline">
              Live Events
            </Link>
            <Link to="/briefings" className="hover:underline">
              Daily Briefings
            </Link>
            <Link to="/calendar" className="hover:underline">
              Upcoming Calendar
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
