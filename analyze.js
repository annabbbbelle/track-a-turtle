/* 
 * analyze.js - Telemetry Analysis Engine & AI Personality Classifier
 */

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  return (brg + 360) % 360;
}

function calculateTurningAngle(lat1, lon1, lat2, lon2, lat3, lon3) {
  const b1 = calculateBearing(lat1, lon1, lat2, lon2);
  const b2 = calculateBearing(lat2, lon2, lat3, lon3);

  let diff = Math.abs(b2 - b1);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

function analyzeTurtleTrack(track) {
  if (!track || track.length < 2) return null;

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

  const p0 = track[0];
  let maxDistanceFromStart = 0;

  for (let i = 0; i < track.length; i++) {
    const distFromStart = haversineDistance(p0.lat, p0.lon, track[i].lat, track[i].lon);
    if (distFromStart > maxDistanceFromStart) {
      maxDistanceFromStart = distFromStart;
    }
  }

  const totalDays = track.length - 1;
  const avgDailySpeedKmDay = totalDistance / totalDays;

  let speedConsistencyPct = 0;
  if (avgDailySpeedKmDay > 0) {
    const variance = dailyDistances.reduce((sum, d) => sum + Math.pow(d - avgDailySpeedKmDay, 2), 0) / dailyDistances.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgDailySpeedKmDay) * 100;
    speedConsistencyPct = Math.max(0, 100 - cv);
  }

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

  const displacementRatio = totalDistance > 0 ? (maxDistanceFromStart / totalDistance) : 0;

  return {
    totalDistanceKm: Number(totalDistance.toFixed(1)),
    maxDistanceFromStartKm: Number(maxDistanceFromStart.toFixed(1)),
    avgDailySpeedKmDay: Number(avgDailySpeedKmDay.toFixed(1)),
    speedConsistencyPct: Number(speedConsistencyPct.toFixed(1)),
    avgTurningAngleDeg: Number(avgTurningAngleDeg.toFixed(1)),
    displacementRatio: Number(displacementRatio.toFixed(2))
  };
}

function classifyPersonality(stats) {
  if (!stats) return { archetype: "Unknown", tagline: "N/A", description: "Insufficient data.", id: "unknown" };

  const {
    totalDistanceKm,
    maxDistanceFromStartKm,
    avgDailySpeedKmDay,
    speedConsistencyPct,
    avgTurningAngleDeg,
    displacementRatio
  } = stats;

  if (maxDistanceFromStartKm < 100 || totalDistanceKm < 500) {
    return {
      id: "homebody",
      archetype: "The Homebody",
      tagline: "Local Reef Resident",
      description: "Stays within a tight coastal territory, preferring familiar feeding grounds over long migrations.",
      icon: "🏡",
      colorClass: "badge-homebody"
    };
  }

  if (avgTurningAngleDeg > 45 && displacementRatio < 0.40) {
    return {
      id: "wanderer",
      archetype: "The Wanderer",
      tagline: "Curious Explorer",
      description: "Meanders in complex zigzag patterns, making sharp, frequent turns to thoroughly search localized marine patches.",
      icon: "🌀",
      colorClass: "badge-wanderer"
    };
  }

  if (speedConsistencyPct >= 90 && avgTurningAngleDeg < 15 && displacementRatio >= 0.80) {
    return {
      id: "commuter",
      archetype: "The Commuter",
      tagline: "Determined Navigator",
      description: "Maintains a strikingly constant speed along a direct highway corridor with virtually no lateral deviation.",
      icon: "⚡",
      colorClass: "badge-commuter"
    };
  }

  if (totalDistanceKm >= 4000 || avgDailySpeedKmDay > 28) {
    return {
      id: "explorer",
      archetype: "The Explorer",
      tagline: "Trans-Oceanic Adventurer",
      description: "Crosses vast ocean basins at high speed, conquering thousands of kilometers in search of pelagic habitats.",
      icon: "🌍",
      colorClass: "badge-explorer"
    };
  }

  return {
    id: "explorer",
    archetype: "The Ocean Nomad",
    tagline: "Balanced Voyager",
    description: "Exhibits a flexible movement strategy, adapting journey pacing to ocean currents.",
    icon: "🌊",
    colorClass: "badge-explorer"
  };
}
