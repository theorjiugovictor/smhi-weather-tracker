# Implementation Plan - SMHI Weather & Lightning Tracker

Build a React web application with a Python (FastAPI) backend that pulls historical data from SMHI (Swedish Meteorological and Hydrological Institute) to calculate and visualize cloud cover and lightning strike probabilities.

---

## User Review Required

> [!IMPORTANT]
> **Data Scope and Constraints**: 
> - SMHI observations and lightning API data are limited to Sweden and the Nordic/Baltic regions. For addresses entered outside this region, the backend will gracefully fallback to a simulated historical meteorological model to prevent empty charts.
> - **Level of Difficulty** is implemented as a core architectural feature that changes how data is fetched and processed:
>   1. **Easy Mode**: Select from cached major Swedish cities (Stockholm, Göteborg, Malmö, Kiruna, Visby) for instant data load.
>   2. **Medium Mode**: Geocode the entered address, find the nearest active SMHI weather station, fetch its cloud cover archive (Parameter 16), and query lightning strikes within 50 km for the year 2024.
>   3. **Hard Mode**: Geocode the address, find the 3 nearest active SMHI stations, calculate a spatial interpolation (Inverse Distance Weighting) for cloud cover, and calculate lightning strike density across multiple search radii (10 km, 25 km, 50 km) using multi-year lightning logs (2023–2024).

---

## Open Questions

> [!NOTE]
> 1. **Gemini API Key**: For the AI Forecasting functionality, the backend will look for a `GEMINI_API_KEY` environment variable. If none is provided, it will fallback to a local statistical time-series forecasting model (seasonal moving average) with local rule-based commentary. Is this fallback behavior acceptable?
> 2. **Terraform Cloud Provider**: We have proposed AWS (S3, CloudFront, ECS Fargate, ALB, ECR) as the target architecture. Please let us know if you prefer GCP or Azure.

---

## Proposed Changes

### Backend (Python/FastAPI)
The backend will manage geocoding, fetch SMHI data, maintain a local SQLite cache for lightning strikes and stations, and generate AI forecasts.

#### [NEW] [main.py](file:///Users/princeorjiugo/smhi-weather-tracker/backend/app/main.py)
- FastAPI entry point with CORS middleware.
- Routes:
  - `GET /api/geocode`: Resolve address using OpenStreetMap Nominatim.
  - `GET /api/weather`: Fetch weather data (cloud cover and lightning strikes) based on coordinates and difficulty level.
  - `GET /api/forecast`: Generate AI weather forecasts.
  - `GET /api/cache-status`: Monitor the background seeding status of the SQLite database.

#### [NEW] [database.py](file:///Users/princeorjiugo/smhi-weather-tracker/backend/app/database.py)
- SQLite database configuration.
- Database tables:
  - `stations`: Cache of the 108 active SMHI stations for Parameter 16.
  - `lightning`: Cache of all lightning strikes for 2023/2024 to enable fast spatial queries.
  - `seeding_status`: Logs background fetch progress.

#### [NEW] [smhi_service.py](file:///Users/princeorjiugo/smhi-weather-tracker/backend/app/services/smhi_service.py)
- Handles downloading, parsing, and caching SMHI station data.
- Implements background worker to seed the SQLite database with daily lightning data files from SMHI (`opendata-download-lightning.smhi.se`).
- Implements spatial queries (bounding box + Haversine distance filter) to count local lightning strikes.
- Handles IDW (Inverse Distance Weighting) interpolation for the Hard mode.

#### [NEW] [geocoding_service.py](file:///Users/princeorjiugo/smhi-weather-tracker/backend/app/services/geocoding_service.py)
- Geocodes user-entered addresses using OpenStreetMap Nominatim.
- Returns latitude, longitude, and display name.

#### [NEW] [forecast_service.py](file:///Users/princeorjiugo/smhi-weather-tracker/backend/app/services/forecast_service.py)
- Implements AI forecasting using Google GenAI / Gemini API.
- Implements fallback statistical seasonal forecast.

#### [NEW] [requirements.txt](file:///Users/princeorjiugo/smhi-weather-tracker/backend/requirements.txt)
- Packages: `fastapi`, `uvicorn`, `httpx`, `pandas`, `numpy`, `google-genai`, `sqlite3`, `pydantic`.

#### [NEW] [Dockerfile](file:///Users/princeorjiugo/smhi-weather-tracker/backend/Dockerfile)
- Multi-stage build for containerizing the FastAPI app.

---

### Frontend (React/Vite)
Modern web interface with high aesthetics: rich glassmorphism UI, interactive charts, and animations.

#### [NEW] [package.json](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/package.json)
- React, Vite, Recharts, Lucide Icons, Framer Motion.

#### [NEW] [index.css](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/index.css)
- Custom CSS design system, typography (Google Font 'Inter'), glassmorphism utilities, dark-mode styling, and gradients.

#### [NEW] [App.jsx](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/App.jsx)
- Shell and navigation for the dashboard.

#### [NEW] [WeatherDashboard.jsx](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/components/WeatherDashboard.jsx)
- Dashboard layout orchestrating address input, level of difficulty settings, chart visualizations, metrics cards, and AI forecast panel.

#### [NEW] [LocationSelector.jsx](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/components/LocationSelector.jsx)
- Address geocoding search input, difficulty switcher (Easy, Medium, Hard), and quick-select buttons.

#### [NEW] [WeatherCharts.jsx](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/components/WeatherCharts.jsx)
- Dynamic Recharts showing:
  - Monthly view: Combined Bar/Line chart showing cloud cover (%) and lightning strike probability (%).
  - Daily view: Heatmap or scatter plot of cloud cover and lightning counts.
  - Yearly view: Historical year-over-year trends.

#### [NEW] [AIForecast.jsx](file:///Users/princeorjiugo/smhi-weather-tracker/frontend/src/components/AIForecast.jsx)
- Formatted interface showing the 12-month AI forecast chart and the weather narrative.

---

### Deployment & CI/CD

#### [NEW] [main.tf](file:///Users/princeorjiugo/smhi-weather-tracker/terraform/main.tf)
- Terraform files configuring AWS infrastructure: ECS Fargate, Application Load Balancer, S3 Static Web hosting, CloudFront CDN, and VPC networks.

#### [NEW] [ci-cd.yml](file:///Users/princeorjiugo/smhi-weather-tracker/.github/workflows/ci-cd.yml)
- GitHub Actions workflow for linting, testing, Docker image creation, S3 React uploads, and ECS Fargate deployments.

---

## Verification Plan

### Automated Tests
1. **Backend Tests**: Run Python unit tests verifying Nominatim geocoding mock, SMHI CSV parsing, Haversine calculation, and IDW spatial interpolation.
2. **Frontend Build**: Validate Vite production build.

### Manual Verification
1. **Interactive Demo**: Start frontend and backend servers locally.
2. **Address Search**: Search for "Stockholm", "Göteborg", and an address outside Sweden. Verify that they map to the correct weather stations.
3. **Difficulty Test**: Verify that shifting between Easy, Medium, and Hard updates data density and interpolation weights.
4. **AI Forecast Test**: Verify that the AI Forecast updates and displays a textual explanation.
5. **Seeding Progress**: Verify that the background thread seeds the SQLite database upon startup without lagging the web app.
