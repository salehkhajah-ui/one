using System.Collections;
using UnityEngine;

namespace PortGame
{
    [System.Flags]
    public enum AiRule
    {
        None = 0,
        PriorityBerthing = 1,   // urgent ships jump the berth queue
        ColdFirst = 2,          // cranes unload decaying cargo first
        AutoMaintenance = 4,    // cranes self-service below 60% health
        ExpressCustoms = 8,     // urgent cargo pays a fee for half dwell
        AutoContracts = 16,     // contract offers accepted automatically
    }

    /// <summary>
    /// PORT AI — the automation layer, living in the operations tower. Each
    /// rule is bought once and then quietly runs the port a little better;
    /// the visible reward is flow. For anything not yet automated, the AI
    /// manager watches the port and raises accept/ignore recommendations
    /// (service that worn crane, hire another tractor, upgrade a choked
    /// warehouse) through the decision panel.
    /// </summary>
    public class PortAI : MonoBehaviour, IFocusInfo, IFocusActions
    {
        private sealed class RuleDef
        {
            public AiRule Rule;
            public string Label;
            public long Cost;
        }

        private static readonly RuleDef[] Rules =
        {
            new RuleDef { Rule = AiRule.PriorityBerthing, Label = "Priority berthing (urgent ships dock first)", Cost = 6000 },
            new RuleDef { Rule = AiRule.ColdFirst, Label = "Cold-first unloading (reefers off the deck first)", Cost = 5000 },
            new RuleDef { Rule = AiRule.AutoMaintenance, Label = "Auto-maintenance (cranes self-service at 60%)", Cost = 7000 },
            new RuleDef { Rule = AiRule.ExpressCustoms, Label = "Express customs (urgent cargo, KD 40/box fee)", Cost = 5500 },
            new RuleDef { Rule = AiRule.AutoContracts, Label = "Auto-accept contracts", Cost = 4500 },
        };

        public static PortAI Instance { get; private set; }

        public AiRule ActiveRules { get; private set; }
        public long ActionCount { get; private set; }

        private HudController _hud;
        private VehicleDispatcher _dispatcher;
        private CraneController[] _cranes;
        private Warehouse[] _warehouses;
        private float _recCooldownUntil;

        public static bool Has(AiRule rule)
        {
            return Instance != null && (Instance.ActiveRules & rule) != 0;
        }

        /// <summary>An automated rule just acted — count it, optionally banner it.</summary>
        public static void Note(string banner = null)
        {
            if (Instance == null) return;
            Instance.ActionCount++;
            if (banner != null && Instance._hud != null) Instance._hud.Banner(banner, 3f);
        }

        public static PortAI Attach(Transform operationsBuilding, HudController hud,
            VehicleDispatcher dispatcher, CraneController[] cranes, Warehouse[] warehouses)
        {
            var go = operationsBuilding.gameObject;
            var ai = go.AddComponent<PortAI>();
            ai._hud = hud;
            ai._dispatcher = dispatcher;
            ai._cranes = cranes;
            ai._warehouses = warehouses;

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 24f;
            focus.aimHeight = 4f;
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 4.5f, 0f);
            col.size = new Vector3(13f, 9f, 9f);
            return ai;
        }

        private void Awake()
        {
            Instance = this;
        }

        public void LoadRules(int mask, long actionCount)
        {
            ActiveRules = (AiRule)mask;
            ActionCount = actionCount;
        }

        private void Start()
        {
            StartCoroutine(RecommendationLoop());
        }

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => "Port Operations — PORT AI";

        public string FocusBody
        {
            get
            {
                var sb = new System.Text.StringBuilder();
                sb.AppendFormat("Automated actions taken: {0}\n", ActionCount);
                bool any = false;
                foreach (var rule in Rules)
                {
                    if ((ActiveRules & rule.Rule) == 0) continue;
                    sb.Append(any ? "\n" : "Active: ");
                    sb.Append(any ? "        " : "");
                    sb.Append(rule.Label);
                    any = true;
                }
                if (!any) sb.Append("No automation rules active yet");
                return sb.ToString();
            }
        }

        public FocusAction[] FocusActions
        {
            get
            {
                var actions = new System.Collections.Generic.List<FocusAction>(4);
                foreach (var rule in Rules)
                {
                    if ((ActiveRules & rule.Rule) != 0) continue;
                    if (actions.Count == 4) break;
                    var captured = rule;
                    actions.Add(new FocusAction
                    {
                        Label = captured.Label,
                        Cost = captured.Cost,
                        Available = () => EconomyManager.Instance.Balance >= captured.Cost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(captured.Cost, "PORT AI module"))
                            {
                                ActiveRules |= captured.Rule;
                                _hud.Banner("PORT AI online — " + captured.Label, 3.5f);
                            }
                        },
                    });
                }
                return actions.ToArray();
            }
        }

        // ---- AI manager recommendations ---------------------------------

        private IEnumerator RecommendationLoop()
        {
            yield return new WaitForSeconds(120f);
            while (true)
            {
                yield return new WaitForSeconds(20f);
                if (Time.time < _recCooldownUntil || _hud.DecisionBusy) continue;

                string text = null;
                System.Action accept = null;

                // Worn crane, and maintenance isn't automated yet.
                if (!Has(AiRule.AutoMaintenance))
                {
                    foreach (var crane in _cranes)
                    {
                        if (crane.Health < 50f && crane.State != CraneState.Broken)
                        {
                            var c = crane;
                            text = string.Format(
                                "PORT AI recommends:\nService {0} now (health {1:0}%)\nCost: KD {2:N0}",
                                c.FocusTitle, c.Health, Tuning.CraneMaintenanceCost);
                            accept = () => c.TryPurchaseService(" (recommended)");
                            break;
                        }
                    }
                }

                // Crowded anchorage with room left in the fleet.
                if (text == null && _dispatcher.Tractors.Count < Tuning.MaxTractors)
                {
                    int hires = _dispatcher.Tractors.Count - Tuning.StartingTractors;
                    if (hires < Tuning.HireTractorCosts.Length)
                    {
                        long cost = Tuning.HireTractorCosts[hires];
                        int queued = ShipmentDirector.WaitingShips;
                        if (queued >= 2 && EconomyManager.Instance.Balance >= cost)
                        {
                            text = string.Format(
                                "PORT AI recommends:\n{0} ships waiting offshore — hire tractor {1}?\nCost: KD {2:N0}",
                                queued, _dispatcher.Tractors.Count + 1, cost);
                            accept = () =>
                            {
                                if (EconomyManager.Instance.TrySpend(cost,
                                        "hired terminal tractor (recommended)"))
                                    _dispatcher.HireTractor();
                            };
                        }
                    }
                }

                // A chronically full store that can still be upgraded.
                if (text == null)
                {
                    foreach (var warehouse in _warehouses)
                    {
                        if (warehouse.StoredCount >= warehouse.Config.Capacity &&
                            warehouse.DispatchLevel < Tuning.DispatchCosts.Length)
                        {
                            var w = warehouse;
                            long cost = Tuning.DispatchCosts[w.DispatchLevel];
                            text = string.Format(
                                "PORT AI recommends:\n{0} is full — buy faster dispatch?\nCost: KD {1:N0}",
                                w.Config.Title, cost);
                            accept = () => w.TryPurchaseDispatchUpgrade(" (recommended)");
                            break;
                        }
                    }
                }

                if (text == null) continue;

                bool answered = false;
                _hud.ShowContractOffer(text,
                    () => { answered = true; accept(); },
                    () => { answered = true; });
                float waited = 0f;
                while (!answered && waited < 18f)
                {
                    waited += Time.deltaTime;
                    yield return null;
                }
                _hud.HideContractOffer();
                _recCooldownUntil = Time.time + 180f;
            }
        }
    }
}
