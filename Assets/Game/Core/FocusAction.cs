using System;

namespace PortGame
{
    /// <summary>
    /// A contextual action offered on an object's focus card (upgrades,
    /// hires). The card shows the label with the cost; Available gates the
    /// button; Execute performs the purchase.
    /// </summary>
    public sealed class FocusAction
    {
        public string Label;
        public long Cost;
        public Func<bool> Available;
        public Action Execute;
    }

    /// <summary>Focusable objects that offer actions implement this next to IFocusInfo.</summary>
    public interface IFocusActions
    {
        /// <summary>Current actions; empty array when nothing is offered. Polled with the card refresh.</summary>
        FocusAction[] FocusActions { get; }
    }
}
