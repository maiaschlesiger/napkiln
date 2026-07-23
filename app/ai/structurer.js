// napkiln AI structurer — turns a rolling transcript into the thought graph
// shown while recording: typed boxes (PROBLEM, OPPORTUNITY, …) joined by
// labeled connections. Two engines behind one async interface:
//   HeuristicStructurer — on-device, zero dependencies, instant
//   ClaudeStructurer    — Claude API (direct browser access, structured JSON);
//                         used when an API key is configured, falls back to
//                         the heuristic on any failure.
// Exposed as window.NapkilnAI.{createStructurer, HeuristicStructurer, ClaudeStructurer}.
(function () {
  const TEAL = '#1F8A96', CLAY = '#E0824E';
  const KEY_STORAGE = 'napkiln-anthropic-key';
  const NODE_TYPES = ['PROBLEM', 'CONTEXT', 'OPPORTUNITY', 'IDEA', 'CONSTRAINT', 'OPEN QUESTION'];
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

  function classify(seg) {
    const s = cleanText(seg).toLowerCase();
    if (/^(i wonder|how (do|would|could|can|should)|should i|do i|is (it|there)|are there|why )/.test(s) || /\?\s*$/.test(s)) return 'OPEN QUESTION';
    if (/\b(problem|issue|annoying|frustrat\w*|pain(ful)?|struggle|never (listen|open|look|go back)|go(es)? unheard|doesn'?t work|hate|hard to)\b/.test(s)) return 'PROBLEM';
    if (/^(but|however|though|except)\b/.test(s) || /\b(rigid|can'?t|cannot|won'?t work|limitation|constraint|the catch|too (hard|slow|clunky|expensive|rigid)|feels? (rigid|forced|wrong|clunky))\b/.test(s)) return 'CONSTRAINT';
    if (/\b(what if|imagine|we could|i could|could be|maybe (we|i|it)|opportunity|the idea is|it would be (cool|great|nice)|visuali[sz]e|wouldn'?t it be)\b/.test(s)) return 'OPPORTUNITY';
    if (/^(when(ever)?|while|usually|normally|lately|every time|i keep|i always|i often|these days|context)\b/.test(s)) return 'CONTEXT';
    return 'IDEA';
  }

  function edgeLabel(prevType, nextType) {
    if (nextType === 'CONSTRAINT') return 'but';
    if (nextType === 'OPEN QUESTION') return 'raises';
    if (prevType === 'PROBLEM') return 'led to';
    if (prevType === 'CONTEXT') return 'so';
    if (nextType === 'OPPORTUNITY') return 'so';
    if (prevType === 'CONSTRAINT') return 'still';
    return 'then';
  }

  function segment(transcript) {
    return transcript
      .split(/(?<=[.?!])\s+|\n+/)
      .flatMap((s) => (s.length > 90 ? s.split(/,\s+(?=but\b|so\b|and then\b)|;\s+/) : [s]))
      .map((s) => s.trim())
      .filter((s) => cleanText(s).split(' ').filter(Boolean).length >= 3);
  }

  class HeuristicStructurer {
    constructor() { this.engine = 'on-device'; }
    async structure(transcript) {
      const nodes = [], edges = [], seen = new Set();
      for (const seg of segment(transcript)) {
        const type = classify(seg);
        const text = summarize(seg);
        const key = type + '|' + text;
        if (!text || seen.has(key)) continue;
        seen.add(key);
        if (nodes.length) edges.push({ label: edgeLabel(nodes[nodes.length - 1].type, type) });
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

  class ClaudeStructurer {
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

  function getApiKey() { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; } }
  function setApiKey(k) { try { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE); } catch (e) { /* private mode */ } }
  function createStructurer() {
    const key = getApiKey();
    return key ? new ClaudeStructurer(key) : new HeuristicStructurer();
  }

  window.NapkilnAI = Object.assign(window.NapkilnAI || {}, {
    HeuristicStructurer, ClaudeStructurer, createStructurer, getApiKey, setApiKey,
  });
})();
