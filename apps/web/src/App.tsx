import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { RequireAuth } from './components/RequireAuth';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Track from './pages/Track';
import Medicine from './pages/Medicine';
import AskAI from './pages/AskAI';
import More from './pages/More';
import Alert from './pages/Alert';
import NurseCall from './pages/NurseCall';
import Family from './pages/Family';
import Emergency, { EmergencyCall, EmergencyCountdown } from './pages/Emergency';

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
          <Route path="/alert" element={<Alert />} />
          <Route path="/nurse" element={<NurseCall />} />
          <Route path="/family" element={<Family />} />
        </Route>
        {/* Full-screen emergency flow: no menu, nothing to distract. */}
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/emergency/countdown" element={<EmergencyCountdown />} />
        <Route path="/emergency/call" element={<EmergencyCall />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;
