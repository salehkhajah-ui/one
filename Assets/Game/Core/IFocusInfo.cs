namespace PortGame
{
    /// <summary>
    /// Implemented by focusable objects that have something to say. The HUD
    /// shows a contextual card while such an object is camera-focused —
    /// the Milestone-2 slice of the "world is the interface" contextual UI.
    /// </summary>
    public interface IFocusInfo
    {
        string FocusTitle { get; }

        /// <summary>Multi-line body, rebuilt on demand (polled ~4×/second).</summary>
        string FocusBody { get; }
    }
}
