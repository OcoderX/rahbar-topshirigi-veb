import { useEffect, useState } from 'react';

/**
 * Hook to smoothly animate a number counting up from current value to target value.
 * @param {number} target - The destination number
 * @param {number} duration - Total animation time in ms (default: 600)
 */
export function useCountUp(target = 0, duration = 650) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTimestamp = null;
    let initialVal = count;

    function step(timestamp) {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(initialVal + (end - initialVal) * easedProgress);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    }

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return count;
}
