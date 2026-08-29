using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// A handful of gulls circling the harbor — pure ambience.
    /// Each gull is a tiny body with two flapping wing slabs.
    /// </summary>
    public class Gulls : MonoBehaviour
    {
        private struct Gull
        {
            public Transform Root;
            public Transform WingL;
            public Transform WingR;
            public Vector3 Center;
            public float Radius;
            public float Speed;   // radians/sec, sign = direction
            public float Phase;
            public float FlapPhase;
        }

        private Gull[] _gulls;

        public static Gulls Build(Transform parent)
        {
            var go = new GameObject("Gulls");
            go.transform.SetParent(parent, false);
            return go.AddComponent<Gulls>();
        }

        private void Awake()
        {
            var mat = MaterialLibrary.Get(Palette.Gull, 0.1f);
            var rng = new System.Random(3);
            _gulls = new Gull[5];
            for (int i = 0; i < _gulls.Length; i++)
            {
                var root = Prim.Group("Gull", transform, Vector3.zero);
                Prim.Cube("Body", root, Vector3.zero, new Vector3(0.5f, 0.16f, 0.9f), mat);
                var wingL = Prim.Cube("WingL", root, new Vector3(-0.75f, 0f, 0f),
                    new Vector3(1.3f, 0.06f, 0.42f), mat).transform;
                var wingR = Prim.Cube("WingR", root, new Vector3(0.75f, 0f, 0f),
                    new Vector3(1.3f, 0.06f, 0.42f), mat).transform;

                _gulls[i] = new Gull
                {
                    Root = root,
                    WingL = wingL,
                    WingR = wingR,
                    Center = new Vector3(
                        Mathf.Lerp(-40f, 40f, (float)rng.NextDouble()),
                        Mathf.Lerp(16f, 26f, (float)rng.NextDouble()),
                        Mathf.Lerp(-45f, 5f, (float)rng.NextDouble())),
                    Radius = Mathf.Lerp(10f, 22f, (float)rng.NextDouble()),
                    Speed = (rng.Next(2) == 0 ? 1f : -1f) * Mathf.Lerp(0.25f, 0.45f, (float)rng.NextDouble()),
                    Phase = (float)rng.NextDouble() * Mathf.PI * 2f,
                    FlapPhase = (float)rng.NextDouble() * Mathf.PI * 2f,
                };
            }
        }

        private void Update()
        {
            float time = Time.time;
            for (int i = 0; i < _gulls.Length; i++)
            {
                var g = _gulls[i];
                float a = g.Phase + time * g.Speed;
                var pos = g.Center + new Vector3(Mathf.Cos(a) * g.Radius,
                    Mathf.Sin(time * 0.7f + g.Phase) * 1.2f,
                    Mathf.Sin(a) * g.Radius);
                // Face along the direction of travel around the circle.
                var tangent = new Vector3(-Mathf.Sin(a), 0f, Mathf.Cos(a)) * Mathf.Sign(g.Speed);
                g.Root.SetPositionAndRotation(pos, Quaternion.LookRotation(tangent));

                float flap = Mathf.Sin(time * 7f + g.FlapPhase) * 26f;
                g.WingL.localRotation = Quaternion.Euler(0f, 0f, flap);
                g.WingR.localRotation = Quaternion.Euler(0f, 0f, -flap);
            }
        }
    }
}
