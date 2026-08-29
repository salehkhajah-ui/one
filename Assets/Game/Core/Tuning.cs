using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Every gameplay/feel constant for Milestone 1 in one place.
    /// World units are meters. Money is integer KD.
    /// </summary>
    public static class Tuning
    {
        // ---- Time ----
        public const float DayLengthMinutes = 12f;   // one in-game day in real minutes
        public const float StartDayFraction = 0.34f; // ~08:10, morning light

        // ---- Layout (shared spatial contract between builders and sim) ----
        public const float QuayTopY = 2f;            // top surface of the quay platform
        public const float WaterY = 0.25f;           // mean ocean surface height
        public const float BerthZ = -16f;            // ship centerline when docked
        public const float TrolleyShipZ = BerthZ;    // trolley position over the ship
        public const float BerthWestX = -27f;        // berth A centerline
        public const float BerthEastX = 27f;         // berth B centerline
        public const float TrolleyLandZ = 2f;        // trolley position over the load lane
        public const float TrailerBedY = QuayTopY + 1.05f; // top of the tractor trailer bed

        public static readonly Vector3 ContainerSize = new Vector3(4f, 2.5f, 2.5f);

        // ---- Ship ----
        public const int MinContainersPerShip = 6;
        public const int MaxContainersPerShip = 10;
        public const float ShipCruiseSpeed = 9f;
        public const float ShipDockSeconds = 5f;

        // ---- Shipments / deadlines (seconds of real time) ----
        public const float DeadlineBuffer = 160f;
        public const float DeadlinePerContainer = 48f;
        public const int AnchorSlots = 3;
        // Higher reputation brings ships faster (more business, more pressure).
        public const float SpawnIntervalSlowRep = 60f;   // at reputation 0
        public const float SpawnIntervalFastRep = 28f;   // at reputation 100

        // ---- Warehouses ----
        public const int WarehouseCapacity = 9;
        public const float WarehouseDispatchInterval = 16f;
        public const int ColdCapacity = 6;
        public const float ColdDispatchInterval = 14f;
        public const float DispatchIntervalPerLevel = 3.5f; // upgrade shaves this off
        public const long DispatchRevenue = 120;

        // ---- Customs ----
        public const float CustomsChance = 0.18f;      // flagged containers per manifest
        public const float CustomsBaseDwell = 12f;     // seconds per inspection
        public const float CustomsDwellPerLevel = 0.25f; // fraction shaved per upgrade level
        public const long CustomsFee = 60;             // quiet revenue per inspection
        public static readonly long[] CustomsCosts = { 1500, 3000, 6000 };

        // ---- Equipment wear ----
        public const float CraneWearPerBox = 0.8f;     // health points per container
        public const float HazardWearBonus = 1.2f;
        public const float CraneBreakdownHealth = 70f; // risk begins below this
        public const float CraneRepairSeconds = 32f;
        public const long CraneMaintenanceCost = 500;
        public const long CraneEmergencyRepairCost = 1200;

        // ---- Events ----
        public const float EventFirstDelay = 210f;
        public const float EventIntervalMin = 150f;
        public const float EventIntervalMax = 260f;
        public const float CrackdownSeconds = 75f;

        // ---- Fleet ----
        public const int StartingTractors = 2;
        public const int MaxTractors = 4;

        // ---- Upgrade costs (KD, per level bought) ----
        public static readonly long[] CraneSpeedCosts = { 2500, 5000, 10000 };
        public static readonly long[] TractorSpeedCosts = { 1500, 3000, 6000 };
        public static readonly long[] DispatchCosts = { 2000, 4000, 8000 };
        public static readonly long[] HireTractorCosts = { 8000, 15000 };

        // ---- Reputation ----
        public const int RepOnTime = 2;
        public const int RepLate = -4;
        public const int RepContractWin = 3;
        public const int RepContractFail = -3;

        // ---- Contracts ----
        public const float ContractFirstOfferDelay = 150f;
        public const float ContractOfferIntervalMin = 150f;
        public const float ContractOfferIntervalMax = 240f;
        public const float ContractOfferTimeout = 25f;

        // ---- Crane ----
        public const float GantrySpeed = 4.5f;       // m/s along the quay
        public const float TrolleySpeed = 5f;        // m/s along the boom
        public const float HoistSpeed = 5.5f;        // m/s cable
        public const float GrabPause = 0.4f;

        // ---- Tractor ----
        public const float TractorMaxSpeed = 7f;
        public const float TractorAccel = 3.5f;
        public const float TractorTurnDegPerSec = 110f;

        // ---- Economy ----
        public const long StartingBalance = 12000;

        // ---- Camera ----
        public const float CamMinDistance = 12f;
        public const float CamMaxDistance = 90f;
        public const float CamMinPitch = 30f;
        public const float CamMaxPitch = 55f;
        public static readonly Vector2 CamPivotBoundsX = new Vector2(-70f, 70f);
        public static readonly Vector2 CamPivotBoundsZ = new Vector2(-60f, 45f);

        public static readonly string[] ShipNames =
        {
            "Northern Star", "Atlas Voyager", "Mediterranean Pearl",
            "Pacific Horizon", "Arabian Falcon", "Baltic Trader",
        };
    }
}
