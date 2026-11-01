import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ====================================================================== *
 *  PORTED, NOT REWRITTEN                                                 *
 *                                                                        *
 *  The module script of hero.html (source lines 534-4295), moved into a  *
 *  mountable function. Everything inside is the original: the config     *
 *  schema and its three sources, the quality tiers, the Natural Earth    *
 *  crust, free rotation with inertia, click-to-identify, the arcs, the   *
 *  orbiting props, the capture/self-test paths, and destroy().           *
 *                                                                        *
 *  This is version ONE of the scene in cinematic.js: the same globe, but *
 *  interactive rather than a six-beat cinematic.                         *
 *                                                                        *
 *  What changed, and only this:                                          *
 *    - every document.getElementById(id) is now root.querySelector('#id')*
 *      against the container the caller passes in, so two instances on   *
 *      one page cannot find each other's nodes;                          *
 *    - GEO_URL points at the vendored copy under /public/hero;           *
 *    - the hero-panel.js dev sidecar and its loader are gone;            *
 *    - the idle-callback boot block is gone: React drives mounting;      *
 *    - videoOnlyReason() honours window.__HERO_FORCE_MOTION__, so the    *
 *      page's Play control can override the soft fallbacks;              *
 *    - document.title is left alone: it belongs to the host page;        *
 *    - destroy() is idempotent, removes its own window listeners and     *
 *      drops window.__hero only while that handle is still this one.     *
 *                                                                        *
 *  One lookup deliberately stays on document: the config endpoint meta   *
 *  tag, which lives in <head>.                                           *
 * ====================================================================== */

/**
 * Build and start the interactive globe inside `root`.
 * @param {HTMLElement} root container holding the scene DOM
 * @returns {Promise<object>} the scene's public api, including destroy()
 */
export async function mountInteractive(root) {

let destroyed = false;
const onWindowResize = () => { fitHeadline(); };
const onPageHide = () => { destroy(); };

/* ====================================================================== *
 *  HORIZON — study-abroad hero scene                                     *
 *                                                                        *
 *  Reading order:                                                        *
 *    1  config/schema      every field, its type, range and hot/cold     *
 *    2  config/defaults    source 3, the bundled fallback                *
 *    3  config/load        merge the three sources, validate per field   *
 *    4  TUNING             engine numbers, authored by whoever builds    *
 *    5  landmarks          registry: a key maps to a model, never a URL  *
 *    6  quality            capability probe and the three tiers          *
 *    7  renderer/scene     stage, lights, environment                    *
 *    8  materials          the two art lanes                             *
 *    9  globe              ocean, extruded continents, origin pin        *
 *   10  arcs               bezier tubes and the travelling pulse         *
 *   11  markers            instanced pins, landmarks, billboard labels   *
 *   12  documents          passport, boarding pass, cap, books, case     *
 *   13  particles          starfield and bokeh                           *
 *   14  aircraft           one plane, one arc at a time                  *
 *   15  character          optional student, off by default              *
 *   16  idle loop          the u-clock and every idle curve              *
 *   17  input              pointer, drag, raycast, keyboard, idle timer  *
 *   18  capture            deterministic ?capture=1                      *
 *   19  frame/resize       frameScene(aspect), ResizeObserver            *
 *   20  panel              dev side panel, ?panel=1, dynamic             *
 *   21  page               DOM the config also drives, boot, destroy     *
 * ====================================================================== */


/* ====================================================================== *
 *  1.  config/schema.js — the single shared contract                     *
 *                                                                        *
 *  The panel generates its controls from this, the loader validates      *
 *  against it, and the admin backend is meant to validate against the    *
 *  same file. Do not let the admin form become a second definition.      *
 *                                                                        *
 *  class: 'hot'  applied in place, no rebuild                            *
 *         'cold' rebuilds only the affected subsystem, debounced         *
 *         'boot' read once at boot; changing it needs a reload           *
 * ====================================================================== */

const LANDMARK_KEYS = [
  'big-ben', 'cn-tower', 'opera-house', 'liberty', 'brandenburg-gate',
  'petronas', 'torii', 'korean-gate', 'eiffel', 'duomo', 'generic-tower',
  // the second set, shared with the world skyline
  'pyramid', 'pagoda', 'colosseum', 'temple', 'windmill', 'clock-tower',
  'cathedral', 'bridge', 'skyline', 'stadium', 'obelisk', 'needle',
  'minaret', 'dome-tower', 'dome-minarets', 'arch-gate', 'podium-towers',
  'tower-round', 'spire'
];

const SCHEMA = {
  'brand.name':      { type: 'string', class: 'hot',  control: 'text',  label: 'Agency name',
                       note: 'Shown in the wordmark and the footer' },
  'brand.headline':  { type: 'string', class: 'hot',  control: 'text',  label: 'Headline',
                       note: 'DOM, over the canvas. Auto-fits to two lines' },
  'brand.subhead':   { type: 'string', class: 'hot',  control: 'text',  label: 'Subhead' },

  'theme.primary':   { type: 'hex',    class: 'hot',  control: 'color', label: 'Primary — land and arcs', reexport: true },
  'theme.accent':    { type: 'hex',    class: 'hot',  control: 'color', label: 'Accent — origin, active, pulse', reexport: true },
  'theme.neutral':   { type: 'hex',    class: 'hot',  control: 'color', label: 'Neutral — background and paper', reexport: true },
  'theme.lane':      { type: 'enum',   class: 'cold', control: 'radio', label: 'Art lane',
                       values: ['clay', 'lowpoly'], reexport: true },

  'origin.label':    { type: 'string', class: 'cold', control: 'text',  label: 'Origin city', reexport: true },
  'origin.lat':      { type: 'number', class: 'cold', control: 'number', min: -90,  max: 90,  label: 'Origin latitude',  reexport: true },
  'origin.lon':      { type: 'number', class: 'cold', control: 'number', min: -180, max: 180, label: 'Origin longitude', reexport: true },

  'destinations':    { type: 'array',  class: 'cold', control: 'destinations', label: 'Destinations',
                       min: 1, max: 12, reexport: true,
                       item: {
                         code:     { type: 'string' },
                         label:    { type: 'string' },
                         lat:      { type: 'number', min: -90,  max: 90 },
                         lon:      { type: 'number', min: -180, max: 180 },
                         landmark: { type: 'enum',   values: LANDMARK_KEYS },
                         intake:   { type: 'string' },
                         href:     { type: 'string' },
                         order:    { type: 'number', min: 1, max: 99 },
                         enabled:  { type: 'boolean' }
                       } },

  'cta.eventName':   { type: 'string', class: 'hot',  control: 'text',  label: 'Click event name' },
  'cta.payloadKey':  { type: 'enum',   class: 'hot',  control: 'radio', label: 'Payload key', values: ['code', 'label', 'href'] },

  'motion.idleDelaySeconds': { type: 'number', class: 'hot', control: 'range', min: 0.5, max: 12,  step: 0.1, label: 'Idle delay, s' },
  'motion.loopSeconds':      { type: 'number', class: 'hot', control: 'range', min: 2,   max: 12,  step: 0.5, label: 'Loop length, s',
                               note: 'Staff only — changing it invalidates the exported video', reexport: true },
  'motion.parallaxStrength': { type: 'number', class: 'hot', control: 'range', min: 0,   max: 2,   step: 0.05, label: 'Parallax strength',
                               note: 'Scales every tuning value; it does not replace them' },

  'quality.forceTier':       { type: 'enum',    class: 'hot',  control: 'radio', label: 'Force tier',
                               values: ['auto', 'high', 'medium', 'low'], note: 'Staff only' },
  'quality.mobileVideoOnly': { type: 'boolean', class: 'boot', control: 'check', label: 'Skip the canvas on small screens', note: 'Staff only' },
  'quality.mobileBreakpoint':{ type: 'number',  class: 'boot', control: 'number', min: 320, max: 1400, label: 'Breakpoint, px', note: 'Staff only' },
  'quality.character':       { type: 'boolean', class: 'cold', control: 'check', label: 'Student figure',
                               note: 'High tier only; the most expensive thing in the scene' },

  'media.posterUrl':       { type: 'string', class: 'boot', control: 'text', label: 'Poster URL' },
  'media.mp4Url':          { type: 'string', class: 'boot', control: 'text', label: 'MP4 URL' },
  'media.webmUrl':         { type: 'string', class: 'boot', control: 'text', label: 'WebM URL' },
  'media.verticalMp4Url':  { type: 'string', class: 'boot', control: 'text', label: 'Vertical MP4 URL' }
};

/* Which fields invalidate an exported video when they change. Part 3's
 * "freeze and warn" approach: the panel shows a banner until someone
 * re-runs the export. */
const REEXPORT_FIELDS = Object.entries(SCHEMA)
  .filter(([, f]) => f.reexport).map(([k]) => k);

/* ====================================================================== *
 *  2.  config/defaults.js — source 3, always present, last resort        *
 * ====================================================================== */

const DEFAULTS = {
  brand: {
    name: 'Horizon Education Consultancy',
    headline: 'Your seat at a global university starts here',
    subhead: 'Counselling, applications and visa filing, start to finish'
  },
  theme: { primary: '#006A4E', accent: '#F42A41', neutral: '#F4F1EA', lane: 'clay' },
  origin: { label: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  destinations: [
    { code: 'GB', label: 'United Kingdom', lat: 51.5072, lon:   -0.1276, landmark: 'big-ben',          intake: 'Jan, Sep',      href: '/destinations/uk',          order: 1, enabled: true },
    { code: 'CA', label: 'Canada',         lat: 43.6532, lon:  -79.3832, landmark: 'cn-tower',         intake: 'Jan, May, Sep', href: '/destinations/canada',      order: 2, enabled: true },
    { code: 'AU', label: 'Australia',      lat: -33.8688, lon: 151.2093, landmark: 'opera-house',      intake: 'Feb, Jul',      href: '/destinations/australia',   order: 3, enabled: true },
    { code: 'US', label: 'United States',  lat: 40.7128, lon:  -74.0060, landmark: 'liberty',          intake: 'Jan, Aug',      href: '/destinations/usa',         order: 4, enabled: true },
    { code: 'DE', label: 'Germany',        lat: 52.5200, lon:   13.4050, landmark: 'brandenburg-gate', intake: 'Apr, Oct',      href: '/destinations/germany',     order: 5, enabled: true },
    { code: 'MY', label: 'Malaysia',       lat:  3.1390, lon:  101.6869, landmark: 'petronas',         intake: 'Feb, Sep',      href: '/destinations/malaysia',    order: 6, enabled: true },
    { code: 'JP', label: 'Japan',          lat: 35.6762, lon:  139.6503, landmark: 'torii',            intake: 'Apr, Oct',      href: '/destinations/japan',       order: 7, enabled: true },
    { code: 'KR', label: 'South Korea',    lat: 37.5665, lon:  126.9780, landmark: 'korean-gate',      intake: 'Mar, Sep',      href: '/destinations/south-korea', order: 8, enabled: true }
  ],
  cta:     { eventName: 'destination:select', payloadKey: 'code' },
  motion:  { idleDelaySeconds: 3.5, loopSeconds: 5, parallaxStrength: 1 },
  quality: { forceTier: 'auto', mobileVideoOnly: true, mobileBreakpoint: 768, character: false },
  media:   { posterUrl: '', mp4Url: '', webmUrl: '', verticalMp4Url: '' }
};

/* config/example-alt.json — a different brand and destination set, to
 * show that nothing is hard-coded. Load it from the panel. */
const EXAMPLE_ALT = {
  brand: {
    name: 'Meridian Study Group',
    headline: 'Nairobi to campus, filed properly',
    subhead: 'Course selection, funding files and visa submission for East African students'
  },
  theme: { primary: '#1B3A6B', accent: '#E07A1F', neutral: '#F6F4F0', lane: 'lowpoly' },
  origin: { label: 'Nairobi', lat: -1.2921, lon: 36.8219 },
  destinations: [
    { code: 'GB', label: 'United Kingdom', lat: 51.5072, lon:  -0.1276, landmark: 'big-ben',     intake: 'Jan, Sep', href: '#', order: 1, enabled: true },
    { code: 'FR', label: 'France',         lat: 48.8566, lon:   2.3522, landmark: 'eiffel',      intake: 'Sep',      href: '#', order: 2, enabled: true },
    { code: 'IT', label: 'Italy',          lat: 45.4642, lon:   9.1900, landmark: 'duomo',       intake: 'Sep, Feb', href: '#', order: 3, enabled: true },
    { code: 'CA', label: 'Canada',         lat: 43.6532, lon: -79.3832, landmark: 'cn-tower',    intake: 'Jan, Sep', href: '#', order: 4, enabled: true },
    { code: 'AE', label: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, landmark: 'generic-tower', intake: 'Sep, Jan', href: '#', order: 5, enabled: true },
    { code: 'ZA', label: 'South Africa',   lat: -33.9249, lon: 18.4241, landmark: 'generic-tower', intake: 'Feb, Jul', href: '#', order: 6, enabled: true }
  ],
  cta:     { eventName: 'destination:select', payloadKey: 'code' },
  motion:  { idleDelaySeconds: 3, loopSeconds: 5, parallaxStrength: 0.8 },
  quality: { forceTier: 'auto', mobileVideoOnly: true, mobileBreakpoint: 768, character: false },
  media:   { posterUrl: '', mp4Url: '', webmUrl: '', verticalMp4Url: '' }
};

/* ====================================================================== *
 *  3.  config/load.js — merge the three sources, validate per field      *
 *                                                                        *
 *  Priority: window.__HERO_CONFIG__ (admin, server-injected)             *
 *            GET /api/hero-config   (decoupled CMS or staging)           *
 *            DEFAULTS               (bundled)                            *
 *                                                                        *
 *  Validation is per field, never per object. One bad admin value falls  *
 *  back to the default for that field alone, logs a warning naming it,   *
 *  and the hero still renders.                                           *
 * ====================================================================== */

const warnings = [];
function warn(path, got, why) {
  const msg = `[heroConfig] ${path}: ${why} (got ${JSON.stringify(got)}) — using the default`;
  warnings.push(msg);
  console.warn(msg);
}

const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim());
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, path, v) => {
  const k = path.split('.'); const last = k.pop();
  let t = o; for (const p of k) t = (t[p] ??= {});
  t[last] = v; return o;
};

function validateField(path, value, field, fallback) {
  if (value === undefined) return fallback;
  switch (field.type) {
    case 'hex':
      if (!isHex(value)) { warn(path, value, 'not a 6-digit hex colour'); return fallback; }
      return value.trim().toLowerCase();
    case 'string':
      if (typeof value !== 'string') { warn(path, value, 'not a string'); return fallback; }
      return value;
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) { warn(path, value, 'not a finite number'); return fallback; }
      if (field.min !== undefined && n < field.min) { warn(path, value, `below the minimum ${field.min}`); return fallback; }
      if (field.max !== undefined && n > field.max) { warn(path, value, `above the maximum ${field.max}`); return fallback; }
      return n;
    }
    case 'boolean':
      if (typeof value !== 'boolean') { warn(path, value, 'not a boolean'); return fallback; }
      return value;
    case 'enum':
      if (!field.values.includes(value)) { warn(path, value, `not one of ${field.values.join(', ')}`); return fallback; }
      return value;
    default:
      return value;
  }
}

function validateDestinations(list, field, fallback) {
  if (list === undefined) return fallback;
  if (!Array.isArray(list)) { warn('destinations', list, 'not an array'); return fallback; }
  const out = [];
  list.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') { warn(`destinations[${i}]`, raw, 'not an object'); return; }
    const d = {};
    let fatal = false;
    for (const [key, spec] of Object.entries(field.item)) {
      const p = `destinations[${i}].${key}`;
      const def = { code: '', label: '', lat: null, lon: null, landmark: 'generic-tower',
                    intake: '', href: '#', order: i + 1, enabled: true }[key];
      const v = validateField(p, raw[key], spec, def);
      // Coordinates have no sensible default; a destination without them
      // cannot be placed, so that one entry is dropped rather than the list.
      if ((key === 'lat' || key === 'lon') && (v === null || raw[key] === undefined)) {
        warn(p, raw[key], 'missing — this destination is dropped');
        fatal = true;
      }
      d[key] = v;
    }
    if (!fatal) {
      if (!d.label) d.label = d.code || `Destination ${i + 1}`;
      out.push(d);
    }
  });
  if (!out.length) { warn('destinations', list, 'no usable entries'); return fallback; }
  if (out.length > field.max) { warn('destinations', out.length, `more than ${field.max}; the extras are dropped`); out.length = field.max; }
  return out.sort((a, b) => a.order - b.order);
}

function validate(raw) {
  const out = structuredClone(DEFAULTS);
  for (const [path, field] of Object.entries(SCHEMA)) {
    if (field.control === 'destinations') {
      out.destinations = validateDestinations(raw.destinations, field, DEFAULTS.destinations);
    } else {
      set(out, path, validateField(path, get(raw, path), field, get(DEFAULTS, path)));
    }
  }
  return out;
}

const deepMerge = (a, b) => {
  if (!b || typeof b !== 'object') return a;
  const out = Array.isArray(a) ? a.slice() : { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object')
      ? deepMerge(out[k], v) : v;
  }
  return out;
};

const LS_KEY = 'horizon.hero.overrides';
const QS = new URLSearchParams(location.search);
const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
const IS_DEV = QS.has('panel') || DEV_HOSTS.includes(location.hostname) || location.protocol === 'file:';

async function loadConfig() {
  let merged = {};

  // source 3 is the base; 2 and 1 layer over it
  if (window.__HERO_CONFIG__) {
    merged = deepMerge(merged, window.__HERO_CONFIG__);
  } else {
    // Declared with <meta name="hero-config-endpoint" content="/api/hero-config">.
    // Without it there is no CMS behind this page and asking would only log
    // a 404 on every load.
    const endpoint = document.querySelector('meta[name="hero-config-endpoint"]')?.content;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, { headers: { accept: 'application/json' } });
        if (res.ok) merged = deepMerge(merged, await res.json());
        else console.warn(`[heroConfig] ${endpoint} returned ${res.status}; using the bundled defaults`);
      } catch (err) { console.warn(`[heroConfig] ${endpoint} unreachable: ${err.message}`); }
    }
  }

  // dev-only local overrides, so a panel session survives a reload
  if (IS_DEV) {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) merged = deepMerge(merged, JSON.parse(saved));
    } catch { /* private mode, cleared storage: ignore */ }
  }

  return validate(merged);
}

/* ====================================================================== *
 *  4.  TUNING.js — the engine numbers                                    *
 *                                                                        *
 *  Authored by whoever builds the scene, never by a marketing admin.     *
 *  heroConfig and TUNING are never merged: anything an admin should not  *
 *  be able to break lives here. motion.parallaxStrength is the one       *
 *  deliberate bridge — it scales these values rather than replacing      *
 *  them.                                                                 *
 * ====================================================================== */

const TUNING = {
  camera: {
    fovDesktop: 35,
    fovMobile: 45,
    distance: 7.4,           // base dolly; frameScene() adjusts it per aspect
    targetY: 0.18,           // look a little above the globe centre, so its
                             // horizon settles around the lower third
    tweenMs: 900,            // ease-in-out cubic on a pin click
    ease: 0.12               // per-frame k for the neutral-pose return
  },

  parallax: {
    yawDeg: 4,               // small is correct; a big swing reads as cheap
    pitchDeg: 2.5,
    ease: 0.055,
    layers: { stars: 0.15, globe: 0.4, documents: 0.8, bokeh: 1.2 },
    cursorLight: { intensity: 7.5, distance: 11, z: 3.4, ease: 0.09 }
  },

  hover: {
    everyNFrames: 2,         // never raycast the whole graph, never every frame
    throttleMs: 50,
    pinScale: 1.25,
    springK: 0.16,
    enterRadius: 1.0,        // hysteresis: a pin at the edge of the ray
    exitRadius: 1.9,         //   must travel further to let go than to catch
    arcBoostPulse: 2.1,
    documentLift: 0.16,
    documentSpin: 0.35,
    deflectionDeg: 12
  },

  drag: {
    pxThreshold: 6,
    msThreshold: 250,
    sensitivity: 0.0042,     // horizontal: longitude
    pitchSensitivity: 0.0036, // vertical: latitude, mouse and pen only
    inertiaDecay: 0.94,      // per frame at 60fps, normalised below
    stopBelow: 0.00022,
    /* Far enough to look down on either pole and no further. Past 90 the
     * world is upside down, which is not a view of anything -- it is the
     * moment the control stops reading as a globe and starts reading as a
     * bug. The limit is the only thing standing between the two. */
    pitchClampDeg: 84,
    keyStepDeg: 9,           // one arrow press
    /* The composed shot is where the globe starts, not where it must stay.
     * It used to spring back a second after every drag, which is correct
     * for a hero that nobody touches and insulting for one they do. The
     * framing is still one keystroke away: Escape returns it. */
    recoverMs: 1200
  },


  /* The geography drawn on top of the landmasses, and the traffic flying
   * over them. Engine numbers, not client content: an agency configures
   * its destinations, not whether the world has borders. */
  globe: {
    borders: true,           // the inland frontiers; coastlines are always drawn
    outlineLift: 1.0016,     // just clear of the crust, to stop z-fighting
    graticule: true,
    graticuleStepDeg: 15,
    graticuleLift: 1.004,    // above the ocean, below the crust: a sea chart
    cities: true,
    cityDotRadius: 0.0115,
    /* Above the crust, not under it. The extruded land stands at
     * R * (1 + landLift); anything planted below that is inside a
     * continent, which is where the first draft put every city. */
    cityLift: 1.0235,
    skyline: true,
    skylineScale: 0.34,      // much smaller than a destination landmark
    skylineLift: 1.019,      // planted a little way into the crust
    skylineClearDeg: 3.2,    // never stand a building on top of a pin
    traffic: 22,             // background routes, of the 28 in the table
    trafficTubeRadius: 0.0062,
    trafficOpacity: 0.85,
    identify: true,          // a click names what is under it
    pickSeconds: 7,          // how long the readout stays before fading
    pickOpacity: 0.95
  },

  idle: {
    crossfadeMs: 1000,       // live offsets fade to zero; the clock runs on
    globeSwingDeg: 6,
    globeCycles: 1,
    arcCycles: 1,
    planeFadeIn: 0.05,
    planeFadeOut: 0.95,
    bobAmplitude: 0.055
  },

  scene: {
    globeRadius: 1.72,
    landLift: 0.022,         // extruded crust standing above the ocean
    landInner: 0.988,        // the crust's underside, hidden inside the ocean
    landOcean: 0.996,        // the ocean sphere, below the deepest chord sag
    landSubdivideDeg: 5.5,   // split triangles wider than this; what is left
                             //   is covered by the radii above
    tiltDeg: 15,
    arcTubeRadius: 0.0135,
    pinHeight: 0.15,
    documentRadius: 2.28,
    orbitSquashX: 0.76,      // an ellipse, so the near pass clears the copy
    orbitOffsetX: 0.5,
    bokehCount: 4
  },

  capture: { fps: 60, frames: 300, width: 1920, height: 1080, vertical: [1080, 1920] },

  probe: { frames: 20, stepDownMs: 28, bailOutMs: 45 }
};

/* The three tiers differ only in cost, never in layout, so the
 * composition is identical at every one of them. */
const TIERS = {
  high:   { dpr: 2,   stars: 520, bokeh: 4, bloom: true,  arcSegments: 64, landmarkDetail: 1, character: true,  shadowOpacity: 0.26, fleet: 7 },
  medium: { dpr: 1.5, stars: 300, bokeh: 3, bloom: false, arcSegments: 40, landmarkDetail: 1, character: false, shadowOpacity: 0.22, fleet: 4 },
  low:    { dpr: 1,   stars: 140, bokeh: 2, bloom: false, arcSegments: 24, landmarkDetail: 0, character: false, shadowOpacity: 0.18, fleet: 2 }
};

/* ====================================================================== *
 *  5.  LANDMARK REGISTRY                                                 *
 *                                                                        *
 *  A landmark is a key into this registry, never a URL. No config value  *
 *  can point the scene at an arbitrary model; adding a destination whose *
 *  landmark was never bundled is the one content change that still needs *
 *  a build. Each proxy is well under 2,000 triangles.                    *
 * ====================================================================== */

const LANDMARKS = {};        // filled in section 11

/* ====================================================================== *
 *  6.  QUALITY — capability probe and the three tiers                    *
 * ====================================================================== */

const canvas = root.querySelector('#heroCanvas');
const stage  = root.querySelector('#stage');
const video  = root.querySelector('#heroVideo');

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
const CAPTURE = QS.get('capture') === '1';
const SELFTEST = QS.get('selftest') === '1';

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

/** Reasons to never start the canvas at all and leave the video in place.
 *  Returns a string naming the reason, or null to proceed. */
function videoOnlyReason(cfg) {
  if (CAPTURE) return null;                       // capture always renders
  // A hard capability limit: nothing can be rendered, and no amount of
  // asking changes that.
  if (!hasWebGL2()) return 'no WebGL2 context';
  // Everything below this line is a preference or a budget, not a limit.
  // Each one silently turns the globe into one still frame, which looks
  // exactly like a broken hero. The page watches for that and offers a Play
  // control; pressing it sets this flag and remounts, so a visitor who
  // actually wants the motion can have it.
  if (window.__HERO_FORCE_MOTION__) return null;
  if (prefersReduced.matches) return 'prefers-reduced-motion';
  const c = navigator.connection;
  if (c && c.saveData) return 'Save-Data is on';
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return 'deviceMemory under 4';
  if (cfg.quality.mobileVideoOnly && innerWidth < cfg.quality.mobileBreakpoint) return 'below the mobile breakpoint';
  return null;
}

/* Deterministic randomness, so capture mode reproduces frame for frame. */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(0x5EED);

/* ====================================================================== *
 *  7.  RENDERER, SCENE, CAMERA, LIGHTS                                   *
 * ====================================================================== */

let cfg = null;              // the resolved heroConfig
let tier = 'high', T = TIERS.high;

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = false;              // a baked contact plane instead
renderer.info.autoReset = false;                 // accumulate across composer passes

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(TUNING.camera.fovDesktop, 1, 0.1, 120);
camera.position.set(0, 0, TUNING.camera.distance);
scene.add(camera);

/* Image-based light from RoomEnvironment — no HDRI file to download —
 * plus one directional key and a hemisphere fill. */
let envRT = null;
async function buildEnvironment() {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  envRT = pmrem.fromScene(room, 0.035);
  scene.environment = envRT.texture;
  room.dispose(); pmrem.dispose();
}

const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
keyLight.position.set(-3.4, 4.2, 5.0);
scene.add(keyLight);

const fillLight = new THREE.HemisphereLight(0xffffff, 0xd8d2c6, 1.4);
scene.add(fillLight);

/* The soft point light that follows the cursor on a plane in front of the
 * globe, so the clay surface catches a moving highlight. */
const cursorLight = new THREE.PointLight(0xffffff, 0, TUNING.parallax.cursorLight.distance, 2);
cursorLight.position.set(0, 0, TUNING.parallax.cursorLight.z);
scene.add(cursorLight);

/* ---- the layer groups, in the depth order the brief sets --------------
 * background particles, globe, arcs, orbiting documents, foreground bokeh */
const L = {
  stars:     new THREE.Group(),
  globe:     new THREE.Group(),   // ocean, land, pins, landmarks, arcs ride with it
  documents: new THREE.Group(),
  bokeh:     new THREE.Group()
};
L.stars.name = 'layer-stars';
L.globe.name = 'layer-globe';
L.documents.name = 'layer-documents';
L.bokeh.name = 'layer-bokeh';
scene.add(L.stars, L.globe, L.documents, L.bokeh);

/* The globe's own spin lives on an inner group, so parallax can move the
 * outer one without fighting the drag. */
const globeTilt = new THREE.Group();          // the fixed ~15 degree art tilt
globeTilt.name = 'globe-tilt';
globeTilt.rotation.z = -THREE.MathUtils.degToRad(TUNING.scene.tiltDeg);
L.globe.add(globeTilt);

const globeSpin = new THREE.Group();          // longitude: idle swing and drag
globeSpin.name = 'globe-spin';
globeTilt.add(globeSpin);

/* ====================================================================== *
 *  8.  TEXTURES AND MATERIALS — the two art lanes                        *
 *                                                                        *
 *  Lane A, soft clay: MeshPhysicalMaterial, roughness 0.6-0.8,           *
 *  metalness 0, pastel tints, one soft key. Lane B, low-poly flat:       *
 *  MeshStandardMaterial, flat shading, bold flat colour.                 *
 *  They are never mixed.                                                 *
 * ====================================================================== */

const tmpC = new THREE.Color();

/** A desaturated or lightened relative of a palette colour. Everything in
 *  frame that is not one of the two saturated colours is one of these. */
function tint(hex, { s = 1, l = 1, hue = 0 } = {}) {
  const c = new THREE.Color(hex);
  const hsl = c.getHSL({ h: 0, s: 0, l: 0 });
  c.setHSL(
    (hsl.h + hue + 1) % 1,
    THREE.MathUtils.clamp(hsl.s * s, 0, 1),
    THREE.MathUtils.clamp(hsl.l * l, 0.02, 0.98)
  );
  return c.getHex();
}

function canvasTexture(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return t;
}

/* A round, soft contact shadow, drawn once and reused under the globe. */
function contactShadowTexture() {
  return canvasTexture(256, 256, (g, w) => {
    const r = w / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0,    'rgba(0,0,0,0.85)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.33)');
    grd.addColorStop(1,    'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}

/* A soft disc for the starfield and the bokeh. */
function discTexture(softness) {
  return canvasTexture(128, 128, (g, w) => {
    const r = w / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(softness, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}

/* The one quiet Bangladesh detail: a rickshaw-art line motif embossed on
 * the passport cover. Not a flag, not a theme — a cover pattern. */
function rickshawMotifTexture(inkHex, groundHex) {
  return canvasTexture(256, 352, (g, w, h) => {
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    g.fillRect(0, 0, w, h);
    const ink = `#${new THREE.Color(inkHex).getHexString()}`;
    g.strokeStyle = ink; g.fillStyle = ink;
    g.lineWidth = 2.2; g.lineCap = 'round';

    const cx = w / 2, cy = h * 0.42;
    // concentric scalloped rings, the way a rickshaw back-panel is bordered
    for (let ring = 0; ring < 3; ring++) {
      const rr = 40 + ring * 26, petals = 12 + ring * 4;
      g.beginPath();
      for (let i = 0; i <= 180; i++) {
        const a = i / 180 * Math.PI * 2;
        const r = rr + Math.sin(a * petals) * (4 + ring);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.globalAlpha = 0.5 - ring * 0.1; g.stroke();
    }
    g.globalAlpha = 0.72;
    // a small rosette at the centre
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17);
    }
    g.stroke();
    g.beginPath(); g.arc(cx, cy, 6.5, 0, Math.PI * 2); g.fill();
    // two plain rules top and bottom, as a cover would carry
    g.globalAlpha = 0.45;
    g.fillRect(w * 0.18, h * 0.80, w * 0.64, 3);
    g.fillRect(w * 0.26, h * 0.86, w * 0.48, 2);
    g.globalAlpha = 1;
  });
}

/* A blank document face: ruled lines and a neutral seal. Deliberately
 * carries no stamp, no tick and no outcome of any kind. */
function paperTexture(inkHex, groundHex) {
  return canvasTexture(256, 332, (g, w, h) => {
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    g.fillRect(0, 0, w, h);
    g.fillStyle = `#${new THREE.Color(inkHex).getHexString()}`;
    g.globalAlpha = 0.30;
    g.fillRect(28, 40, w - 120, 9);                       // a heading bar
    g.globalAlpha = 0.17;
    for (let i = 0; i < 11; i++) {
      const y = 76 + i * 17;
      g.fillRect(28, y, (w - 56) * (i % 4 === 3 ? 0.55 : 0.92), 4);
    }
    // neutral seal: a plain ring, no crest and no wording
    g.globalAlpha = 0.33;
    g.beginPath(); g.arc(w - 56, h - 54, 22, 0, Math.PI * 2);
    g.lineWidth = 4; g.strokeStyle = `#${new THREE.Color(inkHex).getHexString()}`; g.stroke();
    g.beginPath(); g.arc(w - 56, h - 54, 12, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  });
}

/* A boarding-pass face: a perforation line and blocked-out fields. */
function boardingPassTexture(inkHex, groundHex, accentHex) {
  return canvasTexture(332, 180, (g, w, h) => {
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    g.fillRect(0, 0, w, h);
    const ink = `#${new THREE.Color(inkHex).getHexString()}`;
    g.fillStyle = `#${new THREE.Color(accentHex).getHexString()}`;
    g.fillRect(0, 0, w, 16);
    g.fillStyle = ink;
    g.globalAlpha = 0.26;
    g.fillRect(20, 38, 96, 12);
    g.fillRect(20, 62, 150, 7);
    g.fillRect(20, 78, 120, 7);
    g.fillRect(20, 112, 60, 22);
    g.fillRect(96, 112, 60, 22);
    g.globalAlpha = 0.5;
    for (let x = 228; x < w - 14; x += 12) g.fillRect(x, 28, 5, 5);   // a torn edge
    g.globalAlpha = 0.22;
    g.fillRect(234, 52, 74, 7);
    g.fillRect(234, 68, 56, 7);
    g.fillRect(234, 100, 74, 34);
    g.globalAlpha = 1;
    // the perforation
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    for (let y = 8; y < h; y += 14) g.fillRect(216, y, 3, 8);
  });
}

/* The vertical background gradient. It is a plane parented to the camera
 * with toneMapped off, so it is exactly the neutral the CSS uses and the
 * tone mapper cannot shift it. */
function gradientTexture(topHex, bottomHex) {
  return canvasTexture(8, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, `#${new THREE.Color(topHex).getHexString()}`);
    grd.addColorStop(1, `#${new THREE.Color(bottomHex).getHexString()}`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}

/* ---- the palette and the material set -------------------------------- */

let PAL = null, MAT = null, TEX = null;

function buildPalette(theme) {
  const clay = theme.lane === 'clay';
  return {
    land:      theme.primary,
    landSide:  tint(theme.primary, { l: clay ? 0.78 : 0.7 }),
    ocean:     tint(theme.primary, { s: 0.28, l: clay ? 2.25 : 1.9 }),
    oceanDeep: tint(theme.primary, { s: 0.4,  l: 1.35 }),
    accent:    theme.accent,
    pin:       tint(theme.primary, { s: 0.5, l: 0.82 }),
    paper:     tint(theme.neutral, { l: 1.0 }),
    paperEdge: tint(theme.neutral, { s: 1.3, l: 0.88 }),
    ink:       tint(theme.primary, { s: 0.35, l: 0.42 }),
    neutral:   theme.neutral,
    bgTop:     theme.neutral,
    bgBottom:  tint(theme.neutral, { s: 1.5, l: 0.9 }),
    star:      tint(theme.primary, { s: 0.45, l: 0.95 }),
    bokeh:     tint(theme.primary, { s: 0.5, l: 1.7 }),
    metal:     tint(theme.neutral, { s: 0.5, l: 0.72 }),

    /* The drawn geography. The coast is the crust's own shadow colour, so
     * the line reads as the edge of the landmass rather than as something
     * lying on it; the frontier is lighter than the land it divides,
     * because a border is a convention and a coastline is a fact. */
    coastLine:   tint(theme.primary, { s: 0.9,  l: 0.55 }),
    borderLine:  tint(theme.primary, { s: 0.45, l: 1.42 }),
    graticule:   tint(theme.primary, { s: 0.3,  l: 1.5 }),
    /* A dot has to read against the land it stands on, and a building
     * has to read as scenery behind the eight that matter -- so the dots
     * go light against the green and the buildings go into the primary's
     * own family, well short of the near-white the destination landmarks
     * are modelled in. */
    city:        tint(theme.neutral, { s: 0.35, l: 1.0 }),
    skylineTint: tint(theme.primary, { s: 0.30, l: 1.62 }),
    traffic:     tint(theme.primary, { s: 0.5,  l: 1.2 }),
    trafficGlow: tint(theme.accent,  { s: 0.6,  l: 1.25 })
  };
}

/** One surface material in the current lane. Clay gets a physical material
 *  with a wide soft roughness band; low-poly gets a flat-shaded standard. */
function surface(colorHex, { rough = 0.7, metal = 0, clearcoat = 0.08, flat = false } = {}) {
  if (cfg.theme.lane === 'lowpoly') {
    return new THREE.MeshStandardMaterial({
      color: colorHex, roughness: 0.92, metalness: 0, flatShading: true, envMapIntensity: 0.5
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: colorHex, roughness: rough, metalness: metal,
    clearcoat, clearcoatRoughness: 0.55, flatShading: flat, envMapIntensity: 0.85
  });
}

function buildMaterials() {
  PAL = buildPalette(cfg.theme);
  TEX = {
    shadow:  contactShadowTexture(),
    star:    discTexture(0.35),
    bokeh:   discTexture(0.08),
    motif:   rickshawMotifTexture(PAL.accent, tint(cfg.theme.primary, { s: 0.55, l: 0.5 })),
    paper:   paperTexture(PAL.ink, PAL.paper),
    pass:    boardingPassTexture(PAL.ink, PAL.paper, PAL.accent),
    bg:      gradientTexture(PAL.bgTop, PAL.bgBottom)
  };

  MAT = {
    ocean: new THREE.MeshPhysicalMaterial({
      color: PAL.ocean, roughness: cfg.theme.lane === 'clay' ? 0.55 : 0.9,
      metalness: 0,
      clearcoat: cfg.theme.lane === 'clay' ? 0.35 : 0, clearcoatRoughness: 0.6,
      flatShading: cfg.theme.lane === 'lowpoly', envMapIntensity: 0.9
    }),
    land:     surface(PAL.land, { rough: 0.72 }),
    landSide: surface(PAL.landSide, { rough: 0.8, clearcoat: 0 }),
    pin:      surface(PAL.pin, { rough: 0.6 }),
    pinHot:   surface(PAL.accent, { rough: 0.5 }),
    origin:   surface(PAL.accent, { rough: 0.5 }),
    landmark: surface(tint(cfg.theme.neutral, { s: 0.6, l: 0.9 }), { rough: 0.75 }),

    city:      surface(PAL.city, { rough: 0.6 }),
    skyline:   surface(PAL.skylineTint, { rough: 0.8 }),
    outline:   new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    graticule: new THREE.LineBasicMaterial({ color: PAL.graticule, transparent: true, opacity: 0.3 }),
    pick:      new THREE.MeshBasicMaterial({ color: PAL.accent, transparent: true, opacity: 0.95, depthWrite: false }),
    paper:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.paper, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
    pass:     new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.pass,  roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    cover:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.motif, roughness: 0.78, metalness: 0 }),
    paperEdge: surface(PAL.paperEdge, { rough: 0.9, clearcoat: 0 }),
    book:     surface(tint(cfg.theme.primary, { s: 0.5, l: 1.75 }), { rough: 0.8 }),
    bookAlt:  surface(tint(cfg.theme.accent,  { s: 0.45, l: 1.3 }), { rough: 0.8 }),
    cap:      surface(tint(cfg.theme.primary, { s: 0.4, l: 1.9 }), { rough: 0.7 }),
    metal:    surface(PAL.metal, { rough: 0.35, metal: 0.65, clearcoat: 0.2 }),
    case:     surface(tint(cfg.theme.primary, { s: 0.33, l: 2.05 }), { rough: 0.7 }),
    plane:    surface(tint(cfg.theme.neutral, { l: 0.99 }), { rough: 0.5 }),
    planeAcc: surface(PAL.accent, { rough: 0.5 }),
    figure:   surface(tint(cfg.theme.neutral, { s: 0.7, l: 0.82 }), { rough: 0.85 }),
    island:   surface(tint(cfg.theme.primary, { s: 0.7, l: 1.05 }), { rough: 0.85 }),

    shadow: new THREE.MeshBasicMaterial({
      map: TEX.shadow, transparent: true, opacity: T.shadowOpacity,
      depthWrite: false, color: tint(cfg.theme.primary, { s: 0.8, l: 0.25 })
    }),
    star: new THREE.PointsMaterial({
      map: TEX.star, color: PAL.star, size: 0.085, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.NormalBlending
    }),
    label: null          // made per destination in section 11
  };
}

/** Hot colour change: mutate what exists instead of rebuilding. Textures
 *  that bake a colour are redrawn; nothing is disposed and recreated, so
 *  the preview never flashes. */
function applyThemeColours() {
  PAL = buildPalette(cfg.theme);
  MAT.ocean.color.set(PAL.ocean);
  MAT.land.color.set(PAL.land);
  MAT.landSide.color.set(PAL.landSide);
  MAT.pin.color.set(PAL.pin);
  MAT.pinHot.color.set(PAL.accent);
  MAT.origin.color.set(PAL.accent);
  MAT.landmark.color.set(tint(cfg.theme.neutral, { s: 0.6, l: 0.9 }));
  MAT.city.color.set(PAL.city);
  MAT.skyline.color.set(PAL.skylineTint);
  MAT.graticule.color.set(PAL.graticule);
  MAT.pick.color.set(PAL.accent);
  if (outlines) outlines.geometry = buildOutlines(GEO.arcs, GEO.uses);
  if (traffic) {
    traffic.mat.uniforms.uBase.value.set(PAL.traffic);
    traffic.mat.uniforms.uGlow.value.set(PAL.trafficGlow);
  }
  MAT.paperEdge.color.set(PAL.paperEdge);
  MAT.book.color.set(tint(cfg.theme.primary, { s: 0.5, l: 1.75 }));
  MAT.bookAlt.color.set(tint(cfg.theme.accent, { s: 0.45, l: 1.3 }));
  MAT.cap.color.set(tint(cfg.theme.primary, { s: 0.4, l: 1.9 }));
  MAT.metal.color.set(PAL.metal);
  MAT.case.color.set(tint(cfg.theme.primary, { s: 0.33, l: 2.05 }));
  MAT.plane.color.set(tint(cfg.theme.neutral, { l: 0.99 }));
  MAT.planeAcc.color.set(PAL.accent);
  MAT.figure.color.set(tint(cfg.theme.neutral, { s: 0.7, l: 0.82 }));
  MAT.island.color.set(tint(cfg.theme.primary, { s: 0.7, l: 1.05 }));
  MAT.shadow.color.set(tint(cfg.theme.primary, { s: 0.8, l: 0.25 }));
  MAT.star.color.set(PAL.star);

  for (const [key, make] of [
    ['motif', () => rickshawMotifTexture(PAL.accent, tint(cfg.theme.primary, { s: 0.55, l: 0.5 }))],
    ['paper', () => paperTexture(PAL.ink, PAL.paper)],
    ['pass',  () => boardingPassTexture(PAL.ink, PAL.paper, PAL.accent)],
    ['bg',    () => gradientTexture(PAL.bgTop, PAL.bgBottom)]
  ]) {
    TEX[key].dispose();
    TEX[key] = make();
  }
  MAT.cover.map = TEX.motif; MAT.cover.needsUpdate = true;
  MAT.paper.map = TEX.paper; MAT.paper.needsUpdate = true;
  MAT.pass.map  = TEX.pass;  MAT.pass.needsUpdate  = true;
  if (backdrop) { backdrop.material.map = TEX.bg; backdrop.material.needsUpdate = true; }

  for (const a of arcs) a.setColours(PAL.land, PAL.accent);
  for (const l of labelSprites) l.refresh();
  applyThemeToDom();
}

/* ---- the background plane, parented to the camera --------------------- */

let backdrop = null;
function buildBackdrop() {
  const geo = new THREE.PlaneGeometry(1, 1);
  backdrop = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: TEX.bg, toneMapped: false, depthWrite: false, depthTest: false, fog: false
  }));
  backdrop.name = 'backdrop';
  backdrop.position.z = -40;
  backdrop.renderOrder = -10;
  backdrop.frustumCulled = false;
  camera.add(backdrop);
}

function sizeBackdrop() {
  if (!backdrop) return;
  const d = 40;
  const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  backdrop.scale.set(h * camera.aspect * 1.08, h * 1.08, 1);
}

/* ====================================================================== *
 *  9.  GLOBE — ocean, extruded continents, origin pin                    *
 *                                                                        *
 *  Continents are real Natural Earth 110m outlines (public domain, via   *
 *  the world-atlas package), decoded from TopoJSON, triangulated in      *
 *  lon/lat and projected onto the sphere. If the fetch fails the scene   *
 *  falls back to a coarse built-in outline set rather than blanking —    *
 *  the same rule the config layer follows for a bad field.               *
 * ====================================================================== */

const DEG = Math.PI / 180;
const R = TUNING.scene.globeRadius;

/** Lat/lon to a point on a sphere of radius r. */
function ll2v(lat, lon, r, out = new THREE.Vector3()) {
  const p = (90 - lat) * DEG, t = (lon + 180) * DEG;
  return out.set(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
}

/** The globe spin that brings a longitude to face the camera. */
const lonToSpin = lon => -lon * DEG - Math.PI / 2;

const GEO_URL = `${import.meta.env.BASE_URL}hero/countries-110m.json`.replace(/\/{2,}/g, '/');

/** Minimal TopoJSON reader. It now reads the countries file rather than the
 *  land one: the same Natural Earth outlines, but cut per country and
 *  carrying a name, which is what makes a click answerable.
 *
 *  It returns the decoded arcs as well as the countries, because the arc
 *  indices are the one thing that tells a coastline from an inland border.
 *  TopoJSON shares an arc between the two shapes that meet along it, so an
 *  arc quoted by one country has open sea on its other side and an arc
 *  quoted by two is the line between neighbours. That distinction decides
 *  where the crust gets a wall and where it only gets a drawn line. */
function decodeCountries(topo) {
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  const ring = idxs => {
    const pts = [];
    for (const i of idxs) {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      // consecutive arcs share an endpoint; drop the duplicate
      for (let k = pts.length ? 1 : 0; k < a.length; k++) pts.push(a[k]);
    }
    return pts;
  };

  const uses = new Map();                      // arc index -> how many rings quote it
  const countries = [];
  for (const g of topo.objects.countries.geometries) {
    if (!g.arcs) continue;
    const groups = g.type === 'Polygon' ? [g.arcs] : g.arcs;
    const polys = [];
    for (const poly of groups) {
      polys.push(poly.map(ring));
      for (const r of poly) {
        for (const i of r) {
          const k = i < 0 ? ~i : i;
          uses.set(k, (uses.get(k) || 0) + 1);
        }
      }
    }
    if (polys.length) {
      countries.push({ name: (g.properties && g.properties.name) || 'Unnamed', id: String(g.id || ''), polys });
    }
  }
  return { arcs, countries, uses };
}

/** Everything a click needs, prepared once: each polygon unwrapped into a
 *  continuous longitude window, closed over the pole where it has to be,
 *  and given a bounding box. Unwrapping matters as much here as it does in
 *  the triangulation — a point-in-polygon test run against a ring that
 *  jumps 360 degrees mid-way reports nonsense near the antimeridian. */
function prepareLookup(countries) {
  const out = [];
  for (const c of countries) {
    const shapes = [];
    for (const poly of c.polys) {
      const rings = poly.map(unwrap);
      rings[0] = closeOverPole(rings[0]);
      const refLon = rings[0].reduce((s, q) => s + q[0], 0) / rings[0].length;
      for (let h = 1; h < rings.length; h++) rings[h] = alignTo(rings[h], refLon);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of rings[0]) {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      }
      shapes.push({ rings, x0, x1, y0, y1 });
    }
    out.push({ name: c.name, id: c.id, shapes });
  }
  return out;
}

/** The inverse of ll2v: a point on the sphere back to degrees. */
function v2ll(v) {
  const r = v.length() || 1;
  const lat = 90 - Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1)) / DEG;
  const lon = Math.atan2(v.z, -v.x) / DEG - 180;
  return { lat, lon: lon <= -180 ? lon + 360 : lon };
}

/** Even-odd crossing count. Outer ring and holes are tested together: a
 *  point inside the outer ring and inside a hole crosses an even number of
 *  edges overall, which is the answer we want without a special case. */
function ringsContain(rings, lon, lat) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > lat) !== (yj > lat) &&
          lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Which country, if any, is under this latitude and longitude. The query
 *  longitude is shifted a whole turn at a time into each shape's own
 *  window before the test, which is the other half of the unwrapping. */
function countryAt(lat, lon) {
  for (const c of COUNTRY_LOOKUP) {
    for (const s of c.shapes) {
      if (lat < s.y0 - 0.001 || lat > s.y1 + 0.001) continue;
      const x = lon + Math.round(((s.x0 + s.x1) / 2 - lon) / 360) * 360;
      if (x < s.x0 - 0.001 || x > s.x1 + 0.001) continue;
      if (ringsContain(s.rings, x, lat)) return c;
    }
  }
  return null;
}

/* Clicking the sea is still a click, and answering it with silence reads
 * as a broken control. These boxes are coarse on purpose — they name the
 * water, they do not draw it — and the first one that contains the point
 * wins, so the enclosed seas are listed before the oceans that hold them. */
const WATERS = [
  ['Mediterranean Sea',  -6,   36,  30,  46],
  ['Black Sea',          27,   42,  40,  48],
  ['Caspian Sea',        46,   55,  36,  48],
  ['Red Sea',            32,   44,  12,  30],
  ['Persian Gulf',       47,   57,  23,  31],
  ['North Sea',          -5,    9,  51,  62],
  ['Baltic Sea',         10,   30,  53,  66],
  ['Caribbean Sea',     -89,  -59,   8,  23],
  ['Gulf of Mexico',    -98,  -81,  18,  31],
  ['Hudson Bay',        -95,  -75,  51,  67],
  ['Bay of Bengal',      78,   95,   5,  23],
  ['Arabian Sea',        51,   78,   5,  25],
  ['South China Sea',    99,  122,  -3,  24],
  ['Sea of Japan',      127,  142,  33,  52],
  ['Coral Sea',         142,  170, -30,  -8],
  ['Tasman Sea',        147,  175, -46, -29],
  ['Arctic Ocean',     -180,  180,  66,  90],
  ['Southern Ocean',   -180,  180, -90, -58],
  ['Indian Ocean',       20,  147, -58,  30],
  ['Pacific Ocean',     120,  180, -58,  66],
  ['Pacific Ocean',    -180,  -68, -58,  66],
  ['Atlantic Ocean',    -68,   20, -58,  66]
];

function waterAt(lat, lon) {
  for (const [name, x0, x1, y0, y1] of WATERS) {
    if (lon >= x0 && lon <= x1 && lat >= y0 && lat <= y1) return name;
  }
  return 'Open ocean';
}

/** Degrees, written the way an atlas writes them. */
function formatLatLon(lat, lon) {
  const f = (v, pos, neg) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? pos : neg}`;
  return `${f(lat, 'N', 'S')} ${f(lon, 'E', 'W')}`;
}

/* ---- the cities the globe knows about -------------------------------- *
 *
 *  Coordinates only: a city's position is a fact, and the list is a
 *  working set of the places this agency's students actually fly between
 *  rather than a gazetteer. Each entry is [name, lat, lon], and the four
 *  letter key in CITY is what the routes and the skyline refer to, so a
 *  place can be moved or dropped in one line.
 */
const CITY = {
  LON: ['London',          51.5072,   -0.1276], MAN: ['Manchester',     53.4808,   -2.2426],
  EDI: ['Edinburgh',       55.9533,   -3.1883], DUB: ['Dublin',         53.3498,   -6.2603],
  PAR: ['Paris',           48.8566,    2.3522], BER: ['Berlin',         52.5200,   13.4050],
  MUC: ['Munich',          48.1351,   11.5820], AMS: ['Amsterdam',      52.3676,    4.9041],
  BRU: ['Brussels',        50.8503,    4.3517], CPH: ['Copenhagen',     55.6761,   12.5683],
  STO: ['Stockholm',       59.3293,   18.0686], OSL: ['Oslo',           59.9139,   10.7522],
  HEL: ['Helsinki',        60.1699,   24.9384], WAW: ['Warsaw',         52.2297,   21.0122],
  PRG: ['Prague',          50.0755,   14.4378], VIE: ['Vienna',         48.2082,   16.3738],
  ZRH: ['Zurich',          47.3769,    8.5417], MIL: ['Milan',          45.4642,    9.1900],
  ROM: ['Rome',            41.9028,   12.4964], MAD: ['Madrid',         40.4168,   -3.7038],
  BCN: ['Barcelona',       41.3851,    2.1734], LIS: ['Lisbon',         38.7223,   -9.1393],
  ATH: ['Athens',          37.9838,   23.7275], IST: ['Istanbul',       41.0082,   28.9784],
  MOW: ['Moscow',          55.7558,   37.6173], DXB: ['Dubai',          25.2048,   55.2708],
  DOH: ['Doha',            25.2854,   51.5310], RUH: ['Riyadh',         24.7136,   46.6753],
  CAI: ['Cairo',           30.0444,   31.2357], CAS: ['Casablanca',     33.5731,   -7.5898],
  NBO: ['Nairobi',         -1.2921,   36.8219], LOS: ['Lagos',           6.5244,    3.3792],
  ACC: ['Accra',            5.6037,   -0.1870], ADD: ['Addis Ababa',     9.0320,   38.7469],
  JNB: ['Johannesburg',   -26.2041,   28.0473], CPT: ['Cape Town',     -33.9249,   18.4241],
  NYC: ['New York',        40.7128,  -74.0060], BOS: ['Boston',         42.3601,  -71.0589],
  YTO: ['Toronto',         43.6532,  -79.3832], YMQ: ['Montreal',       45.5017,  -73.5673],
  YVR: ['Vancouver',       49.2827, -123.1207], CHI: ['Chicago',        41.8781,  -87.6298],
  SFO: ['San Francisco',   37.7749, -122.4194], LAX: ['Los Angeles',    34.0522, -118.2437],
  SEA: ['Seattle',         47.6062, -122.3321], HOU: ['Houston',        29.7604,  -95.3698],
  MEX: ['Mexico City',     19.4326,  -99.1332], BOG: ['Bogota',          4.7110,  -74.0721],
  LIM: ['Lima',           -12.0464,  -77.0428], SAO: ['Sao Paulo',     -23.5505,  -46.6333],
  RIO: ['Rio de Janeiro', -22.9068,  -43.1729], BUE: ['Buenos Aires',  -34.6037,  -58.3816],
  SCL: ['Santiago',       -33.4489,  -70.6693], DEL: ['Delhi',          28.6139,   77.2090],
  BOM: ['Mumbai',          19.0760,   72.8777], BLR: ['Bengaluru',      12.9716,   77.5946],
  MAA: ['Chennai',         13.0827,   80.2707], DAC: ['Dhaka',          23.8103,   90.4125],
  KTM: ['Kathmandu',       27.7172,   85.3240], CMB: ['Colombo',         6.9271,   79.8612],
  KHI: ['Karachi',         24.8607,   67.0011], LHE: ['Lahore',         31.5204,   74.3587],
  BKK: ['Bangkok',         13.7563,  100.5018], KUL: ['Kuala Lumpur',    3.1390,  101.6869],
  SIN: ['Singapore',        1.3521,  103.8198], JKT: ['Jakarta',        -6.2088,  106.8456],
  MNL: ['Manila',          14.5995,  120.9842], HAN: ['Hanoi',          21.0285,  105.8542],
  SGN: ['Ho Chi Minh City', 10.8231, 106.6297], HKG: ['Hong Kong',      22.3193,  114.1694],
  SHA: ['Shanghai',        31.2304,  121.4737], BJS: ['Beijing',        39.9042,  116.4074],
  SEL: ['Seoul',           37.5665,  126.9780], TYO: ['Tokyo',          35.6762,  139.6503],
  OSA: ['Osaka',           34.6937,  135.5023], TPE: ['Taipei',         25.0330,  121.5654],
  SYD: ['Sydney',         -33.8688,  151.2093], MEL: ['Melbourne',     -37.8136,  144.9631],
  BNE: ['Brisbane',       -27.4698,  153.0251], PER: ['Perth',         -31.9505,  115.8605],
  AKL: ['Auckland',       -36.8485,  174.7633], ALA: ['Almaty',         43.2220,   76.8512],
  TAS: ['Tashkent',        41.2995,   69.2401], THR: ['Tehran',         35.6892,   51.3890],
  GYD: ['Baku',            40.4093,   49.8671], REK: ['Reykjavik',      64.1466,  -21.9426],
  ANC: ['Anchorage',       61.2181, -149.9003], HNL: ['Honolulu',       21.3069, -157.8583]
};

const CITY_KEYS = Object.keys(CITY);

/* A building per city, for the ones that get one. Every shape in the
 * registry is an abstract proxy -- a silhouette of a kind of building, not
 * a model of a particular one -- and none carries a crest, a logo or an
 * inscription. See ATTRIBUTIONS.md. */
const SKYLINE = [
  ['ROM', 'colosseum'], ['CAI', 'pyramid'],     ['BJS', 'pagoda'],      ['BKK', 'pagoda'],
  ['IST', 'dome-minarets'], ['ATH', 'temple'],  ['AMS', 'windmill'],    ['PRG', 'clock-tower'],
  ['VIE', 'cathedral'], ['BCN', 'cathedral'],   ['SFO', 'bridge'],      ['LIS', 'bridge'],
  ['CHI', 'skyline'],   ['HKG', 'skyline'],     ['SHA', 'skyline'],     ['JNB', 'skyline'],
  ['RIO', 'stadium'],   ['BUE', 'obelisk'],     ['MEX', 'pyramid'],     ['AKL', 'needle'],
  ['DOH', 'needle'],    ['MAD', 'dome-tower'],  ['MOW', 'dome-tower'],  ['DEL', 'arch-gate'],
  ['BOM', 'arch-gate'], ['CAS', 'minaret'],     ['RUH', 'minaret'],     ['STO', 'spire'],
  ['CPH', 'spire'],     ['MEL', 'skyline'],     ['SIN', 'podium-towers'], ['NBO', 'tower-round'],
  ['SGN', 'podium-towers'], ['LIM', 'temple'],  ['TAS', 'dome-tower'],  ['EDI', 'clock-tower']
];

/* The background traffic. These are real long-haul pairings, chosen so the
 * lines spread across the whole sphere instead of bunching over Europe,
 * and they are deliberately not the agency's own routes: those are the
 * eight bright arcs, and nothing here should compete with them. */
const ROUTES = [
  ['LON', 'NYC'], ['LON', 'SIN'], ['PAR', 'TYO'], ['ZRH', 'HKG'],
  ['DXB', 'SYD'], ['DXB', 'LAX'], ['SIN', 'MEL'], ['HKG', 'SFO'],
  ['TYO', 'SEA'], ['SEL', 'YVR'], ['DEL', 'IST'], ['BOM', 'NBO'],
  ['JNB', 'SAO'], ['SAO', 'MAD'], ['BUE', 'MAD'], ['MEX', 'MAD'],
  ['IST', 'BJS'], ['MOW', 'BJS'], ['AMS', 'YTO'], ['CPT', 'DXB'],
  ['BKK', 'MUC'], ['KUL', 'AKL'], ['CAI', 'LON'], ['LOS', 'LIS'],
  ['HNL', 'TYO'], ['ANC', 'SEL'], ['BOS', 'DUB'], ['CHI', 'BJS']
];

/** A ring crossing the antimeridian comes back as a 360-degree jump.
 *  Unwrapping keeps it continuous so the triangulation stays sane; the
 *  projection is periodic in longitude, so nothing needs wrapping back. */
function unwrap(ring) {
  const out = [ring[0].slice()];
  let shift = 0;
  for (let i = 1; i < ring.length; i++) {
    const d = ring[i][0] - ring[i - 1][0];
    if (d > 180) shift -= 360; else if (d < -180) shift += 360;
    out.push([ring[i][0] + shift, ring[i][1]]);
  }
  return out;
}

/** A hole is unwrapped from its own first point, so it can land a whole
 *  turn away from its outer ring -- and earcut then bridges the two across
 *  the entire map. Bring it back into the outer ring's window. */
function alignTo(ring, refLon) {
  const mid = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const shift = Math.round((refLon - mid) / 360) * 360;
  return shift ? ring.map(p => [p[0] + shift, p[1]]) : ring;
}

/** A ring that encircles a pole -- Antarctica -- never closes in unwrapped
 *  longitude: it runs from -180 to +180 and stops. Its interior is the pole,
 *  so close it over the pole rather than leaving earcut to join the ends
 *  with one edge straight across the world. */
function closeOverPole(ring) {
  const a = ring[0], b = ring[ring.length - 1];
  if (Math.abs(b[0] - a[0]) < 180) return ring;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length < 0 ? -90 : 90;
  const out = ring.slice();
  for (let i = 1; i <= 12; i++) out.push([b[0] + (a[0] - b[0]) * i / 12, lat]);
  return out;
}

const signedArea = ring => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return a / 2;
};

/** Split any triangle whose longest side spans more than maxDeg, so a
 *  chord across a wide continent never sinks beneath the ocean sphere. */
function subdivide(tris, maxDeg, maxDepth = 4) {
  let work = tris;
  for (let depth = 0; depth < maxDepth; depth++) {
    const next = [];
    let split = false;
    for (const t of work) {
      const [a, b, c] = t;
      const e = [
        Math.hypot(a[0] - b[0], a[1] - b[1]),
        Math.hypot(b[0] - c[0], b[1] - c[1]),
        Math.hypot(c[0] - a[0], c[1] - a[1])
      ];
      if (Math.max(...e) <= maxDeg) { next.push(t); continue; }
      split = true;
      const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      const ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
      next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    work = next;
    if (!split) break;
  }
  return work;
}

/** Caps and side walls for every land polygon, as two merged geometries. */
function buildContinentGeometry(polys, coastLines) {
  const capPos = [], sidePos = [];
  // The cap is a chord mesh, so a wide triangle sags toward the centre by
  // R(1 - cos(theta/2)). Rather than subdividing until that vanishes --
  // which costs triangles quadratically on the long interior diagonals
  // earcut produces -- the ocean sphere is simply set below the deepest
  // sag, and the land's underside is tucked inside it.
  const inner = R * TUNING.scene.landInner;
  const outer = R * (1 + TUNING.scene.landLift);
  const v = new THREE.Vector3();
  const push = (arr, lon, lat, r) => { ll2v(lat, lon, r, v); arr.push(v.x, v.y, v.z); };

  for (const poly of polys) {
    const rings = poly.map(unwrap);
    rings[0] = closeOverPole(rings[0]);
    const refLon = rings[0].reduce((sum, q) => sum + q[0], 0) / rings[0].length;
    for (let h = 1; h < rings.length; h++) rings[h] = alignTo(rings[h], refLon);
    // outer ring counter-clockwise, holes clockwise: that makes both the
    // cap winding and the wall normals come out facing the right way
    if (signedArea(rings[0]) < 0) rings[0].reverse();
    for (let h = 1; h < rings.length; h++) if (signedArea(rings[h]) > 0) rings[h].reverse();

    const toVec2 = ring => ring.map(p => new THREE.Vector2(p[0], p[1]));
    const contour = toVec2(rings[0]);
    const holes = rings.slice(1).map(toVec2);
    if (contour.length < 3) continue;

    let faces;
    try { faces = THREE.ShapeUtils.triangulateShape(contour, holes); }
    catch { continue; }                               // a degenerate ring: skip it

    const all = contour.concat(...holes);
    let tris = faces.map(f => [
      [all[f[0]].x, all[f[0]].y], [all[f[1]].x, all[f[1]].y], [all[f[2]].x, all[f[2]].y]
    ]);
    tris = subdivide(tris, TUNING.scene.landSubdivideDeg);

    for (const [a, b, c] of tris) {
      // triangulateShape can hand back either winding; normalise to CCW
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      const t = area >= 0 ? [a, b, c] : [a, c, b];
      for (const p of t) push(capPos, p[0], p[1], outer);
    }

  }

  /* The crust's edge. With the countries file in hand these come from the
   * coastline arcs rather than from the rings, which fixes two things at
   * once: a wall is no longer stood up along every inland frontier, and
   * the synthetic segments that close Antarctica over the pole no longer
   * get one either -- that was a cliff running straight across the pole,
   * visible from the top of the globe for as long as it has existed. */
  for (const line of coastLines) {
    const a = unwrap(line);
    for (let i = 0; i + 1 < a.length; i++) {
      const p0 = a[i], p1 = a[i + 1];
      push(sidePos, p0[0], p0[1], inner); push(sidePos, p1[0], p1[1], inner); push(sidePos, p1[0], p1[1], outer);
      push(sidePos, p0[0], p0[1], inner); push(sidePos, p1[0], p1[1], outer); push(sidePos, p0[0], p0[1], outer);
    }
  }

  const make = (arr, spherical) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    if (spherical) {
      const nrm = new Float32Array(arr.length);
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i], y = arr[i + 1], z = arr[i + 2];
        const l = Math.hypot(x, y, z) || 1;
        nrm[i] = x / l; nrm[i + 1] = y / l; nrm[i + 2] = z / l;
      }
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    } else {
      g.computeVertexNormals();      // the crust edge reads better faceted
    }
    return g;
  };
  return { cap: make(capPos, true), side: make(sidePos, false),
           triangles: capPos.length / 9 + sidePos.length / 9 };
}

/* A coarse stand-in used only if the Natural Earth fetch fails. Blocky
 * on purpose — it should be obvious in review that the real data missed. */
const FALLBACK_LAND = [
  [[-168,66],[-52,66],[-56,46],[-80,25],[-98,18],[-116,32],[-125,49],[-168,66]],
  [[-82,10],[-35,-5],[-40,-23],[-70,-55],[-76,-18],[-82,10]],
  [[-10,36],[30,37],[42,13],[50,-12],[35,-35],[13,-35],[9,4],[-17,15],[-10,36]],
  [[-10,43],[30,45],[60,42],[100,45],[140,50],[180,66],[30,70],[-10,55],[-10,43]],
  [[60,30],[100,25],[122,32],[95,8],[72,8],[60,30]],
  [[113,-12],[153,-28],[146,-39],[115,-34],[113,-12]],
  [[-180,-62],[180,-62],[180,-85],[-180,-85],[-180,-62]]
].map(r => [r]);

let globeMesh = null, landMesh = null, landSideMesh = null, contactShadow = null;
let landTriangles = 0;

let outlines = null, graticule = null, cityDots = null;
let GEO = { arcs: [], countries: [], uses: new Map() };
let COUNTRY_LOOKUP = [];

/* ---- the drawn geography: coastlines, borders, graticule, cities ------ *
 *
 *  The extruded crust gives the continents mass; what it cannot give them
 *  is an edge you can read at the size this globe is actually seen at. A
 *  one-pixel line does that for a tenth of the cost of subdividing the
 *  cap, and the same pass gets the inland borders for free, because the
 *  arcs are already sorted into coast and frontier by then.
 */

/** Every arc, as line segments, coloured by what it separates. */
function buildOutlines(arcs, uses) {
  const pos = [], col = [];
  const r = R * (1 + TUNING.scene.landLift) * TUNING.globe.outlineLift;
  const coast = new THREE.Color(PAL.coastLine);
  const border = new THREE.Color(PAL.borderLine);
  const v = new THREE.Vector3();
  const push = (lon, lat, c) => {
    ll2v(lat, lon, r, v);
    pos.push(v.x, v.y, v.z);
    col.push(c.r, c.g, c.b);
  };

  for (let i = 0; i < arcs.length; i++) {
    const line = unwrap(arcs[i]);
    const c = (uses.get(i) || 1) > 1 ? border : coast;
    if (c === border && !TUNING.globe.borders) continue;
    for (let k = 0; k + 1 < line.length; k++) {
      push(line[k][0], line[k][1], c);
      push(line[k + 1][0], line[k + 1][1], c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Parallels and meridians, on a shell between the ocean and the crust, so
 *  the grid shows on the water and the continents cover it. A sea chart
 *  does the same thing for the same reason. */
function buildGraticule() {
  const step = TUNING.globe.graticuleStepDeg;
  const r = R * TUNING.globe.graticuleLift;
  const pos = [];
  const v = new THREE.Vector3();
  const push = (lon, lat) => { ll2v(lat, lon, r, v); pos.push(v.x, v.y, v.z); };
  const seg = 3;                                   // degrees per segment

  for (let lat = -90 + step; lat < 90; lat += step) {
    for (let lon = -180; lon < 180; lon += seg) { push(lon, lat); push(lon + seg, lat); }
  }
  for (let lon = -180; lon < 180; lon += step) {
    for (let lat = -90; lat < 90; lat += seg) { push(lon, lat); push(lon, lat + seg); }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A dot per city. One instanced mesh, so the whole set is a single draw
 *  call however long the table grows. */
function buildCityDots() {
  const keys = CITY_KEYS;
  const geo = new THREE.SphereGeometry(TUNING.globe.cityDotRadius, 6, 4);
  const mesh = new THREE.InstancedMesh(geo, MAT.city, keys.length);
  mesh.name = 'city-dots';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  keys.forEach((k, i) => {
    const [, lat, lon] = CITY[k];
    m.compose(ll2v(lat, lon, R * TUNING.globe.cityLift), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

async function buildGlobe() {
  const seg = cfg.theme.lane === 'lowpoly' ? 30 : 64;
  const oceanGeo = new THREE.SphereGeometry(R * TUNING.scene.landOcean, seg, Math.round(seg * 0.55));
  globeMesh = new THREE.Mesh(oceanGeo, MAT.ocean);
  globeMesh.name = 'ocean';
  globeSpin.add(globeMesh);

  let polys = FALLBACK_LAND;
  // Without the real data there is nothing to name, so the fallback keeps
  // the globe looking like a globe and the click reports the ocean it can
  // still work out from latitude and longitude alone.
  let coastLines = FALLBACK_LAND.flatMap(p => p.map(r => r.concat([r[0]])));
  try {
    const res = await fetch(GEO_URL, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    GEO = decodeCountries(await res.json());
    COUNTRY_LOOKUP = prepareLookup(GEO.countries);
    polys = GEO.countries.flatMap(c => c.polys);
    coastLines = GEO.arcs.filter((_, i) => (GEO.uses.get(i) || 1) === 1);
  } catch (err) {
    console.warn('[hero] Natural Earth outlines unavailable, using the coarse fallback:', err.message);
  }

  const { cap, side, triangles } = buildContinentGeometry(polys, coastLines);
  landTriangles = triangles;
  landMesh = new THREE.Mesh(cap, MAT.land);
  landMesh.name = 'land';
  landSideMesh = new THREE.Mesh(side, MAT.landSide);
  landSideMesh.name = 'land-sides';
  globeSpin.add(landMesh, landSideMesh);

  /* The drawn geography, over the modelled one. */
  if (GEO.arcs.length) {
    outlines = new THREE.LineSegments(buildOutlines(GEO.arcs, GEO.uses), MAT.outline);
    outlines.name = 'outlines';
    outlines.renderOrder = 1;
    globeSpin.add(outlines);
  }
  if (TUNING.globe.graticule) {
    graticule = new THREE.LineSegments(buildGraticule(), MAT.graticule);
    graticule.name = 'graticule';
    globeSpin.add(graticule);
  }
  if (TUNING.globe.cities) {
    cityDots = buildCityDots();
    globeSpin.add(cityDots);
  }

  // a baked contact shadow, instead of a real-time shadow map  (taste-skill-ignore: prose, not CSS)
  contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.4, R * 3.4), MAT.shadow);  // taste-skill-ignore: a 3D mesh, not a CSS shadow
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -R * 1.14;
  contactShadow.renderOrder = -1;
  L.globe.add(contactShadow);
}

/* ====================================================================== *
 *  10.  ARCS — quadratic beziers with a travelling pulse                 *
 * ====================================================================== */

const ARC_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const ARC_FRAG = `
  uniform vec3  uBase;
  uniform vec3  uGlow;
  uniform float uHead;     // 0..1, where the light currently is
  uniform float uWidth;    // how long the trailing light is
  uniform float uBoost;    // hover brightens and lengthens it
  uniform float uDraw;     // 0..1, how much of the arc exists yet
  varying vec2  vUv;
  void main() {
    if (vUv.x > uDraw) discard;
    float d = fract(vUv.x - uHead);
    float g = smoothstep(uWidth * uBoost, 0.0, d);
    vec3  c = mix(uBase, uGlow, clamp(g * 1.15, 0.0, 1.0));
    float a = 0.62 + 0.38 * g;
    gl_FragColor = vec4(c, a * (0.55 + 0.45 * uBoost));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const arcs = [];

function arcCurve(a, b) {
  const pa = ll2v(a.lat, a.lon, R), pb = ll2v(b.lat, b.lon, R);
  const angle = pa.angleTo(pb);                       // great-circle separation
  const lift = 1 + 0.14 + angle * 0.20;               // longer hops fly higher
  const mid = pa.clone().add(pb).multiplyScalar(0.5).normalize().multiplyScalar(R * lift);
  return new THREE.QuadraticBezierCurve3(pa, mid, pb);
}

function buildArcs() {
  const dests = activeDestinations();
  dests.forEach((d, i) => {
    const curve = arcCurve(cfg.origin, d);
    const geo = new THREE.TubeGeometry(curve, T.arcSegments, TUNING.scene.arcTubeRadius, 6, false);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ARC_VERT, fragmentShader: ARC_FRAG,
      transparent: true, depthWrite: false,
      uniforms: {
        uBase:  { value: new THREE.Color(PAL.land) },
        uGlow:  { value: new THREE.Color(PAL.accent) },
        uHead:  { value: 0 },
        uWidth: { value: 0.3 },
        uBoost: { value: 1 },
        uDraw:  { value: 1 }
      }
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `arc-${d.code}`;
    mesh.renderOrder = 2;
    globeSpin.add(mesh);

    arcs.push({
      mesh, mat, curve, dest: d,
      phase: i / Math.max(1, dests.length),          // staggered, never in unison
      boost: 1, boostTarget: 1,
      draw: 1, drawTarget: 1,
      setColours(base, glow) { mat.uniforms.uBase.value.set(base); mat.uniforms.uGlow.value.set(glow); }
    });
  });
}

/* ====================================================================== *
 *  11.  MARKERS — instanced pins, landmark proxies, billboard labels     *
 * ====================================================================== */

/* Each landmark is a handful of primitives merged into one geometry, so a
 * destination costs one draw call rather than five. All are well under
 * 2,000 triangles; none reproduces a crest, a logo or a real document. */
function mergeParts(parts) {
  const geos = parts.map(([geo, pos, rot, scl]) => {
    const g = geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(pos || [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))),
      new THREE.Vector3(...(scl || [1, 1, 1]))
    );
    g.applyMatrix4(m);
    g.deleteAttribute('uv');
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach(g => g.dispose());
  return merged;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);

function defineLandmarks(detail) {
  const S = 8 + detail * 4;                            // segment count per tier
  const reg = {
    'big-ben': () => mergeParts([
      [box(0.052, 0.3, 0.052), [0, 0.15, 0]],
      [box(0.066, 0.062, 0.066), [0, 0.30, 0]],
      [cyl(0.004, 0.034, 0.1, S), [0, 0.38, 0]],
      [box(0.03, 0.03, 0.006), [0, 0.30, 0.034]]
    ]),
    'cn-tower': () => mergeParts([
      [cyl(0.018, 0.04, 0.33, S), [0, 0.165, 0]],
      [cyl(0.052, 0.052, 0.038, S), [0, 0.25, 0]],
      [cyl(0.03, 0.044, 0.03, S), [0, 0.285, 0]],
      [cyl(0.002, 0.012, 0.13, 6), [0, 0.37, 0]]
    ]),
    'opera-house': () => mergeParts([
      [box(0.2, 0.022, 0.12), [0, 0.011, 0]],
      [new THREE.SphereGeometry(0.072, S, S, 0, Math.PI, 0, Math.PI * 0.52), [-0.042, 0.02, 0.004], [0, -0.5, 0.26]],
      [new THREE.SphereGeometry(0.058, S, S, 0, Math.PI, 0, Math.PI * 0.52), [0.016, 0.02, -0.012], [0, -0.5, 0.26]],
      [new THREE.SphereGeometry(0.04, S, S, 0, Math.PI, 0, Math.PI * 0.52), [0.062, 0.02, -0.026], [0, -0.5, 0.26]]
    ]),
    'liberty': () => mergeParts([
      [cyl(0.052, 0.07, 0.072, S), [0, 0.036, 0]],
      [cyl(0.03, 0.042, 0.052, S), [0, 0.1, 0]],
      [cyl(0.022, 0.03, 0.15, S), [0, 0.2, 0]],
      [new THREE.SphereGeometry(0.026, S, S), [0, 0.288, 0]],
      [cyl(0.0045, 0.0045, 0.12, 6), [0.052, 0.30, 0], [0, 0, -0.22]],
      [new THREE.ConeGeometry(0.019, 0.045, S), [0.065, 0.375, 0]]
    ]),
    'brandenburg-gate': () => mergeParts([
      [box(0.2, 0.026, 0.05), [0, 0.213, 0]],
      ...[-0.072, -0.036, 0, 0.036, 0.072].map(x => [cyl(0.014, 0.016, 0.2, S), [x, 0.1, 0]]),
      [box(0.06, 0.03, 0.03), [0, 0.242, 0]]
    ]),
    'petronas': () => mergeParts([
      [cyl(0.026, 0.04, 0.3, S), [-0.046, 0.15, 0]],
      [cyl(0.026, 0.04, 0.3, S), [0.046, 0.15, 0]],
      [cyl(0.003, 0.012, 0.085, 6), [-0.046, 0.34, 0]],
      [cyl(0.003, 0.012, 0.085, 6), [0.046, 0.34, 0]],
      [box(0.092, 0.012, 0.02), [0, 0.2, 0]]
    ]),
    'torii': () => mergeParts([
      [cyl(0.013, 0.016, 0.21, S), [-0.08, 0.105, 0]],
      [cyl(0.013, 0.016, 0.21, S), [0.08, 0.105, 0]],
      [box(0.235, 0.019, 0.034), [0, 0.213, 0]],
      [box(0.2, 0.014, 0.026), [0, 0.176, 0]],
      [box(0.03, 0.03, 0.026), [0, 0.195, 0]]
    ]),
    'korean-gate': () => mergeParts([
      [box(0.18, 0.016, 0.085), [0, 0.008, 0]],
      [cyl(0.014, 0.014, 0.12, S), [-0.058, 0.076, 0]],
      [cyl(0.014, 0.014, 0.12, S), [0.058, 0.076, 0]],
      [box(0.2, 0.018, 0.1), [0, 0.146, 0]],
      [box(0.235, 0.014, 0.12), [0, 0.176, 0], [0, 0, 0]],
      [box(0.17, 0.012, 0.09), [0, 0.2, 0]]
    ]),
    'eiffel': () => mergeParts([
      [cyl(0.03, 0.082, 0.14, 4), [0, 0.07, 0], [0, Math.PI / 4, 0]],
      [cyl(0.014, 0.03, 0.12, 4), [0, 0.2, 0], [0, Math.PI / 4, 0]],
      [cyl(0.004, 0.014, 0.1, 4), [0, 0.31, 0], [0, Math.PI / 4, 0]],
      [box(0.082, 0.012, 0.082), [0, 0.142, 0], [0, Math.PI / 4, 0]]
    ]),
    'duomo': () => mergeParts([
      [box(0.14, 0.11, 0.09), [0, 0.055, 0]],
      [new THREE.SphereGeometry(0.056, S, S, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.11, 0]],
      [cyl(0.006, 0.01, 0.06, 6), [0, 0.19, 0]],
      ...[-0.056, 0.056].map(x => [cyl(0.012, 0.014, 0.1, S), [x, 0.05, 0.03]])
    ]),
    /* ---- the second set: the buildings that fill the rest of the world --
     * Every one is a silhouette of a kind of building rather than a model
     * of a particular one, which is both the honest thing to do and the
     * cheap one: a dome with four minarets reads as what it is at forty
     * pixels tall, and a faithful model of a named building would not.
     * None carries a crest, a mark or an inscription. */
    'pyramid': () => mergeParts([
      [box(0.2, 0.014, 0.2), [0, 0.007, 0]],
      [cyl(0.0, 0.11, 0.17, 4), [0, 0.09, 0], [0, Math.PI / 4, 0]]
    ]),
    'pagoda': () => mergeParts([
      [cyl(0.026, 0.034, 0.27, S), [0, 0.135, 0]],
      [cyl(0.0, 0.088, 0.05, 4), [0, 0.1, 0], [0, Math.PI / 4, 0]],
      [cyl(0.0, 0.072, 0.045, 4), [0, 0.178, 0], [0, Math.PI / 4, 0]],
      [cyl(0.0, 0.056, 0.042, 4), [0, 0.246, 0], [0, Math.PI / 4, 0]],
      [cyl(0.002, 0.008, 0.06, 6), [0, 0.3, 0]]
    ]),
    'colosseum': () => mergeParts([
      [new THREE.CylinderGeometry(0.096, 0.102, 0.11, S + 6, 1, true), [0, 0.055, 0]],
      [new THREE.TorusGeometry(0.098, 0.009, 5, S + 8), [0, 0.108, 0], [Math.PI / 2, 0, 0]],
      [new THREE.TorusGeometry(0.102, 0.009, 5, S + 8), [0, 0.012, 0], [Math.PI / 2, 0, 0]],
      [cyl(0.07, 0.07, 0.016, S), [0, 0.012, 0]]
    ]),
    'temple': () => mergeParts([
      [box(0.2, 0.018, 0.12), [0, 0.009, 0]],
      ...[-0.074, -0.037, 0, 0.037, 0.074].map(x => [cyl(0.012, 0.013, 0.12, S), [x, 0.078, 0.04]]),
      ...[-0.074, 0.074].map(x => [cyl(0.012, 0.013, 0.12, S), [x, 0.078, -0.04]]),
      [box(0.21, 0.018, 0.13), [0, 0.147, 0]],
      [cyl(0.0, 0.058, 0.13, 3), [0, 0.176, 0], [Math.PI / 2, 0, 0]]
    ]),
    'windmill': () => mergeParts([
      [cyl(0.034, 0.058, 0.21, S), [0, 0.105, 0]],
      [cyl(0.0, 0.05, 0.05, S), [0, 0.232, 0]],
      [box(0.014, 0.23, 0.006), [0, 0.225, 0.054], [0, 0, 0.6]],
      [box(0.23, 0.014, 0.006), [0, 0.225, 0.054], [0, 0, 0.6]]
    ]),
    'clock-tower': () => mergeParts([
      [box(0.062, 0.26, 0.062), [0, 0.13, 0]],
      [box(0.08, 0.05, 0.08), [0, 0.282, 0]],
      [cyl(0.0, 0.056, 0.1, 4), [0, 0.357, 0], [0, Math.PI / 4, 0]],
      [cyl(0.022, 0.022, 0.009, S), [0, 0.282, 0.042], [Math.PI / 2, 0, 0]]
    ]),
    'cathedral': () => mergeParts([
      [box(0.11, 0.12, 0.17), [0, 0.06, 0]],
      ...[-0.042, 0.042].map(x => [box(0.03, 0.2, 0.03), [x, 0.1, 0.072]]),
      ...[-0.042, 0.042].map(x => [cyl(0.0, 0.026, 0.1, 4), [x, 0.25, 0.072], [0, Math.PI / 4, 0]]),
      [new THREE.SphereGeometry(0.032, S, S, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.12, -0.03]]
    ]),
    'bridge': () => mergeParts([
      [box(0.27, 0.011, 0.04), [0, 0.072, 0]],
      ...[-0.076, 0.076].map(x => [box(0.016, 0.17, 0.046), [x, 0.086, 0]]),
      ...[-0.076, 0.076].map(x => [box(0.022, 0.012, 0.056), [x, 0.152, 0]]),
      [cyl(0.004, 0.004, 0.15, 5), [-0.132, 0.112, 0], [0, 0, 0.78]],
      [cyl(0.004, 0.004, 0.15, 5), [0.132, 0.112, 0], [0, 0, -0.78]]
    ]),
    'skyline': () => mergeParts([
      [box(0.05, 0.3, 0.05), [-0.056, 0.15, 0.012]],
      [box(0.046, 0.21, 0.046), [0.005, 0.105, -0.032]],
      [box(0.056, 0.25, 0.05), [0.058, 0.125, 0.016]],
      [box(0.04, 0.15, 0.04), [-0.02, 0.075, 0.056]],
      [box(0.036, 0.12, 0.036), [0.1, 0.06, -0.02]],
      [cyl(0.002, 0.006, 0.06, 5), [-0.056, 0.33, 0.012]]
    ]),
    'stadium': () => mergeParts([
      [new THREE.CylinderGeometry(0.1, 0.086, 0.07, S + 6, 1, true), [0, 0.042, 0], null, [1, 1, 0.72]],
      [new THREE.TorusGeometry(0.1, 0.008, 5, S + 8), [0, 0.077, 0], [Math.PI / 2, 0, 0], [1, 0.72, 1]],
      [cyl(0.07, 0.07, 0.014, S), [0, 0.014, 0], null, [1, 1, 0.72]]
    ]),
    'obelisk': () => mergeParts([
      [box(0.072, 0.03, 0.072), [0, 0.015, 0]],
      [cyl(0.016, 0.03, 0.3, 4), [0, 0.18, 0], [0, Math.PI / 4, 0]],
      [cyl(0.0, 0.019, 0.05, 4), [0, 0.355, 0], [0, Math.PI / 4, 0]]
    ]),
    'needle': () => mergeParts([
      [cyl(0.012, 0.032, 0.3, S), [0, 0.15, 0]],
      [new THREE.SphereGeometry(0.038, S, S), [0, 0.3, 0], null, [1, 0.62, 1]],
      [new THREE.TorusGeometry(0.04, 0.006, 5, S + 4), [0, 0.3, 0], [Math.PI / 2, 0, 0]],
      [cyl(0.001, 0.005, 0.09, 5), [0, 0.372, 0]]
    ]),
    'minaret': () => mergeParts([
      [box(0.13, 0.07, 0.11), [0, 0.035, 0]],
      [new THREE.SphereGeometry(0.054, S, S, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.07, 0]],
      [cyl(0.016, 0.019, 0.26, S), [0.074, 0.13, 0]],
      [new THREE.TorusGeometry(0.024, 0.005, 5, S + 2), [0.074, 0.2, 0], [Math.PI / 2, 0, 0]],
      [cyl(0.0, 0.021, 0.04, S), [0.074, 0.282, 0]]
    ]),
    'dome-tower': () => mergeParts([
      [cyl(0.072, 0.084, 0.1, S), [0, 0.05, 0]],
      [new THREE.SphereGeometry(0.072, S, S, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.1, 0], null, [1, 1.15, 1]],
      [cyl(0.003, 0.009, 0.06, 6), [0, 0.202, 0]],
      ...[-0.09, 0.09].map(x => [cyl(0.015, 0.018, 0.16, S), [x, 0.08, 0]]),
      ...[-0.09, 0.09].map(x => [cyl(0.0, 0.019, 0.045, S), [x, 0.182, 0]])
    ]),
    'dome-minarets': () => mergeParts([
      [box(0.14, 0.06, 0.14), [0, 0.03, 0]],
      [new THREE.SphereGeometry(0.064, S, S, 0, Math.PI * 2, 0, Math.PI * 0.5), [0, 0.06, 0], null, [1, 1.1, 1]],
      [cyl(0.002, 0.007, 0.05, 6), [0, 0.132, 0]],
      ...[[-0.084, -0.062], [0.084, -0.062], [-0.084, 0.062], [0.084, 0.062]]
        .map(([x, z]) => [cyl(0.009, 0.011, 0.19, S), [x, 0.095, z]]),
      ...[[-0.084, -0.062], [0.084, -0.062], [-0.084, 0.062], [0.084, 0.062]]
        .map(([x, z]) => [cyl(0.0, 0.012, 0.035, S), [x, 0.207, z]])
    ]),
    'arch-gate': () => mergeParts([
      [box(0.2, 0.026, 0.072), [0, 0.213, 0]],
      ...[-0.078, 0.078].map(x => [box(0.045, 0.21, 0.072), [x, 0.105, 0]]),
      [new THREE.TorusGeometry(0.056, 0.016, 6, 14, Math.PI), [0, 0.14, 0]],
      ...[-0.078, 0.078].map(x => [cyl(0.0, 0.03, 0.05, S), [x, 0.238, 0]])
    ]),
    'podium-towers': () => mergeParts([
      [box(0.17, 0.035, 0.09), [0, 0.017, 0]],
      ...[-0.05, 0.0, 0.05].map((x, i) => [box(0.032, 0.2 + i * 0.03, 0.032), [x, 0.035 + (0.2 + i * 0.03) / 2, 0]]),
      [box(0.14, 0.014, 0.05), [0, 0.272, 0]]
    ]),
    'tower-round': () => mergeParts([
      [cyl(0.03, 0.044, 0.26, S), [0, 0.13, 0]],
      [cyl(0.056, 0.056, 0.03, S), [0, 0.242, 0]],
      [new THREE.SphereGeometry(0.042, S, S), [0, 0.282, 0], null, [1, 0.8, 1]],
      [cyl(0.002, 0.006, 0.05, 5), [0, 0.322, 0]]
    ]),
    'spire': () => mergeParts([
      [box(0.072, 0.14, 0.072), [0, 0.07, 0]],
      [cyl(0.014, 0.034, 0.1, S), [0, 0.19, 0]],
      [cyl(0.0, 0.018, 0.14, S), [0, 0.302, 0]],
      [new THREE.SphereGeometry(0.012, 6, 5), [0, 0.378, 0]]
    ]),
    'generic-tower': () => mergeParts([
      [box(0.07, 0.24, 0.07), [0, 0.12, 0]],
      [box(0.05, 0.05, 0.05), [0, 0.26, 0]],
      [cyl(0.002, 0.008, 0.07, 6), [0, 0.32, 0]]
    ])
  };
  for (const [k, make] of Object.entries(reg)) {
    LANDMARKS[k]?.dispose?.();
    LANDMARKS[k] = make();
  }
}

function labelTexture(text) {
  const pad = 22, fs = 44;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `600 ${fs}px "Public Sans", system-ui, sans-serif`;
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  const h = fs + pad * 1.4;
  return canvasTexture(THREE.MathUtils.ceilPowerOfTwo(w), THREE.MathUtils.ceilPowerOfTwo(h), (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = `#${new THREE.Color(PAL.land).getHexString()}`;
    const bx = (cw - w) / 2, by = (ch - h) / 2;
    g.fillRect(bx, by, w, h);
    g.fillStyle = '#ffffff';
    g.font = `600 ${fs}px "Public Sans", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 1);
  });
}

const markers = [];          // one per destination
const labelSprites = [];
let pinMesh = null, originPin = null;
const PIN_UP = new THREE.Vector3(0, 1, 0);

function pinGeometry() {
  const h = TUNING.scene.pinHeight;
  return mergeParts([
    [new THREE.ConeGeometry(0.036, h * 0.72, 10), [0, h * 0.36, 0], [Math.PI, 0, 0]],
    [new THREE.SphereGeometry(0.042, 12, 10), [0, h * 0.78, 0]]
  ]);
}

function activeDestinations() {
  return cfg.destinations.filter(d => d.enabled !== false);
}

function buildMarkers() {
  defineLandmarks(T.landmarkDetail);
  const dests = activeDestinations();

  // one instanced mesh for every destination pin
  const geo = pinGeometry();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, envMapIntensity: 0.8 });
  pinMesh = new THREE.InstancedMesh(geo, mat, Math.max(1, dests.length));
  pinMesh.name = 'destination-pins';
  pinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pinMesh.count = dests.length;
  globeSpin.add(pinMesh);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3();

  dests.forEach((d, i) => {
    const base = ll2v(d.lat, d.lon, R * 1.012);
    up.copy(base).normalize();
    q.setFromUnitVectors(PIN_UP, up);
    m.compose(base, q, s);
    pinMesh.setMatrixAt(i, m);
    pinMesh.setColorAt(i, tmpC.set(PAL.pin));

    // the landmark proxy, standing on the surface beside the pin
    const lm = new THREE.Mesh(LANDMARKS[d.landmark] || LANDMARKS['generic-tower'], MAT.landmark);
    lm.name = `landmark-${d.code}`;
    const lmBase = ll2v(d.lat, d.lon, R * 1.004);
    lm.position.copy(lmBase);
    lm.quaternion.copy(q);
    lm.scale.setScalar(0.92);
    globeSpin.add(lm);

    // the billboarded country label, hidden until hover or focus
    const tex = labelTexture(d.label);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false
    }));
    sprite.name = `label-${d.code}`;
    sprite.renderOrder = 6;
    sprite.position.copy(ll2v(d.lat, d.lon, R * 1.06));
    sprite.center.set(0.5, -0.45);               // always above its pin, on screen
    const aspect = tex.image.width / tex.image.height;
    sprite.scale.set(0.46 * aspect, 0.46, 1);
    sprite.visible = false;
    globeSpin.add(sprite);
    labelSprites.push({
      sprite,
      refresh() {
        sprite.material.map.dispose();
        sprite.material.map = labelTexture(d.label);
        sprite.material.needsUpdate = true;
      }
    });

    markers.push({
      dest: d, index: i, landmark: lm, sprite, base, quat: q.clone(),
      scale: 1, scaleTarget: 1, labelOpacity: 0, labelTarget: 0, hot: false
    });
  });

  pinMesh.instanceMatrix.needsUpdate = true;
  if (pinMesh.instanceColor) pinMesh.instanceColor.needsUpdate = true;

  // the origin: an accent pin, larger, with a ring at its foot
  originPin = new THREE.Group();
  originPin.name = 'origin-pin';
  const op = new THREE.Mesh(pinGeometry(), MAT.origin);
  op.scale.setScalar(1.22);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.072, 0.009, 6, 20),
    MAT.origin
  );
  ring.rotation.x = Math.PI / 2;
  originPin.add(op, ring);
  const ob = ll2v(cfg.origin.lat, cfg.origin.lon, R * 1.012);
  originPin.position.copy(ob);
  originPin.quaternion.setFromUnitVectors(PIN_UP, ob.clone().normalize());
  globeSpin.add(originPin);
}

/* ====================================================================== *
 *  12.  DOCUMENTS — the visa-processing half of the story                *
 *                                                                        *
 *  The passport is closed, the sheet is blank and the seal is a plain    *
 *  ring. Nothing here states or implies an outcome: that is a licensing  *
 *  constraint for a visa agency, not a style choice.                     *
 * ====================================================================== */

const documents = [];

function buildPassport() {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.042), MAT.cover);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.278, 0.4, 0.03), MAT.paperEdge);
  pages.position.z = 0.004;
  g.add(cover, pages);
  return g;
}

function buildBoardingPass() {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.25), MAT.pass);
  card.position.z = 0.005;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.25, 0.008), MAT.paperEdge);
  g.add(card, back);
  return g;
}

function buildCap() {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(cyl(0.1, 0.112, 0.07, 14), MAT.cap);
  crown.position.y = -0.02;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.34), MAT.cap);
  board.position.y = 0.025;
  board.rotation.y = Math.PI / 4;
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), MAT.planeAcc);
  button.position.y = 0.04;
  const tasselArm = new THREE.Mesh(cyl(0.004, 0.004, 0.18, 5), MAT.planeAcc);
  tasselArm.position.set(0.1, -0.03, 0.1);
  tasselArm.rotation.z = 0.3;
  g.add(crown, board, button, tasselArm);
  return g;
}

function buildBooks() {
  const g = new THREE.Group();
  const sizes = [[0.34, 0.055, 0.24], [0.31, 0.05, 0.22], [0.28, 0.045, 0.2]];
  let y = 0;
  sizes.forEach((s, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(...s), i === 1 ? MAT.bookAlt : MAT.book);
    b.position.y = y; b.rotation.y = (i - 1) * 0.18;
    g.add(b);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(s[0] * 0.93, s[1] * 0.7, s[2] * 0.93), MAT.paperEdge);
    leaf.position.set(s[0] * 0.02, y, 0); leaf.rotation.y = b.rotation.y;
    g.add(leaf);
    y += s[1] + 0.008;
  });
  g.position.y = -y / 2;
  return g;
}

function buildOfferSheet() {
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), MAT.paper);
  sheet.position.z = 0.005;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.007), MAT.paperEdge);
  g.add(sheet, slab);
  g.rotation.z = 0.12;
  return g;
}

function buildSuitcase() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.14), MAT.case);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.305, 0.03, 0.145), MAT.planeAcc);
  band.position.y = 0.06;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 5, 12, Math.PI), MAT.metal);
  handle.position.y = 0.22;
  const wheels = [-1, 1].map(s => {
    const w = new THREE.Mesh(cyl(0.028, 0.028, 0.022, 10), MAT.metal);
    w.rotation.z = Math.PI / 2;
    w.position.set(s * 0.105, -0.22, 0.02);
    return w;
  });
  g.add(body, band, handle, ...wheels);
  return g;
}

function buildDocuments() {
  const defs = [
    { name: 'passport',      make: buildPassport,    radius: 1.00, speed: 1, tiltDeg: -34, phase: 0.00, bobCycles: 1, spinCycles: 1, faceTilt: -0.18, scale: 1.08 },
    { name: 'boarding-pass', make: buildBoardingPass, radius: 1.12, speed: 2, tiltDeg:  29, phase: 0.18, bobCycles: 2, spinCycles: 1, faceTilt:  0.24, scale: 1.00 },
    { name: 'graduation-cap',make: buildCap,          radius: 0.94, speed: 1, tiltDeg:  14, phase: 0.36, bobCycles: 2, spinCycles: 1, faceTilt:  0.30, scale: 0.98 },
    { name: 'books',         make: buildBooks,        radius: 1.08, speed: 1, tiltDeg: -25, phase: 0.54, bobCycles: 1, spinCycles: 1, faceTilt:  0.26, scale: 0.96 },
    { name: 'offer-letter',  make: buildOfferSheet,   radius: 0.98, speed: 2, tiltDeg:  38, phase: 0.72, bobCycles: 1, spinCycles: 1, faceTilt: -0.22, scale: 1.00 },
    { name: 'suitcase',      make: buildSuitcase,     radius: 1.16, speed: 1, tiltDeg: -17, phase: 0.88, bobCycles: 2, spinCycles: 1, faceTilt:  0.14, scale: 0.94 }
  ];

  for (const d of defs) {
    const pivot = new THREE.Group();          // carries the orbit
    pivot.name = `doc-${d.name}`;
    pivot.rotation.z = THREE.MathUtils.degToRad(d.tiltDeg);
    const holder = new THREE.Group();         // carries hover lift and spin
    const body = d.make();
    body.scale.setScalar(d.scale);
    holder.add(body);
    pivot.add(holder);
    L.documents.add(pivot);
    documents.push({
      ...d, pivot, holder, body,
      lift: 0, liftTarget: 0,
      spinLag: 0,
      deflect: new THREE.Vector2(),
      gather: 0, gatherTarget: 0,
      home: new THREE.Vector3()
    });
  }
}

/* ====================================================================== *
 *  13.  PARTICLES — starfield and bokeh                                  *
 * ====================================================================== */

let starPoints = null;
const bokeh = [];

function buildParticles() {
  const n = T.stars;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    // a slab well behind the globe, wider than the frame at any aspect
    pos[i * 3]     = (rand() - 0.5) * 26;
    pos[i * 3 + 1] = (rand() - 0.5) * 15;
    pos[i * 3 + 2] = -4 - rand() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starPoints = new THREE.Points(geo, MAT.star);
  starPoints.name = 'starfield';
  starPoints.frustumCulled = false;
  L.stars.add(starPoints);

  for (let i = 0; i < T.bokeh; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.bokeh, color: PAL.bokeh, transparent: true,
      opacity: 0.1 + rand() * 0.1, depthWrite: false, depthTest: false,
      blending: THREE.NormalBlending
    }));
    s.name = `bokeh-${i + 1}`;
    const size = 1.1 + rand() * 2.0;
    s.scale.set(size, size, 1);
    s.renderOrder = 8;
    const home = new THREE.Vector3((rand() - 0.5) * 7.5, (rand() - 0.5) * 4.2, 2.4 + rand() * 1.2);
    s.position.copy(home);
    L.bokeh.add(s);
    bokeh.push({ sprite: s, home, cycles: 1 + Math.round(rand()), phase: rand(), amp: 0.14 + rand() * 0.2 });
  }
}

/* ====================================================================== *
 *  14.  AIRCRAFT — one plane, traversing one arc at a time               *
 * ====================================================================== */

let plane = null;
const planeState = { arc: 0, roll: 0, rollTarget: 0, opacity: 0, armed: true };

function buildPlane() {
  const g = new THREE.Group();
  g.name = 'aircraft';
  const body = new THREE.Mesh(cyl(0.013, 0.022, 0.13, 7), MAT.plane);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.05, 7), MAT.plane);
  nose.rotation.x = Math.PI / 2; nose.position.z = 0.088;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.036), MAT.plane);
  wing.position.z = -0.004;
  const tailW = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.005, 0.02), MAT.planeAcc);
  tailW.position.z = -0.058;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.034, 0.03), MAT.planeAcc);
  fin.position.set(0, 0.018, -0.056);
  g.add(body, nose, wing, tailW, fin);

  plane = new THREE.Group();
  plane.add(g);
  plane.name = 'aircraft-carrier';
  globeSpin.add(plane);
}

/* ---- the skyline: a building per city, in one draw call --------------- *
 *
 *  The destination landmarks are separate meshes because each one scales
 *  on hover. These never move, so there is no reason for them to be
 *  separate: every proxy is transformed onto its own patch of sphere at
 *  build time and merged into a single geometry. Thirty-odd buildings for
 *  one draw call is the whole argument.
 */
let skyline = null;

function buildSkyline() {
  if (!TUNING.globe.skyline || !T.landmarkDetail) return;
  const taken = activeDestinations().map(d => ll2v(d.lat, d.lon, 1).normalize());
  taken.push(ll2v(cfg.origin.lat, cfg.origin.lon, 1).normalize());
  const clear = TUNING.globe.skylineClearDeg * DEG;

  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3().setScalar(TUNING.globe.skylineScale);
  const m = new THREE.Matrix4();
  const parts = [];

  for (const [key, shape] of SKYLINE) {
    const city = CITY[key];
    if (!city) continue;
    const dir = ll2v(city[1], city[2], 1).normalize();
    // a pin already stands there; two buildings in one place reads as a fault
    if (taken.some(t => t.angleTo(dir) < clear)) continue;
    const src = LANDMARKS[shape] || LANDMARKS['generic-tower'];
    if (!src) continue;
    const g = src.clone();
    q.setFromUnitVectors(up, dir);
    pos.copy(dir).multiplyScalar(R * TUNING.globe.skylineLift);
    g.applyMatrix4(m.compose(pos, q, scl));
    parts.push(g);
  }
  if (!parts.length) return;

  const merged = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  skyline = new THREE.Mesh(merged, MAT.skyline);
  skyline.name = 'skyline';
  globeSpin.add(skyline);
}

/* ---- background air traffic ------------------------------------------ *
 *
 *  The agency's own eight arcs are the message. These are the world the
 *  message sits in, so they are thinner, dimmer, and merged into one
 *  geometry with one material: a per-vertex phase attribute gives each
 *  route its own pulse without giving it its own draw call.
 */
const TRAFFIC_VERT = `
  attribute float aPhase;
  varying vec2  vUv;
  varying float vPhase;
  varying float vFace;
  void main() {
    vUv = uv;
    vPhase = aPhase;
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vFace = dot(normalize(wp - centre), normalize(cameraPosition - wp));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const TRAFFIC_FRAG = `
  uniform vec3  uBase;
  uniform vec3  uGlow;
  uniform float uHead;
  uniform float uOpacity;
  varying vec2  vUv;
  varying float vPhase;
  varying float vFace;
  void main() {
    float d = fract(vUv.x - fract(uHead + vPhase));
    float g = smoothstep(0.2, 0.0, d);
    // the far half of every route is behind the globe; fading it toward
    // the limb keeps the occlusion from reading as a hard cut
    float limb = smoothstep(-0.02, 0.3, vFace);
    gl_FragColor = vec4(mix(uBase, uGlow, g), (0.18 + 0.52 * g) * uOpacity * limb);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

let traffic = null;              // { mesh, mat, curves }

function buildTraffic() {
  const want = TUNING.globe.traffic | 0;
  if (!want) return;
  const geos = [], curves = [];
  for (const [a, b] of ROUTES) {
    if (curves.length >= want) break;
    const ca = CITY[a], cb = CITY[b];
    if (!ca || !cb) continue;
    const curve = arcCurve({ lat: ca[1], lon: ca[2] }, { lat: cb[1], lon: cb[2] });
    const g = new THREE.TubeGeometry(curve, Math.max(28, T.arcSegments), TUNING.globe.trafficTubeRadius, 5, false);
    // the golden ratio, so no two routes pulse together and the set never
    // falls into a visible pattern however many of them there are
    const phase = ((curves.length + 1) * 0.6180339887) % 1;
    g.setAttribute('aPhase', new THREE.BufferAttribute(
      new Float32Array(g.attributes.position.count).fill(phase), 1));
    geos.push(g);
    curves.push(curve);
  }
  if (!geos.length) return;

  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const mat = new THREE.ShaderMaterial({
    vertexShader: TRAFFIC_VERT, fragmentShader: TRAFFIC_FRAG,
    transparent: true, depthWrite: false,
    uniforms: {
      uBase:    { value: new THREE.Color(PAL.traffic) },
      uGlow:    { value: new THREE.Color(PAL.trafficGlow) },
      uHead:    { value: 0 },
      uOpacity: { value: TUNING.globe.trafficOpacity }
    }
  });
  const mesh = new THREE.Mesh(merged, mat);
  mesh.name = 'traffic';
  mesh.renderOrder = 1;                       // under the destination arcs
  globeSpin.add(mesh);
  traffic = { mesh, mat, curves };
}

/* ---- the fleet -------------------------------------------------------- *
 *
 *  One aircraft follows the selected destination arc and is the one the
 *  eye is meant to track. The rest of the sky is this: a handful of planes
 *  on the background routes, two instanced meshes between them, so the
 *  whole fleet costs two draw calls whatever the tier allows.
 */
let fleet = null;                // { body, accent }
const fleetState = [];

/** The aircraft as two merged geometries rather than five meshes: the
 *  shell in the light tint, the tail surfaces in the accent. */
function planeGeometries() {
  return {
    body: mergeParts([
      [cyl(0.013, 0.022, 0.13, 7), [0, 0, 0], [Math.PI / 2, 0, 0]],
      [new THREE.ConeGeometry(0.013, 0.05, 7), [0, 0, 0.088], [Math.PI / 2, 0, 0]],
      [box(0.17, 0.006, 0.036), [0, 0, -0.004]]
    ]),
    accent: mergeParts([
      [box(0.062, 0.005, 0.02), [0, 0, -0.058]],
      [box(0.005, 0.034, 0.03), [0, 0.018, -0.056]]
    ])
  };
}

function buildFleet() {
  fleetState.length = 0;
  const n = Math.min(T.fleet | 0, traffic ? traffic.curves.length : 0);
  if (!n) return;

  const { body, accent } = planeGeometries();
  const bodyMesh = new THREE.InstancedMesh(body, MAT.plane, n);
  const accentMesh = new THREE.InstancedMesh(accent, MAT.planeAcc, n);
  bodyMesh.name = 'fleet';
  accentMesh.name = 'fleet-accent';
  bodyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  accentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodyMesh.frustumCulled = false;
  accentMesh.frustumCulled = false;

  // The routes are spread across the list rather than taken from the front,
  // so a fleet of two does not put both planes over the Atlantic.
  const step = Math.max(1, Math.floor(traffic.curves.length / n));
  for (let i = 0; i < n; i++) {
    fleetState.push({
      curve: traffic.curves[(i * step) % traffic.curves.length],
      // whole cycles per loop only: a fractional speed would leave the
      // plane somewhere else at the end of the loop than at its start,
      // and the capture would stop closing
      speed: 1 + (i % 2),
      phase: (i * 0.4142135624) % 1,
      scale: 0.72 + 0.18 * ((i * 7) % 3) / 2
    });
  }
  globeSpin.add(bodyMesh, accentMesh);
  fleet = { body: bodyMesh, accent: accentMesh };
  updateFleet(0);
}

const _fleetPos = new THREE.Vector3();
const _fleetAhead = new THREE.Vector3();
const _fleetX = new THREE.Vector3();
const _fleetY = new THREE.Vector3();
const _fleetZ = new THREE.Vector3();
const _fleetM = new THREE.Matrix4();
const _fleetQ = new THREE.Quaternion();
const _fleetS = new THREE.Vector3();

/** Position and orient the whole fleet for one point in the loop. The
 *  basis is built by hand for the same reason the single aircraft's is:
 *  lookAt works in world space, and the globe is both tilted and turning. */
function updateFleet(u) {
  if (!fleet) return;
  for (let i = 0; i < fleetState.length; i++) {
    const f = fleetState[i];
    const t = ((u * f.speed + f.phase) % 1 + 1) % 1;
    f.curve.getPointAt(THREE.MathUtils.clamp(t, 0.0005, 0.9995), _fleetPos);
    f.curve.getPointAt(THREE.MathUtils.clamp(t + 0.01, 0.0005, 0.9995), _fleetAhead);
    _fleetZ.subVectors(_fleetAhead, _fleetPos).normalize();
    _fleetY.copy(_fleetPos).normalize();
    _fleetX.crossVectors(_fleetY, _fleetZ).normalize();
    _fleetY.crossVectors(_fleetZ, _fleetX);
    _fleetM.makeBasis(_fleetX, _fleetY, _fleetZ);
    _fleetQ.setFromRotationMatrix(_fleetM);
    // a plane that pops into being at the start of its route reads as a
    // glitch; growing out of nothing and back reads as distance
    const fade = Math.sin(Math.PI * t);
    _fleetS.setScalar(Math.max(0.0001, f.scale * fade * fade));
    _fleetM.compose(_fleetPos, _fleetQ, _fleetS);
    fleet.body.setMatrixAt(i, _fleetM);
    fleet.accent.setMatrixAt(i, _fleetM);
  }
  fleet.body.instanceMatrix.needsUpdate = true;
  fleet.accent.instanceMatrix.needsUpdate = true;
}

/* ---- identify: what did I just click on? ------------------------------ *
 *
 *  The answer has to ride the globe, not the screen: a chip pinned to the
 *  page would slide off the place it names the moment the globe turned.
 *  So the readout is a ring on the surface and a billboard above it,
 *  parented to the spin group like every other marker, and the same text
 *  goes to a live region for anyone not looking at the canvas.
 */
let pick = null;                 // { group, sprite, mat, until, label }
const _pickV = new THREE.Vector3();

/** Two lines on one plate: the name large, the coordinates under it. */
function readoutTexture(title, sub) {
  const pad = 24, fs = 46, fs2 = 30, gap = 10;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `700 ${fs}px "Public Sans", system-ui, sans-serif`;
  const w1 = probe.measureText(title).width;
  probe.font = `500 ${fs2}px "Public Sans", system-ui, sans-serif`;
  const w2 = probe.measureText(sub).width;
  const w = Math.ceil(Math.max(w1, w2)) + pad * 2;
  const h = Math.ceil(fs + gap + fs2 + pad * 1.5);

  const tex = canvasTexture(THREE.MathUtils.ceilPowerOfTwo(w), THREE.MathUtils.ceilPowerOfTwo(h), (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch);
    const bx = (cw - w) / 2, by = (ch - h) / 2;
    g.fillStyle = `#${new THREE.Color(PAL.ink).getHexString()}`;
    g.fillRect(bx, by, w, h);
    g.fillStyle = `#${new THREE.Color(PAL.accent).getHexString()}`;
    g.fillRect(bx, by + h - 5, w, 5);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.font = `700 ${fs}px "Public Sans", system-ui, sans-serif`;
    g.fillText(title, cw / 2, by + pad * 0.75 + fs / 2);
    g.globalAlpha = 0.78;
    g.font = `500 ${fs2}px "Public Sans", system-ui, sans-serif`;
    g.fillText(sub, cw / 2, by + pad * 0.75 + fs + gap + fs2 / 2);
    g.globalAlpha = 1;
  });
  tex.userData = { w, h };
  return tex;
}

function disposePick() {
  if (!pick) return;
  pick.group.traverse(o => {
    if (o.geometry && !o.isSprite) o.geometry.dispose();
    if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
  });
  pick.group.removeFromParent();
  pick = null;
}

/** Drop the readout on a latitude and longitude and start its clock. */
function showPick(lat, lon, title, sub) {
  disposePick();
  const group = new THREE.Group();
  group.name = 'pick';

  const base = ll2v(lat, lon, R * 1.002);
  const up = base.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(PIN_UP, up);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 22), MAT.pick);
  ring.position.copy(base);
  ring.quaternion.copy(q);
  ring.rotateX(Math.PI / 2);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), MAT.pick);
  dot.position.copy(ll2v(lat, lon, R * 1.03));

  const tex = readoutTexture(title, sub);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 1, depthTest: false, depthWrite: false
  }));
  sprite.renderOrder = 7;
  /* Anchored just off the surface and offset upward on screen rather than
   * pushed out along the radius: a radial offset is foreshortened to
   * nothing in the middle of the disc, which is exactly where it put the
   * plate on top of the ring it was naming. */
  sprite.position.copy(ll2v(lat, lon, R * 1.05));
  sprite.center.set(0.5, -0.62);
  const aspect = tex.image.width / tex.image.height;
  sprite.scale.set(0.46 * aspect, 0.46, 1);

  group.add(ring, dot, sprite);
  globeSpin.add(group);
  pick = { group, sprite, base, label: title,
           until: sceneState.elapsed + TUNING.globe.pickSeconds };
}

/** The readout fades out on its own. Nothing a visitor pokes at should
 *  need a second poke to put it away. */
function updatePick(dt) {
  if (!pick) return;
  const left = pick.until - sceneState.elapsed;
  if (left <= 0) { disposePick(); return; }
  const a = THREE.MathUtils.clamp(left / 0.6, 0, 1);
  pick.sprite.visible = facesCamera(pick.base);
  pick.sprite.material.opacity = a;
  pick.group.traverse(o => {
    if (o.isMesh && o.material.transparent) o.material.opacity = a * TUNING.globe.pickOpacity;
  });
}

/** A world-space hit on the globe, named. */
function identifyAt(point) {
  globeSpin.worldToLocal(_pickV.copy(point));
  const { lat, lon } = v2ll(_pickV);
  const hit = COUNTRY_LOOKUP.length ? countryAt(lat, lon) : null;
  const title = hit ? hit.name : waterAt(lat, lon);
  const sub = formatLatLon(lat, lon);
  showPick(lat, lon, title, sub);
  announce(`${title}. ${sub}.`);
  window.dispatchEvent(new CustomEvent('globe:identify', {
    detail: { name: title, country: hit ? hit.name : null, iso: hit ? hit.id : null, lat: +lat.toFixed(4), lon: +lon.toFixed(4) }
  }));
  return title;
}

/** Say it once, to whoever is listening rather than looking. */
function announce(text) {
  if (!ui.readout) return;
  ui.readout.textContent = text;
}

/* ====================================================================== *
 *  15.  CHARACTER — optional, high tier only, off by default             *
 *                                                                        *
 *  Deliberately abstract: a clay figure in the neutral tint, modest in   *
 *  dress and non-specific in features, so the scene does not default to  *
 *  one gender or one skin tone. Procedural, so there is no rig to load.  *
 * ====================================================================== */

let character = null;

function buildCharacter() {
  const g = new THREE.Group();
  g.name = 'student';

  const island = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.2, 9), MAT.island);
  const islandBase = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 9), MAT.island);
  islandBase.position.y = -0.3; islandBase.rotation.x = Math.PI;
  island.add(islandBase);

  const figure = new THREE.Group();
  const coat = new THREE.Mesh(cyl(0.085, 0.115, 0.3, 10), MAT.figure);
  coat.position.y = 0.26;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), MAT.figure);
  head.position.y = 0.48;
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.07), MAT.book);
  bag.position.set(0, 0.28, -0.1);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 5, 12, Math.PI), MAT.book);
  strap.position.y = 0.37; strap.rotation.x = Math.PI / 2; strap.rotation.z = Math.PI;
  figure.add(coat, head, bag, strap);
  figure.position.y = 0.1;

  g.add(island, figure);
  g.position.set(-2.55, -1.5, 1.5);
  g.scale.setScalar(0.92);
  L.documents.add(g);
  character = { group: g, figure, island };
}

/* ====================================================================== *
 *  16.  THE LOOP CLOCK AND THE IDLE CURVES                               *
 *                                                                        *
 *  One clock runs from scene start and is never reset:                   *
 *      u = (elapsed % loopSeconds) / loopSeconds,  in [0, 1)             *
 *  Every idle animation is a pure function of u, and each completes a    *
 *  whole number of cycles over the loop, so frame 0 and the frame one    *
 *  loop later are the same image. sin(u * 2PI * n) with integer n is     *
 *  loop-safe; sin(elapsed * 1.7) is not.                                 *
 *                                                                        *
 *  A continuously spinning globe is the single most common reason a      *
 *  hero loop cannot close, so the globe oscillates instead.              *
 * ====================================================================== */

const TAU = Math.PI * 2;
const clock = new THREE.Clock();

const sceneState = {
  elapsed: 0,
  u: 0,
  frame: 0,
  ready: false,
  idleMix: 0,                 // 1 = fully idle; live offsets are scaled by 1 - idleMix
  lastInput: 0,
  running: false,
  tweening: false,
  destroyed: false
};

/** Frame-rate independent easing. dt is clamped by the caller so a
 *  backgrounded tab cannot jump the scene on return. */
const ease = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.pow(1 - k, dt * 60));

const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ====================================================================== *
 *  17.  INPUT — pointer, drag, raycast, keyboard, idle timer             *
 *                                                                        *
 *  Every input writes to a target; the render loop eases the current     *
 *  value toward it. No handler drives a transform and none calls         *
 *  render().                                                             *
 * ====================================================================== */

const input = {
  ndc: new THREE.Vector2(),            // pointer in -1..1
  parallax: new THREE.Vector2(),       // eased toward ndc
  lightPos: new THREE.Vector3(),
  hovered: null,
  hoveredDoc: null,
  selected: null,

  dragging: false,
  pointerId: null,
  downAt: 0,
  downPos: new THREE.Vector2(),
  moved: false,
  lastX: 0,
  lastY: 0,
  pointerType: 'mouse',
  keying: false,
  spinVelocity: 0,
  spinOffset: 0,
  spinOffsetTarget: 0,
  tiltOffset: 0,
  tiltTarget: 0,
  recovering: false,

  tween: null
};

let neutralSpin = 0;                   // the composed shot, and the loop's anchor
/* How far the globe may be pitched. Past ninety the world is upside down,
 * which is not a view of anything: it is the moment the control stops
 * reading as a globe and starts reading as a fault. */
const PITCH_LIMIT = THREE.MathUtils.degToRad(TUNING.drag.pitchClampDeg);

const interactables = [];
const raycaster = new THREE.Raycaster();
let frameCounter = 0, lastRayAt = 0;

function markInput() {
  sceneState.lastInput = sceneState.elapsed;
}

/* ---- pointer parallax, always on ------------------------------------- */

function onPointerMove(ev) {
  if (CAPTURE) return;
  const r = canvas.getBoundingClientRect();
  input.ndc.set(
    ((ev.clientX - r.left) / r.width) * 2 - 1,
    -((ev.clientY - r.top) / r.height) * 2 + 1
  );
  markInput();

  if (input.dragging && ev.pointerId === input.pointerId) {
    const dx = ev.clientX - input.lastX;
    const dy = ev.clientY - input.lastY;
    input.lastX = ev.clientX;
    input.lastY = ev.clientY;
    if (!input.moved && Math.hypot(ev.clientX - input.downPos.x, ev.clientY - input.downPos.y) > TUNING.drag.pxThreshold) {
      input.moved = true;
    }
    if (input.moved) {
      const d = dx * TUNING.drag.sensitivity;
      input.spinOffsetTarget += d;
      input.spinVelocity = d;
      /* Latitude as well as longitude -- but on a mouse or a pen only.
       * The canvas keeps touch-action: pan-y so a thumb can still scroll
       * the page past the hero, and taking that away to win a second axis
       * would trap a phone reader inside the globe. */
      if (input.pointerType !== 'touch') {
        input.tiltTarget = THREE.MathUtils.clamp(
          input.tiltTarget + dy * TUNING.drag.pitchSensitivity, -PITCH_LIMIT, PITCH_LIMIT);
      }
      input.recovering = false;
      input.keying = false;
    }
  }
}

function onPointerDown(ev) {
  if (CAPTURE || !ev.isPrimary || ev.button !== 0) return;
  input.dragging = true;
  input.pointerId = ev.pointerId;
  input.downAt = performance.now();
  input.downPos.set(ev.clientX, ev.clientY);
  input.lastX = ev.clientX;
  input.lastY = ev.clientY;
  input.pointerType = ev.pointerType || 'mouse';
  input.moved = false;
  input.keying = false;
  input.spinVelocity = 0;
  markInput();
}

function onPointerUp(ev) {
  if (!input.dragging || ev.pointerId !== input.pointerId) return;
  const held = performance.now() - input.downAt;
  input.dragging = false;
  input.pointerId = null;
  markInput();

  // a click is short and still; anything else was a drag
  if (!input.moved && held < TUNING.drag.msThreshold) {
    handleClick();
  } else {
    input.recovering = true;         // inertia decays, then the shot recovers
  }
}

function onPointerCancel() {
  input.dragging = false;
  input.pointerId = null;
}

/* ---- hover ----------------------------------------------------------- */

function updateHover(now) {
  if (CAPTURE || input.dragging) return;
  frameCounter++;
  if (frameCounter % TUNING.hover.everyNFrames) return;
  if (now - lastRayAt < TUNING.hover.throttleMs) return;
  lastRayAt = now;

  raycaster.setFromCamera(input.ndc, camera);
  // hysteresis: a pin already held keeps a wider catchment than it needed
  // to be caught, so one at the edge of the ray cannot strobe its label
  raycaster.params.Points.threshold = 0.1;
  const hits = raycaster.intersectObjects(interactables, true);

  let marker = null, doc = null;
  for (const hit of hits) {
    if (hit.object === pinMesh && hit.instanceId !== undefined) {
      marker = markers[hit.instanceId] || null;
      break;
    }
    const m = markers.find(mk => mk.landmark === hit.object);
    if (m) { marker = m; break; }
    const d = documents.find(dd => isDescendant(hit.object, dd.pivot));
    if (d) { doc = d; break; }
  }

  // widen the catchment for whatever is already hovered
  if (!marker && input.hovered) {
    const keep = raycaster.ray.distanceToPoint(worldOf(input.hovered)) <
                 TUNING.hover.exitRadius * 0.14;
    if (keep) marker = input.hovered;
  }

  if (marker !== input.hovered) {
    if (input.hovered) setMarkerHot(input.hovered, false);
    input.hovered = marker;
    if (marker) setMarkerHot(marker, true);
    canvas.style.cursor = marker ? 'pointer' : '';
  }
  if (doc !== input.hoveredDoc) {
    if (input.hoveredDoc) input.hoveredDoc.liftTarget = 0;
    input.hoveredDoc = doc;
    if (doc) doc.liftTarget = TUNING.hover.documentLift;
  }
}

const _w = new THREE.Vector3();
const worldOf = marker => globeSpin.localToWorld(_w.copy(marker.base));

function isDescendant(node, root) {
  for (let p = node; p; p = p.parent) if (p === root) return true;
  return false;
}

function setMarkerHot(marker, hot) {
  marker.hot = hot;
  marker.scaleTarget = hot ? TUNING.hover.pinScale : 1;
  marker.labelTarget = hot || input.selected === marker ? 1 : 0;
  const arc = arcs.find(a => a.dest.code === marker.dest.code);
  if (arc) arc.boostTarget = hot ? TUNING.hover.arcBoostPulse : 1;
  pinMesh.setColorAt(marker.index, tmpC.set(hot || input.selected === marker ? PAL.accent : PAL.pin));
  pinMesh.instanceColor.needsUpdate = true;
}

/* ---- click and tap --------------------------------------------------- */

function handleClick() {
  if (sceneState.tweening) return;              // ignore clicks mid-tween
  if (input.hovered) {
    selectMarker(input.hovered);
  } else if (input.hoveredDoc) {
    gatherDocuments();
  } else if (!identifyUnderPointer()) {
    clearSelection();
  }
}
/** Raycast the globe itself and name what was hit. Returns false only when
 *  the click missed the sphere altogether, which is the one case left that
 *  still means "put everything away". The land cap is in the list as well
 *  as the ocean: near the limb the crust stands far enough proud of the
 *  water to answer with the wrong place if it is skipped. */
function identifyUnderPointer() {
  if (!TUNING.globe.identify || !globeMesh) return false;
  raycaster.setFromCamera(input.ndc, camera);
  const targets = landMesh ? [landMesh, globeMesh] : [globeMesh];
  const hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) return false;
  identifyAt(hits[0].point);
  return true;
}

/** Back to the composed shot. The globe no longer springs back on its own
 *  -- a hero that undoes the visitor's drag a second after they finish it
 *  is telling them not to touch it -- so the designed framing has to be
 *  reachable on purpose instead: Escape, or closing the destination card. */
function resetView() {
  input.tween = { from: input.spinOffset, to: 0, t: 0, ms: TUNING.camera.tweenMs };
  input.tiltTarget = 0;
  input.spinVelocity = 0;
  input.recovering = false;
  input.keying = false;
  sceneState.tweening = true;
}


function shortestAngle(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function selectMarker(marker) {
  if (input.selected === marker) { clearSelection(); return; }
  if (input.selected) setMarkerHot(input.selected, false);
  input.selected = marker;
  setMarkerHot(marker, true);

  // tween the globe so the pin rotates to front-centre: driven rotation,
  // ease-in-out cubic, never a snap
  const from = input.spinOffset;
  // a pin cannot be brought to front-centre while the globe is still
  // pitched over, so the tilt goes back with the spin
  input.tiltTarget = 0;
  const want = lonToSpin(marker.dest.lon) - neutralSpin;
  const to = from + shortestAngle(from, want);
  input.tween = { from, to, t: 0, ms: TUNING.camera.tweenMs };
  sceneState.tweening = true;
  input.recovering = false;
  input.spinVelocity = 0;

  // redraw this arc from the origin as a growing line
  const arc = arcs.find(a => a.dest.code === marker.dest.code);
  if (arc) { arc.draw = 0; arc.drawTarget = 1; }

  openDestCard(marker.dest);
  dispatchSelect(marker.dest);
}

function clearSelection() {
  if (input.selected) {
    const prev = input.selected;
    input.selected = null;
    setMarkerHot(prev, prev === input.hovered);
  }
  closeDestCard();
  disposePick();
}

function dispatchSelect(dest) {
  const key = cfg.cta.payloadKey;
  window.dispatchEvent(new CustomEvent(cfg.cta.eventName, {
    detail: { [key]: dest[key], destination: { ...dest } }
  }));
}

/* The document cluster gathers into a neat stack, then fans out again.
 * The motion stays neutral: nothing here is a submission being approved. */
let gatherTimer = null;
function gatherDocuments() {
  for (const d of documents) d.gatherTarget = 1;
  clearTimeout(gatherTimer);
  gatherTimer = setTimeout(() => { for (const d of documents) d.gatherTarget = 0; }, 1500);
}

/* ---- keyboard and focus parity --------------------------------------- */

function onKeyDown(ev) {
  if (CAPTURE) return;
  if (ev.key === 'Escape') {
    markInput();
    if (input.selected) clearSelection();
    disposePick();
    resetView();
    return;
  }
  globeKey(ev);
}
/** Keyboard parity for the drag. It answers only while the focus is inside
 *  the stage -- the pin buttons live there and are what a keyboard visitor
 *  reaches first -- so the arrow keys still scroll the page everywhere
 *  else on it. */
function globeKey(ev) {
  if (!ui.hero || !ui.hero.contains(document.activeElement)) return false;
  const step = THREE.MathUtils.degToRad(TUNING.drag.keyStepDeg);
  switch (ev.key) {
    case 'ArrowLeft':  input.spinOffsetTarget -= step; break;
    case 'ArrowRight': input.spinOffsetTarget += step; break;
    case 'ArrowUp':
      input.tiltTarget = THREE.MathUtils.clamp(input.tiltTarget - step, -PITCH_LIMIT, PITCH_LIMIT); break;
    case 'ArrowDown':
      input.tiltTarget = THREE.MathUtils.clamp(input.tiltTarget + step, -PITCH_LIMIT, PITCH_LIMIT); break;
    default: return false;
  }
  ev.preventDefault();
  markInput();
  input.keying = true;
  input.recovering = false;
  input.tween = null;
  sceneState.tweening = false;
  return true;
}


/* ====================================================================== *
 *  18.  CAPTURE MODE — deterministic ?capture=1                          *
 *                                                                        *
 *  The clock is a frame counter rather than performance.now(), input is  *
 *  dead, the overlay is hidden, randomness is seeded and the canvas is   *
 *  locked to a fixed size at DPR 1. The exported video and the live      *
 *  idle loop are therefore the same animation, not two that drift.       *
 * ====================================================================== */

const capture = {
  active: CAPTURE,
  frame: 0,
  total: TUNING.capture.frames,
  width:  Number(QS.get('w')) || TUNING.capture.width,
  height: Number(QS.get('h')) || TUNING.capture.height
};

/** Step one deterministic frame. A harness (Puppeteer overriding rAF, or
 *  CCapture in the page) calls this; it never relies on the browser clock. */
function captureStep(frame) {
  capture.frame = frame;
  sceneState.elapsed = frame / TUNING.capture.fps;
  sceneState.u = (sceneState.elapsed % cfg.motion.loopSeconds) / cfg.motion.loopSeconds;
  sceneState.idleMix = 1;
  rand = mulberry32(0x5EED);
  updateScene(1 / TUNING.capture.fps, true);
  renderFrame();
}
window.__heroCaptureStep = captureStep;

/** Prove the loop closes without leaving the page: render frame 0 and
 *  frame 300 and report the largest per-channel difference. Anything
 *  above about 2 means a motion is not closing. */
async function runSelfTest() {
  const w = 480, h = 270;                      // a cheap but honest comparison
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); sizeBackdrop();

  const read = frame => {
    captureStep(frame);
    const buf = new Uint8Array(w * h * 4);
    const gl = renderer.getContext();
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return buf;
  };
  const a = read(0);
  const b = read(TUNING.capture.frames);

  let max = 0, sum = 0, n = 0;
  for (let i = 0; i < a.length; i++) {
    if (i % 4 === 3) continue;                 // alpha is not a channel we ship
    const d = Math.abs(a[i] - b[i]);
    if (d > max) max = d;
    sum += d; n++;
  }
  const result = { maxDelta: max, meanDelta: +(sum / n).toFixed(4), frames: `0 vs ${TUNING.capture.frames}`,
                   pass: max <= 2 };
  window.__heroLoopTest = result;
  console.log(`[hero] loop closure: max per-channel delta ${max}, mean ${result.meanDelta} — ${result.pass ? 'PASS' : 'FAIL'}`);
  return result;
}

/* ====================================================================== *
 *  19.  FRAMING AND RESIZE                                               *
 *                                                                        *
 *  One helper holds the globe at a constant screen-space size and keeps  *
 *  the safe zone clear from 21:9 down to 9:16, instead of scattering     *
 *  breakpoint tweaks through the scene.                                  *
 * ====================================================================== */

const GLOBE_FRAME_FRACTION = 0.60;      // of frame height, in landscape
const GLOBE_WIDTH_FRACTION = 0.86;      // of frame width, in portrait

function frameScene(w, h) {
  const aspect = w / h;
  const portrait = aspect < 1.05;

  camera.fov = portrait ? TUNING.camera.fovMobile : TUNING.camera.fovDesktop;
  camera.aspect = aspect;

  // The dolly that holds the globe at a constant screen-space size. On a
  // tall frame it is measured against the width instead: 60% of a 9:16
  // frame's height is wider than the frame, and the globe would overflow.
  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
  const dist = portrait
    ? R / (GLOBE_WIDTH_FRACTION * Math.tan(halfFov) * aspect)
    : R / (GLOBE_FRAME_FRACTION * Math.tan(halfFov));
  camera.position.z = dist;
  camera.updateProjectionMatrix();

  const vh = 2 * dist * Math.tan(halfFov);
  const vw = vh * aspect;

  if (portrait) {
    // the quiet band is the top 55%; the globe sits wholly beneath it,
    // and still clear of the bottom edge
    L.globe.position.x = 0;
    L.globe.position.y = Math.max(-0.05 * vh - R * 1.02, -vh / 2 + R * 0.72);
  } else {
    // the quiet band is the left 45%; the globe clears it and may bleed
    // a little off the right edge, which reads as deliberate
    const safeRight = -vw / 2 + 0.45 * vw;
    L.globe.position.x = Math.min(safeRight + R * 1.12, vw / 2 - R * 0.42);
    L.globe.position.y = -vh * 0.055;
  }

  // the documents orbit the globe, so they follow it -- offset to the
  // outside, so the near half of the orbit never crosses the safe zone
  L.documents.position.copy(L.globe.position);
  L.documents.position.x += portrait ? 0 : TUNING.scene.orbitOffsetX;
  L.documents.scale.setScalar(portrait ? 0.78 : 1);
  if (character) character.group.visible = !portrait;

  sizeBackdrop();
}

let resizeTimer = null, lastW = 0, lastH = 0;

function applySize() {
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, T.dpr));
  renderer.setSize(w, h, false);
  frameScene(w, h);
  fitHeadline();          // the measure changed, so the two-line fit must be re-solved
  layoutPinButtons();
  lastW = w; lastH = h;
}

const resizeObserver = new ResizeObserver(entries => {
  if (CAPTURE) return;
  const r = entries[0].contentRect;
  const w = Math.round(r.width), h = Math.round(r.height);
  // Mobile browsers fire a storm of height-only events as the URL bar
  // hides and shows. Reacting to each one makes the scene jitter while
  // the visitor is only scrolling.
  if (w === lastW && Math.abs(h - lastH) < 120) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applySize, 150);
});

/* ---- the scene never hijacks scroll ---------------------------------- */

const visibility = new IntersectionObserver(entries => {
  const visible = entries[0].isIntersecting;
  canvas.classList.toggle('ready', visible && sceneState.ready === true);
  if (visible) start(); else stop();
}, { threshold: 0.01 });

/* ====================================================================== *
 *  20.  THE FRAME                                                        *
 * ====================================================================== */

const _v3 = new THREE.Vector3();
const _planeUp = new THREE.Vector3();
const _planeX = new THREE.Vector3();
const _planeY = new THREE.Vector3();
const _planeM = new THREE.Matrix4();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

/** Is this point on the globe's own surface turned toward the camera?
 *  Labels are drawn with depthTest off so a billboard is never sliced by
 *  the pin under it, which means nothing else stops one on the far side
 *  from being drawn straight through the planet. This does. */
const _faceN = new THREE.Vector3();
const _faceP = new THREE.Vector3();
const _faceQ = new THREE.Quaternion();
function facesCamera(localPoint) {
  globeSpin.getWorldQuaternion(_faceQ);
  _faceN.copy(localPoint).normalize().applyQuaternion(_faceQ);
  globeSpin.localToWorld(_faceP.copy(localPoint));
  _faceP.subVectors(camera.position, _faceP);
  return _faceN.dot(_faceP) > 0;
}

function updateScene(dt, deterministic = false) {
  const live = 1 - sceneState.idleMix;
  const u = sceneState.u;
  const PS = cfg.motion.parallaxStrength;

  /* ---- parallax: small is correct ------------------------------------ */
  if (!deterministic) {
    input.parallax.x = ease(input.parallax.x, input.ndc.x, TUNING.parallax.ease, dt);
    input.parallax.y = ease(input.parallax.y, input.ndc.y, TUNING.parallax.ease, dt);
  } else {
    input.parallax.set(0, 0);
  }
  const yaw   = THREE.MathUtils.degToRad(TUNING.parallax.yawDeg)   * input.parallax.x * PS * live;
  const pitch = THREE.MathUtils.degToRad(TUNING.parallax.pitchDeg) * input.parallax.y * PS * live;

  // layers move at different rates; that difference is what sells depth
  for (const [key, rate] of Object.entries(TUNING.parallax.layers)) {
    const g = L[key];
    g.rotation.y = yaw * rate;
    g.rotation.x = -pitch * rate;
  }

  /* the soft light that follows the cursor across a plane in front */
  if (!deterministic) {
    const cl = TUNING.parallax.cursorLight;
    input.lightPos.set(input.ndc.x * 4.4, input.ndc.y * 2.6, cl.z);
    cursorLight.position.lerp(input.lightPos, 1 - Math.pow(1 - cl.ease, dt * 60));
    cursorLight.intensity = cl.intensity * live * PS;
  } else {
    cursorLight.intensity = 0;
  }

  /* ---- the globe: drag, inertia, recovery, idle swing ----------------- */
  if (!deterministic) {
    if (input.tween) {
      input.tween.t += dt * 1000 / input.tween.ms;
      if (input.tween.t >= 1) {
        input.spinOffset = input.tween.to;
        input.tween = null;
        sceneState.tweening = false;
      } else {
        const k = easeInOutCubic(input.tween.t);
        input.spinOffset = input.tween.from + (input.tween.to - input.tween.from) * k;
      }
      input.spinOffsetTarget = input.spinOffset;
    } else if (input.dragging || input.keying) {
      input.spinOffset = ease(input.spinOffset, input.spinOffsetTarget, 0.4, dt);
      if (input.keying && Math.abs(input.spinOffset - input.spinOffsetTarget) < 2e-4) input.keying = false;
    } else if (input.recovering) {
      // decay the throw, then ease the composition back to its anchor
      input.spinVelocity *= Math.pow(TUNING.drag.inertiaDecay, dt * 60);
      input.spinOffset += input.spinVelocity * dt * 60;
      if (Math.abs(input.spinVelocity) < TUNING.drag.stopBelow) {
        input.recovering = false;
        input.spinVelocity = 0;      // and there it stays: see TUNING.drag
      }
      input.spinOffsetTarget = input.spinOffset;
    }
    input.tiltOffset = ease(input.tiltOffset, input.tiltTarget, 0.1, dt);
  }

  const swing = Math.sin(u * TAU * TUNING.idle.globeCycles) *
                THREE.MathUtils.degToRad(TUNING.idle.globeSwingDeg);
  globeSpin.rotation.y = neutralSpin + input.spinOffset * (deterministic ? 0 : 1) +
                         swing * sceneState.idleMix;
  globeSpin.rotation.x = THREE.MathUtils.clamp(
    input.tiltOffset, -THREE.MathUtils.degToRad(TUNING.drag.pitchClampDeg),
    THREE.MathUtils.degToRad(TUNING.drag.pitchClampDeg)) * (deterministic ? 0 : 1);

  /* ---- pins: hover spring, label fade -------------------------------- */
  let pinsDirty = false;
  for (const m of markers) {
    const target = deterministic ? 1 : m.scaleTarget;
    const nextScale = ease(m.scale, target, TUNING.hover.springK, dt);
    if (Math.abs(nextScale - m.scale) > 0.0005) { m.scale = nextScale; pinsDirty = true; }
    _m4.compose(m.base, m.quat, _s.setScalar(m.scale));
    pinMesh.setMatrixAt(m.index, _m4);

    const lt = deterministic ? 0 : m.labelTarget;
    m.labelOpacity = ease(m.labelOpacity, lt, 0.18, dt);
    m.sprite.visible = m.labelOpacity > 0.01 && facesCamera(m.base);
    m.sprite.material.opacity = m.labelOpacity;
    m.landmark.scale.setScalar(0.92 + (m.scale - 1) * 0.5);
  }
  if (pinMesh && (pinsDirty || deterministic)) pinMesh.instanceMatrix.needsUpdate = true;

  /* ---- arcs: a pulse per arc, staggered so they never fire together --- */
  for (const a of arcs) {
    a.mat.uniforms.uHead.value = (u * TUNING.idle.arcCycles + a.phase) % 1;
    a.boost = deterministic ? 1 : ease(a.boost, a.boostTarget, 0.14, dt);
    a.mat.uniforms.uBoost.value = a.boost;
    a.draw = deterministic ? 1 : ease(a.draw, a.drawTarget, 0.1, dt);
    a.mat.uniforms.uDraw.value = Math.min(1, a.draw + 0.004);
  }

  /* ---- the aircraft: exactly one arc per loop ------------------------- */
  /* ---- the background traffic, the fleet, and the readout ------------- */
  if (traffic) traffic.mat.uniforms.uHead.value = (u * TUNING.idle.arcCycles) % 1;
  updateFleet(u);
  if (!deterministic) updatePick(dt);

  if (arcs.length && plane) {
    const arc = arcs[planeState.arc % arcs.length];
    const t = THREE.MathUtils.clamp(u, 0.001, 0.999);
    arc.curve.getPointAt(t, _v3);
    plane.position.copy(_v3);
    // Orient it inside the globe's own frame: lookAt() works in world space
    // and the globe is both tilted and spinning, so build the basis by hand.
    arc.curve.getPointAt(Math.min(0.999, t + 0.012), _w);
    const fwd = _w.sub(_v3).normalize();
    const rad = _planeUp.copy(_v3).normalize();
    _planeX.crossVectors(rad, fwd).normalize();
    _planeY.crossVectors(fwd, _planeX);
    _planeM.makeBasis(_planeX, _planeY, fwd);
    plane.quaternion.setFromRotationMatrix(_planeM);
    // fade in and out inside the loop, so the return is never seen
    const fi = THREE.MathUtils.smoothstep(u, 0, TUNING.idle.planeFadeIn);
    const fo = 1 - THREE.MathUtils.smoothstep(u, TUNING.idle.planeFadeOut, 1);
    planeState.opacity = Math.min(fi, fo);
    plane.visible = planeState.opacity > 0.02;
    plane.scale.setScalar(0.6 + 0.4 * planeState.opacity);
    planeState.roll = deterministic ? 0 : ease(planeState.roll, planeState.rollTarget, 0.1, dt);
    plane.children[0].rotation.z = planeState.roll;
    if (!deterministic && u > 0.97 && planeState.armed !== false) {
      planeState.arc = (planeState.arc + 1) % Math.max(1, arcs.length);
      planeState.armed = false;
    }
    if (u < 0.5) planeState.armed = true;
  }

  /* ---- orbiting documents -------------------------------------------- */
  documents.forEach((d, i) => {
    const angle = (u * d.speed + d.phase) * TAU;
    const bob = Math.sin((u * d.bobCycles + d.phase) * TAU) * TUNING.idle.bobAmplitude;
    const radius = TUNING.scene.documentRadius * d.radius;

    d.gather = deterministic ? 0 : ease(d.gather, d.gatherTarget, 0.08, dt);
    d.lift = deterministic ? 0 : ease(d.lift, d.liftTarget, 0.12, dt);

    // gathered: the group collects into a neat stack in front of the globe
    const orbit = _v3.set(Math.cos(angle) * radius * TUNING.scene.orbitSquashX, bob, Math.sin(angle) * radius);
    const stack = _w.set(0, (i - documents.length / 2) * 0.1, radius * 0.52);
    d.pivot.position.copy(orbit).lerp(stack, d.gather);

    d.holder.position.z = d.lift * 2;
    // A whole number of turns per loop, or frame 0 and frame 300 can never
    // match. Hovering shows as a lag that unwinds afterwards, which is a
    // live offset and so is zero in the idle loop and in capture.
    d.spinLag = deterministic ? 0 : ease(d.spinLag, d.liftTarget > 0 ? -0.85 : 0, 0.05, dt);
    d.holder.rotation.y = (u * d.spinCycles + d.phase) * TAU + d.spinLag;
    d.holder.rotation.x = d.faceTilt + Math.sin((u * d.bobCycles + d.phase) * TAU) * 0.18;

    // documents turn slightly toward the cursor, capped
    if (!deterministic) {
      const cap = THREE.MathUtils.degToRad(TUNING.hover.deflectionDeg);
      d.deflect.x = ease(d.deflect.x, input.parallax.y * cap * PS * live, 0.07, dt);
      d.deflect.y = ease(d.deflect.y, input.parallax.x * cap * PS * live, 0.07, dt);
      d.holder.rotation.x += d.deflect.x;
      d.holder.rotation.z = d.deflect.y;
    }
  });

  /* ---- starfield and bokeh: sine pairs on integer frequencies --------- */
  if (starPoints) {
    starPoints.position.x = Math.sin(u * TAU) * 0.26;
    starPoints.position.y = Math.cos(u * TAU * 2) * 0.13;
  }
  for (const b of bokeh) {
    b.sprite.position.x = b.home.x + Math.sin((u * b.cycles + b.phase) * TAU) * b.amp;
    b.sprite.position.y = b.home.y + Math.cos((u * b.cycles + b.phase) * TAU) * b.amp * 0.8;
  }

  /* ---- the optional student ------------------------------------------ */
  if (character && character.group.visible) {
    const k = 2;                                   // integer cycles, so it closes
    character.figure.position.y = 0.1 + Math.sin(u * TAU * k) * 0.022;
    character.figure.rotation.y = Math.sin(u * TAU) * 0.18;
    character.island.rotation.y = u * TAU * 0;     // held: a spin cannot close in one loop
    character.group.position.y = -1.5 + Math.sin(u * TAU) * 0.05;
  }
}

function renderFrame() {
  renderer.info.reset();
  if (composer) composer.render();
  else renderer.render(scene, camera);
}

/* ---- the loop -------------------------------------------------------- */

let rafId = 0;
let composer = null;

function tick() {
  if (sceneState.destroyed) return;
  rafId = requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), 0.1);     // a backgrounded tab must not jump
  sceneState.elapsed += dt;
  sceneState.u = (sceneState.elapsed % cfg.motion.loopSeconds) / cfg.motion.loopSeconds;

  // idle begins after the configured quiet time; exit is immediate
  const quiet = sceneState.elapsed - sceneState.lastInput;
  const wantIdle = quiet > cfg.motion.idleDelaySeconds && !input.dragging;
  const k = wantIdle ? dt * 1000 / TUNING.idle.crossfadeMs : dt * 1000 / 320;
  sceneState.idleMix = THREE.MathUtils.clamp(
    sceneState.idleMix + (wantIdle ? k : -k), 0, 1);

  updateHover(performance.now());
  updateScene(dt);
  layoutPinButtons();
  renderFrame();
  sceneState.frame++;
}

function start() {
  if (rafId || sceneState.destroyed || !sceneState.ready) return;
  clock.getDelta();                                // drop the gap since we stopped
  rafId = requestAnimationFrame(tick);
  sceneState.running = true;
}

function stop() {
  if (!rafId) return;
  cancelAnimationFrame(rafId);
  rafId = 0;
  sceneState.running = false;
}

/* ====================================================================== *
 *  21.  THE PAGE — DOM the same config drives                            *
 *                                                                        *
 *  All headline and body copy stays in the DOM, for search engines and   *
 *  for screen readers. The only text inside the 3D scene is the short    *
 *  country labels.                                                       *
 * ====================================================================== */

const ui = {
  // The demo page's own chrome -- wordmark, headline, subhead and the footer
  // name -- is not part of the mounted scene: the React page supplies that
  // copy. These lookups stay and resolve to null, so every reader below
  // keeps the shape it had; the readers are guarded instead.
  wordmark:  root.querySelector('#wordmark'),
  headline:  root.querySelector('#hero-title'),
  subhead:   root.querySelector('#hero-subhead'),
  footName:  root.querySelector('#footName'),
  pinList:   root.querySelector('#pinList'),
  readout:   root.querySelector('#globeReadout'),
  card:      root.querySelector('#destCard'),
  cardTitle: root.querySelector('#destCardTitle'),
  cardBody:  root.querySelector('#destCardBody'),
  cardCta:   root.querySelector('#destCardCta'),
  cardClose: root.querySelector('#destClose'),
  // the mount root stands in for the demo page's <section class="hero">
  hero:      root
};

function applyThemeToDom() {
  const r = document.documentElement.style;
  r.setProperty('--c-primary', cfg.theme.primary);
  r.setProperty('--c-accent',  cfg.theme.accent);
  r.setProperty('--c-neutral', cfg.theme.neutral);
}

function applyBrandToDom() {
  const name = cfg.brand.name.trim();
  const sp = name.indexOf(' ');
  if (ui.wordmark) {
    ui.wordmark.innerHTML = '';
    if (sp > 0) {
      ui.wordmark.append(name.slice(0, sp) + ' ');
      const b = document.createElement('b');
      b.textContent = name.slice(sp + 1);
      ui.wordmark.append(b);
    } else {
      ui.wordmark.textContent = name;
    }
  }
  if (ui.headline) ui.headline.textContent = cfg.brand.headline;
  if (ui.subhead)  ui.subhead.textContent = cfg.brand.subhead;
  if (ui.footName) ui.footName.textContent = name;
  // the document title belongs to the host page, not to the scene
  fitHeadline();
}

/** The two-line rule has to hold for a headline an admin typed, not only
 *  for the one that shipped. Step the display size down until the line
 *  box count is two or fewer, then stop. */
function fitHeadline() {
  const el = ui.headline;
  if (!el || !el.textContent.trim()) return;
  const narrow = innerWidth < 900;
  const hi = narrow ? 46 : 74, lo = narrow ? 26 : 32;
  const range = document.createRange();
  for (let size = hi; size >= lo; size -= 2) {
    ui.hero.style.setProperty('--h1-size', size + 'px');
    range.selectNodeContents(el);
    if (range.getClientRects().length <= 2) return;
  }
  ui.hero.style.setProperty('--h1-size', lo + 'px');
}

/* ---- keyboard and screen-reader parity ------------------------------- *
 *  One real button per destination, layered over the canvas. Tab reaches
 *  them in order, focus applies the same highlight as hover plus a ring,
 *  Enter or Space acts as a click, Escape resets. The canvas itself is
 *  aria-hidden and never focusable.                                      */

const pinButtons = [];

function buildPinButtons() {
  ui.pinList.textContent = '';
  pinButtons.length = 0;
  markers.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = m.dest.label;
    btn.setAttribute('aria-label', `${m.dest.label} — intakes ${m.dest.intake || 'on request'}`);
    btn.addEventListener('focus', () => { markInput(); setMarkerHot(m, true); });
    btn.addEventListener('blur',  () => { if (input.selected !== m) setMarkerHot(m, false); });
    btn.addEventListener('click', () => { markInput(); selectMarker(m); });
    li.append(btn);
    ui.pinList.append(li);
    pinButtons.push({ marker: m, li, btn });
  });
}

const _proj = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _globeWorld = new THREE.Vector3();
const _facing = new THREE.Vector3();

function layoutPinButtons() {
  if (!pinButtons.length || !stage) return;
  const rect = stage.getBoundingClientRect();
  camera.getWorldDirection(_camDir);
  L.globe.getWorldPosition(_globeWorld);
  for (const pb of pinButtons) {
    globeSpin.localToWorld(_proj.copy(pb.marker.base));
    // a pin on the far side of the globe is not offered
    const facing = _facing.copy(_proj).sub(_globeWorld).normalize().dot(_camDir) < -0.12;
    _proj.project(camera);
    const x = (_proj.x * 0.5 + 0.5) * rect.width;
    const y = (-_proj.y * 0.5 + 0.5) * rect.height - 34;
    pb.li.style.left = `${x}px`;
    pb.li.style.top = `${y}px`;
    pb.li.style.visibility = facing ? 'visible' : 'hidden';
  }
}

/* ---- the destination card -------------------------------------------- */

function openDestCard(d) {
  ui.cardTitle.textContent = d.label;
  ui.cardBody.textContent = d.intake
    ? `Intakes in ${d.intake.replace(/,\s*/g, ', ')}. We handle the course shortlist, the application and the visa file.`
    : 'We handle the course shortlist, the application and the visa file.';
  ui.cardCta.textContent = `Start your ${d.label} application`;
  ui.cardCta.href = d.href || '#contact';
  ui.card.dataset.open = 'true';
}
function closeDestCard() { ui.card.dataset.open = 'false'; }

ui.cardClose?.addEventListener('click', () => { markInput(); clearSelection(); resetView(); });

/* ---- entrance motion -------------------------------------------------- */

let riseObserver = null;
function observeRises() {
  riseObserver ??= new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); riseObserver.unobserve(e.target); }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  root.querySelectorAll('[data-rise]:not(.in)').forEach(el => riseObserver.observe(el));
}

/* ====================================================================== *
 *  22.  BOOT                                                             *
 * ====================================================================== */

function setStageMode(mode, reason) {
  stage.dataset.mode = mode;
  if (reason) console.info(`[hero] canvas off — ${reason}. The video and the DOM copy carry the hero.`);
}

/** The video is the poster, the mobile hero and the fallback. With no
 *  media configured (this build ships none), the still path renders a
 *  single frame of the real scene instead, so the hero is never blank. */
function wireVideo() {
  const m = cfg.media;
  if (!m.mp4Url && !m.webmUrl) {
    video.removeAttribute('poster');
    video.style.display = 'none';
    return false;
  }
  if (m.posterUrl) video.poster = m.posterUrl;
  const portrait = innerWidth < cfg.quality.mobileBreakpoint && m.verticalMp4Url;
  video.src = portrait ? m.verticalMp4Url : (m.webmUrl || m.mp4Url);
  if (prefersReduced.matches) video.pause(); else video.play().catch(() => {});
  return true;
}

async function probeTier() {
  if (cfg.quality.forceTier !== 'auto') return cfg.quality.forceTier;
  const n = TUNING.probe.frames;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    updateScene(1 / 60, true);
    renderer.render(scene, camera);
  }
  renderer.getContext().finish?.();
  const mean = (performance.now() - t0) / n;
  console.info(`[hero] warm-up mean frame time ${mean.toFixed(2)} ms`);
  if (mean > TUNING.probe.bailOutMs) return 'off';
  if (mean > TUNING.probe.stepDownMs) return 'medium';
  return 'high';
}

async function buildBloom() {
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js')
    ]);
    const size = renderer.getSize(new THREE.Vector2());
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(size, 0.25, 0.4, 0.9));
    composer.addPass(new OutputPass());
    composer.setSize(size.x, size.y);
  } catch (err) {
    console.warn('[hero] bloom unavailable, rendering direct:', err.message);
    composer = null;
  }
}

function buildSceneContents({ particles = true } = {}) {
  buildArcs();
  buildMarkers();
  buildDocuments();
  if (particles) buildParticles();
  buildPlane();
  buildSkyline();
  buildTraffic();
  buildFleet();
  if (cfg.quality.character && T.character) buildCharacter();

  interactables.length = 0;
  interactables.push(pinMesh, ...markers.map(m => m.landmark), ...documents.map(d => d.pivot));

  buildPinButtons();
  neutralSpin = lonToSpin(cfg.origin.lon) + 0.22;   // Dhaka a touch left of centre
  globeSpin.rotation.y = neutralSpin;
}

/** Everything the scene made, released. Called on teardown and before a
 *  cold rebuild, so repeated config changes cannot grow memory. */
/** Particles live across a content change; only a lane change, which
 *  rebuilds every material, takes them with it. */
function disposeParticles() {
  if (starPoints) { starPoints.geometry.dispose(); starPoints.removeFromParent(); starPoints = null; }
  for (const b of bokeh) { b.sprite.material.dispose(); b.sprite.removeFromParent(); }
  bokeh.length = 0;
}

function disposeSceneContents() {
  const kill = obj => {
    obj.traverse?.(o => {
      if (o.geometry && !o.isSprite) o.geometry.dispose();
      if (o.material) {
        for (const m of [].concat(o.material)) {
          for (const k of ['map', 'alphaMap', 'emissiveMap']) m[k]?.dispose?.();
          m.dispose();
        }
      }
    });
    obj.removeFromParent();
  };
  for (const a of arcs) kill(a.mesh);
  arcs.length = 0;
  for (const m of markers) { kill(m.landmark); kill(m.sprite); }
  markers.length = 0;
  labelSprites.length = 0;
  if (pinMesh) { pinMesh.dispose(); kill(pinMesh); pinMesh = null; }
  if (originPin) kill(originPin);
  for (const d of documents) kill(d.pivot);
  documents.length = 0;
  if (plane) kill(plane);
  plane = null;
  /* Geometry only for the three sets below: their materials are shared
   * members of MAT, and a lane change is what disposes those. */
  if (skyline) { skyline.geometry.dispose(); skyline.removeFromParent(); skyline = null; }
  if (fleet) {
    fleet.body.geometry.dispose(); fleet.accent.geometry.dispose();
    fleet.body.dispose(); fleet.accent.dispose();
    fleet.body.removeFromParent(); fleet.accent.removeFromParent();
    fleet = null;
  }
  fleetState.length = 0;
  // the traffic owns its shader material, so that one does go
  if (traffic) { traffic.mesh.geometry.dispose(); traffic.mat.dispose(); traffic.mesh.removeFromParent(); traffic = null; }
  disposePick();
  if (character) { kill(character.group); character = null; }
  interactables.length = 0;
  ui.pinList.textContent = '';
  pinButtons.length = 0;
  input.hovered = input.hoveredDoc = input.selected = null;
}

let heroReady = false;

async function mount() {
  cfg = await loadConfig();
  applyThemeToDom();
  applyBrandToDom();
  observeRises();

  const hasVideo = wireVideo();
  const reason = videoOnlyReason(cfg);
  if (reason && hasVideo) {
    setStageMode('video', reason);
    window.__hero = api;
    return;
  }

  // No exported media in this build, so even the "video only" paths get a
  // real still: the scene is built, one frame is drawn, and the loop never
  // starts. It is the same image the export would produce at u = 0.
  const stillOnly = !!reason;
  if (reason) console.info(`[hero] ${reason} — rendering a single still frame, no animation.`);

  await buildEnvironment();
  buildMaterials();
  buildBackdrop();
  await buildGlobe();
  applySize();

  const picked = await probeTier();
  if (picked === 'off') {
    console.warn('[hero] frame time over budget — the canvas is torn down, the page keeps its copy.');
    destroy();
    setStageMode('video', 'frame time over budget');
    return;
  }
  tier = picked;
  T = TIERS[tier];
  MAT.shadow.opacity = T.shadowOpacity;
  document.documentElement.dataset.heroTier = tier;

  buildSceneContents();
  applySize();
  if (T.bloom && !stillOnly) await buildBloom();

  sceneState.ready = true;
  heroReady = true;
  sceneState.lastInput = 0;

  if (CAPTURE) {
    document.body.dataset.capture = 'true';
    renderer.setPixelRatio(1);
    renderer.setSize(capture.width, capture.height, false);
    frameScene(capture.width, capture.height);
    canvas.classList.add('ready');
    if (SELFTEST) { await runSelfTest(); return; }
    captureStep(0);
    window.__heroCaptureReady = true;
    return;
  }

  canvas.classList.add('ready');
  resizeObserver.observe(stage);

  if (stillOnly) {
    updateScene(1 / 60, true);
    renderFrame();
    window.__hero = api;
    return;
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointerup', onPointerUp);
  addEventListener('pointercancel', onPointerCancel);
  addEventListener('keydown', onKeyDown);
  visibility.observe(stage);
  start();

  window.__hero = api;
}

function destroy() {
  // React StrictMode mounts twice, and the pagehide handler can race the
  // effect cleanup, so a second call has to be a no-op rather than a throw.
  if (destroyed) return;
  destroyed = true;
  sceneState.destroyed = true;
  stop();
  removeEventListener('resize', onWindowResize);
  removeEventListener('pagehide', onPageHide);
  // only if it is still ours: a later instance may already have claimed it
  if (window.__hero === api) delete window.__hero;
  clearTimeout(resizeTimer);
  clearTimeout(gatherTimer);
  clearTimeout(coldTimer);
  resizeObserver.disconnect();
  visibility.disconnect();
  riseObserver?.disconnect();
  canvas.removeEventListener('pointermove', onPointerMove);
  canvas.removeEventListener('pointerdown', onPointerDown);
  removeEventListener('pointerup', onPointerUp);
  removeEventListener('pointercancel', onPointerCancel);
  removeEventListener('keydown', onKeyDown);

  disposeSceneContents();
  disposeParticles();
  globeMesh?.geometry.dispose();
  landMesh?.geometry.dispose();
  landSideMesh?.geometry.dispose();
  contactShadow?.geometry.dispose();
  globeMesh?.removeFromParent();
  landMesh?.removeFromParent();
  landSideMesh?.removeFromParent();
  contactShadow?.removeFromParent();
  backdrop?.geometry.dispose();
  backdrop?.removeFromParent();
  for (const m of Object.values(MAT || {})) m?.dispose?.();
  for (const t of Object.values(TEX || {})) t?.dispose?.();
  for (const g of Object.values(LANDMARKS)) g?.dispose?.();
  composer?.dispose?.();
  envRT?.dispose();
  scene.environment = null;
  renderer.dispose();
  renderer.forceContextLoss?.();
  canvas.classList.remove('ready');
}

/* ====================================================================== *
 *  23.  CONFIG CHANGES — hot in place, cold rebuilds one subsystem       *
 *                                                                        *
 *  Tearing the whole scene down on every change is what makes a panel    *
 *  like this unusable. The globe, the camera, the particles and the      *
 *  loop clock stay alive across a cold change, so the preview never      *
 *  flashes and the loop never restarts.                                  *
 * ====================================================================== */

let coldTimer = null;
const coldNeeds = new Set();

function applyChange(path, value) {
  const field = SCHEMA[path];
  if (!field) { console.warn(`[heroConfig] unknown field ${path}`); return; }
  const validated = field.control === 'destinations'
    ? validateDestinations(value, field, cfg.destinations)
    : validateField(path, value, field, get(cfg, path));
  set(cfg, path, validated);

  if (field.class === 'hot') return applyHot(path);
  if (field.class === 'boot') return;                 // read once; needs a reload
  // the lane swaps every material; everything else only re-cuts content
  coldNeeds.add(path === 'theme.lane' ? 'materials' : 'content');
  clearTimeout(coldTimer);
  coldTimer = setTimeout(applyCold, 300);
}

function applyHot(path) {
  if (path.startsWith('theme.')) applyThemeColours();
  else if (path.startsWith('brand.')) applyBrandToDom();
  else if (path === 'quality.forceTier') console.info('[hero] tier override takes effect on reload');
  // motion.* and cta.* are read straight from cfg every frame, so they
  // need no work at all
}

function applyCold() {
  if (!heroReady) return;
  const lane = coldNeeds.has('materials');
  coldNeeds.clear();

  disposeSceneContents();
  if (lane) {
    disposeParticles();
    for (const m of Object.values(MAT)) m?.dispose?.();
    for (const t of Object.values(TEX)) t?.dispose?.();
    buildMaterials();
    MAT.shadow.opacity = T.shadowOpacity;
    globeMesh.material = MAT.ocean;
    landMesh.material = MAT.land;
    landSideMesh.material = MAT.landSide;
    if (outlines) outlines.material = MAT.outline;
    if (graticule) graticule.material = MAT.graticule;
    if (cityDots) cityDots.material = MAT.city;
    contactShadow.material = MAT.shadow;
    backdrop.material.map = TEX.bg;
    backdrop.material.needsUpdate = true;
  }
  // The globe geometry, the camera, the loop clock and — unless the lane
  // changed — the particles all survive, so the preview never flashes and
  // the 5-second loop keeps its phase.
  buildSceneContents({ particles: lane });
  applySize();
}

/* The dev panel sidecar (hero-panel.js) is not part of this port, so the
 * dynamic import that fetched it is gone with it. */

/* ---- the public surface ---------------------------------------------- */

const api = {
  get config() { return structuredClone(cfg); },
  get tier() { return tier; },
  get stats() {
    const info = renderer.info;
    return {
      tier, calls: info.render.calls, triangles: info.render.triangles,
      geometries: info.memory.geometries, textures: info.memory.textures,
      landTriangles, running: sceneState.running, warnings: warnings.slice()
    };
  },
  applyChange, destroy, start, stop,
  captureStep, runSelfTest,
  loadConfigObject(obj) {
    const next = validate(obj);
    const old = cfg; cfg = next;
    applyThemeColours(); applyBrandToDom();
    if (JSON.stringify(old.destinations) !== JSON.stringify(next.destinations) ||
        old.theme.lane !== next.theme.lane || JSON.stringify(old.origin) !== JSON.stringify(next.origin)) {
      applyCold();
    }
  }
};

addEventListener('resize', onWindowResize, { passive: true });
addEventListener('pagehide', onPageHide, { once: true });

/* The demo page waited for an idle callback before starting. React owns the
 * mount point and the moment, so that is the caller's business now. The
 * failure path is the one that page had: log it and leave the stage on its
 * fallback rather than throwing out of the mount. */
const kick = () => mount().catch(err => {
  console.error('[hero] scene failed to start:', err);
  setStageMode('video', 'the scene threw during start-up');
});

await kick();

return api;

}
