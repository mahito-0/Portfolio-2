// Create floating particles
const particlesContainer = document.getElementById('particles');
const particleCount = 50;

for (let i = 0; i < particleCount; i++) {
  const particle = document.createElement('div');
  particle.classList.add('particle');
  
  // Random properties
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

// Panel functionality
const cards = document.querySelectorAll('.card');
const panelOverlay = document.getElementById('panelOverlay');
const closeButtons = document.querySelectorAll('.close-btn');
const container = document.querySelector('.container');

cards.forEach(card => {
  card.addEventListener('click', () => {
    const panelId = card.getAttribute('data-panel') + 'Panel';
    const panel = document.getElementById(panelId);
    
    // Blur main container
    container.classList.add('blur');
    
    // Show overlay and panel
    panelOverlay.classList.add('active');
    panel.classList.add('active');
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
  });
});

// Close panel functionality
function closeAllPanels() {
  const panels = document.querySelectorAll('.info-panel');
  
  panels.forEach(panel => {
    panel.classList.remove('active');
  });
  
  panelOverlay.classList.remove('active');
  container.classList.remove('blur');
  document.body.style.overflow = '';
}

closeButtons.forEach(button => {
  button.addEventListener('click', closeAllPanels);
});

panelOverlay.addEventListener('click', closeAllPanels);

// Close with ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllPanels();
  }
});

// Typewriter effect for the "Loading profile..." text
const loadingText = document.querySelector('#aboutPanel .panel-content p:first-child strong');
if (loadingText) {
  const text = "Hello_";
  let i = 0;
  loadingText.textContent = "";
  
  function typeWriter() {
    if (i < text.length) {
      loadingText.textContent += text.charAt(i);
      i++;
      setTimeout(typeWriter, 100);
    } else {
      loadingText.textContent = text;
      // Add blinking cursor effect
      loadingText.innerHTML += '<span class="blinking-cursor">|</span>';
    }
  }
  
  typeWriter();
}

// Replace with your GitHub username
const githubUsername = 'mahito-0';

// Function to fetch GitHub projects
async function fetchGitHubProjects() {
  try {
    const response = await fetch(`https://api.github.com/users/${githubUsername}/repos?sort=updated&direction=desc`);
    const repos = await response.json();
    
    const projectsPanel = document.querySelector('#projectsPanel .panel-content');
    
    // Clear the "Coming Soon" message if it exists
    const comingSoonHeading = projectsPanel.querySelector('h3');
    const comingSoonPara = projectsPanel.querySelector('p:last-of-type');
    if (comingSoonHeading && comingSoonPara) {
      comingSoonHeading.remove();
      comingSoonPara.remove();
    }
    
    // Check if projects container already exists
    let projectsContainer = projectsPanel.querySelector('.projects-container');
    if (!projectsContainer) {
      projectsContainer = document.createElement('div');
      projectsContainer.className = 'projects-container';
      projectsPanel.appendChild(projectsContainer);
    } else {
      // Clear existing projects if refreshing
      projectsContainer.innerHTML = '';
    }
    
    // Add each project
    repos.forEach(repo => {
      if (!repo.fork && !repo.archived) { // Only show non-forked, non-archived repositories
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        
        // Format the updated date
        const updatedDate = new Date(repo.updated_at);
        const formattedDate = updatedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        projectCard.innerHTML = `
          <h4><a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a></h4>
          <p>${repo.description || 'No description provided'}</p>
          <div class="repo-meta">
            <span>⭐ ${repo.stargazers_count}</span>
            <span>🔄 ${formattedDate}</span>
            <span>📌 ${repo.language || 'Various'}</span>
          </div>
        `;
        
        projectsContainer.appendChild(projectCard);
      }
    });
    
    // If no projects were added (all are forks or archived)
    if (projectsContainer.children.length === 0) {
      projectsContainer.innerHTML = '<p>No public repositories found.</p>';
    }
    
  } catch (error) {
    console.error('Error fetching GitHub projects:', error);
    const projectsPanel = document.querySelector('#projectsPanel .panel-content');
    const errorElement = document.createElement('p');
    errorElement.textContent = 'Failed to load projects. Please try again later.';
    errorElement.style.color = '#ff6b6b';
    projectsPanel.appendChild(errorElement);
  }
}

// Call the function when the projects panel is opened
document.querySelector('.card.projects').addEventListener('click', fetchGitHubProjects);

// Also fetch when the panel is already open and user clicks the header (for refresh)
document.querySelector('#projectsPanel .panel-header').addEventListener('click', function(e) {
  // Only trigger if clicking directly on the header (not the close button)
  if (e.target === this || e.target.classList.contains('panel-title')) {
    fetchGitHubProjects();
  }
});