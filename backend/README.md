# Backend — SMHI Weather Tracker API

FastAPI service that aggregates SMHI cloud observations and lightning strike logs into spatial/temporal weather analytics.

## 🧱 Modules

| File | Responsibility |
|------|----------------|
| [app/main.py](app/main.py) | FastAPI app, 4 routes, lifespan-driven startup (DB init → station preload → background seeder) |
| [app/database.py](app/database.py) | SQLite schema (`stations`, `lightning`, `seeding_status`) + indexes |
| [app/services/geocoding_service.py](app/services/geocoding_service.py) | OSM Nominatim wrapper with Nordic-first → global fallback |
| [app/services/smhi_service.py](app/services/smhi_service.py) | Station catalog, CSV ingestion, IDW interpolation, spatial lightning queries, async background seeder |
| [app/services/forecast_service.py](app/services/forecast_service.py) | Gemini 2.5-flash forecast + statistical climatology fallback |

## 🏃 Run locally

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- ReDoc:      http://localhost:8000/redoc

### Environment variables

| Var | Purpose | Default |
|-----|---------|---------|
| `GEMINI_API_KEY` | Enables real AI forecasts via Google Gemini | unset → statistical fallback |

## 🐳 Docker

```bash
docker build -t smhi-backend .
docker run -p 8000:8000 -e GEMINI_API_KEY=$GEMINI_API_KEY smhi-backend
```

## 🔌 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/geocode?address=…` | Address → `{lat, lon, display_name}` |
| `GET` | `/api/weather?lat=…&lon=…&difficulty=easy\|medium\|hard` | Cloud + lightning aggregates |
| `GET` | `/api/forecast?lat=…&lon=…&difficulty=…` | 12-month forecast + narrative |
| `GET` | `/api/cache-status?year=2024` | Background seeder progress |

## 🧠 Difficulty tiers

| Tier | Cloud strategy | Lightning radius |
|------|----------------|------------------|
| `easy` | Snap to nearest preset city (Stockholm / Göteborg / Malmö / Kiruna / Visby) | 50 km |
| `medium` | Nearest 1 active SMHI station, fetch its CSV | 25 km |
| `hard` | 3 nearest stations + Inverse Distance Weighting (`w = 1/d²`) | 15 km |

## 🗄️ Database

SQLite file at `app/weather_cache.db` (auto-created on first boot). Three tables:

- `stations` — ~108 active SMHI Parameter-16 stations
- `lightning` — every strike SMHI exposes for the seeded year(s); indexed on `(lat, lon)` and `(year, month, day)`
- `seeding_status` — durable state machine (`PENDING → SEEDING → COMPLETED | FAILED`) with progress %

## 🔄 Background seeder

On startup, a daemon thread spawns an asyncio event loop and walks SMHI's hierarchical lightning API (year → months → days). Concurrency is capped at 15 via `asyncio.Semaphore`. Progress is persisted to `seeding_status` every 15 days, which the frontend polls every 5 s to render the live progress bar.

## 🧪 Verify

```bash
python verify_services.py
```

Runs smoke tests against geocoding, SMHI fetch, and forecast pipelines.
