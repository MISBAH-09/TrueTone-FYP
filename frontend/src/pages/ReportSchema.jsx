import { useState } from "react";
import { Caption, Kpi, Row, Section, Steps, SubTitle, Table, fmt } from "./ReportParts";

/* ════════════════════════════════════════════════════════════════════════════
   DATABASE SCHEMA REPORT — Evaluation Metrics > Reports > Database Schema
   Every table, column, key, constraint, and seeded row count comes directly
   from backend/{Users,Scanner,Chatbot,Catalog}/models.py and the live catalog.
   ════════════════════════════════════════════════════════════════════════════ */

export const SCHEMA_NAV = [
  ["overview", "Engine & scale"],
  ["erd", "ER diagram"],
  ["volume", "Table summary & volume"],
  ["dictionary", "Column dictionary"],
  ["relations", "Keys & cascades"],
  ["security", "Security & lifecycle"],
];

export const SCHEMA = {
  tablesCount: 10,
  appsCount: 4,
  columnsCount: 105,
  foreignKeysCount: 7,
  seededRows: 9119, // 131 + 335 + 1543 + 7110
  vectorRows: 1878, // 1543 ingredients + 335 products
  vectorDims: 384,
  engineStack: [
    ["Database engine", "PostgreSQL 15+ (configured via DATABASE_URL / dj_database_url)"],
    ["Cloud / pooler target", "Supabase PostgreSQL (CONN_MAX_AGE = 0 for transaction/session pooler safety)"],
    ["Vector extension", "pgvector — VectorField(dimensions=384) with cosine distance"],
    ["Embedding model", "sentence-transformers / all-MiniLM-L6-v2 (721,152 total stored floats)"],
    ["ORM & migrations", "Django 5.2 ORM across 4 stateful apps (Users, Scanner, Chatbot, Catalog)"],
    ["Media file storage", "Filesystem MEDIA_ROOT (/media/scans/ and /media/product_scans/) referenced by ImageField"],
  ],
};

const DOMAINS = [
  { key: "all", label: "All tables (10)" },
  { key: "identity", label: "Identity & RBAC (2)" },
  { key: "clinical", label: "Scans & Tracking (2)" },
  { key: "chat", label: "Chatbot & Trace (2)" },
  { key: "catalog", label: "Catalog & Vectors (4)" },
];

const TABLES = [
  {
    table: "users",
    model: "Users.User",
    domain: "identity",
    domainLabel: "Identity & RBAC",
    rowsLabel: "Runtime (1 per account)",
    seeded: null,
    pk: "id (BigAutoField)",
    purpose:
      "Core user account, authentication token, role-based access flag, password-recovery lockout state, and the live 7-question skin profile read by Recommendations, Scanner, and Chatbot.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Surrogate primary key referenced by scans and chat sessions."],
      ["username", "varchar(150)", ["UNIQUE", "INDEX"], "required", "Unique login handle indexed for fast lookup."],
      ["email", "varchar(254)", ["UNIQUE", "INDEX"], "required", "Unique email address verified alongside username in recovery."],
      ["password", "varchar(256)", ["HASH"], "required", "Django PBKDF2-SHA256 salted password hash (never plaintext)."],
      ["role", "varchar(20)", ["RBAC"], "'end_user'", "Session role ('end_user' or 'evaluator') set on login."],
      ["token", "varchar(256)", ["TOKEN"], "null", "SHA-256 bearer session token checked by @require_token."],
      ["is_active", "boolean", [], "true", "Soft account activation flag."],
      ["first_name", "varchar(100)", [], "''", "Optional given name shown on dashboard."],
      ["last_name", "varchar(100)", [], "''", "Optional family name."],
      ["profile", "text", [], "null", "Optional base64 avatar image."],
      ["recovery_question", "varchar(32)", [], "''", "Selected security question key (first_school, childhood_nickname, first_pet)."],
      ["recovery_answer_hash", "varchar(256)", ["HASH"], "''", "PBKDF2 hash of normalized recovery answer."],
      ["password_reset_failed_attempts", "smallint", [], "0", "Counter for consecutive failed recovery answers (locks at 5)."],
      ["password_reset_locked_until", "timestamptz", [], "null", "15-minute cooldown timestamp after 5 failed reset attempts."],
      ["onboarding_completed", "boolean", [], "false", "Gates /recommendations and dashboard until profile setup finishes."],
      ["age_bracket", "varchar(10)", [], "''", "Age group: teen, 18-24, 25-34, or 35+."],
      ["gender", "varchar(20)", [], "''", "male, female, or prefer_not_to_say."],
      ["skin_tone", "varchar(20)", [], "''", "Active skin tone: fair, medium, or dark."],
      ["skin_type", "varchar(20)", [], "''", "Active skin type: oily, combination, dry, or normal."],
      ["skin_disease", "varchar(255)", [], "''", "Comma-separated active conditions matching CNN classes."],
      ["skin_image", "text", [], "null", "Base64 onboarding reference photo when image onboarding is chosen."],
      ["allergies", "text", [], "''", "Comma-separated allergen substrings hard-blocked in scoring."],
      ["is_pregnant_or_breastfeeding", "boolean", [], "false", "Enables hard block on retinoids/hydroquinone and pregnancy-unsafe actives."],
      ["current_products", "text", [], "''", "Optional comma-separated catalog product_ids currently used."],
      ["created_at", "timestamptz", [], "auto_now_add", "Account creation timestamp (ordered newest first)."],
      ["updated_at", "timestamptz", [], "auto_now", "Last profile or token update timestamp."],
    ],
  },
  {
    table: "evaluator_access_codes",
    model: "Users.EvaluatorAccessCode",
    domain: "identity",
    domainLabel: "Identity & RBAC",
    rowsLabel: "1 seeded code",
    seeded: 1,
    pk: "id (BigAutoField)",
    purpose:
      "Stores hashed evaluator gate codes in PostgreSQL (seeded via migration 0010_evaluator_rbac) so evaluator login elevation is verified server-side.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Primary key."],
      ["label", "varchar(64)", ["UNIQUE"], "'default'", "Human-readable key slot identifier."],
      ["code_hash", "varchar(256)", ["HASH"], "required", "PBKDF2-SHA256 hash of the evaluator access code."],
      ["is_active", "boolean", [], "true", "Allows revoking or rotating an evaluator code without code changes."],
      ["updated_at", "timestamptz", [], "auto_now", "Last rotation timestamp."],
    ],
  },
  {
    table: "skin_scan_history",
    model: "Users.SkinScanHistory",
    domain: "clinical",
    domainLabel: "Scans & Tracking",
    rowsLabel: "Runtime (confirmed scans)",
    seeded: null,
    pk: "id (BigAutoField)",
    purpose:
      "Longitudinal log of confirmed skin analyses powering the Skin Tracking timeline and Dashboard confidence bars. Quick unconfirmed checks are never written here.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Primary key."],
      ["user_id", "bigint", ["FK", "INDEX"], "CASCADE", "References users(id); deleting a user removes their scan history."],
      ["skin_type", "varchar(20)", [], "''", "Predicted or retained skin type at the time of scan."],
      ["skin_type_confidence", "double precision", [], "null", "Top-class probability (0.0–1.0) from EfficientNet-B0."],
      ["skin_tone", "varchar(20)", [], "''", "Predicted or retained skin tone at the time of scan."],
      ["skin_tone_confidence", "double precision", [], "null", "Top-class probability (0.0–1.0) from EfficientNet-B2."],
      ["skin_disease", "varchar(255)", [], "''", "Detected condition label when disease_detected is true."],
      ["skin_disease_confidence", "double precision", [], "null", "Condition model confidence (0.0–1.0) from EfficientNet-B3."],
      ["disease_detected", "boolean", [], "false", "True only when the two-stage healthy/condition gate triggers."],
      ["image_original", "varchar(100)", ["MEDIA"], "null", "Relative path under scans/ to the uploaded/captured face photo."],
      ["image_processed", "varchar(100)", ["MEDIA"], "null", "Relative path under scans/ to the Grad-CAM / zone overlay image."],
      ["source", "varchar(20)", [], "'full_scan'", "Origin tag: onboarding, full_scan, disease_scan, or manual."],
      ["scanned_at", "timestamptz", [], "auto_now_add", "Scan timestamp (indexed via default -scanned_at ordering)."],
    ],
  },
  {
    table: "product_scans",
    model: "Scanner.ProductScan",
    domain: "clinical",
    domainLabel: "Scans & Tracking",
    rowsLabel: "Runtime (OCR label scans)",
    seeded: null,
    pk: "id (BigAutoField)",
    purpose:
      "Stores every scored cosmetic ingredient label extracted via Groq vision OCR along with safety flags, matched catalog INCI names, and profile score.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Primary key."],
      ["user_id", "bigint", ["FK", "INDEX"], "CASCADE", "References users(id)."],
      ["ingredients", "jsonb", ["JSONB"], "[]", "Ordered list of raw ingredient strings read off the label."],
      ["score", "double precision", [], "0", "Profile compatibility score (0 to 10 scale)."],
      ["is_safe", "boolean", [], "true", "False if an allergen or pregnancy-restricted ingredient triggered a hard block."],
      ["reasons", "jsonb", ["JSONB"], "[]", "Positive match explanations (helpful actives for user conditions)."],
      ["warnings", "jsonb", ["JSONB"], "[]", "Caution notes (comedogenic >= 3 or condition mismatches)."],
      ["flags", "jsonb", ["JSONB"], "[]", "Hard safety block messages (allergens / pregnancy contraindications)."],
      ["matched_ingredients", "jsonb", ["JSONB"], "[]", "Canonical INCI names resolved against catalog_ingredients."],
      ["image", "varchar(100)", ["MEDIA"], "null", "Optional saved product label image under product_scans/."],
      ["created_at", "timestamptz", [], "auto_now_add", "Scan timestamp (ordered newest first)."],
    ],
  },
  {
    table: "chat_sessions",
    model: "Chatbot.ChatSession",
    domain: "chat",
    domainLabel: "Chatbot & Trace",
    rowsLabel: "Runtime (threads)",
    seeded: null,
    pk: "id (BigAutoField)",
    purpose:
      "Groups multi-turn skincare assistant conversations per user so past threads can be reopened in the Chatbot drawer.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Primary key."],
      ["user_id", "bigint", ["FK", "INDEX"], "CASCADE", "References users(id)."],
      ["title", "varchar(120)", [], "'New chat'", "Auto-summarized conversation title from the opening prompt."],
      ["created_at", "timestamptz", [], "auto_now_add", "Thread creation time."],
      ["updated_at", "timestamptz", [], "auto_now", "Bumped on every new message; drives sidebar recency sort."],
    ],
  },
  {
    table: "chat_messages",
    model: "Chatbot.ChatMessage",
    domain: "chat",
    domainLabel: "Chatbot & Trace",
    rowsLabel: "Runtime (turns + RAG)",
    seeded: null,
    pk: "id (BigAutoField)",
    purpose:
      "Stores individual user and assistant turns, plus the exact pgvector retrieval trace (cosine distances, safety drops, and rows shown to the LLM) on assistant replies.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Primary key."],
      ["session_id", "bigint", ["FK", "INDEX"], "CASCADE", "References chat_sessions(id)."],
      ["role", "varchar(20)", [], "required", "Message author: 'user' or 'assistant'."],
      ["text", "text", [], "required", "Markdown message body."],
      ["rag_trace", "jsonb", ["JSONB"], "null", "Retrieved ingredient/product IDs, similarity scores, and safety-filtered items."],
      ["created_at", "timestamptz", [], "auto_now_add", "Chronological turn order within a session."],
    ],
  },
  {
    table: "catalog_brands",
    model: "Catalog.Brand",
    domain: "catalog",
    domainLabel: "Catalog & Vectors",
    rowsLabel: "131 seeded rows",
    seeded: 131,
    pk: "brand_id (Integer)",
    purpose:
      "Normalized brand lookup table covering local Pakistani pharma brands (Montis, Mazton, Trasers) and international skincare lines (CeraVe, The Ordinary, La Roche-Posay).",
    columns: [
      ["brand_id", "integer", ["PK"], "explicit", "Deterministic catalog primary key from curated CSV."],
      ["name", "text", [], "''", "Brand display name."],
      ["country", "text", [], "''", "Country of origin (populated for 16 international/local brands)."],
      ["available_in_pk", "boolean", [], "null", "Local market availability flag."],
    ],
  },
  {
    table: "catalog_products",
    model: "Catalog.Product",
    domain: "catalog",
    domainLabel: "Catalog & Vectors",
    rowsLabel: "335 seeded rows",
    seeded: 335,
    pk: "product_id (Integer)",
    purpose:
      "Curated skincare catalog available in Pakistan with PKR pricing, target skin types/conditions, and 384-dimensional semantic embeddings for RAG retrieval.",
    columns: [
      ["product_id", "integer", ["PK"], "explicit", "Deterministic product ID (referenced by user current_products and M:N links)."],
      ["brand_id", "integer", ["FK", "INDEX"], "SET NULL", "References catalog_brands(brand_id); preserves product if brand row is removed."],
      ["name", "text", [], "''", "Full product title and size."],
      ["category", "text", [], "''", "Routine slot: cleanser, moisturizer, sunscreen, treatment, toner, etc."],
      ["price_pkr", "double precision", [], "null", "Price in Pakistani Rupees (PKR 250 to PKR 9,000; median PKR 1,630)."],
      ["available_in_pakistan", "boolean", [], "null", "True across all 335 curated products."],
      ["purchase_link", "text", [], "''", "External retail / pharmacy URL."],
      ["image_url", "text", [], "''", "Product thumbnail URL."],
      ["raw_ingredient_text", "text", [], "''", "Full label ingredient list string embedded for semantic search."],
      ["source", "text", [], "''", "Catalog curation source."],
      ["safety_advisory", "text", [], "''", "Usage warnings and patch-test notes."],
      ["age_relevance", "text", [], "''", "Target age suitability ('all' for 319 products, '25+' for 16 actives)."],
      ["suitable_skin_types", "text", [], "''", "Delimited skin types (oily, dry, combination, normal)."],
      ["suitable_conditions", "text", [], "''", "Delimited target concerns (common_acne, rosacea, eczema, hyperpigmentation, etc.)."],
      ["embedding", "vector(384)", ["VECTOR"], "null", "pgvector 384-D float embedding (all-MiniLM-L6-v2) for cosine similarity search."],
    ],
  },
  {
    table: "catalog_ingredients",
    model: "Catalog.Ingredient",
    domain: "catalog",
    domainLabel: "Catalog & Vectors",
    rowsLabel: "1,543 seeded rows",
    seeded: 1543,
    pk: "ingredient_id (Integer)",
    purpose:
      "CosIng-grounded INCI dictionary storing safety restrictions, allergen flags, comedogenicity, pregnancy contraindications, condition fit, and 384-D embeddings.",
    columns: [
      ["ingredient_id", "integer", ["PK"], "explicit", "Deterministic ingredient primary key."],
      ["inci_name", "text", [], "''", "Standard International Nomenclature of Cosmetic Ingredients name."],
      ["functions", "text", [], "''", "Cosmetic roles (HUMECTANT, HUMECTANT; SKIN CONDITIONING, UV FILTER, etc.)."],
      ["is_common_allergen", "boolean", [], "null", "True on 48 EU Annex III fragrance/preservative allergens."],
      ["allergen_source", "text", [], "''", "Regulatory citation (e.g. EU_ANNEX_III)."],
      ["comedogenic_rating", "double precision", [], "null", "Pore-clogging scale 0–5; >= 3 triggers oily/acne warnings."],
      ["is_fungal_acne_trigger", "double precision", [], "null", "Flags Malassezia-feeding esters/fatty acids (104 flagged rows)."],
      ["cosing_restriction", "text", [], "''", "EU CosIng restriction code where applicable."],
      ["chemical_description", "text", [], "''", "Plain-science description embedded for chatbot explanations."],
      ["good_for_conditions", "text", [], "''", "Conditions this active helps (+0.75 pts each in recommender, capped at +3.0)."],
      ["avoid_for_conditions", "text", [], "''", "Conditions irritated by this active (-1.0 pt penalty in recommender)."],
      ["avoid_if_pregnant", "text", [], "''", "'yes' (hard block: Retinol, Tretinoin, Adapalene, Hydroquinone), 'caution', or 'no'."],
      ["not_recommended_below_age", "text", [], "''", "Minimum age threshold for strong exfoliants/retinoids."],
      ["tone_caution_note", "text", [], "''", "PIH / darker skin-tone caution notes."],
      ["embedding", "vector(384)", ["VECTOR"], "null", "pgvector 384-D float embedding for ingredient Q&A retrieval."],
    ],
  },
  {
    table: "catalog_product_ingredients",
    model: "Catalog.ProductIngredient",
    domain: "catalog",
    domainLabel: "Catalog & Vectors",
    rowsLabel: "7,110 seeded rows",
    seeded: 7110,
    pk: "id (BigAutoField)",
    purpose:
      "Many-to-many junction linking products to their ordered INCI ingredients (average 21.2 ingredients per product, min 4, max 72) plus known active concentrations.",
    columns: [
      ["id", "bigint", ["PK"], "auto", "Surrogate row ID."],
      ["product_id", "integer", ["FK", "UNIQUE*"], "CASCADE", "References catalog_products(product_id)."],
      ["ingredient_id", "integer", ["FK", "UNIQUE*"], "CASCADE", "References catalog_ingredients(ingredient_id)."],
      ["position_index", "integer", ["UNIQUE*"], "null", "1-based INCI label order (composite unique with product + ingredient)."],
      ["concentration_percentage", "double precision", [], "null", "Declared active percentage when printed on the label (14 rows)."],
    ],
  },
];

const BADGE_STYLE = {
  PK: "bg-cocoa text-white",
  FK: "bg-tint-soft text-cocoa-dark border border-tint-border",
  UNIQUE: "bg-paper-alt text-cocoa border border-slate-300",
  "UNIQUE*": "bg-paper-alt text-cocoa border border-slate-300",
  INDEX: "bg-slate-100 text-slate-700",
  VECTOR: "bg-amber-50 text-amber-800 border border-amber-200",
  JSONB: "bg-tint-subtle text-cocoa-light border border-tint-border",
  HASH: "bg-rose-50 text-rose-800 border border-rose-200",
  RBAC: "bg-amber-50 text-amber-800 border border-amber-200",
  TOKEN: "bg-slate-100 text-slate-700",
  MEDIA: "bg-slate-100 text-slate-700",
};

function KeyBadge({ label }) {
  return (
    <span
      className={`inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none ${
        BADGE_STYLE[label] || "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

/* ───────────────────────────── ER Diagram SVG ───────────────────────────── */

function ErBox({ x, y, w, h, name, app, cols, rows, accent = "default" }) {
  const headerFill =
    accent === "primary"
      ? "fill-cocoa"
      : accent === "vector"
      ? "fill-cocoa-light"
      : "fill-tint-soft";
  const headerText = accent === "default" ? "fill-cocoa-dark" : "fill-white";
  const subText = accent === "default" ? "fill-slate-600" : "fill-white/80";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        className="fill-white stroke-slate-300"
        strokeWidth={1.25}
      />
      <path
        d={`M${x},${y + 12} a12,12 0 0,1 12,-12 h${w - 24} a12,12 0 0,1 12,12 v20 h-${w} z`}
        className={headerFill}
      />
      <text x={x + 10} y={y + 15} fontSize="10.5" fontWeight="700" className={`font-mono ${headerText}`}>
        {name}
      </text>
      <text x={x + w - 10} y={y + 15} textAnchor="end" fontSize="8.5" fontWeight="600" className={subText}>
        {app}
      </text>
      <text x={x + 10} y={y + 27} fontSize="8.5" className={subText}>
        {rows}
      </text>
      {cols.map(([col, tag], idx) => (
        <g key={col} transform={`translate(${x + 10}, ${y + 45 + idx * 14})`}>
          <text fontSize="9" className="fill-slate-800 font-mono">
            {col}
          </text>
          {tag && (
            <text x={w - 20} textAnchor="end" fontSize="8" fontWeight="700" className="fill-cocoa-light font-mono">
              {tag}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function SchemaErDiagram() {
  const line = { fill: "none", strokeWidth: 1.5, markerEnd: "url(#er-arr)", className: "stroke-cocoa-light" };
  const dashed = {
    fill: "none",
    strokeWidth: 1.2,
    strokeDasharray: "4 3",
    className: "stroke-slate-400",
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-paper/60 p-3">
      <svg
        viewBox="0 0 980 470"
        className="min-w-[820px] w-full"
        role="img"
        aria-label="TrueTone PostgreSQL entity relationship diagram"
      >
        <defs>
          <marker id="er-arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="fill-cocoa-light" />
          </marker>
        </defs>

        {/* Domain headers */}
        <text x="20" y="18" fontSize="10" fontWeight="700" className="fill-cocoa uppercase tracking-wider">
          USER, RBAC &amp; RUNTIME ACTIVITY DOMAIN (6 TABLES)
        </text>
        <text x="535" y="18" fontSize="10" fontWeight="700" className="fill-cocoa uppercase tracking-wider">
          SKINCARE CATALOG &amp; PGVECTOR DOMAIN (4 TABLES · 9,119 ROWS)
        </text>
        <line x1="512" y1="8" x2="512" y2="458" className="stroke-slate-200" strokeWidth="1" strokeDasharray="3 3" />

        {/* Left domain: Users & children */}
        <ErBox
          x={20}
          y={32}
          w={215}
          h={174}
          name="users"
          app="Users"
          rows="26 cols · live skin profile"
          accent="primary"
          cols={[
            ["id", "PK"],
            ["username, email", "UQ"],
            ["password, recovery_*", "HASH"],
            ["role ('end_user'|'evaluator')", "RBAC"],
            ["skin_type, skin_tone", ""],
            ["skin_disease, age_bracket", ""],
            ["allergies, is_pregnant_*", ""],
            ["current_products", "CSV->ID"],
            ["token, onboarding_completed", ""],
          ]}
        />

        <ErBox
          x={20}
          y={230}
          w={215}
          h={92}
          name="evaluator_access_codes"
          app="Users"
          rows="5 cols · 1 seeded row"
          cols={[
            ["id", "PK"],
            ["label ('default')", "UQ"],
            ["code_hash (PBKDF2)", "HASH"],
            ["is_active, updated_at", ""],
          ]}
        />

        <ErBox
          x={280}
          y={32}
          w={212}
          h={120}
          name="skin_scan_history"
          app="Users"
          rows="13 cols · confirmed ML scans"
          cols={[
            ["id", "PK"],
            ["user_id -> users.id", "FK 1:N"],
            ["skin_type + confidence", ""],
            ["skin_tone + confidence", ""],
            ["skin_disease + detected", ""],
            ["image_original, source", "MEDIA"],
          ]}
        />

        <ErBox
          x={280}
          y={168}
          w={212}
          h={118}
          name="product_scans"
          app="Scanner"
          rows="11 cols · OCR label history"
          cols={[
            ["id", "PK"],
            ["user_id -> users.id", "FK 1:N"],
            ["ingredients, matched_*", "JSONB"],
            ["score, is_safe", ""],
            ["reasons, warnings, flags", "JSONB"],
            ["image, created_at", "MEDIA"],
          ]}
        />

        <ErBox
          x={280}
          y={302}
          w={212}
          h={78}
          name="chat_sessions"
          app="Chatbot"
          rows="5 cols · threads"
          cols={[
            ["id", "PK"],
            ["user_id -> users.id", "FK 1:N"],
            ["title, updated_at", ""],
          ]}
        />

        <ErBox
          x={20}
          y={346}
          w={215}
          h={106}
          name="chat_messages"
          app="Chatbot"
          rows="6 cols · turns + RAG trace"
          cols={[
            ["id", "PK"],
            ["session_id -> chat_sessions", "FK 1:N"],
            ["role ('user'|'assistant')", ""],
            ["text", ""],
            ["rag_trace (retrieved IDs)", "JSONB"],
          ]}
        />

        {/* Left domain connectors */}
        <path d="M235 82 H280" {...line} />
        <text x="257" y="76" textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M235 135 H258 V218 H280" {...line} />
        <text x="256" y="212" textAnchor="end" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M235 170 H250 V340 H280" {...line} />
        <text x="266" y="334" textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M280 356 H256 V398 H235" {...line} />
        <text x="258" y="410" textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M127 230 V206" {...dashed} />
        <text x="134" y="222" fontSize="8" className="fill-slate-500">
          sets role on login
        </text>

        {/* Right domain: Catalog & pgvector */}
        <ErBox
          x={535}
          y={32}
          w={195}
          h={92}
          name="catalog_brands"
          app="Catalog"
          rows="4 cols · 131 rows"
          cols={[
            ["brand_id", "PK"],
            ["name", ""],
            ["country (16 filled)", ""],
            ["available_in_pk", ""],
          ]}
        />

        <ErBox
          x={752}
          y={32}
          w={210}
          h={150}
          name="catalog_products"
          app="Catalog"
          rows="15 cols · 335 rows · embedded"
          accent="vector"
          cols={[
            ["product_id", "PK"],
            ["brand_id -> brands", "FK N:1"],
            ["name, category, price_pkr", ""],
            ["suitable_skin_types", ""],
            ["suitable_conditions", ""],
            ["age_relevance, advisory", ""],
            ["raw_ingredient_text", ""],
            ["embedding", "VEC 384"],
          ]}
        />

        <ErBox
          x={535}
          y={156}
          w={195}
          h={110}
          name="catalog_product_ingredients"
          app="Catalog"
          rows="5 cols · 7,110 M:N links"
          cols={[
            ["id", "PK"],
            ["product_id -> products", "FK"],
            ["ingredient_id -> ingred.", "FK"],
            ["position_index (1..72)", "UQ*"],
            ["concentration_percentage", ""],
          ]}
        />

        <ErBox
          x={535}
          y={292}
          w={427}
          h={160}
          name="catalog_ingredients"
          app="Catalog"
          rows="15 cols · 1,543 rows · CosIng + safety metadata + 384-D vector"
          accent="vector"
          cols={[
            ["ingredient_id", "PK"],
            ["inci_name, functions, chemical_description", ""],
            ["is_common_allergen (48 EU Annex III), allergen_source, cosing_restriction", "SAFETY"],
            ["comedogenic_rating (0–5), is_fungal_acne_trigger (104 flagged)", ""],
            ["good_for_conditions (+0.75), avoid_for_conditions (-1.0)", "SCORE"],
            ["avoid_if_pregnant ('yes' = hard block), not_recommended_below_age", "SAFETY"],
            ["tone_caution_note", ""],
            ["embedding (all-MiniLM-L6-v2 cosine search)", "VEC 384"],
          ]}
        />

        {/* Right domain connectors */}
        <path d="M730 76 H752" {...line} />
        <text x="741" y="70" textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M852 182 V212 H730" {...line} />
        <text x="795" y="206" textAnchor="middle" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        <path d="M632 292 V266" {...line} />
        <text x="652" y="283" fontSize="8.5" fontWeight="700" className="fill-cocoa">
          1 : N
        </text>

        {/* Cross-domain runtime read paths */}
        <path d="M492 224 H535" {...dashed} />
        <path d="M235 418 H535" {...dashed} />
        <text x="514" y="432" textAnchor="middle" fontSize="8" className="fill-slate-500">
          cosine search + INCI resolution
        </text>
      </svg>
    </div>
  );
}

/* ───────────────────────────── Volume Section ───────────────────────────── */

function CatalogVolumeChart() {
  const seeded = TABLES.filter((t) => t.seeded != null).sort((a, b) => b.seeded - a.seeded);
  const max = Math.max(...seeded.map((t) => t.seeded));

  return (
    <div className="space-y-3">
      {seeded.map((t) => (
        <div key={t.table} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-slate-900">{t.table}</span>
              <span className="ml-2 text-[11px] text-slate-500">({t.model})</span>
            </div>
            <span className="font-mono text-xs font-extrabold text-cocoa">{fmt(t.seeded)} rows</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-cocoa transition-all"
              style={{ width: `${Math.max(2, (t.seeded / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────────── Interactive Dictionary ───────────────────────────── */

function SchemaDictionary() {
  const [domain, setDomain] = useState("all");
  const [selectedTable, setSelectedTable] = useState("users");

  const visibleTables = domain === "all" ? TABLES : TABLES.filter((t) => t.domain === domain);
  const active =
    visibleTables.find((t) => t.table === selectedTable) || visibleTables[0] || TABLES[0];

  return (
    <div className="space-y-5">
      {/* Domain filter pills */}
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => {
          const isOn = d.key === domain;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => {
                setDomain(d.key);
                const nextList = d.key === "all" ? TABLES : TABLES.filter((t) => t.domain === d.key);
                if (!nextList.some((t) => t.table === selectedTable) && nextList[0]) {
                  setSelectedTable(nextList[0].table);
                }
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                isOn
                  ? "bg-cocoa text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-cocoa"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Table picker cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {visibleTables.map((t) => {
          const isSelected = t.table === active.table;
          return (
            <button
              key={t.table}
              type="button"
              onClick={() => setSelectedTable(t.table)}
              className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition ${
                isSelected
                  ? "border-cocoa bg-tint-subtle shadow-xs"
                  : "border-slate-200 bg-white hover:border-cocoa/60"
              }`}
            >
              <div>
                <p className="truncate font-mono text-xs font-bold text-slate-900">{t.table}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-cocoa-light">{t.domainLabel}</p>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[10px] text-slate-500">
                <span>{t.columns.length} cols</span>
                <span className="font-semibold text-slate-700">
                  {t.seeded != null ? `${fmt(t.seeded)} rows` : "Runtime"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected table detail panel */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-mono text-base font-extrabold text-slate-900">{active.table}</h3>
              <span className="rounded-full bg-tint-soft px-2.5 py-0.5 text-[11px] font-semibold text-cocoa-dark">
                {active.model}
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {active.columns.length} columns · {active.rowsLabel}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-xs text-slate-600">{active.purpose}</p>
          </div>
          <div className="rounded-xl bg-white px-3 py-2 text-right ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Primary Key</p>
            <p className="font-mono text-xs font-bold text-cocoa">{active.pk}</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-2 pr-3 font-medium">Column</th>
                <th className="py-2 pr-3 font-medium">PostgreSQL Type</th>
                <th className="py-2 pr-3 font-medium">Keys / Roles</th>
                <th className="py-2 pr-3 font-medium">Default / Rule</th>
                <th className="py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {active.columns.map(([col, sqlType, badges, defVal, desc]) => (
                <tr key={col} className="border-b border-slate-100 align-top last:border-0">
                  <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900">{col}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-cocoa-light">{sqlType}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {badges.length > 0 ? (
                        badges.map((b) => <KeyBadge key={b} label={b} />)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500">{defVal}</td>
                  <td className="py-2.5 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Main Exported Body ───────────────────────────── */

export function SchemaBody() {
  const summaryRows = TABLES.map((t) => [
    t.table,
    t.model.split(".")[0],
    String(t.columns.length),
    t.pk.split(" ")[0],
    t.seeded != null ? fmt(t.seeded) : "Dynamic (user data)",
    t.columns.some(([, , b]) => b.includes("VECTOR"))
      ? "vector(384)"
      : t.columns.some(([, , b]) => b.includes("JSONB"))
      ? "jsonb"
      : t.columns.some(([, , b]) => b.includes("HASH"))
      ? "PBKDF2 hash"
      : "Relational",
  ]);

  const fkRows = [
    [
      "skin_scan_history.user_id",
      "users.id",
      "N : 1",
      "ON DELETE CASCADE",
      "Deleting an account removes all saved skin scan records for that user.",
    ],
    [
      "product_scans.user_id",
      "users.id",
      "N : 1",
      "ON DELETE CASCADE",
      "Deleting an account removes all OCR ingredient scans tied to that user.",
    ],
    [
      "chat_sessions.user_id",
      "users.id",
      "N : 1",
      "ON DELETE CASCADE",
      "Deleting an account removes all conversation threads and cascades to messages.",
    ],
    [
      "chat_messages.session_id",
      "chat_sessions.id",
      "N : 1",
      "ON DELETE CASCADE",
      "Deleting a chat session cleanly purges all user/assistant turns and RAG traces.",
    ],
    [
      "catalog_products.brand_id",
      "catalog_brands.brand_id",
      "N : 1",
      "ON DELETE SET NULL",
      "Preserves the scored product and its 384-D vector even if a brand entry is unlinked.",
    ],
    [
      "catalog_product_ingredients.product_id",
      "catalog_products.product_id",
      "N : 1",
      "ON DELETE CASCADE",
      "Removes orphaned ingredient-order links if a catalog product is removed.",
    ],
    [
      "catalog_product_ingredients.ingredient_id",
      "catalog_ingredients.ingredient_id",
      "N : 1",
      "ON DELETE CASCADE",
      "Maintains referential integrity across the 7,110 product-to-INCI links.",
    ],
  ];

  const lifecycleSteps = [
    [
      "Account creation & RBAC gate (users, evaluator_access_codes)",
      "Signup writes a PBKDF2-SHA256 password hash, optional security question hash, and defaults role='end_user'. Signing in with an evaluator code checks EvaluatorAccessCode.code_hash server-side before elevating role='evaluator'.",
    ],
    [
      "Onboarding & opt-in clinical history (users -> skin_scan_history)",
      "Image onboarding runs all 3 EfficientNet models, updates the live skin profile on users, and writes the baseline row in skin_scan_history (source='onboarding'). Later Skin Analysis runs only write to skin_scan_history when the user clicks 'Save to my profile'.",
    ],
    [
      "Rule-based & OCR ingredient resolution (catalog_* -> product_scans)",
      "Recommendations and Product Scanner resolve INCI strings against catalog_ingredients (1,543 rows) and catalog_product_ingredients (7,110 links), persisting the extracted list, safety flags, and 0–10 score into product_scans as JSONB.",
    ],
    [
      "Vector RAG & provenance logging (catalog_* -> chat_sessions -> chat_messages)",
      "Each chatbot question embeds the query into 384 dimensions, runs cosine distance against 1,878 pgvector rows, filters allergens/pregnancy hazards, and saves the exact retrieved IDs + distances inside chat_messages.rag_trace.",
    ],
  ];

  return (
    <div className="space-y-6">
      {/* 1. Engine & Scale */}
      <Section
        id="overview"
        n={1}
        title="Database engine and schema scale"
        why="One PostgreSQL database backs identity, role-based access, longitudinal skin tracking, OCR product scans, and pgvector RAG retrieval."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Custom tables" value={String(SCHEMA.tablesCount)} hint={`${SCHEMA.appsCount} Django apps`} />
          <Kpi label="Total columns" value={String(SCHEMA.columnsCount)} hint={`${SCHEMA.foreignKeysCount} foreign keys`} />
          <Kpi label="Seeded catalog" value={fmt(SCHEMA.seededRows)} hint="brands, products, INCI, links" />
          <Kpi label="Embedded rows" value={fmt(SCHEMA.vectorRows)} hint="1,543 INCI + 335 products" />
          <Kpi label="Vector space" value={`${SCHEMA.vectorDims}-D`} hint="721,152 float values in pgvector" />
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <SubTitle>Storage &amp; configuration stack</SubTitle>
          <div className="mt-2">
            {SCHEMA.engineStack.map(([k, v]) => (
              <Row key={k} k={k} v={v} />
            ))}
          </div>
        </div>
        <Caption>
          Stateless compute apps (models_api and Recommendations) intentionally own zero database tables: they run PyTorch
          inference or rule-based scoring in memory and persist only through confirmed writes to Users and Scanner.
        </Caption>
      </Section>

      {/* 2. ER Diagram */}
      <Section
        id="erd"
        n={2}
        title="Entity–relationship diagram"
        why="How the 6 user/runtime tables on the left connect to the 4 curated skincare & vector tables on the right."
      >
        <SchemaErDiagram />
        <Caption>
          Solid arrows denote enforced PostgreSQL foreign keys (1 : N). Dashed lines show runtime read/verification paths
          (evaluator login verification, OCR INCI matching, and pgvector cosine search).
        </Caption>
      </Section>

      {/* 3. Table summary & seeded volume */}
      <Section
        id="volume"
        n={3}
        title="Table inventory and seeded data volume"
        why="Static reference tables ship pre-populated from curated CSVs; user tables start empty and grow only on authenticated actions."
      >
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SubTitle>Seeded rows by table</SubTitle>
            <CatalogVolumeChart />
          </div>
          <div className="lg:col-span-7">
            <SubTitle>All 10 application tables at a glance</SubTitle>
            <Table
              min="min-w-[540px]"
              head={["Table name", "App", "Cols", "PK", "Row count", "Special type"]}
              rows={summaryRows}
            />
          </div>
        </div>
      </Section>

      {/* 4. Interactive column dictionary */}
      <Section
        id="dictionary"
        n={4}
        title="Interactive table and column dictionary"
        why="Filter by domain or click any table below to inspect every column, SQL type, key badge, default value, and purpose."
      >
        <SchemaDictionary />
      </Section>

      {/* 5. Relationships & cascade matrix */}
      <Section
        id="relations"
        n={5}
        title="Foreign keys, constraints, and cascade rules"
        why="Referential integrity rules ensure user deletions clean up private data while catalog edits never corrupt historical records."
      >
        <Table
          min="min-w-[680px]"
          head={["Child column (FK)", "Parent key", "Cardinality", "Delete rule", "Why this rule is used"]}
          rows={fkRows}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-mono text-xs font-bold text-cocoa">users (username, email)</p>
            <p className="mt-1 text-xs text-slate-600">
              Both columns carry B-tree unique indexes (`unique=True, db_index=True`) for O(log n) credential and recovery lookup.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-mono text-xs font-bold text-cocoa">catalog_product_ingredient_position</p>
            <p className="mt-1 text-xs text-slate-600">
              Composite `UniqueConstraint(product, ingredient, position_index)` preserves exact label order without duplicate links.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-mono text-xs font-bold text-cocoa">pgvector(384) embeddings</p>
            <p className="mt-1 text-xs text-slate-600">
              Stored directly alongside relational metadata so cosine search and SQL safety filtering execute in one database.
            </p>
          </div>
        </div>
      </Section>

      {/* 6. Security & Data Lifecycle */}
      <Section
        id="security"
        n={6}
        title="Security, hashing, and write lifecycle"
        why="Sensitive secrets are salted and hashed before storage, and clinical scans follow an explicit user-consent write model."
      >
        <Steps steps={lifecycleSteps} />
      </Section>
    </div>
  );
}

export default SchemaBody;
