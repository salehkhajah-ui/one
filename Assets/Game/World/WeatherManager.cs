using UnityEngine;

namespace PortGame
{
    public enum WeatherKind { Clear, Cloudy, Rain, Storm, Fog }

    /// <summary>
    /// Weather that changes how the port looks AND how it works (TDD §7).
    /// Profiles blend smoothly over a transition window; the blended values
    /// feed the sun (via DayNightCycle.SunScale), fog, sky exposure, ocean
    /// wave height, ship/crane/tractor speeds, ground wetness on the shared
    /// materials, the rain field and the rain audio bed. During a storm the
    /// harbor closes: ships hold at anchor until it passes.
    /// </summary>
    public class WeatherManager : MonoBehaviour
    {
        private struct Profile
        {
            public WeatherKind Kind;
            public string Name;
            public float SunScale;
            public float FogDensity;
            public Color FogTint;
            public float FogTintWeight;
            public float SkyExposure;
            public float SeaScale;
            public float CraneSlow;    // ≥1 multiplies motion durations
            public float TractorScale; // ≤1 multiplies fleet speed
            public float ShipScale;    // ≤1 multiplies sailing speed
            public float Rain;         // 0..1 rain field + audio intensity
            public float Wetness;      // 0..1 ground darkening/gloss
        }

        private static readonly Profile[] Profiles =
        {
            new Profile { Kind = WeatherKind.Clear, Name = "Clear", SunScale = 1f, FogDensity = 0.0016f,
                FogTint = new Color(0.8f, 0.85f, 0.9f), FogTintWeight = 0f, SkyExposure = 1.2f,
                SeaScale = 1f, CraneSlow = 1f, TractorScale = 1f, ShipScale = 1f, Rain = 0f, Wetness = 0f },
            new Profile { Kind = WeatherKind.Cloudy, Name = "Cloudy", SunScale = 0.62f, FogDensity = 0.0021f,
                FogTint = new Color(0.72f, 0.75f, 0.78f), FogTintWeight = 0.25f, SkyExposure = 0.95f,
                SeaScale = 1.15f, CraneSlow = 1f, TractorScale = 1f, ShipScale = 1f, Rain = 0f, Wetness = 0.1f },
            new Profile { Kind = WeatherKind.Rain, Name = "Rain", SunScale = 0.42f, FogDensity = 0.0032f,
                FogTint = new Color(0.6f, 0.65f, 0.7f), FogTintWeight = 0.45f, SkyExposure = 0.75f,
                SeaScale = 1.35f, CraneSlow = 1.18f, TractorScale = 0.9f, ShipScale = 1f, Rain = 0.55f, Wetness = 1f },
            new Profile { Kind = WeatherKind.Storm, Name = "Storm", SunScale = 0.28f, FogDensity = 0.0045f,
                FogTint = new Color(0.42f, 0.46f, 0.52f), FogTintWeight = 0.6f, SkyExposure = 0.55f,
                SeaScale = 2.2f, CraneSlow = 1.5f, TractorScale = 0.8f, ShipScale = 0.85f, Rain = 1f, Wetness = 1f },
            new Profile { Kind = WeatherKind.Fog, Name = "Fog", SunScale = 0.5f, FogDensity = 0.011f,
                FogTint = new Color(0.78f, 0.8f, 0.82f), FogTintWeight = 0.8f, SkyExposure = 0.85f,
                SeaScale = 1f, CraneSlow = 1.1f, TractorScale = 0.85f, ShipScale = 0.5f, Rain = 0f, Wetness = 0.3f },
        };

        public static WeatherManager Instance { get; private set; }

        public WeatherKind Kind => Profiles[_currentIndex].Kind;
        public string DisplayName => Profiles[_currentIndex].Name;

        /// <summary>Storm closes the harbor — ships hold at anchor.</summary>
        public bool ShipsMayDock => Kind != WeatherKind.Storm;

        // Blended values read by the rest of the game every frame.
        public float SeaScale { get; private set; } = 1f;
        public float CraneDurationScale { get; private set; } = 1f;
        public float TractorScale { get; private set; } = 1f;
        public float ShipSpeedScale { get; private set; } = 1f;
        public float RainAmount { get; private set; }

        private DayNightCycle _dayNight;
        private Ocean _ocean;
        private RainField _rain;
        private readonly System.Random _rng = new System.Random();

        private int _currentIndex;
        private int _fromIndex;
        private float _blend = 1f;          // 0→1 across a transition
        private float _nextChangeAt;

        private Material[] _groundMats;
        private Color[] _groundBaseColors;
        private float _groundBaseSmooth = 0.17f;

        public static WeatherManager Build(Transform parent, DayNightCycle dayNight, Ocean ocean)
        {
            var go = new GameObject("Weather");
            go.transform.SetParent(parent, false);
            var w = go.AddComponent<WeatherManager>();
            w._dayNight = dayNight;
            w._ocean = ocean;
            w._rain = RainField.Build(go.transform);
            return w;
        }

        private void Awake()
        {
            Instance = this;
            _nextChangeAt = Time.time + 90f; // first spell is always calm-ish

            _groundMats = new[]
            {
                MaterialLibrary.Get(Palette.Concrete, 0.15f),
                MaterialLibrary.Get(Palette.ConcreteDark, 0.15f),
                MaterialLibrary.Get(Palette.Asphalt, 0.2f),
            };
            _groundBaseColors = new Color[_groundMats.Length];
            for (int i = 0; i < _groundMats.Length; i++)
                _groundBaseColors[i] = _groundMats[i].color;
        }

        private void Update()
        {
            if (Time.time >= _nextChangeAt)
            {
                _fromIndex = _currentIndex;
                _currentIndex = PickNext();
                _blend = 0f;
                float hold = Profiles[_currentIndex].Kind == WeatherKind.Storm
                    ? 60f + (float)_rng.NextDouble() * 45f
                    : 100f + (float)_rng.NextDouble() * 110f;
                _nextChangeAt = Time.time + hold;
            }
            _blend = Mathf.MoveTowards(_blend, 1f, Time.deltaTime / 12f);
        }

        private int PickNext()
        {
            // Weighted pick, never repeating the current kind. Storms stay
            // rare and never strike in the first five minutes of a session.
            int[] weights = { 40, 25, 15, Time.time > 300f ? 10 : 0, 10 }; // Clear/Cloudy/Rain/Storm/Fog
            int total = 0;
            for (int i = 0; i < weights.Length; i++)
                if (i != _currentIndex) total += weights[i];
            int roll = _rng.Next(total);
            for (int i = 0; i < weights.Length; i++)
            {
                if (i == _currentIndex) continue;
                roll -= weights[i];
                if (roll < 0) return i;
            }
            return 0;
        }

        private void LateUpdate()
        {
            var from = Profiles[_fromIndex];
            var to = Profiles[_currentIndex];
            float t = Ease.InOutCubic(_blend);

            float sun = Mathf.Lerp(from.SunScale, to.SunScale, t);
            float fogDensity = Mathf.Lerp(from.FogDensity, to.FogDensity, t);
            Color fogTint = Color.Lerp(from.FogTint, to.FogTint, t);
            float fogWeight = Mathf.Lerp(from.FogTintWeight, to.FogTintWeight, t);
            float exposure = Mathf.Lerp(from.SkyExposure, to.SkyExposure, t);
            float wetness = Mathf.Lerp(from.Wetness, to.Wetness, t);

            SeaScale = Mathf.Lerp(from.SeaScale, to.SeaScale, t);
            CraneDurationScale = Mathf.Lerp(from.CraneSlow, to.CraneSlow, t);
            TractorScale = Mathf.Lerp(from.TractorScale, to.TractorScale, t);
            ShipSpeedScale = Mathf.Lerp(from.ShipScale, to.ShipScale, t);
            RainAmount = Mathf.Lerp(from.Rain, to.Rain, t);

            _dayNight.SunScale = sun;
            RenderSettings.fogDensity = fogDensity;
            RenderSettings.fogColor = Color.Lerp(RenderSettings.fogColor, fogTint, fogWeight);
            if (RenderSettings.skybox != null && RenderSettings.skybox.HasProperty("_Exposure"))
                RenderSettings.skybox.SetFloat("_Exposure", exposure);

            _ocean.WaveScale = SeaScale;
            _rain.SetIntensity(RainAmount, Kind == WeatherKind.Storm);
            if (AudioManager.Instance != null) AudioManager.Instance.SetRainVolume(RainAmount);

            // Wet ground: darker and glossier on the shared surface materials.
            for (int i = 0; i < _groundMats.Length; i++)
            {
                var m = _groundMats[i];
                m.color = _groundBaseColors[i] * (1f - 0.22f * wetness);
                float smooth = _groundBaseSmooth + 0.5f * wetness;
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
                if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smooth);
            }
        }
    }
}
