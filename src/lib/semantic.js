// Neural boost — optional zero-shot clause classification, fully on-device.
// A small NLI model (MobileBERT-MNLI via transformers.js, ~25 MB one-time
// download, cached by the browser) scores each clause against napkiln's box
// schema, GLiNER-style: you describe the labels, no training. Used to sharpen
// clauses the regex heuristics couldn't type confidently. Degrades to the
// heuristic answer on any failure, so structuring never stalls.
const LIB_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm';
const MODEL_ID = 'Xenova/mobilebert-uncased-mnli';
const NEURAL_KEY = 'napkiln-neural';

// Label schema — descriptions are what the model actually scores against.
const LABELS = [
  ['PROBLEM', 'a problem, frustration or pain point'],
  ['OPPORTUNITY', 'an idea or opportunity worth exploring'],
  ['CONSTRAINT', 'a limitation, obstacle or concern'],
  ['EVENT', 'something that happened, a step in a story'],
  ['CONTEXT', 'background context or a habit'],
  ['OPEN QUESTION', 'an unresolved question to figure out'],
];
const MIN_CONFIDENCE = 0.4;

export function neuralEnabled() {
  try { return localStorage.getItem(NEURAL_KEY) === '1'; } catch (e) { return false; }
}
export function setNeuralEnabled(v) {
  try { v ? localStorage.setItem(NEURAL_KEY, '1') : localStorage.removeItem(NEURAL_KEY); } catch (e) { /* private mode */ }
}
export function neuralAvailable() { return !!window.WebAssembly; }

let zscPromise = null;
function loadClassifier() {
  if (!zscPromise) {
    zscPromise = import(/* @vite-ignore */ LIB_URL).then((tf) =>
      tf.pipeline('zero-shot-classification', MODEL_ID, {
        device: navigator.gpu ? 'webgpu' : 'wasm',
        dtype: 'q8',
      }));
    zscPromise.catch(() => { zscPromise = null; }); // allow retry after a failed load
  }
  return zscPromise;
}

// Re-type a clause the heuristics weren't sure about. Returns the fallback
// type unless the model is enabled, loaded, and confident.
export async function refineType(text, fallback) {
  if (!neuralEnabled() || !neuralAvailable()) return fallback;
  try {
    const classify = await loadClassifier();
    const out = await classify(text, LABELS.map(([, desc]) => desc));
    if (!out || !out.labels || out.scores[0] < MIN_CONFIDENCE) return fallback;
    const hit = LABELS.find(([, desc]) => desc === out.labels[0]);
    return hit ? hit[0] : fallback;
  } catch (e) {
    return fallback;
  }
}
