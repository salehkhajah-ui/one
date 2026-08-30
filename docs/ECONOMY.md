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
| Delivery van run | KD 100 / box | Vans carry stored boxes to the City Depot |
| **Export unit (Factory)** | **KD 400 / unit** | Loaded back onto departing ships |
| **Export unit (Refinery)** | **KD 800 / unit** | And ships take 6 units instead of 4 |
| Rank/port value | — | Cash + investments + throughput + exports + reputation |

## Costs (recurring)

| Item | Cost | Task |
|---|---|---|
| Worker wages | KD 60 / worker / day | Paid at dawn; missing payroll costs 2 reputation |
| Electricity +100 | KD 800 | Substation. Powers the cranes; at 0% they run at 45% speed. Burn scales with berths and vans. Ends when the Power Plant is built |
| Oil +100 | KD 600 | Substation. Fuels tractors and vans; at 0% they crawl. Burn scales with the vehicle fleet. Ends when the Refinery is built |

## Equipment & operations

| Purchase | Price (KD) | Task / effect | Where |
|---|---|---|---|
| Crane speed Lv 1 / 2 / 3 | 2,500 / 5,000 / 10,000 | +25% crane speed per level, per crane | Click a crane |
| Tractor #2 | 6,000 | Second truck on the ring road — biggest early throughput jump | Trade Office |
| Tractor #3 | 12,000 | Third truck | Trade Office |
| Faster deliveries Lv 1 / 2 / 3 | 2,000 / 4,000 / 8,000 | Vans drive faster | Click the warehouse |
| Delivery van #2–#5 | 4,000 / 6,000 / 9,000 / 12,000 | Each van runs boxes to the City Depot in parallel | City Depot |
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
| **Factory** | 45,000 | Storage Yard | Every delivered box → 1 export unit (stock cap 40) |
| **Power Plant** | 60,000 | Storage Yard | Generates all electricity — power purchases end |
| **Refinery** | 90,000 | Factory | Exports pay KD 800/unit, ships load 6/call — and fuels the port, oil purchases end |

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

## Performance report (free, in-game)

The **Report** button scores six sectors live — Berthing & docking,
Cargo flow, Trade income, Energy & fuel, Crew, Reputation — each with a
status pill (On track / Watch / Fix this) and a comment: concrete advice
when a sector underperforms, and how to keep it up when it's healthy.

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
