using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public enum TractorState
    {
        ParkAtLoadPoint,
        WaitForLoad,
        HaulToWarehouse,
        Unloading,
        ReturnLoop,
    }

    /// <summary>
    /// Terminal tractor on a perpetual duty loop: wait under the crane, haul
    /// the container along the port road to the warehouse, hand it over,
    /// drive the return loop. Driving uses acceleration, braking distance and
    /// a turn-rate limit so the motion reads as a real vehicle.
    /// </summary>
    public class TerminalTractor : MonoBehaviour
    {
        public TractorState State { get; private set; } = TractorState.ParkAtLoadPoint;

        /// <summary>True when parked at the load point with an empty trailer.</summary>
        public bool ReadyForLoad { get; private set; }

        private Transform _bedAnchor;
        private Container _carried;
        private Warehouse _warehouse;
        private readonly List<Transform> _wheels = new List<Transform>();
        private float _speed;

        public static TerminalTractor Build(Transform parent, Warehouse warehouse)
        {
            var go = new GameObject("TerminalTractor");
            go.transform.SetParent(parent, false);
            go.transform.position = Tuning.LoadPoint;
            go.transform.rotation = Quaternion.Euler(0f, 90f, 0f); // facing +x, down the lane

            var tractor = go.AddComponent<TerminalTractor>();
            tractor._warehouse = warehouse;
            tractor.BuildVisual();

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 16f;
            focus.aimHeight = 1.5f;
            focus.follow = true;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 1.2f, 0f);
            col.size = new Vector3(3f, 2.5f, 8.5f);
            return tractor;
        }

        private void BuildVisual()
        {
            var blue = MaterialLibrary.Get(Palette.TractorBlue, 0.4f, 0.15f);
            var dark = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);
            var glass = MaterialLibrary.Get(Palette.Hex("#3D4A55"), 0.8f);

            // Cab at the front (+z), flat trailer behind.
            Prim.Cube("Cab", transform, new Vector3(0f, 1.55f, 2.9f), new Vector3(2.2f, 1.7f, 1.8f), blue);
            Prim.Cube("CabGlass", transform, new Vector3(0f, 1.85f, 3.82f), new Vector3(1.8f, 0.8f, 0.1f), glass);
            Prim.Cube("Chassis", transform, new Vector3(0f, 0.85f, 0.3f), new Vector3(2.1f, 0.35f, 7.6f), dark);
            Prim.Cube("TrailerBed", transform, new Vector3(0f, Tuning.TrailerBedY - Tuning.QuayTopY - 0.09f, -0.9f),
                new Vector3(2.5f, 0.18f, 5.4f), MaterialLibrary.Get(Palette.Steel, 0.35f, 0.4f));

            // Wheels (spun by speed in Update).
            foreach (float z in new[] { 2.9f, -0.4f, -2.6f })
            {
                foreach (float x in new[] { -1.05f, 1.05f })
                {
                    var w = Prim.Cylinder("Wheel", transform, new Vector3(x, 0.45f, z),
                        new Vector3(0.9f, 0.18f, 0.9f), dark).transform;
                    w.localRotation = Quaternion.Euler(0f, 0f, 90f);
                    _wheels.Add(w);
                }
            }

            // Scale-1 anchor for the carried container; rotated so the
            // container's long axis (its local x) lies along the vehicle.
            var anchor = new GameObject("BedAnchor");
            anchor.transform.SetParent(transform, false);
            anchor.transform.localPosition = new Vector3(0f,
                Tuning.TrailerBedY - Tuning.QuayTopY + Tuning.ContainerSize.y * 0.5f, -0.9f);
            anchor.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);
            _bedAnchor = anchor.transform;
        }

        private void Start()
        {
            StartCoroutine(DutyLoop());
        }

        /// <summary>Called by the crane at the moment of release.</summary>
        public void AcceptContainer(Container container)
        {
            _carried = container;
            container.transform.SetParent(_bedAnchor, true);
            container.State = ContainerState.OnTractor;
            StartCoroutine(Ease.Animate(0.25f, t =>
            {
                container.transform.localPosition = Vector3.Lerp(container.transform.localPosition, Vector3.zero, t);
                container.transform.localRotation = Quaternion.Slerp(container.transform.localRotation, Quaternion.identity, t);
            }, Ease.OutCubic));
            ReadyForLoad = false;
        }

        private IEnumerator DutyLoop()
        {
            while (true)
            {
                State = TractorState.WaitForLoad;
                ReadyForLoad = true;
                while (_carried == null) yield return null;

                // Small pause so the spreader visibly lifts clear first.
                yield return new WaitForSeconds(0.7f);

                State = TractorState.HaulToWarehouse;
                yield return DrivePath(Tuning.TractorOutboundPath);

                State = TractorState.Unloading;
                yield return _warehouse.Receive(_carried);
                _carried = null;

                State = TractorState.ReturnLoop;
                yield return DrivePath(Tuning.TractorReturnPath);

                // Settle back into the load-point pose.
                State = TractorState.ParkAtLoadPoint;
                Vector3 p0 = transform.position;
                Quaternion r0 = transform.rotation;
                yield return Ease.Animate(0.6f, t =>
                {
                    transform.SetPositionAndRotation(
                        Vector3.Lerp(p0, Tuning.LoadPoint, t),
                        Quaternion.Slerp(r0, Quaternion.Euler(0f, 90f, 0f), t));
                }, Ease.OutCubic);
            }
        }

        private IEnumerator DrivePath(Vector3[] path)
        {
            for (int leg = 0; leg < path.Length; leg++)
            {
                Vector3 target = path[leg];
                while (true)
                {
                    Vector3 toTarget = target - transform.position;
                    toTarget.y = 0f;
                    float dist = toTarget.magnitude;
                    if (dist < 0.8f) break;

                    // Braking distance to the end of the path: v = √(2·a·d).
                    float remaining = dist;
                    for (int i = leg + 1; i < path.Length; i++)
                        remaining += Vector3.Distance(path[i - 1], path[i]);
                    float vMax = Mathf.Min(Tuning.TractorMaxSpeed,
                        Mathf.Sqrt(2f * Tuning.TractorAccel * remaining) * 0.85f + 0.4f);

                    _speed = Mathf.MoveTowards(_speed, vMax, Tuning.TractorAccel * Time.deltaTime);

                    Quaternion want = Quaternion.LookRotation(toTarget.normalized);
                    transform.rotation = Quaternion.RotateTowards(transform.rotation, want,
                        Tuning.TractorTurnDegPerSec * Time.deltaTime);
                    transform.position += transform.forward * _speed * Time.deltaTime;
                    yield return null;
                }
            }
            _speed = 0f;
        }

        private void Update()
        {
            if (_speed > 0.01f)
            {
                float deg = _speed / 0.45f * Mathf.Rad2Deg * Time.deltaTime;
                for (int i = 0; i < _wheels.Count; i++)
                    _wheels[i].Rotate(0f, deg, 0f, Space.Self);
            }
        }
    }
}
