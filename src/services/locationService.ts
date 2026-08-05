import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Asks for foreground location permission.
 *
 * Foreground only — we never need location while the app is closed, and
 * background access triggers a much scarier system prompt (plus extra app
 * store review).
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function getLocationPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/**
 * Current position.
 *
 * Tries the last known position first: it returns instantly from the OS cache,
 * whereas a fresh GPS fix can take several seconds outdoors and much longer
 * indoors. For "which shop is closest" a slightly stale position is fine —
 * being 50m out doesn't change the ordering.
 *
 * Set `precise` when the exact spot matters (e.g. a shop owner pinning their
 * storefront), which skips the cache.
 */
export async function getCurrentCoords(precise: boolean = false): Promise<Coords | null> {
  try {
    if (!precise) {
      const cached = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      if (cached) {
        return { latitude: cached.coords.latitude, longitude: cached.coords.longitude };
      }
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: precise ? Location.Accuracy.High : Location.Accuracy.Balanced,
    });
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (e) {
    console.warn('[Akka] Could not read current location:', e);
    return null;
  }
}

/**
 * Progressively simpler versions of an address, most specific first.
 *
 * The built-in geocoder is strict: a full Korean address with a lot number
 * ("서울특별시 서초구 방배동 851-1") often fails outright, while the same
 * address without the number resolves fine. Rather than making the user guess
 * what to delete, we retry with the tail trimmed off.
 */
function addressVariants(address: string): string[] {
  const cleaned = address
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  const variants = [cleaned];
  const tokens = cleaned.split(' ');

  // Drop a trailing lot/building number like "851-1" or "12번지".
  if (tokens.length > 1 && /[\d-]/.test(tokens[tokens.length - 1])) {
    variants.push(tokens.slice(0, -1).join(' '));
  }

  // Then fall back to progressively broader areas, down to two components
  // ("서울특별시 서초구"), which almost always resolves.
  for (let end = tokens.length - 1; end >= 2; end--) {
    const candidate = tokens.slice(0, end).join(' ');
    if (!variants.includes(candidate)) variants.push(candidate);
  }

  // De-duplicate while preserving order.
  return variants.filter((v, i) => v && variants.indexOf(v) === i);
}

/**
 * Turns a written address into coordinates using the phone's built-in
 * geocoder.
 *
 * Tries the address as written, then progressively simpler versions. A
 * broader match is still useful — it puts the shop in the right
 * neighbourhood, and the owner can always use the GPS button for precision.
 * Returns null only when nothing resolves at all.
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function geocodeAddress(address: string): Promise<Coords | null> {
  const variants = addressVariants(address);

  for (let i = 0; i < variants.length; i++) {
    // The platform geocoder is rate-limited — Expo's docs warn that "creating
    // too many requests at a time can result in an error". Firing every
    // variant back-to-back is exactly that, and gets us throttled rather than
    // answered, so leave a gap between attempts.
    if (i > 0) await sleep(600);

    try {
      const results = await Location.geocodeAsync(variants[i]);
      if (results.length) {
        return { latitude: results[0].latitude, longitude: results[0].longitude };
      }
      console.warn(`[Akka] Geocode found nothing for: "${variants[i]}"`);
    } catch (e) {
      console.warn(`[Akka] Geocode threw for "${variants[i]}":`, e);
    }
  }

  console.warn('[Akka] Could not geocode address at all:', address);
  return null;
}

/**
 * Best-effort human-readable address for a coordinate, for confirming a GPS pin.
 *
 * Deliberately ignores the `name` field: for a plain street address it holds a
 * composite like "851-1, 방배동", which duplicates the parts we already have
 * and produces labels like "서울특별시 방배동 851-1, 방배동".
 *
 * Components are also skipped when already contained in what's been built so
 * far — Korean results frequently repeat the district across `city`,
 * `subregion` and `district`.
 */
export async function describeCoords(coords: Coords): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    if (!results.length) return null;
    const r = results[0];

    // Largest area to smallest, the way Korean addresses are written.
    const ordered = [r.region, r.subregion, r.city, r.district, r.street];

    const parts: string[] = [];
    for (const part of ordered) {
      const value = part?.trim();
      if (!value) continue;
      if (parts.some((existing) => existing.includes(value) || value.includes(existing))) {
        continue;
      }
      parts.push(value);
    }

    return parts.join(' ') || null;
  } catch {
    return null;
  }
}

/**
 * Straight-line distance between two points in metres (haversine formula).
 *
 * This is "as the crow flies", not walking distance — a shop 200m away across
 * a river might be a 2km walk. Fine for ordering a list and giving a rough
 * sense of proximity, which is all we use it for.
 */
export function distanceInMeters(a: Coords, b: Coords): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** e.g. "250m" / "1.2km" / "12km" — rounded the way people actually talk. */
export function formatDistance(meters: number): string {
  if (!isFinite(meters)) return '';
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10}m`;
  }
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}
