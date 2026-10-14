/* 
 * data.js - Simulated GPS Telemetry Data for Sea Turtles
 * 
 * DEMONSTRATION DISCLAIMER:
 * This dataset contains simulated daily GPS telemetry coordinates generated for
 * educational and demonstration purposes for an AI class project ("Track the Turtle").
 * All positions are synthetic representations based on typical marine turtle movement patterns.
 */

const TURTLE_DATA = {
  explorer: {
    id: "explorer",
    name: "Oceanus",
    species: "Leatherback Turtle (Dermochelys coriacea)",
    description: "Travels thousands of kilometers across the open North Atlantic, chasing deep-water jelly swarms.",
    track: generateExplorerTrack()
  },
  homebody: {
    id: "homebody",
    name: "Barnacle Bob",
    species: "Loggerhead Turtle (Caretta caretta)",
    description: "Resides near coastal reefs in South Florida, foraging in a small, localized territory.",
    track: generateHomebodyTrack()
  },
  wanderer: {
    id: "wanderer",
    name: "Ziggy",
    species: "Hawksbill Turtle (Eretmochelys imbricata)",
    description: "Zigzags across the Bahamas and Sargasso Sea, frequently pivoting direction near coral ledges.",
    track: generateWandererTrack()
  },
  commuter: {
    id: "commuter",
    name: "Marathon Mary",
    species: "Green Sea Turtle (Chelonia mydas)",
    description: "Navigates along a straight migration corridor at a steady, uninterrupted pace.",
    track: generateCommuterTrack()
  }
};

// --- Helper Track Generators for 150 Daily GPS Fixes ---

function generateExplorerTrack() {
  // Trans-Atlantic route: Starts at FL (25.0, -80.0) -> moves NE far into North Atlantic
  const pts = [];
  let lat = 25.0;
  let lon = -80.0;
  let startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    let currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    pts.push({
      date: currentDate.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });

    // Fast, long-distance North-East trajectory
    lat += 0.115 + (Math.sin(i * 0.1) * 0.01);
    lon += 0.320 + (Math.cos(i * 0.1) * 0.01);
  }
  return pts;
}

function generateHomebodyTrack() {
  // Coastal localized range: Small fluctuations around biscayne reef area (24.8, -80.5)
  const pts = [];
  const lat0 = 24.8000;
  const lon0 = -80.5000;
  let lat = lat0;
  let lon = lon0;
  let startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    let currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    pts.push({
      date: currentDate.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });

    // Small random step with a strong restoring pull toward center home (lat0, lon0)
    let dLat = (Math.sin(i * 0.7) * 0.012) + (lat0 - lat) * 0.15;
    let dLon = (Math.cos(i * 0.5) * 0.012) + (lon0 - lon) * 0.15;
    lat += dLat;
    lon += dLon;
  }
  return pts;
}

function generateWandererTrack() {
  // Zigzag route: Frequent sharp angle changes (70-110 deg) around Sargasso Sea
  const pts = [];
  let lat = 26.0;
  let lon = -75.0;
  let heading = 45; // Initial heading in degrees
  let startDate = new Date('2026-01-01');

  for (let i = 0; i < 150; i++) {
    let currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    pts.push({
      date: currentDate.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });

    // Sharp turn every step (alternating zigzags)
    let turn = (i % 2 === 0) ? 85 : -85;
    heading = (heading + turn + (Math.sin(i) * 10)) % 360;
    
    let rad = heading * (Math.PI / 180);
    let stepSize = 0.18; // ~20 km/day
    lat += stepSize * Math.cos(rad);
    lon += stepSize * Math.sin(rad);
  }
  return pts;
}

function generateCommuterTrack() {
  // Straight migration highway along coastal current: Extremely steady speed and direction
  const pts = [];
  let lat = 25.0;
  let lon = -80.0;
  let startDate = new Date('2026-01-01');
  const angleRad = 20 * (Math.PI / 180); // 20 degrees East of North
  const stepSize = 0.215; // ~23.8 km/day constant

  for (let i = 0; i < 150; i++) {
    let currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    pts.push({
      date: currentDate.toISOString().split('T')[0],
      lat: Number(lat.toFixed(4)),
      lon: Number(lon.toFixed(4))
    });

    // Linear motion with tiny perturbation
    lat += stepSize * Math.cos(angleRad) + (Math.sin(i * 0.2) * 0.0005);
    lon += stepSize * Math.sin(angleRad) + (Math.cos(i * 0.2) * 0.0005);
  }
  return pts;
}
