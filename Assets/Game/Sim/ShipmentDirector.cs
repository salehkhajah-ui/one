using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Orchestrates the core loop: announce ship → sail to anchorage → dock
    /// when the berth frees → crane unloads → tractor hauls → warehouse
    /// receives → settle the shipment against its deadline → depart → next.
    /// The next ship is announced while the current one is still unloading,
    /// so a slow port visibly grows an offshore queue. Also owns the save
    /// lifecycle and the first-run onboarding beat.
    /// </summary>
    public class ShipmentDirector : MonoBehaviour
    {
        private CraneController _crane;
        private TerminalTractor _tractor;
        private Warehouse _warehouse;
        private HudController _hud;
        private DayNightCycle _dayNight;

        private readonly System.Random _rng = new System.Random();
        private ShipController _next;
        private int _shipIndex;
        private long _totalDelivered;
        private bool _onboardingDone;
        private bool _craneTapped;

        public ShipController CurrentShip { get; private set; }

        public static ShipmentDirector Build(Transform parent, CraneController crane,
            TerminalTractor tractor, Warehouse warehouse, HudController hud,
            DayNightCycle dayNight, CameraRig cameraRig, SaveModelV1 save)
        {
            var go = new GameObject("ShipmentDirector");
            go.transform.SetParent(parent, false);
            var director = go.AddComponent<ShipmentDirector>();
            director._crane = crane;
            director._tractor = tractor;
            director._warehouse = warehouse;
            director._hud = hud;
            director._dayNight = dayNight;

            if (save != null)
            {
                director._shipIndex = save.shipIndex;
                director._totalDelivered = save.totalDelivered;
                director._onboardingDone = save.onboardingDone;
            }

            warehouse.OnDelivered += director.OnContainerDelivered;
            cameraRig.FocusChanged += director.OnFocusChanged;
            return director;
        }

        private void Start()
        {
            StartCoroutine(MainLoop());
        }

        private void OnContainerDelivered(Container container)
        {
            long reward = container.Cargo != null ? container.Cargo.ValuePerContainer : 300;
            string what = container.Cargo != null ? container.Cargo.DisplayName : "cargo";
            EconomyManager.Instance.Add(reward, what + " received");
            _totalDelivered++;
            if (CurrentShip != null) CurrentShip.Shipment.Delivered++;
        }

        private void OnFocusChanged(FocusTarget target)
        {
            if (target != null && target.GetComponent<CraneController>() != null)
                _craneTapped = true;
        }

        private IEnumerator MainLoop()
        {
            yield return new WaitForSeconds(3f);

            while (true)
            {
                if (_next == null) _next = Announce();
                var ship = _next;
                _next = null;

                // Ship makes its own way to the anchorage; hold there until picked up here.
                while (ship.State != ShipState.Anchored) yield return null;

                yield return ship.DockFromAnchor();
                CurrentShip = ship;
                var shipment = ship.Shipment;
                _hud.Banner(string.Format("{0} docked — unloading begins", shipment.ShipName), 3f);
                _hud.SetScheduleText("");

                if (!_onboardingDone)
                {
                    yield return OnboardingBeat();
                    _onboardingDone = true;
                    SaveNow();
                }

                // Announce the next arrival while this one is worked — deadline
                // pressure and the offshore queue come from this overlap.
                StartCoroutine(AnnounceNextAfterDelay());

                int baseline = _warehouse.DeliveredCount;
                yield return _crane.UnloadAll(ship, _tractor);

                // The crane is done; wait for the tractor to land the last box.
                while (_warehouse.DeliveredCount < baseline + shipment.Count)
                    yield return null;

                if (!shipment.IsLate)
                {
                    EconomyManager.Instance.Add(shipment.OnTimeBonus, "on-time shipment bonus");
                    _hud.Banner(string.Format("{0} — delivered on time", shipment.ShipName));
                }
                else
                {
                    EconomyManager.Instance.Add(-shipment.LatePenalty, "late delivery penalty");
                    _hud.Banner(string.Format("{0} — delivered late", shipment.ShipName));
                }
                SaveNow();

                yield return new WaitForSeconds(1.5f);
                yield return ship.Depart();
                Destroy(ship.gameObject);
                CurrentShip = null;
            }
        }

        private ShipController Announce()
        {
            var shipment = new Shipment
            {
                ShipName = Tuning.ShipNames[_shipIndex % Tuning.ShipNames.Length],
                Cargo = CargoCatalog.Pick(_rng),
                Count = _rng.Next(Tuning.MinContainersPerShip, Tuning.MaxContainersPerShip + 1),
                SpawnTime = Time.time,
            };
            shipment.DeadlineSeconds = Tuning.DeadlineBuffer + shipment.Count * Tuning.DeadlinePerContainer;
            _shipIndex++;

            var ship = ShipController.Build(transform, shipment);
            StartCoroutine(ship.ApproachAnchor());

            _hud.Banner(string.Format("{0} inbound — {1}, {2} containers",
                shipment.ShipName, shipment.Cargo.DisplayName, shipment.Count));
            _hud.SetScheduleText(string.Format("Inbound: {0} · {1} ×{2}",
                shipment.ShipName, shipment.Cargo.DisplayName, shipment.Count));
            return ship;
        }

        private IEnumerator AnnounceNextAfterDelay()
        {
            yield return new WaitForSeconds(Tuning.NextShipDelay);
            if (_next == null) _next = Announce();
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
            SaveSystem.Save(new SaveModelV1
            {
                balance = EconomyManager.Instance.Balance,
                day = _dayNight.DayCount,
                dayFraction = _dayNight.DayFraction,
                shipIndex = _shipIndex,
                warehouseStored = _warehouse.StoredCount,
                totalDelivered = _totalDelivered,
                onboardingDone = _onboardingDone,
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
