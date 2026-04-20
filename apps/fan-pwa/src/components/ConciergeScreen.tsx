"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatTurn, FanProfile } from "@/lib/types";
import {
  createRecognition,
  speak,
  supportsSpeechRecognition,
  supportsSpeechSynthesis,
} from "@/lib/speech";

const SUGGESTIONS = ["beer?", "nearest restroom?", "where's my seat?", "who's batting?"];

export function ConciergeScreen({ fan }: { fan: FanProfile }) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "concierge",
      ts: Date.now(),
      text: `Hi ${fan.display_name.split(" ")[0]} — ask me anything. Try "beer?".`,
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  const [hasTTS, setHasTTS] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<ReturnType<typeof createRecognition>>(null);

  useEffect(() => {
    setHasSpeech(supportsSpeechRecognition());
    setHasTTS(supportsSpeechSynthesis());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function ask(text: string, modality: "voice" | "text") {
    if (!text.trim() || busy) return;
    setInput("");
    const fanTurn: ChatTurn = { role: "fan", text, ts: Date.now() };
    setTurns((t) => [...t, fanTurn]);
    setBusy(true);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fan_id: fan.fan_id,
          seat: fan.seat,
          modality,
          query: text,
        }),
      });
      const j = (await res.json()) as {
        summary?: string;
        chain?: string[];
        cost_usd?: number;
        trace_id?: string;
        error?: string;
      };
      const reply = j.summary?.trim() || j.error || "No reply.";
      const turn: ChatTurn = {
        role: "concierge",
        text: reply,
        ts: Date.now(),
        traceId: j.trace_id,
        chain: j.chain,
        cost: j.cost_usd,
      };
      setTurns((t) => [...t, turn]);
      if (modality === "voice" && hasTTS) speak(reply, fan.language);
    } catch (e) {
      setTurns((t) => [
        ...t,
        { role: "concierge", text: `Network error: ${(e as Error).message}`, ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const r = createRecognition(fan.language);
    if (!r) return;
    recRef.current = r;
    r.onresult = (e) => {
      const heard = e.results[0]?.[0]?.transcript ?? "";
      if (heard) ask(heard, "voice");
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    setRecording(true);
    r.start();
  }

  // The last concierge reply is announced politely to assistive tech via
  // an aria-live="polite" region — screen readers read new replies without
  // stealing focus from the input.
  const lastConciergeReply =
    [...turns].reverse().find((t) => t.role === "concierge")?.text ?? "";

  return (
    <div className="flex flex-col h-full">
      <section
        aria-label="Conversation with the Concierge agent"
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {turns.map((t, i) => (
          <Bubble key={i} turn={t} />
        ))}
        {busy && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Concierge is thinking"
            className="flex items-center gap-2 text-ink-fade text-[12px]"
          >
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan pulse-dot"
            />
            <span className="mono text-[10px] uppercase tracking-wider">
              concierge thinking · orchestrator → concierge → queue
            </span>
          </div>
        )}
        <div ref={endRef} />
      </section>

      {/* Invisible live-region that re-announces the latest Concierge reply. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {lastConciergeReply}
      </div>

      <div
        role="toolbar"
        aria-label="Suggested questions"
        className="px-4 pt-2 pb-0 overflow-x-auto flex gap-2"
      >
        {SUGGESTIONS.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => ask(s, "text")}
            disabled={busy}
            aria-label={`Ask the Concierge: ${s}`}
            className="flex-shrink-0 mono text-[10px] uppercase tracking-wider px-3 py-1.5 bg-surface-low text-ink-mute hover:text-accent-cyan disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:outline-none"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        aria-label="Ask the Concierge"
        className="flex items-center gap-2 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input, "text");
        }}
      >
        <label htmlFor="concierge-input" className="sr-only">
          Your question to the Concierge
        </label>
        <input
          id="concierge-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasSpeech ? "type or tap mic…" : "type a question…"}
          disabled={busy}
          aria-label="Type your question to the Concierge"
          className="flex-1 bg-surface-low px-4 py-3 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan"
        />
        {hasSpeech && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            aria-label={recording ? "Stop voice input" : "Start voice input"}
            aria-pressed={recording}
            className={`w-12 h-12 flex items-center justify-center ${
              recording
                ? "bg-accent-red text-white animate-pulse"
                : "bg-surface-low text-accent-cyan"
            } disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:outline-none`}
          >
            <MicIcon />
          </button>
        )}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send question"
          className="w-12 h-12 flex items-center justify-center bg-accent-cyan text-surface-dim disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:outline-none"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const isFan = turn.role === "fan";
  return (
    <div className={`bubble-in flex ${isFan ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 ${
          isFan
            ? "bg-accent-cyan text-surface-dim"
            : "bg-surface-low text-ink"
        }`}
      >
        <div className="text-[14px] leading-snug">{turn.text}</div>
        {turn.chain && turn.chain.length > 0 && (
          <div className="mono text-[9px] uppercase tracking-wider mt-1 opacity-70">
            {turn.chain.join(" › ")}
            {typeof turn.cost === "number" && ` · $${turn.cost.toFixed(5)}`}
          </div>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
