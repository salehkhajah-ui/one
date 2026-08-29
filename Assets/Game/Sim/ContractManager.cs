using System.Collections;
using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Fictional clients periodically offer throughput contracts: deliver N
    /// containers within a window for a payout and reputation. Declining (or
    /// ignoring the offer) costs nothing; accepting and failing costs
    /// reputation. One contract at a time.
    /// </summary>
    public class ContractManager : MonoBehaviour
    {
        private static readonly string[] Clients =
        {
            "FreshMart Supermarkets", "Gulf Electronics", "Al-Bahar Motors",
            "Nour Pharma", "Desert Build Co",
        };

        public bool Active { get; private set; }

        private string _client;
        private int _required;
        private int _progress;
        private float _deadlineAt;
        private long _payout;

        private HudController _hud;
        private Reputation _reputation;
        private readonly System.Random _rng = new System.Random();
        private bool _offerAnswered;
        private bool _offerAccepted;

        public static ContractManager Build(Transform parent, Warehouse[] warehouses,
            HudController hud, Reputation reputation)
        {
            var go = new GameObject("Contracts");
            go.transform.SetParent(parent, false);
            var cm = go.AddComponent<ContractManager>();
            cm._hud = hud;
            cm._reputation = reputation;
            foreach (var warehouse in warehouses)
                warehouse.OnDelivered += cm.OnContainerDelivered;
            return cm;
        }

        private void OnContainerDelivered(Container container)
        {
            if (!Active) return;
            _progress++;
            if (_progress >= _required)
            {
                Active = false;
                EconomyManager.Instance.Add(_payout, "contract complete — " + _client);
                _reputation.Add(Tuning.RepContractWin, "contract fulfilled");
                _hud.Banner(_client + " — contract fulfilled");
                _hud.SetContractText("");
                Haptics.Notable();
            }
        }

        private void Start()
        {
            StartCoroutine(OfferLoop());
        }

        private void Update()
        {
            if (!Active) return;

            float remaining = _deadlineAt - Time.time;
            if (remaining <= 0f)
            {
                Active = false;
                _reputation.Add(Tuning.RepContractFail, "contract failed — " + _client);
                _hud.Banner(_client + " — contract failed");
                _hud.SetContractText("");
                Haptics.Notable();
                return;
            }

            int m = Mathf.FloorToInt(remaining / 60f);
            int s = Mathf.FloorToInt(remaining - m * 60f);
            _hud.SetContractText(string.Format("{0}: {1}/{2} · {3}:{4:00}",
                _client, _progress, _required, m, s));
        }

        private IEnumerator OfferLoop()
        {
            yield return new WaitForSeconds(Tuning.ContractFirstOfferDelay);
            while (true)
            {
                if (!Active)
                {
                    // Don't fight the panel with an AI recommendation.
                    while (_hud.DecisionBusy) yield return null;

                    var client = Clients[_rng.Next(Clients.Length)];
                    int required = 10 + _rng.Next(9);
                    float window = required * 42f + 90f;
                    long payout = required * 420L;

                    _offerAnswered = false;
                    _offerAccepted = false;

                    if (PortAI.Has(AiRule.AutoContracts))
                    {
                        // PORT AI signs on the port's behalf.
                        _offerAccepted = true;
                        PortAI.Note("PORT AI accepted contract — " + client);
                    }
                    else
                    {
                        _hud.ShowContractOffer(
                            string.Format("{0}\nDeliver {1} containers within {2} min\nPayout: KD {3:N0}",
                                client, required, Mathf.CeilToInt(window / 60f), payout),
                            () => { _offerAnswered = true; _offerAccepted = true; },
                            () => { _offerAnswered = true; });

                        float waited = 0f;
                        while (!_offerAnswered && waited < Tuning.ContractOfferTimeout)
                        {
                            waited += Time.deltaTime;
                            yield return null;
                        }
                        _hud.HideContractOffer();
                    }

                    if (_offerAccepted)
                    {
                        Active = true;
                        _client = client;
                        _required = required;
                        _progress = 0;
                        _payout = payout;
                        _deadlineAt = Time.time + window;
                        _hud.Banner(client + " — contract accepted");
                    }
                }

                yield return new WaitForSeconds(Mathf.Lerp(
                    Tuning.ContractOfferIntervalMin, Tuning.ContractOfferIntervalMax,
                    (float)_rng.NextDouble()));
            }
        }
    }
}
