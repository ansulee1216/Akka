# Akka — mobile app prototype

A working React Native (Expo) prototype of a "Too Good To Go for Korea" app.

Built for **Expo SDK 54**, to match the Expo Go app version. If Expo Go ever reports an incompatible SDK version again (check Expo Go's Profile tab), tell Claude the number shown there and it'll realign the project to match.

As of this version, the app needs a real (free) Firebase project to run — see "Connecting Firebase" below. Before this, it ran on fake in-memory data with no login; now it has real accounts and a shared database so multiple phones can use it at once.

## How to run it on your own phone (no Mac, no Xcode needed)

1. Install [Node.js](https://nodejs.org) (LTS version) on your computer, if you don't have it. This gives your computer the tools to run the app's code.
2. Install the **Expo Go** app on your phone from the App Store or Play Store.
3. Open a **terminal** — this is just a window where you type commands instead of clicking buttons. It's how you'll tell your computer to start the app.
   - **Mac:** press `Cmd + Space`, type `Terminal`, hit Enter.
   - **Windows:** press the Windows key, type `PowerShell` (or `cmd`), hit Enter.
4. Navigate into this project folder using the `cd` ("change directory") command, then start the app. **Type or paste one line at a time and press Enter after each — don't paste all three at once:**
   ```
   cd ~/Documents/akka
   npm install
   npx expo start
   ```
   - `npm install` downloads everything the app needs. Run it once, and again whenever dependencies change (it takes a minute or two). Wait for it to finish before the next line.
   - `npx expo start` needs to run every time you want to open the app. See the section below if the QR code won't connect.
5. A QR code will appear in the terminal. Scan it with your phone's camera (iOS) or the Expo Go app (Android). The app opens live on your phone.
6. Any code changes you (or I) make will show up instantly — no rebuild needed. Just re-run `npx expo start` if it's not already running.

## When the QR code won't connect

The phone loads the app from your computer over the network, so the two have to be able to reach each other. Most connection problems come down to that.

**First, check what address Metro printed.** It says `Metro waiting on exp://SOMETHING:8081`. That address is the whole story:

| What you see | What it means |
|---|---|
| `192.168.x.x` or `10.x.x.x` | Normal home Wi-Fi. Should work — if it doesn't, see the checklist below. |
| `172.20.10.x` | iPhone hotspot. Should work. |
| `192.0.0.x` | The iPhone-USB housekeeping link, **not** a real network. Won't work. |
| `169.254.x.x` | Self-assigned — your computer joined a network but never got an address. Won't work. |
| something `.exp.direct` | Tunnel mode. |

**Checklist for normal Wi-Fi:**

- Phone and computer on the **same** network — not one on Wi-Fi and the other on cellular, and not a "guest" network, which usually blocks devices from seeing each other.
- Force-quit Expo Go and scan the **fresh** QR code. Tapping an entry under "Recently opened" reuses an old address that's no longer live — that's what produces `ERR_NGROK_3200` / "endpoint is offline".
- If changes aren't appearing, add `-c` to clear the bundler cache: `npx expo start -c`.

**If the address looks wrong**, Metro may have picked the wrong network interface (common with VPNs, USB-connected phones, or Ethernet adapters). List what's actually available:

```
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Pick the sensible-looking one and force it:

```
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.42 npx expo start
```

**Last resort — tunnel mode:**

```
npx expo start --tunnel
```

This routes through the internet instead of your local network, so it works even when the two devices can't see each other. It's slower to start and occasionally flaky (it relies on a third-party service called ngrok), so prefer plain `npx expo start` when your network allows it.

## Connecting Firebase (required to run the app now)

The app needs a real backend so that a restaurant's listings show up on a buyer's phone too, not just on the one phone that created them. That backend is [Firebase](https://firebase.google.com) (free for this scale of use).

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project (any name is fine).
2. Inside the project, click the "</>" (web app) icon to register a web app. This is normal even though Akka is a mobile app — Firebase's JS SDK config works the same regardless of platform.
3. Firebase will show you a config object with values like `apiKey`, `authDomain`, `projectId`, etc. — this appears automatically right after you register the web app. Copy each value.
   - If you ever need to find this screen again later (e.g. you closed the tab): click the **gear icon** next to "Project Overview" (top left) → **Project settings** → scroll to **"Your apps"** → click your web app (the one with the `</>` icon) → the config is under **"SDK setup and configuration."**
4. Open `src/config/firebaseConfig.ts` in this project and paste your values in, replacing the `REPLACE_ME` placeholders.
5. Back in the Firebase console, go to **Databases & Storage → Authentication → Get started**, and enable the **Email/Password** sign-in provider. (Firebase renamed this menu; older guides call it "Build.")
6. Go to **Databases & Storage → Firestore Database → Create database**. Choose **Standard edition**, database ID `(default)`, and location `asia-northeast3 (Seoul)` — the location can't be changed later without recreating the database.
7. Open the **Rules** tab there, paste in the contents of `firestore.rules` from this project, and click **Publish**. Without this, the app will report "Missing or insufficient permissions."
8. Go to **Databases & Storage → Storage → Get started** to enable file storage (needed for photo uploads). Then open its **Rules** tab, paste in the contents of `storage.rules` from this project, and **Publish**.
9. Restart `npx expo start --tunnel` and reload the app. You should now see a login/sign-up screen.

If you skip this setup, the app will show a clear "Firebase setup needed" screen instead of crashing, so you'll always know what's missing.

## What's in here

- Real accounts. On first launch you sign up as either a buyer or a "사장님" (restaurant owner) — that choice is now tied to your account, made once at sign-up.
- Buyer flow: browse today's discounted listings → view details → reserve → get a pickup code.
- Seller flow: register a restaurant → create a surplus listing → watch reservations come in live → confirm pickup by code.
- Distance. Sellers pin their shop's location when registering (GPS button, or looked up from the address). Buyers who allow location see listings sorted nearest-first with distances on each card; those who decline still get the full list, just newest-first.
- Photos. Sellers can take or choose a photo for each listing (and their storefront); images are resized and compressed on-device before upload to keep things fast. Listings without a photo fall back to an icon. Photos can be added or changed on all four seller screens (create/edit listing, shop setup/edit). `isStorageEnabled` in `src/config/firebaseConfig.ts` acts as a kill switch that hides the pickers without affecting photos already uploaded.
- Data (restaurants, listings, orders) lives in Firestore and syncs in real time across every phone using the app — a listing a restaurant owner creates shows up immediately for buyers browsing on a different phone.
- `firestore.rules` and `storage.rules` lock down who can read/write what (e.g. only a restaurant's owner can edit its listings; buyers can only see their own orders; uploads must be images under 8MB). See `PROJECT_PLAN.md` for the fuller data model and roadmap (Toss Payments, app store submission).

## Project structure

```
src/
  screens/auth/     login / sign-up
  screens/buyer/    buyer-facing screens
  screens/seller/   seller-facing screens
  screens/shared/   loading, setup-needed, and profile-recovery screens
  components/       reusable UI pieces (e.g. the photo picker)
  navigation/       React Navigation stacks/tabs
  context/          app-wide state, wired to Firebase
  config/           firebaseConfig.ts — paste your Firebase project's values here
  services/         Firebase Auth, Firestore, and image upload functions
  data/             old demo data (unused now, kept for reference)
  theme/            colors, spacing, typography
  types/            shared TypeScript types
firestore.rules     Firestore security rules
storage.rules       Firebase Storage security rules
```
