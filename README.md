# napkiln

**Speak an idea. We'll help you see its shape.**

napkiln listens while you think out loud and quietly builds the *structure* of
your thought — problems, opportunities, constraints, open questions — then lets
you review it, save it, and watch it find its place among everything else
you've captured.

A **React + Vite mobile web prototype** implementing **10a** from the napkiln
Explorations design doc: *the whole app, one working prototype*.

```
capture (6a) → recording (5a, live AI) → review (7a) → saved
                                              ↓
                         Space (9b → 9d preview)   Library (8e folders / 8d recents)
```

## Running it

```bash
npm install
npm run dev        # vite dev server
npm run build      # production build to dist/
npm run preview    # serve the production build
```

On phones the app runs full-bleed; on desktop it renders inside an
iPhone-style frame. Appending `?demo` to the URL feeds the exploration's
scripted 5a transcript through the live pipeline — useful for demos without
talking.

## The AI behind it

Recording is genuinely live: speech (or typing) feeds a rolling transcript
into a structurer that builds the thought graph in real time.

**Transcription** (pick in the AI settings sheet — tap the status pill while
recording):

- **Browser speech** — the Web Speech API (`src/lib/speech.js`); fast, but
  audio goes to the browser vendor's speech service.
- **Local Whisper** — `whisper-tiny.en` running fully in the browser via
  transformers.js (`src/lib/whisper.js`), WebGPU with WASM fallback. Mic PCM
  is captured with `MediaStreamTrackProcessor` (AudioWorklet fallback), split
  at pauses by energy segmentation, and transcribed on-device. The ~40 MB
  model downloads once and is cached; audio never leaves the device.

**Structuring** (`src/lib/structurer.js`), two engines behind one interface:

- **On-device heuristic** (default, zero setup) — segments the transcript on
  discourse markers and classifies each clause into PROBLEM / CONTEXT /
  OPPORTUNITY / IDEA / CONSTRAINT / OPEN QUESTION, with labeled connections
  ("led to", "but", "raises", "so") between consecutive boxes.
- **Claude** — paste an Anthropic API key in the AI settings sheet (stored in
  `localStorage` only) and the transcript is structured by `claude-opus-4-8`
  using the API's structured-output JSON schema, called directly from the
  browser. Any failure falls back to the heuristic, so the graph never stalls.

The structure template chosen on the capture screen (problem→solution,
sequence, …) is passed to the engine as a shaping hint.

## What you can do

- **Onboard** — a three-step intro (skippable), then microphone priming.
- **Capture** — pick a structure template, then tap the orb to record (or
  "type instead").
- **Record** — watch the structure assemble live; pause, discard, or tap the
  status pill for AI settings.
- **Review** — the finished thought graph; hold a box to edit / re-record /
  delete it, name the thought, file it under a folder, then **Save**.
- **Space** — a pannable, zoomable constellation of every thought; tap a line
  to see *why* two thoughts connect, long-press a node to edit or delete it,
  saved thoughts flash into place.
- **Library** — folders (long-press to rename/delete, add new) and recents
  grouped by day. Tap any thought to open its preview graph.

## Structure

| Path | Role |
| --- | --- |
| `src/App.jsx` | Shell: screen routing with slide transitions, tab bar, thought/folder store. |
| `src/screens/Onboarding.jsx` | Three-step intro. |
| `src/screens/Capture.jsx` | Resting capture screen with the structure-template picker. |
| `src/screens/Record.jsx` | Live recording: capture engines → structurer → building graph; AI settings sheet. |
| `src/screens/Review.jsx` | Review / saved / preview stages of the thought graph. |
| `src/screens/Space.jsx` | The constellation: pan, zoom, connection popups, node editing. |
| `src/screens/Library.jsx` | Folders + recents + folder detail. |
| `src/lib/structurer.js` | Auto-structuring engines (heuristic + Claude structured output). |
| `src/lib/speech.js` | Web Speech API wrapper. |
| `src/lib/whisper.js` | In-browser Whisper transcription + capture engine selection. |
| `src/theme.js` | The napkiln visual system (colors, type, shared style helpers). |
