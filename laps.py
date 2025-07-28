from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/laps", tags=["Laps"])

@router.get("/")
def get_laps(session_key: int = Query(...), driver_number: int = Query(...), lap_number: int = Query(...)):
    url = f"https://api.openf1.org/v1/laps?session_key={session_key}&driver_number={driver_number}&lap_number={lap_number}"
    response = requests.get(url)
    return response.json()