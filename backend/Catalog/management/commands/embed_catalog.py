from django.core.management.base import BaseCommand

from Catalog.embeddings import ingredient_text, product_text, embed_texts
from Catalog.models import Ingredient, Product

BATCH = 64


class Command(BaseCommand):
    help = "Fill empty ingredient and product embeddings with the local MiniLM model."

    def handle(self, *args, **options):
        self._fill(Ingredient, ingredient_text, "ingredients")
        self._fill(Product, product_text, "products")

    def _fill(self, model, text_for, label):
        pending = list(model.objects.filter(embedding__isnull=True))
        self.stdout.write(f"{label}: {len(pending)} rows need embeddings")
        for start in range(0, len(pending), BATCH):
            chunk = pending[start:start + BATCH]
            vectors = embed_texts([text_for(row) for row in chunk])
            for row, vector in zip(chunk, vectors):
                row.embedding = vector
            model.objects.bulk_update(chunk, ["embedding"])
            self.stdout.write(f"{label}: {min(start + BATCH, len(pending))}/{len(pending)}")
