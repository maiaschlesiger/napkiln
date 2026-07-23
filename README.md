# napkiln

**Speak an idea. We'll help you see its shape.**

napkiln listens while you think out loud and quietly builds the *structure* of
your thought — problems, opportunities, constraints, open questions — then lets
you review it, save it, and watch it find its place among everything else
you've captured.

This repo implements **10a** from the napkiln Explorations design doc: *the
whole app, one working prototype*. It stitches the individual screen
explorations into a single, navigable flow:

```
capture (6a) → recording (5a) → review (7a) → saved
                                     ↓
                    Space (9b → 9d preview)   Library (8e folders / 8d recents)
```

## Running it

It's a static, dependency-free web app. Open `index.html` directly, or serve
the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

An internet connection is only used to pull the Figtree / Newsreader webfonts;
without it the app falls back to the system sans-serif and works the same.

## What you can do

- **Onboard** — a three-step intro (skippable), then microphone priming.
- **Capture** — pick a structure template (free flow, problem→solution,
  sequence, weighing options, around a question), then tap the orb to record.
- **Record** — watch the structure assemble live; toggle it visible/hidden,
  pause, or discard.
- **Review** — see the finished thought graph; hold a box to edit it inline or
  re-record it, then **Save**.
- **Space** — a zoomable constellation of every thought, dots colored by
  folder, lines drawn only between shared phrases; tap a line to see *why* two
  thoughts connect.
- **Library** — toggle between **Folders** (tactile folder cards, long-press to
  rename/delete, add new) and **Recent** (newest-first, grouped by day with
  folder tags). Tap any thought to open its preview graph.

## Structure

| File | Role |
| --- | --- |
| `index.html` | Entry point — iPhone frame, shared fonts/keyframes, mounts `<napkiln-app>`. |
| `app/napkiln-app.js` | App shell: onboarding, tab bar, routing, Library, and screen transitions. |
| `app/capture-start.js` | `<napkiln-capture-start>` — the resting capture screen with the structure picker. |
| `app/graph-edit2.js` | `<napkiln-graph-edit2>` — the review / preview thought graph and save sheet. |
| `app/space-map.js` | `<napkiln-space>` — the zoomable Space constellation and "why these connect" popup. |

Each screen is a self-contained custom element; they coordinate purely through
bubbling `CustomEvent`s (`nk-record`, `nk-saved`, `nk-space`, `nk-open`,
`nk-back`, `nk-new`, `nk-talk`, `nk-sheet`), so no framework or build step is
involved.
