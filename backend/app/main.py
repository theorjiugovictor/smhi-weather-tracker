from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
from app.database import init_db
from app.services.geocoding_service import geocode_address
from app.services.smhi_service import (
    get_interpolated_cloud_cover,
    get_lightning_probability,
    start_lightning_seeding,
    get_seeding_status,
    ensure_stations_loaded
)
from app.services.forecast_service import generate_weather_forecast

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await ensure_stations_loaded()
    start_lightning_seeding(2024)
    yield

app = FastAPI(
    title="SMHI Weather & Lightning Tracker API",
    description="Backend API that aggregates SMHI cloud observations and lightning strike logs.",
    version="1.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "SMHI Weather Tracker API is running."}

@app.get("/api/geocode")
async def get_geocode(address: str = Query(..., description="Address to search")):
    result = await geocode_address(address)
    if not result:
        raise HTTPException(status_code=404, detail="Address not found or geocoding failed.")
    return result

@app.get("/api/weather")
async def get_weather(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    difficulty: str = Query("medium", description="Level of difficulty: easy, medium, hard")
):
    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"
        
    try:
        # Fetch cloud cover
        cloud_data = await get_interpolated_cloud_cover(lat, lon, difficulty)
        
        # Fetch lightning strikes
        lightning_data = get_lightning_probability(lat, lon, difficulty)
        
        return {
            "latitude": lat,
            "longitude": lon,
            "difficulty": difficulty,
            "cloud_cover": cloud_data,
            "lightning": lightning_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch weather data: {e}")

@app.get("/api/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    difficulty: str = Query("medium", description="Level of difficulty: easy, medium, hard")
):
    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"
        
    try:
        # Fetch historical summaries to feed the forecast model
        cloud_data = await get_interpolated_cloud_cover(lat, lon, difficulty)
        lightning_data = get_lightning_probability(lat, lon, difficulty)
        
        historical_cloud = cloud_data["monthly"]
        historical_lightning = lightning_data["monthly"]
        
        # If no historical cloud data, raise error
        if not historical_cloud:
            raise Exception("No historical cloud observations found for this location.")
            
        forecast = generate_weather_forecast(lat, lon, historical_cloud, historical_lightning)
        return forecast
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {e}")

@app.get("/api/cache-status")
def get_cache_status(year: int = Query(2024, description="Year to check database cache status for")):
    status = get_seeding_status(year)
    return status
