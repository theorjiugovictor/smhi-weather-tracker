# Tasks: SMHI Weather & Lightning Tracker Implementation

- [x] Backend setup and services
  - [x] Create project directories and virtual environment
  - [x] Set up `database.py` with SQLite tables (stations, lightning, seeding_status)
  - [x] Set up `geocoding_service.py` with Nominatim address lookup
  - [x] Set up `smhi_service.py` with SMHI MetObs CSV parser and background lightning seeder
  - [x] Set up `forecast_service.py` with Gemini / seasonal statistical forecast
  - [x] Set up `main.py` FastAPI app and endpoints
- [x] Frontend setup and implementation
  - [x] Initialize React frontend using Vite
  - [x] Create core CSS design system with glassmorphism styling
  - [x] Implement geocoding address search and difficulty selector
  - [x] Implement Recharts visualization for day, month, and year views
  - [x] Implement AI forecasting dashboard tab
  - [x] Create main dashboard and orchestrate App.jsx
- [x] CI/CD and Infrastructure (Terraform)
  - [x] Create AWS Terraform configuration files (VPC, ECS, ALB, S3, CloudFront)
  - [x] Create GitHub Actions CI/CD workflow
- [x] Verification and walkthrough
  - [x] Run backend local testing and seed lightning cache
  - [x] Run Vite frontend validation
  - [x] Create walkthrough artifact with screenshots/narrative
- [x] Docker Containerization (Supply Chain Security)
  - [x] Create backend and frontend Dockerfiles
  - [x] Create root docker-compose.yml configuration

