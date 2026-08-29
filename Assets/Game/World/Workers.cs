using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Ambient dock workers: they wander walking zones that never cross the
    /// vehicle roads, pause, and move on — simulation-driven set dressing per
    /// the design principle that the port should feel staffed. In wet
    /// weather their hi-vis vests read as yellow rain slickers.
    /// </summary>
    public class Workers : MonoBehaviour
    {
        private struct Zone
        {
            public float XMin, XMax, ZMin, ZMax;
            public Zone(float xMin, float xMax, float zMin, float zMax)
            {
                XMin = xMin; XMax = xMax; ZMin = zMin; ZMax = zMax;
            }
        }

        // Walking areas chosen to stay clear of every road-graph lane.
        private static readonly Zone[] Zones =
        {
            new Zone(-60f, 60f, -7.5f, -4f),   // quay edge walkway
            new Zone(-52f, -38f, 30f, 40f),    // admin plaza
            new Zone(8f, 24f, 30f, 34f),       // north walkway
        };

        private static readonly Color VestOrange = Palette.Hex("#D98A3F");
        private static readonly Color SlickerYellow = Palette.Hex("#E3C23F");

        private class Worker
        {
            public Transform Root;
            public Material VestMat;
            public float WalkPhase;
        }

        private readonly Worker[] _workers = new Worker[8];

        public static Workers Build(Transform parent)
        {
            var go = new GameObject("Workers");
            go.transform.SetParent(parent, false);
            return go.AddComponent<Workers>();
        }

        private void Awake()
        {
            var rng = new System.Random(23);
            var trouser = MaterialLibrary.Get(Palette.SteelDark, 0.2f);
            var skin = MaterialLibrary.Get(Palette.Hex("#C9A182"), 0.2f);

            for (int i = 0; i < _workers.Length; i++)
            {
                var zone = Zones[i % Zones.Length];
                var root = Prim.Group("Worker", transform,
                    RandomPoint(zone, rng) + Vector3.up * Tuning.QuayTopY);

                var vestMat = MaterialLibrary.Create(VestOrange, 0.25f);
                Prim.Cube("Legs", root, new Vector3(0f, 0.35f, 0f), new Vector3(0.4f, 0.7f, 0.3f), trouser);
                Prim.Cube("Torso", root, new Vector3(0f, 1f, 0f), new Vector3(0.55f, 0.6f, 0.38f), vestMat);
                Prim.Sphere("Head", root, new Vector3(0f, 1.5f, 0f), new Vector3(0.34f, 0.34f, 0.34f), skin);

                var worker = new Worker
                {
                    Root = root,
                    VestMat = vestMat,
                    WalkPhase = (float)rng.NextDouble() * 10f,
                };
                _workers[i] = worker;
                StartCoroutine(Wander(worker, zone, new System.Random(rng.Next())));
            }
        }

        private static Vector3 RandomPoint(Zone zone, System.Random rng)
        {
            return new Vector3(
                Mathf.Lerp(zone.XMin, zone.XMax, (float)rng.NextDouble()), 0f,
                Mathf.Lerp(zone.ZMin, zone.ZMax, (float)rng.NextDouble()));
        }

        private IEnumerator Wander(Worker worker, Zone zone, System.Random rng)
        {
            while (true)
            {
                Vector3 target = RandomPoint(zone, rng) + Vector3.up * Tuning.QuayTopY;
                while (true)
                {
                    Vector3 toTarget = target - worker.Root.position;
                    toTarget.y = 0f;
                    if (toTarget.magnitude < 0.4f) break;

                    worker.Root.rotation = Quaternion.Slerp(worker.Root.rotation,
                        Quaternion.LookRotation(toTarget.normalized), 4f * Time.deltaTime);
                    var pos = worker.Root.position + worker.Root.forward * 1.25f * Time.deltaTime;
                    // Little walking bob.
                    pos.y = Tuning.QuayTopY +
                        Mathf.Abs(Mathf.Sin(Time.time * 6f + worker.WalkPhase)) * 0.05f;
                    worker.Root.position = pos;
                    yield return null;
                }
                yield return new WaitForSeconds(1f + (float)rng.NextDouble() * 3.5f);
            }
        }

        private void Update()
        {
            // Rain gear: vests turn slicker-yellow while the ground is wet.
            if (WeatherManager.Instance == null) return;
            bool wet = WeatherManager.Instance.RainAmount > 0.25f;
            var color = wet ? SlickerYellow : VestOrange;
            for (int i = 0; i < _workers.Length; i++)
                _workers[i].VestMat.color = Color.Lerp(_workers[i].VestMat.color, color,
                    Time.deltaTime * 2f);
        }
    }
}
