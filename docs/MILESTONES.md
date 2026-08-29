# PORT — Milestone Plan

Feature-by-feature, in phases. Nothing advances until the previous phase's
loop *feels good*. The first objective was deliberately narrow: **60 seconds
of gameplay beautiful enough to keep watching** — the ship → dock → crane →
container → tractor → warehouse sequence.

## Phase 1 — Visual prototype ✅ (this branch)

Small 3D port: ocean, quay, container yard, warehouse, one ship, one quay
crane, one terminal tractor, containers, isometric camera (pan/rotate/zoom/
tap-focus/inertia), day-night cycle with port lights, gulls, procedural
placeholder art, HUD (money/clock/banners/toasts), full working loop with
money rewards. Acceptance list in `README.md`.

## Phase 2 — Gameplay loop ✅ (this branch)

Cargo identity (`CargoCatalog`: 10 goods with origin, value, refrigeration
flag — plain data records today, `CargoTypeSO` when authored content
arrives), deadlines with green/amber/orange/red urgency carried in-world by
a floating beacon over each ship (pulsing when critical), contextual focus
cards (ship manifest + countdown, warehouse fill, crane/tractor status),
warehouse capacity with a dispatch drain — the first domino: a full floor
stalls the tractor → crane → ship → deadline — an inbound-ship schedule
line, on-time bonuses and late penalties, versioned JSON save
(balance/clock/counters, atomic write), and a first-run onboarding beat
("tap the crane to begin unloading"). Pulled forward from Phase 3: a second
ship is announced while the first unloads and **visibly holds at the
offshore anchorage** until the berth frees.

## Phase 3 — Management

Deeper offshore queue (multiple anchored ships), dock assignment, second
crane, tractor fleet + road graph with intersections and queues (congestion
emerges physically — the Domino System at full scale), equipment upgrades,
contracts, reputation.

## Phase 4 — World

Weather (rain/storm/fog with gameplay modifiers), ambient workers and
forklifts, tugboat docking assists, audio direction (ambient bed, horn
moments, minimal music), cinematic ship-arrival sequence with skip, haptics.

## Phase 5 — Strategy

Customs, refrigerated chain, special cargo (hazmat, oversized, medical),
equipment wear/breakdowns/maintenance, random events + emergency shipments.

## Phase 6 — Automation

PORT AI: rule builder (IF cargo type/deadline/capacity THEN route/priority),
AI manager recommendations (accept/modify/ignore), automated equipment. The
visible reward: the port flows without stopping.

## Phase 7 — Expansion

Terminal expansion with visible construction, larger ship classes, rail,
air cargo, green-port systems, port value metric, second port / global map.
Multiplayer-ready architecture stays a constraint, not an MVP feature.
