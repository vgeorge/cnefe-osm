// Parse MapLibre's location hash (`#zoom/lat/lng[/bearing/pitch]`) into an
// initial camera. Mirrors MapLibre's own hash format so a link written by the
// map's built-in `hash: true` reads back identically.
//
// Returns { center: [lng, lat], zoom } or null when the hash is absent or
// malformed, so callers fall back to the default (Brazil) view.
export function parseMapHash(hash) {
  if (typeof hash !== "string") return null;

  // Strip a single leading "#"; MapLibre stores the bare "zoom/lat/lng".
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  if (!raw) return null;

  const parts = raw.split("/");
  if (parts.length < 3) return null;

  const zoom = Number(parts[0]);
  const lat = Number(parts[1]);
  const lng = Number(parts[2]);

  // Any non-numeric token (e.g. "#foo") makes the whole hash unusable.
  if (!Number.isFinite(zoom) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;
  if (zoom < 0 || zoom > 30) return null;

  // Trailing bearing/pitch segments are tolerated but not needed here.
  return { center: [lng, lat], zoom };
}

// Serialize a camera to MapLibre's hash format (`#zoom/lat/lng`). Zoom is
// rounded to 2 decimals; lat/lng precision scales with zoom the same way
// MapLibre's own Hash does, so a link we write reads back cleanly via
// parseMapHash and looks native.
export function formatMapHash(center, zoom) {
  const z = Math.round(zoom * 100) / 100;
  const precision = Math.max(
    0,
    Math.ceil((z * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10)
  );
  const m = Math.pow(10, precision);
  const lng = Math.round(center.lng * m) / m;
  const lat = Math.round(center.lat * m) / m;
  return `#${z}/${lat}/${lng}`;
}
