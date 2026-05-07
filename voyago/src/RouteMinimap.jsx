function projectPoints(points, width, height, padding) {
  if (!Array.isArray(points) || points.length === 0) {
    return [];
  }

  const lats = points.map((point) => point[0]);
  const lons = points.map((point) => point[1]);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const lonSpan = Math.max(maxLon - minLon, 0.000001);
  const latSpan = Math.max(maxLat - minLat, 0.000001);
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  return points.map(([lat, lon]) => {
    const x = padding + ((lon - minLon) / lonSpan) * drawWidth;
    const y = padding + (1 - (lat - minLat) / latSpan) * drawHeight;
    return [x, y];
  });
}

function RouteMiniMap({ points }) {
  const width = 320;
  const height = 180;
  const padding = 10;
  const projected = projectPoints(points, width, height, padding);
  const polyline = projected.map(([x, y]) => `${x},${y}`).join(" ");
  const start = projected[0];
  const end = projected[projected.length - 1];

  if (!projected.length) {
    return null;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-map" role="img" aria-label="Route mini map">
      <rect x="0" y="0" width={width} height={height} fill="#f5f5f5" stroke="#dddddd" />
      <polyline points={polyline} fill="none" stroke="#1565c0" strokeWidth="2.5" />
      {start ? <circle cx={start[0]} cy={start[1]} r="4" fill="#2e7d32" /> : null}
      {end ? <circle cx={end[0]} cy={end[1]} r="4" fill="#c62828" /> : null}
    </svg>
  );
}

export default RouteMiniMap;
