using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Gently moving water: a CPU-displaced grid mesh with two sine octaves.
    /// 65×65 vertices is cheap enough for the placeholder milestone; the
    /// production version moves this displacement into a vertex shader.
    /// </summary>
    public class Ocean : MonoBehaviour
    {
        private const int GridSize = 64;
        private const float WorldSize = 520f;

        private Mesh _mesh;
        private Vector3[] _baseVerts;
        private Vector3[] _verts;

        public static Ocean Build(Transform parent)
        {
            var go = new GameObject("Ocean");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(0f, Tuning.WaterY, -70f);
            return go.AddComponent<Ocean>();
        }

        private void Awake()
        {
            _mesh = new Mesh { name = "OceanGrid" };
            _mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;

            int vertsPerSide = GridSize + 1;
            _baseVerts = new Vector3[vertsPerSide * vertsPerSide];
            var uvs = new Vector2[_baseVerts.Length];
            for (int z = 0; z <= GridSize; z++)
            {
                for (int x = 0; x <= GridSize; x++)
                {
                    float fx = (float)x / GridSize - 0.5f;
                    float fz = (float)z / GridSize - 0.5f;
                    _baseVerts[z * vertsPerSide + x] = new Vector3(fx * WorldSize, 0f, fz * WorldSize);
                    uvs[z * vertsPerSide + x] = new Vector2(fx, fz);
                }
            }

            var tris = new int[GridSize * GridSize * 6];
            int t = 0;
            for (int z = 0; z < GridSize; z++)
            {
                for (int x = 0; x < GridSize; x++)
                {
                    int i0 = z * vertsPerSide + x;
                    int i1 = i0 + 1;
                    int i2 = i0 + vertsPerSide;
                    int i3 = i2 + 1;
                    tris[t++] = i0; tris[t++] = i2; tris[t++] = i1;
                    tris[t++] = i1; tris[t++] = i2; tris[t++] = i3;
                }
            }

            _verts = (Vector3[])_baseVerts.Clone();
            _mesh.vertices = _verts;
            _mesh.uv = uvs;
            _mesh.triangles = tris;
            _mesh.RecalculateNormals();
            _mesh.RecalculateBounds();

            gameObject.AddComponent<MeshFilter>().sharedMesh = _mesh;
            var mr = gameObject.AddComponent<MeshRenderer>();
            mr.sharedMaterial = MaterialLibrary.Create(Palette.Water, 0.82f, 0.05f);
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        private void Update()
        {
            float time = Time.time;
            for (int i = 0; i < _verts.Length; i++)
            {
                Vector3 v = _baseVerts[i];
                float wave =
                    Mathf.Sin(v.x * 0.055f + v.z * 0.035f + time * 0.9f) * 0.16f +
                    Mathf.Sin(v.x * 0.021f - v.z * 0.043f + time * 0.5f) * 0.24f;
                v.y = wave;
                _verts[i] = v;
            }
            _mesh.vertices = _verts;
            _mesh.RecalculateNormals();
        }
    }
}
