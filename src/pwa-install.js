/**
 * PWA Install Banner — compact horizontal card, matches design reference.
 * Dismissed state persists in localStorage for 7 days.
 */

const LS_KEY = 'lt_pwa_dismissed';

// ── Helpers ─────────────────────────────────────────────────────────────────

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  navigator.standalone === true;

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

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

const isMacOSSafari = () =>
  /Macintosh/i.test(navigator.userAgent) &&
  /Safari/i.test(navigator.userAgent) &&
  !/Chrome|CriOS|FxiOS|EdgA|OPR/i.test(navigator.userAgent);

const isDismissedRecently = () => {
  const ts = localStorage.getItem(LS_KEY);
  if (!ts) return false;
  return (Date.now() - parseInt(ts, 10)) / 864e5 < 3;
};

// ── App icon ─────────────────────────────────────────────────────────────────

const APP_ICON = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="108" fill="#0d0e14"/>
  <defs>
    <linearGradient id="pi-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9180ff"/>
      <stop offset="100%" stop-color="#6C5CE7"/>
    </linearGradient>
  </defs>
  <path d="M256 88C230 140 148 230 148 302C148 370 196 418 256 418C316 418 364 370 364 302C364 230 282 140 256 88Z" fill="url(#pi-g)"/>
  <path d="M190 308 Q223 288 256 304 Q289 320 322 300" stroke="rgba(255,255,255,0.40)" stroke-width="16" fill="none" stroke-linecap="round"/>
</svg>`;

// ── Banner ───────────────────────────────────────────────────────────────────

let deferredPrompt = null;
let bannerEl = null;

const SUBTITLES = {
  android:        'Add to your home screen for quick access',
  ios:            'Tap Share → Add to Home Screen',
  'macos-safari': 'Safari menu → File → Add to Dock…',
};

function buildBanner(platform) {
  const el = document.createElement('div');
  el.className = 'pwa-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Install app');

  el.innerHTML = `
    <div class="pwa-banner__icon">${APP_ICON}</div>
    <div class="pwa-banner__text">
      <div class="pwa-banner__title">Install LifeStyle Tracker</div>
      <div class="pwa-banner__sub">${SUBTITLES[platform]}</div>
      <div class="pwa-banner__actions">
        <button class="pwa-banner__install">Install</button>
        <button class="pwa-banner__dismiss">Not now</button>
      </div>
    </div>
  `;

  el.querySelector('.pwa-banner__install').addEventListener('click', async () => {
    if (platform === 'android' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') { removeBanner(); return; }
    }
    // iOS / macOS — can't trigger native prompt; dismiss as acknowledged
    localStorage.setItem(LS_KEY, Date.now().toString());
    removeBanner();
  });

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
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bannerEl?.classList.add('pwa-banner--in');
  }));
}

function removeBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('pwa-banner--in');
  bannerEl.classList.add('pwa-banner--out');
  const b = bannerEl;
  setTimeout(() => b.remove(), 300);
  bannerEl = null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function initPWAInstall() {
  if (isDismissedRecently() || await isNativeInstalled()) return;

  // Android / Chrome — capture the native prompt as early as possible
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner('android');
  });

  window.addEventListener('appinstalled', () => removeBanner());

  if (isIOS()) {
    setTimeout(() => showBanner('ios'), 2000);
    return;
  }

  if (isMacOSSafari()) {
    setTimeout(() => showBanner('macos-safari'), 2000);
  }
}

// vite-plugin-pwa handles SW registration via registerType: 'autoUpdate'.
export function registerSW() {}
