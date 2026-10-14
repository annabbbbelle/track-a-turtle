/* quiz.js - Interactive Quiz State Engine */

var QUIZ_QUESTIONS = [
  {
    question: "What is your ideal weekend getaway style?",
    options: [
      { text: "Embarking on a long-distance road trip to a place you've never been.", type: "explorer", icon: "🗺️" },
      { text: "Relaxing at a cozy local spot with familiar snacks and comfort items.", type: "homebody", icon: "🏡" },
      { text: "Exploring an open flea market, taking spontaneous detours as you go.", type: "wanderer", icon: "🌀" },
      { text: "Following a structured, highly efficient schedule to hit every goal.", type: "commuter", icon: "⚡" }
    ]
  },
  {
    question: "How do you handle a vacation itinerary?",
    options: [
      { text: "Book a ticket across the ocean and figure out the rest along the way.", type: "explorer", icon: "✈️" },
      { text: "Stay within a 2-mile radius of a peaceful beach bungalow.", type: "homebody", icon: "🏖️" },
      { text: "Ditch the map completely and let curiosity guide every turn.", type: "wanderer", icon: "🧭" },
      { text: "Follow a daily schedule to arrive on time at every destination.", type: "commuter", icon: "📅" }
    ]
  },
  {
    question: "If you had an ocean superpower, which would you pick?",
    options: [
      { text: "Trans-Oceanic Speed — crossing global ocean basins effortlessly.", type: "explorer", icon: "🚀" },
      { text: "Sanctuary Shield — creating the ultimate cozy, safe reef domain.", type: "homebody", icon: "🛡️" },
      { text: "Treasure Intuition — detecting hidden coral caves and secret sea life.", type: "wanderer", icon: "💎" },
      { text: "Cruise Control — locking into sea currents with steady efficiency.", type: "commuter", icon: "🌊" }
    ]
  },
  {
    question: "When navigating through a complex maze, you:",
    options: [
      { text: "Push rapidly forward toward the far side, taking huge strides.", type: "explorer", icon: "🏃" },
      { text: "Stay near familiar territory near the entrance where it's safe.", type: "homebody", icon: "🚪" },
      { text: "Explore every side corridor just to see what's around each corner.", type: "wanderer", icon: "🔀" },
      { text: "Calculate the direct mathematical route and walk steadily straight through.", type: "commuter", icon: "📐" }
    ]
  },
  {
    question: "What is your ideal meal style?",
    options: [
      { text: "Trying exotic dishes from thousands of miles across the globe.", type: "explorer", icon: "🍜" },
      { text: "Enjoying your favorite comfort food from the same trusted local kitchen.", type: "homebody", icon: "🍲" },
      { text: "A variety sampler platter where you get a little bit of everything.", type: "wanderer", icon: "🍱" },
      { text: "A balanced, high-energy fuel pack consumed at precise daily intervals.", type: "commuter", icon: "🥗" }
    ]
  },
  {
    question: "How do your friends describe your everyday personality?",
    options: [
      { text: "Bold, ambitious, and constantly seeking distant horizons.", type: "explorer", icon: "🌟" },
      { text: "Loyal, grounded, and the ultimate source of comfort and peace.", type: "homebody", icon: "🤝" },
      { text: "Spontaneous, unpredictable, and always full of fun surprises.", type: "wanderer", icon: "🎨" },
      { text: "Reliable, disciplined, and remarkably consistent under pressure.", type: "commuter", icon: "⏱️" }
    ]
  },
  {
    question: "You arrive in a brand new city for 1 day. What do you do?",
    options: [
      { text: "Cross the entire city to reach the farthest landmark across town.", type: "explorer", icon: "🗼" },
      { text: "Find one peaceful neighborhood coffee shop and hang out all afternoon.", type: "homebody", icon: "☕" },
      { text: "Put your phone away and get delightfully lost in narrow alleyways.", type: "wanderer", icon: "🏙️" },
      { text: "Hop on public transit and follow a pre-planned route.", type: "commuter", icon: "🚇" }
    ]
  },
  {
    question: "What is your personal life motto?",
    options: [
      { text: "\"The world is vast — go as far as your horizon reaches!\"", type: "explorer", icon: "🌌" },
      { text: "\"There is no place like home base.\"", type: "homebody", icon: "❤️" },
      { text: "\"Not all who wander are lost — some are just exploring!\"", type: "wanderer", icon: "✨" },
      { text: "\"Keep steady, maintain focus, and keep moving forward.\"", type: "commuter", icon: "🎯" }
    ]
  }
];

let currentQuestionIndex = 0;
let userAnswers = [];

document.addEventListener('DOMContentLoaded', () => {
  const questionCard = document.getElementById('quiz-question-card');
  if (!questionCard) return;
  renderQuestion();
});

function renderQuestion() {
  const questionCard = document.getElementById('quiz-question-card');
  const progressBar = document.getElementById('quiz-progress-bar');
  const progressText = document.getElementById('quiz-progress-text');
  const questionText = document.getElementById('quiz-question-text');
  const optionsContainer = document.getElementById('quiz-options-container');
  const prevBtn = document.getElementById('quiz-prev-btn');

  if (!questionCard) return;

  const q = QUIZ_QUESTIONS[currentQuestionIndex];
  const total = QUIZ_QUESTIONS.length;

  const progressPercent = Math.round(((currentQuestionIndex + 1) / total) * 100);
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (progressText) progressText.innerText = `Question ${currentQuestionIndex + 1} of ${total}`;

  if (questionText) questionText.innerText = q.question;

  if (optionsContainer) {
    optionsContainer.innerHTML = '';
    
    q.options.forEach((opt) => {
      const isSelected = userAnswers[currentQuestionIndex] === opt.type;
      
      const optionBtn = document.createElement('div');
      optionBtn.className = `quiz-option ${isSelected ? 'selected' : ''}`;
      optionBtn.innerHTML = `
        <span class="option-icon">${opt.icon}</span>
        <div class="option-content">
          <span class="option-text">${opt.text}</span>
        </div>
      `;

      optionBtn.addEventListener('click', () => handleOptionSelect(opt.type));
      optionsContainer.appendChild(optionBtn);
    });
  }

  if (prevBtn) {
    prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-flex' : 'none';
  }
}

function handleOptionSelect(selectedType) {
  userAnswers[currentQuestionIndex] = selectedType;

  if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function navigatePrevious() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function finishQuiz() {
  const questionCard = document.getElementById('quiz-question-card');
  const resultsCard = document.getElementById('quiz-results-card');

  if (questionCard) questionCard.style.display = 'none';
  if (resultsCard) resultsCard.style.display = 'block';

  const scores = { explorer: 0, homebody: 0, wanderer: 0, commuter: 0 };
  userAnswers.forEach(type => {
    if (scores[type] !== undefined) scores[type]++;
  });

  let winningType = 'explorer';
  let maxScore = -1;
  Object.keys(scores).forEach(type => {
    if (scores[type] > maxScore) {
      maxScore = scores[type];
      winningType = type;
    }
  });

  let matchedTurtle = null;
  let matchedStats = null;
  let matchedPersonality = null;

  if (typeof TURTLE_DATA !== 'undefined' && typeof analyzeTurtleTrack === 'function') {
    Object.keys(TURTLE_DATA).forEach(key => {
      const turtle = TURTLE_DATA[key];
      const stats = analyzeTurtleTrack(turtle.track);
      const personality = classifyPersonality(stats);

      if (turtle.id === winningType || personality.id === winningType) {
        matchedTurtle = turtle;
        matchedStats = stats;
        matchedPersonality = personality;
      }
    });

    if (!matchedTurtle && TURTLE_DATA[winningType]) {
      matchedTurtle = TURTLE_DATA[winningType];
      matchedStats = analyzeTurtleTrack(matchedTurtle.track);
      matchedPersonality = classifyPersonality(matchedStats);
    }
  }

  if (matchedTurtle && matchedPersonality) {
    const quizResult = {
      turtleId: matchedTurtle.id,
      turtleName: matchedTurtle.name,
      species: matchedTurtle.species,
      archetype: matchedPersonality.archetype,
      tagline: matchedPersonality.tagline,
      icon: matchedPersonality.icon,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem('trackTheTurtle_userResult', JSON.stringify(quizResult));
    } catch (e) {
      console.warn("localStorage unable to save quiz result:", e);
    }
  }

  renderProfileCard(matchedTurtle, matchedStats, matchedPersonality, scores);
}

function renderProfileCard(turtle, stats, personality, scores) {
  const resultContainer = document.getElementById('quiz-result-container');
  if (!resultContainer) return;

  resultContainer.innerHTML = `
    <div class="card result-card">
      <div class="result-header">
        <span class="archetype-badge ${personality ? personality.colorClass : 'badge-explorer'}">
          <span>${personality ? personality.icon : '🐢'}</span>
          <span>${personality ? personality.archetype : 'Ocean Traveler'}</span>
        </span>
        <h2 style="font-size: 2.2rem; color: var(--text-main); margin-top: 0.5rem;">
          You matched with ${turtle.name}!
        </h2>
        <p style="color: var(--sea-green); font-style: italic; font-size: 1rem; margin-bottom: 1rem;">
          ${turtle.species}
        </p>
      </div>

      <p style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem;">
        ${personality.description}
      </p>

      <div class="stats-grid" style="margin-bottom: 1.8rem;">
        <div class="stat-item">
          <span class="stat-label">Total Distance</span>
          <span class="stat-value">${stats.totalDistanceKm.toLocaleString()} km</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Max Displacement</span>
          <span class="stat-value">${stats.maxDistanceFromStartKm.toLocaleString()} km</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Daily Speed</span>
          <span class="stat-value">${stats.avgDailySpeedKmDay} km/day</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Speed Consistency</span>
          <span class="stat-value">${stats.speedConsistencyPct}%</span>
        </div>
        <div class="stat-item" style="grid-column: span 2;">
          <span class="stat-label">Avg Turning Angle</span>
          <span class="stat-value">${stats.avgTurningAngleDeg}° / step</span>
        </div>
      </div>

      <div class="btn-group" style="justify-content: center;">
        <a href="tracker.html?turtle=${turtle.id}" class="btn btn-primary" style="padding: 0.9rem 2rem; font-size: 1.05rem;">
          Track ${turtle.name} Live 📍
        </a>
        <button onclick="resetQuiz()" class="btn btn-secondary" style="padding: 0.9rem 1.8rem;">
          Retake Quiz 🔄
        </button>
      </div>
    </div>
  `;
}

function resetQuiz() {
  currentQuestionIndex = 0;
  userAnswers = [];
  const questionCard = document.getElementById('quiz-question-card');
  const resultsCard = document.getElementById('quiz-results-card');

  if (resultsCard) resultsCard.style.display = 'none';
  if (questionCard) questionCard.style.display = 'block';
  renderQuestion();
}
