// ── Kakao Local API ─────────────────────────────────────────────────────────
// Powers Korean address search when a shop owner registers their storefront.
//
// The phone's built-in geocoder handles Korean addresses poorly — it struggles
// with 도로명주소 (road-name addresses) in particular. Kakao's Local API
// understands both 도로명주소 and 지번주소, and can also find places by
// business name.
//
// How to get a key (free, no credit card — see KAKAO_SETUP.md for screenshots):
//   1. Sign up at https://developers.kakao.com
//   2. 내 애플리케이션 > 애플리케이션 추가하기 — create an app
//   3. Open the app > 앱 키 — copy the REST API 키 (not JavaScript or Native)
//   4. Paste it below
//
// Until it's filled in, address search falls back to the phone's built-in
// geocoder, which mostly works for simple 동-level addresses. The GPS button
// is unaffected and always works.

export const KAKAO_REST_API_KEY = 'REPLACE_ME';

export const isKakaoConfigured = KAKAO_REST_API_KEY !== 'REPLACE_ME' && !!KAKAO_REST_API_KEY;
