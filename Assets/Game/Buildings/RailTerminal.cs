using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public enum RailState { Vacant, Construction, Operational }

    /// <summary>
    /// The port's first expansion. Starts as a vacant lot with a placard;
    /// buying it raises scaffolding and a visible 90-second construction
    /// site, which then becomes a rail spur along the back of the quay. A
    /// freight train calls on a cycle, and while it stands at the platform
    /// it bulk-drains the dry warehouse — each dispatched container appears
    /// on a wagon and pays a rail premium. Expansion physically transforms
    /// the map, per the product spec.
    /// </summary>
    public class RailTerminal : MonoBehaviour, IFocusInfo, IFocusActions
    {
        private const float TrackZ = 43.3f;

        public RailState State { get; private set; } = RailState.Vacant;
        public int TrainsServed { get; private set; }
        public int ContainersShipped { get; private set; }

        private Warehouse _dryStore;
        private HudController _hud;
        private Transform _placard;
        private Transform _site;
        private Transform _terminal;
        private Transform _train;
        private readonly List<GameObject> _wagonLoads = new List<GameObject>();
        private Transform[] _wagons;

        public static RailTerminal Build(Transform parent, Warehouse dryStore, HudController hud)
        {
            var go = new GameObject("RailTerminal");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(20f, Tuning.QuayTopY, 41f);

            var rail = go.AddComponent<RailTerminal>();
            rail._dryStore = dryStore;
            rail._hud = hud;
            rail.BuildPlacard();

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 26f;
            focus.aimHeight = 2f;
            // Kept north of the tractors' back-lot lane so taps on passing
            // vehicles don't land on the terminal instead.
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 2f, 1.6f);
            col.size = new Vector3(30f, 4f, 4f);
            return rail;
        }

        /// <summary>Restores saved state; an interrupted construction restarts.</summary>
        public void LoadState(int state)
        {
            if (state >= 2) CompleteConstruction(silent: true);
            else if (state == 1) BeginConstruction(charge: false);
        }

        public int StateAsInt => (int)State;

        private void BuildPlacard()
        {
            _placard = Prim.Group("Placard", transform, Vector3.zero);
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);
            Prim.Cylinder("Post", _placard, new Vector3(0f, 1.1f, 0f), new Vector3(0.15f, 1.1f, 0.15f), steel);
            Prim.Cube("Board", _placard, new Vector3(0f, 2.4f, 0f), new Vector3(3.2f, 1.6f, 0.15f),
                MaterialLibrary.Get(Palette.LaneMark, 0.15f));
        }

        // ---- Purchase & construction ------------------------------------

        private void BeginConstruction(bool charge)
        {
            State = RailState.Construction;
            if (_placard != null) Destroy(_placard.gameObject);

            // The site: fencing, scaffold towers, material piles.
            _site = Prim.Group("ConstructionSite", transform, Vector3.zero);
            var scaffold = MaterialLibrary.Get(Palette.SpreaderYellow, 0.3f);
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);
            for (int x = -12; x <= 12; x += 8)
                Prim.Cube("Scaffold", _site, new Vector3(x, 1.6f, 1.5f), new Vector3(1.4f, 3.2f, 1.4f), scaffold);
            // Fence line kept north of the back-lot tractor lane.
            for (int x = -14; x <= 14; x += 4)
                Prim.Cube("Fence", _site, new Vector3(x, 0.6f, -0.6f), new Vector3(0.12f, 1.2f, 0.12f), steel);
            Prim.Cube("Materials", _site, new Vector3(6f, 0.5f, -0.5f), new Vector3(3f, 1f, 1.6f),
                MaterialLibrary.Get(Palette.ConcreteDark, 0.2f));

            _hud.Banner("Rail terminal under construction", 3.5f);
            StartCoroutine(ConstructionTimer());
        }

        private IEnumerator ConstructionTimer()
        {
            yield return new WaitForSeconds(Tuning.RailConstructionSeconds);
            CompleteConstruction(silent: false);
        }

        private void CompleteConstruction(bool silent)
        {
            State = RailState.Operational;
            if (_placard != null) Destroy(_placard.gameObject);
            if (_site != null) Destroy(_site.gameObject);

            _terminal = Prim.Group("Terminal", transform, Vector3.zero);
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.35f, 0.5f);

            // Rail spur along the outer edge of the back lot (world z ≈ 43),
            // running past both map edges so the train never leaves its track.
            float railLocalZ = TrackZ - transform.position.z;
            foreach (float dz in new[] { -0.7f, 0.7f })
                Prim.Cube("Rail", _terminal, new Vector3(-10f, 0.12f, railLocalZ + dz),
                    new Vector3(150f, 0.12f, 0.16f), steel);
            for (int x = -70; x <= 64; x += 5)
                Prim.Cube("Sleeper", _terminal, new Vector3(x, 0.06f, railLocalZ),
                    new Vector3(0.5f, 0.08f, 2f), MaterialLibrary.Get(Palette.ConcreteDark, 0.15f));

            // Narrow platform strip between the back-lot road and the track.
            Prim.Cube("Platform", _terminal, new Vector3(8f, 0.2f, 0.7f),
                new Vector3(44f, 0.4f, 1.4f), MaterialLibrary.Get(Palette.Concrete, 0.15f));

            BuildTrain();
            StartCoroutine(TrainLoop());
            if (!silent) _hud.Banner("Rail terminal operational — freight trains inbound");
        }

        private void BuildTrain()
        {
            _train = Prim.Group("FreightTrain", transform.parent, TrainParkedPos());
            var green = MaterialLibrary.Get(Palette.Hex("#4F6B52"), 0.35f, 0.2f);
            var dark = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.4f);

            // Locomotive at the head (west end), wagons trailing east.
            var loco = Prim.Group("Loco", _train, Vector3.zero);
            Prim.Cube("LocoBody", loco, new Vector3(0f, 1.6f, 0f), new Vector3(3f, 2.6f, 7f), green);
            Prim.Cube("LocoCab", loco, new Vector3(0f, 3.2f, -2f), new Vector3(2.6f, 1.2f, 2.4f), green);

            _wagons = new Transform[Tuning.TrainCapacity];
            for (int i = 0; i < _wagons.Length; i++)
            {
                var wagon = Prim.Group("Wagon" + i, _train, new Vector3(0f, 0f, 5.4f + i * 6f));
                Prim.Cube("Bed", wagon, new Vector3(0f, 0.9f, 0f), new Vector3(2.6f, 0.5f, 5.4f), dark);
                _wagons[i] = wagon;
            }
        }

        private Vector3 TrainParkedPos()
        {
            // Off-map to the east; the head faces west (train runs along −x...
            // the consist is built along +z, so rotate it onto the track).
            return new Vector3(130f, Tuning.QuayTopY, TrackZ);
        }

        private IEnumerator TrainLoop()
        {
            // The consist is modeled along its own +z axis; face it west.
            _train.rotation = Quaternion.Euler(0f, 90f, 0f); // +z → world +x (tail east)
            while (true)
            {
                yield return new WaitForSeconds(Mathf.Lerp(
                    Tuning.TrainIntervalMin, Tuning.TrainIntervalMax, Random.value));

                // Roll in from the east and stop with the loco at the platform.
                yield return MoveTrain(new Vector3(2f, Tuning.QuayTopY, TrackZ), 14f, ease: true);
                if (AudioManager.Instance != null) AudioManager.Instance.Horn();

                // Load: pull stored containers out of the dry warehouse onto wagons.
                long earned = 0;
                float dwell = 0f;
                int loaded = 0;
                while (loaded < Tuning.TrainCapacity && dwell < Tuning.TrainMaxDwell)
                {
                    Color color;
                    if (_dryStore.TryDispatchExternal(out color))
                    {
                        var box = Prim.Cube("RailLoad", _wagons[loaded], new Vector3(0f, 2.4f, 0f),
                            new Vector3(2.5f, 2.4f, 5f), MaterialLibrary.Get(color, 0.3f));
                        _wagonLoads.Add(box);
                        loaded++;
                        ContainersShipped++;
                        earned += Tuning.RailBoxRevenue;
                        EconomyManager.Instance.Add(Tuning.RailBoxRevenue, "rail freight", quiet: true);
                    }
                    yield return new WaitForSeconds(2.5f);
                    dwell += 2.5f;
                }

                if (earned > 0)
                    _hud.Toast(string.Format("+KD {0:N0} — rail freight ({1} containers)", earned, loaded));
                TrainsServed++;

                // Depart west, off the map, then reset east for the next call.
                yield return MoveTrain(new Vector3(-150f, Tuning.QuayTopY, TrackZ), 18f, ease: false);
                foreach (var load in _wagonLoads) Destroy(load);
                _wagonLoads.Clear();
                _train.position = TrainParkedPos();
            }
        }

        private IEnumerator MoveTrain(Vector3 dest, float speed, bool ease)
        {
            while (true)
            {
                Vector3 to = dest - _train.position;
                float dist = to.magnitude;
                if (dist < 0.5f) break;
                float v = ease ? Mathf.Min(speed, 1.5f + dist * 0.12f) : speed;
                _train.position = Vector3.MoveTowards(_train.position, dest, v * Time.deltaTime);
                yield return null;
            }
        }

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => State == RailState.Operational ? "Rail Terminal"
            : State == RailState.Construction ? "Rail Terminal (under construction)"
            : "Vacant Lot";

        public string FocusBody
        {
            get
            {
                switch (State)
                {
                    case RailState.Vacant:
                        return "Zoned for a rail spur.\nA freight connection bulk-ships stored cargo at a premium.";
                    case RailState.Construction:
                        return "Crews on site — the spur is going in.";
                    default:
                        return string.Format(
                            "Trains served: {0}\nContainers shipped by rail: {1}\nKD {2:N0} per container",
                            TrainsServed, ContainersShipped, Tuning.RailBoxRevenue);
                }
            }
        }

        public FocusAction[] FocusActions
        {
            get
            {
                if (State != RailState.Vacant) return new FocusAction[0];
                return new[]
                {
                    new FocusAction
                    {
                        Label = "Build rail terminal",
                        Cost = Tuning.RailCost,
                        Available = () => EconomyManager.Instance.Balance >= Tuning.RailCost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(Tuning.RailCost, "rail terminal construction"))
                                BeginConstruction(charge: true);
                        },
                    },
                };
            }
        }
    }
}
