// Tiny bounded LRU memoizer for the NLP helpers. Live structuring re-runs on a
// debounce while you talk, and most clauses don't change between passes — so
// caching each parse/condense by its text makes every pass after the first
// nearly free, which is what keeps a long recording from bogging the UI down.
export function memoize(fn, keyOf = (...a) => a.join(''), max = 256) {
  const cache = new Map();
  return (...args) => {
    const key = keyOf(...args);
    if (cache.has(key)) {
      const v = cache.get(key);       // touch → most-recently-used
      cache.delete(key); cache.set(key, v);
      return v;
    }
    const v = fn(...args);
    cache.set(key, v);
    if (cache.size > max) cache.delete(cache.keys().next().value); // evict oldest
    return v;
  };
}
