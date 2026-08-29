using UnityEngine;

namespace PortGame
{
    /// <summary>
    /// Marks an object the camera can cinematically focus when tapped.
    /// Requires a collider somewhere under the same root for the tap raycast.
    /// </summary>
    public class FocusTarget : MonoBehaviour
    {
        [Tooltip("Camera distance when focused.")]
        public float focusDistance = 26f;

        [Tooltip("Keep tracking this object while focused (vehicles, ships underway).")]
        public bool follow;

        [Tooltip("Extra height above the transform to aim at.")]
        public float aimHeight = 2f;

        public Vector3 AimPoint => transform.position + Vector3.up * aimHeight;
    }
}
