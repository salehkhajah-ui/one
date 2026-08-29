using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// The green-port program, run from a small utility yard behind the
    /// admin plaza. Two investments: a solar array that visibly appears on
    /// both warehouse roofs (and adds a green premium to dispatch revenue),
    /// and an electric tractor fleet (repainted, a little quicker). Each
    /// pays a one-time reputation bonus — green ports attract business.
    /// </summary>
    public class GreenEnergyYard : MonoBehaviour, IFocusInfo, IFocusActions
    {
        public static bool SolarActive { get; private set; }

        public bool Solar { get; private set; }
        public bool ElectricFleet { get; private set; }

        private Warehouse[] _warehouses;
        private VehicleDispatcher _dispatcher;
        private Reputation _reputation;
        private HudController _hud;

        public static GreenEnergyYard Build(Transform parent, Warehouse[] warehouses,
            VehicleDispatcher dispatcher, Reputation reputation, HudController hud)
        {
            var go = new GameObject("GreenEnergyYard");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(-66f, Tuning.QuayTopY, 41f);

            var yard = go.AddComponent<GreenEnergyYard>();
            yard._warehouses = warehouses;
            yard._dispatcher = dispatcher;
            yard._reputation = reputation;
            yard._hud = hud;
            yard.BuildVisual();

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 18f;
            focus.aimHeight = 1.5f;
            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 1.2f, 0f);
            col.size = new Vector3(8f, 2.5f, 5f);
            return yard;
        }

        private void Awake()
        {
            SolarActive = false; // reset per session; restored via LoadState
        }

        private void BuildVisual()
        {
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);
            // Transformer cabinets and a fenced pad.
            foreach (float x in new[] { -2.4f, 0f, 2.4f })
                Prim.Cube("Transformer", transform, new Vector3(x, 0.9f, 0f),
                    new Vector3(1.8f, 1.8f, 1.6f), steel);
            for (int x = -4; x <= 4; x += 2)
                Prim.Cube("Fence", transform, new Vector3(x, 0.5f, -2.2f),
                    new Vector3(0.1f, 1f, 0.1f), steel);
        }

        public void LoadState(bool solar, bool electricFleet)
        {
            if (solar) ApplySolar(silent: true);
            if (electricFleet) ApplyElectricFleet(silent: true);
        }

        private void ApplySolar(bool silent)
        {
            Solar = true;
            SolarActive = true;
            // Tilted panel rows appear on both warehouse roofs.
            var panelMat = MaterialLibrary.Create(Palette.Hex("#26333F"), 0.85f, 0.3f);
            foreach (var warehouse in _warehouses)
            {
                for (int row = 0; row < 2; row++)
                    for (int i = 0; i < 3; i++)
                    {
                        var panel = Prim.Cube("SolarPanel", warehouse.transform,
                            new Vector3(-4.5f + i * 4.5f, 7.9f, -2.6f + row * 5f),
                            new Vector3(3.4f, 0.08f, 2f), panelMat);
                        panel.transform.localRotation = Quaternion.Euler(-20f, 0f, 0f);
                    }
            }
            if (!silent)
            {
                _reputation.Add(Tuning.GreenRepBonus, "solar arrays installed");
                _hud.Banner("Solar arrays online — green dispatch premium active");
            }
        }

        private void ApplyElectricFleet(bool silent)
        {
            ElectricFleet = true;
            // The whole fleet repaints (the cab material is shared) and gains
            // a bit of pace on top of any speed upgrades.
            MaterialLibrary.Get(Palette.TractorBlue, 0.4f, 0.15f).color = Palette.Hex("#4F8C7A");
            _dispatcher.ElectricFleet = true;
            if (!silent)
            {
                _reputation.Add(Tuning.GreenRepBonus, "electric tractor fleet");
                _hud.Banner("Electric fleet in service");
            }
        }

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => "Green Energy Yard";

        public string FocusBody
        {
            get
            {
                int cut = (Solar ? 24 : 0) + (ElectricFleet ? 18 : 0);
                return string.Format(
                    "Estimated emissions cut: {0}%\nSolar arrays: {1}\nElectric fleet: {2}",
                    cut, Solar ? "installed" : "—", ElectricFleet ? "in service" : "—");
            }
        }

        public FocusAction[] FocusActions
        {
            get
            {
                var actions = new System.Collections.Generic.List<FocusAction>(2);
                if (!Solar)
                {
                    actions.Add(new FocusAction
                    {
                        Label = "Install solar arrays (+KD 40/dispatch, +rep)",
                        Cost = Tuning.SolarCost,
                        Available = () => EconomyManager.Instance.Balance >= Tuning.SolarCost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(Tuning.SolarCost, "solar arrays"))
                                ApplySolar(silent: false);
                        },
                    });
                }
                if (!ElectricFleet)
                {
                    actions.Add(new FocusAction
                    {
                        Label = "Electrify tractor fleet (+10% speed, +rep)",
                        Cost = Tuning.ElectricFleetCost,
                        Available = () => EconomyManager.Instance.Balance >= Tuning.ElectricFleetCost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(Tuning.ElectricFleetCost, "electric fleet"))
                                ApplyElectricFleet(silent: false);
                        },
                    });
                }
                return actions.ToArray();
            }
        }
    }
}
