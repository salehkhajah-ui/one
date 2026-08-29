using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Two ambient forklifts shuttling pallets around the west container
    /// yard — approach, pause to lift, carry, pause to set down, return.
    /// They work an area the road graph never touches, so they need no
    /// claims; they exist to make the yard feel worked.
    /// </summary>
    public class Forklifts : MonoBehaviour
    {
        private class Lift
        {
            public Transform Root;
            public GameObject Pallet;
            public Vector3 PickupPoint;
            public Vector3 DropPoint;
        }

        private readonly Lift[] _lifts = new Lift[2];

        public static Forklifts Build(Transform parent)
        {
            var go = new GameObject("Forklifts");
            go.transform.SetParent(parent, false);
            // Work points sit in the open aisle north of the yard stacks,
            // clear of the stacks themselves, the road graph and the admin
            // building.
            var f = go.AddComponent<Forklifts>();
            f.BuildLift(0, new Vector3(-58f, 0f, 22.5f), new Vector3(-55f, 0f, 34f));
            f.BuildLift(1, new Vector3(-64f, 0f, 23f), new Vector3(-62f, 0f, 36f));
            return f;
        }

        private void BuildLift(int index, Vector3 pickup, Vector3 drop)
        {
            var orange = MaterialLibrary.Get(Palette.Hex("#C98A3B"), 0.35f);
            var dark = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);
            var crate = MaterialLibrary.Get(Palette.Hex("#A5825A"), 0.25f);

            var root = Prim.Group("Forklift" + index, transform,
                pickup + Vector3.up * Tuning.QuayTopY);
            Prim.Cube("Body", root, new Vector3(0f, 0.75f, -0.2f), new Vector3(1.3f, 1.1f, 2f), orange);
            Prim.Cube("Cage", root, new Vector3(0f, 1.7f, -0.5f), new Vector3(1.1f, 0.9f, 1f), dark);
            Prim.Cube("MastL", root, new Vector3(-0.45f, 1.1f, 0.95f), new Vector3(0.12f, 2.2f, 0.12f), dark);
            Prim.Cube("MastR", root, new Vector3(0.45f, 1.1f, 0.95f), new Vector3(0.12f, 2.2f, 0.12f), dark);
            foreach (float x in new[] { -0.6f, 0.6f })
                foreach (float z in new[] { 0.6f, -0.9f })
                {
                    var w = Prim.Cylinder("Wheel", root, new Vector3(x, 0.3f, z),
                        new Vector3(0.6f, 0.14f, 0.6f), dark).transform;
                    w.localRotation = Quaternion.Euler(0f, 0f, 90f);
                }

            // The carried load: a pallet with two small crates, hidden while empty.
            var pallet = Prim.Group("Pallet", root, new Vector3(0f, 0.45f, 1.35f)).gameObject;
            Prim.Cube("Board", pallet.transform, Vector3.zero, new Vector3(1.2f, 0.12f, 1.2f), crate);
            Prim.Cube("CrateA", pallet.transform, new Vector3(-0.25f, 0.35f, 0f), new Vector3(0.55f, 0.55f, 0.9f), crate);
            Prim.Cube("CrateB", pallet.transform, new Vector3(0.32f, 0.3f, 0.1f), new Vector3(0.5f, 0.45f, 0.7f), crate);
            pallet.SetActive(false);

            var lift = new Lift
            {
                Root = root,
                Pallet = pallet,
                PickupPoint = pickup + Vector3.up * Tuning.QuayTopY,
                DropPoint = drop + Vector3.up * Tuning.QuayTopY,
            };
            _lifts[index] = lift;
            StartCoroutine(WorkLoop(lift, new System.Random(41 + index)));
        }

        private IEnumerator WorkLoop(Lift lift, System.Random rng)
        {
            yield return new WaitForSeconds((float)rng.NextDouble() * 4f);
            while (true)
            {
                yield return DriveTo(lift, Jitter(lift.PickupPoint, rng));
                yield return new WaitForSeconds(1.2f); // forks in, lift
                lift.Pallet.SetActive(true);
                yield return DriveTo(lift, Jitter(lift.DropPoint, rng));
                yield return new WaitForSeconds(1.1f); // lower, forks out
                lift.Pallet.SetActive(false);
                yield return new WaitForSeconds(0.5f + (float)rng.NextDouble() * 2f);
            }
        }

        private static Vector3 Jitter(Vector3 point, System.Random rng)
        {
            return point + new Vector3(
                (float)rng.NextDouble() * 3f - 1.5f, 0f,
                (float)rng.NextDouble() * 3f - 1.5f);
        }

        private static IEnumerator DriveTo(Lift lift, Vector3 target)
        {
            while (true)
            {
                Vector3 toTarget = target - lift.Root.position;
                toTarget.y = 0f;
                if (toTarget.magnitude < 0.5f) break;

                lift.Root.rotation = Quaternion.Slerp(lift.Root.rotation,
                    Quaternion.LookRotation(toTarget.normalized), 3f * Time.deltaTime);
                lift.Root.position += lift.Root.forward * 3f * Time.deltaTime;
                yield return null;
            }
        }
    }
}
