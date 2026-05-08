from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from valhalla import Actor, get_config, get_help
from pathlib import Path
import json


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
    costing: str = "auto" #routing mode
    date_time: dict | None = None

ROUTE_RETRY_RADIUS_METERS = 200
ROUTE_RETRY_MIN_REACHABILITY = 1
ROUTE_RETRY_SEARCH_CUTOFF_METERS = 35000



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

def _decode_actor_result(result):
    if isinstance(result, bytes):
        result = result.decode("utf-8")

    if isinstance(result, str):
        return json.loads(result)

    return result

def _make_locations(points: list[Location], with_search_hints: bool):
    mapped = []
    for point in points:
        location = {
            "lat": point.lat,
            "lon": point.lon,
            "type": "break",
        }
        if with_search_hints:
            location["radius"] = ROUTE_RETRY_RADIUS_METERS
            location["minimum_reachability"] = ROUTE_RETRY_MIN_REACHABILITY
            location["search_cutoff"] = ROUTE_RETRY_SEARCH_CUTOFF_METERS
        mapped.append(location)
    return mapped

@app.post("/route")
def route(req: RouteRequest):
    if actor is None:
        raise HTTPException(status_code = 503, detail = "Valhalla not ready!")
    
    attempts = [
        {
            "locations": _make_locations(req.locations, with_search_hints=False),
            "costing": req.costing,
        },
        {
            "locations": _make_locations(req.locations, with_search_hints=True),
            "costing": req.costing,
        },
    ]
    if req.date_time:
        for payload in attempts:
            payload["date_time"] = req.date_time

    last_error = None
    for payload in attempts:
        try:
            result = actor.route(payload)
            return _decode_actor_result(result)
        except Exception as error:
            last_error = error
            continue

    message = str(last_error) if last_error is not None else "Unknown routing error"
    if "no suitable edges near location" in message.lower():
        raise HTTPException(
            status_code=422,
            detail=(
                "Routing failed: one or more points are off-road or outside the currently loaded routing tiles. "
                "Set HQ to a nearby Vancouver street address."
            ),
        )

    raise HTTPException(status_code=500, detail=f"Routing failed: {message}")
    
#debug
@app.get("/health")
def health():
    return {
        "actor_presence": actor is not None,
        "config_path": str(VALHALLA_CONFIG_PATH),
        "actor_error": actor_error
    }

