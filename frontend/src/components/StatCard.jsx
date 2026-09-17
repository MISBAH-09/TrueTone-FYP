const StatCard = ({ label, value, change, positive }) => {
  return (
    <div className="rounded-2xl p-5 bg-white/90 border border-slate-200 shadow-sm">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          {positive ? "↑" : "↓"} {change}
        </p>
      )}
    </div>
  );
};

export default StatCard;
