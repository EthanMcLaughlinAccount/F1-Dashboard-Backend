from fastapi import FastAPI
from routers import drivers, laps, pit, position, sessions, weather

app = FastAPI(title="OpenF1 Unified API")

app.include_router(drivers.router)
app.include_router(laps.router)
app.include_router(pit.router)
app.include_router(position.router)
app.include_router(sessions.router)
app.include_router(weather.router)
