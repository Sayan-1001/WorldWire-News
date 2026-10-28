/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ArticleDetailPage } from './pages/ArticleDetailPage.tsx';
import { CategoryCountryPage } from './pages/CategoryCountryPage.tsx';
import { EventDetailPage, EventsListPage } from './pages/EventsPage.tsx';
import { BriefingsPage } from './pages/BriefingsPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { SavedPersonalizationPage } from './pages/SavedPersonalizationPage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { EditorialLegalPage } from './pages/EditorialLegalPage.tsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917] dark:bg-[#0B0F17] dark:text-[#F8FAFC]">
          <Header />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/article/:slug" element={<ArticleDetailPage />} />
              <Route
                path="/category/:slug"
                element={<CategoryCountryPage mode="category" />}
              />
              <Route
                path="/country/:code"
                element={<CategoryCountryPage mode="country" />}
              />
              <Route path="/events" element={<EventsListPage />} />
              <Route path="/event/:slug" element={<EventDetailPage />} />
              <Route path="/briefings" element={<BriefingsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/saved" element={<SavedPersonalizationPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route
                path="/editorial-policy"
                element={<EditorialLegalPage section="editorial-policy" />}
              />
              <Route
                path="/corrections"
                element={<EditorialLegalPage section="corrections" />}
              />
              <Route
                path="/privacy"
                element={<EditorialLegalPage section="privacy" />}
              />
              <Route path="/terms" element={<EditorialLegalPage section="terms" />} />
              <Route
                path="/contact"
                element={<EditorialLegalPage section="contact" />}
              />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
