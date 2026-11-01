import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ====================================================================== *
 *  PORTED, NOT REWRITTEN                                                 *
 *                                                                        *
 *  The module script of cinematic.html (source lines 589-6818), moved    *
 *  into a mountable function. Everything inside is the original: the     *
 *  quality tiers, the six-beat timeline, the prefers-reduced-motion and  *
 *  capture/self-test paths, the demo cursor, the two handover            *
 *  controllers over one scene graph, and destroy().                      *
 *                                                                        *
 *  What changed, and only this:                                          *
 *    - every document.getElementById(id) is now root.querySelector('#id')*
 *      against the container the caller passes in, so two instances on   *
 *      one page cannot find each other's nodes;                          *
 *    - GEO_URL points at the vendored copy under /public/hero;           *
 *    - the cine-panel.js dev sidecar and its loader are gone;            *
 *    - the idle-callback boot block is gone: React drives mounting;      *
 *    - destroy() is idempotent and removes its own window listeners.     *
 *                                                                        *
 *  Two lookups deliberately stay on document: the config endpoint meta   *
 *  tag, which lives in <head>, and cfg.cursor.targetSelector, which aims *
 *  the demo cursor at the page's real CTA outside this root.             *
 * ====================================================================== */

/**
 * Build and start the cinematic inside `root`.
 * @param {HTMLElement} root container holding the scene DOM
 * @returns {Promise<object>} the scene's public api, including destroy()
 */
export async function mountCinematic(root) {

let destroyed = false;
const onWindowResize = () => { fitHeadline(); };
const onPageHide = () => { cursor.clearClasses(); destroy(); };

/* ====================================================================== *
 *  HORIZON — hero cinematic loop, version two                            *
 *                                                                        *
 *  Version one of this scene is hero.html: one globe, one five-second    *
 *  idle oscillation, no narrative. This is the cinematic: six beats over *
 *  ten seconds, a character who opens a laptop, a globe that rises out   *
 *  of the screen as a hologram, and a cursor that walks to the real CTA  *
 *  and hovers on it. Touch the scene at any point and the cinematic      *
 *  hands the same scene graph to the interactive controller.             *
 *                                                                        *
 *  Reading order:                                                        *
 *    1  config/schema      every field, its type, range and hot/cold     *
 *    2  config/defaults    source 3, the bundled fallback                *
 *    3  config/load        merge the three sources, validate per field   *
 *    4  TUNING             engine numbers, authored by whoever builds    *
 *    5  landmarks          registry: a key maps to a model, never a URL  *
 *    6  quality            capability probe and the three tiers          *
 *    7  renderer/scene     stage, lights, environment, the depth fixes   *
 *    8  materials          the two art lanes, and the contrast floor     *
 *    9  globe              ocean, extruded continents, atmosphere shell  *
 *   10  arcs               lifted great circles, the travelling pulse    *
 *   11  markers            instanced pins, landmarks, billboard labels   *
 *   12  documents          interactive only; the cinematic cuts them     *
 *   13  particles          starfield, bokeh, and the fake depth of field *
 *   14  aircraft           one plane, one arc at a time                  *
 *   15  character          the rigid paper-doll rig and its three poses  *
 *   16  laptop             five meshes, a hinge and a waking screen      *
 *   17  hologram           one globe, one hologramAmount uniform         *
 *   18  cursor             a DOM element that never dispatches an event  *
 *   19  timeline           the six beats, scrubbed by one number         *
 *   20  loop clock         u, the beat lookup and the idle curves        *
 *   21  input + handover   two controllers, one scene graph              *
 *   22  capture + tests    determinism, and the four acceptance proofs   *
 *   23  framing/resize     frameScene(aspect) and the left safe zone     *
 *   24  the frame          updateScene, renderFrame, tick                *
 *   25  page               DOM the config also drives                    *
 *   26  boot                                                             *
 *   27  config changes     hot in place, cold rebuilds one subsystem     *
 * ====================================================================== */


/* ====================================================================== *
 *  1.  config/schema.js — the single shared contract                     *
 *                                                                        *
 *  Unchanged from version one except for the four groups at the foot:    *
 *  cinematic, character, cursor, and two new motion fields. The panel    *
 *  generates its controls from this, the loader validates against it,    *
 *  and the admin backend is meant to validate against the same file.     *
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

const BEAT_KEYS = ['open', 'rise', 'explore', 'travel', 'click', 'collapse'];

const SCHEMA = {
  'brand.name':      { type: 'string', class: 'hot',  control: 'text',  label: 'Agency name',
                       note: 'Shown in the wordmark and the footer' },
  'brand.headline':  { type: 'string', class: 'hot',  control: 'text',  label: 'Headline',
                       note: 'DOM, over the canvas. Auto-fits to two lines' },
  'brand.subhead':   { type: 'string', class: 'hot',  control: 'text',  label: 'Subhead' },

  'theme.primary':   { type: 'hex',    class: 'hot',  control: 'color', label: 'Primary — land and arcs', reexport: true },
  'theme.accent':    { type: 'hex',    class: 'hot',  control: 'color', label: 'Accent — origin, active arc, pulse', reexport: true },
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

  'motion.idleDelaySeconds': { type: 'number', class: 'hot', control: 'range', min: 0.5, max: 12,  step: 0.1, label: 'Re-idle delay, s',
                               note: 'Quiet time before the cinematic comes back' },
  'motion.loopSeconds':      { type: 'number', class: 'cold', control: 'range', min: 6,  max: 16,  step: 0.5, label: 'Loop length, s',
                               note: 'Staff only — the beats are rescaled to fit it, and it invalidates the export', reexport: true },
  'motion.captureFps':       { type: 'number', class: 'boot', control: 'number', min: 12, max: 60, label: 'Capture fps',
                               note: 'Staff only — 30 at ten seconds is 300 frames', reexport: true },
  'motion.parallaxStrength': { type: 'number', class: 'hot', control: 'range', min: 0,   max: 2,   step: 0.05, label: 'Parallax strength',
                               note: 'Scales every tuning value; it does not replace them' },

  /* ---- the cinematic ------------------------------------------------- */
  'cinematic.enabled':    { type: 'boolean', class: 'cold', control: 'check', label: 'Run the cinematic',
                            note: 'Off leaves the interactive scene on its own, exactly as version one' },
  'cinematic.transition': { type: 'enum', class: 'cold', control: 'radio', label: 'Transition',
                            values: ['hologram', 'none'], reexport: true,
                            note: 'Option A from the brief. The push-in is not built' },
  'cinematic.beats':      { type: 'beats', class: 'cold', control: 'beats', label: 'Beat durations, s', reexport: true,
                            item: { type: 'number', min: 0.3, max: 6 } },
  'cinematic.resumeAtBeat': { type: 'enum', class: 'hot', control: 'radio', label: 'Re-idle resumes at',
                              values: BEAT_KEYS,
                              note: 'Travel, not open: nobody wants the laptop twice' },
  'cinematic.cameraDriftDegrees': { type: 'number', class: 'hot', control: 'range', min: 0, max: 5, step: 0.1,
                                    label: 'Camera drift, degrees' },

  /* ---- the character -------------------------------------------------- */
  'character.enabled': { type: 'boolean', class: 'cold', control: 'check', label: 'Show the figure',
                         note: 'Off by default. The laptop and the cinematic do not depend on it' },
  'character.variant': { type: 'enum', class: 'cold', control: 'radio', label: 'Variant',
                         values: ['default', 'alt'],
                         note: 'Part colours and hair geometry only — no structural difference' },
  'character.outline': { type: 'boolean', class: 'cold', control: 'check', label: 'Ink outline',
                         note: 'A second pass at 1.02 with front faces culled. Reads cheap when small' },
  'character.palette.skin':   { type: 'hex', class: 'hot', control: 'color', label: 'Skin' },
  'character.palette.hair':   { type: 'hex', class: 'hot', control: 'color', label: 'Hair' },
  'character.palette.jacket': { type: 'hex', class: 'hot', control: 'color', label: 'Hoodie' },
  'character.palette.shirt':  { type: 'hex', class: 'hot', control: 'color', label: 'T-shirt',
                                note: 'Shows down the open front of the hoodie' },
  'character.palette.bottom': { type: 'hex', class: 'hot', control: 'color', label: 'Trousers' },
  'character.palette.bag':    { type: 'hex', class: 'hot', control: 'color', label: 'Backpack' },
  'character.palette.shoe':   { type: 'hex', class: 'hot', control: 'color', label: 'Shoes' },

  /* ---- the cursor ------------------------------------------------------ */
  'cursor.enabled':        { type: 'boolean', class: 'hot', control: 'check', label: 'Demo cursor' },
  'cursor.mode':           { type: 'enum', class: 'hot', control: 'radio', label: 'Cursor behaviour',
                             values: ['hover', 'click'],
                             note: 'Hover arrives and lifts the button. Click also presses it — never with a real event' },
  'cursor.targetSelector': { type: 'string', class: 'cold', control: 'text', label: 'Target selector',
                             note: 'An attribute, not a class: classes churn and the cursor would aim at nothing' },
  'cursor.arcHeight':      { type: 'number', class: 'hot', control: 'range', min: 0, max: 1, step: 0.01, label: 'Arc height' },
  'cursor.overshootPx':    { type: 'number', class: 'hot', control: 'range', min: 0, max: 24, step: 1, label: 'Overshoot, px' },

  'quality.forceTier':       { type: 'enum',    class: 'hot',  control: 'radio', label: 'Force tier',
                               values: ['auto', 'high', 'medium', 'low'], note: 'Staff only' },
  'quality.mobileVideoOnly': { type: 'boolean', class: 'boot', control: 'check', label: 'Skip the canvas on small screens', note: 'Staff only' },
  'quality.mobileBreakpoint':{ type: 'number',  class: 'boot', control: 'number', min: 320, max: 1400, label: 'Breakpoint, px', note: 'Staff only' },

  'media.posterUrl':       { type: 'string', class: 'boot', control: 'text', label: 'Poster URL' },
  'media.mp4Url':          { type: 'string', class: 'boot', control: 'text', label: 'MP4 URL' },
  'media.webmUrl':         { type: 'string', class: 'boot', control: 'text', label: 'WebM URL' },
  'media.verticalMp4Url':  { type: 'string', class: 'boot', control: 'text', label: 'Vertical MP4 URL' }
};

/* Which fields invalidate an exported video when they change. The "freeze
 * and warn" approach the brief asks to ship first: the panel shows a
 * banner until someone re-runs the export. */
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

  cinematic: {
    enabled: true,
    transition: 'hologram',
    beats: { open: 1.4, rise: 1.2, explore: 3.0, travel: 1.2, click: 1.4, collapse: 1.8 },
    resumeAtBeat: 'travel',
    cameraDriftDegrees: 1.5
  },

  /* Seven flat colours and no shading: an open blue hoodie with a white
   * t-shirt down the front, brown trousers, a yellow pack with its straps
   * over both shoulders, following the reference illustration supplied as
   * a style target. The clothing carries no marks, badges or logos.
   * variant swaps part colours and hair geometry only, so a second figure
   * later costs nothing structural. */
  character: {
    enabled: false,
    variant: 'default',
    outline: false,
    palette: {
      skin:   '#e8a07d',
      hair:   '#7c4a30',
      jacket: '#5b8fb0',
      shirt:  '#f7f6f3',
      bottom: '#6d4430',
      bag:    '#f5b335',
      shoe:   '#413a35'
    }
  },

  cursor: {
    enabled: true,
    mode: 'hover',
    targetSelector: '[data-hero-cta]',
    arcHeight: 0.35,
    overshootPx: 8
  },

  motion:  { idleDelaySeconds: 3.5, loopSeconds: 10, captureFps: 30, parallaxStrength: 1 },
  quality: { forceTier: 'auto', mobileVideoOnly: true, mobileBreakpoint: 768 },
  media:   { posterUrl: '', mp4Url: '', webmUrl: '', verticalMp4Url: '' }
};

/* config/example-alt.json — a different brand, destination set and figure,
 * to show that nothing is hard-coded. Load it from the panel. */
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
  cinematic: {
    enabled: true, transition: 'hologram',
    beats: { open: 1.2, rise: 1.0, explore: 3.6, travel: 1.2, click: 1.4, collapse: 1.6 },
    resumeAtBeat: 'travel', cameraDriftDegrees: 1.1
  },
  character: {
    enabled: false, variant: 'alt', outline: true,
    palette: {
      skin:   '#b0754e',
      hair:   '#241c18',
      jacket: '#4a6f8a',
      shirt:  '#f2efe8',
      bottom: '#49403a',
      bag:    '#d9603f',
      shoe:   '#2f2b28'
    }
  },
  cursor:  { enabled: true, mode: 'click', targetSelector: '[data-hero-cta]', arcHeight: 0.42, overshootPx: 10 },
  motion:  { idleDelaySeconds: 3, loopSeconds: 11, captureFps: 30, parallaxStrength: 0.8 },
  quality: { forceTier: 'auto', mobileVideoOnly: true, mobileBreakpoint: 768 },
  media:   { posterUrl: '', mp4Url: '', webmUrl: '', verticalMp4Url: '' }
};

/* ====================================================================== *
 *  3.  config/load.js — merge the three sources, validate per field      *
 *                                                                        *
 *  Priority: window.__HERO_CONFIG__ (admin, server-injected)             *
 *            GET <meta name="hero-config-endpoint">                      *
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

/** The six beat durations, each validated on its own. A bad "explore"
 *  falls back to the default explore and the other five are kept, exactly
 *  as a bad hex falls back alone. */
function validateBeats(raw, field, fallback) {
  if (raw === undefined) return fallback;
  if (!raw || typeof raw !== 'object') { warn('cinematic.beats', raw, 'not an object'); return fallback; }
  const out = {};
  for (const key of BEAT_KEYS) {
    out[key] = validateField(`cinematic.beats.${key}`, raw[key], field.item, fallback[key]);
  }
  return out;
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
    } else if (field.control === 'beats') {
      set(out, path, validateBeats(get(raw, path), field, get(DEFAULTS, path)));
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

const LS_KEY = 'horizon.cinematic.overrides';
const QS = new URLSearchParams(location.search);
const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
const IS_DEV = QS.has('panel') || DEV_HOSTS.includes(location.hostname) || location.protocol === 'file:';

async function loadConfig() {
  let merged = {};

  if (window.__HERO_CONFIG__) {
    merged = deepMerge(merged, window.__HERO_CONFIG__);
  } else {
    // Declared with <meta name="hero-config-endpoint" content="/api/hero-config">.
    // Without it there is no CMS behind this page and asking would only log
    // a 404 on every load, against an acceptance criterion of no console
    // errors.
    const endpoint = document.querySelector('meta[name="hero-config-endpoint"]')?.content;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, { headers: { accept: 'application/json' } });
        if (res.ok) merged = deepMerge(merged, await res.json());
        else console.warn(`[heroConfig] ${endpoint} returned ${res.status}; using the bundled defaults`);
      } catch (err) { console.warn(`[heroConfig] ${endpoint} unreachable: ${err.message}`); }
    }
  }

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
    // A longer lens than version one. The subject sits at the right of the
    // frame rather than at its centre, and a wide lens throws anything that
    // far off-axis badly out of shape at the edge.
    fovDesktop: 30,
    fovMobile: 42,
    tweenMs: 900,            // ease-in-out cubic on a pin click
    ease: 0.12,

    // The three shots are solved per aspect in frameScene(), not keyed
    // here: the target has to sit far enough left of the subject that the
    // subject clears the headline's band at every width.
    driftCycles: 1           // whole cycles per loop, or the loop cannot close
  },

  parallax: {
    yawDeg: 4,
    pitchDeg: 2.5,
    ease: 0.055,
    layers: { stars: 0.15, globe: 0.4, documents: 0.8, bokeh: 1.2 },
    cursorLight: { intensity: 7.5, distance: 11, z: 3.4, ease: 0.09 }
  },

  hover: {
    everyNFrames: 2,
    throttleMs: 50,
    pinScale: 1.25,
    springK: 0.16,
    enterRadius: 1.0,
    exitRadius: 1.9,
    arcBoostPulse: 2.1,
    documentLift: 0.16,
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
    trafficTubeRadius: 0.0145,
    trafficOpacity: 0.8,
    identify: true,          // a click names what is under it
    pickSeconds: 7,          // how long the readout stays before fading
    pickOpacity: 0.95
  },

  idle: {
    crossfadeMs: 1000,
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
    landSubdivideDeg: 5.5,
    tiltDeg: 15,

    /* Fix 4: the arcs read as red scratches. Thicker tubes, and the curve
     * is a lifted great circle rather than a quadratic bezier, so it can
     * never dip inside the sphere however long the hop. */
    arcTubeRadius: 0.034,
    arcLiftBase: 0.055,
    arcLiftPerRadian: 0.115,
    arcHorizonFade: 0.22,    // alpha falls off this far before the limb

    /* Fix 6: an atmosphere shell with a fresnel rim, so the globe has a
     * near edge and a far edge instead of one flat disc. */
    atmosphereScale: 1.055,
    atmospherePower: 2.6,
    atmosphereStrength: 0.5,

    /* Fix 3: a very faint radial ground gradient under everything, so the
     * scene stands on something. */
    groundRadius: 9.5,
    groundOpacity: 0.52,

    pinHeight: 0.15,

    /* Fix 5: two to three times larger, and four of them rather than six.
     * A prop nobody can identify is noise. They belong to the interactive
     * scene only; the cinematic cuts them, because the frame cannot hold
     * them and the character at the same time. */
    documentRadius: 2.46,
    documentScale: 2.25,
    orbitSquashX: 0.76,
    orbitOffsetX: 0.5,
    bokehCount: 4,

    /* Fix 2: land and ocean must differ by at least this much relative
     * luminance, or the silhouette collapses and extrusion alone will not
     * save it. Enforced in buildPalette(), not hoped for. */
    minLandOceanLuma: 0.25
  },

  /* ---- the cinematic ------------------------------------------------- */
  cine: {
    characterHeight: 1.79,
    characterPos: [1.28, 0, 0.20],
    /* Three-quarter to camera, turned a little toward the frame edge. His
     * head turns back toward the hologram, which is what the watch pose is
     * for. */
    characterTurnRad: 0.42,

    /* The laptop stands on a low plinth. If the figure is switched on it
     * is carried instead, off a joint on the torso rather than off a hand
     * -- a globe rising out of a panel that jitters two frames behind a
     * wrist reads as a bug, not as weight. */
    /* A desk, not a pedestal. A tall narrow box under a globe reads as a
     * trophy on a plinth; a wide low surface that runs out of frame on
     * both sides reads as a desk with a laptop on it, which is the thing
     * the scene is actually about. */
    // wide enough to leave frame on both sides at every aspect. A desk
    // whose end you can see is a plinth again.
    desk: { w: 6.4, h: 0.76, d: 1.05, pos: [0.42, 0, 0.28] },
    laptopPos: [0.45, 0.785, 0.32],
    laptopTurn: 0.20,
    hold: { pos: [0, 0.175, 0.49], rotX: -0.14, rotY: -0.42 },
    laptopScale: 1.2,
    lidClosedDeg: 6,               // slightly ajar: a flush lid has no anticipation
    lidOpenDeg: 105,
    lidOvershootDeg: 4,            // two frames of it, no more

    screenWakeSeconds: 0.35,
    scanlineWidth: 0.1,

    hologramScale: 0.55,           // full size; chosen so the globe fills the
                                   // same share of the frame the interactive
                                   // scene gives it, making handover a
                                   // transform match rather than a re-layout
    hologramSeed: 0.05,            // the flat disc on the panel it grows from
    /* Up and to his left. The two have to occupy different parts of the
     * frame or they fight: the globe high and left, the figure beside it
     * and nearer the camera, so he reads as a silhouette against it
     * rather than being cut in half by it. */
    hologramRise: [0.45, 1.95, -0.05],
    coneOpacity: 0.50,

    /* Overlapping action. Each joint runs this many frames behind its
     * parent; without it the rig reads as a cardboard cut-out. The lookup
     * is periodic over the loop, so a lag cannot break the closure. */
    lagFrames: 2.5,
    lagFps: 30,

    tailHoldSeconds: 0.4,          // everything parked at frame-0 values for
                                   // the last stretch. It must exceed the
                                   // deepest joint lag below, or a hand
                                   // would still be moving at frame 0.
    handoverMs: 400,               // cinematic-only objects fade out over this
    blendMs: 600,                  // the globe's transform blends over this
    accelerateMs: 250              // input in a closed beat: scrub to explore
  },

  cursor: {
    enterFrom: [1.06, 1.12],       // off-frame bottom right, in stage fractions
    settleMs: 120,
    jitterPx: 2.5,
    pausePortion: 0.14,            // of the travel beat, after arriving
    hoverLeadMs: 200,              // hover comes on before the press, as a
                                   // real pointer would
    pressMs: 80,
    rippleMs: 400,
    scale: { rest: 1, press: 0.9 }
  },

  capture: { frames: 300, width: 1920, height: 1080, vertical: [1080, 1920] },

  probe: { frames: 20, stepDownMs: 28, bailOutMs: 45 },

  /* The amended budget. The character adds about a dozen draw calls, since
   * each rigid part rotates independently and so cannot be merged.
   * Triangles barely move — flat unlit blocks are nearly free. */
  budget: { callsDesktop: 92, callsMobile: 50, triangles: 180000 }
};

/* The three tiers differ only in cost, never in layout, so the
 * composition is identical at every one of them. */
const TIERS = {
  high:   { dpr: 2,   stars: 520, bokeh: 4, blur: 3, bloom: true,  arcSegments: 64, landmarkDetail: 1, jointDetail: 1, shadowOpacity: 0.34, fleet: 7 },
  medium: { dpr: 1.5, stars: 300, bokeh: 3, blur: 2, bloom: false, arcSegments: 40, landmarkDetail: 1, jointDetail: 1, shadowOpacity: 0.30, fleet: 4 },
  low:    { dpr: 1,   stars: 140, bokeh: 2, blur: 0, bloom: false, arcSegments: 24, landmarkDetail: 0, jointDetail: 0, shadowOpacity: 0.26, fleet: 2 }
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
const finePointer    = matchMedia('(pointer: fine)');
const CAPTURE  = QS.get('capture') === '1';
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
  // Each one silently turns a ten-second cinematic into one still frame,
  // which looks exactly like a broken hero. The page watches for that and
  // offers a Play control; pressing it sets this flag and remounts, so a
  // visitor who actually wants the animation can have it.
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
 *                                                                        *
 *  Fixes 1 and 6 live here. The old rig was one white key and a warm-grey *
 *  hemisphere, and the unlit side of the globe fell to a desaturated      *
 *  grey that read as dirt rather than shadow. The rig now has:            *
 *                                                                         *
 *    key        warm, from upper left, as before                          *
 *    sky/ground a cool deep blue-green ground colour: a shade with a hue  *
 *               in it reads as shade; a neutral one reads as grime        *
 *    bounce     a low directional from below, the light coming back up    *
 *               off the ground plane                                      *
 *    rim        from behind left, which is what separates the globe from  *
 *               the backdrop and gives the scene a back plane             *
 *                                                                         *
 *  The character and the laptop are unlit, so none of this touches them.  *
 *  That separation is the main reason the hologram option works at all,   *
 *  and it is preserved deliberately: a flat-shaded figure is allowed to   *
 *  stand next to a shaded globe when the globe is a projection.           *
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
renderer.shadowMap.enabled = false;              // baked contact planes instead
renderer.info.autoReset = false;                 // accumulate across composer passes

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(TUNING.camera.fovDesktop, 1, 0.1, 120);
camera.position.set(0, 1.5, 7);
scene.add(camera);

/* Image-based light from RoomEnvironment — no HDRI file to download. */
let envRT = null;
async function buildEnvironment() {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  // 0.045 asks PMREM for more samples than it allows and it logs about it
  envRT = pmrem.fromScene(room, 0.035);
  scene.environment = envRT.texture;
  room.dispose(); pmrem.dispose();
}

const keyLight = new THREE.DirectionalLight(0xfff4e4, 1.05);
keyLight.position.set(-3.4, 4.2, 5.0);
scene.add(keyLight);

/* Never let the shade side go neutral grey. The ground colour here is what the
 * unlit side of the globe falls to, so it is a deep blue-green rather than
 * the warm grey it used to be. */
const fillLight = new THREE.HemisphereLight(0xffffff, 0x14323a, 1.25);
scene.add(fillLight);

/* The light coming back up off the ground. Low, cool, and it is what stops
 * the bottom of the globe reading as a smudge. */
const bounceLight = new THREE.DirectionalLight(0x9fd8d0, 0.42);
bounceLight.position.set(0.8, -3.4, 2.2);
scene.add(bounceLight);

/* The rim from behind left: the single cheapest thing that puts a back
 * plane in the image. */
const rimLight = new THREE.DirectionalLight(0xdff2ff, 0.78);
rimLight.position.set(-4.6, 2.2, -4.0);
scene.add(rimLight);

/* The soft point light that follows the cursor on a plane in front of the
 * globe, so the clay surface catches a moving highlight. */
const cursorLight = new THREE.PointLight(0xffffff, 0, TUNING.parallax.cursorLight.distance, 2);
cursorLight.position.set(0, 0, TUNING.parallax.cursorLight.z);
scene.add(cursorLight);

/* ---- the layer groups, in the depth order the brief sets --------------
 *
 *  cineRoot holds everything the cinematic composes: the ground, the
 *  character, the laptop and the hologram group. frameScene() slides the
 *  camera's target rather than this group, so the composition shifts
 *  without the world moving under the character's feet.
 */
const L = {
  stars:     new THREE.Group(),
  globe:     new THREE.Group(),   // ocean, land, pins, landmarks, arcs ride with it
  documents: new THREE.Group(),   // interactive only
  bokeh:     new THREE.Group()
};
L.stars.name = 'layer-stars';
L.globe.name = 'layer-globe';
L.documents.name = 'layer-documents';
L.bokeh.name = 'layer-bokeh';

const cineRoot = new THREE.Group();
cineRoot.name = 'cinematic-root';

/* The globe lives inside the hologram group while the cinematic owns it,
 * and the handover lifts it out to the interactive neutral. Nothing inside
 * Globe, Arcs, Markers or Particles knows a cinematic exists. */
const hologramGroup = new THREE.Group();
hologramGroup.name = 'hologram-group';
hologramGroup.add(L.globe);

scene.add(L.stars, cineRoot, L.documents, L.bokeh);
cineRoot.add(hologramGroup);

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
 *  MeshStandardMaterial, flat shading, bold flat colour. Never mixed.    *
 *                                                                        *
 *  The character and the laptop are the exception: they are unlit in     *
 *  both lanes, because flat illustration has no shading and a cel        *
 *  figure beside a shaded globe is the whole visual idea.                *
 * ====================================================================== */

const tmpC = new THREE.Color();

/** A desaturated or lightened relative of a palette colour. */
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

/** Relative luminance. THREE.Color holds linear-sRGB once ColorManagement
 *  has converted the hex, so the coefficients apply directly. */
function relLuma(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Fix 2 — land and ocean were nearly the same colour, and extrusion alone
 *  does not separate them: shape is read by value first and geometry
 *  second. Step the ocean's lightness up until it clears the land by the
 *  required margin, then stop. Measured, not hoped for: the gap that comes
 *  out is reported in api.stats.contrast. */
function separateFrom(hex, refHex, minDelta) {
  const ref = relLuma(refHex);
  let out = hex;
  for (let i = 0; i < 40; i++) {
    if (relLuma(out) - ref >= minDelta) break;
    const c = new THREE.Color(out);
    const hsl = c.getHSL({ h: 0, s: 0, l: 0 });
    if (hsl.l >= 0.97) break;
    c.setHSL(hsl.h, hsl.s, Math.min(0.97, hsl.l + 0.02));
    out = c.getHex();
  }
  return out;
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

/* A round, soft contact shadow, drawn once and reused. */
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

/* Fix 3 — a very faint radial ground gradient, so the scene stands on
 * something instead of floating in an empty field. Weak on purpose: it is
 * felt rather than seen, and a strong one would read as a vignette. */
function groundTexture() {
  return canvasTexture(512, 512, (g, w) => {
    const r = w / 2;
    const grd = g.createRadialGradient(r, r, r * 0.04, r, r, r);
    grd.addColorStop(0,    'rgba(0,0,0,0.5)');
    grd.addColorStop(0.3,  'rgba(0,0,0,0.26)');
    grd.addColorStop(0.68, 'rgba(0,0,0,0.07)');
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
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17);
    }
    g.stroke();
    g.beginPath(); g.arc(cx, cy, 6.5, 0, Math.PI * 2); g.fill();
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
    g.fillRect(28, 40, w - 120, 9);
    g.globalAlpha = 0.17;
    for (let i = 0; i < 11; i++) {
      const y = 76 + i * 17;
      g.fillRect(28, y, (w - 56) * (i % 4 === 3 ? 0.55 : 0.92), 4);
    }
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
    for (let x = 228; x < w - 14; x += 12) g.fillRect(x, 28, 5, 5);
    g.globalAlpha = 0.22;
    g.fillRect(234, 52, 74, 7);
    g.fillRect(234, 68, 56, 7);
    g.fillRect(234, 100, 74, 34);
    g.globalAlpha = 1;
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    for (let y = 8; y < h; y += 14) g.fillRect(216, y, 3, 8);
  });
}

/* The screen's content before the globe rises: two or three flat rounded
 * rectangles suggesting a page. Deliberately not readable UI — readable
 * content invites the viewer to read it, and they would spend the Rise
 * beat squinting at a fake interface instead of watching the globe. */
function screenTexture(inkHex, groundHex, accentHex) {
  return canvasTexture(512, 320, (g, w, h) => {
    g.fillStyle = `#${new THREE.Color(groundHex).getHexString()}`;
    g.fillRect(0, 0, w, h);
    const rr = (x, y, bw, bh, r) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + bw, y, x + bw, y + bh, r);
      g.arcTo(x + bw, y + bh, x, y + bh, r);
      g.arcTo(x, y + bh, x, y, r);
      g.arcTo(x, y, x + bw, y, r);
      g.closePath(); g.fill();
    };
    g.fillStyle = `#${new THREE.Color(accentHex).getHexString()}`;
    g.globalAlpha = 0.9; rr(46, 42, 150, 26, 13);
    g.fillStyle = `#${new THREE.Color(inkHex).getHexString()}`;
    g.globalAlpha = 0.30; rr(46, 98, w - 160, 58, 16);
    g.globalAlpha = 0.20; rr(46, 178, w - 92, 40, 14);
    g.globalAlpha = 0.14; rr(46, 236, w - 230, 40, 14);
    g.globalAlpha = 1;
  });
}

/* The vertical background gradient, parented to the camera with
 * toneMapped off so it is exactly the neutral the CSS uses. */
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

function buildPalette(theme, chr) {
  const clay = theme.lane === 'clay';
  const land = theme.primary;
  // the ocean starts where it always did, then is pushed up until it
  // clears the land by the required margin
  const oceanSeed = tint(theme.primary, { s: 0.28, l: clay ? 2.25 : 1.9 });
  const ocean = separateFrom(oceanSeed, land, TUNING.scene.minLandOceanLuma);

  return {
    land,
    landSide:  tint(theme.primary, { l: clay ? 0.78 : 0.7 }),
    ocean,
    oceanDeep: tint(theme.primary, { s: 0.4,  l: 1.35 }),
    accent:    theme.accent,
    /* The arcs used to be drawn in the land colour, which is the one thing
     * on screen they are always crossing. They get their own colour, in
     * the accent's family: the whole flight-path language is then one hue,
     * and fix 8's bright path -- origin pin, active arc, travelling pulse
     * -- is the saturated end of it. */
    arc:       tint(theme.accent, { s: 0.52, l: 1.18 }),
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
    trafficGlow: tint(theme.accent,  { s: 0.6,  l: 1.25 }),

    /* Fix 6, the back of the image: whatever sits furthest away is
     * desaturated as well as dimmed, because distance takes colour out
     * before it takes light out. */
    far:       tint(theme.primary, { s: 0.22, l: 1.5 }),
    /* The atmosphere rim is DARKER than the ground, not brighter. An
     * additive halo is the standard trick and it does nothing at all on a
     * near-white page: there is no headroom left to add light into. A
     * deep rim separates the sphere from the backdrop instead. */
    atmos:     tint(theme.primary, { s: 0.60, l: 0.95 }),

    /* The figure's colours come straight from the config, with one shade
     * derived per surface that needs a second tone. Depth is made by
     * giving the far-side limbs a different flat colour, never by lighting
     * them -- the figure is unlit.
     *
     * Which direction that difference runs is the reference's call, not a
     * rule: the far leg here is LIGHTER and cooler than the near one,
     * which is why it is an explicit config value rather than a derived
     * darker tint. The far arm still goes the other way, because a sleeve
     * behind a torso reads better dimmed. */
    skin:      chr.skin,
    skinFar:   tint(chr.skin,   { s: 1.04, l: 0.88 }),
    skinShade: tint(chr.skin,   { s: 1.14, l: 0.88 }),
    hair:      chr.hair,
    hairFar:   tint(chr.hair,   { s: 1.0,  l: 0.84 }),
    jacket:    chr.jacket,
    jacketFar: tint(chr.jacket, { s: 1.06, l: 0.84 }),
    shirt:     chr.shirt,
    shirtFar:  tint(chr.shirt,  { s: 1.1,  l: 0.92 }),
    bottom:    chr.bottom,
    bottomFar: tint(chr.bottom, { s: 1.04, l: 0.80 }),
    bag:       chr.bag,
    bagStrap:  tint(chr.bag,    { s: 1.02, l: 0.92 }),
    shoe:      chr.shoe,
    shoeFar:   tint(chr.shoe,   { s: 1.0,  l: 1.18 }),
    // eyes, brows and mouth: a dark relative of the hair rather than
    // black, so the head does not acquire two holes in it
    feature:   tint(chr.hair,   { s: 0.55, l: 0.42 }),
    /* The laptop shell is a value step away from the ground, not a tint
     * of it. A pale object on a pale field has no silhouette, which is
     * fix 2's argument applied to what he is carrying. */
    shellLight: tint(theme.primary, { s: 0.16, l: 2.70 }),
    shellDark:  tint(theme.primary, { s: 0.35, l: 1.45 }),
    plinth:     tint(theme.primary, { s: 0.22, l: 1.85 }),
    plinthTop:  tint(theme.primary, { s: 0.18, l: 2.25 }),
    outline:   tint(theme.primary, { s: 0.75, l: 0.3 })
  };
}

/** One surface material in the current lane. */
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

/** Flat, unlit, one colour. Everything the character and the laptop are
 *  made of. No specular, no environment reflection, no roughness. */
const flat = colorHex => new THREE.MeshBasicMaterial({ color: colorHex });

/* ---- the hologram uniform -------------------------------------------- *
 *
 *  One number, shared by the three globe materials: 1 is fully holographic
 *  and 0 is the solid globe the interactive scene shows. There is no
 *  second globe to swap to. The timeline drives it to 0 as the Rise beat
 *  completes, because a translucent scanlined globe is unreadable and the
 *  destinations are the point.
 *
 *  The effect is additive only — a fresnel rim in the accent colour and a
 *  few horizontal scanlines. It never touches alpha, so the globe stays
 *  opaque and no depth sorting changes between beats.
 */
const HOLO = { amount: { value: 0 }, rim: { value: new THREE.Color('#ffffff') }, time: { value: 0 } };

function makeHolographic(mat) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uHolo = HOLO.amount;
    shader.uniforms.uHoloRim = HOLO.rim;
    shader.uniforms.uHoloTime = HOLO.time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vHoloN; varying vec3 vHoloV; varying float vHoloY;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHoloN = transformedNormal;
        vHoloV = -(modelViewMatrix * vec4(transformed, 1.0)).xyz;
        vHoloY = (modelMatrix * vec4(transformed, 1.0)).y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uHolo; uniform vec3 uHoloRim; uniform float uHoloTime;
        varying vec3 vHoloN; varying vec3 vHoloV; varying float vHoloY;`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        if (uHolo > 0.001) {
          float fres = pow(1.0 - clamp(abs(dot(normalize(vHoloN), normalize(vHoloV))), 0.0, 1.0), 2.2);
          // uHoloTime is the loop phase scaled by a whole number of cycles,
          // never a raw clock, or the scanline alone would stop the loop
          // from closing.
          float scan = 0.5 + 0.5 * sin((vHoloY * 22.0) - uHoloTime * 6.2831853);
          vec3 lit = gl_FragColor.rgb;
          lit += uHoloRim * fres * 1.5 * uHolo;
          lit *= 1.0 - 0.13 * uHolo * (1.0 - scan);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, lit, 1.0);
        }`);
  };
  mat.customProgramCacheKey = () => 'holo';
  return mat;
}

function buildMaterials() {
  PAL = buildPalette(cfg.theme, cfg.character.palette);
  TEX = {
    shadow:  contactShadowTexture(),
    ground:  groundTexture(),
    star:    discTexture(0.35),
    bokeh:   discTexture(0.08),
    blur:    discTexture(0.0),
    motif:   rickshawMotifTexture(PAL.accent, tint(cfg.theme.primary, { s: 0.55, l: 0.5 })),
    paper:   paperTexture(PAL.ink, PAL.paper),
    pass:    boardingPassTexture(PAL.ink, PAL.paper, PAL.accent),
    screen:  screenTexture(PAL.ink, tint(cfg.theme.neutral, { s: 0.35, l: 0.98 }), PAL.accent),
    bg:      gradientTexture(PAL.bgTop, PAL.bgBottom)
  };

  MAT = {
    ocean: makeHolographic(new THREE.MeshPhysicalMaterial({
      color: PAL.ocean, roughness: cfg.theme.lane === 'clay' ? 0.55 : 0.9,
      metalness: 0,
      clearcoat: cfg.theme.lane === 'clay' ? 0.35 : 0, clearcoatRoughness: 0.6,
      flatShading: cfg.theme.lane === 'lowpoly', envMapIntensity: 0.9
    })),
    land:     makeHolographic(surface(PAL.land, { rough: 0.72 })),
    landSide: makeHolographic(surface(PAL.landSide, { rough: 0.8, clearcoat: 0 })),
    pin:      surface(PAL.pin, { rough: 0.6 }),
    pinHot:   surface(PAL.accent, { rough: 0.5 }),
    origin:   surface(PAL.accent, { rough: 0.5 }),
    landmark: surface(tint(cfg.theme.neutral, { s: 0.6, l: 0.9 }), { rough: 0.75 }),

    city:      makeHolographic(surface(PAL.city, { rough: 0.6 })),
    skyline:   makeHolographic(surface(PAL.skylineTint, { rough: 0.8 })),
    outline:   new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }),
    graticule: new THREE.LineBasicMaterial({ color: PAL.graticule, transparent: true, opacity: 0.3 }),
    pick:      new THREE.MeshBasicMaterial({ color: PAL.accent, transparent: true, opacity: 0.95, depthWrite: false }),

    paper:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.paper, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }),
    pass:     new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.pass,  roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    cover:    new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.motif, roughness: 0.78, metalness: 0 }),
    paperEdge: surface(PAL.paperEdge, { rough: 0.9, clearcoat: 0 }),
    cap:      surface(tint(cfg.theme.primary, { s: 0.4, l: 1.9 }), { rough: 0.7 }),
    metal:    surface(PAL.metal, { rough: 0.35, metal: 0.65, clearcoat: 0.2 }),
    case:     surface(tint(cfg.theme.primary, { s: 0.33, l: 2.05 }), { rough: 0.7 }),
    plane:    surface(tint(cfg.theme.neutral, { l: 0.99 }), { rough: 0.5 }),
    planeAcc: surface(PAL.accent, { rough: 0.5 }),

    /* ---- the flat, unlit set: the character and what he carries -------- */
    skin:      flat(PAL.skin),
    skinFar:   flat(PAL.skinFar),
    skinShade: flat(PAL.skinShade),
    hair:      flat(PAL.hair),
    hairFar:   flat(PAL.hairFar),
    jacket:    flat(PAL.jacket),
    jacketFar: flat(PAL.jacketFar),
    shirt:     flat(PAL.shirt),
    shirtFar:  flat(PAL.shirtFar),
    feature:   flat(PAL.feature),
    bottom:    flat(PAL.bottom),
    bottomFar: flat(PAL.bottomFar),
    bag:       flat(PAL.bag),
    bagStrap:  flat(PAL.bagStrap),
    shell:     flat(PAL.shellLight),
    shellDark: flat(PAL.shellDark),
    plinth:    flat(PAL.plinth),
    plinthTop: flat(PAL.plinthTop),
    shoe:      flat(PAL.shoe),
    shoeFar:   flat(PAL.shoeFar),
    outline:   new THREE.MeshBasicMaterial({ color: PAL.outline, side: THREE.BackSide }),

    // taste-skill-ignore: a 3D contact-shadow mesh, not a CSS shadow.
    // One material under the globe and under the figure, carrying its
    // own opacity -- so the handover fade must leave it alone, and
    // setOpacity() skips anything flagged noFade.
    shadow: Object.assign(new THREE.MeshBasicMaterial({
      map: TEX.shadow, transparent: true, opacity: T.shadowOpacity,
      depthWrite: false, color: tint(cfg.theme.primary, { s: 0.8, l: 0.25 })
    }), { userData: { noFade: true } }),
    ground: new THREE.MeshBasicMaterial({
      map: TEX.ground, transparent: true, opacity: TUNING.scene.groundOpacity,
      depthWrite: false, color: tint(cfg.theme.primary, { s: 0.75, l: 0.35 })
    }),
    star: new THREE.PointsMaterial({
      map: TEX.star, color: PAL.star, size: 0.085, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.NormalBlending
    })
  };
}

/** Hot colour change: mutate what exists instead of rebuilding. Textures
 *  that bake a colour are redrawn; nothing is disposed and recreated, so
 *  the preview never flashes. */
function applyThemeColours() {
  PAL = buildPalette(cfg.theme, cfg.character.palette);
  const solid = {
    ocean: PAL.ocean, land: PAL.land, landSide: PAL.landSide, pin: PAL.pin,
    pinHot: PAL.accent, origin: PAL.accent, paperEdge: PAL.paperEdge,
    landmark: tint(cfg.theme.neutral, { s: 0.6, l: 0.9 }),
    city: PAL.city, skyline: PAL.skylineTint, graticule: PAL.graticule, pick: PAL.accent,
    cap: tint(cfg.theme.primary, { s: 0.4, l: 1.9 }),
    metal: PAL.metal, case: tint(cfg.theme.primary, { s: 0.33, l: 2.05 }),
    plane: tint(cfg.theme.neutral, { l: 0.99 }), planeAcc: PAL.accent,
    skin: PAL.skin, skinFar: PAL.skinFar, skinShade: PAL.skinShade,
    hair: PAL.hair, hairFar: PAL.hairFar, feature: PAL.feature,
    jacket: PAL.jacket, jacketFar: PAL.jacketFar,
    shirt: PAL.shirt, shirtFar: PAL.shirtFar,
    bottom: PAL.bottom, bottomFar: PAL.bottomFar,
    bag: PAL.bag, bagStrap: PAL.bagStrap,
    shell: PAL.shellLight, shellDark: PAL.shellDark,
    plinth: PAL.plinth, plinthTop: PAL.plinthTop,
    shoe: PAL.shoe, shoeFar: PAL.shoeFar,
    outline: PAL.outline,
    shadow: tint(cfg.theme.primary, { s: 0.8, l: 0.25 }),
    ground: tint(cfg.theme.primary, { s: 0.75, l: 0.35 }),
    star: PAL.star
  };
  for (const [key, hex] of Object.entries(solid)) MAT[key]?.color.set(hex);
  HOLO.rim.value.set(PAL.accent);
  if (atmosphere) atmosphere.material.uniforms.uColor.value.set(PAL.atmos);
  if (outlines) outlines.geometry = buildOutlines(GEO.arcs, GEO.uses);
  if (traffic) {
    traffic.mat.uniforms.uBase.value.set(PAL.traffic);
    traffic.mat.uniforms.uGlow.value.set(PAL.trafficGlow);
  }

  for (const [key, make] of [
    ['motif',  () => rickshawMotifTexture(PAL.accent, tint(cfg.theme.primary, { s: 0.55, l: 0.5 }))],
    ['paper',  () => paperTexture(PAL.ink, PAL.paper)],
    ['pass',   () => boardingPassTexture(PAL.ink, PAL.paper, PAL.accent)],
    ['screen', () => screenTexture(PAL.ink, tint(cfg.theme.neutral, { s: 0.35, l: 0.98 }), PAL.accent)],
    ['bg',     () => gradientTexture(PAL.bgTop, PAL.bgBottom)]
  ]) {
    TEX[key].dispose();
    TEX[key] = make();
  }
  MAT.cover.map = TEX.motif; MAT.cover.needsUpdate = true;
  MAT.paper.map = TEX.paper; MAT.paper.needsUpdate = true;
  MAT.pass.map  = TEX.pass;  MAT.pass.needsUpdate  = true;
  if (laptop) { laptop.screenMat.uniforms.uMap.value = TEX.screen; }
  if (backdrop) { backdrop.material.map = TEX.bg; backdrop.material.needsUpdate = true; }
  if (lightCone) lightCone.material.uniforms.uColor.value.set(tint(cfg.theme.accent, { s: 0.42, l: 1.6 }));

  for (const a of arcs) a.setColours(PAL.arc, PAL.accent);
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
 *  9.  GLOBE — ocean, extruded continents, atmosphere shell, ground      *
 *                                                                        *
 *  Continents are real Natural Earth 110m outlines (public domain, via   *
 *  the world-atlas package), decoded from TopoJSON, triangulated in      *
 *  lon/lat and projected onto the sphere. Carried over from version one  *
 *  unchanged; what is new is the atmosphere shell around it and the      *
 *  ground beneath it.                                                    *
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

// Resolved against the app's base rather than the server root, so the globe
// still finds its country outlines when the site is served from a
// sub-folder (XAMPP's htdocs\something) instead of a domain root.
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
 *  Unwrapping keeps it continuous so the triangulation stays sane. */
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
      // Analytic sphere normals. computeVertexNormals() on 35,000 unwelded
      // triangles gives face normals, and earcut's long thin strips then
      // read as a striped plate rather than a sphere.
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

/* Fix 6 — the atmosphere shell. A slightly larger inverted sphere with a
 * fresnel rim: it is what gives the globe a near edge and a far edge
 * instead of one flat disc, and it costs one draw call. */
const ATMOS_VERT = `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const ATMOS_FRAG = `
  uniform vec3  uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vN; varying vec3 vV;
  void main() {
    float f = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, f * uStrength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

let globeMesh = null, landMesh = null, landSideMesh = null;
let atmosphere = null, globeShadow = null, ground = null;
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

  atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * TUNING.scene.atmosphereScale, 48, 28),
    new THREE.ShaderMaterial({
      vertexShader: ATMOS_VERT, fragmentShader: ATMOS_FRAG,
      transparent: true, depthWrite: false, side: THREE.BackSide,
      uniforms: {
        uColor:    { value: new THREE.Color(PAL.atmos) },
        uPower:    { value: TUNING.scene.atmospherePower },
        uStrength: { value: TUNING.scene.atmosphereStrength }
      }
    })
  );
  atmosphere.name = 'atmosphere';
  atmosphere.renderOrder = 4;
  L.globe.add(atmosphere);

  // Fix 3, the globe's half: a soft elliptical contact plane under it.  (taste-skill-ignore: geometry, not CSS)
  // It belongs to the interactive scene only — a hologram standing in the
  // air above a laptop does not cast one, and the light cone does that job
  // in the cinematic instead.
  globeShadow = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.4, R * 2.3), MAT.shadow);  // taste-skill-ignore: a 3D mesh, not a CSS shadow
  globeShadow.rotation.x = -Math.PI / 2;
  globeShadow.position.y = -R * 1.14;
  globeShadow.renderOrder = -1;
  globeShadow.visible = false;
  L.globe.add(globeShadow);
}

/* Fix 3, the other half: the ground the whole scene stands on. */
function buildGround() {
  ground = new THREE.Mesh(
    new THREE.CircleGeometry(TUNING.scene.groundRadius, 48),
    MAT.ground
  );
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.002;
  ground.renderOrder = -2;
  cineRoot.add(ground);
}

/* ====================================================================== *
 *  10.  ARCS — lifted great circles with a travelling pulse              *
 *                                                                        *
 *  Fix 4. Version one swept a quadratic bezier between two points on the *
 *  sphere, and for any hop longer than about a quarter of the world the  *
 *  curve near its ends sits inside the sphere: the control triangle's    *
 *  chord cuts through. On screen that was a red line that vanished into  *
 *  the surface and came out again, which read as a scratch rather than a *
 *  flight path.                                                          *
 *                                                                        *
 *  The curve is now a great circle — the endpoints slerped, each sample  *
 *  lifted by a base offset plus a sine arch — so its radius is never     *
 *  less than R(1 + arcLiftBase), whatever the distance. Depth testing    *
 *  then does the right thing on its own: the far half is occluded by the *
 *  globe rather than drawn through it, and the alpha fade toward the     *
 *  limb stops that occlusion from reading as a hard cut.                 *
 * ====================================================================== */

const ARC_VERT = `
  varying vec2  vUv;
  varying float vFace;
  void main() {
    vUv = uv;
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 centre = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // how squarely this point faces the camera: 1 dead centre, 0 on the limb
    vFace = dot(normalize(wp - centre), normalize(cameraPosition - wp));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const ARC_FRAG = `
  uniform vec3  uBase;
  uniform vec3  uGlow;
  uniform float uHead;     // 0..1, where the light currently is
  uniform float uWidth;    // how long the trailing light is
  uniform float uBoost;    // hover brightens and lengthens it
  uniform float uDraw;     // 0..1, how much of the arc exists yet
  uniform float uActive;   // 0..1, this is the arc the eye should follow
  uniform float uHorizon;
  uniform float uOpacity;
  varying vec2  vUv;
  varying float vFace;
  void main() {
    if (vUv.x > uDraw) discard;
    float d = fract(vUv.x - uHead);
    float g = smoothstep(uWidth * uBoost, 0.0, d);
    // Fix 8: the accent lands on the active arc, its pulse and the origin
    // pin together, so they read as one bright path rather than as two
    // unrelated dots.
    vec3  base = mix(uBase, uGlow, uActive * 0.8);
    vec3  c = mix(base, uGlow, clamp(g * 1.15, 0.0, 1.0));
    float a = (0.58 + 0.42 * g) * (0.55 + 0.45 * uBoost) * uOpacity;
    a *= smoothstep(0.0, uHorizon, vFace);     // fade out toward the limb
    if (a < 0.004) discard;
    gl_FragColor = vec4(c, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const arcs = [];

/** A great circle from a to b, lifted off the surface. Sampled rather than
 *  solved: forty-eight slerped points through a Catmull-Rom is smooth at
 *  this radius and keeps the radius guarantee exact at every sample. */
function arcCurve(a, b) {
  const pa = ll2v(a.lat, a.lon, 1).normalize();
  const pb = ll2v(b.lat, b.lon, 1).normalize();
  const angle = pa.angleTo(pb);
  const peak = TUNING.scene.arcLiftPerRadian * angle;
  const n = 48;
  const pts = [];
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3().crossVectors(pa, pb);
  // two points on exactly opposite sides of the world give no axis; pick
  // any perpendicular rather than dividing by zero
  if (axis.lengthSq() < 1e-10) axis.set(0, 1, 0).cross(pa);
  axis.normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    q.setFromAxisAngle(axis, angle * t);
    const r = R * (1 + TUNING.scene.arcLiftBase + peak * Math.sin(Math.PI * t));
    pts.push(pa.clone().applyQuaternion(q).multiplyScalar(r));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
}

function buildArcs() {
  const dests = activeDestinations();
  dests.forEach((d, i) => {
    const curve = arcCurve(cfg.origin, d);
    const geo = new THREE.TubeGeometry(curve, T.arcSegments, TUNING.scene.arcTubeRadius, 7, false);
    const mat = new THREE.ShaderMaterial({
      vertexShader: ARC_VERT, fragmentShader: ARC_FRAG,
      transparent: true, depthWrite: false,
      uniforms: {
        uBase:    { value: new THREE.Color(PAL.arc) },
        uGlow:    { value: new THREE.Color(PAL.accent) },
        uHead:    { value: 0 },
        uWidth:   { value: 0.3 },
        uBoost:   { value: 1 },
        uDraw:    { value: 1 },
        uActive:  { value: 0 },
        uHorizon: { value: TUNING.scene.arcHorizonFade },
        uOpacity: { value: 1 }
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
      active: 0, activeTarget: 0,
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

    const lm = new THREE.Mesh(LANDMARKS[d.landmark] || LANDMARKS['generic-tower'], MAT.landmark);
    lm.name = `landmark-${d.code}`;
    lm.position.copy(ll2v(d.lat, d.lon, R * 1.004));
    lm.quaternion.copy(q);
    lm.scale.setScalar(0.92);
    globeSpin.add(lm);

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
      scale: 1, scaleTarget: 1, labelOpacity: 0, labelTarget: 0,
      pop: 1, popTarget: 1, hot: false
    });
  });

  pinMesh.instanceMatrix.needsUpdate = true;
  if (pinMesh.instanceColor) pinMesh.instanceColor.needsUpdate = true;

  // the origin: an accent pin, larger, with a ring at its foot. One third
  // of the bright path fix 8 asks for.
  originPin = new THREE.Group();
  originPin.name = 'origin-pin';
  const op = new THREE.Mesh(pinGeometry(), MAT.origin);
  op.scale.setScalar(1.22);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.009, 6, 20), MAT.origin);
  ring.rotation.x = Math.PI / 2;
  originPin.add(op, ring);
  const ob = ll2v(cfg.origin.lat, cfg.origin.lon, R * 1.012);
  originPin.position.copy(ob);
  originPin.quaternion.setFromUnitVectors(PIN_UP, ob.clone().normalize());
  globeSpin.add(originPin);
}

/* ====================================================================== *
 *  12.  DOCUMENTS — the interactive scene only                           *
 *                                                                        *
 *  Fix 5: four props rather than six, each a little over twice the size,  *
 *  on a tighter orbit so none of them leaves the frame. A prop nobody     *
 *  can identify is noise, and the two that were hardest to read at a      *
 *  glance — the book stack and the offer sheet — are the two that went.   *
 *                                                                        *
 *  The cinematic cuts them entirely. They compete with the character and  *
 *  the laptop for the same attention and the frame cannot hold both.      *
 *                                                                        *
 *  The passport is closed, nothing carries a stamp and the seal is a      *
 *  plain ring: nothing here states or implies a visa outcome.             *
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
  const S = TUNING.scene.documentScale;
  const defs = [
    { name: 'passport',       make: buildPassport,     radius: 1.00, speed: 1, tiltDeg: -30, phase: 0.00, bobCycles: 1, spinCycles: 1, faceTilt: -0.18, scale: 1.08 },
    { name: 'boarding-pass',  make: buildBoardingPass, radius: 1.06, speed: 1, tiltDeg:  26, phase: 0.25, bobCycles: 2, spinCycles: 1, faceTilt:  0.24, scale: 1.00 },
    { name: 'graduation-cap', make: buildCap,          radius: 0.96, speed: 1, tiltDeg:  12, phase: 0.50, bobCycles: 2, spinCycles: 1, faceTilt:  0.30, scale: 0.98 },
    { name: 'suitcase',       make: buildSuitcase,     radius: 1.04, speed: 1, tiltDeg: -15, phase: 0.75, bobCycles: 1, spinCycles: 1, faceTilt:  0.14, scale: 0.94 }
  ];

  for (const d of defs) {
    const pivot = new THREE.Group();          // carries the orbit
    pivot.name = `doc-${d.name}`;
    pivot.rotation.z = THREE.MathUtils.degToRad(d.tiltDeg);
    const holder = new THREE.Group();         // carries hover lift and spin
    const body = d.make();
    body.scale.setScalar(d.scale * S);
    holder.add(body);
    pivot.add(holder);
    L.documents.add(pivot);
    documents.push({
      ...d, pivot, holder, body,
      lift: 0, liftTarget: 0,
      spinLag: 0,
      deflect: new THREE.Vector2()
    });
  }
  L.documents.visible = false;                // the cinematic owns the frame
}

/* ====================================================================== *
 *  13.  PARTICLES — starfield, bokeh, and the fake depth of field        *
 *                                                                        *
 *  Fix 6's third part. Real post-process depth of field is not worth its *
 *  cost at this scale, so the blur is a second particle layer: a handful *
 *  of large, very soft, desaturated sprites sitting behind everything.   *
 *  They give the back of the image something to be out of focus.         *
 * ====================================================================== */

let starPoints = null;
const bokeh = [];
const blurs = [];

function buildParticles() {
  const n = T.stars;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
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

  // the out-of-focus layer, behind: desaturated, because distance takes
  // colour out of a thing before it takes light out
  for (let i = 0; i < T.blur; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.blur, color: PAL.far, transparent: true,
      opacity: 0.1 + rand() * 0.08, depthWrite: false,
      blending: THREE.NormalBlending
    }));
    s.name = `far-blur-${i + 1}`;
    const size = 3.4 + rand() * 3.2;
    s.scale.set(size, size, 1);
    const home = new THREE.Vector3((rand() - 0.5) * 11, (rand() - 0.5) * 5.4, -3.2 - rand() * 2.4);
    s.position.copy(home);
    L.stars.add(s);
    blurs.push({ sprite: s, home, cycles: 1, phase: rand(), amp: 0.2 + rand() * 0.22 });
  }

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
 *  15.  CHARACTER — a rigid paper-doll rig, not a skinned mesh           *
 *                                                                        *
 *  This is the decision the whole build hangs on. Flat illustration has  *
 *  no soft deformation: limbs are solid shapes that pivot at joints. So  *
 *  the figure is sixteen separate rigid meshes in a parent hierarchy and *
 *  every pose is a set of Euler angles. No skinning, no morph targets,   *
 *  no animation clips, no bone weights anywhere.                         *
 *                                                                        *
 *  What that buys:                                                       *
 *    - roughly a tenth the runtime cost of a skinned character           *
 *    - no rigging pipeline and no third-party account                    *
 *    - fully deterministic under capture                                 *
 *    - the rest pose is a numeric comparison, which is how beat 6 is     *
 *      proved to return to frame 0 exactly rather than approximately     *
 *                                                                        *
 *  The figure is original work for this project. It is modelled from the *
 *  measurements below and from nothing else; no stock illustration, no   *
 *  scan and no third-party model is traced, re-drawn or referenced.      *
 *                                                                        *
 *  It is deliberately non-specific: a neutral tone from the palette,     *
 *  unmarked clothing, mitten hands with no fingers, and no features that *
 *  read as one ethnicity or gender in particular.                        *
 * ====================================================================== */

/* Proportions, in world units. The head is about one sixth of the total
 * height, which is the stylised ratio the flat-illustration look wants;
 * a realistic one-eighth reads as a mannequin at this level of detail. */
const RIG = {
  height:    1.79,
  hipY:      0.95,
  torsoLen:  0.505,
  neckLen:   0.085,
  /* About a seventh of the total height. The stylised one-sixth head of
   * the first pass read as a mannequin beside this reference, which is
   * nearer life proportion: slim, long-legged, small-headed. */
  headR:     0.125,
  shoulderX: 0.185,   // clear of the torso, or the arms vanish inside it
  shoulderY: 0.42,
  upperArm:  0.32,
  foreArm:   0.28,
  handLen:   0.10,
  hipX:      0.098,
  thigh:     0.43,
  shin:      0.43,
  footLen:   0.22,
  footH:     0.095,
  /* Flat illustration reads a body as a rounded rectangle, not as a
   * sausage. Every limb is a capsule flattened in z and widened in x by
   * these, which costs nothing and is most of what makes the silhouette
   * look drawn rather than modelled. */
  flatZ:     0.64,
  torsoWide: 1.10
};

/* ---- the three poses ------------------------------------------------- *
 *
 *  Three, and everything else is interpolation plus the joint lag. A
 *  continuously hand-authored performance costs days and reads worse.
 *
 *      rest    frames 0 and 300. Arms down, weight on the far leg,
 *              lid closed. This is the loop's anchor.
 *      reach   mid beat 1. The near arm extended to the lid.
 *      watch   beats 3 to 5. Head angled toward the hologram; the nod in
 *              beat 5 is a separate additive track on the neck.
 *
 *  Angles are radians, [x, y, z] Euler, local to the parent joint.
 *  'n' is the near side (the one toward the camera and the laptop) and
 *  'f' the far side.
 */
const POSES = {
  /* Both hands under the laptop, lid shut, head down over it. This is
   * frame 0 and frame 300, and the anchor the whole loop returns to. */
  rest: {
    root:      [0, 0, 0],
    hips:      [0, 0, 0.03],
    torso:     [0.06, -0.04, -0.02],
    neck:      [0.40, -0.10, 0],
    head:      [0, 0, 0],
    armN:      [-0.38, 0.14, 0],
    foreN:     [-1.25, 0, -0.10],
    handN:     [-0.25, 0, 0],
    armF:      [-0.38, -0.14, 0],
    foreF:     [-1.25, 0, 0.10],
    handF:     [-0.25, 0, 0],
    thighN:    [0.16, 0, -0.035],
    shinN:     [-0.18, 0, 0],
    footN:     [0.03, 0, 0],
    thighF:    [-0.09, 0, 0.028],
    shinF:     [0.07, 0, 0],
    footF:     [0.02, 0, 0],
    bag:       [0, 0, 0]
  },

  /* The far hand keeps carrying; the near one comes up to the lid. */
  reach: {
    root:      [0, 0, 0],
    hips:      [0, 0.02, 0.02],
    torso:     [0.10, -0.10, -0.02],
    neck:      [0.44, -0.16, 0],
    head:      [0, 0, 0],
    armN:      [-0.71, 0.68, 0],
    foreN:     [-1.79, 0, 0],
    handN:     [-0.28, 0, 0],
    armF:      [-0.38, -0.14, 0],
    foreF:     [-1.25, 0, 0.10],
    handF:     [-0.25, 0, 0],
    thighN:    [0.14, 0, -0.08],
    shinN:     [-0.16, 0, 0],
    footN:     [0.03, 0, 0],
    thighF:    [-0.08, 0, 0.028],
    shinF:     [0.06, 0, 0],
    footF:     [0.02, 0, 0],
    bag:       [0, 0, 0]
  },

  /* Still carrying, head up and across at the hologram. The nod in beat 5
   * is a separate additive track on the same neck joint. */
  watch: {
    root:      [0, 0, 0],
    hips:      [0, -0.02, 0.03],
    torso:     [-0.04, -0.10, -0.02],
    neck:      [-0.24, -0.44, 0.03],
    head:      [0, 0, 0],
    armN:      [-0.36, 0.14, 0],
    foreN:     [-1.23, 0, -0.10],
    handN:     [-0.25, 0, 0],
    armF:      [-0.36, -0.14, 0],
    foreF:     [-1.23, 0, 0.10],
    handF:     [-0.25, 0, 0],
    thighN:    [0.15, 0, -0.035],
    shinN:     [-0.17, 0, 0],
    footN:     [0.03, 0, 0],
    thighF:    [-0.09, 0, 0.028],
    shinF:     [0.07, 0, 0],
    footF:     [0.02, 0, 0],
    bag:       [0, 0, 0]
  }
};

const JOINT_KEYS = Object.keys(POSES.rest);

/* How many frames behind its parent each joint runs. Overlapping action:
 * without it the rig reads as a cardboard cut-out however good the poses
 * are, and it is most of the difference between a stiff rig and an
 * animated one. Depth in the hierarchy, times TUNING.cine.lagFrames. */
const JOINT_DEPTH = {
  root: 0, hips: 0, torso: 1, neck: 2, head: 3, bag: 2,
  armN: 2, foreN: 3, handN: 4,
  armF: 2, foreF: 3, handF: 4,
  thighN: 1, shinN: 2, footN: 3,
  thighF: 1, shinF: 2, footF: 3
};

let character = null;

function buildCharacter() {
  const mk = (geo, mat, pos) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    // Optional ink outline: the same shape again at 1.02 with front faces
    // culled. It gives the line-art edge of flat illustration almost free,
    // at the cost of one draw call per part, and it reads cheap at small
    // sizes -- which is why it is a config toggle and off by default.
    if (cfg.character.outline) {
      const o = new THREE.Mesh(geo, MAT.outline);
      o.scale.setScalar(1.035);
      m.add(o);
    }
    return m;
  };
  const joint = (name, parent, pos) => {
    const g = new THREE.Group();
    g.name = `joint-${name}`;
    if (pos) g.position.set(...pos);
    parent.add(g);
    return g;
  };

  const capsule = (r, len, seg) => new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 3, seg);
  const SEG = T.jointDetail ? 10 : 6;
  /** A limb, flattened toward the camera plane so its silhouette is a
   *  rounded rectangle rather than a tube. */
  const limb = (mesh, wide = 1) => { mesh.scale.set(wide, 1, RIG.flatZ); return mesh; };

  const root = new THREE.Group();
  root.name = 'character';
  root.position.set(...TUNING.cine.characterPos);
  root.rotation.y = TUNING.cine.characterTurnRad;

  const J = {};
  J.root = root;
  J.hips = joint('hips', root, [0, RIG.hipY, 0]);

  /* ---- torso, neck, head --------------------------------------------
   *
   *  An open hoodie over a t-shirt is two shapes, not one. The hoodie is
   *  the body; the shirt is a narrower capsule pushed far enough forward
   *  to break its front surface. That one white strip down the middle is
   *  what makes the jacket read as open rather than as a blue tube, and
   *  it costs a single mesh.
   */
  J.hips.add(limb(mk(capsule(0.118, 0.28, SEG), MAT.bottom, [0, -0.05, 0]), 1.12));

  J.torso = joint('torso', J.hips, [0, 0, 0]);
  const TL = RIG.torsoLen;
  // the hoodie, hanging past the waist
  J.torso.add(limb(mk(capsule(0.130, TL + 0.20, SEG), MAT.jacket, [0, TL / 2 - 0.045, 0]), 1.08));
  // the shirt, showing down the open front
  const shirt = mk(capsule(0.042, TL + 0.09, SEG), MAT.shirt, [0, TL / 2 - 0.012, 0.052]);
  shirt.scale.set(1.0, 1, 0.9);
  J.torso.add(shirt);
  // the hood, bunched behind the neck
  const hood = mk(new THREE.SphereGeometry(0.098, SEG + 2, SEG), MAT.jacket, [0, TL - 0.035, -0.072]);
  hood.scale.set(1.2, 0.9, 0.8);
  J.torso.add(hood);
  // Both pack straps, over the shoulders and down the chest. They belong
  // to the torso rather than to the pack, so they stay put while the pack
  // rides its own joint.
  for (const sx of [-1, 1]) {
    const strap = mk(capsule(0.027, 0.36, 6), MAT.bagStrap, [sx * 0.093, TL * 0.58, 0.082]);
    strap.rotation.set(0.10, 0, sx * 0.17);
    strap.scale.set(1, 1, 0.72);
    J.torso.add(strap);
  }

  J.neck = joint('neck', J.torso, [0, TL, 0]);
  J.neck.add(limb(mk(capsule(0.045, RIG.neckLen + 0.06, SEG), MAT.skinShade, [0, RIG.neckLen / 2 - 0.01, 0]), 1));

  J.head = joint('head', J.neck, [0, RIG.neckLen, 0]);
  const HEAD_SCALE = [0.94, 1.04, 0.88];
  const headMesh = mk(new THREE.SphereGeometry(RIG.headR, SEG + 4, SEG + 2), MAT.skin, [0, RIG.headR * 0.9, 0]);
  headMesh.scale.set(HEAD_SCALE[0], HEAD_SCALE[1], HEAD_SCALE[2]);
  J.head.add(headMesh);

  /* A face: two eyes, two brows and a mouth, and nothing else. The head is
   * an ellipsoid, so each feature is placed on its actual surface rather
   * than on a sphere of some guessed radius -- otherwise the brows sink
   * into the forehead while the eyes float off the cheeks. */
  const faceAt = (x, y, out) => {
    const xh = RIG.headR * HEAD_SCALE[0], yh = RIG.headR * HEAD_SCALE[1], zh = RIG.headR * HEAD_SCALE[2];
    const k = Math.max(0, 1 - (x / xh) * (x / xh) - (y / yh) * (y / yh));
    return [x, y, zh * Math.sqrt(k) + (out === undefined ? 0.004 : out)];
  };
  const features = mergeParts([
    [new THREE.SphereGeometry(0.0145, 8, 6), faceAt(-0.042, -0.004), null, [1, 1.25, 0.45]],
    [new THREE.SphereGeometry(0.0145, 8, 6), faceAt( 0.042, -0.004), null, [1, 1.25, 0.45]],
    // the brows sit a clear gap above the eyes; any closer and the two
    // merge into one dark band across the face at the size this renders
    [box(0.036, 0.0085, 0.014), faceAt(-0.044, 0.056), [0, 0,  0.05]],
    [box(0.036, 0.0085, 0.014), faceAt( 0.044, 0.056), [0, 0, -0.05]],
    // a mouth is one short bar at this size; anything more is a smudge
    [box(0.040, 0.0115, 0.014), faceAt(0, -0.056)]
  ]);
  J.head.add(mk(features, MAT.feature, [0, RIG.headR * 0.9, 0]));

  /* Short, with the fringe swept up and across. variant changes this
   * geometry and the part colours, and nothing else, so adding a second
   * figure later costs nothing structural. */
  const hairGeo = cfg.character.variant === 'alt'
    ? mergeParts([
        [new THREE.SphereGeometry(RIG.headR * 1.10, SEG + 4, SEG + 2, 0, Math.PI * 2, 0, Math.PI * 0.50), [0, 0, 0]],
        [new THREE.SphereGeometry(RIG.headR * 0.74, SEG, SEG), [0, -RIG.headR * 0.44, -RIG.headR * 0.50], null, [1.05, 1.2, 0.95]]
      ])
    : mergeParts([
        // the mass over the crown, back and sides
        [new THREE.SphereGeometry(RIG.headR * 1.10, SEG + 4, SEG + 2, 0, Math.PI * 2, 0, Math.PI * 0.50), [0, 0, 0]],
        // fuller and lower at the back
        [new THREE.SphereGeometry(RIG.headR * 0.84, SEG, SEG), [0, -RIG.headR * 0.26, -RIG.headR * 0.42], null, [1.0, 0.92, 0.94]],
        // the quiff, swept up off the forehead and over
        [new THREE.SphereGeometry(RIG.headR * 0.54, SEG, SEG), [-RIG.headR * 0.20, RIG.headR * 0.62, RIG.headR * 0.42],
         [0.30, 0, 0.42], [1.5, 0.72, 1.0]],
        // sideburns, which is what stops short hair reading as a helmet
        [box(RIG.headR * 0.17, RIG.headR * 0.40, RIG.headR * 0.30), [-RIG.headR * 0.88, -RIG.headR * 0.26, -RIG.headR * 0.06]],
        [box(RIG.headR * 0.17, RIG.headR * 0.40, RIG.headR * 0.30), [ RIG.headR * 0.88, -RIG.headR * 0.26, -RIG.headR * 0.06]]
      ]);
  const hair = mk(hairGeo, MAT.hair, [0, RIG.headR * 0.9, 0]);
  hair.scale.set(HEAD_SCALE[0], HEAD_SCALE[1], HEAD_SCALE[2]);
  J.head.add(hair);

  /* ---- arms ----------------------------------------------------------
   * The near side is the one toward the camera. The far side is drawn in
   * a different flat colour, which is how the reference makes depth --
   * not by lighting it, because the figure is unlit in both art lanes.
   * The sleeve runs to the wrist, so the only skin is the mitten. */
  const arm = (side, sx, matSleeve, matHand) => {
    const a = joint('arm' + side, J.torso, [sx * RIG.shoulderX, RIG.shoulderY, 0]);
    a.add(limb(mk(capsule(0.052, RIG.upperArm + 0.03, SEG), matSleeve, [0, -RIG.upperArm / 2, 0]), 1));
    const f = joint('fore' + side, a, [0, -RIG.upperArm, 0]);
    f.add(limb(mk(capsule(0.045, RIG.foreArm + 0.02, SEG), matSleeve, [0, -RIG.foreArm / 2, 0]), 1));
    const h = joint('hand' + side, f, [0, -RIG.foreArm, 0]);
    // a mitten, with no fingers: detailed hands on a flat character always
    // look wrong, and fingers round a laptop look worse
    h.add(limb(mk(capsule(0.047, RIG.handLen, SEG), matHand, [0, -RIG.handLen / 2, 0]), 1.1));
    return { a: a, f: f, h: h };
  };
  const near = arm('N', -1, MAT.jacket,    MAT.skin);
  const far  = arm('F',  1, MAT.jacketFar, MAT.skinFar);
  J.armN = near.a; J.foreN = near.f; J.handN = near.h;
  J.armF = far.a;  J.foreF = far.f;  J.handF = far.h;

  /* ---- legs ----------------------------------------------------------- */
  const shoeGeo = mergeParts([
    [box(0.102, RIG.footH * 0.9, RIG.footLen * 0.84), [0, 0, 0]],
    // a rounded toe, for the same reason the hands are mittens: a detail
    // this small is better suggested than modelled
    [new THREE.SphereGeometry(0.052, SEG + 2, SEG), [0, -RIG.footH * 0.06, RIG.footLen * 0.40], null, [0.98, 0.82, 0.95]]
  ]);
  const leg = (side, sx, matLeg, matShoe) => {
    const t = joint('thigh' + side, J.hips, [sx * RIG.hipX, -0.04, 0]);
    t.add(limb(mk(capsule(0.072, RIG.thigh + 0.02, SEG), matLeg, [0, -RIG.thigh / 2 + 0.02, 0]), 1));
    const s = joint('shin' + side, t, [0, -RIG.thigh, 0]);
    s.add(limb(mk(capsule(0.058, RIG.shin + 0.02, SEG), matLeg, [0, -RIG.shin / 2 + 0.02, 0]), 1));
    const f = joint('foot' + side, s, [0, -RIG.shin, 0]);
    f.add(mk(shoeGeo, matShoe, [0, -RIG.footH * 0.52, RIG.footLen * 0.18]));
    return { t: t, s: s, f: f };
  };
  const legN = leg('N', -1, MAT.bottom,    MAT.shoe);
  const legF = leg('F',  1, MAT.bottomFar, MAT.shoeFar);
  J.thighN = legN.t; J.shinN = legN.s; J.footN = legN.f;
  J.thighF = legF.t; J.shinF = legF.s; J.footF = legF.f;

  /* ---- what the hands carry -------------------------------------------
   * The laptop hangs here, not off a wrist. Both hands are posed onto it
   * instead, which keeps the panel the globe rises out of steady while
   * still reading as carried. */
  J.hold = joint('hold', J.torso, TUNING.cine.hold.pos);
  J.hold.rotation.set(TUNING.cine.hold.rotX, TUNING.cine.hold.rotY, 0);

  /* ---- the backpack, squarely on his back -----------------------------
   * Its straps are on the torso, a few lines up; only the body of it
   * hangs here, so it can carry its own small sway without dragging the
   * straps off his shoulders. */
  J.bag = joint('bag', J.torso, [0, RIG.shoulderY - 0.21, -0.145]);
  const bagBody = mk(mergeParts([
    // a rounded slab, not a box: a hard-edged one reads as a crate
    [capsule(0.135, 0.42, SEG + 2), [0, 0, 0]],
    // the lid flap and the grab handle, the two shapes that say backpack
    [capsule(0.128, 0.19, SEG), [0, 0.125, 0.014]],
    [box(0.066, 0.058, 0.04), [0, 0.235, -0.05]]
  ]), MAT.bag, [0, 0, 0]);
  bagBody.scale.set(1.08, 1, 0.66);
  J.bag.add(bagBody);

  /* ---- the contact plane under the feet, matching the globe's ---------- */  // taste-skill-ignore: geometry, not CSS
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), MAT.shadow);  // taste-skill-ignore: a 3D mesh, not a CSS shadow
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.004, 0.02);
  shadow.renderOrder = -1;
  root.add(shadow);

  cineRoot.add(root);
  character = { root, J, shadow, hold: J.hold, parts: JOINT_KEYS.length };
}

/** The numeric rest-pose comparison the brief asks for. Because the rig is
 *  rigid Euler angles there is nothing to approximate: every joint either
 *  matches its frame-0 value or it does not. */
function characterPoseSignature() {
  if (!character) return null;
  const out = {};
  for (const key of JOINT_KEYS) {
    const r = character.J[key].rotation;
    out[key] = [+r.x.toFixed(6), +r.y.toFixed(6), +r.z.toFixed(6)];
  }
  out['#position'] = character.root.position.toArray().map(v => +v.toFixed(6));
  return out;
}

/* ====================================================================== *
 *  16.  LAPTOP — five meshes, a hinge, and a screen that wakes           *
 *                                                                        *
 *  Same flat unlit materials as the character, so the two read as one     *
 *  world and the scene lights touch only the globe.                      *
 * ====================================================================== */

const SCREEN_VERT = `
  varying vec2 vUvS;
  void main() {
    vUvS = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const SCREEN_FRAG = `
  uniform sampler2D uMap;
  uniform vec3  uOff;      // the panel with no power in it
  uniform vec3  uGlow;
  uniform float uWake;     // 0 asleep, 1 awake
  uniform float uScan;     // where the sweep is, 0..1 down the panel
  uniform float uScanW;
  uniform float uFade;     // the content dims as the globe takes over
  varying vec2 vUvS;
  void main() {
    vec3 content = texture2D(uMap, vUvS).rgb * uFade;
    // one scanline sweep: a thin gradient band offset by a single uniform,
    // and the difference between a lit panel and one that just woke up
    float band = smoothstep(uScanW, 0.0, abs(vUvS.y - uScan));
    vec3 c = mix(uOff, content, uWake) + uGlow * band * uWake * 0.85;
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const CONE_VERT = `
  varying float vT;
  varying vec3  vN;
  varying vec3  vV;
  void main() {
    vT = uv.y;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const CONE_FRAG = `
  uniform vec3  uColor;
  uniform float uOpacity;
  varying float vT;
  varying vec3  vN;
  varying vec3  vV;
  void main() {
    // brightest where it leaves the screen, gone by the time it reaches the
    // globe, and brightest at the silhouette -- which is what a shaft of
    // light looks like without a single volumetric sample
    float up   = pow(1.0 - vT, 1.6);
    float edge = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.4);
    float a = uOpacity * up * (0.35 + 0.65 * edge);
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

let laptop = null, lightCone = null;

function buildLaptop() {
  const g = new THREE.Group();
  g.name = 'laptop';
  g.scale.setScalar(TUNING.cine.laptopScale);

  const W = 0.58, D = 0.4, BH = 0.026;

  // 1. base
  const base = new THREE.Mesh(box(W, BH, D), MAT.shell);
  base.position.set(0, BH / 2, 0);
  g.add(base);

  // 2. trackpad suggestion -- a slightly darker inset, no detail
  const pad = new THREE.Mesh(box(W * 0.3, 0.003, D * 0.3), MAT.shellDark);
  pad.position.set(0, BH + 0.0015, D * 0.2);
  g.add(pad);

  // 3. hinge pivot
  const hinge = new THREE.Mesh(cyl(0.015, 0.015, W * 0.96, 10), MAT.shellDark);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, BH + 0.012, -D / 2 + 0.014);
  g.add(hinge);

  // the lid group pivots on the hinge. rotation.x = 90deg lies it flat on
  // the base; the open angle is 90 - rotation.x in degrees.
  const lidPivot = new THREE.Group();
  lidPivot.name = 'lid';
  lidPivot.position.copy(hinge.position);
  g.add(lidPivot);

  // 4. lid
  const LH = 0.37;
  const lid = new THREE.Mesh(box(W, LH, 0.016), MAT.shell);
  lid.position.set(0, LH / 2, -0.009);
  lidPivot.add(lid);

  // 5. screen panel
  const screenMat = new THREE.ShaderMaterial({
    vertexShader: SCREEN_VERT, fragmentShader: SCREEN_FRAG,
    uniforms: {
      uMap:   { value: TEX.screen },
      uOff:   { value: new THREE.Color(tint(cfg.theme.primary, { s: 0.45, l: 0.52 })) },
      uGlow:  { value: new THREE.Color(PAL.accent) },
      uWake:  { value: 0 },
      uScan:  { value: -1 },
      uScanW: { value: TUNING.cine.scanlineWidth },
      uFade:  { value: 1 }
    }
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, LH * 0.86), screenMat);
  screen.position.set(0, LH / 2, 0.0005);
  lidPivot.add(screen);

  /* Carried if there is someone to carry it, stood on a plinth if not.
   * Either way the globe rises out of the same screen anchor, so nothing
   * downstream has to know which. */
  let plinth = null;
  if (character) {
    character.hold.add(g);
  } else {
    g.position.set(...TUNING.cine.laptopPos);
    g.rotation.y = TUNING.cine.laptopTurn;
    cineRoot.add(g);

    const p = TUNING.cine.desk;
    plinth = new THREE.Group();
    plinth.name = 'desk';
    plinth.position.set(...p.pos);
    // an apron under a top that overhangs it, which is the one detail that
    // separates a desk from a slab
    const body = new THREE.Mesh(box(p.w, p.h - 0.06, p.d * 0.92), MAT.plinth);
    body.position.set(0, (p.h - 0.06) / 2, -0.02);
    const top = new THREE.Mesh(box(p.w, 0.06, p.d), MAT.plinthTop);
    top.position.y = p.h - 0.03;
    // the laptop's own contact plane on the desk top  (taste-skill-ignore: geometry, not CSS)
    const lShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.76), MAT.shadow);  // taste-skill-ignore: a 3D mesh, not a CSS shadow
    lShadow.rotation.x = -Math.PI / 2;
    lShadow.position.set(0.03, p.h + 0.003, 0.02);
    lShadow.renderOrder = -1;
    plinth.add(body, top, lShadow);
    cineRoot.add(plinth);
  }

  /* The cone of light from the screen to the globe. Without it the globe
   * reads as a ball that appeared; with it, as something projected. */
  const coneGeo = new THREE.CylinderGeometry(0.62, 0.1, 1, 22, 1, true);
  lightCone = new THREE.Mesh(coneGeo, new THREE.ShaderMaterial({
    vertexShader: CONE_VERT, fragmentShader: CONE_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uColor:   { value: new THREE.Color(tint(cfg.theme.accent, { s: 0.42, l: 1.6 })) },
      uOpacity: { value: 0 }
    }
  }));
  lightCone.name = 'light-cone';
  lightCone.renderOrder = 3;
  cineRoot.add(lightCone);

  // the screen's world frame, so the hologram can rise along its normal
  const screenAnchor = new THREE.Object3D();
  lidPivot.add(screenAnchor);
  screenAnchor.position.copy(screen.position);

  laptop = { group: g, lidPivot, screen, screenMat, base, hinge, screenAnchor, plinth };
}

/** The lid angle, in radians of rotation.x, for an opening in degrees. */
const lidRx = openDeg => THREE.MathUtils.degToRad(90 - openDeg);

/* ====================================================================== *
 *  17.  HOLOGRAM — one globe, one hologramAmount uniform                 *
 *                                                                        *
 *  The globe is one object for the whole loop. There is no hologram globe *
 *  and no solid globe to swap between; HOLO.amount goes 1 to 0 across the *
 *  Rise beat and back to 1 across Collapse, and the treatment is dialled  *
 *  to near zero for Explore because a translucent scanlined globe is      *
 *  unreadable and the destinations are the point.                         *
 *                                                                        *
 *  Globe, Arcs, Markers and Particles are carried over from version one   *
 *  untouched. What changed is their parent: they sit inside hologramGroup *
 *  and the timeline drives its transform. Nothing inside those sections   *
 *  knows a cinematic exists, which is what makes the handover a transform *
 *  blend rather than a rebuild.                                           *
 * ====================================================================== */

const hologram = {
  /** Place the group between the screen it grows out of and the air above.
   *  't' is 0 on the panel and 1 at full size. */
  place(t, amount) {
    // Before the character exists -- the warm-up probe renders real frames
    // -- there is nothing to rise out of, so it rises out of where it ends
    // up, which is to say it does not move.
    const from = laptop
      ? cineRoot.worldToLocal(laptop.screenAnchor.getWorldPosition(_holoFrom))
      : _holoFrom.set(...TUNING.cine.hologramRise);
    const to = _holoTo.set(...TUNING.cine.hologramRise);

    const s = THREE.MathUtils.lerp(TUNING.cine.hologramSeed, TUNING.cine.hologramScale, t);
    // There is nothing on a sleeping screen. The disc appears exactly as
    // the rise begins, which is also when the light cone comes up.
    hologramGroup.visible = t > 0.002;
    hologramGroup.position.lerpVectors(from, to, t);
    // it starts as a flat disc on the screen plane and inflates as it rises:
    // three properties, one eased curve, no separate animations fighting
    hologramGroup.scale.set(s, s * THREE.MathUtils.lerp(0.06, 1, Math.min(1, t * 1.25)), s);
    hologramGroup.rotation.x = THREE.MathUtils.lerp(-1.15, 0, t);

    HOLO.amount.value = amount;
    if (atmosphere) atmosphere.material.uniforms.uStrength.value =
      TUNING.scene.atmosphereStrength * (1 + amount * 0.8);

    if (lightCone) {
      // the cone spans screen to globe, and fades out as the globe arrives
      const mid = _holoMid.addVectors(from, hologramGroup.position).multiplyScalar(0.5);
      const h = from.distanceTo(hologramGroup.position);
      lightCone.position.copy(mid);
      lightCone.scale.set(Math.max(0.0001, t), Math.max(0.0001, h), Math.max(0.0001, t));
      // Decided here and nowhere else. hand.update() runs before this, so
      // anything it wrote would be overwritten a line later -- the fade has
      // to be folded in rather than applied separately.
      lightCone.visible = t > 0.02 && t < 0.995 && hand.cineMix > 0.01;
      lightCone.material.uniforms.uOpacity.value =
        TUNING.cine.coneOpacity * Math.sin(Math.PI * Math.min(1, t)) * 1.1 * hand.cineMix;
    }
  }
};

const _holoFrom = new THREE.Vector3();
const _holoTo = new THREE.Vector3();
const _holoMid = new THREE.Vector3();

/* ====================================================================== *
 *  18.  CURSOR — a DOM element that never dispatches an event            *
 *                                                                        *
 *  It has to land on the real CTA pixel-accurately at every viewport      *
 *  size, so it reads getBoundingClientRect() at the start of the Travel   *
 *  beat and again on resize. A 3D cursor would need an unproject on every *
 *  layout change and would drift on exactly the viewport nobody tested.   *
 *                                                                        *
 *  THE ONE RULE: no real event is ever dispatched. No .click(), no        *
 *  dispatchEvent, no synthetic PointerEvent. CSS classes only. A          *
 *  synthetic click here fires the agency's analytics, may trigger         *
 *  navigation, and buries the real conversion data under thousands of     *
 *  fake clicks. Everything below writes classes and transforms.           *
 * ====================================================================== */

const cursorEl = root.querySelector('#demoCursor');

const cursor = {
  el: cursorEl,
  target: null,          // the real button
  rect: null,            // its box, relative to the stage
  from: new THREE.Vector2(),
  to: new THREE.Vector2(),
  ctl: new THREE.Vector2(),
  ripple: null,
  classes: new Set(),
  visible: false,
  suppressed: false,     // a real pointer entered: stand down

  /** Read the button's position. Called at the start of Travel and on
   *  every resize, never cached across a layout change. */
  measure() {
    this.target = document.querySelector(cfg.cursor.targetSelector);
    if (!this.target || !stage) { this.rect = null; return false; }
    const s = stage.getBoundingClientRect();
    const b = this.target.getBoundingClientRect();
    if (!b.width || !b.height) { this.rect = null; return false; }
    this.rect = { x: b.left - s.left, y: b.top - s.top, w: b.width, h: b.height, sw: s.width, sh: s.height };

    this.to.set(this.rect.x + this.rect.w * 0.5, this.rect.y + this.rect.h * 0.52);
    this.from.set(TUNING.cursor.enterFrom[0] * s.width, TUNING.cursor.enterFrom[1] * s.height);
    // a quadratic bezier, never a straight line: real pointer movement curves
    const dx = this.to.x - this.from.x, dy = this.to.y - this.from.y;
    const len = Math.hypot(dx, dy) || 1;
    this.ctl.set(
      (this.from.x + this.to.x) / 2 + (dy / len) * len * cfg.cursor.arcHeight,
      (this.from.y + this.to.y) / 2 - (dx / len) * len * cfg.cursor.arcHeight * 0.35
    );
    return true;
  },

  /** Where the cursor is at p, the Travel beat's progress in 0..1, and how
   *  far past the target it has overshot. */
  positionAt(p, out) {
    const t = 1 - Math.pow(1 - p, 3);           // fast out, slow in: most of
                                                // the distance in the first
                                                // 40% of the beat
    const mt = 1 - t;
    const x = mt * mt * this.from.x + 2 * mt * t * this.ctl.x + t * t * this.to.x;
    const y = mt * mt * this.from.y + 2 * mt * t * this.ctl.y + t * t * this.to.y;
    // overshoot six to ten pixels, then settle back over about 120 ms
    const over = Math.sin(Math.PI * Math.min(1, p / 0.86)) * 0 +
                 (p > 0.72 ? Math.sin((p - 0.72) / 0.28 * Math.PI) * cfg.cursor.overshootPx : 0);
    const dirX = (this.to.x - this.ctl.x), dirY = (this.to.y - this.ctl.y);
    const dl = Math.hypot(dirX, dirY) || 1;
    // two or three pixels of high-frequency jitter, damped to zero on
    // arrival. Derived from p, not from Math.random, so a capture of the
    // same frame twice gives the same pixel.
    const damp = Math.max(0, 1 - p / 0.82);
    const j = TUNING.cursor.jitterPx * damp;
    out.set(
      x + (dirX / dl) * over + Math.sin(p * 97.1) * j,
      y + (dirY / dl) * over + Math.sin(p * 71.3 + 1.7) * j
    );
    return out;
  },

  show(on) {
    this.visible = on && !this.suppressed && cfg.cursor.enabled && finePointer.matches;
    this.el.style.opacity = this.visible ? '1' : '0';
  },

  move(x, y, scale) {
    this.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
  },

  /** Every class the demo applies is tracked, so every one of them can be
   *  removed in a single frame on an abrupt exit. */
  addClass(name) {
    if (!this.target || this.classes.has(name)) return;
    this.target.classList.add(name);
    this.classes.add(name);
  },
  removeClass(name) {
    if (!this.target || !this.classes.has(name)) return;
    this.target.classList.remove(name);
    this.classes.delete(name);
  },
  clearClasses() {
    if (this.target) for (const c of this.classes) this.target.classList.remove(c);
    this.classes.clear();
    ui.ctaEcho?.classList.remove('on');
    this.dropRipple();
  },

  /** The press. A scale to 0.9 and back, a ripple ring from the contact
   *  point, and the button's pressed appearance through a class declared
   *  in the same rule as the real :active styles. No event is created. */
  pressRipple() {
    if (!this.target || this.ripple || !this.rect) return;
    const el = document.createElement('span');
    el.className = 'demo-ripple';
    // the contact point, in the button's own coordinates
    el.style.left = `${this.to.x - this.rect.x}px`;
    el.style.top  = `${this.to.y - this.rect.y}px`;
    this.target.appendChild(el);
    // one frame later, so the transition has a start state to run from
    requestAnimationFrame(() => el.classList.add('go'));
    this.ripple = el;
  },
  dropRipple() {
    this.ripple?.remove();
    this.ripple = null;
  },

  /** A real pointer entered the hero: stand down within one frame, and do
   *  not come back until the cinematic does. Two cursors on screen at once
   *  is worse than no cursor at all. */
  suppress() {
    this.suppressed = true;
    this.show(false);
    this.clearClasses();
  },
  release() { this.suppressed = false; }
};

/* ====================================================================== *
 *  19.  TIMELINE — one timeline, scrubbed by a number                    *
 *                                                                        *
 *  The whole cinematic is a keyframe map of { t, value, ease } per        *
 *  property with a small interpolator, created once and never run on its  *
 *  own clock. The render loop sets a time; the timeline reports values.   *
 *  Nothing here advances itself.                                          *
 *                                                                        *
 *  That one constraint is what makes capture work: capture mode sets the  *
 *  time from a frame counter, and a scrubbed timeline then produces       *
 *  identical frames every run. A self-driving timeline is at the mercy of *
 *  frame timing and will never close a loop.                              *
 *                                                                        *
 *  (GSAP would do the same job. It is not here because a keyframe map and *
 *  thirty lines of interpolation give the same determinism with no        *
 *  dependency, and this page ships as one file. The two approaches are    *
 *  not mixed.)                                                            *
 *                                                                        *
 *  Closing a narrative loop is harder than closing an oscillation,        *
 *  because the scene genuinely changes state. Three things make it hold:  *
 *                                                                        *
 *   1. Every track's value at t = 0 equals its value at t = loopSeconds,  *
 *      asserted at build time rather than discovered in an export.        *
 *   2. Every track has reached its frame-0 value by tailStart, so the     *
 *      joint lag -- which reads the timeline slightly in the past -- also *
 *      resolves to the rest pose at the loop boundary.                    *
 *   3. The continuous camera drift completes a whole number of cycles.    *
 *                                                                        *
 *  There is no flash and no whip-pan anywhere. If one were needed the     *
 *  loop would not be closed, and a viewer notices the flash on the third  *
 *  repeat even when they cannot say why.                                  *
 * ====================================================================== */

const EASE = {
  linear: t => t,
  in:     t => t * t * t,
  out:    t => 1 - Math.pow(1 - t, 3),
  out2:   t => 1 - Math.pow(1 - t, 2),
  inOut:  t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  hold:   () => 0            // a step: keep the previous value until the key
};

let timeline = null;

function buildTimeline() {
  const L = cfg.motion.loopSeconds;
  const want = cfg.cinematic.beats;

  // The six durations are rescaled to fit loopSeconds exactly, so retiming
  // the piece is a config change and never an edit to the code below.
  const rawTotal = BEAT_KEYS.reduce((s, k) => s + want[k], 0);
  const k = L / rawTotal;
  const beats = {};
  let cursorT = 0;
  for (const key of BEAT_KEYS) {
    const dur = want[key] * k;
    beats[key] = { key, start: cursorT, dur, end: cursorT + dur };
    cursorT += dur;
  }
  // float drift across six divisions must not leave the last beat short
  beats.collapse.end = L;
  beats.collapse.dur = L - beats.collapse.start;

  /** An absolute time: a fraction through a named beat. */
  const at = (key, frac) => beats[key].start + beats[key].dur * frac;

  // Everything is parked at its frame-0 value from here to the end of the
  // loop, which is what makes the joint lag safe across the boundary.
  const tail = Math.min(TUNING.cine.tailHoldSeconds, beats.collapse.dur * 0.6);
  const tailStart = L - tail;

  const C = TUNING.cine;
  const lidShut = C.lidClosedDeg, lidOpen = C.lidOpenDeg;
  const wakeFrom = at('open', 0.80);
  const wakeTo = Math.min(wakeFrom + C.screenWakeSeconds, beats.rise.end);
  const overshootDur = Math.min(0.07, beats.open.dur * 0.08);
  const pressAt = at('click', 0.13);

  /* ---- the tracks ----------------------------------------------------- *
   *  Each is [time, value, ease-into-this-value]. The first key is always
   *  at 0 and the last always at L, with the same value, or the build
   *  assertion below rejects the timeline.                                */
  const tracks = {
    /* the lid: slightly ajar, then open past its stop by four degrees for
     * two frames, then settling. More overshoot than that and it reads as
     * a cartoon. */
    lid: [
      [0, lidShut, 'linear'],
      // it waits for the hand to arrive -- see wReach below -- and then
      // eases both in and out, so the hand meets a lid that is only
      // starting to move rather than one already thrown open
      [at('open', 0.44), lidShut, 'hold'],
      [at('open', 0.92), lidOpen + C.lidOvershootDeg, 'inOut'],
      [Math.min(at('open', 0.92) + overshootDur, beats.open.end), lidOpen, 'out2'],
      [at('collapse', 0.42), lidOpen, 'hold'],
      [tailStart, lidShut, 'inOut'],
      [L, lidShut, 'linear']
    ],

    /* the screen wakes just before the lid finishes opening */
    screenWake: [
      [0, 0, 'linear'],
      [wakeFrom, 0, 'hold'],
      [wakeTo, 1, 'out'],
      [at('collapse', 0.30), 1, 'hold'],
      [Math.min(at('collapse', 0.62), tailStart), 0, 'in'],
      [L, 0, 'linear']
    ],

    /* one scanline sweep down the panel. The ramp back up across the Open
     * beat happens while screenWake is zero, so it is never seen. */
    screenScan: [
      [0, -0.15, 'linear'],
      [wakeFrom, 1.15, 'linear'],
      [wakeTo, -0.15, 'out'],
      [L, -0.15, 'linear']
    ],

    /* the page content on the panel dims as the globe takes the frame */
    screenFade: [
      [0, 1, 'linear'],
      [at('rise', 0.10), 1, 'hold'],
      [at('rise', 0.85), 0.22, 'inOut'],
      [at('collapse', 0.36), 0.22, 'hold'],
      [tailStart, 1, 'inOut'],
      [L, 1, 'linear']
    ],

    /* the rise itself: a flat disc on the panel at 0, a sphere in the air
     * at 1. Position, scale and orientation are three properties on this
     * one eased curve, not three animations fighting each other. */
    holoT: [
      [0, 0, 'linear'],
      [beats.rise.start, 0, 'hold'],
      [beats.rise.end, 1, 'inOut'],
      [at('collapse', 0.06), 1, 'hold'],
      [Math.min(at('collapse', 0.46), tailStart), 0, 'inOut'],
      [L, 0, 'linear']
    ],

    /* the hologram treatment: full through the rise, then near zero for
     * Explore, because a translucent scanlined globe is unreadable and the
     * destinations are the point. */
    holoAmount: [
      [0, 1, 'linear'],
      [beats.rise.end, 1, 'hold'],
      [at('explore', 0.30), 0.06, 'out'],
      [beats.collapse.start, 0.06, 'hold'],
      [Math.min(at('collapse', 0.40), tailStart), 1, 'in'],
      [L, 1, 'linear']
    ],

    /* the camera: wide for beats 1 and 2, tight for 3 to 5, wide again for
     * 6. Long eased tails; no linear move and no constant-speed dolly. */
    camMix: [
      [0, 0, 'linear'],
      [beats.open.end, 0, 'hold'],
      [beats.rise.end, 1, 'inOut'],
      [at('collapse', 0.12), 1, 'hold'],
      [tailStart, 0, 'inOut'],
      [L, 0, 'linear']
    ],

    /* pose weights. rest is whatever these two leave over. */
    wReach: [
      [0, 0, 'linear'],
      [at('open', 0.12), 0, 'hold'],
      [at('open', 0.58), 1, 'inOut'],
      [at('open', 0.86), 1, 'hold'],
      [at('rise', 0.55), 0, 'inOut'],
      [L, 0, 'linear']
    ],
    wWatch: [
      [0, 0, 'linear'],
      [at('rise', 0.25), 0, 'hold'],
      [at('rise', 0.95), 1, 'inOut'],
      [at('collapse', 0.12), 1, 'hold'],
      [tailStart, 0, 'inOut'],
      [L, 0, 'linear']
    ],

    /* beat 5: he turns his head to camera and nods once. Both are additive
     * on the neck, so they compose with whatever pose blend is current. */
    headToCam: [
      [0, 0, 'linear'],
      [at('click', 0.14), 0, 'hold'],
      [at('click', 0.40), -0.24, 'inOut'],
      [at('click', 0.92), -0.24, 'hold'],
      [at('collapse', 0.28), 0, 'inOut'],
      [L, 0, 'linear']
    ],
    headNod: [
      [0, 0, 'linear'],
      [at('click', 0.46), 0, 'hold'],
      [at('click', 0.60), 0.17, 'out'],
      [at('click', 0.74), -0.05, 'inOut'],
      [at('click', 0.86), 0, 'out'],
      [L, 0, 'linear']
    ],

    /* the globe turns away from the origin across Explore and comes back */
    globeTurn: [
      [0, 0, 'linear'],
      [beats.explore.start, 0, 'hold'],
      [beats.explore.end, -0.55, 'inOut'],
      [beats.click.end, -0.55, 'hold'],
      [tailStart, 0, 'inOut'],
      [L, 0, 'linear']
    ],

    /* arcs fire from the origin in sequence; pins pop in behind them */
    arcFire: [
      [0, 0, 'linear'],
      [at('explore', 0.04), 0, 'hold'],
      [at('explore', 0.70), 1, 'out'],
      [beats.collapse.start, 1, 'hold'],
      [Math.min(at('collapse', 0.40), tailStart), 0, 'in'],
      [L, 0, 'linear']
    ],
    pinPop: [
      [0, 0, 'linear'],
      [at('explore', 0.12), 0, 'hold'],
      [at('explore', 0.80), 1, 'out'],
      [beats.collapse.start, 1, 'hold'],
      [Math.min(at('collapse', 0.36), tailStart), 0, 'in'],
      [L, 0, 'linear']
    ],

    /* one aircraft, one arc, inside the Explore beat */
    planeT: [
      [0, 0, 'linear'],
      [at('explore', 0.20), 0, 'hold'],
      [at('explore', 0.95), 1, 'inOut'],
      [tailStart, 0, 'hold'],
      [L, 0, 'linear']
    ],
    planeOn: [
      [0, 0, 'linear'],
      [at('explore', 0.19), 0, 'hold'],
      [at('explore', 0.26), 1, 'out'],
      [at('explore', 0.90), 1, 'hold'],
      [at('explore', 0.99), 0, 'in'],
      [L, 0, 'linear']
    ],

    /* the cursor. cursorP is its progress along the arc toward the button;
     * cursorOn is whether it exists at all. */
    cursorOn: [
      [0, 0, 'linear'],
      [at('travel', 0.02), 0, 'hold'],
      [at('travel', 0.10), 1, 'out'],
      [at('collapse', 0.22), 1, 'hold'],
      [Math.min(at('collapse', 0.52), tailStart), 0, 'in'],
      [L, 0, 'linear']
    ],
    cursorP: [
      [0, 0, 'linear'],
      [beats.travel.start, 0, 'hold'],
      [at('travel', 1 - TUNING.cursor.pausePortion), 1, 'linear'],
      [at('collapse', 0.5), 1, 'hold'],
      [tailStart, 0, 'linear'],
      [L, 0, 'linear']
    ],
    /* hover comes on about 200 ms before the press, as a real pointer
     * would -- measured back from the press, not from the beat edge, so
     * retiming the beat keeps the lead. In hover mode that is the whole
     * beat: the cursor arrives, the button lifts, and the loop moves on
     * without a press. */
    cursorHover: [
      [0, 0, 'linear'],
      [Math.max(0, pressAt - TUNING.cursor.hoverLeadMs / 1000), 0, 'hold'],
      [Math.max(0.012, pressAt - TUNING.cursor.hoverLeadMs / 1000 + 0.012), 1, 'linear'],
      [at('click', 0.94), 1, 'hold'],
      [beats.click.end, 0, 'linear'],
      [L, 0, 'linear']
    ],
    cursorPress: [
      [0, 0, 'linear'],
      [Math.max(0, pressAt - 0.05), 0, 'hold'],
      [pressAt, 1, 'out'],
      [pressAt + TUNING.cursor.pressMs / 1000, 1, 'hold'],
      [at('click', 0.24), 0, 'out'],
      [L, 0, 'linear']
    ],
    ctaEcho: [
      [0, 0, 'linear'],
      [at('click', 0.28), 0, 'hold'],
      [at('click', 0.34), 1, 'linear'],
      [at('click', 0.94), 1, 'hold'],
      [beats.click.end, 0, 'linear'],
      [L, 0, 'linear']
    ]
  };

  /* ---- the interpolator ------------------------------------------------ */
  // keys are authored in order but Math.min() clamps can collide; sort and
  // drop any that a short beat pushed past its neighbour
  for (const key of Object.keys(tracks)) {
    const sorted = tracks[key].slice().sort((a, b) => a[0] - b[0]);
    const clean = [];
    for (const row of sorted) {
      if (clean.length && row[0] <= clean[clean.length - 1][0] + 1e-6) clean[clean.length - 1] = row;
      else clean.push(row);
    }
    if (clean[0][0] > 0) clean.unshift([0, clean[0][1], 'linear']);
    if (clean[clean.length - 1][0] < L) clean.push([L, clean[clean.length - 1][1], 'linear']);
    tracks[key] = clean;
  }

  const sample = (keys, t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t > keys[i][0]) continue;
      const a = keys[i - 1], b = keys[i];
      const span = b[0] - a[0];
      if (span <= 1e-9) return b[1];
      const p = (t - a[0]) / span;
      return a[1] + (b[1] - a[1]) * EASE[b[2]](p);
    }
    return keys[keys.length - 1][1];
  };

  const names = Object.keys(tracks);

  const tl = {
    L, beats, tailStart, tracks,

    /** Periodic, always: the lookup wraps, so a joint reading the timeline
     *  a tenth of a second in the past gets the same answer at t = 0 and at
     *  t = L. That is what lets overlapping action coexist with a closed
     *  loop. */
    valueAt(name, t) {
      const tt = ((t % L) + L) % L;
      return sample(tracks[name], tt);
    },

    /** The whole state at one time, with each joint's own lag applied. */
    evaluate(t, out = {}) {
      for (const n of names) out[n] = this.valueAt(n, t);
      return out;
    },

    /** Which beat a time falls in. */
    beatAt(t) {
      const tt = ((t % L) + L) % L;
      for (const key of BEAT_KEYS) if (tt < beats[key].end - 1e-9) return key;
      return 'collapse';
    },

    /** Two acceptance criteria in one function: every track must give the
     *  same value at t = 0 and at t = loopSeconds, and must already be at
     *  that value by tailStart. Run in dev and from the self-test; it
     *  fails loudly rather than waiting for the video export to find it. */
    assertClosure(tol = 1e-6) {
      const bad = [];
      for (const n of names) {
        const a = this.valueAt(n, 0);
        const b = this.valueAt(n, L);
        const c = this.valueAt(n, tailStart);
        if (Math.abs(a - b) > tol) bad.push({ track: n, at0: a, atL: b, why: 'start and end differ' });
        else if (Math.abs(a - c) > tol) bad.push({ track: n, at0: a, atTail: c, why: 'not parked by tailStart' });
      }
      return { pass: bad.length === 0, tracks: names.length, failures: bad };
    }
  };

  const closure = tl.assertClosure();
  if (!closure.pass) {
    console.error('[cinematic] the timeline does not close:', closure.failures);
    if (IS_DEV) throw new Error(`[cinematic] ${closure.failures.length} timeline track(s) do not close`);
  }
  return tl;
}

/* ---- the properties the timeline owns --------------------------------- *
 *
 *  Every property the timeline touches is owned by it alone. Nothing else
 *  may write to these in the same frame or the two will fight and the loop
 *  will drift. The list is explicit so it can be asserted against rather
 *  than remembered, and the dev check below reads each one straight off the
 *  scene graph after a frame has been applied.
 */
const TIMELINE_OWNED = [
  ['laptop.lid.rotation.x',     () => laptop?.lidPivot.rotation.x],
  ['laptop.screen.uWake',       () => laptop?.screenMat.uniforms.uWake.value],
  ['laptop.screen.uScan',       () => laptop?.screenMat.uniforms.uScan.value],
  ['laptop.screen.uFade',       () => laptop?.screenMat.uniforms.uFade.value],
  ['hologram.position',         () => hologramGroup.position.toArray()],
  ['hologram.scale',            () => hologramGroup.scale.toArray()],
  ['hologram.rotation.x',       () => hologramGroup.rotation.x],
  ['hologram.amount',           () => HOLO.amount.value],
  ['lightCone.opacity',         () => lightCone?.material.uniforms.uOpacity.value],
  ['lightCone.scale',           () => lightCone?.scale.toArray()],
  ['camera.position',           () => camera.position.toArray()],
  ['camera.quaternion',         () => camera.quaternion.toArray()],
  ['character.pose',            () => characterPoseSignature()],
  ['globeSpin.rotation.y',      () => globeSpin.rotation.y],
  ['arcs.draw',                 () => arcs.map(a => a.mat.uniforms.uDraw.value)],
  ['arcs.active',               () => arcs.map(a => a.mat.uniforms.uActive.value)],
  ['markers.pop',               () => markers.map(m => m.pop)],
  ['plane.visible',             () => !!plane?.visible],
  ['plane.position',            () => plane ? plane.position.toArray() : null]
];

/** Snapshot every owned property, for the frame-0 against frame-L diff.
 *  Rounded to six places: the point of the check is to catch a motion that
 *  did not close, not to argue about the last bit of a float. */
const round6 = v =>
  typeof v === 'number' ? +v.toFixed(6) :
  Array.isArray(v) ? v.map(round6) :
  v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, round6(x)])) :
  v;

function ownedSnapshot() {
  const out = {};
  for (const [name, read] of TIMELINE_OWNED) out[name] = JSON.stringify(round6(read() ?? null));
  return out;
}

function diffOwned(a, b) {
  const failures = [];
  for (const name of Object.keys(a)) {
    if (a[name] !== b[name]) failures.push({ property: name, at0: a[name], atL: b[name] });
  }
  return failures;
}

/* ====================================================================== *
 *  20.  THE LOOP CLOCK                                                   *
 *                                                                        *
 *  One clock runs from scene start and is never reset:                   *
 *      u = (elapsed % loopSeconds) / loopSeconds,  in [0, 1)             *
 *  and the timeline is scrubbed with t = u * loopSeconds. The timeline    *
 *  never runs on its own clock, which is the whole reason capture works.  *
 * ====================================================================== */

const TAU = Math.PI * 2;
const clock = new THREE.Clock();

const sceneState = {
  elapsed: 0,
  u: 0,                       // the loop phase the timeline is at
  uIdle: 0,                   // the loop phase the idle curves run on
  t: 0,                       // the timeline time, in seconds
  frame: 0,
  ready: false,
  idleMix: 0,                 // 1 = fully idle; live offsets are scaled by 1 - idleMix
  lastInput: 0,
  running: false,
  tweening: false,
  destroyed: false,
  beat: 'open',
  scrub: null                 // the panel's hand on the timeline, if any
};

/** Frame-rate independent easing. dt is clamped by the caller so a
 *  backgrounded tab cannot jump the scene on return. */
const ease = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.pow(1 - k, dt * 60));

const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

/** Move a value most of the way to its target over `ms`, whatever the
 *  frame rate. Used for the two handover blends, which are specified in
 *  milliseconds rather than as per-frame constants. */
const approach = (cur, target, ms, dt) =>
  cur + (target - cur) * (1 - Math.pow(0.001, (dt * 1000) / Math.max(1, ms)));

/* ====================================================================== *
 *  21.  HANDOVER — two controllers, one scene graph                      *
 *                                                                        *
 *  The cinematic and the interactive scene are two controllers over one  *
 *  scene graph, and exactly one owns the transforms at any moment.       *
 *                                                                        *
 *    input during Open, Rise, Click or Collapse                          *
 *        do not cut. Accelerate the scrub to the start of Explore over   *
 *        about 250 ms, then hand over. The viewer sees the laptop snap   *
 *        open and the globe arrive fast, which reads as the page         *
 *        responding to them rather than as a glitch.                     *
 *                                                                        *
 *    input during Explore or Travel                                      *
 *        hand over immediately at the current frame. The globe is        *
 *        already close to the interactive pose, so there is nothing to   *
 *        reconcile. This is why Explore is the only safe window.         *
 *                                                                        *
 *    on re-idle after the configured quiet time                          *
 *        reverse all of it and resume at Travel, not at Open. Nobody     *
 *        wants to sit through the laptop opening again; they get the     *
 *        cursor and the click. Restarting from beat 1 every time is the  *
 *        obvious implementation and it is the wrong one.                 *
 * ====================================================================== */

const SAFE_BEATS = new Set(['explore', 'travel']);

const hand = {
  mode: 'cinematic',       // cinematic | accelerating | interactive
  cineMix: 1,              // 1 cinematic owns the frame, 0 interactive does
  cineMixTarget: 1,
  blend: 1,                // 1 globe at the hologram transform, 0 at neutral
  blendTarget: 1,
  accel: null,             // { from, to, t, ms } the 250 ms scrub
  paused: false,

  /** Any real engagement with the scene. */
  take() {
    if (!cfg.cinematic.enabled) return;
    if (this.mode === 'interactive') { this.cineMixTarget = 0; this.blendTarget = 0; return; }
    const beat = timeline.beatAt(sceneState.t);
    if (SAFE_BEATS.has(beat)) {
      this.toInteractive();
    } else if (this.mode !== 'accelerating') {
      // scrub forward to the safe window rather than cutting to it
      const L = timeline.L;
      const to = timeline.beats.explore.start + timeline.beats.explore.dur * 0.35;
      let from = sceneState.t;
      // always travel forwards round the loop, never backwards
      if (to < from) from -= L;
      this.accel = { from, to, t: 0, ms: TUNING.cine.accelerateMs };
      this.mode = 'accelerating';
    }
  },

  toInteractive() {
    this.mode = 'interactive';
    this.accel = null;
    this.paused = true;                 // the timeline stops where it is
    this.cineMixTarget = 0;
    this.blendTarget = 0;
    L.documents.visible = true;
    if (globeShadow) globeShadow.visible = true;
    // Start the interactive spin exactly where the cinematic left the
    // globe, then let it ease home. Without this the globe jumps by the
    // Explore beat's turn the instant the two controllers swap.
    input.spinOffset = timeline.valueAt('globeTurn', sceneState.t);
    input.spinOffsetTarget = input.spinOffset;
    input.tween = { from: input.spinOffset, to: 0, t: 0, ms: TUNING.cine.blendMs };
    sceneState.tweening = true;
    cursor.suppress();
  },

  /** Quiet for long enough: reverse everything and resume at the beat the
   *  config names, so the viewer gets the cursor rather than the laptop. */
  toCinematic() {
    if (!cfg.cinematic.enabled) return;
    this.mode = 'cinematic';
    this.paused = false;
    this.cineMixTarget = 1;
    this.blendTarget = 1;
    cursor.release();
    const b = timeline.beats[cfg.cinematic.resumeAtBeat] || timeline.beats.travel;
    sceneState.t = b.start;
    L.documents.visible = false;
    if (globeShadow) globeShadow.visible = false;
    clearSelection(true);
  },

  update(dt) {
    if (this.accel) {
      this.accel.t += dt * 1000 / this.accel.ms;
      if (this.accel.t >= 1) {
        sceneState.t = this.accel.to;
        sceneState.elapsed = this.accel.to;
        this.accel = null;
        this.toInteractive();
      } else {
        const k = easeInOutCubic(this.accel.t);
        sceneState.t = this.accel.from + (this.accel.to - this.accel.from) * k;
        sceneState.elapsed = sceneState.t;
      }
    }
    // the cinematic-only objects fade over 400 ms; the globe's transform
    // blends over 600 ms, so the globe is still arriving as they go
    this.cineMix = approach(this.cineMix, this.cineMixTarget, TUNING.cine.handoverMs, dt);
    this.blend   = approach(this.blend,   this.blendTarget,   TUNING.cine.blendMs, dt);
    if (Math.abs(this.cineMix - this.cineMixTarget) < 0.002) this.cineMix = this.cineMixTarget;
    if (Math.abs(this.blend - this.blendTarget) < 0.002) this.blend = this.blendTarget;

    const vis = this.cineMix > 0.004;
    if (character) { character.root.visible = vis; character.shadow.visible = vis; }
    if (laptop) { laptop.group.visible = vis; if (laptop.plinth) laptop.plinth.visible = vis; }
    if (ground) ground.material.opacity = TUNING.scene.groundOpacity * (0.45 + 0.55 * this.cineMix);
    setOpacity(character?.root, this.cineMix);
    setOpacity(laptop?.group, this.cineMix);
    setOpacity(laptop?.plinth, this.cineMix);
  }
};

/** Fade a subtree. The flat materials are shared between parts, so the
 *  opacity is written once per material rather than once per mesh. */
const _fadeSeen = new Set();
function setOpacity(root, o) {
  if (!root) return;
  _fadeSeen.clear();
  root.traverse(n => {
    const m = n.material;
    if (!m || _fadeSeen.has(m) || m.userData?.noFade) return;
    _fadeSeen.add(m);
    m.transparent = o < 0.999;
    m.opacity = o;
    m.depthWrite = o > 0.5;
  });
}

/* ====================================================================== *
 *  THE CINEMATIC APPLY STEP                                              *
 *                                                                        *
 *  Reads the timeline at one time and writes the scene. Every property   *
 *  it touches is in TIMELINE_OWNED; nothing else writes any of them      *
 *  while hand.cineMix is 1.                                              *
 * ====================================================================== */

const _camPos = new THREE.Vector3();
const _camTgt = new THREE.Vector3();
const _camPosI = new THREE.Vector3();
const _camTgtI = new THREE.Vector3();
const _holoPos = new THREE.Vector3();
const _holoScl = new THREE.Vector3();
const _neutralPos = new THREE.Vector3();

const SHOT = { wide: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
               tight: { pos: new THREE.Vector3(), target: new THREE.Vector3() },
               inter: { pos: new THREE.Vector3(), target: new THREE.Vector3() } };

const TL = {};                    // the timeline state, reused every frame

function applyCinematic(t, dt, deterministic) {
  timeline.evaluate(t, TL);
  sceneState.beat = timeline.beatAt(t);

  /* ---- the laptop ----------------------------------------------------- */
  if (laptop) {
    laptop.lidPivot.rotation.x = lidRx(TL.lid);
    const u = laptop.screenMat.uniforms;
    u.uWake.value = TL.screenWake;
    u.uScan.value = TL.screenScan;
    u.uFade.value = TL.screenFade;
  }

  /* ---- the character: poses blended, each joint lagged ---------------- */
  if (character) {
    const lagK = TUNING.cine.lagFrames / TUNING.cine.lagFps;
    for (const key of JOINT_KEYS) {
      const lt = t - JOINT_DEPTH[key] * lagK;
      const wr = timeline.valueAt('wReach', lt);
      const ww = timeline.valueAt('wWatch', lt);
      const ws = Math.max(0, 1 - wr - ww);
      const pr = POSES.rest[key], pc = POSES.reach[key], pw = POSES.watch[key];
      let x = pr[0] * ws + pc[0] * wr + pw[0] * ww;
      let y = pr[1] * ws + pc[1] * wr + pw[1] * ww;
      let z = pr[2] * ws + pc[2] * wr + pw[2] * ww;
      if (key === 'neck') {
        // the look to camera and the single nod, additive on the same joint
        y += timeline.valueAt('headToCam', lt);
        x += timeline.valueAt('headNod', lt);
      }
      const j = character.J[key];
      if (key === 'root') j.rotation.set(x, TUNING.cine.characterTurnRad + y, z);
      else j.rotation.set(x, y, z);
    }
  }

  /* ---- the hologram: one globe, one uniform --------------------------- */
  hologram.place(TL.holoT, TL.holoAmount * hand.cineMix);
  // whole cycles of the loop phase, never the raw time: two per loop
  HOLO.time.value = sceneState.u * 2;

  // the handover blends that transform to the interactive neutral
  if (hand.blend < 0.999) {
    const b = hand.blend;
    _holoPos.copy(hologramGroup.position);
    _holoScl.copy(hologramGroup.scale);
    hologramGroup.position.lerpVectors(_neutralPos, _holoPos, b);
    hologramGroup.scale.lerpVectors(_ONE, _holoScl, b);
    hologramGroup.rotation.x *= b;
    if (lightCone) lightCone.material.uniforms.uOpacity.value *= b;
  }

  /* ---- the camera ----------------------------------------------------- *
   * Three keyed shots with long eased tails, plus a continuous drift of
   * about a degree and a half running through every beat. Nothing is ever
   * perfectly still: a frozen frame in a 3D loop reads as a slideshow, and
   * the drift costs nothing. It completes a whole number of cycles over
   * the loop, so it cannot be the thing that breaks the closure. */
  const m = TL.camMix;
  _camPos.lerpVectors(SHOT.wide.pos, SHOT.tight.pos, m);
  _camTgt.lerpVectors(SHOT.wide.target, SHOT.tight.target, m);

  const drift = THREE.MathUtils.degToRad(cfg.cinematic.cameraDriftDegrees);
  const ph = sceneState.u * TAU * TUNING.camera.driftCycles;
  const yaw = Math.sin(ph) * drift;
  const pitch = Math.cos(ph) * drift * 0.55;
  _camPos.sub(_camTgt);
  _camPos.applyAxisAngle(_UP, yaw);
  _camPos.applyAxisAngle(_RIGHT, pitch);
  _camPos.add(_camTgt);

  if (hand.blend < 0.999) {
    _camPosI.copy(SHOT.inter.pos);
    _camTgtI.copy(SHOT.inter.target);
    _camPos.lerpVectors(_camPosI, _camPos, hand.blend);
    _camTgt.lerpVectors(_camTgtI, _camTgt, hand.blend);
  }
  camera.position.copy(_camPos);
  camera.lookAt(_camTgt);

  /* ---- the globe's own turn across Explore ---------------------------- */
  const cineSpin = neutralSpin + TL.globeTurn;

  /* ---- arcs fire in sequence, pins pop in behind them ------------------ */
  const n = Math.max(1, arcs.length);
  const planeIdx = Math.floor(n / 2);
  arcs.forEach((a, i) => {
    const d = THREE.MathUtils.clamp(TL.arcFire * (n + 1) - i, 0, 1);
    a.draw = d;
    a.mat.uniforms.uDraw.value = Math.min(1, d + 0.004);
    a.mat.uniforms.uActive.value = i === planeIdx ? TL.planeOn : 0;
    a.mat.uniforms.uOpacity.value = 1;
  });
  markers.forEach((mk, i) => {
    const p = THREE.MathUtils.clamp(TL.pinPop * (n + 1) - i, 0, 1);
    mk.pop = p <= 0 ? 0 : easeOutBack(p);
  });

  /* ---- the aircraft, inside the Explore beat only ---------------------- */
  if (plane && arcs.length) {
    planeState.arc = planeIdx;
    const arc = arcs[planeIdx % arcs.length];
    placePlaneOnArc(arc, THREE.MathUtils.clamp(TL.planeT, 0.001, 0.999));
    planeState.opacity = TL.planeOn;
    plane.visible = TL.planeOn > 0.02;
    plane.scale.setScalar(0.6 + 0.4 * TL.planeOn);
    plane.children[0].rotation.z = 0;
  }

  return cineSpin;
}

const _UP = new THREE.Vector3(0, 1, 0);
const _RIGHT = new THREE.Vector3(1, 0, 0);
const _ONE = new THREE.Vector3(1, 1, 1);

/* ---- the cursor, which is DOM and so never part of a captured frame --- */

let rippleArmed = true;
let measureArmed = true;
function applyCursor(t) {
  if (CAPTURE || !cursor.el) return;
  if (!cfg.cursor.enabled || !finePointer.matches || prefersReduced.matches ||
      cursor.suppressed || hand.mode === 'interactive') {
    if (cursor.visible || cursor.classes.size) { cursor.show(false); cursor.clearClasses(); }
    return;
  }
  const on = TL.cursorOn > 0.02;
  if (!on) {
    if (cursor.visible || cursor.classes.size) { cursor.show(false); cursor.clearClasses(); }
    rippleArmed = true;
    measureArmed = true;
    return;
  }
  // Read the button at the start of the Travel beat, every time round the
  // loop. Measuring once at boot is not enough: the hero copy arrives on
  // an entrance transition, so a rect taken before it settles is a couple
  // of dozen pixels out and the cursor lands just under the button.
  if (measureArmed) {
    measureArmed = false;
    if (!cursor.measure()) return;
  }
  if (!cursor.rect) return;

  cursor.show(true);
  cursor.el.style.opacity = String(TL.cursorOn * hand.cineMix);

  cursor.positionAt(THREE.MathUtils.clamp(TL.cursorP, 0, 1), _cursorAt);
  const press = TL.cursorPress;
  const scale = THREE.MathUtils.lerp(TUNING.cursor.scale.rest, TUNING.cursor.scale.press, press);
  cursor.move(_cursorAt.x, _cursorAt.y, scale);

  // hover first, as a real pointer would, then the pressed appearance --
  // both through classes declared in the same CSS rule as the real :hover
  // and :active, so the two can never drift apart
  if (TL.cursorHover > 0.5) cursor.addClass('is-demo-hover'); else cursor.removeClass('is-demo-hover');

  if (cfg.cursor.mode === 'click') {
    if (press > 0.5) {
      cursor.addClass('is-demo-active');
      if (rippleArmed) { cursor.pressRipple(); rippleArmed = false; }
    } else {
      cursor.removeClass('is-demo-active');
    }
    if (TL.cursorPress < 0.02 && TL.cursorHover < 0.5) { cursor.dropRipple(); rippleArmed = true; }
    ui.ctaEcho?.classList.toggle('on', TL.ctaEcho > 0.5);
  } else {
    // the quieter alternative: the cursor arrives, the button lifts into
    // its hover state, and the loop moves on without a press. It reads as
    // an invitation rather than a demonstration.
    cursor.removeClass('is-demo-active');
    ui.ctaEcho?.classList.remove('on');
  }
}
const _cursorAt = new THREE.Vector2();

/* ====================================================================== *
 *  INPUT — pointer, drag, raycast, keyboard, idle timer                  *
 *                                                                        *
 *  Every input writes to a target; the render loop eases the current     *
 *  value toward it. No handler drives a transform and none calls         *
 *  render().                                                             *
 * ====================================================================== */

const input = {
  ndc: new THREE.Vector2(),
  parallax: new THREE.Vector2(),
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

let neutralSpin = 0;
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

/** A real pointer anywhere in the hero stands the demo cursor down within
 *  one frame and strips every class it applied. Two cursors on screen at
 *  once is worse than no cursor at all. */
function onHeroPointer() {
  if (CAPTURE) return;
  cursor.suppress();
}

function onPointerMove(ev) {
  if (CAPTURE) return;
  const r = canvas.getBoundingClientRect();
  input.ndc.set(
    ((ev.clientX - r.left) / r.width) * 2 - 1,
    -((ev.clientY - r.top) / r.height) * 2 + 1
  );
  markInput();
  hand.take();

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
  hand.take();
}

function onPointerUp(ev) {
  if (!input.dragging || ev.pointerId !== input.pointerId) return;
  const held = performance.now() - input.downAt;
  input.dragging = false;
  input.pointerId = null;
  markInput();

  if (!input.moved && held < TUNING.drag.msThreshold) handleClick();
  else input.recovering = true;
}

function onPointerCancel() {
  input.dragging = false;
  input.pointerId = null;
}

/* ---- hover ----------------------------------------------------------- */

function updateHover(now) {
  if (CAPTURE || input.dragging || hand.mode !== 'interactive') return;
  frameCounter++;
  if (frameCounter % TUNING.hover.everyNFrames) return;
  if (now - lastRayAt < TUNING.hover.throttleMs) return;
  lastRayAt = now;

  raycaster.setFromCamera(input.ndc, camera);
  raycaster.params.Points.threshold = 0.1;
  const hits = raycaster.intersectObjects(interactables, true);

  let marker = null, doc = null;
  for (const hit of hits) {
    if (hit.object === pinMesh && hit.instanceId !== undefined) {
      marker = markers[hit.instanceId] || null;
      break;
    }
    const mk = markers.find(x => x.landmark === hit.object);
    if (mk) { marker = mk; break; }
    const d = documents.find(dd => isDescendant(hit.object, dd.pivot));
    if (d) { doc = d; break; }
  }

  // hysteresis: a pin already held keeps a wider catchment than it needed
  // to be caught, so one at the edge of the ray cannot strobe its label
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
  if (!pinMesh) return;
  marker.hot = hot;
  marker.scaleTarget = hot ? TUNING.hover.pinScale : 1;
  marker.labelTarget = hot || input.selected === marker ? 1 : 0;
  const arc = arcs.find(a => a.dest.code === marker.dest.code);
  if (arc) {
    arc.boostTarget = hot ? TUNING.hover.arcBoostPulse : 1;
    arc.activeTarget = hot ? 1 : 0;        // fix 8, in the interactive half
  }
  pinMesh.setColorAt(marker.index, tmpC.set(hot || input.selected === marker ? PAL.accent : PAL.pin));
  pinMesh.instanceColor.needsUpdate = true;
}

/* ---- click and tap --------------------------------------------------- */

function handleClick() {
  if (sceneState.tweening || hand.mode !== 'interactive') return;
  if (input.hovered) selectMarker(input.hovered);
  else if (!identifyUnderPointer()) clearSelection();
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

  const arc = arcs.find(a => a.dest.code === marker.dest.code);
  if (arc) { arc.draw = 0; arc.drawTarget = 1; }

  openDestCard(marker.dest);
  dispatchSelect(marker.dest);
}

function clearSelection(silent) {
  if (input.selected) {
    const prev = input.selected;
    input.selected = null;
    setMarkerHot(prev, prev === input.hovered);
  }
  closeDestCard();
  disposePick();
  if (silent) {
    // the handover snaps: there is no one watching the interactive globe
    // at the moment the cinematic takes it back
    input.spinOffset = 0; input.spinOffsetTarget = 0; input.tween = null;
    input.tiltTarget = 0; input.tiltOffset = 0;
    sceneState.tweening = false;
  }
}

/** The one real event this page dispatches, and it is the agency's own:
 *  a CustomEvent on window naming the destination. It is never a pointer
 *  event and never aimed at a DOM element. */
function dispatchSelect(dest) {
  const key = cfg.cta.payloadKey;
  window.dispatchEvent(new CustomEvent(cfg.cta.eventName, {
    detail: { [key]: dest[key], destination: { ...dest } }
  }));
}

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
 *  22.  CAPTURE MODE AND THE ACCEPTANCE PROOFS                           *
 *                                                                        *
 *  Capture sets the time from a frame counter rather than from           *
 *  performance.now(), kills input, hides the overlay, seeds the          *
 *  randomness and locks the canvas to a fixed size at DPR 1. The         *
 *  exported video and the live loop are therefore the same animation,    *
 *  not two that drift. Unchanged from version one apart from three       *
 *  things: 30 fps rather than 60, 300 frames rather than 300 at 60, and  *
 *  the timeline scrub replacing the idle clock as what the frame counter *
 *  drives.                                                               *
 * ====================================================================== */

const capture = {
  active: CAPTURE,
  frame: 0,
  width:  Number(QS.get('w')) || TUNING.capture.width,
  height: Number(QS.get('h')) || TUNING.capture.height
};

/** The number of frames in one loop. Derived, never hard-coded: a config
 *  change to loopSeconds or captureFps has to move it or the last frame
 *  will not be the first frame. */
const captureFrames = () => Math.round(cfg.motion.loopSeconds * cfg.motion.captureFps);

/** Step one deterministic frame. A harness (Puppeteer overriding rAF, or
 *  an encoder in the page) calls this; it never relies on the browser
 *  clock. */
function captureStep(frame) {
  capture.frame = frame;
  sceneState.elapsed = frame / cfg.motion.captureFps;
  sceneState.t = sceneState.elapsed;
  sceneState.u = (sceneState.t % cfg.motion.loopSeconds) / cfg.motion.loopSeconds;
  sceneState.uIdle = sceneState.u;
  sceneState.idleMix = 1;
  sceneState.scrub = null;
  // Whatever a live session was doing, a captured frame is the cinematic
  // at full strength with the interactive scene's additions hidden.
  if (character) { character.root.visible = true; character.shadow.visible = true; }
  if (laptop) { laptop.group.visible = true; if (laptop.plinth) laptop.plinth.visible = true; }
  setOpacity(character?.root, 1);
  setOpacity(laptop?.group, 1);
  setOpacity(laptop?.plinth, 1);
  L.documents.visible = false;
  if (globeShadow) globeShadow.visible = false;
  input.spinOffset = 0; input.spinOffsetTarget = 0; input.tween = null;
  input.tiltOffset = 0;
  // the cinematic owns everything under capture; there is no handover and
  // no live offset to drift
  hand.mode = 'cinematic'; hand.paused = false; hand.accel = null;
  hand.cineMix = hand.cineMixTarget = 1;
  hand.blend = hand.blendTarget = 1;
  rand = mulberry32(0x5EED);
  updateScene(1 / cfg.motion.captureFps, true);
  renderFrame();
}
window.__cineCaptureStep = captureStep;

/* ---- proof 1: the pixels ---------------------------------------------- *
 *  Render frame 0 and frame N and report the largest per-channel
 *  difference. The acceptance criterion is no more than 2.               */
async function runLoopTest() {
  const w = 480, h = 270;
  const n = captureFrames();
  renderer.setSize(w, h, false);
  frameScene(w, h);

  const read = frame => {
    captureStep(frame);
    const buf = new Uint8Array(w * h * 4);
    const gl = renderer.getContext();
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return buf;
  };
  const a = read(0);
  const b = read(n);

  let max = 0, sum = 0, count = 0;
  for (let i = 0; i < a.length; i++) {
    if (i % 4 === 3) continue;
    const d = Math.abs(a[i] - b[i]);
    if (d > max) max = d;
    sum += d; count++;
  }
  const result = { maxDelta: max, meanDelta: +(sum / count).toFixed(4),
                   frames: `0 vs ${n}`, pass: max <= 2 };
  console.log(`[cinematic] pixel closure: max per-channel delta ${max}, mean ${result.meanDelta} — ${result.pass ? 'PASS' : 'FAIL'}`);
  return result;
}

/* ---- proof 2: the timeline and every property it owns ----------------- *
 *  Evaluate the timeline at t = 0 and at t = loopSeconds, apply each, and
 *  diff the owned properties. Failing here is the cheap way to find a
 *  loop that does not close; waiting for the video export is the dear
 *  one. The character's rest pose is a straight numeric comparison,
 *  because the rig is rigid Euler angles -- one more reason not to skin
 *  it.                                                                   */
function runTimelineTest() {
  const n = captureFrames();
  const tracks = timeline.assertClosure();

  captureStep(0);
  const a = ownedSnapshot();
  captureStep(n);
  const b = ownedSnapshot();
  const failures = diffOwned(a, b);

  const result = {
    tracks,
    properties: TIMELINE_OWNED.length,
    propertyFailures: failures,
    pass: tracks.pass && failures.length === 0
  };
  if (!result.pass) console.error('[cinematic] timeline closure FAILED', result);
  else console.log(`[cinematic] timeline closure: ${tracks.tracks} tracks and ${TIMELINE_OWNED.length} owned properties identical at t=0 and t=${cfg.motion.loopSeconds} — PASS`);
  return result;
}

/* ---- proof 3: the left safe zone, sampled rather than eyeballed ------- *
 *  The character and the laptop must never enter the left 45% on any
 *  frame. Every frame of the loop is stepped, the subject's world box is
 *  rebuilt at that frame's pose, its eight corners are projected, and the
 *  smallest NDC x is kept.                                               */
function runSafeZoneTest(width = TUNING.capture.width, height = TUNING.capture.height) {
  const n = captureFrames();
  const limit = -1 + 2 * SAFE_LEFT_FRACTION;
  /* The figure and the laptop, not the desk: the desk is a ground plane
   * that bleeds off both sides on purpose, the way the backdrop does,
   * and measuring it would only ever report that it bleeds. */
  const subject = [character?.root, laptop?.group].filter(Boolean);
  if (!subject.length) return { pass: true, skipped: 'no character or laptop in this build' };

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  frameScene(width, height);

  const box3 = new THREE.Box3();
  const p = new THREE.Vector3();
  let worst = Infinity, worstFrame = -1;

  for (let f = 0; f < n; f++) {
    captureStep(f);
    box3.makeEmpty();
    for (const o of subject) box3.expandByObject(o);
    for (let i = 0; i < 8; i++) {
      p.set(i & 1 ? box3.max.x : box3.min.x,
            i & 2 ? box3.max.y : box3.min.y,
            i & 4 ? box3.max.z : box3.min.z);
      p.project(camera);
      if (p.x < worst) { worst = p.x; worstFrame = f; }
    }
  }

  if (!CAPTURE) applySize();

  const result = {
    frames: n, safeBoundaryNdc: +limit.toFixed(3),
    worstNdcX: +worst.toFixed(4), worstFrame,
    marginNdc: +(worst - limit).toFixed(4),
    pass: worst >= limit
  };
  console.log(`[cinematic] left safe zone over ${n} frames: worst NDC x ${result.worstNdcX} at frame ${worstFrame}, boundary ${result.safeBoundaryNdc} — ${result.pass ? 'PASS' : 'FAIL'}`);
  return result;
}

/* ---- proof 4: no synthetic event, ever -------------------------------- *
 *  A dev-mode listener on the CTA that records any untrusted event. The
 *  demo applies CSS classes and nothing else; a synthetic click here
 *  would fire the agency's analytics, could trigger navigation, and would
 *  bury the real conversion data under thousands of fake clicks. If one
 *  line of this build survives review it should be this one.             */
const eventAudit = { watched: false, untrusted: [], total: 0 };

function watchForSyntheticEvents() {
  const el = document.querySelector(cfg.cursor.targetSelector);
  if (!el || eventAudit.watched) return;
  eventAudit.watched = true;
  for (const type of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick']) {
    el.addEventListener(type, ev => {
      eventAudit.total++;
      if (!ev.isTrusted) {
        const record = { type, at: +sceneState.t.toFixed(3), beat: sceneState.beat };
        eventAudit.untrusted.push(record);
        console.error('[cinematic] a synthetic event reached the CTA — this must never happen:', record);
      }
    }, true);
  }
}

function runEventTest() {
  const result = {
    watching: eventAudit.watched,
    eventsSeen: eventAudit.total,
    untrusted: eventAudit.untrusted.slice(),
    pass: eventAudit.untrusted.length === 0
  };
  console.log(`[cinematic] untrusted events on the CTA: ${result.untrusted.length} — ${result.pass ? 'PASS' : 'FAIL'}`);
  return result;
}

/** All four, in one call, for a review that wants one number. */
async function runSelfTest() {
  const timelineResult = runTimelineTest();
  const safeZone = runSafeZoneTest();
  const pixels = await runLoopTest();
  const events = runEventTest();
  const out = { pixels, timeline: timelineResult, safeZone, events,
                pass: pixels.pass && timelineResult.pass && safeZone.pass && events.pass };
  window.__cineLoopTest = out;
  console.log(`[cinematic] self test — ${out.pass ? 'PASS' : 'FAIL'}`);
  return out;
}

/* ====================================================================== *
 *  23.  FRAMING AND RESIZE                                               *
 *                                                                        *
 *  Fix 7, and the left safe zone, both in one place. Version one moved    *
 *  the globe to clear the headline and left it half-cropped by the right  *
 *  edge — the middle answer, which is the only wrong one. Here the        *
 *  subject stays put and the camera is solved for: a shot is fitted so    *
 *  the whole subject sits between the safe-zone boundary and the right    *
 *  edge, with breathing room, at every aspect from 21:9 to 9:16.          *
 * ====================================================================== */

const SAFE_LEFT_FRACTION = 0.45;    // the headline's band, in landscape
const SAFE_TOP_FRACTION  = 0.55;    // the headline's band, in portrait
const LEFT_NDC  = -1 + 2 * SAFE_LEFT_FRACTION + 0.05;    // plus a margin
const RIGHT_NDC = 0.96;
const TOP_NDC   = 1 - 2 * SAFE_TOP_FRACTION - 0.06;
const BOTTOM_NDC = -0.96;

const GLOBE_FRAME_FRACTION = 0.60;      // of frame height, in landscape
const GLOBE_WIDTH_FRACTION = 0.86;      // of frame width, in portrait

/* What each shot has to hold, in world units, with the margins baked in.
 *
 *  z is the subject's NEAREST point to the camera, and it matters: a box
 *  solved at the target plane and then filled with things standing a metre
 *  in front of it overflows the frame by exactly that much perspective.
 *  Version one never noticed because its subject was a sphere centred on
 *  the target.
 *
 *  wide   beats 1, 2 and 6: the whole figure and the ground under him,
 *         with real air round it, so the move into the tight shot reads
 *  tight  beats 3 to 5: the hologram and the figure's head and shoulders
 */
const SUBJECT = {
  // the desk runs out of frame on both sides on purpose, so these crop it
  wide:  { x0: -0.38, x1: 1.32, y0:  0.26, y1: 1.38, z: 0.80 },
  // measured, not estimated: the arcs stand a quarter of a radius proud of
  // the globe and it is their tips, not the sphere, that reach the frame
  tight: { x0: -0.80, x1: 1.56, y0:  0.52, y1: 3.22, z: 0.80 }
};

/** Solve a shot: the camera distance that fits the box with its near face
 *  accounted for, and the target that puts its left edge on the safe
 *  boundary. */
function fitShot(sub, aspect, portrait, halfFov, out) {
  const hNeed = portrait
    ? Math.max((sub.y1 - sub.y0) / (TOP_NDC - BOTTOM_NDC),
               (sub.x1 - sub.x0) / (1.9 * aspect))
    : Math.max((sub.y1 - sub.y0) / 1.88,
               (sub.x1 - sub.x0) / ((RIGHT_NDC - LEFT_NDC) * aspect));
  const h = hNeed * 1.06;                       // a little air, deliberately
  // h is the half-height at the subject's NEAR face, so the dolly has to
  // clear that face rather than the target plane
  const d = sub.z + h / Math.tan(halfFov);
  const w = h * aspect;

  const tx = portrait ? (sub.x0 + sub.x1) / 2 : sub.x0 - LEFT_NDC * w;
  const ty = portrait ? sub.y1 - TOP_NDC * h : (sub.y0 + sub.y1) / 2;

  out.target.set(tx, ty, 0);
  // a three-quarter view: the camera stands a little left of its target and
  // above it, which is the angle the character is posed for
  out.pos.set(tx - h * 0.06, ty + h * 0.12, d);
  return d;
}

/** The interactive shot keeps version one's rule exactly: the globe is a
 *  fixed share of the frame, and the safe zone decides where it sits. */
function fitInteractive(aspect, portrait, halfFov, out) {
  const h = portrait ? (R / GLOBE_WIDTH_FRACTION) / aspect : R / GLOBE_FRAME_FRACTION;
  const d = h / Math.tan(halfFov);
  const w = h * aspect;

  const gx = _neutralPos.x, gy = _neutralPos.y;
  // the props orbit outside the globe and are offset to the right, so the
  // leftmost thing in the frame is the globe itself
  const left = gx - R * 1.06;
  const tx = portrait ? gx : left - LEFT_NDC * w;
  const ty = portrait ? (gy + R * 1.06) - TOP_NDC * h : gy;

  out.target.set(tx, ty, 0);
  out.pos.set(tx, ty, d);
  return d;
}

function frameScene(w, h) {
  const aspect = w / h;
  const portrait = aspect < 1.05;

  camera.fov = portrait ? TUNING.camera.fovMobile : TUNING.camera.fovDesktop;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;

  _neutralPos.set(...TUNING.cine.hologramRise);

  fitShot(SUBJECT.wide,  aspect, portrait, halfFov, SHOT.wide);
  fitShot(SUBJECT.tight, aspect, portrait, halfFov, SHOT.tight);
  fitInteractive(aspect, portrait, halfFov, SHOT.inter);

  // the props orbit the globe, offset to the outside so the near half of
  // the orbit never crosses the safe zone
  L.documents.position.copy(_neutralPos);
  L.documents.position.x += portrait ? 0 : TUNING.scene.orbitOffsetX;
  L.documents.scale.setScalar(portrait ? 0.78 : 1);

  // the background and foreground slabs sit around the subject, not around
  // the world origin, because the camera looks well above the ground here
  L.stars.position.set(0.3, 1.6, 0);
  L.bokeh.position.set(0.3, 1.5, 0);

  sizeBackdrop();
}

let resizeTimer = null, lastW = 0, lastH = 0;

function applySize() {
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, T.dpr));
  renderer.setSize(w, h, false);
  composer?.setSize(w, h);
  frameScene(w, h);
  fitHeadline();
  layoutPinButtons();
  // the cursor aims at the real button, so a layout change re-measures it
  cursor.measure();
  lastW = w; lastH = h;
}

const resizeObserver = new ResizeObserver(entries => {
  if (CAPTURE) return;
  const r = entries[0].contentRect;
  const w = Math.round(r.width), h = Math.round(r.height);
  // Mobile browsers fire a storm of height-only events as the URL bar
  // hides and shows; reacting to each one makes the scene jitter while
  // the visitor is only scrolling.
  if (w === lastW && Math.abs(h - lastH) < 120) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applySize, 150);
});

const visibility = new IntersectionObserver(entries => {
  const visible = entries[0].isIntersecting;
  canvas.classList.toggle('ready', visible && sceneState.ready === true);
  if (visible) start(); else stop();
}, { threshold: 0.01 });

/* ====================================================================== *
 *  24.  THE FRAME                                                        *
 * ====================================================================== */

const _v3 = new THREE.Vector3();
const _planeUp = new THREE.Vector3();
const _planeX = new THREE.Vector3();
const _planeY = new THREE.Vector3();
const _planeM = new THREE.Matrix4();
const _m4 = new THREE.Matrix4();
const _s = new THREE.Vector3();

/** Orient the aircraft inside the globe's own frame. lookAt() works in
 *  world space and the globe is both tilted and turning, so the basis is
 *  built by hand. */
function placePlaneOnArc(arc, t) {
  arc.curve.getPointAt(t, _v3);
  plane.position.copy(_v3);
  arc.curve.getPointAt(Math.min(0.999, t + 0.012), _w);
  const fwd = _w.sub(_v3).normalize();
  const rad = _planeUp.copy(_v3).normalize();
  _planeX.crossVectors(rad, fwd).normalize();
  _planeY.crossVectors(fwd, _planeX);
  _planeM.makeBasis(_planeX, _planeY, fwd);
  plane.quaternion.setFromRotationMatrix(_planeM);
}

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
  const live = deterministic ? 0 : 1 - sceneState.idleMix;
  const u = sceneState.uIdle;
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
  for (const [key, g] of [['globe', cineRoot], ['stars', L.stars],
                          ['documents', L.documents], ['bokeh', L.bokeh]]) {
    const rate = TUNING.parallax.layers[key];
    g.rotation.y = yaw * rate;
    g.rotation.x = -pitch * rate;
  }

  if (!deterministic) {
    const cl = TUNING.parallax.cursorLight;
    input.lightPos.set(input.ndc.x * 4.4, 1.6 + input.ndc.y * 2.6, cl.z);
    cursorLight.position.lerp(input.lightPos, 1 - Math.pow(1 - cl.ease, dt * 60));
    cursorLight.intensity = cl.intensity * live * PS;
  } else {
    cursorLight.intensity = 0;
  }

  /* ---- the two controllers ------------------------------------------- */
  if (!deterministic) hand.update(dt);
  const cineSpin = applyCinematic(sceneState.t, dt, deterministic);

  /* ---- the interactive globe: drag, inertia, recovery, idle swing ----- */
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
  const interSpin = neutralSpin + input.spinOffset + swing * sceneState.idleMix;
  globeSpin.rotation.y = THREE.MathUtils.lerp(interSpin, cineSpin, hand.blend);
  globeSpin.rotation.x = THREE.MathUtils.clamp(
    input.tiltOffset, -THREE.MathUtils.degToRad(TUNING.drag.pitchClampDeg),
    THREE.MathUtils.degToRad(TUNING.drag.pitchClampDeg)) * (1 - hand.blend);

  /* ---- pins: the cinematic's pop, the interactive's hover spring ------ */
  let pinsDirty = false;
  for (const m of markers) {
    const target = deterministic ? 1 : m.scaleTarget;
    const next = ease(m.scale, target, TUNING.hover.springK, dt);
    if (Math.abs(next - m.scale) > 0.0005) { m.scale = next; pinsDirty = true; }
    const s = m.scale * THREE.MathUtils.lerp(1, m.pop, hand.blend);
    _m4.compose(m.base, m.quat, _s.setScalar(Math.max(0.0001, s)));
    pinMesh.setMatrixAt(m.index, _m4);

    const lt = deterministic ? 0 : m.labelTarget;
    m.labelOpacity = ease(m.labelOpacity, lt, 0.18, dt);
    m.sprite.visible = m.labelOpacity > 0.01 && facesCamera(m.base);
    m.sprite.material.opacity = m.labelOpacity;
    m.landmark.scale.setScalar(Math.max(0.0001, 0.92 * s));
  }
  if (pinMesh && (pinsDirty || deterministic || hand.blend > 0.001)) pinMesh.instanceMatrix.needsUpdate = true;
  if (originPin) originPin.scale.setScalar(Math.max(0.0001,
    THREE.MathUtils.lerp(1, THREE.MathUtils.clamp(TL.pinPop * 2.2, 0, 1), hand.blend)));

  /* ---- arcs: one travelling pulse each, staggered --------------------- */
  for (const a of arcs) {
    a.mat.uniforms.uHead.value = (u * TUNING.idle.arcCycles + a.phase) % 1;
    a.boost = deterministic ? 1 : ease(a.boost, a.boostTarget, 0.14, dt);
    a.mat.uniforms.uBoost.value = a.boost;
    if (hand.blend < 0.999) {
      const interDraw = deterministic ? 1 : ease(a.draw, a.drawTarget, 0.1, dt);
      const interActive = deterministic ? 0 : ease(a.active, a.activeTarget, 0.12, dt);
      a.draw = interDraw; a.active = interActive;
      a.mat.uniforms.uDraw.value = THREE.MathUtils.lerp(Math.min(1, interDraw + 0.004),
                                                        a.mat.uniforms.uDraw.value, hand.blend);
      a.mat.uniforms.uActive.value = THREE.MathUtils.lerp(interActive,
                                                          a.mat.uniforms.uActive.value, hand.blend);
    }
  }

  /* ---- the aircraft --------------------------------------------------- */
  /* ---- the background traffic, the fleet, and the readout ------------- */
  // These belong to the interactive scene, the way the orbiting props do.
  // The cinematic is ten seconds of one student's story, and a sky full of
  // other people's flights is not part of it.
  if (traffic) {
    traffic.mesh.visible = hand.blend < 0.98;
    traffic.mat.uniforms.uHead.value = (u * TUNING.idle.arcCycles) % 1;
    traffic.mat.uniforms.uOpacity.value = TUNING.globe.trafficOpacity * (1 - hand.blend);
  }
  if (fleet) {
    const on = hand.blend < 0.98;
    fleet.body.visible = fleet.accent.visible = on;
    if (on) updateFleet(u);
  }
  if (!deterministic) updatePick(dt);

  if (plane && arcs.length) {
    if (hand.mode === 'interactive' && hand.blend < 0.02) {
      const arc = arcs[planeState.arc % arcs.length];
      placePlaneOnArc(arc, THREE.MathUtils.clamp(u, 0.001, 0.999));
      const fi = THREE.MathUtils.smoothstep(u, 0, TUNING.idle.planeFadeIn);
      const fo = 1 - THREE.MathUtils.smoothstep(u, TUNING.idle.planeFadeOut, 1);
      planeState.opacity = Math.min(fi, fo);
      plane.visible = planeState.opacity > 0.02;
      plane.scale.setScalar(0.6 + 0.4 * planeState.opacity);
      if (u > 0.97 && planeState.armed) {
        planeState.arc = (planeState.arc + 1) % arcs.length;
        planeState.armed = false;
      }
      if (u < 0.5) planeState.armed = true;
    } else if (hand.blend < 0.98) {
      // mid-handover: it is traversing two different arcs at once, so it
      // simply is not there for the half second the blend takes
      plane.visible = false;
    }
  }

  /* ---- the orbiting props, which only the interactive scene shows ----- */
  if (L.documents.visible) {
    documents.forEach((d, i) => {
      const angle = (u * d.speed + d.phase) * TAU;
      const bob = Math.sin((u * d.bobCycles + d.phase) * TAU) * TUNING.idle.bobAmplitude;
      const radius = TUNING.scene.documentRadius * d.radius;
      d.lift = deterministic ? 0 : ease(d.lift, d.liftTarget, 0.12, dt);
      d.pivot.position.set(Math.cos(angle) * radius * TUNING.scene.orbitSquashX, bob, Math.sin(angle) * radius);
      d.holder.position.z = d.lift * 2;
      // A whole number of turns per loop, or frame 0 and the last frame can
      // never match. Hovering shows as a lag that unwinds afterwards, which
      // is a live offset and so is zero under capture.
      d.spinLag = deterministic ? 0 : ease(d.spinLag, d.liftTarget > 0 ? -0.85 : 0, 0.05, dt);
      d.holder.rotation.y = (u * d.spinCycles + d.phase) * TAU + d.spinLag;
      d.holder.rotation.x = d.faceTilt + Math.sin((u * d.bobCycles + d.phase) * TAU) * 0.18;
      if (!deterministic) {
        const cap = THREE.MathUtils.degToRad(TUNING.hover.deflectionDeg);
        d.deflect.x = ease(d.deflect.x, input.parallax.y * cap * PS * live, 0.07, dt);
        d.deflect.y = ease(d.deflect.y, input.parallax.x * cap * PS * live, 0.07, dt);
        d.holder.rotation.x += d.deflect.x;
        d.holder.rotation.z = d.deflect.y;
      }
    });
  }

  /* ---- particles: sine pairs on integer frequencies ------------------- */
  if (starPoints) {
    starPoints.position.x = Math.sin(u * TAU) * 0.26;
    starPoints.position.y = Math.cos(u * TAU * 2) * 0.13;
  }
  for (const b of blurs) {
    b.sprite.position.x = b.home.x + Math.sin((u * b.cycles + b.phase) * TAU) * b.amp;
    b.sprite.position.y = b.home.y + Math.cos((u * b.cycles + b.phase) * TAU) * b.amp * 0.7;
  }
  for (const b of bokeh) {
    b.sprite.position.x = b.home.x + Math.sin((u * b.cycles + b.phase) * TAU) * b.amp;
    b.sprite.position.y = b.home.y + Math.cos((u * b.cycles + b.phase) * TAU) * b.amp * 0.8;
  }

  if (!deterministic) applyCursor(sceneState.t);
}

function renderFrame() {
  renderer.info.reset();
  if (composer) composer.render();
  else renderer.render(scene, camera);
}

let rafId = 0;
let composer = null;

function tick() {
  if (sceneState.destroyed) return;
  rafId = requestAnimationFrame(tick);

  const dt = Math.min(clock.getDelta(), 0.1);
  const L = cfg.motion.loopSeconds;
  sceneState.elapsed += dt;

  if (sceneState.scrub !== null) {
    sceneState.t = sceneState.scrub;
  } else if (!hand.paused && !hand.accel) {
    sceneState.t = (sceneState.t + dt) % L;
  }
  sceneState.u = (sceneState.t % L) / L;
  sceneState.uIdle = (sceneState.elapsed % L) / L;

  // the cinematic comes back after the configured quiet time; leaving it
  // is immediate
  const quiet = sceneState.elapsed - sceneState.lastInput;
  if (hand.mode === 'interactive' && quiet > cfg.motion.idleDelaySeconds && !input.dragging && !input.selected) {
    hand.toCinematic();
  }
  const wantIdle = quiet > cfg.motion.idleDelaySeconds && !input.dragging;
  const k = wantIdle ? dt * 1000 / TUNING.idle.crossfadeMs : dt * 1000 / 320;
  sceneState.idleMix = THREE.MathUtils.clamp(sceneState.idleMix + (wantIdle ? k : -k), 0, 1);

  updateHover(performance.now());
  updateScene(dt);
  layoutPinButtons();
  updateBeatBar();
  renderFrame();
  sceneState.frame++;
}

function start() {
  if (rafId || sceneState.destroyed || !sceneState.ready) return;
  clock.getDelta();
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
 *  25.  THE PAGE — DOM the same config drives                            *
 *                                                                        *
 *  All headline and body copy stays in the DOM, for search engines and   *
 *  for screen readers. The only text inside the 3D scene is the short    *
 *  country labels.                                                       *
 * ====================================================================== */

const ui = {
  // The demo page's own chrome -- wordmark, headline, subhead, footer name,
  // the CTA and its echo -- is not part of the mounted scene: the React page
  // supplies that copy. These lookups stay and resolve to null, so every
  // reader below keeps the shape it had.
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
  cta:       root.querySelector('#heroCta'),
  ctaEcho:   root.querySelector('#ctaEcho'),
  beatBar:   root.querySelector('#beatBar'),
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

/* ---- the beat readout, for review ------------------------------------ */

let beatCells = [];
function buildBeatBar() {
  if (!ui.beatBar) return;
  ui.beatBar.textContent = '';
  beatCells = BEAT_KEYS.map(key => {
    const li = document.createElement('li');
    li.textContent = key;
    ui.beatBar.append(li);
    return { key, li };
  });
}
function updateBeatBar() {
  if (!beatCells.length) return;
  for (const c of beatCells) c.li.dataset.on = String(c.key === sceneState.beat && hand.mode !== 'interactive');
}

/* ---- keyboard and screen-reader parity ------------------------------- *
 *  One real button per destination, layered over the canvas. Tab reaches
 *  them in order, focus applies the same highlight as hover plus a ring,
 *  Enter or Space acts as a click, Escape resets. The canvas itself is
 *  aria-hidden and never focusable, and the demo never moves focus to
 *  anything.                                                             */

const pinButtons = [];

function buildPinButtons() {
  if (!ui.pinList) return;
  ui.pinList.textContent = '';
  pinButtons.length = 0;
  markers.forEach(m => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = m.dest.label;
    btn.setAttribute('aria-label', `${m.dest.label} — intakes ${m.dest.intake || 'on request'}`);
    btn.addEventListener('focus', () => { markInput(); hand.take(); setMarkerHot(m, true); });
    btn.addEventListener('blur',  () => { if (input.selected !== m) setMarkerHot(m, false); });
    btn.addEventListener('click', () => { markInput(); hand.take(); selectMarker(m); });
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
    const facing = _facing.copy(_proj).sub(_globeWorld).normalize().dot(_camDir) < -0.12;
    _proj.project(camera);
    pb.li.style.left = `${(_proj.x * 0.5 + 0.5) * rect.width}px`;
    pb.li.style.top  = `${(-_proj.y * 0.5 + 0.5) * rect.height - 34}px`;
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
 *  26.  BOOT                                                             *
 * ====================================================================== */

function setStageMode(mode, reason) {
  stage.dataset.mode = mode;
  if (reason) console.info(`[cinematic] canvas off — ${reason}. The video and the DOM copy carry the hero.`);
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
  console.info(`[cinematic] warm-up mean frame time ${mean.toFixed(2)} ms`);
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
    // a soft, high-threshold bloom: it should catch the travelling pulse
    // and the hologram rim and nothing else
    composer.addPass(new UnrealBloomPass(size, 0.26, 0.42, 0.92));
    composer.addPass(new OutputPass());
    composer.setSize(size.x, size.y);
  } catch (err) {
    console.warn('[cinematic] bloom unavailable, rendering direct:', err.message);
    composer = null;
  }
}

function buildSceneContents({ particles = true, cine = true } = {}) {
  buildArcs();
  buildMarkers();
  buildDocuments();
  if (particles) buildParticles();
  buildPlane();
  buildSkyline();
  buildTraffic();
  buildFleet();
  // the laptop and the cinematic stand on their own; the figure is extra
  if (cine) { if (cfg.character.enabled) buildCharacter(); buildLaptop(); }

  interactables.length = 0;
  interactables.push(pinMesh, ...markers.map(m => m.landmark), ...documents.map(d => d.pivot));

  buildPinButtons();
  neutralSpin = lonToSpin(cfg.origin.lon) + 0.22;   // the origin a touch left of centre
  globeSpin.rotation.y = neutralSpin;
}

/** Particles live across a content change; only a lane change, which
 *  rebuilds every material, takes them with it. */
function disposeParticles() {
  if (starPoints) { starPoints.geometry.dispose(); starPoints.removeFromParent(); starPoints = null; }
  for (const b of bokeh) { b.sprite.material.dispose(); b.sprite.removeFromParent(); }
  for (const b of blurs) { b.sprite.material.dispose(); b.sprite.removeFromParent(); }
  bokeh.length = 0; blurs.length = 0;
}

function disposeSceneContents() {
  // Sprite geometry is shared by the whole module in three.js. Disposing it
  // here would break every sprite made afterwards, which shows up as a
  // slow leak across rebuilds rather than as an error.
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
  disposeCinematicBodies();
  interactables.length = 0;
  if (ui.pinList) ui.pinList.textContent = '';
  pinButtons.length = 0;
  input.hovered = input.hoveredDoc = input.selected = null;
}

/** The character and the laptop. Their geometries are per-part and their
 *  materials are shared, so only the geometries are released here; the
 *  flat material set belongs to MAT and goes with a lane change. */
function disposeCinematicBodies() {
  const seen = new Set();
  const killGeo = root => {
    root?.traverse(o => {
      if (o.geometry && !o.isSprite && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    });
    root?.removeFromParent();
  };
  if (character) { killGeo(character.root); character = null; }
  if (laptop) {
    killGeo(laptop.group);
    killGeo(laptop.plinth);
    laptop.screenMat.dispose();
    laptop = null;
  }
  if (lightCone) {
    lightCone.geometry.dispose();
    lightCone.material.dispose();
    lightCone.removeFromParent();
    lightCone = null;
  }
}

let heroReady = false;

async function mount() {
  cfg = await loadConfig();
  applyThemeToDom();
  applyBrandToDom();
  buildBeatBar();
  observeRises();
  if (IS_DEV) document.body.dataset.beats = 'true';

  const hasVideo = wireVideo();
  const reason = videoOnlyReason(cfg);
  if (reason && hasVideo) {
    setStageMode('video', reason);
    window.__cine = api;
    return;
  }

  // No exported media in this build, so even the "video only" paths get a
  // real still: the scene is built, one frame is drawn, and the loop never
  // starts. Under prefers-reduced-motion that frame is taken from the
  // Explore beat, which is the one that shows the destinations.
  const stillOnly = !!reason;
  if (reason) console.info(`[cinematic] ${reason} — rendering a single still frame from the Explore beat, no animation.`);

  await buildEnvironment();
  buildMaterials();
  buildBackdrop();
  buildGround();
  await buildGlobe();
  // before the warm-up probe, which renders real frames and so needs
  // something to read
  timeline = buildTimeline();
  applySize();

  const picked = await probeTier();
  if (picked === 'off') {
    console.warn('[cinematic] frame time over budget — the canvas is torn down, the page keeps its copy.');
    destroy();
    setStageMode('video', 'frame time over budget');
    return;
  }
  tier = picked;
  T = TIERS[tier];
  MAT.shadow.opacity = T.shadowOpacity;
  document.documentElement.dataset.heroTier = tier;

  buildSceneContents();
  if (!cfg.cinematic.enabled) hand.toInteractive();
  applySize();
  cursor.measure();
  if (IS_DEV) watchForSyntheticEvents();
  if (T.bloom && !stillOnly) await buildBloom();

  sceneState.ready = true;
  heroReady = true;
  sceneState.lastInput = 0;
  // exposed on every path, capture included, so a harness has the same
  // surface a page does
  window.__cine = api;

  if (CAPTURE) {
    document.body.dataset.capture = 'true';
    renderer.setPixelRatio(1);
    renderer.setSize(capture.width, capture.height, false);
    composer?.setSize(capture.width, capture.height);
    frameScene(capture.width, capture.height);
    canvas.classList.add('ready');
    if (SELFTEST) { await runSelfTest(); window.__cineCaptureReady = true; return; }
    captureStep(0);
    window.__cineCaptureReady = true;
    return;
  }

  canvas.classList.add('ready');
  resizeObserver.observe(stage);

  if (stillOnly) {
    const b = timeline.beats.explore;
    sceneState.t = b.start + b.dur * 0.5;
    sceneState.u = sceneState.t / cfg.motion.loopSeconds;
    sceneState.uIdle = sceneState.u;
    sceneState.idleMix = 1;
    updateScene(1 / 60, true);
    renderFrame();
    return;
  }

  // a real pointer anywhere in the hero stands the demo cursor down
  ui.hero.addEventListener('pointermove', onHeroPointer, { passive: true });
  ui.hero.addEventListener('pointerdown', onHeroPointer, { passive: true });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  addEventListener('pointerup', onPointerUp);
  addEventListener('pointercancel', onPointerCancel);
  addEventListener('keydown', onKeyDown);
  visibility.observe(stage);
  start();
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
  if (window.__cine === api) delete window.__cine;
  clearTimeout(resizeTimer);
  clearTimeout(coldTimer);
  resizeObserver.disconnect();
  visibility.disconnect();
  riseObserver?.disconnect();
  ui.hero?.removeEventListener('pointermove', onHeroPointer);
  ui.hero?.removeEventListener('pointerdown', onHeroPointer);
  canvas.removeEventListener('pointermove', onPointerMove);
  canvas.removeEventListener('pointerdown', onPointerDown);
  removeEventListener('pointerup', onPointerUp);
  removeEventListener('pointercancel', onPointerCancel);
  removeEventListener('keydown', onKeyDown);

  // every class the demo applied, gone in the same frame as the teardown
  cursor.clearClasses();
  cursor.show(false);

  disposeSceneContents();
  disposeParticles();
  for (const m of [globeMesh, landMesh, landSideMesh, atmosphere, globeShadow, ground]) {
    m?.geometry.dispose();
    m?.removeFromParent();
  }
  atmosphere?.material.dispose();
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
 *  27.  CONFIG CHANGES — hot in place, cold rebuilds one subsystem       *
 *                                                                        *
 *  Tearing the whole scene down on every change is what makes a panel    *
 *  like this unusable. Retiming the beats is the first thing anyone will *
 *  want to do after watching it once, so that case rebuilds the timeline *
 *  and touches nothing else at all.                                      *
 * ====================================================================== */

let coldTimer = null;
const coldNeeds = new Set();

function coldKind(path) {
  if (path === 'theme.lane') return 'materials';
  if (path === 'cinematic.beats' || path === 'motion.loopSeconds' ||
      path === 'cinematic.resumeAtBeat') return 'timeline';
  return 'content';
}

function applyChange(path, value) {
  const field = SCHEMA[path];
  if (!field) { console.warn(`[heroConfig] unknown field ${path}`); return; }
  const validated = field.control === 'destinations'
    ? validateDestinations(value, field, cfg.destinations)
    : field.control === 'beats'
      ? validateBeats(value, field, get(cfg, path))
      : validateField(path, value, field, get(cfg, path));
  set(cfg, path, validated);

  if (field.class === 'hot') return applyHot(path);
  if (field.class === 'boot') return;                 // read once; needs a reload
  coldNeeds.add(coldKind(path));
  clearTimeout(coldTimer);
  coldTimer = setTimeout(applyCold, 300);
}

function applyHot(path) {
  if (path.startsWith('theme.') || path.startsWith('character.palette.')) applyThemeColours();
  else if (path.startsWith('brand.')) applyBrandToDom();
  else if (path.startsWith('cursor.')) cursor.measure();
  else if (path === 'quality.forceTier') console.info('[cinematic] tier override takes effect on reload');
  // motion.*, cta.* and cinematic.cameraDriftDegrees are read straight
  // from cfg every frame, so they need no work at all
}

function applyCold() {
  if (!heroReady) return;
  const lane = coldNeeds.has('materials');
  const content = lane || coldNeeds.has('content');
  coldNeeds.clear();

  if (content) {
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
      globeShadow.material = MAT.shadow;
      ground.material = MAT.ground;
      backdrop.material.map = TEX.bg;
      backdrop.material.needsUpdate = true;
      atmosphere.material.uniforms.uColor.value.set(PAL.atmos);
    }
    // The globe geometry, the camera, the loop clock and — unless the lane
    // changed — the particles all survive, so the preview never flashes.
    buildSceneContents({ particles: lane });
  }

  // Retiming rebuilds the timeline only, leaving the scene alone.
  timeline = buildTimeline();
  if (!cfg.cinematic.enabled && hand.mode !== 'interactive') hand.toInteractive();
  if (cfg.cinematic.enabled && hand.mode === 'interactive' && !sceneState.lastInput) hand.toCinematic();
  applySize();
}

/* The dev panel sidecar (cine-panel.js) is not part of this port, so the
 * dynamic import that fetched it is gone with it. */

/* ---- the public surface ---------------------------------------------- */

const api = {
  get config() { return structuredClone(cfg); },
  get tier() { return tier; },
  get beats() { return timeline ? structuredClone(timeline.beats) : null; },
  get state() {
    return { mode: hand.mode, beat: sceneState.beat, t: +sceneState.t.toFixed(3),
             cineMix: +hand.cineMix.toFixed(3), blend: +hand.blend.toFixed(3),
             scrubbing: sceneState.scrub !== null };
  },
  get stats() {
    const info = renderer.info;
    return {
      tier, calls: info.render.calls, triangles: info.render.triangles,
      geometries: info.memory.geometries, textures: info.memory.textures,
      landTriangles,
      characterParts: character ? character.parts : 0,
      budget: TUNING.budget,
      contrast: +(relLuma(PAL.ocean) - relLuma(PAL.land)).toFixed(4),
      contrastFloor: TUNING.scene.minLandOceanLuma,
      running: sceneState.running, warnings: warnings.slice()
    };
  },

  /** The panel's hand on the timeline. Pass a time to hold it there, or
   *  null to let it run again. */
  scrub(t) {
    sceneState.scrub = t === null || t === undefined ? null : THREE.MathUtils.clamp(t, 0, cfg.motion.loopSeconds);
    if (sceneState.scrub !== null) {
      hand.mode = 'cinematic'; hand.paused = false; hand.accel = null;
      hand.cineMix = hand.cineMixTarget = 1;
      hand.blend = hand.blendTarget = 1;
      cursor.release();
    }
    return sceneState.scrub;
  },
  jumpToBeat(key) {
    if (!timeline || !timeline.beats[key]) return null;
    const t = timeline.beats[key].start + 0.001;
    sceneState.t = t;
    sceneState.elapsed = t;
    if (sceneState.scrub !== null) sceneState.scrub = t;
    hand.mode = 'cinematic'; hand.paused = false; hand.accel = null;
    hand.cineMixTarget = 1; hand.blendTarget = 1;
    cursor.release();
    return t;
  },

  applyChange, destroy, start, stop,
  captureStep, runSelfTest, runLoopTest, runTimelineTest, runSafeZoneTest, runEventTest,

  /* A handle on the scene graph, for the panel's readout and for measuring
   * the composition from the console rather than squinting at it. Dev only:
   * on a production page this key is simply absent. */
  ...(IS_DEV ? {
    __dev: {
      THREE, scene, camera, cineRoot, hologramGroup, globeSpin, L, SHOT, TUNING, RIG, POSES,
      get character() { return character; },
      get laptop() { return laptop; },
      get timeline() { return timeline; },
      /** The world box of a named subtree, and where it lands on screen. */
      measure(name) {
        const node = name === 'character' ? character?.root
                   : name === 'laptop' ? laptop?.group
                   : name === 'plinth' ? laptop?.plinth
                   : name === 'globe' ? hologramGroup
                   : scene.getObjectByName(name);
        if (!node) return null;
        const b = new THREE.Box3();
        node.updateWorldMatrix(true, true);
        node.traverseVisible(o => { if (o.isMesh || o.isPoints) b.expandByObject(o); });
        const p = new THREE.Vector3();
        const ndc = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
        for (let i = 0; i < 8; i++) {
          p.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
          p.project(camera);
          ndc.x0 = Math.min(ndc.x0, p.x); ndc.x1 = Math.max(ndc.x1, p.x);
          ndc.y0 = Math.min(ndc.y0, p.y); ndc.y1 = Math.max(ndc.y1, p.y);
        }
        const r3 = v => v.toArray().map(n => +n.toFixed(3));
        return { world: { min: r3(b.min), max: r3(b.max) },
                 ndc: Object.fromEntries(Object.entries(ndc).map(([k, v]) => [k, +v.toFixed(3)])) };
      }
    }
  } : {}),

  loadConfigObject(obj) {
    const next = validate(obj);
    const old = cfg; cfg = next;
    applyThemeColours(); applyBrandToDom();
    coldNeeds.add('content');
    if (old.theme.lane !== next.theme.lane) coldNeeds.add('materials');
    applyCold();
  }
};

addEventListener('resize', onWindowResize, { passive: true });
// an abrupt exit still takes every demo class with it
addEventListener('pagehide', onPageHide, { once: true });

/* Nothing starts until the hero is near the viewport and the browser is
 * otherwise idle. The DOM headline is the LCP element, never the canvas. */
const kick = () => mount().catch(err => {
  console.error('[cinematic] scene failed to start:', err);
  setStageMode('video', 'the scene threw during start-up');
});

/* React owns the mount point and the moment, so the idle-callback boot the
 * demo page used is the caller's business now. The failure path is the one
 * that page had: log it and leave the stage on its fallback rather than
 * throwing out of the mount. */
await kick();

return api;

}
