import { existsSync, readFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = file => readFileSync(new URL(file, root), "utf8");
const fail = message => { throw new Error(`Validation failed: ${message}`); };

const data = JSON.parse(read("data/hinnat.json"));
const html = read("index.html");
const requiredFiles = ["assets/favicon.svg", "assets/kotivaihto-mark.svg", "assets/kotivaihto-share.png", "site.webmanifest", "robots.txt", "sitemap.xml"];
const requiredMarkup = [
  'lang="fi"',
  'meta property="og:image"',
  'link rel="canonical"',
  'src="assets/kotivaihto-mark.svg"',
  'id="privacy-dialog"',
  'id="offer-summary-body"',
  'id="lead-dialog"',
  'data-lead-type="finance"',
  'data-lead-type="valuation"',
  'id="market-scenario-values"',
  'data-market-scenario="-5"',
  'data-ad-placement="mid-page"'
];

if (!data?.metadata || !Array.isArray(data.postalAreas) || !data.municipalities) fail("data/hinnat.json does not match the expected top-level contract.");
if (!/^\d{4}Q[1-4]$/.test(data.metadata.postalPriceObservation || "")) fail("postalPriceObservation must use YYYYQn format.");
if (!/^\d{4}Q[1-4]$/.test(data.metadata.municipalityIndexObservation || "")) fail("municipalityIndexObservation must use YYYYQn format.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(data.metadata.generatedAt || "")) fail("generatedAt must use YYYY-MM-DD format.");

const postcodes = new Set();
for (const area of data.postalAreas) {
  if (!/^\d{5}$/.test(area.postcode || "")) fail(`invalid postcode: ${area.postcode}`);
  if (postcodes.has(area.postcode)) fail(`duplicate postcode: ${area.postcode}`);
  postcodes.add(area.postcode);
  if (area.suppressed && area.pricePerSqm !== null) fail(`${area.postcode} is suppressed but exposes a price.`);
  if (!area.suppressed && !(Number.isFinite(area.pricePerSqm) && area.pricePerSqm > 0)) fail(`${area.postcode} needs a positive price or suppression.`);
  if (area.municipalityCode && !data.municipalities[area.municipality]) fail(`${area.postcode} has an index code but no matching municipality-index entry.`);
}

for (const [name, municipality] of Object.entries(data.municipalities)) {
  if (!Array.isArray(municipality.series) || !municipality.series.length) fail(`${name} has no index series.`);
  if (municipality.series.some(point => !/^\d{4}Q[1-4]$/.test(point.period || "") || !Number.isFinite(point.index))) fail(`${name} has an invalid index point.`);
}

for (const file of requiredFiles) if (!existsSync(new URL(file, root))) fail(`missing launch asset: ${file}`);
for (const markup of requiredMarkup) if (!html.includes(markup)) fail(`missing required markup: ${markup}`);
if (!html.includes("data/hinnat.json")) fail("index.html must load the price-data contract.");
if (/forecast|ennuste/i.test(read("data/hinnat.json").replace(/"forecast"\s*:\s*"Tiedosto ja käyttöliittymä eivät sisällä ennusteita\."/, ""))) fail("data file contains an unexpected forecast reference.");

console.log(`Validated ${data.postalAreas.length} postal areas, ${Object.keys(data.municipalities).length} municipalities, and launch assets.`);
