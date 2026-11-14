import React from "react";

export const ResultTabs = ({ tabs, activeTabKey, onSelectTab }) => {
  return (
    <div className="no-scrollbar flex w-full items-center justify-center gap-3 overflow-x-auto py-3 sm:gap-5">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        const score = Math.round((tab.confidence ?? 0.75) * 100);

        return (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className="group flex shrink-0 flex-col items-center transition-colors focus:outline-none"
          >
            <div
              className={`tt-mono flex h-12 w-12 items-center justify-center rounded-[var(--tt-radius)] border text-sm font-medium transition-colors sm:h-14 sm:w-14 sm:text-base ${
                isActive
                  ? `${tab.activeBg || "bg-[var(--tt-primary)] text-white border-[var(--tt-primary)]"}`
                  : "border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] group-hover:border-[var(--tt-primary)]"
              }`}
            >
              {score}
            </div>
            <span
              className={`mt-2 max-w-[90px] text-center text-xs leading-tight sm:text-sm ${
                isActive
                  ? "font-semibold text-[var(--tt-ink)]"
                  : "font-medium text-[var(--tt-secondary)] group-hover:text-[var(--tt-ink)]"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
