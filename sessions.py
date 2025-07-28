from fastapi import APIRouter, Query
import requests

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("/")
def get_sessions(country_name: str = Query(...), session_name: str = Query(...), year: int = Query(...)):
    url = f"https://api.openf1.org/v1/sessions?country_name={country_name}&session_name={session_name}&year={year}"
    response = requests.get(url)
    return response.json()