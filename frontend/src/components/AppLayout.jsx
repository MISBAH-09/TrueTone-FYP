import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen flex w-full bg-slate-100 text-slate-900">
      <AppSidebar />
      <main className="flex-1 lg:ml-64 min-h-screen p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
