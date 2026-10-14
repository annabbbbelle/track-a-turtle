/* nav.js - Shared Navigation Bar Generator */

function initNavigation() {
  const navElement = document.getElementById('site-nav');
  if (!navElement) return;

  const path = window.location.pathname;
  let currentPage = path.substring(path.lastIndexOf('/') + 1);

  if (!currentPage || currentPage === '' || currentPage === 'index') {
    currentPage = 'index.html';
  }

  const navItems = [
    { name: 'Home', href: 'index.html' },
    { name: 'Quiz', href: 'quiz.html' },
    { name: 'Tracker', href: 'tracker.html' }
  ];

  navElement.className = 'navbar';
  navElement.innerHTML = `
    <div class="nav-container">
      <a href="index.html" class="nav-brand">
        <span class="nav-logo-icon">🐢</span>
        <span class="nav-brand-text">Track the Turtle</span>
      </a>

      <button class="nav-toggle" id="nav-toggle-btn" aria-label="Toggle navigation menu" aria-expanded="false">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>

      <ul class="nav-menu" id="nav-menu-list">
        ${navItems.map(item => {
          const isActive = currentPage === item.href;
          return `
            <li class="nav-item">
              <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
                ${item.name}
              </a>
            </li>
          `;
        }).join('')}
      </ul>
    </div>
  `;

  const toggleBtn = document.getElementById('nav-toggle-btn');
  const navMenu = document.getElementById('nav-menu-list');

  if (toggleBtn && navMenu) {
    const toggleMenu = () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      toggleBtn.classList.toggle('active');
      navMenu.classList.toggle('active');
    };

    toggleBtn.addEventListener('click', toggleMenu);

    document.addEventListener('click', (event) => {
      if (!navElement.contains(event.target) && navMenu.classList.contains('active')) {
        toggleBtn.classList.remove('active');
        navMenu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navMenu.classList.contains('active')) {
        toggleBtn.classList.remove('active');
        navMenu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });

    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleBtn.classList.remove('active');
        navMenu.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
