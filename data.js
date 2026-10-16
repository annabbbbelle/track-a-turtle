/* 
 * data.js - Ocean-Safe Simulated GPS Telemetry Data Generator
 * 
 * DEMONSTRATION DISCLAIMER:
 * This dataset contains simulated daily GPS telemetry coordinates generated for
 * educational purposes ("Track the Turtle"). Coordinates follow open ocean corridors.
 */

function generateExplorerTrack() {
  // Trans-Atlantic route: Starts in open Atlantic (25.0 N, -75.0 W) -> moves NE into deep sea
  const pts = [];
  let lat = 25.0;
  let lon = -75.0;
  const startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    pts.push({
      date: d.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });
    lat += 0.120 + (Math.sin(i * 0.1) * 0.01);
    lon += 0.250 + (Math.cos(i * 0.1) * 0.01);
  }
  return pts;
}

function generateHomebodyTrack() {
  // Coastal reef range: Localized in Bimini / Florida Straits open water (24.5 N, -79.5 W)
  const pts = [];
  const lat0 = 24.5000;
  const lon0 = -79.5000;
  let lat = lat0;
  let lon = lon0;
  const startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    pts.push({
      date: d.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });
    const dLat = (Math.sin(i * 0.7) * 0.010) + (lat0 - lat) * 0.15;
    const dLon = (Math.cos(i * 0.5) * 0.010) + (lon0 - lon) * 0.15;
    lat += dLat;
    lon += dLon;
  }
  return pts;
}

function generateWandererTrack() {
  // Sargasso Sea open water zigzagging (25.0 N, -70.0 W)
  const pts = [];
  let lat = 25.0;
  let lon = -70.0;
  let heading = 45;
  const startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    pts.push({
      date: d.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });
    const turn = (i % 2 === 0) ? 85 : -85;
    heading = (heading + turn + (Math.sin(i) * 10)) % 360;
    const rad = heading * (Math.PI / 180);
    const stepSize = 0.15;
    lat += stepSize * Math.cos(rad);
    lon += stepSize * Math.sin(rad);
  }
  return pts;
}

function generateCommuterTrack() {
  // Gulf Stream Highway: Heading
