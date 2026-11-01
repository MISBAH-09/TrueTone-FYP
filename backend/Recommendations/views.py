"""
TrueTone Recommendations API
=============================
New Django app: `Recommendations`. Mirrors the models_api pattern
(function-based views, JsonResponse, @require_http_methods).

Setup:
  1. Create the app:  python manage.py startapp Recommendations
  2. Replace its views.py with this file's content, add urls.py below
  3. Add 'Recommendations' to INSTALLED_APPS in truetone/settings.py
  4. Add `path('api/recommendations/', include('Recommendations.urls'))`
     to truetone/urls.py
  5. Load the catalog tables with `py manage.py load_catalog`. The
     recommendation engine reads those tables, not the CSV files.

Endpoints:
    POST /api/recommendations/get   — logged-in user -> ranked recommendations
"""

import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from Users.middleware import require_token
from recommendation_engine import get_engine, UserProfile

logger = logging.getLogger("Recommendations.views")


def _scored_product_to_dict(p):
    return {
        "product_id": p.product_id,
        "name": p.name,
        "category": p.category,
        "brand_name": p.brand_name,
        "price_pkr_low": p.price_pkr_low,
        "price_pkr_high": p.price_pkr_high,
        "purchase_link": p.purchase_link,
        "ingredients": p.ingredients,
        "score": p.score,
        "reasons": p.reasons,
        "warnings": p.warnings,
        "safety_advisory": p.safety_advisory,
        "breakdown": p.breakdown,
        "max_score": p.max_score,
    }


# inspector-patch: dry-run support for the Pipeline Inspector page
def _read_profile_override(request):
    """
    Optional dry run. The Inspector page sends the profile it
    just scanned as JSON: {"profile_override": {"skin_type", "skin_tone",
    "skin_conditions": []}}. Returns a sanitised dict, or None for a normal request.
    Nothing is saved - age, allergies and pregnancy still come from the saved profile.
    """
    import json
    import re
    try:
        body = json.loads(request.body or b"{}")
    except (ValueError, TypeError):
        return None
    raw = body.get("profile_override") if isinstance(body, dict) else None
    if not isinstance(raw, dict):
        return None
    clean = {}
    if raw.get("skin_type") in ("oily", "dry", "combination", "normal"):
        clean["skin_type"] = raw["skin_type"]
    if raw.get("skin_tone") in ("fair", "medium", "dark"):
        clean["skin_tone"] = raw["skin_tone"]
    if isinstance(raw.get("skin_conditions"), list):
        clean["skin_conditions"] = [
            c.strip().lower() for c in raw["skin_conditions"]
            if isinstance(c, str) and re.fullmatch(r"[A-Za-z_]{1,40}", c.strip())
        ][:5]
    return clean or None


@csrf_exempt
@require_http_methods(["POST"])
@require_token
def get_recommendations(request):
    """
    Build recommendations for the logged-in user from their saved
    onboarding profile (Users.User). Requires onboarding_completed=True.

    Response (200):
        {
          "status": "success",
          "recommendations": { "cleanser": [...], "moisturizer": [...], ... },
          "excluded_for_safety": [ {product_id, name, reason}, ... ]
        }
    """
    user = request.auth_user

    if not user.onboarding_completed:
        return JsonResponse({
            "status": "error",
            "error_code": "ONBOARDING_INCOMPLETE",
            "message": "Complete onboarding before requesting recommendations.",
        }, status=400)

    profile = UserProfile(
        skin_type=user.skin_type,
        skin_conditions=user.skin_disease_list(),
        skin_tone=user.skin_tone or None,
        age_bracket=user.age_bracket or None,
        allergies=user.allergies_list(),
        is_pregnant_or_breastfeeding=user.is_pregnant_or_breastfeeding,
        current_product_ids=user.current_products_list(),
    )

    profile_source = "saved_profile"
    override = _read_profile_override(request)
    if override:
        if "skin_type" in override:
            profile.skin_type = override["skin_type"]
        if "skin_tone" in override:
            profile.skin_tone = override["skin_tone"]
        if "skin_conditions" in override:
            profile.skin_conditions = override["skin_conditions"]
        profile_source = "scan_preview"

    try:
        engine = get_engine()
        result = engine.recommend(profile)
    except Exception as e:
        logger.error(f"Recommendation engine error for {user.username}: {e}")
        return JsonResponse({
            "status": "error",
            "error_code": "ENGINE_ERROR",
            "message": str(e),
        }, status=500)

    recommendations = {
        category: [_scored_product_to_dict(p) for p in products]
        for category, products in result["recommendations"].items()
    }

    return JsonResponse({
        "status": "success",
        "recommendations": recommendations,
        "excluded_for_safety": result["excluded_for_safety"],
        "not_relevant_count": result["not_relevant_count"],
        "profile_used": {
            "source": profile_source,
            "skin_type": profile.skin_type,
            "skin_tone": profile.skin_tone,
            "skin_conditions": list(profile.skin_conditions),
            "age_bracket": profile.age_bracket,
            "allergies": list(profile.allergies),
            "is_pregnant_or_breastfeeding": profile.is_pregnant_or_breastfeeding,
        },
    })


@csrf_exempt
@require_http_methods(["POST"])
@require_token
def get_alternatives(request):
    """
    Second entry flow: "I already use this product." Body: {"product_id": "80001"}
    Checks that specific product against the user's safety profile, then
    returns other products in the same category as alternatives.
    """
    import json

    user = request.auth_user
    if not user.onboarding_completed:
        return JsonResponse({
            "status": "error",
            "error_code": "ONBOARDING_INCOMPLETE",
            "message": "Complete onboarding before requesting alternatives.",
        }, status=400)

    try:
        body = json.loads(request.body)
        product_id = body.get("product_id")
    except (json.JSONDecodeError, AttributeError):
        product_id = request.POST.get("product_id")

    if not product_id:
        return JsonResponse({"status": "error", "message": "product_id is required"}, status=400)

    profile = UserProfile(
        skin_type=user.skin_type,
        skin_conditions=user.skin_disease_list(),
        skin_tone=user.skin_tone or None,
        age_bracket=user.age_bracket or None,
        allergies=user.allergies_list(),
        is_pregnant_or_breastfeeding=user.is_pregnant_or_breastfeeding,
        current_product_ids=user.current_products_list(),
    )

    engine = get_engine()
    result = engine.find_alternatives(product_id, profile)
    if "error" in result:
        return JsonResponse({"status": "error", "message": result["error"]}, status=404)

    result["alternatives"] = [_scored_product_to_dict(p) for p in result["alternatives"]]
    return JsonResponse({"status": "success", **result})
