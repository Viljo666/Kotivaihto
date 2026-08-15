import { writeFileSync } from "node:fs";

const postalEndpoint = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/ashi/13mt.px";
const indexEndpoint = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/ashi/15is.px";
const postalPriceCode = "keskihinta_aritm_nw";
const salesCode = "lkm_julk20";
const indexCode = "ashivq_indeksi_2025";

async function getJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
  return response.json();
}

const postQuery = (endpoint, query) => getJson(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query, response: { format: "json-stat2" } })
});

const variable = (metadata, code) => {
  const value = metadata.variables.find(item => item.code === code);
  if (!value) throw new Error(`Missing variable ${code}.`);
  return value;
};

const item = (code, values) => ({ code, selection: { filter: "item", values } });
const valueAt = (dataset, index) => Array.isArray(dataset.value) ? dataset.value[index] : dataset.value?.[index] ?? null;
const cleanQuarter = value => String(value).replace(/\*+$/, "");

function parsePostalLabel(postcode, label) {
  const match = String(label).match(/^\d{5}\s+(.*?)\s+\((.+)\)$/);
  if (!match) return { area: String(label).replace(/^\d{5}\s+/, ""), municipality: "Tuntematon" };
  return { area: match[1].replace(/ - /g, " – "), municipality: match[2] };
}

function aliasesForIndexRegion(code, label) {
  const name = String(label).replace(/^\d{3}\s+/, "").trim();
  if (code === "049") return ["Espoo", "Kauniainen"];
  return [name];
}

async function main() {
  const [postalMetadata, indexMetadata] = await Promise.all([getJson(postalEndpoint), getJson(indexEndpoint)]);
  const postalTime = variable(postalMetadata, "timeperiod_q");
  const postalArea = variable(postalMetadata, "postinumeroalue_4_20220101");
  const indexTime = variable(indexMetadata, "timeperiod_q");
  const indexRegion = variable(indexMetadata, "alue_43_20260625");
  const postalObservation = postalTime.values.at(-1);
  const indexPeriods = indexTime.values;
  const baseRegions = indexRegion.values.filter(code => /^\d{3}$/.test(code));

  const [postalDataset, indexDataset] = await Promise.all([
    postQuery(postalEndpoint, [
      item(postalTime.code, [postalObservation]),
      item(postalArea.code, postalArea.values),
      item("talotyyppi_6_20131021", ["2"]),
      item("contentscode", [postalPriceCode, salesCode])
    ]),
    postQuery(indexEndpoint, [
      item(indexRegion.code, baseRegions),
      item("talotyyppi_5_20111209", ["3"]),
      item("huoneluku_1_20111212", ["00"]),
      item(indexTime.code, indexPeriods),
      item("contentscode", [indexCode])
    ])
  ]);

  const indexLabels = indexRegion.valueTexts;
  const indexByMunicipality = new Map();
  const municipalities = {};
  const indexSeriesLength = indexPeriods.length;
  baseRegions.forEach((code, regionPosition) => {
    const label = indexLabels[indexRegion.values.indexOf(code)];
    const series = indexPeriods.map((period, periodPosition) => ({
      period: cleanQuarter(period),
      index: valueAt(indexDataset, regionPosition * indexSeriesLength + periodPosition)
    })).filter(point => Number.isFinite(point.index));
    if (!series.length) return;
    aliasesForIndexRegion(code, label).forEach(name => {
      municipalities[name] = { code, indexBase: "2025=100", series };
      indexByMunicipality.set(name, code);
    });
  });

  const postalLabels = postalArea.valueTexts;
  const postalAreas = postalArea.values.map((postcode, areaPosition) => {
    const { area, municipality } = parsePostalLabel(postcode, postalLabels[areaPosition]);
    const price = valueAt(postalDataset, areaPosition * 2);
    const sales = valueAt(postalDataset, areaPosition * 2 + 1);
    const suppressed = !Number.isFinite(price);
    return {
      postcode,
      area,
      municipality,
      municipalityCode: indexByMunicipality.get(municipality) || null,
      category: "Kerrostalokaksiot",
      observation: cleanQuarter(postalObservation),
      pricePerSqm: suppressed ? null : price,
      sales: Number.isFinite(sales) ? sales : 0,
      suppressed,
      ...(suppressed ? { suppressionReason: "Neliöhinta on salattu Tilastokeskuksen aineistossa." } : {})
    };
  });

  const payload = {
    contractVersion: "1.1.0",
    metadata: {
      title: "Kotivaihto – hintatasot ja alueindeksit",
      generatedAt: new Date().toISOString().slice(0, 10),
      postalPriceObservation: cleanQuarter(postalObservation),
      municipalityIndexObservation: cleanQuarter(indexPeriods.at(-1)),
      source: {
        publisher: "Tilastokeskus",
        postalPriceTable: "13mt – Vanhojen osakeasuntojen neliöhinnat ja kauppojen lukumäärät postinumeroalueittain, neljännesvuosittain",
        postalPriceUrl: "https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__ashi/13mt.px/",
        municipalityIndexTable: "15is – Vanhojen osakeasuntojen hintaindeksi, neliöhinnat ja kauppamäärät, neljännesvuosittain",
        municipalityIndexUrl: "https://pxdata.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__ashi/15is.px/"
      },
      coverageNotice: "Postinumeroaineisto sisältää Tilastokeskuksen lähdetaulukon saatavilla olevat postinumeroalueet. Salattu neliöhinta näytetään salattuna. Kuntaindeksi näytetään vain niille kunnille tai kaupunkialueille, joille lähdetaulukossa on julkaistu indeksisarja.",
      methodology: {
        postalPrice: "Postinumeroalueen neliöhinta on julkaistu aritmeettinen keskihinta kerrostalokaksioille. Se kuvaa alueiden välistä hintatasoa, ei ajallista hintamuutosta.",
        timeChange: "Ajallinen muutos näytetään vain kunta-/aluekohtaisesta laatuvakioidusta hintaindeksistä (2025=100). Neliöhintaa ei käytetä hintamuutoksen laskentaan.",
        suppression: "Jos Tilastokeskus on salannut neliöhinnan, arvo säilytetään puuttuvana. Sovellus ei johda, interpoloi tai korvaa salattua lukua.",
        forecast: "Tiedosto ja käyttöliittymä eivät sisällä ennusteita."
      }
    },
    postalAreas,
    municipalities
  };

  writeFileSync(new URL("../data/hinnat.json", import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${postalAreas.length} postal areas and ${Object.keys(municipalities).length} municipality-index entries. Postal observation: ${payload.metadata.postalPriceObservation}; index observation: ${payload.metadata.municipalityIndexObservation}.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
