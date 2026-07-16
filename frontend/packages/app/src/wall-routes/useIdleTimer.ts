import { useEffect } from "react";
import { useWallStore } from "@chaos-coordinator/core";

const IDLE_TIMEOUT_MS = 90_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown"] as const;

/** Drops the wall display to the ambient clock screen after a period of no touch input, and
 * wakes on the next tap anywhere — the kitchen-tablet "lock screen" behavior from the design. */
export function useIdleTimer() {
  const setIdle = useWallStore((s) => s.setIdle);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
    };

    resetTimer();
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, resetTimer);

    return () => {
      clearTimeout(timer);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, resetTimer);
    };
  }, [setIdle]);
}
