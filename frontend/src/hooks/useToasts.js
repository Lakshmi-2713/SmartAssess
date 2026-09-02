import { useCallback, useEffect, useRef, useState } from "react";

let seq = 0;
const nextToastId = () => {
  seq += 1;
  return `t${Date.now()}_${seq}`;
};

/**
 * Toast queue with per-toast timers.
 *
 * A single shared timeout meant a burst of messages all expired together;
 * each toast now owns its timer and every timer is cleared on unmount.
 */
export function useToasts(defaultDuration = 4000) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, duration = defaultDuration) => {
      const id = nextToastId();
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [defaultDuration, dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  return {
    toasts,
    dismiss,
    success: useCallback((m, d) => push("success", m, d), [push]),
    error: useCallback((m, d) => push("error", m, d ?? 6000), [push]),
    info: useCallback((m, d) => push("info", m, d), [push]),
    warning: useCallback((m, d) => push("warning", m, d), [push]),
  };
}

export default useToasts;
