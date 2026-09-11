import time
import httpx
from datetime import datetime, timezone
from typing import Dict, Tuple
from ..models.schemas import WeatherData
from ..config import WEATHER_API_URL

CACHE_TTL_SECONDS = 10 * 60  # 10 minutes
_weather_cache: Dict[str, Tuple[WeatherData, float]] = {}

class WeatherService:
    @staticmethod
    def _get_cache_key(lat: float, lon: float) -> str:
        return f"{lat:.2f},{lon:.2f}"

    @staticmethod
    def parse_weather_condition(code: int, wind_speed: float, precipitation: float) -> Tuple[str, str, float]:
        condition = "Clear Sky"
        risk_level = "NORMAL"
        eta_multiplier = 1.0

        if code == 0:
            condition = "Clear / Fair"
            risk_level = "NORMAL"
            eta_multiplier = 1.0
        elif 1 <= code <= 3:
            condition = "Partly Cloudy / Overcast"
            risk_level = "NORMAL"
            eta_multiplier = 1.05
        elif 51 <= code <= 55:
            condition = "Light Drizzle"
            risk_level = "MODERATE"
            eta_multiplier = 1.10
        elif 61 <= code <= 63:
            condition = "Moderate Rainfall"
            risk_level = "MODERATE"
            eta_multiplier = 1.15
        elif code == 65 or (80 <= code <= 82):
            condition = "Heavy Rain / Flash Flood Hazard"
            risk_level = "HIGH"
            eta_multiplier = 1.25
        elif 95 <= code <= 99:
            condition = "Severe Thunderstorm & High Wind Surge"
            risk_level = "CRITICAL"
            eta_multiplier = 1.45
        else:
            condition = "Coastal Weather Hazard"
            risk_level = "MODERATE"
            eta_multiplier = 1.15

        if wind_speed > 50 or precipitation > 15:
            risk_level = "CRITICAL"
            eta_multiplier = max(eta_multiplier, 1.40)
            condition += " (Gale Warning)"
        elif wind_speed > 35 and risk_level == "NORMAL":
            risk_level = "MODERATE"
            eta_multiplier = max(eta_multiplier, 1.15)

        return condition, risk_level, eta_multiplier

    @classmethod
    async def get_weather(cls, lat: float, lon: float) -> WeatherData:
        if abs(lat) > 90 or abs(lon) > 180:
            return cls.get_fallback_weather()

        cache_key = cls._get_cache_key(lat, lon)
        now = time.time()
        if cache_key in _weather_cache:
            data, expires_at = _weather_cache[cache_key]
            if expires_at > now:
                return data

        url = f"{WEATHER_API_URL}?latitude={lat}&longitude={lon}&current_weather=true&hourly=precipitation,windspeed_10m"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    raise Exception(f"HTTP {res.status_code}")
                data = res.json()
                cw = data.get("current_weather", {})
                temp = round(cw.get("temperature", 28.0), 1)
                wind = round(cw.get("windspeed", 15.0), 1)
                code = cw.get("weathercode", 0)
                hourly_precip = data.get("hourly", {}).get("precipitation", [])
                precip = hourly_precip[0] if hourly_precip else (12.0 if code >= 61 else 0.0)

                condition, risk_level, eta_mult = cls.parse_weather_condition(code, wind, precip)
                result = WeatherData(
                    temperature=temp,
                    precipitation=precip,
                    windSpeed=wind,
                    weatherCode=code,
                    condition=condition,
                    riskLevel=risk_level,
                    etaMultiplier=eta_mult,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    source="OPEN_METEO"
                )
                _weather_cache[cache_key] = (result, now + CACHE_TTL_SECONDS)
                return result
        except Exception as e:
            print(f"[WeatherService] Open-Meteo query failed ({e}). Using fallback.")
            return cls.get_fallback_weather()

    @staticmethod
    def get_fallback_weather() -> WeatherData:
        return WeatherData(
            temperature=28.5,
            precipitation=8.2,
            windSpeed=24.0,
            weatherCode=63,
            condition="Heavy Rain / Coastal Surge Warning",
            riskLevel="HIGH",
            etaMultiplier=1.25,
            timestamp=datetime.now(timezone.utc).isoformat(),
            source="FALLBACK"
        )
