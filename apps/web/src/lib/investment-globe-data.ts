import { countryLocation, type GeographyItem } from "@/lib/investment-geography";
import centroids from "@/data/country-centroids.json";

export const globeRegions = [
  { id: "global", label: "Global", lat: 22, lng: -35 },
  { id: "americas", label: "Americas", lat: 22, lng: -90 },
  { id: "europe", label: "Europe", lat: 48, lng: 15 },
  { id: "asia-pacific", label: "Asia-Pacific", lat: 18, lng: 115 },
  { id: "africa-middle-east", label: "Africa & Middle East", lat: 12, lng: 30 },
] as const;
export type GlobeRegion = (typeof globeRegions)[number]["id"];

// Geographic groupings for navigation only, never a claim about economic exposure.
const regionCodes: Record<Exclude<GlobeRegion, "global">, Set<string>> = {
  americas: new Set("AG AI AR AW BB BL BM BO BQ BR BS BZ CA CL CO CR CU CW DM DO EC FK GD GF GL GP GS GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PM PR PY SR SV SX TC TT US UY VC VE VG VI".split(" ")),
  europe: new Set("AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK".split(" ")),
  "asia-pacific": new Set("AF AS AU BD BN BT CC CK CN CX FJ FM GU HK HM ID IN IO JP KG KH KI KP KR KZ LA LK MH MM MN MO MP MV MY NC NF NP NR NU NZ PF PG PH PK PN PW SB SG TH TJ TK TL TM TO TV TW UM UZ VN VU WF WS".split(" ")),
  "africa-middle-east": new Set("AE AO BF BH BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW IL IQ IR JO KE KM KW LB LR LS LY MA MG ML MR MU MW MZ NA NE NG OM PS QA RE RW SA SC SD SH SL SN SO SS ST SY SZ TD TF TG TN TZ UG YE YT ZA ZM ZW".split(" ")),
};

export function countryRegion(code?: string): GlobeRegion | undefined {
  const normalized = code?.trim().toUpperCase();
  const canonical = normalized === "UK" ? "GB" : normalized === "EL" ? "GR" : normalized;
  if (!canonical) return undefined;
  return (Object.entries(regionCodes) as Array<[Exclude<GlobeRegion, "global">, Set<string>]>).find(([, codes]) => codes.has(canonical))?.[0];
}

const mapAliases: Record<string, string> = {
  "W. Sahara": "EH", "United States of America": "US", "Dem. Rep. Congo": "CD",
  "Dominican Rep.": "DO", Russia: "RU", "Falkland Is.": "FK", "Fr. S. Antarctic Lands": "TF",
  "Central African Rep.": "CF", "Eq. Guinea": "GQ", Palestine: "PS", "Solomon Is.": "SB",
  Taiwan: "TW", Brunei: "BN", Czechia: "CZ", "Bosnia and Herz.": "BA", Macedonia: "MK", Kosovo: "XK", "S. Sudan": "SS",
};
const countryByName = new Map(Object.entries(centroids).map(([code, country]) => [country.name.toLowerCase(), code]));
export function countryCodeForMap(name: string) {
  return mapAliases[name] ?? countryByName.get(name.toLowerCase());
}

export type GeographyGroup = { id: string; name: string; countryCode?: string; items: GeographyItem[]; value: number };
export function groupGeography(items: GeographyItem[]): GeographyGroup[] {
  const groups = new Map<string, GeographyGroup>();
  for (const item of items) {
    const location = item.scope === "country" ? countryLocation(item.countryCode) : undefined;
    const raw = item.countryCode?.trim().toUpperCase();
    const code = raw === "UK" ? "GB" : raw === "EL" ? "GR" : raw;
    const id = location ? code! : item.scope === "global" ? "global" : "unattributed";
    const group = groups.get(id) ?? { id, name: location?.name ?? (id === "global" ? "Global / cross-border" : "Country not supplied"), countryCode: location ? code : undefined, items: [], value: 0 };
    group.items.push(item);
    group.value += item.value ?? 0;
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => b.value - a.value || b.items.length - a.items.length || a.name.localeCompare(b.name));
}

export function globeAnnotationItems(items: GeographyItem[], selectedId?: string) {
  const selected = items.find((item) => item.id === selectedId);
  return (selected ? [selected, ...items.filter((item) => item.id !== selectedId)] : items).slice(0, 3);
}
