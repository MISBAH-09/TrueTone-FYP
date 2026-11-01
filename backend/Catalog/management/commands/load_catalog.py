import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from Catalog.models import Brand, Ingredient, Product, ProductIngredient

DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "fyp_dataset"


def _text(value):
    return (value or "").strip()


def _bool(value):
    text = _text(value).lower()
    if text in ("true", "1", "yes"):
        return True
    if text in ("false", "0", "no"):
        return False
    return None


def _float(value):
    text = _text(value)
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _int(value):
    text = _text(value)
    if not text:
        return None
    return int(float(text))


def _count_csv(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return sum(1 for _ in csv.DictReader(handle))


class Command(BaseCommand):
    help = "Upload brands, ingredients, products, and product-ingredient links from the four CSVs."

    def handle(self, *args, **options):
        brand_rows = self._load_brands()
        ingredient_rows = self._load_ingredients()
        product_rows = self._load_products()
        link_rows, skipped_links = self._load_links()

        checks = [
            ("brands.csv", DATA_DIR / "brands.csv", brand_rows, Brand.objects.count()),
            ("ingredients.csv", DATA_DIR / "ingredients.csv", ingredient_rows, Ingredient.objects.count()),
            ("products.csv", DATA_DIR / "products.csv", product_rows, Product.objects.count()),
            ("product_ingredients.csv", DATA_DIR / "product_ingredients.csv", link_rows, ProductIngredient.objects.count()),
        ]
        for name, path, loaded, stored in checks:
            file_count = _count_csv(path)
            self.stdout.write(f"{name}: file {file_count}, loaded {loaded}, table {stored}")
            if name != "product_ingredients.csv" and stored != file_count:
                raise SystemExit(f"{name} row count does not match the file")
        if skipped_links:
            self.stdout.write(self.style.WARNING(f"Skipped {skipped_links} links with a missing product or ingredient id"))

    def _load_brands(self):
        rows = []
        with (DATA_DIR / "brands.csv").open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                rows.append(Brand(
                    brand_id=_int(row["brand_id"]),
                    name=_text(row.get("name")),
                    country=_text(row.get("country")),
                    available_in_pk=_bool(row.get("available_in_pk")),
                ))
        Brand.objects.bulk_create(rows, update_conflicts=True, unique_fields=["brand_id"], update_fields=["name", "country", "available_in_pk"])
        return len(rows)

    def _load_ingredients(self):
        rows = []
        with (DATA_DIR / "ingredients.csv").open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                rows.append(Ingredient(
                    ingredient_id=_int(row["ingredient_id"]),
                    inci_name=_text(row.get("inci_name")),
                    functions=_text(row.get("functions")),
                    is_common_allergen=_bool(row.get("is_common_allergen")),
                    allergen_source=_text(row.get("allergen_source")),
                    comedogenic_rating=_float(row.get("comedogenic_rating")),
                    is_fungal_acne_trigger=_float(row.get("is_fungal_acne_trigger")),
                    cosing_restriction=_text(row.get("cosing_restriction")),
                    chemical_description=_text(row.get("chemical_description")),
                    good_for_conditions=_text(row.get("good_for_conditions")),
                    avoid_for_conditions=_text(row.get("avoid_for_conditions")),
                    avoid_if_pregnant=_text(row.get("avoid_if_pregnant")),
                    not_recommended_below_age=_text(row.get("not_recommended_below_age")),
                    tone_caution_note=_text(row.get("tone_caution_note")),
                ))
        Ingredient.objects.bulk_create(
            rows,
            batch_size=500,
            update_conflicts=True,
            unique_fields=["ingredient_id"],
            update_fields=[
                "inci_name", "functions", "is_common_allergen", "allergen_source",
                "comedogenic_rating", "is_fungal_acne_trigger", "cosing_restriction",
                "chemical_description", "good_for_conditions", "avoid_for_conditions",
                "avoid_if_pregnant", "not_recommended_below_age", "tone_caution_note",
            ],
        )
        return len(rows)

    def _load_products(self):
        brand_ids = set(Brand.objects.values_list("brand_id", flat=True))
        rows = []
        with (DATA_DIR / "products.csv").open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                brand_id = _int(row.get("brand_id"))
                rows.append(Product(
                    product_id=_int(row["product_id"]),
                    brand_id=brand_id if brand_id in brand_ids else None,
                    name=_text(row.get("name")),
                    category=_text(row.get("category")),
                    price_pkr=_float(row.get("price_pkr")),
                    available_in_pakistan=_bool(row.get("available_in_pakistan")),
                    purchase_link=_text(row.get("purchase_link")),
                    image_url=_text(row.get("image_url")),
                    raw_ingredient_text=_text(row.get("raw_ingredient_text")),
                    source=_text(row.get("source")),
                    safety_advisory=_text(row.get("safety_advisory")),
                    age_relevance=_text(row.get("age_relevance")),
                    suitable_skin_types=_text(row.get("suitable_skin_types")),
                    suitable_conditions=_text(row.get("suitable_conditions")),
                ))
        Product.objects.bulk_create(
            rows,
            batch_size=200,
            update_conflicts=True,
            unique_fields=["product_id"],
            update_fields=[
                "brand", "name", "category", "price_pkr", "available_in_pakistan",
                "purchase_link", "image_url", "raw_ingredient_text", "source",
                "safety_advisory", "age_relevance", "suitable_skin_types", "suitable_conditions",
            ],
        )
        return len(rows)

    def _load_links(self):
        product_ids = set(Product.objects.values_list("product_id", flat=True))
        ingredient_ids = set(Ingredient.objects.values_list("ingredient_id", flat=True))
        rows = []
        skipped = 0
        with (DATA_DIR / "product_ingredients.csv").open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                product_id = _int(row.get("product_id"))
                ingredient_id = _int(row.get("ingredient_id"))
                if product_id not in product_ids or ingredient_id not in ingredient_ids:
                    skipped += 1
                    continue
                rows.append(ProductIngredient(
                    product_id=product_id,
                    ingredient_id=ingredient_id,
                    position_index=_int(row.get("position_index")),
                    concentration_percentage=_float(row.get("concentration_percentage")),
                ))
        ProductIngredient.objects.all().delete()
        ProductIngredient.objects.bulk_create(rows, batch_size=1000, ignore_conflicts=True)
        return len(rows), skipped
