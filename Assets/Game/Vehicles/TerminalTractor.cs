using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public enum TractorState
    {
        Parked,
        EnRoute,
        WaitingAtCrane,
        HaulToWarehouse,
        Unloading,
    }

    /// <summary>
    /// A terminal tractor driving the road graph. It claims the next node
    /// before entering it and holds its current node until it arrives at the
    /// next — so following vehicles brake and queue physically behind it.
    /// The dispatcher tells an empty tractor where to stand (a crane's load
    /// bay, or the parking lane); a loaded tractor always hauls to the
    /// warehouse. Fleet speed upgrades come from the dispatcher.
    /// </summary>
    public class TerminalTractor : MonoBehaviour, IFocusInfo, IFocusActions
    {
        public TractorState State { get; private set; } = TractorState.Parked;
        public RoadNode CurrentNode { get; private set; }
        public Container Carrying { get; private set; }
        public int Index { get; private set; }

        private RoadGraph _graph;
        private VehicleDispatcher _dispatcher;
        private Warehouse _warehouse;
        private Transform _bedAnchor;
        private readonly List<Transform> _wheels = new List<Transform>();
        private float _speed;
        private bool _moving;
        private bool _holdForLoading;

        public bool ParkedAt(RoadNode node) =>
            CurrentNode == node && !_moving && Carrying == null && !_holdForLoading;

        public static TerminalTractor Build(Transform parent, int index, RoadGraph graph,
            VehicleDispatcher dispatcher, Warehouse warehouse, RoadNode startNode)
        {
            var go = new GameObject("TerminalTractor" + index);
            go.transform.SetParent(parent, false);
            go.transform.position = startNode.Pos;
            go.transform.rotation = Quaternion.Euler(0f, 90f, 0f);

            var tractor = go.AddComponent<TerminalTractor>();
            tractor.Index = index;
            tractor._graph = graph;
            tractor._dispatcher = dispatcher;
            tractor._warehouse = warehouse;
            tractor.CurrentNode = startNode;
            graph.TryClaim(startNode, tractor);
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

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => "Terminal Tractor " + Index;

        public string FocusBody
        {
            get
            {
                switch (State)
                {
                    case TractorState.WaitingAtCrane: return "Waiting under the crane";
                    case TractorState.HaulToWarehouse: return "Hauling to warehouse";
                    case TractorState.Unloading: return "Delivering at warehouse door";
                    case TractorState.EnRoute: return "Driving";
                    default: return "Parked";
                }
            }
        }

        /// <summary>Fleet-wide actions (speed, hires) live on the dispatcher; any tractor's card offers them.</summary>
        public FocusAction[] FocusActions => _dispatcher.FleetActions;

        // ---- Crane handshake --------------------------------------------

        /// <summary>Called by a crane that has chosen this parked tractor — pins it until loaded.</summary>
        public void BeginLoading()
        {
            _holdForLoading = true;
        }

        /// <summary>Called by the crane at the moment of release.</summary>
        public void AcceptContainer(Container container)
        {
            Carrying = container;
            _holdForLoading = false;
            container.transform.SetParent(_bedAnchor, true);
            container.State = ContainerState.OnTractor;
            StartCoroutine(Ease.Animate(0.25f, t =>
            {
                container.transform.localPosition = Vector3.Lerp(container.transform.localPosition, Vector3.zero, t);
                container.transform.localRotation = Quaternion.Slerp(container.transform.localRotation, Quaternion.identity, t);
            }, Ease.OutCubic));
        }

        // ---- Duty loop ---------------------------------------------------

        private void Start()
        {
            StartCoroutine(DutyLoop());
        }

        private IEnumerator DutyLoop()
        {
            while (true)
            {
                if (Carrying != null)
                {
                    // Brief pause so the spreader visibly lifts clear first.
                    State = TractorState.HaulToWarehouse;
                    yield return new WaitForSeconds(0.7f);
                    yield return DriveTo(_graph["WH"]);

                    State = TractorState.Unloading;
                    yield return _warehouse.Receive(Carrying);
                    Carrying = null;
                    continue;
                }

                var station = _dispatcher.DesiredStation(this);
                if (CurrentNode != station)
                {
                    State = TractorState.EnRoute;
                    yield return DriveTo(station);
                    continue;
                }

                State = _dispatcher.IsCraneStation(station)
                    ? TractorState.WaitingAtCrane
                    : TractorState.Parked;

                // Hold position; wake on load, on a crane pinning us, or to re-check assignment.
                float t = 0f;
                while ((t < 0.6f || _holdForLoading) && Carrying == null)
                {
                    t += Time.deltaTime;
                    yield return null;
                }
            }
        }

        private IEnumerator DriveTo(RoadNode target)
        {
            if (CurrentNode == target) yield break;
            _moving = true;
            var path = _graph.FindPath(CurrentNode, target);
            for (int i = 1; i < path.Count; i++)
            {
                var next = path[i];
                // Queueing happens here: brake and hold until the node frees.
                while (!_graph.TryClaim(next, this))
                {
                    _speed = Mathf.MoveTowards(_speed, 0f, Tuning.TractorAccel * 2f * Time.deltaTime);
                    yield return null;
                }
                yield return DriveSegment(next.Pos, i == path.Count - 1 ? 0f : 2.2f);
                _graph.Release(CurrentNode, this);
                CurrentNode = next;
            }
            _speed = 0f;
            _moving = false;
        }

        private IEnumerator DriveSegment(Vector3 dest, float endSpeed)
        {
            while (true)
            {
                Vector3 toTarget = dest - transform.position;
                toTarget.y = 0f;
                float dist = toTarget.magnitude;
                if (dist < 0.7f) break;

                // Braking profile into the segment end: v = √(v_end² + 2·a·d).
                float weather = WeatherManager.Instance != null ? WeatherManager.Instance.TractorScale : 1f;
                float vMax = Mathf.Min(
                    Tuning.TractorMaxSpeed * _dispatcher.TractorSpeedMult * weather,
                    Mathf.Sqrt(endSpeed * endSpeed + 2f * Tuning.TractorAccel * dist) * 0.9f + 0.3f);
                _speed = Mathf.MoveTowards(_speed, vMax, Tuning.TractorAccel * Time.deltaTime);

                Quaternion want = Quaternion.LookRotation(toTarget.normalized);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, want,
                    Tuning.TractorTurnDegPerSec * Time.deltaTime);
                transform.position += transform.forward * _speed * Time.deltaTime;
                yield return null;
            }
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
