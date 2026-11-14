/**
 * Steps configuration for the "How TrueTone Works" section.
 *
 * HOW TO EDIT:
 * - Change a screenshot → replace the file in /public/steps/ (keep same name)
 *   or update `src` below.
 * - Add a slide → add { src: "/steps/X.png", caption: "..." } to the slides array.
 * - Change step text → edit title / subtitle / shortName.
 * - Reorder steps → move the object in the array.
 * - Scroll height auto-adjusts (totalSlides × 50vh).
 */

export const STEPS = [
  {
    title: "Tell us about you",
    subtitle: "Age, photo or manual input, allergies.",
    shortName: "Onboarding",
    slides: [
      { src: "/steps/1.png", caption: "Skin info" },
      { src: "/steps/2.png", caption: "Conditions" },
      { src: "/steps/3.png", caption: "Safety info" },
    ],
  },
  {
    title: "Your skin profile",
    subtitle: "Type, tone and condition, mapped.",
    shortName: "Profile",
    slides: [
      { src: "/steps/20.png", caption: "Dashboard" },
      { src: "/steps/26.png", caption: "Edit anytime" },
    ],
  },
  {
    title: "Analyze your skin",
    subtitle: "Pick a model, upload, get your result.",
    shortName: "Analysis",
    slides: [
      { src: "/steps/4.png", caption: "Choose analysis" },
      { src: "/steps/6.png", caption: "Upload photo" },
      { src: "/steps/11.png", caption: "Prediction" },
      { src: "/steps/16.png", caption: "Confidence" },
    ],
  },
  {
    title: "Save and track",
    subtitle: "Profile, tracking and picks refresh.",
    shortName: "Tracking",
    slides: [
      { src: "/steps/17.png", caption: "Confirm update" },
      { src: "/steps/18.png", caption: "Profile updated" },
      { src: "/steps/19.png", caption: "Skin tracking" },
    ],
  },
  {
    title: "Matched products",
    subtitle: "Ranked for your skin, allergies excluded.",
    shortName: "Recommendations",
    slides: [
      { src: "/steps/22.png", caption: "Recommendations" },
      { src: "/steps/23.png", caption: "How scores work" },
    ],
  },
  {
    title: "Scan any label",
    subtitle: "Safe, caution or avoid, per ingredient.",
    shortName: "Scanner",
    slides: [
      { src: "/steps/24.png", caption: "Upload label" },
    ],
  },
];

/** Step-6 floating ingredient chips (only shown when step 6 is active) */
export const INGREDIENT_CHIPS = [
  {
    name: "Fragrance",
    label: "AVOID · ALLERGY TRIGGER",
    dotColor: "var(--tt-avoid)",
    textColor: "text-status-avoid",
  },
  {
    name: "Alcohol denat.",
    label: "CAUTION · DRYING EFFECT",
    dotColor: "var(--tt-caution)",
    textColor: "text-status-caution",
  },
  {
    name: "Niacinamide",
    label: "SAFE · BARRIER SUPPORT",
    dotColor: "var(--tt-safe)",
    textColor: "text-status-safe",
  },
];

