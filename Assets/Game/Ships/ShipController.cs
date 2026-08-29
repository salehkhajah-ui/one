using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public enum ShipState
    {
        Offshore,
        Approaching,
        Docking,
        Docked,
        Unloading,
        Departing,
        Gone,
    }

    /// <summary>
    /// A named cargo ship. Sails in along waypoints with distance-based
    /// deceleration, eases onto the berth, bobs gently on a Hull child
    /// (so root motion stays clean for docking math), and departs.
    /// </summary>
    public class ShipController : MonoBehaviour
    {
        private const float RootY = 0.15f;

        public ShipState State { get; private set; } = ShipState.Offshore;
        public string ShipName { get; private set; }
        public readonly List<Container> Containers = new List<Container>();

        private Transform _hull;
        private float _bobPhase;

        private static readonly Vector3[] ArrivalPath =
        {
            new Vector3(95f, RootY, -62f),
            new Vector3(50f, RootY, -36f),
            new Vector3(18f, RootY, -21f),
        };

        private static readonly Vector3[] DeparturePath =
        {
            new Vector3(-48f, RootY, -27f),
            new Vector3(-95f, RootY, -58f),
            new Vector3(-160f, RootY, -105f),
        };

        private static readonly Vector3 BerthPos = new Vector3(0f, RootY, Tuning.BerthZ);
        private static readonly Quaternion BerthRot = Quaternion.Euler(0f, 270f, 0f);

        public static ShipController Build(Transform parent, string shipName, int containerCount)
        {
            var go = new GameObject("Ship " + shipName);
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(150f, RootY, -95f);
            go.transform.rotation = Quaternion.LookRotation(ArrivalPath[0] - go.transform.position);

            var ship = go.AddComponent<ShipController>();
            ship.ShipName = shipName;
            ship._bobPhase = Random.value * 10f;
            ship.BuildVisual(containerCount);

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 36f;
            focus.aimHeight = 3f;
            focus.follow = true;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 2.5f, 0f);
            col.size = new Vector3(10f, 9f, 50f);
            return ship;
        }

        private void BuildVisual(int containerCount)
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

            // Deck cargo: a single row of containers the crane will pick.
            for (int i = 0; i < containerCount; i++)
            {
                float z = -14f + i * 4f;
                var color = Palette.Containers[i % Palette.Containers.Length];
                var c = Container.Build(_hull, new Vector3(0f, 2.8f + Tuning.ContainerSize.y * 0.5f + 0.12f, z), color);
                // Long axis along the ship's length.
                c.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);
                Containers.Add(c);
            }
        }

        public IEnumerator SailIn()
        {
            State = ShipState.Approaching;

            for (int leg = 0; leg < ArrivalPath.Length; leg++)
            {
                Vector3 target = ArrivalPath[leg];
                while (true)
                {
                    Vector3 toTarget = target - transform.position;
                    toTarget.y = 0f;
                    float dist = toTarget.magnitude;
                    if (dist < 2f) break;

                    // Remaining distance across this and all later legs → slow near the berth.
                    float remaining = dist;
                    for (int i = leg + 1; i < ArrivalPath.Length; i++)
                        remaining += Vector3.Distance(ArrivalPath[i - 1], ArrivalPath[i]);
                    float speed = Mathf.Min(Tuning.ShipCruiseSpeed, 2f + remaining * 0.09f);

                    transform.rotation = Quaternion.Slerp(transform.rotation,
                        Quaternion.LookRotation(toTarget.normalized), 0.6f * Time.deltaTime);
                    transform.position += transform.forward * speed * Time.deltaTime;
                    yield return null;
                }
            }

            // Final eased pose blend onto the berth.
            State = ShipState.Docking;
            Vector3 startPos = transform.position;
            Quaternion startRot = transform.rotation;
            yield return Ease.Animate(Tuning.ShipDockSeconds, t =>
            {
                transform.SetPositionAndRotation(
                    Vector3.Lerp(startPos, BerthPos, t),
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
            float speed = 0f;
            foreach (var target in DeparturePath)
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

        private void Update()
        {
            // Gentle bob/roll on the hull child only; calmer while docked.
            float calm = (State == ShipState.Docked || State == ShipState.Unloading) ? 0.45f : 1f;
            float t = Time.time + _bobPhase;
            _hull.localPosition = new Vector3(0f, Mathf.Sin(t * 0.85f) * 0.07f * calm, 0f);
            _hull.localRotation = Quaternion.Euler(
                Mathf.Sin(t * 0.5f) * 0.35f * calm, 0f, Mathf.Sin(t * 0.62f) * 0.5f * calm);
        }
    }
}
