const HERO_TOTAL_FRAMES = 80;
const TIMETABLE_TOTAL_FRAMES = 100;
const HERO_IMG_PATH = 'imgs/frame_';
const TT_IMG_PATH = 'imgs2/frame_';

const heroImages = [];
const ttImages = [];
// ==========================================


let isMobile = window.innerWidth < 768;

// Classes data for timetable
const classes = [
  { day:'MON', time:'08:00–09:30', grade:'SFT — Grade 10A', room:'Lab 3',     icon:'⚗️' },
  { day:'MON', time:'10:00–11:30', grade:'SFT — Grade 11B', room:'Room 205',  icon:'🔌' },
  { day:'TUE', time:'08:00–09:30', grade:'SFT — Grade 9C',  room:'Lab 3',     icon:'🧪' },
  { day:'TUE', time:'13:00–14:30', grade:'SFT — Grade 10B', room:'Lab 3',     icon:'⚗️' },
  { day:'WED', time:'09:00–10:30', grade:'SFT — Grade 11A', room:'Room 205',  icon:'💡' },
  { day:'WED', time:'11:00–12:30', grade:'SFT — Grade 12B', room:'Lab 3',     icon:'🔬' },
  { day:'THU', time:'08:00–09:30', grade:'SFT — Grade 9A',  room:'Room 205',  icon:'⚡' },
  { day:'THU', time:'14:00–15:30', grade:'SFT — Grade 10C', room:'Lab 3',     icon:'🧲' },
  { day:'FRI', time:'08:00–09:30', grade:'SFT — Grade 12A', room:'Lab 3',     icon:'🔋' },
  { day:'FRI', time:'10:30–12:00', grade:'SFT — Grade 11C', room:'Room 205',  icon:'🛰️' },
];

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const heroCanvas = document.getElementById('heroCanvas');
const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;
const ttCanvas = document.getElementById('ttCanvas');
const ttCtx = ttCanvas ? ttCanvas.getContext('2d') : null;



const heroWrapper = document.getElementById('heroWrapper');
const aboutWrapper = document.getElementById('aboutWrapper');
const ttWrapper = document.getElementById('ttWrapper');

const bioEl = document.getElementById('bioEl');
const photoEl = document.getElementById('photoEl');
const cvEl = document.getElementById('cvPanel');
const ttCardsContainer = document.getElementById('ttCardsContainer');
const aboutRulerEl = document.querySelector('.about-ruler');

let lastHeroFrame = -1;
let lastTtFrame = -1;

let ticking = false;
let isAutoScrolling = false;
let lastScrollY = window.scrollY;
let scrollEndTimeout = null;

function preloadSequence(folderPath, total, imgArray, onProgress, onFirstFrame) {
  let loaded = 0;
  let firstFrameTriggered = false;
  for (let i = 1; i <= total; i++) {
    const img = new Image();
    const frameNum = i.toString().padStart(4, '0');
    img.src = `${folderPath}${frameNum}.jpg`;
    img.onload = () => {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (i === 1 && onFirstFrame && !firstFrameTriggered) {
        firstFrameTriggered = true;
        onFirstFrame();
      }
    };
    img.onerror = () => {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (i === 1 && onFirstFrame && !firstFrameTriggered) {
        firstFrameTriggered = true;
        onFirstFrame();
      }
    };
    imgArray.push(img);
  }
}

async function startLoadingScreen() {
  generateFooterCircuit();
  generateTimetableCards();

  const heroFirstFrame = new Promise(resolve => preloadSequence(HERO_IMG_PATH, HERO_TOTAL_FRAMES, heroImages, null, resolve));
  const ttFirstFrame = new Promise(resolve => preloadSequence(TT_IMG_PATH, TIMETABLE_TOTAL_FRAMES, ttImages, null, resolve));

  await Promise.all([heroFirstFrame, ttFirstFrame]);
  
  progressBar.style.width = `100%`;
  progressText.innerText = `100%`;
  
  setTimeout(() => {
    dismissLoadingScreen();
  }, 50);
}

function dismissLoadingScreen() {
  loadingScreen.style.opacity = '0';
  loadingScreen.style.pointerEvents = 'none';
  
  handleResize();
  
  setTimeout(() => {
    document.getElementById('heroTagSub').style.animation = 'popIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both';
    document.getElementById('heroTagline').style.animation = 'popIn 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both';
    document.getElementById('heroDesc').style.animation = 'popIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.8s both';
    document.getElementById('heroName').style.animation = 'popIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.05s both';
  }, 300);

  onScroll();
}

function renderFrame(canvas, ctx, images, index) {
  if (!canvas || !ctx) return;
  if (!images[index] || !images[index].complete || images[index].naturalWidth === 0) return;
  const img = images[index];
  
  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.width / img.height;
  
  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasRatio > imgRatio) {
    drawHeight = canvas.width / imgRatio;
    offsetY = (canvas.height - drawHeight) / 2;
  } else {
    drawWidth = canvas.height * imgRatio;
    offsetX = (canvas.width - drawWidth) / 2;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function handleResize() {
  isMobile = window.innerWidth < 768;
  
  if (heroCanvas) {
    heroCanvas.width = window.innerWidth;
    heroCanvas.height = window.innerHeight;
    renderFrame(heroCanvas, heroCtx, heroImages, Math.max(0, lastHeroFrame));
  }

  if (ttCanvas) {
    ttCanvas.width = window.innerWidth;
    ttCanvas.height = window.innerHeight;
    renderFrame(ttCanvas, ttCtx, ttImages, Math.max(0, lastTtFrame));
  }
  
  generateAboutRuler();
}

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 150);
});

// ==========================================
// SCROLL ENGINE MODULE
// ==========================================
function getSectionProgress(wrapper) {
  const rect = wrapper.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const totalScroll = rect.height - windowHeight;
  if (totalScroll <= 0) return 0; // fallback
  
  const scrollPosition = -rect.top;
  let progress = scrollPosition / totalScroll;
  return Math.max(0, Math.min(1, progress));
}

function onScroll() {
  handleNavScroll();
  
  const heroProgress = getSectionProgress(heroWrapper);
  updateHeroCanvas(heroProgress);
  updateHeroText(heroProgress);

  const aboutProgress = getSectionProgress(aboutWrapper);
  updateAboutPhase(aboutProgress);

  const ttProgress = getSectionProgress(ttWrapper);
  updateTimetableCanvas(ttProgress);
  updateTimetableCards(ttProgress);
}

// ==========================================
// SCROLL SNAPPING ENGINE
// ==========================================

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }
});

// ==========================================
// HERO SECTION HANDLER
// ==========================================
function updateHeroCanvas(p) {
  if (!heroCanvas) return;
  const cappedProgress = Math.min(p / 0.75, 1);
  const frameIndex = Math.floor(cappedProgress * (HERO_TOTAL_FRAMES - 1));
  if (frameIndex !== lastHeroFrame) {
    renderFrame(heroCanvas, heroCtx, heroImages, frameIndex);
    lastHeroFrame = frameIndex;
  }
}

function updateHeroText(p) {
  const sub = document.getElementById('heroTagSub');
  const tagline = document.getElementById('heroTagline');
  const desc = document.getElementById('heroDesc');
  const name = document.getElementById('heroName');
  const btns = document.getElementById('heroBtns');

  // Clear entrance animations as soon as scroll begins to prevent CSS overriding inline styles
  if (p > 0 && sub.style.animationName !== 'none') {
    sub.style.animation = 'none';
    tagline.style.animation = 'none';
    desc.style.animation = 'none';
    name.style.animation = 'none';
  }

  // Mobile limits
  const transA1 = isMobile ? 60 : 120;
  const transA2 = isMobile ? 80 : 140;
  const transB = isMobile ? 120 : 220;

  // Phase A (p: 0 → 0.55): tagline + desc scroll up and fade out
  const phaseA = Math.min(p / 0.55, 1);
  sub.style.transform = `translateY(${-phaseA * transA1}px)`;
  sub.style.opacity = 1 - phaseA;
  tagline.style.transform = `translateY(${-phaseA * transA2}px)`;
  tagline.style.opacity = 1 - phaseA;
  desc.style.transform = `translateY(${-phaseA * transA1}px)`;
  desc.style.opacity = 1 - phaseA;

  // Phase B (p: 0 → 0.75): teacher name grows and moves up to replace the tagline's exact position
  const phaseB = Math.min(p / 0.75, 1);
  const baseSize = isMobile ? 22 : 36;
  const maxSize = isMobile ? 36 : 76;
  const nameSizePx = baseSize + phaseB * (maxSize - baseSize);
  name.style.fontSize = nameSizePx + 'px';
  name.style.transform = `translateY(${-phaseB * transB}px)`;
  
  // Buttons fade in and follow translation
  btns.style.opacity = phaseB;
  btns.style.transform = `translateY(${-phaseB * transB}px)`;
}

// ==========================================
// ABOUT SECTION HANDLER
// ==========================================
function generateAboutRuler() {
  const svg = document.querySelector('.about-ruler');
  if (!svg) return;
  const w = window.innerWidth;
  const totalWidth = w * 2.5;
  let innerHTML = '';
  // tick every 10px
  for (let i = 0; i < totalWidth; i += 10) {
    let tickHeight = 8;
    let strokeW = 0.8;
    if (i % 100 === 0) {
      tickHeight = 24;
      strokeW = 1.5;
      // Draw numeral every 100px (labeled as 10, 20, 30...)
      innerHTML += `<text x="${i+4}" y="20" fill="#1A2E42" font-family="var(--font-mono)" font-size="11" font-weight="600">${i / 10}</text>`;
    } else if (i % 50 === 0) {
      tickHeight = 16;
      strokeW = 1.2;
    }
    // Flip ruler so ticks come from bottom: y1="48", y2="48 - tickHeight"
    innerHTML += `<line x1="${i}" y1="48" x2="${i}" y2="${48 - tickHeight}" stroke="#1A2E42" stroke-width="${strokeW}" />`;
  }
  svg.innerHTML = innerHTML;
}

function updateAboutPhase(p) {
  // Start the transition much earlier (p=0.05). Finish exactly at p=0.75 right as timetable overlap starts
  const phase2 = Math.max((p - 0.05) / 0.70, 0); // 0 → 1 over p: 0.05→0.75
  const actualPhase2 = Math.min(1, phase2);

  if (isMobile) {
    // 0 -> 0.5: Bio exits, Photo enters
    // 0.5 -> 1.0: Photo exits, CV enters
    
    // Bio
    const bioPhase = Math.min(phase2 * 2, 1);
    bioEl.style.transform = `translateX(${-bioPhase * 100}vw) translateY(-50%)`;
    bioEl.style.opacity = 1 - bioPhase;

    // Photo
    let photoPhaseIn = Math.min(phase2 * 2, 1);
    let photoPhaseOut = Math.max((phase2 - 0.5) * 2, 0);
    const photoX = (1 - photoPhaseIn) * 100 - photoPhaseOut * 100;
    photoEl.style.transform = `translateX(${photoX}vw) translateY(-50%)`;
    photoEl.style.opacity = photoPhaseIn - photoPhaseOut;

    // CV
    const cvPhase = Math.max((phase2 - 0.5) * 2, 0);
    cvEl.style.transform = `translateX(${(1 - cvPhase) * 100}vw) translateY(-50%)`;
    cvEl.style.opacity = cvPhase;
  } else {
    // Bio disappears to left side (translate by -50vw to fully exit)
    bioEl.style.transform = `translateX(${-actualPhase2 * 50}vw)`;
    bioEl.style.opacity = 1 - actualPhase2;

    // Photo slides left to the position where bio was
    photoEl.style.transform = `translateX(${-actualPhase2 * 60}vw)`;

    // CV section appears on right side, fading in
    cvEl.style.transform = `translateX(${(1 - actualPhase2) * 160}px) translateY(-50%)`;
    cvEl.style.opacity = actualPhase2;
  }
  
  // Ruler slides left with the about section content
  if (aboutRulerEl) {
    aboutRulerEl.style.transform = `translateX(${-actualPhase2 * 50}vw)`;
  }
  
  if (actualPhase2 > 0.5) {
    cvEl.classList.add('active-cv');
  } else {
    cvEl.classList.remove('active-cv');
  }
}

// Intersection Observer for mobile or initial entry
const aboutObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    bioEl.classList.add('in-view');
    photoEl.classList.add('in-view');
  }
}, { threshold: 0.2 });
aboutObserver.observe(document.getElementById('about'));


// ==========================================
// TIMETABLE SECTION HANDLER
// ==========================================
let ttCardEls = [];
function generateTimetableCards() {
  ttCardsContainer.innerHTML = '';
  ttCardEls = [];
  classes.forEach(cls => {
    const card = document.createElement('div');
    card.className = 'tt-card';
    card.innerHTML = `
      <div class="card-top">
        <div class="card-day">${cls.day}</div>
        <div class="card-time">${cls.time}</div>
      </div>
      <div class="card-subject">${cls.grade}</div>
      <div class="card-room">${cls.icon} ${cls.room}</div>
    `;
    ttCardsContainer.appendChild(card);
    ttCardEls.push(card);
  });
}

function updateTimetableCanvas(p) {
  if (!ttCanvas) return;
  const cappedP = Math.min(p / 0.84, 1);
  const frameIndex = Math.floor(cappedP * (TIMETABLE_TOTAL_FRAMES - 1));
  if (frameIndex !== lastTtFrame) {
    renderFrame(ttCanvas, ttCtx, ttImages, frameIndex);
    lastTtFrame = frameIndex;
  }
}

function updateTimetableCards(p) {
  const ttHeader = document.querySelector('.tt-header');
  if (p > 0.05) ttHeader.classList.add('in-view');
  else ttHeader.classList.remove('in-view');

  // Mobile animation checks removed so it behaves like desktop

  // cappedP goes from 0 to 1 over the first 84% of the section (finishes right before footer overlaps)
  const cappedP = Math.min(p / 0.84, 1);

  const cardHeight = 150;
  const cardGap = 30;
  const step = cardHeight + cardGap; // 180px
  const containerHeight = ttCardsContainer.clientHeight || 450;

  // Start offset: card 0 starts near the bottom of the container, waiting to appear
  const startOffset = -containerHeight + 100;
  
  // End offset: card 9 floats completely up and disappears off the top
  const endOffset = (9 * step) + cardHeight + 50;

  const maxScroll = endOffset - startOffset;
  const scrollOffset = startOffset + (cappedP * maxScroll);

  ttCardEls.forEach((card, i) => {
    const y = (i * step) - scrollOffset;

    // Viewport center and card center for scaling calculation
    const viewportCenter = containerHeight / 2;
    const cardCenter = y + cardHeight / 2;
    const distFromCenter = cardCenter - viewportCenter;

    // Fade out cards as they go off-screen at the top or bottom
    let opacity = 1;
    if (y < -20) {
      opacity = Math.max(0, 1 + (y + 20) / 100);
    } else if (y > containerHeight - 140) {
      opacity = Math.max(0, 1 - (y - (containerHeight - 140)) / 120);
    }

    // Apply subtle scaling depth based on distance from center
    const scale = Math.max(0.95, 1 - Math.abs(distFromCenter) / 1500);

    card.style.top = '0px';
    card.style.opacity = opacity.toString();
    card.style.transform = `translateY(${y}px) scale(${scale})`;
    card.style.pointerEvents = opacity < 0.1 ? 'none' : 'auto';
  });
}

// ==========================================
// NAV HANDLER
// ==========================================
const navbar = document.getElementById('navbar');
function handleNavScroll() {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  
  // Highlight active link
  const wrappers = ['heroWrapper', 'aboutWrapper', 'ttWrapper', 'footer'];
  let current = '';
  
  wrappers.forEach(id => {
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
      current = id;
    }
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
}

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('nav-active');
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.classList.remove('nav-active');
    const targetId = link.getAttribute('href').substring(1);
    const targetEl = document.getElementById(targetId);
    
    // Set isAutoScrolling to true to prevent snapping engine from hijacking
    isAutoScrolling = true;
    window.scrollTo({
      top: targetEl.offsetTop,
      behavior: 'smooth'
    });
  });
});

// ==========================================
// FOOTER ANIMATION (Intersection Observer)
// ==========================================
function generateFooterCircuit() {
  const svg = document.getElementById('footerCircuitSvg');
  const w = 1440; const h = 900;
  let innerHTML = '';

  // Generate some traces
  const traces = [
    {d: "M0,100 L200,100 L250,150 L500,150 L600,50 L1440,50"},
    {d: "M0,300 L300,300 L400,200 L800,200 L850,250 L1440,250"},
    {d: "M100,0 L100,400 L150,450 L150,900"},
    {d: "M0,700 L400,700 L500,800 L1000,800 L1100,700 L1440,700"},
    {d: "M1200,0 L1200,300 L1150,350 L1150,900"}
  ];

  traces.forEach((trace, i) => {
    // Add path
    innerHTML += `<path class="trace-path" d="${trace.d}" fill="none" stroke="var(--footer-trace)" stroke-width="2" id="trace_${i}" />`;
    // Add nodes at arbitrary points (just visual approximations)
    innerHTML += `<circle cx="200" cy="100" r="3" fill="var(--accent)" />`;
    innerHTML += `<circle cx="500" cy="150" r="3" fill="var(--accent)" />`;
    innerHTML += `<circle cx="100" cy="400" r="3" fill="var(--accent)" />`;
    // Add pulse
    const duration = 3 + Math.random() * 4;
    const delay = Math.random() * 2;
    innerHTML += `<circle class="pulse-circle" r="4" fill="var(--footer-node)" style="--path: path('${trace.d}'); --duration: ${duration}s; --delay: ${delay}s;" />`;
  });

  svg.innerHTML = innerHTML;
}

const footerObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    const paths = document.querySelectorAll('.trace-path');
    paths.forEach((path, i) => {
      path.style.transitionDelay = `${i * 0.15}s`;
      path.classList.add('trace-draw');
    });
    
    const cols = document.querySelectorAll('.footer-col');
    cols.forEach((col, i) => {
      col.style.transitionDelay = `${0.2 + i * 0.18}s`;
      col.classList.add('footer-visible');
    });

    document.querySelector('.footer-bottom').style.transitionDelay = '0.8s';
    document.querySelector('.footer-bottom').classList.add('footer-visible');
  }
}, { threshold: 0.15 });
footerObserver.observe(document.getElementById('footer'));


// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  startLoadingScreen();
});

// ==========================================
// NETWORK CANVAS GIMMICK (Background Mouse Trail)
// ==========================================
const netCanvases = document.querySelectorAll('.net-canvas');
const netCtxs = Array.from(netCanvases).map(c => c.getContext('2d'));

let netW = window.innerWidth;
let netH = window.innerHeight;

netCanvases.forEach(c => {
  c.width = netW;
  c.height = netH;
});

const netParticles = [];
const mouse = { x: -1000, y: -1000 };

// Create some background floating nodes
for (let i = 0; i < 40; i++) {
  netParticles.push({
    x: Math.random() * netW,
    y: Math.random() * netH,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    radius: Math.random() * 2 + 1
  });
}

window.addEventListener('resize', () => {
  netW = window.innerWidth;
  netH = window.innerHeight;
  netCanvases.forEach(c => {
    c.width = netW;
    c.height = netH;
  });
});

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function drawNetwork() {
  netCtxs.forEach(ctx => ctx.clearRect(0, 0, netW, netH));
  
  const accentStr = '44, 123, 182'; 

  netParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    
    if (p.x < 0 || p.x > netW) p.vx *= -1;
    if (p.y < 0 || p.y > netH) p.vy *= -1;
    
    netCtxs.forEach(ctx => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentStr}, 0.6)`;
      ctx.fill();
    });
    
    // Connect to mouse
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 150) {
      netCtxs.forEach(ctx => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = `rgba(${accentStr}, ${0.8 * (1 - dist / 150)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  });
  
  // Connect particles to each other
  for (let i = 0; i < netParticles.length; i++) {
    for (let j = i + 1; j < netParticles.length; j++) {
      const p1 = netParticles[i];
      const p2 = netParticles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        netCtxs.forEach(ctx => {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${accentStr}, ${0.4 * (1 - dist / 100)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    }
  }
  
  requestAnimationFrame(drawNetwork);
}
drawNetwork();
