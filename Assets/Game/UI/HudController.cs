using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace PortGame
{
    /// <summary>
    /// Minimal persistent HUD, built entirely in code: money (with count-up),
    /// day/clock, transient center banner, reward toast, controls hint.
    /// Everything else the world itself communicates.
    /// </summary>
    public class HudController : MonoBehaviour
    {
        private static readonly Color PanelColor = new Color(0.09f, 0.1f, 0.12f, 0.62f);
        private static readonly Color TextWarm = Palette.Hex("#F5F1E8");
        private static readonly Color TextDim = new Color(0.96f, 0.94f, 0.91f, 0.55f);

        private Font _font;
        private Text _moneyText;
        private Text _clockText;
        private Text _bannerText;
        private CanvasGroup _bannerGroup;
        private Text _toastText;
        private CanvasGroup _toastGroup;
        private RectTransform _toastRect;

        private Text _scheduleText;
        private Text _cardTitle;
        private Text _cardBody;
        private CanvasGroup _cardGroup;

        private DayNightCycle _dayNight;
        private long _moneyActual;
        private double _moneyShown;
        private Coroutine _bannerRoutine;
        private Coroutine _toastRoutine;

        private FocusTarget _focusTarget;
        private IFocusInfo _focusInfo;
        private float _cardRefreshAt;

        public static HudController Build(Transform parent, DayNightCycle dayNight,
            EconomyManager economy, CameraRig cameraRig)
        {
            var go = new GameObject("HUD");
            go.transform.SetParent(parent, false);
            var hud = go.AddComponent<HudController>();
            hud._dayNight = dayNight;
            hud.BuildUi();

            hud._moneyActual = economy.Balance;
            hud._moneyShown = economy.Balance;
            economy.OnChanged += balance => hud._moneyActual = balance;
            economy.OnToast += hud.Toast;
            cameraRig.FocusChanged += hud.OnFocusChanged;
            return hud;
        }

        private void OnFocusChanged(FocusTarget target)
        {
            _focusTarget = target;
            _focusInfo = target != null ? target.GetComponent<IFocusInfo>() : null;
            _cardRefreshAt = 0f;
        }

        private void BuildUi()
        {
            _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

            var canvasGo = new GameObject("Canvas");
            canvasGo.transform.SetParent(transform, false);
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            // Money — top left.
            var moneyPanel = Panel(canvasGo.transform, new Vector2(0f, 1f), new Vector2(30f, -30f), new Vector2(320f, 68f));
            _moneyText = Label(moneyPanel, "KD 0", 34, TextAnchor.MiddleLeft, TextWarm, FontStyle.Bold);
            Pad(_moneyText.rectTransform, 22f, 0f);

            // Clock — top right, with the inbound-ship schedule line beneath it.
            var clockPanel = Panel(canvasGo.transform, new Vector2(1f, 1f), new Vector2(-30f, -30f), new Vector2(300f, 56f));
            _clockText = Label(clockPanel, "", 26, TextAnchor.MiddleCenter, TextWarm, FontStyle.Normal);

            var scheduleGo = new GameObject("Schedule");
            scheduleGo.transform.SetParent(canvasGo.transform, false);
            var scheduleRect = scheduleGo.AddComponent<RectTransform>();
            SetAnchored(scheduleRect, new Vector2(1f, 1f), new Vector2(-30f, -96f), new Vector2(420f, 34f));
            _scheduleText = Label(scheduleRect, "", 20, TextAnchor.MiddleRight, TextDim, FontStyle.Normal);

            // Focus card — bottom right, shown while an object is camera-focused.
            var cardGo = new GameObject("FocusCard");
            cardGo.transform.SetParent(canvasGo.transform, false);
            var cardRect = cardGo.AddComponent<RectTransform>();
            SetAnchored(cardRect, new Vector2(1f, 0f), new Vector2(-30f, 30f), new Vector2(440f, 190f));
            _cardGroup = cardGo.AddComponent<CanvasGroup>();
            _cardGroup.alpha = 0f;
            var cardBg = cardGo.AddComponent<Image>();
            cardBg.color = PanelColor;
            cardBg.raycastTarget = false;

            var titleGo = new GameObject("CardTitle");
            titleGo.transform.SetParent(cardGo.transform, false);
            var titleRect = titleGo.AddComponent<RectTransform>();
            SetAnchored(titleRect, new Vector2(0.5f, 1f), new Vector2(0f, -16f), new Vector2(400f, 36f));
            _cardTitle = Label(titleRect, "", 28, TextAnchor.UpperLeft, TextWarm, FontStyle.Bold);

            var bodyGo = new GameObject("CardBody");
            bodyGo.transform.SetParent(cardGo.transform, false);
            var bodyRect = bodyGo.AddComponent<RectTransform>();
            SetAnchored(bodyRect, new Vector2(0.5f, 1f), new Vector2(0f, -58f), new Vector2(400f, 120f));
            _cardBody = Label(bodyRect, "", 21, TextAnchor.UpperLeft, TextDim, FontStyle.Normal);

            // Banner — center top, transient.
            var bannerGo = new GameObject("Banner");
            bannerGo.transform.SetParent(canvasGo.transform, false);
            var bannerRect = bannerGo.AddComponent<RectTransform>();
            SetAnchored(bannerRect, new Vector2(0.5f, 1f), new Vector2(0f, -110f), new Vector2(900f, 62f));
            _bannerGroup = bannerGo.AddComponent<CanvasGroup>();
            _bannerGroup.alpha = 0f;
            var bannerBg = bannerGo.AddComponent<Image>();
            bannerBg.color = PanelColor;
            _bannerText = Label(bannerRect, "", 30, TextAnchor.MiddleCenter, TextWarm, FontStyle.Bold);

            // Toast — lower center, transient.
            var toastGo = new GameObject("Toast");
            toastGo.transform.SetParent(canvasGo.transform, false);
            _toastRect = toastGo.AddComponent<RectTransform>();
            SetAnchored(_toastRect, new Vector2(0.5f, 0f), new Vector2(0f, 150f), new Vector2(760f, 50f));
            _toastGroup = toastGo.AddComponent<CanvasGroup>();
            _toastGroup.alpha = 0f;
            _toastText = Label(_toastRect, "", 26, TextAnchor.MiddleCenter,
                Palette.Hex("#BFE3B4"), FontStyle.Bold);

            // Controls hint — bottom left.
            var hintGo = new GameObject("Hint");
            hintGo.transform.SetParent(canvasGo.transform, false);
            var hintRect = hintGo.AddComponent<RectTransform>();
            SetAnchored(hintRect, new Vector2(0f, 0f), new Vector2(30f, 26f), new Vector2(880f, 40f));
            var hint = Label(hintRect, "Drag to pan  ·  Right-drag / twist to rotate  ·  Scroll / pinch to zoom  ·  Tap ships, cranes, trucks to focus",
                18, TextAnchor.MiddleLeft, TextDim, FontStyle.Normal);
            hint.raycastTarget = false;
        }

        // ---- Public API --------------------------------------------------

        public void Banner(string message, float holdSeconds = 3.6f)
        {
            if (_bannerRoutine != null) StopCoroutine(_bannerRoutine);
            _bannerRoutine = StartCoroutine(BannerRoutine(message, holdSeconds));
        }

        public void Toast(string message)
        {
            if (_toastRoutine != null) StopCoroutine(_toastRoutine);
            _toastRoutine = StartCoroutine(ToastRoutine(message));
        }

        /// <summary>Inbound-ship line under the clock; empty string hides it.</summary>
        public void SetScheduleText(string text)
        {
            _scheduleText.text = text;
        }

        // ---- Internals ---------------------------------------------------

        private void Update()
        {
            // Money count-up: exponential approach, snapping when close.
            double diff = _moneyActual - _moneyShown;
            if (System.Math.Abs(diff) > 0.5)
                _moneyShown += diff * Mathf.Clamp01(Time.deltaTime * 4f);
            else
                _moneyShown = _moneyActual;
            _moneyText.text = string.Format("KD {0:N0}", (long)System.Math.Round(_moneyShown));

            if (_dayNight != null) _clockText.text = _dayNight.ClockText;

            UpdateFocusCard();
        }

        private void UpdateFocusCard()
        {
            // The target may have been destroyed (a departed ship) — drop it.
            bool show = _focusTarget != null && _focusInfo != null;
            if (!show && _focusInfo != null)
            {
                _focusTarget = null;
                _focusInfo = null;
            }

            float targetAlpha = show ? 1f : 0f;
            _cardGroup.alpha = Mathf.MoveTowards(_cardGroup.alpha, targetAlpha, Time.deltaTime * 5f);

            if (show && Time.unscaledTime >= _cardRefreshAt)
            {
                _cardRefreshAt = Time.unscaledTime + 0.25f;
                _cardTitle.text = _focusInfo.FocusTitle;
                _cardBody.text = _focusInfo.FocusBody;
            }
        }

        private IEnumerator BannerRoutine(string message, float hold)
        {
            _bannerText.text = message;
            yield return Ease.Animate(0.3f, t => _bannerGroup.alpha = t, Ease.OutCubic);
            yield return new WaitForSeconds(hold);
            yield return Ease.Animate(0.5f, t => _bannerGroup.alpha = 1f - t);
            _bannerRoutine = null;
        }

        private IEnumerator ToastRoutine(string message)
        {
            _toastText.text = message;
            Vector2 basePos = new Vector2(0f, 150f);
            yield return Ease.Animate(0.35f, t =>
            {
                _toastGroup.alpha = t;
                _toastRect.anchoredPosition = basePos + new Vector2(0f, t * 24f);
            }, Ease.OutCubic);
            yield return new WaitForSeconds(1.7f);
            yield return Ease.Animate(0.5f, t =>
            {
                _toastGroup.alpha = 1f - t;
                _toastRect.anchoredPosition = basePos + new Vector2(0f, 24f + t * 20f);
            });
            _toastRoutine = null;
        }

        // ---- uGUI helpers ------------------------------------------------

        private RectTransform Panel(Transform parent, Vector2 anchor, Vector2 offset, Vector2 size)
        {
            var go = new GameObject("Panel");
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            SetAnchored(rect, anchor, offset, size);
            var img = go.AddComponent<Image>();
            img.color = PanelColor;
            img.raycastTarget = false;
            return rect;
        }

        private Text Label(RectTransform parent, string content, int size, TextAnchor align,
            Color color, FontStyle style)
        {
            var go = new GameObject("Label");
            go.transform.SetParent(parent, false);
            var rect = go.AddComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;
            var text = go.AddComponent<Text>();
            text.font = _font;
            text.text = content;
            text.fontSize = size;
            text.fontStyle = style;
            text.alignment = align;
            text.color = color;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.55f);
            shadow.effectDistance = new Vector2(1.5f, -1.5f);
            return text;
        }

        private static void SetAnchored(RectTransform rect, Vector2 anchor, Vector2 offset, Vector2 size)
        {
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = offset;
            rect.sizeDelta = size;
        }

        private static void Pad(RectTransform rect, float left, float right)
        {
            rect.offsetMin = new Vector2(left, rect.offsetMin.y);
            rect.offsetMax = new Vector2(-right, rect.offsetMax.y);
        }
    }
}
