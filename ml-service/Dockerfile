# ── Stage 1: Install Python dependencies ──────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Production runner ────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

# Security: run as non-root
RUN groupadd -r mlgroup && useradd -r -g mlgroup mluser

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source and model artefacts
COPY main.py schemas.py explainer.py feature_engineering.py ./
COPY model/model.pkl model/label_encoder.pkl model/decision_tree.pkl model/metadata.json ./model/

# Switch to non-root user
USER mluser

# Port configuration — Railway injects $PORT at runtime
ENV PORT=8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

STOPSIGNAL SIGTERM

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
