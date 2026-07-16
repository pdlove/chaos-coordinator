import { useNavigate } from "react-router-dom";

export function StubPage({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none items-center gap-2.5 px-5 pb-1 pt-1.5">
        <button onClick={() => navigate("/more")} className="text-lg">
          ←
        </button>
        <span className="text-xl font-extrabold text-ink">{title}</span>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm font-medium text-ink-muted">Coming soon.</div>
    </div>
  );
}
