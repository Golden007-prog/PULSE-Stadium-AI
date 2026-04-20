# Accessibility

PULSE ships accessibility as a first-class requirement. The Fan PWA is the primary surface because it's what an actual stadium-goer uses one-handed on a phone; the ops console comes next. Both target **WCAG 2.1 AA** with explicit design decisions documented here.

## Target standards

- **WCAG 2.1 Level AA** across both the ops console (desktop) and the Fan PWA (mobile).
- **Google Android / iOS platform conventions** for gestures, viewports, and pinch-zoom.
- **Voice-first** design (Web Speech API) on the Fan PWA — primary interaction for users who can't comfortably read a screen in a crowded stadium.

## Shared primitives (both apps)

### Keyboard + screen-reader entry

- **Skip-nav link** is the first tab stop on both apps ([fan-pwa/layout.tsx](../apps/fan-pwa/src/app/layout.tsx), [frontend/layout.tsx](../apps/frontend/src/app/layout.tsx)). Matches WCAG 2.4.1 "Bypass Blocks".
- `<main id="main" tabIndex={-1}>` is the skip-nav target on both apps so focus moves cleanly past the site-wide chrome.
- `:focus-visible { outline: 2px solid #00E5FF; outline-offset: 2px }` site-wide (`globals.css` in each app). Matches WCAG 2.4.7 "Focus Visible".
- `focus-visible:ring-2 focus-visible:ring-accent-cyan` Tailwind class applied to every interactive button.

### Semantic structure

- Landmarks: `role="banner"` on headers, `role="contentinfo"` on footers, `role="main"` implicit via `<main>` tag. Matches WCAG 1.3.1 "Info and Relationships".
- Every page has exactly one `<h1>`.
- Lists rendered as `<ul>` / `<ol>` with `list-none` styling when visual markers are replaced by custom indicators.
- Descriptive `aria-label` on every non-trivial landmark, region, and interactive control.

### Live regions

- `role="status" aria-live="polite" aria-atomic="true"` on:
  - Fan PWA Concierge's latest reply (invisible mirror + visible chat bubble both announce).
  - Fan PWA Queues screen's shortest-wait summary.
  - Ops console's agent-trace panel (announces the latest invocation chain + summary).
  - Ops console's counter tallies ("12 zones · 8 interventions…").
- `role="alert"` (assertive) on the landing page's error banner when `/api/scenario/start` fails.

### Reduced motion

- `@media (prefers-reduced-motion: reduce)` in both apps' `globals.css`:
  - All animations collapse to `0.001ms` (pulse dots, bubble-in, trace-enter).
  - Scroll-behaviour resets to `auto`.
  - The pulse-dot becomes a static 0.8-opacity dot so state is still visually conveyed without motion.

### Colour + contrast

- Primary scale is obsidian `#0A0D14` as background, ink `#E1E2EC` as text. 14.9:1 contrast — passes AAA for normal and large text.
- Cyan accent `#00E5FF` on obsidian = **7.25:1**. Passes AA (normal), AAA (large).
- Warning red `#FF5252` on obsidian = **4.9:1**. Passes AA (normal).
- Success green `#3DDC84` on obsidian = **8.2:1**. Passes AAA.
- Never relies on colour alone — status information is always paired with a label (e.g. the queue level chip reads "fast / busy / avoid" in text, not just a colour bar).

### Pinch-zoom

- `maximumScale` and `userScalable` are **intentionally not set** in either app's `<meta name="viewport">`. WCAG 1.4.4 "Resize text" requires that zoom not be blocked. An earlier Fan PWA draft locked scale; that was explicitly reverted in Step 5.

## Fan PWA specifics

- **Voice concierge as primary interaction.** The "Ask" tab foregrounds a large microphone button. Tap-to-record uses the browser's `SpeechRecognition` API; responses are spoken back via `speechSynthesis`. This is the single most impactful a11y feature — fans don't need to read a phone screen to use PULSE.
- **Dialog role for onboarding.** `role="dialog" aria-modal="true"` with `aria-labelledby="onboarding-title"` + `aria-describedby="onboarding-subtitle"`. Inputs have `<label htmlFor>`, `aria-required`, and an `aria-describedby` hint for the seat format.
- **Tab bar as a real tablist.** `role="tablist"` with per-button `role="tab"`, `aria-selected`, `aria-pressed`. Icons are `aria-hidden`; labels carry the semantics.
- **Chat bubbles** are a `<section aria-label="Conversation…">` and the newest Concierge reply is mirrored into an `sr-only` live region so screen readers announce it without stealing focus from the input.
- **Queue list** is a proper `<ul>` with per-row `aria-label` that reads as "Gate 4 Bar, fast — 90 seconds wait". The large numeric pill is marked `aria-hidden` because its value is already in the row label.

## Ops console specifics

- **Live-region on the trace panel** — every new agent invocation is announced once, briefly, in a `role="status"` mirror. Chain is rendered as "orchestrator then care then flow then revenue" so the spoken form reads naturally.
- **Region landmarks on each twin** — reality and counterfactual are wrapped in `<div role="region" aria-label="…">` so a screen reader can tab through them independently.
- **Playback footer is a `role="contentinfo"`** with `aria-live="polite"` on the status messages ("scenario restarted", "budget paused") so ops staff on an assistive device hear state changes.
- **Decorative SVGs** (scan-line gradients, ambient radial backgrounds) are marked `aria-hidden="true"`.
- **3D twin is visual-only.** Keyboard users get the same information through the textual trace panel, the zone counter, and the delta metrics strip. No keyboard interactions depend on clicking the 3D scene.

## Known gaps

- The React Three Fiber 3D twin has no keyboard equivalent for camera rotation. Orbit is a mouse gesture only. Screen-reader users get the textual stream instead.
- **Colour-blindness test** was eyeball-checked using Chrome DevTools' "Emulate colour vision deficiencies" — protanopia, deuteranopia, tritanopia. The green / amber / red ramp is distinguishable in all three because luminance also scales (darker = safer).
- Voice recognition quality on Android Firefox is unreliable. Shipping Gemini Live WebSocket voice (deferred post-hackathon) would remove the dependency on browser-native SpeechRecognition.

## Test procedure

1. **Keyboard-only pass.** Open https://pulse-frontend-524510164011.asia-south1.run.app, tab through every interactive element without touching the mouse, confirm skip-nav appears on first Tab, confirm all buttons trigger with Enter / Space, confirm focus ring is visible on every focus.
2. **Screen reader pass.** Start VoiceOver (macOS) or NVDA (Windows), navigate the ops console, confirm: (a) landmark regions announce, (b) the trace panel announces new invocations within a few seconds, (c) the delta metrics strip reads naturally.
3. **Reduced motion pass.** Enable "Reduce motion" in the OS. Reload. Confirm the pulsing dots are static and the trace-enter animation is off.
4. **Zoom pass.** Press `Ctrl/Cmd +` to zoom to 200%. Confirm layout doesn't break and content reflows (no horizontal scroll required for the text body).
5. **Contrast pass.** Run Chrome DevTools "Lighthouse → Accessibility" audit on `/` and `/ops`. Target score ≥ 95.
