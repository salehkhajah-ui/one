using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public enum ShipState
    {
        Offshore,
        Anchored,
        Approaching,
        Docking,
        Docked,
        Unloading,
        Departing,
        Gone,
    }

    /// <summary>
    /// A named cargo ship carrying one Shipment. Sails from open sea to the
    /// holding anchorage; when the berth is free it runs the approach and
    /// eases onto the berth. A ship waiting at anchor is the visible face of
    /// berth congestion — and its deadline keeps burning while it waits.
    /// Bob/roll live on a Hull child so root motion stays clean.
    /// </summary>
    public class ShipController : MonoBehaviour, IFocusInfo
    {
        private const float RootY = 0.15f;

        public ShipState State { get; private set; } = ShipState.Offshore;
        public Shipment Shipment { get; private set; }
        public readonly List<Container> Containers = new List<Container>();

        private Transform _hull;
        private float _bobPhase;
        private Vector3 _anchorPos;
        private float _berthX;

        private static readonly Quaternion BerthRot = Quaternion.Euler(0f, 270f, 0f);

        public static ShipController Build(Transform parent, Shipment shipment, int anchorSlot)
        {
            var go = new GameObject("Ship " + shipment.ShipName);
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(150f + anchorSlot * 14f, RootY, -95f - anchorSlot * 10f);

            var ship = go.AddComponent<ShipController>();
            ship._anchorPos = new Vector3(95f + anchorSlot * 16f, RootY, -62f - anchorSlot * 13f);
            go.transform.rotation = Quaternion.LookRotation(ship._anchorPos - go.transform.position);

            ship.Shipment = shipment;
            ship._bobPhase = Random.value * 10f;
            ship.BuildVisual(shipment);
            DeadlineBeacon.Attach(ship);

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 36f;
            focus.aimHeight = 3f;
            focus.follow = true;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 2.5f, 0f);
            col.size = new Vector3(10f, 9f, 50f);
            return ship;
        }

        private void BuildVisual(Shipment shipment)
        {
            _hull = Prim.Group("Hull", transform, Vector3.zero);
            var hullMat = MaterialLibrary.Get(Palette.HullRed, 0.3f);
            var white = MaterialLibrary.Get(Palette.ShipWhite, 0.35f);
            var deckMat = MaterialLibrary.Get(Palette.ConcreteDark, 0.2f);

            // The ship's length runs along local +z (its forward axis).
            Prim.Cube("HullBody", _hull, new Vector3(0f, 1.35f, 0f), new Vector3(9f, 2.7f, 44f), hullMat);
            Prim.Cube("Deck", _hull, new Vector3(0f, 2.8f, 0f), new Vector3(9.2f, 0.25f, 44f), deckMat);
            var bow = Prim.Cube("Bow", _hull, new Vector3(0f, 1.35f, 23.5f),
                new Vector3(6.36f, 2.7f, 6.36f), hullMat);
            bow.transform.localRotation = Quaternion.Euler(0f, 45f, 0f);

            // Superstructure at the stern (−z).
            Prim.Cube("Castle", _hull, new Vector3(0f, 4.6f, -17f), new Vector3(7.4f, 3.6f, 6f), white);
            Prim.Cube("Bridge", _hull, new Vector3(0f, 7.1f, -17f), new Vector3(8f, 1.5f, 7f), white);
            Prim.Cube("BridgeGlass", _hull, new Vector3(0f, 7.1f, -13.4f),
                new Vector3(7.2f, 0.9f, 0.18f), MaterialLibrary.Get(Palette.Hex("#3D4A55"), 0.8f));
            Prim.Cylinder("Funnel", _hull, new Vector3(0f, 9.4f, -19.6f),
                new Vector3(1.6f, 1.1f, 1.6f), hullMat);

            // Deck cargo: one row of containers in the shipment's cargo color,
            // alternating lightness so the row reads as individual boxes.
            // Spread stays within ±12 m so the crane gantry (legs ±4.5 m
            // beyond) never sweeps into the parking lane west of the quay.
            for (int i = 0; i < shipment.Count; i++)
            {
                float z = -12f + i * (24f / Mathf.Max(1, shipment.Count - 1));
                var color = Color.Lerp(shipment.Cargo.Color, Palette.ShipWhite, (i % 2) * 0.18f);
                var c = Container.Build(_hull,
                    new Vector3(0f, 2.8f + Tuning.ContainerSize.y * 0.5f + 0.12f, z), color);
                // Long axis along the ship's length.
                c.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);
                c.Cargo = shipment.Cargo;
                c.Shipment = shipment;
                Containers.Add(c);
            }
        }

        // ---- IFocusInfo --------------------------------------------------

        public string FocusTitle => Shipment.ShipName;

        public string FocusBody
        {
            get
            {
                int left = Shipment.Count - Shipment.Delivered;
                return string.Format(
                    "{0} · from {1}{2}\nContainers: {3} of {4} remaining\nDeadline: {5}\nReward: KD {6:N0} per container\n{7}",
                    Shipment.Cargo.DisplayName, Shipment.Cargo.Origin,
                    Shipment.Cargo.Refrigerated ? "  ·  refrigerated" : "",
                    left, Shipment.Count,
                    Shipment.RemainingText,
                    Shipment.RewardPerContainer,
                    StatusLine());
            }
        }

        private string StatusLine()
        {
            switch (State)
            {
                case ShipState.Anchored: return "Holding at anchor — berth occupied";
                case ShipState.Approaching:
                case ShipState.Offshore: return "Inbound";
                case ShipState.Docking: return "Docking";
                case ShipState.Docked: return "Docked";
                case ShipState.Unloading: return "Unloading";
                case ShipState.Departing: return "Departing";
                default: return "";
            }
        }

        // ---- Voyage ------------------------------------------------------

        /// <summary>Open sea → holding anchorage. Started right at spawn.</summary>
        public IEnumerator ApproachAnchor()
        {
            State = ShipState.Offshore;
            yield return SailTowards(_anchorPos, 3f, Tuning.ShipCruiseSpeed);
            State = ShipState.Anchored;
        }

        /// <summary>
        /// Anchorage → approach corridor → eased berth blend at the assigned
        /// berth. The corridor runs south of the berths (z −26) so an
        /// arriving ship clears a vessel already docked at the other berth.
        /// </summary>
        public IEnumerator DockFromAnchor(float berthX)
        {
            _berthX = berthX;
            State = ShipState.Approaching;
            if (AudioManager.Instance != null) AudioManager.Instance.Horn();
            var turn = new Vector3(55f, RootY, -38f);
            var corridor = new Vector3(berthX + 18f, RootY, -26f);
            yield return SailTowards(turn, 3f, -1f,
                Vector3.Distance(turn, corridor) + 20f);
            yield return SailTowards(corridor, 2f, -1f, 20f);

            State = ShipState.Docking;
            Vector3 berthPos = new Vector3(berthX, RootY, Tuning.BerthZ);
            Vector3 startPos = transform.position;
            Quaternion startRot = transform.rotation;
            yield return Ease.Animate(Tuning.ShipDockSeconds, t =>
            {
                transform.SetPositionAndRotation(
                    Vector3.Lerp(startPos, berthPos, t),
                    Quaternion.Slerp(startRot, BerthRot, t));
            });
            State = ShipState.Docked;
        }

        public void BeginUnloading()
        {
            State = ShipState.Unloading;
        }

        public IEnumerator Depart()
        {
            State = ShipState.Departing;
            if (AudioManager.Instance != null) AudioManager.Instance.Horn();
            float speed = 0f;
            // Pull out south of the berth line first so the other berth's
            // occupant is cleared, then out to open sea.
            var departurePath = new[]
            {
                new Vector3(_berthX - 45f, RootY, -32f),
                new Vector3(-120f, RootY, -72f),
                new Vector3(-175f, RootY, -112f),
            };
            foreach (var target in departurePath)
            {
                while (true)
                {
                    Vector3 toTarget = target - transform.position;
                    toTarget.y = 0f;
                    if (toTarget.magnitude < 4f) break;

                    speed = Mathf.MoveTowards(speed, Tuning.ShipCruiseSpeed * 1.15f, 1.6f * Time.deltaTime);
                    transform.rotation = Quaternion.Slerp(transform.rotation,
                        Quaternion.LookRotation(toTarget.normalized), 0.55f * Time.deltaTime);
                    transform.position += transform.forward * speed * Time.deltaTime;
                    yield return null;
                }
            }
            State = ShipState.Gone;
        }

        /// <summary>
        /// Sail toward a point, slerping the heading. Speed is fixedSpeed, or
        /// (when fixedSpeed &lt; 0) derived from remaining distance including
        /// <paramref name="distanceAfter"/> so multi-leg approaches decelerate.
        /// </summary>
        private IEnumerator SailTowards(Vector3 target, float arriveWithin, float fixedSpeed,
            float distanceAfter = 0f)
        {
            while (true)
            {
                Vector3 toTarget = target - transform.position;
                toTarget.y = 0f;
                float dist = toTarget.magnitude;
                if (dist < arriveWithin) break;

                float speed = fixedSpeed > 0f
                    ? fixedSpeed
                    : Mathf.Min(Tuning.ShipCruiseSpeed, 2f + (dist + distanceAfter) * 0.09f);
                if (WeatherManager.Instance != null) speed *= WeatherManager.Instance.ShipSpeedScale;

                transform.rotation = Quaternion.Slerp(transform.rotation,
                    Quaternion.LookRotation(toTarget.normalized), 0.6f * Time.deltaTime);
                transform.position += transform.forward * speed * Time.deltaTime;
                yield return null;
            }
        }

        private void Update()
        {
            // Gentle bob/roll on the hull child only; calmer while docked,
            // heavier as weather raises the sea.
            float calm = (State == ShipState.Docked || State == ShipState.Unloading) ? 0.45f : 1f;
            if (WeatherManager.Instance != null)
                calm *= Mathf.Lerp(1f, WeatherManager.Instance.SeaScale, 0.7f);
            float t = Time.time + _bobPhase;
            _hull.localPosition = new Vector3(0f, Mathf.Sin(t * 0.85f) * 0.07f * calm, 0f);
            _hull.localRotation = Quaternion.Euler(
                Mathf.Sin(t * 0.5f) * 0.35f * calm, 0f, Mathf.Sin(t * 0.62f) * 0.5f * calm);
        }
    }
}
