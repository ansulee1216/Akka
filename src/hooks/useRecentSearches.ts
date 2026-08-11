import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'akka.recentSearches';
const MAX_RECENT = 8;

/**
 * Recent search terms, newest first, persisted on the device.
 *
 * Kept local rather than on the user document: it's a convenience, not data
 * worth a Firestore write on every keystroke, and it shouldn't follow someone
 * onto a shared device.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled || !stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecent(parsed.filter((v) => typeof v === 'string'));
      })
      .catch(() => {
        // A corrupt entry just means starting with an empty history.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback((next: string[]) => {
    setRecent(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return;
      setRecent((current) => {
        // Re-searching an old term moves it to the top rather than duplicating.
        const deduped = current.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
        const next = [trimmed, ...deduped].slice(0, MAX_RECENT);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const removeSearch = useCallback(
    (term: string) => save(recent.filter((t) => t !== term)),
    [recent, save]
  );

  const clearSearches = useCallback(() => save([]), [save]);

  return { recent, addSearch, removeSearch, clearSearches };
}
