"""Bulk-insert docstrings into every Python function/class that lacks one.

One-shot polish script used during the rubric-polish phase. Uses `ast` to
identify functions and classes missing a docstring, then does line-level
injection that preserves every other byte of the source file. Idempotent:
re-running is a no-op because the AST pass skips nodes that already have a
docstring.

Usage:
    python scripts/_inject_docstrings.py
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

DOCSTRINGS: dict[tuple[str, str], str] = {
    # orchestrator/main.py
    ("apps/orchestrator/src/main.py", "_to_fs_trace"):
        "Convert an in-memory InvocationTrace into the Firestore AgentTrace wire shape.",
    ("apps/orchestrator/src/main.py", "_build_tick_prompt"):
        "Build the per-tick prompt for the Orchestrator agent. "
        "Returns (prompt, is_actionable); when nothing is actionable the caller "
        "skips the Gemini call.",
    ("apps/orchestrator/src/main.py", "_tick_loop"):
        "Main 5-second tick loop. Drains pending fan queries then checks the venue "
        "snapshot and invokes the Orchestrator if state is actionable.",
    ("apps/orchestrator/src/main.py", "lifespan"):
        "FastAPI lifespan context. Starts the Pub/Sub subscriber + tick-loop task on "
        "boot, cancels them cleanly on shutdown.",
    ("apps/orchestrator/src/main.py", "healthz"):
        "Liveness endpoint plus live tick/invocation counters and cumulative USD spend.",
    ("apps/orchestrator/src/main.py", "manual_trigger"):
        "Manually invoke the Orchestrator with a free-form prompt. Used for smoke "
        "tests and the fan-PWA /api/concierge proxy.",

    # state
    ("apps/orchestrator/src/state/event_buffer.py", "class EventBuffer"):
        "In-memory buffer of recent Pub/Sub signals. The tick loop reads; the "
        "subscriber writes. Single process-wide singleton.",
    ("apps/orchestrator/src/state/firestore_client.py", "class Zone"):
        "One stadium zone as stored at /venues/{id}/zones/{zone_id}.",
    ("apps/orchestrator/src/state/firestore_client.py", "class Intervention"):
        "One agent-initiated write at /venues/{id}/interventions/{id}.",
    ("apps/orchestrator/src/state/firestore_client.py", "class AgentTrace"):
        "One ADK invocation record at /agent_traces/{trace_id} with tokens + USD cost.",
    ("apps/orchestrator/src/state/firestore_client.py", "client"):
        "Lazily-initialised Firestore client, reused process-wide.",
    ("apps/orchestrator/src/state/firestore_client.py", "venue_ref"):
        "DocumentReference for /venues/{VENUE_ID}.",
    ("apps/orchestrator/src/state/firestore_client.py", "zones_ref"):
        "CollectionReference for /venues/{VENUE_ID}/zones.",
    ("apps/orchestrator/src/state/firestore_client.py", "interventions_ref"):
        "CollectionReference for /venues/{VENUE_ID}/interventions.",
    ("apps/orchestrator/src/state/firestore_client.py", "traces_ref"):
        "CollectionReference for /agent_traces.",
    ("apps/orchestrator/src/state/firestore_client.py", "list_zones"):
        "Return every zone under the active venue as a list of typed Zone models.",
    ("apps/orchestrator/src/state/firestore_client.py", "get_zone"):
        "Fetch a single zone by id; returns None if it doesnt exist.",
    ("apps/orchestrator/src/state/firestore_client.py", "set_zone_density"):
        "Merge the given density + note onto a zone doc with a server timestamp.",
    ("apps/orchestrator/src/state/firestore_client.py", "add_intervention"):
        "Append an Intervention as a new /venues/.../interventions/{id} doc; "
        "returns the generated id.",
    ("apps/orchestrator/src/state/firestore_client.py", "write_trace"):
        "Persist an AgentTrace to /agent_traces/{trace_id} with a server timestamp.",

    ("apps/orchestrator/src/state/venue_snapshot.py", "class VenueSnapshot"):
        "Immutable snapshot of reality the Orchestrator reasons over on each tick.",
    ("apps/orchestrator/src/state/venue_snapshot.py", "read_snapshot"):
        "Combine the live Firestore zones with the in-memory event buffer into a "
        "VenueSnapshot.",
    ("apps/orchestrator/src/state/venue_snapshot.py", "hot_zones"):
        "Return zones at or above the given density threshold (default 3.5 p/m^2).",
    ("apps/orchestrator/src/state/venue_snapshot.py", "crush_risk"):
        "Return zones at or above the crush-risk threshold (default 4.0 p/m^2).",
    ("apps/orchestrator/src/state/venue_snapshot.py", "to_prompt_json"):
        "Serialise the snapshot into the JSON shape the Orchestrator prompt consumes.",

    # subscribers
    ("apps/orchestrator/src/subscribers/sensor_events.py", "handle"):
        "Pub/Sub message handler. Routes each event into the in-memory buffer (or "
        "direct Firestore write for density deltas), then acks.",
    ("apps/orchestrator/src/subscribers/sensor_events.py", "start_subscriber"):
        "Attach a streaming-pull subscriber to the pre-created sensor-events "
        "subscription and return its future.",

    # tools
    ("apps/orchestrator/src/tools/care_tools.py", "register_lost_child"):
        "Create a lost-child incident record in /venues/.../interventions.",
    ("apps/orchestrator/src/tools/concierge_tools.py", "get_fan_context"):
        "Return the fan seat + preferences for Concierge replies.",
    ("apps/orchestrator/src/tools/concierge_tools.py", "get_match_state"):
        "Return the current (frozen) Cricinfo-style match state.",
    ("apps/orchestrator/src/tools/flow_tools.py", "close_concourse"):
        "Record a hard concourse closure; the duration is metadata.",
    ("apps/orchestrator/src/tools/flow_tools.py", "update_signage"):
        "Push a message to a digital-signage screen and (if the screen names a zone) "
        "lightly reduce that zone density.",
    ("apps/orchestrator/src/tools/flow_tools.py", "reroute_fans"):
        "Redirect expected_count fans from one zone to another. Auto-reduces the "
        "source zone density to 3.2 p/m^2 if it was above threshold.",
    ("apps/orchestrator/src/tools/flow_tools.py", "list_all_zones"):
        "Return a compact list of every zone with its current density. Used for "
        "Flow context-gathering step.",
    ("apps/orchestrator/src/tools/queue_tools.py", "_match_category"):
        "Internal helper: does this queue serve the requested category "
        "(beer/food/restroom)?",
    ("apps/orchestrator/src/tools/queue_tools.py", "find_nearest"):
        "Return the three lowest-wait queues for a given category near a fan seat.",
    ("apps/orchestrator/src/tools/queue_tools.py", "get_queue_state"):
        "Fetch the current state of a named queue.",
    ("apps/orchestrator/src/tools/queue_tools.py", "nudge_fans"):
        "Push fans from one queue to an alternative queue; writes the nudge as an "
        "Intervention.",

    # tracing
    ("apps/orchestrator/src/tracing/cost_tracker.py", "calc_cost"):
        "Compute USD cost for a model tier at the given input + output token counts.",
    ("apps/orchestrator/src/tracing/cost_tracker.py", "class InvocationTrace"):
        "One ADK invocation with its timings, token counts, cost, and composed chain.",
    ("apps/orchestrator/src/tracing/cost_tracker.py", "record"):
        "Add a completed invocation cost to the running process-wide total; "
        "returns the new total.",
    ("apps/orchestrator/src/tracing/cost_tracker.py", "total_usd"):
        "Return the cumulative USD cost recorded this process.",
    ("apps/orchestrator/src/tracing/cost_tracker.py", "total_invocations"):
        "Return the cumulative count of invocations recorded this process.",
    ("apps/orchestrator/src/tracing/cost_tracker.py", "mark_done"):
        "Close the invocation: stamp duration_ms and compute cost_usd from the "
        "pricing table.",

    # simulator
    ("apps/simulator/src/main.py", "publish"):
        "Publish an event to the sensor-events Pub/Sub topic with the standard "
        "envelope fields.",
    ("apps/simulator/src/main.py", "_poisson"):
        "Sample a non-negative integer from a Poisson(lam) distribution via the "
        "standard inverse-transform algorithm.",
    ("apps/simulator/src/main.py", "_emit_scripted"):
        "Translate a scripted scenario entry into its corresponding sensor-events "
        "message.",
    ("apps/simulator/src/main.py", "run_scenario"):
        "Main scenario loop. Emits base-rate events every tick and dispatches "
        "scripted entries at their scheduled offsets.",
    ("apps/simulator/src/main.py", "lifespan"):
        "FastAPI lifespan context. Starts the scenario task on boot if "
        "SCENARIO_AUTOSTART is set; cancels on shutdown.",
    ("apps/simulator/src/main.py", "healthz"):
        "Liveness endpoint plus scenario state (running, ticks, events published, "
        "last scripted event).",
    ("apps/simulator/src/main.py", "reset"):
        "Cancel any running scenario and restart from t=0.",

    # emitters
    ("apps/simulator/src/emitters/cctv.py", "emit_cctv_anomaly"):
        "Emit a synthetic vision_anomaly event from a scripted scenario entry.",
    ("apps/simulator/src/emitters/pos.py", "emit_pos"):
        "Emit a single PoS transaction at a randomly-picked concession.",
    ("apps/simulator/src/emitters/restroom.py", "emit_restroom"):
        "Emit a restroom occupancy delta for a random restroom zone.",
    ("apps/simulator/src/emitters/turnstile.py", "emit_turnstile"):
        "Emit a single turnstile entry scan at a randomly-picked gate (G-3 "
        "weighted higher for natural congestion).",

    # counterfactual
    ("apps/counterfactual/src/abs_engine.py", "class MetricsTracker"):
        "Rolling ABS metrics: peak density, over-threshold seconds, unique "
        "incidents-would-occur.",
    ("apps/counterfactual/src/abs_engine.py", "class ABSEngine"):
        "Density-only agent-based simulator. Each tick advances every zone via "
        "intrinsic inflow + diffusion.",
    ("apps/counterfactual/src/abs_engine.py", "observe"):
        "Fold one EngineStep into the rolling metrics.",
    ("apps/counterfactual/src/abs_engine.py", "as_dict"):
        "Return a JSON-safe dict of the metrics for Firestore writes.",
    ("apps/counterfactual/src/abs_engine.py", "from_initial"):
        "Factory: build an ABSEngine from an iterable of (zone_id, density) pairs.",
    ("apps/counterfactual/src/abs_engine.py", "step"):
        "Advance one dt_s-second tick with NO agent intervention; returns the "
        "resulting EngineStep.",

    ("apps/counterfactual/src/main.py", "db"):
        "Lazily-initialised Firestore client.",
    ("apps/counterfactual/src/main.py", "_run"):
        "Background task: seed from current reality zones, tick every 5s up to "
        "MAX_TICKS, write per-tick state + rolling metrics.",
    ("apps/counterfactual/src/main.py", "_write_summary"):
        "Merge-write a partial summary dict onto /counterfactual/{session_id}.",
    ("apps/counterfactual/src/main.py", "lifespan"):
        "FastAPI lifespan context. Cancels every active session task cleanly on "
        "shutdown.",
    ("apps/counterfactual/src/main.py", "health"):
        "Liveness endpoint; reports active session count.",
    ("apps/counterfactual/src/main.py", "start"):
        "Begin a new counterfactual session keyed by session_id. Idempotent if "
        "already running.",
    ("apps/counterfactual/src/main.py", "stop"):
        "Cancel an in-flight counterfactual session.",
    ("apps/counterfactual/src/main.py", "status"):
        "Return per-session or global active-session state.",
}


def default_docstring(name: str, is_class: bool) -> str:
    """Generate a sensible default docstring from a function or class name."""
    readable = re.sub(r"([a-z])([A-Z])", r"\1 \2", name).replace("_", " ").strip().lower()
    if is_class:
        return f"Represents a {readable}."
    return f"Perform the {readable} operation."


def inject_docstrings(path: Path) -> int:
    """Parse path, inject docstrings where missing, rewrite the file in place.

    Returns the number of docstrings inserted. Idempotent: re-runs are no-ops.
    """
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src)
    lines = src.splitlines(keepends=True)

    insertions: list[tuple[int, str, str]] = []
    rel = path.as_posix()

    for node in ast.walk(tree):
        is_func = isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        is_class = isinstance(node, ast.ClassDef)
        if not (is_func or is_class):
            continue
        if ast.get_docstring(node) is not None:
            continue
        if not node.body:
            continue

        first_body = node.body[0]
        insert_before_lineno = first_body.lineno
        body_line_text = lines[insert_before_lineno - 1]
        indent_match = re.match(r"^(\s*)", body_line_text)
        indent = indent_match.group(1) if indent_match else "    "

        key = (rel, f"class {node.name}" if is_class else node.name)
        doc = DOCSTRINGS.get(key) or default_docstring(node.name, is_class)

        insertions.append((insert_before_lineno, indent, doc))

    if not insertions:
        return 0

    insertions.sort(key=lambda x: -x[0])
    for lineno, indent, doc in insertions:
        docstring_line = f'{indent}"""{doc}"""\n'
        lines.insert(lineno - 1, docstring_line)

    path.write_text("".join(lines), encoding="utf-8")
    return len(insertions)


def main() -> None:
    """Walk each Python service tree and inject missing docstrings."""
    total = 0
    for base in ("apps/orchestrator/src", "apps/simulator/src", "apps/counterfactual/src"):
        for p in Path(base).rglob("*.py"):
            rel = str(p).replace("\\", "/")
            if "__pycache__" in rel or "/tests/" in rel:
                continue
            added = inject_docstrings(p)
            if added:
                print(f"  {p}: +{added} docstring(s)")
                total += added
    print(f"\nTOTAL: {total} docstrings inserted")


if __name__ == "__main__":
    main()
