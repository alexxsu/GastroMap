
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useLanguageState, LanguageContext } from './hooks/useLanguage';

// Language Provider Component
const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const languageState = useLanguageState();
  return (
    <LanguageContext.Provider value={languageState}>
      {children}
    </LanguageContext.Provider>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
      
      // Check for updates immediately
      registration.update();
      
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update();
      }, 60000);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - reload to get it
              console.log('New version available, reloading...');
              window.location.reload();
            }
          });
        }
      });
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
    
    // Handle controller change (when new service worker takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated, reloading...');
      window.location.reload();
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
