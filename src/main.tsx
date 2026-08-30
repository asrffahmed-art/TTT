import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global error handlers to prevent uncaught runtime crashes
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled Promise Rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.warn('Uncaught Runtime Error:', event.error || event.message);
});

// Global Ripple Effect Listener
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button, .ripple-target') as HTMLElement;
  
  if (!button) return;
  if ((button as HTMLButtonElement).disabled) return;

  const computedStyle = window.getComputedStyle(button);
  if (computedStyle.position === 'static') {
    button.style.position = 'relative';
  }
  button.style.overflow = 'hidden';

  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple-effect';
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);

