using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Placeholder-geometry factory. Every visual in Milestone 1 is built from
    /// these primitives; when real art arrives, the callers of these methods
    /// are the seams where prefabs get swapped in (TDD §14).
    /// Colliders are stripped by default — only tap-focusable roots keep one.
    /// </summary>
    public static class Prim
    {
        public static GameObject Cube(string name, Transform parent, Vector3 localPos, Vector3 scale,
            Material mat, bool keepCollider = false)
        {
            return Make(PrimitiveType.Cube, name, parent, localPos, scale, mat, keepCollider);
        }

        public static GameObject Cylinder(string name, Transform parent, Vector3 localPos, Vector3 scale,
            Material mat, bool keepCollider = false)
        {
            return Make(PrimitiveType.Cylinder, name, parent, localPos, scale, mat, keepCollider);
        }

        public static GameObject Sphere(string name, Transform parent, Vector3 localPos, Vector3 scale,
            Material mat, bool keepCollider = false)
        {
            return Make(PrimitiveType.Sphere, name, parent, localPos, scale, mat, keepCollider);
        }

        /// <summary>Flat quad lying on the ground (lane markings, window strips).</summary>
        public static GameObject GroundQuad(string name, Transform parent, Vector3 localPos, Vector2 size,
            Material mat)
        {
            var go = Make(PrimitiveType.Quad, name, parent, localPos, new Vector3(size.x, size.y, 1f), mat, false);
            go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            return go;
        }

        private static GameObject Make(PrimitiveType type, string name, Transform parent, Vector3 localPos,
            Vector3 scale, Material mat, bool keepCollider)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            var t = go.transform;
            t.SetParent(parent, false);
            t.localPosition = localPos;
            t.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            if (!keepCollider)
            {
                var col = go.GetComponent<Collider>();
                if (col != null) Object.Destroy(col);
            }
            return go;
        }

        /// <summary>Empty organizational transform.</summary>
        public static Transform Group(string name, Transform parent, Vector3 localPos)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            return go.transform;
        }
    }
}
