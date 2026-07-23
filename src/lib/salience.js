// Salience — cut the fluff from what people say before it becomes boxes.
// Two layers:
//   1. isFluff — always-on patterns for spoken meta-talk that carries no
//      content: mic checks, "where was I", "hold on", filler-only clauses.
//   2. filterUnrelated — under the Neural boost toggle, a sentence-embedding
//      model (sentence-transformers/all-MiniLM-L6-v2 via transformers.js,
//      ~23 MB one-time, fully on-device) scores each clause's semantic
//      relatedness to the rest of the thought and drops clear outliers, so
//      an off-topic aside never becomes a box.
// Both degrade gracefully: any failure keeps every clause.
import { neuralEnabled } from './semantic.js';

const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm';
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

const FLUFF_RE = [
  // filler-only clauses ("okay so yeah", "right right um")
  /^(ok(ay)?|alright|right|well|so|anyway|yeah|yep|hmm+|um+|uh+|no wait)([\s,]+(ok(ay)?|alright|so|yeah|yep|right|well|anyway|hmm+|um+|uh+))*$/i,
  // mic checks and greetings
  /^(testing[\s,]*)+(one two( three)?)?$/i,
  /\bcan you hear me\b/i,
  /^(hey|hi|hello)([\s,]+(hey|hi|hello|there))*$/i,
  // losing the thread
  /^(where was i|what was i saying|i lost my (train of )?thought)\b/i,
  // asides to the device / self
  /^(hold on|one sec(ond)?|give me a sec(ond)?|wait a sec(ond)?|sorry)\b.{0,20}$/i,
  /^(let me (think|see|start over))\b.{0,15}$/i,
  // trailing hedges as whole clauses
  /^if that makes (any )?sense$/i,
  /^(you know what i mean|know what i mean)\??$/i,
  /^(this is|i'?m) just (a )?(test|testing|rambling)\b/i,
];

export function isFluff(text) {
  const s = text.trim().replace(/[.,;!?]+\s*$/, '');
  return FLUFF_RE.some((re) => re.test(s));
}

// Fluff phrases embedded mid-stream (unpunctuated speech runs them straight
// into real content: "…a total mess anyway where was I but cleaning…") —
// excised from the transcript before segmentation. Only unambiguous phrases;
// anything that could carry meaning stays.
const INLINE_FLUFF = [
  /\btesting[, ]+testing\b/gi,
  /\bcan you hear me\b/gi,
  /\bwhere was i\b/gi,
  /\bwhat was i saying\b/gi,
  /\bhold on(?: (?:a|one) (?:sec(?:ond)?|moment|minute))?\b/gi,
  /\b(?:give me|wait) (?:a|one) sec(?:ond)?\b/gi,
  /\blet me (?:think|see)\b/gi,
  /\bif that makes (?:any )?sense\b/gi,
  /\byou know what i mean\b/gi,
  /\banyway\b/gi,
];

export function scrubFluff(transcript) {
  let t = transcript;
  for (const re of INLINE_FLUFF) t = t.replace(re, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

let feP = null;
function loadEmbedder() {
  if (!feP) {
    feP = import(/* @vite-ignore */ LIB_URL).then((tf) =>
      tf.pipeline('feature-extraction', MODEL_ID, {
        device: navigator.gpu ? 'webgpu' : 'wasm',
        dtype: 'q8',
      }));
    feP.catch(() => { feP = null; }); // allow retry after a failed load
  }
  return feP;
}

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

// Drop clauses semantically unrelated to the rest of the thought. Needs at
// least 4 clauses (no way to judge relatedness in a fragment) and never drops
// more than a third — the speaker's words win in a tie.
export async function filterUnrelated(clauses) {
  if (!neuralEnabled() || clauses.length < 4) return clauses;
  try {
    const embed = await loadEmbedder();
    const out = await embed(clauses.map((c) => c.text), { pooling: 'mean', normalize: true });
    const vecs = out.tolist();
    const n = vecs.length;
    const score = vecs.map((v, i) => {
      let s = 0;
      for (let j = 0; j < n; j++) { if (j !== i) s += dot(v, vecs[j]); }
      return s / (n - 1);
    });
    const avg = score.reduce((a, b) => a + b, 0) / n;
    const drop = new Set();
    for (const [s, i] of score.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0])) {
      if (drop.size >= Math.floor(n / 3)) break;
      if (s < 0.3 && s < avg - 0.15) drop.add(i);
    }
    return clauses.filter((_, i) => !drop.has(i));
  } catch (e) {
    return clauses;
  }
}
