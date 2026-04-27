const els = {
  minLat: document.querySelector("#minLat"),
  maxLat: document.querySelector("#maxLat"),
  minLng: document.querySelector("#minLng"),
  maxLng: document.querySelector("#maxLng"),
  searchTerm: document.querySelector("#searchTerm"),
  zoom: document.querySelector("#zoom"),
  latStep: document.querySelector("#latStep"),
  lngStep: document.querySelector("#lngStep"),
  maxPlacesPerCell: document.querySelector("#maxPlacesPerCell"),
  maxPhotosPerPlace: document.querySelector("#maxPhotosPerPlace"),
  maxScrollRounds: document.querySelector("#maxScrollRounds"),
  photoMinWidth: document.querySelector("#photoMinWidth"),
  slowMoMs: document.querySelector("#slowMoMs"),
  timeoutMs: document.querySelector("#timeoutMs"),
  outputDir: document.querySelector("#outputDir"),
  headless: document.querySelector("#headless"),
  downloadPhotos: document.querySelector("#downloadPhotos"),
  configForm: document.querySelector("#configForm"),
  fitAoiBtn: document.querySelector("#fitAoiBtn"),
  runBtn: document.querySelector("#runBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  statusBox: document.querySelector("#statusBox"),
  logs: document.querySelector("#logs"),
};

const map = L.map("map", { zoomControl: true }).setView([49.2827, -123.1207], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const drawnItems = new L.FeatureGroup().addTo(map);
let aoiRectangle = null;

const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    remove: true,
  },
  draw: {
    rectangle: {
      shapeOptions: { color: "#216869", weight: 2 },
    },
    polyline: false,
    polygon: false,
    circle: false,
    marker: false,
    circlemarker: false,
  },
});
map.addControl(drawControl);

function asNumberInput(value) {
  return Number(value);
}

function setBoundsInputs(bounds) {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  els.minLat.value = south.toFixed(6);
  els.maxLat.value = north.toFixed(6);
  els.minLng.value = west.toFixed(6);
  els.maxLng.value = east.toFixed(6);
}

function getBoundsFromInputs() {
  const minLat = asNumberInput(els.minLat.value);
  const maxLat = asNumberInput(els.maxLat.value);
  const minLng = asNumberInput(els.minLng.value);
  const maxLng = asNumberInput(els.maxLng.value);
  return L.latLngBounds(
    [Math.min(minLat, maxLat), Math.min(minLng, maxLng)],
    [Math.max(minLat, maxLat), Math.max(minLng, maxLng)]
  );
}

function upsertRectangle(bounds, fit = false) {
  if (aoiRectangle) {
    drawnItems.removeLayer(aoiRectangle);
  }
  aoiRectangle = L.rectangle(bounds, { color: "#216869", weight: 2 });
  drawnItems.addLayer(aoiRectangle);
  if (fit) {
    map.fitBounds(bounds.pad(0.2));
  }
}

function applyConfigToForm(config) {
  els.minLat.value = config.aoi.minLat;
  els.maxLat.value = config.aoi.maxLat;
  els.minLng.value = config.aoi.minLng;
  els.maxLng.value = config.aoi.maxLng;
  els.searchTerm.value = config.searchTerm;
  els.zoom.value = config.grid.zoom;
  els.latStep.value = config.grid.latStep;
  els.lngStep.value = config.grid.lngStep;
  els.maxPlacesPerCell.value = config.maxPlacesPerCell;
  els.maxPhotosPerPlace.value = config.maxPhotosPerPlace;
  els.maxScrollRounds.value = config.maxScrollRounds;
  els.photoMinWidth.value = config.photoMinWidth;
  els.slowMoMs.value = config.slowMoMs;
  els.timeoutMs.value = config.timeoutMs;
  els.outputDir.value = config.outputDir;
  els.headless.checked = Boolean(config.headless);
  els.downloadPhotos.checked = Boolean(config.downloadPhotos);
  upsertRectangle(getBoundsFromInputs(), true);
}

function gatherConfigFromForm() {
  return {
    aoi: {
      minLat: asNumberInput(els.minLat.value),
      maxLat: asNumberInput(els.maxLat.value),
      minLng: asNumberInput(els.minLng.value),
      maxLng: asNumberInput(els.maxLng.value),
    },
    grid: {
      latStep: asNumberInput(els.latStep.value),
      lngStep: asNumberInput(els.lngStep.value),
      zoom: asNumberInput(els.zoom.value),
    },
    searchTerm: els.searchTerm.value.trim(),
    maxPlacesPerCell: asNumberInput(els.maxPlacesPerCell.value),
    maxPhotosPerPlace: asNumberInput(els.maxPhotosPerPlace.value),
    maxScrollRounds: asNumberInput(els.maxScrollRounds.value),
    photoMinWidth: asNumberInput(els.photoMinWidth.value),
    headless: els.headless.checked,
    slowMoMs: asNumberInput(els.slowMoMs.value),
    timeoutMs: asNumberInput(els.timeoutMs.value),
    outputDir: els.outputDir.value.trim(),
    downloadPhotos: els.downloadPhotos.checked,
  };
}

function setRunUiState(running) {
  els.runBtn.disabled = running;
  els.stopBtn.disabled = !running;
}

function formatProgress(state) {
  if (state.running && state.total > 0) {
    return `${state.phase}: ${state.current}/${state.total}`;
  }
  return state.phase;
}

function renderState(state) {
  const statusLine = [
    `Run: ${state.running ? "Running" : "Idle"}`,
    `Phase: ${formatProgress(state)}`,
    state.summary ? `Summary: ${state.summary}` : "",
    state.startedAt ? `Started: ${state.startedAt}` : "",
    state.finishedAt ? `Finished: ${state.finishedAt}` : "",
    state.exitCode !== null ? `Exit Code: ${state.exitCode}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  els.statusBox.textContent = statusLine || "Idle";
  els.logs.textContent = (state.logs || []).join("\n");
  els.logs.scrollTop = els.logs.scrollHeight;
  setRunUiState(Boolean(state.running));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function loadInitialConfig() {
  const data = await fetchJson("/api/config");
  applyConfigToForm(data.config);
}

async function refreshStatus() {
  const data = await fetchJson("/api/status");
  renderState(data.state);
}

map.on(L.Draw.Event.CREATED, (event) => {
  const layer = event.layer;
  drawnItems.clearLayers();
  drawnItems.addLayer(layer);
  aoiRectangle = layer;
  setBoundsInputs(layer.getBounds());
});

map.on(L.Draw.Event.EDITED, (event) => {
  event.layers.eachLayer((layer) => {
    aoiRectangle = layer;
    setBoundsInputs(layer.getBounds());
  });
});

map.on(L.Draw.Event.DELETED, () => {
  aoiRectangle = null;
});

["minLat", "maxLat", "minLng", "maxLng"].forEach((id) => {
  els[id].addEventListener("change", () => {
    upsertRectangle(getBoundsFromInputs(), false);
  });
});

els.fitAoiBtn.addEventListener("click", () => {
  upsertRectangle(getBoundsFromInputs(), true);
});

els.configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await fetchJson("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: gatherConfigFromForm() }),
    });
    await refreshStatus();
  } catch (error) {
    alert(`Failed to start: ${error.message}`);
  }
});

els.stopBtn.addEventListener("click", async () => {
  try {
    await fetchJson("/api/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    await refreshStatus();
  } catch (error) {
    alert(`Failed to stop: ${error.message}`);
  }
});

let sse;
function connectSse() {
  sse = new EventSource("/api/events");
  sse.onmessage = (event) => {
    const state = JSON.parse(event.data);
    renderState(state);
  };
  sse.onerror = () => {
    sse.close();
    setTimeout(connectSse, 2000);
  };
}

await loadInitialConfig();
await refreshStatus();
connectSse();

