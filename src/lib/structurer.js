// napkiln AI structurer — turns a rolling transcript into the thought graph
// shown while recording. Two engines behind one async interface:
//   HeuristicStructurer — on-device, zero dependencies, instant
//   ClaudeStructurer    — Claude API (direct browser access, structured JSON);
//                         used when an API key is configured, falls back to
//                         the heuristic on any failure.
import { isQuestionish, hasPastAction, splitRunOn, topicOf } from './linguistics.js';
import { refineType, neuralEnabled } from './semantic.js';
import { isFluff, scrubFluff, filterUnrelated } from './salience.js';

const TEAL = '#1F8A96', CLAY = '#E0824E';
const KEY_STORAGE = 'napkiln-anthropic-key';
const NODE_TYPES = ['PROBLEM', 'CONTEXT', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'OPEN QUESTION', 'EVENT'];
const styleFor = (type) => ({
  c: (type === 'CONSTRAINT' || type === 'OPEN QUESTION') ? CLAY : TEAL,
  solid: !(type === 'OPEN QUESTION' || type === 'CONTEXT'),
});

const FILLERS = /\b(um+|uh+|erm|hmm|you know|i mean|sort of|kind of|kinda|basically|literally|actually)\b/gi;
const cleanText = (s) => s.replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();

// Also used by the review screen to compress re-recorded box text.
// Boxes are 3-4 word topic labels: POS-driven extraction first, with the
// word-cap summarizer as the safety net when no confident topic emerges.
export function summarizeClause(seg) { return topicOf(seg) || summarize(seg, 4, true); }

const HEDGES = /\b(maybe|probably|possibly|just|really|very|honestly|definitely|pretty much|i mean|i think|i guess)\b/gi;

function summarize(seg, cap = 9, minimal = false) {
  let t = cleanText(seg)
    .replace(/^((and|but|so|then|also|well|okay|ok|alright|yeah|right|like)\s+)+/i, '')
    .replace(/^(the (thing|problem|issue) is( that)?|i (think|guess|feel like)( that)?|it('s| is) (like|that))\s+/i, '');
  if (minimal) t = t.replace(HEDGES, ' ').replace(/\s+/g, ' ').trim();
  const isQ = /\?\s*$/.test(t);
  t = t.replace(/[.,;!?]+\s*$/, '').replace(/\s+(and|or|but|so)\s*$/i, '');
  const words = t.split(' ').filter(Boolean);
  if (words.length > cap) t = words.slice(0, cap).join(' ') + '…';
  else t = words.join(' ');
  t = t.charAt(0).toLowerCase() + t.slice(1);
  return t + (isQ ? '?' : '');
}

// Bare-minimum mode for the focused templates: only these box types survive,
// hard-capped and tersely worded. Free flow and Sequence keep full detail —
// a story needs its beats.
const MINIMAL_TYPES = {
  'Problem → Solution': ['PROBLEM', 'OPPORTUNITY', 'CONSTRAINT', 'OPEN QUESTION'],
  'Weighing options': ['OPPORTUNITY', 'IDEA', 'CONSTRAINT'],
  'Around a question': ['OPEN QUESTION', 'OPPORTUNITY', 'IDEA'],
};
const MINIMAL_CAP = 5;      // boxes
const MINIMAL_WORDS = 4;    // words per box (fallback cap when no topic emerges)

// ---------------------------------------------------------------------------
// Discourse-driven segmentation. Speech transcripts arrive largely
// unpunctuated, so box boundaries can't rely on sentences — they follow how
// the speaker talks: a new box begins where they move to a new beat, marked
// by a connective ("and then", "but", "so", "because", …). The spoken
// connective is kept and becomes the edge label into the new box, so
// "this happened and then that happened" is two boxes joined by "then".
// ---------------------------------------------------------------------------

// [marker, edge label] — earliest occurrence wins; on a tie the longer marker
// wins ("and then" beats "then", "but then" beats "but").
const CONNECTIVES = [
  ['and then', 'then'], ['but then', 'then'], ['so then', 'then'],
  ['after that', 'after that'], ['afterwards', 'after that'],
  ['on the other hand', 'but'], ['on top of that', 'also'],
  ['which means', 'so'], ['which meant', 'so'],
  ['however', 'but'], ['because', 'because'],
  ['meanwhile', 'meanwhile'], ['eventually', 'eventually'], ['finally', 'finally'],
  ['then', 'then'], ['but', 'but'], ['so', 'so'], ['also', 'also'],
];
// Question/idea openers also begin a new box, but the opener stays in the
// clause (it carries the meaning: "I wonder who owns those spaces").
const OPENERS = [
  'what if', "i wonder", "i'm wondering", 'the question is',
  'how do i', 'how do we', 'how would', 'how can', 'should i', 'should we',
  'why do', 'why does', 'why is',
];
// Short or ambiguous markers split only when a clause-like continuation
// follows, so idioms ("I think so", "could finally work") don't fragment.
const GUARDED = new Set(['then', 'so', 'also', 'finally', 'eventually']);
const NEXT_OK = /^(i|we|you|they|he|she|it|the|a|an|my|our|your|their|this|that|there|one|maybe|perhaps|suddenly|later|last|when|after|what)\b/i;
const wordCount = (s) => cleanText(s).split(' ').filter(Boolean).length;

function findSplit(text) {
  let best = null;
  const consider = (i, len, label, keep) => {
    if (!best || i < best.index || (i === best.index && len > best.len)) {
      best = { index: i, len, label, keep };
    }
  };
  for (const [marker, label] of CONNECTIVES) {
    const re = new RegExp('\\b' + marker + '\\b', 'ig');
    let m;
    while ((m = re.exec(text))) {
      const i = m.index;
      if (i === 0) continue; // a leading marker binds to this clause, handled by caller
      const after = text.slice(i + m[0].length).replace(/^[\s,]+/, '');
      if (GUARDED.has(marker) && !NEXT_OK.test(after)) continue;
      if (wordCount(text.slice(0, i)) < 2 || wordCount(after) < 2) continue;
      consider(i, m[0].length, label, false);
      break; // only the earliest valid occurrence per marker matters
    }
  }
  for (const opener of OPENERS) {
    const re = new RegExp('\\b' + opener.replace("'", "'?") + '\\b', 'ig');
    let m;
    while ((m = re.exec(text))) {
      const i = m.index;
      if (i === 0) continue;
      if (wordCount(text.slice(0, i)) < 2 || wordCount(text.slice(i)) < 3) continue;
      consider(i, 0, null, true); // keep = split before, marker stays in clause
      break;
    }
  }
  return best;
}

// -> [{ text, connective }] where connective is the spoken word that opened
//    this clause (null for the first clause of a breath)
function segmentClauses(transcript) {
  const clauses = [];
  for (let sentence of transcript.split(/(?<=[.?!;])\s+|\n+/)) {
    sentence = sentence.trim();
    if (!sentence) continue;
    let connective = null;
    for (const [marker, label] of CONNECTIVES) {
      const re = new RegExp('^' + marker + '\\b[,\\s]*', 'i');
      if (re.test(sentence) && wordCount(sentence.replace(re, '')) >= 2) {
        connective = label;
        sentence = sentence.replace(re, '');
        break;
      }
    }
    let rest = sentence;
    while (rest) {
      const cut = findSplit(rest);
      if (!cut) { clauses.push({ text: rest, connective }); break; }
      clauses.push({ text: rest.slice(0, cut.index), connective });
      connective = cut.label;
      rest = rest.slice(cut.index + (cut.keep ? 0 : cut.len)).replace(/^[\s,]+/, '');
    }
  }
  // Marker-less run-ons ("I built a prototype my friends loved it nobody
  // wanted to pay for it") still carry several beats — split them at
  // POS-detected subject–verb boundaries; the spoken connective stays with
  // the first piece.
  return clauses
    .flatMap((c) => splitRunOn(c.text).map((text, i) => ({ text, connective: i === 0 ? c.connective : null })))
    .filter((c) => wordCount(c.text) >= 2);
}

// Connectives that mark narrative progression — their clause is an EVENT.
const NARRATIVE_CONNECTIVES = new Set(['then', 'after that', 'finally', 'eventually', 'meanwhile']);
const PAST_NARRATIVE = /\b(happened|went|came|got|took|met|saw|heard|found|started|began|stopped|ended(?: up)?|woke|walked|drove|arrived|left|said|told|asked|tried|realized|decided|noticed|remembered|(?:was|were) \w+ing)\b/;
const TIME_OPENER = /^(yesterday|today|earlier|last (night|week|month|year|time)|this (morning|afternoon|evening)|one (day|time)|the other day|a while (ago|back))\b/;

function classify(seg, connective) {
  const s = cleanText(seg).toLowerCase();
  // "what if…" is napkiln's signature opportunity phrasing — it wins over the
  // question-mark rule even when spoken as a question
  if (/^(what if|imagine|wouldn'?t it be)\b/.test(s)) return 'OPPORTUNITY';
  if (/^(i wonder|how (do|would|could|can|should)|should i|do i|is (it|there)|are there|why )/.test(s) || /\?\s*$/.test(s) || isQuestionish(s)) return 'OPEN QUESTION';
  if (/\b(problem|issue|annoying|frustrat\w*|pain(ful)?|struggle|never (listen|open|look|go back)|go(es)? unheard|doesn'?t work|hate|hard to)\b/.test(s)) return 'PROBLEM';
  if (/\b(rigid|can'?t|cannot|won'?t work|limitation|constraint|the catch|too (hard|slow|clunky|expensive|rigid)|feels? (rigid|forced|wrong|clunky))\b/.test(s)) return 'CONSTRAINT';
  if (NARRATIVE_CONNECTIVES.has(connective) || PAST_NARRATIVE.test(s) || TIME_OPENER.test(s) || hasPastAction(s)) return 'EVENT';
  if (/\b(what if|imagine|we could|i could|could be|maybe (we|i|it)|opportunity|the idea is|it would be (cool|great|nice)|visuali[sz]e|wouldn'?t it be)\b/.test(s)) return 'OPPORTUNITY';
  if (/^(when(ever)?|while|usually|normally|lately|every time|i keep|i always|i often|these days|context)\b/.test(s)) return 'CONTEXT';
  if (connective === 'but') return 'CONSTRAINT'; // contrastive beat with no stronger signal
  return 'IDEA';
}

// Fallback edge labels when the speaker didn't say a connective.
function edgeLabel(prevType, nextType) {
  if (nextType === 'CONSTRAINT') return 'but';
  if (nextType === 'OPEN QUESTION') return 'raises';
  if (nextType === 'EVENT' || prevType === 'EVENT') return 'then';
  if (prevType === 'PROBLEM') return 'led to';
  if (prevType === 'CONTEXT') return 'so';
  if (nextType === 'OPPORTUNITY') return 'so';
  if (prevType === 'CONSTRAINT') return 'still';
  return 'then';
}

export class HeuristicStructurer {
  constructor() { this.engine = neuralEnabled() ? 'on-device neural' : 'on-device'; }
  async structure(transcript, opts) {
    const minimalTypes = (opts && opts.template && MINIMAL_TYPES[opts.template]) || null;
    const seen = new Set(), cand = [];
    // Cut the fluff: meta-talk clauses always; semantically unrelated asides
    // when the neural boost is on
    let clauses = segmentClauses(scrubFluff(transcript)).filter((c) => !isFluff(c.text));
    clauses = await filterUnrelated(clauses);
    for (let ci = 0; ci < clauses.length; ci++) {
      const clause = clauses[ci];
      let type = classify(clause.text, clause.connective);
      // IDEA is the fall-through bucket — let the neural boost (when enabled)
      // take a semantic second look at clauses the rules couldn't type
      if (type === 'IDEA') type = await refineType(clause.text, type);
      const text = topicOf(clause.text) || summarize(clause.text, MINIMAL_WORDS, true);
      const key = type + '|' + text;
      // Dedupe repeated clauses (re-transcription loops) — but a narrative
      // connective means the speaker said it happened *again*, so keep it:
      // "this happened and then this happened" is two boxes.
      if (!text || (seen.has(key) && !NARRATIVE_CONNECTIVES.has(clause.connective))) continue;
      seen.add(key);
      cand.push({ type, text, connective: clause.connective, ci });
      if (cand.length >= (minimalTypes ? 12 : 8)) break;
    }
    let kept = cand;
    if (minimalTypes) {
      const filtered = cand.filter((c) => minimalTypes.includes(c.type));
      // never empty the thought — if the template's types barely appear,
      // keep everything (still tersely worded) rather than show nothing
      if (filtered.length >= 2) kept = filtered;
      kept = kept.slice(0, MINIMAL_CAP);
    }
    const nodes = [], edges = [];
    kept.forEach((c, i) => {
      if (i) {
        // a spoken connective only holds if the previous clause survived
        const adjacent = c.ci === kept[i - 1].ci + 1;
        edges.push({ label: (adjacent && c.connective) || edgeLabel(kept[i - 1].type, c.type) });
      }
      nodes.push(Object.assign({ type: c.type, text: c.text }, styleFor(c.type)));
    });
    return { nodes, edges, engine: this.engine };
  }
}

// JSON Schema for structured output — object schemas need additionalProperties:false.
const GRAPH_SCHEMA = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: NODE_TYPES },
          text: { type: 'string', description: 'A 3-4 word topic label — essential nouns and verbs only, never a sentence, lowercase start' },
        },
        required: ['type', 'text'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      description: 'One edge between each consecutive pair of nodes (length = nodes.length - 1)',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'Short connective, 1-2 words: led to, but, raises, so, then…' },
        },
        required: ['label'],
        additionalProperties: false,
      },
    },
  },
  required: ['nodes', 'edges'],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  'You structure a person\'s spoken, rambling thought into a small graph while they talk. ' +
  'Follow the speaker\'s own discourse: begin a NEW box exactly where they move to a new beat — ' +
  'a temporal shift ("and then", "after that", "eventually"), a contrast ("but", "however"), ' +
  'a consequence ("so", "which means"), a cause ("because"), or a fresh question ("I wonder", "what if"). ' +
  'A narrative like "this happened and then that happened" becomes separate EVENT boxes in speaking ' +
  'order, joined by "then" — never merge distinct beats into one box, and never split a single beat. ' +
  'Types: EVENT (something that happened or a step in a story), PROBLEM, CONTEXT, OPPORTUNITY, IDEA, ' +
  'CONSTRAINT, OPEN QUESTION. Extract 2-8 boxes in the order the thought develops. ' +
  'For each edge, use the connective word the speaker actually said ("then", "but", "so", "because", ' +
  '"after that"); only fall back to an inferred label ("led to", "raises") when they said none. ' +
  'Each box is a 3-4 word topic label — only the essential nouns, verbs and qualifiers from the ' +
  'speaker\'s own wording ("rent too expensive", "saw empty storefront"), never a full sentence. ' +
  'Ignore filler words and false starts, and omit fluff entirely: greetings, mic checks, asides, ' +
  'and meta-talk ("where was I", "hold on") — plus anything semantically unrelated to the thought. ' +
  'Only what is important and belongs to the thought becomes a box. ' +
  'If a structure template is named, prefer its box types. ' +
  'The transcript may be mid-sentence — structure what is there so far without inventing content.';

export class ClaudeStructurer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.engine = 'Claude';
    this._fallback = new HeuristicStructurer();
  }
  async structure(transcript, opts) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 1024,
          output_config: { format: { type: 'json_schema', schema: GRAPH_SCHEMA }, effort: 'low' },
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: (opts && opts.template ? 'Structure template: ' + opts.template + '\n\n' : '') +
              (opts && opts.template && MINIMAL_TYPES[opts.template]
                ? 'Keep the bare minimum: at most ' + MINIMAL_CAP + ' boxes of only the types ' +
                  MINIMAL_TYPES[opts.template].join(', ') +
                  ' — drop hedges, asides, and every clause that does not fit those types.\n\n'
                : '') +
              'Transcript so far:\n' + transcript,
          }],
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.stop_reason === 'refusal') throw new Error('refusal');
      const block = (data.content || []).find((b) => b.type === 'text');
      const graph = JSON.parse(block.text);
      const nodes = (graph.nodes || []).slice(0, 8).map((n) =>
        Object.assign({ type: n.type, text: n.text }, styleFor(n.type)));
      const edges = (graph.edges || []).slice(0, Math.max(0, nodes.length - 1));
      if (!nodes.length) throw new Error('empty');
      return { nodes, edges, engine: this.engine };
    } catch (e) {
      const out = await this._fallback.structure(transcript);
      out.engine = 'on-device (Claude unavailable)';
      return out;
    }
  }
}

const KEY = KEY_STORAGE;
export function getApiKey() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
export function setApiKey(k) { try { k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY); } catch (e) { /* private mode */ } }
export function createStructurer() {
  const key = getApiKey();
  return key ? new ClaudeStructurer(key) : new HeuristicStructurer();
}
