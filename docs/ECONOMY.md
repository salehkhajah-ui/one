# PORT — Economy Catalog (web edition)

Every purchasable element, its price, and its job. Prices are in-game KD
unless marked $. Design goal: a clear ROI ladder where the fastest money
always points at the next expansion — import → process → export.

## Income

| Source | Pays | Notes |
|---|---|---|
| Container delivered to warehouse | KD 300–1,600 / box | By cargo tier (see trade routes) |
| On-time bonus | +25% of the manifest | Beat the ship's deadline |
| Late penalty | −20% of the manifest, −3 rep | Miss it |
| Dispatch truck | KD 100 / box | Automatic, clears storage |
| **Export unit (Factory)** | **KD 400 / unit** | Loaded back onto departing ships |
| **Export unit (Refinery)** | **KD 800 / unit** | And ships take 6 units instead of 4 |
| Rank/port value | — | Cash + investments + throughput + exports + reputation |

## Costs (recurring)

| Item | Cost | Task |
|---|---|---|
| Worker wages | KD 60 / worker / day | Paid at dawn; missing payroll costs 2 reputation |

## Equipment & operations

| Purchase | Price (KD) | Task / effect | Where |
|---|---|---|---|
| Crane speed Lv 1 / 2 / 3 | 2,500 / 5,000 / 10,000 | +25% crane speed per level, per crane | Click a crane |
| Tractor #2 | 6,000 | Second truck on the ring road — biggest early throughput jump | Trade Office |
| Tractor #3 | 12,000 | Third truck | Trade Office |
| Faster dispatch Lv 1 / 2 / 3 | 2,000 / 4,000 / 8,000 | Trucks clear storage faster | Click the warehouse |
| Express dispatch | 150 | Instantly clear 3 storage slots | Click the warehouse |
| Charter a ship | 1,200 | A ship arrives immediately | Trade Office |
| Trade routes tier 2 | 3,500 | Electronics & fresh cargo (KD 780–950/box) | Trade Office |
| Trade routes tier 3 | 8,000 | Luxury cargo (KD 1,300–1,600/box) | Trade Office |

## Manpower

| Purchase | Price (KD) | Task / effect | Where |
|---|---|---|---|
| Hire worker (max 12) | 800 | Adds a worker (wages KD 60/day) | Crew Cabin |
| Assign to crane crew | free | +8% crane speed each | Crew Cabin |
| Assign to warehouse crew | free | +12% dispatch rate each | Crew Cabin |
| Assign to dock crew | free | +15% faster ship docking each | Crew Cabin |

## Expansion ladder (the port physically grows)

| Stage | Price (KD) | Requires | Task / effect |
|---|---|---|---|
| Berth 2 + Crane 2 | 15,000 | — | Work two ships in parallel |
| **Land reclamation + Storage Yard** | 20,000 | Berth 2 | New land strip appears; +9 cargo slots (9 → 18) |
| **Factory** | 45,000 | Storage Yard | Every dispatched box → 1 export unit (stock cap 40) |
| **Refinery** | 90,000 | Factory | Exports pay KD 800/unit and ships load 6/call |

With the Factory built, **ships stop leaving empty**: after unloading,
your crane loads export units aboard and the ship pays export rates on
departure (+1 reputation per shipment). That closes the loop the economy
is tuned around: import pays the bills, exports build the empire.

### The intended speed-run

Tractor #2 (6,000) → crane Lv1 (2,500) → tier 2 routes (3,500) →
Berth 2 (15,000) → Storage (20,000) → tier 3 (8,000) → Factory (45,000)
→ Refinery (90,000). With Fast mode on (a ship every 30s) and both
berths working, each ship is worth roughly KD 5–14k in deliveries and
bonuses plus KD 1.6–4.8k in exports.

## Premium (real money — store tier)

| Item | Price | Effect |
|---|---|---|
| Falcon of Kuwait flagship | $6.99 | Your own ship: premium cargo at 1.35×, never penalizes |
| Mega Port Expansion | $4.99 | 4th anchorage + 3 stacked warehouse slots |
| Harbor Schedule Control | $2.99 | Choose the ship interval yourself (15–180s) |
| Golden Crane Livery | $1.99 | Cosmetic gold cranes |

The web demo unlocks these free (it cannot take payment); the store
builds wire them through platform IAP.

## Next phase (planned): compete & trade

Multiplayer layer where players compete for the best port and trade with
each other. Requires a backend (accounts + shared state):

- **Leaderboard**: rank ports globally by port value; weekly seasons.
- **Player-to-player trade**: list export units on a shared market;
  other ports' ships call at your berth to buy them (their flag, your
  quay), with prices set by supply.
- **Direct trade routes**: pair two players' ports — your exports become
  their imports at a negotiated rate; both sides earn.
- Implementation path: Supabase (auth + Postgres + realtime) behind a
  `TradeProvider` interface, so the single-player economy stays pure.
