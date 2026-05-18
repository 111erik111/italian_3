import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register the service worker for offline support + installability.
// Wrapped in a dynamic import so a missing/disabled PWA plugin never
// blocks the app from rendering.
async function setupPWA() {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch (e) {
    // PWA registration unavailable - app still works, just no offline cache.
    console.warn('PWA registration skipped:', e);
  }
}
setupPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
