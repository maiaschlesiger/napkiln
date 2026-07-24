// napkiln AI structurer — turns a rolling transcript into the thought graph
// shown while recording. Two engines behind one async interface:
//   HeuristicStructurer — on-device, zero dependencies, instant
//   ClaudeStructurer    — Claude API (direct browser access, structured JSON);
//                         used when an API key is configured, falls back to
//                         the heuristic on any failure.
import { isQuestionish, hasPastAction, splitRunOn, topicOf } from './linguistics.js';
import { rankTranscript, noteFor, titleFor } from './notetaker.js';
import { assignRoles, cueScore, TEMPLATE_ROLES } from './roles.js';
import { refineType, neuralEnabled } from './semantic.js';
import { isFluff, scrubFluff, filterUnrelated } from './salience.js';

const TEAL = '#1F8A96', CLAY = '#E0824E';
const KEY_STORAGE = 'napkiln-anthropic-key';
const NODE_TYPES = ['PROBLEM', 'CONTEXT', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'OPEN QUESTION', 'EVENT', 'GOAL', 'AUDIENCE'];
const styleFor = (type) => ({
  c: (type === 'CONSTRAINT' || type === 'OPEN QUESTION') ? CLAY : TEAL,
  solid: !(type === 'OPEN QUESTION' || type === 'CONTEXT'),
});

const FILLERS = /\b(um+|uh+|erm|hmm|you know|i mean|sort of|kind of|kinda|basically|literally|actually)\b/gi;
const cleanText = (s) => s.replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();

// Also used by the review screen to compress re-recorded box text.
// Boxes are terse notes: importance-ranked extraction first (wink-nlp +
// TextRank), then POS-pattern topics, then the word-cap summarizer.
export function summarizeClause(seg) {
  return noteFor(seg, rankTranscript(seg)) || topicOf(seg) || summarize(seg, 4, true);
}

const HEDGES = /\b(maybe|probably|possibly|just|really|very|honestly|definitely|pretty much|i mean|i think|i guess)\b/gi;

// The exact spoken phrase a box came from, lightly tidied (fillers out,
// leading connective off) but never reworded — this is what the user taps to
// verify the AI's interpretation, so it must stay faithful to what they said.
function groundingOf(seg) {
  let t = cleanText(seg)
    .replace(/^((and|but|so|then|also|well|okay|ok|alright|yeah|right|like)[\s,]+)+/i, '')
    .replace(/[\s,]+(and|but|so|then|or|also)\s*$/i, '')
    .trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

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
  'Problem → Solution': ['PROBLEM', 'OPPORTUNITY', 'CONSTRAINT', 'OPEN QUESTION', 'GOAL'],
  'Weighing options': ['OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'GOAL'],
  'Around a question': ['OPEN QUESTION', 'OPPORTUNITY', 'IDEA', 'GOAL'],
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
//    this clause (null for the first clause of a breath). split=false stops
//    before the marker-less run-on pass, keeping fuller clauses — the role
//    extractor wants whole beats to score, not sub-clause fragments.
function segmentClauses(transcript, split = true) {
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
  if (!split) return clauses.filter((c) => wordCount(c.text) >= 2);
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
  // the outcome the speaker wants — a goal, not just an idea
  if (/^(i want to|i'?d (love|like) to|i really want|i wish|my goal|the goal is|ideally|what i (really )?want)\b/.test(s) || /\bso that (i|we|it|they)\b/.test(s)) return 'GOAL';
  if (/\b(what if|imagine|we could|i could|could be|maybe (we|i|it)|opportunity|the idea is|it would be (cool|great|nice)|visuali[sz]e|wouldn'?t it be)\b/.test(s)) return 'OPPORTUNITY';
  if (/^(when(ever)?|while|usually|normally|lately|every time|i keep|i always|i often|these days|context)\b/.test(s)) return 'CONTEXT';
  if (connective === 'but') return 'CONSTRAINT'; // contrastive beat with no stronger signal
  return 'IDEA';
}

// Fallback edge labels when the speaker didn't say a connective.
function edgeLabel(prevType, nextType) {
  if (nextType === 'CONSTRAINT') return 'but';
  if (nextType === 'OPEN QUESTION') return 'raises';
  if (nextType === 'GOAL') return 'toward';
  if (nextType === 'EVENT' || prevType === 'EVENT') return 'then';
  if (prevType === 'PROBLEM') return 'led to';
  if (prevType === 'GOAL') return 'needs';
  if (prevType === 'CONTEXT') return 'so';
  if (nextType === 'OPPORTUNITY') return 'so';
  if (prevType === 'CONSTRAINT') return 'still';
  return 'then';
}

// Within a detected beat, find the sub-clause that most expresses the role,
// so the box labels the point ("record their dreams") rather than smearing the
// whole beat's words together. Falls back to the beat when no split helps.
function bestSubspan(text, role) {
  const pieces = splitRunOn(text);
  if (pieces.length <= 1) return text;
  let best = text, bestScore = cueScore(text, role) - 0.01;
  for (const p of pieces) {
    if (wordCount(p) < 2) continue;
    const sc = cueScore(p, role);
    if (sc > bestScore) { bestScore = sc; best = p; }
  }
  return best;
}

export class HeuristicStructurer {
  constructor() { this.engine = neuralEnabled() ? 'on-device neural' : 'on-device'; }
  async structure(transcript, opts) {
    const minimalTypes = (opts && opts.template && MINIMAL_TYPES[opts.template]) || null;
    const seen = new Set(), cand = [];
    // Cut the fluff: meta-talk clauses always; semantically unrelated asides
    // when the neural boost is on
    const scrubbed = scrubFluff(transcript);
    let clauses = segmentClauses(scrubbed).filter((c) => !isFluff(c.text));
    clauses = await filterUnrelated(clauses);
    // Importance scores span the whole transcript, so each box keeps the
    // words that matter to the thought — not just to its own clause
    const rank = rankTranscript(scrubbed);
    const GOLDEN = 6; // template boxes get a slightly longer "golden" label
    // Role-first path: for a named structure, listen for each role it expects
    // (problem, audience, opportunity, question…) and keep the single best
    // clause per role — condensed into a golden box, grounded in what was said.
    if (opts && opts.template && TEMPLATE_ROLES[opts.template]) {
      const picks = await assignRoles(clauses, opts.template);
      if (picks.length >= 2) {
        const kept = picks.map((p) => {
          // within the clause, label + ground from the sub-span that most
          // expresses the role ("record their dreams", not the whole beat)
          const src = bestSubspan(clauses[p.ci].text, p.type);
          return {
            type: p.type,
            text: noteFor(src, rank, GOLDEN) || topicOf(src) || summarize(src, GOLDEN, true),
            source: groundingOf(src),
            connective: clauses[p.ci].connective,
            ci: p.ci,
          };
        }).slice(0, MINIMAL_CAP);
        return this._assemble(kept, scrubbed, rank);
      }
      // too few roles filled — fall through to discourse segmentation
    }
    for (let ci = 0; ci < clauses.length; ci++) {
      const clause = clauses[ci];
      let type = classify(clause.text, clause.connective);
      // IDEA is the fall-through bucket — let the neural boost (when enabled)
      // take a semantic second look at clauses the rules couldn't type
      if (type === 'IDEA') type = await refineType(clause.text, type);
      const text = noteFor(clause.text, rank) || topicOf(clause.text) || summarize(clause.text, MINIMAL_WORDS, true);
      const key = type + '|' + text;
      // Dedupe repeated clauses (re-transcription loops) — but a narrative
      // connective means the speaker said it happened *again*, so keep it:
      // "this happened and then this happened" is two boxes.
      if (!text || (seen.has(key) && !NARRATIVE_CONNECTIVES.has(clause.connective))) continue;
      seen.add(key);
      // ground the box in the exact phrase the speaker said, so the review
      // screen can show why this box exists (LangExtract-style grounding)
      cand.push({ type, text, source: groundingOf(clause.text), connective: clause.connective, ci });
      if (cand.length >= 12) break;
    }
    let kept = cand;
    if (minimalTypes) {
      const filtered = cand.filter((c) => minimalTypes.includes(c.type));
      // never empty the thought — if the template's types barely appear,
      // keep everything (still tersely worded) rather than show nothing
      if (filtered.length >= 2) kept = filtered;
      kept = kept.slice(0, MINIMAL_CAP);
    }
    return this._assemble(kept, scrubbed, rank);
  }

  // Turn kept candidates into nodes + edges + a chat-style title.
  _assemble(kept, scrubbed, rank) {
    const nodes = [], edges = [];
    kept.forEach((c, i) => {
      if (i) {
        // a spoken connective only holds if the previous clause survived
        const adjacent = c.ci === kept[i - 1].ci + 1;
        edges.push({ label: (adjacent && c.connective) || edgeLabel(kept[i - 1].type, c.type) });
      }
      nodes.push(Object.assign({ type: c.type, text: c.text, source: c.source }, styleFor(c.type)));
    });
    // name the thought like a chat: subject phrase, flavored by what
    // dominates the graph
    const counts = {};
    kept.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    const dominant = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    return { nodes, edges, title: titleFor(scrubbed, rank, dominant), engine: this.engine };
  }
}

// JSON Schema for structured output — object schemas need additionalProperties:false.
const GRAPH_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A short chat-style name for the whole thought, 2-5 words in Title Case, naming the subject — like "Recording Voice Notes" or "Storefront Rent Question", never generic like "My Thoughts"',
    },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: NODE_TYPES },
          text: { type: 'string', description: 'A clear 5-6 word label, rewritten in plain words like an expert note-taker: oversimplify the phrasing but keep every important bit — names, numbers, amounts, dates, negations. Lowercase start, never a full sentence.' },
          source: { type: 'string', description: 'The exact phrase from the transcript this box was drawn from, quoted verbatim (you may trim only fillers), so the user can tap the box and verify the interpretation. Never reworded.' },
        },
        required: ['type', 'text', 'source'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      description: 'One edge between each consecutive pair of nodes (length = nodes.length - 1)',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'The relationship, 1-2 words: the connective the speaker said (then, but, so, because) or an inferred one (leads to, causes, solved by, needs, toward, raises)' },
        },
        required: ['label'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'nodes', 'edges'],
  additionalProperties: false,
};

const SYSTEM_PROMPT =
  'You turn a person\'s spoken, rambling brainstorm into an explainable thought graph while they talk. ' +
  'Your job is not to tag sentences — it is to (1) understand the ramble, (2) find the meaningful ' +
  'thought units, (3) classify each, (4) rewrite each into a clean short label, (5) ground each in ' +
  'the exact phrase that produced it, and (6) connect them.\n' +
  'Follow the speaker\'s own discourse: begin a NEW box exactly where they move to a new beat — ' +
  'a temporal shift ("and then", "after that", "eventually"), a contrast ("but", "however"), ' +
  'a consequence ("so", "which means"), a cause ("because"), or a fresh question ("I wonder", "what if"). ' +
  'A narrative like "this happened and then that happened" becomes separate EVENT boxes in speaking ' +
  'order — never merge distinct beats into one box, and never split a single beat.\n' +
  'Types: EVENT (something that happened or a step in a story), PROBLEM (a difficulty, frustration or ' +
  'unmet need), CONTEXT (background or a habit), AUDIENCE (the people who have the problem, and what ' +
  'they do), OPPORTUNITY (a product or feature being imagined), IDEA (a proposed way to address a ' +
  'problem), GOAL (the outcome the speaker wants), CONSTRAINT (a requirement, limit or catch), ' +
  'OPEN QUESTION (something unresolved). Extract 2-12 boxes in the order the thought develops.\n' +
  'Work role-first: decide which roles the thought actually contains, then for each role capture the ' +
  'one phrase that best expresses it and condense that — separate the context from the audience from ' +
  'the problem from the solution, each in its own box.\n' +
  'LABEL: rewrite each box into a clear 5-6 word phrase like an expert note-taker — oversimplify the ' +
  'wording but never lose an important bit. Keep names, numbers, amounts, dates, times and negations ' +
  '("important points get buried", "rent is eight hundred a month", "meet sarah tuesday at nine"); drop ' +
  'hedges, filler and glue words. It is a label, never a full sentence.\n' +
  'SOURCE: for every box, copy the exact phrase from the transcript it came from into "source", ' +
  'verbatim (trim only fillers) — this is what the user taps to check your interpretation, so it must ' +
  'stay faithful to what they actually said and never be reworded.\n' +
  'EDGES: label each with the connective the speaker said ("then", "but", "so", "because"); otherwise ' +
  'infer the relationship ("leads to", "causes", "solved by", "needs", "toward", "raises").\n' +
  'Omit fluff entirely: greetings, mic checks, asides, meta-talk ("where was I", "hold on") and anything ' +
  'unrelated to the thought — only what matters becomes a box, and never invent content that was not said.\n' +
  'Name the whole thought the way a chat gets auto-named: a specific 2-5 word Title Case title ' +
  '("Recording Voice Notes", "Storefront Rent Question") — never vague like "My Thoughts".\n' +
  'If a structure template is named, prefer its box types. The transcript may be mid-sentence — ' +
  'structure what is there so far.';

// One teaching example (LangExtract-style): the transformation is taught by
// demonstration, not just described. Matches GRAPH_SCHEMA exactly.
const EXAMPLE_INPUT =
  "for a while i've been talking to people about an issue they have, they like to record their dreams " +
  "but it's a lot of information and it's hard to get the point, i feel like it'd be cool if there was " +
  "an app that could transcribe your dreams but really just keep the most important points";
const EXAMPLE_OUTPUT = {
  title: 'Condensing Recorded Dreams',
  nodes: [
    { type: 'CONTEXT', text: 'people like recording their dreams', source: 'they like to record their dreams' },
    { type: 'PROBLEM', text: 'dream recordings hold too much', source: "it's a lot of information" },
    { type: 'PROBLEM', text: 'the key point gets buried', source: "it's hard to get the point" },
    { type: 'OPPORTUNITY', text: 'an app to transcribe dreams', source: "it'd be cool if there was an app that could transcribe your dreams" },
    { type: 'IDEA', text: 'keep only the important points', source: 'really just keep the most important points' },
  ],
  edges: [{ label: 'so' }, { label: 'and' }, { label: 'so' }, { label: 'does' }],
};

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
          messages: [
            { role: 'user', content: 'Transcript so far:\n' + EXAMPLE_INPUT },
            { role: 'assistant', content: JSON.stringify(EXAMPLE_OUTPUT) },
            {
              role: 'user',
              content: (opts && opts.template ? 'Structure template: ' + opts.template + '\n\n' : '') +
                (opts && opts.template && TEMPLATE_ROLES[opts.template]
                  ? 'This is a "' + opts.template + '" structure. Listen specifically for each of these ' +
                    'roles and make at most one golden box for each you actually hear — ' +
                    TEMPLATE_ROLES[opts.template].join(', ') + ' — skipping any role that was not ' +
                    'expressed. At most ' + MINIMAL_CAP + ' boxes; drop everything that fills no role.\n\n'
                  : '') +
                'Transcript so far:\n' + transcript,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.stop_reason === 'refusal') throw new Error('refusal');
      const block = (data.content || []).find((b) => b.type === 'text');
      const graph = JSON.parse(block.text);
      const nodes = (graph.nodes || []).slice(0, 12).map((n) =>
        Object.assign({ type: n.type, text: n.text, source: n.source || '' }, styleFor(n.type)));
      const edges = (graph.edges || []).slice(0, Math.max(0, nodes.length - 1));
      if (!nodes.length) throw new Error('empty');
      return { nodes, edges, title: graph.title || null, engine: this.engine };
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
