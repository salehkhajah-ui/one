using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortGame
{
    /// <summary>
    /// Owns game time and everything that follows the sun: sun/moon lights,
    /// procedural skybox, ambient, fog, and every registered night light
    /// (lamps, windows, warehouse glow). One day = Tuning.DayLengthMinutes.
    /// </summary>
    public class DayNightCycle : MonoBehaviour
    {
        private static readonly Color SunLow = Palette.Hex("#FFB878");
        private static readonly Color SunHigh = Palette.Hex("#FFF4E0");
        private static readonly Color AmbientNight = Palette.Hex("#20293B");
        private static readonly Color AmbientDay = Palette.Hex("#A9BCC7");
        private static readonly Color FogNight = Palette.Hex("#141B2A");
        private static readonly Color FogDay = Palette.Hex("#C4D2D8");

        private Light _sun;
        private Light _moon;
        private float _dayFraction = Tuning.StartDayFraction;
        private int _dayCount = 1;
        private bool _night;

        private readonly List<Light> _nightLights = new List<Light>();
        private readonly List<KeyValuePair<Material, Color>> _nightEmissives =
            new List<KeyValuePair<Material, Color>>();

        /// <summary>0 = midnight, 0.5 = noon.</summary>
        public float DayFraction => _dayFraction;

        public int DayCount => _dayCount;

        /// <summary>Restores saved time on load.</summary>
        public void LoadState(int day, float fraction)
        {
            _dayCount = Mathf.Max(1, day);
            _dayFraction = Mathf.Clamp01(fraction);
            ApplyTime();
        }

        /// <summary>0 at night, 1 at high noon.</summary>
        public float Daylight { get; private set; }

        /// <summary>Weather's multiplier on sun intensity (1 = clear sky).</summary>
        public float SunScale { get; set; } = 1f;

        public string ClockText
        {
            get
            {
                float hours = _dayFraction * 24f;
                int h = Mathf.FloorToInt(hours);
                int m = Mathf.FloorToInt((hours - h) * 60f);
                return string.Format("Day {0}  ·  {1:00}:{2:00}", _dayCount, h, m);
            }
        }

        private void Awake()
        {
            _sun = gameObject.AddComponent<Light>();
            _sun.type = LightType.Directional;
            _sun.shadows = LightShadows.Soft;
            _sun.shadowStrength = 0.75f;

            var moonGo = new GameObject("Moon");
            moonGo.transform.SetParent(transform, false);
            moonGo.transform.rotation = Quaternion.Euler(48f, 215f, 0f);
            _moon = moonGo.AddComponent<Light>();
            _moon.type = LightType.Directional;
            _moon.intensity = 0.14f;
            _moon.color = Palette.Hex("#8FA6C9");
            _moon.shadows = LightShadows.None;
            _moon.enabled = false;

            RenderSettings.sun = _sun;
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.0016f;

            var skyShader = Shader.Find("Skybox/Procedural");
            if (skyShader != null)
            {
                var sky = new Material(skyShader);
                if (sky.HasProperty("_SunSize")) sky.SetFloat("_SunSize", 0.045f);
                if (sky.HasProperty("_Exposure")) sky.SetFloat("_Exposure", 1.2f);
                if (sky.HasProperty("_AtmosphereThickness")) sky.SetFloat("_AtmosphereThickness", 1.12f);
                RenderSettings.skybox = sky;
            }

            ApplyTime();
        }

        public void RegisterNightLight(Light l)
        {
            _nightLights.Add(l);
            l.enabled = _night;
        }

        public void RegisterNightEmissive(Material m, Color emission)
        {
            _nightEmissives.Add(new KeyValuePair<Material, Color>(m, emission));
            MaterialLibrary.SetEmission(m, _night ? emission : Color.black);
        }

        private void Update()
        {
            float prev = _dayFraction;
            _dayFraction += Time.deltaTime / (Tuning.DayLengthMinutes * 60f);
            if (_dayFraction >= 1f)
            {
                _dayFraction -= 1f;
                _dayCount++;
            }
            if (prev != _dayFraction) ApplyTime();
        }

        private void ApplyTime()
        {
            Daylight = Mathf.Clamp01(Mathf.Sin((_dayFraction - 0.25f) * Mathf.PI * 2f));

            transform.rotation = Quaternion.Euler(_dayFraction * 360f - 90f, 40f, 0f);
            _sun.intensity = Mathf.Lerp(0f, 1.2f, Mathf.Sqrt(Daylight)) * SunScale;
            _sun.color = Color.Lerp(SunLow, SunHigh, Mathf.Clamp01(Daylight * 2f));

            RenderSettings.ambientLight = Color.Lerp(AmbientNight, AmbientDay, Daylight);
            RenderSettings.fogColor = Color.Lerp(FogNight, FogDay, Daylight);

            bool night = Daylight < 0.08f;
            if (night != _night)
            {
                _night = night;
                _moon.enabled = night;
                for (int i = 0; i < _nightLights.Count; i++)
                    if (_nightLights[i] != null) _nightLights[i].enabled = night;
                for (int i = 0; i < _nightEmissives.Count; i++)
                {
                    var pair = _nightEmissives[i];
                    if (pair.Key != null)
                        MaterialLibrary.SetEmission(pair.Key, night ? pair.Value : Color.black);
                }
            }
        }
    }
}
