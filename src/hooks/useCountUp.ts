import { useEffect, useState, useRef } from 'react';

/**
 * Anima de 0 até `to` com easing easeOutExpo.
 * @param to valor final
 * @param duration ms (default 1200)
 * @param delay ms antes de iniciar (default 0)
 */
export function useCountUp(to: number, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (to === 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    let startTs = 0;
    let timer: number | undefined;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    timer = window.setTimeout(() => {
      startedRef.current = true;
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return value;
}
