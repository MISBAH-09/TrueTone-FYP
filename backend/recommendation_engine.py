"""
TrueTone – Recommendation Engine
=================================
Rule-based, content-filtering recommendation engine. Takes a user's
onboarding answers (+ optionally the CNN pipeline's skin predictions) and
returns ranked product recommendations, grouped by category.

Framework-agnostic — works with Django, FastAPI, or CLI, same as
pipeline_engine.py.

Data source: 4 CSVs (ingredients_master, products_template,
product_ingredients_template, brands_pakistan). Swap load_data() for a
database query later without touching the scoring logic below it.

Usage:
    from recommendation_engine import get_engine, UserProfile

    engine = get_engine()
    profile = UserProfile(
        skin_type="oily",
        skin_conditions=["cystic_acne"],
        skin_tone="dark",
        age_bracket="18-24",
        allergies=["fragrance"],
        is_pregnant_or_breastfeeding=False,
        current_product_ids=[],
    )
    result = engine.recommend(profile)
"""

import csv
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger("truetone.recommender")


# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════
class Config:
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR / "data" / "fyp_dataset"

    INGREDIENTS_CSV = DATA_DIR / "ingredients.csv"
    PRODUCTS_CSV = DATA_DIR / "products.csv"
    PRODUCT_INGREDIENTS_CSV = DATA_DIR / "product_ingredients.csv"
    BRANDS_CSV = DATA_DIR / "brands.csv"

    VALID_AGE_BRACKETS = ["teen", "18-24", "25-34", "35+"]
    VALID_SKIN_TYPES = ["oily", "dry", "combination", "normal"]
    VALID_SKIN_TONES = ["fair", "medium", "dark"]
    TOP_N_PER_CATEGORY = 5

    # scoring weights - tune these as you validate against real dermatological judgment
    WEIGHT_SKIN_TYPE_MATCH = 3
    WEIGHT_CONDITION_MATCH = 3
    WEIGHT_INGREDIENT_GOOD_FOR = 1       # per matching ingredient, capped
    WEIGHT_INGREDIENT_GOOD_FOR_CAP = 3
    WEIGHT_INGREDIENT_AVOID_FOR = -2     # per matching ingredient, capped
    WEIGHT_INGREDIENT_AVOID_FOR_CAP = -6
    WEIGHT_AGE_RELEVANCE_MATCH = 1

    MIN_SCORE_TO_RECOMMEND = 0.01  # products scoring at or below 0 are not shown as "recommended"
    PRICE_APPROX_BAND_PCT = 0.15   # real-world retail price varies from what we recorded; show as a range, not a false-precise number


# ═══════════════════════════════════════════════════════════════
#  DATA MODEL
# ═══════════════════════════════════════════════════════════════
@dataclass
class UserProfile:
    """One user's onboarding answers, matching the 7 finalized questions."""
    skin_type: str                                 # oily | dry | combination | normal
    skin_conditions: list = field(default_factory=list)   # e.g. ["cystic_acne"]
    skin_tone: Optional[str] = None                # fair | medium | dark
    skin_condition_confidence: Optional[float] = None  # from CNN, if image-based
    age_bracket: Optional[str] = None              # teen | 18-24 | 25-34 | 35+
    allergies: list = field(default_factory=list)  # ingredient names, lowercase
    is_pregnant_or_breastfeeding: bool = False
    current_product_ids: list = field(default_factory=list)


@dataclass
class ScoredProduct:
    product_id: str
    name: str
    category: str
    brand_name: str
    price_pkr_low: Optional[float]
    price_pkr_high: Optional[float]
    purchase_link: Optional[str]
    ingredients: list          # [{"inci_name": ..., "is_common_allergen": bool}, ...]
    score: float
    reasons: list
    warnings: list
    safety_advisory: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
#  DATA LOADING
# ═══════════════════════════════════════════════════════════════
def _read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def _split_list(raw):
    """CSV cells like 'acne, hyperpigmentation' -> ['acne', 'hyperpigmentation']."""
    if not raw:
        return []
    return [s.strip().lower() for s in raw.split(",") if s.strip()]


class DataStore:
    """Loads the 4 CSVs once and indexes them for fast lookup."""

    def __init__(self):
        self.ingredients_by_id = {}
        self.products_by_id = {}
        self.product_ingredient_ids = {}   # product_id -> [ingredient_id, ...]
        self.brands_by_id = {}
        self._load()

    def _load(self):
        for row in _read_csv(Config.INGREDIENTS_CSV):
            row["good_for_conditions"] = _split_list(row.get("good_for_conditions", ""))
            row["avoid_for_conditions"] = _split_list(row.get("avoid_for_conditions", ""))
            self.ingredients_by_id[row["ingredient_id"]] = row

        for row in _read_csv(Config.BRANDS_CSV):
            self.brands_by_id[row["brand_id"]] = row

        for row in _read_csv(Config.PRODUCTS_CSV):
            row["suitable_skin_types"] = _split_list(row.get("suitable_skin_types", ""))
            row["suitable_conditions"] = _split_list(row.get("suitable_conditions", ""))
            self.products_by_id[row["product_id"]] = row

        for row in _read_csv(Config.PRODUCT_INGREDIENTS_CSV):
            pid = row["product_id"]
            self.product_ingredient_ids.setdefault(pid, []).append(row["ingredient_id"])

        logger.info(
            f"Loaded {len(self.ingredients_by_id)} ingredients, "
            f"{len(self.products_by_id)} products, "
            f"{len(self.brands_by_id)} brands"
        )

    def ingredients_for_product(self, product_id):
        ids = self.product_ingredient_ids.get(product_id, [])
        return [self.ingredients_by_id[i] for i in ids if i in self.ingredients_by_id]


# ═══════════════════════════════════════════════════════════════
#  SAFETY FILTERS  (hard blocks - run BEFORE scoring)
# ═══════════════════════════════════════════════════════════════
def _is_blocked_by_allergy(product_ingredients, allergies):
    if not allergies:
        return False, None
    allergy_set = {a.strip().lower() for a in allergies}
    for ing in product_ingredients:
        if ing["inci_name"].strip().lower() in allergy_set:
            return True, f"Contains {ing['inci_name']}, which you flagged as an allergy"
    return False, None


def _is_blocked_by_pregnancy(product_ingredients, is_pregnant):
    if not is_pregnant:
        return False, None
    for ing in product_ingredients:
        if str(ing.get("avoid_if_pregnant", "")).strip().lower() == "yes":
            return True, f"Contains {ing['inci_name']}, not recommended during pregnancy/breastfeeding"
    return False, None


# ═══════════════════════════════════════════════════════════════
#  SCORING  (soft ranking - runs on whatever survives the filters)
# ═══════════════════════════════════════════════════════════════
def _score_product(product, product_ingredients, profile: UserProfile):
    score = 0.0
    reasons = []
    warnings = []

    # skin type match
    if profile.skin_type and profile.skin_type.lower() in product["suitable_skin_types"]:
        score += Config.WEIGHT_SKIN_TYPE_MATCH
        reasons.append(f"Suited to {profile.skin_type} skin")

    # condition match
    user_conditions = {c.lower() for c in profile.skin_conditions}
    matched_conditions = user_conditions & set(product["suitable_conditions"])
    if matched_conditions:
        score += Config.WEIGHT_CONDITION_MATCH
        reasons.append(f"Targets {', '.join(sorted(matched_conditions))}")

    # ingredient-level good_for / avoid_for
    good_hits, avoid_hits = 0, 0
    for ing in product_ingredients:
        if user_conditions & set(ing["good_for_conditions"]):
            good_hits += 1
        if user_conditions & set(ing["avoid_for_conditions"]):
            avoid_hits += 1
            warnings.append(
                f"{ing['inci_name']} may not suit {'/'.join(sorted(user_conditions & set(ing['avoid_for_conditions'])))}"
            )

    score += min(good_hits * Config.WEIGHT_INGREDIENT_GOOD_FOR, Config.WEIGHT_INGREDIENT_GOOD_FOR_CAP)
    score += max(avoid_hits * Config.WEIGHT_INGREDIENT_AVOID_FOR, Config.WEIGHT_INGREDIENT_AVOID_FOR_CAP)

    # age relevance - soft bonus only, never a block
    age_rel = (product.get("age_relevance") or "all").strip().lower()
    if profile.age_bracket and age_rel not in ("all", ""):
        if age_rel == profile.age_bracket.lower():
            score += Config.WEIGHT_AGE_RELEVANCE_MATCH
            reasons.append(f"Popular choice for {profile.age_bracket}")

    # tone caution - informational only, never blocks or penalizes
    if profile.skin_tone:
        for ing in product_ingredients:
            note = ing.get("tone_caution_note")
            if note:
                warnings.append(f"{ing['inci_name']}: {note}")

    # already using this product - don't recommend a duplicate
    if product["product_id"] in profile.current_product_ids:
        return None  # excluded entirely, not just down-ranked

    return score, reasons, warnings


# ═══════════════════════════════════════════════════════════════
#  ENGINE
# ═══════════════════════════════════════════════════════════════
class RecommendationEngine:
    def __init__(self):
        self.store = DataStore()

    def _price_band(self, product):
        if not product.get("price_pkr"):
            return None, None
        base = float(product["price_pkr"])
        band = base * Config.PRICE_APPROX_BAND_PCT
        return round(base - band, -1), round(base + band, -1)  # rounded to nearest 10

    def _build_scored_product(self, product, product_ingredients, score, reasons, warnings):
        brand = self.store.brands_by_id.get(product.get("brand_id"), {})
        low, high = self._price_band(product)
        return ScoredProduct(
            product_id=product["product_id"],
            name=product["name"],
            category=product["category"],
            brand_name=brand.get("name", ""),
            price_pkr_low=low,
            price_pkr_high=high,
            purchase_link=product.get("purchase_link"),
            ingredients=[
                {"inci_name": ing["inci_name"], "is_common_allergen": str(ing.get("is_common_allergen")).lower() == "true"}
                for ing in product_ingredients
            ],
            score=score,
            reasons=reasons,
            warnings=warnings,
            safety_advisory=product.get("safety_advisory") or None,
        )

    def recommend(self, profile: UserProfile, top_n=None):
        """
        Only returns products that scored above Config.MIN_SCORE_TO_RECOMMEND -
        i.e. matched at least one real thing about the user's skin type,
        condition, or a relevant ingredient. A product that matches nothing
        about this user is NOT a recommendation and is excluded entirely,
        not just ranked last. This matters more as the catalog grows past a
        handful of products - "show everything, ranked" stops looking like
        a recommendation and starts looking like a product listing.
        """
        top_n = top_n or Config.TOP_N_PER_CATEGORY
        scored_by_category = {}
        excluded = []  # hard-blocked for safety (allergy/pregnancy) - always reported for transparency
        not_relevant_count = 0  # scored <= 0 - silently dropped, only a count is reported

        for product in self.store.products_by_id.values():
            product_ingredients = self.store.ingredients_for_product(product["product_id"])

            blocked, reason = _is_blocked_by_allergy(product_ingredients, profile.allergies)
            if blocked:
                excluded.append({"product_id": product["product_id"], "name": product["name"], "reason": reason})
                continue

            blocked, reason = _is_blocked_by_pregnancy(product_ingredients, profile.is_pregnant_or_breastfeeding)
            if blocked:
                excluded.append({"product_id": product["product_id"], "name": product["name"], "reason": reason})
                continue

            result = _score_product(product, product_ingredients, profile)
            if result is None:
                continue
            score, reasons, warnings = result

            if score <= Config.MIN_SCORE_TO_RECOMMEND:
                not_relevant_count += 1
                continue

            scored = self._build_scored_product(product, product_ingredients, score, reasons, warnings)
            scored_by_category.setdefault(product["category"], []).append(scored)

        for category in scored_by_category:
            scored_by_category[category].sort(key=lambda p: p.score, reverse=True)
            scored_by_category[category] = scored_by_category[category][:top_n]

        return {
            "recommendations": scored_by_category,
            "excluded_for_safety": excluded,
            "not_relevant_count": not_relevant_count,
        }

    def find_alternatives(self, current_product_id, profile: UserProfile, top_n=None):
        """
        Second entry flow: "I already use this product - is it right for me,
        and what else should I consider?" Checks the current product against
        the user's own safety profile first (it may be the SAME allergy/
        pregnancy check that would have blocked it from a fresh recommendation),
        then returns other products in the same category, scored normally.
        """
        current = self.store.products_by_id.get(current_product_id)
        if not current:
            return {"error": f"Unknown product_id: {current_product_id}"}

        current_ingredients = self.store.ingredients_for_product(current_product_id)
        current_warnings = []
        blocked, reason = _is_blocked_by_allergy(current_ingredients, profile.allergies)
        if blocked:
            current_warnings.append(reason)
        blocked, reason = _is_blocked_by_pregnancy(current_ingredients, profile.is_pregnant_or_breastfeeding)
        if blocked:
            current_warnings.append(reason)

        result = _score_product(current, current_ingredients, profile)
        current_score = result[0] if result else 0
        current_reasons = result[1] if result else []

        alt_profile = profile
        full_result = self.recommend(alt_profile, top_n=top_n)
        same_category = full_result["recommendations"].get(current["category"], [])
        alternatives = [p for p in same_category if p.product_id != current_product_id]

        return {
            "current_product": {
                "product_id": current["product_id"],
                "name": current["name"],
                "score": current_score,
                "reasons": current_reasons,
                "warnings": current_warnings,
            },
            "alternatives": alternatives,
        }


# ═══════════════════════════════════════════════════════════════
#  SINGLETON  (mirrors pipeline_engine.get_pipeline() pattern)
# ═══════════════════════════════════════════════════════════════
_engine_instance = None


def get_engine():
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RecommendationEngine()
    return _engine_instance


# ═══════════════════════════════════════════════════════════════
#  CLI TEST
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = get_engine()

    test_profile = UserProfile(
        skin_type="oily",
        skin_conditions=["cystic_acne"],
        skin_tone="dark",
        age_bracket="18-24",
        allergies=["parfum"],
        is_pregnant_or_breastfeeding=False,
        current_product_ids=[],
    )
    result = engine.recommend(test_profile)

    print(f"\nExcluded for safety ({len(result['excluded_for_safety'])}):")
    for ex in result["excluded_for_safety"]:
        print(f"  - {ex['name']}: {ex['reason']}")

    print(f"\nNot relevant to this profile (score<=0, silently dropped): {result['not_relevant_count']}")

    print("\nRecommendations by category:")
    for category, products in result["recommendations"].items():
        print(f"\n[{category}]")
        for p in products:
            price = f"Rs. {p.price_pkr_low:.0f}-{p.price_pkr_high:.0f}" if p.price_pkr_low else "price N/A"
            print(f"  {p.score:+.1f}  {p.name} ({p.brand_name}) - {price}")
            for r in p.reasons:
                print(f"       + {r}")
            for w in p.warnings:
                print(f"       ! {w}")
            if p.safety_advisory:
                print(f"       SAFETY ADVISORY: {p.safety_advisory[:100]}...")

    print("\n--- find_alternatives test (user already uses CeraVe Foaming Facial Cleanser) ---")
    alt_result = engine.find_alternatives("80001", test_profile)
    print("Current product:", alt_result["current_product"])
    print("Alternatives:")
    for p in alt_result["alternatives"]:
        print(f"  {p.score:+.1f}  {p.name}")
