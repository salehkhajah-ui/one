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

## Phase 3 — Management ✅ (this branch)

Two berths served in strict arrival order from a three-slot offshore
anchorage, each with its own quay crane working in parallel. The tractor
fleet (2 to start, hire up to 4) drives a **directed road graph** — a
one-way loop with crane load-bay spurs, a warehouse-door service node and a
parking lane — where vehicles claim the node ahead before entering it, so
queues, brake-and-hold chains and gridlock-free congestion emerge from
arbitration, never from scripts (the Domino System at full scale: full
warehouse → tractor holds the door node → the chain backs up the spur →
cranes starve → ships overstay → the anchorage crowds). Upgrades are bought
on the focus cards (crane speed, fleet speed, hires, faster warehouse
dispatch), fictional clients offer throughput **contracts** (accept/decline,
payout + reputation at stake), and **reputation** (0–100) rises with on-time
work, falls with late cargo, and directly drives how fast new ships arrive.
Save format bumped to v2 with a working v1→v2 migration.

Still open from the original Phase 3 sketch: per-ship dock *choice* by the
player (docks are auto-assigned in arrival order today) — lands alongside
the priority controls of Phase 6's PORT AI.

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
