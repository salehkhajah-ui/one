using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Entry point. Self-starts in any scene, disables the scene's default
    /// camera/light, and constructs the entire Milestone-1 port — world,
    /// entities, camera, HUD and simulation — from code. No prefabs, no
    /// scene wiring: press Play.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void Boot()
        {
            if (FindObjectOfType<GameBootstrap>() != null) return;
            new GameObject("PORT").AddComponent<GameBootstrap>();
        }

        private void Awake()
        {
            Application.targetFrameRate = 60;
            QualitySettings.shadowDistance = 140f;

            DisableSceneDefaults();

            var root = transform;
            var save = SaveSystem.LoadOrNull();

            var economy = EconomyManager.Build(root);
            if (save != null) economy.LoadBalance(save.balance);

            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root, false);
            var dayNight = sunGo.AddComponent<DayNightCycle>();
            if (save != null) dayNight.LoadState(save.day, save.dayFraction);

            var audio = AudioManager.Build(root);
            var ocean = Ocean.Build(root);
            var weather = WeatherManager.Build(root, dayNight, ocean);
            var operationsBuilding = PortEnvironmentBuilder.Build(root, dayNight);

            var dryStore = Warehouse.Build(root, dayNight, new WarehouseConfig
            {
                Title = "Warehouse",
                Position = new Vector3(30f, Tuning.QuayTopY, 31f),
                Wall = Palette.WarehouseWall,
                Roof = Palette.WarehouseRoof,
                Glow = Palette.WarmLight,
                Capacity = Tuning.WarehouseCapacity,
                DispatchBase = Tuning.WarehouseDispatchInterval,
                Refrigerated = false,
            });
            var coldStore = Warehouse.Build(root, dayNight, new WarehouseConfig
            {
                Title = "Cold Store",
                Position = new Vector3(52f, Tuning.QuayTopY, 31f),
                Wall = Palette.Hex("#DCE4E6"),
                Roof = Palette.Hex("#9FB3B8"),
                Glow = Palette.Hex("#9FDCE8"),
                Capacity = Tuning.ColdCapacity,
                DispatchBase = Tuning.ColdDispatchInterval,
                Refrigerated = true,
            });
            if (save != null)
            {
                dryStore.LoadStored(save.warehouseStored);
                dryStore.DispatchLevel = save.dispatchLevel;
                coldStore.LoadStored(save.coldStored);
                coldStore.DispatchLevel = save.coldDispatchLevel;
            }

            var customs = CustomsOffice.Build(root, dayNight);
            if (save != null) customs.Level = save.customsLevel;

            var graph = RoadGraph.BuildDefault();
            var craneWest = CraneController.Build(root, "Quay Crane 1", Tuning.BerthWestX, graph["LPA"]);
            var craneEast = CraneController.Build(root, "Quay Crane 2", Tuning.BerthEastX, graph["LPB"]);
            craneWest.RegisterNightVisuals(dayNight);
            craneEast.RegisterNightVisuals(dayNight);
            if (save != null)
            {
                craneWest.SpeedLevel = save.craneLevelA;
                craneEast.SpeedLevel = save.craneLevelB;
                craneWest.Health = save.craneHealthA;
                craneEast.Health = save.craneHealthB;
            }

            var dispatcher = VehicleDispatcher.Build(root, graph, dryStore, coldStore, customs);
            dispatcher.RegisterCrane(craneWest);
            dispatcher.RegisterCrane(craneEast);
            if (save != null) dispatcher.TractorSpeedLevel = save.tractorSpeedLevel;
            dispatcher.SpawnInitialFleet(save != null ? save.tractorCount : Tuning.StartingTractors);

            Gulls.Build(root);
            Workers.Build(root);
            Forklifts.Build(root);
            var tugs = Tugboats.Build(root);
            var cameraRig = CameraRig.Build(root);
            var reputation = Reputation.Build(root);
            if (save != null) reputation.LoadValue(save.reputation);

            var hud = HudController.Build(root, dayNight, economy, cameraRig, reputation);
            hud.SetWeather(weather);
            dryStore.OnDelivered += _ => audio.Chime();
            coldStore.OnDelivered += _ => audio.Chime();

            var portAI = PortAI.Attach(operationsBuilding, hud, dispatcher,
                new[] { craneWest, craneEast }, new[] { dryStore, coldStore });
            if (save != null) portAI.LoadRules(save.aiRules, save.aiActions);

            ContractManager.Build(root, new[] { dryStore, coldStore }, hud, reputation);
            var director = ShipmentDirector.Build(root, craneWest, craneEast, dispatcher,
                dryStore, coldStore, hud, dayNight, cameraRig, reputation, tugs, save);
            director.PortAIRef = portAI;
            EventManager.Build(root, director, customs, new[] { craneWest, craneEast }, hud);

            if (save != null) hud.Banner("Welcome back to your port", 3f);
        }

        /// <summary>
        /// The default empty scene ships with a Main Camera and Directional
        /// Light; the game owns both concerns, so switch the strangers off.
        /// </summary>
        private void DisableSceneDefaults()
        {
            foreach (var cam in FindObjectsOfType<Camera>())
                if (cam.transform.root != transform) cam.gameObject.SetActive(false);
            foreach (var light in FindObjectsOfType<Light>())
                if (light.type == LightType.Directional && light.transform.root != transform)
                    light.gameObject.SetActive(false);
            foreach (var listener in FindObjectsOfType<AudioListener>())
                if (listener.transform.root != transform) listener.enabled = false;
        }
    }
}
