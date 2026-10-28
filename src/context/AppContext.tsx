import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface UserPreferencesState {
  followedCountries: string[];
  followedCategories: string[];
  preferredLanguage: string;
  breakingAlertsEnabled: boolean;
  importanceThreshold: number;
}

interface DbUserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'reader' | 'editor' | 'admin';
}

interface AppContextValue {
  firebaseUser: User | null;
  dbUser: DbUserProfile | null;
  idToken: string | null;
  authLoading: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  bookmarkedIds: number[];
  toggleBookmark: (articleId: number) => Promise<void>;
  preferences: UserPreferencesState;
  savePreferences: (prefs: UserPreferencesState) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const DEFAULT_PREFERENCES: UserPreferencesState = {
  followedCountries: ['IN', 'US', 'GLOBAL'],
  followedCategories: ['world', 'india', 'technology', 'business', 'science'],
  preferredLanguage: 'en',
  breakingAlertsEnabled: true,
  importanceThreshold: 75,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const [preferences, setPreferences] = useState<UserPreferencesState>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          const res = await fetch('/api/user/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setDbUser(data.user || null);
            if (Array.isArray(data.bookmarkedArticleIds)) {
              setBookmarkedIds(data.bookmarkedArticleIds);
            }
            if (data.preferences) {
              setPreferences({
                followedCountries: data.preferences.followedCountries || DEFAULT_PREFERENCES.followedCountries,
                followedCategories: data.preferences.followedCategories || DEFAULT_PREFERENCES.followedCategories,
                preferredLanguage: data.preferences.preferredLanguage || 'en',
                breakingAlertsEnabled: data.preferences.breakingAlertsEnabled ?? true,
                importanceThreshold: data.preferences.importanceThreshold || 75,
              });
            }
          }
        } catch (err) {
          console.error('Error syncing authenticated user profile:', err);
        }
      } else {
        setIdToken(null);
        setDbUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const authFetch = async (url: string, options: RequestInit = {}) => {
    let token = idToken;
    if (firebaseUser) {
      token = await firebaseUser.getIdToken();
      setIdToken(token);
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const toggleBookmark = async (articleId: number) => {
    const exists = bookmarkedIds.includes(articleId);
    setBookmarkedIds((prev) =>
      exists ? prev.filter((id) => id !== articleId) : [...prev, articleId]
    );

    if (firebaseUser) {
      try {
        await authFetch('/api/user/bookmarks', {
          method: 'POST',
          body: JSON.stringify({ articleId }),
        });
      } catch (err) {
        console.error('Bookmark sync error:', err);
      }
    }
  };

  const savePreferences = async (newPrefs: UserPreferencesState) => {
    setPreferences(newPrefs);
    if (firebaseUser) {
      try {
        await authFetch('/api/user/preferences', {
          method: 'PUT',
          body: JSON.stringify(newPrefs),
        });
      } catch (err) {
        console.error('Failed to persist user preferences:', err);
      }
    }
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
    setIdToken(null);
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        dbUser,
        idToken,
        authLoading,
        darkMode,
        toggleDarkMode,
        bookmarkedIds,
        toggleBookmark,
        preferences,
        savePreferences,
        signInWithGoogle,
        logout,
        authFetch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
