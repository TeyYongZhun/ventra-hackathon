import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Track from './pages/Track';
import Medicine from './pages/Medicine';
import AskAI from './pages/AskAI';
import More from './pages/More';
import Emergency from './pages/Emergency';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/track" element={<Track />} />
          <Route path="/medicine" element={<Medicine />} />
          <Route path="/ask" element={<AskAI />} />
          <Route path="/more" element={<More />} />
          <Route path="/emergency" element={<Emergency />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
