import { useState } from "react";
import { Arrow, Bar, Caption, Chip, Kpi, Row, Section, Steps, SubTitle, Table, fmt, pct } from "./ReportParts";

// Every figure on this page is taken from the RAG presentation (counted from the catalog CSVs, 14 November 2026).

export const RAG = {
  counts: [
    ["Brands", 131, "catalog_brands. Not embedded."],
    ["Ingredients", 1543, "Embedded. 384 dimensions."],
    ["Products", 335, "Embedded. 384 dimensions."],
    ["Links", 7110, "Label order. Not embedded."],
  ],
  stack: [
    ["Embedder", "all-MiniLM-L6-v2, 384 dimensions"],
    ["Store", "PostgreSQL + pgvector, cosine distance"],
    ["Generator", "Groq, model id qwen/qwen3.8-27b"],
  ],
  blocks: [
    ["User profile", "The signed-in account", "Skin type, tone, conditions, age, allergies, pregnancy", false],
    ["Recommendations", "The rule-based engine", "Top 3 products per category, scored with fixed weights", false],
    ["Retrieved rows", "Vector search. This is the RAG.", "Up to 5 ingredients and 3 products for this question", true],
  ],
  steps: [
    ["Read the account", "Skin type, conditions, allergies, pregnancy or breastfeeding."],
    ["Run the rule-based recommender", "Keep the top 3 products in each category for the prompt."],
    ["Embed the question", "all-MiniLM-L6-v2, the same model that embedded the catalog."],
    ["Cosine search in Postgres", "Nearest 40 ingredients and nearest 20 products, via pgvector."],
    ["Apply the safety rules", "Drop a named allergy. Drop an ingredient whose pregnancy field is yes."],
    ["Ask Groq, then save the trace", "The reply and the retrieved rows are stored on the assistant message."],
  ],
  facts: [
    ["Products marked available in Pakistan", "335 of 335"],
    ["Brands with a country filled in", "16 of 131"],
    ["Distinct ingredients used on a product", "1,060 of 1,543"],
    ["Ingredients listed on one product", "4 minimum, 72 maximum, 21.2 average"],
    ["Links that also store a concentration", "14 of 7,110"],
  ],
  price: { min: 250, median: 1630, mean: 2041, max: 9000 },
  brands: [
    ["CeraVe", "United States", 21],
    ["The Ordinary", "Canada", 16],
    ["La Roche-Posay", "France", 5],
    ["AXIS-Y", "South Korea", 4],
    ["Neutrogena", "United States", 3],
    ["Cetaphil", "Canada", 3],
    ["Simple", "United Kingdom", 3],
    ["Vaseline", "UK / Pakistan", 2],
  ],
  brandsNoCountry: [["Montis Pharma", 14], ["Mazton Pharma", 10], ["Trans Asian Pharma", 9], ["Trasers Pharma", 9]],
  categories: [
    ["treatment", 142], ["cleanser", 76], ["moisturizer", 57], ["sunscreen", 45],
    ["toner", 6], ["exfoliant", 5], ["mask", 3], ["spot treatment", 1],
  ],
  labels: {
    conditions: [["hyperpigmentation", 104], ["common acne", 74], ["dry skin", 62], ["fine lines", 44], ["sun protection", 44]],
    skinTypes: [["combination", 318], ["oily", 315], ["normal", 314], ["dry", 311]],
    age: [["all", 319], ["25+", 16]],
  },
  sampleRow: {
    title: "Acne Dul Anti acne Face wash, 100 ml, Trasers Pharma",
    facts: "cleanser, PKR 1,013, condition common_acne",
    text: "Water, Acrylates Copolymer, Cocamidopropyl Betaine, Sodium Laureth Sulfate, Witch hazel, Salicylic Acid, Aloe, Mandelic Acid, Niacinamide.",
  },
  fill: [
    // [field, filled, of, what it holds]
    ["INCI name", 1542, 1543, "NIACINAMIDE, Retinol, LIMONENE"],
    ["Functions", 1325, 1543, "HUMECTANT; SKIN CONDITIONING"],
    ["Chemical description", 927, 1543, "CosIng-style definition"],
    ["Common allergen", 1543, 1543, "48 true, 1,495 false. Every true row says EU_ANNEX_III"],
    ["Fungal-acne trigger", 1500, 1543, "104 flag a trigger, 1,396 are stored as 0.0"],
    ["Comedogenic rating", 70, 1543, "Scale 0 to 5. Most common value is 0 (29 rows)"],
    ["good_for_conditions", 42, 1543, "common_acne, dry_skin, hyperpigmentation"],
    ["avoid_if_pregnant", 36, 1543, "yes 4, caution 6, no 26"],
  ],
  pregnancyField: { yes: 4, caution: 6, no: 26 },
  marked: [
    ["Retinol", "yes", "Fine lines, acne, pigment", "Pregnancy, eczema, sensitive"],
    ["Tretinoin", "yes", "Fine lines, acne, pigment", "Pregnancy, eczema, sensitive"],
    ["Adapalene", "yes", "Common acne", "Pregnancy, eczema, sensitive"],
    ["Hydroquinone", "yes", "Hyperpigmentation", "Pregnancy"],
    ["Salicylic acid", "caution", "Acne, oiliness, pores", "Eczema, dry skin"],
    ["Glycolic acid", "caution", "Pigment, fine lines", "Eczema, rosacea, sensitive"],
    ["Benzoyl peroxide", "caution", "Common and cystic acne", "Eczema, rosacea, sensitive"],
    ["Sulfur", "caution", "Common acne", "Dry skin, sensitive"],
    ["Lactic acid", "caution", "Dry skin, pigment", "Eczema, sensitive"],
    ["Tea tree leaf oil", "caution", "Common acne", "Eczema, sensitive"],
  ],
  sentences: [
    ["Niacinamide", "NIACINAMIDE. SMOOTHING. good for common_acne, hyperpigmentation, oiliness, rosacea, large_pores. pregnancy no"],
    ["Retinol (shorter: no function, no description)", "Retinol. good for fine_lines, common_acne, hyperpigmentation. avoid for pregnancy, eczema, sensitive_skin. pregnancy yes"],
  ],
  vector: {
    first8: [-0.0315, -0.0581, -0.0068, 0.0175, -0.0263, -0.0738, 0.0787, 0.0697],
    dims: 384,
    ingredients: 1543,
    products: 335,
    props: [
      ["Model", "all-MiniLM-L6-v2, loaded once, local. Groq is not used here."],
      ["Vectors", "1,543 ingredients + 335 products = 1,878"],
      ["Dimensions, and Niacinamide length", "384. L2 norm is 1.0, because vectors are normalised."],
      ["Fine-tuned on this catalog?", "No. The public MiniLM weights are used as they are."],
      ["How they are written", "embed_catalog.py, 64 rows at a time, only where the vector is still null."],
    ],
  },
  stages: [
    ["Search", "Nearest 40 by cosine distance", "Nearest 20 by cosine distance"],
    ["Allergy", "Drop the row if the INCI name contains it", "Drop it if the name or ingredient list contains it"],
    ["Pregnancy", "Drop only avoid_if_pregnant = yes", "Not applied"],
    ["Kept", "First 5 that survive", "First 3 that survive"],
  ],
  reply: [
    ["Endpoint", "https://api.groq.com/openai/v1/chat/completions"],
    ["Model id", "qwen/qwen3.8-27b, unless the server sets GROQ_MODEL"],
    ["temperature / max tokens / timeout", "0.4 / 800 / 90 seconds"],
    ["API key", "GROQ_API_KEY on the server. It is not sent to the browser."],
    ["Label stored in the trace", "Groq - Qwen"],
    ["Where the trace is saved", "chat_messages.rag_trace, on the assistant row only"],
  ],
  promptLine: "Azelaic Acid (ingredient, similarity 0.59): common_acne, rosacea, hyperpigmentation.",
  limits: [
    ["Condition labels are sparse", "42 of 1,543 ingredients have good_for. 15 have avoid_for."],
    ["The embedder is general purpose", "It was not fine-tuned. oily retrieves Oleic Acid at 0.60."],
    ["Pregnancy filter is ingredient-only", "Retinol the ingredient is removed. A retinol serum can still be retrieved."],
    ["The serum, on the pregnancy question", "The Ordinary Retinol 0.2% in Squalane, PKR 3,999, score 0.44, still ranks."],
    ["caution is not a block", "Salicylic acid, glycolic acid, benzoyl peroxide and sulfur stay."],
    ["Allergy match is one substring", "limonene removes LIMONENE. It does not remove the other 47 Annex III names."],
    ["No labelled retrieval test set", "These are four inspected questions, not a precision or recall figure."],
  ],
};

// The four inspected questions. pregnancy: "yes" | "caution" | "no" | undefined (field not shown in the source).
export const DEMOS = [
  {
    key: "pregnancy",
    label: "Retinol in pregnancy",
    question: "Can I use retinol while I am pregnant, or what should I use for acne instead?",
    profile: "Profile flag: pregnant. No allergies.",
    toggle: { kind: "pregnant", label: "Pregnancy flag on the account", on: true },
    ingredients: [
      { name: "Retinol", score: 0.76, pregnancy: "yes" },
      { name: "Tretinoin", score: 0.65, pregnancy: "yes" },
      { name: "Azelaic Acid", score: 0.59, pregnancy: "no" },
      { name: "Benzoyl Peroxide", score: 0.58, pregnancy: "caution" },
      { name: "Adapalene", score: 0.58, pregnancy: "yes" },
      { name: "Sulfur", score: 0.51, pregnancy: "caution" },
      { name: "Sodium Ascorbyl Phosphate", score: 0.51, pregnancy: "no" },
      { name: "Hydroquinone", score: 0.51, pregnancy: "yes" },
      { name: "Glycolic Acid", score: 0.5, pregnancy: "caution" },
    ],
    ingredientNote: "The nearest ingredients, in order. The first five that survive the filter go to the model.",
    products: [],
    takeaway:
      "Retinol is the closest ingredient, at 0.76, and the filter removes it, with Tretinoin, Adapalene and Hydroquinone. The model is shown Azelaic Acid at 0.59 instead. Glycolic Acid, at 0.50, is the fifth survivor. It is caution, so it stays.",
    warning: "Products are not filtered for pregnancy. The Ordinary Retinol 0.2% in Squalane (PKR 3,999, score 0.44) can still rank.",
  },
  {
    key: "acne",
    label: "Acne on oily skin",
    question: "What ingredients and products help acne on oily skin?",
    profile: "Not pregnant, no allergies, so the safety filter removes nothing. The cutoff at 3 products is the only limit.",
    ingredients: [
      { name: "Alcohol Denat.", score: 0.62, note: "Annotated good for oiliness" },
      { name: "Adapalene", score: 0.61, note: "good_for common_acne. Passed through because not pregnant" },
      { name: "Oleic Acid", score: 0.6, note: "No acne label. The embedder puts oily near oleic and oleate" },
    ],
    ingredientNote: "The nearest ingredients on this question (the first three of the five shown to the model).",
    products: [
      { name: "T&H Face Wash 75 ml", brand: "Radiant Health Care", price: "PKR 712.50", score: 0.7, facts: "Cleanser, common acne, oily and combination" },
      { name: "Acnedol Anti acne Serum 15 ml", brand: "Dermagenics", price: "PKR 1,767", score: 0.7, facts: "Treatment, common acne, oily and combination" },
      { name: "Clariderm Anti-Acne Face Wash 60 ml", brand: "", price: "PKR 999", score: 0.67, facts: "Cleanser, common acne" },
    ],
    takeaway:
      "Oleic Acid also scores 0.60 and has no acne label, because a general embedder places the word oily near oleic and oleate. Product retrieval on this question is the cleaner result: the top of the list is acne cleansers and an acne serum, with the catalog prices.",
  },
  {
    key: "allergy",
    label: "Allergy: limonene",
    question: "Is limonene safe, and which fragrance ingredients should I avoid?",
    profile: "Account allergy: limonene.",
    toggle: { kind: "allergy", value: "limonene", label: "Allergy to limonene on the account", on: true },
    ingredients: [
      { name: "LIMONENE", score: 0.69, note: "Function: deodorant, solvent, perfuming" },
      { name: "Carvone", score: 0.61 },
      { name: "Phenethyl Alcohol", score: 0.6 },
      { name: "Lavandula Oil/Extract", score: 0.56 },
    ],
    ingredientNote: "LIMONENE is the nearest ingredient. Two more rows with lower scores complete the five shown to the model.",
    products: [],
    takeaway:
      "Those remaining ingredients can still be Annex III allergens. The filter removed the named allergy, not every allergen. The top products did not contain the substring limonene, so the product list did not change (leading product score 0.47).",
  },
  {
    key: "dry",
    label: "Dry, sensitive skin",
    question: "A dry, sensitive, damaged-barrier question.",
    profile: "The three products that are passed through to the model.",
    ingredients: [],
    products: [
      { name: "MoistBrill whitening serum 30 ml", brand: "Brill Pharma", price: "PKR 1,665", score: 0.56, facts: "Pigment, dry skin, fine lines" },
      { name: "CeraGel TR lotion 236 ml", brand: "Crystolite Pharma", price: "PKR 2,845.25", score: 0.54, facts: "Dry skin" },
      { name: "Hydrobase Emollient Cream 100 g", brand: "Neophar", price: "PKR 840.75", score: 0.54, facts: "Dry skin, sensitive skin" },
    ],
    takeaway: "Hydrobase is the closest clinical match and it is third, at 0.54. The first hit is a whitening serum. Similarity is not a clinical rank.",
  },
];

/**
 * The shortlist rule from the presentation: walk the candidates in order of similarity, drop an ingredient that matches a
 * named allergy (lowercase substring) or whose pregnancy field is exactly "yes" (when pregnant), keep the first `limit` survivors.
 */
export function selectKept(rows, { allergy = "", pregnant = false, limit = 5 } = {}) {
  let kept = 0;
  return rows.map((r) => {
    if (allergy && r.name.toLowerCase().includes(allergy.toLowerCase())) return { ...r, status: "removed", why: "allergy" };
    if (pregnant && r.pregnancy === "yes") return { ...r, status: "removed", why: "pregnancy" };
    if (kept < limit) {
      kept += 1;
      return { ...r, status: "kept", rank: kept };
    }
    return { ...r, status: "beyond" };
  });
}

export const RAG_NAV = [
  ["where", "Where RAG sits"],
  ["dataset", "Dataset"],
  ["row", "What a row holds"],
  ["vector", "Row to vector"],
  ["search", "Search and filter"],
  ["demo", "Live demo"],
  ["reply", "The reply"],
  ["limits", "Limits"],
];

/* ───────────────────────────── pieces ───────────────────────────── */

function PromptBlocks() {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {RAG.blocks.map(([title, from, what, isRag]) => (
          <div key={title} className={`rounded-2xl border p-4 ${isRag ? "border-cocoa bg-paper-alt ring-1 ring-cocoa" : "border-slate-200"}`}>
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className={`text-[11px] font-semibold ${isRag ? "text-cocoa" : "text-slate-400"}`}>{from}</p>
            <p className="mt-2 text-xs text-slate-600">{what}</p>
          </div>
        ))}
      </div>
      <div className="my-3 flex justify-center text-slate-400"><Arrow down /></div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700">
        <span className="rounded-xl border border-slate-200 px-3 py-2">One prompt</span>
        <Arrow />
        <span className="rounded-xl border border-slate-200 px-3 py-2">Groq writes the reply</span>
        <Arrow />
        <span className="rounded-xl border border-slate-200 px-3 py-2">Reply and saved trace</span>
      </div>
    </div>
  );
}

function CountCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {RAG.counts.map(([label, n, hint]) => (
        <Kpi key={label} label={label} value={fmt(n)} hint={hint} />
      ))}
    </div>
  );
}

function BarList({ rows, max, tone = "emerald", suffix = "" }) {
  return (
    <div className="space-y-2.5">
      {rows.map(([label, n, extra]) => (
        <div key={label}>
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-800">{label}{extra ? <span className="ml-2 font-normal text-slate-400">{extra}</span> : null}</span>
            <span className="text-slate-500">{fmt(n)}{suffix}</span>
          </div>
          <Bar value={n} max={max} tone={tone} />
        </div>
      ))}
    </div>
  );
}

function PriceRange() {
  const p = RAG.price;
  const at = (v) => `${((v - p.min) / (p.max - p.min)) * 100}%`;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Minimum" value={`PKR ${fmt(p.min)}`} hint="Lowest catalog price" />
        <Kpi label="Median" value={`PKR ${fmt(p.median)}`} hint="Middle of 335 prices" />
        <Kpi label="Mean" value={`PKR ${fmt(p.mean)}`} hint="Average price" />
        <Kpi label="Maximum" value={`PKR ${fmt(p.max)}`} hint="Highest catalog price" />
      </div>
      <div className="relative mx-2 mt-8 h-2 rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-emerald-200 to-emerald-500" />
        {[["Median", p.median], ["Mean", p.mean]].map(([label, v], i) => (
          <div key={label} className="absolute -top-1" style={{ left: at(v) }}>
            <div className="h-4 w-0.5 bg-slate-800" />
            <p className={`absolute whitespace-nowrap text-[10px] font-semibold text-slate-700 ${i === 0 ? "-translate-x-full pr-1 -top-5" : "top-5 pl-1"}`}>{label} {fmt(v)}</p>
          </div>
        ))}
        <p className="absolute -bottom-5 left-0 text-[10px] text-slate-400">PKR {fmt(p.min)}</p>
        <p className="absolute -bottom-5 right-0 text-[10px] text-slate-400">PKR {fmt(p.max)}</p>
      </div>
      <div className="h-6" />
    </div>
  );
}

function FillBars() {
  return (
    <div className="space-y-3">
      {RAG.fill.map(([field, filled, of, what]) => (
        <div key={field}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
            <span className="font-mono font-semibold text-slate-800">{field}</span>
            <span className="text-slate-500">{fmt(filled)} / {fmt(of)} <span className="text-slate-400">({pct(filled / of, 0)})</span></span>
          </div>
          <Bar value={filled} max={of} tone={filled / of > 0.6 ? "emerald" : filled / of > 0.2 ? "amber" : "rose"} />
          <p className="mt-0.5 text-[11px] text-slate-400">{what}</p>
        </div>
      ))}
    </div>
  );
}

function VectorBars() {
  const vals = RAG.vector.first8;
  const maxAbs = Math.max(...vals.map(Math.abs));
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 p-4">
      <div className="flex min-w-[460px] items-stretch gap-2">
        {vals.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex h-24 w-full flex-col justify-end">
              {v > 0 && <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(v / maxAbs) * 100}%` }} />}
            </div>
            <div className="h-px w-full bg-slate-300" />
            <div className="flex h-24 w-full flex-col justify-start">
              {v < 0 && <div className="w-full rounded-b bg-slate-400" style={{ height: `${(-v / maxAbs) * 100}%` }} />}
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-700">{v.toFixed(4)}</p>
            <p className="text-[10px] text-slate-400">number {i + 1}</p>
          </div>
        ))}
        <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 text-[11px] text-slate-500">
          <span className="font-bold text-slate-700">+{RAG.vector.dims - vals.length}</span>
          <span>more</span>
        </div>
      </div>
    </div>
  );
}

function Funnel() {
  const lanes = [
    ["Ingredients", [["40", "nearest by cosine distance", true], ["Allergy", "drop if the INCI name contains it"], ["Pregnancy", "drop only if avoid_if_pregnant = yes"], ["5", "first five survivors", true]]],
    ["Products", [["20", "nearest by cosine distance", true], ["Allergy", "drop if name or ingredient list contains it"], ["No pregnancy filter", "not applied to products"], ["3", "first three survivors", true]]],
  ];
  return (
    <div className="space-y-4">
      {lanes.map(([title, steps]) => (
        <div key={title}>
          <p className="mb-1.5 text-xs font-bold text-slate-700">{title}</p>
          <div className="flex flex-wrap items-stretch gap-2">
            {steps.map(([big, small, strong], i) => (
              <div key={big} className="flex items-center gap-2">
                <div className={`rounded-xl border px-3 py-2 text-center ${strong ? "border-cocoa bg-paper-alt" : "border-slate-200 bg-white"}`}>
                  <p className={`font-extrabold ${strong ? "text-lg text-cocoa" : "text-xs text-slate-800"}`}>{big}</p>
                  <p className="max-w-[9.5rem] text-[10px] text-slate-500">{small}</p>
                </div>
                {i < steps.length - 1 && <Arrow />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_TONE = { kept: "emerald", removed: "rose", beyond: "slate" };

function ScoreRow({ r }) {
  const removed = r.status === "removed";
  return (
    <div className={`rounded-xl border p-3 ${removed ? "border-rose-200 bg-rose-50/40" : r.status === "kept" ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-semibold text-slate-900 ${removed ? "line-through decoration-rose-400" : ""}`}>{r.name}</p>
        <div className="flex items-center gap-2">
          {r.pregnancy && <span className="text-[10px] text-slate-400">pregnancy: {r.pregnancy}</span>}
          {r.status === "kept" && <Chip tone="emerald">kept #{r.rank}</Chip>}
          {removed && <Chip tone="rose">removed: {r.why === "allergy" ? "named allergy" : "pregnancy = yes"}</Chip>}
          {r.status === "beyond" && <Chip tone="slate">after the first five</Chip>}
          <span className="w-10 text-right text-sm font-extrabold text-slate-900">{r.score.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-1.5"><Bar value={r.score} max={1} tone={STATUS_TONE[r.status] === "rose" ? "rose" : r.status === "beyond" ? "slate" : "emerald"} /></div>
      {r.note && <p className="mt-1 text-[11px] text-slate-500">{r.note}</p>}
    </div>
  );
}

function ProductRow({ p, rank }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{p.name}</p>
        <div className="flex items-center gap-2">
          <Chip tone="emerald">kept #{rank}</Chip>
          <span className="w-10 text-right text-sm font-extrabold text-slate-900">{p.score.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-1.5"><Bar value={p.score} max={1} tone="emerald" /></div>
      <p className="mt-1 text-[11px] text-slate-500">{[p.brand, p.price, p.facts].filter(Boolean).join(" · ")}</p>
    </div>
  );
}

export function RagDemo({ initial = "pregnancy" }) {
  const [key, setKey] = useState(initial);
  const [flags, setFlags] = useState({ pregnancy: true, allergy: true });
  const d = DEMOS.find((x) => x.key === key);
  const on = d.toggle ? flags[d.key] : false;
  const rows = d.ingredients.length
    ? selectKept(d.ingredients, {
        allergy: d.toggle && d.toggle.kind === "allergy" && on ? d.toggle.value : "",
        pregnant: d.toggle && d.toggle.kind === "pregnant" && on,
        limit: 5,
      })
    : [];
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inspected questions">
        {DEMOS.map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={x.key === key}
            onClick={() => setKey(x.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${x.key === key ? "bg-cocoa text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-cocoa"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Question</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{d.question}</p>
        <p className="mt-1 text-xs text-slate-500">{d.profile}</p>
        {d.toggle && (
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={on} onChange={(e) => setFlags((f) => ({ ...f, [d.key]: e.target.checked }))} className="h-4 w-4 accent-emerald-600" />
            {d.toggle.label}
            <span className="font-normal text-slate-400">(switch it off to see what the model would be shown without the rule)</span>
          </label>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-4">
          <SubTitle>Ingredients, nearest first</SubTitle>
          <p className="mb-2 text-xs text-slate-500">{d.ingredientNote}</p>
          <div className="space-y-2">{rows.map((r) => <ScoreRow key={r.name} r={r} />)}</div>
        </div>
      )}

      {d.products.length > 0 && (
        <div className="mt-4">
          <SubTitle>Products passed to the model</SubTitle>
          <div className="space-y-2">{d.products.map((p, i) => <ProductRow key={p.name} p={p} rank={i + 1} />)}</div>
        </div>
      )}

      {d.warning && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{d.warning}</p>}
      <Caption>{d.takeaway}</Caption>
    </div>
  );
}

/* ───────────────────────────── the page body ───────────────────────────── */

export function RagBody() {
  const maxBrand = Math.max(...RAG.brands.map((b) => b[2]), ...RAG.brandsNoCountry.map((b) => b[1]));
  return (
    <div className="space-y-6">
      <Section id="where" n={1} title="Where RAG sits" why="The answer is written from retrieved rows. The chatbot runs only when a signed-in user asks a question, at POST /chatbot/ask/.">
        <PromptBlocks />
        <Caption>
          RAG here means the question picks a few catalog rows. The recommender is a second context block in the same prompt. One is a weighted score,
          the other is nearest-neighbour search.
        </Caption>
        <SubTitle>What happens on POST /chatbot/ask/</SubTitle>
        <Steps steps={RAG.steps} />
        <p className="mt-4 text-xs text-slate-500">
          If retrieval throws, the reply is still written, with an empty list, and the chat panel stays hidden. The panel needs at least one retrieved row.
        </p>
      </Section>

      <Section id="dataset" n={2} title="The dataset" why="Four files in backend/data/fyp_dataset/ are the knowledge base. load_catalog.py copies them into Postgres.">
        <CountCards />
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <SubTitle>The stack</SubTitle>
            {RAG.stack.map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </div>
          <div>
            <SubTitle>Facts counted from the files</SubTitle>
            {RAG.facts.map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </div>
        </div>

        <SubTitle>Where the products came from, and what they cost</SubTitle>
        <p className="mb-3 text-xs text-slate-500">
          Every product source line says the ingredient panel, the PKR price and the stock status were taken from a medishop.pk page on 19 October 2026.
          Function labels use CosIng wording, such as SKIN CONDITIONING and UV FILTER.
        </p>
        <PriceRange />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <SubTitle>What the 335 products are</SubTitle>
            <BarList rows={RAG.categories.map(([c, n]) => [c, n, pct(n / 335)])} max={142} />
          </div>
          <div>
            <SubTitle>Brands with a country stored</SubTitle>
            <BarList rows={RAG.brands.map(([b, c, n]) => [b, n, c])} max={maxBrand} tone="emerald" />
            <p className="mb-2 mt-4 text-[11px] font-semibold text-slate-400">No country stored, but with the most products</p>
            <BarList rows={RAG.brandsNoCountry} max={maxBrand} tone="slate" />
            <p className="mt-2 text-[11px] text-slate-400">Retrieval does not filter on country.</p>
          </div>
        </div>

        <SubTitle>The labels on the products overlap</SubTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {[["Conditions", RAG.labels.conditions], ["Skin types (of 335)", RAG.labels.skinTypes], ["Age band", RAG.labels.age]].map(([title, list]) => (
            <div key={title} className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-2 text-xs font-bold text-slate-800">{title}</p>
              <BarList rows={list} max={335} tone="emerald" />
            </div>
          ))}
        </div>
        <Caption>Skin-type labels are broad: almost every product is labelled for oily, combination, normal and dry skin. Age is "all" on 319 products and 25+ on 16.</Caption>

        <SubTitle>One row you can read out</SubTitle>
        <div className="rounded-2xl border border-slate-200 p-4 text-xs">
          <p className="font-bold text-slate-900">{RAG.sampleRow.title}</p>
          <p className="text-slate-500">{RAG.sampleRow.facts}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Its ingredient text, which is what gets embedded, starts</p>
          <p className="mt-0.5 text-slate-700">{RAG.sampleRow.text}</p>
        </div>
      </Section>

      <Section id="row" n={3} title="What a row contains" why="Ingredient fields and how many of the 1,543 ingredients have them filled. Vector search reads the ingredient row and the product's own ingredient text.">
        <FillBars />
        <Caption>
          The 7,110 link rows are for the rule-based recommender. They are not embedded.
        </Caption>

        <SubTitle>The ten ingredients the pregnancy field marks</SubTitle>
        <p className="mb-3 text-xs text-slate-500">
          The filter removes a row only when avoid_if_pregnant is exactly yes. caution stays in the list and is passed to the model.
          {" "}{RAG.pregnancyField.no} other filled values are no.
        </p>
        <Table
          head={["Ingredient", "Pregnancy field", "Good for", "Avoid for"]}
          rows={RAG.marked.map(([n, f, g, a]) => [n, <Chip key={n} tone={f === "yes" ? "rose" : "amber"}>{f}</Chip>, g, a])}
          min="min-w-[560px]"
        />
        <p className="mt-3 text-xs text-slate-500">
          Tea tree leaf oil is stored as MELALEUCA ALTERNIFOLIA LEAF OIL. An allergy match is a lowercase substring: the account allergy limonene removes the
          ingredient LIMONENE. There are 48 such Annex III names.
        </p>
      </Section>

      <Section id="vector" n={4} title="Row to vector" why="One sentence is embedded, not the raw CSV line. Empty fields are left out.">
        <div className="space-y-3">
          {RAG.sentences.map(([title, text]) => (
            <div key={title}>
              <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-emerald-200">{text}</pre>
            </div>
          ))}
        </div>

        <SubTitle>The first 8 of Niacinamide&apos;s 384 numbers</SubTitle>
        <VectorBars />
        <Caption>
          A vector has no readable parts on its own: no single number means acne or pregnancy. What matters is how close two whole vectors point.
        </Caption>

        <div className="mt-5">
          {RAG.vector.props.map(([k, v]) => <Row key={k} k={k} v={v} />)}
        </div>
      </Section>

      <Section id="search" n={5} title="Search, then filter, then a short list" why="Normalised vectors make cosine similarity the dot product. A score of 0.76 means the question and that row agree by 0.76.">
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center font-mono text-sm text-emerald-200">
          score = round( clip( 1 − cosine distance , 0, 1 ) , 2 )
        </div>
        <p className="mt-2 text-xs text-slate-500">On the four questions in the demo below, catalog scores land between about 0.39 and 0.76.</p>
        <div className="mt-5"><Funnel /></div>
        <div className="mt-6">
          <Table head={["Stage", "Ingredients", "Products"]} rows={RAG.stages} />
        </div>
        <Caption>
          There is no approximate-neighbour index. At 1,878 vectors the search is an exact scan, which is the right scale for this catalog. The detail line
          passed to the model is cut at 180 characters.
        </Caption>
      </Section>

      <Section id="demo" n={6} title="Live demo: four inspected questions" why="Pick a question to see the rows that were retrieved, their scores and what the safety rules did. Switch a rule off to see what the model would have been shown.">
        <RagDemo />
      </Section>

      <Section id="reply" n={7} title="The reply" why="Groq writes from the short list, and the screen shows the same rows.">
        <p className="text-xs text-slate-500">A retrieved line in the prompt looks like this:</p>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-emerald-200">{RAG.promptLine}</pre>
        <div className="mt-4">
          {RAG.reply.map(([k, v]) => <Row key={k} k={k} v={v} />)}
        </div>
        <Caption>
          The chat page is /chatbot. Under the reply, &quot;How this answer was generated&quot; shows the profile, the rows, and a 0 to 1 bar for each score.
          Opening an older session reloads the same trace, so a saved answer can be shown again with the same rows.
        </Caption>
      </Section>

      <Section id="limits" n={8} title="Limitations" why="Stated openly, with the measured fact behind each one.">
        <Table head={["Limit", "The measured fact"]} rows={RAG.limits} min="min-w-[480px]" />
        <Caption>
          The system retrieves from a fixed catalog and shows its evidence. Disease predictions come from the image models, which are a different part of
          TrueTone. The pregnancy and allergy rules are the safety layer that can be demonstrated with these numbers.
        </Caption>

        <SubTitle>The whole path, in one place</SubTitle>
        <div className="flex flex-wrap items-stretch gap-2 text-center text-[11px]">
          {[["Four CSV files", "131 / 1,543 / 335 / 7,110"], ["One sentence per row", "Name, function, conditions, pregnancy"], ["1,878 vectors", "384 numbers, length 1, in pgvector"], ["A bounded search", "40 and 20, then 5 and 3"], ["Two hard filters", "Named allergy, pregnancy = yes"], ["A visible trace", "Reply plus rows plus scores"]].map(([a, b], i, arr) => (
            <div key={a} className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200 px-3 py-2">
                <p className="font-bold text-slate-800">{a}</p>
                <p className="max-w-[9rem] text-slate-500">{b}</p>
              </div>
              {i < arr.length - 1 && <Arrow />}
            </div>
          ))}
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-emerald-200">{"python manage.py load_catalog\npython manage.py embed_catalog"}</pre>
      </Section>
    </div>
  );
}