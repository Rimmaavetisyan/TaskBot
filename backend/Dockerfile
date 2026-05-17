FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app

# Default CMD for Fly.io (docker-compose overrides this per service)
CMD ["supervisord", "-c", "/app/supervisord.conf"]
