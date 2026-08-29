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

            var economy = EconomyManager.Build(root);

            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root, false);
            var dayNight = sunGo.AddComponent<DayNightCycle>();

            Ocean.Build(root);
            PortEnvironmentBuilder.Build(root, dayNight);

            var warehouse = Warehouse.Build(root, dayNight);
            var crane = CraneController.Build(root);
            crane.RegisterNightVisuals(dayNight);
            var tractor = TerminalTractor.Build(root, warehouse);

            Gulls.Build(root);
            CameraRig.Build(root);

            var hud = HudController.Build(root, dayNight, economy);
            ShipmentDirector.Build(root, crane, tractor, warehouse, hud);

            hud.Banner("Welcome to your port", 3f);
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
