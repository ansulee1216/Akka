import { KAKAO_REST_API_KEY, isKakaoConfigured } from '../config/kakaoConfig';
import type { Coords } from './locationService';

const BASE_URL = 'https://dapi.kakao.com/v2/local/search';

/** A single selectable search result. */
export interface PlaceResult {
  id: string;
  /** Primary line — a business name, or the address itself. */
  title: string;
  /** Secondary line — the full address. */
  subtitle: string;
  coords: Coords;
  /** True when matched by business name rather than address. */
  isPlace: boolean;
}

interface KakaoAddressDoc {
  address_name: string;
  x: string;
  y: string;
  road_address?: { address_name?: string; building_name?: string } | null;
  address?: { address_name?: string } | null;
}

interface KakaoPlaceDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string;
  y: string;
}

async function kakaoFetch(path: string, query: string, size: number) {
  const url = `${BASE_URL}/${path}?query=${encodeURIComponent(query)}&size=${size}`;
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });

  if (!response.ok) {
    // 401 almost always means a bad or wrong-type key (JavaScript key instead
    // of REST); worth distinguishing since it's the most common setup mistake.
    if (response.status === 401) {
      throw new Error(
        'Kakao API 키가 올바르지 않아요. REST API 키인지 확인해주세요 (JavaScript 키가 아니라).'
      );
    }
    throw new Error(`Kakao 주소 검색에 실패했어요 (${response.status})`);
  }

  return response.json();
}

/**
 * Kakao returns coordinates as strings, with `x` as longitude and `y` as
 * latitude — the opposite order to how latitude/longitude is normally written,
 * and an easy source of silently-wrong locations.
 */
function toCoords(doc: { x: string; y: string }): Coords | null {
  const longitude = Number(doc.x);
  const latitude = Number(doc.y);
  if (!isFinite(latitude) || !isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function parseAddressDocs(docs: KakaoAddressDoc[]): PlaceResult[] {
  return docs.flatMap((doc, index) => {
    const coords = toCoords(doc);
    if (!coords) return [];
    const road = doc.road_address?.address_name;
    return [
      {
        id: `addr-${index}-${doc.x},${doc.y}`,
        title: road || doc.address_name,
        subtitle: road ? doc.address_name : (doc.address?.address_name ?? ''),
        coords,
        isPlace: false,
      },
    ];
  });
}

export function parsePlaceDocs(docs: KakaoPlaceDoc[]): PlaceResult[] {
  return docs.flatMap((doc) => {
    const coords = toCoords(doc);
    if (!coords) return [];
    return [
      {
        id: `place-${doc.id}`,
        title: doc.place_name,
        subtitle: doc.road_address_name || doc.address_name,
        coords,
        isPlace: true,
      },
    ];
  });
}

/** Removes duplicates that appear in both the address and place results. */
export function dedupeResults(results: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    // Round to ~1m so trivially different coordinates for the same spot collapse.
    const key = `${r.title}|${r.coords.latitude.toFixed(5)},${r.coords.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Searches Korean addresses and place names together.
 *
 * Both endpoints are queried because shop owners naturally type either — an
 * address ("서울 서초구 방배로 26길 41") or their business name
 * ("맥도날드 방배점"). Place matches are listed first, since someone who typed
 * a business name wants that specific shop.
 */
export async function searchKakao(query: string): Promise<PlaceResult[]> {
  if (!isKakaoConfigured) throw new Error('Kakao API 키가 설정되지 않았어요.');
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // One failing endpoint shouldn't lose the other's results — a pure address
  // string legitimately returns nothing from the place endpoint, and vice versa.
  const [places, addresses] = await Promise.allSettled([
    kakaoFetch('keyword.json', trimmed, 10),
    kakaoFetch('address.json', trimmed, 10),
  ]);

  const results: PlaceResult[] = [];

  if (places.status === 'fulfilled') {
    results.push(...parsePlaceDocs(places.value?.documents ?? []));
  }
  if (addresses.status === 'fulfilled') {
    results.push(...parseAddressDocs(addresses.value?.documents ?? []));
  }

  // If both failed, surface the reason rather than pretending there were no matches.
  if (places.status === 'rejected' && addresses.status === 'rejected') {
    throw places.reason instanceof Error ? places.reason : new Error('주소 검색에 실패했어요.');
  }

  return dedupeResults(results);
}
