import { Star } from "lucide-react";

const recommendations = [
  {
    name: "CeraVe Moisturizing Cream",
    brand: "CeraVe",
    type: "Moisturizer",
    match: 95,
    rating: 4.8,
    reason: "Contains ceramides and hyaluronic acid, ideal for dry & sensitive skin.",
    tags: ["Fragrance-Free", "Dermatologist Recommended"],
  },
  {
    name: "La Roche-Posay Anthelios SPF 50",
    brand: "La Roche-Posay",
    type: "Sunscreen",
    match: 92,
    rating: 4.7,
    reason: "Broad spectrum protection, suitable for sensitive skin.",
    tags: ["SPF 50+", "Non-Comedogenic"],
  },
  {
    name: "The Ordinary Hyaluronic Acid 2%",
    brand: "The Ordinary",
    type: "Serum",
    match: 89,
    rating: 4.6,
    reason: "Hydrating serum that supports skin moisture retention.",
    tags: ["Vegan", "Alcohol-Free"],
  },
];

const Recommendations = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm text-slate-500">Recommendations</p>
          <h1 className="text-3xl font-bold">Personalized Product Picks</h1>
          <p className="mt-2 text-slate-600">Products curated for your skin type and goals.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {recommendations.map((item) => (
            <div key={item.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Star className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.reason}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{tag}</span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{item.match}% match</span>
                <span>{item.rating} ★</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
