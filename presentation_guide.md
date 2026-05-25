# SMHI Weather Tracker: Presentation & Review Guide

This guide outlines how to present this application to stakeholders, tech leads, or team members, along with a compilation of technical questions you might face and how to answer them.

---

## 1. How to Structure Your Presentation

### Step A: The Pitch (1 Minute)
> "This is a full-stack Nordic Climatology Dashboard that aggregates and analyzes meteorological data from the Swedish Meteorological and Hydrological Institute (SMHI). It solves the problem of high-latency third-party meteorological APIs by implementing a local SQLite caching database, spatial interpolation, and AI-driven forecasting, all wrapped in a secure, containerized sandbox."

### Step B: The Demonstration Flow (3-4 Minutes)
1. **The Sandbox Entrance**: Open the dashboard at `http://localhost:8080`. Point out the glassmorphic dark-mode interface and the database seeding progress bar at the top (if still loading). Explain that it represents a background thread fetching and caching SMHI archives.
2. **Address Search**: Search for an address in Sweden (e.g. *Stockholm*, *Kiruna*, *Gotland*). Show how the geocoder instantly locates the coordinates using OpenStreetMap.
3. **The Difficulty Toggle**: Explain the segmented control:
   * **Easy**: Pre-cached city mappings (Stockholm, Gothenburg, Malmö, Kiruna, Visby) loading instantly.
   * **Medium**: Dynamic lookup of the single nearest active SMHI weather station.
   * **Hard**: Multi-station spatial interpolation using **Inverse Distance Weighting (IDW)**.
4. **Visualizing the Charts**: Switch between the **Monthly** annual composed view (illustrating cloud cover % on a line axis and lightning probability % on a bar axis), **Daily** detailed area view, and **Yearly** historical trends.
5. **AI Climatology Forecast**: Show the AI panel. Click "Generate AI Forecast" to show the 12-month prediction and the meteorological narrative explaining Baltic currents, high-latitude fronts, or Scandinavian mountain barriers.

### Step C: The Technical Highlights (2 Minutes)
* **Supply Chain Security**: Point out that the entire app runs in Docker Compose. The host is protected because Node and Python compile inside sandboxed layers, and the web app is served via a minimal Nginx container.
* **IDW Spatial Interpolation**: Show the backend math in `smhi_service.py` where logs from 3 weather stations are combined based on their relative proximity.

---

## 2. Potential Questions & Answers

### Q1: Why implement a local SQLite cache instead of querying SMHI directly on every request?
* **Answer**: "SMHI MetObs and Lightning APIs return massive datasets. Summer lightning archives can have thousands of coordinates per day. Fetching, parsing, and filtering these on the fly would result in page load latencies of 5–15 seconds and trigger rate limits. Caching these files locally on startup reduces query latencies to milliseconds and ensures the app remains fully offline-capable."

### Q2: Why use Inverse Distance Weighting (IDW) instead of a simple average for Hard Mode?
* **Answer**: "In spatial climatology, a weather station 5 km away is much more representative of local weather than a station 50 km away. IDW applies weights proportional to the inverse square of the distance ($w = 1/d^2$). This ensures that the closest station dominates the interpolation while distant stations only contribute minor adjustments, mimicking real-world meteorology."

### Q3: How did you address NPM and Python supply chain vulnerabilities?
* **Answer**: "We containerized the applications using Docker Compose. The frontend utilizes a multi-stage Dockerfile where `npm ci` is executed inside a sandboxed Node alpine image. The final compiled assets are served through a lightweight Nginx container. This prevents third-party node dev servers or python scripts from executing commands directly on the host machine."

### Q4: Why does the lightning chart show 'simulated' data initially?
* **Answer**: "Sweden's annual lightning database is large. To ensure the user gets a responsive UI immediately rather than waiting for background seeding to finish, the backend generates a location-aware climatological simulation as an immediate fallback. It uses the coordinates to simulate realistic monthly curves (high in July, zero in January, and scaled by latitude) and transitions automatically to the live database stats once the seeder reaches 100%."

### Q5: How is the AI Climatology Forecast generated?
* **Answer**: "The backend queries the `GEMINI_API_KEY`. If present, it formats the historical station data and coordinates into a JSON prompt for `gemini-2.5-flash`, which returns a 12-month projection and a detailed markdown narrative. If the key is absent, it falls back to a location-aware Python rules engine that generates custom commentary based on proximity to the Baltic Sea, inland plains, or the Arctic Circle."

### Q6: How does the application scale to production?
* **Answer**: "The architecture is production-ready:
  1. The backend is containerized and deployable to ECS Fargate (scalable horizontally).
  2. The frontend compiles to static files served by CloudFront and S3.
  3. The Terraform configuration is already provided to deploy this entire VPC, ECS, ALB, and CloudFront setup automatically.
  4. For scale, the SQLite database can be migrated to a managed serverless database like Aurora PostgreSQL with PostGIS for native spatial indexes."
