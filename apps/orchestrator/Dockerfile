# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /app

RUN pip install --no-cache-dir "uv==0.5.11"

# Install deps directly — avoids building the local package (we run from source)
RUN uv pip install --system --no-cache \
      "fastapi>=0.115.0" \
      "uvicorn[standard]>=0.30.0" \
      "google-adk>=1.2.0" \
      "google-genai>=1.7.0" \
      "google-cloud-firestore>=2.19.0" \
      "google-cloud-pubsub>=2.26.0" \
      "pydantic>=2.8.0"

COPY pyproject.toml ./
COPY src ./src

EXPOSE 8080

CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
