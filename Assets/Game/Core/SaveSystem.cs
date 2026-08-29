using System;
using System.IO;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Versioned save model (TDD §12): logical state only — balances,
    /// counters, levels, clock — never transforms. The world rebuilds
    /// visually from this on load. Ships in transit are not saved; an
    /// interrupted shipment respawns fresh on the next run.
    ///
    /// Version 2 added reputation, upgrade levels and fleet size; a version-1
    /// file is migrated on load (missing fields take era-appropriate
    /// defaults).
    /// </summary>
    [Serializable]
    public class SaveModel
    {
        public const int CurrentVersion = 2;

        public int version = CurrentVersion;
        public long balance;
        public int day;
        public float dayFraction;
        public int shipIndex;
        public int warehouseStored;
        public long totalDelivered;
        public bool onboardingDone;

        // v2
        public int reputation = 50;
        public int craneLevelA;
        public int craneLevelB;
        public int tractorSpeedLevel;
        public int dispatchLevel;
        public int tractorCount = Tuning.StartingTractors;
    }

    /// <summary>
    /// JSON save with atomic write (temp file + move). Failures never crash
    /// the game — a broken or missing save just means a fresh port.
    /// </summary>
    public static class SaveSystem
    {
        private static string Path =>
            System.IO.Path.Combine(Application.persistentDataPath, "port_save.json");

        public static SaveModel LoadOrNull()
        {
            try
            {
                if (!File.Exists(Path)) return null;
                var model = JsonUtility.FromJson<SaveModel>(File.ReadAllText(Path));
                if (model == null) return null;

                if (model.version == 1)
                {
                    // V1 → V2: fields JsonUtility zero-filled get their real defaults.
                    model.reputation = 50;
                    model.craneLevelA = 0;
                    model.craneLevelB = 0;
                    model.tractorSpeedLevel = 0;
                    model.dispatchLevel = 0;
                    model.tractorCount = Tuning.StartingTractors;
                    model.version = 2;
                }
                if (model.version != SaveModel.CurrentVersion) return null;

                model.tractorCount = Mathf.Clamp(model.tractorCount,
                    Tuning.StartingTractors, Tuning.MaxTractors);
                return model;
            }
            catch (Exception e)
            {
                Debug.LogWarning("PORT: could not read save, starting fresh. " + e.Message);
                return null;
            }
        }

        public static void Save(SaveModel model)
        {
            try
            {
                string tmp = Path + ".tmp";
                File.WriteAllText(tmp, JsonUtility.ToJson(model, true));
                if (File.Exists(Path)) File.Delete(Path);
                File.Move(tmp, Path);
            }
            catch (Exception e)
            {
                Debug.LogWarning("PORT: could not write save. " + e.Message);
            }
        }
    }
}
