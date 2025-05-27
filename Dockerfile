# ---------- Stage 1: Build React frontend ----------
FROM node:20 AS frontend-builder

WORKDIR /app
COPY client/ ./client/
WORKDIR /app/client

RUN npm install
RUN npm run build

# ---------- Stage 2: Build FastAPI backend ----------
FROM python:3.12-slim AS backend

# Install system deps for uvicorn
RUN apt-get update && apt-get install -y build-essential

WORKDIR /app

# Copy frontend build output to backend static dir
COPY --from=frontend-builder /app/client/build ./tokenserver/static

COPY README.md ./
COPY poetry.lock ./
COPY poetry.toml ./
COPY pyproject.toml ./

RUN pip install poetry

COPY tokenserver/ ./tokenserver/

RUN poetry config virtualenvs.create false \
     && poetry install --no-interaction --no-ansi


EXPOSE 8000
# Expose FastAPI app
CMD ["python3", "-m", "tokenserver"]
