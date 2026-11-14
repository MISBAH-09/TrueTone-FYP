import { useEffect, useState } from "react";
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
  BookOpen,
  ChevronDown,
} from "lucide-react";
import TrueToneLogo from "./TrueToneLogo";
import { getUserProfile } from "../services/user";

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
];

// Model Report dropdown — same pattern as Reports (routes already exist).
const modelReportItems = [
  { title: "Overview", path: "/report" },
  { title: "Skin Type", path: "/report/type" },
  { title: "Skin Tone", path: "/report/tone" },
  { title: "Skin Condition", path: "/report/condition" },
];

const MODEL_REPORT_PATHS = new Set(modelReportItems.map((item) => item.path));

// The Reports dropdown: reports about parts of the system that are not one model.
const reportItems = [
  { title: "RAG", path: "/report/rag" },
  { title: "Recommendation Engine", path: "/report/recommendation" },
  { title: "Database Schema", path: "/report/schema" },
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
  const [role, setRole] = useState(
    () => localStorage.getItem("truetone_role") || "end_user"
  );
  const isEvaluator = role === "evaluator";

  useEffect(() => {
    let active = true;
    getUserProfile()
      .then((res) => {
        if (active && res?.data?.role) {
          setRole(res.data.role);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("truetone_token");
    localStorage.removeItem("truetone_user_id");
    localStorage.removeItem("truetone_role");
    navigate("/");
  };

  const isOn = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Exact match for Model Report pages so /report does not light up RAG / Recommendation.
  const isModelReportLink = (path) => location.pathname === path;
  const onModelReport = MODEL_REPORT_PATHS.has(location.pathname);

  const onSystemReport = reportItems.some((r) => r.path && isOn(r.path));

  const [modelReportOpen, setModelReportOpen] = useState(onModelReport);
  const [reportsOpen, setReportsOpen] = useState(onSystemReport);

  useEffect(() => {
    if (onModelReport) setModelReportOpen(true);
  }, [onModelReport]);

  useEffect(() => {
    if (onSystemReport) setReportsOpen(true);
  }, [onSystemReport]);

  const linkClass = (path) => {
    const isActive = isOn(path);
    return [
      "flex items-center gap-3 rounded-[var(--tt-radius)] px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "border-l-[3px] border-[var(--tt-primary)] bg-[var(--tt-primary-muted)] pl-[9px] text-[var(--tt-ink)]"
        : "border-l-[3px] border-transparent text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]",
    ].join(" ");
  };

  const subLinkClass = (path, exact = false) => {
    const active = exact ? isModelReportLink(path) : isOn(path);
    return [
      "flex items-center gap-2 rounded-[var(--tt-radius)] py-1.5 pl-[9px] pr-2 text-[13px] font-medium transition-colors",
      active
        ? "border-l-[3px] border-[var(--tt-primary)] bg-[var(--tt-primary-muted)] text-[var(--tt-ink)]"
        : "border-l-[3px] border-transparent text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]",
    ].join(" ");
  };

  const renderModelReportGroup = (onNavigate) => (
    <div>
      <button
        type="button"
        onClick={() => setModelReportOpen((open) => !open)}
        aria-expanded={modelReportOpen}
        aria-controls={modelReportOpen ? "sidebar-model-report" : undefined}
        className={`flex w-full items-center gap-3 rounded-[var(--tt-radius)] border-l-[3px] border-transparent px-3 py-2 text-sm font-medium transition-colors ${
          onModelReport
            ? "text-[var(--tt-ink)]"
            : "text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
        }`}
      >
        <FileText className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">Model Report</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${modelReportOpen ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {modelReportOpen && (
        <div id="sidebar-model-report" className="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--tt-border)] pl-2">
          {modelReportItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={subLinkClass(item.path, true)}
            >
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const renderReportsGroup = (onNavigate) => (
    <div>
      <button
        type="button"
        onClick={() => setReportsOpen((open) => !open)}
        aria-expanded={reportsOpen}
        aria-controls={reportsOpen ? "sidebar-reports" : undefined}
        className={`flex w-full items-center gap-3 rounded-[var(--tt-radius)] border-l-[3px] border-transparent px-3 py-2 text-sm font-medium transition-colors ${
          onSystemReport
            ? "text-[var(--tt-ink)]"
            : "text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
        }`}
      >
        <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 text-left">Reports</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${reportsOpen ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>
      {reportsOpen && (
        <div id="sidebar-reports" className="ml-4 mt-0.5 space-y-0.5 border-l border-[var(--tt-border)] pl-2">
          {reportItems.map((item) =>
            item.path ? (
              <Link key={item.title} to={item.path} onClick={onNavigate} className={subLinkClass(item.path)}>
                <span>{item.title}</span>
              </Link>
            ) : (
              <div
                key={item.title}
                aria-disabled="true"
                className="flex items-center justify-between gap-2 border-l-[3px] border-transparent py-1.5 pl-[9px] pr-2 text-[13px] font-medium text-[var(--tt-secondary)] opacity-60"
              >
                <span>{item.title}</span>
                <span className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] px-1.5 text-[10px] font-semibold">Soon</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );

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
    (isEvaluator
      ? [...examinerItems, ...modelReportItems, ...reportItems.filter((r) => r.path)]
      : navItems.slice(4)
    ).some((item) =>
      MODEL_REPORT_PATHS.has(item.path) ? isModelReportLink(item.path) : isOn(item.path)
    ) || moreOpen;

  return (
    <>
      {/* Desktop Clinical sidebar — visible from 768px */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r border-[var(--tt-border)] bg-[var(--tt-surface)] md:flex">
        <div className="flex items-center border-b border-[var(--tt-border)] px-4 py-4">
          <TrueToneLogo />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {isEvaluator ? (
            <div className="space-y-0.5">
              <p className="px-3 pb-1 text-xs font-medium text-[var(--tt-secondary)]">Evaluation Metrics</p>
              {examinerItems.map(renderDesktopLink)}
              {renderModelReportGroup()}
              {renderReportsGroup()}
            </div>
          ) : (
            navItems.map(renderDesktopLink)
          )}
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
        {(isEvaluator ? examinerItems : mobilePrimary).map((item) => {
          const Icon = item.icon;
          const isActive = isOn(item.path);
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
            {isEvaluator ? (
              <div className="space-y-0.5">
                <p className="px-3 pb-1 text-xs font-medium text-[var(--tt-secondary)]">Evaluation Metrics</p>
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
                {renderModelReportGroup(() => setMoreOpen(false))}
                {renderReportsGroup(() => setMoreOpen(false))}
              </div>
            ) : (
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
            )}
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
