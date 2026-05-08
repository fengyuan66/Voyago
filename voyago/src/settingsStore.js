const HQ_KEY = "voyago.hq";

function parseHq(raw) {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lon = Number(parsed?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return {
      label: typeof parsed?.label === "string" ? parsed.label : "",
      lat,
      lon,
    };
  } catch {
    return null;
  }
}



export function getHQFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  return parseHq(window.localStorage.getItem(HQ_KEY));
}

export function saveHQToStorage(hq) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(HQ_KEY, JSON.stringify(hq));
}