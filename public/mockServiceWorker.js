/* eslint-disable */
// Minimal no-op worker to avoid 404 in environments that still request this file.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // no-op
});
