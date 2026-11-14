import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-[var(--tt-paper)] text-[var(--tt-ink)]">
      <AppSidebar />
      <main className="min-h-screen min-w-0 flex-1 px-3 pb-20 pt-3 sm:px-4 md:ml-60 md:px-5 md:pb-8 md:pt-5 lg:px-6 lg:pt-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
