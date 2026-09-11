import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "5000"))
NODE_ENV = os.getenv("NODE_ENV", "development")
CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "http://localhost:5173,http://localhost:5174").split(",")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

WEATHER_API_URL = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
ROUTING_TOMTOM_API = os.getenv("routingTomTomApi") or os.getenv("routingtomtomapi") or os.getenv("TOMTOM_API_KEY", "")
ROUTING_API_URL = os.getenv("ROUTING_API_URL", "https://router.project-osrm.org")

USGS_DISASTER_API_URL = os.getenv("USGS_DISASTER_API_URL", "https://earthquake.usgs.gov/fdsnws/event/1/query")
NASA_EONET_API_URL = os.getenv("NASA_EONET_API_URL", "https://eonet.gsfc.nasa.gov/api/v3/events")
