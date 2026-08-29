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
        /// <summary>Builds all static scenery; returns the operations (admin) building so PORT AI can live in it.</summary>
        public static Transform Build(Transform parent, DayNightCycle dayNight)
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

            // ---- Roads matching the road graph (thin slabs above the quay
            // surface to avoid z-fighting): main east lane, crane load bays,
            // warehouse spur, return road, west connector, parking lane. ----
            float roadY = Tuning.QuayTopY + 0.02f;
            Road(root, asphalt, new Vector3(-2f, roadY, 8f), new Vector2(88f, 6f));     // main east lane
            Road(root, asphalt, new Vector3(Tuning.BerthWestX, roadY, 5f), new Vector2(7f, 8f));  // bay A spur
            Road(root, asphalt, new Vector3(Tuning.BerthEastX, roadY, 5f), new Vector2(7f, 8f));  // bay B spur
            Road(root, asphalt, new Vector3(37f, roadY, 12f), new Vector2(6f, 12f));    // east connector
            Road(root, asphalt, new Vector3(31f, roadY, 19f), new Vector2(8f, 12f));    // warehouse spur
            Road(root, asphalt, new Vector3(-6f, roadY, 26f), new Vector2(70f, 6f));    // return road
            Road(root, asphalt, new Vector3(-40f, roadY, 16f), new Vector2(6f, 20f));   // west connector
            Road(root, asphalt, new Vector3(-46f, roadY, 9.5f), new Vector2(6f, 13f));  // parking lane
            Road(root, asphalt, new Vector3(42f, roadY, 11f), new Vector2(9f, 6f));     // customs bay
            Road(root, asphalt, new Vector3(48f, roadY, 18f), new Vector2(13f, 5f));    // cold-store spur
            Road(root, asphalt, new Vector3(52f, roadY, 21.5f), new Vector2(5f, 6f));   // cold-store apron
            Road(root, asphalt, new Vector3(61f, roadY, 33f), new Vector2(6f, 15f));    // cold return east leg
            Road(root, asphalt, new Vector3(30f, roadY, 39f), new Vector2(60f, 5f));    // back-lot road
            Road(root, asphalt, new Vector3(-2f, roadY, 34f), new Vector2(14f, 9f));    // back-lot rejoin

            // Dashed centerline on the main lane.
            for (int x = -38; x <= 34; x += 6)
                Prim.GroundQuad("LaneDash", root, new Vector3(x, roadY + 0.02f, 8f),
                    new Vector2(2.4f, 0.3f), laneMark);

            // Load-bay box markings under both cranes' landside lanes.
            Prim.GroundQuad("LoadBoxA", root,
                new Vector3(Tuning.BerthWestX, roadY + 0.02f, Tuning.TrolleyLandZ),
                new Vector2(6.5f, 4.5f), laneMark);
            Prim.GroundQuad("LoadBoxB", root,
                new Vector3(Tuning.BerthEastX, roadY + 0.02f, Tuning.TrolleyLandZ),
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
                            new Vector3(-66f + col * (cs.x + 0.6f),
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
                new Vector3(45f, 0f, 20f), new Vector3(-52f, 0f, 24f),
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

            return admin;
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
