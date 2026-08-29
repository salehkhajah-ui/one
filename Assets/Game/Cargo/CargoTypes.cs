using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// A kind of goods a shipment can carry. Data-driven per TDD §8 — nothing
    /// downstream hard-codes a specific good. These records become
    /// CargoTypeSO ScriptableObjects when authored content arrives.
    ///
    /// Refrigerated cargo decays (quality points per minute) whenever it is
    /// outside the cold chain — from the moment the crane lifts it until the
    /// cold warehouse takes it in — and pays by remaining quality. Hazardous
    /// cargo is always customs-inspected and handled slowly and carefully by
    /// the cranes.
    /// </summary>
    public sealed class CargoType
    {
        public readonly string Id;
        public readonly string DisplayName;
        public readonly string Origin;
        public readonly Color Color;
        public readonly long ValuePerContainer;   // KD
        public readonly bool Refrigerated;
        public readonly float DecayPerMinute;     // quality points lost per minute outside cold
        public readonly bool Hazard;
        public readonly bool Oversized;           // project cargo — double-length, heavy-lift protocol

        public CargoType(string id, string displayName, string origin, string hexColor,
            long valuePerContainer, bool refrigerated = false, float decayPerMinute = 0f,
            bool hazard = false, bool oversized = false)
        {
            Id = id;
            DisplayName = displayName;
            Origin = origin;
            Color = Palette.Hex(hexColor);
            ValuePerContainer = valuePerContainer;
            Refrigerated = refrigerated;
            DecayPerMinute = decayPerMinute;
            Hazard = hazard;
            Oversized = oversized;
        }
    }

    public static class CargoCatalog
    {
        public static readonly CargoType[] All =
        {
            new CargoType("strawberries", "Fresh Strawberries", "Valencia", "#C25B5B", 850, true, 9f),
            new CargoType("coffee", "Coffee Beans", "Santos", "#8A6A4F", 520),
            new CargoType("smartphones", "Smartphones", "Shenzhen", "#7C8FA6", 900),
            new CargoType("furniture", "Furniture", "Izmir", "#B08D5C", 380),
            new CargoType("medicine", "Medical Supplies", "Hamburg", "#DDE3E6", 950),
            new CargoType("clothes", "Textiles", "Mumbai", "#A6788F", 340),
            new CargoType("machinery", "Machinery Parts", "Busan", "#8E969C", 600),
            new CargoType("seafood", "Frozen Seafood", "Bergen", "#6E9FA6", 780, true, 7f),
            new CargoType("chocolate", "Chocolate", "Antwerp", "#6B5244", 460),
            new CargoType("materials", "Building Materials", "Alexandria", "#C2A05A", 300),
            new CargoType("chemicals", "Industrial Chemicals", "Jubail", "#9BA65F", 700, false, 0f, true),
        };

        /// <summary>Not in the random rotation — arrives only as Panamax project cargo.</summary>
        public static readonly CargoType HeavyMachinery =
            new CargoType("heavy", "Heavy Machinery", "Ulsan", "#7A6F63", 1400,
                false, 0f, false, oversized: true);

        public static CargoType Pick(System.Random rng)
        {
            return All[rng.Next(All.Length)];
        }

        public static CargoType ById(string id)
        {
            foreach (var c in All)
                if (c.Id == id) return c;
            return All[0];
        }
    }
}
