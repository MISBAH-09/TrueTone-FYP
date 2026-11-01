"""Local embeddings for catalog retrieval. Groq is not used here."""
_model = None
MODEL_NAME = "all-MiniLM-L6-v2"


def _encoder():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts):
    if not texts:
        return []
    vectors = _encoder().encode(list(texts), normalize_embeddings=True)
    return [vector.tolist() for vector in vectors]


def embed_text(text):
    return embed_texts([text or ""])[0]


def ingredient_text(ingredient):
    parts = [
        ingredient.inci_name,
        ingredient.functions,
        ingredient.chemical_description,
        f"good for {ingredient.good_for_conditions}" if ingredient.good_for_conditions else "",
        f"avoid for {ingredient.avoid_for_conditions}" if ingredient.avoid_for_conditions else "",
        f"pregnancy {ingredient.avoid_if_pregnant}" if ingredient.avoid_if_pregnant else "",
    ]
    return ". ".join(part.strip() for part in parts if part and part.strip())


def product_text(product):
    parts = [
        product.name,
        product.category,
        f"skin types {product.suitable_skin_types}" if product.suitable_skin_types else "",
        f"conditions {product.suitable_conditions}" if product.suitable_conditions else "",
        product.raw_ingredient_text,
        product.safety_advisory,
    ]
    return ". ".join(part.strip() for part in parts if part and part.strip())
