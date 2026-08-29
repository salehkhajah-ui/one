# PORT

A premium 3D mobile port management / logistics simulation game built with Unity.

This repository branch is a **standalone Unity project** — it is completely
independent of the `main` branch of this repository (it shares no history and
no files with it).

Current state: **Milestone 1 — the living miniature port loop.**

A ship arrives from the open sea, tugless for now, and docks. A quay crane
lifts containers off the deck one by one, a terminal tractor carries each one
along the port road to the warehouse, the warehouse door opens and swallows
the cargo, and you earn money. The sun moves, night falls, the port lights
come on, gulls circle, the ocean moves. Everything is procedural placeholder
geometry — clean boxes and cylinders in a pastel-industrial palette — built
entirely from code so the loop could be proven before any art exists
(see `docs/TDD.md` §14, Placeholder Asset Strategy).

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

## What you should see (Milestone 1 acceptance)

- Ocean with moving waves; day/night cycle (one day ≈ 12 real minutes,
  configurable in `Tuning.cs`); port lamps, admin-building windows and
  warehouse glow switch on at dusk.
- A named ship (*Northern Star*, *Atlas Voyager*, …) announced on the HUD,
  sailing in, easing onto the berth.
- The quay crane travelling on its rails, trolley moving out over the ship,
  spreader lowering on visible cables with gentle sway, locking a container,
  carrying it landside and lowering it onto the waiting tractor.
- The tractor driving the road loop to the warehouse, the warehouse door
  sliding open, cargo received, **+KD 500** toast with money count-up.
- After the last container: a shipment-complete bonus, the ship departing,
  and the next ship scheduled.

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

## Known Milestone 1 limitations

By design (see `docs/MILESTONES.md`): no deadlines/cargo types yet, one dock /
one crane / one tractor, no weather, no audio, no save system, no upgrades.
The architecture for all of these is specified in `docs/TDD.md`.
