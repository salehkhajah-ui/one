# PORT

A premium 3D mobile port management / logistics simulation game built with Unity.

This repository branch is a **standalone Unity project** — it is completely
independent of the `main` branch of this repository (it shares no history and
no files with it).

Current state: **Phase 2 — the gameplay loop on top of the living port.**

Named ships now carry real goods (strawberries from Valencia, smartphones
from Shenzhen…) against a deadline. A floating beacon over each ship carries
its urgency into the world — green to red, pulsing when critical. The quay
crane unloads onto a terminal tractor, the warehouse has a finite floor that
distribution trucks drain on a cycle — when it's full the tractor waits, the
crane waits, the ship waits, and the deadline burns (the first domino). A
second ship is announced while the first is being worked and visibly holds
at the offshore anchorage until the berth frees. On-time shipments pay a
bonus, late ones a penalty; tap anything for a contextual card (manifest,
countdown, warehouse fill); progress saves to versioned JSON and greets you
back. First run has a single onboarding beat: tap the crane to begin.
Everything is procedural placeholder geometry — clean boxes and cylinders in
a pastel-industrial palette — built entirely from code so the loop could be
proven before any art exists (see `docs/TDD.md` §14).

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
- The urgency beacon over the ship shifting green → amber → orange → red as
  its deadline shortens; on-time bonus or late penalty at settlement.
- While the first ship is worked: the next ship announced (schedule line
  under the clock) and holding at the offshore anchorage until the berth
  frees.
- Tap the ship / crane / warehouse / tractor: the camera glides in and a
  contextual card appears (manifest + countdown, status, warehouse fill).

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

## Known limitations at Phase 2

By design (see `docs/MILESTONES.md`): one dock / one crane / one tractor
(the deeper fleet + road graph is Phase 3), no weather or audio yet
(Phase 4), refrigeration is identity-only until the cold chain lands in
Phase 5, no upgrades or contracts yet. The architecture for all of these is
specified in `docs/TDD.md`.
