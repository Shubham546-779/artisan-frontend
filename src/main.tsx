import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'

// Initialize EmailJS with your public key
const initEmailJS = () => {
  const ejs = (window as any).emailjs;
  const key = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (ejs && key) {
    ejs.init(key);
    console.log('EmailJS initialized ✓');
  } else {
    console.warn('EmailJS not ready yet, retrying...');
    setTimeout(initEmailJS, 500);
  }
};

initEmailJS();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)