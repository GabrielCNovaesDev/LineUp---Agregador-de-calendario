import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="app-shell">
      <h1>Sports Calendar</h1>
      <p>Frontend PWA inicial. A tela de calendario entra na Sprint 3.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
