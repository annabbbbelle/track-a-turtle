/* 
 * analyze.js - Telemetry Analysis Engine & AI Personality Classifier
 * 
 * Classroom Explanation Guide:
 * 1. Geometric Calculations: Computes great-circle distances (Haversine formula) and course bearings.
 * 2. Kinematic Metrics: Derives average daily speed, speed consistency (Standard Deviation / Coeff of Variation),
 *    maximum displacement from home, and average directional turning angles.
 * 3. AI Classifier: Maps calculated physical trajectory metrics into dynamic personality archetypes.
 */

/**
 * STEP 1: HAVERSINE DISTANCE FORMULA
 * Calculates the shortest distance between two points on a sphere (Earth) in kilometers.
 * 
 * Formula:
 *   a = sin²(Δφ/2) + cos(φ1) · cos(φ2) · sin²(Δλ/2)
 *   c = 2 · atan2( √a, √(1−a) )
 *   d = R · c   (where R = Earth's mean radius = 6371 km)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
}

/**
 * STEP 2: INITIAL BEARING (HEADING)
 * Computes the compass direction (0° to 360°) from point 1 to point 2.
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  const brg = Math.atan2(y, x) * toDeg;
  return (brg + 360) % 360; // Normalize to [0, 360) degrees
}

/**
 * STEP 3: TURNING ANGLE
 * Calculates the change in direction (in degrees) when transitioning between 
 * vector (P1 -> P2) and vector (P2 -> P3).
 */
function calculateTurningAngle(lat1, lon1, lat2, lon2, lat3, lon3) {
  const b1 = calculateBearing(lat1, lon1, lat2, lon2);
  const b2 = calculateBearing(lat2, lon2, lat3, lon3);

  let diff = Math.abs(b2 - b1);
  if (diff > 180) {
    diff = 360 - diff; // Take acute angle difference
  }
  return diff;
}

/**
 * STEP 4: FULL TRAJECTORY METRICS COMPUTATION
 * Analyzes a turtle's array of GPS points and calculates summary statistics.
 */
function analyzeTurtleTrack(track) {
  if (!track || track.length < 2) {
    return null;
  }

  // A. Total Distance & Daily Speeds
  const dailyDistances = [];
  let totalDistance = 0;

  for (let i = 0; i < track.length - 1; i++) {
    const dist = haversineDistance(
      track[i].lat, track[i].lon,
      track[i + 1].lat, track[i + 1].lon
    );
    dailyDistances.push(dist);
    totalDistance += dist;
  }

  // B. Maximum Displacement from Starting Point (P0)
  const p0 = track[0];
  let maxDistanceFromStart = 0;

  for (let i = 0; i < track.length; i++) {
    const distFromStart = haversineDistance(p0.lat, p0.lon, track[i].lat, track[i].lon);
    if (distFromStart > maxDistanceFromStart) {
      maxDistanceFromStart = distFromStart;
    }
  }

  // C. Average Daily Speed (km/day and km/h)
  const totalDays = track.length - 1;
  const avgDailySpeedKmDay = totalDistance / totalDays;
  const avgSpeedKmH = avgDailySpeedKmDay / 24;

  // D. Speed Consistency (Statistical variance analysis)
  // We measure Coefficient of Variation (CV = Standard Deviation / Mean * 100%).
  // Consistency Rating = max(0, 100 - CV). Higher score = more uniform pace.
  let speedConsistencyPct = 0;
  if (avgDailySpeedKmDay > 0) {
    const variance = dailyDistances.reduce((sum, d) => sum + Math.pow(d - avgDailySpeedKmDay, 2), 0) / dailyDistances.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgDailySpeedKmDay) * 100;
    speedConsistencyPct = Math.max(0, 100 - cv);
  }

  // E. Average Turning Angle (Degree of zigzagging)
  const turningAngles = [];
  for (let i = 0; i < track.length - 2; i++) {
    const angle = calculateTurningAngle(
      track[i].lat, track[i].lon,
      track[i + 1].lat, track[i + 1].lon,
      track[i + 2].lat, track[i + 2].lon
    );
    turningAngles.push(angle);
  }

  const avgTurningAngleDeg = turningAngles.length > 0
    ? turningAngles.reduce((sum, a) => sum + a, 0) / turningAngles.length
    : 0;

  // Calculate Displacement Ratio (Max Displacement vs Total Distance Traveled)
  const displacementRatio = totalDistance > 0 ? (maxDistanceFromStart / totalDistance) : 0;

  return {
    totalDistanceKm: Number(totalDistance.toFixed(1)),
    maxDistanceFromStartKm: Number(maxDistanceFromStart.toFixed(1)),
    avgDailySpeedKmDay: Number(avgDailySpeedKmDay.toFixed(1)),
    avgSpeedKmH: Number(avgSpeedKmH.toFixed(2)),
    speedConsistencyPct: Number(speedConsistencyPct.toFixed(1)),
    avgTurningAngleDeg: Number(avgTurningAngleDeg.toFixed(1)),
    displacementRatio: Number(displacementRatio.toFixed(2))
  };
}

/**
 * STEP 5: AI PERSONALITY CLASSIFIER
 * Dynamically assigns a personality archetype derived entirely from computed kinematic metrics.
 */
function classifyPersonality(stats) {
  if (!stats) return { archetype: "Unknown", tagline: "N/A", description: "Insufficient data." };

  const {
    totalDistanceKm,
    maxDistanceFromStartKm,
    avgDailySpeedKmDay,
    speedConsistencyPct,
    avgTurningAngleDeg,
    displacementRatio
  } = stats;

  // Rule 1: Homebody -> Low total distance or low maximum displacement (<100 km from origin)
  if (maxDistanceFromStartKm < 100 || totalDistanceKm < 500) {
    return {
      archetype: "The Homebody",
      tagline: "Local Reef Resident",
      description: "Stays within a tight coastal territory, preferring familiar feeding grounds over long migrations.",
      icon: "🏡",
      colorClass: "badge-homebody"
    };
  }

  // Rule 2: Wanderer -> Frequent sharp turns (>45° avg turning angle) and low displacement ratio relative to total distance
  if (avgTurningAngleDeg > 45 && displacementRatio < 0.40) {
    return {
      archetype: "The Wanderer",
      tagline: "Curious Explorer",
      description: "Meanders in complex zigzag patterns, making sharp, frequent turns to thoroughly search localized marine patches.",
      icon: "🌀",
      colorClass: "badge-wanderer"
    };
  }

  // Rule 3: Commuter -> Extremely steady pace (>90% speed consistency), straight path (<15° turning angle), high displacement ratio (>0.80)
  if (speedConsistencyPct >= 90 && avgTurningAngleDeg < 15 && displacementRatio >= 0.80) {
    return {
      archetype: "The Commuter",
      tagline: "Determined Navigator",
      description: "Maintains a strikingly constant speed along a direct highway corridor with virtually no lateral deviation.",
      icon: "⚡",
      colorClass: "badge-commuter"
    };
  }

  // Rule 4: Explorer -> High total distance (>4,000 km) and high daily cruising speed (>28 km/day)
  if (totalDistanceKm >= 4000 || avgDailySpeedKmDay > 28) {
    return {
      archetype: "The Explorer",
      tagline: "Trans-Oceanic Adventurer",
      description: "Crosses vast ocean basins at high speed, conquering thousands of kilometers in search of pelagic habitats.",
      icon: "🌍",
      colorClass: "badge-explorer"
    };
  }

  // Default Fallback Archetype
  return {
    archetype: "The Ocean Nomad",
    tagline: "Balanced Voyager",
    description: "Exhibits a flexible movement strategy, adapting journey pacing to ocean currents.",
    icon: "🌊",
    colorClass: "badge-nomad"
  };
}
