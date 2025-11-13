import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import CreateGroup from "./pages/CreateGroup";
import GroupList from "./pages/GroupList";
import GroupPage from "./pages/GroupPage";
import Login from "./pages/AuthPage";

// -------------------- NavBar --------------------
function NavBar() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(Boolean(localStorage.getItem("token")));
  const [menuOpen, setMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const onStorage = () => setIsAuthed(Boolean(localStorage.getItem("token")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthed(false);
    setMenuOpen(false);
    navigate("/");
  };

  if (!isAuthed) return null;

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 py-3 flex justify-between items-center">
        {/* LEFT: Brand */}
        <Link
          to="/groups"
          className="flex items-center gap-2 text-white font-extrabold text-2xl tracking-tight hover:opacity-90 transition"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3596/3596093.png"
            alt="RideWise"
            className="w-8 h-8"
          />
          RideWise
        </Link>

        {/* HAMBURGER BUTTON (Mobile) */}
        <button
          className="sm:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* RIGHT: Navigation Links */}
        <div
          className={`${
            menuOpen
              ? "flex flex-col p-2 absolute top-14 left-0 w-full space-y-2 bg-blue-600 border-t border-blue-400"
              : "hidden"
          } sm:flex sm:flex-row sm:items-center sm:gap-5 sm:static sm:bg-transparent sm:border-0 transition-all`}
        >
          <Link
            to="/groups"
            onClick={() => setMenuOpen(false)}
            className="text-white/90 text-sm font-medium hover:text-white transition px-5 py-2 sm:p-0"
          >
            Groups
          </Link>

          <Link
            to="/create"
            onClick={() => setMenuOpen(false)}
            className="bg-white text-blue-700 text-sm font-semibold px-5 py-2 rounded-full shadow-sm hover:bg-blue-50 transition mx-4 sm:mx-0"
          >
            + Create Group
          </Link>

          {/* Divider (desktop only) */}
          <div className="hidden sm:block w-px h-6 bg-white/40" />

          {/* User Info & Logout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 border-t sm:border-0 border-blue-500 sm:border-none px-5 sm:px-0">
            {user?.name && (
              <span className="text-white/90 text-sm font-medium py-2 sm:py-0">
                👋 {user.name.split(" ")[0]}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-blue-950 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm transition mt-2 sm:mt-0"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// -------------------- App --------------------
function App() {
  const location = useLocation();
  const hideNav = location.pathname === "/";

  const [authKey, setAuthKey] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const onStorage = () => setAuthKey(localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {!hideNav && <NavBar key={authKey} />}

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/groups" element={<GroupList />} />
          <Route path="/create" element={<CreateGroup />} />
          <Route path="/group/:id" element={<GroupPage />} />
        </Routes>
      </main>
    </div>
  );
}

// -------------------- Export --------------------
export default function RootApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
