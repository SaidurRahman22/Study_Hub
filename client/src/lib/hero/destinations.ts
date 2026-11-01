/**
 * The ten study destinations the hero cinematic flies to.
 *
 * This is the single source: HeroCinematic hands it to the scene through
 * `window.__HERO_CONFIG__.destinations`, and the page renders the same array
 * as the list a visitor gets without JavaScript or WebGL. Nothing re-types it.
 *
 * `landmark` must name a proxy the scene bundles; the keys below are all in
 * the scene's own LANDMARK_KEYS list. `order` drives the arc sequence.
 * `city` is the page's, not the scene's -- the scene reads only lat/lon and
 * drops any field outside its schema.
 */

/** A landmark proxy the scene can build. Only these ten are used here. */
export type HeroLandmark =
  | "opera-house"
  | "cn-tower"
  | "colosseum"
  | "clock-tower"
  | "korean-gate"
  | "big-ben"
  | "torii"
  | "dome-tower"
  | "cathedral"
  | "spire";

export interface HeroDestination {
  /** ISO 3166-1 alpha-2, shown on the globe pin. */
  code: string;
  /** Country name, as the destination card and the pin button say it. */
  label: string;
  /** The city the pin sits on -- page copy only; the scene uses lat/lon. */
  city: string;
  lat: number;
  lon: number;
  landmark: HeroLandmark;
  /** Intake months, in prose. */
  intake: string;
  href: string;
  /** Arc sequence, 1-based. */
  order: number;
  enabled: boolean;
}

export const HERO_DESTINATIONS: HeroDestination[] = [
  { code: "AU", label: "Australia",      city: "Sydney",     lat: -33.8688, lon: 151.2093, landmark: "opera-house", intake: "February and July",          href: "/destinations", order: 1,  enabled: true },
  { code: "CA", label: "Canada",         city: "Toronto",    lat:  43.6532, lon: -79.3832, landmark: "cn-tower",    intake: "January, May and September", href: "/destinations", order: 2,  enabled: true },
  { code: "IT", label: "Italy",          city: "Rome",       lat:  41.9028, lon:  12.4964, landmark: "colosseum",   intake: "September and February",     href: "/destinations", order: 3,  enabled: true },
  { code: "MT", label: "Malta",          city: "Valletta",   lat:  35.8989, lon:  14.5146, landmark: "clock-tower", intake: "October and February",       href: "/destinations", order: 4,  enabled: true },
  { code: "KR", label: "South Korea",    city: "Seoul",      lat:  37.5665, lon: 126.9780, landmark: "korean-gate", intake: "March and September",        href: "/destinations", order: 5,  enabled: true },
  { code: "GB", label: "United Kingdom", city: "London",     lat:  51.5072, lon:  -0.1276, landmark: "big-ben",     intake: "January and September",      href: "/destinations", order: 6,  enabled: true },
  { code: "JP", label: "Japan",          city: "Tokyo",      lat:  35.6762, lon: 139.6503, landmark: "torii",       intake: "April and October",          href: "/destinations", order: 7,  enabled: true },
  { code: "CY", label: "Cyprus",         city: "Nicosia",    lat:  35.1856, lon:  33.3823, landmark: "dome-tower",  intake: "September and January",      href: "/destinations", order: 8,  enabled: true },
  { code: "RU", label: "Russia",         city: "Moscow",     lat:  55.7558, lon:  37.6173, landmark: "cathedral",   intake: "September",                  href: "/destinations", order: 9,  enabled: true },
  { code: "DK", label: "Denmark",        city: "Copenhagen", lat:  55.6761, lon:  12.5683, landmark: "spire",       intake: "August and January",         href: "/destinations", order: 10, enabled: true },
];

/** Where every arc leaves from. */
export const HERO_ORIGIN = {
  label: "Tangail",
  lat: 24.2513,
  lon: 89.9167,
} as const;
