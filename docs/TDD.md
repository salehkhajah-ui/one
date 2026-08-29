# PORT — Technical Design Document

Working title: **PORT**. A premium 3D mobile port-management simulation for
iOS/Android built in Unity. This document defines the technical architecture
for the whole game; Milestone 1 (implemented on this branch) proves the core
sequence: *ship → dock → crane → container → tractor → warehouse → money*.

Guiding product principle: **the world is the interface**. The port must be
beautiful to watch even when untouched; numbers supplement the world, they do
not replace it. When trade-offs are needed the priority order is:
visual satisfaction → smooth interaction → living simulation → clear gameplay
→ performance → depth → additional content.

---

## 1. Platform & engine

| Decision | Choice | Rationale |
|---|---|---|
| Engine | Unity 2022.3 LTS+ (Unity 6 compatible) | Stable LTS, broad device support |
| Language | C#, no external packages | Everything auditable, mobile-lean |
| Render pipeline | **URP** for production; code is pipeline-agnostic | URP is the mobile-optimized pipeline; Milestone 1 materials detect the active pipeline at runtime (`MaterialLibrary`) so the placeholder build runs on Built-in RP with zero setup |
| Target devices | iPhone 11+/mid-range Android (2019+) | 60 FPS target, 30 FPS floor |
| Orientation | Landscape | Diorama framing, two-thumb camera control |
| Input | `UnityEngine.Input` touch + mouse fallback | No Input System package dependency for M1; can migrate later behind `CameraRig` |

## 2. Scene architecture

One gameplay scene. **Milestone 1 builds the entire world procedurally at
runtime** from `GameBootstrap` (`[RuntimeInitializeOnLoadMethod]`), so the
repository carries no `.unity`/`.meta` binary-ish assets and no prefab GUID
coupling while the game is placeholder-art. When real art arrives, the same
builder methods (`ShipController.Build`, `CraneController.Build`, …) become
prefab-instantiation sites — call sites don't change.

Runtime hierarchy:

```
PORT (GameBootstrap)
├─ Sun (DayNightCycle + directional Light)
├─ Ocean (procedural wave mesh)
├─ Environment (quay, roads, yard, lamps, admin building — static)
├─ Crane (CraneController: gantry → trolley → spreader → cables)
├─ Warehouse (Warehouse)
├─ Tractor (TerminalTractor)
├─ Ships/* (spawned/despawned by ShipmentDirector)
├─ Gulls
├─ CameraRig (Camera + AudioListener)
└─ HUD (code-built uGUI canvas)
```

## 3. Manager layer

Composition over singletons: `GameBootstrap` constructs every system once and
injects references. Only `EconomyManager` exposes a static `Instance`
(single-writer money authority). Planned managers map to the product spec:

Implemented in M1: `GameBootstrap` (GameManager), `ShipmentDirector`
(Ship/CargoManager for one flow), `CraneController`, `TerminalTractor`,
`Warehouse`, `EconomyManager`, `DayNightCycle` (TimeManager), `CameraRig`
(CameraManager), `HudController` (UIManager).

Future: `BuildingManager`, `ContractManager`, `EventManager`,
`WeatherManager`, `AudioManager`, `SaveManager`, `AutomationManager` (PORT AI),
`VehicleManager` (fleet + road graph arbitration).

## 4. Camera system

Isometric three-quarter rig (`CameraRig`):

- State: `pivot` (point on the ground being looked at), `yaw`, `pitch`
  (clamped 30–55°), `distance` (clamped). Camera position derived each
  `LateUpdate`: `pivot − forward · distance`. All values move through
  smoothed targets → controlled, cinematic motion, never a hard snap.
- Gestures: one-finger drag pan (with release inertia), pinch zoom,
  two-finger twist rotate; mouse fallback (LMB pan, RMB rotate, wheel zoom).
- Pivot clamped to port bounds; no unrestricted flight.
- **Focus mode**: a tap raycasts for a `FocusTarget` component (ship, crane,
  warehouse, tractor). The rig eases pivot/distance toward the target over
  ~0.8 s with cubic easing; `follow` targets (vehicles) keep the pivot
  tracking them until the player pans/rotates, which cancels focus. Future
  focus UIs (ship card, warehouse roof fade) hang off this same event.

## 5. Simulation entities & state machines

Explicit state enums document intent; coroutines drive the transitions
(readable sequencing, no per-frame switch soup). Each entity exposes its
state for debugging/UI.

**Ship** (`ShipController`):
`Offshore → Approaching → Docking → Docked → Unloading → Departing → Gone`.
Arrival follows authored waypoints with distance-based deceleration and
heading slerp; final berth alignment is a 4 s eased pose blend. A `Hull`
child carries bob/roll so root motion stays clean for docking math.

**Crane** (`CraneController`):
`Idle → MoveGantry → TrolleyOut → Lower → Grab → Raise → MoveGantryHome →
TrolleyIn → WaitTractor → LowerToTrailer → Release → RaiseEmpty`.
Gantry travels the quay (x), trolley travels the boom (z), spreader hangs on
two `LineRenderer` cables whose length animates; a damped spring driven by
trolley/gantry acceleration adds physical sway (anticipation–move–settle,
never linear).

**Container** (`Container`):
`OnShip → BeingUnloaded → OnCraneSpreader → AwaitingTransport → OnTractor →
BeingReceived → Delivered`. Containers are physical objects that are
re-parented as they move through the world — they never teleport.

**Tractor** (`TerminalTractor`): perpetual duty loop
`ParkAtLoadPoint → WaitForLoad → HaulToWarehouse → Unloading → ReturnLoop`.
Driving follows a fixed waypoint list (§6) with acceleration, braking
distance (`v = √(2·a·d)`), heading turn-rate limits and wheel spin.

Handshakes are flag-based, not event-storms: the crane waits on
`tractor.ReadyForLoad`; the tractor waits on its `Loaded` flag; the director
waits on `warehouse.DeliveredCount`. This keeps M1 legible and is replaced by
a job-queue (`TransportJob`) when multiple vehicles arrive in Phase 3.

## 6. Vehicle routing

Milestone 1 uses authored waypoint loops (`Tuning.TractorOutboundPath`,
`ReturnPath`). The production design is a **node/edge road graph**
(one-way lanes, intersections with claim-based arbitration, queue points at
gates/cranes) — deliberately *not* full dynamic pathfinding; congestion must
emerge from queues on a constrained graph because congestion visibility is a
core mechanic (the Domino System). The M1 driving controller (accel/brake/
turn-rate) is already the graph-follower's motion layer.

## 7. Time, lighting, weather

`DayNightCycle` owns game time: `DayFraction ∈ [0,1)`, one day =
`Tuning.DayLengthMinutes` real minutes (default 12, configurable). Sun is a
rotating directional light; sky is an instanced procedural skybox (sunset/
night emerge from sun elevation for free); ambient, fog color and lamp
emission/point-lights are keyframed piecewise against day fraction. Night
lighting (lamps, admin windows, warehouse glow) is registered by builders
into the cycle, so any future building lights up correctly by registering.
Weather (Phase 4) becomes a second layer modulating the same hooks: sun
intensity, fog density, material wetness, plus gameplay modifiers (crane
speed, ship holding).

## 8. Cargo & data model (ScriptableObjects)

Nothing is hard-coded per-good. Production data model (Phase 2+), all
`ScriptableObject`s: `CargoTypeSO` (name, temperatureRequirement, priority,
decayRate, securityLevel, hazardLevel, handlingType, baseValue),
`ShipClassSO`, `BuildingTypeSO`, `EquipmentTypeSO`, `ContractSO`, `EventSO`,
`UpgradeSO`. Milestone 1 keeps a single implicit cargo type; `Container`
already carries identity (id, color) and the full state machine so the SO
layer slots in without touching movement code.

## 9. Economy

Integer money only (`long`, KD). `EconomyManager` is the single writer;
rewards flow from **world events** (warehouse receives cargo → +KD 500;
shipment completes → bonus), never from timers. HUD listens
(`OnChanged`, `OnToast`) and animates count-ups; the model never animates.

## 10. UI architecture

Minimal-UI philosophy: the port is the interface. The HUD is a code-built
uGUI canvas (no TextMeshPro dependency in M1) with exactly: money (top-left,
count-up), day/clock (top-right), transient center banner (ship
announcements), bottom toast (rewards), controls hint. Contextual UIs
(radial actions, focus cards, warehouse roof-fade) attach to the
`CameraRig` focus event in later phases. Colors: dark charcoal translucent
panels, warm white text, one accent; alerts green/amber/red only.

## 11. Animation principles

Every motion uses **anticipation → movement → settle**: shared `Ease`
utilities (`InOutCubic`, `OutBack` settle, coroutine `Animate(duration,
apply)`), spring-damped secondary motion (spreader sway, ship bob/roll),
and duration-from-distance so long moves read heavier than short ones.
No linear `Lerp(t)` on anything the player watches.

## 12. Save architecture (Phase 2+)

Versioned JSON via serializable DTOs (`SaveModelV1`), atomic write
(temp file + rename) to `Application.persistentDataPath`, explicit migration
chain `V1→V2→…`. Sim state saves as *logical* state (container states,
balances, timers), never transform positions; the world rebuilds visually
from logical state on load — same rebuild path offline progression uses.

## 13. Performance strategy

- Placeholder geometry is primitive-based; production swaps to LOD-grouped
  meshes, GPU instancing (containers!), texture atlases, baked/probe
  lighting, one real-time directional shadow.
- Object pooling for containers, vehicles, effects, notifications (M1 spawns
  are rare enough to skip pooling; the factory methods are the future pool
  checkout sites).
- **Simulation LOD**: entities far from camera drop to simplified motion,
  then to schedule-only proxies (positions computed, nothing animated).
- Ocean is a single 64×64 CPU-displaced grid in M1; production moves waves
  to a vertex shader.
- `Application.targetFrameRate = 60`; shadow distance capped; no per-frame
  allocations in Update paths (cached lists, no LINQ in hot code).

## 14. Placeholder asset strategy

Build working systems first; art later. All placeholder geometry is clean
primitives in a restrained palette (`Palette` in `MaterialLibrary`): warm
concrete, muted steel, pastel container colors, dark asphalt — reading as an
architectural diorama, not a debug scene. Every visual constructor is a
single `Build(...)` function, which is the exact seam where art prefabs
replace primitives.

## 15. Testing & verification

Engine-independent logic (economy math, time mapping, future cargo/contract
rules) lives in plain C# classes testable with the Unity Test Framework
(edit mode). Scene logic is verified by the M1 acceptance checklist in
`README.md`. **This milestone was authored without a Unity editor in the
loop** — code follows 2022.3 LTS APIs conservatively; first-open smoke test
happens on a machine with Unity installed (see README).

## 16. Milestone 1 acceptance

Ocean moves · camera pans/rotates/zooms/focuses · ship arrives and docks ·
crane animates with cables and sway · container unloads · tractor collects
and drives the road · warehouse door opens and accepts cargo · shipment
completes · player earns money · day/night with port lights. Advanced
systems wait until this loop feels good (`docs/MILESTONES.md`).
