using System;
using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// The receiving warehouse. Finite capacity: each stored container
    /// occupies a visible floor slot; a dispatch cycle clears one slot every
    /// few seconds (distribution trucks, abstracted for now). When the floor
    /// is full the door stays shut and the tractor waits outside — the first
    /// domino: a full warehouse stalls the tractor, which stalls the crane,
    /// which stalls the ship, which burns the deadline.
    /// </summary>
    public class Warehouse : MonoBehaviour, IFocusInfo, IFocusActions
    {
        private const float Width = 16f;
        private const float Depth = 12f;
        private const float Height = 7f;
        private const float DoorWidth = 5.2f;
        private const float DoorHeight = 4.6f;

        public int DeliveredCount { get; private set; }
        public int StoredCount { get; private set; }
        public event Action<Container> OnDelivered;

        /// <summary>Bought dispatch level, 0–3; each level shortens the drain interval.</summary>
        public int DispatchLevel { get; set; }

        public float DispatchInterval =>
            Tuning.WarehouseDispatchInterval - Tuning.DispatchIntervalPerLevel * DispatchLevel;

        private Transform _door;
        private bool _doorOpen;
        // One slot per storable container; occupied slots hold the visual box.
        private GameObject[] _slots;

        private static readonly Vector3[] SlotLocals = BuildSlotGrid();

        private static Vector3[] BuildSlotGrid()
        {
            // 3×3 floor grid, filled front row first so fill reads through the door.
            var slots = new Vector3[Tuning.WarehouseCapacity];
            float y = Tuning.ContainerSize.y * 0.5f + 0.08f;
            int i = 0;
            foreach (float z in new[] { -2f, 1.2f, 4.4f })
                foreach (float x in new[] { -5f, 0f, 5f })
                {
                    if (i >= slots.Length) break;
                    slots[i++] = new Vector3(x, y, z);
                }
            return slots;
        }

        public static Warehouse Build(Transform parent, DayNightCycle dayNight)
        {
            var go = new GameObject("Warehouse");
            go.transform.SetParent(parent, false);
            go.transform.position = new Vector3(30f, Tuning.QuayTopY, 31f);

            var wh = go.AddComponent<Warehouse>();
            wh._slots = new GameObject[Tuning.WarehouseCapacity];
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

            // Warm interior glow strip above the door, on at night.
            var glowMat = MaterialLibrary.Create(Palette.WarmLight, 0.3f);
            dayNight.RegisterNightEmissive(glowMat, Palette.WarmLight * 1.8f);
            Prim.Cube("DoorGlow", transform, new Vector3(0f, DoorHeight + 0.35f, frontZ - 0.25f),
                new Vector3(DoorWidth * 0.8f, 0.3f, 0.15f), glowMat);

            // Sliding door panel — slides sideways behind the right wall segment.
            _door = Prim.Cube("Door", transform, new Vector3(0f, DoorHeight * 0.5f, frontZ + 0.28f),
                new Vector3(DoorWidth - 0.2f, DoorHeight, 0.18f), steel).transform;
        }

        // ---- IFocusInfo --------------------------------------------------

        public string FocusTitle => "Warehouse";

        public string FocusBody => string.Format(
            "Storage: {0} of {1} slots{2}\nDispatch truck clears one every {3:0.#}s\nReceived total: {4}",
            StoredCount, Tuning.WarehouseCapacity,
            StoredCount >= Tuning.WarehouseCapacity ? "  ·  FULL" : "",
            DispatchInterval, DeliveredCount);

        public FocusAction[] FocusActions
        {
            get
            {
                if (DispatchLevel >= Tuning.DispatchCosts.Length) return new FocusAction[0];
                long cost = Tuning.DispatchCosts[DispatchLevel];
                return new[]
                {
                    new FocusAction
                    {
                        Label = string.Format("Faster dispatch (−{0:0.#}s), Lv {1}→{2}",
                            Tuning.DispatchIntervalPerLevel, DispatchLevel, DispatchLevel + 1),
                        Cost = cost,
                        Available = () => EconomyManager.Instance.Balance >= cost,
                        Execute = () =>
                        {
                            if (EconomyManager.Instance.TrySpend(cost, "warehouse dispatch upgrade"))
                                DispatchLevel++;
                        },
                    },
                };
            }
        }

        // ---- Storage -----------------------------------------------------

        private void Start()
        {
            StartCoroutine(DispatchLoop());
        }

        /// <summary>Restores saved inventory as neutral boxes on load.</summary>
        public void LoadStored(int count)
        {
            count = Mathf.Clamp(count, 0, Tuning.WarehouseCapacity);
            for (int i = 0; i < count; i++)
                FillSlot(Palette.Containers[i % Palette.Containers.Length]);
        }

        public IEnumerator Receive(Container container)
        {
            container.State = ContainerState.BeingReceived;

            // Full floor: the tractor waits at the door until dispatch clears a slot.
            while (StoredCount >= Tuning.WarehouseCapacity) yield return null;

            yield return SlideDoor(open: true);

            int slot = FirstFreeSlot();
            container.transform.SetParent(transform, true);
            Vector3 p0 = container.transform.position;
            Quaternion r0 = container.transform.rotation;
            Vector3 inside = transform.TransformPoint(SlotLocals[slot]);

            yield return Ease.Animate(1.5f, t =>
            {
                container.transform.SetPositionAndRotation(
                    Vector3.Lerp(p0, inside, t), Quaternion.Slerp(r0, transform.rotation, t));
            });

            container.State = ContainerState.Delivered;
            _slots[slot] = container.gameObject;
            StoredCount++;
            DeliveredCount++;
            var handler = OnDelivered;
            if (handler != null) handler(container);

            yield return SlideDoor(open: false);
        }

        private IEnumerator DispatchLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(DispatchInterval);
                if (StoredCount == 0) continue;

                int slot = LastOccupiedSlot();
                var box = _slots[slot];
                _slots[slot] = null;
                StoredCount--;
                EconomyManager.Instance.Add(Tuning.DispatchRevenue, "cargo dispatched", quiet: true);

                if (box != null)
                {
                    // Quietly absorbed into the distribution network (door stays shut).
                    Vector3 s0 = box.transform.localScale;
                    yield return Ease.Animate(0.4f, t => box.transform.localScale = s0 * (1f - t * 0.97f),
                        Ease.InCubic);
                    Destroy(box);
                }
            }
        }

        private void FillSlot(Color color)
        {
            int slot = FirstFreeSlot();
            if (slot < 0) return;
            var box = Prim.Cube("StoredContainer", transform, SlotLocals[slot],
                Tuning.ContainerSize, MaterialLibrary.Get(color, 0.3f));
            _slots[slot] = box;
            StoredCount++;
        }

        private int FirstFreeSlot()
        {
            for (int i = 0; i < _slots.Length; i++)
                if (_slots[i] == null) return i;
            return -1;
        }

        private int LastOccupiedSlot()
        {
            for (int i = _slots.Length - 1; i >= 0; i--)
                if (_slots[i] != null) return i;
            return -1;
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
