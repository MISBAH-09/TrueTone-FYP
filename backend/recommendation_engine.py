"""
TrueTone – Recommendation Engine
=================================
Rule-based, content-filtering recommendation engine. Takes a user's
onboarding answers (+ optionally the CNN pipeline's skin predictions) and
returns ranked product recommendations, grouped by category.

Framework-agnostic — works with Django, FastAPI, or CLI, same as
pipeline_engine.py.

Data source: the Catalog tables in Postgres (brands, ingredients, products,
and product-ingredient links). Scoring below does not read the CSV files.

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

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("truetone.recommender")


# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════
class Config:
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
def _split_list(raw):
    """CSV cells like 'acne, hyperpigmentation' -> ['acne', 'hyperpigmentation']."""
    if not raw:
        return []
    return [s.strip().lower() for s in raw.split(",") if s.strip()]


class DataStore:
    """Loads the catalog tables once and indexes them for fast lookup."""

    def __init__(self):
        self.ingredients_by_id = {}
        self.ingredients_by_name = {}
        self.products_by_id = {}
        self.product_ingredient_ids = {}   # product_id -> [ingredient_id, ...]
        self.brands_by_id = {}
        self._load()

    def _load(self):
        from Catalog.models import Brand, Ingredient, Product, ProductIngredient

        for ingredient in Ingredient.objects.defer("embedding").iterator():
            row = {
                "ingredient_id": str(ingredient.ingredient_id),
                "inci_name": ingredient.inci_name or "",
                "functions": ingredient.functions or "",
                "is_common_allergen": ingredient.is_common_allergen,
                "allergen_source": ingredient.allergen_source or "",
                "comedogenic_rating": ingredient.comedogenic_rating,
                "is_fungal_acne_trigger": ingredient.is_fungal_acne_trigger,
                "cosing_restriction": ingredient.cosing_restriction or "",
                "chemical_description": ingredient.chemical_description or "",
                "good_for_conditions": _split_list(ingredient.good_for_conditions),
                "avoid_for_conditions": _split_list(ingredient.avoid_for_conditions),
                "avoid_if_pregnant": ingredient.avoid_if_pregnant or "",
                "not_recommended_below_age": ingredient.not_recommended_below_age or "",
                "tone_caution_note": ingredient.tone_caution_note or "",
            }
            self.ingredients_by_id[row["ingredient_id"]] = row
            inci = row["inci_name"].strip().lower()
            if inci:
                self.ingredients_by_name[inci] = row

        for brand in Brand.objects.iterator():
            self.brands_by_id[str(brand.brand_id)] = {
                "brand_id": str(brand.brand_id),
                "name": brand.name or "",
                "country": brand.country or "",
                "available_in_pk": brand.available_in_pk,
            }

        for product in Product.objects.defer("embedding").iterator():
            row = {
                "product_id": str(product.product_id),
                "brand_id": "" if product.brand_id is None else str(product.brand_id),
                "name": product.name or "",
                "category": product.category or "",
                "price_pkr": product.price_pkr,
                "available_in_pakistan": product.available_in_pakistan,
                "purchase_link": product.purchase_link or "",
                "image_url": product.image_url or "",
                "raw_ingredient_text": product.raw_ingredient_text or "",
                "source": product.source or "",
                "safety_advisory": product.safety_advisory or "",
                "age_relevance": product.age_relevance or "",
                "suitable_skin_types": _split_list(product.suitable_skin_types),
                "suitable_conditions": _split_list(product.suitable_conditions),
            }
            self.products_by_id[row["product_id"]] = row

        for link in ProductIngredient.objects.order_by("product_id", "position_index", "id").iterator():
            product_id = str(link.product_id)
            self.product_ingredient_ids.setdefault(product_id, []).append(str(link.ingredient_id))

        logger.info(
            f"Loaded {len(self.ingredients_by_id)} ingredients, "
            f"{len(self.products_by_id)} products, "
            f"{len(self.brands_by_id)} brands from the catalog database"
        )

    def ingredients_for_product(self, product_id):
        ids = self.product_ingredient_ids.get(str(product_id), [])
        return [self.ingredients_by_id[i] for i in ids if i in self.ingredients_by_id]

    def resolve_ingredient(self, name):
        """Match an OCR ingredient string to the ingredient catalog."""
        key = (name or "").strip().lower()
        if not key:
            return None
        exact = self.ingredients_by_name.get(key)
        if exact:
            return exact
        best = None
        for inci, row in self.ingredients_by_name.items():
            if len(inci) < 4:
                continue
            if inci in key or key in inci:
                if best is None or len(inci) > len(best[0]):
                    best = (inci, row)
        return best[1] if best else None


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

ACNE_TAGS = {"common_acne", "cystic_acne"}


def _pretty_condition(c):
    """Display name for a condition tag; both acne types read simply as 'acne'."""
    return "acne" if c in ACNE_TAGS else c.replace("_", " ")
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
    # Acne is no longer split by type: match anything tagged for either type
    if user_conditions & ACNE_TAGS:
        user_conditions |= ACNE_TAGS
    matched_conditions = user_conditions & set(product["suitable_conditions"])
    if matched_conditions:
        score += Config.WEIGHT_CONDITION_MATCH
        reasons.append(f"Targets {', '.join(sorted({_pretty_condition(c) for c in matched_conditions}))}")

    # ingredient-level good_for / avoid_for
    good_hits, avoid_hits = 0, 0
    for ing in product_ingredients:
        if user_conditions & set(ing["good_for_conditions"]):
            good_hits += 1
        if user_conditions & set(ing["avoid_for_conditions"]):
            avoid_hits += 1
            avoided = {_pretty_condition(c) for c in user_conditions & set(ing["avoid_for_conditions"])}
            warnings.append(f"{ing['inci_name']} may not suit {'/'.join(sorted(avoided))}")

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
        current_product_id = str(current_product_id)
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

    def score_scanned_ingredients(self, ingredient_names, profile: UserProfile):
        """
        Score a product that is not in the catalog, using the ingredients
        Gemini read off the label. Same allergy, pregnancy, and ingredient
        fit rules as recommend(). Skin-type and age bonuses need a catalog
        product, so they are not applied here.
        """
        matched = []
        unmatched = []
        seen = set()
        for raw in ingredient_names:
            row = self.store.resolve_ingredient(raw)
            if row is None:
                unmatched.append(raw)
                continue
            if row["ingredient_id"] in seen:
                continue
            seen.add(row["ingredient_id"])
            matched.append(row)

        flags = []
        blocked = False

        allergy_hits = []
        for name in list(ingredient_names) + [row["inci_name"] for row in matched]:
            for allergy in profile.allergies:
                needle = allergy.strip().lower()
                if needle and needle in name.lower() and name not in allergy_hits:
                    allergy_hits.append(name)
        if allergy_hits:
            blocked = True
            flags.append(f"Contains your allergens: {', '.join(allergy_hits)}")

        if profile.is_pregnant_or_breastfeeding:
            unsafe = [
                row["inci_name"] for row in matched
                if str(row.get("avoid_if_pregnant", "")).strip().lower() == "yes"
            ]
            if unsafe:
                blocked = True
                flags.append(
                    f"Not safe for pregnancy/breastfeeding (Contains: {', '.join(unsafe)})"
                )

        user_conditions = {c.lower() for c in profile.skin_conditions}
        if user_conditions & ACNE_TAGS:
            user_conditions |= ACNE_TAGS

        good_hits, avoid_hits = 0, 0
        reasons, warnings = [], []
        for ing in matched:
            good = user_conditions & set(ing.get("good_for_conditions") or [])
            avoid = user_conditions & set(ing.get("avoid_for_conditions") or [])
            if good:
                good_hits += 1
                reasons.append(
                    f"{ing['inci_name']} is used for {', '.join(sorted({_pretty_condition(c) for c in good}))}"
                )
            if avoid:
                avoid_hits += 1
                warnings.append(
                    f"{ing['inci_name']} may not suit {'/'.join(sorted({_pretty_condition(c) for c in avoid}))}"
                )
            if (user_conditions & ACNE_TAGS or (profile.skin_type or "").lower() == "oily"):
                try:
                    rating = float(ing.get("comedogenic_rating") or 0)
                except (TypeError, ValueError):
                    rating = 0
                if rating >= 3:
                    warnings.append(f"{ing['inci_name']} is more likely to clog pores (rating {rating:g})")

        score = min(good_hits * Config.WEIGHT_INGREDIENT_GOOD_FOR, Config.WEIGHT_INGREDIENT_GOOD_FOR_CAP)
        score += max(avoid_hits * Config.WEIGHT_INGREDIENT_AVOID_FOR, Config.WEIGHT_INGREDIENT_AVOID_FOR_CAP)

        if not user_conditions:
            reasons.append("No skin condition is on your profile, so this score is only the ingredient fit we could measure.")
        if not matched:
            warnings.append("None of these ingredient names are in the TrueTone ingredient list, so the score is 0.")

        return {
            "score": round(score, 2),
            "is_safe": not blocked,
            "reasons": reasons,
            "warnings": warnings,
            "flags": flags,
            "matched_ingredients": [row["inci_name"] for row in matched],
            "unmatched_ingredients": unmatched,
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
