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
  MessageCircle,
  Layers,
  BarChart3,
  FileText,
  MoreHorizontal,
  X,
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

const examinerItems = [
  { title: "Pipeline Inspector", path: "/inspector", icon: Layers },
  { title: "Evaluation Lab", path: "/evaluation", icon: BarChart3 },
  { title: "Model Report", path: "/report", icon: FileText },
];

const mobilePrimary = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("truetone_token");
    localStorage.removeItem("truetone_user_id");
    navigate("/");
  };

  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return [
      "flex items-center gap-3 rounded-[var(--tt-radius)] px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "border-l-[3px] border-[var(--tt-primary)] bg-[var(--tt-primary-muted)] pl-[9px] text-[var(--tt-ink)]"
        : "border-l-[3px] border-transparent text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]",
    ].join(" ");
  };

  const renderDesktopLink = (item) => {
    const Icon = item.icon;
    return (
      <Link key={item.path} to={item.path} className={linkClass(item.path)}>
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>{item.title}</span>
      </Link>
    );
  };

  const moreActive =
    [...navItems.slice(4), ...examinerItems].some((item) => item.path === location.pathname) ||
    moreOpen;

  return (
    <>
      {/* Desktop Clinical sidebar — visible from 768px */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r border-[var(--tt-border)] bg-[var(--tt-surface)] md:flex">
        <div className="flex items-center border-b border-[var(--tt-border)] px-4 py-4">
          <TrueToneLogo />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map(renderDesktopLink)}

          <div className="mt-3 space-y-0.5 border-t border-[var(--tt-border)] pt-3">
            <p className="px-3 pb-1 text-xs font-medium text-[var(--tt-secondary)]">Evaluation Metrics</p>
            {examinerItems.map(renderDesktopLink)}
          </div>
        </nav>

        <div className="border-t border-[var(--tt-border)] p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-[var(--tt-radius)] px-3 py-2 text-sm font-medium text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar — below 768px */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-[var(--tt-border)] bg-[var(--tt-surface)] md:hidden">
        {mobilePrimary.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                isActive ? "text-[var(--tt-primary)]" : "text-[var(--tt-secondary)]"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="truncate px-0.5">{item.title.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            moreActive ? "text-[var(--tt-primary)]" : "text-[var(--tt-secondary)]"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[var(--tt-ink)]/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--tt-ink)]">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius)] text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {navItems.slice(4).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={linkClass(item.path)}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 space-y-0.5 border-t border-[var(--tt-border)] pt-3">
              <p className="px-3 pb-1 text-xs font-medium text-[var(--tt-secondary)]">Lab</p>
              {examinerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={linkClass(item.path)}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 border-t border-[var(--tt-border)] pt-3">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-[var(--tt-radius)] px-3 py-2 text-sm font-medium text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppSidebar;
