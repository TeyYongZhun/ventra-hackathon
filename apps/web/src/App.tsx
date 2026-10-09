import { Routes, Route } from 'react-router-dom';
import Gallery from './pages/Gallery';

function App() {
  return (
    <Routes>
      <Route path="/gallery" element={<Gallery />} />
      <Route
        path="/"
        element={
          <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
            <h1>Ventra</h1>
            <p>Heart-failure self-care companion</p>
            <a href="/gallery" style={{ color: 'var(--color-blue-ink)', fontSize: 'var(--text-body)' }}>
              Open component gallery
            </a>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
