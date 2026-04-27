# leadsExtractor

Interactive Google Maps restaurant extractor with AOI drawing and one-click runs.

## Quick start

From `leadsExtractor/`:

```bash
npm install
npx playwright install chromium
cp config.example.json config.json
npm run web
```

Open:

`http://localhost:4311`

## How to use the web app

1. Draw a rectangle on the map for your AOI (Area of Interest).
2. Tune settings in the form (grid step, search term, photo capture, etc.).
3. Click `Start Extraction`.
4. Watch live status and logs in the dashboard.
5. Open output files after completion:
   - `output/restaurants.csv`
   - `output/restaurants.json`
   - `output/discovered_place_urls.txt`
   - optional `output/photos/` if `Download photos` is enabled

## Pipeline behavior

1. AOI bounds are converted to a lat/lng scan grid.
2. For each grid cell, Google Maps search is opened (default `restaurants`).
3. Place URLs are collected and globally deduplicated.
4. Each place page is visited to extract restaurant fields and photo URLs.
5. Results are exported to spreadsheet-ready CSV and JSON.

## CLI still available

You can still run direct extraction without the web app:

```bash
npm run extract
```

## Notes

- This is UI scraping, so selector updates may be needed if Google Maps changes its DOM.
- Use `headless: false` for debugging interactions or consent prompts.
- The web app writes your latest settings to `config.json` each time you run.

