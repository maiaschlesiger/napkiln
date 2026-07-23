// napkiln AI structurer — turns a rolling transcript into the thought graph
// shown while recording. Two engines behind one async interface:
//   HeuristicStructurer — on-device, zero dependencies, instant
//   ClaudeStructurer    — Claude API (direct browser access, structured JSON);
//                         used when an API key is configured, falls back to
//                         the heuristic on any failure.
const TEAL = '#1F8A96', CLAY = '#E0824E';
const KEY_STORAGE = 'napkiln-anthropic-key';
const NODE_TYPES = ['PROBLEM', 'CONTEXT', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'OPEN QUESTION', 'EVENT'];
const styleFor = (type) => ({
  c: (type === 'CONSTRAINT' || type === 'OPEN QUESTION') ? CLAY : TEAL,
  solid: !(type === 'OPEN QUESTION' || type === 'CONTEXT'),
});

const FILLERS = /\b(um+|uh+|erm|hmm|you know|i mean|sort of|kind of|kinda|basically|literally|actually)\b/gi;
const cleanText = (s) => s.replace(FILLERS, ' ').replace(/\s+/g, ' ').trim();

function summarize(seg) {
  let t = cleanText(seg)
    .replace(/^(and|but|so|then|also|well|okay|ok|yeah|like)\s+/i, '')
    .replace(/^(the (thing|problem|issue) is( that)?|i (think|guess|feel like)( that)?|it('s| is) (like|that))\s+/i, '');
  const isQ = /\?\s*$/.test(t);
  t = t.replace(/[.,;!?]+\s*$/, '');
  const words = t.split(' ');
  if (words.length > 9) t = words.slice(0, 9).join(' ') + '…';
  t = t.charAt(0).toLowerCase() + t.slice(1);
  return t + (isQ ? '?' : '');
}

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
const OPENERS = ['what if', "i wonder", "i'm wondering", 'the question is'];
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
  return clauses.filter((c) => wordCount(c.text) >= 2);
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
  if (/^(i wonder|how (do|would|could|can|should)|should i|do i|is (it|there)|are there|why )/.test(s) || /\?\s*$/.test(s)) return 'OPEN QUESTION';
  if (/\b(problem|issue|annoying|frustrat\w*|pain(ful)?|struggle|never (listen|open|look|go back)|go(es)? unheard|doesn'?t work|hate|hard to)\b/.test(s)) return 'PROBLEM';
  if (/\b(rigid|can'?t|cannot|won'?t work|limitation|constraint|the catch|too (hard|slow|clunky|expensive|rigid)|feels? (rigid|forced|wrong|clunky))\b/.test(s)) return 'CONSTRAINT';
  if (NARRATIVE_CONNECTIVES.has(connective) || PAST_NARRATIVE.test(s) || TIME_OPENER.test(s)) return 'EVENT';
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
  constructor() { this.engine = 'on-device'; }
  async structure(transcript) {
    const nodes = [], edges = [], seen = new Set();
    for (const clause of segmentClauses(transcript)) {
      const type = classify(clause.text, clause.connective);
      const text = summarize(clause.text);
      const key = type + '|' + text;
      // Dedupe repeated clauses (re-transcription loops) — but a narrative
      // connective means the speaker said it happened *again*, so keep it:
      // "this happened and then this happened" is two boxes.
      if (!text || (seen.has(key) && !NARRATIVE_CONNECTIVES.has(clause.connective))) continue;
      seen.add(key);
      if (nodes.length) {
        edges.push({ label: clause.connective || edgeLabel(nodes[nodes.length - 1].type, type) });
      }
      nodes.push(Object.assign({ type, text }, styleFor(type)));
      if (nodes.length >= 8) break;
    }
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
          text: { type: 'string', description: 'The idea, compressed to at most 9 words, lowercase start' },
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
  'Extract 2-8 boxes, each typed as PROBLEM, CONTEXT, OPPORTUNITY, IDEA, CONSTRAINT, or OPEN QUESTION, ' +
  'in the order the thought develops. Compress each box to at most 9 words, keeping the speaker\'s own ' +
  'wording where possible. Connect consecutive boxes with a 1-2 word label ("led to", "but", "raises", "so"). ' +
  'Ignore filler words and false starts. If a structure template is named, prefer its box types. ' +
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
