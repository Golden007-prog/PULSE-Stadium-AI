# LinkedIn post — Virtual: PromptWars submission

Paste this into a new LinkedIn post. After publishing, copy the post URL
(`https://www.linkedin.com/posts/<your-handle>_...`) and paste it into the
"LinkedIn Post" field on the submission form.

Tips:
- Post as a plain text update (not an article) — LinkedIn breaks up long
  posts nicely with the "see more" fold after line 3.
- Upload the `docs/hero.png` screenshot as the post image. It's eye-catching
  and the counterfactual split-screen is the demo's punchline.
- The first 3 lines below are the "above-the-fold" hook, so they're written
  to pull a click.

---

## Final post text (≈ 2,100 characters)

Three days ago, "stadium AI" was a slide in my notebook.

Today it's six live Cloud Run services and a 90-second demo where the scariest thing on screen is the side that doesn't happen.

I built PULSE for the Virtual: PromptWars challenge — a multi-agent operating layer for 40,000-seat stadiums, running against a scripted IPL-final timeline.

The motivation is blunt: Itaewon (159 deaths, 2022), Kanjuruhan (135 deaths, 2022), Hillsborough (97 deaths, 1989). None of those happened because the data was missing. They happened because nobody fused the CCTV + IoT + match state + fan signals into action in real time.

The architecture:
→ 1 root Orchestrator (Gemini 2.5 Pro) composing 5 specialist agents — Flow, Queue, Concierge, Care, Revenue — all on Gemini 2.5 Flash.
→ Explicit Invocation via Google ADK's AgentTool pattern. A single medical anomaly invocation calls care → flow → revenue in order and writes 8 interventions to Firestore.
→ 3D digital twin in React Three Fiber with client-side onSnapshot listeners. Sub-500 ms from agent decision to UI.
→ A fan PWA with voice in/out via the Web Speech API. Ask "beer?" and get: "Gate 4 Bar, 90-second queue. Kohli's on strike, you'll make it back for the over. Show me the way →"
→ All six services deployed to Cloud Run in asia-south1.

The killer feature — and the part that changed how I want to build ops tools forever — is a parallel counterfactual simulator that runs alongside reality with every agent action suppressed. The operator sees, side by side, what would have happened had nobody intervened. In the 90-s demo: −47 % avg wait time, −38 % peak density, 7 incidents prevented, +18 % F&B revenue, 195 s medical response.

Three honest 48-hour findings nobody warned me about:
1. Gemini 2.5 Pro is not served in asia-south1 via Vertex AI. You route Vertex to us-central1 and keep Cloud Run local.
2. /healthz is reserved by Google Frontend. Use /health instead.
3. roles/pubsub.subscriber cannot get() a subscription — only consume(). Pre-create in gcloud and skip the get-or-create dance.

Total Vertex AI spend across 48 hours: $0.63. Nine Google services wired: Vertex AI, Cloud Run, Firestore (Native + onSnapshot), Pub/Sub, BigQuery, Cloud Storage, Secret Manager, Cloud Logging, Firebase (Web SDK + FCM).

Live demo — click "Watch the 2026 IPL final →":
https://pulse-frontend-524510164011.asia-south1.run.app

GitHub (public, MIT, 412 KB repo):
https://github.com/Golden007-prog/PULSE-Stadium-AI

If you operate a stadium or large venue, or you study crowd ops, I'd love to hear what I got wrong and what you'd add.

#VirtualPromptWars #GoogleCloud #GoogleADK #Gemini #MultiAgent #CloudRun #GenAI #StadiumOps #IPL #AgenticAI
