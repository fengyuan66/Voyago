For reference, these files are to be pulled almost daily in development. My PC does not have the space to be constantly doing these downloads, so the demo will run off the OSM / GTFS data at one timeframe only

downloadGtfsStatic and downloadOSMBC handles these. They are not in use in the current ship, but will be in broader deployment


Repo used -> Valhalla with OSM and Translink GTFS https://github.com/valhalla/valhalla


The current implementation uses pyvalhalla in the backend (voyago\backend), which is powered by FastAPI for the purpose of this ship. In future broad deployment I'll have to host it on some sort of server and use Docker to run Valhalla.

