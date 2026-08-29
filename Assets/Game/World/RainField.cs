using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Rain as a single dynamic mesh of falling streaks that follows the
    /// camera — no ParticleSystem, so it renders identically on Built-in RP
    /// and URP (Sprites/Default shader, vertex alpha). Intensity scales how
    /// many streaks are active; storms add wind shear.
    /// </summary>
    public class RainField : MonoBehaviour
    {
        private const int MaxDrops = 550;
        private const float AreaXZ = 110f;
        private const float Top = 42f;
        private const float FallSpeed = 26f;

        private Mesh _mesh;
        private Vector3[] _drops;      // world positions of drop heads
        private Vector3[] _verts;
        private float _intensity;
        private float _wind;

        public static RainField Build(Transform parent)
        {
            var go = new GameObject("RainField");
            go.transform.SetParent(parent, false);
            return go.AddComponent<RainField>();
        }

        public void SetIntensity(float amount, bool storm)
        {
            _intensity = Mathf.Clamp01(amount);
            _wind = Mathf.MoveTowards(_wind, storm ? 7f : 1.5f, Time.deltaTime * 2f);
        }

        private void Awake()
        {
            _drops = new Vector3[MaxDrops];
            var rng = new System.Random(11);
            for (int i = 0; i < MaxDrops; i++)
                _drops[i] = new Vector3(
                    (float)rng.NextDouble() * AreaXZ - AreaXZ * 0.5f,
                    (float)rng.NextDouble() * Top,
                    (float)rng.NextDouble() * AreaXZ - AreaXZ * 0.5f);

            _verts = new Vector3[MaxDrops * 4];
            var tris = new int[MaxDrops * 6];
            var colors = new Color32[MaxDrops * 4];
            var rainTint = new Color32(200, 210, 225, 95);
            for (int i = 0; i < MaxDrops; i++)
            {
                int v = i * 4;
                int t = i * 6;
                tris[t] = v; tris[t + 1] = v + 1; tris[t + 2] = v + 2;
                tris[t + 3] = v; tris[t + 4] = v + 2; tris[t + 5] = v + 3;
                colors[v] = colors[v + 1] = colors[v + 2] = colors[v + 3] = rainTint;
            }

            _mesh = new Mesh { name = "Rain" };
            _mesh.MarkDynamic();
            _mesh.vertices = _verts;
            _mesh.triangles = tris;
            _mesh.colors32 = colors;

            gameObject.AddComponent<MeshFilter>().sharedMesh = _mesh;
            var mr = gameObject.AddComponent<MeshRenderer>();
            var shader = Shader.Find("Sprites/Default");
            mr.sharedMaterial = new Material(shader) { color = new Color(1f, 1f, 1f, 1f) };
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        private void Update()
        {
            var cam = Camera.main;
            if (cam == null) return;

            int active = Mathf.RoundToInt(MaxDrops * _intensity);
            Vector3 center = cam.transform.position + cam.transform.forward * 30f;
            center.y = 0f;
            Vector3 right = cam.transform.right;
            float half = AreaXZ * 0.5f;
            float dt = Time.deltaTime;
            Vector3 fall = new Vector3(_wind, -FallSpeed, 0f);
            Vector3 streak = fall.normalized * 0.9f;
            Vector3 side = right * 0.035f;

            for (int i = 0; i < MaxDrops; i++)
            {
                var p = _drops[i];
                p += fall * dt;
                if (p.y < 0f) p.y += Top;
                // Wrap horizontally around the camera's area of interest.
                if (p.x - center.x > half) p.x -= AreaXZ;
                if (center.x - p.x > half) p.x += AreaXZ;
                if (p.z - center.z > half) p.z -= AreaXZ;
                if (center.z - p.z > half) p.z += AreaXZ;
                _drops[i] = p;

                int v = i * 4;
                if (i < active)
                {
                    Vector3 tail = p - streak;
                    _verts[v] = p - side;
                    _verts[v + 1] = p + side;
                    _verts[v + 2] = tail + side;
                    _verts[v + 3] = tail - side;
                }
                else
                {
                    // Parked far below the world; degenerate and invisible.
                    _verts[v] = _verts[v + 1] = _verts[v + 2] = _verts[v + 3] =
                        new Vector3(0f, -500f, 0f);
                }
            }

            _mesh.vertices = _verts;
            _mesh.RecalculateBounds();
        }
    }
}
