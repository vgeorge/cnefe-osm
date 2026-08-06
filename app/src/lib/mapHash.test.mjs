import { parseMapHash, formatMapHash } from "./mapHash.js";

// [input hash, expected result]
const cases = [
  // Typical MapLibre hash: zoom/lat/lng.
  ["#16/-23.55/-46.63", { center: [-46.63, -23.55], zoom: 16 }],
  // Without leading "#".
  ["16/-23.55/-46.63", { center: [-46.63, -23.55], zoom: 16 }],
  // Trailing bearing/pitch tolerated; still parses center + zoom.
  ["#13.5/-15.79/-47.88/30/45", { center: [-47.88, -15.79], zoom: 13.5 }],
  // Absent / empty / non-numeric -> null (fall back to default view).
  ["", null],
  ["#", null],
  ["#foo", null],
  ["#16/-23.55", null],
  // Out-of-range tokens -> null.
  ["#16/-91/-46.63", null], // lat < -90
  ["#16/-23.55/181", null], // lng > 180
  ["#31/-23.55/-46.63", null], // zoom > 30
];

let failures = 0;

const eq = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return (
    a.zoom === b.zoom &&
    a.center[0] === b.center[0] &&
    a.center[1] === b.center[1]
  );
};

for (const [input, expected] of cases) {
  const actual = parseMapHash(input);
  const ok = eq(actual, expected);
  if (!ok) failures++;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `${status}: ${JSON.stringify(input)} -> ${JSON.stringify(actual)}` +
      (ok ? "" : ` (expected ${JSON.stringify(expected)})`)
  );
}

// formatMapHash: round-trips back through parseMapHash, and yields the same
// zoom/lat/lng MapLibre would write (precision scales with zoom).
const fmtCases = [
  // [center {lng,lat}, zoom, expected hash]
  [{ lng: -46.6333, lat: -23.5505 }, 16, "#16/-23.5505/-46.6333"],
  [{ lng: -54.39, lat: -15.13 }, 4.34, "#4.34/-15.13/-54.39"],
  [{ lng: 0, lat: 0 }, 0, "#0/0/0"],
];

for (const [center, zoom, expected] of fmtCases) {
  const actual = formatMapHash(center, zoom);
  const ok = actual === expected;
  if (!ok) failures++;
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `${status}: format(${JSON.stringify(center)}, ${zoom}) -> ${JSON.stringify(actual)}` +
      (ok ? "" : ` (expected ${JSON.stringify(expected)})`)
  );
  // Round-trip: parse(format(x)) recovers center + zoom.
  const rt = parseMapHash(actual);
  const rtOk =
    rt && rt.zoom === zoom && rt.center[0] === center.lng && rt.center[1] === center.lat;
  if (!rtOk) failures++;
  console.log(
    `${rtOk ? "PASS" : "FAIL"}: round-trip ${JSON.stringify(actual)} -> ${JSON.stringify(rt)}`
  );
}

if (failures > 0) {
  console.log(`\n${failures} case(s) failed.`);
  process.exit(1);
}

console.log(`\nAll checks passed.`);
