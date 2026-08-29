using System;
using System.IO;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Versioned save model (TDD §12): logical state only — balances,
    /// counters, clock — never transforms. The world rebuilds visually from
    /// this on load. Ships in transit are not saved; an interrupted shipment
    /// respawns fresh on the next run.
    /// </summary>
    [Serializable]
    public class SaveModelV1
    {
        public int version = 1;
        public long balance;
        public int day;
        public float dayFraction;
        public int shipIndex;
        public int warehouseStored;
        public long totalDelivered;
        public bool onboardingDone;
    }

    /// <summary>
    /// JSON save with atomic write (temp file + move). Failures never crash
    /// the game — a broken or missing save just means a fresh port.
    /// </summary>
    public static class SaveSystem
    {
        private static string Path =>
            System.IO.Path.Combine(Application.persistentDataPath, "port_save.json");

        public static SaveModelV1 LoadOrNull()
        {
            try
            {
                if (!File.Exists(Path)) return null;
                var model = JsonUtility.FromJson<SaveModelV1>(File.ReadAllText(Path));
                if (model == null || model.version != 1) return null; // future: migrate V1→V2→…
                return model;
            }
            catch (Exception e)
            {
                Debug.LogWarning("PORT: could not read save, starting fresh. " + e.Message);
                return null;
            }
        }

        public static void Save(SaveModelV1 model)
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
