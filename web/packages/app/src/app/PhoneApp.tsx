import { Navigate, Route, Routes } from "react-router-dom";
import { useHousehold, useRealtimeInvalidation, useSession } from "@chaos-coordinator/core";
import { LoginScreen } from "../routes/auth/LoginScreen";
import { BottomNav } from "../components/BottomNav";
import { CalendarPage } from "../routes/calendar/CalendarPage";
import { ChoresLayout } from "../routes/chores/ChoresLayout";
import { ChoresList } from "../routes/chores/ChoresList";
import { HouseholdTasksList } from "../routes/chores/HouseholdTasksList";
import { ProjectsList } from "../routes/chores/ProjectsList";
import { ProjectDetail } from "../routes/chores/ProjectDetail";
import { ChoreGroupSettings } from "../routes/chores/ChoreGroupSettings";
import { ShoppingPage } from "../routes/shopping/ShoppingPage";
import { BillsPage } from "../routes/bills/BillsPage";
import { FoodLayout } from "../routes/food/FoodLayout";
import { MenuPage } from "../routes/food/MenuPage";
import { RecipesPage } from "../routes/food/RecipesPage";
import { MorePage } from "../routes/more/MorePage";
import { BottomBarSettings } from "../routes/more/BottomBarSettings";
import { PeopleSettings } from "../routes/more/PeopleSettings";
import { StubPage } from "../routes/more/StubPage";

export function PhoneApp() {
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: household } = useHousehold();

  useRealtimeInvalidation(household?.id);

  if (sessionLoading) return null;

  if (!session?.currentUserId) {
    return <LoginScreen />;
  }

  return (
    <div className="mx-auto flex h-screen max-w-[480px] flex-col bg-app">
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/chores" element={<ChoresLayout />}>
          <Route index element={<Navigate to="/chores/list" replace />} />
          <Route path="list" element={<ChoresList />} />
          <Route path="household" element={<HouseholdTasksList />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="settings" element={<ChoreGroupSettings />} />
        </Route>
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/food" element={<FoodLayout />}>
          <Route index element={<Navigate to="/food/menu" replace />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="recipes" element={<RecipesPage />} />
        </Route>
        <Route path="/more" element={<MorePage />} />
        <Route path="/more/bottom-bar" element={<BottomBarSettings />} />
        <Route path="/more/people" element={<PeopleSettings />} />
        <Route path="/more/wall-pairing" element={<StubPage title="Wall display pairing" />} />
        <Route path="/more/notifications" element={<StubPage title="Notifications" />} />
        <Route path="/more/settings" element={<StubPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
