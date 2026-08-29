using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace PortGame
{
    /// <summary>
    /// Isometric three-quarter camera. Pivot/yaw/pitch/distance move through
    /// smoothed targets so every motion is cinematic — nothing snaps.
    ///
    /// Touch: one-finger pan (inertia on release), pinch zoom, two-finger
    /// twist rotate, tap to focus. Mouse: LMB pan, RMB rotate, wheel zoom,
    /// click to focus. Focus eases toward a FocusTarget and follows it if the
    /// target requests following; any pan/rotate input cancels focus.
    /// </summary>
    public class CameraRig : MonoBehaviour
    {
        private const float PanSpeed = 0.0016f;   // screen px → world m, scaled by distance
        private const float RotateSpeed = 0.25f;  // deg per px
        private const float TapMaxPixels = 14f;
        private const float TapMaxSeconds = 0.35f;

        private Camera _cam;

        private Vector3 _pivot, _pivotTarget, _pivotVel;
        private float _yaw = 34f, _yawTarget = 34f, _yawVel;
        private float _pitch = 43f, _pitchTarget = 43f, _pitchVel;
        private float _dist = 58f, _distTarget = 58f, _distVel;

        private Vector3 _panInertia;
        private FocusTarget _focus;
        private float _smoothTime = 0.16f;

        private Vector2 _downPos;
        private float _downTime;
        private bool _maybeTap;

        private float _prevPinchDist;
        private float _prevPinchAngle;
        private bool _pinchActive;
        private bool _pointerOnUi; // gesture started on a HUD element — ignore it for the world

        public static CameraRig Build(Transform parent)
        {
            var go = new GameObject("CameraRig") { tag = "MainCamera" };
            go.transform.SetParent(parent, false);
            return go.AddComponent<CameraRig>();
        }

        private void Awake()
        {
            _cam = gameObject.AddComponent<Camera>();
            _cam.fieldOfView = 42f;
            _cam.nearClipPlane = 0.5f;
            _cam.farClipPlane = 900f;
            gameObject.AddComponent<AudioListener>();

            _pivot = _pivotTarget = new Vector3(2f, Tuning.QuayTopY, 4f);
            ApplyTransform();
        }

        /// <summary>Current focus target, or null. Fired on every change (null = focus cancelled).</summary>
        public event Action<FocusTarget> FocusChanged;

        public FocusTarget CurrentFocus => _focus;

        public void Focus(FocusTarget target)
        {
            _focus = target;
            _distTarget = target.focusDistance;
            _smoothTime = 0.3f; // slower, cinematic glide toward the target
            var handler = FocusChanged;
            if (handler != null) handler(target);
        }

        private void CancelFocus()
        {
            bool had = _focus != null;
            _focus = null;
            _smoothTime = 0.16f;
            if (had)
            {
                var handler = FocusChanged;
                if (handler != null) handler(null);
            }
        }

        private void Update()
        {
            if (Input.touchCount > 0) HandleTouch();
            else HandleMouse();
        }

        // ---- Mouse -------------------------------------------------------

        private void HandleMouse()
        {
            _pinchActive = false;

            float wheel = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(wheel) > 0.0001f)
                _distTarget = Mathf.Clamp(_distTarget * (1f - wheel * 1.2f),
                    Tuning.CamMinDistance, Tuning.CamMaxDistance);

            if (Input.GetMouseButtonDown(0))
            {
                _pointerOnUi = IsPointerOverUi(-1);
                _downPos = Input.mousePosition;
                _downTime = Time.unscaledTime;
                _maybeTap = !_pointerOnUi;
                _panInertia = Vector3.zero;
            }

            if (Input.GetMouseButton(0) && !_pointerOnUi)
            {
                var delta = (Vector2)Input.mousePosition - _downPos;
                if (_maybeTap && delta.magnitude > TapMaxPixels) _maybeTap = false;
                if (!_maybeTap)
                {
                    Pan(new Vector2(
                        Input.GetAxis("Mouse X") * 18f,
                        Input.GetAxis("Mouse Y") * 18f));
                }
            }

            if (Input.GetMouseButtonUp(0))
            {
                if (_maybeTap && !_pointerOnUi && Time.unscaledTime - _downTime < TapMaxSeconds)
                    TryFocusAt(Input.mousePosition);
                _pointerOnUi = false;
            }

            if (Input.GetMouseButton(1))
            {
                Rotate(Input.GetAxis("Mouse X") * 18f, Input.GetAxis("Mouse Y") * 18f);
            }
        }

        // ---- Touch -------------------------------------------------------

        private void HandleTouch()
        {
            if (Input.touchCount == 1)
            {
                _pinchActive = false;
                var t = Input.GetTouch(0);
                switch (t.phase)
                {
                    case TouchPhase.Began:
                        _pointerOnUi = IsPointerOverUi(t.fingerId);
                        _downPos = t.position;
                        _downTime = Time.unscaledTime;
                        _maybeTap = !_pointerOnUi;
                        _panInertia = Vector3.zero;
                        break;
                    case TouchPhase.Moved:
                        if (_pointerOnUi) break;
                        if (_maybeTap && (t.position - _downPos).magnitude > TapMaxPixels * 2f)
                            _maybeTap = false;
                        if (!_maybeTap) Pan(t.deltaPosition);
                        break;
                    case TouchPhase.Ended:
                    case TouchPhase.Canceled:
                        if (_maybeTap && !_pointerOnUi && Time.unscaledTime - _downTime < TapMaxSeconds)
                            TryFocusAt(t.position);
                        _pointerOnUi = false;
                        break;
                }
            }
            else if (Input.touchCount >= 2)
            {
                _maybeTap = false;
                var a = Input.GetTouch(0);
                var b = Input.GetTouch(1);
                float dist = (a.position - b.position).magnitude;
                Vector2 dir = b.position - a.position;
                float angle = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg;

                if (_pinchActive && _prevPinchDist > 1f)
                {
                    _distTarget = Mathf.Clamp(_distTarget * (_prevPinchDist / dist),
                        Tuning.CamMinDistance, Tuning.CamMaxDistance);
                    float angleDelta = Mathf.DeltaAngle(_prevPinchAngle, angle);
                    if (Mathf.Abs(angleDelta) > 0.01f)
                    {
                        _yawTarget -= angleDelta;
                        CancelFocus();
                    }
                }
                _prevPinchDist = dist;
                _prevPinchAngle = angle;
                _pinchActive = true;
            }
        }

        // ---- Shared gesture handlers ------------------------------------

        private void Pan(Vector2 screenDelta)
        {
            CancelFocus();
            Vector3 right = transform.right;
            right.y = 0f; right.Normalize();
            Vector3 fwd = transform.forward;
            fwd.y = 0f; fwd.Normalize();

            Vector3 world = (-screenDelta.x * right - screenDelta.y * fwd) * (PanSpeed * _dist);
            _pivotTarget += world;
            _panInertia = Vector3.Lerp(_panInertia, world / Mathf.Max(Time.deltaTime, 0.001f), 0.35f);
        }

        private void Rotate(float dxPixels, float dyPixels)
        {
            CancelFocus();
            _yawTarget += dxPixels * RotateSpeed;
            _pitchTarget = Mathf.Clamp(_pitchTarget - dyPixels * RotateSpeed * 0.6f,
                Tuning.CamMinPitch, Tuning.CamMaxPitch);
        }

        private static bool IsPointerOverUi(int fingerId)
        {
            var es = EventSystem.current;
            if (es == null) return false;
            return fingerId >= 0 ? es.IsPointerOverGameObject(fingerId) : es.IsPointerOverGameObject();
        }

        private void TryFocusAt(Vector2 screenPos)
        {
            RaycastHit hit;
            if (Physics.Raycast(_cam.ScreenPointToRay(screenPos), out hit, 600f))
            {
                var target = hit.collider.GetComponentInParent<FocusTarget>();
                if (target != null) Focus(target);
            }
        }

        // ---- Motion ------------------------------------------------------

        private void LateUpdate()
        {
            bool anyInput = Input.GetMouseButton(0) || Input.touchCount > 0;
            if (!anyInput && _panInertia.sqrMagnitude > 0.0001f)
            {
                _pivotTarget += _panInertia * Time.deltaTime;
                _panInertia *= Mathf.Exp(-4.5f * Time.deltaTime);
            }

            if (_focus != null)
            {
                _pivotTarget = _focus.AimPoint;
                if (!_focus.follow &&
                    (_pivotTarget - _pivot).sqrMagnitude < 0.05f) _smoothTime = 0.16f;
            }

            _pivotTarget.x = Mathf.Clamp(_pivotTarget.x, Tuning.CamPivotBoundsX.x, Tuning.CamPivotBoundsX.y);
            _pivotTarget.z = Mathf.Clamp(_pivotTarget.z, Tuning.CamPivotBoundsZ.x, Tuning.CamPivotBoundsZ.y);

            _pivot = Vector3.SmoothDamp(_pivot, _pivotTarget, ref _pivotVel, _smoothTime);
            _yaw = Mathf.SmoothDampAngle(_yaw, _yawTarget, ref _yawVel, 0.14f);
            _pitch = Mathf.SmoothDamp(_pitch, _pitchTarget, ref _pitchVel, 0.14f);
            _dist = Mathf.SmoothDamp(_dist, _distTarget, ref _distVel, 0.22f);

            ApplyTransform();
        }

        private void ApplyTransform()
        {
            var rot = Quaternion.Euler(_pitch, _yaw, 0f);
            transform.SetPositionAndRotation(_pivot - rot * Vector3.forward * _dist, rot);
        }
    }
}
