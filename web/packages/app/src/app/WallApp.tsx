import { Route, Routes } from "react-router-dom";
import { useHousehold, useRealtimeInvalidation, useWallStore } from "@chaos-coordinator/core";
import { useIdleTimer } from "../wall-routes/useIdleTimer";
import { WallDashboard } from "../wall-routes/WallDashboard";
import { WallCalendarFull } from "../wall-routes/WallCalendarFull";
import { WallChoresFull } from "../wall-routes/WallChoresFull";
import { WallIdleScreen } from "../wall-routes/WallIdleScreen";

export function WallApp() {
  const { data: household } = useHousehold();
  useRealtimeInvalidation(household?.id);
  useIdleTimer();
  const idle = useWallStore((s) => s.idle);

  if (idle) return <WallIdleScreen />;

  return (
    <Routes>
      <Route path="/wall" element={<WallDashboard />} />
      <Route path="/wall/calendar" element={<WallCalendarFull />} />
      <Route path="/wall/chores" element={<WallChoresFull />} />
      <Route path="/wall/chores/:userId" element={<WallChoresFull />} />
      <Route path="*" element={<WallDashboard />} />
    </Routes>
  );
}
