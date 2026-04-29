from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from valhalla import Actor, get_config, get_help
from pathlib import Path


app = FastAPI()

#ALLOWED URLS. TWEAK THIS IN DEPLOYMENT
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
#PERMISSION SETTINGS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello world!"}

#DATA MODEL CONFIG
class Location(BaseModel):
    lat: float
    lon:float
class RouteRequest(BaseModel):
    locations: list[Location] = Field(min_length=2)
    costing_mode: str = "multimodal" #routing mode
    date_time: dict | None = None



BASE_PATH = Path(__file__).resolve().parent.parent
VALHALLA_CONFIG_PATH = BASE_PATH / "valhalla" / "valhalla.json"

actor: Actor | None = None
actor_error: str | None = None

try:
    actor = Actor(str(VALHALLA_CONFIG_PATH))
except Exception as e:
    actor_error = str(e)
    print(e.code)
    print(e.message)
    print(e.http_code)
    print(e.http_messages)

@app.post("/route")
def route(req: RouteRequest):
    if actor is None:
        raise HTTPException(status_code = 201, detail = "Valhalla not ready!")
    
    if req.date_time:
        payload["date_time"] = req.date_time

    payload = {
        "locations": [{"lat": p.lat, "lon": p.lon} for p in req.locations],
        "costing_mode": req.routing_mode
    }

    try:
        return actor.route(payload)
    except Exception as e:
        raise HTTPException(status_code = 202, detail = "Routing failed with below message: {e}")
    