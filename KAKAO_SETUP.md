# Setting up Kakao address search

Akka uses Kakao's Local API to search Korean addresses when a shop owner registers their storefront. This takes about five minutes and is free — no credit card.

**Until you finish this, nothing breaks.** Address search falls back to the phone's built-in geocoder, which handles simple 동-level addresses but struggles with 도로명주소. The GPS button ("현재 위치 사용") works regardless and is always the most accurate option.

---

## Why Kakao rather than the phone's built-in search

Korea has two parallel address systems: the older lot-based 지번주소 (방배동 851-1) and the road-name 도로명주소 (방배로26길 41), official since 2014. Apple's and Google's built-in geocoders were designed around Western street addresses and handle Korean ones inconsistently — often managing one format but not the other.

Kakao's Local API understands both, and can also find shops by business name, so an owner can type "맥도날드 방배점" instead of an address.

---

## Step 1 — Create a Kakao developer account

1. Go to [developers.kakao.com](https://developers.kakao.com).
2. Click **로그인** (top right) and sign in with a Kakao account, or create one.
3. Accept the developer terms when prompted.

## Step 2 — Create an application

1. Click **내 애플리케이션** in the top menu.
2. Click **애플리케이션 추가하기**.
3. Fill in:
   - **앱 이름:** `Akka`
   - **사업자명:** your name is fine while testing
4. Tick the agreement box and click **저장**.

## Step 3 — Copy the REST API key

1. Click your newly created **Akka** app.
2. In the left sidebar, choose **앱 키**.
3. You'll see four keys. Copy the **REST API 키**.

> **This is the step people get wrong.** There are also 네이티브 앱 키, JavaScript 키 and Admin 키. Only the **REST API 키** works here — the others produce a 401 error. If you see "Kakao API 키가 올바르지 않아요" in the app, this is almost certainly why.

## Step 4 — Paste it into the project

1. Open `src/config/kakaoConfig.ts`.
2. Replace `REPLACE_ME` with your key, keeping the quotes:

```ts
export const KAKAO_REST_API_KEY = 'your-key-here';
```

3. Save, then restart the app:

```
cd ~/Documents/akka
npx expo start --tunnel
```

## Step 5 — Try it

Register a shop, tap **주소로 찾기**, and type an address or a shop name. Results appear as you type; tap one to set the location.

---

## Notes

**Quota.** Kakao's free tier allows a generous number of calls per day — far more than you'll use while testing. Searches are debounced (sent when you pause typing, not on every keystroke) to stay well inside it. Check current limits in the Kakao console under your app's usage page.

**The key ships inside the app.** Like your Firebase keys, this key travels with every installed copy and could be extracted by someone determined. The consequence is limited: someone could consume your daily search quota, but no money is involved since there's no card attached. This is different from a payment secret (e.g. Toss), which must never go near the app.

You can restrict usage in the Kakao console under **플랫폼**, where you register your app's bundle identifier (`com.akka.app`) so the key only works from your app.

**Not committing the key?** It's committed to your repo like the Firebase config, which is fine for a private repo. If you later make the repository public, move it to an environment variable first — ask Claude when you get there.

---

## Troubleshooting

**"Kakao API 키가 올바르지 않아요"** — you used the wrong key type. Go back to 앱 키 and copy the **REST API 키** specifically.

**"검색 결과가 없어요"** — try a shorter query. `방배로 26길` usually works better than a full address with a building number.

**Results still look wrong** — use **현재 위치 사용** while standing in the shop. GPS is more accurate than any address lookup.
