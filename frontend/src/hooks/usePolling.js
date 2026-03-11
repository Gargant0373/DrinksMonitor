import { useState, useEffect, useRef } from "react";

/**
 * Polls `fetchFn` every `intervalMs` milliseconds.
 * Returns { data, error, loading }.
 */
export function usePolling(fetchFn, intervalMs = 3000) {
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const result = await fnRef.current();
        if (!cancelled) { setData(result); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return { data, error, loading };
}
