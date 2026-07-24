// Linguistic signals for the structurer, powered by compromise
// (github.com/spencermountain/compromise) — an in-browser NLP library with
// part-of-speech tagging. Everything here degrades gracefully: on any parser
// hiccup the caller gets the "no signal" answer and the regex heuristics in
// structurer.js still apply.
import nlp from 'compromise';

// True for question-shaped clauses even without a question mark —
// aux-inversion and wh-words ("how do I get people to trust it").
export function isQuestionish(text) {
  try { return nlp(text).questions().length > 0; } catch (e) { return false; }
}

// True when the clause narrates something that happened (any past-tense verb,
// not just ones we enumerated by hand: "she texted me back" → texted).
export function hasPastAction(text) {
  try { return nlp(text).verbs().if('#PastTense').length > 0; } catch (e) { return false; }
}

// Distill a clause to a 3-4 word topic label — the essential nouns, verbs and
// qualifiers, never a sentence. "the rent would be too expensive" → "rent too
// expensive"; "i saw this empty storefront" → "saw empty storefront";
// "i wonder who owns those spaces" → "who owns those spaces?".
// Returns null when no confident topic emerges (caller falls back).
const LINKERS = /^(of|for|between|with|on|about|to)$/i;
const strip = (words) => {
  while (words.length && LINKERS.test(words[words.length - 1])) words.pop();
  return words;
};
const fit = (words, q) => {
  const w = strip(words.slice(0, 4));
  if (w.length < 2) return null;
  let t = w.join(' ');
  t = t.charAt(0).toLowerCase() + t.slice(1);
  return t + (q ? '?' : '');
};

const OPENER_RE = /^(i wonder (if |whether )?|i'?m wondering (if )?|what if |i (think|guess|feel like) (that )?|maybe |perhaps |it feels like |i keep (on )?(wanting|trying|meaning|forgetting) (to )?|i (want|wanted|need|needed) to )/i;
// Fillers and leading discourse markers arrive un-scrubbed from segmentation;
// they'd defeat the anchored opener strip ("um i keep wanting to…")
const PRE_RE = /\b(um+|uh+|erm|hmm|you know|i mean|sort of|kind of|kinda|basically|literally|actually|okay|ok|alright|honestly)\b/gi;
const LEAD_RE = /^((and|but|so|then|also|well|yeah|right|like)\s+)+/i;
// Shared clause pre-scrub: fillers out, leading connectives and hedge
// openers off — what remains is the content the note is about.
export function prepClause(text) {
  return text.replace(PRE_RE, ' ').replace(/\s+/g, ' ').trim()
    .replace(LEAD_RE, '').replace(OPENER_RE, '');
}
const AUX_RE = /^(do|does|did|is|are|was|were|should|could|would|can|will|might)$/i;
const LINKING_RE = /^(feel|feels|felt|seem|seems|seemed|look|looks|looked|sound|sounds|get|gets|got|become|becomes|became)$/i;

export function topicOf(text) {
  try {
    const q = /\?\s*$/.test(text.trim()) || isQuestionish(text);
    const src = prepClause(text);
    const terms = nlp(src).json().flatMap((s) => s.terms).map((t) => ({ w: t.text, tags: t.tags || [] }));
    const has = (t, tag) => t.tags.includes(tag);
    const isN = (t) => (has(t, 'Noun') || has(t, 'ProperNoun')) && !has(t, 'Pronoun');
    const isAdj = (t) => has(t, 'Adjective');
    const isV = (t) => has(t, 'Verb') && !has(t, 'Copula') && !has(t, 'Auxiliary') &&
      !has(t, 'Modal') && !has(t, 'Negative') && !AUX_RE.test(t.w) && !/^(be|been|being|am)$/i.test(t.w);
    const isNeg = (t) => has(t, 'Negative');
    const intens = (t) => /^(too|so|never|no|forever)$/i.test(t.w);
    // nounish: compromise tags words like "notes" as verbs in compounds —
    // accept a Noun tag even when a Verb tag rides along mid-chunk, and a
    // verb-tagged word sitting where only a noun can ("between shops")
    const nounish = (t, prev) => (has(t, 'Noun') && !has(t, 'Pronoun')) ||
      (has(t, 'Verb') && !!prev && (has(prev, 'Preposition') || has(prev, 'Determiner') || has(prev, 'Possessive') || has(prev, 'Adjective')));

    // verb + objects, with infinitive linkers ("wanted to pay") and a leading
    // negative ("never listen")
    const verbChunk = (from, seed) => {
      const rel = terms.slice(from).findIndex(isV);
      if (rel < 0) return null;
      const vi = from + rel;
      const out = [...seed];
      if (vi > from && isNeg(terms[vi - 1])) out.push(terms[vi - 1].w);
      out.push(terms[vi].w);
      let afterLinker = false;
      for (let i = vi + 1; i < terms.length && out.length < 5; i++) {
        const t = terms[i];
        if (isAdj(t) || nounish(t, terms[i - 1]) || isNeg(t) || intens(t) || has(t, 'Value') || (afterLinker && has(t, 'Verb'))) { out.push(t.w); afterLinker = false; }
        // gerund subject + its own verb: "cleaning … takes forever"
        else if (isV(t) && out.length === seed.length + 1 && has(terms[vi], 'Gerund')) out.push(t.w);
        else if (LINKERS.test(t.w) && out.length >= seed.length + 1 &&
          terms.slice(i + 1, i + 3).some((x) => has(x, 'Noun') || has(x, 'Verb'))) { out.push(t.w); afterLinker = true; }
        else if (has(t, 'Determiner') || has(t, 'Possessive') || has(t, 'Pronoun') || has(t, 'Adverb')) continue;
        else if (out.length > seed.length + 1) break;
      }
      return out.length >= 2 ? out : null;
    };

    // wh-question head: keep the question word, skip its aux+pronoun
    // ("how do I get…" → "how get people…")
    if (terms.length && has(terms[0], 'QuestionWord')) {
      let from = 1;
      while (from < terms.length && (AUX_RE.test(terms[from].w) || has(terms[from], 'Pronoun'))) from++;
      const out = verbChunk(from, [terms[0].w]) || verbChunk(1, [terms[0].w]);
      if (out) return fit(out, q);
    }
    // subject … copula/modal/linking-verb … qualifier tail:
    // "rent too expensive", "mind maps too rigid", "notes app total mess"
    const ci = terms.findIndex((t) => has(t, 'Copula') || /^(would|could|will|might|should|be)$/i.test(t.w) || LINKING_RE.test(t.w));
    if (ci > 0) {
      const subj = [];
      for (let i = ci - 1; i >= 0 && subj.length < 2; i--) {
        if (isN(terms[i]) || (subj.length && isAdj(terms[i]))) subj.unshift(terms[i].w);
        // a pronoun/verb/clause-boundary before any noun means the true
        // subject isn't a noun phrase — don't reach across it into an
        // earlier clause ("…voice notes when i am out on walks")
        else if (subj.length || has(terms[i], 'Pronoun') || has(terms[i], 'Verb') ||
          has(terms[i], 'Preposition') || has(terms[i], 'Conjunction') || has(terms[i], 'QuestionWord')) break;
      }
      const tail = [];
      let linkOk = false;
      for (let i = ci + 1; i < terms.length && subj.length + tail.length < 4; i++) {
        const t = terms[i];
        if (isAdj(t) || nounish(t, terms[i - 1]) || isNeg(t) || intens(t) || has(t, 'Gerund')) { tail.push(t.w); linkOk = true; }
        else if (linkOk && LINKERS.test(t.w) && terms.slice(i + 1, i + 3).some((x) => has(x, 'Noun') || has(x, 'Verb'))) tail.push(t.w);
      }
      // a pronoun subject ("it could be a shared thing…") topics on the
      // predicate alone
      if (tail.length >= (subj.length ? 1 : 2)) return fit(subj.concat(strip(tail)), q);
    }
    // subject noun(s) + their verb: "app cleaned itself" → "app cleaned",
    // "my friends loved it", "nobody wanted to pay"
    for (let i = 0; i < terms.length; i++) {
      if (!isN(terms[i]) && !/^(nobody|someone|everyone|everybody|people)$/i.test(terms[i].w)) continue;
      const run = [terms[i].w];
      let j = i + 1;
      while (j < terms.length && isN(terms[j]) && run.length < 2) run.push(terms[j++].w);
      const near = terms.slice(j, j + 3).findIndex(isV);
      if (near < 0) break;
      const out = verbChunk(j, run);
      if (out) return fit(out, q);
      break;
    }
    // verb + object: "saw empty storefront", "record voice notes"
    const vb = verbChunk(0, []);
    if (vb) return fit(vb, q);
    // best adjective/noun chunk: "shared thing between shops"
    let best = null;
    for (let i = 0; i < terms.length; i++) {
      if (!(isAdj(terms[i]) || isN(terms[i]))) continue;
      const out = [];
      let score = 0;
      for (let j = i; j < terms.length && out.length < 4; j++) {
        const t = terms[j];
        if (nounish(t)) { out.push(t.w); score += 3; }
        else if (isAdj(t)) { out.push(t.w); score += 2; }
        else if (isNeg(t) || intens(t)) { out.push(t.w); score += 1; }
        else if (LINKERS.test(t.w) && out.length && terms.slice(j + 1, j + 3).some(nounish)) out.push(t.w);
        else break;
      }
      if (out.length >= 2 && (!best || score > best.score)) best = { out, score };
    }
    if (best) return fit(best.out, q);
    return null;
  } catch (e) {
    return null;
  }
}

// Split a marker-less run-on into clauses at subject–verb boundaries.
// Speech like "I built a little prototype my friends loved it nobody wanted
// to pay for it" carries three beats with no connective at all; POS tags find
// the seams: a new clause starts at a subject-ish token, after the current
// clause already has its verb, with another verb (plus object) coming up.
const SUBJ_TAGS = ['Pronoun', 'Noun', 'ProperNoun', 'Determiner', 'Possessive'];
const BLOCK_PREV = ['Preposition', 'Determiner', 'Adjective', 'Conjunction', 'Possessive', 'Verb', 'Negative', 'QuestionWord'];

export function splitRunOn(text) {
  try {
    if (text.split(/\s+/).filter(Boolean).length < 8) return [text];
    // What-if musings and wondered questions are one box by nature
    if (/^(what if|i wonder|i'?m wondering|imagine|how |why |should |who |where )/i.test(text.trim())) return [text];
    const terms = nlp(text).json().flatMap((s) => s.terms);
    const has = (t, tag) => t.tags && t.tags.includes(tag);
    const isVerb = (t) => has(t, 'Verb');
    const cuts = [0];
    let lastCut = 0, verbInClause = false;
    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      const prev = terms[i - 1];
      // a plain "and"/"or" also opens a new beat when a subject + verb follow
      // ("…voice memos and mind maps are too rigid"); the verb-lookahead below
      // keeps noun coordination ("shops and cafes") intact
      const prevAnd = !!prev && has(prev, 'Conjunction') && /^(and|or)$/i.test(prev.text);
      const subjish = SUBJ_TAGS.some((tag) => has(t, tag)) &&
        !has(t, 'Conjunction') && !has(t, 'Preposition');
      if (
        i > lastCut && verbInClause &&
        ((subjish && (prevAnd || (
          !BLOCK_PREV.some((tag) => has(prev, tag)) &&
          // "notes app" is one compound, not a seam — but only for true common
          // nouns (compromise tags pronouns/possessives as Noun subtypes too)
          !(has(t, 'Noun') && !has(t, 'Pronoun') && !has(t, 'Possessive') &&
            has(prev, 'Noun') && !has(prev, 'Pronoun'))
        ))) ||
        // gerund subject after "and": "…total mess and cleaning it up takes forever"
        (prevAnd && has(t, 'Gerund')))
      ) {
        let vAt = -1;
        for (let j = i; j < Math.min(i + 5, terms.length); j++) {
          if (isVerb(terms[j])) { vAt = j; break; }
        }
        // the upcoming verb must not end the sentence (a bare "my friends
        // loved" is a relative clause, not a new beat)
        if (vAt >= 0 && vAt < terms.length - 1 && i - lastCut >= 3 && terms.length - i >= 3) {
          cuts.push(i);
          lastCut = i;
          verbInClause = false;
          continue;
        }
      }
      if (isVerb(t)) verbInClause = true;
    }
    if (cuts.length === 1) return [text];
    return cuts.map((c, k) =>
      terms.slice(c, cuts[k + 1] ?? terms.length).map((t) => t.text).join(' '));
  } catch (e) {
    return [text];
  }
}
