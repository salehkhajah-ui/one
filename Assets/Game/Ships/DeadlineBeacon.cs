using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// A small floating marker above a ship that carries its deadline urgency
    /// into the world: green → amber → orange → red, pulsing when critical.
    /// Environmental communication instead of an alert popup.
    /// </summary>
    public class DeadlineBeacon : MonoBehaviour
    {
        private const float BaseScale = 1.1f;

        private ShipController _ship;
        private Material _mat;
        private Transform _visual;

        public static void Attach(ShipController ship)
        {
            var go = new GameObject("DeadlineBeacon");
            go.transform.SetParent(ship.transform, false);
            go.transform.localPosition = new Vector3(0f, 13.5f, -17f); // above the bridge
            var beacon = go.AddComponent<DeadlineBeacon>();
            beacon._ship = ship;

            beacon._mat = MaterialLibrary.Create(Color.white, 0.4f);
            var visual = Prim.Sphere("BeaconVisual", go.transform, Vector3.zero,
                new Vector3(BaseScale, BaseScale, BaseScale), beacon._mat);
            beacon._visual = visual.transform;
        }

        private void Update()
        {
            if (_ship == null || _ship.Shipment == null) return;

            bool done = _ship.Shipment.Delivered >= _ship.Shipment.Count ||
                        _ship.State == ShipState.Departing || _ship.State == ShipState.Gone;
            _visual.gameObject.SetActive(!done);
            if (done) return;

            var urgency = _ship.Shipment.Urgency;
            var color = Shipment.UrgencyColor(urgency);
            _mat.color = color;
            MaterialLibrary.SetEmission(_mat, color * 1.6f); // readable day and night

            // Gentle float; anxious pulse only when critical.
            float bob = Mathf.Sin(Time.time * 1.6f) * 0.25f;
            _visual.localPosition = new Vector3(0f, bob, 0f);
            float pulse = urgency == Urgency.Red
                ? 1f + 0.22f * Mathf.Sin(Time.time * 7f)
                : 1f;
            _visual.localScale = new Vector3(BaseScale, BaseScale, BaseScale) * pulse;
        }
    }
}
