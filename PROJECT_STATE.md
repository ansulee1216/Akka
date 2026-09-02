# Akka — current state and handoff notes

Written so a new Claude session (or another developer, or you in three months) can pick this up without re-deriving everything. Update it as things change.

**Last updated:** August 2026

---

## What this is

"Too Good To Go" for Korea. Restaurants post surplus food at a discount near closing time; buyers reserve it in the app and collect it in person.

The owner (ansu) is not a developer. Explain things plainly, avoid unexplained jargon, and give exact click-by-click or copy-paste steps for anything outside the code — console UIs, terminal commands, account setup.

---

## Where things live

- **Code:** `~/Documents/akka` (this folder)
- **GitHub:** private repo `Akka` under the owner's account
- **Firebase project:** `akka-50207`, Spark (free) plan

---

## Stack

| Layer | Choice |
|---|---|
| App | React Native + Expo **SDK 54**, TypeScript |
| Backend | Firebase — Auth (email/password) + Firestore |
| Photos | Firebase Storage — **code written, currently disabled** |
| Payments | None yet. Pay-at-pickup only |

Testing is via **Expo Go** on the owner's iPhone, over `npx expo start --tunnel`.

---

## What works today

**Buyer:** sign up → browse active listings → view detail → reserve → get a 4-digit pickup code → cancel while the pickup window is still open.

**Seller:** sign up → register restaurant (setting its location by GPS or address lookup) → post a listing → edit / pause / resume / delete it → see reservations live → verify pickup by code → mark no-shows.

Listings are sorted nearest-first with distances shown, once the buyer grants location.

Everything syncs live across devices via Firestore listeners. Reservations use a Firestore transaction so stock cannot oversell.

---

## Decisions worth knowing

**Expo SDK is pinned to 54.** Expo Go only supports one SDK at a time, and the owner's build is 54. Upgrading the project without checking their Expo Go version will lock them out of running it. Always confirm first.

**Firestore is forced into long-polling** (`experimentalForceLongPolling` in `src/services/firebase.ts`). Without it, React Native reports "client is offline" despite a working connection. Don't remove it.

**The user profile is a live listener, not a one-time read** (`subscribeToUserProfile`). During sign-up, Firebase authenticates the user a moment *before* the profile document finishes writing — a one-shot read races that write and wrongly concludes the profile is missing. There's also a 6-second grace period before declaring a profile genuinely absent, and a `CompleteProfileScreen` to repair accounts that really are missing one.

**Queries filter in Firestore but sort in JavaScript.** Two reasons: combining `where` with `orderBy` on a different field needs hand-created composite indexes, and documents whose `serverTimestamp()` hasn't synced yet get dropped from `orderBy` results entirely — making a just-created listing briefly vanish. See the comments in `firestoreService.ts`.

**Listing expiry is computed on-device** (`src/utils/listing.ts`), not stored. Flipping a status field on a schedule would need a Cloud Function, which requires the paid Blaze plan. Trade-off: expiry follows each phone's clock. Logic is tested — including midnight-crossing pickup windows.

**Photo upload is live.** The project is on Blaze, the Storage bucket is in **us-central1** and `storage.rules` is deployed. The bucket is US rather than Korea because only us-central1/us-east1/us-west1 qualify for Cloud Storage's Always Free tier; the cost of that is roughly 100–200ms of extra latency on a Korean user's first load of each image, after which it's cached. Firestore stays in asia-northeast3, which is what actually matters — that's the round trip on every reservation.

`isStorageEnabled` in `src/config/firebaseConfig.ts` remains as a kill switch: setting it to `false` hides every photo picker without breaking anything, and existing photos still display.

Photos are resized to 1200px wide and JPEG-compressed at 0.7 before upload, so a ~4MB camera photo lands at roughly 200KB.

**Editing never re-uploads an unchanged photo.** `photoAction()` in `imageService.ts` distinguishes an untouched remote URL from a freshly picked `file://` URI. Without it, every save of an edited listing would upload a duplicate copy and bill for it. This is unit-tested, including that five consecutive saves without touching the photo perform zero uploads.

**A budget alert is set in Google Cloud billing.** Blaze has no hard spending cap — it only alerts. At this scale any alert at all means something is wrong (a runaway upload loop, or abuse), so it's worth investigating same-day rather than ignoring.

**Location permission is never requested on launch.** `useBuyerLocation` only *checks* existing permission on mount; the system dialog appears solely when the user taps the prompt on the browse screen. Asking before someone has seen what the app does is the fastest route to a permanent "Don't Allow", which on iOS can't be re-prompted — only fixed in Settings. Browsing works fully without location, falling back to newest-first.

**Restaurant coordinates are set at registration**, via a GPS button or an address search modal. Before this, every shop was hardcoded to Seoul City Hall. Any restaurant registered before that change still has those fake coordinates and will show nonsense distances — re-register it or edit the document in the Firestore console.

**Address search uses Kakao's Local API** (`kakaoService.ts`), not the phone's geocoder. Apple's geocoder handles Korean 도로명주소 badly and is rate-limited; it's kept only as a fallback when no Kakao key is configured. See `KAKAO_SETUP.md`. Note Kakao returns `x` as **longitude** and `y` as **latitude** — reversed from how coordinates are usually written, and an easy way to silently place every shop in the wrong hemisphere. There's a test covering exactly this.

**Distances are straight-line** (haversine), not walking distance. A shop 200m away across a river may be a 2km walk. Fine for ordering a list; don't present it as travel time. The math is unit-tested against an independently derived formula.

**Firebase config keys are committed on purpose.** They ship inside every app build and aren't secrets; the security rules are what protect data. Genuine secrets (Toss keys, admin service accounts) must never be committed.

---

## Outstanding

**Needs the owner to act:**
- Get a free Kakao REST API key and paste it into `src/config/kakaoConfig.ts` — see `KAKAO_SETUP.md`. Address search falls back to the phone's geocoder until then.
- Publish the current `firestore.rules` in the Firebase console. The `orders` rules changed (split `get` / `list`) and the seller's reservations screen may throw a permissions error until it's republished. They were blocked on finding the Publish button — the console UI keeps changing, so ask for a screenshot. Deploying via the Firebase CLI is the fallback.
- Run `npm install` in `~/Documents/akka` (node_modules wasn't copied over, plus two newer packages).

**Next up:** ratings/reviews, onboarding and empty-state polish. A map view is deliberately deferred — Google Maps on Android needs its own billing account. Push notifications need a custom dev build; they no longer work in Expo Go.

**Deferred on purpose — seller weekly trends.** The dashboard shows today only, so a shop deciding how much to list tonight has no history to judge by (last Tuesday sold out in 20 minutes; Wednesday half went to waste — the app forgets both overnight). The fix is small: group orders by day instead of filtering to today, and show last 7 days of listed-vs-sold plus revenue. Parked until a shop is doing real volume, since a week of near-empty bars teaches nobody anything. This is roughly what 쿠팡이츠 gives merchants, and it's what turns the dashboard from reporting into planning.

**Note on 매출.** The revenue figure counts orders actually collected today — not reserved ones, since with pay-at-pickup the money isn't real until someone walks in. Unlike 배민/쿠팡이츠, this is *not* a settlement figure; no money flows through Akka. When Toss payments land, sellers will expect the settlement view (owed, paid, commission taken) and that needs designing properly rather than growing this number into it.

**Before any public launch:**
- Harden `firestore.rules`. Any signed-in user can currently adjust a listing's `quantityRemaining` (that's how client-side reservations work), and `allow list` on orders is broad. Both want Cloud Functions.
- Toss Payments needs a Korean business registration and a PG contract — paperwork, not code.
- Store submission needs an Apple Developer account ($99/yr) and Google Play Console ($25 once).

---

## Running it

```
cd ~/Documents/akka
npm install          # first time, or after dependency changes
npx expo start --tunnel
```

Scan the QR with Expo Go. Use `--tunnel` — plain LAN mode often fails when the phone and Mac aren't on the same network. Add `-c` to clear the bundler cache if changes aren't showing up.

Saving work:
```
git add -A
git commit -m "what changed"
git push
```

---

## Conventions

- User-facing copy is in **Korean**; code, comments and docs in **English**.
- Colours, spacing and type come from `src/theme/theme.ts` — no hardcoded values.
- Firestore access goes through `src/services/`, never directly from a screen.
- Every async action needs a visible loading state and a human-readable Korean error.
- Comments explain *why*, especially for the non-obvious workarounds above.
- Verify changes with `npx tsc --noEmit` and a Metro bundle before calling them done.
