from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/position", tags=["Position"])

@router.get("/")
def get_position(meeting_key: int = Query(...), driver_number: int = Query(...), position_le: int = Query(...)):
    url = f"https://api.openf1.org/v1/position?meeting_key={meeting_key}&driver_number={driver_number}&position<={position_le}"
    response = requests.get(url)
    return response.json()