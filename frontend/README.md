# Frontend — SMHI Weather Tracker UI

React + Vite SPA that visualizes cloud cover and lightning strike data from the [backend](../backend) on interactive charts, with a Tailwind-based glassmorphism design.

## 🧱 Components

| File | Purpose |
|------|---------|
| [src/App.jsx](src/App.jsx) | Layout shell (sticky header + footer + main rail) |
| [src/components/WeatherDashboard.jsx](src/components/WeatherDashboard.jsx) | State orchestrator — fetches weather, polls cache status, derives KPI cards |
| [src/components/LocationSelector.jsx](src/components/LocationSelector.jsx) | Address search, difficulty toggle, quick-pick city chips |
| [src/components/WeatherCharts.jsx](src/components/WeatherCharts.jsx) | Recharts visualizations — daily / monthly / yearly toggle |
| [src/components/AIForecast.jsx](src/components/AIForecast.jsx) | 12-month forecast chart + narrative |

## 🏃 Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. By default it talks to the backend at `http://localhost:8000`.

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the build locally
```

## 🐳 Docker

```bash
docker build -t smhi-frontend .
docker run -p 8080:80 smhi-frontend
```

Served through nginx; the multi-stage Dockerfile builds with Node then ships only the static assets.

## 🎨 Design system

- **Tailwind CSS** with custom CSS variables (primary / secondary / accent)
- **Glassmorphism** panels and cards (`backdrop-blur` + translucent borders)
- **Inter** + display font for headlines
- **Lucide React** for icons
- **Recharts** for all charts

## 🔄 Live cache observability

The dashboard polls `/api/cache-status?year=2024` every 5 seconds while the backend's background lightning seeder is running, and renders a gradient progress bar. Polling stops automatically when the status reaches `COMPLETED` or `FAILED`.

## 📝 Notes

- The backend URL is currently hardcoded to `http://localhost:8000`. For production, swap this to an env var consumed at build time (`VITE_API_URL`) and configure in your Vercel / GCS deployment.
