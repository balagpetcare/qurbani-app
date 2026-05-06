# PWA maskable PNG icons — TODO

**Status:** Not blocking staging. The app ships **`/icon.svg`** (see `src/app/icon.svg`) and `public/manifest.webmanifest` references it for `any` and `maskable` purposes.

**Before Play Store–style distribution or best “Add to Home Screen” tiles on all Android devices:**

1. Export branded assets:
   - **192×192** PNG — `purpose: "any"`
   - **512×512** PNG — `purpose: "maskable"` (safe zone per [maskable icon spec](https://web.dev/maskable-icon/))
2. Place files under `public/icons/` (e.g. `pwa-192.png`, `pwa-512-maskable.png`).
3. Update `public/manifest.webmanifest` `icons` array to list both PNGs (keep or drop SVG per QA on target devices).
4. Optionally add `apple-touch-icon` PNG **180×180** in root layout metadata for iOS.

Do **not** commit placeholder PNGs that impersonate a final brand — use real design assets only.
