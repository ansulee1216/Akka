# Akka — Project Plan
*"Too Good To Go" for Korea*

> For current status, open decisions and what's outstanding, see **PROJECT_STATE.md**.
> This file is the longer-term plan and data model.

## 1. What we're building

Two-sided marketplace app: restaurants ("sellers") list surplus food near closing time at a discount; nearby users ("buyers") reserve it in-app and pick it up in person. One app, two roles — a user signs up as either a buyer or a restaurant owner, and that choice is tied to their account.

## 2. Tech stack (locked in)

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native + Expo (TypeScript), **SDK 54** | One codebase for iOS + Android. Expo lets you test on your own phone instantly via Expo Go, without a Mac, Xcode, or a developer account. SDK 54 specifically, to match the installed Expo Go — see PROJECT_STATE.md. |
| Backend | Firebase | Auth, database (Firestore), and file storage all managed — no server to run ourselves. |
| Maps | Distance sorting first; map view later | Google Maps on Android needs its own billing account, so the first pass sorts by distance without rendering a map. Korean address search/geocoding will use Kakao, whose POI data is far better here than Google's. |
| Payments | Phase 1: pay at pickup (cash/card in person). Phase 2: Toss Payments in-app checkout. | Pay-at-pickup ships first since it needs zero payment infrastructure. The data model already carries `paymentMethod` so Toss slots in later without a rebuild. |

## 3. Data model (Firestore)

**users**
`uid, email, displayName, role ("buyer" | "seller"), createdAt`

**restaurants** (one per seller business)
`restaurantId, ownerUid, name, category, address, latitude, longitude, phoneNumber, photoUrl?, isVerified, createdAt`

**listings** (a "surprise bag" of surplus food, tied to one day)
`listingId, restaurantId, title, description, photoUrl?, originalPrice, discountedPrice, quantityTotal, quantityRemaining, pickupWindowStart ("HH:mm"), pickupWindowEnd ("HH:mm"), status ("active" | "soldOut" | "expired" | "cancelled"), createdAt`

**orders** (a buyer's reservation of N units from a listing)
`orderId, listingId, restaurantId, buyerUid, quantity, totalPrice, paymentMethod ("pickup" | "toss"), pickupCode, status ("reserved" | "pickedUp" | "noShow" | "cancelled"), createdAt`

Notes:
- `expired` is currently derived on-device from `createdAt` + `pickupWindowEnd` rather than written to the document. See `src/utils/listing.ts`.
- No composite indexes are needed yet, because queries filter in Firestore and sort in JavaScript. Revisit if order volume grows enough to need pagination.
- A geohash field will be needed for true "listings near me" queries at scale; the first pass filters client-side.

## 4. Core user flows

**Buyer:** open app → browse active listings (sorted by distance, once that lands) → tap a listing → see photo, discount, pickup window, remaining quantity → reserve N units → get a pickup code → show it at the restaurant → seller confirms.

**Seller:** register restaurant → post a listing for today (price, quantity, pickup window) → watch reservations arrive live → verify pickup by code, or mark a no-show. Listings can be edited, paused, resumed or deleted.

## 5. Roadmap

1. ~~**Phase 1 — Working prototype**~~ ✅ Expo scaffold, navigation, buyer and seller flows on in-memory demo data.
2. ~~**Phase 2 — Real backend + login**~~ ✅ Firebase Auth and Firestore wired up; live sync across devices; security rules; full listing lifecycle (expiry, edit/delete, cancel, no-show).
3. **Phase 3 — Discovery (current):** location and distance sorting, then UI/UX polish, search/filters/favourites, ratings. Photo upload is built but waiting on Firebase Storage, which needs the paid plan.
4. **Phase 4 — Payments:** Toss Payments in-app checkout. Requires a Korean business registration and a PG contract — paperwork on the owner's side, not code.
5. **Phase 5 — Store submission:** Apple Developer Program ($99/yr) and Google Play Console ($25 once), then build and submit via EAS Build. Also requires a custom dev build, which unlocks push notifications and Google sign-in.

## 6. What the owner needs to provide

- ~~A Firebase project~~ ✅ done (`akka-50207`, free Spark plan)
- **If/when photos are wanted:** upgrading Firebase to the Blaze plan (credit card required; realistically $0 at this scale, but no hard spending cap — set a budget alert)
- **Before store submission:** Apple and Google developer accounts
- **Before in-app payment:** Korean business registration and a Toss merchant account

## 7. Where things live

```
~/Documents/akka          the project (also on GitHub, private repo "Akka")
  PROJECT_STATE.md        current status, decisions, open items  ← start here
  PROJECT_PLAN.md         this file
  README.md               how to run it, Firebase setup steps
  GITHUB_SETUP.md         pushing to GitHub, token handling
  firestore.rules         database security rules
  storage.rules           photo storage security rules
  src/                    app code
```
