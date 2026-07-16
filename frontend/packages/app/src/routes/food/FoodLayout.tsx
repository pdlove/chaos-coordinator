import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SegmentedToggle } from "../../components/SegmentedToggle";

export function FoodLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname.includes("/food/recipes") ? "recipes" : "menu";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-none flex-col gap-3 px-5 pb-3 pt-1.5">
        <div className="text-2xl font-extrabold text-ink">Food</div>
        <SegmentedToggle
          value={active}
          onChange={(v) => navigate(`/food/${v}`)}
          options={[
            { value: "menu", label: "Menu" },
            { value: "recipes", label: "Recipes" },
          ]}
        />
      </div>
      <Outlet />
    </div>
  );
}
