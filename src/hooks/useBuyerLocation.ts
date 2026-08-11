import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLocationPermissionStatus,
  requestLocationPermission,
  getCurrentCoords,
  describeCoords,
  type Coords,
  type PermissionStatus,
} from '../services/locationService';

const STORAGE_KEY = 'akka.buyerLocation';

export interface SavedLocation {
  coords: Coords;
  label: string;
  /** 'gps' was read from the device; 'manual' was pinned via address search. */
  source: 'gps' | 'manual';
}

/**
 * The buyer's location, either read from GPS or pinned manually.
 *
 * A manually chosen location always wins over GPS — someone browsing from home
 * for a pickup near work has deliberately overridden where they are, and
 * silently snapping back would undo that. The choice persists across restarts.
 *
 * Nothing prompts on mount: we only *check* existing permission. The system
 * dialog appears when the user taps to enable it. Asking before anyone has seen
 * what the app does is the quickest route to a permanent "Don't Allow", which
 * on iOS can't be re-prompted, only fixed in Settings.
 */
export function useBuyerLocation() {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const persist = useCallback((next: SavedLocation) => {
    if (!mounted.current) return;
    setLocation(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
      // Losing the cached location only means re-picking it next launch.
    });
  }, []);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      let saved: SavedLocation | null = null;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SavedLocation;
          if (parsed?.coords) saved = parsed;
        }
      } catch {
        // A corrupt entry shouldn't block startup; fall through to GPS.
      }

      if (!mounted.current) return;
      if (saved) setLocation(saved);

      const current = await getLocationPermissionStatus();
      if (!mounted.current) return;
      setStatus(current);

      // Refresh from GPS only when the user hasn't deliberately pinned a spot.
      if (current === 'granted' && saved?.source !== 'manual') {
        const coords = await getCurrentCoords();
        if (mounted.current && coords) {
          const label = (await describeCoords(coords)) ?? '현재 위치';
          persist({ coords, label, source: 'gps' });
        }
      }

      if (mounted.current) setLoading(false);
    })();

    return () => {
      mounted.current = false;
    };
  }, [persist]);

  /** Call from a tap — this is what shows the system permission dialog. */
  const useCurrentLocation = useCallback(async (): Promise<PermissionStatus> => {
    setLoading(true);
    try {
      const result = await requestLocationPermission();
      setStatus(result);
      if (result !== 'granted') return result;

      const coords = await getCurrentCoords(true);
      if (coords) {
        const label = (await describeCoords(coords)) ?? '현재 위치';
        persist({ coords, label, source: 'gps' });
      }
      return result;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [persist]);

  /** Pin a location chosen from address search. */
  const setManualLocation = useCallback(
    (coords: Coords, label: string) => persist({ coords, label, source: 'manual' }),
    [persist]
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return {
    location,
    coords: location?.coords ?? null,
    label: location?.label ?? null,
    status,
    loading,
    useCurrentLocation,
    setManualLocation,
    clearLocation,
  };
}
