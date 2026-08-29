using System;
using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// The receiving warehouse. Its door slides open for each arriving
    /// container, the cargo glides inside, and the delivered count drives the
    /// economy. Interior strip glows warm at night.
    /// </summary>
    public class Warehouse : MonoBehaviour
    {
        private const float Width = 16f;
        private const float Depth = 12f;
        private const float Height = 7f;
        private const float DoorWidth = 5.2f;
        private const float DoorHeight = 4.6f;

        public int DeliveredCount { get; private set; }
        public event Action<Container> OnDelivered;

        private Transform _door;
        private bool _doorOpen;

        public static Warehouse Build(Transform parent, DayNightCycle dayNight)
        {
            var go = new GameObject("Warehouse");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(30f, Tuning.QuayTopY, 31f);

            var wh = go.AddComponent<Warehouse>();
            wh.BuildVisual(dayNight);

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 28f;
            focus.aimHeight = 3f;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, Height * 0.5f, 0f);
            col.size = new Vector3(Width, Height, Depth);
            return wh;
        }

        private void BuildVisual(DayNightCycle dayNight)
        {
            var wall = MaterialLibrary.Get(Palette.WarehouseWall, 0.2f);
            var roof = MaterialLibrary.Get(Palette.WarehouseRoof, 0.3f);
            var steel = MaterialLibrary.Get(Palette.SteelDark, 0.3f, 0.3f);

            float sideSegW = (Width - DoorWidth) * 0.5f;
            float frontZ = -Depth * 0.5f;

            // Front wall: two segments + lintel around the door opening.
            Prim.Cube("FrontL", transform, new Vector3(-(DoorWidth * 0.5f + sideSegW * 0.5f), Height * 0.5f, frontZ),
                new Vector3(sideSegW, Height, 0.4f), wall);
            Prim.Cube("FrontR", transform, new Vector3(DoorWidth * 0.5f + sideSegW * 0.5f, Height * 0.5f, frontZ),
                new Vector3(sideSegW, Height, 0.4f), wall);
            Prim.Cube("Lintel", transform, new Vector3(0f, DoorHeight + (Height - DoorHeight) * 0.5f, frontZ),
                new Vector3(DoorWidth, Height - DoorHeight, 0.4f), wall);

            // Back and side walls, roof, floor.
            Prim.Cube("Back", transform, new Vector3(0f, Height * 0.5f, Depth * 0.5f),
                new Vector3(Width, Height, 0.4f), wall);
            Prim.Cube("SideW", transform, new Vector3(-Width * 0.5f, Height * 0.5f, 0f),
                new Vector3(0.4f, Height, Depth), wall);
            Prim.Cube("SideE", transform, new Vector3(Width * 0.5f, Height * 0.5f, 0f),
                new Vector3(0.4f, Height, Depth), wall);
            Prim.Cube("Roof", transform, new Vector3(0f, Height + 0.25f, 0f),
                new Vector3(Width + 0.8f, 0.5f, Depth + 0.8f), roof);
            Prim.Cube("Floor", transform, new Vector3(0f, 0.03f, 0f),
                new Vector3(Width - 0.2f, 0.06f, Depth - 0.2f), MaterialLibrary.Get(Palette.ConcreteDark, 0.15f));

            // Simple interior racks, visible through the open door.
            foreach (float x in new[] { -4.5f, 4.5f })
                Prim.Cube("Rack", transform, new Vector3(x, 1.6f, 1.5f), new Vector3(3.2f, 3.2f, 6.5f), steel);

            // Warm interior glow strip above the door, on at night.
            var glowMat = MaterialLibrary.Create(Palette.WarmLight, 0.3f);
            dayNight.RegisterNightEmissive(glowMat, Palette.WarmLight * 1.8f);
            Prim.Cube("DoorGlow", transform, new Vector3(0f, DoorHeight + 0.35f, frontZ - 0.25f),
                new Vector3(DoorWidth * 0.8f, 0.3f, 0.15f), glowMat);

            // Sliding door panel — slides sideways behind the right wall segment.
            _door = Prim.Cube("Door", transform, new Vector3(0f, DoorHeight * 0.5f, frontZ + 0.28f),
                new Vector3(DoorWidth - 0.2f, DoorHeight, 0.18f), steel).transform;
        }

        public IEnumerator Receive(Container container)
        {
            container.State = ContainerState.BeingReceived;
            yield return SlideDoor(open: true);

            container.transform.SetParent(transform, true);
            Vector3 p0 = container.transform.position;
            Quaternion r0 = container.transform.rotation;
            Vector3 inside = transform.position + new Vector3(0f, Tuning.ContainerSize.y * 0.5f + 0.06f, 1f);
            Quaternion rIn = Quaternion.identity;

            yield return Ease.Animate(1.5f, t =>
            {
                container.transform.SetPositionAndRotation(
                    Vector3.Lerp(p0, inside, t), Quaternion.Slerp(r0, rIn, t));
            });

            container.State = ContainerState.Delivered;
            DeliveredCount++;
            var handler = OnDelivered;
            if (handler != null) handler(container);

            // Absorbed into inventory.
            Vector3 s0 = container.transform.localScale;
            yield return Ease.Animate(0.45f, t => container.transform.localScale = s0 * (1f - t * 0.97f), Ease.InCubic);
            Destroy(container.gameObject);

            yield return SlideDoor(open: false);
        }

        private IEnumerator SlideDoor(bool open)
        {
            if (_doorOpen == open) yield break;
            _doorOpen = open;
            float from = _door.localPosition.x;
            float to = open ? DoorWidth * 0.98f : 0f;
            yield return Ease.Animate(0.8f, t =>
            {
                var p = _door.localPosition;
                p.x = Mathf.Lerp(from, to, t);
                _door.localPosition = p;
            });
        }
    }
}
