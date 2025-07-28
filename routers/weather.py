from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/")
def get_weather(meeting_key: int = Query(...), wind_direction_gte: int = Query(...), track_temperature_gte: int = Query(...)):
    url = f"https://api.openf1.org/v1/weather?meeting_key={meeting_key}&wind_direction>={wind_direction_gte}&track_temperature>={track_temperature_gte}"
    response = requests.get(url)
    return response.json()