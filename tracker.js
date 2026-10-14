/* 
 * tracker.js - Interactive Leaflet Map & Telemetry Playback Engine
 * 
 * Educational Notes for AI Class Presentation:
 * 1. Leaflet GIS Mapping: Initializes satellite ocean tile rendering and manages dynamic vector polyline layers.
 * 2. Route Parsing: Reads ?turtle=ID from the URL query string with fallback to localStorage or default dataset.
 * 3. Playback Synchronization: Runs a tick loop that steps through daily GPS points (0-149), dynamically re-calculating
 *    distance covered and instant daily speed while updating map layers.
 */

// Global State Variables
let map = null;
let fullPathPolyline = null;
let traveledPolyline = null;
let turtleMarker = null;

let currentTurtle = null;
let currentDayIndex = 0;
let isPlaying = false;
let playInterval = null;

/**
 * Determine initial turtle ID from URL -> localStorage -> default ('explorer')
 */
function getInitialTurtleId() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlTurtle = urlParams.get('turtle');
  
  if (urlTurtle && TURTLE_DATA[urlTurtle]) {
    return urlTurtle;
  }

  // Fallback to saved quiz result in localStorage
  try {
    const savedResult = localStorage.getItem('trackTheTurtle_userResult');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      if (parsed.turtleId && TURTLE_DATA[parsed.turtleId]) {
        return parsed.turtleId;
      }
    }
  } catch (e) {
    console.warn("Could not read quiz result from localStorage:", e);
  }

  // Fallback to first available turtle
  return Object.keys(TURTLE_DATA)[0] || 'explorer';
}

/**
 * Initialize Tracker Dashboard on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof L === 'undefined' || typeof TURTLE_DATA === 'undefined') return;

  // 1. Initialize Leaflet Map
  initMap();

  // 2. Populate Dropdown Select Options
  populateTurtleDropdown();

  // 3. Load Initial Turtle Data
  const initialId = getInitialTurtleId();
  switchTurtle(initialId);

  // 4. Attach Control Listeners
  attachControlListeners();
});

/**
 * Initialize Leaflet Map Instance with OpenStreetMap Tiles
 */
function initMap() {
  // Center roughly on Atlantic ocean zone
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([25, -75], 5);

  // Tile Layer from OpenStreetMap CDN
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Layer 1: Faint dashed line representing full 150-day trajectory
  fullPathPolyline = L.polyline([], {
    color: '#00e5ff',
    weight: 2,
    dashArray: '6, 8',
    opacity: 0.45
  }).addTo(map);

  // Layer 2: Solid vibrant line representing path traveled so far
  traveledPolyline = L.polyline([], {
    color: '#00f5d4',
    weight: 4,
    opacity: 0.95
  }).addTo(map);

  // Layer 3: Custom 🐢 DivIcon Marker for current position
  const turtleIcon = L.divIcon({
    className: 'custom-turtle-marker',
    html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); cursor: pointer;">🐢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  turtleMarker = L.marker([0, 0], { icon: turtleIcon }).addTo(map);
}

/**
 * Populate Turtle Selection Dropdown
 */
function populateTurtleDropdown() {
  const selectEl = document.getElementById('turtle-select');
  if (!selectEl) return;

  selectEl.innerHTML = '';
  Object.keys(TURTLE_DATA).forEach(key => {
    const turtle = TURTLE_DATA[key];
    const option = document.createElement('option');
    option.value = turtle.id;
    option.textContent = `${turtle.name} (${turtle.species.split('(')[0].trim()})`;
    selectEl.appendChild(option);
  });

  selectEl.addEventListener('change', (e) => {
    switchTurtle(e.target.value);
  });
}

/**
 * Switch Active Turtle Dataset
 */
function switchTurtle(turtleId) {
  if (!TURTLE_DATA[turtleId]) return;

  currentTurtle = TURTLE_DATA[turtleId];
  currentDayIndex = 0; // Reset to Day 1

  // Update browser URL query parameter without page reload
  const newUrl = `${window.location.pathname}?turtle=${turtleId}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  // Synchronize Dropdown Value
  const selectEl = document.getElementById('turtle-select');
  if (selectEl) selectEl.value = turtleId;

  // Set Full Path Coordinates & Zoom Map to Fit Path
  const fullTrackCoords = currentTurtle.track.map(p => [p.lat, p.lon]);
  fullPathPolyline.setLatLngs(fullTrackCoords);

  if (fullTrackCoords.length > 0) {
    map.fitBounds(fullPathPolyline.getBounds(), { padding: [45, 45] });
  }

  // Update Slider Attributes
  const slider = document.getElementById('day-slider');
  if (slider) {
    slider.min = 0;
    slider.max = currentTurtle.track.length - 1;
    slider.value = 0;
  }

  // Render Side Panel Information
  renderSidePanel();

  // Update Display to Initial Day
  updatePlaybackDisplay();
}

/**
 * Attach Play/Pause and Slider Event Controls
 */
function attachControlListeners() {
  const playBtn = document.getElementById('play-pause-btn');
  const slider = document.getElementById('day-slider');

  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      currentDayIndex = parseInt(e.target.value, 10);
      updatePlaybackDisplay();
    });
  }
}

/**
 * Play/Pause Animation Loop Toggle
 */
function togglePlay() {
  isPlaying = !isPlaying;
  const playBtn = document.getElementById('play-pause-btn');

  if (isPlaying) {
    if (playBtn) playBtn.innerHTML = '⏸ Pause';
    
    // Tick every 180ms
    playInterval = setInterval(() => {
      if (currentDayIndex < currentTurtle.track.length - 1) {
        currentDayIndex++;
      } else {
        currentDayIndex = 0; // Loop around upon completion
      }
      updatePlaybackDisplay();
    }, 180);
  } else {
    if (playBtn) playBtn.innerHTML = '▶ Play Journey';
    if (playInterval) clearInterval(playInterval);
  }
}

/**
 * Update Map Markers, Traveled Line, Slider Value & Live Stat Counters
 */
function updatePlaybackDisplay() {
  if (!currentTurtle || !currentTurtle.track || currentTurtle.track.length === 0) return;

  const track = currentTurtle.track;
  const currentPoint = track[currentDayIndex];

  // 1. Update Traveled Path Line up to current index
  const traveledCoords = track.slice(0, currentDayIndex + 1).map(p => [p.lat, p.lon]);
  traveledPolyline.setLatLngs(traveledCoords);

  // 2. Move 🐢 Marker to current coordinate
  turtleMarker.setLatLng([currentPoint.lat, currentPoint.lon]);
  turtleMarker.bindPopup(`
    <strong style="color:#040e1a;">${currentTurtle.name}</strong><br>
    Date: ${currentPoint.date}<br>
    Lat: ${currentPoint.lat}°, Lon: ${currentPoint.lon}°
  `);

  // 3. Update Day Slider position
  const slider = document.getElementById('day-slider');
  if (slider) slider.value = currentDayIndex;

  // 4. Calculate Live Telemetry Metrics
  let totalTraveledKm = 0;
  for (let i = 0; i < currentDayIndex; i++) {
    totalTraveledKm += haversineDistance(
      track[i].lat, track[i].lon,
      track[i + 1].lat, track[i + 1].lon
    );
  }

  let todaysSpeedKmDay = 0;
  if (currentDayIndex > 0) {
    todaysSpeedKmDay = haversineDistance(
      track[currentDayIndex - 1].lat, track[currentDayIndex - 1].lon,
      track[currentDayIndex].lat, track[currentDayIndex].lon
    );
  }

  // 5. Update Live Counter DOM elements
  const statDate = document.getElementById('live-stat-date');
  const statDay = document.getElementById('live-stat-day');
  const statKm = document.getElementById('live-stat-km');
  const statSpeed = document.getElementById('live-stat-speed');

  if (statDate) statDate.innerText = currentPoint.date;
  if (statDay) statDay.innerText = `Day ${currentDayIndex + 1} / ${track.length}`;
  if (statKm) statKm.innerText = `${totalTraveledKm.toFixed(1)} km`;
  if (statSpeed) statSpeed.innerText = `${todaysSpeedKmDay.toFixed(1)} km/day`;
}

/**
 * Render Turtle Details & Classification Stats into the Side Panel
 */
function renderSidePanel() {
  const sidePanel = document.getElementById('tracker-side-panel');
  if (!sidePanel || !currentTurtle) return;

  // Run analyze.js functions on active turtle
  const stats = analyzeTurtleTrack(currentTurtle.track);
  const personality = classifyPersonality(stats);

  sidePanel.innerHTML = `
    <div class="card" style="padding: 1.5rem;">
      <div class="archetype-badge ${personality.colorClass}">
        <span>${personality.icon}</span>
        <span>${personality.archetype}</span>
      </div>

      <h2 style="color: var(--text-main); font-size: 1.8rem; margin-top: 0.3rem; margin-bottom: 0.2rem;">
        ${currentTurtle.name}
      </h2>
      
      <p style="color: var(--sea-green); font-size: 0.85rem; font-style: italic; margin-bottom: 0.8rem;">
        ${currentTurtle.species}
      </p>

      <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.2rem; line-height: 1.6;">
        ${currentTurtle.description}
      </p>

      <div style="background: var(--bg-deep); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; margin-bottom: 1.2rem;">
        <h4 style="color: var(--primary-cyan); font-size: 0.9rem; margin-bottom: 0.4rem; text-transform: uppercase;">
          Behavioral Profile
        </h4>
        <p style="color: var(--text-main); font-size: 0.9rem; font-weight: 600; margin-bottom: 0.3rem;">
          "${personality.tagline}"
        </p>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          ${personality.description}
        </p>
      </div>

      <h4 style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 0.6rem;">
        Full 150-Day Summary Statistics
      </h4>

      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Path</span>
          <span class="stat-value">${stats.totalDistanceKm.toLocaleString()} km</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Max Radius</span>
          <span class="stat-value">${stats.maxDistanceFromStartKm.toLocaleString()} km</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Pace</span>
          <span class="stat-value">${stats.avgDailySpeedKmDay} km/day</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Consistency</span>
          <span class="stat-value">${stats.speedConsistencyPct}%</span>
        </div>
        <div class="stat-item" style="grid-column: span 2;">
          <span class="stat-label">Avg Turning Angle</span>
          <span class="stat-value">${stats.avgTurningAngleDeg}° / step</span>
        </div>
      </div>

      <div style="margin-top: 1.2rem; text-align: center;">
        <a href="quiz.html" class="btn btn-secondary" style="width: 100%; display: block; font-size: 0.9rem;">
          Take Quiz to Match Your Turtle 🧩
        </a>
      </div>
    </div>
  `;
}
