using System;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Audio with zero asset files: every clip is synthesized at boot
    /// (harbor-wash noise bed, rain bed, a proper multi-partial ship horn,
    /// soft delivery chime, UI click, contract alert). Levels stay low and
    /// horn moments are rate-limited — the direction is calm and premium,
    /// never noisy. Real recorded ambience can replace these clips later
    /// without touching any caller.
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        private const int SampleRate = 22050;

        public static AudioManager Instance { get; private set; }

        private AudioSource _waves;
        private AudioSource _rain;
        private AudioSource _oneShot;

        private AudioClip _horn;
        private AudioClip _chime;
        private AudioClip _click;
        private AudioClip _alert;

        private float _rainTarget;
        private float _lastHornAt = -999f;

        public static AudioManager Build(Transform parent)
        {
            var go = new GameObject("Audio");
            go.transform.SetParent(parent, false);
            return go.AddComponent<AudioManager>();
        }

        private void Awake()
        {
            Instance = this;

            _waves = MakeSource(loop: true, volume: 0.22f);
            _waves.clip = MakeNoiseLoop("WavesLoop", 8f, lowPassStrength: 40, swellRate: 0.22f);
            _waves.Play();

            _rain = MakeSource(loop: true, volume: 0f);
            _rain.clip = MakeNoiseLoop("RainLoop", 4f, lowPassStrength: 4, swellRate: 0f);
            _rain.Play();

            _oneShot = MakeSource(loop: false, volume: 0.5f);

            _horn = MakeHorn();
            _chime = MakeChime();
            _click = MakeClick();
            _alert = MakeAlert();
        }

        private void Update()
        {
            _rain.volume = Mathf.MoveTowards(_rain.volume, _rainTarget * 0.3f, Time.deltaTime * 0.2f);
        }

        // ---- Public cues -------------------------------------------------

        public void SetRainVolume(float amount)
        {
            _rainTarget = Mathf.Clamp01(amount);
        }

        /// <summary>Ship horn, rate-limited so overlapping arrivals don't blare.</summary>
        public void Horn()
        {
            if (Time.time - _lastHornAt < 8f) return;
            _lastHornAt = Time.time;
            _oneShot.PlayOneShot(_horn, 0.55f);
        }

        public void Chime()
        {
            _oneShot.PlayOneShot(_chime, 0.4f);
        }

        public void Click()
        {
            _oneShot.PlayOneShot(_click, 0.5f);
        }

        public void Alert()
        {
            _oneShot.PlayOneShot(_alert, 0.45f);
        }

        // ---- Synthesis ---------------------------------------------------

        private AudioSource MakeSource(bool loop, float volume)
        {
            var go = new GameObject("Source");
            go.transform.SetParent(transform, false);
            var src = go.AddComponent<AudioSource>();
            src.loop = loop;
            src.volume = volume;
            src.playOnAwake = false;
            src.spatialBlend = 0f; // 2D bed
            return src;
        }

        private static AudioClip Bake(string name, float[] data)
        {
            var clip = AudioClip.Create(name, data.Length, 1, SampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        /// <summary>
        /// Looping filtered noise. lowPassStrength is a running-average window
        /// (bigger = deeper rumble); swellRate adds a slow wash LFO. The last
        /// half-second is crossfaded into the first so the loop is seamless.
        /// </summary>
        private static AudioClip MakeNoiseLoop(string name, float seconds, int lowPassStrength, float swellRate)
        {
            int n = (int)(seconds * SampleRate);
            var data = new float[n];
            var rng = new System.Random(5);
            float acc = 0f;
            float k = 1f / Mathf.Max(1, lowPassStrength);
            for (int i = 0; i < n; i++)
            {
                float white = (float)rng.NextDouble() * 2f - 1f;
                acc += (white - acc) * k;
                float swell = swellRate > 0f
                    ? 0.65f + 0.35f * Mathf.Sin(i / (float)SampleRate * swellRate * Mathf.PI * 2f)
                    : 1f;
                data[i] = acc * swell * (lowPassStrength > 10 ? 3.5f : 0.8f);
            }
            // Seamless loop: crossfade tail into head.
            int fade = SampleRate / 2;
            for (int i = 0; i < fade; i++)
            {
                float t = i / (float)fade;
                data[n - fade + i] = data[n - fade + i] * (1f - t) + data[i] * t;
            }
            return Bake(name, data);
        }

        private static AudioClip MakeHorn()
        {
            const float seconds = 2.4f;
            int n = (int)(seconds * SampleRate);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SampleRate;
                // Attack 0.12s, sustain, release 0.7s.
                float env = Mathf.Clamp01(t / 0.12f) * Mathf.Clamp01((seconds - t) / 0.7f);
                float vibrato = 1f + 0.004f * Mathf.Sin(t * 5.2f * Mathf.PI * 2f);
                float w = t * Mathf.PI * 2f * vibrato;
                float s =
                    Mathf.Sin(w * 92f) * 0.5f +
                    Mathf.Sin(w * 184f) * 0.28f +
                    Mathf.Sin(w * 277f) * 0.14f +
                    Mathf.Sin(w * 371f) * 0.06f;
                data[i] = s * env * 0.8f;
            }
            return Bake("Horn", data);
        }

        private static AudioClip MakeChime()
        {
            const float seconds = 0.7f;
            int n = (int)(seconds * SampleRate);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SampleRate;
                float env = Mathf.Exp(-t * 6f);
                data[i] = (Mathf.Sin(t * 660f * Mathf.PI * 2f) * 0.6f +
                           Mathf.Sin(t * 990f * Mathf.PI * 2f) * 0.3f) * env * 0.6f;
            }
            return Bake("Chime", data);
        }

        private static AudioClip MakeClick()
        {
            const float seconds = 0.07f;
            int n = (int)(seconds * SampleRate);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SampleRate;
                data[i] = Mathf.Sin(t * 1250f * Mathf.PI * 2f) * Mathf.Exp(-t * 60f) * 0.7f;
            }
            return Bake("Click", data);
        }

        private static AudioClip MakeAlert()
        {
            const float seconds = 0.55f;
            int n = (int)(seconds * SampleRate);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SampleRate;
                float freq = t < 0.22f ? 523f : 659f;
                float env = Mathf.Clamp01(t / 0.02f) * Mathf.Exp(-t * 4f);
                data[i] = Mathf.Sin(t * freq * Mathf.PI * 2f) * env * 0.55f;
            }
            return Bake("Alert", data);
        }
    }
}
