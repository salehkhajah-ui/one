using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// A kind of goods a shipment can carry. Data-driven per TDD §8 — nothing
    /// downstream hard-codes a specific good. These records become
    /// CargoTypeSO ScriptableObjects when authored content arrives; the shape
    /// (value, refrigeration, origin) is already the production one.
    /// Refrigeration matters visually now and mechanically in Phase 5
    /// (cold-chain decay).
    /// </summary>
    public sealed class CargoType
    {
        public readonly string Id;
        public readonly string DisplayName;
        public readonly string Origin;
        public readonly Color Color;
        public readonly long ValuePerContainer;   // KD
        public readonly bool Refrigerated;

        public CargoType(string id, string displayName, string origin, string hexColor,
            long valuePerContainer, bool refrigerated = false)
        {
            Id = id;
            DisplayName = displayName;
            Origin = origin;
            Color = Palette.Hex(hexColor);
            ValuePerContainer = valuePerContainer;
            Refrigerated = refrigerated;
        }
    }

    public static class CargoCatalog
    {
        public static readonly CargoType[] All =
        {
            new CargoType("strawberries", "Fresh Strawberries", "Valencia", "#C25B5B", 850, true),
            new CargoType("coffee", "Coffee Beans", "Santos", "#8A6A4F", 520),
            new CargoType("smartphones", "Smartphones", "Shenzhen", "#7C8FA6", 900),
            new CargoType("furniture", "Furniture", "Izmir", "#B08D5C", 380),
            new CargoType("medicine", "Medical Supplies", "Hamburg", "#DDE3E6", 950),
            new CargoType("clothes", "Textiles", "Mumbai", "#A6788F", 340),
            new CargoType("machinery", "Machinery Parts", "Busan", "#8E969C", 600),
            new CargoType("seafood", "Frozen Seafood", "Bergen", "#6E9FA6", 780, true),
            new CargoType("chocolate", "Chocolate", "Antwerp", "#6B5244", 460),
            new CargoType("materials", "Building Materials", "Alexandria", "#C2A05A", 300),
        };

        public static CargoType Pick(System.Random rng)
        {
            return All[rng.Next(All.Length)];
        }
    }
}
