using System;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Port reliability, 0–100. Earned by on-time shipments and fulfilled
    /// contracts, lost to late cargo and broken contracts. Higher reputation
    /// brings ships in faster — more business, more pressure.
    /// </summary>
    public class Reputation : MonoBehaviour
    {
        public int Value { get; private set; } = 50;

        /// <summary>(newValue, signedDelta, reason)</summary>
        public event Action<int, int, string> OnChanged;

        public static Reputation Build(Transform parent)
        {
            var go = new GameObject("Reputation");
            go.transform.SetParent(parent, false);
            return go.AddComponent<Reputation>();
        }

        public void LoadValue(int value)
        {
            Value = Mathf.Clamp(value, 0, 100);
        }

        public void Add(int delta, string reason)
        {
            int before = Value;
            Value = Mathf.Clamp(Value + delta, 0, 100);
            int applied = Value - before;
            if (applied == 0) return;
            var handler = OnChanged;
            if (handler != null) handler(Value, applied, reason);
        }

        /// <summary>0 at reputation 0 → 1 at reputation 100.</summary>
        public float Normalized => Value / 100f;
    }
}
