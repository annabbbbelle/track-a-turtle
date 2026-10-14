/* 
 * tracker.js - Interactive Leaflet Map & TensorFlow.js AI Prediction Engine
 * 
 * Educational Notes for AI Class Presentation:
 * 1. TensorFlow.js Browser Training: Trains a 3-layer neural network directly in the browser 
 *    using client-side GPU/CPU acceleration (zero external APIs).
 * 2. Vector Delta Processing: Transforms raw GPS coordinates into relative movement vectors 
 *    (dLat, dLon) to teach the network speed and directional momentum.
 * 3. Autoregressive Forecasting: Iteratively feeds each predicted step back into a 5-day sliding window 
 *    to project 10 steps into the future.
 * 4. Baseline Benchmarking: Compares AI forecasts against a constant-velocity persistence baseline.
 */

// Global Map & Layer Variables
let map = null;
let fullPathPolyline = null;
let traveledPolyline = null;
let actualFuturePolyline = null;
let aiPredictionPolyline = null;
let baselinePolyline = null;
let turtleMarker = null;

// Global State Variables
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

  return Object.keys(TURTLE_DATA)[0] || 'explorer';
}

/**
 * Initialize Tracker Dashboard on DOM Ready
 */
document.addEventListener('DOMContentLoaded', () => {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof L === 'undefined' || typeof TURTLE_DATA === 'undefined') return;

  initMap();
  populateTurtleDropdown();

  const initialId = getInitialTurtleId();
  switchTurtle(initialId);

  attachControlListeners();
});

/**
 * Initialize Leaflet Map Instance with OpenStreetMap Tiles & Prediction Layers
 */
function initMap() {
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([25, -75], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Layer 1: Faint dashed line representing full 150-day trajectory
  fullPathPolyline = L.polyline([], {
    color: '#00e5ff',
    weight: 2,
    dashArray: '6, 8',
    opacity: 0.4
  }).addTo(map);

  // Layer 2: Solid vibrant line representing path traveled so far
  traveledPolyline = L.polyline([], {
    color: '#00f5d4', // Sea Green
    weight: 4,
    opacity: 0.95
  }).addTo(map);

  // Layer 3: Actual Path for Next 10 Days
  actualFuturePolyline = L.polyline([], {
    color: '#f4a261', // Sand Gold
    weight: 4,
    opacity: 0.9
  }).addTo(map);

  // Layer 4: AI Predicted Path (TensorFlow.js)
  aiPredictionPolyline = L.polyline([], {
    color: '#e0aaff', // Bright Purple
    weight: 3,
    dashArray: '6, 6',
    opacity: 0.95
  }).addTo(map);

  // Layer 5: Baseline Path (Constant Velocity)
  baselinePolyline = L.polyline([], {
    color: '#ff6b6b', // Coral Red
    weight: 3,
    dashArray: '4, 4',
    opacity: 0.85
  }).addTo(map);

  // Layer 6: Custom 🐢 DivIcon Marker
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
  currentDayIndex = 0;

  // Clear previous predictions
  clearPredictionLayers();

  // Update browser URL query parameter
  const newUrl = `${window.location.pathname}?turtle=${turtleId}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  const selectEl = document.getElementById('turtle-select');
  if (selectEl) selectEl.value = turtleId;

  const fullTrackCoords = currentTurtle.track.map(p => [p.lat, p.lon]);
  fullPathPolyline.setLatLngs(fullTrackCoords);

  if (fullTrackCoords.length > 0) {
    map.fitBounds(fullPathPolyline.getBounds(), { padding: [45, 45] });
  }

  const slider = document.getElementById('day-slider');
  if (slider) {
    slider.min = 0;
    slider.max = currentTurtle.track.length - 1;
    slider.value = 0;
  }

  renderSidePanel();
  updatePlaybackDisplay();
}

/**
 * Clear AI and Baseline Map Layers and UI Boxes
 */
function clearPredictionLayers() {
  if (actualFuturePolyline) actualFuturePolyline.setLatLngs([]);
  if (aiPredictionPolyline) aiPredictionPolyline.setLatLngs([]);
  if (baselinePolyline) baselinePolyline.setLatLngs([]);

  const warningBox = document.getElementById('ai-warning-box');
  const resultsContainer = document.getElementById('ai-results-container');
  const progressContainer = document.getElementById('ai-progress-container');

  if (warningBox) warningBox.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'none';
  if (progressContainer) progressContainer.style.display = 'none';
}

/**
 * Attach Control Event Listeners
 */
function attachControlListeners() {
  const playBtn = document.getElementById('play-pause-btn');
  const slider = document.getElementById('day-slider');
  const trainBtn = document.getElementById('train-predict-btn');

  if (playBtn) playBtn.addEventListener('click', togglePlay);

  if (slider) {
    slider.addEventListener('input', (e) => {
      currentDayIndex = parseInt(e.target.value, 10);
      clearPredictionLayers();
      updatePlaybackDisplay();
    });
  }

  if (trainBtn) {
    trainBtn.addEventListener('click', trainAndPredictAI);
  }
}

/**
 * Play/Pause Journey Animation
 */
function togglePlay() {
  isPlaying = !isPlaying;
  const playBtn = document.getElementById('play-pause-btn');

  if (isPlaying) {
    if (playBtn) playBtn.innerHTML = '⏸ Pause';
    playInterval = setInterval(() => {
      if (currentDayIndex < currentTurtle.track.length - 1) {
        currentDayIndex++;
      } else {
        currentDayIndex = 0;
      }
      clearPredictionLayers();
      updatePlaybackDisplay();
    }, 180);
  } else {
    if (playBtn) playBtn.innerHTML = '▶ Play Journey';
    if (playInterval) clearInterval(playInterval);
  }
}

/**
 * Update Map Markers, Traveled Path Line & Counters
 */
function updatePlaybackDisplay() {
  if (!currentTurtle || !currentTurtle.track || currentTurtle.track.length === 0) return;

  const track = currentTurtle.track;
  const currentPoint = track[currentDayIndex];

  const traveledCoords = track.slice(0, currentDayIndex + 1).map(p => [p.lat, p.lon]);
  traveledPolyline.setLatLngs(traveledCoords);

  turtleMarker.setLatLng([currentPoint.lat, currentPoint.lon]);
  turtleMarker.bindPopup(`
    <strong style="color:#040e1a;">${currentTurtle.name}</strong><br>
    Date: ${currentPoint.date}<br>
    Lat: ${currentPoint.lat}°, Lon: ${currentPoint.lon}°
  `);

  const slider = document.getElementById('day-slider');
  if (slider) slider.value = currentDayIndex;

  let totalTraveledKm = 0;
  for (let i = 0; i < currentDayIndex; i++) {
    totalTraveledKm += haversineDistance(
      track[i].lat, track[i].lon,
      track[i + 1].lat, track[i + 1].lon
    );
  }

  let todaysSpeedKmDay = 0;
  if (currentDayIndex >
