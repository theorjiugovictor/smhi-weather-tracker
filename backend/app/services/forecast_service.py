import os
import json
import random
from typing import Dict, List, Any

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

api_key = os.getenv("GEMINI_API_KEY")
client = None
if api_key and HAS_GENAI:
    client = genai.Client(api_key=api_key)

def generate_weather_forecast(lat: float, lon: float, 
                              historical_cloud: List[Dict[str, Any]], 
                              historical_lightning: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a 12-month weather forecast for cloud cover and lightning probability.
    If GEMINI_API_KEY is available, uses Gemini. Otherwise, falls back to climatology simulation.
    """
    # 1. Prepare historical inputs for printing/parsing
    cloud_history_str = ", ".join([f"Month {item['month']}: {item['cloud_cover']:.1f}%" for item in historical_cloud])
    lightning_history_str = ", ".join([f"Month {item['month']}: {item['probability']:.1f}% (Count: {item['count']})" for item in historical_lightning])
    
    prompt = f"""
    You are an expert AI Climatologist. Generate a 12-month meteorological forecast for a location at Latitude: {lat}, Longitude: {lon}.
    
    Here is the historical monthly data:
    - Average Cloud Cover: {cloud_history_str}
    - Lightning strike probability: {lightning_history_str}
    
    Provide a prediction for the next 12 calendar months (Months 1 to 12).
    Your output MUST be a valid JSON object matching this structure (do not include markdown wrapping or backticks, return ONLY the raw JSON text):
    {{
      "forecast": [
        {{"month": 1, "cloud_cover": 75.0, "lightning_probability": 0.0}},
        {{"month": 2, "cloud_cover": 72.0, "lightning_probability": 0.0}},
        ...
        {{"month": 12, "cloud_cover": 80.0, "lightning_probability": 0.0}}
      ],
      "narrative": "A detailed 150-word markdown narrative explaining the meteorological factors driving this forecast, such as latitude, ocean proximity, topographical effects (e.g. Scandinavian mountains), and seasonal atmospheric pressure cycles (like the North Atlantic Oscillation)."
    }}
    """
    
    if client:
        try:
            print("Requesting weather forecast from Gemini API...")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            resp_text = response.text.strip()
            if resp_text.startswith("```json"):
                resp_text = resp_text[7:]
            if resp_text.endswith("```"):
                resp_text = resp_text[:-3]
            resp_text = resp_text.strip()
            
            result = json.loads(resp_text)
            if "forecast" in result and "narrative" in result:
                result["source"] = "Gemini AI"
                return result
        except Exception as e:
            print(f"Gemini API forecast generation failed: {e}. Falling back to statistical model.")
            
    # 2. Fallback: Statistical seasonal forecast + Climatology text synthesis
    print("Generating forecast using statistical climatology model...")
    forecast_data = []
    
    # Simple seasonal mapping for cloud cover and lightning with random variance
    for m in range(1, 13):
        # Find matching historical averages
        hist_c = next((item["cloud_cover"] for item in historical_cloud if item["month"] == m), 60.0)
        hist_l = next((item["probability"] for item in historical_lightning if item["month"] == m), 0.0)
        
        # Add slight variation (+- 3% cloud, +-1.5% lightning, clamped)
        pred_c = max(0.0, min(100.0, hist_c + random.uniform(-3.0, 3.0)))
        pred_l = max(0.0, min(100.0, hist_l + random.uniform(-1.5, 1.5)))
        if hist_l == 0.0:
            pred_l = 0.0 # Keep winter 0
            
        forecast_data.append({
            "month": m,
            "cloud_cover": round(pred_c, 1),
            "lightning_probability": round(pred_l, 1)
        })
        
    # Generate custom narrative based on latitude
    if lat > 65.0:
        # Arctic Zone (e.g. Kiruna)
        narrative = f"""
### Arctic Climatology Analysis ({lat:.3f}° N, {lon:.3f}° E)
This location in northern Sweden experiences high-latitude subarctic weather. 
* **Cloud Cover Forecast**: Cloudiness remains consistently high throughout the year, peaking in the autumn and winter months due to polar fronts and maritime moisture rising from the Norwegian Sea. Clearer spells are anticipated in late spring.
* **Lightning Probability**: Convective activity is exceptionally low. Lightning is restricted to occasional summer storms in July, triggered by warm air masses colliding with cool Arctic flows. During the remainder of the year, cold temperatures and stable atmospheres suppress lightning generation entirely.
        """
    elif lon > 18.0 and lat < 59.0:
        # Baltic Coastal/Island Zone (e.g. Gotland / Visby)
        narrative = f"""
### Baltic Maritime Climatology Analysis ({lat:.3f}° N, {lon:.3f}° E)
This coastal coordinate is strongly influenced by the Baltic Sea.
* **Cloud Cover Forecast**: The maritime effect provides a stabilizing force, resulting in lower cloud cover averages during late spring and summer (creating some of Sweden's sunniest months). Cloud cover rises in late autumn as cold air flows over the warmer water, generating low stratus clouds.
* **Lightning Probability**: The warm Baltic waters in July and August act as a thermal engine. Convective cloud development is common during summer afternoons, leading to a moderate probability of lightning strikes. Activity is zero from November through March.
        """
    else:
        # Central/Southern Inland Zone (e.g. Stockholm/Gothenburg region)
        narrative = f"""
### Central/Southern Swedish Climatology Analysis ({lat:.3f}° N, {lon:.3f}° E)
Located in central/southern Sweden, this area is governed by a humid continental/maritime border climate.
* **Cloud Cover Forecast**: Moderate to high cloud cover exists year-round. Winter months are dominated by Atlantic low-pressure systems, keeping cloud cover near 70-80%. Summer features convective fair-weather clouds, reducing average cloud cover to around 50%.
* **Lightning Probability**: Lightning probability reaches its maximum in July, driven by daytime surface heating. The collision of humid south-westerly flows and cooler Scandinavian air triggers typical afternoon thunderstorms. Winter is stable and free of lightning strikes.
        """
        
    return {
        "forecast": forecast_data,
        "narrative": narrative.strip(),
        "source": "Statistical Climatology Model (AI Offline)"
    }
