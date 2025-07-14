import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill the "browser" global if it doesn't exist
if (typeof window.browser === 'undefined') {
  window.browser = window.chrome || {};
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

