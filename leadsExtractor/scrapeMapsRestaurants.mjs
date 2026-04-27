#!/usr/bin/env node

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_CONFIG_CANDIDATES = ["config.json", "leadsExtractor/config.json"];
const FALLBACK_CONFIG_CANDIDATES = [
  "config.example.json",
  "leadsExtractor/config.example.json",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.replace(/^--/, "");
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeConfig(raw) {
  const aoi = raw.aoi ?? {};
  const grid = raw.grid ?? {};

  return {
    aoi: {
      minLat: toNumber(aoi.minLat, 0),
      maxLat: toNumber(aoi.maxLat, 0),
      minLng: toNumber(aoi.minLng, 0),
      maxLng: toNumber(aoi.maxLng, 0),
    },
    grid: {
      latStep: toNumber(grid.latStep, 0.02),
      lngStep: toNumber(grid.lngStep, 0.02),
      zoom: toNumber(grid.zoom, 14),
    },
    searchTerm: String(raw.searchTerm ?? "restaurants"),
    maxPlacesPerCell: Math.max(1, toNumber(raw.maxPlacesPerCell, 120)),
    maxPhotosPerPlace: Math.max(1, toNumber(raw.maxPhotosPerPlace, 30)),
    maxScrollRounds: Math.max(1, toNumber(raw.maxScrollRounds, 35)),
    headless: Boolean(raw.headless ?? false),
    slowMoMs: Math.max(0, toNumber(raw.slowMoMs, 50)),
    timeoutMs: Math.max(5000, toNumber(raw.timeoutMs, 45000)),
    outputDir: String(raw.outputDir ?? "output"),
    downloadPhotos: Boolean(raw.downloadPhotos ?? false),
    photoMinWidth: Math.max(100, toNumber(raw.photoMinWidth, 500)),
  };
}

function buildGridPoints(aoi, grid) {
  const points = [];
  for (let lat = aoi.minLat; lat <= aoi.maxLat + 1e-9; lat += grid.latStep) {
    for (let lng = aoi.minLng; lng <= aoi.maxLng + 1e-9; lng += grid.lngStep) {
      points.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      });
    }
  }
  return points;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanPlaceUrl(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const qIndex = trimmed.indexOf("?");
  if (qIndex === -1) {
    return trimmed;
  }
  return trimmed.slice(0, qIndex);
}

function csvEscape(value) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function toCsv(rows, headers) {
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map((row) =>
    headers.map((key) => csvEscape(row[key])).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clamp(max, values) {
  if (values.length <= max) {
    return values;
  }
  return values.slice(0, max);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function maybeHandleConsent(page) {
  const candidates = [
    "button:has-text('Reject all')",
    "button:has-text('Accept all')",
    "button:has-text('I agree')",
    "button:has-text('Accept')",
  ];

  for (const selector of candidates) {
    const node = page.locator(selector).first();
    if (await node.isVisible().catch(() => false)) {
      await node.click({ timeout: 2000 }).catch(() => null);
      await sleep(700);
      return;
    }
  }
}

async function discoverPlaceUrls(page, config, point) {
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    config.searchTerm
  )}/@${point.lat},${point.lng},${config.grid.zoom}z`;

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: config.timeoutMs,
  });
  await maybeHandleConsent(page);
  await page.waitForTimeout(1500);

  const urls = new Set();
  let staleRounds = 0;

  for (let round = 0; round < config.maxScrollRounds; round += 1) {
    const foundUrls = await page.$$eval("a[href]", (anchors) =>
      anchors
        .map((anchor) => anchor.href)
        .filter((href) => href.includes("/maps/place/") || href.includes("/place/"))
    );

    for (const url of foundUrls) {
      urls.add(cleanPlaceUrl(url));
    }

    if (urls.size >= config.maxPlacesPerCell) {
      break;
    }

    const countBefore = urls.size;
    await page.evaluate(() => {
      const feed =
        document.querySelector('div[role="feed"]') ??
        document.querySelector("div.m6QErb[aria-label]") ??
        document.querySelector("div[role='main']");
      if (feed) {
        feed.scrollBy(0, 2600);
      } else {
        window.scrollBy(0, 2600);
      }
    });

    await page.waitForTimeout(1200);

    if (urls.size === countBefore) {
      staleRounds += 1;
      if (staleRounds >= 6) {
        break;
      }
    } else {
      staleRounds = 0;
    }
  }

  return clamp(config.maxPlacesPerCell, [...urls]);
}

function flattenJsonLd(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input.flatMap((entry) => flattenJsonLd(entry));
  }
  if (typeof input !== "object") {
    return [];
  }
  if (Array.isArray(input["@graph"])) {
    return input["@graph"].flatMap((entry) => flattenJsonLd(entry));
  }
  return [input];
}

function pickLikelyRestaurant(jsonLdEntries) {
  const scored = jsonLdEntries.map((entry) => {
    const typeValue = entry["@type"];
    const types = Array.isArray(typeValue)
      ? typeValue.map((x) => String(x).toLowerCase())
      : [String(typeValue ?? "").toLowerCase()];
    const serialized = JSON.stringify(entry).toLowerCase();
    let score = 0;
    if (types.some((type) => type.includes("restaurant"))) {
      score += 6;
    }
    if (types.some((type) => type.includes("food"))) {
      score += 2;
    }
    if (serialized.includes("aggregateRating".toLowerCase())) {
      score += 1;
    }
    if (serialized.includes("telephone")) {
      score += 1;
    }
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entry ?? null;
}

function sanitizeFileName(value) {
  return String(value ?? "place")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function extractJsonLd(page) {
  const jsonStrings = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((node) => node.textContent || "").filter(Boolean)
  );
  const entries = [];
  for (const jsonString of jsonStrings) {
    try {
      const parsed = JSON.parse(jsonString);
      entries.push(...flattenJsonLd(parsed));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return entries;
}

async function extractBasicUiFields(page) {
  return page.evaluate(() => {
    const text = (selector) => {
      const element = document.querySelector(selector);
      return element ? (element.textContent || "").replace(/\s+/g, " ").trim() : "";
    };

    const attr = (selector, name) => {
      const element = document.querySelector(selector);
      return element ? (element.getAttribute(name) || "").trim() : "";
    };

    return {
      name: text("h1.DUwDvf, h1"),
      category: text("button[jsaction*='pane.rating.category'], button.DkEaL"),
      address: attr("button[data-item-id='address']", "aria-label"),
      phone: attr("button[data-item-id^='phone:tel']", "aria-label"),
      website: attr("a[data-item-id='authority']", "href"),
      status: text("span.ZDu9vd, div.d3YlGd"),
      ratingText: text("div.F7nice span[aria-hidden='true']"),
      reviewsText: text("button[aria-label*='reviews'], button[aria-label*='Reviews']"),
    };
  });
}

function filterLikelyPhotoUrls(urls, minWidth) {
  const filtered = urls.filter((url) => {
    if (!url.includes("googleusercontent.com") && !url.includes("gstatic.com")) {
      return false;
    }
    const widthMatch = url.match(/=w(\d+)-h(\d+)/i);
    if (!widthMatch) {
      return true;
    }
    const width = Number(widthMatch[1]);
    return Number.isFinite(width) && width >= minWidth;
  });
  return unique(filtered);
}

async function collectPhotoUrls(page, maxPhotos, photoMinWidth) {
  const openGallerySelectors = [
    "button[aria-label*='Photos']",
    "button[jsaction*='pane.photo']",
    "a[aria-label*='Photos']",
    "a[href*='/photos']",
  ];

  for (const selector of openGallerySelectors) {
    const node = page.locator(selector).first();
    if (await node.isVisible().catch(() => false)) {
      await node.click({ timeout: 2000 }).catch(() => null);
      await sleep(1200);
      break;
    }
  }

  const photos = new Set();
  let staleRounds = 0;

  for (let round = 0; round < 24; round += 1) {
    const raw = await page.$$eval("img[src]", (images) =>
      images
        .map((image) => image.src)
        .filter(Boolean)
    );
    const previousSize = photos.size;
    for (const url of filterLikelyPhotoUrls(raw, photoMinWidth)) {
      photos.add(url);
      if (photos.size >= maxPhotos) {
        return clamp(maxPhotos, [...photos]);
      }
    }

    await page.evaluate(() => {
      const candidates = [
        document.querySelector("div[role='main']"),
        document.querySelector("div[role='feed']"),
        document.querySelector("div.m6QErb[tabindex='0']"),
      ].filter(Boolean);
      if (candidates.length > 0) {
        candidates[0].scrollBy(0, 2800);
      } else {
        window.scrollBy(0, 2800);
      }
    });
    await page.waitForTimeout(900);

    if (photos.size === previousSize) {
      staleRounds += 1;
      if (staleRounds >= 6) {
        break;
      }
    } else {
      staleRounds = 0;
    }
  }

  return clamp(maxPhotos, [...photos]);
}

async function downloadPhoto(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`photo download failed (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const content = Buffer.from(arrayBuffer);
  await fs.writeFile(filePath, content);
}

function numberFromMaybeString(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const number = Number(String(value ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(number) ? number : "";
}

function buildRow(index, placeUrl, jsonLd, uiFields, photoUrls, localPhotoPaths) {
  const aggregate = jsonLd?.aggregateRating ?? {};
  const geo = jsonLd?.geo ?? {};
  const address = jsonLd?.address ?? {};

  const parsedRating = numberFromMaybeString(aggregate.ratingValue || uiFields.ratingText);
  const parsedReviewCount = numberFromMaybeString(
    aggregate.reviewCount || uiFields.reviewsText
  );

  return {
    id: index,
    scrapedAtUtc: new Date().toISOString(),
    source: "google_maps_ui",
    name: normalizeWhitespace(jsonLd?.name || uiFields.name),
    category: normalizeWhitespace(jsonLd?.servesCuisine || uiFields.category),
    rating: parsedRating,
    reviewCount: parsedReviewCount,
    priceLevel: normalizeWhitespace(jsonLd?.priceRange || ""),
    status: normalizeWhitespace(uiFields.status),
    address: normalizeWhitespace(
      jsonLd?.streetAddress ||
        address.streetAddress ||
        uiFields.address.replace(/^Address:\s*/i, "")
    ),
    city: normalizeWhitespace(address.addressLocality || ""),
    region: normalizeWhitespace(address.addressRegion || ""),
    postalCode: normalizeWhitespace(address.postalCode || ""),
    country: normalizeWhitespace(address.addressCountry || ""),
    phone: normalizeWhitespace(
      jsonLd?.telephone || uiFields.phone.replace(/^Phone:\s*/i, "")
    ),
    website: normalizeWhitespace(jsonLd?.url || uiFields.website),
    latitude: numberFromMaybeString(jsonLd?.latitude || geo.latitude),
    longitude: numberFromMaybeString(jsonLd?.longitude || geo.longitude),
    placeUrl,
    photoCount: photoUrls.length,
    photoUrls: photoUrls.join(" | "),
    localPhotos: localPhotoPaths.join(" | "),
  };
}

async function extractPlaceData(context, placeUrl, config, index, photosDirPath) {
  const page = await context.newPage();
  try {
    await page.goto(placeUrl, {
      waitUntil: "domcontentloaded",
      timeout: config.timeoutMs,
    });
    await maybeHandleConsent(page);
    await page.waitForTimeout(1400);

    const jsonLdEntries = await extractJsonLd(page);
    const restaurantJsonLd = pickLikelyRestaurant(jsonLdEntries);
    const uiFields = await extractBasicUiFields(page);
    const photoUrls = await collectPhotoUrls(
      page,
      config.maxPhotosPerPlace,
      config.photoMinWidth
    );

    const localPhotoPaths = [];
    if (config.downloadPhotos && photoUrls.length > 0) {
      const placeSlug = sanitizeFileName(
        restaurantJsonLd?.name || uiFields.name || `place-${index}`
      );
      const placePhotoDir = path.join(photosDirPath, `${String(index).padStart(5, "0")}-${placeSlug}`);
      await ensureDir(placePhotoDir);
      for (let i = 0; i < photoUrls.length; i += 1) {
        const extension = photoUrls[i].includes(".png") ? "png" : "jpg";
        const fileName = `${String(i + 1).padStart(3, "0")}.${extension}`;
        const fullPath = path.join(placePhotoDir, fileName);
        try {
          await downloadPhoto(photoUrls[i], fullPath);
          localPhotoPaths.push(path.relative(process.cwd(), fullPath).replaceAll("\\", "/"));
        } catch (error) {
          console.warn(`[warn] Photo download failed: ${photoUrls[i]} (${error.message})`);
        }
      }
    }

    return buildRow(index, placeUrl, restaurantJsonLd, uiFields, photoUrls, localPhotoPaths);
  } catch (error) {
    return {
      id: index,
      scrapedAtUtc: new Date().toISOString(),
      source: "google_maps_ui",
      name: "",
      category: "",
      rating: "",
      reviewCount: "",
      priceLevel: "",
      status: "",
      address: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      phone: "",
      website: "",
      latitude: "",
      longitude: "",
      placeUrl,
      photoCount: 0,
      photoUrls: "",
      localPhotos: "",
      error: error.message,
    };
  } finally {
    await page.close();
  }
}

async function loadConfig(configPath) {
  const text = await fs.readFile(configPath, "utf8");
  return normalizeConfig(JSON.parse(text));
}

function resolveExistingPath(candidates) {
  for (const candidate of candidates) {
    const absolute = path.resolve(process.cwd(), candidate);
    if (fsSync.existsSync(absolute)) {
      return absolute;
    }
  }
  return "";
}

async function main() {
  const args = parseArgs(process.argv);

  const inputConfigPath = args.config
    ? path.resolve(process.cwd(), String(args.config))
    : resolveExistingPath(DEFAULT_CONFIG_CANDIDATES);
  const fallbackConfigPath = resolveExistingPath(FALLBACK_CONFIG_CANDIDATES);

  const configPath =
    inputConfigPath && fsSync.existsSync(inputConfigPath)
      ? inputConfigPath
      : fallbackConfigPath;
  if (!fsSync.existsSync(configPath)) {
    throw new Error(
      `No config found. Looked for: ${[
        ...DEFAULT_CONFIG_CANDIDATES,
        ...FALLBACK_CONFIG_CANDIDATES,
      ].join(", ")}`
    );
  }

  const config = await loadConfig(configPath);
  const configDirPath = path.dirname(configPath);
  const outputDirPath = path.isAbsolute(config.outputDir)
    ? config.outputDir
    : path.resolve(configDirPath, config.outputDir);
  const photosDirPath = path.join(outputDirPath, "photos");

  await ensureDir(outputDirPath);
  if (config.downloadPhotos) {
    await ensureDir(photosDirPath);
  }

  const points = buildGridPoints(config.aoi, config.grid);
  if (points.length === 0) {
    throw new Error("AOI grid has no points. Check min/max bounds and step size.");
  }

  console.log(`[info] Using config: ${configPath}`);
  console.log(`[info] Generated ${points.length} AOI scan points.`);

  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMoMs,
  });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Vancouver",
  });

  const discoveryPage = await context.newPage();
  const allPlaceUrls = new Set();

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    console.log(
      `[info] Discovery ${i + 1}/${points.length}: ${point.lat}, ${point.lng}`
    );
    try {
      const urls = await discoverPlaceUrls(discoveryPage, config, point);
      for (const url of urls) {
        allPlaceUrls.add(url);
      }
      console.log(
        `[info] Cell captured ${urls.length} places (${allPlaceUrls.size} total unique).`
      );
    } catch (error) {
      console.warn(`[warn] Discovery failed at ${point.lat}, ${point.lng}: ${error.message}`);
    }
  }
  await discoveryPage.close();

  const uniqueUrls = [...allPlaceUrls];
  await fs.writeFile(
    path.join(outputDirPath, "discovered_place_urls.txt"),
    uniqueUrls.join("\n"),
    "utf8"
  );
  console.log(`[info] Total unique places: ${uniqueUrls.length}`);

  const rows = [];
  for (let i = 0; i < uniqueUrls.length; i += 1) {
    console.log(`[info] Extracting ${i + 1}/${uniqueUrls.length}`);
    const row = await extractPlaceData(
      context,
      uniqueUrls[i],
      config,
      i + 1,
      photosDirPath
    );
    rows.push(row);
    if ((i + 1) % 20 === 0) {
      await fs.writeFile(
        path.join(outputDirPath, "restaurants.partial.json"),
        JSON.stringify(rows, null, 2),
        "utf8"
      );
    }
  }

  await browser.close();

  const headers = [
    "id",
    "scrapedAtUtc",
    "source",
    "name",
    "category",
    "rating",
    "reviewCount",
    "priceLevel",
    "status",
    "address",
    "city",
    "region",
    "postalCode",
    "country",
    "phone",
    "website",
    "latitude",
    "longitude",
    "placeUrl",
    "photoCount",
    "photoUrls",
    "localPhotos",
    "error",
  ];

  await fs.writeFile(
    path.join(outputDirPath, "restaurants.json"),
    JSON.stringify(rows, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(outputDirPath, "restaurants.csv"),
    toCsv(rows, headers),
    "utf8"
  );

  console.log(`[info] Export complete: ${path.join(outputDirPath, "restaurants.csv")}`);
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exitCode = 1;
});
