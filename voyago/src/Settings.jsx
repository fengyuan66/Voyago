import { useState } from "react";
import { getHQFromStorage, saveHQToStorage } from "./settingsStore";

export default function SettingsPage() {
  const savedHQ = getHQFromStorage();

  const [label, setLabel] = useState(savedHQ?.label || "");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(savedHQ?.lat ?? null);
  const [lon, setLon] = useState(savedHQ?.lon ?? null);
  const [message, setMessage] = useState("");

  async function geocode(inputAddress) {
    
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(inputAddress)}`,
    );

    const data = await res.json();
    if (!data.length) {
      throw new Error("Address not found.");
    }

    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
    };
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      const coords = await geocode(address);
      const hq = {
        label: label.trim(),
        lat: coords.lat,
        lon: coords.lon,
      };

      saveHQToStorage(hq);
      setLat(coords.lat);
      setLon(coords.lon);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err.message || "Failed to save HQ.");
    }
  }

  const hasLocation = lat !== null && lon !== null;

  return (
    <section style={{ padding: "6rem 1rem 2rem" }}>
      <h1>Settings</h1>

      <form onSubmit={handleSave}>
        <div>
          <label>HQ name</label>
          <br />
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div>
          <label>Address</label>
          <br />
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <button type="submit">Save</button>
      </form>

      <p>{message}</p>

      {hasLocation ? (
        <p>
          Saved location: {lat}, {lon}
        </p>
      ) : null}
    </section>
  );
}
