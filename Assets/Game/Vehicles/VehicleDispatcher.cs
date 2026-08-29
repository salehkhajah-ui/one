using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Owns the tractor fleet: stations empty tractors where they're needed
    /// (busy cranes first, then idle cranes, then the parking lane), answers
    /// the cranes' "is a tractor parked in my bay?" question, and carries the
    /// fleet-wide upgrades (speed levels, hiring tractors 3 and 4).
    /// </summary>
    public class VehicleDispatcher : MonoBehaviour
    {
        public readonly List<TerminalTractor> Tractors = new List<TerminalTractor>();

        public int TractorSpeedLevel { get; set; }

        /// <summary>Green-port electrification: the whole fleet runs a bit quicker.</summary>
        public bool ElectricFleet { get; set; }

        public float TractorSpeedMult => (1f + 0.2f * TractorSpeedLevel) * (ElectricFleet ? 1.1f : 1f);

        public CustomsOffice Customs { get; private set; }
        public RoadNode CustomsNode { get; private set; }

        private RoadGraph _graph;
        private Warehouse _dryStore;
        private Warehouse _coldStore;
        private readonly List<CraneController> _cranes = new List<CraneController>();
        private readonly List<RoadNode> _stationScratch = new List<RoadNode>();

        public static VehicleDispatcher Build(Transform parent, RoadGraph graph,
            Warehouse dryStore, Warehouse coldStore, CustomsOffice customs)
        {
            var go = new GameObject("VehicleDispatcher");
            go.transform.SetParent(parent, false);
            var d = go.AddComponent<VehicleDispatcher>();
            d._graph = graph;
            d._dryStore = dryStore;
            d._coldStore = coldStore;
            d.Customs = customs;
            d.CustomsNode = graph["CUS"];
            return d;
        }

        /// <summary>Where this container belongs: cold chain to the cold store, everything else to the dry store.</summary>
        public void DestinationFor(Container container, out RoadNode node, out Warehouse warehouse)
        {
            bool cold = container.Cargo != null && container.Cargo.Refrigerated;
            warehouse = cold ? _coldStore : _dryStore;
            node = _graph[cold ? "CWH" : "WH"];
        }

        public void RegisterCrane(CraneController crane)
        {
            _cranes.Add(crane);
        }

        public void SpawnInitialFleet(int count)
        {
            count = Mathf.Clamp(count, 1, Tuning.MaxTractors);
            string[] starts = { "LPA", "LPB", "PK1", "PK2" };
            for (int i = 0; i < count; i++)
                Tractors.Add(TerminalTractor.Build(transform, i + 1, _graph, this,
                    _graph[starts[i]]));
        }

        // ---- Crane handshake --------------------------------------------

        /// <summary>An empty tractor parked in this bay, or null.</summary>
        public TerminalTractor TractorReadyAt(RoadNode loadNode)
        {
            for (int i = 0; i < Tractors.Count; i++)
                if (Tractors[i].ParkedAt(loadNode)) return Tractors[i];
            return null;
        }

        public bool IsCraneStation(RoadNode node)
        {
            for (int i = 0; i < _cranes.Count; i++)
                if (_cranes[i].LoadNode == node) return true;
            return false;
        }

        // ---- Stationing --------------------------------------------------

        /// <summary>
        /// Where this empty tractor should stand. Priority: bays of cranes
        /// currently working a ship, then the remaining bays, then parking.
        /// Assignment is by fleet order among empty tractors, so it is stable
        /// frame to frame.
        /// </summary>
        public RoadNode DesiredStation(TerminalTractor tractor)
        {
            _stationScratch.Clear();
            for (int i = 0; i < _cranes.Count; i++)
                if (_cranes[i].Busy) _stationScratch.Add(_cranes[i].LoadNode);
            for (int i = 0; i < _cranes.Count; i++)
                if (!_cranes[i].Busy) _stationScratch.Add(_cranes[i].LoadNode);
            _stationScratch.Add(_graph["PK1"]);
            _stationScratch.Add(_graph["PK2"]);

            int rank = 0;
            for (int i = 0; i < Tractors.Count; i++)
            {
                var t = Tractors[i];
                if (t.Carrying != null) continue;
                if (t == tractor) break;
                rank++;
            }
            return _stationScratch[Mathf.Min(rank, _stationScratch.Count - 1)];
        }

        // ---- Fleet upgrades (offered on any tractor's focus card) --------

        public FocusAction[] FleetActions
        {
            get
            {
                var actions = new List<FocusAction>(2);

                if (TractorSpeedLevel < Tuning.TractorSpeedCosts.Length)
                {
                    long cost = Tuning.TractorSpeedCosts[TractorSpeedLevel];
                    actions.Add(new FocusAction
                    {
                        Label = string.Format("Fleet speed (+20%), Lv {0}→{1}",
                            TractorSpeedLevel, TractorSpeedLevel + 1),
                        Cost = cost,
                        Available = () => EconomyManager.Instance.Balance >= cost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(cost, "tractor fleet speed upgrade"))
                                TractorSpeedLevel++;
                        },
                    });
                }

                int hires = Tractors.Count - Tuning.StartingTractors;
                if (Tractors.Count < Tuning.MaxTractors && hires < Tuning.HireTractorCosts.Length)
                {
                    long cost = Tuning.HireTractorCosts[hires];
                    actions.Add(new FocusAction
                    {
                        Label = "Hire terminal tractor " + (Tractors.Count + 1),
                        Cost = cost,
                        Available = () => EconomyManager.Instance.Balance >= cost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(cost,
                                    "hired terminal tractor " + (Tractors.Count + 1)))
                                HireTractor();
                        },
                    });
                }

                return actions.ToArray();
            }
        }

        public void HireTractor()
        {
            // Spawn at the first free staging node.
            string[] spots = { "PK1", "PK2", "W2", "M" };
            foreach (var name in spots)
            {
                var node = _graph[name];
                if (node.ClaimedBy == null)
                {
                    Tractors.Add(TerminalTractor.Build(transform, Tractors.Count + 1,
                        _graph, this, node));
                    return;
                }
            }
        }
    }
}
