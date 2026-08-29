using System;
using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Easing + coroutine animation helpers. Every visible motion in the game
    /// goes through these so nothing moves linearly.
    /// </summary>
    public static class Ease
    {
        public static float InOutCubic(float t)
        {
            t = Mathf.Clamp01(t);
            return t < 0.5f ? 4f * t * t * t : 1f - Mathf.Pow(-2f * t + 2f, 3f) / 2f;
        }

        public static float OutCubic(float t)
        {
            t = Mathf.Clamp01(t);
            return 1f - Mathf.Pow(1f - t, 3f);
        }

        public static float InCubic(float t)
        {
            t = Mathf.Clamp01(t);
            return t * t * t;
        }

        /// <summary>Slight overshoot on arrival — used for settles.</summary>
        public static float OutBack(float t)
        {
            t = Mathf.Clamp01(t);
            const float c1 = 1.20158f;
            const float c3 = c1 + 1f;
            return 1f + c3 * Mathf.Pow(t - 1f, 3f) + c1 * Mathf.Pow(t - 1f, 2f);
        }

        /// <summary>
        /// Runs <paramref name="apply"/> with an eased 0→1 value over
        /// <paramref name="duration"/> seconds, always finishing at exactly 1.
        /// </summary>
        public static IEnumerator Animate(float duration, Action<float> apply, Func<float, float> ease = null)
        {
            if (ease == null) ease = InOutCubic;
            if (duration <= 0f)
            {
                apply(1f);
                yield break;
            }
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                apply(ease(Mathf.Clamp01(t / duration)));
                yield return null;
            }
            apply(1f);
        }
    }
}
