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

## Phase 2 — Gameplay loop

Cargo identity (`CargoTypeSO`: goods, temperature, decay, value), deadlines
with green/amber/red urgency shown in-world, shipment cards on focus,
warehouse capacity, ship schedule (ETAs), save system (versioned JSON),
first-60-seconds onboarding sequence.

## Phase 3 — Management

Multiple ships + offshore queue (anchored, visible), dock assignment, second
crane, tractor fleet + road graph with intersections and queues (congestion
emerges physically — the Domino System), equipment upgrades, contracts,
reputation.

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
