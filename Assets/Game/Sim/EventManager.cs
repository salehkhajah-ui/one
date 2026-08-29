using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Random operational events on a slow cadence: an emergency medical ship
    /// that jumps the berth queue, a customs crackdown that flags every
    /// container for a while, a forced crane breakdown, and a market surge
    /// that sweetens the next shipment. Each one lands as a banner and plays
    /// out through the systems that already exist — events never teleport
    /// state, they push on the simulation.
    /// </summary>
    public class EventManager : MonoBehaviour
    {
        private ShipmentDirector _director;
        private CustomsOffice _customs;
        private CraneController[] _cranes;
        private HudController _hud;
        private readonly System.Random _rng = new System.Random();

        public static EventManager Build(Transform parent, ShipmentDirector director,
            CustomsOffice customs, CraneController[] cranes, HudController hud)
        {
            var go = new GameObject("Events");
            go.transform.SetParent(parent, false);
            var em = go.AddComponent<EventManager>();
            em._director = director;
            em._customs = customs;
            em._cranes = cranes;
            em._hud = hud;
            return em;
        }

        private void Start()
        {
            StartCoroutine(EventLoop());
        }

        private IEnumerator EventLoop()
        {
            yield return new WaitForSeconds(Tuning.EventFirstDelay);
            while (true)
            {
                FireRandomEvent();
                yield return new WaitForSeconds(Mathf.Lerp(
                    Tuning.EventIntervalMin, Tuning.EventIntervalMax, (float)_rng.NextDouble()));
            }
        }

        private void FireRandomEvent()
        {
            int roll = _rng.Next(100);
            if (roll < 35)
            {
                // Emergency shipment — skipped quietly when the anchorage is full.
                _director.SpawnEmergencyShipment();
            }
            else if (roll < 60)
            {
                _customs.TriggerCrackdown(Tuning.CrackdownSeconds);
                _hud.Banner(string.Format(
                    "Customs crackdown — every container inspected for {0:0}s",
                    Tuning.CrackdownSeconds));
            }
            else if (roll < 80)
            {
                // Stress an active crane; a parked one shrugs it off.
                var crane = _cranes[_rng.Next(_cranes.Length)];
                if (crane.Busy)
                {
                    crane.ForceBreakdown();
                    _hud.Banner(crane.FocusTitle + " reporting critical wear");
                }
            }
            else
            {
                _director.SurgeNextShipment(1.5f);
                _hud.Banner("Market surge — the next shipment pays +50%");
            }
        }
    }
}
