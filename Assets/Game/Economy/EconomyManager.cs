using System;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Single writer for money. Integer KD only — no floating point ever
    /// touches a balance. Rewards flow from world events (warehouse receipts,
    /// shipment completion); the HUD merely listens and animates.
    /// </summary>
    public class EconomyManager : MonoBehaviour
    {
        public static EconomyManager Instance { get; private set; }

        public long Balance { get; private set; }

        /// <summary>Everything ever spent on the port (visible purchases) — feeds the port-value score.</summary>
        public long CapitalInvested { get; private set; }

        /// <summary>New balance.</summary>
        public event Action<long> OnChanged;

        /// <summary>Short reward/expense message for the toast line.</summary>
        public event Action<string> OnToast;

        public static EconomyManager Build(Transform parent)
        {
            var go = new GameObject("Economy");
            go.transform.SetParent(parent, false);
            return go.AddComponent<EconomyManager>();
        }

        private void Awake()
        {
            Instance = this;
            Balance = Tuning.StartingBalance;
        }

        /// <summary>Quiet entries adjust the balance without a toast (e.g. background dispatch revenue).</summary>
        public void Add(long amount, string reason, bool quiet = false)
        {
            Balance += amount;
            var changed = OnChanged;
            if (changed != null) changed(Balance);
            if (quiet) return;
            var toast = OnToast;
            if (toast != null)
                toast(string.Format("{0}KD {1:N0} — {2}", amount >= 0 ? "+" : "−",
                    Math.Abs(amount), reason));
        }

        /// <summary>Spend if affordable. Returns false (and toasts nothing) when short.</summary>
        public bool TrySpend(long cost, string reason, bool quiet = false)
        {
            if (Balance < cost) return false;
            Add(-cost, reason, quiet);
            if (!quiet) CapitalInvested += cost; // quiet spends are operating fees, not capital
            return true;
        }

        public void LoadCapital(long invested)
        {
            CapitalInvested = invested;
        }

        /// <summary>Restores a saved balance without a toast.</summary>
        public void LoadBalance(long balance)
        {
            Balance = balance;
            var changed = OnChanged;
            if (changed != null) changed(Balance);
        }
    }
}
