using UnityEngine;

namespace PortGame
{
    public enum ContainerState
    {
        OnShip,
        BeingUnloaded,
        OnCraneSpreader,
        AwaitingTransport,
        OnTractor,
        BeingReceived,
        Delivered,
    }

    /// <summary>
    /// A physical container. It is re-parented as it moves through the port
    /// (ship deck → spreader → trailer bed → warehouse) — it never teleports.
    /// Cargo identity (goods, temperature, decay) arrives with CargoTypeSO in
    /// Phase 2; the state machine is already the production one.
    /// </summary>
    public class Container : MonoBehaviour
    {
        private static int _nextId = 1;

        public int Id { get; private set; }
        public ContainerState State { get; set; } = ContainerState.OnShip;

        /// <summary>What's inside — drives its per-container reward. Null for décor.</summary>
        public CargoType Cargo { get; set; }

        /// <summary>The shipment this box belongs to, so parallel berths credit correctly.</summary>
        public Shipment Shipment { get; set; }

        /// <summary>100 → 0. Refrigerated cargo loses quality outside the cold chain and pays by what's left.</summary>
        public float Quality { get; private set; } = 100f;

        /// <summary>Flagged on the manifest (or hazardous) — must clear the customs bay first.</summary>
        public bool NeedsCustoms { get; set; }

        public bool CustomsCleared { get; set; }

        private void Update()
        {
            if (Cargo == null || Cargo.DecayPerMinute <= 0f) return;
            // Outside the cold chain from crane pick to warehouse intake.
            switch (State)
            {
                case ContainerState.BeingUnloaded:
                case ContainerState.OnCraneSpreader:
                case ContainerState.AwaitingTransport:
                case ContainerState.OnTractor:
                case ContainerState.BeingReceived:
                    Quality = Mathf.Max(0f, Quality - Cargo.DecayPerMinute * Time.deltaTime / 60f);
                    break;
            }
        }

        public static Container Build(Transform parent, Vector3 localPos, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "Container";
            var t = go.transform;
            t.SetParent(parent, false);
            t.localPosition = localPos;
            t.localScale = Tuning.ContainerSize;
            go.GetComponent<Renderer>().sharedMaterial = MaterialLibrary.Get(color, 0.3f);
            var col = go.GetComponent<Collider>();
            if (col != null) Destroy(col);

            var c = go.AddComponent<Container>();
            c.Id = _nextId++;
            return c;
        }
    }
}
