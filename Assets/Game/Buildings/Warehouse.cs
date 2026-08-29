using System;
using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>Configuration for one storage building (dry store, cold store, …).</summary>
    public sealed class WarehouseConfig
    {
        public string Title;
        public Vector3 Position;
        public Color Wall;
        public Color Roof;
        public Color Glow;
        public int Capacity;
        public float DispatchBase;
        public bool Refrigerated;
    }

    /// <summary>
    /// A receiving warehouse. Finite floor of visible slots, a sliding door,
    /// and a dispatch cycle that clears one slot at a time. When the floor is
    /// full the door stays shut and the tractor waits outside — congestion
    /// backs up the chain from here. The cold store variant is the end of the
    /// refrigerated chain: decay stops only once cargo is inside it.
    /// </summary>
    public class Warehouse : MonoBehaviour, IFocusInfo, IFocusActions
    {
        private const float Width = 16f;
        private const float Depth = 12f;
        private const float Height = 7f;
        private const float DoorWidth = 5.2f;
        private const float DoorHeight = 4.6f;

        public WarehouseConfig Config { get; private set; }
        public int DeliveredCount { get; private set; }
        public int StoredCount { get; private set; }
        public event Action<Container> OnDelivered;

        /// <summary>Bought dispatch level, 0–3; each level shortens the drain interval.</summary>
        public int DispatchLevel { get; set; }

        public float DispatchInterval =>
            Config.DispatchBase - Tuning.DispatchIntervalPerLevel * DispatchLevel;

        private Transform _door;
        private bool _doorOpen;
        private GameObject[] _slots;
        private Vector3[] _slotLocals;

        public static Warehouse Build(Transform parent, DayNightCycle dayNight, WarehouseConfig config)
        {
            var go = new GameObject(config.Title.Replace(" ", ""));
            go.transform.SetParent(parent, false);
            go.transform.position = config.Position;

            var wh = go.AddComponent<Warehouse>();
            wh.Config = config;
            wh._slots = new GameObject[config.Capacity];
            wh._slotLocals = BuildSlotGrid(config.Capacity);
            wh.BuildVisual(dayNight);

            var focus = go.AddComponent<FocusTarget>();
            focus.focusDistance = 28f;
            focus.aimHeight = 3f;

            var col = go.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, Height * 0.5f, 0f);
            col.size = new Vector3(Width, Height, Depth);
            return wh;
        }

        private static Vector3[] BuildSlotGrid(int capacity)
        {
            // Floor grid filled front row first so fill reads through the door.
            var slots = new Vector3[capacity];
            float y = Tuning.ContainerSize.y * 0.5f + 0.08f;
            int i = 0;
            foreach (float z in new[] { -2f, 1.2f, 4.4f })
            {
                foreach (float x in new[] { -5f, 0f, 5f })
                {
                    if (i >= capacity) return slots;
                    slots[i++] = new Vector3(x, y, z);
                }
            }
            return slots;
        }

        private void BuildVisual(DayNightCycle dayNight)
        {
            var wall = MaterialLibrary.Get(Config.Wall, 0.25f);
            var roof = MaterialLibrary.Get(Config.Roof, 0.3f);
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

            // Cold stores wear their chillers on the roof.
            if (Config.Refrigerated)
            {
                for (int i = 0; i < 3; i++)
                    Prim.Cube("Chiller", transform, new Vector3(-4f + i * 4f, Height + 1f, 1.5f),
                        new Vector3(2.4f, 1.2f, 2.4f), steel);
            }

            // Interior glow strip above the door, on at night.
            var glowMat = MaterialLibrary.Create(Config.Glow, 0.3f);
            dayNight.RegisterNightEmissive(glowMat, Config.Glow * 1.8f);
            Prim.Cube("DoorGlow", transform, new Vector3(0f, DoorHeight + 0.35f, frontZ - 0.25f),
                new Vector3(DoorWidth * 0.8f, 0.3f, 0.15f), glowMat);

            // Sliding door panel — slides sideways behind the right wall segment.
            _door = Prim.Cube("Door", transform, new Vector3(0f, DoorHeight * 0.5f, frontZ + 0.28f),
                new Vector3(DoorWidth - 0.2f, DoorHeight, 0.18f), steel).transform;
        }

        // ---- IFocusInfo / IFocusActions ---------------------------------

        public string FocusTitle => Config.Title;

        public string FocusBody => string.Format(
            "Storage: {0} of {1} slots{2}\nDispatch truck clears one every {3:0.#}s\nReceived total: {4}{5}",
            StoredCount, Config.Capacity,
            StoredCount >= Config.Capacity ? "  ·  FULL" : "",
            DispatchInterval, DeliveredCount,
            Config.Refrigerated ? "\nCold chain endpoint — decay stops here" : "");

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
                        Execute = () => TryPurchaseDispatchUpgrade(""),
                    },
                };
            }
        }

        /// <summary>Buys the next dispatch level (player or recommendation). False if maxed or unaffordable.</summary>
        public bool TryPurchaseDispatchUpgrade(string sourceSuffix)
        {
            if (DispatchLevel >= Tuning.DispatchCosts.Length) return false;
            if (!EconomyManager.Instance.TrySpend(Tuning.DispatchCosts[DispatchLevel],
                    Config.Title + " dispatch upgrade" + sourceSuffix)) return false;
            DispatchLevel++;
            return true;
        }

        // ---- Storage -----------------------------------------------------

        private void Start()
        {
            StartCoroutine(DispatchLoop());
        }

        /// <summary>Restores saved inventory as neutral boxes on load.</summary>
        public void LoadStored(int count)
        {
            count = Mathf.Clamp(count, 0, Config.Capacity);
            for (int i = 0; i < count; i++)
                FillSlot(Palette.Containers[i % Palette.Containers.Length]);
        }

        public IEnumerator Receive(Container container)
        {
            container.State = ContainerState.BeingReceived;

            // Full floor: the tractor waits at the door until dispatch clears a slot.
            while (StoredCount >= Config.Capacity) yield return null;

            yield return SlideDoor(open: true);

            int slot = FirstFreeSlot();
            container.transform.SetParent(transform, true);
            Vector3 p0 = container.transform.position;
            Quaternion r0 = container.transform.rotation;
            Vector3 inside = transform.TransformPoint(_slotLocals[slot]);

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

        /// <summary>
        /// The rail terminal pulls one stored container straight off the
        /// floor (no door cycle, no dispatch revenue — rail pays its own
        /// rate). Returns the box's color for the wagon load visual.
        /// </summary>
        public bool TryDispatchExternal(out Color color)
        {
            color = Palette.ConcreteDark;
            int slot = LastOccupiedSlot();
            if (slot < 0) return false;
            var box = _slots[slot];
            _slots[slot] = null;
            StoredCount--;
            if (box != null)
            {
                var renderer = box.GetComponent<Renderer>();
                if (renderer != null && renderer.sharedMaterial != null)
                    color = renderer.sharedMaterial.color;
                Destroy(box);
            }
            return true;
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
                long revenue = Tuning.DispatchRevenue +
                    (GreenEnergyYard.SolarActive ? Tuning.GreenDispatchBonus : 0);
                EconomyManager.Instance.Add(revenue, "cargo dispatched", quiet: true);

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
            var box = Prim.Cube("StoredContainer", transform, _slotLocals[slot],
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
