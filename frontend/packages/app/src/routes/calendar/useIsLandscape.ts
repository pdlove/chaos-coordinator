import { useEffect, useState } from "react";

/** True when the viewport is wider than it is tall. Used to show more days at once in the Week
 * schedule grid when a phone/tablet is rotated to landscape. */
export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(() => window.matchMedia("(orientation: landscape)").matches);

  useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape)");
    const update = () => setIsLandscape(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isLandscape;
}
