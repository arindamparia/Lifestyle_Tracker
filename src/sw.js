/**
 * Service Worker — LifeStyle Tracker
 *
 * Strategy: injectManifest (vite-plugin-pwa)
 * - self.__WB_MANIFEST is replaced at build time with the precache asset list
 * - Runtime caching rules mirror what was previously in vite.config.js workbox block
 * - notificationclick handler: tapping any app notification opens/focuses the PWA
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute }    from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin }          from 'workbox-expiration';
import { CacheableResponsePlugin }   from 'workbox-cacheable-response';
import { clientsClaim }              from 'workbox-core';

// ── Activate new SW immediately — don't wait for all tabs to close ────────────
// Without this, a new deploy sits "waiting" until the user manually closes all
// PWA windows, which is why "delete site data" was needed to see updates.
self.skipWaiting();
clientsClaim();

// ── Precache all build artifacts (JS, CSS, HTML, fonts, icons) ───────────────
// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);

// Remove caches from old precache revisions to keep storage tidy
cleanupOutdatedCaches();

// ── Runtime caching ───────────────────────────────────────────────────────────

// Google Fonts — CSS stylesheets (long-lived, CacheFirst)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Google Fonts — webfont files (long-lived, CacheFirst, allow opaque responses)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Netlify functions — NetworkFirst so fresh data wins, cache as offline fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/.netlify/functions/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
);

// ── Notification click — open / focus the PWA when user taps a notification ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If a PWA window is already open anywhere, focus it
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        // Otherwise open a fresh window at the app root
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});
