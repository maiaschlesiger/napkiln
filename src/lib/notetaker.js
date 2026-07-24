// napkiln note taker — compresses each spoken clause into a terse note that
// still carries every important bit. Two imported pieces do the heavy
// lifting: wink-nlp (github.com/winkjs/wink-nlp, MIT) supplies an accurate
// perceptron POS tagger plus named-entity recognition in the browser, and a
// TextRank pass (Mihalcea & Tarau 2004) over the whole transcript ranks
// which words actually carry the thought. The 3-5 words that survive are
// chosen by importance — names, numbers, amounts and negations included —
// not by position, which is what a good note taker does.
import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import compromise from 'compromise';
import { prepClause, isQuestionish } from './linguistics.js';
import { memoize } from './memo.js';

const nlp = winkNLP(model, ['sbd', 'pos', 'ner']);
const its = nlp.its;

const CONTENT_POS = new Set(['NOUN', 'PROPN', 'VERB', 'ADJ', 'NUM']);
const NEG_RE = /^(no|not|never|n'?t|none|nothing|nobody|nowhere)$/i;
const WH_RE = /^(who|what|when|where|why|how|which)$/i;
const INTENS_RE = /^(too|so|forever|always|everything|everyone|nothing)$/i;
// Entity types that are always "important bits" — a note that drops the
// amount, the day, or the time has failed at its one job.
const KEEP_ENT = new Set(['MONEY', 'DATE', 'TIME', 'DURATION', 'CARDINAL', 'ORDINAL', 'PERCENT', 'EMAIL', 'URL', 'HASHTAG', 'MENTION']);
// Verbs so generic they earn no importance of their own (their rank score
// still counts if the transcript leans on them).
const WEAK_VERB = /^(be|is|are|was|were|been|being|am|do|does|did|have|has|had|get|gets|got|go|goes|went|gonna|make|makes|made)$/i;
// Nouns that name nothing in particular — a note spends its 4 words elsewhere.
const WEAK_NOUN = /^(way|ways|stuff|bit|bits|lot|lots|one|ones|guy|guys|kind|kinds|sort|sorts|while|thing|things|something|someone)$/i;
const WEAK_ADJ = /^(own|same|such|other|whole|able|sure)$/i;

// ---------------------------------------------------------------------------
// TextRank over the transcript: content-word lemmas co-occurring within a
// 4-token window vote for each other; ~20 power iterations converge on a
// stable importance score per lemma. Recomputed per structuring pass — wink
// processes hundreds of thousands of tokens per second, so even a
// ten-minute transcript ranks in a few milliseconds.
// ---------------------------------------------------------------------------
const WINDOW = 4;
const DAMPING = 0.85;
const ITERATIONS = 10; // TextRank converges well before 20; half the work
const RANK_MAX_TOKENS = 1500; // cap work on very long recordings
const RANK_MAX_CHARS = 9000;  // …and cap the PARSE itself, not just the maths

function rankTranscriptImpl(text) {
  const rank = new Map();
  try {
    // Parse only the most recent window so a 10-minute transcript costs the
    // same per pass as a 1-minute one (importance for the current boxes is
    // driven by recent + repeated terms anyway). Without this the wink parse
    // grows with the whole recording and blocks the main thread.
    const recent = text.length > RANK_MAX_CHARS ? text.slice(text.length - RANK_MAX_CHARS) : text;
    const seq = [];
    nlp.readDoc(recent).tokens().each((t) => {
      if (CONTENT_POS.has(t.out(its.pos))) seq.push(t.out(its.lemma));
    });
    if (!seq.length) return rank;
    if (seq.length > RANK_MAX_TOKENS) seq.splice(0, seq.length - RANK_MAX_TOKENS);
    const edges = new Map(); // lemma -> Map(neighbor -> weight)
    const link = (a, b) => {
      if (a === b) return;
      if (!edges.has(a)) edges.set(a, new Map());
      const m = edges.get(a);
      m.set(b, (m.get(b) || 0) + 1);
    };
    for (let i = 0; i < seq.length; i++) {
      for (let j = i + 1; j < Math.min(i + WINDOW, seq.length); j++) {
        link(seq[i], seq[j]); link(seq[j], seq[i]);
      }
    }
    const lemmas = [...new Set(seq)];
    const outSum = new Map();
    for (const [a, m] of edges) outSum.set(a, [...m.values()].reduce((s, w) => s + w, 0));
    for (const l of lemmas) rank.set(l, 1);
    for (let it = 0; it < ITERATIONS; it++) {
      const next = new Map();
      for (const l of lemmas) {
        let sum = 0;
        const inbound = edges.get(l);
        if (inbound) {
          for (const [nb, w] of inbound) sum += (w / (outSum.get(nb) || 1)) * (rank.get(nb) || 0);
        }
        next.set(l, (1 - DAMPING) + DAMPING * sum);
      }
      for (const [l, v] of next) rank.set(l, v);
    }
  } catch (e) { /* no ranking — noteFor scores on POS alone */ }
  return rank;
}
// Memoized by transcript text — a stable transcript re-ranks for free.
export const rankTranscript = memoize(rankTranscriptImpl, (t) => t, 64);

// ---------------------------------------------------------------------------
// One clause -> one note. Candidate words are scored by transcript-wide
// TextRank importance plus what they are (an amount beats an adjective);
// the top few survive in speaking order.
// ---------------------------------------------------------------------------
const MAX_WORDS = 7;      // a note is ~5-7 words (fewer for short clauses)…
const MAX_WITH_ENT = 8;   // …stretching to 8 to keep a multi-word entity whole

// maxWords lets a caller ask for a slightly longer "golden" box.
function noteForImpl(text, rank, maxWords = MAX_WORDS) {
  const cap0 = maxWords;
  const capEnt = maxWords + 1;
  try {
    const q = /\?\s*$/.test(text.trim()) || isQuestionish(text);
    const src = prepClause(text);
    if (!src) return null;
    const doc = nlp.readDoc(src);
    const entIdx = new Map(); // token index -> entity id (to keep entities whole)
    let entId = 0;
    doc.entities().each((e) => {
      if (!KEEP_ENT.has(e.out(its.type))) return;
      const id = ++entId;
      e.tokens().each((t) => entIdx.set(t.index(), id));
    });
    const cand = [];
    const allTok = []; // every token, to rebuild a readable span later
    doc.tokens().each((t) => {
      const w = t.out();
      const pos = t.out(its.pos);
      const i = t.index();
      allTok.push({ w, pos, i });
      let score = (rank && rank.get(t.out(its.lemma))) || 0;
      if (entIdx.has(i)) score += 3;
      else if (i === 0 && WH_RE.test(w)) score += 10;     // a question keeps its wh-word
      else if (NEG_RE.test(w)) score += 2.5;              // dropping a negation flips the meaning
      else if (INTENS_RE.test(w)) score += 0.6;           // "too", "forever" carry the point
      // wink's stop list is broad (it flags "empty") — trust the POS tag for
      // content classes and only drop true function words plus junk adjectives
      else if (t.out(its.stopWordFlag) && (!CONTENT_POS.has(pos) || WEAK_ADJ.test(w))) return;
      else if (pos === 'PROPN' || pos === 'NUM') score += 1.5;
      else if (pos === 'NOUN') { if (WEAK_NOUN.test(w)) return; score += 1; }
      else if (pos === 'VERB') score += WEAK_VERB.test(w) ? 0.2 : 1.1;
      else if (pos === 'ADJ') score += 0.8;
      else return;
      cand.push({ i, w, pos, score, ent: entIdx.get(i) || 0 });
    });
    if (cand.length < 2) return null;
    // pick by importance, then restore speaking order
    const byScore = [...cand].sort((a, b) => b.score - a.score);
    const picked = new Set();
    const ents = new Set();
    for (const c of byScore) {
      const cap = ents.size ? capEnt : cap0;
      if (picked.size >= cap) break;
      picked.add(c.i);
      if (c.ent) {
        ents.add(c.ent);
        for (const o of cand) if (o.ent === c.ent) picked.add(o.i); // whole entity
      }
    }
    let kept = cand.filter((c) => picked.has(c.i));
    kept = kept.slice(0, ents.size ? capEnt : cap0);
    // a note without its verb garbles the meaning ("people never voice
    // memos") — swap the weakest plain noun for the clause's best verb
    if (!kept.some((c) => c.pos === 'VERB')) {
      const verb = byScore.find((c) => c.pos === 'VERB' && !WEAK_VERB.test(c.w));
      if (verb) {
        const weakest = [...kept].filter((c) => !c.ent && !NEG_RE.test(c.w) && !WH_RE.test(c.w))
          .sort((a, b) => a.score - b.score)[0];
        if (weakest) kept = kept.map((c) => (c === weakest ? verb : c)).sort((a, b) => a.i - b.i);
      }
    }
    // a straggler far from the rest reads as noise, not as the same note
    while (kept.length > 3 && kept[kept.length - 1].i - kept[kept.length - 2].i > 3) kept.pop();
    if (kept.length < 2) return null;

    // Build a *readable* label: take the contiguous window spanning the
    // important words (so the glue that makes it legible — "to", "the",
    // "about" — comes back), instead of a telegraphic keyword list.
    const K = kept.map((c) => c.i).sort((a, b) => a - b);
    let lo = K[0], hi = K[K.length - 1];
    let span = allTok.slice(lo, hi + 1);
    if (span.length > maxWords) {
      // important words are spread out — keep the readable head, drop the tail
      span = span.slice(0, maxWords);
    } else {
      // too terse — extend left through glue/quantifiers ("a lot of") for
      // readability, but stop at a clause boundary or a new content word
      while (span.length < Math.min(5, maxWords) && lo > 0) {
        const p = allTok[lo - 1];
        if (CLAUSE_BREAK.has(p.pos) || p.pos === 'PRON' || p.pos === 'PROPN' ||
          p.pos === 'VERB' || (p.pos === 'NOUN' && !WEAK_NOUN.test(p.w))) break;
        lo -= 1; span = allTok.slice(lo, hi + 1);
      }
    }
    // trim leading/trailing glue that doesn't carry meaning — but never an
    // important word itself ("forever" ends "cleaning it up takes forever")
    const keepIdx = new Set(K);
    while (span.length > 2 && LEAD_TRIM.has(span[0].pos) && !keepIdx.has(span[0].i)) span = span.slice(1);
    while (span.length > 2 && TRAIL_TRIM.has(span[span.length - 1].pos) && !keepIdx.has(span[span.length - 1].i)) span = span.slice(0, -1);
    if (span.length < 2) return null;
    let out = span.map((s) => s.w).join(' ').replace(/\s+([',.])/g, '$1');
    out = out.charAt(0).toLowerCase() + out.slice(1);
    return out + (q && !/\?$/.test(out) ? '?' : '');
  } catch (e) {
    return null;
  }
}

const CLAUSE_BREAK = new Set(['CCONJ', 'SCONJ', 'PUNCT']);
const LEAD_TRIM = new Set(['AUX', 'PART', 'CCONJ', 'SCONJ', 'ADP']);
const TRAIL_TRIM = new Set(['AUX', 'PART', 'CCONJ', 'SCONJ', 'ADP', 'DET', 'PRON', 'ADV']);

// Memoized public entry — the label of a given clause at a given length is
// stable across passes, so caching by (text|maxWords) makes re-runs free.
export const noteFor = memoize(noteForImpl, (text, _rank, mw = MAX_WORDS) => text + '|' + mw);

// ---------------------------------------------------------------------------
// Thought naming — a short, chat-style title for the whole recording.
// The best TextRank-scored noun phrase names the subject ("voice notes",
// "empty storefront"); a strongly-ranked verb becomes a gerund lead
// ("Recording Voice Notes"), or the dominant box type adds a flavor word
// ("Notes App Problem") — the way a good auto-namer titles a conversation.
// ---------------------------------------------------------------------------
const SMALL_WORD = /^(a|an|the|of|for|and|or|in|on|to|at|with|about|between)$/i;
const FLAVOR = {
  PROBLEM: 'Problem', CONSTRAINT: 'Tradeoffs', 'OPEN QUESTION': 'Question',
  EVENT: 'Story', OPPORTUNITY: 'Idea', IDEA: 'Idea',
};
const titleCase = (s) => s.split(' ')
  .map((w, i) => (i > 0 && SMALL_WORD.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  .join(' ');

const TITLE_MAX_CHARS = 700; // the subject is named early — title from the head

function titleForImpl(text, rank, dominantType) {
  try {
    rank = rank || rankTranscript(text);
    // parse only the opening so titling stays cheap on a long recording
    const head = text.length > TITLE_MAX_CHARS ? text.slice(0, TITLE_MAX_CHARS) : text;
    const doc = nlp.readDoc(head);
    // maximal noun-phrase runs (ADJ/NOUN/PROPN/NUM), scored by summed rank
    const phrases = new Map(); // lemma-key -> { words, score, n, starts }
    const verbs = [];          // { i, l } for the gerund-lead search
    const posAt = [];          // pos by token index, to spot clause boundaries
    let run = [];
    const flush = () => {
      if (run.length) {
        const key = run.map((t) => t.l).join(' ');
        let score = run.reduce((s, t) => s + (rank.get(t.l) || 0), 0) * (run.length === 1 ? 0.6 : 1);
        if (run.every((t) => t.num)) score *= 0.3; // "nine thirty" is a detail, not a subject
        const p = phrases.get(key);
        if (p) { p.n += 1; p.score = Math.max(p.score, score); p.starts.push(run[0].i); }
        else phrases.set(key, { words: run.map((t) => t.w), score, n: 1, starts: [run[0].i] });
      }
      run = [];
    };
    doc.tokens().each((t) => {
      const pos = t.out(its.pos);
      const w = t.out();
      const i = t.index();
      posAt[i] = pos;
      if (pos === 'VERB' && !WEAK_VERB.test(t.out(its.lemma))) verbs.push({ i, l: t.out(its.lemma) });
      const ok = (pos === 'NOUN' && !WEAK_NOUN.test(w)) || pos === 'PROPN' || pos === 'NUM' ||
        (pos === 'ADJ' && !WEAK_ADJ.test(w) && !t.out(its.stopWordFlag));
      if (ok && run.length < 3) run.push({ w, l: t.out(its.lemma), i, num: pos === 'NUM' });
      else flush();
    });
    flush();
    if (!phrases.size) return null;
    const best = [...phrases.values()]
      .sort((a, b) => b.score * Math.sqrt(b.n) - a.score * Math.sqrt(a.n))[0];
    let words = best.words.slice();
    if (words.length <= 2) {
      // the verb that acts on the phrase leads as a gerund: "renting the wall
      // space" → "Renting Wall Space" — it must sit just before an occurrence
      let verb = null;
      const sameClause = (from, to) => {
        for (let k = from + 1; k < to; k++) {
          if (posAt[k] === 'CCONJ' || posAt[k] === 'SCONJ' || posAt[k] === 'PUNCT') return false;
        }
        return true;
      };
      for (const v of verbs) {
        if (best.words.some((w) => w.toLowerCase().startsWith(v.l))) continue;
        if (!best.starts.some((s) => v.i < s && s - v.i <= 3 && sameClause(v.i, s))) continue;
        const r = rank.get(v.l) || 0;
        if (!verb || r > verb.r) verb = { l: v.l, r };
      }
      if (verb) {
        const ger = compromise(verb.l).tag('Verb').verbs().toGerund().text().replace(/^is /, '');
        if (ger) words = [ger, ...words];
      } else if (dominantType && FLAVOR[dominantType] &&
        !words.some((w) => w.toLowerCase() === FLAVOR[dominantType].toLowerCase())) {
        words = [...words, FLAVOR[dominantType]];
      }
    }
    let title = titleCase(words.join(' '));
    if (title.length > 34) title = title.slice(0, 34).replace(/\s\S*$/, '') + '…';
    return title;
  } catch (e) {
    return null;
  }
}
// key by the head only — once the opening is stable the title stops recomputing
export const titleFor = memoize(titleForImpl, (text, _rank, dom) => text.slice(0, TITLE_MAX_CHARS) + '|' + (dom || ''), 64);
