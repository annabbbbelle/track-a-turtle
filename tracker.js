/* 
 * tracker.js - Interactive Leaflet Map & TensorFlow.js AI Prediction Engine
 */

let map = null;
let fullPathPolyline = null;
let traveledPolyline = null;
let actualFuturePolyline = null;
let aiPredictionPolyline = null;
let baselinePolyline = null;
let turtleMarker = null;

let currentTurtle = null;
let currentDayIndex = 0;
let isPlaying = false;
let playInterval = null;

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

document.addEventListener('DOMContentLoaded', () => {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof L === 'undefined' || typeof TURTLE_DATA === 'undefined') return;

  initMap();
  populateTurtleDropdown();

  const initialId = getInitialTurtleId();
  switchTurtle(initialId);

  attachControlListeners();
});

function initMap() {
  map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([25, -75], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  fullPathPolyline = L.polyline([], {
    color: '#00e5ff',
    weight: 2,
    dashArray: '6, 8',
    opacity: 0.4
  }).addTo(map);

  traveledPolyline = L.polyline([], {
    color: '#00f5d4',
    weight: 4,
    opacity: 0.95
  }).addTo(map);

  actualFuturePolyline = L.polyline([], {
    color: '#f4a261',
    weight: 4,
    opacity: 0.9
  }).addTo(map);

  aiPredictionPolyline = L.polyline([], {
    color: '#e0aaff',
    weight: 3,
    dashArray: '6, 6',
    opacity: 0.95
  }).addTo(map);

  baselinePolyline = L.polyline([], {
    color: '#ff6b6b',
    weight: 3,
    dashArray: '4, 4',
    opacity: 0.85
  }).addTo(map);

  const turtleIcon = L.divIcon({
    className: 'custom-turtle-marker',
    html: `<div style="font-size: 32px; line-height: 1; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6)); cursor: pointer;">🐢</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  turtleMarker = L.marker([0, 0], { icon: turtleIcon }).addTo(map);
}

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

function switchTurtle(turtleId) {
  if (!TURTLE_DATA[turtleId]) return;

  currentTurtle = TURTLE_DATA[turtleId];
  currentDayIndex = 0;

  clearPredictionLayers();

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
  if (currentDayIndex > 0) {
    todaysSpeedKmDay = haversineDistance(
      track[currentDayIndex - 1].lat, track[currentDayIndex - 1].lon,
      track[currentDayIndex].lat, track[currentDayIndex].lon
    );
  }

  const statDate = document.getElementById('live-stat-date');
  const statDay = document.getElementById('live-stat-day');
  const statKm = document.getElementById('live-stat-km');
  const statSpeed = document.getElementById('live-stat-speed');

  if (statDate) statDate.innerText = currentPoint.date;
  if (statDay) statDay.innerText = `Day ${currentDayIndex + 1} / ${track.length}`;
  if (statKm) statKm.innerText = `${totalTraveledKm.toFixed(1)} km`;
  if (statSpeed) statSpeed.innerText = `${todaysSpeedKmDay.toFixed(1)} km/day`;
}

async function trainAndPredictAI() {
  const warningBox = document.getElementById('ai-warning-box');
  const resultsContainer = document.getElementById('ai-results-container');
  const progressContainer = document.getElementById('ai-progress-container');
  const progressBar = document.getElementById('ai-progress-bar');
  const statusText = document.getElementById('ai-status-text');
  const trainBtn = document.getElementById('train-predict-btn');

  if (warningBox) warningBox.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'none';

  if (currentDayIndex < 29) {
    if (warningBox) {
      warningBox.style.display = 'block';
      warningBox.innerHTML = `
        <strong>⚠️ Requirement Not Met:</strong> Need at least 30 days of history to train the neural network. 
        (Current position: Day ${currentDayIndex + 1}). Move the slider forward to Day 30+.
      `;
    }
    return;
  }

  const remainingDays = currentTurtle.track.length - 1 - currentDayIndex;
  if (remainingDays < 10) {
    if (warningBox) {
      warningBox.style.display = 'block';
      warningBox.innerHTML = `
        <strong>⚠️ Requirement Not Met:</strong> Need at least 10 remaining days to compare predictions against actual ground truth. 
        (Remaining: ${remainingDays} days). Move the slider back.
      `;
    }
    return;
  }

  if (trainBtn) trainBtn.disabled = true;
  if (progressContainer) progressContainer.style.display = 'block';

  const track = currentTurtle.track;
  const deltas = [];
  for (let i = 0; i < currentDayIndex; i++) {
    const dLat = track[i + 1].lat - track[i].lat;
    const dLon = track[i + 1].lon - track[i].lon;
    deltas.push([dLat, dLon]);
  }

  const windowSize = 5;
  const xsRaw = [];
  const ysRaw = [];

  for (let i = 0; i <= deltas.length - windowSize - 1; i++) {
    xsRaw.push(deltas.slice(i, i + windowSize));
    ysRaw.push(deltas[i + windowSize]);
  }

  const xs = tf.tensor3d(xsRaw);
  const ys = tf.tensor2d(ysRaw);

  const model = tf.sequential();
  model.add(tf.layers.flatten({ inputShape: [windowSize, 2] }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 2 }));

  model.compile({
    optimizer: tf.train.adam(0.02),
    loss: 'meanSquaredError'
  });

  const epochs = 40;
  await model.fit(xs, ys, {
    epochs: epochs,
    batchSize: 8,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const pct = Math.round(((epoch + 1) / epochs) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (statusText) statusText.innerText = `Training Neural Network: Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(6)}`;
        await tf.nextFrame();
      }
    }
  });

  let currentWindow = deltas.slice(deltas.length - windowSize);
  const aiPredictedPoints = [];
  let aiLat = track[currentDayIndex].lat;
  let aiLon = track[currentDayIndex].lon;

  for (let step = 0; step < 10; step++) {
    const inputTensor = tf.tensor3d([currentWindow]);
    const predTensor = model.predict(inputTensor);
    const predData = await predTensor.data();

    inputTensor.dispose();
    predTensor.dispose();

    const predDLat = predData[0];
    const predDLon = predData[1];

    aiLat += predDLat;
    aiLon += predDLon;

    aiPredictedPoints.push({ lat: aiLat, lon: aiLon });

    currentWindow = currentWindow.slice(1);
    currentWindow.push([predDLat, predDLon]);
  }

  xs.dispose();
  ys.dispose();
  model.dispose();

  const lastKnownDelta = deltas[deltas.length - 1];
  const baselinePoints = [];
  let baseLat = track[currentDayIndex].lat;
  let baseLon = track[currentDayIndex].lon;

  for (let step = 0; step < 10; step++) {
    baseLat += lastKnownDelta[0];
    baseLon += lastKnownDelta[1];
    baselinePoints.push({ lat: baseLat, lon: baseLon });
  }

  const actualNextPoints = [];
  for (let step = 1; step <= 10; step++) {
    actualNextPoints.push(track[currentDayIndex + step]);
  }

  let totalAiErr = 0;
  let totalBaseErr = 0;

  for (let i = 0; i < 10; i++) {
    const act = actualNextPoints[i];
    const ai = aiPredictedPoints[i];
    const base = baselinePoints[i];

    totalAiErr += haversineDistance(act.lat, act.lon, ai.lat, ai.lon);
    totalBaseErr += haversineDistance(act.lat, act.lon, base.lat, base.lon);
  }

  const avgAiErr = totalAiErr / 10;
  const avgBaseErr = totalBaseErr / 10;

  const finalAiErr = haversineDistance(
    actualNextPoints[9].lat, actualNextPoints[9].lon,
    aiPredictedPoints[9].lat, aiPredictedPoints[9].lon
  );
  const finalBaseErr = haversineDistance(
    actualNextPoints[9].lat, actualNextPoints[9].lon,
    baselinePoints[9].lat, baselinePoints[9].lon
  );

  const startPt = [track[currentDayIndex].lat, track[currentDayIndex].lon];

  const actualCoords = [startPt, ...actualNextPoints.map(p => [p.lat, p.lon])];
  const aiCoords = [startPt, ...aiPredictedPoints.map(p => [p.lat, p.lon])];
  const baseCoords = [startPt, ...baselinePoints.map(p => [p.lat, p.lon])];

  actualFuturePolyline.setLatLngs(actualCoords);
  aiPredictionPolyline.setLatLngs(aiCoords);
  baselinePolyline.setLatLngs(baseCoords);

  const predictionBounds = L.latLngBounds([...actualCoords, ...aiCoords, ...baseCoords]);
  map.fitBounds(predictionBounds, { padding: [50, 50] });

  renderComparisonResults(avgAiErr, avgBaseErr, finalAiErr, finalBaseErr);

  if (trainBtn) trainBtn.disabled = false;
  if (statusText) statusText.innerText = "Training Complete!";
}

function renderComparisonResults(avgAiErr, avgBaseErr, finalAiErr, finalBaseErr) {
  const resultsContainer = document.getElementById('ai-results-container');
  const tableBody = document.getElementById('ai-results-tbody');
  const winnerBanner = document.getElementById('ai-winner-banner');

  if (!resultsContainer || !tableBody || !winnerBanner) return;

  const aiWon = avgAiErr < avgBaseErr;

  tableBody.innerHTML = `
    <tr>
      <td><strong>Average 10-Day Error (km)</strong></td>
      <td style="color: ${aiWon ? 'var(--sea-green)' : 'var(--text-main)'}; font-weight: 700;">
        ${avgAiErr.toFixed(2)} km
      </td>
      <td style="color: ${!aiWon ? 'var(--sea-green)' : 'var(--text-main)'}; font-weight: 700;">
        ${avgBaseErr.toFixed(2)} km
      </td>
    </tr>
    <tr>
      <td><strong>Final Day 10 Error (km)</strong></td>
      <td>${finalAiErr.toFixed(2)} km</td>
      <td>${finalBaseErr.toFixed(2)} km</td>
    </tr>
  `;

  if (aiWon) {
    winnerBanner.className = "winner-banner winner-ai";
    winnerBanner.innerHTML = `
      🤖 <strong>AI Neural Network Won!</strong> 
      Outperformed the baseline by <strong>${(avgBaseErr - avgAiErr).toFixed(2)} km</strong> lower average error across the 10-day forecast.
    `;
  } else {
    winnerBanner.className = "winner-banner winner-baseline";
    winnerBanner.innerHTML = `
      📏 <strong>Constant Velocity Baseline Won!</strong> 
      Outperformed the AI model by <strong>${(avgAiErr - avgBaseErr).toFixed(2)} km</strong> lower average error due to consistent trajectory momentum.
    `;
  }

  resultsContainer.style.display = 'block';
}

function renderSidePanel() {
  const sidePanel = document.getElementById('tracker-side-panel');
  if (!sidePanel || !currentTurtle) return;

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
