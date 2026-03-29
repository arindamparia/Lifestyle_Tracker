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

// ── Banner DOM ─────────────────────────────────────────────────────────────

let deferredPrompt = null;
let bannerEl = null;

const ICON_SVG = `<svg width="38" height="38" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="108" fill="#0d0e14"/>
  <defs>
    <linearGradient id="pi-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b7df8"/>
      <stop offset="100%" stop-color="#6C5CE7"/>
    </linearGradient>
  </defs>
  <path d="M256 88C230 140 148 230 148 302C148 370 196 418 256 418C316 418 364 370 364 302C364 230 282 140 256 88Z" fill="url(#pi-g)"/>
  <path d="M190 308 Q223 288 256 304 Q289 320 322 300" stroke="rgba(255,255,255,0.45)" stroke-width="16" fill="none" stroke-linecap="round"/>
</svg>`;

// iOS share arrow icon
const IOS_SHARE_SVG = `<svg class="pwa-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
  <polyline points="16 6 12 2 8 6"/>
  <line x1="12" y1="2" x2="12" y2="15"/>
</svg>`;

function buildBanner(platform) {
  const el = document.createElement('div');
  el.className = 'pwa-banner';
  el.setAttribute('role', 'banner');

  if (platform === 'android') {
    el.innerHTML = `
      <div class="pwa-banner__icon">${ICON_SVG}</div>
      <div class="pwa-banner__body">
        <div class="pwa-banner__title">Install LifeStyle Tracker</div>
        <div class="pwa-banner__sub">Add to your home screen for the best experience</div>
      </div>
      <div class="pwa-banner__actions">
        <button class="pwa-banner__install">Install</button>
        <button class="pwa-banner__dismiss">Not now</button>
      </div>`;

    el.querySelector('.pwa-banner__install').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') removeBanner();
    });

  } else if (platform === 'ios') {
    el.innerHTML = `
      <div class="pwa-banner__icon">${ICON_SVG}</div>
      <div class="pwa-banner__body">
        <div class="pwa-banner__title">Add to Home Screen</div>
        <div class="pwa-banner__sub">Tap ${IOS_SHARE_SVG} then <b>"Add to Home Screen"</b></div>
      </div>
      <div class="pwa-banner__actions">
        <button class="pwa-banner__dismiss">Got it</button>
      </div>`;

  } else if (platform === 'macos-safari') {
    el.innerHTML = `
      <div class="pwa-banner__icon">${ICON_SVG}</div>
      <div class="pwa-banner__body">
        <div class="pwa-banner__title">Add to Dock</div>
        <div class="pwa-banner__sub">In Safari, go to <b>File → Add to Dock…</b></div>
      </div>
      <div class="pwa-banner__actions">
        <button class="pwa-banner__dismiss">Got it</button>
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
  bannerEl = buildBanner(platform);
  document.body.appendChild(bannerEl);
  // Double rAF ensures the element is painted before the transition starts
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bannerEl?.classList.add('pwa-banner--in');
  }));
}

function removeBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('pwa-banner--in');
  bannerEl.classList.add('pwa-banner--out');
  setTimeout(() => { bannerEl?.remove(); bannerEl = null; }, 380);
}

// ── Public API ─────────────────────────────────────────────────────────────

export function initPWAInstall() {
  if (isStandalone() || isDismissedRecently()) return;

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
