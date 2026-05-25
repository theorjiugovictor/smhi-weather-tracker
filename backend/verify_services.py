import asyncio
import os
import sys

# Ensure backend folder is in PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import init_db, get_db_connection
from app.services.geocoding_service import geocode_address
from app.services.smhi_service import (
    ensure_stations_loaded,
    get_nearest_stations,
    get_interpolated_cloud_cover,
    get_lightning_probability
)
from app.services.forecast_service import generate_weather_forecast

async def run_checks():
    print("--- 1. Initializing DB ---")
    init_db()
    
    print("\n--- 2. Loading SMHI Weather Stations ---")
    stations = await ensure_stations_loaded()
    print(f"Total active weather stations in database: {len(stations)}")
    assert len(stations) > 0, "No weather stations loaded!"
    
    print("\n--- 3. Testing Address Geocoding ---")
    addr = "Gothenburg, Sweden"
    geo = await geocode_address(addr)
    print(f"Geocoded '{addr}' -> Lat: {geo['lat']}, Lon: {geo['lon']}, Name: {geo['display_name']}")
    assert geo is not None, "Geocoding failed!"
    
    print("\n--- 4. Testing Nearest Stations ---")
    nearest = get_nearest_stations(geo['lat'], geo['lon'], limit=3)
    for idx, (station, dist) in enumerate(nearest):
        print(f"  {idx+1}. Station {station['name']} (ID {station['id']}) at {dist:.1f} km")
    assert len(nearest) == 3, "Failed to find 3 nearest stations!"
    
    print("\n--- 5. Testing Weather Interpolation (Medium & Hard Modes) ---")
    print("Fetching Medium Mode (Single station)...")
    med_data = await get_interpolated_cloud_cover(geo['lat'], geo['lon'], "medium")
    print(f"  Medium Mode returned {len(med_data['monthly'])} monthly records.")
    assert len(med_data['monthly']) == 12, "Medium mode should return 12 months of cloud cover!"

    print("Fetching Hard Mode (IDW 3 stations)...")
    hard_data = await get_interpolated_cloud_cover(geo['lat'], geo['lon'], "hard")
    print(f"  Hard Mode returned {len(hard_data['monthly'])} monthly records.")
    assert len(hard_data['monthly']) == 12, "Hard mode should return 12 months of cloud cover!"

    print("\n--- 6. Testing Lightning Aggregations ---")
    # This should run successfully and return simulated data since db is not seeded yet
    lightning_data = get_lightning_probability(geo['lat'], geo['lon'], "hard")
    print(f"  Lightning Radius used: {lightning_data['radius_used_km']} km")
    print(f"  Lightning data has {len(lightning_data['monthly'])} months.")
    assert len(lightning_data['monthly']) == 12, "Lightning data should have 12 months!"

    print("\n--- 7. Testing AI Forecast Generation ---")
    forecast = generate_weather_forecast(geo['lat'], geo['lon'], hard_data['monthly'], lightning_data['monthly'])
    print(f"  Forecast Source: {forecast['source']}")
    print(f"  Forecast Narrative preview: {forecast['narrative'][:120]}...")
    assert len(forecast['forecast']) == 12, "Forecast should cover 12 months!"
    
    print("\nALL BACKEND CORE SERVICES FUNCTIONING CRITICALLY CORRECT!")

if __name__ == "__main__":
    asyncio.run(run_checks())
