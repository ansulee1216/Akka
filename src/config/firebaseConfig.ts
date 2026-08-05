// ── Paste your Firebase project's config here ──────────────────────────────
// How to get these values:
//   1. Go to https://console.firebase.google.com and create a project (free).
//   2. Inside the project, click the "</>" (web app) icon to register a web app.
//      (Yes, even though this is a mobile app — Firebase's JS SDK config works
//      the same way regardless of platform.)
//   3. Firebase will show you an object that looks like the one below. Copy
//      each value into the matching field here.
//   4. In the left sidebar, go to Build > Authentication > Get Started, and
//      enable the "Email/Password" sign-in provider.
//   5. In the left sidebar, go to Build > Firestore Database > Create Database.
//      Start in "test mode" for now (we'll lock it down properly using the
//      firestore.rules file in this project once you're ready to go live).
//
// Until you fill these in with real values, the app will show a clear error
// screen instead of crashing, so you'll know exactly what's missing.

export const firebaseConfig = {
  apiKey: 'AIzaSyBiblUMJkyBxu-yycOoM8pqn0wZhtH5Qf0',
  authDomain: 'akka-50207.firebaseapp.com',
  projectId: 'akka-50207',
  storageBucket: 'akka-50207.firebasestorage.app',
  messagingSenderId: '48120903189',
  appId: '1:48120903189:web:5c5e46b18a4d427828401c',
};

export const isFirebaseConfigured =
  firebaseConfig.apiKey !== 'REPLACE_ME' && firebaseConfig.projectId !== 'REPLACE_ME';

// ── Photo uploads ───────────────────────────────────────────────────────────
// Firebase Storage (where photos live) requires the paid Blaze plan with a
// billing account, even though usage at this scale would cost ~$0. Until you
// enable it, photo pickers stay hidden so nobody hits an upload error.
//
// To turn photos on later:
//   1. Firebase Console > Databases & Storage > Storage > upgrade + enable.
//   2. Paste storage.rules into its Rules tab and Publish.
//   3. Flip this to true.
// All the upload code is already written and waiting.
export const isStorageEnabled = false;
