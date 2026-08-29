using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// The customs post beside the inspection bay. Flagged containers (a cut
    /// of every manifest, and all hazardous cargo) dwell here on their way to
    /// storage while the scanner posts pulse. Express-clearance upgrades
    /// shorten the dwell; a crackdown event temporarily flags everything.
    /// </summary>
    public class CustomsOffice : MonoBehaviour, IFocusInfo, IFocusActions
    {
        public int Level { get; set; }
        public int InspectedCount { get; private set; }

        private float _crackdownUntil = -1f;
        private Material _scannerMat;
        private bool _scanning;

        public bool CrackdownActive => Time.time < _crackdownUntil;

        public float DwellSeconds =>
            Mathf.Max(4f, Tuning.CustomsBaseDwell * (1f - Tuning.CustomsDwellPerLevel * Level));

        public static CustomsOffice Build(Transform parent, DayNightCycle dayNight)
        {
            var go = new GameObject("CustomsOffice");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(50f, Tuning.QuayTopY, 11f);

            var office = go.AddComponent<CustomsOffice>();
            office.BuildVisual(dayNight);

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 20f;
            focus.aimHeight = 2f;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 2f, 0f);
            col.size = new Vector3(6f, 4f, 5f);
            return office;
        }

        private void BuildVisual(DayNightCycle dayNight)
        {
            var wall = MaterialLibrary.Get(Palette.WarehouseWall, 0.2f);
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);

            Prim.Cube("Office", transform, new Vector3(0f, 1.8f, 0f), new Vector3(5.5f, 3.6f, 4.2f), wall);
            Prim.Cube("OfficeRoof", transform, new Vector3(0f, 3.75f, 0f), new Vector3(6f, 0.35f, 4.7f),
                MaterialLibrary.Get(Palette.WarehouseRoof, 0.3f));
            var windowMat = MaterialLibrary.Create(Palette.Hex("#3D4A55"), 0.75f, 0.1f);
            dayNight.RegisterNightEmissive(windowMat, Palette.WarmLight * 1.4f);
            Prim.Cube("OfficeWindow", transform, new Vector3(-1.2f, 2.1f, -2.15f),
                new Vector3(1.6f, 1.1f, 0.1f), windowMat);

            // Scanner posts flanking the inspection bay (west of the office),
            // pulsing while a container is inspected.
            _scannerMat = MaterialLibrary.Create(Palette.Hex("#5FB0A6"), 0.4f);
            foreach (float z in new[] { -2.2f, 2.2f })
                Prim.Cube("ScannerPost", transform, new Vector3(-6.5f, 2.2f, z),
                    new Vector3(0.4f, 4.4f, 0.4f), _scannerMat);
            Prim.Cube("ScannerBeam", transform, new Vector3(-6.5f, 4.5f, 0f),
                new Vector3(0.35f, 0.35f, 4.8f), _scannerMat);
        }

        public void TriggerCrackdown(float seconds)
        {
            _crackdownUntil = Time.time + seconds;
        }

        public bool RequiresInspection(Container container)
        {
            if (container.CustomsCleared) return false;
            return container.NeedsCustoms ||
                   (container.Cargo != null && container.Cargo.Hazard) ||
                   CrackdownActive;
        }

        /// <summary>The tractor dwells in the bay while this runs.</summary>
        public IEnumerator Inspect(Container container)
        {
            _scanning = true;
            yield return new WaitForSeconds(DwellSeconds);
            _scanning = false;
            container.CustomsCleared = true;
            InspectedCount++;
            EconomyManager.Instance.Add(Tuning.CustomsFee, "customs fee", quiet: true);
        }

        private void Update()
        {
            // Scanner glow: pulses during an inspection, faint otherwise.
            float pulse = _scanning ? 1.2f + 0.8f * Mathf.Sin(Time.time * 9f) : 0.12f;
            MaterialLibrary.SetEmission(_scannerMat, Palette.Hex("#5FB0A6") * Mathf.Max(0f, pulse));
        }

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => "Customs Office";

        public string FocusBody => string.Format(
            "Inspection dwell: {0:0.#}s per container\nInspected total: {1}{2}",
            DwellSeconds, InspectedCount,
            CrackdownActive ? "\nCRACKDOWN — all cargo inspected" : "");

        public FocusAction[] FocusActions
        {
            get
            {
                if (Level >= Tuning.CustomsCosts.Length) return new FocusAction[0];
                long cost = Tuning.CustomsCosts[Level];
                return new[]
                {
                    new FocusAction
                    {
                        Label = string.Format("Express clearance (−25% dwell), Lv {0}→{1}", Level, Level + 1),
                        Cost = cost,
                        Available = () => EconomyManager.Instance.Balance >= cost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(cost, "customs express clearance"))
                                Level++;
                        },
                    },
                };
            }
        }
    }
}
