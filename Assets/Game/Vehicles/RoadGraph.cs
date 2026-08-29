using System.Collections.Generic;
using UnityEngine;

namespace PortGame
{
    public class RoadNode
    {
        public string Name;
        public Vector3 Pos;
        public TerminalTractor ClaimedBy;
        public readonly List<RoadNode> Next = new List<RoadNode>();
    }

    /// <summary>
    /// The port's road network: a one-way loop with service spurs (crane load
    /// bays, warehouse door, parking lane), per TDD §6. Vehicles claim one
    /// node ahead before entering it; a busy node makes the follower brake
    /// and hold — queues and congestion emerge physically from arbitration,
    /// they are never scripted. One-way edges mean no head-on deadlocks; the
    /// loop drains at the warehouse end, so waiting chains always resolve.
    /// </summary>
    public class RoadGraph
    {
        private readonly Dictionary<string, RoadNode> _nodes = new Dictionary<string, RoadNode>();
        private readonly List<RoadNode> _all = new List<RoadNode>();

        public RoadNode this[string name] => _nodes[name];

        public static RoadGraph BuildDefault()
        {
            var g = new RoadGraph();
            float y = Tuning.QuayTopY;

            // Main east-bound lane (z=8), with load-bay spurs dropping to the
            // crane lanes (z=2) so a tractor waiting for a crane never blocks
            // through traffic.
            g.Node("W2", -40f, y, 8f);
            g.Node("A1", -34f, y, 8f);
            g.Node("LPA", Tuning.BerthWestX, y, Tuning.TrolleyLandZ);  // crane A load bay
            g.Node("A2", -18f, y, 8f);
            g.Node("M", 0f, y, 8f);
            g.Node("B1", 20f, y, 8f);
            g.Node("LPB", Tuning.BerthEastX, y, Tuning.TrolleyLandZ);  // crane B load bay
            g.Node("B2", 36f, y, 8f);
            g.Node("CUS", 43f, y, 11f);                                // customs inspection bay
            g.Node("E2", 38f, y, 15f);
            g.Node("WHA", 30f, y, 18.5f);
            g.Node("WH", 30f, y, 23f);                                 // dry warehouse door
            // Cold-store branch east of the dry warehouse.
            g.Node("CW1", 46f, y, 16f);
            g.Node("CWA", 52f, y, 19f);
            g.Node("CWH", 52f, y, 23f);                                // cold warehouse door
            // Scenic return from the cold store: east and around behind
            // both warehouses, rejoining the main return road.
            g.Node("CN1", 63f, y, 27f);
            g.Node("CN2", 58f, y, 40f);
            g.Node("CN3", 12f, y, 40f);
            g.Node("CN4", -8f, y, 33f);
            // Return road (z≈26) heading west, back to the lane entry.
            g.Node("R1", 18f, y, 25f);
            g.Node("R2", 0f, y, 26f);
            g.Node("R3", -20f, y, 26f);
            g.Node("R4", -36f, y, 25f);
            g.Node("W1", -41f, y, 17f);
            // Parking bypass for idle tractors.
            g.Node("PK1", -47f, y, 12f);
            g.Node("PK2", -47f, y, 6f);

            g.Edge("W2", "A1");
            g.Edge("A1", "A2");   // through lane past bay A
            g.Edge("A1", "LPA");
            g.Edge("LPA", "A2");
            g.Edge("A2", "M");
            g.Edge("M", "B1");
            g.Edge("B1", "B2");   // through lane past bay B
            g.Edge("B1", "LPB");
            g.Edge("LPB", "B2");
            g.Edge("B2", "E2");    // clean cargo goes straight through
            g.Edge("B2", "CUS");   // flagged cargo detours via the customs bay
            g.Edge("CUS", "E2");
            g.Edge("E2", "WHA");
            g.Edge("WHA", "WH");
            g.Edge("E2", "CW1");   // refrigerated branch
            g.Edge("CW1", "CWA");
            g.Edge("CWA", "CWH");
            g.Edge("CWH", "CN1");
            g.Edge("CN1", "CN2");
            g.Edge("CN2", "CN3");
            g.Edge("CN3", "CN4");
            g.Edge("CN4", "R3");
            g.Edge("WH", "R1");
            g.Edge("R1", "R2");
            g.Edge("R2", "R3");
            g.Edge("R3", "R4");
            g.Edge("R4", "W1");
            g.Edge("W1", "W2");   // through lane past parking
            g.Edge("W1", "PK1");
            g.Edge("PK1", "PK2");
            g.Edge("PK2", "W2");
            return g;
        }

        private void Node(string name, float x, float y, float z)
        {
            var n = new RoadNode { Name = name, Pos = new Vector3(x, y, z) };
            _nodes[name] = n;
            _all.Add(n);
        }

        private void Edge(string from, string to)
        {
            _nodes[from].Next.Add(_nodes[to]);
        }

        // ---- Claims ------------------------------------------------------

        public bool TryClaim(RoadNode node, TerminalTractor vehicle)
        {
            if (node.ClaimedBy != null && node.ClaimedBy != vehicle) return false;
            node.ClaimedBy = vehicle;
            return true;
        }

        public void Release(RoadNode node, TerminalTractor vehicle)
        {
            if (node.ClaimedBy == vehicle) node.ClaimedBy = null;
        }

        // ---- Routing (Dijkstra — the graph is tiny) ----------------------

        public List<RoadNode> FindPath(RoadNode from, RoadNode to)
        {
            var dist = new Dictionary<RoadNode, float>();
            var prev = new Dictionary<RoadNode, RoadNode>();
            var open = new List<RoadNode>();
            foreach (var n in _all) dist[n] = float.MaxValue;
            dist[from] = 0f;
            open.Add(from);

            while (open.Count > 0)
            {
                int best = 0;
                for (int i = 1; i < open.Count; i++)
                    if (dist[open[i]] < dist[open[best]]) best = i;
                var cur = open[best];
                open.RemoveAt(best);
                if (cur == to) break;

                foreach (var next in cur.Next)
                {
                    float d = dist[cur] + Vector3.Distance(cur.Pos, next.Pos);
                    if (d < dist[next])
                    {
                        dist[next] = d;
                        prev[next] = cur;
                        if (!open.Contains(next)) open.Add(next);
                    }
                }
            }

            var path = new List<RoadNode> { to };
            var walk = to;
            while (walk != from && prev.ContainsKey(walk))
            {
                walk = prev[walk];
                path.Insert(0, walk);
            }
            return path;
        }
    }
}
