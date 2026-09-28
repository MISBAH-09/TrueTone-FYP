import React from 'react';

export const ResultTabs = ({ tabs, activeTabKey, onSelectTab }) => {
  return (
    <div className="w-full flex items-center justify-center gap-3 sm:gap-6 py-4 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTabKey;
        const score = Math.round((tab.confidence ?? 0.75) * 100);

        return (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className="flex flex-col items-center group transition-all shrink-0 focus:outline-none"
          >
            {/* Circular Score Badge matching reference image 5 and 14 */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl transition-all duration-200 border-2 shadow-sm ${
                isActive
                  ? `${tab.activeBg || 'bg-orange-500 text-white border-transparent scale-105 shadow-md ring-4 ring-orange-200'}`
                  : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 group-hover:scale-102'
              }`}
            >
              {score}
            </div>

            {/* Label below circle */}
            <span
              className={`mt-2 text-xs sm:text-sm font-semibold max-w-[90px] text-center leading-tight transition-colors ${
                isActive ? 'text-slate-900 font-bold' : 'text-slate-500 group-hover:text-slate-800'
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
