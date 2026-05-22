import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// Register the service worker for offline support + installability.
// autoUpdate: a new deploy installs in the background and applies next launch.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW() {
    // Service worker registered successfully.
  },
  onRegisterError(error) {
    console.warn('PWA service worker registration failed:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
