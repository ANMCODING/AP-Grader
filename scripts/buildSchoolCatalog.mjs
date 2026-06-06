#!/usr/bin/env node
/**
 * Parse AP school list text → public/schools/catalog.json
 * Usage: node scripts/buildSchoolCatalog.mjs [source.txt]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const US_STATE_NAMES = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

const INTL_COUNTRY_CODES = {
  KENYA: "KE",
  NIGERIA: "NG",
  RWANDA: "RW",
  SENEGAL: "SN",
  "SOUTH AFRICA": "ZA",
  CHINA: "CN",
  "HONG KONG": "HK",
  INDONESIA: "ID",
  JAPAN: "JP",
  "KOREA, (SOUTH)": "KR",
  MYANMAR: "MM",
  PHILIPPINES: "PH",
  SINGAPORE: "SG",
  TAIWAN: "TW",
  THAILAND: "TH",
  ALBANIA: "AL",
  ARMENIA: "AM",
  AZERBAIJAN: "AZ",
  BELARUS: "BY",
  "BOSNIA AND HERZEGOVINA": "BA",
  FRANCE: "FR",
  GEORGIA: "GE",
  GERMANY: "DE",
  GREECE: "GR",
  MALTA: "MT",
  SLOVAKIA: "SK",
  SPAIN: "ES",
  SWITZERLAND: "CH",
  MACEDONIA: "MK",
  TURKEY: "TR",
  UKRAINE: "UA",
  "UNITED KINGDOM": "GB",
  BERMUDA: "BM",
  BRAZIL: "BR",
  COLOMBIA: "CO",
  "DOMINICAN REPUBLIC": "DO",
  ECUADOR: "EC",
  GUATEMALA: "GT",
  HONDURAS: "HN",
  MEXICO: "MX",
  NICARAGUA: "NI",
  PANAMA: "PA",
  "TRINIDAD AND TOBAGO": "TT",
  EGYPT: "EG",
  ISRAEL: "IL",
  JORDAN: "JO",
  KUWAIT: "KW",
  MOROCCO: "MA",
  QATAR: "QA",
  "SAUDI ARABIA": "SA",
  "UNITED ARAB EMIRATES": "AE",
};

function normalizeLine(line) {
  return line.replace(/\u2013/g, "–").trim();
}

function isSchoolLine(line) {
  return / – /.test(line) && !line.endsWith(" Schools");
}

function parse(text) {
  const catalog = {};
  let usCode = null;
  let intlMode = null; // "CA" | "country-prefix"

  const add = (key, school) => {
    if (!catalog[key]) catalog[key] = [];
    if (!catalog[key].includes(school)) catalog[key].push(school);
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = normalizeLine(raw);
    if (!line) continue;

    if (line === "International Schools") continue;

    if (line === "Canadian Schools") {
      intlMode = "CA";
      usCode = null;
      continue;
    }

    const intlSection = line.match(
      /^(African \(Sub-Saharan\)|East Asian and Pacific|Europe and Eurasia|Latin America and the Caribbean|Middle East and North Africa) Schools$/,
    );
    if (intlSection) {
      intlMode = "country-prefix";
      usCode = null;
      continue;
    }

    const usHeader = line.match(/^(.+?) Schools$/i);
    if (usHeader) {
      const name = usHeader[1].trim().toLowerCase();
      const code = US_STATE_NAMES[name];
      if (code) {
        usCode = code;
        intlMode = null;
      }
      continue;
    }

    if (!isSchoolLine(line)) continue;

    if (usCode) {
      add(`US-${usCode}`, line);
      continue;
    }

    if (intlMode === "CA") {
      add("INTL-CA", line);
      continue;
    }

    if (intlMode === "country-prefix") {
      const idx = line.indexOf(" – ");
      const country = line.slice(0, idx).trim().toUpperCase();
      const code = INTL_COUNTRY_CODES[country];
      if (code) {
        add(`INTL-${code}`, line.slice(idx + 3).trim());
      } else {
        console.warn("Unknown country prefix:", country);
        add("INTL-OTHER", line);
      }
    }
  }

  for (const key of Object.keys(catalog)) {
    catalog[key].sort((a, b) => a.localeCompare(b));
  }

  return catalog;
}

const sourcePath = process.argv[2] ?? join(__dirname, "schools-source.txt");
const text = readFileSync(sourcePath, "utf8");
const catalog = parse(text);
const outPath = join(root, "public/schools/catalog.json");
writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n");

const total = Object.values(catalog).reduce((n, arr) => n + arr.length, 0);
console.log(`Wrote ${outPath}`);
console.log(`${Object.keys(catalog).length} regions, ${total} schools`);
