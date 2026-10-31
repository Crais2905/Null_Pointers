import { Link, Route, Routes } from "react-router-dom";
import Incident from "./pages/Incident";
import DevInbox from "./pages/DevInbox";
import Team from "./pages/Team";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex gap-4 border-b bg-white px-4 py-3 text-sm">
        <Link to="/">Інцидент</Link>
        <Link to="/inbox">Inbox дева</Link>
        <Link to="/team">Команда</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Incident />} />
        <Route path="/inbox" element={<DevInbox />} />
        <Route path="/team" element={<Team />} />
      </Routes>
    </div>
  );
}
