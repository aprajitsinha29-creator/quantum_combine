/**
 * Ananta Coordinator
 * Tab routing, dual theme (light/dark) toggle, authentication state,
 * and quantum simulation engine bindings.
 */

/* ---- Mobile Navigation ---- */
window.toggleMobileNav = function() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  const btn = document.getElementById('hamburger-btn');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    btn && btn.classList.remove('is-open');
    document.body.style.overflow = '';
  } else {
    drawer.classList.add('open');
    overlay.classList.add('open');
    btn && btn.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
};
window.closeMobileNav = function() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');
  const btn = document.getElementById('hamburger-btn');
  if (!drawer) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  btn && btn.classList.remove('is-open');
  document.body.style.overflow = '';
};

// Shared helper — Section 5.3 Honesty Badges
window.setStatusBadge = function(elementId, isLive) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.toggle('live', isLive);
  el.classList.toggle('fallback', !isLive);
  el.textContent = isLive ? '● Live AI' : '○ Local Fallback';
};

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Dual Theme System (Light & Dark)
  // ==========================================
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.body.setAttribute('data-theme', 'light');
    }
    
    const icon = document.getElementById('theme-toggle-icon');
    const text = document.getElementById('theme-toggle-text');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (text) text.textContent = isDark ? 'Light' : 'Dark';

    localStorage.setItem('ananta_theme', theme);
  }

  window.toggleTheme = function() {
    const current = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(current);
  };

  const savedTheme = localStorage.getItem('ananta_theme') || 'dark';
  applyTheme(savedTheme);

  // ==========================================
  // 2. Quantum Engine & Visualizers
  // ==========================================
  const engine = new QuantumCircuitEngine(3);

  let blochVisualizer = null;
  try {
    blochVisualizer = new BlochSphereVisualizer('bloch-sphere-canvas');
    window.blochVisualizer = blochVisualizer;
  } catch (err) {
    console.error('Three.js initialization:', err);
  }

  const circuitUI = new CircuitUI(engine, blochVisualizer);
  window.circuitUI = circuitUI;

  const missionManager = new MissionManager();
  window.missionManager = missionManager;

  const intuitionLab = new IntuitionLab();
  window.intuitionLab = intuitionLab;

  const conceptDoctor = new ConceptDoctor();
  window.conceptDoctor = conceptDoctor;

  const hwStudio = new HardwareControlStudio(engine, circuitUI);
  window.hwStudio = hwStudio;

  const algorithmLibrary = new AlgorithmLibrary();
  window.algorithmLibrary = algorithmLibrary;

  let cloudQPUBridge = null;
  if (window.CloudQPUBridge) {
    cloudQPUBridge = new window.CloudQPUBridge(engine, circuitUI);
    window.cloudQPUBridge = cloudQPUBridge;
  }

  let qbraidBridge = null;
  if (window.QBraidBridge) {
    qbraidBridge = new window.QBraidBridge(engine, circuitUI);
    window.qbraidBridge = qbraidBridge;
  }

  let localFrameworkBridge = null;
  if (window.LocalFrameworkBridge) {
    localFrameworkBridge = new window.LocalFrameworkBridge(engine, circuitUI);
    window.localFrameworkBridge = localFrameworkBridge;
  }

  let instructorPortal = null;
  if (window.InstructorPortal) {
    instructorPortal = new window.InstructorPortal();
    window.instructorPortal = instructorPortal;
  }

  window.switchHardwareProvider = function(provider) {
    const tabs = {
      ibm: document.getElementById('tab-provider-ibm'),
      qbraid: document.getElementById('tab-provider-qbraid'),
      local: document.getElementById('tab-provider-local')
    };
    const panels = {
      ibm: document.getElementById('hardware-panel-ibm'),
      qbraid: document.getElementById('hardware-panel-qbraid'),
      local: document.getElementById('hardware-panel-local')
    };
    const target = tabs[provider] ? provider : 'ibm';

    Object.keys(tabs).forEach((key) => {
      if (tabs[key]) tabs[key].classList.toggle('active', key === target);
      if (panels[key]) panels[key].style.display = key === target ? 'block' : 'none';
    });

    if (target === 'qbraid' && window.qbraidBridge) {
      window.qbraidBridge.updateDeviceTelemetry();
      if (typeof window.qbraidBridge.fetchRecommendations === 'function') {
        window.qbraidBridge.fetchRecommendations();
      }
    }
    else if (target === 'local' && window.localFrameworkBridge) window.localFrameworkBridge.refreshStatus();
    else if (target === 'ibm' && window.cloudQPUBridge) window.cloudQPUBridge.updateDeviceTelemetry();
  };

  // 4 Killer Differentiating Studios
  let surfaceCodeStudio = null;
  if (window.SurfaceCodeStudio) {
    surfaceCodeStudio = new window.SurfaceCodeStudio();
    window.surfaceCodeStudio = surfaceCodeStudio;
  }

  let transpilerDoctor = null;
  if (window.TranspilerDoctor) {
    transpilerDoctor = new window.TranspilerDoctor();
    window.transpilerDoctor = transpilerDoctor;
  }

  let vqeChemistryStudio = null;
  if (window.VQEChemistryStudio) {
    vqeChemistryStudio = new window.VQEChemistryStudio();
    window.vqeChemistryStudio = vqeChemistryStudio;
  }

  let microwavePulseStudio = null;
  if (window.MicrowavePulseStudio) {
    microwavePulseStudio = new window.MicrowavePulseStudio();
    window.microwavePulseStudio = microwavePulseStudio;
  }

  let topicRoadmapManager = null;
  if (window.TopicRoadmapManager) {
    topicRoadmapManager = new window.TopicRoadmapManager();
    window.topicRoadmapManager = topicRoadmapManager;
  }

  // ── Quantum Hardware & Security Studios ─────────────────────
  let quantumDebugger = null;
  if (window.QuantumTimeDebugger) {
    try {
      quantumDebugger = new window.QuantumTimeDebugger(engine, circuitUI);
      window.quantumDebugger = quantumDebugger;
    } catch (err) { console.warn('QuantumTimeDebugger init:', err); }
  }

  let cryoTwin = null;
  if (window.CryostatTwin) {
    try {
      cryoTwin = new window.CryostatTwin(engine, circuitUI);
      window.cryoTwin = cryoTwin;
    } catch (err) { console.warn('CryostatTwin init:', err); }
  }

  let pqcAuditor = null;
  if (window.PQCSecurityAuditor) {
    try {
      pqcAuditor = new window.PQCSecurityAuditor();
      window.pqcAuditor = pqcAuditor;
    } catch (err) { console.warn('PQCSecurityAuditor init:', err); }
  }

  // Initialize Living Rishi Quantum Canvas
  if (window.RishiQuantumCanvas) {
    try {
      window.rishiCanvasMain = new window.RishiQuantumCanvas('rishi-quantum-canvas-main', 'rishi-photo-card-main');
    } catch (err) {
      console.warn('Rishi canvas init:', err);
    }
  }

  // ==========================================
  // 3. View & Tab Routing
  // ==========================================
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.viewport-section');

  function switchView(tabKey) {
    if (!tabKey) tabKey = 'simulator';

    // Normalize tabKey
    if (tabKey === 'hardware') tabKey = 'overview';
    if (tabKey === 'software') tabKey = 'simulator';

    // If navigating to login view, refresh active session state or credentials panel
    if (tabKey === 'login' && window.renderLoginSessionState) {
      window.renderLoginSessionState();
    }

    // Groups for dropdown highlights
    const studioTabs = ['surface-code', 'pulse-studio', 'transpiler', 'vqe-chemistry', 'debugger', 'cryo-twin', 'pqc-auditor'];
    const algorithmTabs = ['algorithms', 'research'];
    const learnTabs = ['intuition', 'challenges', 'docs', 'topic-roadmap', 'instructor'];

    // Undock circuit designer from topic roadmap reader when switching away
    if (tabKey !== 'topic-roadmap' && window.topicRoadmapManager && window.topicRoadmapManager.undockCircuitDesigner) {
      window.topicRoadmapManager.undockCircuitDesigner();
    }

    // Update active class on standalone nav items & dropdown triggers
    navItems.forEach(item => {
      const tab = item.getAttribute('data-tab');
      const dropdown = item.getAttribute('data-dropdown');

      if (tab && tab === tabKey) {
        item.classList.add('active');
      } else if (dropdown === 'studios' && studioTabs.includes(tabKey)) {
        item.classList.add('active');
      } else if (dropdown === 'algorithms' && algorithmTabs.includes(tabKey)) {
        item.classList.add('active');
      } else if (dropdown === 'learn' && learnTabs.includes(tabKey)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active state on rich dropdown items & legacy dropdown links
    document.querySelectorAll('.dropdown-rich-item, .dropdown-link').forEach(link => {
      if (link.getAttribute('data-tab') === tabKey) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update mobile nav items active state
    document.querySelectorAll('.mobile-nav-item').forEach(mItem => {
      if (mItem.getAttribute('data-tab') === tabKey) {
        mItem.classList.add('active');
      } else {
        mItem.classList.remove('active');
      }
    });

    // Toggle viewport sections
    sections.forEach(sec => {
      if (sec.id === `view-${tabKey}`) {
        sec.classList.add('active');
        sec.style.display = 'block';
      } else {
        sec.classList.remove('active');
        sec.style.display = 'none';
      }
    });

    // Sync URL hash safely without duplicate entries
    if (window.location.hash !== '#' + tabKey) {
      try {
        window.history.replaceState(null, '', '#' + tabKey);
      } catch (err) {
        window.location.hash = tabKey;
      }
    }

    // Scroll viewport to top on tab switch
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (tabKey === 'overview') {
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 150);
    }

    // Stop background canvas render loops when tab is not active
    if (tabKey !== 'login' && window.rishiCanvasMain && window.rishiCanvasMain.stop) {
      window.rishiCanvasMain.stop();
    }
    if (tabKey !== 'simulator') {
      if (blochVisualizer && blochVisualizer.stop) blochVisualizer.stop();
      if (window.hwStudio && window.hwStudio.stopPulseAnimation) {
        window.hwStudio.stopPulseAnimation();
      }
    }
    if (tabKey !== 'intuition') {
      if (window.intuitionLab && window.intuitionLab.stopWaveAnimation) {
        window.intuitionLab.stopWaveAnimation();
      }
      if (window.conceptDoctor && window.conceptDoctor.stopAnimation) {
        window.conceptDoctor.stopAnimation();
      }
    }
    if (tabKey !== 'pulse-studio') {
      if (window.microwavePulseStudio && window.microwavePulseStudio.stopRenderLoop) {
        window.microwavePulseStudio.stopRenderLoop();
      }
    }
    if (tabKey !== 'topic-roadmap') {
      if (window.topicRoadmapManager && window.topicRoadmapManager.undockCircuitDesigner) {
        window.topicRoadmapManager.undockCircuitDesigner();
      }
    }
    if (tabKey === 'topic-roadmap') {
      if (window.topicRoadmapManager && window.topicRoadmapManager.initDOM) {
        window.topicRoadmapManager.initDOM();
      }
    }

    // Resize Bloch sphere & refresh microwave pulse canvas when entering simulator
    if (tabKey === 'simulator') {
      if (blochVisualizer) {
        if (blochVisualizer.start) blochVisualizer.start();
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
          if (circuitUI) circuitUI.updateSimulation();
        }, 60);
      }
      if (window.hwStudio) {
        setTimeout(() => window.hwStudio.initPulseCanvas(), 80);
      }
    }

    // Refresh & start Rishi Canvas on login tab switch
    if (tabKey === 'login' && window.rishiCanvasMain) {
      setTimeout(() => {
        window.rishiCanvasMain.initSize();
        window.rishiCanvasMain.start();
      }, 50);
    }

    // Refresh Surface Code View
    if (tabKey === 'surface-code' && window.surfaceCodeStudio) {
      setTimeout(() => {
        window.surfaceCodeStudio.renderLattice();
        window.surfaceCodeStudio.updateStats();
      }, 50);
    }

    // Refresh Transpiler View
    if (tabKey === 'transpiler' && window.transpilerDoctor) {
      setTimeout(() => {
        const td = window.transpilerDoctor;
        if (td.sourceCodeArea && !td.sourceCodeArea.value.trim() && window.circuitUI) {
          td.syncFromComposer();
        } else {
          td.renderTargetCode();
        }
        // CodeMirror measures line layout using the container's actual
        // rendered size; TranspilerDoctor is constructed once at page load
        // while this view is still hidden (display:none), so both editors
        // need an explicit .refresh() the first time the view becomes
        // visible or they're stuck showing line numbers with no text.
        if (td.sourceCodeArea && td.sourceCodeArea.codeMirror) td.sourceCodeArea.codeMirror.refresh();
        if (td.targetCodeArea && td.targetCodeArea.codeMirror) td.targetCodeArea.codeMirror.refresh();
      }, 50);
    }

    // Refresh VQE Chemistry View
    if (tabKey === 'vqe-chemistry' && window.vqeChemistryStudio) {
      setTimeout(() => {
        window.vqeChemistryStudio.updateAll();
      }, 50);
    }

    // Refresh Pulse Studio View
    if (tabKey === 'pulse-studio' && window.microwavePulseStudio) {
      setTimeout(() => {
        window.microwavePulseStudio.startRenderLoop();
      }, 50);
    }

    // Refresh Wave Canvas and Doctor Canvas when entering Intuition Lab
    if (tabKey === 'intuition') {
      if (window.intuitionLab) setTimeout(() => window.intuitionLab.initWaveCanvas(), 60);
      if (window.conceptDoctor) setTimeout(() => window.conceptDoctor.loadConcept(window.conceptDoctor.currentConceptId), 80);
    }

    // Refresh Skill Tree when entering Challenges tab
    if (tabKey === 'challenges' && window.hwStudio) {
      setTimeout(() => window.hwStudio.renderSkillTree(), 50);
    }

    // Refresh Algorithm Library when entering Algorithms tab
    if (tabKey === 'algorithms' && window.algorithmLibrary) {
      setTimeout(() => window.algorithmLibrary.render(), 40);
    }

    // Refresh Quantum Maze Simulation when entering Overview tab
    if (tabKey === 'overview' && window.initQuantumMazeSim) {
      setTimeout(() => window.initQuantumMazeSim(), 60);
    }

    // Refresh Instructor Portal when entering instructor tab
    if (tabKey === 'instructor' && window.instructorPortal) {
      setTimeout(() => window.instructorPortal.loadCohorts(), 50);
    }

    // Trigger LaTeX / Math typesetter on view change
    if (window.renderAllMath) {
      setTimeout(() => window.renderAllMath(), 60);
    }
  }

  window.switchView = switchView;
  window.switchTab = switchView;

  // Dropdown toggle on click/tap for accessibility & touch devices
  const dropdownItems = document.querySelectorAll('.nav-dropdown-item');

  function closeAllDropdowns() {
    dropdownItems.forEach(g => {
      if (g.classList.contains('is-open')) {
        g.classList.remove('is-open');
        g.classList.add('just-closed');
        const t = g.querySelector('.nav-dropdown-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
        setTimeout(() => g.classList.remove('just-closed'), 350);
      }
    });
  }

  dropdownItems.forEach(group => {
    const trigger = group.querySelector('.nav-dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = group.classList.contains('is-open');
        // Close all other dropdowns
        dropdownItems.forEach(g => {
          g.classList.remove('is-open', 'just-closed');
          const t = g.querySelector('.nav-dropdown-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          group.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    }

    group.addEventListener('mouseleave', () => {
      group.classList.remove('just-closed');
    });
  });

  // Close dropdowns on outside click or Escape key (without stealing focus from inputs)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown-item')) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }
  });

  // Bind click on all nav items, rich dropdown items, and dropdown links
  document.querySelectorAll('.nav-item[data-tab], .dropdown-rich-item, .dropdown-link').forEach(item => {
    item.addEventListener('click', (e) => {
      const tab = item.getAttribute('data-tab');
      if (tab) {
        e.preventDefault();
        // Immediately close dropdowns and blur active element so it never stays stuck
        closeAllDropdowns();
        switchView(tab);
      }
    });
  });

  // Bind click on mobile nav drawer items
  document.querySelectorAll('.mobile-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      const tab = item.getAttribute('data-tab');
      if (tab) {
        e.preventDefault();
        window.closeMobileNav();
        switchView(tab);
      }
    });
  });

  const validAllTabs = [
    'overview', 'simulator', 'surface-code', 'pulse-studio',
    'transpiler', 'vqe-chemistry', 'algorithms', 'research',
    'intuition', 'challenges', 'docs', 'login', 'topic-roadmap'
  ];

  // Listen for browser hash changes (back/forward or URL typing)
  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (h && validAllTabs.includes(h)) {
      switchView(h);
    }
  });

  // Logo Click -> Overview
  const navLogoBtn = document.getElementById('nav-logo-btn');
  if (navLogoBtn) {
    navLogoBtn.addEventListener('click', () => switchView('overview'));
  }

  // Quick Action Buttons
  const quickLaunch = document.getElementById('btn-quick-launch');
  if (quickLaunch) {
    quickLaunch.addEventListener('click', () => switchView('simulator'));
  }

  const heroLaunch = document.getElementById('btn-hero-launch');
  if (heroLaunch) {
    heroLaunch.addEventListener('click', () => switchView('simulator'));
  }

  const heroAlgos = document.getElementById('btn-hero-algorithms');
  if (heroAlgos) {
    heroAlgos.addEventListener('click', () => switchView('algorithms'));
  }

  // ==========================================
  // 4. Real Authentication (scrypt-hashed passwords, HMAC-signed sessions,
  //    verified server-side in ananta-backend/utils/authService.js - see
  //    /api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout)
  // ==========================================
  // Privacy safeguard: automatically purge legacy hardcoded account from client localStorage
  try {
    const legacyUser = localStorage.getItem('ananta_user');
    if (legacyUser && legacyUser.toLowerCase().includes('anushkagupta')) {
      localStorage.removeItem('ananta_user');
    }
  } catch (e) {}

  const SESSION_TOKEN_KEY = 'ananta_session_token';
  const SESSION_USER_KEY = 'ananta_user';

  // Shared helper other modules (instructor-portal.js, etc) use to attach
  // real Authorization headers to protected API calls.
  window.AnantaAuth = {
    getToken() {
      try { return localStorage.getItem(SESSION_TOKEN_KEY) || ''; } catch (e) { return ''; }
    },
    getUser() {
      try {
        const raw = localStorage.getItem(SESSION_USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    isLoggedIn() {
      return Boolean(window.AnantaAuth.getToken());
    },
    isInstructor() {
      const u = window.AnantaAuth.getUser();
      return Boolean(window.AnantaAuth.getToken() && u && u.role === 'instructor');
    },
    authHeaders() {
      const token = window.AnantaAuth.getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
  };

  function getAuthRedirectTarget() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      const valid = ['overview', 'simulator', 'surface-code', 'pulse-studio', 'transpiler', 'vqe-chemistry', 'algorithms', 'research', 'intuition', 'challenges', 'docs', 'topic-roadmap'];
      if (redirect && valid.includes(redirect)) {
        return redirect;
      }
    } catch (e) {}

    // Check if hash has a destination other than login
    const hash = window.location.hash.replace('#', '');
    const valid = ['overview', 'simulator', 'surface-code', 'pulse-studio', 'transpiler', 'vqe-chemistry', 'algorithms', 'research', 'intuition', 'challenges', 'docs', 'topic-roadmap'];
    if (hash && hash !== 'login' && valid.includes(hash)) {
      return hash;
    }

    // Default entrance destination after login -> Overview Hero slide
    return 'overview';
  }

  // token is null for the honest, no-account "guest" mode (see
  // window.enterAsGuest below) - a guest's localStorage user object is
  // purely a display label and carries zero server privilege, since every
  // protected endpoint verifies the *signed token*, never the client's
  // claimed name/role.
  function completeLogin(userObj, token, targetTab) {
    if (!userObj.avatar) userObj.avatar = userObj.name ? userObj.name.charAt(0).toUpperCase() : 'Q';
    userObj.loggedInAt = new Date().toISOString();

    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(userObj));
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    updateNavUser();

    const dest = targetTab || getAuthRedirectTarget();
    const roleLabel = token ? userObj.role : 'guest — no account';
    showAuthSuccess(`✓ Signed in as ${userObj.name} (${roleLabel}). Entering Studio...`);

    setTimeout(() => {
      switchView(dest);
    }, 450);
  }

  window.completeLogin = completeLogin;
  window.getAuthRedirectTarget = getAuthRedirectTarget;

  function updateNavUser() {
    const userJson = localStorage.getItem('ananta_user');
    const userContainer = document.getElementById('nav-user-container');
    const loginBtn = document.getElementById('nav-login-btn');
    const userAvatar = document.getElementById('nav-user-avatar');
    const userName = document.getElementById('nav-user-name');
    const userRole = document.getElementById('nav-user-role');
    const mobileSignin = document.getElementById('mobile-nav-signin-link');
    const mobileUserBox = document.getElementById('mobile-nav-user-box');
    const mobileGreeting = document.getElementById('mobile-user-greeting');

    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (userContainer) userContainer.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (userAvatar) userAvatar.textContent = user.avatar || (user.name ? user.name.charAt(0).toUpperCase() : 'A');
        if (userName) userName.textContent = user.name || 'User';
        if (userRole) userRole.textContent = user.role || 'Quantum User';

        // Mobile drawer user state
        if (mobileSignin) mobileSignin.style.display = 'none';
        if (mobileUserBox) mobileUserBox.style.display = 'flex';
        if (mobileGreeting) mobileGreeting.textContent = `Signed in as ${user.name || 'User'} (${user.role || 'Active'})`;
        return true;
      } catch (e) {
        console.error('Error parsing user session', e);
      }
    }
    if (userContainer) userContainer.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (mobileSignin) mobileSignin.style.display = 'block';
    if (mobileUserBox) mobileUserBox.style.display = 'none';
    return false;
  }

  window.updateNavUser = updateNavUser;

  // If the login view is reached while already signed in, there is nothing
  // to show - just carry the user on to their destination.
  window.renderLoginSessionState = () => {
    if (window.AnantaAuth.isLoggedIn()) {
      switchView(getAuthRedirectTarget());
    }
  };

  let authMode = 'login';
  window.setAuthMode = (mode) => {
    authMode = mode === 'register' ? 'register' : 'login';
    const isRegister = authMode === 'register';

    const btnLogin = document.getElementById('btn-auth-mode-login');
    const btnRegister = document.getElementById('btn-auth-mode-register');
    if (btnLogin) btnLogin.classList.toggle('active', !isRegister);
    if (btnRegister) btnRegister.classList.toggle('active', isRegister);

    const fieldName = document.getElementById('auth-field-name');
    const fieldRole = document.getElementById('auth-field-role');
    if (fieldName) fieldName.style.display = isRegister ? 'block' : 'none';
    if (fieldRole) fieldRole.style.display = isRegister ? 'block' : 'none';

    const submitBtn = document.getElementById('btn-enter-studio');
    if (submitBtn) submitBtn.textContent = isRegister ? 'Create Account →' : 'Sign In →';

    const title = document.getElementById('auth-welcome-title');
    const desc = document.getElementById('auth-welcome-desc');
    if (title) title.textContent = isRegister ? 'Create your Quantum Studio account' : 'Sign in to the Quantum Studio';
    if (desc) desc.textContent = isRegister
      ? 'Pick "Instructor" if you need cohort management, gradebooks, and assignment dispatch.'
      : 'Real accounts, verified server-side. Instructor-only tools require signing in with the instructor role.';

    const passwordInput = document.getElementById('auth-password-input');
    if (passwordInput) passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');

    hideAuthBanners();
  };

  function hideAuthBanners() {
    const succ = document.getElementById('auth-success-banner');
    const err = document.getElementById('auth-error-banner');
    if (succ) succ.style.display = 'none';
    if (err) err.style.display = 'none';
  }

  function showAuthSuccess(msg) {
    const succBanner = document.getElementById('auth-success-banner');
    const errBanner = document.getElementById('auth-error-banner');
    if (errBanner) errBanner.style.display = 'none';
    if (succBanner) {
      succBanner.textContent = msg;
      succBanner.style.display = 'block';
    }
  }

  function showAuthError(msg) {
    const succBanner = document.getElementById('auth-success-banner');
    const errBanner = document.getElementById('auth-error-banner');
    if (succBanner) succBanner.style.display = 'none';
    if (errBanner) {
      errBanner.textContent = msg;
      errBanner.style.display = 'block';
    }
  }

  window.submitAuthForm = async () => {
    const submitBtn = document.getElementById('btn-enter-studio');
    const name = (document.getElementById('auth-name-input') || {}).value || '';
    const email = (document.getElementById('auth-email-input') || {}).value || '';
    const password = (document.getElementById('auth-password-input') || {}).value || '';
    const role = (document.getElementById('auth-role-select') || {}).value || 'explorer';

    hideAuthBanners();
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Please wait...'; }

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register' ? { name, email, password, role } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      completeLogin(data.user, data.token);
    } catch (err) {
      showAuthError(`✕ ${err.message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = authMode === 'register' ? 'Create Account →' : 'Sign In →';
      }
    }
  };

  // Honest, no-account convenience mode: a purely local display name with no
  // signed token, so it carries zero server-side privilege - every
  // protected endpoint (e.g. /api/instructor/*) verifies the real signed
  // session, never whatever a guest's local object claims.
  window.enterAsGuest = () => {
    completeLogin({
      name: 'Quantum Explorer',
      email: '',
      role: 'guest'
    }, null);
  };

  window.logoutUser = async () => {
    const token = window.AnantaAuth.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } catch (e) {}
    }
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    updateNavUser();
    switchView('login');
    showAuthSuccess('Signed out.');
  };

  // On load, if a session token is cached, verify it's still valid
  // server-side (it may have expired or been revoked) and refresh the
  // cached user - don't just trust what's sitting in localStorage.
  (async () => {
    const token = window.AnantaAuth.getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(data.user));
        updateNavUser();
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(SESSION_USER_KEY);
        updateNavUser();
      }
    } catch (e) {
      // Network hiccup - keep the cached session rather than logging the user
      // out over a transient failure; it'll be re-checked on next load.
    }
  })();

  const guestEntry = document.getElementById('btn-guest-entry');
  if (guestEntry) {
    guestEntry.addEventListener('click', () => window.enterAsGuest());
  }


  // ==========================================
  // 5. Circuit Controls & Safe Preset Helpers
  // ==========================================
  window.loadPresetSafe = function(presetKey) {
    if (!circuitUI) return;
    let targetGrid = null;
    let targetAlgo = null;
    let normalizedKey = presetKey;

    if (presetKey === 'bell' || presetKey === 'bell_phi_plus') {
      normalizedKey = 'bell';
      targetGrid = [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'bell_state.qc';
      if (window.ALGORITHM_CATALOG) targetAlgo = window.ALGORITHM_CATALOG.find(a => a.id === 'bell_phi_plus');
    } else if (presetKey === 'ghz') {
      normalizedKey = 'ghz';
      targetGrid = [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', 'CX_CTRL', null, null, null],
        [null, null, 'CX_TGT', null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'ghz_state_tripartite.qc';
    } else if (presetKey === 'teleport') {
      normalizedKey = 'teleport';
      targetGrid = [
        ['H', null, 'CX_CTRL', 'H', null, null],
        [null, 'H', 'CX_TGT', null, 'CX_CTRL', null],
        [null, null, 'CX_TGT', null, 'CX_TGT', null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'quantum_teleportation.qc';
    } else if (presetKey === 'grover' || presetKey === 'grover_2qubit') {
      normalizedKey = 'grover';
      targetGrid = [
        ['H', 'Z', 'H', 'X', 'H', null],
        ['H', 'CX_TGT', 'H', 'X', 'H', null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'grover_search.qc';
      if (window.ALGORITHM_CATALOG) targetAlgo = window.ALGORITHM_CATALOG.find(a => a.id === 'grover_2qubit');
    } else if (presetKey === 'vqe') {
      normalizedKey = 'vqe';
      targetGrid = [
        ['X', 'H', 'CX_CTRL', 'H', null, null],
        [null, 'H', 'CX_TGT', 'S', null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'vqe_molecular_h2.qc';
    } else if (presetKey === 'chsh') {
      normalizedKey = 'chsh';
      targetGrid = [
        ['H', 'CX_CTRL', 'H', null, null, null],
        [null, 'CX_TGT', 'S', 'H', null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'chsh_bell_inequality.qc';
    } else if (presetKey === 'superposition') {
      normalizedKey = 'superposition';
      targetGrid = [
        ['H', null, null, null, null, null],
        ['H', null, null, null, null, null],
        ['H', null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'uniform_superposition.qc';
      if (window.ALGORITHM_CATALOG) targetAlgo = window.ALGORITHM_CATALOG.find(a => a.id === 'superposition_3' || a.id === 'superposition');
    } else if (presetKey === 'qft') {
      normalizedKey = 'qft';
      targetGrid = [
        ['H', 'S', 'T', null, null, null],
        [null, null, 'H', 'S', null, null],
        [null, null, null, null, 'H', null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'quantum_fourier_transform.qc';
    } else if (presetKey === 'decoherence') {
      normalizedKey = 'decoherence';
      targetGrid = [
        ['X', 'H', 'Z', 'H', null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'decoherence_lindblad_ramsey.qc';
    } else if (presetKey === 'density_matrix') {
      normalizedKey = 'density_matrix';
      targetGrid = [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'density_matrix_mixed.qc';
    } else if (presetKey === 'pauli_observables') {
      normalizedKey = 'pauli_observables';
      targetGrid = [
        ['H', 'Z', 'X', null, null, null],
        [null, 'H', null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'pauli_observables.qc';
    } else if (presetKey === 'qasm_circuit') {
      normalizedKey = 'qasm_circuit';
      targetGrid = [
        ['H', 'CX_CTRL', 'S', null, null, null],
        [null, 'CX_TGT', 'T', null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'openqasm_ast_synthesis.qc';
    } else if (presetKey === 'qaoa') {
      normalizedKey = 'qaoa';
      targetGrid = [
        ['H', 'CX_CTRL', 'Z', 'CX_CTRL', 'H', null],
        ['H', 'CX_TGT', null, 'CX_TGT', 'H', null],
        ['H', null, null, null, 'H', null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'qaoa_maxcut_graph.qc';
    } else if (presetKey === 'qml') {
      normalizedKey = 'qml';
      targetGrid = [
        ['H', 'S', 'CX_CTRL', 'Z', 'CX_CTRL', null],
        ['H', 'T', 'CX_TGT', null, 'CX_TGT', null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'qml_quantum_kernel.qc';
    } else if (presetKey === 'pulse_drag') {
      normalizedKey = 'pulse_drag';
      targetGrid = [
        ['H', 'X', 'H', 'T', null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'pulse_drag_envelope.qc';
    } else if (presetKey === 'pqc_shor') {
      normalizedKey = 'pqc_shor';
      targetGrid = [
        ['H', 'CX_CTRL', 'H', null, null, null],
        ['H', 'CX_TGT', 'CX_CTRL', 'H', null, null],
        ['X', null, 'CX_TGT', null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'pqc_shor_factoring.qc';
    } else if (presetKey === 'cryo_transmon') {
      normalizedKey = 'cryo_transmon';
      targetGrid = [
        ['X', 'S', 'T', 'H', null, null],
        ['X', 'H', null, null, null, null],
        [null, null, null, null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'cryo_transmon_15mk.qc';
    } else if (presetKey === 'entanglement_swapping') {
      normalizedKey = 'entanglement_swapping';
      targetGrid = [
        ['H', 'CX_CTRL', null, null, null, null],
        [null, 'CX_TGT', 'CX_CTRL', 'H', null, null],
        [null, null, 'CX_TGT', null, null, null]
      ];
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'quantum_internet_repeater.qc';
    } else if (window.ALGORITHM_CATALOG) {
      targetAlgo = window.ALGORITHM_CATALOG.find(a => a.id === presetKey);
      if (targetAlgo) targetGrid = targetAlgo.grid;
    }

    if (targetGrid) {
      circuitUI.loadPreset(targetGrid, normalizedKey);
      if (circuitUI.updatePresetHighlight) {
        circuitUI.updatePresetHighlight(normalizedKey);
      }
      if (targetAlgo && circuitUI.startAlgorithmTour) {
        circuitUI.startAlgorithmTour(targetAlgo);
      }
    }
  };

  // Drawer Toggle Handlers for Clean Workspace
  // Drawer Toggle Handlers for Clean Workspace
  window.toggleKnowledgeEngineDrawer = function() {
    const drawer = document.getElementById('ke-collapsible-drawer');
    const btn = document.getElementById('btn-toggle-ke-drawer');
    if (!drawer) return;
    drawer.classList.toggle('drawer-open');
    if (drawer.classList.contains('drawer-open')) {
      const inp = document.getElementById('ke-search-input');
      if (inp) {
        setTimeout(() => {
          inp.focus();
          inp.select();
        }, 50);
      }
      if (btn) btn.classList.add('active');
    } else {
      if (btn) btn.classList.remove('active');
    }
  };

  window.toggleHardwareLabDrawer = function() {
    const drawer = document.getElementById('hw-collapsible-drawer');
    const btn = document.getElementById('btn-toggle-hw-drawer');
    if (!drawer) return;
    drawer.classList.toggle('drawer-open');
    if (drawer.classList.contains('drawer-open')) {
      if (btn) btn.classList.add('active');
    } else {
      if (btn) btn.classList.remove('active');
    }
  };

  const btnClearCirc = document.getElementById('btn-clear-circ');
  if (btnClearCirc) {
    btnClearCirc.addEventListener('click', () => {
      circuitUI.clearCircuit();
      const lbl = document.getElementById('circuit-filename-label');
      if (lbl) lbl.textContent = 'untitled_circuit.qc';
    });
  }

  // Scroll to composer helper (used by KE load buttons)
  window.scrollToComposer = function() {
    switchView('simulator');
    const composerEl = document.getElementById('view-simulator');
    if (composerEl) composerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ==========================================
  // 6. Quantum Knowledge Engine (Live AI + Offline Corpus)
  // ==========================================
  const keEngine = window.QuantumKnowledgeEngine ? new window.QuantumKnowledgeEngine() : null;
  if (keEngine) {
    const keInput = document.getElementById('ke-search-input');
    const keBtn = document.getElementById('btn-ke-search');
    const keResultPanel = document.getElementById('ke-result-panel');
    const keResultInner = document.getElementById('ke-result-inner');
    const keCollapseBtn = document.getElementById('btn-ke-collapse');
    const keBar = document.getElementById('knowledge-engine-bar');
    const keInputWrap = document.querySelector('.ke-input-wrapper');

    // Make whole search wrapper focus the input on click
    if (keInputWrap && keInput) {
      keInputWrap.addEventListener('click', (e) => {
        if (e.target !== keBtn && !keBtn.contains(e.target)) {
          keInput.focus();
        }
      });
    }

    async function runKESearch(query) {
      if (!query || query.trim().length < 2) return;
      const q = query.trim();
      if (!keResultPanel || !keResultInner) return;

      // Ensure drawer is open
      const drawer = document.getElementById('ke-collapsible-drawer');
      const drawerBtn = document.getElementById('btn-toggle-ke-drawer');
      if (drawer && !drawer.classList.contains('drawer-open')) {
        drawer.classList.add('drawer-open');
        if (drawerBtn) drawerBtn.classList.add('active');
      }

      // Show immediate loading indicator
      keResultInner.innerHTML = `
        <div class="ke-loading-box">
          <div class="ke-loading-spinner"></div>
          <div class="ke-loading-text">
            <h4>Synthesizing Research Breakdown</h4>
            <p>Consulting quantum physics models for <strong>"${q}"</strong> via AI backend...</p>
          </div>
        </div>`;
      keResultPanel.style.display = 'block';
      keResultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // 1. Try Live AI Synthesis via Multi-Provider Backend (Google AI Studio / Grok)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const apiBase = (window.location && window.location.origin) ? window.location.origin : '';
        const response = await fetch(`${apiBase}/api/gemini`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            task: 'knowledge-engine',
            payload: { query: q }
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const topic = data.result || data.topic;
          const source = data.source || 'gemini';
          if (topic && topic.title && topic.definition) {
            keResultInner.innerHTML = keEngine.renderCard(topic, source);
            if (window.renderAllMath) {
              try { window.renderAllMath(); } catch (e) {}
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[Knowledge Engine] Live AI fetch note:', err.message);
      }

      // 2. Offline / network fallback: search deterministic local corpus
      const localTopic = keEngine.search(q);
      if (localTopic) {
        keResultInner.innerHTML = keEngine.renderCard(localTopic, 'deterministic-corpus');
        if (window.renderAllMath) {
          try { window.renderAllMath(); } catch (e) {}
        }
      } else {
        keResultInner.innerHTML = `
          <div class="ke-no-result">
            <div class="ke-no-result-icon">🔭</div>
            <h4>No local topic found for "<em>${q}</em>"</h4>
            <p>Connect to the backend with a valid GEMINI_API_KEY to synthesize any advanced quantum research concept, or try: superposition, entanglement, VQE, QFT, Grover's algorithm, decoherence, surface codes, Shor's algorithm, phase kickback, Bloch sphere, quantum teleportation, QAOA, T gate, density matrix...</p>
          </div>`;
      }
    }

    if (keBtn) {
      keBtn.addEventListener('click', (e) => {
        e.preventDefault();
        runKESearch(keInput ? keInput.value : '');
      });
    }

    if (keInput) {
      keInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          runKESearch(keInput.value);
        }
      });
    }

    // Quick chip buttons
    document.querySelectorAll('.ke-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const topic = chip.getAttribute('data-topic');
        if (keInput) keInput.value = topic;
        runKESearch(topic);
      });
    });

    // Collapse toggle
    if (keCollapseBtn && keBar) {
      keCollapseBtn.addEventListener('click', () => {
        const isCollapsed = keBar.classList.toggle('ke-collapsed');
        keCollapseBtn.textContent = isCollapsed ? 'v Expand' : '^ Collapse';
      });
    }
  }

  // ==========================================
  // 7. Pauli Expectation Gauges
  // ==========================================
  function renderPauliGauges() {
    const gaugesGrid = document.getElementById('pauli-gauges-grid');
    if (!gaugesGrid || !engine) return;

    const expectations = engine.computePauliExpectations();
    gaugesGrid.innerHTML = '';

    expectations.forEach(({ qubit, Z, X, Y }) => {
      const card = document.createElement('div');
      card.className = 'pauli-qubit-card';

      const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(3);
      const bar = (v, cls) => {
        const pct = Math.round(((v + 1) / 2) * 100);
        const fill = Math.round(Math.abs(v) * 50);
        const side = v >= 0 ? 'right' : 'left';
        return `<div class="pauli-bar-track">
          <div class="pauli-bar-fill ${cls}" style="width:${fill}px; ${side === 'right' ? 'left:50%' : 'right:50%'}"></div>
          <div class="pauli-bar-center"></div>
        </div>`;
      };

      card.innerHTML = `
        <div class="pauli-qubit-label">q[${qubit}]</div>
        <div class="pauli-row">
          <span class="pauli-obs pauli-obs-z">Z</span>
          <span class="pauli-val">${fmt(Z)}</span>
          ${bar(Z, 'pbar-z')}
        </div>
        <div class="pauli-row">
          <span class="pauli-obs pauli-obs-x">X</span>
          <span class="pauli-val">${fmt(X)}</span>
          ${bar(X, 'pbar-x')}
        </div>
        <div class="pauli-row">
          <span class="pauli-obs pauli-obs-y">Y</span>
          <span class="pauli-val">${fmt(Y)}</span>
          ${bar(Y, 'pbar-y')}
        </div>
      `;
      gaugesGrid.appendChild(card);
    });
  }

  // Hook into existing circuit update events
  const origUpdateVis = window._quantaUpdateVisualizers;
  window._renderPauliGauges = renderPauliGauges;
  // Initial render
  setTimeout(renderPauliGauges, 600);

  // ==========================================
  // 8. Framework Code Export Tabs (Qiskit / QASM / PennyLane)
  // ==========================================
  const exportTabBtns = document.querySelectorAll('.export-tab-btn');
  const exportCodeEl = document.getElementById('qiskit-code');
  const exportCopyBtn = document.getElementById('btn-copy-qiskit');
  const exportFrameworkLabel = document.getElementById('export-framework-label');
  // Default must match whichever tab button carries .active in the markup.
  let activeExportTab = (document.querySelector('.export-tab-btn.active')
    || {}).dataset?.export || 'cirq';

  const EXPORT_BADGES = {
    qiskit: 'Qiskit 1.x compatible',
    cirq: 'Google Cirq >= 1.3 - Willow & Sycamore QPU ready',
    braket: 'Amazon Braket SDK >= 1.7 - IonQ / Rigetti / QuEra ready',
    pennylane: 'PennyLane >= 0.38 (Xanadu)',
    qasm: 'OpenQASM 2.0 standard'
  };

  function updateExportCode() {
    if (!circuitUI || !exportCodeEl) return;
    const grid = circuitUI.getGrid ? circuitUI.getGrid() : circuitUI.grid;
    if (!grid) return;

    // Generate through the engine's single export entry point so this panel
    // can never fall behind when a framework or gate is added to the engine.
    exportCodeEl.textContent = engine.exportCode(grid, activeExportTab);
    if (exportFrameworkLabel) {
      exportFrameworkLabel.textContent = EXPORT_BADGES[activeExportTab] || activeExportTab;
    }
  }

  // circuit-ui.js re-renders the composer on every gate change. It used to
  // write Qiskit into this same <code> element unconditionally, which stomped
  // the user's framework choice: picking Cirq then touching the circuit put
  // Qiskit source under a "Google Cirq" heading. It now calls back here so
  // there is exactly one writer, and it honours the selected tab.
  window.anantaRenderExportCode = updateExportCode;

  exportTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      exportTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeExportTab = btn.getAttribute('data-export');
      updateExportCode();
    });
  });

  // Paint once on load so the panel never shows the placeholder text.
  updateExportCode();

  if (exportCopyBtn) {
    exportCopyBtn.addEventListener('click', () => {
      const code = exportCodeEl ? exportCodeEl.textContent : '';
      navigator.clipboard.writeText(code).then(() => {
        exportCopyBtn.textContent = 'Copied!';
        setTimeout(() => { exportCopyBtn.textContent = 'Copy Code'; }, 2000);
      }).catch(() => {
        exportCopyBtn.textContent = 'Copy Code';
      });
    });
  }

  // Patch existing copy buttons if they exist
  const oldQasmBtn = document.getElementById('btn-copy-qasm');
  if (oldQasmBtn) {
    oldQasmBtn.addEventListener('click', () => {
      if (!circuitUI) return;
      const grid = circuitUI.getGrid ? circuitUI.getGrid() : circuitUI.grid;
      if (!grid) return;
      navigator.clipboard.writeText(engine.toQASM(grid)).then(() => {
        oldQasmBtn.textContent = 'Copied!';
        setTimeout(() => { oldQasmBtn.textContent = 'Copy QASM'; }, 2000);
      });
    });
  }

  // Initial export code population
  setTimeout(updateExportCode, 500);

  // Re-render exports and gauges after circuit changes
  // Patch into existing circuitUI state update
  if (circuitUI && circuitUI.onStateUpdate) {
    const origUpdate = circuitUI.onStateUpdate.bind(circuitUI);
    circuitUI.onStateUpdate = function(...args) {
      origUpdate(...args);
      updateExportCode();
      renderPauliGauges();
    };
  }



  // ==========================================
  // 8. Research Library Engine
  // ==========================================
  const researchGrid = document.getElementById('research-grid-container');
  const searchInput = document.getElementById('research-search-input');
  const clearSearchBtn = document.getElementById('btn-clear-search');
  const catPills = document.querySelectorAll('.cat-pill');
  const resultsCounter = document.getElementById('research-results-count');

  let activeCategory = 'all';
  let searchQuery = '';

  function renderResearchLibrary() {
    if (!researchGrid || !window.QUANTUM_RESEARCH_PAPERS) return;

    // Filter papers
    const filtered = window.QUANTUM_RESEARCH_PAPERS.filter(p => {
      const matchesCat = activeCategory === 'all' || p.category === activeCategory;
      if (!matchesCat) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const titleMatch = p.title && p.title.toLowerCase().includes(q);
      const authorMatch = p.authors && p.authors.toLowerCase().includes(q);
      const abstractMatch = p.abstract && p.abstract.toLowerCase().includes(q);
      const venueMatch = p.venue && p.venue.toLowerCase().includes(q);
      const yearMatch = p.year && p.year.toString().includes(q);
      const arxivMatch = p.arxiv && p.arxiv.toLowerCase().includes(q);
      return titleMatch || authorMatch || abstractMatch || venueMatch || yearMatch || arxivMatch;
    });

    // Update counts
    updateCategoryCounts();

    if (resultsCounter) {
      resultsCounter.textContent = `Showing ${filtered.length} of ${window.QUANTUM_RESEARCH_PAPERS.length} publications`;
    }

    if (filtered.length === 0) {
      researchGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;">
          <h3 style="font-size: 18px; margin-bottom: 8px; color: var(--text-white);">No matching publications found</h3>
          <p style="font-size: 13px; color: var(--text-dim);">Try adjusting your search query or switching categories.</p>
        </div>
      `;
      return;
    }

    researchGrid.innerHTML = '';
    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'paper-card';

      const catBadgeClass = `badge-${p.category}`;
      const catBadgeLabel = p.category.replace('-', ' ').toUpperCase();

      const simulateBtn = p.circuitPreset ? `
        <button class="btn-paper-simulate" onclick="window.loadCircuitFromPaper('${p.circuitPreset}')">
          ⚡ Simulate in Ananta
        </button>
      ` : '';

      const pdfLink = p.pdfUrl ? `
        <a href="${p.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-paper-pdf">
          📄 View PDF / Source ↗
        </a>
      ` : '';

      card.id = `paper-card-${p.id}`;

      card.innerHTML = `
        <div class="paper-top-row">
          <span class="paper-badge ${catBadgeClass}">${catBadgeLabel}</span>
          <span class="paper-year">${p.year}</span>
        </div>
        <h3 class="paper-title">${p.title}</h3>
        <div class="paper-authors">${p.authors}</div>
        <div class="paper-venue">${p.venue}</div>
        <p class="paper-abstract">${p.abstract}</p>
        <div class="paper-actions-bar">
          ${simulateBtn}
          <button class="btn-paper-aisummary" id="btn-aisummary-${p.id}" onclick="window.togglePaperAiSummary('${p.id}')">
            🧠 AI Summary
          </button>
          <button class="btn-paper-cite" onclick="window.openBibtexModal('${p.id}')">
            Cite BibTeX
          </button>
          ${pdfLink}
        </div>
        <div class="paper-ai-summary-drawer" id="paper-summary-drawer-${p.id}"></div>
      `;
      researchGrid.appendChild(card);
    });
  }

  // Per-paper on-card AI Summary toggle
  window.__PAPER_AI_SUMMARY_CACHE = window.__PAPER_AI_SUMMARY_CACHE || {};

  // Where a card should send the reader: an open-access copy the backend
  // actually managed to read beats the stored link (17 of the stored PDF
  // links are 404/403), and a DOI resolver always lands on the real record.
  function bestPaperLink(paper, resolvedUrl) {
    return resolvedUrl
      || paper.pdfUrl
      || (paper.doi ? `https://doi.org/${paper.doi}` : null);
  }

  function renderPaperSummaryDrawer(drawer, paper, info) {
    const { summaryText, fullTextAvailable, aiUsed, aiModel, aiError, sourceChars, resolvedUrl, cachedLabel } = info;

    // Say exactly what produced this text. Claiming "AI Synthesized" while
    // quietly serving an offline extract of the same abstract is what made
    // the feature look broken.
    let badge;
    let badgeColor;
    if (aiUsed) {
      badge = fullTextAvailable
        ? `AI (${aiModel || 'model'}) — full paper read${sourceChars ? `, ${Math.round(sourceChars / 1000)}k chars` : ''}`
        : `AI (${aiModel || 'model'}) — abstract only, no readable full text`;
      badgeColor = fullTextAvailable ? '#34d399' : '#fbbf24';
    } else {
      badge = `Offline extract — AI unavailable${aiError ? `: ${String(aiError).slice(0, 90)}` : ''}`;
      badgeColor = '#f87171';
    }
    if (cachedLabel) badge = `${cachedLabel} · ${badge}`;

    const link = bestPaperLink(paper, resolvedUrl);
    const clickHint = link ? '<span class="paper-ai-summary-open-hint">Click to open the real paper ↗</span>' : '';

    drawer.innerHTML = `
      <div class="paper-ai-summary-header">
        <span>🧠 Executive Research Summary</span>
        <span style="font-size: 10px; opacity: 0.85; color: ${badgeColor};">${badge}</span>
      </div>
      <p class="paper-ai-summary-text">${summaryText}</p>
      ${clickHint}
    `;

    if (link) {
      drawer.style.cursor = 'pointer';
      drawer.title = 'Open the real research paper';
      drawer.onclick = () => window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      drawer.style.cursor = 'default';
      drawer.onclick = null;
    }
  }

  window.togglePaperAiSummary = async function(paperId) {
    const drawer = document.getElementById(`paper-summary-drawer-${paperId}`);
    const btn = document.getElementById(`btn-aisummary-${paperId}`);
    if (!drawer) return;

    if (drawer.style.display === 'block') {
      drawer.style.display = 'none';
      if (btn) btn.innerHTML = '🧠 AI Summary';
      return;
    }

    drawer.style.display = 'block';
    if (btn) btn.innerHTML = '🧠 Hide Summary';

    const paper = (window.QUANTUM_RESEARCH_PAPERS || []).find(p => p.id === paperId);
    if (!paper) return;

    if (window.__PAPER_AI_SUMMARY_CACHE[paperId]) {
      const cached = window.__PAPER_AI_SUMMARY_CACHE[paperId];
      renderPaperSummaryDrawer(drawer, paper, { ...cached, cachedLabel: 'Cached' });
      return;
    }

    drawer.innerHTML = `
      <div style="color: #34d399; font-size: 12px; display: flex; align-items: center; gap: 8px; padding: 4px 0;">
        <span style="display:inline-block; width:12px; height:12px; border:2px solid #34d399; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
        ${paper.pdfUrl ? 'Fetching and reading the actual paper…' : 'Synthesizing executive scientific summary...'}
      </div>
    `;

    try {
      // Fetch the REAL paper text (PDF/arXiv full body) whenever a source
      // URL exists, instead of re-summarizing the same short abstract
      // already shown on the card - that shortcut is why the "summary"
      // used to look identical to the card text (there was nothing more
      // in it to condense).
      // Send the identifiers too: when the stored PDF link is dead or
      // paywalled the backend uses the DOI/arXiv id to find an open-access
      // copy instead of silently falling back to this same blurb.
      const requestBody = paper.pdfUrl
        ? { url: paper.pdfUrl, doi: paper.doi || null, title: paper.title, arxiv: paper.arxiv || null }
        : { text: paper.abstract, title: paper.title, doi: paper.doi || null };

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await res.json();
      const info = {
        summaryText: data.summary || paper.abstract,
        fullTextAvailable: Boolean(data.fullTextAvailable),
        aiUsed: Boolean(data.aiUsed),
        aiModel: data.aiModel || null,
        aiError: data.aiError || null,
        sourceChars: data.sourceChars || 0,
        resolvedUrl: data.sourceUrl || null
      };
      window.__PAPER_AI_SUMMARY_CACHE[paperId] = info;
      renderPaperSummaryDrawer(drawer, paper, info);
    } catch (err) {
      renderPaperSummaryDrawer(drawer, paper, {
        summaryText: paper.abstract,
        fullTextAvailable: false,
        aiUsed: false,
        aiError: `request failed (${err.message})`
      });
    }
  };

  // ==========================================
  // 8A. TOPIC-WISE CROSS-PAPER SYNTHESIS ENGINE
  // ==========================================
  let currentPapersViewMode = 'per-paper';
  window.__TOPIC_SYNTHESIS_CACHE = window.__TOPIC_SYNTHESIS_CACHE || {};

  window.switchPapersView = function(mode) {
    currentPapersViewMode = mode;
    const btnPerPaper = document.getElementById('btn-view-per-paper');
    const btnTopic = document.getElementById('btn-view-topic-synthesis');
    const badge = document.getElementById('topic-synthesis-badge');
    const papersGrid = document.getElementById('research-grid-container');
    const topicContainer = document.getElementById('topic-synthesis-container');

    if (mode === 'topic-synthesis') {
      if (btnPerPaper) btnPerPaper.classList.remove('active');
      if (btnTopic) btnTopic.classList.add('active');
      if (badge) badge.style.display = 'inline-flex';
      if (papersGrid) papersGrid.style.display = 'none';
      if (topicContainer) topicContainer.style.display = 'block';
      renderTopicWiseSynthesis();
    } else {
      if (btnPerPaper) btnPerPaper.classList.add('active');
      if (btnTopic) btnTopic.classList.remove('active');
      if (badge) badge.style.display = 'none';
      if (papersGrid) papersGrid.style.display = 'grid';
      if (topicContainer) topicContainer.style.display = 'none';
      renderResearchLibrary();
    }
  };

  // Smoothly scrolls to a paper card and flashes a glowing pulse highlight
  window.scrollToPaper = function(paperId) {
    if (!paperId) return;

    if (currentPapersViewMode !== 'per-paper') {
      window.switchPapersView('per-paper');
    }

    const targetPaper = (window.QUANTUM_RESEARCH_PAPERS || []).find(p => p.id === paperId);
    if (targetPaper) {
      if (activeCategory !== 'all' && targetPaper.category !== activeCategory) {
        activeCategory = 'all';
        catPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-cat') === 'all'));
      }
      if (searchQuery) {
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      }
      renderResearchLibrary();
    }

    setTimeout(() => {
      const card = document.getElementById(`paper-card-${paperId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.remove('paper-card-highlighted');
        void card.offsetWidth;
        card.classList.add('paper-card-highlighted');
        setTimeout(() => {
          card.classList.remove('paper-card-highlighted');
        }, 2800);
      }
    }, 120);
  };

  // Format inline citation markers [paper-id] into clickable interactive badges
  function formatCitationsInText(text, topicPapers) {
    if (!text) return '';
    const paperLookup = new Map((topicPapers || []).map(p => [p.id, p]));
    (window.QUANTUM_RESEARCH_PAPERS || []).forEach(p => {
      if (!paperLookup.has(p.id)) paperLookup.set(p.id, p);
    });

    return text.replace(/\[([a-zA-Z0-9_\-]+(?:,\s*[a-zA-Z0-9_\-]+)*)\]/g, (match, idsStr) => {
      const ids = idsStr.split(',').map(s => s.trim());
      const buttons = ids.map(id => {
        const p = paperLookup.get(id);
        const label = p
          ? (p.title.length > 34 ? `${p.authors.split(',')[0].split(' ')[0]} ${p.year}` : p.title)
          : id;
        const fullTitle = p ? `${p.title} (${p.authors}, ${p.year})` : id;
        return `<button class="citation-marker" onclick="window.scrollToPaper('${id}')" title="Inspect source publication: ${fullTitle.replace(/"/g, '&quot;')}">${label}</button>`;
      }).join(' ');
      return buttons;
    });
  }

  function renderTopicWiseSynthesis() {
    const topicGrid = document.getElementById('topic-synthesis-grid');
    const statsBadge = document.getElementById('topic-synthesis-stats');
    if (!topicGrid || !window.QUANTUM_RESEARCH_PAPERS) return;

    // Dynamically cluster papers by their assigned topics
    const topicMap = new Map();
    window.QUANTUM_RESEARCH_PAPERS.forEach(p => {
      const topics = (p.topics && p.topics.length) ? p.topics : [p.category.replace('-', ' ')];
      topics.forEach(t => {
        if (!topicMap.has(t)) topicMap.set(t, []);
        topicMap.get(t).push(p);
      });
    });

    // Filter topics by active search query if present
    const q = searchQuery ? searchQuery.toLowerCase() : '';
    const entries = Array.from(topicMap.entries()).filter(([topic, papers]) => {
      if (!q) return true;
      if (topic.toLowerCase().includes(q)) return true;
      return papers.some(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.authors && p.authors.toLowerCase().includes(q)) ||
        (p.abstract && p.abstract.toLowerCase().includes(q))
      );
    });

    if (statsBadge) {
      statsBadge.textContent = `${entries.length} Concept Clusters Active`;
    }

    if (entries.length === 0) {
      topicGrid.innerHTML = `
        <div style="text-align: center; padding: 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;">
          <h3 style="font-size: 18px; margin-bottom: 8px; color: var(--text-white);">No topic clusters match your search</h3>
          <p style="font-size: 13px; color: var(--text-dim);">Try searching for terms like "superposition", "surface code", "error correction", or "VQE".</p>
        </div>
      `;
      return;
    }

    topicGrid.innerHTML = '';

    entries.forEach(([topic, papers]) => {
      const card = document.createElement('div');
      card.className = 'topic-card';
      const isMultiPaper = papers.length >= 2;
      const cached = window.__TOPIC_SYNTHESIS_CACHE[topic];

      // Paper pills
      const paperPillsHtml = papers.map(p => `
        <button class="topic-paper-pill" onclick="window.scrollToPaper('${p.id}')" title="Inspect paper: ${p.title.replace(/"/g, '&quot;')}">
          <span>📄</span>
          <strong>${p.year}</strong>
          <span>${p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title}</span>
        </button>
      `).join('');

      let contentHtml = '';
      if (!isMultiPaper) {
        // Single paper: show individual summary
        const p = papers[0];
        contentHtml = `
          <div class="topic-synthesis-body">
            <p class="topic-paragraph">
              <strong>Single-Paper Topic Anchor:</strong> ${formatCitationsInText(`[${p.id}] ${p.abstract}`, [p])}
            </p>
          </div>
        `;
      } else if (cached) {
        // Render synthesized narrative and takeaways with citations
        const paragraphsHtml = (cached.synthesis_paragraphs || []).map(para => `
          <p class="topic-paragraph">${formatCitationsInText(para.text, papers)}</p>
        `).join('');

        const takeawaysHtml = (cached.key_takeaways && cached.key_takeaways.length) ? `
          <div class="topic-takeaways-box">
            <div class="topic-takeaways-title">
              <span>⚡</span> Key Cross-Paper Takeaways & Citations
            </div>
            <ul class="topic-takeaways-list">
              ${cached.key_takeaways.map(t => `
                <li class="topic-takeaway-item">${formatCitationsInText(t.point, papers)}</li>
              `).join('')}
            </ul>
          </div>
        ` : '';

        contentHtml = `
          <div class="topic-synthesis-body">
            ${paragraphsHtml}
            ${takeawaysHtml}
          </div>
        `;
      } else {
        // Not yet synthesized: placeholder with instant synthesis trigger
        contentHtml = `
          <div class="topic-synthesis-body" id="topic-body-${encodeURIComponent(topic)}">
            <div style="background: rgba(56, 189, 248, 0.05); border: 1px dashed rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 18px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 13px;">
                Ready to synthesize findings across these <strong>${papers.length} publications</strong> with inline source citations.
              </p>
              <button onclick="window.synthesizeTopicForCard('${topic.replace(/'/g, "\\'")}')" class="btn-synthesize-all" style="font-size: 11.5px; padding: 6px 14px;">
                🧠 Synthesize Cross-Paper Findings
              </button>
            </div>
          </div>
        `;
      }

      const resynthesizeBtn = isMultiPaper ? `
        <button class="btn-topic-resynthesize" onclick="window.synthesizeTopicForCard('${topic.replace(/'/g, "\\'")}', true)" title="Re-synthesize this topic with latest AI">
          ${cached ? '🔄 Re-synthesize' : '⚡ Synthesize'}
        </button>
      ` : '';

      card.innerHTML = `
        <div class="topic-card-header">
          <div class="topic-card-title-group">
            <h4 class="topic-card-title">${topic}</h4>
            <span class="topic-papers-count">${papers.length} ${papers.length === 1 ? 'Paper' : 'Papers Analyzed'}</span>
          </div>
          <div class="topic-card-actions">
            ${resynthesizeBtn}
          </div>
        </div>
        <div class="topic-paper-pills">
          ${paperPillsHtml}
        </div>
        ${contentHtml}
      `;

      topicGrid.appendChild(card);
    });

    // Populate quick suggestion chips for arbitrary words
    const suggestContainer = document.getElementById('topic-quick-suggestions');
    if (suggestContainer && (!suggestContainer.dataset.initialized)) {
      suggestContainer.dataset.initialized = 'true';
      const dynamicKeywords = [
        'Decoherence', 'Teleportation', 'Fault Tolerance', 'Barren Plateaus',
        'Surface Codes', 'Superposition', 'Entanglement', 'Grover Search',
        'Shor Factoring', 'VQE', 'QAOA', 'Transmon', 'Anyons', 'Quantum Walks', 'BB84 QKD'
      ];
      suggestContainer.innerHTML = `
        <span class="quick-suggest-label">Try any term:</span>
        ${dynamicKeywords.map(kw => `
          <button class="quick-suggest-chip" onclick="window.synthesizeAnyWord('${kw}')">${kw}</button>
        `).join('')}
      `;
    }

    // Auto-synthesize the first 2 visible multi-paper topics on first load if not yet cached
    const needsAuto = entries.filter(([t, p]) => p.length >= 2 && !window.__TOPIC_SYNTHESIS_CACHE[t]).slice(0, 2);
    if (needsAuto.length > 0) {
      setTimeout(() => {
        needsAuto.forEach(([topic]) => {
          window.synthesizeTopicForCard(topic, false);
        });
      }, 200);
    }
  }

  // ==========================================
  // ASK / SYNTHESIZE ANY WORD OR CONCEPT DYNAMICALLY
  // ==========================================
  window.synthesizeAnyWord = async function(customWord = null) {
    const input = document.getElementById('topic-custom-input');
    const term = (customWord || (input ? input.value : '')).trim();
    if (!term) {
      alert('Please enter any word or concept to synthesize across research papers (e.g. "decoherence", "teleportation", "fault tolerance", "vqe")');
      return;
    }
    if (input) input.value = term;

    const showcase = document.getElementById('topic-custom-result-showcase');
    if (!showcase) return;

    showcase.style.display = 'block';
    showcase.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--accent-blue); border-radius: 14px; padding: 26px; text-align: center; color: #38bdf8; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
        <span style="display:inline-block; width:22px; height:22px; border:2px solid #38bdf8; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-bottom: 12px;"></span>
        <h3 style="margin: 0 0 6px 0; color: #ffffff; font-size: 17px;">Scanning publications and synthesizing: "${term}"...</h3>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">Analyzing paper abstracts, methodologies, and findings across the entire quantum research corpus...</p>
      </div>
    `;
    showcase.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 1. Retrieve all matching papers from the corpus
    const termLower = term.toLowerCase();
    const queryTokens = termLower.split(/[\s,&+/\-_]+/).filter(w => w.length >= 3);

    let matchingPapers = (window.QUANTUM_RESEARCH_PAPERS || []).filter(p => {
      const text = `${p.title} ${p.abstract} ${p.authors} ${p.category} ${(p.topics || []).join(' ')}`.toLowerCase();
      if (text.includes(termLower)) return true;
      return queryTokens.length > 0 && queryTokens.some(tok => text.includes(tok));
    });

    // 2. If fewer than 2 papers found in local static corpus, search arXiv live via /api/search!
    if (matchingPapers.length < 2) {
      try {
        const arxivRes = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: term, num: 4 })
        });
        const arxivData = await arxivRes.json();
        if (arxivData.results && arxivData.results.length) {
          arxivData.results.forEach((r, idx) => {
            matchingPapers.push({
              id: `arxiv-${Date.now().toString(36)}-${idx}`,
              title: r.title,
              authors: r.authors || 'arXiv Researchers',
              year: r.published ? (parseInt(r.published) || 2024) : 2024,
              abstract: r.snippet || '',
              category: 'arxiv',
              pdfUrl: r.link
            });
          });
        }
      } catch (err) {
        console.warn('Live search notice:', err.message);
      }
    }

    if (matchingPapers.length === 0) {
      showcase.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 26px; text-align: center;">
          <h4 style="margin: 0 0 6px 0; color: #fff; font-size: 16px;">No research publications found for "${term}"</h4>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">Try searching for concepts like "decoherence", "teleportation", "fault tolerance", "vqe", "anyon", or "transmon".</p>
        </div>
      `;
      return;
    }

    // 3. Synthesize findings across the matching papers with citations
    try {
      const res = await fetch('/api/synthesize-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: term,
          papers: matchingPapers.map(p => ({
            id: p.id,
            title: p.title,
            authors: p.authors,
            year: p.year,
            abstract: p.abstract,
            category: p.category
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.synthesis_paragraphs) throw new Error(data.error || 'Failed to synthesize');

      // 4. Render customized synthesis showcase
      const paragraphsHtml = (data.synthesis_paragraphs || []).map(para => `
        <p class="topic-paragraph">${formatCitationsInText(para.text, matchingPapers)}</p>
      `).join('');

      const takeawaysHtml = (data.key_takeaways && data.key_takeaways.length) ? `
        <div class="topic-takeaways-box">
          <div class="topic-takeaways-title">
            <span>⚡</span> Key Cross-Paper Takeaways & Citations for "${term}"
          </div>
          <ul class="topic-takeaways-list">
            ${data.key_takeaways.map(t => `
              <li class="topic-takeaway-item">${formatCitationsInText(t.point, matchingPapers)}</li>
            `).join('')}
          </ul>
        </div>
      ` : '';

      const paperPillsHtml = matchingPapers.map(p => `
        <button class="topic-paper-pill" onclick="window.scrollToPaper('${p.id}')" title="Inspect paper: ${p.title.replace(/"/g, '&quot;')}">
          <span>📄</span>
          <strong>${p.year}</strong>
          <span>${p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title}</span>
        </button>
      `).join('');

      showcase.innerHTML = `
        <div class="topic-card" style="border-color: #38bdf8; box-shadow: 0 10px 30px rgba(56, 189, 248, 0.15);">
          <div class="topic-card-header">
            <div class="topic-card-title-group">
              <span style="font-size: 20px;">✨</span>
              <h4 class="topic-card-title">Live Cross-Paper Synthesis: "${term}"</h4>
              <span class="topic-papers-count">${matchingPapers.length} Publications Synthesized</span>
            </div>
            <div class="topic-card-actions">
              <button class="btn-topic-resynthesize" onclick="window.synthesizeAnyWord('${term.replace(/'/g, "\\'")}')" title="Re-synthesize with AI">
                🔄 Re-synthesize
              </button>
              <button class="btn-topic-resynthesize" onclick="document.getElementById('topic-custom-result-showcase').style.display='none'" title="Close">
                ✕ Close
              </button>
            </div>
          </div>
          <div class="topic-paper-pills">
            ${paperPillsHtml}
          </div>
          <div class="topic-synthesis-body">
            ${paragraphsHtml}
            ${takeawaysHtml}
          </div>
        </div>
      `;
    } catch (err) {
      showcase.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid #f87171; border-radius: 12px; padding: 20px; color: #f87171;">
          Failed to synthesize "${term}": ${err.message}
        </div>
      `;
    }
  };

  // Synthesize a specific topic dynamically via /api/synthesize-topic
  window.synthesizeTopicForCard = async function(topic, forceRefresh = false) {
    if (!topic) return;
    if (!forceRefresh && window.__TOPIC_SYNTHESIS_CACHE[topic]) {
      renderTopicWiseSynthesis();
      return;
    }

    const topicMap = new Map();
    (window.QUANTUM_RESEARCH_PAPERS || []).forEach(p => {
      const topics = (p.topics && p.topics.length) ? p.topics : [p.category];
      topics.forEach(t => {
        if (!topicMap.has(t)) topicMap.set(t, []);
        topicMap.get(t).push(p);
      });
    });

    const papers = topicMap.get(topic) || [];
    if (!papers.length) return;

    const bodyEl = document.getElementById(`topic-body-${encodeURIComponent(topic)}`);
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.25); border-radius: 8px; padding: 18px; text-align: center; color: #38bdf8; font-size: 13px;">
          <span style="display:inline-block; width:14px; height:14px; border:2px solid #38bdf8; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right: 8px;"></span>
          Synthesizing cross-paper analysis across ${papers.length} publications with inline citations...
        </div>
      `;
    }

    try {
      const res = await fetch('/api/synthesize-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          papers: papers.map(p => ({
            id: p.id,
            title: p.title,
            authors: p.authors,
            year: p.year,
            abstract: p.abstract,
            category: p.category
          }))
        })
      });

      const data = await res.json();
      if (res.ok && data.synthesis_paragraphs) {
        window.__TOPIC_SYNTHESIS_CACHE[topic] = data;
      }
    } catch (err) {
      console.warn('Synthesis error:', err);
    } finally {
      renderTopicWiseSynthesis();
    }
  };

  // Synthesizes all multi-paper topics in batches
  window.synthesizeAllTopics = async function() {
    const btn = document.getElementById('btn-synthesize-all');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Synthesizing All Topics...';
    }

    const topicMap = new Map();
    (window.QUANTUM_RESEARCH_PAPERS || []).forEach(p => {
      const topics = (p.topics && p.topics.length) ? p.topics : [p.category];
      topics.forEach(t => {
        if (!topicMap.has(t)) topicMap.set(t, []);
        topicMap.get(t).push(p);
      });
    });

    const multiTopics = Array.from(topicMap.keys()).filter(t => (topicMap.get(t) || []).length >= 2);

    for (const topic of multiTopics) {
      if (!window.__TOPIC_SYNTHESIS_CACHE[topic]) {
        await window.synthesizeTopicForCard(topic, false);
      }
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✅ All Topics Synthesized';
      setTimeout(() => {
        btn.innerHTML = '🧠 Synthesize All Topics';
      }, 3000);
    }
  };

  function updateCategoryCounts() {
    if (!window.QUANTUM_RESEARCH_PAPERS) return;
    const all = window.QUANTUM_RESEARCH_PAPERS.length;
    const counts = { all };

    window.QUANTUM_RESEARCH_PAPERS.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    Object.keys(counts).forEach(cat => {
      const el = document.getElementById(`count-${cat}`);
      if (el) el.textContent = counts[cat];
    });
  }

  // Category pill handlers
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat');
      if (currentPapersViewMode === 'per-paper') {
        renderResearchLibrary();
      } else {
        renderTopicWiseSynthesis();
      }
    });
  });

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'inline-block' : 'none';
      }
      if (currentPapersViewMode === 'per-paper') {
        renderResearchLibrary();
      } else {
        renderTopicWiseSynthesis();
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      if (currentPapersViewMode === 'per-paper') {
        renderResearchLibrary();
      } else {
        renderTopicWiseSynthesis();
      }
    });
  }

  // ==========================================
  // 8B. QUANTUM ALGORITHM ZOO EXPLORER ENGINE
  // ==========================================
  let activeZooCategory = 'all';
  let zooSearchQuery = '';

  // ==========================================
  // 8D. LIVE LITERATURE SEARCH (backend: /api/research/brief)
  // ==========================================
  let litSearchBusy = false;

  window.initLiteratureSearch = function() {
    const box = document.getElementById('litsearch-suggestions');
    if (!box || box.dataset.ready) return;
    box.dataset.ready = '1';

    // Seeded from the categories the archive already organises itself by, so
    // the prompts track the app rather than being a fixed list.
    const seeds = [...document.querySelectorAll('#research-category-pills .cat-pill')]
      .map(p => p.textContent.replace(/\(.*\)/, '').trim())
      .filter(t => t && !/^all$/i.test(t));

    box.innerHTML = seeds.slice(0, 7).map(t =>
      `<button type="button" class="litsearch-chip" onclick="window.runLiteratureSearch('${t.replace(/'/g, "\\'")}')">${t}</button>`
    ).join('');
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Safely embeds a value as a JS string literal inside a single-quoted HTML
   * attribute (e.g. onclick='fn(...)'). JSON.stringify handles every JS
   * escaping concern (backslashes, double quotes, newlines) but leaves a bare
   * apostrophe in the value — which would otherwise terminate the
   * single-quoted attribute early on a title like "Bell's theorem" — so that
   * one character gets HTML-entity-escaped on top.
   */
  function jsAttr(value) {
    return JSON.stringify(value == null ? '' : value).replace(/'/g, '&#39;');
  }

  /** Turns [P1] / [P1, P3] citation tags into links that scroll to the paper. */
  function linkCitations(text, papers) {
    const known = new Set(papers.map(p => p.id));
    return escapeHtml(text).replace(/\[([P0-9,\s]+)\]/g, (match, ids) => {
      const parts = ids.split(',').map(s => s.trim()).filter(id => known.has(id));
      if (!parts.length) return match;
      return parts.map(id =>
        `<a href="#litpaper-${id}" class="litsearch-cite" onclick="window.focusLitPaper('${id}');return false;">${id}</a>`
      ).join(' ');
    });
  }

  window.focusLitPaper = function(id) {
    const el = document.getElementById(`litpaper-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('litsearch-highlight');
    setTimeout(() => el.classList.remove('litsearch-highlight'), 1600);
  };

  window.runLiteratureSearch = async function(presetTopic) {
    const input = document.getElementById('litsearch-input');
    const status = document.getElementById('litsearch-status');
    const synthEl = document.getElementById('litsearch-synthesis');
    const grid = document.getElementById('litsearch-results');
    if (!input || !status || !grid) return;

    if (presetTopic) input.value = presetTopic;
    const topic = input.value.trim();
    if (!topic) { input.focus(); return; }
    if (litSearchBusy) return;

    litSearchBusy = true;
    const submit = document.getElementById('litsearch-submit');
    if (submit) { submit.disabled = true; submit.textContent = 'Searching…'; }

    status.className = 'litsearch-status is-busy';
    status.textContent = `Searching the literature for “${topic}” and preparing a synthesis…`;
    synthEl.innerHTML = '';
    grid.innerHTML = '';

    try {
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      const res = await fetch(`${base}/api/research/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, limit: 12 })
      });
      if (!res.ok) throw new Error(`Backend returned HTTP ${res.status}`);
      const data = await res.json();

      renderLiteratureResults(data);
    } catch (err) {
      status.className = 'litsearch-status is-error';
      status.textContent = `Could not complete the search: ${err.message}`;
    } finally {
      litSearchBusy = false;
      if (submit) { submit.disabled = false; submit.textContent = 'Search & Summarize'; }
    }
  };

  function renderLiteratureResults(data) {
    const status = document.getElementById('litsearch-status');
    const synthEl = document.getElementById('litsearch-synthesis');
    const grid = document.getElementById('litsearch-results');
    const papers = data.papers || [];

    const sourceSummary = (data.sources || [])
      .map(s => `${s.label}: ${s.error ? 'unavailable' : s.count}`)
      .join(' · ');

    status.className = 'litsearch-status';
    status.innerHTML = papers.length
      ? `Found <strong>${papers.length}</strong> publications for <strong>${escapeHtml(data.query)}</strong> &nbsp;·&nbsp; <span class="litsearch-sources">${escapeHtml(sourceSummary)}</span>`
      : `No publications matched “${escapeHtml(data.topic)}”. Try a broader or more specific phrase.`;

    if (data.synthesis && data.synthesis.synthesis_paragraphs) {
      const paras = data.synthesis.synthesis_paragraphs
        .map(p => `<p>${linkCitations(p.text, papers)}</p>`).join('');
      const takeaways = (data.synthesis.key_takeaways || [])
        .map(k => `<li>${linkCitations(k.point, papers)}</li>`).join('');

      synthEl.innerHTML = `
        <section class="litsearch-synthesis-card">
          <header class="litsearch-synthesis-head">
            <h2>Synthesis: ${escapeHtml(data.query)}</h2>
            <span class="litsearch-synth-badge">Cited across ${papers.length} sources</span>
          </header>
          <div class="litsearch-synthesis-body">${paras}</div>
          ${takeaways ? `<h3 class="litsearch-takeaway-head">Key takeaways</h3><ul class="litsearch-takeaways">${takeaways}</ul>` : ''}
        </section>
      `;
    } else if (data.synthesisError) {
      synthEl.innerHTML = `<section class="litsearch-synthesis-card is-muted">
        <p>Papers retrieved, but the synthesis step was unavailable: ${escapeHtml(data.synthesisError)}</p>
      </section>`;
    }

    grid.innerHTML = papers.map(p => {
      const meta = [p.year, p.venue, p.citationCount != null ? `${p.citationCount} citations` : null]
        .filter(Boolean).map(escapeHtml).join(' · ');
      const abstract = p.abstract
        ? escapeHtml(p.abstract.length > 420 ? p.abstract.slice(0, 420) + '…' : p.abstract)
        : '<em>No abstract published for this record.</em>';

      const readUrl = p.pdfUrl || p.url || '';
      return `
        <article class="paper-card litsearch-card" id="litpaper-${p.id}" style="cursor:pointer;"
          title="Click to open and read the full paper"
          onclick='window.openPaperReader(${jsAttr(readUrl)}, ${jsAttr(p.title)})'>
          <div class="paper-top-row">
            <span class="paper-badge badge-qml">${escapeHtml(p.id)} · ${escapeHtml(p.source)}</span>
            <span class="paper-year">${escapeHtml(p.year || '—')}</span>
          </div>
          <h3 class="paper-title">${escapeHtml(p.title)}</h3>
          <div class="paper-authors">${escapeHtml(p.authors)}</div>
          <div class="paper-venue">${meta}</div>
          <p class="paper-abstract">${abstract}</p>
          <div class="paper-actions-bar">
            ${p.url ? `<a href="${encodeURI(p.url)}" target="_blank" rel="noopener noreferrer" class="btn-paper-pdf" onclick="event.stopPropagation()">Open record ↗</a>` : ''}
            ${p.pdfUrl ? `<a href="${encodeURI(p.pdfUrl)}" target="_blank" rel="noopener noreferrer" class="btn-paper-pdf" onclick="event.stopPropagation()">PDF ↗</a>` : ''}
            ${p.doi ? `<a href="https://doi.org/${encodeURIComponent(p.doi)}" target="_blank" rel="noopener noreferrer" class="btn-paper-cite" onclick="event.stopPropagation()">DOI</a>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  // ==========================================
  // 8E. FULL PAPER READER — fetches the actual paper (not the abstract) and
  // summarizes *that*, opened by clicking anywhere on a result card.
  // ==========================================
  let paperReaderRequestId = 0;

  window.openPaperReader = async function(url, title) {
    const modal = document.getElementById('paper-reader-modal');
    const titleEl = document.getElementById('paper-reader-title');
    const metaEl = document.getElementById('paper-reader-meta');
    const statusEl = document.getElementById('paper-reader-status');
    const fullTextEl = document.getElementById('paper-reader-fulltext');
    const summarySection = document.getElementById('paper-reader-summary-section');
    const summaryEl = document.getElementById('paper-reader-summary');
    const sourceLink = document.getElementById('paper-reader-source-link');
    if (!modal) return;

    if (!url) {
      alert('This result has no readable source link.');
      return;
    }

    // Guards against a slow first fetch resolving after the user has already
    // opened a second paper — without this the first paper's content could
    // overwrite the second paper's modal after the fact.
    const requestId = ++paperReaderRequestId;
    const stillCurrent = () => requestId === paperReaderRequestId;

    modal.style.display = 'flex';
    titleEl.textContent = title || 'Research Paper';
    metaEl.textContent = '';
    statusEl.textContent = '⏳ Fetching the actual paper content…';
    fullTextEl.textContent = '';
    summarySection.style.display = 'none';
    summaryEl.textContent = '';
    sourceLink.href = url;

    try {
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      const res = await fetch(`${base}/api/fetch-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!stillCurrent()) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      titleEl.textContent = data.title || title || 'Research Paper';
      metaEl.textContent = `${data.length.toLocaleString()} characters extracted`;
      fullTextEl.textContent = data.text || '';

      statusEl.textContent = data.fullTextAvailable
        ? '✅ Full paper text extracted.'
        : '⚠️ Could not extract the full PDF body (it may be a scanned image or unreachable) — summarizing from whatever was retrieved.';

      // Summarize what was actually retrieved, not a title.
      statusEl.textContent += ' Generating summary…';
      const sumRes = await fetch(`${base}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text })
      });
      if (!stillCurrent()) return;
      const sumData = await sumRes.json();
      if (!sumRes.ok) throw new Error(sumData.error || `HTTP ${sumRes.status}`);

      summaryEl.textContent = sumData.summary || '(No summary returned.)';
      summarySection.style.display = 'block';
      statusEl.textContent = data.fullTextAvailable
        ? '✅ Summary generated from the full paper.'
        : '⚠️ Summary generated from partial content — the full PDF body was not extractable for this one.';
    } catch (err) {
      if (!stillCurrent()) return;
      statusEl.textContent = `❌ ${err.message}`;
    }
  };

  window.closePaperReader = function() {
    paperReaderRequestId++; // invalidate any in-flight fetch for this reader
    const modal = document.getElementById('paper-reader-modal');
    if (modal) modal.style.display = 'none';
  };

  window.switchResearchMode = function(mode) {
    const views = {
      search:  { sub: 'literature-search-subview', tab: 'tab-mode-search',  onShow: () => window.initLiteratureSearch() },
      papers:  { sub: 'research-papers-subview',   tab: 'tab-mode-papers',  onShow: () => renderResearchLibrary() },
      catalog: { sub: 'quantum-zoo-subview',       tab: 'tab-mode-catalog', onShow: () => renderZooLibrary() },
      library: { sub: 'resource-library-subview',  tab: 'tab-mode-library', onShow: () => window.loadResourceLibrary() }
    };

    Object.values(views).forEach(v => {
      const sub = document.getElementById(v.sub);
      const tab = document.getElementById(v.tab);
      if (sub) sub.style.display = 'none';
      if (tab) tab.classList.remove('active');
    });

    const view = views[mode] || views.search;
    const sub = document.getElementById(view.sub);
    const tab = document.getElementById(view.tab);
    if (sub) sub.style.display = 'block';
    if (tab) tab.classList.add('active');
    view.onShow();
  };

  // ==========================================
  // 8C. LIVE COMMUNITY RESOURCE LIBRARY (backend-fetched from GitHub)
  // ==========================================
  let resourceLibraryData = null;
  let reslibActiveSource = 'all';
  let reslibSearchQuery = '';
  let reslibLoading = false;

  window.loadResourceLibrary = async function(forceRefresh) {
    const grid = document.getElementById('reslib-grid-container');
    const counter = document.getElementById('reslib-results-count');
    if (resourceLibraryData && !forceRefresh) {
      renderResourceLibrary();
      return;
    }
    if (reslibLoading) return;
    reslibLoading = true;
    if (counter) counter.textContent = forceRefresh ? 'Refreshing from GitHub...' : 'Loading live resource library...';
    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;">
          <h3 style="font-size: 16px; color: var(--text-white);">⚡ Fetching curated resources live from GitHub…</h3>
          <p style="font-size: 13px; color: var(--text-dim); margin-top: 6px;">Parsing README links from the source repositories via the Ananta backend.</p>
        </div>
      `;
    }
    try {
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      const res = await fetch(`${base}/api/resources${forceRefresh ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error(`Backend returned HTTP ${res.status}`);
      const data = await res.json();
      resourceLibraryData = data;
      buildResourceLibrarySourcePills();
      renderResourceLibrary();
    } catch (err) {
      console.error('[ResourceLibrary] Load failed:', err);
      if (counter) counter.textContent = 'Could not reach the backend.';
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="font-size: 16px; color: var(--text-white);">⚠️ Resource library unavailable</h3>
            <p style="font-size: 13px; color: var(--text-dim); margin-top: 6px;">${err.message}. Make sure the Ananta backend server is running, then hit Refresh.</p>
          </div>
        `;
      }
    } finally {
      reslibLoading = false;
    }
  };

  function buildResourceLibrarySourcePills() {
    const wrap = document.getElementById('reslib-source-pills');
    if (!wrap || !resourceLibraryData) return;
    const sources = resourceLibraryData.sources || [];
    wrap.innerHTML = `<button class="cat-pill${reslibActiveSource === 'all' ? ' active' : ''}" data-reslib-source="all" onclick="window.setResourceLibrarySource('all')">All Sources (<span>${resourceLibraryData.totalItems}</span>)</button>` +
      sources.map(s => `
        <button class="cat-pill${reslibActiveSource === s.id ? ' active' : ''}" data-reslib-source="${s.id}" onclick="window.setResourceLibrarySource('${s.id}')" title="${s.description || ''}">
          ${s.label} (<span>${s.itemCount}</span>)${s.error ? ' ⚠️' : ''}
        </button>
      `).join('');
  }

  window.setResourceLibrarySource = function(sourceId) {
    reslibActiveSource = sourceId;
    document.querySelectorAll('#reslib-source-pills .cat-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-reslib-source') === sourceId);
    });
    renderResourceLibrary();
  };

  window.filterResourceLibrary = function() {
    const input = document.getElementById('reslib-search-input');
    const clearBtn = document.getElementById('reslib-clear-search');
    reslibSearchQuery = input ? input.value.trim() : '';
    if (clearBtn) clearBtn.style.display = reslibSearchQuery ? 'inline-block' : 'none';
    renderResourceLibrary();
  };

  window.clearResourceLibrarySearch = function() {
    const input = document.getElementById('reslib-search-input');
    if (input) input.value = '';
    reslibSearchQuery = '';
    const clearBtn = document.getElementById('reslib-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';
    renderResourceLibrary();
  };

  function renderResourceLibrary() {
    const grid = document.getElementById('reslib-grid-container');
    const counter = document.getElementById('reslib-results-count');
    if (!grid || !resourceLibraryData) return;

    const sources = resourceLibraryData.sources || [];
    let items = [];
    sources.forEach(s => {
      if (reslibActiveSource !== 'all' && s.id !== reslibActiveSource) return;
      (s.items || []).forEach(it => items.push({ ...it, sourceLabel: s.label, repoUrl: s.repoUrl }));
    });

    if (reslibSearchQuery) {
      const q = reslibSearchQuery.toLowerCase();
      items = items.filter(it =>
        (it.title && it.title.toLowerCase().includes(q)) ||
        (it.category && it.category.toLowerCase().includes(q)) ||
        (it.sourceLabel && it.sourceLabel.toLowerCase().includes(q))
      );
    }

    if (counter) {
      const totalFailed = sources.filter(s => s.error).length;
      counter.textContent = `Showing ${items.length} of ${resourceLibraryData.totalItems} resources` +
        (totalFailed ? ` (${totalFailed} source${totalFailed > 1 ? 's' : ''} temporarily unreachable)` : '');
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;">
          <h3 style="font-size: 18px; margin-bottom: 8px; color: var(--text-white);">No matching resources found</h3>
          <p style="font-size: 13px; color: var(--text-dim);">Try adjusting your search query or switching sources.</p>
        </div>
      `;
      return;
    }

    // Cap rendered cards for performance; the counter above still reflects the true match count.
    const MAX_RENDER = 300;
    grid.innerHTML = '';
    items.slice(0, MAX_RENDER).forEach(it => {
      const card = document.createElement('div');
      card.className = 'paper-card';
      card.innerHTML = `
        <div class="paper-top-row">
          <span class="paper-badge badge-qml">${escapeHtml(it.sourceLabel)}</span>
          <span class="paper-year">${escapeHtml(it.category)}</span>
        </div>
        <h3 class="paper-title">${escapeHtml(it.title)}</h3>
        <div class="paper-actions-bar">
          <a href="${it.url}" target="_blank" rel="noopener noreferrer" class="btn-paper-pdf">🔗 Open Resource ↗</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return (str || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let activeZooSpeedup = 'all';

  window.setZooSpeedupFilter = function(speedKey) {
    activeZooSpeedup = speedKey;
    document.querySelectorAll('.g-speedup-btn').forEach(btn => {
      if (btn.getAttribute('data-speed') === speedKey) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    renderZooLibrary();
  };

  window.setZooCategory = function(cat) {
    activeZooCategory = cat;
    document.querySelectorAll('.g-cat-chip').forEach(pill => {
      if (pill.getAttribute('data-zoocat') === cat) pill.classList.add('active');
      else pill.classList.remove('active');
    });
    renderZooLibrary();
  };

  window.filterZooAlgorithms = function() {
    const input = document.getElementById('zoo-search-input');
    const clearBtn = document.getElementById('btn-clear-zoo-search');
    zooSearchQuery = input ? input.value.trim() : '';
    if (clearBtn) clearBtn.style.display = zooSearchQuery ? 'inline-block' : 'none';
    renderZooLibrary();
  };

  window.clearZooSearch = function() {
    const input = document.getElementById('zoo-search-input');
    const clearBtn = document.getElementById('btn-clear-zoo-search');
    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    zooSearchQuery = '';
    renderZooLibrary();
  };

  /**
   * The source data's citation numbers ("[ 82 , 125 ]" inline in each
   * description) are keyed by a "number" field on each reference, not by the
   * reference's own id — and every algorithm's own `citations` array ships
   * empty, so the app's citation lookup (`a.citations.map(id => refs[id])`)
   * silently resolved nothing for any of the 74 algorithms. This builds the
   * number -> reference lookup once, lazily, from whatever is in the data.
   */
  let _zooRefsByNumber = null;
  function getZooReferenceByNumber(refs) {
    if (_zooRefsByNumber) return _zooRefsByNumber;
    _zooRefsByNumber = {};
    for (const key of Object.keys(refs)) {
      const r = refs[key];
      if (r && r.number != null) _zooRefsByNumber[String(r.number)] = r;
    }
    return _zooRefsByNumber;
  }

  /**
   * Escapes the description, then turns every inline "[ 82 ]" / "[ 82 , 125 ]"
   * marker into a clickable link to the actual reference — resolved from the
   * data itself, not a fixed mapping — leaving any number the data doesn't
   * define as plain text. $...$ math spans are left untouched here; KaTeX
   * typesets them afterward, once this HTML is in the DOM.
   */
  function renderZooDescription(text, refsByNumber) {
    const cited = new Map();
    const html = escapeHtml(text).replace(/\[\s*([\d\s,]+?)\s*\]/g, (match, nums) => {
      const parts = nums.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.length) return match;

      const links = parts.map(n => {
        const ref = refsByNumber[n];
        if (!ref) return n;
        if (!cited.has(ref.id)) cited.set(ref.id, ref);
        return `<a href="#zoo-ref-${ref.id}" class="g-inline-cite" onclick="window.focusZooReference('${ref.id}');return false;" title="${escapeHtml(ref.citation)}">${escapeHtml(n)}</a>`;
      });
      return `<sup class="g-cite-group">[${links.join(', ')}]</sup>`;
    });
    return { html, cited: [...cited.values()] };
  }

  window.focusZooReference = function(id) {
    const el = document.getElementById(`zoo-ref-${id}`);
    if (!el) return;
    const details = el.closest('details');
    if (details) details.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('litsearch-highlight');
    setTimeout(() => el.classList.remove('litsearch-highlight'), 1600);
  };

  function renderZooLibrary() {
    const zooGrid = document.getElementById('zoo-grid-container');
    const resultsCounter = document.getElementById('zoo-results-count');
    if (!zooGrid || !window.QUANTUM_ALGORITHM_ZOO) return;

    const zoo = window.QUANTUM_ALGORITHM_ZOO;
    const algos = zoo.algorithms || [];
    const refs = zoo.references || {};
    const refsByNumber = getZooReferenceByNumber(refs);

    const filtered = algos.filter(a => {
      // 1. Category check
      const matchesCat = activeZooCategory === 'all' || a.category === activeZooCategory;
      if (!matchesCat) return false;

      // 2. Speedup tier check
      const spLower = (a.speedup || '').toLowerCase();
      if (activeZooSpeedup === 'superpoly') {
        if (!spLower.includes('superpolynomial')) return false;
      } else if (activeZooSpeedup === 'poly') {
        if (!spLower.includes('polynomial') || spLower.includes('superpolynomial')) return false;
      } else if (activeZooSpeedup === 'expo') {
        if (!spLower.includes('exponential')) return false;
      }

      // 3. Search query check
      if (!zooSearchQuery) return true;
      const q = zooSearchQuery.toLowerCase();
      const nameMatch = a.name && a.name.toLowerCase().includes(q);
      const descMatch = a.description && a.description.toLowerCase().includes(q);
      const speedupMatch = a.speedup && a.speedup.toLowerCase().includes(q);
      const catMatch = a.category && a.category.toLowerCase().includes(q);
      return nameMatch || descMatch || speedupMatch || catMatch;
    });

    if (resultsCounter) {
      resultsCounter.textContent = `Showing ${filtered.length} of ${algos.length} quantum algorithms`;
    }

    if (filtered.length === 0) {
      zooGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 56px 24px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;">
          <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 18px; margin-bottom: 8px; color: var(--text-white); font-weight: 700;">No matching algorithms found</h3>
          <p style="font-size: 13.5px; color: var(--text-dim); max-width: 500px; margin: 0 auto 16px;">Try adjusting your query or resetting speedup filters (e.g. search 'search', 'factoring', 'HHL', 'simulation', 'machine learning').</p>
          <button class="g-speedup-btn" onclick="window.clearZooSearch(); window.setZooSpeedupFilter('all'); window.setZooCategory('all');" style="margin: 0 auto; display: inline-block;">Reset All Filters ↺</button>
        </div>
      `;
      return;
    }

    zooGrid.innerHTML = '';
    filtered.forEach(a => {
      const card = document.createElement('div');
      card.className = 'g-algo-card';

      // Speedup classification badge
      let speedupClass = 'g-speed-poly';
      const spLower = (a.speedup || '').toLowerCase();
      if (spLower.includes('superpolynomial')) {
        speedupClass = 'g-speed-superpoly';
      } else if (spLower.includes('exponential')) {
        speedupClass = 'g-speed-expo';
      } else if (spLower.includes('constant')) {
        speedupClass = 'g-speed-constant';
      }

      // Framework Implementation Badges (Google Cirq, PennyLane, Classiq, Qrisp)
      let implHtml = '';
      if (a.implementations && a.implementations.length > 0) {
        implHtml = `
          <div class="g-impl-strip">
            <span class="g-impl-header">Executable Implementations:</span>
            <div class="g-impl-chips">
              ${a.implementations.map(impl => {
                let badgeTheme = 'impl-generic';
                const iName = impl.name.toLowerCase();
                if (iName.includes('cirq')) badgeTheme = 'impl-cirq';
                else if (iName.includes('pennylane')) badgeTheme = 'impl-pennylane';
                else if (iName.includes('classiq')) badgeTheme = 'impl-classiq';
                else if (iName.includes('qrisp')) badgeTheme = 'impl-qrisp';

                return `
                  <a href="${impl.url}" target="_blank" rel="noopener noreferrer" class="g-framework-chip ${badgeTheme}">
                    <span class="chip-icon">⚡</span> ${impl.name}
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      // Description: math rendered by KaTeX after insertion, inline [82] markers
      // resolved to the real reference the data defines.
      const { html: descHtml, cited: citedRefs } = renderZooDescription(a.description || '', refsByNumber);

      // Citations HTML with direct arXiv links — built from what the
      // description actually cites, since the data's own `citations` array is
      // always empty and previously left this section permanently blank.
      let citationsHtml = '';
      if (citedRefs.length > 0) {
        const sorted = [...citedRefs].sort((x, y) => parseInt(x.number, 10) - parseInt(y.number, 10));
        citationsHtml = `
            <details class="g-citations-accordion">
              <summary>
                <span class="summary-left">📚 Peer-Reviewed Literature (${sorted.length})</span>
                <span class="summary-toggle-icon">▾</span>
              </summary>
              <ul class="g-citations-list">
                ${sorted.map(r => `
                  <li id="zoo-ref-${r.id}">
                    <span class="cite-ref-idx">[${r.number}]</span>
                    <span class="cite-body-text">${escapeHtml(r.citation)}</span>
                    ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener noreferrer" class="g-arxiv-link">arXiv / Source ↗</a>` : ''}
                  </li>
                `).join('')}
              </ul>
            </details>
          `;
      }

      // Clean category title
      const cleanCat = a.category.replace('Algorithms', '').trim();

      card.innerHTML = `
        <div class="g-card-top-row">
          <span class="g-domain-badge">${cleanCat}</span>
          <span class="g-speedup-pill ${speedupClass}">${a.speedup}</span>
        </div>

        <h3 class="g-algo-name">${escapeHtml(a.name)}</h3>
        <p class="g-algo-desc">${descHtml}</p>

        ${implHtml}
        ${citationsHtml}
      `;

      zooGrid.appendChild(card);
    });

    // The math in each description ($...$) is only typeset once it exists in
    // the DOM; renderAllMath runs once at initial page load, before these
    // cards exist, so without this every card would just show raw LaTeX
    // source instead of rendered notation.
    if (window.renderMathInElement) {
      window.renderMathInElement(zooGrid, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'option'],
        throwOnError: false
      });
    }
  }

  // BibTeX Modal Handlers
  window.openBibtexModal = function(paperId) {
    const paper = window.QUANTUM_RESEARCH_PAPERS.find(p => p.id === paperId);
    if (!paper) return;

    const modal = document.getElementById('bibtex-modal');
    const titleEl = document.getElementById('bibtex-modal-title');
    const codeEl = document.getElementById('bibtex-code-content');
    const copyBtn = document.getElementById('btn-copy-bibtex');

    if (titleEl) titleEl.textContent = `BibTeX: ${paper.title}`;
    if (codeEl) codeEl.textContent = paper.bibtex;
    if (copyBtn) copyBtn.textContent = 'Copy Citation to Clipboard';
    if (modal) modal.classList.add('active');
  };

  window.closeBibtexModal = function() {
    const modal = document.getElementById('bibtex-modal');
    if (modal) modal.classList.remove('active');
  };

  // ==========================================
  // CIRCUIT OPTIMIZER, TOPOLOGY & NOISE PANEL
  // ==========================================
  window.openCircuitOptimizer = function() {
    const modal = document.getElementById('circuit-optimizer-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    const res = document.getElementById('optimizer-result');
    if (res) res.innerHTML = '<div class="opt-idle">Press <strong>Optimize Circuit</strong> to run the algebraic passes on the circuit currently in the composer.</div>';
    window.refreshHardwareReadiness();
  };

  window.closeCircuitOptimizer = function() {
    const modal = document.getElementById('circuit-optimizer-modal');
    if (modal) modal.style.display = 'none';
  };

  /** Reads the live composer circuit, or null with a reason if unavailable. */
  function getComposerCircuit() {
    const ui = window.circuitUI;
    if (!ui || !ui.grid) return null;
    const hasGates = ui.grid.some(row => row.some(cell => cell && cell !== ''));
    return { grid: ui.grid, numQubits: ui.numQubits, hasGates };
  }

  window.runCircuitOptimizer = function() {
    const out = document.getElementById('optimizer-result');
    if (!out) return;
    const circuit = getComposerCircuit();
    if (!circuit) { out.innerHTML = '<div class="opt-bad">Composer not ready.</div>'; return; }
    if (!circuit.hasGates) { out.innerHTML = '<div class="opt-idle">No gates placed yet — build a circuit first.</div>'; return; }
    if (!window.CircuitOptimizer) { out.innerHTML = '<div class="opt-bad">Optimizer module failed to load.</div>'; return; }

    const r = window.CircuitOptimizer.optimize(circuit.grid, circuit.numQubits);

    if (r.rejected) {
      out.innerHTML = `
        <div class="opt-bad"><strong>Rewrite rejected.</strong> ${r.summary}</div>
        <div class="opt-note">Your circuit was left exactly as it was.</div>`;
      return;
    }

    const changed = r.after.total !== r.before.total || r.after.depth !== r.before.depth;
    out.innerHTML = `
      <div class="opt-metrics">
        <div class="opt-metric"><span class="opt-metric-val">${r.before.total} → ${r.after.total}</span><span class="opt-metric-lbl">gates</span></div>
        <div class="opt-metric"><span class="opt-metric-val">${r.before.depth} → ${r.after.depth}</span><span class="opt-metric-lbl">depth</span></div>
        <div class="opt-metric"><span class="opt-metric-val opt-good">${r.fidelity.toFixed(6)}</span><span class="opt-metric-lbl">verified fidelity</span></div>
      </div>
      <div class="${changed ? 'opt-good' : 'opt-idle'}">${r.summary}</div>
      ${changed ? `<button class="btn-opt-apply" onclick="window.applyOptimizedCircuit()">Apply to Composer</button>` : ''}`;

    // Held until the user explicitly applies it - the composer is never
    // rewritten behind their back.
    window.__ANANTA_OPTIMIZED_GRID = changed ? r.grid : null;
  };

  window.applyOptimizedCircuit = function() {
    const grid = window.__ANANTA_OPTIMIZED_GRID;
    const ui = window.circuitUI;
    if (!grid || !ui) return;
    ui.loadPreset(grid, null);
    window.__ANANTA_OPTIMIZED_GRID = null;
    const out = document.getElementById('optimizer-result');
    if (out) out.innerHTML = '<div class="opt-good">Optimized circuit applied to the composer.</div>';
    window.refreshHardwareReadiness();
  };

  window.refreshHardwareReadiness = function() {
    const topoOut = document.getElementById('topology-result');
    const noiseOut = document.getElementById('noise-result');
    const circuit = getComposerCircuit();
    if (!topoOut || !noiseOut || !circuit || !window.CircuitOptimizer) return;

    if (!circuit.hasGates) {
      topoOut.innerHTML = '<div class="opt-idle">No gates placed yet.</div>';
      noiseOut.innerHTML = '<div class="opt-idle">No gates placed yet.</div>';
      return;
    }

    // --- connectivity ---
    const topoKey = (document.getElementById('opt-topology-select') || {}).value || 'linear';
    const t = window.CircuitOptimizer.analyzeTopology(circuit.grid, circuit.numQubits, topoKey);
    topoOut.innerHTML = t.deployable
      ? `<div class="opt-good">✓ ${t.summary}</div>`
      : `<div class="opt-warn">${t.summary}</div>` +
        t.violations.map(v => `<div class="opt-violation">Step t=${v.col + 1} — ${v.reason}</div>`).join('');

    // --- noise ---
    const devKey = (document.getElementById('opt-device-select') || {}).value || 'superconducting';
    const n = window.CircuitOptimizer.estimateNoiseSurvival(circuit.grid, circuit.numQubits, devKey);
    const pct = (n.survivalProbability * 100).toFixed(1);
    const cls = { good: 'opt-good', ok: 'opt-good', warn: 'opt-warn', bad: 'opt-bad', idle: 'opt-idle' }[n.severity] || 'opt-idle';
    noiseOut.innerHTML = `
      <div class="opt-metrics">
        <div class="opt-metric"><span class="opt-metric-val ${cls}">${pct}%</span><span class="opt-metric-lbl">survival</span></div>
        <div class="opt-metric"><span class="opt-metric-val">${n.singleQubitGates} / ${n.twoQubitGates}</span><span class="opt-metric-lbl">1q / 2q gates</span></div>
        <div class="opt-metric"><span class="opt-metric-val">${n.circuitTimeUs.toFixed(2)} µs</span><span class="opt-metric-lbl">circuit time</span></div>
      </div>
      <div class="${cls}">${n.verdict}</div>
      <div class="opt-formula">${n.formula}</div>`;
  };

  window.copyBibtex = function() {
    const codeEl = document.getElementById('bibtex-code-content');
    const copyBtn = document.getElementById('btn-copy-bibtex');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent);
      if (copyBtn) {
        copyBtn.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Citation to Clipboard';
        }, 2000);
      }
    }
  };

  window.loadCircuitFromPaper = function(presetKey) {
    window.loadPresetSafe(presetKey);
    switchView('simulator');
  };

  // ==========================================
  // Live Research Paper Extractor & Analyzer Handlers
  // ==========================================
  let currentExtractedText = '';
  let currentExtractedUrl = '';
  let lastPaperSearchResults = [];
  let lastSearchQuery = '';

  window.openPaperExtractorModal = function() {
    const modal = document.getElementById('paper-extractor-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closePaperExtractorModal = function() {
    const modal = document.getElementById('paper-extractor-modal');
    if (modal) modal.style.display = 'none';
  };

  window.renderLastPaperSearchResults = function() {
    const container = document.getElementById('extractor-results-container');
    const status = document.getElementById('extractor-status');
    if (!container || !lastPaperSearchResults.length) return;

    if (status) status.textContent = `Found ${lastPaperSearchResults.length} research papers for "${lastSearchQuery}":`;

    container.innerHTML = lastPaperSearchResults.map((r) => {
      const readUrl = r.link || r.pdfUrl || '';
      return `
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; margin-bottom: 12px; transition: border-color 0.2s; cursor: pointer;"
        title="Click to open and read the full paper"
        onclick='window.openPaperReader(${jsAttr(readUrl)}, ${jsAttr(r.title)})'>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
          <h4 style="margin: 0; color: #38bdf8; font-size: 14px; line-height: 1.4;">${escapeHtml(r.title)}</h4>
          <span style="font-size: 11px; background: rgba(56,189,248,0.12); color: #38bdf8; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">${escapeHtml(r.published || 'arXiv')}</span>
        </div>
        ${r.authors ? `<div style="font-size: 11.5px; color: #a78bfa; margin-bottom: 6px;">✍ ${escapeHtml(r.authors)}</div>` : ''}
        <p style="margin: 0 0 10px 0; color: #cbd5e1; font-size: 12px; line-height: 1.55;">${escapeHtml(r.snippet)}</p>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="color: #34d399; font-size: 11.5px; font-weight: 600;">📖 Click to read full paper &amp; summarize</span>
          <a href="${encodeURI(readUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color: #94a3b8; font-size: 11.5px; text-decoration: underline; margin-left: auto;">View source ↗</a>
        </div>
      </div>
    `;
    }).join('');
  };

  window.runLivePaperSearch = async function() {
    const input = document.getElementById('extractor-query-input');
    const container = document.getElementById('extractor-results-container');
    const status = document.getElementById('extractor-status');
    const query = (input ? input.value : '').trim();

    if (!query) {
      alert('Please enter a research topic to search (e.g. "superposition", "quantum error correction", "VQE")');
      return;
    }

    if (status) {
      status.style.display = 'block';
      status.textContent = `Searching peer-reviewed arXiv papers for "${query}"...`;
    }
    if (container) {
      container.innerHTML = '<div style="text-align:center; padding: 36px; color:#94a3b8;"><span style="font-size: 20px;">⚛️</span><br/><br/>Searching arXiv quant-ph research archives...</div>';
    }

    try {
      // Was /api/search (googleSearch.js): a strict all-words-must-match arXiv
      // query that returns 0 hits for a full sentence, then silently falls back
      // to treating the raw sentence as a bag-of-words match — which is how
      // "i want research paper related to superposition" returned gravitational-
      // wave papers. Routes through the same discovery pipeline the Literature
      // Search tab uses instead: model-extracted subject, arXiv + Crossref,
      // ranked, and dropped if it doesn't actually mention the topic.
      const base = (window.anantaBackend && window.anantaBackend.baseUrl) || '';
      const res = await fetch(`${base}/api/research/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: query, limit: 6 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch search results');

      lastPaperSearchResults = (data.papers || []).map(p => ({
        title: p.title,
        authors: p.authors,
        published: p.year ? String(p.year) : (p.source || 'arXiv'),
        snippet: p.abstract && p.abstract.length > 320 ? p.abstract.slice(0, 320) + '…' : (p.abstract || ''),
        link: p.url,
        pdfUrl: p.pdfUrl || p.url
      }));
      lastSearchQuery = data.query || query;

      if (!lastPaperSearchResults.length) {
        if (status) status.textContent = `No papers found for "${query}".`;
        container.innerHTML = `<div style="text-align:center; padding: 24px; color: #94a3b8;">No matching papers found for "${query}". Try related keywords like "superposition", "entanglement", or "qubits".</div>`;
        return;
      }

      window.renderLastPaperSearchResults();
    } catch (e) {
      if (status) status.textContent = `Error: ${e.message}`;
      if (container) container.innerHTML = `<div style="color: #f87171; padding: 12px;">Failed to search: ${e.message}</div>`;
    }
  };

  window.runLivePaperExtract = async function(customUrl = null) {
    const input = document.getElementById('extractor-query-input');
    const container = document.getElementById('extractor-results-container');
    const status = document.getElementById('extractor-status');
    const url = customUrl || (input ? input.value : '').trim();

    if (!url || (!url.startsWith('http') && !url.includes('arxiv.org'))) {
      alert('Please enter or click a valid URL (e.g. https://arxiv.org/abs/quant-ph/9705052)');
      return;
    }

    currentExtractedUrl = url;
    if (status) {
      status.style.display = 'block';
      status.textContent = `Extracting verified paper text and abstract...`;
    }
    if (container) {
      container.innerHTML = '<div style="text-align:center; padding: 36px; color:#94a3b8;">Extracting paper text from arXiv...</div>';
    }

    try {
      const res = await fetch('/api/fetch-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract paper text');

      currentExtractedText = data.text || '';
      if (status) status.textContent = `Extracted "${data.title}"`;

      container.innerHTML = `
        <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            ${lastPaperSearchResults.length ? `<button onclick="window.renderLastPaperSearchResults()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">← Back to Search Results</button>` : '<span></span>'}
            <button onclick="window.runLivePaperSummarize()" style="background: #059669; color: #fff; border: none; padding: 4px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer;">🧠 Generate AI Summary</button>
          </div>
          <h3 style="margin: 0 0 6px 0; color: #a855f7; font-size: 15px; line-height: 1.4;">${data.title}</h3>
          <span style="font-size: 11px; color: #94a3b8;">Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8;">${url}</a> &bull; ${data.length} characters</span>
        </div>
        <div style="white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.6; color: #e2e8f0; max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.25); padding: 10px; border-radius: 6px;">
          ${data.text}
        </div>
      `;
    } catch (e) {
      if (status) status.textContent = `Extraction error: ${e.message}`;
      if (container) container.innerHTML = `<div style="color: #f87171; padding: 12px;">Failed to extract: ${e.message}</div>`;
    }
  };

  window.runLivePaperExtractAndSummarize = async function(url) {
    await window.runLivePaperExtract(url);
    if (currentExtractedText) {
      await window.runLivePaperSummarize();
    }
  };

  window.runLiveFindTerm = async function() {
    const termInput = document.getElementById('extractor-term-input');
    const container = document.getElementById('extractor-results-container');
    const status = document.getElementById('extractor-status');
    const term = (termInput ? termInput.value : '').trim();

    if (!term) {
      alert('Please enter a term to find (e.g. "superposition", "decoherence", "fidelity")');
      return;
    }
    if (!currentExtractedText && !currentExtractedUrl) {
      // If user hasn't extracted a paper yet but there's a search result, extract first one
      if (lastPaperSearchResults.length > 0) {
        await window.runLivePaperExtract(lastPaperSearchResults[0].link || lastPaperSearchResults[0].pdfUrl);
      } else {
        alert('Please search or extract a paper first, then search for terms inside it.');
        return;
      }
    }

    if (status) {
      status.style.display = 'block';
      status.textContent = `Searching and analyzing occurrences of "${term}"...`;
    }

    try {
      const res = await fetch('/api/find-term', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          text: currentExtractedText || undefined,
          url: (!currentExtractedText && currentExtractedUrl) ? currentExtractedUrl : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find term');

      if (!data.found) {
        if (status) status.textContent = `Term "${term}" was not found in this specific document.`;
        return;
      }

      if (status) status.textContent = `Found ${data.totalOccurrences} occurrences of "${term}". AI contextual explanations:`;
      const summaries = data.results || [];

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="color: #38bdf8; font-weight: 700; font-size: 13px;">
            🔍 Contextual Analysis for: "${term}" (${data.totalOccurrences} instances found)
          </div>
          ${lastPaperSearchResults.length ? `<button onclick="window.renderLastPaperSearchResults()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">← Back to Papers</button>` : ''}
        </div>
        ${summaries.map((s, idx) => `
          <div style="background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.25); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
            <div style="font-weight: 600; color: #c084fc; margin-bottom: 4px; font-size: 12px;">Passage ${idx + 1} AI Explanation:</div>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #f8fafc; line-height: 1.5;">${s.summary}</p>
            <details style="font-size: 11px; color: #94a3b8;">
              <summary style="cursor: pointer; color: #38bdf8;">View verbatim excerpt</summary>
              <pre style="margin-top: 4px; white-space: pre-wrap; font-size: 11px; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">${s.context}</pre>
            </details>
          </div>
        `).join('')}
      `;
    } catch (e) {
      if (status) status.textContent = `Error: ${e.message}`;
    }
  };

  window.runLivePaperSummarize = async function() {
    const container = document.getElementById('extractor-results-container');
    const status = document.getElementById('extractor-status');

    if (!currentExtractedText && !currentExtractedUrl) {
      alert('Please search/extract a paper first!');
      return;
    }

    if (status) {
      status.style.display = 'block';
      status.textContent = 'Generating comprehensive AI paper summary...';
    }

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentExtractedText || undefined,
          url: (!currentExtractedText && currentExtractedUrl) ? currentExtractedUrl : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');

      if (status) status.textContent = 'Summary synthesized:';
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="margin: 0; color: #34d399; font-size: 15px;">🧠 Executive Research Summary</h3>
          ${lastPaperSearchResults.length ? `<button onclick="window.renderLastPaperSearchResults()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">← Back to Papers</button>` : ''}
        </div>
        <div style="background: rgba(5,150,105,0.1); border: 1px solid rgba(5,150,105,0.3); border-radius: 8px; padding: 14px;">
          <h4 style="margin: 0 0 6px 0; color: #a7f3d0; font-size: 13.5px;">${data.title || 'Scientific Manuscript'}</h4>
          <p style="margin: 0; font-size: 13px; line-height: 1.65; color: #f8fafc;">${data.summary}</p>
        </div>
      `;
    } catch (e) {
      if (status) status.textContent = `Summary error: ${e.message}`;
    }
  };

  // Keyboard shortcut: Enter on query input triggers search, Enter on term input triggers find
  setTimeout(() => {
    const qInput = document.getElementById('extractor-query-input');
    if (qInput) {
      qInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.runLivePaperSearch();
      });
    }
    const tInput = document.getElementById('extractor-term-input');
    if (tInput) {
      tInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') window.runLiveFindTerm();
      });
    }
  }, 1000);

  // Initial render of research library
  renderResearchLibrary();
  // Establish the default research mode properly, so its subview is not merely
  // visible by virtue of having no display style yet.
  window.switchResearchMode('search');

  // ==========================================
  // 9. Determine Initial Active View & Routing
  // ==========================================
  const validTabs = [
    'overview', 'simulator', 'careers', 'surface-code', 'pulse-studio',
    'transpiler', 'vqe-chemistry', 'algorithms', 'research',
    'intuition', 'challenges', 'docs', 'login'
  ];
  updateNavUser();
  const hash = window.location.hash.replace('#', '');

  // The app is freely explorable without signing in - real sign-in is only
  // actually required server-side for instructor-only actions (cohort
  // management, gradebooks, assignment dispatch), which already 401/403
  // without a valid session regardless of what this client-side routing
  // does. So there's no reason to gate the whole app behind a login screen;
  // land everyone on Overview by default, same as any other tab.
  if (hash && validTabs.includes(hash)) {
    switchView(hash);
  } else {
    switchView('overview');
  }

  // DevSite Header Search Integration & Quick Launcher
  window.focusKnowledgeEngineSearch = function() {
    switchView('simulator');
    const drawer = document.getElementById('ke-collapsible-drawer');
    const btn = document.getElementById('btn-toggle-ke-drawer');
    if (drawer && !drawer.classList.contains('drawer-open')) {
      drawer.classList.add('drawer-open');
      if (btn) btn.classList.add('active');
    }
    setTimeout(() => {
      const searchInput = document.getElementById('ke-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  // Global '/' keyboard shortcut to trigger Knowledge Engine search from anywhere
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
      e.preventDefault();
      window.focusKnowledgeEngineSearch();
    }
  });

  // Google Quantum AI Smooth Section Scrolling
  window.scrollToSection = function(sectionId) {
    switchView('overview');
    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  // =========================================================================
  // 6-MILESTONE INTERACTIVE ROADMAP CONTROLLER & DEEP-DIVE VIEWER
  // =========================================================================
  const ROADMAP_MILESTONES = {
    1: {
      num: 1,
      year: '2019',
      badge: 'MILESTONE 01 • HISTORIC PROOF',
      status: 'Achieved (Nature 2019)',
      statusClass: 'status-achieved',
      title: 'Beyond Classical Computation (Quantum Supremacy)',
      tagline: 'Google Sycamore computes a random circuit sampling benchmark in 200 seconds that would take Summit supercomputer ~10,000 years.',
      description: 'This landmark milestone proved for the first time in human history that physical quantum hardware can perform computations beyond the practical reach of any classical supercomputer. Operating 53 superconducting transmon qubits at 15 millikelvin with 2-qubit gate fidelities exceeding 99.4%, cross-entropy benchmarking (XEB) confirmed genuine computational acceleration across a 2⁵³ (9 quadrillion states) Hilbert space.',
      breakthrough: 'Proved quantum mechanics does not break down at macroscopic multi-qubit scales, validating quantum computational complexity.',
      qubits: '54 Physical Qubits (53 active transmons)',
      errorRate: 'Physical gate error ~0.6% (No error correction)',
      architecture: 'Sycamore 2D Square Planar Lattice with Tunable Couplers',
      keyTech: 'Cross-Entropy Benchmarking (XEB), Tunable Transmon Coupling, 15 mK Dilution Cryostat',
      paperTitle: 'Quantum Supremacy Using a Programmable Superconducting Processor (Arute et al., Nature 574)',
      actionPreset: 'superposition',
      actionLabel: 'Simulate Sycamore Superposition in Studio'
    },
    2: {
      num: 2,
      year: '2023',
      badge: 'MILESTONE 02 • FAULT-TOLERANCE THRESHOLD',
      status: 'Achieved (Nature 2023)',
      statusClass: 'status-achieved',
      title: 'Suppressing Quantum Errors by Scaling Surface Codes',
      tagline: 'First demonstration that increasing distance from distance-3 (17 qubits) to distance-5 (49 qubits) suppresses net logical errors.',
      description: 'Quantum states are inherently vulnerable to thermal noise and cosmic ray decoherence. In 2023, Google Quantum AI proved the fundamental tenet of fault-tolerant quantum computing: making an error-correcting surface code larger (scaling from distance-3 with 17 qubits to distance-5 with 49 qubits) actually REDUCED the logical error rate from 3.028% to 2.914%. This established that physical noise can be systematically conquered through code scaling.',
      breakthrough: 'First experimental proof that scaling quantum error correction suppresses logical errors below the fault-tolerance threshold.',
      qubits: '10² Physical Qubits (49 data & syndrome transmons)',
      errorRate: 'Logical Error: ~10⁻² per error syndrome cycle',
      architecture: 'Surface-17 (d=3) & Surface-49 (d=5) Planar Stabilizer Code',
      keyTech: 'Real-time FPGA Syndrome Decoding, Repetitive X & Z Plaquette Measurements, 1 μs Cycle Time',
      paperTitle: 'Suppressing Quantum Errors by Scaling a Quantum Error-Correcting Code (Google AI, Nature 614)',
      actionPreset: 'bell',
      actionLabel: 'Explore Surface Code Stabilizer Simulation'
    },
    3: {
      num: 3,
      year: '2025–Current',
      badge: 'MILESTONE 03 • CURRENT ACTIVE FRONTIER',
      status: 'In Progress (Active Lab Milestone)',
      statusClass: 'status-current',
      title: 'Building a Long-Lived Logical Qubit',
      tagline: 'Crossing the break-even point where a protected logical qubit retains coherence longer than its best physical constituent.',
      description: 'The current frontier focuses on building an ultra-reliable logical quantum memory (distance d=7 surface code tile with 97 physical qubits). Continuous real-time syndrome extraction and sub-microsecond Minimum-Weight Perfect Matching (MWPM) decoders allow this logical qubit to preserve quantum coherence ($T_1, T_2$) substantially longer than any single physical transmon in the array.',
      breakthrough: 'Achieving the "break-even point" for quantum memory coherence under active continuous error correction.',
      qubits: '10³ Physical Qubits',
      errorRate: 'Logical Error Target: 10⁻⁴ (1 error in 10,000 cycles)',
      architecture: 'Distance-7 Surface Code with Ultra-Low Loss Microwave Resonators',
      keyTech: 'Sub-microsecond Cryo-Decoding, Correlated Cosmic Ray Mitigation, Purcell Filters',
      paperTitle: 'Break-even Point and Fault-Tolerant Quantum Memories (Preskill 2024)',
      actionPreset: 'deutsch',
      actionLabel: 'Launch Noise & Decoherence Lab'
    },
    4: {
      num: 4,
      year: 'Phase 4',
      badge: 'MILESTONE 04 • LOGICAL COMPUTATION',
      status: 'Next Phase (R&D Roadmap)',
      statusClass: 'status-future',
      title: 'Creating Fault-Tolerant Logical Two-Qubit Gates',
      tagline: 'Executing transversal Clifford operations and lattice surgery directly between protected logical qubits.',
      description: 'Storing information is not enough—a quantum computer must compute. Milestone 4 demonstrates full fault-tolerant two-qubit logic gates (such as logical CNOT and CZ) applied directly between two protected logical qubits using lattice surgery. It integrates Magic State Distillation factories (15-to-1 Bravyi-Kitaev distillation) to inject non-Clifford T-gates with high fidelity.',
      breakthrough: 'Universal quantum computation on encoded logical qubits without decoding into vulnerable physical states.',
      qubits: '10⁴ Physical Qubits',
      errorRate: 'Logical Error Target: 10⁻⁶ (1 error in 1,000,000 operations)',
      architecture: 'Inter-Patch Lattice Surgery with Magic State Distillation Factories',
      keyTech: 'Transversal Gates, Distillation Factories, Code Deformation, Fault-Tolerant Teleportation',
      paperTitle: 'Universal Fault-Tolerant Quantum Computation with Magic States (Bravyi & Kitaev)',
      actionPreset: 'teleportation',
      actionLabel: 'Test Logical CNOT in Composer'
    },
    5: {
      num: 5,
      year: 'Phase 5',
      badge: 'MILESTONE 05 • MODULAR SCALING',
      status: 'Engineering Scale (Long-Range Target)',
      statusClass: 'status-future',
      title: 'Engineering Scale Up & Cryogenic Control Systems',
      tagline: 'Scaling from thousands to hundreds of thousands of qubits via cryo-CMOS controllers and coherent quantum interconnects.',
      description: 'Physical dilution refrigerators cannot host 100,000 coaxial cables without boiling off liquid helium. Milestone 5 integrates Cryo-CMOS multiplexed control chips operating at 3-4 Kelvin inside the cryostat, alongside coherent microwave-to-optical quantum transducers that link multiple cryostats together into a distributed modular quantum supercomputer.',
      breakthrough: 'Overcoming the "wiring bottleneck" to scale quantum hardware architecture to hundreds of thousands of physical qubits.',
      qubits: '10⁵ Physical Qubits',
      errorRate: 'Logical Error Target: 10⁻⁸ per logical cycle',
      architecture: 'Modular Multi-QPU Clusters with Optical & Microwave Quantum Interconnects',
      keyTech: 'Cryo-CMOS Multiplexers, Microwave-to-Optical Transducers, Vacuum Enclosures',
      paperTitle: 'Modular Architectures for Fault-Tolerant Quantum Computing (Monroe et al.)',
      actionPreset: 'qft',
      actionLabel: 'Explore Multi-QPU Topology in Studio'
    },
    6: {
      num: 6,
      year: 'Goal Horizon',
      badge: 'MILESTONE 06 • INDUSTRIAL ADVANTAGE',
      status: 'Ultimate Horizon (Fault-Tolerant Scale)',
      statusClass: 'status-future',
      title: 'Large Error-Corrected Quantum Computer (10⁶ Qubits)',
      tagline: '1,000+ logical qubits operating at 10⁻¹³ error rates, solving real-world chemistry, energy, and optimization challenges.',
      description: 'The ultimate destination of the quantum computing roadmap: a commercial-grade fault-tolerant machine capable of running trillions of quantum gate operations without failure. This system will simulate complex transition-metal catalysts (such as the Nitrogenase FeMoco active site for clean fertilizer), design room-temperature superconductors, execute Shor\'s algorithm on 4096-bit RSA keys, and solve multi-variable logistical optimization problems.',
      breakthrough: 'Practical, transformative quantum advantage that reshapes global medicine, energy, chemistry, and computation.',
      qubits: '10⁶ Physical Qubits (1,000+ Logical Qubits)',
      errorRate: 'Logical Error: 10⁻¹³ (1 error in 10 trillion gate operations)',
      architecture: 'Million-Qubit Distributed Fault-Tolerant Surface Code Architecture',
      keyTech: 'Million-Qubit Cryo-Arrays, Automated Continuous Calibration, Fault-Tolerant QROM',
      paperTitle: 'Elucidating Reaction Mechanisms on Quantum Computers (Reiher et al., PNAS)',
      actionPreset: 'grover',
      actionLabel: 'Explore 74 Algorithms in Compendium'
    }
  };

  // Render deep-dive detail viewer for selected milestone
  function renderMilestoneDetail(idx) {
    const data = ROADMAP_MILESTONES[idx];
    const viewer = document.getElementById('roadmap-detail-viewer');
    if (!data || !viewer) return;

    viewer.innerHTML = `
      <div class="roadmap-detail-card" data-milestone-detail="${data.num}">
        <!-- Header Banner -->
        <div class="rm-detail-header">
          <div class="rm-detail-title-group">
            <div class="rm-badge-row">
              <span class="rm-badge">${data.badge}</span>
              <span class="rm-status-tag ${data.statusClass}">● ${data.status}</span>
              <span class="rm-year-tag">Target: ${data.year}</span>
            </div>
            <h2 class="rm-detail-heading">${data.title}</h2>
            <p class="rm-detail-tagline">${data.tagline}</p>
          </div>
        </div>

        <!-- Main Content 2-Column Grid -->
        <div class="rm-detail-grid">
          <!-- Left Column: Physics & Breakthrough -->
          <div class="rm-detail-left">
            <div class="rm-section-block">
              <h4 class="rm-block-label">🔬 Physical Significance & Quantum Mechanics</h4>
              <p class="rm-desc-text">${data.description}</p>
            </div>

            <div class="rm-callout-breakthrough">
              <div class="rm-callout-icon">⚡</div>
              <div class="rm-callout-content">
                <strong>Core Physical Breakthrough:</strong>
                <span>${data.breakthrough}</span>
              </div>
            </div>

            <div class="rm-reference-box">
              <span class="rm-ref-label">📄 Foundational Literature:</span>
              <span class="rm-ref-text">${data.paperTitle}</span>
            </div>
          </div>

          <!-- Right Column: Specs & Direct Actions -->
          <div class="rm-detail-right">
            <div class="rm-specs-deck">
              <div class="rm-spec-item">
                <span class="rm-spec-name">Physical Qubit Scale</span>
                <strong class="rm-spec-val highlight-qubits">${data.qubits}</strong>
              </div>
              <div class="rm-spec-item">
                <span class="rm-spec-name">Logical Error Rate</span>
                <strong class="rm-spec-val highlight-error">${data.errorRate}</strong>
              </div>
              <div class="rm-spec-item">
                <span class="rm-spec-name">Target QPU Architecture</span>
                <strong class="rm-spec-val">${data.architecture}</strong>
              </div>
              <div class="rm-spec-item">
                <span class="rm-spec-name">Key Enablement Technologies</span>
                <strong class="rm-spec-val">${data.keyTech}</strong>
              </div>
            </div>

            <!-- Action Toolbar -->
            <div class="rm-action-toolbar">
              <button class="btn-rm-action btn-rm-primary" onclick="window.launchMilestonePreset('${data.actionPreset}')">
                <span>🚀</span> ${data.actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Trigger math rendering if any LaTeX in detail card
    if (window.renderMathInElement) {
      renderMathInElement(viewer, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$',  right: '$',  display: false}
        ],
        throwOnError: false
      });
    }
  }

  // Quick Action Handlers
  window.launchMilestonePreset = function(presetKey) {
    if (window.loadPresetSafe) {
      window.loadPresetSafe(presetKey);
    }
    if (window.switchView) {
      window.switchView('simulator');
    }
  };

  // 6-Milestone Interactive Roadmap Selection (Guarded Fallback)
  window.selectMilestone = function(idx, shouldScroll = false) {
    const cards = document.querySelectorAll('.roadmap-card');
    if (!cards || cards.length === 0) return;
    cards.forEach(c => {
      if (parseInt(c.dataset.milestone) === idx) {
        c.classList.add('active');
        if (shouldScroll) {
          const container = c.closest('.roadmap-cards-grid');
          if (container && container.scrollWidth > container.clientWidth) {
            c.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      } else {
        c.classList.remove('active');
      }
    });

    const nodes = document.querySelectorAll('.timeline-node');
    nodes.forEach((n, i) => {
      if (i + 1 === idx) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    const progressBar = document.querySelector('.timeline-line-progress');
    if (progressBar) {
      const pct = Math.min(100, Math.max(0, ((idx - 1) / 5) * 100));
      progressBar.style.width = pct + '%';
    }

    if (typeof renderMilestoneDetail === 'function') {
      renderMilestoneDetail(idx);
    }
  };

  // Wire click events on roadmap cards if present
  document.querySelectorAll('.roadmap-card').forEach(card => {
    card.addEventListener('click', () => {
      const mId = parseInt(card.dataset.milestone);
      if (mId) window.selectMilestone(mId, true);
    });
  });

  // Check and trigger Classical vs Quantum Maze Simulation if on overview
  if (window.initQuantumMazeSim) {
    setTimeout(() => {
      window.initQuantumMazeSim();
    }, 150);
  }

  // Interactive 3D Mouse Parallax for Floating Quantum Processor Chip
  const chipScene = document.getElementById('chip-scene');
  const chipCard = document.getElementById('chip-card');
  if (chipScene && chipCard) {
    chipScene.addEventListener('mousemove', (e) => {
      const rect = chipScene.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotX = 24 - (y / rect.height) * 28;
      const rotY = -18 + (x / rect.width) * 28;
      chipCard.style.animation = 'none';
      chipCard.style.transform = `perspective(900px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(12deg)`;
    });

    chipScene.addEventListener('mouseleave', () => {
      chipCard.style.animation = 'floatQuantumChip 7s ease-in-out infinite alternate';
    });
  }

  // Interactive 3D Mouse Parallax & Dynamic Motion for Quantum Quote Orbs & Studio Cards
  const setupOrb3DParallax = () => {
    document.querySelectorAll('.quantum-quote-orb').forEach(orb => {
      const specular = orb.querySelector('.orb-glass-specular');
      const gyroRig = orb.querySelector('.orb-3d-gyro-rig');
      const quoteContent = orb.querySelector('.orb-quote-content');

      orb.addEventListener('mousemove', (e) => {
        const rect = orb.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        orb.style.animation = 'none';
        const tiltX = -y * 26;
        const tiltY = x * 26;
        orb.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(1.04)`;

        if (gyroRig) {
          gyroRig.style.transform = `translateZ(25px) rotateX(${(tiltX * 0.5).toFixed(2)}deg) rotateY(${(tiltY * 0.5).toFixed(2)}deg)`;
        }
        if (specular) {
          specular.style.transform = `translate(${-x * 35}px, ${-y * 35}px) scale(1.05)`;
        }
        if (quoteContent) {
          quoteContent.style.transform = `translateZ(45px) translate(${x * 14}px, ${y * 14}px)`;
        }
      });

      orb.addEventListener('mouseleave', () => {
        orb.style.animation = orb.classList.contains('cyan-orb') ? 'floatOrb 7s ease-in-out infinite alternate -3.5s' : 'floatOrb 7s ease-in-out infinite alternate';
        orb.style.transform = '';
        if (gyroRig) gyroRig.style.transform = '';
        if (specular) specular.style.transform = '';
        if (quoteContent) quoteContent.style.transform = '';
      });
    });

    // 3D Interactive Tilt on Hover for 4 Studio Cards
    document.querySelectorAll('.killer-spotlight-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) translateY(-8px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) scale(1.02)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  };
  setupOrb3DParallax();

  // =========================================================================
  // DOCUMENTATION SEARCH, SMOOTH SCROLL & SNIPPET COPY HELPERS
  // =========================================================================
  window.scrollDocIntoView = function(e, secId) {
    if (e && e.preventDefault) e.preventDefault();
    const el = document.getElementById(secId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update active pill
    document.querySelectorAll('.doc-nav-pill').forEach(pill => {
      if (pill.getAttribute('href') === `#${secId}`) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  };

  window.filterDocsSections = function(query) {
    const q = (query || '').toLowerCase().trim();
    const clearBtn = document.getElementById('docs-filter-clear');
    if (clearBtn) clearBtn.style.display = q ? 'inline-block' : 'none';

    const cards = document.querySelectorAll('.doc-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!q || text.includes(q)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  };

  window.clearDocsFilter = function() {
    const input = document.getElementById('docs-filter-input');
    if (input) {
      input.value = '';
      window.filterDocsSections('');
    }
  };

  window.copySnippetText = function(btn) {
    if (!btn) return;
    const shell = btn.closest('.doc-code-shell');
    if (!shell) return;
    const code = shell.querySelector('code');
    if (!code) return;

    const textToCopy = code.innerText || code.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = btn.textContent;
      btn.textContent = 'Copied! ✓';
      btn.style.background = '#10b981';
      btn.style.color = '#ffffff';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy', err);
    });
  };

  // ==========================================
  // INITIAL ROUTE & SESSION RESOLUTION
  // ==========================================
  try {
    const rawHash = window.location.hash.replace('#', '');
    const validTabs = [
      'overview', 'simulator', 'careers', 'surface-code', 'pulse-studio',
      'transpiler', 'vqe-chemistry', 'algorithms', 'research',
      'intuition', 'challenges', 'docs', 'login', 'topic-roadmap'
    ];
    const initialTab = (rawHash && validTabs.includes(rawHash)) ? rawHash : 'overview';
    switchView(initialTab);
    updateNavUser();
  } catch (err) {
    console.warn('Initial route resolution error:', err);
  }
});


