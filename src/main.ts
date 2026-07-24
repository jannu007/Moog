import { mountApp } from './ui/App';

const root = document.getElementById('app');
if (root) mountApp(root);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
