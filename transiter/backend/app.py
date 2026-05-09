from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from valhalla import Actor
from pathlib import Path
import json
import threading
import os


app = FastAPI()

def _load_cors_origins():
    configured = os.getenv("TRANSITER_CORS_ORIGINS", "").strip()
    if configured:
        if configured == "*":
            return ["*"]
        parsed = [origin.strip() for origin in configured.split(",") if origin.strip()]
        if parsed:
            return parsed
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

#ALLOWED URLS. TWEAK THIS IN DEPLOYMENT
origins = _load_cors_origins()
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
actor_lock = threading.Lock()

def _build_actor_config():
    with VALHALLA_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    valhalla_root = BASE_PATH / "valhalla"
    mjolnir = config.setdefault("mjolnir", {})

    # Keep local development defaults, but allow cloud overrides through env vars.
    mjolnir["tile_dir"] = os.getenv("TRANSITER_TILE_DIR", str(valhalla_root / "tiles"))
    mjolnir["transit_dir"] = os.getenv("TRANSITER_TRANSIT_TILE_DIR", str(valhalla_root / "transit_tiles"))
    mjolnir["transit_feeds_dir"] = os.getenv("TRANSITER_GTFS_FEEDS_DIR", str(valhalla_root / "gtfs_feeds"))

    return config

try:
    actor = Actor(_build_actor_config())
except Exception as e:
    actor_error = str(e)
    print(f"Failed to initialize Valhalla actor: {actor_error}")

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
            # pyvalhalla Actor wraps native code; guard shared instance against concurrent access
            # to avoid process-level crashes from overlapping requests.
            with actor_lock:
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

