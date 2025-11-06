import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CreateGroup from "./pages/CreateGroup";
import GroupList from "./pages/GroupList";
import GroupPage from "./pages/GroupPage";
import Login from "./pages/AuthPage";

function NavBar(){
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(Boolean(localStorage.getItem("token")));
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    // simple polling of auth changes across tabs
    const onStorage = () => setIsAuthed(Boolean(localStorage.getItem("token")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthed(false);
    navigate("/");
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-5 py-3 flex justify-between items-center">
        {/* LEFT: Brand */}
        <Link
          to="/groups"
          className="flex items-center gap-2 text-white font-extrabold text-2xl tracking-tight hover:opacity-90 transition"
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3596/3596093.png"
            alt="RideWise"
            className="w-8 h-8"
          />
          RideWise
        </Link>
  
        {/* RIGHT: Navigation Links */}
        <div className="flex items-center gap-5">
          <Link
            to="/groups"
            className="text-white/90 text-sm font-medium hover:text-white transition"
          >
            Groups
          </Link>
          <Link
            to="/create"
            className="bg-white text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm hover:bg-blue-50 transition"
          >
            + Create Group
          </Link>
  
          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-white/40" />
  
          {/* User Info & Logout */}
          <div className="flex items-center gap-3">
            {user?.name && (
              <span className="text-white/90 text-sm font-medium hidden sm:inline">
                👋 {user.name.split(" ")[0]}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-blue-900 hover:bg-blue-950 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
  
}

export default function App(){
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <NavBar />

        <main className="p-6">
          <Routes>                
            <Route path="/" element={<Login />} />
            <Route path="/groups" element={<GroupList/>} />
            <Route path="/create" element={<CreateGroup/>} />
            <Route path="/group/:id" element={<GroupPage/>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}