using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Minimal haptics: a single buzz on genuinely notable moments only
    /// (shipment settled, contract resolved). Unity's built-in Vibrate is
    /// coarse, so it is used sparingly; fine-grained haptics (impact styles,
    /// success taps) arrive with a platform plugin in a later phase and
    /// replace only this class.
    /// </summary>
    public static class Haptics
    {
        public static void Notable()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            Handheld.Vibrate();
#endif
        }
    }
}
