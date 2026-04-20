"""One-shot JSDoc injector for PULSE TypeScript/TSX files.

Adds a `/** … */` preface to exported functions/components that lack one.
Uses a curated mapping keyed by `(posix_relpath, name)` so every entry is
hand-written; unknown names fall back to a name-derived default.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOCS: dict[tuple[str, str], str] = {
    # frontend/app
    ("apps/frontend/src/app/layout.tsx", "RootLayout"): "Root HTML layout for the ops console; applies global fonts and CSS.",
    ("apps/frontend/src/app/page.tsx", "Landing"): "Landing page; redirects to /ops after autoplay warmup completes.",
    ("apps/frontend/src/app/ops/page.tsx", "OpsPageWrap"): "Ops page wrapper; fetches initial venue state on the server and hydrates the client twin.",
    # frontend/components
    ("apps/frontend/src/components/AgentRoster.tsx", "AgentRoster"): "Displays the six specialist agents with live status dots driven by recent trace activity.",
    ("apps/frontend/src/components/AutoPlayBanner.tsx", "AutoPlayBanner"): "Shows the scripted-scenario banner with current act and countdown during autoplay.",
    ("apps/frontend/src/components/CfToggle.tsx", "CfToggle"): "Counterfactual split-screen toggle; starts/stops the what-if ABS simulation.",
    ("apps/frontend/src/components/InterventionCard.tsx", "InterventionsStrip"): "Horizontal strip of the latest interventions with agent-colored badges.",
    ("apps/frontend/src/components/MatchTicker.tsx", "MatchTicker"): "Live match score + clock ticker pulled from the scripted scenario state.",
    ("apps/frontend/src/components/MetricsCard.tsx", "MetricsCard"): "Single KPI card used for venue density, queues, revenue, and safety metrics.",
    ("apps/frontend/src/components/PlaybackControls.tsx", "PlaybackControls"): "Play/pause/restart controls for the deterministic scripted scenario.",
    ("apps/frontend/src/components/Twin3D.tsx", "Twin3D"): "React-Three-Fiber 3D digital twin of Chinnaswamy stadium with per-zone density shading.",
    ("apps/frontend/src/components/ZoneMesh.tsx", "ZoneMesh"): "Single extruded zone mesh; color reflects live density, height encodes queue length.",
    # frontend/lib
    ("apps/frontend/src/lib/colors.ts", "agentColor"): "Map an agent id (flow/care/revenue/...) to its brand-consistent hex color.",
    ("apps/frontend/src/lib/firebase-client.ts", "clientApp"): "Lazy-init singleton Firebase client app using public config from env.",
    ("apps/frontend/src/lib/firebase-client.ts", "clientDb"): "Return the client-side Firestore instance for onSnapshot listeners.",
    ("apps/frontend/src/lib/firestore-admin.ts", "getDb"): "Return the admin Firestore handle; boots firebase-admin on first call.",
    ("apps/frontend/src/lib/firestore-admin.ts", "toPlain"): "Deep-convert Firestore Timestamp/DocumentReference values to JSON-safe primitives.",
    # frontend/api
    ("apps/frontend/src/app/api/orchestrator/route.ts", "GET"): "Proxy a tick-trigger call to the orchestrator Cloud Run service.",
    ("apps/frontend/src/app/api/state/route.ts", "GET"): "Return the current venue snapshot read straight from admin Firestore.",
    ("apps/frontend/src/app/api/traces/route.ts", "GET"): "Return the N most recent agent traces for the trace panel.",
    ("apps/frontend/src/app/api/cf/start/route.ts", "POST"): "Start the counterfactual ABS simulation for the current incident window.",
    ("apps/frontend/src/app/api/cf/stop/route.ts", "POST"): "Stop the running counterfactual ABS simulation and persist its summary.",
    ("apps/frontend/src/app/api/sim/reset/route.ts", "POST"): "Reset the scripted scenario simulator back to tick zero.",
    # fan-pwa/app
    ("apps/fan-pwa/src/app/layout.tsx", "RootLayout"): "Root HTML layout for the fan PWA; registers the service worker manifest.",
    ("apps/fan-pwa/src/app/manifest.ts", "manifest"): "Return the PWA web-app manifest served at /manifest.webmanifest.",
    ("apps/fan-pwa/src/app/page.tsx", "FanPwaHome"): "Tabbed shell that routes between Match, Queues, Wayfind, Nudges, and Concierge screens.",
    # fan-pwa/components
    ("apps/fan-pwa/src/components/ConciergeScreen.tsx", "ConciergeScreen"): "Voice-first concierge; captures speech, proxies to the orchestrator, and speaks the reply.",
    ("apps/fan-pwa/src/components/MatchScreen.tsx", "MatchScreen"): "Live match score, over, and striker info pulled from the scripted scenario feed.",
    ("apps/fan-pwa/src/components/NudgesScreen.tsx", "NudgesScreen"): "Shows revenue-agent nudges (offers, redirects) the fan is currently eligible for.",
    ("apps/fan-pwa/src/components/Onboarding.tsx", "Onboarding"): "First-launch onboarding carousel; captures seat block + language preference.",
    ("apps/fan-pwa/src/components/QueuesScreen.tsx", "QueuesScreen"): "Live queue ETA board with suggested reroutes from the Queue agent.",
    ("apps/fan-pwa/src/components/TabBar.tsx", "TabBar"): "Bottom navigation tab bar for the fan PWA; a11y-labelled for screen readers.",
    # fan-pwa/lib
    ("apps/fan-pwa/src/lib/cloud-run.ts", "invokeCloudRun"): "Thin fetch wrapper that calls an authenticated Cloud Run endpoint with JSON body.",
    ("apps/fan-pwa/src/lib/speech.ts", "supportsSpeechRecognition"): "True when the current browser supports the Web Speech recognition API.",
    ("apps/fan-pwa/src/lib/speech.ts", "supportsSpeechSynthesis"): "True when the current browser supports the Web Speech synthesis API.",
    ("apps/fan-pwa/src/lib/speech.ts", "createRecognition"): "Construct a configured SpeechRecognition instance for the given locale.",
    ("apps/fan-pwa/src/lib/speech.ts", "speak"): "Speak the provided text using the browser's synthesis engine (best-effort).",
    # fan-pwa/api
    ("apps/fan-pwa/src/app/api/concierge/route.ts", "POST"): "Forward a fan concierge query to the orchestrator and stream the reply back.",
    ("apps/fan-pwa/src/app/api/match/route.ts", "GET"): "Return the scripted scenario's current match score and clock.",
    ("apps/fan-pwa/src/app/api/queues/route.ts", "GET"): "Return live queue ETAs and suggested reroutes for the fan PWA.",
}


def default_doc(name: str) -> str:
    """Fallback JSDoc text derived from the identifier name."""
    readable = re.sub(r"([a-z])([A-Z])", r"\1 \2", name).lower()
    return f"{readable[:1].upper()}{readable[1:]}."


def make_jsdoc(indent: str, text: str) -> str:
    """Return a single-line JSDoc block with the given indent."""
    return f"{indent}/** {text} */\n"


def already_has_jsdoc(lines: list[str], idx: int) -> bool:
    """Return True when the line before idx already contains JSDoc."""
    if idx <= 0:
        return False
    prior = lines[idx - 1].strip()
    if prior.endswith("*/"):
        return True
    # Multi-line: walk up past inline comments
    return prior.startswith("/**") or prior.startswith("*")


EXPORT_RE = re.compile(
    r"^(\s*)export\s+(?:default\s+)?(?:async\s+)?"
    r"(?:function\s+(\w+)|const\s+(\w+))",
)


def inject(path: Path) -> int:
    """Insert missing JSDoc headers above exported functions in the file."""
    src = path.read_text(encoding="utf-8")
    lines = src.split("\n")
    # We need to re-add newlines on write.
    insertions: list[tuple[int, str]] = []

    for i, line in enumerate(lines):
        m = EXPORT_RE.match(line)
        if not m:
            continue
        name = m.group(2) or m.group(3)
        if not name:
            continue
        # Also guard: const Name must look like a function
        stripped = line.lstrip()
        if stripped.startswith("export const ") and not any(
            s in line for s in ("=>", "= (", "= function", "=function")
        ):
            continue
        if already_has_jsdoc(lines, i):
            continue
        indent = m.group(1)
        rel = path.relative_to(ROOT).as_posix()
        text = DOCS.get((rel, name)) or default_doc(name)
        insertions.append((i, make_jsdoc(indent, text)))

    if not insertions:
        return 0

    for idx, text in sorted(insertions, key=lambda x: -x[0]):
        # text already ends with \n; we're splicing into a list-of-lines without
        # trailing newlines, so strip trailing \n for insert.
        lines.insert(idx, text.rstrip("\n"))

    path.write_text("\n".join(lines), encoding="utf-8")
    return len(insertions)


def main() -> None:
    """Entry point — walk the frontend + fan-pwa src trees and inject JSDocs."""
    roots = [ROOT / "apps/frontend/src", ROOT / "apps/fan-pwa/src"]
    total = 0
    for base in roots:
        for p in base.rglob("*"):
            if p.suffix not in (".ts", ".tsx"):
                continue
            if "__tests__" in p.parts or ".test." in p.name or p.name == "setup.ts":
                continue
            n = inject(p)
            if n:
                print(f"{p.relative_to(ROOT).as_posix()}: +{n}")
                total += n
    print(f"Total inserted: {total}")


if __name__ == "__main__":
    main()
