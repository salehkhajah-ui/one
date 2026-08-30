# Build & deploy

`index.html` is the single-file source of truth (inline game script).

Production is served from two Vercel projects to keep individual deploy
payloads small:

- **port-harbor-game** → https://port-harbor-game.vercel.app
  - `index.html` — same file as here, except the main inline `<script>` block
    is replaced by `<script src="https://port-harbor-game-assets.vercel.app/game.js"></script>`
  - `sw.js`, `manifest.webmanifest`, icons
- **port-harbor-game-assets** → https://port-harbor-game-assets.vercel.app
  - `game.js` — the main inline script block, extracted verbatim (byte-for-byte)

Split rule: the first `<script>` (no `src`) block in `index.html` becomes
`game.js`; the tiny service-worker-registration script stays inline. `sw.js`
precaches the assets URL alongside the three.js CDN file, so the installed PWA
works offline. Bump the `port-vN` cache name in `sw.js` on every deploy;
clients pick up a new version after two reloads (service-worker refresh).
