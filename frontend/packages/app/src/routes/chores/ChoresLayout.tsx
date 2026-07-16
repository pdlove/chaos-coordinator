import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSessionStore } from "@chaos-coordinator/core";
import { SegmentedToggle } from "../../components/SegmentedToggle";
import { PinPrompt } from "../../components/PinPrompt";

type SubTab = "chores" | "household" | "projects";

export function ChoresLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pinElevated = useSessionStore((s) => s.pinElevated);
  const [showPinPrompt, setShowPinPrompt] = useState(false);

  function openGroups() {
    if (pinElevated) navigate("/chores/settings");
    else setShowPinPrompt(true);
  }

  const isTopLevelTab = ["/chores/list", "/chores/household", "/chores/projects"].includes(location.pathname);
  const active: SubTab = location.pathname.includes("/chores/household")
    ? "household"
    : location.pathname.includes("/chores/projects")
      ? "projects"
      : "chores";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isTopLevelTab && (
        <div className="flex flex-none flex-col gap-3 px-5 pb-3.5 pt-1.5">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-ink">Chores & Tasks</div>
            {active === "chores" && (
              <button onClick={openGroups} className="text-[11px] font-bold text-ink-muted">
                Groups
              </button>
            )}
          </div>
          <SegmentedToggle
            value={active}
            onChange={(v) => navigate(`/chores/${v === "chores" ? "list" : v}`)}
            options={[
              { value: "chores", label: "Chores" },
              { value: "household", label: "Household" },
              { value: "projects", label: "Projects" },
            ]}
          />
        </div>
      )}
      <Outlet />
      {showPinPrompt && (
        <PinPrompt
          onCancel={() => setShowPinPrompt(false)}
          onSuccess={() => {
            setShowPinPrompt(false);
            navigate("/chores/settings");
          }}
        />
      )}
    </div>
  );
}
