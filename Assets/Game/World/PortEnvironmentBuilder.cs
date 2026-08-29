using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Builds all static scenery: quay platform, roads and lane markings,
    /// decorative container-yard stacks, bollards, lampposts and the admin
    /// building. Night lighting is registered with the DayNightCycle.
    /// </summary>
    public static class PortEnvironmentBuilder
    {
        public static void Build(Transform parent, DayNightCycle dayNight)
        {
            var root = Prim.Group("Environment", parent, Vector3.zero);
            var concrete = MaterialLibrary.Get(Palette.Concrete, 0.15f);
            var concreteDark = MaterialLibrary.Get(Palette.ConcreteDark, 0.15f);
            var asphalt = MaterialLibrary.Get(Palette.Asphalt, 0.2f);
            var laneMark = MaterialLibrary.Get(Palette.LaneMark, 0.1f);
            var steelDark = MaterialLibrary.Get(Palette.SteelDark, 0.35f, 0.4f);

            // ---- Quay platform: x −70..70, z −10..44, top at Tuning.QuayTopY ----
            Prim.Cube("Quay", root, new Vector3(0f, Tuning.QuayTopY - 1f, 17f),
                new Vector3(140f, 2f, 54f), concrete);
            // Fender edge strip along the water side.
            Prim.Cube("QuayEdge", root, new Vector3(0f, Tuning.QuayTopY - 0.35f, -10.3f),
                new Vector3(140f, 1.4f, 0.9f), concreteDark);

            // ---- Roads (thin slabs slightly above the quay to avoid z-fighting) ----
            float roadY = Tuning.QuayTopY + 0.02f;
            Road(root, asphalt, new Vector3(0f, roadY, 2f), new Vector2(70f, 7f));      // crane load lane
            Road(root, asphalt, new Vector3(30f, roadY, 13f), new Vector2(8f, 22f));    // spur to warehouse
            Road(root, asphalt, new Vector3(3f, roadY, 26f), new Vector2(56f, 7f));     // return road
            Road(root, asphalt, new Vector3(-20f, roadY, 14f), new Vector2(8f, 22f));   // west connector

            // Dashed centerline on the load lane.
            for (int x = -30; x <= 30; x += 6)
                Prim.GroundQuad("LaneDash", root, new Vector3(x, roadY + 0.02f, 2f),
                    new Vector2(2.4f, 0.3f), laneMark);

            // Load-point box marking under the crane's landside lane.
            Prim.GroundQuad("LoadBox", root,
                new Vector3(Tuning.LoadPoint.x, roadY + 0.02f, Tuning.LoadPoint.z),
                new Vector2(6.5f, 4.5f), laneMark);

            // ---- Decorative container-yard stacks (west side) ----
            var yard = Prim.Group("YardStacks", root, Vector3.zero);
            Vector3 cs = Tuning.ContainerSize;
            var rng = new System.Random(7);
            for (int row = 0; row < 3; row++)
            {
                for (int col = 0; col < 4; col++)
                {
                    int height = 1 + (rng.Next(3) == 0 ? 1 : 0);
                    for (int level = 0; level < height; level++)
                    {
                        var color = Palette.Containers[rng.Next(Palette.Containers.Length)];
                        Prim.Cube("YardContainer", yard,
                            new Vector3(-58f + col * (cs.x + 0.6f),
                                Tuning.QuayTopY + cs.y * (level + 0.5f),
                                12f + row * (cs.z + 1.2f)),
                            cs, MaterialLibrary.Get(color, 0.3f));
                    }
                }
            }

            // ---- Bollards along the quay edge ----
            for (int x = -60; x <= 60; x += 12)
                Prim.Cylinder("Bollard", root, new Vector3(x, Tuning.QuayTopY + 0.35f, -9.2f),
                    new Vector3(0.55f, 0.35f, 0.55f), steelDark);

            // ---- Lampposts ----
            Vector3[] lampSpots =
            {
                new Vector3(-50f, 0f, -6f), new Vector3(-25f, 0f, -6f),
                new Vector3(25f, 0f, -6f), new Vector3(50f, 0f, -6f),
                new Vector3(45f, 0f, 20f), new Vector3(-42f, 0f, 20f),
            };
            var lampHeadMat = MaterialLibrary.Create(Palette.WarmLight, 0.4f);
            dayNight.RegisterNightEmissive(lampHeadMat, Palette.WarmLight * 2.2f);
            foreach (var spot in lampSpots)
                Lamppost(root, spot, lampHeadMat, dayNight);

            // ---- Admin building with windows that glow at night ----
            var admin = Prim.Group("AdminBuilding", root, new Vector3(-45f, Tuning.QuayTopY, 36f));
            Prim.Cube("AdminBody", admin, new Vector3(0f, 4.5f, 0f), new Vector3(13f, 9f, 9f),
                MaterialLibrary.Get(Palette.WarehouseWall, 0.2f));
            Prim.Cube("AdminRoof", admin, new Vector3(0f, 9.2f, 0f), new Vector3(13.6f, 0.5f, 9.6f),
                MaterialLibrary.Get(Palette.WarehouseRoof, 0.3f));
            var windowMat = MaterialLibrary.Create(Palette.Hex("#3D4A55"), 0.75f, 0.1f);
            dayNight.RegisterNightEmissive(windowMat, Palette.WarmLight * 1.4f);
            for (int floor = 0; floor < 2; floor++)
                for (int wx = -2; wx <= 2; wx++)
                    Prim.Cube("AdminWindow", admin,
                        new Vector3(wx * 2.3f, 3f + floor * 3.2f, -4.53f),
                        new Vector3(1.5f, 1.7f, 0.1f), windowMat);
        }

        private static void Road(Transform parent, Material mat, Vector3 center, Vector2 size)
        {
            Prim.Cube("Road", parent, center, new Vector3(size.x, 0.04f, size.y), mat);
        }

        private static void Lamppost(Transform root, Vector3 basePos, Material headMat, DayNightCycle dayNight)
        {
            var lamp = Prim.Group("Lamppost", root, new Vector3(basePos.x, Tuning.QuayTopY, basePos.z));
            Prim.Cylinder("Pole", lamp, new Vector3(0f, 3.5f, 0f), new Vector3(0.22f, 3.5f, 0.22f),
                MaterialLibrary.Get(Palette.SteelDark, 0.35f, 0.4f));
            Prim.Cube("Head", lamp, new Vector3(0f, 7.1f, 0f), new Vector3(1.2f, 0.35f, 0.5f), headMat);

            var lightGo = new GameObject("LampLight");
            lightGo.transform.SetParent(lamp, false);
            lightGo.transform.localPosition = new Vector3(0f, 6.8f, 0f);
            var l = lightGo.AddComponent<Light>();
            l.type = LightType.Point;
            l.range = 20f;
            l.intensity = 1.5f;
            l.color = Palette.WarmLight;
            l.shadows = LightShadows.None;
            dayNight.RegisterNightLight(l);
        }
    }
}
