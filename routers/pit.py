from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/pit", tags=["Pit Stops"])

@router.get("/")
def get_pit(session_key: int = Query(...), pit_duration_lt: int = Query(...)):
    url = f"https://api.openf1.org/v1/pit?session_key={session_key}&pit_duration<{pit_duration_lt}"
    response = requests.get(url)
    return response.json()