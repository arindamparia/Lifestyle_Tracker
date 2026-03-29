/**
 * PWA Install Banner
 * Handles Android/Chrome (native prompt), iOS Safari and macOS Safari (manual instructions).
 * Dismissed state persists in localStorage for 3 days (7 on Safari).
 */

const LS_KEY = 'lt_pwa_dismissed';

// ── Platform detection ─────────────────────────────────────────────────────

const _ua = () => navigator.userAgent;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

// Android Chrome 73+: detects if the PWA is already installed at the OS level,
// even when the user is visiting the site in a regular browser tab.
const isNativeInstalled = async () => {
  if (isStandalone()) return true;
  if ('getInstalledRelatedApps' in navigator) {
    try {
      const apps = await navigator.getInstalledRelatedApps();
      return apps.length > 0;
    } catch { return false; }
  }
  return false;
};

const isIOS = () =>
  /iphone|ipad|ipod/i.test(_ua()) && !window.MSStream;

const isMacOSSafari = () =>
  /Macintosh/i.test(_ua()) &&
  /Safari/i.test(_ua()) &&
  !/Chrome|CriOS|FxiOS|EdgA|OPR/i.test(_ua());

const isSafariBrowser = () => isIOS() || isMacOSSafari();

const isDismissedRecently = () => {
  const ts = localStorage.getItem(LS_KEY);
  if (!ts) return false;
  const days = (Date.now() - parseInt(ts, 10)) / 864e5;
  return days < (isSafariBrowser() ? 7 : 3);
};

// ── SVG assets ─────────────────────────────────────────────────────────────

const ICON_SVG = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="108" fill="#0d0e14"/>
  <defs>
    <linearGradient id="pi-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9180ff"/>
      <stop offset="100%" stop-color="#6C5CE7"/>
    </linearGradient>
    <radialGradient id="pi-glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="rgba(145,128,255,0.18)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <ellipse cx="256" cy="200" rx="160" ry="180" fill="url(#pi-glow)"/>
  <path d="M256 88C230 140 148 230 148 302C148 370 196 418 256 418C316 418 364 370 364 302C364 230 282 140 256 88Z" fill="url(#pi-g)"/>
  <path d="M190 308 Q223 288 256 304 Q289 320 322 300" stroke="rgba(255,255,255,0.40)" stroke-width="16" fill="none" stroke-linecap="round"/>
</svg>`;

const IOS_SHARE_SVG = `<svg class="pwa-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
  <polyline points="16 6 12 2 8 6"/>
  <line x1="12" y1="2" x2="12" y2="15"/>
</svg>`;

// ── HTML fragments ──────────────────────────────────────────────────────────

const BENEFITS_HTML = `
  <ul class="pwa-banner__benefits">
    <li class="pwa-banner__benefit">
      <span class="pwa-banner__benefit-icon">✓</span>
      Works offline — no internet needed
    </li>
    <li class="pwa-banner__benefit">
      <span class="pwa-banner__benefit-icon">✓</span>
      Instant launch from your home screen
    </li>
    <li class="pwa-banner__benefit">
      <span class="pwa-banner__benefit-icon">✓</span>
      Full screen, no browser chrome
    </li>
  </ul>`;

const IOS_STEPS_HTML = `
  <ul class="pwa-banner__steps">
    <li class="pwa-banner__step">
      <span class="pwa-banner__step-num">1</span>
      <span>Tap ${IOS_SHARE_SVG} <b>Share</b> at the bottom of your browser</span>
    </li>
    <li class="pwa-banner__step">
      <span class="pwa-banner__step-num">2</span>
      <span>Scroll and tap <b>"Add to Home Screen"</b></span>
    </li>
  </ul>`;

const MACOS_STEPS_HTML = `
  <ul class="pwa-banner__steps">
    <li class="pwa-banner__step">
      <span class="pwa-banner__step-num">1</span>
      <span>In the Safari menu bar, click <b>File</b></span>
    </li>
    <li class="pwa-banner__step">
      <span class="pwa-banner__step-num">2</span>
      <span>Select <b>"Add to Dock…"</b></span>
    </li>
  </ul>`;

// ── Banner DOM ─────────────────────────────────────────────────────────────

let deferredPrompt = null;
let bannerEl = null;
let scrimEl  = null;

const PLATFORM_COPY = {
  android:      { title: 'Install LifeStyle Tracker', sub: 'Add to your home screen' },
  ios:          { title: 'Add to Home Screen',        sub: 'Install in 2 quick steps' },
  'macos-safari': { title: 'Add to Dock',             sub: 'Install via Safari menu'  },
};

function buildBanner(platform) {
  const el = document.createElement('div');
  el.className = 'pwa-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Install app prompt');

  const { title, sub } = PLATFORM_COPY[platform];

  const header = `
    <div class="pwa-banner__handle"></div>
    <div class="pwa-banner__inner">
      <div class="pwa-banner__header">
        <div class="pwa-banner__icon">${ICON_SVG}</div>
        <div class="pwa-banner__headline">
          <div class="pwa-banner__title">${title}</div>
          <div class="pwa-banner__sub">${sub}</div>
        </div>
      </div>`;

  const divider = `<div class="pwa-banner__divider"></div>`;

  if (platform === 'android') {
    el.innerHTML = header + divider + BENEFITS_HTML + `
      <div class="pwa-banner__actions">
        <button class="pwa-banner__install">
          <span class="pwa-banner__install-spark">✦</span>
          Install App
        </button>
        <button class="pwa-banner__dismiss">Not now</button>
      </div>
    </div>`;

    el.querySelector('.pwa-banner__install').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') removeBanner();
    });

  } else if (platform === 'ios') {
    el.innerHTML = header + divider + IOS_STEPS_HTML + `
      <div class="pwa-banner__actions">
        <button class="pwa-banner__dismiss pwa-banner__dismiss--sole">Got it, thanks</button>
      </div>
    </div>`;

  } else if (platform === 'macos-safari') {
    el.innerHTML = header + divider + MACOS_STEPS_HTML + `
      <div class="pwa-banner__actions">
        <button class="pwa-banner__dismiss pwa-banner__dismiss--sole">Got it, thanks</button>
      </div>
    </div>`;
  }

  el.querySelector('.pwa-banner__dismiss').addEventListener('click', () => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    removeBanner();
  });

  return el;
}

function showBanner(platform) {
  if (bannerEl || isStandalone()) return;

  // Scrim
  scrimEl = document.createElement('div');
  scrimEl.className = 'pwa-scrim';
  // Scrim click just closes — does NOT count as a user dismissal
  scrimEl.addEventListener('click', () => removeBanner());
  document.body.appendChild(scrimEl);

  bannerEl = buildBanner(platform);
  document.body.appendChild(bannerEl);

  // Double rAF — ensure paint before transition
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scrimEl?.classList.add('pwa-scrim--in');
    bannerEl?.classList.add('pwa-banner--in');
  }));
}

function removeBanner() {
  if (!bannerEl) return;

  if (scrimEl) {
    scrimEl.classList.remove('pwa-scrim--in');
    const s = scrimEl;
    setTimeout(() => { s.remove(); }, 350);
    scrimEl = null;
  }

  bannerEl.classList.remove('pwa-banner--in');
  bannerEl.classList.add('pwa-banner--out');
  const b = bannerEl;
  setTimeout(() => { b.remove(); }, 350);
  bannerEl = null;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function initPWAInstall() {
  // Skip if already installed (native OS check) or user dismissed recently
  if (isDismissedRecently() || await isNativeInstalled()) return;

  // Android / Chrome — wait for the native installability event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner('android');
  });

  window.addEventListener('appinstalled', () => removeBanner());

  // iOS Safari — show manual instructions after a short delay
  if (isIOS()) {
    setTimeout(() => showBanner('ios'), 3000);
    return;
  }

  // macOS Safari — show Dock instructions after a short delay
  if (isMacOSSafari()) {
    setTimeout(() => showBanner('macos-safari'), 3000);
  }
}

// vite-plugin-pwa handles SW registration via registerType: 'autoUpdate'.
// Exported for interface compatibility with the spec.
export function registerSW() {}
