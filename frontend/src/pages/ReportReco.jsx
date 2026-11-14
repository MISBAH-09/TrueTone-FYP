import { useState } from "react";
import { Arrow, Bar, Caption, Chip, Kpi, Row, Section, Steps, SubTitle, Table, fmt } from "./ReportParts";

// Everything on this page describes recommendation_engine.py as it is written, plus counts from the RAG presentation.

export const RECO = {
  weights: { skinType: 3, condition: 3, good: 1, goodCap: 3, avoid: -2, avoidCap: -6, age: 1 },
  minScore: 0.01,
  topN: 5,
  chatbotTop: 3,
  priceBand: 0.15,
  rules: [
    ["type", "Skin type match", "+3", "emerald", "The product's suitable skin types include the user's skin type."],
    ["cond", "Condition match", "+3", "sky", "The product targets a condition on the profile. Both acne types count as one."],
    ["good", "Helpful ingredients", "+1 each, up to +3", "emerald", "Ingredients annotated as good for one of the user's conditions."],
    ["avoid", "Ingredients to avoid", "\u22122 each, down to \u22126", "rose", "Ingredients annotated as to avoid for one of the user's conditions. Each one also adds a warning."],
    ["age", "Age relevance", "+1", "amber", "The product is aimed at the user's age bracket: teen, 18-24, 25-34 or 35+."],
  ],
  steps: [
    ["Read the profile", "Skin type, conditions, tone, age bracket, allergies, pregnancy or breastfeeding, and products already in use."],
    ["Take every product in the catalog", "335 products. Each one is joined to its ingredients through the 7,110 link rows."],
    ["Apply the safety blocks", "Before any scoring: a named allergy blocks the product, and so does an ingredient marked avoid_if_pregnant = yes for a pregnant or breastfeeding user."],
    ["Skip products already in use", "A product the user already uses is left out completely, not just ranked lower."],
    ["Score what is left", "Five rules, best case 10 points. A rule that needs information the user has not given does not count."],
    ["Drop what scores 0.01 or less", "A product that matches nothing about this user is not a recommendation. Only a count is reported."],
    ["Rank and cut", "Group by category, sort by points (ties: fewer warnings, then name), keep the top 5 per category."],
  ],
  safety: [
    ["Allergy", "A product is blocked when one of its ingredients has exactly the name of a flagged allergy (case ignored).", "Reported with the reason: Contains X, which you flagged as an allergy."],
    ["Pregnancy or breastfeeding", "A product is blocked when any ingredient has avoid_if_pregnant = yes. caution does not block.", "Reported with the reason: Contains X, not recommended during pregnancy/breastfeeding."],
    ["Already in use", "A product the user already uses is excluded entirely.", "Not listed."],
    ["Skin tone", "An ingredient's tone note becomes a warning on the product. It never blocks and never changes the score.", "Shown as a warning."],
  ],
  compare: [
    ["Ranks by", "A fixed point score, best case 10", "Cosine similarity, 0 to 1"],
    ["Allergy rule", "Exact ingredient name", "Lowercase substring"],
    ["Pregnancy rule", "Blocks the whole product if any ingredient is yes", "Drops ingredient rows that are yes. Products are not filtered"],
    ["Blocked items", "Returned in excluded_for_safety with the reason", "Not shown to the model"],
    ["Output", "Top 5 per category (the chatbot prompt takes the top 3)", "Up to 5 ingredients and 3 products per question"],
    ["Reads", "Products, ingredients and the 7,110 link rows", "The embedded ingredient rows and product rows"],
  ],
  usedBy: [
    ["Recommendations page", "Shows the points badge, the out-of numbers and the per-rule breakdown for each product."],
    ["Chatbot", "The top 3 products per category become a block of the prompt, next to the retrieved rows."],
    ["Product scanner", "A scanned label is scored with the same allergy, pregnancy and ingredient rules. Skin type and age points need a catalog product, so they are not applied."],
  ],
  limits: [
    ["Weights are set by hand", "3, 3, 1, 3, 2, 6 and 1 are judgement calls. The code notes they should be tuned against real dermatological judgement."],
    ["Skin-type labels are broad", "315 of 335 products are labelled oily and 318 combination, so the +3 for skin type rarely tells products apart."],
    ["Ingredient notes are sparse", "42 of 1,543 ingredients have a good-for note, so helpful-ingredient points are earned rarely."],
    ["The age point rarely applies", "It needs the product's age label to equal the user's bracket. 319 of 335 products are labelled all, which never earns it."],
    ["Safety rules go by ingredient name", "An ingredient that is unlisted, or written under another name, is not caught. The allergy match is exact."],
    ["Prices are a band", "Shown as the recorded price plus or minus 15%, rounded to 10 rupees. The source is medishop.pk, 19 October 2026."],
    ["No labelled test set", "The ranking has not been compared with a dermatologist's ranking."],
  ],
};

/**
 * The engine's scoring (recommendation_engine.py, _score_product and _max_score), on yes/no inputs.
 * input: hasType, typeMatch, hasConditions, condMatch, goodHits, avoidHits, hasAge, ageMatch
 */
export function scoreProfile(input) {
  const W = RECO.weights;
  const rows = [];
  let score = 0;

  const typePts = input.hasType && input.typeMatch ? W.skinType : 0;
  score += typePts;
  if (input.hasType) rows.push({ key: "type", label: "Skin type match", points: typePts, max: W.skinType });

  const condPts = input.hasConditions && input.condMatch ? W.condition : 0;
  score += condPts;
  if (input.hasConditions) rows.push({ key: "cond", label: "Condition match", points: condPts, max: W.condition });

  // ingredient hits only exist when the profile has a condition to compare with
  const goodPts = input.hasConditions ? Math.min(input.goodHits * W.good, W.goodCap) : 0;
  const avoidPts = input.hasConditions ? Math.max(input.avoidHits * W.avoid, W.avoidCap) : 0;
  score += goodPts + avoidPts;
  if (input.hasConditions) {
    rows.push({ key: "good", label: "Helpful ingredients", points: goodPts, max: W.goodCap });
    rows.push({ key: "avoid", label: "Ingredients to avoid", points: avoidPts, max: 0 });
  }

  const agePts = input.hasAge && input.ageMatch ? W.age : 0;
  score += agePts;
  if (input.hasAge) rows.push({ key: "age", label: "Age relevance", points: agePts, max: W.age });

  const max = (input.hasType ? W.skinType : 0) + (input.hasConditions ? W.condition + W.goodCap : 0) + (input.hasAge ? W.age : 0);
  return { score, max, rows, shown: score > RECO.minScore };
}

export const PRESETS = {
  best: { label: "Best case", v: { hasType: true, typeMatch: true, hasConditions: true, condMatch: true, goodHits: 3, avoidHits: 0, hasAge: true, ageMatch: true } },
  good: { label: "Good match, one risky ingredient", v: { hasType: true, typeMatch: true, hasConditions: true, condMatch: true, goodHits: 2, avoidHits: 1, hasAge: true, ageMatch: false } },
  nothing: { label: "Matches nothing", v: { hasType: true, typeMatch: false, hasConditions: true, condMatch: false, goodHits: 0, avoidHits: 0, hasAge: true, ageMatch: false } },
  bare: { label: "Profile with only a skin type", v: { hasType: true, typeMatch: true, hasConditions: false, condMatch: false, goodHits: 0, avoidHits: 0, hasAge: false, ageMatch: false } },
};

export const RECO_NAV = [
  ["fit", "How it works"],
  ["score", "Scoring rules"],
  ["try", "Try the scoring"],
  ["safety", "Safety rules"],
  ["rank", "Ranking and output"],
  ["limits", "Limits"],
];

/* ───────────────────────────── pieces ───────────────────────────── */

const RULE_TONE = { type: "bg-emerald-600", cond: "bg-emerald-800", good: "bg-emerald-300", avoid: "bg-rose-400", age: "bg-amber-400" };

function PointsBar() {
  const parts = [["Skin type", 3, "bg-emerald-600 text-white"], ["Condition", 3, "bg-emerald-800 text-white"], ["Helpful ingredients", 3, "bg-emerald-300 text-slate-900"], ["Age", 1, "bg-amber-400 text-slate-900"]];
  return (
    <div>
      <div className="flex h-9 overflow-hidden rounded-xl">
        {parts.map(([label, n, tone]) => (
          <div key={label} className={`flex items-center justify-center text-[11px] font-bold ${tone}`} style={{ width: `${n * 10}%` }} title={`${label}: ${n}`}>
            +{n}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        {parts.map(([label, n]) => (
          <span key={label} style={{ width: `${n * 10}%` }} className="truncate pr-1">{label}</span>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Best case is <span className="font-bold text-slate-800">10</span> points. Ingredients to avoid take points away, down to a total of{" "}
        <span className="font-bold text-rose-700">&minus;6</span>, so a product can score below zero.
      </p>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
      <span>
        <span className="block font-semibold text-slate-800">{label}</span>
        {hint && <span className="text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

function Stepper({ label, hint, value, min = 0, max = 5, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs">
      <span>
        <span className="block font-semibold text-slate-800">{label}</span>
        {hint && <span className="text-slate-400">{hint}</span>}
      </span>
      <span className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer: ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="h-7 w-7 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50">&minus;</button>
        <span className="w-4 text-center text-sm font-extrabold text-slate-900" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More: ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="h-7 w-7 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50">+</button>
      </span>
    </div>
  );
}

export function ScoreCalculator() {
  const [v, setV] = useState(PRESETS.good.v);
  const set = (k) => (val) => setV((s) => ({ ...s, [k]: val }));
  const r = scoreProfile(v);
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button key={key} type="button" onClick={() => setV(p.v)} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400">
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">What the profile contains</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="A skin type" checked={v.hasType} onChange={set("hasType")} />
              <Toggle label="A skin condition" checked={v.hasConditions} onChange={set("hasConditions")} />
              <Toggle label="An age bracket" checked={v.hasAge} onChange={set("hasAge")} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">What this product has</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Suits the skin type" checked={v.typeMatch} onChange={set("typeMatch")} />
              <Toggle label="Targets the condition" checked={v.condMatch} onChange={set("condMatch")} />
              <Stepper label="Helpful ingredients" hint="+1 each, up to +3" value={v.goodHits} onChange={set("goodHits")} />
              <Stepper label="Ingredients to avoid" hint={"\u22122 each, down to \u22126"} value={v.avoidHits} max={4} onChange={set("avoidHits")} />
              <Toggle label="Aimed at the age bracket" hint="Most products say all, which earns nothing" checked={v.ageMatch} onChange={set("ageMatch")} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">The product scores</p>
          <p className="mt-1 text-4xl font-extrabold text-slate-900" data-testid="score">
            {r.score}
            <span className="text-lg font-bold text-slate-400"> of {r.max}</span>
          </p>
          <div className="mt-4 space-y-2.5">
            {r.rows.length === 0 && <p className="text-xs text-slate-500">The profile has nothing to match against, so no rule can earn a point.</p>}
            {r.rows.map((row) => (
              <div key={row.key}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{row.label}</span>
                  <span className={`font-bold ${row.points < 0 ? "text-rose-700" : row.points > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                    {row.points > 0 ? "+" : row.points < 0 ? "\u2212" : ""}{Math.abs(row.points)} <span className="font-normal text-slate-400">{row.max > 0 ? `of ${row.max}` : ""}</span>
                  </span>
                </div>
                <Bar value={Math.abs(row.points)} max={row.max > 0 ? row.max : 6} tone={row.points < 0 ? "rose" : "emerald"} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            {r.shown ? <Chip tone="emerald">Shown, if it is in the top 5 of its category</Chip> : <Chip tone="rose">Hidden: it scores 0.01 or less, so it is not a recommendation</Chip>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── the page body ───────────────────────────── */

export function RecoBody() {
  return (
    <div className="space-y-6">
      <Section id="fit" n={1} title="How the recommendation engine works" why="A rule-based, content-filtering engine. It does not learn. It filters for safety, then scores each product with fixed rules.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Best score" value="10" hint="Skin type 3, condition 3, ingredients 3, age 1" />
          <Kpi label="Products scored" value={fmt(335)} hint="Every request looks at all of them" />
          <Kpi label="Kept per category" value={RECO.topN} hint={`The chatbot prompt takes ${RECO.chatbotTop}`} />
          <Kpi label="Links used" value={fmt(7110)} hint="Product to ingredient rows" />
        </div>
        <SubTitle>The steps, for every request</SubTitle>
        <Steps steps={RECO.steps} />
        <Caption>
          Two lists come back with the ranking. excluded_for_safety names every product that was blocked, with the reason. not_relevant_count is only a count of
          the products that matched nothing.
        </Caption>

        <SubTitle>Where the score is used</SubTitle>
        <div className="grid gap-3 md:grid-cols-3">
          {RECO.usedBy.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-900">{t}</p>
              <p className="mt-1 text-xs text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="score" n={2} title="The scoring rules" why="Five rules add up to a score. The weights are fixed numbers in the code.">
        <div className="mb-6"><PointsBar /></div>
        <div className="space-y-2">
          {RECO.rules.map(([key, label, points, , text]) => (
            <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${RULE_TONE[key]}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs font-bold text-slate-700">{points}</p>
                </div>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <Caption>
          The &quot;out of&quot; number depends on the profile. A rule that needs something the user has not given, such as a skin condition, cannot earn points, so it does not
          count toward the total. A profile with a skin type, a condition and an age bracket is out of 10.
        </Caption>
      </Section>

      <Section id="try" n={3} title="Try the scoring" why="Change what the profile contains and what the product has. The score is worked out with the engine's own rules.">
        <ScoreCalculator />
      </Section>

      <Section id="safety" n={4} title="Safety rules" why="Hard blocks that run before any scoring, so an unsafe product never gets a score at all.">
        <Table head={["Rule", "What it does", "What the user sees"]} rows={RECO.safety} min="min-w-[560px]" />
        <SubTitle>The same ideas in the chatbot&apos;s search, side by side</SubTitle>
        <Table head={["", "Recommendation engine", "RAG retrieval"]} rows={RECO.compare} min="min-w-[560px]" />
        <Caption>
          The two apply different rules. The recommender decides what to suggest, so it blocks whole products. The retrieval step only picks rows
          for the model to read, so it filters ingredient rows.
        </Caption>
      </Section>

      <Section id="rank" n={5} title="Ranking and output" why="What survives the score is cut down to a short list per category.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <SubTitle>The order</SubTitle>
            <ol className="space-y-2 text-xs text-slate-700">
              {[["1", "More points first."], ["2", "Fewer warnings next."], ["3", "Then the product name, A to Z."]].map(([n, t]) => (
                <li key={n} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">{n}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <SubTitle>What comes out</SubTitle>
            <Row k="Per category" v={`Top ${RECO.topN}`} />
            <Row k="Price shown as" v="Recorded price, plus or minus 15%, to the nearest 10 rupees" />
            <Row k="Each product carries" v="Score, out-of number, reasons, warnings, per-rule breakdown" />
            <Row k="Products that score 0.01 or less" v="Left out, counted only" />
            <Row k="Other entry points" v="Alternatives for a product in use, and scanned labels" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
          {["335 products", "Safety blocks", "Score", "Cut at 0.01", "Sort", "Top 5 per category"].map((t, i, arr) => (
            <span key={t} className="flex items-center gap-2">
              <span className="rounded-xl border border-slate-200 px-3 py-2">{t}</span>
              {i < arr.length - 1 && <Arrow />}
            </span>
          ))}
        </div>
      </Section>

      <Section id="limits" n={6} title="Limitations" why="Stated openly, with the measured fact behind each one.">
        <Table head={["Limit", "Why it matters"]} rows={RECO.limits} min="min-w-[480px]" />
      </Section>
    </div>
  );
}