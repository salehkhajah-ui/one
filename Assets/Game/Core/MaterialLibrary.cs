using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortGame
{
    /// <summary>
    /// Pastel-industrial palette for the placeholder diorama look.
    /// </summary>
    public static class Palette
    {
        public static readonly Color Concrete = Hex("#D6D2C9");
        public static readonly Color ConcreteDark = Hex("#B9B5AC");
        public static readonly Color Asphalt = Hex("#5A5C60");
        public static readonly Color LaneMark = Hex("#E8DFB8");
        public static readonly Color Water = Hex("#2E6E77");
        public static readonly Color HullRed = Hex("#8C4A45");
        public static readonly Color ShipWhite = Hex("#EDEAE2");
        public static readonly Color CraneTeal = Hex("#4E8C87");
        public static readonly Color SpreaderYellow = Hex("#D9A43F");
        public static readonly Color Steel = Hex("#8E969C");
        public static readonly Color SteelDark = Hex("#4A5055");
        public static readonly Color WarehouseWall = Hex("#C9C4BA");
        public static readonly Color WarehouseRoof = Hex("#7A8388");
        public static readonly Color TractorBlue = Hex("#5B7C99");
        public static readonly Color WarmLight = Hex("#FFD9A0");
        public static readonly Color Gull = Hex("#F2F1EC");

        public static readonly Color[] Containers =
        {
            Hex("#B06A5C"), Hex("#6E8F7C"), Hex("#C2A05A"),
            Hex("#7C8FA6"), Hex("#A6788F"), Hex("#8A9E5F"),
        };

        public static Color Hex(string hex)
        {
            Color c;
            return ColorUtility.TryParseHtmlString(hex, out c) ? c : Color.magenta;
        }
    }

    /// <summary>
    /// Creates and caches materials that work on both Built-in RP and URP.
    /// Detects the active pipeline at runtime; `material.color` maps to the
    /// [MainColor] property on both Standard and URP/Lit.
    /// </summary>
    public static class MaterialLibrary
    {
        private static readonly Dictionary<Color, Material> Cache = new Dictionary<Color, Material>();
        private static Shader _baseShader;

        private static Shader BaseShader
        {
            get
            {
                if (_baseShader == null)
                {
                    _baseShader = GraphicsSettings.currentRenderPipeline != null
                        ? Shader.Find("Universal Render Pipeline/Lit")
                        : Shader.Find("Standard");
                    if (_baseShader == null) _baseShader = Shader.Find("Standard");
                }
                return _baseShader;
            }
        }

        public static Material Get(Color color, float smoothness = 0.25f, float metallic = 0f)
        {
            Material m;
            if (Cache.TryGetValue(color, out m) && m != null) return m;
            m = Create(color, smoothness, metallic);
            Cache[color] = m;
            return m;
        }

        /// <summary>Uncached variant for materials that get mutated (emission toggles, water).</summary>
        public static Material Create(Color color, float smoothness = 0.25f, float metallic = 0f)
        {
            var m = new Material(BaseShader) { color = color };
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metallic);
            return m;
        }

        public static void SetEmission(Material m, Color emission)
        {
            if (emission.maxColorComponent > 0.001f)
            {
                m.EnableKeyword("_EMISSION");
                m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
                m.SetColor("_EmissionColor", emission);
            }
            else
            {
                m.SetColor("_EmissionColor", Color.black);
                m.DisableKeyword("_EMISSION");
            }
        }
    }
}
