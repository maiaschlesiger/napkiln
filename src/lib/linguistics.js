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
      if (
        i > lastCut && verbInClause &&
        SUBJ_TAGS.some((tag) => has(t, tag)) &&
        !has(t, 'Conjunction') && !has(t, 'Preposition') &&
        !BLOCK_PREV.some((tag) => has(terms[i - 1], tag))
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
