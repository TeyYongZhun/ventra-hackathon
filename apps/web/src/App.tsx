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
import Report from './pages/Report';
import WeighEnter from './pages/WeighEnter';
import SignUp from './pages/SignUp';
import Setup from './pages/Setup';
import Feel from './pages/Feel';
import Status from './pages/Status';
import CapSize from './pages/CapSize';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/track" element={<Track />} />
          <Route path="/medicine" element={<Medicine />} />
          <Route path="/ask" element={<AskAI />} />
          <Route path="/more" element={<More />} />
          <Route path="/alert" element={<Alert />} />
          <Route path="/status" element={<Navigate to="/status/green" replace />} />
          <Route path="/status/:colour" element={<Status />} />
          <Route path="/nurse" element={<NurseCall />} />
          <Route path="/family" element={<Family />} />
          <Route path="/report" element={<Report />} />
          <Route path="/weigh" element={<WeighEnter />} />
          <Route path="/feel" element={<Feel />} />
          <Route path="/cap" element={<CapSize />} />
        </Route>
        {/* Set-up for a new patient, then the full-screen emergency flow: no menu. */}
        <Route path="/setup/:step" element={<Setup />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/emergency/countdown" element={<EmergencyCountdown />} />
        <Route path="/emergency/call" element={<EmergencyCall />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export default App;
