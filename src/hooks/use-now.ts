import { useEffect, useState } from "react";

/** Re-render on an interval so relative times and timers stay fresh. */
export function useNow(ms = 1000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}
