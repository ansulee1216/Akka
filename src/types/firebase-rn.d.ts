export {};

// The Firebase JS SDK's React Native persistence helper (getReactNativePersistence)
// exists and works correctly at runtime, but its TypeScript types aren't picked up
// through the "firebase/auth" package export map due to how Firebase orders its
// conditional exports. This augments the module (note the `export {}` above, which
// makes this file a proper module so the block below merges with the real types
// instead of replacing them) to restore the missing type without @ts-ignore.
// See: https://github.com/firebase/firebase-js-sdk/issues/6032
declare module 'firebase/auth' {
  import type { Persistence } from '@firebase/auth';
  export function getReactNativePersistence(storage: unknown): Persistence;
}
