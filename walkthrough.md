# SMHI Weather & Lightning Tracker Walkthrough

This document outlines the complete architectural details, implementation choices, and execution guidelines for the SMHI Weather and Lightning Tracker application.

## Overview

The application is a full-stack dashboard designed to aggregate and visualize climatology data from the Swedish Meteorological and Hydrological Institute (SMHI). It features:
1. **React Frontend**: Built using **Vite**, **Recharts** (data visualization), **Lucide React** (iconography), and a premium dark-mode glassmorphic theme.
2. **Python Backend**: Built with **FastAPI** (asynchronous routing), **SQLite** (local regional database cache), and **Pandas/Numpy** (data manipulation and spatial interpolation).
3. **AI Climatology engine**: Integrated with **Google Gemini** for 12-month narrative and numerical forecasts, falling back to a regional rule-based statistical model when offline.

---

## Architectural Breakdown & Core Implementation

### 1. Database Cache (`database.py`)
To prevent making repeated high-volume requests to SMHI's Open Data APIs (which returns thousands of data rows for lightning), we implemented a local SQLite database that maintains:
- `stations`: Cached records of SMHI weather stations.
- `lightning`: Cached individual lightning strike logs.
- `seeding_status`: Tracks progress of background seeder operations.

### 2. Difficulty-Based Location Analysis (`smhi_service.py`)
The system computes meteorological aggregations dynamically according to the user-selected **Level of Difficulty**:
- **Easy Mode**: Maps the input coordinates to the closest major city preset (Stockholm, Gothenburg, Malmö, Kiruna, Visby) which are seeded instantly. Lightning strikes are queried within a **50 km** radius.
- **Medium Mode**: Queries Nominatim to geocode the address, fetches the single closest active weather station, downloads and parses its cloud cover CSV file, and counts lightning strikes in a **25 km** radius.
- **Hard Mode**: Employs **Inverse Distance Weighting (IDW) Spatial Interpolation**. It locates the 3 closest active stations, downloads their cloud archives, and computes a spatial average:
  $$V = \frac{\sum w_i V_i}{\sum w_i} \quad \text{where } w_i = \frac{1}{d_i^2}$$
  Lightning strikes are analyzed within a tighter **15 km** radius.

### 3. AI & Statistical Forecasting (`forecast_service.py`)
Generates 12-month future projections. 
- If `GEMINI_API_KEY` is present in the environment, it prompts Gemini to perform a climatology analysis using the historical data as reference.
- If the key is absent, the system falls back to a location-aware climatology statistical generator. The fallback crafts customized explanations based on Swedish regional geography (e.g. Arctic Circle trends, Baltic Sea maritime dampening, and central low-pressure fronts).

---

## Issues Faced & Resolutions

### 1. Python 3.14 Compatibility Wheel Failure
* **Symptom**: Installing backend dependencies threw build errors on `pydantic-core` because the local Python runner is running a pre-release version of Python 3.14 (which modified the signature of `ForwardRef._evaluate`).
* **Fix**: Removed strict version pins (e.g. `fastapi==0.110.0`, `pydantic==2.6.4`) in `requirements.txt`. This allowed `pip` to automatically resolve and build the latest wheels compatible with Python 3.14.

### 2. Pandas IDW Merge Column Suffix Conflicts
* **Symptom**: During Hard Mode interpolation, merging 3 separate weather station dataframes caused a `pandas.errors.MergeError` due to conflicting columns (`cloud_cover_next`).
* **Fix**: Pre-processed each station's dataframe to retain only `val_w` and `weight_w` columns *before* joining them. The final Division of Sums is performed at the end after all merges complete, eliminating naming conflicts.

---

## Local Verification & Execution

### 1. Running the Backend
Ensure you are in the `backend` folder, activate the virtual environment, and start Uvicorn:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```
The API is available at `http://localhost:8000`. On startup, it automatically spawns a background thread to seed the 2024 lightning data from the SMHI archives.

### 2. Running the Frontend
Ensure you are in the `frontend` folder, install npm packages, and run the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The frontend is available at `http://localhost:5173`.

### 3. Running with Docker Compose (Supply Chain Security)
To isolate compilation environments and protect your local host from the NPM/Python package supply chain, launch both applications in sandboxed containers:
```bash
# From the project root directory
docker-compose up --build
```
* **Frontend Web Dashboard**: Serves on `http://localhost:8080` (compiled safely in a Node alpine builder stage and hosted via Nginx).
* **Backend API**: Serves on `http://localhost:8000`.
* **Persistence**: The SQLite cache database (`weather_cache.db`) is mounted from the host at `./backend/app/weather_cache.db`, meaning cached SMHI and lightning data persist between container restarts.

---

## Terraform Infrastructure & GitHub Actions CI/CD

- **Infrastructure**: Configured in `/Users/princeorjiugo/smhi-weather-tracker/terraform`. Employs a public VPC, an ECS Fargate cluster running the FastAPI Docker container behind an Application Load Balancer, an S3 bucket configured for static site hosting (React app), and a CloudFront distribution that forwards `/api/*` requests to the ALB and static requests to S3.
- **CI/CD Pipeline**: Configured in `/Users/princeorjiugo/smhi-weather-tracker/.github/workflows/deploy.yml`. Triggered on pushes to the `main` branch to compile the frontend, push the backend image to AWS ECR, and update the ECS task definition and service.
