import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  FileText,
  Globe,
  Menu,
  Moon,
  Radio,
  Search,
  Shield,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CATEGORIES_TAXONOMY,
  COUNTRIES_REGIONS_TAXONOMY,
  SITE_CONFIG,
} from '../config/site.ts';
import { useApp } from '../context/AppContext.tsx';

export const Header: React.FC = () => {
  const {
    firebaseUser,
    dbUser,
    darkMode,
    toggleDarkMode,
    bookmarkedIds,
    signInWithGoogle,
    logout,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="border-b border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-[#0B0F17]">
      {/* Primary Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="max-w-[1380px] mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <Link
          to="/"
          className="text-2xl sm:text-3xl font-editorial font-bold tracking-tight text-stone-950 dark:text-white whitespace-nowrap shrink-0"
        >
          {SITE_CONFIG.name}
        </Link>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Editorial Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-700 dark:text-slate-300"
        >
          <Link
            to="/category/world"
            className={`hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/category/world'
                ? 'text-stone-950 dark:text-white underline font-semibold'
                : ''
            }`}
          >
            World
          </Link>
          <Link
            to="/country/IN"
            className={`hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/country/IN' || location.pathname === '/category/india'
                ? 'text-stone-950 dark:text-white underline font-semibold'
                : ''
            }`}
          >
            India
          </Link>
          <Link
            to="/category/politics"
            className={`hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/category/politics'
                ? 'text-stone-950 dark:text-white underline font-semibold'
                : ''
            }`}
          >
            Politics
          </Link>
          <Link
            to="/category/business"
            className={`hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/category/business'
                ? 'text-stone-950 dark:text-white underline font-semibold'
                : ''
            }`}
          >
            Business
          </Link>
          <Link
            to="/category/technology"
            className={`hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0 ${
              location.pathname === '/category/technology'
                ? 'text-stone-950 dark:text-white underline font-semibold'
                : ''
            }`}
          >
            Technology
          </Link>
        </nav>

        {/* Zone 3: Primary action / Mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/briefings')}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] dark:bg-blue-700 dark:hover:bg-blue-600 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Daily Briefing
          </button>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle Sections Menu"
            className="lg:hidden p-2 text-stone-700 dark:text-slate-200 hover:bg-stone-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Secondary Editorial Utility & Section Ribbon */}
      <div className="border-t border-stone-200/80 dark:border-slate-800/80 bg-[#F4F0E8] dark:bg-[#111827]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-600 dark:text-slate-300">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5">
            <span className="font-mono-tabular text-stone-500 dark:text-slate-400 whitespace-nowrap shrink-0">
              {formattedDate}
            </span>
            <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">
              ·
            </span>
            <Link
              to="/category/science"
              className="hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Science
            </Link>
            <Link
              to="/category/health"
              className="hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Health
            </Link>
            <Link
              to="/category/climate"
              className="hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Climate
            </Link>
            <Link
              to="/category/sports"
              className="hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              Sports
            </Link>
            <span aria-hidden="true" className="text-stone-300 dark:text-slate-700">
              ·
            </span>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 font-medium text-[#9A3412] dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
            >
              <Radio className="w-3.5 h-3.5" />
              Developing Events
            </Link>
            <Link
              to="/calendar"
              className="inline-flex items-center gap-1.5 hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              Global Calendar
            </Link>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/search"
              className="inline-flex items-center gap-1 hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </Link>
            <Link
              to="/saved"
              className="inline-flex items-center gap-1 hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({bookmarkedIds.length})</span>
            </Link>
            {(dbUser?.role === 'admin' || dbUser?.role === 'editor') && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Editorial Desk</span>
              </Link>
            )}
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Light or Dark Theme"
              className="inline-flex items-center gap-1 hover:text-stone-950 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <span className="font-mono-tabular text-[11px] text-stone-600 dark:text-slate-400 truncate max-w-[110px]">
                  {dbUser?.displayName || firebaseUser.email}
                </span>
                <button
                  onClick={logout}
                  className="text-stone-500 hover:text-stone-900 dark:hover:text-white underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1 font-medium text-stone-800 dark:text-slate-200 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Mobile & Full Taxonomy Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-stone-200 dark:border-slate-800 bg-[#FBF9F5] dark:bg-[#0B0F17] px-4 sm:px-6 py-6">
          <div className="max-w-[1380px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
                News Categories
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {CATEGORIES_TAXONOMY.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white py-1 truncate"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
                Country & Regional Desks
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {COUNTRIES_REGIONS_TAXONOMY.map((c) => (
                  <Link
                    key={c.code}
                    to={`/country/${c.code}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-1.5 text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white py-1 truncate"
                  >
                    <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-stone-500 dark:text-slate-400 mb-3">
                Intelligence & Editorial
              </h3>
              <div className="flex flex-col gap-2 text-sm">
                <Link
                  to="/briefings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center gap-2 text-stone-800 dark:text-slate-200 font-medium py-1"
                >
                  <FileText className="w-4 h-4" />
                  Daily Briefings & News Explained
                </Link>
                <Link
                  to="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center gap-2 text-stone-800 dark:text-slate-200 font-medium py-1"
                >
                  <Radio className="w-4 h-4" />
                  Live Developing Story Tracker
                </Link>
                <Link
                  to="/calendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center gap-2 text-stone-800 dark:text-slate-200 font-medium py-1"
                >
                  <Calendar className="w-4 h-4" />
                  Upcoming Global Events Calendar
                </Link>
                {(dbUser?.role === 'admin' || dbUser?.role === 'editor') && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center gap-2 text-stone-800 dark:text-slate-200 font-medium py-1"
                  >
                    <Shield className="w-4 h-4" />
                    Administrative & Source Console
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
