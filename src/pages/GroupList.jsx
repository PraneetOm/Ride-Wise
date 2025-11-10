import { useEffect, useState, useRef } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE?.replace("/api", "") || "https://ride-wise.onrender.com";

export default function GroupList(){
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const [joiningId, setJoiningId] = useState(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(()=> {
    async function load(){
      try {
        const res = await api.get("/groups");
        console.log(res.data);
        setGroups(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  // Realtime member count updates
  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = sock;
    // global refresh signal from server to reload list safely
    let refreshTimer = null;
    const requestRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        try {
          const res = await api.get("/groups");
          setGroups(res.data);
        } catch (err) { console.error(err); }
      }, 150); // debounce bursts
    };

    sock.on("groups-refresh", requestRefresh);
    // also react to room-scoped count updates as a fallback
    sock.on("group-count-updated", requestRefresh);

    return () => { sock.disconnect(); socketRef.current = null; };
  }, []);

  async function handleJoin(g) {
    if (!user) {
      alert("You must be logged in to join a group");
      return;
    }
    try {
      setJoiningId(g.id);

      const res = await api.post("/members", {
        group_id: g.id,
        user_id: user.id,
        member_name: user.name,
        member_email: user.email,
      });
      if (res.data?.member) {
        // navigate to group page; mark joined so chat/features are enabled immediately
        navigate(`/group/${g.id}`, { state: { joinedJustNow: true } });
      } else {
        alert("Could not join group");
      }
    } catch (err) {
      console.error("Join error:", err);
      alert(err.response?.data?.error || "Could not join group");
    } finally {
      setJoiningId(null);
    }
  }

const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className="flex flex-col gap-6 max-h-[90vh] overflow-y-auto pr-2 hide-scrollbar"
    >
      <div className="w-full max-w-5xl mx-auto px-4 md:px-0">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-10 text-center">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3596/3596093.png"
            alt="Groups Icon"
            className="w-16 h-16 mb-3 opacity-90"
          />
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">
            Available Groups
          </h1>
          <p className="text-gray-600 text-lg">
            Join a travel group or{" "}
            <Link
              to="/create"
              className="text-blue-600 font-medium hover:underline"
            >
              create a new one
            </Link>
            .
          </p>
        </div>

        {/* GROUP LIST */}
        {loading ? (
          <p className="text-center text-gray-500 text-lg animate-pulse">
            Loading groups...
          </p>
        ) : groups.length === 0 ? (
          <div className="text-center text-gray-600 text-lg bg-white rounded-2xl shadow-md py-10">
            😕 No groups yet.{" "}
            <Link
              to="/create"
              className="text-blue-600 font-semibold hover:underline"
            >
              Create one
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((g) => {
              const fullLocation = `${g.start_location} → ${g.end_location}`;
              const isLong = fullLocation.length > 45;
              const displayText =
                expanded[g.id] || !isLong
                  ? fullLocation
                  : fullLocation.slice(0, 45) + "...";

              return (
                <div
                  key={g.id}
                  className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border rounded-2xl shadow-sm p-6 hover:shadow-md transition-transform duration-200 hover:-translate-y-1"
                >
                  {/* LEFT CONTENT */}
                  <div className="flex-1 min-w-0 mb-4 md:mb-0 md:pr-6 w-full">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                        {g.group_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        #{g.id?.toString().slice(-4) || "0000"}
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 flex items-center gap-2 break-words">
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/684/684908.png"
                        alt="Location Icon"
                        className="w-6 h-6 shrink-0"
                      />
                      <span className="whitespace-normal break-words">
                        {displayText}{" "}
                        {isLong && (
                          <button
                            onClick={() => toggleExpand(g.id)}
                            className="text-blue-600 text-sm font-medium hover:underline ml-1"
                          >
                            {expanded[g.id] ? "See less" : "See more"}
                          </button>
                        )}
                      </span>
                    </h2>

                    {(g.time_range_start || g.time_range_end) && (
                      <div className="mt-3 text-gray-700 text-base md:text-lg flex items-center gap-2 flex-wrap">
                        <span className="text-blue-600 text-xl">🕒</span>
                        <span>
                          {g.time_range_start
                            ? new Date(g.time_range_start).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "--:--"}{" "}
                          –{" "}
                          {g.time_range_end
                            ? new Date(g.time_range_end).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "--:--"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT ACTIONS */}
                  <div className="flex items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-800 text-sm md:text-base font-medium shadow-sm">
                      👥 {Number(g.number_of_members || 0)}
                    </span>
                    <button
                      onClick={() => handleJoin(g)}
                      disabled={joiningId === g.id}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm md:text-base font-semibold shadow-md transition disabled:opacity-60"
                    >
                      {joiningId === g.id ? "Joining…" : "Join Group"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hide Scrollbar CSS */}
      <style jsx>{`
        .hide-scrollbar {
          scrollbar-width: none; /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Edge */
        }
      `}</style>
    </div>
  );
}