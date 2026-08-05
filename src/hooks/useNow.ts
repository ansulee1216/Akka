import { useState, useEffect } from 'react';

/**
 * A clock that re-renders the component on an interval.
 *
 * Listings expire partway through a browsing session, so anything showing
 * "expires in N minutes" or filtering out expired items needs the current
 * time to actually advance — otherwise the screen quietly goes stale until
 * something else happens to re-render it.
 */
export function useNow(intervalMs: number = 30000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
