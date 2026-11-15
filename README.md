# ASTRA: AI space health assistant (NASA Space Apps 2026 prototype)

Starts at day one with no data. Log readings, chat or talk to ASTRA, and point at a body region with your webcam.

## Run
1. Install Node.js LTS.
2. `npm install`
3. (Optional AI) copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`. Without it, ASTRA uses clearly labelled scripted replies.
4. `npm run dev` and open http://localhost:5173 in Chrome.

## Test order
Greeting, empty states, log a value, Trends (needs 3 entries), chat, camera pointing (stand 2 to 3 m back, full body in view, allow camera), emergency panel, Settings > load demo, wipe data.

## Demo scenario
Settings > Load simulated demo mission > Body Systems > left thigh > review muscle, bone, urinary calcium > Trends flags > Ask ASTRA about this > Recommendations.

## Limits
Data is stored unencrypted in the browser (localStorage). No authentication. No reference ranges are bundled: add them only from cited sources. Predictions are Planned. Emergency panel does not contact anyone. Pointing is approximate and not diagnostic. Demo data is fictional. See the in-app Status and Sources pages.

## Third-party
React, Vite, Recharts, Express, MediaPipe Tasks Vision (Apache 2.0). Pose and hand models from Google MediaPipe public model storage. Body illustration is original SVG.

## Natural AI conversation (recommended)
Without a key ASTRA uses short built-in replies (Basic mode). For natural conversation, create a file named `.env` next to package.json with ONE line:
`ANTHROPIC_API_KEY=your-key-here`  (or `OPENAI_API_KEY=your-key-here`, optionally `OPENAI_MODEL=...`)
Restart `npm run dev`. The terminal should print "AI: anthropic" or "AI: openai". API keys are billed per use and are separate from a chat subscription. Never share or commit your key.

## Languages
ASTRA AI answers in English or French, matching the language of your message. Use the EN/FR selector next to Speak so voice input listens in the right language.
