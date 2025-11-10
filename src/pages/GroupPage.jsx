import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { io } from "socket.io-client";
import CabLauncher from "../components/CabLauncher";


const SOCKET_URL = import.meta.env.VITE_API_BASE?.replace("/api", "") || "https://ride-wise.onrender.com";

export default function GroupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [joined, setJoined] = useState(true);

  const socketRef = useRef(null);
  const messagesEnd = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isGuest = !user;

  async function refreshMembersAndCount() {
    try {
      const membersRes = await api.get(`/members/group/${id}`);
      const nextMembers = membersRes.data || [];
      async function load() {
        try {
          const res = await api.get("/groups/id", { params: { group_id: id } });
          console.log(res.data);
          setGroup(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
      }
      load();
      setMembers(nextMembers);
    } catch (err) {
      console.error("Failed to refresh members:", err);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/groups/${id}`);
        console.log(res);
        setGroup(res);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  // 🔹 Load group + members initially
  useEffect(() => {
    async function loadData() {
      try {
        const [groupsRes, membersRes] = await Promise.all([
          api.get(`/groups`),
          api.get(`/members/group/${id}`)
        ]);
        const found = groupsRes.data.find((x) => String(x.id) === String(id));
        const memberList = membersRes.data || [];
        setMembers(memberList);
        async function load() {
          try {
            const res = await api.get(`/groups/${id}`);
            console.log(found);
            setGroup(res.data);
          } catch (err) { console.error(err); }
          setLoading(false);
        }
        load();
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }

    loadData();
  }, [id]);

  // 🔹 Setup socket connection
  useEffect(() => {
    const sock = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = sock;

    sock.on("connect", () => {
      console.log("Socket connected", sock.id);
      sock.emit("join-group", {
        groupId: id,
        userName: user?.name || guestName || "Anonymous",
      });
    });

    sock.on("connect_error", (err) => console.error("Socket connect error:", err));

    // ✅ Listen for member updates → always refetch to keep everyone in sync
    sock.on("member-added", () => { refreshMembersAndCount(); });
    sock.on("member-left", () => { refreshMembersAndCount(); });
    sock.on("member-removed", () => { refreshMembersAndCount(); });

    // ✅ Keep group member count in sync with backend
    sock.on("group-count-updated", ({ group_id }) => {
      if (String(group_id) !== String(id)) return;
      refreshMembersAndCount();
    });

    // ✅ Listen for chat messages (dedupe incoming to avoid duplicating optimistic messages)
    sock.on("chat-message", (payload) => {
      setMessages((prev) => {
        // If payload contains clientId (added by sender) and we've already got it, ignore
        if (payload.clientId && prev.some((m) => m.clientId === payload.clientId)) {
          return prev;
        }
        // Fallback dedupe: same sender + same text + timestamps very close
        if (
          !payload.clientId &&
          prev.some(
            (m) =>
              m.senderId === payload.senderId &&
              m.message === payload.message &&
              Math.abs((m.timestamp || 0) - (payload.timestamp || 0)) < 2000
          )
        ) {
          return prev;
        }
        return [...prev, payload];
      });
    });

    // ✅ System messages
    sock.on("user-joined", async ({ userName }) => {
      setMessages((prev) => [...prev, { system: true, message: `${userName} joined the group` }]);
      refreshMembersAndCount();
    });
    sock.on("user-left", ({ userName }) => {
      setMessages((prev) => [...prev, { system: true, message: `${userName} left the group` }]);
      refreshMembersAndCount();
    });

    return () => {
      // ✅ proper cleanup on page close/unmount
      sock.emit("leave-group", {
        groupId: id,
        userName: user?.name || guestName || "Anonymous",
      });
      sock.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  // 🔹 Scroll to bottom when messages update
  useEffect(() => {
    const chatContainer = messagesEnd.current?.parentNode;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  // (Join is moved to GroupList; only leave remains here)

  const handleLeaveGroup = async () => {
    if (!user) return alert("You must be logged in to leave");
    try {
      // show quick UI feedback (optimistic)
      setJoined(false);
      // optimistically remove current user from local members list for immediate UI correctness
      setMembers((prev) => prev.filter((m) => String(m.user_id || m.id) !== String(user.id)));

      navigate("/groups");
      const res = api.post("/members/leave_user", {
        group_id: id,
        user_id: user.id,
      });

      console.log("leave response:", res.data);

      // refetch member list from server to keep everything consistent
      const membersRes = await api.get(`/members/group/${id}`);
      setMembers(membersRes.data || []);

      // leave room; server will broadcast
      socketRef.current?.emit("leave-group", { groupId: id, userName: user.name });

      alert(res.data.message || "Left group");
    } catch (err) {
      console.error("Leave error:", err);
      alert(err.response?.data?.error || err.response?.data?.message || "Could not leave group");
      // revert optimistic UI if needed
      const membersRes = await api.get(`/members/group/${id}`).catch(() => null);
      if (membersRes?.data) setMembers(membersRes.data);
      setJoined(membersRes?.data?.some((m) => String(m.user_id || m.id) === String(user.id)) || false);
    }
  };

  // 🔹 Guest add member
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  async function handleAddMember(e) {
    e.preventDefault();
    if (!guestName.trim()) return alert("Enter your name");
    try {
      const res = await api.post("/members", {
        group_id: id,
        member_name: guestName,
        member_email: guestEmail,
      });
      if (res.data.member) {
        setMembers((prev) => [...prev, res.data.member]);
        setGuestName("");
        setGuestEmail("");
        // server broadcasts updates
      }
    } catch (err) {
      console.error("Guest join error:", err);
      alert("Could not add member");
    }
  }

  // 🔹 Send message
  function sendMessage(e) {
    e.preventDefault();
    if (!socketRef.current) return alert("Not connected to chat");
    if (!msgText.trim()) return;

    const clientId = `${user?.id || "guest"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      groupId: id,
      message: msgText,
      userName: user?.name || guestName || "Anonymous",
      senderId: user?.id || "guest",
      timestamp: Date.now(),
      clientId,
    };

    // optimistic local append
    setMessages((prev) => [...prev, payload]);

    socketRef.current.emit("chat-message", payload);

    setMsgText("");
  }

  // 🕒 Show expected trip time
  const expectedStartTime = group?.data.time_range_start
    ? new Date(group.data.time_range_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : "Not specified";
  const expectedEndTime = group?.data.time_range_end
    ? new Date(group.data.time_range_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : "Not specified";

  const liveMemberCount = (group && typeof group.data.number_of_members !== "undefined")
    ? Number(group.data.number_of_members || 0)
    : Number(members.length || 0);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-gray-100 min-h-screen">
      {/* GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT PANEL */}
        <div className="col-span-1 bg-white p-5 sm:p-6 rounded-2xl shadow-lg border relative">
          {/* Decorative Background */}
          <img
            src="https://cdn-icons-png.flaticon.com/512/2991/2991108.png"
            alt="Group Icon"
            className="absolute opacity-10 right-4 top-4 w-16 sm:w-20"
          />

          <h2 className="font-bold text-xl sm:text-2xl mb-1 text-blue-700">
            {group?.data.group_name || "Unnamed Group"}
          </h2>
          <p className="text-gray-600 text-sm mb-3">
            📍 {group?.data.start_location} → {group?.data.end_location}
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-md text-sm text-gray-700 mb-3">
            <span className="font-semibold text-blue-800">🕒 Time Window:</span>{" "}
            {expectedStartTime} – {expectedEndTime}
          </div>

          <div className="text-gray-700 text-sm mb-4">
            👥 <span className="font-medium">{liveMemberCount}</span> active member
            {liveMemberCount !== 1 && "s"}
          </div>

          <hr className="my-3 border-gray-300" />

          {/* Members Section */}
          <h3 className="font-semibold text-lg mb-2 text-gray-800">Members</h3>
          <ul className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pr-1">
            {members.map((m) => (
              <li
                key={m.id || m.member_id}
                className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 border rounded-lg transition"
              >
                <div>
                  <div className="font-medium text-gray-800 text-sm sm:text-base">
                    {m.member_name || m.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {m.member_email || m.email}
                  </div>
                </div>
                <div className="text-sm text-green-600 font-semibold">
                  ₹{Number(m.contribution || 0).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>

          {/* Add/Leave Section */}
          <div className="mt-5">
            {isGuest ? (
              <form
                onSubmit={handleAddMember}
                className="space-y-3 bg-gray-50 p-3 rounded-xl border"
              >
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full p-2 border rounded-lg text-sm"
                />
                <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
                  ➕ Join Group
                </button>
              </form>
            ) : joined ? (
              <button
                onClick={handleLeaveGroup}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition"
              >
                🚪 Leave Group
              </button>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Join this group to access full features.
              </div>
            )}
          </div>

          <div className="mt-5">
            <CabLauncher />
          </div>
        </div>

        {/* RIGHT PANEL — CHAT SECTION */}
        <div className="col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-lg border flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-2">
              💬 Live Chat
            </h3>
            <img
              src="https://cdn-icons-png.flaticon.com/512/1769/1769041.png"
              alt="Chat Icon"
              className="w-6 h-6 sm:w-8 sm:h-8"
            />
          </div>

          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 border rounded-xl bg-gray-50 space-y-3 shadow-inner"
            style={{
              maxHeight: "450px",
              minHeight: "300px",
            }}
          >
            {messages.map((m, idx) =>
              m.system ? (
                <div
                  key={idx}
                  className="text-center text-xs text-gray-400 my-2"
                >
                  {m.message}
                </div>
              ) : (
                <div
                  key={idx}
                  className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"
                    }`}
                >
                  <div
                    className={`max-w-[75%] sm:max-w-xs px-3 py-2 rounded-2xl shadow-sm ${m.senderId === user?.id
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {m.userName || "User"}
                    </div>
                    <div className="text-sm">{m.message}</div>
                    <div className="text-[10px] opacity-70 mt-1 text-right">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={sendMessage}
            className="flex flex-col sm:flex-row gap-3 mt-4 items-stretch sm:items-center border-t pt-4"
          >
            <input
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              className="flex-1 p-3 border rounded-xl text-base shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
              placeholder="Type a message..."
            />
            <button className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition w-full sm:w-auto">
              ➤ Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}    