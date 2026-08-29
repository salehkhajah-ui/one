# PORT

A premium 3D mobile port management / logistics simulation game built with Unity.

This repository branch is a **standalone Unity project** — it is completely
independent of the `main` branch of this repository (it shares no history and
no files with it).

Current state: **Phase 6 — automation.**

The operations tower now houses **PORT AI**. Tap it to buy automation
modules — priority berthing for urgent ships, cold-first unloading,
crane auto-maintenance, express customs for urgent cargo, auto-accepted
contracts — and watch the port start running itself: the banner tells you
each time the AI acts, and the tower's card counts its interventions. For
everything you haven't automated, the AI manager raises accept/ignore
recommendations (service that worn crane, hire a tractor, upgrade a full
store). The endgame fantasy from the spec begins here: containers barely
stop moving.

On top of **Phase 5 — strategy:**

Cargo now has consequences. Refrigerated goods decay from the moment the
crane lifts them until the new **Cold Store** takes them in, and pay by the
quality that survives. Flagged and hazardous containers detour through a
**customs bay** and dwell under pulsing scanners (express clearance is an
upgrade; crackdown events flag everything). Cranes **wear out** box by box —
service them early or watch one break down mid-shift and pay for the
emergency crew. And the world pushes back: emergency medical ships jump the
berth queue on brutal deadlines, and market surges sweeten the next
manifest.

On top of **Phase 4 — the living world:**

Weather now moves through the port — clear, cloudy, rain, storm, fog — and
it isn't cosmetic: wet ground gleams, waves rise, rain streaks follow the
camera, cranes and tractors slow down, fog halves approach speeds, and a
storm closes the harbor entirely while ships hold at anchor. Harbor tugs
escort every arrival onto the berth, dock workers wander the quay (in yellow
slickers when it rains), forklifts work the yard, and the port has a voice:
a synthesized ambience bed, ship horns on arrival and departure, a soft
chime per delivery — all generated in code, no audio files. The first
docking of each session is a small camera cinematic; touch anything to skip.

On top of **Phase 3 — the management layer:**

The port now runs **two berths in parallel**, each with its own quay crane,
fed in strict arrival order from a three-slot offshore anchorage that
visibly crowds when you fall behind. A **tractor fleet** (2 to start, hire
up to 4) drives a directed road graph — one-way loop, crane load-bay spurs,
a warehouse-door service node, a parking lane — and every vehicle claims the
node ahead before entering it, so queues and congestion chains emerge
physically from arbitration: a full warehouse holds the door, the chain
backs up the spur, cranes starve, ships overstay, deadlines burn, the
anchorage fills. Ships carry real goods against color-coded deadlines
(beacon over each ship), on-time work builds **reputation** which brings
ships in faster, clients offer **contracts** you accept or decline, and
**upgrades** (crane speed, fleet speed, hires, warehouse dispatch) are
bought with buttons on the focus cards — the world is still the interface.
Progress saves as versioned JSON (v2, with v1 migration). Everything is
procedural placeholder geometry built entirely from code (`docs/TDD.md`
§14).

## Requirements

- **Unity 2022.3 LTS or newer** (Unity 6 works). Any render pipeline:
  - Built-in RP: works out of the box (materials use `Standard`).
  - URP: works automatically (materials detect the active pipeline and use
    `Universal Render Pipeline/Lit`). The URP package is already in
    `Packages/manifest.json`.
- No third-party assets, no store packages, no downloads.

## Run it

1. Open this folder as a Unity project (Unity Hub → *Add project from disk*).
2. Let Unity import (first import generates `Library/`, ~1 minute).
3. Open any scene — the default empty `SampleScene` is fine, or create a new
   empty scene (`File → New Scene → Basic`).
4. Press **Play**.

That's it. `GameBootstrap` self-starts via `[RuntimeInitializeOnLoadMethod]`,
disables the default scene camera/light, and constructs the entire port,
ocean, lighting, HUD and simulation at runtime. Nothing needs to be placed in
the scene by hand.

## Controls

| Input (editor / desktop)      | Input (touch)              | Action                    |
|-------------------------------|----------------------------|---------------------------|
| Left-drag                     | One-finger drag            | Pan                       |
| Right-drag                    | Two-finger twist           | Rotate                    |
| Scroll wheel                  | Pinch                      | Zoom                      |
| Click a ship / crane / warehouse / tractor | Tap           | Cinematic focus (tractor focus follows it) |
| Any pan/rotate input          | same                       | Cancels focus             |

## Save file

Progress (balance, clock, counters — never transforms) is written atomically
to `port_save.json` under Unity's `Application.persistentDataPath` on every
shipment settlement and on pause/quit. Delete the file for a fresh port and
a fresh onboarding.

## What you should see (acceptance checklist)

- Ocean with moving waves; day/night cycle (one day ≈ 12 real minutes,
  configurable in `Tuning.cs`); port lamps, admin-building windows and
  warehouse glow switch on at dusk.
- A named ship (*Northern Star*, *Atlas Voyager*, …) announced on the HUD,
  sailing in, easing onto the berth.
- The quay crane travelling on its rails, trolley moving out over the ship,
  spreader lowering on visible cables with gentle sway, locking a container,
  carrying it landside and lowering it onto the waiting tractor.
- The tractor driving the road loop to the warehouse, the warehouse door
  sliding open, cargo received, a reward toast naming the goods, money
  count-up — and the stored container visibly occupying a floor slot.
- The urgency beacon over each ship shifting green → amber → orange → red as
  its deadline shortens; on-time bonus or late penalty (and reputation
  up/down) at settlement.
- Both berths working simultaneously, tractors queuing nose-to-tail behind a
  busy load bay or a full warehouse door, and an offshore-queue counter under
  the clock when ships are waiting at anchor.
- Tap the ship / crane / warehouse / tractor: the camera glides in and a
  contextual card appears (manifest + countdown, status, warehouse fill) —
  with purchase buttons for upgrades and hires where the object offers them.
- Reputation and active-contract lines under the money panel; contract
  offers appearing as an accept/decline panel every few minutes.

## Project layout

```
Assets/Game/
  Core/          Bootstrap, tuning constants, material library, easing, focus targets
  CameraSystem/  Isometric camera rig: pan / rotate / zoom / inertia / tap-focus
  World/         Ocean, day-night cycle, static environment builder, gulls
  Ships/         Ship state machine + procedural ship construction
  Cranes/        Quay crane state machine, trolley/spreader/cable animation
  Vehicles/      Terminal tractor waypoint driving
  Cargo/         Container entity + state
  Buildings/     Warehouse (door animation, cargo intake)
  Economy/       Money + reward events
  Sim/           ShipmentDirector — orchestrates the core loop
  UI/            Code-built HUD (money, clock, banners, toasts)
docs/
  TDD.md         Technical Design Document (read this first)
  MILESTONES.md  Phase plan (visual prototype → automation → expansion)
```

## Tuning

All gameplay/feel constants live in `Assets/Game/Core/Tuning.cs`
(day length, crane speeds, tractor speed, rewards, container count per ship,
camera limits). Change and re-enter Play mode.

## Known limitations at Phase 6

By design (see `docs/MILESTONES.md`): berth order is FIFO until the
priority-berthing AI module is bought (a free-form per-ship dock picker
remains future work), oversized cargo waits for the Phase 7 heavy crane,
tractors don't wear yet (cranes carry the maintenance gameplay), haptics
are a single coarse buzz until a platform plugin replaces `Haptics`, and
audio is synthesized placeholder ambience that recorded sound can replace
clip-for-clip. The architecture for all of these is specified in
`docs/TDD.md`.
