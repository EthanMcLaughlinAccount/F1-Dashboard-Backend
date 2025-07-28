from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/drivers", tags=["Drivers"])

@router.get("/")
def get_drivers(driver_number: int = Query(...), session_key: int = Query(...)):
    url = f"https://api.openf1.org/v1/drivers?driver_number={driver_number}&session_key={session_key}"
    response = requests.get(url)
    return response.json()