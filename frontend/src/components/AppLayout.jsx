import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-[var(--tt-paper)] text-[var(--tt-ink)]">
      <AppSidebar />
      <main className="min-h-screen min-w-0 flex-1 px-4 pb-20 pt-4 md:ml-64 md:px-8 md:pb-8 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
