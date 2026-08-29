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
            PortEnvironmentBuilder.Build(root, dayNight);

            var warehouse = Warehouse.Build(root, dayNight);
            if (save != null)
            {
                warehouse.LoadStored(save.warehouseStored);
                warehouse.DispatchLevel = save.dispatchLevel;
            }

            var graph = RoadGraph.BuildDefault();
            var craneWest = CraneController.Build(root, "Quay Crane 1", Tuning.BerthWestX, graph["LPA"]);
            var craneEast = CraneController.Build(root, "Quay Crane 2", Tuning.BerthEastX, graph["LPB"]);
            craneWest.RegisterNightVisuals(dayNight);
            craneEast.RegisterNightVisuals(dayNight);
            if (save != null)
            {
                craneWest.SpeedLevel = save.craneLevelA;
                craneEast.SpeedLevel = save.craneLevelB;
            }

            var dispatcher = VehicleDispatcher.Build(root, graph, warehouse);
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
            warehouse.OnDelivered += _ => audio.Chime();
            ContractManager.Build(root, warehouse, hud, reputation);
            ShipmentDirector.Build(root, craneWest, craneEast, dispatcher, warehouse,
                hud, dayNight, cameraRig, reputation, tugs, save);

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
