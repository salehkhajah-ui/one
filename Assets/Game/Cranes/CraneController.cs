using System.Collections;
using UnityEngine;

namespace PortGame
{
    public enum CraneState
    {
        Idle,
        MoveGantry,
        TrolleyOut,
        Lower,
        Grab,
        Raise,
        MoveGantryHome,
        TrolleyIn,
        WaitTractor,
        LowerToTrailer,
        Release,
        RaiseEmpty,
    }

    /// <summary>
    /// Ship-to-shore quay crane. The gantry travels the quay (world x), the
    /// trolley travels the boom (z, from over-ship to the landside lane), and
    /// the spreader hangs on two rendered cables whose length animates. A
    /// damped spring driven by trolley/gantry acceleration adds cable sway so
    /// nothing moves robotically.
    /// </summary>
    public class CraneController : MonoBehaviour
    {
        private const float LegHeight = 19f;
        private const float BoomLocalY = 19.6f;
        private const float TrolleyLocalY = 18.5f;
        private const float SpreaderHalfHeight = 0.25f;
        private const float ParkedCable = 3.5f;
        private const float CruiseCable = 3.5f;

        public CraneState State { get; private set; } = CraneState.Idle;

        private Transform _trolley;
        private Transform _spreader;
        private LineRenderer _cableA;
        private LineRenderer _cableB;

        private float _cable = ParkedCable;
        private Vector2 _sway;        // spreader offset (x, z) in meters
        private Vector2 _swayVel;
        private Vector3 _prevTrolleyPos;
        private Vector3 _prevTrolleyVel;

        public static CraneController Build(Transform parent)
        {
            var go = new GameObject("QuayCrane");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(0f, Tuning.QuayTopY, 0f);

            var crane = go.AddComponent<CraneController>();
            crane.BuildVisual();

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 30f;
            focus.aimHeight = 10f;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 9.5f, -1f);
            col.size = new Vector3(10.5f, 19f, 15f);
            return crane;
        }

        private void BuildVisual()
        {
            var teal = MaterialLibrary.Get(Palette.CraneTeal, 0.35f, 0.2f);
            var steel = MaterialLibrary.Get(Palette.Steel, 0.4f, 0.5f);
            var yellow = MaterialLibrary.Get(Palette.SpreaderYellow, 0.35f, 0.2f);

            // Four legs straddling the load lane, portal beams, boom over the water.
            float halfLegY = LegHeight * 0.5f;
            foreach (float lx in new[] { -4.5f, 4.5f })
            {
                foreach (float lz in new[] { -8f, 6f })
                    Prim.Cube("Leg", transform, new Vector3(lx, halfLegY, lz),
                        new Vector3(0.85f, LegHeight, 0.85f), teal);
                // Longitudinal top beam connecting the leg pair on this side.
                Prim.Cube("SideBeam", transform, new Vector3(lx, LegHeight + 0.4f, -1f),
                    new Vector3(0.8f, 0.8f, 15f), teal);
            }
            foreach (float lz in new[] { -8f, 6f })
                Prim.Cube("PortalBeam", transform, new Vector3(0f, LegHeight + 0.4f, lz),
                    new Vector3(9.8f, 0.9f, 0.9f), teal);

            // Boom: cantilevers over the berth (−z) and back over the lane (+z).
            Prim.Cube("Boom", transform, new Vector3(0f, BoomLocalY + 0.7f, -7.5f),
                new Vector3(2.4f, 1.3f, 34f), teal);
            Prim.Cube("Cab", transform, new Vector3(0f, LegHeight - 2.5f, 6.8f),
                new Vector3(2.6f, 2f, 2f), steel);

            // Blinking-style warning tip light (steady emissive at night).
            var tipMat = MaterialLibrary.Create(Color.red, 0.3f);
            Prim.Sphere("BoomTipLight", transform, new Vector3(0f, BoomLocalY + 1.6f, -24f),
                new Vector3(0.5f, 0.5f, 0.5f), tipMat);

            // Trolley and spreader are scale-1 groups with visual children, so
            // re-parented containers never inherit a non-uniform scale.
            _trolley = Prim.Group("Trolley", transform, new Vector3(0f, TrolleyLocalY, Tuning.TrolleyLandZ));
            Prim.Cube("TrolleyBody", _trolley, Vector3.zero, new Vector3(2.8f, 1f, 2.4f), steel);

            _spreader = Prim.Group("Spreader", _trolley, new Vector3(0f, -ParkedCable, 0f));
            Prim.Cube("SpreaderBody", _spreader, Vector3.zero,
                new Vector3(4.3f, SpreaderHalfHeight * 2f, 2.6f), yellow);

            _cableA = MakeCable("CableA");
            _cableB = MakeCable("CableB");

            _prevTrolleyPos = _trolley.position;
        }

        private LineRenderer MakeCable(string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var lr = go.AddComponent<LineRenderer>();
            lr.positionCount = 2;
            lr.useWorldSpace = true;
            lr.startWidth = 0.09f;
            lr.endWidth = 0.09f;
            lr.material = MaterialLibrary.Get(Palette.SteelDark, 0.2f);
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return lr;
        }

        public void RegisterNightVisuals(DayNightCycle dayNight)
        {
            var tip = transform.Find("BoomTipLight");
            if (tip != null)
                dayNight.RegisterNightEmissive(tip.GetComponent<Renderer>().material, Color.red * 2.5f);
        }

        /// <summary>Unloads every container on the ship onto the tractor, one by one.</summary>
        public IEnumerator UnloadAll(ShipController ship, TerminalTractor tractor)
        {
            ship.BeginUnloading();
            for (int i = 0; i < ship.Containers.Count; i++)
            {
                var container = ship.Containers[i];
                yield return UnloadOne(container, tractor);
            }
            // Park: trolley in, gantry home.
            State = CraneState.Idle;
            yield return MoveTrolley(Tuning.TrolleyLandZ);
            yield return MoveGantry(0f);
        }

        private IEnumerator UnloadOne(Container container, TerminalTractor tractor)
        {
            container.State = ContainerState.BeingUnloaded;

            State = CraneState.MoveGantry;
            yield return MoveGantry(container.transform.position.x);

            State = CraneState.TrolleyOut;
            yield return MoveTrolley(Tuning.TrolleyShipZ);

            State = CraneState.Lower;
            float grabTop = container.transform.position.y + Tuning.ContainerSize.y * 0.5f;
            yield return MoveCable(_trolley.position.y - (grabTop + SpreaderHalfHeight));

            State = CraneState.Grab;
            yield return new WaitForSeconds(Tuning.GrabPause);
            container.transform.SetParent(_spreader, true);
            container.State = ContainerState.OnCraneSpreader;
            yield return SettleLocal(container.transform,
                new Vector3(0f, -(SpreaderHalfHeight + Tuning.ContainerSize.y * 0.5f), 0f),
                Quaternion.identity, 0.25f);

            State = CraneState.Raise;
            yield return MoveCable(CruiseCable);

            State = CraneState.MoveGantryHome;
            yield return MoveGantry(Tuning.LoadPoint.x);

            State = CraneState.TrolleyIn;
            yield return MoveTrolley(Tuning.TrolleyLandZ);

            State = CraneState.WaitTractor;
            container.State = ContainerState.AwaitingTransport;
            while (!tractor.ReadyForLoad) yield return null;

            State = CraneState.LowerToTrailer;
            float bedTop = Tuning.TrailerBedY;
            yield return MoveCable(_trolley.position.y -
                (bedTop + Tuning.ContainerSize.y + SpreaderHalfHeight));

            State = CraneState.Release;
            yield return new WaitForSeconds(0.25f);
            tractor.AcceptContainer(container);
            yield return new WaitForSeconds(0.15f);

            State = CraneState.RaiseEmpty;
            yield return MoveCable(CruiseCable);
        }

        // ---- Motion primitives (duration derived from distance) ----------

        private IEnumerator MoveGantry(float worldX)
        {
            float startX = transform.position.x;
            float duration = Mathf.Abs(worldX - startX) / Tuning.GantrySpeed + 0.3f;
            yield return Ease.Animate(duration, t =>
            {
                var p = transform.position;
                p.x = Mathf.LerpUnclamped(startX, worldX, t);
                transform.position = p;
            });
        }

        private IEnumerator MoveTrolley(float worldZ)
        {
            float startZ = _trolley.localPosition.z;
            float targetZ = worldZ - transform.position.z;
            float duration = Mathf.Abs(targetZ - startZ) / Tuning.TrolleySpeed + 0.3f;
            yield return Ease.Animate(duration, t =>
            {
                var p = _trolley.localPosition;
                p.z = Mathf.LerpUnclamped(startZ, targetZ, t);
                _trolley.localPosition = p;
            });
        }

        private IEnumerator MoveCable(float targetLength)
        {
            targetLength = Mathf.Max(1.2f, targetLength);
            float start = _cable;
            float duration = Mathf.Abs(targetLength - start) / Tuning.HoistSpeed + 0.25f;
            yield return Ease.Animate(duration, t => _cable = Mathf.LerpUnclamped(start, targetLength, t));
        }

        private static IEnumerator SettleLocal(Transform t, Vector3 localPos, Quaternion localRot, float duration)
        {
            Vector3 p0 = t.localPosition;
            Quaternion r0 = t.localRotation;
            yield return Ease.Animate(duration, k =>
            {
                t.localPosition = Vector3.Lerp(p0, localPos, k);
                t.localRotation = Quaternion.Slerp(r0, localRot, k);
            }, Ease.OutCubic);
        }

        // ---- Secondary motion: cable sway + rendered cables --------------

        private void Update()
        {
            float dt = Time.deltaTime;
            if (dt <= 0f) return;

            Vector3 vel = (_trolley.position - _prevTrolleyPos) / dt;
            Vector3 accel = (vel - _prevTrolleyVel) / dt;
            _prevTrolleyPos = _trolley.position;
            _prevTrolleyVel = vel;

            // Damped spring: acceleration kicks the spreader the opposite way.
            const float stiffness = 14f;
            const float damping = 3.2f;
            const float response = 0.045f;
            Vector2 drive = new Vector2(
                Mathf.Clamp(accel.x, -40f, 40f),
                Mathf.Clamp(accel.z, -40f, 40f)) * response;
            _swayVel += (-_sway * stiffness - _swayVel * damping - drive * stiffness) * dt;
            _sway += _swayVel * dt;

            _spreader.localPosition = new Vector3(_sway.x, -_cable, _sway.y);
        }

        private void LateUpdate()
        {
            Vector3 trolleyBottom = _trolley.position + Vector3.down * 0.5f;
            Vector3 spreaderTop = _spreader.position + Vector3.up * SpreaderHalfHeight;
            _cableA.SetPosition(0, trolleyBottom + new Vector3(-1.2f, 0f, 0f));
            _cableA.SetPosition(1, spreaderTop + new Vector3(-1.6f, 0f, 0f));
            _cableB.SetPosition(0, trolleyBottom + new Vector3(1.2f, 0f, 0f));
            _cableB.SetPosition(1, spreaderTop + new Vector3(1.6f, 0f, 0f));
        }
    }
}
