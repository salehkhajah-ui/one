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

## World backend (compete & trade)

The World layer (global leaderboard + open market) runs on Supabase project
`port-game` (`dbluyqukjmirhurvtpkx`, eu-central-1). Tables live in the private
`game` schema with RLS enabled and no anon grants; the client talks only to
SECURITY DEFINER RPCs in `public`:

- `port_register(name)` → `{id, secret, name}` (stored in `localStorage['port-world']`)
- `port_publish(id, secret, stats…)` → `{ok, sold:[…]}` — publishes the
  leaderboard row and settles the caller's sold offers exactly once
- `port_board()` — top 20 ports by value
- `offer_post / offer_list / offer_take / offer_cancel` — the open market
  (bundles fixed server-side: 50 elec, 50 oil, 5 goods; max 3 open offers;
  first taker wins)

The key embedded in the client is the public anon key (safe to ship); the
tables are unreachable without the RPCs. Scores are self-reported — this is
a casual world board, not an anti-cheat system.
