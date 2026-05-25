import httpx
import urllib.parse
from typing import Dict, Any, Optional

async def geocode_address(address: str) -> Optional[Dict[str, Any]]:
    """
    Geocode an address string to coordinates (latitude, longitude) using OSM Nominatim.
    Returns a dict with lat, lon, and display_name, or None if not found/error.
    """
    if not address or not address.strip():
        return None
        
    encoded_address = urllib.parse.quote(address.strip())
    url = f"https://nominatim.openstreetmap.org/search?q={encoded_address}&format=json&limit=5&countrycodes=se,no,fi,dk"
    
    headers = {
        "User-Agent": "SMHIWeatherTrackerApp/1.0 (contact: developer@smhi-weather-tracker.local)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                results = response.json()
                if results:
                    # Return the first match
                    first_match = results[0]
                    return {
                        "lat": float(first_match["lat"]),
                        "lon": float(first_match["lon"]),
                        "display_name": first_match["display_name"]
                    }
            
            # If countrycodes restricted query failed, try a global lookup
            global_url = f"https://nominatim.openstreetmap.org/search?q={encoded_address}&format=json&limit=5"
            response = await client.get(global_url, headers=headers)
            if response.status_code == 200:
                results = response.json()
                if results:
                    first_match = results[0]
                    return {
                        "lat": float(first_match["lat"]),
                        "lon": float(first_match["lon"]),
                        "display_name": first_match["display_name"]
                    }
                    
    except Exception as e:
        print(f"Geocoding exception for '{address}': {e}")
        
    return None
