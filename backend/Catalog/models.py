from django.db import models
from pgvector.django import VectorField

EMBEDDING_DIM = 384


class Brand(models.Model):
    brand_id = models.IntegerField(primary_key=True)
    name = models.TextField(blank=True, default="")
    country = models.TextField(blank=True, default="")
    available_in_pk = models.BooleanField(null=True)

    class Meta:
        db_table = "catalog_brands"

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    ingredient_id = models.IntegerField(primary_key=True)
    inci_name = models.TextField(blank=True, default="")
    functions = models.TextField(blank=True, default="")
    is_common_allergen = models.BooleanField(null=True)
    allergen_source = models.TextField(blank=True, default="")
    comedogenic_rating = models.FloatField(null=True)
    is_fungal_acne_trigger = models.FloatField(null=True)
    cosing_restriction = models.TextField(blank=True, default="")
    chemical_description = models.TextField(blank=True, default="")
    good_for_conditions = models.TextField(blank=True, default="")
    avoid_for_conditions = models.TextField(blank=True, default="")
    avoid_if_pregnant = models.TextField(blank=True, default="")
    not_recommended_below_age = models.TextField(blank=True, default="")
    tone_caution_note = models.TextField(blank=True, default="")
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True)

    class Meta:
        db_table = "catalog_ingredients"

    def __str__(self):
        return self.inci_name


class Product(models.Model):
    product_id = models.IntegerField(primary_key=True)
    brand = models.ForeignKey(Brand, null=True, on_delete=models.SET_NULL, related_name="products")
    name = models.TextField(blank=True, default="")
    category = models.TextField(blank=True, default="")
    price_pkr = models.FloatField(null=True)
    available_in_pakistan = models.BooleanField(null=True)
    purchase_link = models.TextField(blank=True, default="")
    image_url = models.TextField(blank=True, default="")
    raw_ingredient_text = models.TextField(blank=True, default="")
    source = models.TextField(blank=True, default="")
    safety_advisory = models.TextField(blank=True, default="")
    age_relevance = models.TextField(blank=True, default="")
    suitable_skin_types = models.TextField(blank=True, default="")
    suitable_conditions = models.TextField(blank=True, default="")
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True)

    class Meta:
        db_table = "catalog_products"

    def __str__(self):
        return self.name


class ProductIngredient(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="ingredient_links")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="product_links")
    position_index = models.IntegerField(null=True)
    concentration_percentage = models.FloatField(null=True)

    class Meta:
        db_table = "catalog_product_ingredients"
        constraints = [
            models.UniqueConstraint(
                fields=["product", "ingredient", "position_index"],
                name="catalog_product_ingredient_position",
            )
        ]
