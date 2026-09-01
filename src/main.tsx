import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { requestTaketalonLogoWarmup, TAKETALON_BRAND_LOGO_URL } from './lib/taketalonBrandLogo';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => {
        requestTaketalonLogoWarmup(TAKETALON_BRAND_LOGO_URL);
      })
      .catch((error) => {
        console.warn('TakeTalon PWA service worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
