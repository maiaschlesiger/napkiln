// Role-driven extraction — the schema-first way napkiln fills a structure.
// Instead of "segment everything, then label each piece", each template
// declares the roles it is listening for (a Problem → Solution structure
// listens for a problem, an audience, an opportunity, an open question…).
// Every clause is scored against those roles by a cue lexicon — the phrases
// people actually use to signal each role — and, when the neural boost is on,
// by a zero-shot model scoring the same roles semantically. The single best
// clause for each role becomes one "golden" box; the caller condenses it.
//
// This is what makes the app catch the important bits: it knows what it is
// looking for, so a vague ramble collapses to the few beats that fill the
// structure.
import { neuralEnabled, classifyRoles } from './semantic.js';

// Which roles each structure listens for, in the order they usually surface.
export const TEMPLATE_ROLES = {
  'Problem → Solution': ['CONTEXT', 'AUDIENCE', 'PROBLEM', 'OPPORTUNITY', 'IDEA', 'OPEN QUESTION'],
  'Weighing options': ['GOAL', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'OPEN QUESTION'],
  'Around a question': ['OPEN QUESTION', 'CONTEXT', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT'],
};

// Cue lexicon: [regex, weight]. Higher weight = a stronger, less ambiguous
// signal for that role. Weights are summed per clause; the winning role must
// clear MIN_SCORE.
const CUES = {
  PROBLEM: [
    [/\b(problem|issue|trouble|struggl\w*|frustrat\w*|annoying|pain(ful)?|difficult|tedious|overwhelm\w*|hassle)\b/i, 2],
    [/\b(hard to (get|find|understand|keep|reach|remember|read)|a lot of (information|stuff|detail)|too (long|much|many|slow|complicated|hard)|long.?winded)\b/i, 2],
    [/\b(never (listen|read|look|get|go back)|goes? unheard|can'?t (find|get|keep|remember)|lose track|waste|messy|cluttered)\b/i, 1.5],
    [/\b(hate|don'?t like|wish .* (didn'?t|wouldn'?t)|the (worst|hard part))\b/i, 1],
  ],
  AUDIENCE: [
    // what the audience actually does — the strongest audience signal
    [/\b(they|people|users?|folks|everyone|customers?) \w*\s?(said|say|like|love|want|need|keep|record|use|tend|prefer|struggle|complain|record)\w*\b/i, 2.2],
    [/\b(people (who|that)|users? (who|that|want|need))\b/i, 1.8],
    [/\b(everyone|everybody|customers?|my friends|teammates?|students?|readers?|listeners?|the audience|community|anyone who|those who|a lot of people)\b/i, 1.4],
    [/\b(people|they|others)\b/i, 0.6],
  ],
  OPPORTUNITY: [
    [/\b(what if|it'?d be (cool|great|nice|amazing|useful)|wouldn'?t it be|imagine (if|a))\b/i, 2],
    [/\b(an? (app|tool|feature|product|platform|thing) (that|which|could|to)|i (want to|wanna) (make|build|create)|i could (make|build)|the idea is|there (was|were) (an|a))\b/i, 2],
    [/\b(opportunity|could be a|we could (make|build|do)|build (an|a|something)|create (an|a))\b/i, 1.2],
  ],
  IDEA: [
    [/\b(so that|solves?|fix(es|ed)?|address(es|ed)?|automat\w*|condens\w*|simplif\w*|summari[sz]\w*|streamlin\w*)\b/i, 2],
    [/\b(really just (keep|show|do|surface)|just keep|only keep|only surface|keep (only|just) the|boil (it )?down|strip out|cut (out )?the)\b/i, 2],
    [/\b(the (solution|answer|fix) is|instead (of|it)|we could just|i could just|the way to|by (just )?\w+ing)\b/i, 1.2],
  ],
  'OPEN QUESTION': [
    [/\b(i wonder|the question is|not sure (if|how|whether|what)|still (figuring|working) out|open question)\b/i, 2],
    [/\b(how (do|would|could|can|might|should)|should (i|we)|why (do|does|is|are)|who (owns|would|is|should)|where (do|would)|is there|are there|could we|what'?s the best)\b/i, 1.5],
    [/\?\s*$/, 1.2],
  ],
  CONTEXT: [
    [/^(for a while|lately|these days|recently|historically|a while (ago|back))\b/i, 2.5],
    [/\b(i'?ve\s+been|we'?ve\s+been|usually|normally|typically|every time|tend to|in general|the way it (works|is)|right now|currently|at the moment)\b/i, 1.3],
    // the research/setup framing is context, not the audience itself
    [/\b(talking to (people|users|folks) about|been (looking|thinking|reading) (into|about)|did some (research|digging)|the (setup|situation) is)\b/i, 1.4],
    [/\b(background|context|for context|to be clear)\b/i, 1.2],
  ],
  GOAL: [
    [/\b(the goal is|my goal|i want to|i'?d (love|like) to|i really want|ideally|i'?m trying to|i wish|what i (really )?want|so that i)\b/i, 2],
    [/\b(the (dream|aim|point) is|end goal|i hope to)\b/i, 1.2],
  ],
  CONSTRAINT: [
    [/\b(too (expensive|hard|slow|rigid|clunky|complicated|pricey)|can'?t|cannot|won'?t work|the catch|limitation|constraint|except|the problem with)\b/i, 1.8],
    [/\b(rigid|forced|clunky|no (time|money|budget)|only if|as long as|but only|the tradeoff|downside)\b/i, 1.2],
  ],
  EVENT: [
    [/\b(and then|after that|first|next|finally|eventually|yesterday|last (night|week)|then i)\b/i, 1.5],
  ],
};

const MIN_SCORE = 0.9;      // a clause must clear this for its best role to stick
const NEURAL_MIN = 0.45;    // zero-shot confidence needed to override the cues

export function cueScore(text, role) {
  let s = 0;
  for (const [re, w] of (CUES[role] || [])) if (re.test(text)) s += w;
  return s;
}

// -> [{ ci, type }] — the best clause for each role the template listens for,
// in speaking order. Empty when the template has no role set or too few roles
// filled (caller falls back to discourse segmentation).
export async function assignRoles(clauses, template) {
  const roleSet = TEMPLATE_ROLES[template];
  if (!roleSet) return [];

  const neural = neuralEnabled();
  const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
  const scored = await Promise.all(clauses.map(async (c, ci) => {
    const scores = {};
    let best = null;
    // a 2-word fragment ("they have") condenses to nothing — don't let it win
    // a role; a gentle length term also breaks score ties toward fuller beats
    if (wc(c.text) < 3) return { ci, role: null, score: 0 };
    const lenBonus = Math.min(wc(c.text), 9) * 0.03;
    for (const role of roleSet) {
      const s = cueScore(c.text, role);
      scores[role] = s ? s + lenBonus : 0;
      if (s >= MIN_SCORE && (!best || scores[role] > scores[best])) best = role;
    }
    // when the boost is on, let the model listen for the same roles and
    // override an unsure cue verdict
    if (neural) {
      const nn = await classifyRoles(c.text, roleSet);
      if (nn && nn.score >= NEURAL_MIN && (!best || nn.score >= 0.6)) best = nn.role;
    }
    return { ci, role: best, score: best ? scores[best] : 0 };
  }));

  // keep the single strongest clause per role
  const bestByRole = new Map();
  for (const s of scored) {
    if (!s.role) continue;
    const cur = bestByRole.get(s.role);
    if (!cur || s.score > cur.score) bestByRole.set(s.role, s);
  }
  if (bestByRole.size < 2) return [];

  return [...bestByRole.values()]
    .sort((a, b) => a.ci - b.ci)
    .map((s) => ({ ci: s.ci, type: s.role }));
}
