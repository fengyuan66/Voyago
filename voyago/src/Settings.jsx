import { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { getHQ, saveHQ } from "../stores/settingsStore";

export default function SettingsPage(){
    const savedHQ = getHQ();

    const[label, setLabel] = useState(savedHQ?.label || "");
    const[address, setAdrress] = useState("");
    const[lat, setLat] = useState(savedHQ?.lat || null);
    const[lon, setLon] = useState(savedHQ?.lon || null);
    const [message, setMessage] = useState("");

    async function geocode(address) {

        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            address
        )}`
        );

        const data = await res.json();

        if(!data.length) {
            throw new Error("Address is not found!");
        }

        return {
            lat: Number(data[0].lat),
            lon: Number(data[0].lon),
        };
    }

    async function handleSave(e) {

        e.preventDefault();

        try{
            const coords = await geocode(address);
            const hq = {
                label,
                lat: coords.lat,
                lon: coords.lon,
            };

            saveHQ(hq);

            setLat(coords.lat);
            setLon(coords.lon);
            
        } catch (err){
            setMessage(err.message)
        }


          const hasLocation = lat !== null && lon !== null;

        return (
            <div>
                <h1>Settings</h1>

                <form onSubmit={handleSave}>
                    <div>
                    <label>HQ name</label>
                    <br/>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} />
                    </div>

                    <div>
                    <label>Address</label>
                    <br/>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>

                    <button type="submit">Save</button>
                </form>

                <p>{message}</p>

                {hasLocation && (
                    <div>
                    <p>
                        Saved location: {lat}, {lon}
                    </p>

                    <div style={{ height: "300px", width: "400px" }}>
                        <MapContainer center={[lat, lon]} zoom={13} style={{ height: "100%" }}>
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[lat, lon]} />
                        </MapContainer>
                    </div>
                    </div>
                )}
            </div>
        );
        }

    }
