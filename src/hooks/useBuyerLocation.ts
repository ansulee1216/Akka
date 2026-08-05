import { useState, useEffect, useCallback } from 'react';
import {
  getLocationPermissionStatus,
  requestLocationPermission,
  getCurrentCoords,
  type Coords,
  type PermissionStatus,
} from '../services/locationService';

/**
 * The buyer's location, for sorting listings by distance.
 *
 * Deliberately non-blocking: on mount it only *checks* whether permission was
 * already granted and, if so, reads the position. It never prompts by itself.
 * Browsing works fine without location — it just falls back to newest-first —
 * so the permission dialog is only shown when the user taps to enable it.
 * Prompting on launch, before anyone has seen what the app does, is the
 * fastest way to get a permanent "Don't Allow".
 */
export function useBuyerLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const current = await getLocationPermissionStatus();
      if (cancelled) return;
      setStatus(current);

      if (current === 'granted') {
        const position = await getCurrentCoords();
        if (!cancelled && position) setCoords(position);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Call from a user action — this is what shows the system permission dialog. */
  const enableLocation = useCallback(async () => {
    setLoading(true);
    try {
      const result = await requestLocationPermission();
      setStatus(result);
      if (result === 'granted') {
        const position = await getCurrentCoords();
        if (position) setCoords(position);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-read position without re-prompting, e.g. on pull-to-refresh. */
  const refreshLocation = useCallback(async () => {
    if (status !== 'granted') return;
    const position = await getCurrentCoords();
    if (position) setCoords(position);
  }, [status]);

  return { coords, status, loading, enableLocation, refreshLocation };
}
