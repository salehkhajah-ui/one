using UnityEngine;

namespace PortGame
{
    public enum Urgency { Green, Amber, Orange, Red }

    /// <summary>
    /// The logical shipment behind a ship: what it carries, how much it pays,
    /// and when it is due. The deadline clock starts the moment the ship is
    /// announced — time spent waiting at anchor burns it too, which is what
    /// makes berth congestion cost money.
    /// </summary>
    public sealed class Shipment
    {
        public string ShipName;
        public CargoType Cargo;
        public int Count;
        public float SpawnTime;         // Time.time at announcement
        public float DeadlineSeconds;
        public int Delivered;

        public long RewardPerContainer => Cargo.ValuePerContainer;
        public long OnTimeBonus => Cargo.ValuePerContainer * Count / 3;
        public long LatePenalty => Cargo.ValuePerContainer * Count / 4;

        public float Remaining => SpawnTime + DeadlineSeconds - Time.time;
        public bool IsLate => Remaining < 0f;

        public Urgency Urgency
        {
            get
            {
                float f = Remaining / DeadlineSeconds;
                if (f > 0.5f) return Urgency.Green;
                if (f > 0.25f) return Urgency.Amber;
                if (f > 0.1f) return Urgency.Orange;
                return Urgency.Red;
            }
        }

        public string RemainingText
        {
            get
            {
                float r = Remaining;
                if (r < 0f)
                {
                    int over = Mathf.FloorToInt(-r / 60f);
                    return over < 1 ? "overdue" : string.Format("overdue by {0} min", over);
                }
                int m = Mathf.FloorToInt(r / 60f);
                int s = Mathf.FloorToInt(r - m * 60f);
                return string.Format("{0}:{1:00}", m, s);
            }
        }

        public static Color UrgencyColor(Urgency u)
        {
            switch (u)
            {
                case Urgency.Green: return Palette.Hex("#7FBF7A");
                case Urgency.Amber: return Palette.Hex("#D9B94A");
                case Urgency.Orange: return Palette.Hex("#D98A3F");
                default: return Palette.Hex("#CC5B52");
            }
        }
    }
}
