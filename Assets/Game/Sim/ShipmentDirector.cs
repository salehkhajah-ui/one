using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Orchestrates the core loop: announce ship → sail in → dock → crane
    /// unloads → tractor hauls → warehouse receives → rewards → depart →
    /// next ship. The crane/tractor pipeline runs concurrently (the crane
    /// fetches the next container while the tractor is still delivering).
    /// </summary>
    public class ShipmentDirector : MonoBehaviour
    {
        private CraneController _crane;
        private TerminalTractor _tractor;
        private Warehouse _warehouse;
        private HudController _hud;
        private int _shipIndex;
        private int _deliveredBaseline;

        public ShipController CurrentShip { get; private set; }

        public static ShipmentDirector Build(Transform parent, CraneController crane,
            TerminalTractor tractor, Warehouse warehouse, HudController hud)
        {
            var go = new GameObject("ShipmentDirector");
            go.transform.SetParent(parent, false);
            var director = go.AddComponent<ShipmentDirector>();
            director._crane = crane;
            director._tractor = tractor;
            director._warehouse = warehouse;
            director._hud = hud;

            warehouse.OnDelivered += director.OnContainerDelivered;
            return director;
        }

        private void Start()
        {
            StartCoroutine(MainLoop());
        }

        private void OnContainerDelivered(Container container)
        {
            EconomyManager.Instance.Add(Tuning.RewardPerContainer, "container received");
        }

        private IEnumerator MainLoop()
        {
            yield return new WaitForSeconds(3f);

            while (true)
            {
                string shipName = Tuning.ShipNames[_shipIndex % Tuning.ShipNames.Length];
                _shipIndex++;
                int count = Tuning.ContainersPerShip;

                _hud.Banner(string.Format("{0} inbound — {1} containers", shipName, count));
                CurrentShip = ShipController.Build(transform, shipName, count);

                yield return CurrentShip.SailIn();
                _hud.Banner(string.Format("{0} docked — unloading begins", shipName), 3f);

                _deliveredBaseline = _warehouse.DeliveredCount;
                yield return _crane.UnloadAll(CurrentShip, _tractor);

                // The crane is done; wait for the tractor to land the last box.
                while (_warehouse.DeliveredCount < _deliveredBaseline + count)
                    yield return null;

                EconomyManager.Instance.Add(Tuning.ShipmentBonus, "shipment complete");
                _hud.Banner(string.Format("{0} — shipment complete", shipName));

                yield return new WaitForSeconds(1.5f);
                yield return CurrentShip.Depart();
                Destroy(CurrentShip.gameObject);
                CurrentShip = null;

                yield return new WaitForSeconds(6f);
            }
        }
    }
}
