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
        public const float TrolleyLandZ = 2f;        // trolley position over the load lane
        public const float TrailerBedY = QuayTopY + 1.05f; // top of the tractor trailer bed

        public static readonly Vector3 ContainerSize = new Vector3(4f, 2.5f, 2.5f);

        // ---- Ship ----
        public const int ContainersPerShip = 8;
        public const float ShipCruiseSpeed = 9f;
        public const float ShipDockSeconds = 5f;

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
        public const long RewardPerContainer = 500;
        public const long ShipmentBonus = 1500;
        public const long StartingBalance = 12000;

        // ---- Camera ----
        public const float CamMinDistance = 12f;
        public const float CamMaxDistance = 90f;
        public const float CamMinPitch = 30f;
        public const float CamMaxPitch = 55f;
        public static readonly Vector2 CamPivotBoundsX = new Vector2(-70f, 70f);
        public static readonly Vector2 CamPivotBoundsZ = new Vector2(-60f, 45f);

        // ---- Routes ----
        // Tractor load point sits under the crane's landside drop lane.
        public static readonly Vector3 LoadPoint = new Vector3(0f, QuayTopY, TrolleyLandZ);

        public static readonly Vector3[] TractorOutboundPath =
        {
            new Vector3(10f, QuayTopY, 2f),
            new Vector3(22f, QuayTopY, 4.5f),
            new Vector3(29f, QuayTopY, 10f),
            new Vector3(30f, QuayTopY, 18f),
            new Vector3(30f, QuayTopY, 23f),   // warehouse door apron
        };

        public static readonly Vector3[] TractorReturnPath =
        {
            new Vector3(24f, QuayTopY, 26f),
            new Vector3(-14f, QuayTopY, 26f),
            new Vector3(-20f, QuayTopY, 20f),
            new Vector3(-20f, QuayTopY, 9f),
            new Vector3(-12f, QuayTopY, 3f),
            new Vector3(0f, QuayTopY, TrolleyLandZ), // back to the load point
        };

        public static readonly string[] ShipNames =
        {
            "Northern Star", "Atlas Voyager", "Mediterranean Pearl",
            "Pacific Horizon", "Arabian Falcon", "Baltic Trader",
        };
    }
}
