import { useEffect, useState } from "react";

export function WallIdleScreen() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3.5 bg-[#100F0D]">
      <div className="text-[96px] font-extrabold tracking-tight text-white">
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </div>
      <div className="text-xl font-semibold text-white/60">
        {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="mt-7 text-[13px] font-semibold text-white/35">Tap anywhere to wake</div>
    </div>
  );
}
