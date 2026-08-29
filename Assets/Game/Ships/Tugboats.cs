using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Two harbor tugs. They idle at their moorings, run out to meet a ship
    /// beginning its final approach, hold escort positions alongside her
    /// through the docking, then peel off home. Pure world-life — the
    /// docking itself doesn't depend on them (yet).
    /// </summary>
    public class Tugboats : MonoBehaviour
    {
        private class Tug
        {
            public Transform Root;
            public Transform Hull;
            public Vector3 Home;
            public Quaternion HomeRot;
            public ShipController Escorting;
            public Vector3 EscortOffset; // in the ship's local frame
            public float BobPhase;
        }

        private const float Speed = 12f;

        private readonly Tug[] _tugs = new Tug[2];

        public static Tugboats Build(Transform parent)
        {
            var go = new GameObject("Tugboats");
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<Tugboats>();
            t.BuildTug(0, new Vector3(56f, 0f, -14f));
            t.BuildTug(1, new Vector3(63f, 0f, -19f));
            return t;
        }

        private void BuildTug(int index, Vector3 home)
        {
            var root = Prim.Group("Tug" + index, transform, home);
            var hull = Prim.Group("Hull", root, Vector3.zero);
            var red = MaterialLibrary.Get(Palette.HullRed, 0.3f);
            var white = MaterialLibrary.Get(Palette.ShipWhite, 0.35f);
            Prim.Cube("TugHull", hull, new Vector3(0f, 0.55f, 0f), new Vector3(2.4f, 1.1f, 5.2f), red);
            Prim.Cube("TugCabin", hull, new Vector3(0f, 1.55f, -0.6f), new Vector3(1.8f, 1.1f, 2f), white);
            Prim.Cube("TugBow", hull, new Vector3(0f, 0.55f, 2.9f), new Vector3(1.6f, 1.1f, 1.6f), red)
                .transform.localRotation = Quaternion.Euler(0f, 45f, 0f);

            root.rotation = Quaternion.Euler(0f, 200f + index * 40f, 0f);
            _tugs[index] = new Tug
            {
                Root = root,
                Hull = hull,
                Home = new Vector3(home.x, 0.15f, home.z),
                HomeRot = root.rotation,
                BobPhase = index * 3f,
            };
        }

        /// <summary>Send both tugs to escort this ship until she is docked.</summary>
        public void Escort(ShipController ship)
        {
            _tugs[0].Escorting = ship;
            _tugs[0].EscortOffset = new Vector3(8f, 0f, 9f);   // starboard bow
            _tugs[1].Escorting = ship;
            _tugs[1].EscortOffset = new Vector3(-8f, 0f, -7f); // port quarter
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            for (int i = 0; i < _tugs.Length; i++)
            {
                var tug = _tugs[i];

                // Escort ends once the ship is docked (or gone).
                if (tug.Escorting != null &&
                    (tug.Escorting.State == ShipState.Docked ||
                     tug.Escorting.State == ShipState.Unloading ||
                     tug.Escorting.State == ShipState.Gone))
                {
                    tug.Escorting = null;
                }

                Vector3 target;
                Quaternion face;
                if (tug.Escorting != null)
                {
                    target = tug.Escorting.transform.TransformPoint(tug.EscortOffset);
                    target.y = 0.15f;
                    face = tug.Escorting.transform.rotation;
                }
                else
                {
                    target = tug.Home;
                    face = tug.HomeRot;
                }

                Vector3 toTarget = target - tug.Root.position;
                toTarget.y = 0f;
                if (toTarget.magnitude > 0.5f)
                {
                    face = Quaternion.LookRotation(toTarget.normalized);
                    tug.Root.position = Vector3.MoveTowards(tug.Root.position, target, Speed * dt);
                }
                tug.Root.rotation = Quaternion.Slerp(tug.Root.rotation, face, 1.8f * dt);

                float sea = WeatherManager.Instance != null ? WeatherManager.Instance.SeaScale : 1f;
                float t = Time.time + tug.BobPhase;
                tug.Hull.localPosition = new Vector3(0f, Mathf.Sin(t * 1.3f) * 0.07f * sea, 0f);
                tug.Hull.localRotation = Quaternion.Euler(
                    Mathf.Sin(t * 0.9f) * 1.2f * sea, 0f, Mathf.Sin(t * 1.1f) * 1.5f * sea);
            }
        }
    }
}
