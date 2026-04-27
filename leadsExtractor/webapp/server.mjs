#!/usr/bin/env node

import express from "express";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");
const CONFIG_PATH = path.join(ROOT_DIR, "config.json");
const CONFIG_EXAMPLE_PATH = path.join(ROOT_DIR, "config.example.json");
const RUNTIME_CONFIG_PATH = path.join(ROOT_DIR, ".runtime-config.json");
const SCRIPT_PATH = path.join(ROOT_DIR, "scrapeMapsRestaurants.mjs");
const PORT = Number(process.env.PORT || 4311);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));

const runState = {
  running: false,
  startedAt: "",
  finishedAt: "",
  exitCode: null,
  phase: "idle",
  current: 0,
  total: 0,
  summary: "",
  logs: [],
};

/** @type {import("node:child_process").ChildProcessWithoutNullStreams | null} */
let childProcess = null;
const sseClients = new Set();

function nowIso() {
  return new Date().toISOString();
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeConfig(input = {}) {
  const aoi = input.aoi ?? {};
  const grid = input.grid ?? {};
  return {
    aoi: {
      minLat: asNumber(aoi.minLat, 49.246),
      maxLat: asNumber(aoi.maxLat, 49.295),
      minLng: asNumber(aoi.minLng, -123.155),
      maxLng: asNumber(aoi.maxLng, -123.065),
    },
    grid: {
      latStep: asNumber(grid.latStep, 0.012),
      lngStep: asNumber(grid.lngStep, 0.012),
      zoom: Math.max(1, Math.floor(asNumber(grid.zoom, 14))),
    },
    searchTerm: String(input.searchTerm ?? "restaurants"),
    maxPlacesPerCell: Math.max(1, Math.floor(asNumber(input.maxPlacesPerCell, 120))),
    maxPhotosPerPlace: Math.max(1, Math.floor(asNumber(input.maxPhotosPerPlace, 25))),
    maxScrollRounds: Math.max(1, Math.floor(asNumber(input.maxScrollRounds, 35))),
    photoMinWidth: Math.max(50, Math.floor(asNumber(input.photoMinWidth, 600))),
    headless: Boolean(input.headless ?? false),
    slowMoMs: Math.max(0, Math.floor(asNumber(input.slowMoMs, 35))),
    timeoutMs: Math.max(5000, Math.floor(asNumber(input.timeoutMs, 45000))),
    outputDir: String(input.outputDir ?? "output"),
    downloadPhotos: Boolean(input.downloadPhotos ?? false),
  };
}

async function loadBaseConfig() {
  if (fsSync.existsSync(CONFIG_PATH)) {
    return JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  }
  return JSON.parse(await fs.readFile(CONFIG_EXAMPLE_PATH, "utf8"));
}

function publicState() {
  return {
    running: runState.running,
    startedAt: runState.startedAt,
    finishedAt: runState.finishedAt,
    exitCode: runState.exitCode,
    phase: runState.phase,
    current: runState.current,
    total: runState.total,
    summary: runState.summary,
    logs: runState.logs.slice(-400),
  };
}

function broadcastState() {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function pushLog(line) {
  const cleaned = line.replace(/\s+$/g, "");
  if (!cleaned) {
    return;
  }
  runState.logs.push(`[${new Date().toLocaleTimeString()}] ${cleaned}`);
  if (runState.logs.length > 1500) {
    runState.logs = runState.logs.slice(-1000);
  }
  parseProgressLine(cleaned);
  broadcastState();
}

function parseProgressLine(line) {
  const discoveryMatch = line.match(/Discovery\s+(\d+)\/(\d+)/i);
  if (discoveryMatch) {
    runState.phase = "discovering";
    runState.current = Number(discoveryMatch[1]);
    runState.total = Number(discoveryMatch[2]);
  }

  const extractingMatch = line.match(/Extracting\s+(\d+)\/(\d+)/i);
  if (extractingMatch) {
    runState.phase = "extracting";
    runState.current = Number(extractingMatch[1]);
    runState.total = Number(extractingMatch[2]);
  }

  if (line.includes("Export complete")) {
    runState.phase = "finished";
    runState.summary = line;
  }
}

function resetRunState() {
  runState.running = false;
  runState.startedAt = "";
  runState.finishedAt = "";
  runState.exitCode = null;
  runState.phase = "idle";
  runState.current = 0;
  runState.total = 0;
  runState.summary = "";
  runState.logs = [];
}

async function writeConfigs(config) {
  const serialized = `${JSON.stringify(config, null, 2)}\n`;
  await fs.writeFile(CONFIG_PATH, serialized, "utf8");
  await fs.writeFile(RUNTIME_CONFIG_PATH, serialized, "utf8");
}

function startExtraction(config) {
  resetRunState();
  runState.running = true;
  runState.startedAt = nowIso();
  runState.phase = "starting";
  runState.summary = "Starting extraction job.";
  broadcastState();

  const args = [SCRIPT_PATH, "--config", path.basename(RUNTIME_CONFIG_PATH)];
  childProcess = spawn(process.execPath, args, {
    cwd: ROOT_DIR,
    shell: false,
    windowsHide: true,
  });

  childProcess.stdout.on("data", (chunk) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/)) {
      pushLog(line);
    }
  });

  childProcess.stderr.on("data", (chunk) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/)) {
      pushLog(`[stderr] ${line}`);
    }
  });

  childProcess.on("close", (code) => {
    runState.running = false;
    runState.finishedAt = nowIso();
    runState.exitCode = code;
    runState.phase = code === 0 ? "finished" : "failed";
    runState.summary =
      code === 0
        ? `Extraction completed successfully.`
        : `Extraction exited with code ${code}.`;
    pushLog(runState.summary);
    childProcess = null;
    broadcastState();
  });

  childProcess.on("error", (error) => {
    runState.running = false;
    runState.finishedAt = nowIso();
    runState.exitCode = 1;
    runState.phase = "failed";
    runState.summary = `Failed to start extractor: ${error.message}`;
    pushLog(runState.summary);
    childProcess = null;
    broadcastState();
  });

  pushLog(`Running with searchTerm="${config.searchTerm}" and outputDir="${config.outputDir}"`);
}

app.get("/api/config", async (_req, res) => {
  try {
    const config = normalizeConfig(await loadBaseConfig());
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, state: publicState() });
});

app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  sseClients.add(res);
  res.write(`data: ${JSON.stringify(publicState())}\n\n`);
  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.post("/api/run", async (req, res) => {
  try {
    if (runState.running) {
      res.status(409).json({ ok: false, error: "Extractor already running." });
      return;
    }
    const config = normalizeConfig(req.body?.config ?? {});
    await writeConfigs(config);
    startExtraction(config);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/stop", (_req, res) => {
  if (!runState.running || !childProcess) {
    res.status(400).json({ ok: false, error: "No active extraction run." });
    return;
  }
  runState.summary = "Stop requested. Terminating process.";
  pushLog(runState.summary);
  childProcess.kill();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`leadsExtractor web UI running at http://localhost:${PORT}`);
});

