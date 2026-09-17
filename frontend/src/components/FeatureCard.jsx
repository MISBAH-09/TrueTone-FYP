const FeatureCard = ({ icon, title, description, onClick, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-6 text-left hover:-translate-y-1 transition-transform bg-white/80 border border-slate-200 shadow-sm ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 text-emerald-700">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </button>
  );
};

export default FeatureCard;
