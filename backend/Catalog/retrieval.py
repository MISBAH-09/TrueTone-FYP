"""Nearest catalog rows for one chatbot question."""
from pgvector.django import CosineDistance

from Catalog.embeddings import embed_text
from Catalog.models import Ingredient, Product


def _similarity(distance):
    return round(max(0.0, min(1.0, 1.0 - float(distance))), 2)


def _allergy_hit(text, allergies):
    haystack = (text or "").lower()
    return any(allergy and allergy in haystack for allergy in allergies)


def retrieve_for_question(question, profile, ingredient_limit=5, product_limit=3):
    vector = embed_text(question)
    allergies = [item.strip().lower() for item in profile.allergies if item and item.strip()]
    pregnant = bool(profile.is_pregnant_or_breastfeeding)

    ingredients = (
        Ingredient.objects.exclude(embedding=None)
        .annotate(distance=CosineDistance("embedding", vector))
        .order_by("distance")[:40]
    )
    products = (
        Product.objects.exclude(embedding=None)
        .annotate(distance=CosineDistance("embedding", vector))
        .order_by("distance")[:20]
    )

    retrieved = []
    for ingredient in ingredients:
        if _allergy_hit(ingredient.inci_name, allergies):
            continue
        if pregnant and (ingredient.avoid_if_pregnant or "").strip().lower() == "yes":
            continue
        detail = ingredient.good_for_conditions or ingredient.functions or ingredient.chemical_description
        retrieved.append({
            "kind": "ingredient",
            "name": ingredient.inci_name,
            "detail": (detail or "Matched from the ingredient list.")[:180],
            "score": _similarity(ingredient.distance),
        })
        if sum(1 for item in retrieved if item["kind"] == "ingredient") >= ingredient_limit:
            break

    product_hits = []
    for product in products:
        blob = f"{product.name} {product.raw_ingredient_text}"
        if _allergy_hit(blob, allergies):
            continue
        detail = product.category or "Matched from the product catalog."
        if product.suitable_skin_types:
            detail = f"{detail}. Suitable for {product.suitable_skin_types} skin."
        product_hits.append({
            "kind": "product",
            "name": product.name,
            "detail": detail[:180],
            "score": _similarity(product.distance),
        })
        if len(product_hits) >= product_limit:
            break
    retrieved.extend(product_hits)
    return retrieved


def profile_summary(user, profile):
    parts = []
    if user.skin_type:
        parts.append(f"{user.skin_type.replace('_', ' ').title()} skin")
    if profile.skin_conditions:
        parts.append(", ".join(item.replace("_", " ").title() for item in profile.skin_conditions))
    if profile.allergies:
        parts.append(", ".join(f"{item.title()} allergy" for item in profile.allergies))
    if user.is_pregnant_or_breastfeeding:
        parts.append("Pregnant or breastfeeding")
    return " - ".join(parts) or "No skin profile saved"


def rag_payload(user, profile, retrieved):
    return {
        "profile": profile_summary(user, profile),
        "knowledge_base": "Ingredients database",
        "retrieved": retrieved,
        "model": "Groq - Qwen",
    }


def retrieved_prompt(retrieved):
    if not retrieved:
        return "No catalog rows were retrieved for this question."
    lines = []
    for item in retrieved:
        lines.append(f"- {item['name']} ({item['kind']}, similarity {item['score']}): {item['detail']}")
    return "\n".join(lines)
