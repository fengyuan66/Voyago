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
    allow_origins=origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello world!"}


class Location(BaseModel):
    lat: float
    lon:float
class RouteRequest(BaseModel):
    locations: list[Location] = Field(min_length=2)

