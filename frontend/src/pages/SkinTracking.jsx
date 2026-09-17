import { Calendar } from "lucide-react";
import StatCard from "../components/StatCard";

const history = [
  { date: "Feb 1", score: 72, notes: "Started new moisturizer" },
  { date: "Feb 5", score: 74, notes: "Less dryness" },
  { date: "Feb 10", score: 76, notes: "Redness reduced" },
  { date: "Feb 15", score: 75, notes: "Minor breakout" },
  { date: "Feb 20", score: 78, notes: "Hydration improved" },
];

const SkinTracking = () => {
  const latest = history[history.length - 1];
  const prev = history[history.length - 2];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm text-slate-500">Skin Tracking</p>
          <h1 className="text-3xl font-bold">Progress Dashboard</h1>
          <p className="mt-2 text-slate-600">View your recent skin health trend and analysis history.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Current Score" value={String(latest.score)} change="+2 pts" positive />
          <StatCard label="Best Score" value="78" />
          <StatCard label="Entries" value={String(history.length)} />
          <StatCard label="Trend" value={latest.score > prev.score ? "Up" : "Down"} change={`${Math.abs(latest.score - prev.score)} pts`} positive={latest.score >= prev.score} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Score Trend</h2>
              <p className="text-sm text-slate-500">How your skin score changed over time.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" /> Updated Daily
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {history.map((item) => (
              <div key={item.date} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">{item.date}</p>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{item.score}</p>
                <p className="mt-2 text-xs text-slate-600">{item.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkinTracking;
