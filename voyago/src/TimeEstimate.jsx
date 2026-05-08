import { useState } from "react";
import { getRoute } from "./routingapi";

function TimeEstimate (){
    const [startLat, setStartLat] = useState("");
    const [startLon, setStartLon] = useState("");
    const [endLat, setEndLat] = useState("");
    const [endLon, setEndLon] = useState("");

    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const handleClick = async() => {
        setError("");
        try {
            const data = await getRoute({
                locations: [
                    { lat: parseFloat(startLat), lon: parseFloat(startLon) },
                    { lat: parseFloat(endLat), lon: parseFloat(endLon) },
                ],
                costing: "multimodal" //CHANGE HERE FOR PRACTICAL COSTING MODE

            });

            setResult(data);
        } catch (err) {
            setResult(null);
            setError(err?.message || "Routing is disabled.");
        }
    }

    return (
        <div>
            <div>
            <input
            placeholder = "Lat"
            value = {startLat}
            onChange = {(e) => setStartLat(e.target.value)}
            />
            <input
            placeholder = "Lon"
            value = {startLon}
            onChange = {(e) => setStartLon(e.target.value)}
            />
        </div>
        <div>
            <input
            placeholder = "ELat"
            value = {endLat}
            onChange = {(e) => setEndLat(e.target.value)}
            />
            <input
            placeholder = "ELon"
            value = {endLon}
            onChange = {(e) => setEndLon(e.target.value)}
            />
        </div>

        <button onClick={handleClick}>
            Get route
        </button>

        <pre>
        {result ? JSON.stringify(result, null, 2) : "No data yet"}
        </pre>
        {error ? <p>{error}</p> : null}

        </div>
        
    );

}

export default TimeEstimate;
