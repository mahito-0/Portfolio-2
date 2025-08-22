// ========= MAIN INITIALIZATION =========
document.addEventListener('DOMContentLoaded', () => {
  setupResponsiveFontSize();
  setupSmoothScrolling();
  setupContactForm();
  setupCustomCursor();
  setupImageModal();
  setupTypingAnimation();
  fetchGitHubProjects('mahito-0');
  loadGitHubContributions('mahito-0');
  setInterval(() => loadGitHubContributions('mahito-0'), 1000 * 60 * 30);

  window.addEventListener('scroll', handleScrollEffects, { passive: true });

  createParticles();
  initPanels();
  setupSkillsCarousel(); // Initialize the skills carousel
  setupChatWidget();    // Initialize AI chat widget

  // Recreate particles on resize (debounced)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(createParticles, 200);
    if (window.emailjs?.init) {
      emailjs.init("S1gRkblDQXsFDT-SG"); 
    }
  }, { passive: true });
});

// ==================== RESPONSIVE FONT ====================
function setupResponsiveFontSize() {
  const setResponsiveFontSize = () => {
    const isMobile = window.innerWidth <= 768;
    document.documentElement.style.setProperty('--font-size-base', isMobile ? '14px' : '16px');
  };
  setResponsiveFontSize();
  window.addEventListener('resize', setResponsiveFontSize, { passive: true });
}

// ==================== SMOOTH SCROLL ====================
function setupSmoothScrolling() {
  const supportsSmoothScroll = 'scrollBehavior' in document.documentElement.style;
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElem = document.querySelector(targetId);
      if (!targetElem) return;
      e.preventDefault();
      const targetPosition = targetElem.getBoundingClientRect().top + window.pageYOffset;
      if (supportsSmoothScroll) window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      else smoothScrollPolyfill(targetPosition, 800);
      targetElem.setAttribute('tabindex', '-1');
      targetElem.focus();
    });
  });
  function smoothScrollPolyfill(targetPosition, duration) {
    const startPosition = window.pageYOffset; const distance = targetPosition - startPosition; let startTime = null;
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    function easeInOutQuad(t, b, c, d) { t /= d / 2; if (t < 1) return c / 2 * t * t + b; t--; return -c / 2 * (t * (t - 2) - 1) + b; }
    requestAnimationFrame(animation);
  }
}

// ==================== GITHUB FETCH ====================
async function fetchGitHubProjects(username) {
  const projectsList = document.getElementById('projects-list');
  const cardTemplate = document.getElementById('card-template');
  if (!projectsList || !cardTemplate) return;

  const cacheKey = `gh-repos:${username}`;
  const ttlMs = 6 * 60 * 60 * 1000; // 6 hours
  let renderedFromCache = false;

  function renderRepos(reposRaw) {
    let repos = Array.isArray(reposRaw) ? reposRaw : [];
    repos = repos.filter(r => !r.fork && !r.archived)
                 .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    projectsList.innerHTML = '';
    if (!repos.length) {
      projectsList.innerHTML = '<p>No public repositories found.</p>';
      return;
    }

    const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
        <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#00f7ff"/><stop offset="1" stop-color="#ff00f7"/></linearGradient></defs>
        <rect width="100%" height="100%" fill="#101525" />
        <rect x="12" y="12" width="376" height="201" rx="8" fill="url(#g)" opacity="0.12" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#2b3d52" font-family="Montserrat, sans-serif" font-size="18">No preview image</text>
      </svg>
    `);

    for (const repo of repos) {
      const card = document.importNode(cardTemplate.content, true);
      const el = card.querySelector('.project-card');

      el.querySelector('.repo-link-title').textContent = repo.name || 'Repository';

      const link = el.querySelector('.repo-link');
      link.href = repo.html_url;
      link.rel = 'noopener noreferrer';
      link.textContent = 'View on GitHub';

      const desc = el.querySelector('.repo-description');
      desc.textContent = repo.description || 'No description available';

      el.querySelector('.repo-stars').textContent = `⭐ ${repo.stargazers_count ?? 0}`;
      el.querySelector('.repo-forks').textContent = `🍴 ${repo.forks_count ?? 0}`;

      const meta = el.querySelector('.project-meta');
      const updated = document.createElement('span');
      updated.className = 'badge dates';
      updated.textContent = `📅 Updated: ${repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}`;
      meta.appendChild(updated);

      if (repo.language) {
        const lang = document.createElement('span');
        lang.className = 'badge';
        lang.textContent = `💻 ${repo.language}`;
        meta.appendChild(lang);
      }

      const img = el.querySelector('.project-image img');
      const imageUrl = `https://raw.githubusercontent.com/${username}/${repo.name}/main/img/proimg.png`;
      img.alt = `${repo.name} preview`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = imageUrl;
      img.onerror = () => { img.src = placeholder; };

      projectsList.appendChild(card);
    }
  }

  // Try cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < ttlMs) {
        renderRepos(data);
        renderedFromCache = true;
        return;
      }
    }
  } catch {}

  projectsList.innerHTML = '<p style="opacity:.8" role="status" aria-live="polite">Loading projects…</p>';

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=updated&direction=desc`;

  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json' } });

    if (response.status === 403) {
      const reset = response.headers.get('x-ratelimit-reset');
      const resetDate = reset ? new Date(parseInt(reset, 10) * 1000) : null;
      const msg = resetDate ? `GitHub API rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}.` : 'GitHub API rate limit exceeded. Try again later.';

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          renderRepos(data);
          projectsList.insertAdjacentHTML('afterbegin', `<p style="color:#ffcd70">Showing cached projects due to API limit. ${msg}</p>`);
          return;
        } catch {}
      }

      throw new Error(msg);
    }

    if (!response.ok) throw new Error(`GitHub API error ${response.status}`);

    const repos = await response.json();
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: repos })); } catch {}
    renderRepos(repos);
  } catch (error) {
    console.error('Error fetching GitHub projects:', error);
    if (!renderedFromCache) {
      projectsList.innerHTML = `<p style="color:#ff6b6b">${error.message}</p>`;
    }
  }
}

// ==================== CONTACT FORM + EMAILJS ====================
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendmail();
  });
}

function sendmail() {
  const panel = document.getElementById('contactPanel');
  const message = panel.querySelector('#message')?.value.trim() || '';
  const name = panel.querySelector('#name')?.value.trim() || '';
  const email = panel.querySelector('#email')?.value.trim() || '';
  const honey = panel.querySelector('#website')?.value || '';
  const sendButton = panel.querySelector('#sendLetter');
  const resultMessage = panel.querySelector('.result-message');

  const show = (text, ok = false) => {
    if (!resultMessage) return;
    resultMessage.textContent = text;
    resultMessage.style.display = 'block';
    resultMessage.style.color = ok ? 'var(--badge-green)' : '#ff6b6b';
    clearTimeout(resultMessage._timer);
    resultMessage._timer = setTimeout(() => resultMessage.style.display = 'none', 5000);
  };

  if (honey) return;
  if (!name || !email || !message) {
    show('Please fill out your name, email, and message.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    show('Please enter a valid email address.');
    return;
  }

  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Sending…';
  }

  const finalize = () => {
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
    }
  };

  const templateParams = { from_name: name, reply_to: email, message };

  if (window.emailjs) {
    try {
      if (!emailjs.__inited) {
        emailjs.init({ publicKey: 'S1gRkblDQXsFDT-SG' });
        emailjs.__inited = true;
      }
    } catch (e) {
      console.warn('EmailJS init failed:', e);
    }

    emailjs
      .send('service_zsci4of', 'template_t5wnh4c', templateParams)
      .then(() => {
        show('Message sent successfully! ✅', true);
        const form = document.getElementById('contact-form');
        form && form.reset();
        finalize();
      })
      .catch((err) => {
        console.error('EmailJS send error:', err);
        show('Message failed to send. Please try again later.');
        finalize();
      });
  } else {
    show('Email service is unavailable. Please email me directly: mahmud.agni@gmail.com');
    finalize();
  }
}

// ==================== CUSTOM CURSOR ====================
function setupCustomCursor() {
  const cursor = document.querySelector('.custom-cursor');
  if (!cursor) return;

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) {
    cursor.style.display = 'none';
    return;
  }

  document.addEventListener('mousemove', (e) => {
    cursor.style.top = e.clientY + 'px';
    cursor.style.left = e.clientX + 'px';
    if (isClickable(e.target)) {
      cursor.classList.add('clickable-hover');
    } else {
      cursor.classList.remove('clickable-hover');
    }
  });

  function isClickable(element) {
    const interactiveSelectors = [
      'a[href]', 'button', 'input', 'select', 'textarea',
      '[role="button"]', '[role="link"]', '[contenteditable]',
      '[tabindex]:not([tabindex="-1"])', 'label', 'video',
      'audio', 'iframe', '[data-clickable]'
    ].join(',');
    return element.matches(interactiveSelectors) || element.closest(interactiveSelectors) !== null;
  }
}

// ==================== IMAGE MODAL & ZOOM ====================
function setupImageModal() {
  const modal = document.getElementById('img-modal');
  const modalImg = document.getElementById('modal-img');
  const closeBtn = document.querySelector('.img-modal-close');
  if (!(modal && modalImg && closeBtn)) return;

  let scale = 1, isDragging = false, startX = 0, startY = 0, currentX = 0, currentY = 0;

  function initImageModal(img) {
    img.classList.add('clickable-img');
    img.addEventListener('click', () => {
      scale = 1; currentX = 0; currentY = 0;
      modalImg.style.transform = `translate(0, 0) scale(${scale})`;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      modalImg.src = img.src; modalImg.alt = img.alt || '';
      modalImg.style.cursor = 'grab';
    });
  }

  document.querySelectorAll('.clickable-img').forEach(initImageModal);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('clickable-img')) initImageModal(node);
          node.querySelectorAll?.('.clickable-img')?.forEach(initImageModal);
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  function closeModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    isDragging = false;
    modalImg.style.cursor = 'grab';
    modalImg.classList.remove('dragging');
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  modalImg.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    scale = Math.min(Math.max(1, scale + delta), 5);
    modalImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
  }, { passive: false });

  modalImg.addEventListener('mousedown', e => {
    if (scale <= 1) return;
    e.preventDefault();
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    modalImg.style.cursor = 'grabbing';
    modalImg.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      modalImg.style.cursor = 'grab';
      modalImg.classList.remove('dragging');
    }
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    modalImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
  });

  // Touch support
  let lastTouchDist = null, lastTouchX = null, lastTouchY = null;
  modalImg.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      lastTouchDist = getTouchDist(e.touches);
    } else if (e.touches.length === 1 && scale > 1) {
      lastTouchX = e.touches[0].clientX - currentX;
      lastTouchY = e.touches[0].clientY - currentY;
    }
  }, { passive: false });

  modalImg.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const currentDist = getTouchDist(e.touches);
      if (lastTouchDist !== null) {
        let deltaScale = (currentDist - lastTouchDist) / 200;
        scale = Math.min(Math.max(1, scale + deltaScale), 5);
        modalImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
      }
      lastTouchDist = currentDist;
    } else if (e.touches.length === 1 && scale > 1) {
      currentX = e.touches[0].clientX - lastTouchX;
      currentY = e.touches[0].clientY - lastTouchY;
      modalImg.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
    }
  }, { passive: false });

  modalImg.addEventListener('touchend', e => { if (e.touches.length < 2) lastTouchDist = null; });

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }
}

// ==================== TYPING ====================
function setupTypingAnimation() {
  const typingText = document.getElementById('typingText');
  if (!typingText) return;

  const lines = [
    "Software Developer",
    "Web Developer",
    "App Developer",
    "AI/ML Enthusiast",
    "Game Developer",
    "Tech Learner",
    "Algorithm Explorer",
    "System Enthusiast",
    "Cloud Explorer",
    "UI/UX Designer"
  ];

  let lineIndex = 0, charIndex = 0, isDeleting = false;
  const typingSpeed = 100, pauseBetweenLines = 1500;

  function type() {
    const currentLine = lines[lineIndex % lines.length];

    if (isDeleting) {
      typingText.textContent = currentLine.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        lineIndex++;
        setTimeout(type, typingSpeed);
      } else {
        setTimeout(type, typingSpeed / 2);
      }
    } else {
      typingText.textContent = currentLine.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === currentLine.length) {
        isDeleting = true;
        setTimeout(type, pauseBetweenLines);
      } else {
        setTimeout(type, typingSpeed);
      }
    }
  }
  type();
}

// ==================== SCROLL EFFECTS ====================
function handleScrollEffects() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const parallaxElements = document.querySelectorAll('.parallax');
  parallaxElements.forEach(el => {
    const speed = parseFloat(el.getAttribute('data-speed') || '0.5');
    el.style.backgroundPositionY = `${scrollTop * speed}px`;
  });
  const fadeElements = document.querySelectorAll('.fade-in');
  fadeElements.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 100) {
      el.classList.add('visible');
    } else {
      el.classList.remove('visible');
    }
  });
  const header = document.querySelector('header');
  if (header) {
    if (scrollTop > 50) header.classList.add('sticky');
    else header.classList.remove('sticky');
  }
}

// ==================== GITHUB CONTRIBUTIONS GRID ====================
function loadGitHubContributions(username) {
  const container = document.getElementById('contributions-grid');
  if (!container) return;
  const timestamp = new Date().getTime();
  const url = `https://ghchart.rshah.org/${username}?t=${timestamp}`;
  container.innerHTML = `<img src="${url}" alt="${username}'s GitHub contributions" loading="lazy" decoding="async" style="max-width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); padding:6px;">`;
  if (document.documentElement.getAttribute('data-theme') === 'light') {
    container.firstChild.style.background = '#fff';
    container.firstChild.style.borderColor = 'rgba(15,23,42,0.12)';
  }
}

// ==================== PARTICLES ====================
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  particlesContainer.innerHTML = '';
  const isSmall = window.innerWidth <= 768;
  const particleCount = isSmall ? 24 : 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const size = Math.random() * 3 + 1;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = Math.random() * 5 + 5;

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    particlesContainer.appendChild(particle);
  }
}

// ==================== PANELS ====================
function initPanels() {
  const cards = document.querySelectorAll('.card');
  const panelOverlay = document.getElementById('panelOverlay');
  const closeButtons = document.querySelectorAll('.close-btn');
  const container = document.querySelector('.container');

  cards.forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => openPanel(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPanel(card);
      }
    });
  });

  function openPanel(card) {
    const panelId = card.getAttribute('data-panel') + 'Panel';
    const panel = document.getElementById(panelId);
    if (!panel) return;
    container.classList.add('blur');
    panelOverlay.classList.add('active');
    panel.classList.add('active');
    panelOverlay.setAttribute('aria-hidden', 'false');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const close = panel.querySelector('.close-btn');
    close && close.focus();
  }

  function closeAllPanels() {
    const panels = document.querySelectorAll('.info-panel');
    panels.forEach(panel => {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
    });
    panelOverlay.classList.remove('active');
    panelOverlay.setAttribute('aria-hidden', 'true');
    container.classList.remove('blur');
    document.body.style.overflow = '';
  }

  closeButtons.forEach(button => button.addEventListener('click', closeAllPanels));
  panelOverlay.addEventListener('click', closeAllPanels);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllPanels(); });
}

// ==================== SKILLS CAROUSEL ====================
function setupSkillsCarousel() {
  const tracks = document.querySelectorAll('#skillsPanel .skills-track .skills-inner');

  tracks.forEach(track => {
    if (!track) return;

    if (track.children.length < 30) {
      const itemsHTML = track.innerHTML;
      track.innerHTML = itemsHTML + itemsHTML + itemsHTML;
    }

    const perItem = 1.8;
    const duration = Math.max(30, Math.round(track.children.length * perItem));
    track.style.animationDuration = `${duration}s`;
  });

  const carousel = document.querySelector('#skillsPanel .skills-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => {
      carousel.querySelectorAll('.skills-inner').forEach(el => el.style.animationPlayState = 'paused');
    });
    carousel.addEventListener('mouseleave', () => {
      carousel.querySelectorAll('.skills-inner').forEach(el => el.style.animationPlayState = 'running');
    });
  }
}

// ==================== CHAT WIDGET ====================
(function () {
  const CONFIG_URL = 'assets/chat-config.json';
  const DATA_URL   = 'assets/site-data.json';

  document.addEventListener('DOMContentLoaded', () => {
    if (window.__chatWidgetBound) return;
    window.__chatWidgetBound = true;
    setupChatWidget().catch(err => console.error('Chat init failed:', err));
  });

  async function setupChatWidget() {
    // DOM
    const panel   = document.getElementById('chat-panel');
    const toggle  = document.getElementById('chat-toggle');
    const closeBtn= document.getElementById('chat-close');
    const log     = document.getElementById('chat-log');
    const form    = document.getElementById('chat-form');
    const input   = document.getElementById('chat-input');

    if (!panel || !toggle || !closeBtn || !log || !form || !input) {
      console.warn('Chat elements missing in HTML.');
      return;
    }

    const state = { cfg: null, messages: [], site: null, flatFacts: [] };

    // UI helpers
    function addMsg(role, text) {
      const el = document.createElement('div');
      el.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }
    function setBusy(busy) {
      const btn = form.querySelector('button');
      btn.disabled = busy;
      btn.textContent = busy ? '...' : 'Send';
      input.disabled = busy;
    }

    // Load config and site data
    async function loadConfig() {
      if (state.cfg) return state.cfg;
      const r = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('Missing assets/chat-config.json');
      const cfg = await r.json();
      state.cfg = {
        endpoint: cfg.endpoint,
        systemPrompt: cfg.systemPrompt || 'You are a helpful assistant.',
        welcomeMessage: cfg.welcomeMessage || 'Hi! Ask me about this portfolio.',
        maxHistory: Number(cfg.maxHistory ?? 14)
      };
      state.messages = [{ role: 'system', content: state.cfg.systemPrompt }];
      return state.cfg;
    }

    async function loadSiteData() {
      if (state.site) return state.site;
      try {
        const r = await fetch(DATA_URL, { cache: 'no-store' });
        if (r.ok) {
          state.site = await r.json();
          state.flatFacts = flattenFacts(state.site);
        } else {
          console.warn('site-data.json not found (optional but recommended).');
          state.site = null; state.flatFacts = [];
        }
      } catch (e) {
        console.warn('Failed to load site-data.json:', e);
        state.site = null; state.flatFacts = [];
      }
      return state.site;
    }

    // Turn site-data into concise fact strings
    function flattenFacts(d) {
      if (!d) return [];
      const arr = [];
      if (d.name)      arr.push(`Name: ${d.name}`);
      if (d.location)  arr.push(`Location: ${d.location}`);
      if (d.email)     arr.push(`Email: ${d.email}`);
      if (d.status)    arr.push(`Status: ${d.status}`);
      if (d.focus)     arr.push(`Focus: ${d.focus}`);
      if (Array.isArray(d.skills) && d.skills.length)
        arr.push(`Skills: ${d.skills.join(', ')}`);
      if (Array.isArray(d.education)) {
        d.education.forEach(e => {
          arr.push(`Education: ${e.years} — ${e.school}${e.degree ? `, ${e.degree}` : ''}${e.focus ? ` (${e.focus})` : ''}`);
        });
      }
      if (d.poster?.title)
        arr.push(`Poster: ${d.poster.title}${d.poster.award ? ` — ${d.poster.award}` : ''}`);
      if (d.research?.title)
        arr.push(`Research: ${d.research.title}${d.research.summary ? ` — ${d.research.summary}` : ''}`);
      if (d.githubUser) arr.push(`GitHub user: ${d.githubUser}`);
      if (d.socials?.github)   arr.push(`GitHub: ${d.socials.github}`);
      if (d.socials?.linkedin) arr.push(`LinkedIn: ${d.socials.linkedin}`);
      if (d.socials?.instagram)arr.push(`Instagram: ${d.socials.instagram}`);
      return arr;
    }

    // Pick the most relevant facts for the user’s query
    function relevantFacts(query, limit = 8) {
      if (!state.flatFacts.length) return '';
      const words = (query || '').toLowerCase().match(/[a-z0-9#.@-]{3,}/g) || [];
      const score = t => words.reduce((s, w) => s + (t.toLowerCase().includes(w) ? 1 : 0), 0);
      const ranked = state.flatFacts
        .map(t => ({ t, s: score(t) }))
        .sort((a, b) => b.s - a.s || a.t.length - b.t.length);
      const picked = (ranked[0]?.s ? ranked.filter(x => x.s > 0).slice(0, limit) : ranked.slice(0, 6))
        .map(x => x.t);
      const context = picked.join('\n- ');
      return context ? `Use these portfolio facts:\n- ${context}` : '';
    }

    // Events
    toggle.addEventListener('click', async () => {
      try { await loadConfig(); } catch (e) { console.error(e); }
      await loadSiteData();
      panel.hidden = !panel.hidden;
      if (!panel.hidden && log.childElementCount === 0) {
        addMsg('bot', state.cfg?.welcomeMessage || 'Hi!');
      }
    });

    closeBtn.addEventListener('click', () => { panel.hidden = true; });

    // Enter to send (Shift+Enter = newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      try { await loadConfig(); } catch {
        addMsg('bot', 'Chat config not found. Please add assets/chat-config.json with your endpoint.');
        return;
      }
      await loadSiteData();

      addMsg('user', text);
      state.messages.push({ role: 'user', content: text });

      // Build a short, relevant context from your site facts
      const facts      = relevantFacts(text);
      const baseSystem = state.messages.find(m => m.role === 'system');

      // Keep the context short to save tokens
      const recent = state.messages.filter(m => m !== baseSystem)
                                   .slice(-state.cfg.maxHistory + 2);

      const messagesForApi = [
        baseSystem || { role: 'system', content: state.cfg.systemPrompt },
        ...(facts ? [{ role: 'system', content: facts }] : []),
        ...recent
      ];

      try {
        setBusy(true);
        const r = await fetch(state.cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesForApi })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error?.message || JSON.stringify(data) || `HTTP ${r.status}`);
        const reply = data.reply || '(no reply)';
        state.messages.push({ role: 'assistant', content: reply });
        addMsg('bot', reply);
      } catch (err) {
        console.error('Chat error:', err);
        addMsg('bot', 'Oops—something went wrong. Please try again.');
      } finally {
        setBusy(false);
      }
    });
  }
})();