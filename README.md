# 🌩️ SMHI Weather & Lightning Tracker

> A full-stack climatology dashboard that turns any Swedish address into a visual story of historical **cloud cover** and **lightning strikes**, plus a 12-month AI-generated forecast.

[![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20SQLite-blue)]() [![Deploy](https://img.shields.io/badge/deploy-GCP%20Cloud%20Run%20%7C%20Vercel-orange)]() [![Data](https://img.shields.io/badge/data-SMHI%20Open%20Data-success)]()

---

## ✨ What it does

1. **Type any Nordic address** → app geocodes it via OpenStreetMap Nominatim
2. **Pick a difficulty tier** — Easy / Medium / Hard (latency ↔ accuracy tradeoff)
3. **Get back**:
   - 📈 Daily / monthly / yearly cloud cover charts (from real SMHI weather stations)
   - ⚡ Lightning strike density for the surrounding area (radius depends on tier)
   - 🤖 A 12-month AI forecast (Google Gemini, with a statistical fallback)
   - 📊 Live progress bar while the background seeder warms the local cache

---

## 🏗️ Architecture (at a glance)

See the live diagrams in [docs/architecture.mmd](docs/architecture.mmd) and [docs/decision-engine.mmd](docs/decision-engine.mmd).

```
Browser (React + Vite)
        │
        ▼
Global HTTPS Load Balancer  ──►  Cloud CDN ──► GCS bucket (static SPA)
        │ /api/*
        ▼
Serverless NEG ──► Cloud Run (FastAPI, autoscale 0→3)
        │
        ├──► SQLite cache (stations + lightning + seeding_status)
        ├──► SMHI MetObs API (cloud cover CSV)
        ├──► SMHI Lightning API (hierarchical JSON)
        ├──► Nominatim (geocoding)
        └──► Google Gemini 2.5-flash (AI forecast)

Images pushed to Artifact Registry  •  Managed SSL  •  HTTP→HTTPS redirect
```

### The headline design decision: **difficulty as a system lever**

| Tier | Strategy | Typical latency |
|------|----------|-----------------|
| 🟢 Easy | Map to one of 5 preset cities | ~10 ms |
| 🟡 Medium | Find nearest active SMHI station via Haversine | ~300 ms |
| 🔴 Hard | Top 3 stations + IDW (Inverse Distance Weighting, w = 1/d²) | ~2 s |

Lightning radius shrinks with difficulty (50 / 25 / 15 km) — harder = more precise.

---

## 📂 Project layout

```
smhi-weather-tracker/
├── backend/                # FastAPI service + SQLite + business logic
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                       # HTTP routes + lifespan
│       ├── database.py                   # SQLite schema + indexes
│       └── services/
│           ├── geocoding_service.py      # Nominatim wrapper
│           ├── smhi_service.py           # THE brain — IDW, seeder, queries
│           └── forecast_service.py       # Gemini + statistical fallback
├── frontend/               # React + Vite + Tailwind (glassmorphism UI)
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── WeatherDashboard.jsx      # Orchestrator + polling
│           ├── LocationSelector.jsx
│           ├── WeatherCharts.jsx         # Recharts day/month/year
│           └── AIForecast.jsx
├── api/                    # Vercel serverless variant (single-file FastAPI)
├── terraform/              # GCP IaC: Cloud Run, Artifact Registry, GCS, Cloud CDN, HTTPS LB
├── docs/                   # Mermaid architecture & decision diagrams
├── docker-compose.yml      # Local dev: backend + frontend
└── vercel.json             # Serverless deploy config
```

---

## 🚀 Quick start

### Option A — Docker Compose (one command)

```bash
docker compose up --build
```

- Frontend → http://localhost:8080
- Backend  → http://localhost:8000
- API docs → http://localhost:8000/docs

Set `GEMINI_API_KEY` in your shell or a `.env` file to enable real AI forecasts (otherwise the statistical fallback is used).

### Option B — Run locally

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🔌 API surface

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/geocode?address=…` | Address → `{lat, lon, display_name}` |
| `GET` | `/api/weather?lat=…&lon=…&difficulty=…` | Cloud cover + lightning aggregates |
| `GET` | `/api/forecast?lat=…&lon=…&difficulty=…` | 12-month forecast + narrative |
| `GET` | `/api/cache-status?year=2024` | Background seeder progress (for the live progress bar) |

Full OpenAPI / Swagger UI: http://localhost:8000/docs

---

## ☁️ Deployment

Two ready-to-go targets:

| Target | Pros | Cons |
|--------|------|------|
| **GCP Cloud Run** ([terraform/](terraform/)) | Scale-to-zero, managed TLS, Cloud CDN-fronted GCS, only pay per request | Cold starts on min=0; SQLite lives in container FS (ephemeral) |
| **Vercel serverless** ([api/index.py](api/index.py) + [vercel.json](vercel.json)) | Free tier, zero ops, one-click deploy | Cold starts, no SQLite/seeder |

Same product, two architectures — chosen to demonstrate how **stateful design choices propagate to deployment options**.

---

## 🧠 Key engineering ideas worth reading

| Concept | Where to look |
|---------|---------------|
| Spatial query: bounding box pre-filter + Haversine refine | [smhi_service.py — `get_lightning_probability`](backend/app/services/smhi_service.py) |
| IDW interpolation across 3 stations | [smhi_service.py — `get_interpolated_cloud_cover`](backend/app/services/smhi_service.py) |
| Bounded concurrent fetching with `asyncio.Semaphore(15)` | [smhi_service.py — `fetch_all_days_data`](backend/app/services/smhi_service.py) |
| Three-tier graceful degradation (Gemini → statistical → climatology copy) | [forecast_service.py](backend/app/services/forecast_service.py) |
| Live cache observability via polling | [WeatherDashboard.jsx](frontend/src/components/WeatherDashboard.jsx) |
| SQLite schema with strategic indexes | [database.py](backend/app/database.py) |

---

## 🎯 What I'd change at 1M users

- **SQLite → Cloud SQL Postgres + PostGIS** (GiST spatial index, multi-writer, survives revisions)
- **Threaded seeder → Cloud Run Jobs + Pub/Sub** (durable jobs surviving instance recycles)
- **Polling `/api/cache-status` → Server-Sent Events** (one connection per client)
- **Public Nominatim → self-hosted on GCE** (1 req/sec limit is a hard ceiling)
- **CORS `*` → Load Balancer origin allowlist**
- **Add observability**: OpenTelemetry → Cloud Logging + Cloud Trace + Cloud Monitoring

---

## 📚 Further reading in this repo

- [implementation_plan.md](implementation_plan.md) — full technical design doc
- [walkthrough.md](walkthrough.md) — annotated demo tour
- [presentation_guide.md](presentation_guide.md) — interview talking points

---

## 🙏 Credits

- [SMHI Open Data Portal](https://opendata.smhi.se/) — cloud observations & lightning archive
- [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) — geocoding
- [Google Gemini](https://ai.google.dev/) — AI forecasting

Built as a portfolio piece exploring **read-heavy, geographically-bounded, latency-tunable** systems.
