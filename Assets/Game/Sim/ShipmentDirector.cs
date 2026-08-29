using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Runs the port's shipping operation: spawns ships on a reputation-
    /// driven cadence (better ports attract more business), holds them at
    /// numbered anchorage slots, assigns freed berths in arrival order, runs
    /// each ship's full lifecycle (dock → its berth's crane unloads → settle
    /// against the deadline → depart) as an independent coroutine so both
    /// berths work in parallel, and owns reputation hooks and the save
    /// lifecycle.
    /// </summary>
    public class ShipmentDirector : MonoBehaviour
    {
        private class Berth
        {
            public float X;
            public CraneController Crane;
            public ShipController Ship;
        }

        private VehicleDispatcher _dispatcher;
        private Warehouse _dryStore;
        private Warehouse _coldStore;
        private HudController _hud;
        private DayNightCycle _dayNight;
        private Reputation _reputation;
        private CameraRig _cameraRig;
        private Tugboats _tugs;
        private bool _cinematicShown;

        private readonly System.Random _rng = new System.Random();
        private readonly List<Berth> _berths = new List<Berth>();
        private readonly List<ShipController> _berthQueue = new List<ShipController>();
        private readonly bool[] _anchorSlots = new bool[Tuning.AnchorSlots];

        private int _shipIndex;
        private long _totalDelivered;
        private bool _onboardingDone;
        private bool _craneTapped;
        private int _shipsInPlay;
        private float _nextRewardMultiplier = 1f;

        public static ShipmentDirector Build(Transform parent, CraneController craneWest,
            CraneController craneEast, VehicleDispatcher dispatcher, Warehouse dryStore,
            Warehouse coldStore, HudController hud, DayNightCycle dayNight, CameraRig cameraRig,
            Reputation reputation, Tugboats tugs, SaveModel save)
        {
            var go = new GameObject("ShipmentDirector");
            go.transform.SetParent(parent, false);
            var director = go.AddComponent<ShipmentDirector>();
            director._dispatcher = dispatcher;
            director._dryStore = dryStore;
            director._coldStore = coldStore;
            director._hud = hud;
            director._dayNight = dayNight;
            director._reputation = reputation;
            director._cameraRig = cameraRig;
            director._tugs = tugs;
            director._berths.Add(new Berth { X = Tuning.BerthWestX, Crane = craneWest });
            director._berths.Add(new Berth { X = Tuning.BerthEastX, Crane = craneEast });

            if (save != null)
            {
                director._shipIndex = save.shipIndex;
                director._totalDelivered = save.totalDelivered;
                director._onboardingDone = save.onboardingDone;
            }

            dryStore.OnDelivered += director.OnContainerDelivered;
            coldStore.OnDelivered += director.OnContainerDelivered;
            cameraRig.FocusChanged += director.OnFocusChanged;
            CraneController.OnBreakdown += crane =>
                hud.Banner(crane.FocusTitle + " — breakdown, repair crew dispatched");
            return director;
        }

        private void Start()
        {
            StartCoroutine(SpawnLoop());
        }

        private void Update()
        {
            int waiting = _berthQueue.Count;
            _hud.SetScheduleText(waiting > 0
                ? string.Format("Offshore queue: {0} ship{1}", waiting, waiting == 1 ? "" : "s")
                : "");
        }

        private void OnContainerDelivered(Container container)
        {
            long baseReward = container.Shipment != null
                ? container.Shipment.RewardPerContainer
                : (container.Cargo != null ? container.Cargo.ValuePerContainer : 300);
            // Refrigerated cargo pays by whatever quality survived the dock.
            long reward = (long)(baseReward * container.Quality / 100f);
            string what = container.Cargo != null ? container.Cargo.DisplayName : "cargo";
            string note = container.Quality < 95f
                ? string.Format("{0} received (quality {1:0}%)", what, container.Quality)
                : what + " received";
            EconomyManager.Instance.Add(reward, note);
            _totalDelivered++;
            if (container.Shipment != null) container.Shipment.Delivered++;
        }

        private void OnFocusChanged(FocusTarget target)
        {
            if (target != null && target.GetComponent<CraneController>() != null)
                _craneTapped = true;
        }

        // ---- Spawning ----------------------------------------------------

        private IEnumerator SpawnLoop()
        {
            yield return new WaitForSeconds(3f);
            while (true)
            {
                int slot = FreeAnchorSlot();
                if (slot >= 0 && _shipsInPlay < _berths.Count + Tuning.AnchorSlots)
                {
                    StartCoroutine(RunShipLifecycle(slot));
                }
                float interval = Mathf.Lerp(Tuning.SpawnIntervalSlowRep,
                    Tuning.SpawnIntervalFastRep, _reputation.Normalized);
                yield return new WaitForSeconds(interval + (float)_rng.NextDouble() * 10f);
            }
        }

        private int FreeAnchorSlot()
        {
            for (int i = 0; i < _anchorSlots.Length; i++)
                if (!_anchorSlots[i]) return i;
            return -1;
        }

        // ---- Per-ship lifecycle -----------------------------------------

        /// <summary>Market-surge event: the next announced shipment pays this multiplier.</summary>
        public void SurgeNextShipment(float multiplier)
        {
            _nextRewardMultiplier = multiplier;
        }

        /// <summary>
        /// Emergency event: a medical ship on a brutal deadline that jumps
        /// the berth queue. Returns false when the anchorage is full.
        /// </summary>
        public bool SpawnEmergencyShipment()
        {
            int slot = FreeAnchorSlot();
            if (slot < 0) return false;

            var shipment = new Shipment
            {
                ShipName = "Mercy Runner",
                Cargo = CargoCatalog.ById("medicine"),
                Count = 5,
                SpawnTime = Time.time,
                RewardMultiplier = 1.6f,
                IsEmergency = true,
                RepWin = 4,
                RepLose = -6,
            };
            shipment.DeadlineSeconds = 90f + shipment.Count * 30f;
            StartCoroutine(RunShipLifecycle(slot, shipment));
            return true;
        }

        private Shipment CreateScheduledShipment()
        {
            var shipment = new Shipment
            {
                ShipName = Tuning.ShipNames[_shipIndex % Tuning.ShipNames.Length],
                Cargo = CargoCatalog.Pick(_rng),
                Count = _rng.Next(Tuning.MinContainersPerShip, Tuning.MaxContainersPerShip + 1),
                SpawnTime = Time.time,
                RewardMultiplier = _nextRewardMultiplier,
            };
            _nextRewardMultiplier = 1f;
            shipment.DeadlineSeconds = Tuning.DeadlineBuffer + shipment.Count * Tuning.DeadlinePerContainer;
            _shipIndex++;
            return shipment;
        }

        private IEnumerator RunShipLifecycle(int anchorSlot, Shipment shipment = null)
        {
            _anchorSlots[anchorSlot] = true;
            _shipsInPlay++;

            if (shipment == null) shipment = CreateScheduledShipment();

            var ship = ShipController.Build(transform, shipment, anchorSlot);
            _hud.Banner(shipment.IsEmergency
                ? string.Format("EMERGENCY — {0} inbound with {1} ({2} containers)",
                    shipment.ShipName, shipment.Cargo.DisplayName, shipment.Count)
                : string.Format("{0} inbound — {1}, {2} containers",
                    shipment.ShipName, shipment.Cargo.DisplayName, shipment.Count));
            if (shipment.IsEmergency && AudioManager.Instance != null) AudioManager.Instance.Alert();

            yield return ship.ApproachAnchor();

            // Berths are granted strictly in arrival order — except emergency
            // ships, which jump the queue. A storm closes the harbor, so
            // ships ride it out at anchor with deadlines burning.
            if (shipment.IsEmergency) _berthQueue.Insert(0, ship);
            else _berthQueue.Add(ship);
            Berth berth = null;
            while (berth == null)
            {
                bool mayDock = WeatherManager.Instance == null || WeatherManager.Instance.ShipsMayDock;
                if (mayDock && _berthQueue[0] == ship) berth = FreeBerth();
                if (berth == null) yield return null;
            }
            _berthQueue.RemoveAt(0);
            berth.Ship = ship;
            _anchorSlots[anchorSlot] = false; // the anchorage spot is open again

            // Tugs run out to escort her in; the session's first docking gets
            // a cinematic camera follow (any pan/rotate input skips it).
            if (_tugs != null) _tugs.Escort(ship);
            if (!_cinematicShown)
            {
                _cinematicShown = true;
                var focusTarget = ship.GetComponent<FocusTarget>();
                if (focusTarget != null) _cameraRig.Focus(focusTarget);
            }

            yield return ship.DockFromAnchor(berth.X);
            _hud.Banner(string.Format("{0} docked — unloading begins", shipment.ShipName), 3f);

            if (!_onboardingDone)
            {
                yield return OnboardingBeat();
                _onboardingDone = true;
                SaveNow();
            }

            yield return berth.Crane.UnloadAll(ship, _dispatcher);

            // The crane is done; the tractors still have to land the last boxes.
            while (shipment.Delivered < shipment.Count) yield return null;

            if (!shipment.IsLate)
            {
                EconomyManager.Instance.Add(shipment.OnTimeBonus, "on-time shipment bonus");
                _reputation.Add(shipment.RepWin,
                    shipment.IsEmergency ? "emergency delivered in time" : "on-time delivery");
                _hud.Banner(string.Format("{0} — delivered on time", shipment.ShipName));
            }
            else
            {
                EconomyManager.Instance.Add(-shipment.LatePenalty, "late delivery penalty");
                _reputation.Add(shipment.RepLose,
                    shipment.IsEmergency ? "emergency delivered late" : "late delivery");
                _hud.Banner(string.Format("{0} — delivered late", shipment.ShipName));
            }
            Haptics.Notable();
            SaveNow();

            yield return new WaitForSeconds(1.5f);
            berth.Ship = null; // berth frees as the ship pulls out
            yield return ship.Depart();
            Destroy(ship.gameObject);
            _shipsInPlay--;
        }

        private Berth FreeBerth()
        {
            for (int i = 0; i < _berths.Count; i++)
                if (_berths[i].Ship == null) return _berths[i];
            return null;
        }

        private IEnumerator OnboardingBeat()
        {
            _hud.Banner("Welcome to your port — every shipment matters", 4f);
            yield return new WaitForSeconds(4.5f);
            _craneTapped = false;
            _hud.Banner("Tap the crane to begin unloading", 60f);
            while (!_craneTapped) yield return null;
            _hud.Banner("The crane takes it from here — watch your port work", 4f);
        }

        // ---- Save lifecycle ---------------------------------------------

        private void SaveNow()
        {
            SaveSystem.Save(new SaveModel
            {
                balance = EconomyManager.Instance.Balance,
                day = _dayNight.DayCount,
                dayFraction = _dayNight.DayFraction,
                shipIndex = _shipIndex,
                warehouseStored = _dryStore.StoredCount,
                coldStored = _coldStore.StoredCount,
                totalDelivered = _totalDelivered,
                onboardingDone = _onboardingDone,
                reputation = _reputation.Value,
                craneLevelA = _berths[0].Crane.SpeedLevel,
                craneLevelB = _berths[1].Crane.SpeedLevel,
                craneHealthA = _berths[0].Crane.Health,
                craneHealthB = _berths[1].Crane.Health,
                tractorSpeedLevel = _dispatcher.TractorSpeedLevel,
                dispatchLevel = _dryStore.DispatchLevel,
                coldDispatchLevel = _coldStore.DispatchLevel,
                customsLevel = _dispatcher.Customs.Level,
                tractorCount = _dispatcher.Tractors.Count,
            });
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused) SaveNow();
        }

        private void OnApplicationQuit()
        {
            SaveNow();
        }
    }
}
