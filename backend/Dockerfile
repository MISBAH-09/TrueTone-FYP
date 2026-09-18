FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker caches this layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project files
COPY manage.py .
COPY pipeline_engine.py .
COPY truetone/ truetone/
COPY models_api/ models_api/
COPY models/ models/
COPY templates/ templates/

# Create static directory
RUN mkdir -p static

# Hugging Face Spaces uses port 7860
ENV PORT=7860
ENV DJANGO_SETTINGS_MODULE=truetone.settings

EXPOSE 7860

# Use gunicorn for production (not manage.py runserver)
CMD ["gunicorn", "truetone.wsgi:application", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "120"]
