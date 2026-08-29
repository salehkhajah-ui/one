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
