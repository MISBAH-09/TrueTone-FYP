import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScanFace,
  FlaskConical,
  Sparkles,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import TrueToneLogo from "./TrueToneLogo";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Skin Analysis", path: "/skin-analysis", icon: ScanFace },
  { title: "Product Scanner", path: "/product-scanner", icon: FlaskConical },
  { title: "Recommendations", path: "/recommendations", icon: Sparkles },
  { title: "Skin Tracking", path: "/skin-tracking", icon: TrendingUp },
  { title: "AI Chatbot", path: "/chatbot", icon: MessageCircle },
  { title: "Profile", path: "/profile", icon: User },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("truetone_token");
    localStorage.removeItem("truetone_user_id");
    navigate("/");
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full z-50 bg-slate-950 text-slate-100 border-r border-slate-800 transition-all duration-300 flex flex-col ${
          collapsed ? "w-0 lg:w-16 overflow-hidden" : "w-64"
        }`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          {!collapsed && <TrueToneLogo />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 lg:hidden" />
            <Menu className="w-4 h-4 hidden lg:block" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) setCollapsed(true);
                }}
                className={`flex items-center ${
                  collapsed ? "justify-center" : "gap-3"
                } px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out (FIXED) */}
        <div className="p-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSignOut}
            className={`w-full text-left flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            } px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white transition-colors`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Open button (when collapsed on mobile) */}
      <button
        onClick={() => setCollapsed(false)}
        className={`fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-950 border border-slate-800 shadow-sm hover:bg-slate-900 transition-colors ${
          collapsed ? "block" : "hidden"
        }`}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>
    </>
  );
};

export default AppSidebar;