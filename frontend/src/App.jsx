import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home                 from "./pages/Home";
import CreateSession        from "./pages/CreateSession";
import JoinSession          from "./pages/JoinSession";
import ParticipantDashboard from "./pages/ParticipantDashboard";
import MonitorScreen        from "./pages/MonitorScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                                  element={<Home />} />
        <Route path="/session/:sessionId/setup"          element={<CreateSession />} />
        <Route path="/join/:sessionId"                   element={<JoinSession />} />
        <Route path="/session/:sessionId/dashboard"      element={<ParticipantDashboard />} />
        <Route path="/monitor/:sessionId"                element={<MonitorScreen />} />
        <Route path="*"                                  element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
