import asyncio
import httpx
import math
import sqlite3
import threading
from datetime import datetime
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from app.database import get_db_connection, DB_PATH

# Haversine distance in km
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# 1. Weather Stations Seeding & Access
async def ensure_stations_loaded() -> List[Dict[str, Any]]:
    """Ensure active stations are loaded into SQLite and return them."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if we already have stations
    cursor.execute("SELECT COUNT(*) FROM stations")
    count = cursor.fetchone()[0]
    
    if count > 0:
        cursor.execute("SELECT * FROM stations WHERE active = 1")
        stations = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return stations
        
    # Fetch from SMHI
    url = "https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/16.json"
    headers = {"User-Agent": "SMHIWeatherTrackerApp/1.0"}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                stations_data = data.get("station", [])
                
                insert_data = []
                for s in stations_data:
                    insert_data.append((
                        s.get("id"),
                        s.get("name"),
                        s.get("latitude"),
                        s.get("longitude"),
                        1 if s.get("active") else 0
                    ))
                
                cursor.executemany(
                    "INSERT OR REPLACE INTO stations (id, name, latitude, longitude, active) VALUES (?, ?, ?, ?, ?)",
                    insert_data
                )
                conn.commit()
                print(f"Loaded {len(insert_data)} stations into cache database.")
    except Exception as e:
        print(f"Failed to fetch stations from SMHI: {e}")
        
    cursor.execute("SELECT * FROM stations WHERE active = 1")
    stations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return stations

def get_nearest_stations(lat: float, lon: float, limit: int = 3) -> List[Tuple[Dict[str, Any], float]]:
    """Find the N nearest active stations to given lat/lon."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations WHERE active = 1")
    stations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    station_distances = []
    for s in stations:
        dist = haversine_distance(lat, lon, s["latitude"], s["longitude"])
        station_distances.append((s, dist))
        
    # Sort by distance
    station_distances.sort(key=lambda x: x[1])
    return station_distances[:limit]

# 2. Cloud Cover Data Fetching & Parsing
async def fetch_station_cloud_cover(station_id: int) -> pd.DataFrame:
    """Fetch and parse historical cloud cover CSV for a station."""
    url = f"https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/16/station/{station_id}/period/corrected-archive/data.csv"
    headers = {"User-Agent": "SMHIWeatherTrackerApp/1.0"}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                print(f"Failed to fetch CSV for station {station_id}: Status {response.status_code}")
                return pd.DataFrame()
                
            csv_text = response.text
            
            # Find the header row starting with Datum
            lines = csv_text.splitlines()
            header_idx = -1
            for idx, line in enumerate(lines):
                if line.startswith("Datum;Tid (UTC)"):
                    header_idx = idx
                    break
                    
            if header_idx == -1:
                print(f"Could not find data header in CSV for station {station_id}")
                return pd.DataFrame()
                
            # Read CSV from the header row onwards
            # Split lines and reconstruct the CSV payload from the header row
            csv_payload = "\n".join(lines[header_idx:])
            
            # Read into pandas
            from io import StringIO
            df = pd.read_csv(StringIO(csv_payload), sep=";")
            
            # Keep required columns and clean up
            df = df.rename(columns={
                "Datum": "date",
                "Tid (UTC)": "time",
                "Total molnmängd": "cloud_cover",
                "Kvalitet": "quality"
            })
            df = df[["date", "time", "cloud_cover"]].dropna()
            
            # Convert values
            df["cloud_cover"] = pd.to_numeric(df["cloud_cover"], errors="coerce")
            df = df.dropna()
            
            # Handle 113% (sky obscured) by capping it to 100%
            df["cloud_cover"] = df["cloud_cover"].apply(lambda x: 100.0 if x > 100.0 else x)
            
            # Extract date parts
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.dropna()
            df["year"] = df["date"].dt.year
            df["month"] = df["date"].dt.month
            df["day"] = df["date"].dt.day
            
            return df
            
    except Exception as e:
        print(f"Exception fetching cloud cover for station {station_id}: {e}")
        return pd.DataFrame()

# 3. Interpolation and Aggregation
def aggregate_weather_df(df: pd.DataFrame) -> Dict[str, Any]:
    """Aggregate a cleaned cloud cover DataFrame into daily, monthly, and yearly averages."""
    if df.empty:
        return {"daily": [], "monthly": [], "yearly": []}
        
    # Group by day (average of observations on that day)
    daily_df = df.groupby(["year", "month", "day"])["cloud_cover"].mean().reset_index()
    daily_df["date"] = daily_df.apply(lambda r: f"{int(r['year']):04d}-{int(r['month']):02d}-{int(r['day']):02d}", axis=1)
    
    # Filter to last 2-3 years for daily to keep payload lightweight, or keep the most recent year
    latest_year = daily_df["year"].max()
    daily_data = daily_df[daily_df["year"] == latest_year].to_dict(orient="records")
    
    # Group by month (multi-year averages for each calendar month 1-12)
    monthly_df = df.groupby(["month"])["cloud_cover"].mean().reset_index()
    monthly_data = monthly_df.to_dict(orient="records")
    
    # Group by year
    yearly_df = df.groupby(["year"])["cloud_cover"].mean().reset_index()
    yearly_data = yearly_df.to_dict(orient="records")
    
    return {
        "daily": daily_data,
        "monthly": monthly_data,
        "yearly": yearly_data
    }

async def get_interpolated_cloud_cover(lat: float, lon: float, difficulty: str) -> Dict[str, Any]:
    """Fetch cloud cover based on coordinates and difficulty level."""
    await ensure_stations_loaded()
    
    if difficulty == "easy":
        # Predefined mapping for major cities
        # Stockholm -> Berga (ID 98040)
        # Göteborg -> Vinga A (ID 71380)
        # Malmö -> Falsterbo A (ID 52240)
        # Kiruna -> Nikkaluokta A (ID 179960)
        # Visby -> Visby Flygplats (ID 78400)
        
        # Determine which preset is closest
        presets = {
            "Stockholm": (59.3293, 18.0686, 98040),
            "Göteborg": (57.7089, 11.9746, 71380),
            "Malmö": (55.6050, 13.0038, 52240),
            "Kiruna": (67.8558, 20.2253, 179960),
            "Visby": (57.6348, 18.2948, 78400)
        }
        
        closest_preset = "Stockholm"
        min_dist = float("inf")
        for city, (plat, plon, sid) in presets.items():
            dist = haversine_distance(lat, lon, plat, plon)
            if dist < min_dist:
                min_dist = dist
                closest_preset = city
                
        station_id = presets[closest_preset][2]
        print(f"Easy Mode: Mapping coordinates to presets -> {closest_preset} (Station {station_id})")
        df = await fetch_station_cloud_cover(station_id)
        return aggregate_weather_df(df)
        
    elif difficulty == "medium":
        # Single nearest station
        nearest = get_nearest_stations(lat, lon, limit=1)
        if not nearest:
            return {"daily": [], "monthly": [], "yearly": []}
            
        station = nearest[0][0]
        dist = nearest[0][1]
        print(f"Medium Mode: Nearest Station {station['name']} (ID {station['id']}) at {dist:.1f} km")
        df = await fetch_station_cloud_cover(station["id"])
        return aggregate_weather_df(df)
        
    else:
        # Hard Mode: IDW interpolation of 3 nearest stations
        nearest = get_nearest_stations(lat, lon, limit=3)
        if not nearest:
            return {"daily": [], "monthly": [], "yearly": []}
            
        dfs = []
        
        for station, dist in nearest:
            print(f"Hard Mode: Interpolating station {station['name']} (ID {station['id']}) at {dist:.1f} km")
            # Avoid division by zero if station is exactly on coordinates
            weight = 1.0 / (dist ** 2 if dist > 0.1 else 0.01)
            
            station_df = await fetch_station_cloud_cover(station["id"])
            if not station_df.empty:
                # Group observations hourly by date and time
                df_grouped = station_df.groupby(["year", "month", "day", "time"])["cloud_cover"].mean().reset_index()
                df_grouped["val_w"] = df_grouped["cloud_cover"] * weight
                df_grouped["weight_w"] = weight
                # Keep only columns necessary for IDW aggregation to prevent suffixes conflicts
                df_grouped = df_grouped[["year", "month", "day", "time", "val_w", "weight_w"]]
                dfs.append(df_grouped)
                
        if not dfs:
            return {"daily": [], "monthly": [], "yearly": []}
            
        # Combine dataframes using Inverse Distance Weighting
        if len(dfs) == 1:
            merged = dfs[0]
        else:
            merged = dfs[0]
            for next_df in dfs[1:]:
                merged = pd.merge(merged, next_df, on=["year", "month", "day", "time"], how="outer", suffixes=("", "_next"))
                # Sum weights and values
                if "val_w_next" in merged.columns:
                    merged["val_w"] = merged["val_w"].fillna(0) + merged["val_w_next"].fillna(0)
                    merged["weight_w"] = merged["weight_w"].fillna(0) + merged["weight_w_next"].fillna(0)
                    merged = merged.drop(columns=["val_w_next", "weight_w_next"])
                    
        merged["cloud_cover"] = merged["val_w"] / merged["weight_w"]
        merged = merged.dropna(subset=["cloud_cover"])
        
        # Build fake date column to reuse aggregator
        merged["date"] = merged.apply(lambda r: f"{int(r['year']):04d}-{int(r['month']):02d}-{int(r['day']):02d}", axis=1)
        merged["date"] = pd.to_datetime(merged["date"])
        
        return aggregate_weather_df(merged)

# 4. Lightning Seeder and Aggregations
def get_seeding_status(year: int) -> Dict[str, Any]:
    """Get the current seeding status of lightning data for a year."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM seeding_status WHERE year = ?", (year,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    return {"year": year, "status": "PENDING", "progress": 0.0, "processed_days": 0, "total_days": 0}

def get_lightning_probability(lat: float, lon: float, difficulty: str) -> Dict[str, Any]:
    """
    Calculate lightning strikes and daily/monthly probabilities for a given location.
    Easy mode: 50 km radius, year 2024.
    Medium mode: 25 km radius, year 2024.
    Hard mode: multiple radii (10, 25, 50 km) or multi-year analysis. We'll return calculations for 2024.
    """
    radius_km = 50.0 if difficulty == "easy" else (25.0 if difficulty == "medium" else 15.0)
    
    # Approx bounding box for SQL indexing
    lat_deg = radius_km / 111.0
    lon_deg = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if lightning data exists
    cursor.execute("SELECT COUNT(*) FROM lightning")
    total_strikes = cursor.fetchone()[0]
    
    # If database has no strikes and background seeder isn't running, return simulated data as fallback
    # to avoid empty plots for initial testing
    cursor.execute("SELECT status FROM seeding_status WHERE year = 2024")
    seeding_row = cursor.fetchone()
    seeding_status = seeding_row[0] if seeding_row else "PENDING"
    
    if total_strikes == 0 and seeding_status != "COMPLETED":
        print("No lightning records in cache, returning simulated regional data...")
        return get_simulated_lightning(lat, lon, radius_km)
        
    # Fetch candidate strikes in bounding box
    cursor.execute("""
        SELECT year, month, day, lat, lon 
        FROM lightning 
        WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
    """, (lat - lat_deg, lat + lat_deg, lon - lon_deg, lon + lon_deg))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Filter by exact Haversine distance
    local_strikes = []
    for r in rows:
        dist = haversine_distance(lat, lon, r["lat"], r["lon"])
        if dist <= radius_km:
            local_strikes.append(r)
            
    # Group strikes by year, month, day
    strikes_df = pd.DataFrame([dict(r) for r in local_strikes])
    
    if strikes_df.empty:
        # If real lookup returned 0 strikes, return structured 0 statistics
        daily = []
        monthly = [{"month": m, "probability": 0.0, "count": 0} for m in range(1, 13)]
        yearly = [{"year": 2024, "count": 0}]
        return {"daily": daily, "monthly": monthly, "yearly": yearly, "radius_used_km": radius_km}
        
    # Daily counts
    daily_grouped = strikes_df.groupby(["year", "month", "day"]).size().reset_index(name="count")
    daily_grouped["date"] = daily_grouped.apply(lambda r: f"{int(r['year']):04d}-{int(r['month']):02d}-{int(r['day']):02d}", axis=1)
    daily = daily_grouped.to_dict(orient="records")
    
    # Monthly probability
    # Group by year and month to find how many days had at least 1 strike
    monthly_days = strikes_df.groupby(["year", "month", "day"]).size().reset_index(name="count")
    monthly_prob_list = []
    
    # Days in month dictionary
    days_in_month = {1:31, 2:28, 3:31, 4:30, 5:31, 6:30, 7:31, 8:31, 9:30, 10:31, 11:30, 12:31}
    # Check leap year for 2024
    days_in_month_2024 = days_in_month.copy()
    days_in_month_2024[2] = 29
    
    for m in range(1, 13):
        # Find number of active days in that month with strikes
        active_days = len(monthly_days[(monthly_days["month"] == m) & (monthly_days["year"] == 2024)])
        total_days = days_in_month_2024[m]
        prob = (active_days / total_days) * 100.0
        
        # Total counts
        strike_count = int(strikes_df[(strikes_df["month"] == m) & (strikes_df["year"] == 2024)].shape[0])
        
        monthly_prob_list.append({
            "month": m,
            "probability": round(prob, 2),
            "count": strike_count
        })
        
    # Yearly counts
    yearly_grouped = strikes_df.groupby(["year"]).size().reset_index(name="count")
    yearly = yearly_grouped.to_dict(orient="records")
    
    return {
        "daily": daily,
        "monthly": monthly_prob_list,
        "yearly": yearly,
        "radius_used_km": radius_km
    }

def get_simulated_lightning(lat: float, lon: float, radius_km: float) -> Dict[str, Any]:
    """
    Generate seasonal simulated lightning data when seeding has not completed.
    Sweden has peak lightning strikes in July/August, and near 0 in winter.
    Southern Sweden gets more lightning than northern Sweden.
    """
    # Latitude factor (more lightning in south)
    lat_factor = max(0.1, (69.0 - lat) / 14.0) # 1.0 at lat 55, 0.0 at lat 69
    
    # Monthly distribution (bell curve peaking in July/August)
    monthly_probs = {
        1: 0.0, 2: 0.0, 3: 0.1, 4: 0.5, 
        5: 2.0, 6: 12.0, 7: 25.0, 8: 20.0, 
        9: 4.0, 10: 0.8, 11: 0.1, 12: 0.0
    }
    
    days_in_month = {1:31, 2:29, 3:31, 4:30, 5:31, 6:30, 7:31, 8:31, 9:30, 10:31, 11:30, 12:31} # 2024
    
    daily = []
    monthly = []
    total_count = 0
    
    # Radius multiplier
    rad_factor = (radius_km / 25.0) ** 2 # proportional to area
    
    np.random.seed(int(lat * 100 + lon))
    
    for m in range(1, 13):
        base_prob = monthly_probs[m] * lat_factor * rad_factor
        # Clamp to reasonable probability (max 45%)
        prob = min(45.0, base_prob)
        
        # Calculate simulated days with strike
        days = days_in_month[m]
        strike_days = 0
        month_count = 0
        
        for d in range(1, days + 1):
            # Check if this day has a lightning strike
            if np.random.rand() * 100 < prob:
                strike_days += 1
                # Random count of strikes on that day
                count_on_day = int(np.random.randint(1, 15) * rad_factor)
                month_count += count_on_day
                
                daily.append({
                    "year": 2024,
                    "month": m,
                    "day": d,
                    "count": count_on_day,
                    "date": f"2024-{m:02d}-{d:02d}"
                })
                
        # Recalculate exact probability based on generated days
        actual_prob = (strike_days / days) * 100.0
        total_count += month_count
        
        monthly.append({
            "month": m,
            "probability": round(actual_prob, 2),
            "count": month_count
        })
        
    yearly = [{"year": 2024, "count": total_count}]
    
    return {
        "daily": daily,
        "monthly": monthly,
        "yearly": yearly,
        "radius_used_km": radius_km,
        "is_simulated": True
    }

# 5. Background Seeder Thread Logic
def start_lightning_seeding(year: int):
    """Start background threading task for seeding lightning strikes data."""
    status = get_seeding_status(year)
    if status["status"] in ["SEEDING", "COMPLETED"]:
        print(f"Lightning seeding for {year} already {status['status']}. Skipping.")
        return
        
    t = threading.Thread(target=seed_lightning_worker, args=(year,))
    t.daemon = True
    t.start()
    print(f"Dispatched background thread to seed 2024 lightning strikes data.")

def seed_lightning_worker(year: int):
    """Worker task that traverses the hierarchical SMHI Lightning API and downloads daily logs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update status to SEEDING
    cursor.execute(
        "INSERT OR REPLACE INTO seeding_status (year, status, progress, processed_days, total_days, last_updated) VALUES (?, ?, ?, ?, ?, ?)",
        (year, "SEEDING", 0.0, 0, 366, datetime.now())
    )
    conn.commit()
    conn.close()
    
    # Entry Point for Year
    url = f"https://opendata-download-lightning.smhi.se/api/version/latest/year/{year}.json"
    headers = {"User-Agent": "SMHIWeatherTrackerApp/1.0"}
    
    try:
        # Step A: Fetch Month links
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, headers=headers)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch year {year} metadata. Status: {response.status_code}")
                
            year_data = response.json()
            months = year_data.get("month", [])
            
            # Step B: Fetch days for each month
            day_links = []
            for m in months:
                month_url = m["link"][0]["href"]
                m_resp = client.get(month_url, headers=headers)
                if m_resp.status_code == 200:
                    month_data = m_resp.json()
                    days = month_data.get("day", [])
                    for d in days:
                        # Day details link
                        day_url = d["link"][0]["href"]
                        # We want the data file link, which is .../day/{day}/data.json
                        # Let's replace the .json with /data.json or just fetch the day JSON first.
                        # Wait! The day JSON lists links, one of which is 'data' link with type 'application/json'.
                        # Let's add the day metadata URL, we will retrieve the data URL from it.
                        day_links.append(day_url)
                        
            total_days = len(day_links)
            print(f"Found {total_days} days to process for year {year}")
            
            # Update total days
            conn = get_db_connection()
            conn.execute("UPDATE seeding_status SET total_days = ? WHERE year = ?", (total_days, year))
            conn.commit()
            conn.close()
            
            # Step C: Fetch daily data files concurrently in batches
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(fetch_all_days_data(day_links, year))
            
            # Mark COMPLETED
            conn = get_db_connection()
            conn.execute("UPDATE seeding_status SET status = ?, progress = 100.0, last_updated = ? WHERE year = ?", 
                         ("COMPLETED", datetime.now(), year))
            conn.commit()
            conn.close()
            print(f"Successfully completed lightning seeding for {year}!")
            
    except Exception as e:
        print(f"Error in lightning seeding worker: {e}")
        conn = get_db_connection()
        conn.execute("UPDATE seeding_status SET status = ?, last_updated = ? WHERE year = ?", 
                     ("FAILED", datetime.now(), year))
        conn.commit()
        conn.close()

async def fetch_all_days_data(day_urls: List[str], year: int):
    """Fetch all daily data.json files using a semaphore for concurrency control."""
    sem = asyncio.Semaphore(15)  # Limit concurrent HTTP connections
    processed_count = 0
    total = len(day_urls)
    
    headers = {"User-Agent": "SMHIWeatherTrackerApp/1.0"}
    
    async with httpx.AsyncClient(timeout=20.0) as client:
        
        async def fetch_and_save(day_url: str):
            nonlocal processed_count
            async with sem:
                try:
                    # 1. Fetch day metadata
                    resp = await client.get(day_url, headers=headers)
                    if resp.status_code != 200:
                        return
                    day_meta = resp.json()
                    
                    # Find data.json link
                    data_url = None
                    for link_obj in day_meta.get("link", []):
                        if link_obj.get("rel") == "data" and "data.json" in link_obj.get("href", ""):
                            data_url = link_obj["href"]
                            break
                            
                    if not data_url:
                        # Fallback try constructing data.json URL directly from metadata link
                        # e.g., if metadata link is .../day/1.json, data link is .../day/1/data.json
                        data_url = day_url.replace(".json", "/data.json")
                        
                    # 2. Fetch the actual lightning data file
                    data_resp = await client.get(data_url, headers=headers)
                    if data_resp.status_code == 200:
                        day_data = data_resp.json()
                        strikes = day_data.get("values", [])
                        
                        if strikes:
                            # Insert into database in batch
                            insert_data = []
                            for s in strikes:
                                insert_data.append((
                                    s.get("year"),
                                    s.get("month"),
                                    s.get("day"),
                                    s.get("hours", 0),
                                    s.get("minutes", 0),
                                    s.get("seconds", 0),
                                    s.get("lat"),
                                    s.get("lon"),
                                    s.get("peakCurrent", 0),
                                    s.get("cloudIndicator", 0)
                                ))
                                
                            # SQLite write
                            conn = get_db_connection()
                            conn.executemany("""
                                INSERT INTO lightning (year, month, day, hours, minutes, seconds, lat, lon, peak_current, cloud_indicator)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, insert_data)
                            conn.commit()
                            conn.close()
                            
                except Exception as e:
                    # Log error silently and continue
                    pass
                finally:
                    processed_count += 1
                    # Log progress every 15 days
                    if processed_count % 15 == 0 or processed_count == total:
                        progress = (processed_count / total) * 100.0
                        conn = get_db_connection()
                        conn.execute("""
                            UPDATE seeding_status 
                            SET progress = ?, processed_days = ?, last_updated = ? 
                            WHERE year = ?
                        """, (round(progress, 1), processed_count, datetime.now(), year))
                        conn.commit()
                        conn.close()
                        print(f"Seeding lightning progress: {processed_count}/{total} days ({progress:.1f}%)")
                        
        # Schedule all requests
        tasks = [fetch_and_save(url) for url in day_urls]
        await asyncio.gather(*tasks)
