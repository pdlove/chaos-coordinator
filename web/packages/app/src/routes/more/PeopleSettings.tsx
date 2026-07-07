import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHousehold, type UserDto } from "@chaos-coordinator/core";
import { Avatar } from "../../components/Avatar";
import { PinPrompt } from "../../components/PinPrompt";
import { UserEditModal } from "./UserEditModal";

export function PeopleSettings() {
  const navigate = useNavigate();
  const { data: household } = useHousehold();
  const [pinTarget, setPinTarget] = useState<"new" | UserDto | null>(null);
  const [editing, setEditing] = useState<"new" | UserDto | null>(null);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/more")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">People &amp; roles</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-5 pt-2.5">
        {household?.users.map((u) => (
          <button key={u.id} onClick={() => setPinTarget(u)} className="flex items-center gap-3 rounded-card bg-card p-3.5 text-left shadow-sm">
            <Avatar initials={u.initials} color={u.color} size={36} />
            <div className="flex-1">
              <div className="text-sm font-bold text-ink">{u.name}</div>
              <div className="text-[11px] font-medium text-ink-faint">
                {u.role}
                {u.hasPin && " · PIN set"}
              </div>
            </div>
            <span className="text-ink-faint">›</span>
          </button>
        ))}

        <button
          onClick={() => setPinTarget("new")}
          className="flex h-12 items-center justify-center gap-2 rounded-card-lg border-[1.5px] border-dashed border-ink-fainter text-sm font-bold text-ink-muted"
        >
          + Add person (PIN)
        </button>
      </div>

      {pinTarget && (
        <PinPrompt
          onCancel={() => setPinTarget(null)}
          onSuccess={() => {
            setEditing(pinTarget);
            setPinTarget(null);
          }}
        />
      )}
      {editing && (
        <UserEditModal
          user={editing === "new" ? null : editing}
          order={household?.users.length ?? 0}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
