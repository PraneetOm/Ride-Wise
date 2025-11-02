import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { io } from "socket.io-client";
import CabLauncher from "../components/CabLauncher";

const SOCKET_URL = import.meta.env.VITE_API_BASE?.replace("/api", "") || "http://localhost:5000";

export default function GroupPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [joined, setJoined] = useState(false);

  const socketRef = useRef(null);
  const messagesEnd = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isGuest = !user;

  // 🔹 Load group + members initially
  useEffect(() => {
    async function loadData() {
      try {
        const groupsRes = await api.get(`/groups`);
        const found = groupsRes.data.find((x) => String(x.id) === String(id));
        setGroup(found || { id, group_name: `Group ${id}`, expected_start_time: "Not specified" });

        const membersRes = await api.get(`/members/group/${id}`);
        setMembers(membersRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      }
    }

    loadData();
  }, [id]);

  // 🔹 Setup socket connection
  useEffect(() => {
    const sock = io(SOCKET_URL);
    socketRef.current = sock;

    sock.on("connect", () => console.log("Socket connected", sock.id));

    // ✅ Listen for member updates
    sock.on("member-added", (member) => {
      setMembers((prev) => {
        const exists = prev.some((m) => m.id === member.id);
        return exists ? prev : [...prev, member];
      });
    });

    sock.on("member-left", (memberId) => {
      setMembers((prev) => prev.filter((m) => String(m.id) !== String(memberId)));
    });

    // ✅ Listen for chat messages
    sock.on("chat-message", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    // ✅ System messages
    sock.on("user-joined", ({ userName }) => {
      setMessages((prev) => [...prev, { system: true, message: `${userName} joined the group` }]);
      const curr_memb = api.get("/group/get_curr_crowd", {
        group_id: id,
      });
      setMembers(curr_memb);
    });
    sock.on("user-left", ({ userName }) => {
      setMessages((prev) => [...prev, { system: true, message: `${userName} left the group` }]);
    });

    return () => sock.disconnect();
  }, [id]);

  // 🔹 Scroll to bottom when messages update
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 Join group
  const handleJoinGroup = async () => {
    try {
      const res = await api.post("/members", {
        group_id: id,
        user_id: user.id,
        member_name: user.name,
        member_email: user.email,
      });

      if (res.data.member) {
        setMembers((prev) => [...prev, res.data.member]);
        setJoined(true);
      }
    } catch (err) {
      console.error("Join error:", err);
      alert("Could not join group");
    }
    socketRef.current.emit("user-joined", { groupId: id, userName: user.name });
    const user_id = user.id;
    io.emit("user-joined", { user_id, group_id });
  };

  const handleLeaveGroup = async () => {
  try {
    // show quick UI feedback (optimistic)
    setJoined(false);
    
    const res = await api.post("/members/leave_user", {
      group_id: id,
      user_id: user.id,
    });

    console.log("leave response:", res.data);

    // refetch member list from server to keep everything consistent
    const membersRes = await api.get(`/members/group/${id}`);
    setMembers(membersRes.data);

    // emit socket so others can update instantly (server also emits, but double emission OK)
    socketRef.current?.emit("member-removed", { group_id: id, user_id: user.id });
    io.emit("member-left", { user_id, group_id });

    alert(res.data.message || "Left group");
  } catch (err) {
    console.error("Leave error:", err);
    alert(err.response?.data?.error || err.response?.data?.message || "Could not leave group");
    // revert optimistic UI if needed
    const membersRes = await api.get(`/members/group/${id}`).catch(()=>null);
    if (membersRes?.data) setMembers(membersRes.data);
    setJoined(membersRes?.data?.some(m => m.user_id === user.id) || false);
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
      }
    } catch (err) {
      console.error("Guest join error:", err);
      alert("Could not add member");
    }
  }

  // 🔹 Send message
  function sendMessage(e) {
  e.preventDefault();
  if (!msgText.trim()) return;

  const payload = {
    groupId: id,
    message: msgText,
    userName: user?.name || guestName || "Anonymous",
    senderId: user?.id || "guest",
    timestamp: Date.now(),
  };

  socketRef.current.emit("chat-message", payload);

    setMsgText("");
  }

  // 🕒 Show expected trip time
  const expectedTime = group?.expected_start_time
    ? new Date(group.expected_start_time).toLocaleString()
    : "Not specified";

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
      {/* LEFT PANEL */}
      <div className="col-span-1 bg-white p-5 rounded-2xl shadow-md border">
        <h2 className="font-semibold text-lg">{group?.group_name || "Group"}</h2>
        <p className="text-sm text-gray-600">
          {group?.start_location} → {group?.end_location}
        </p>

        <div className="mt-2 text-sm text-gray-700">
          🕒 Expected Start Time:{" "}
          <span className="font-medium text-blue-700">{expectedTime}</span>
        </div>

        <div className="mt-3 text-sm text-gray-700 font-medium">
          👥 {members.length} member{members !== 1 && "s"} currently joined
        </div>

        <hr className="my-3" />

        <h3 className="font-medium mb-2">Members</h3>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between items-center p-2 border rounded">
              <div>
                <div className="font-medium">{m.member_name}</div>
                <div className="text-xs text-gray-500">{m.member_email}</div>
              </div>
              <div className="text-sm text-green-600">
                ₹{Number(m.contribution || 0).toFixed(2)}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          {isGuest ? (
            // Guest mode
            <form onSubmit={handleAddMember} className="space-y-2">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name"
                className="w-full p-2 border rounded"
              />
              <input
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Your email"
                className="w-full p-2 border rounded"
              />
              <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                Add Member
              </button>
            </form>
          ) : (
            // Logged-in mode
            <div className="space-y-2">
              {!joined ? (
                <button
                  onClick={handleJoinGroup}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Join Group
                </button>
              ) : (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
                >
                  Leave Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>
<CabLauncher drop={{ lat: 28.5355, lng: 77.3910 }} />

      {/* CHAT PANEL */}
      <div className="col-span-2 bg-white p-5 rounded-2xl shadow-md flex flex-col border">
        <h3 className="font-semibold mb-3">💬 Live Chat</h3>
        <div
          className="flex-1 overflow-auto p-3 border rounded mb-3 bg-gray-50"
          style={{ minHeight: 300 }}
        >
          {messages.map((m, idx) =>
            m.system ? (
              <div key={idx} className="text-center text-xs text-gray-400 my-2">
                {m.message}
              </div>
            ) : (
              <div
                key={idx}
                className={`mb-3 flex ${
                  m.senderId === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-2 rounded-lg shadow-sm ${
                    m.senderId === user?.id
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">{m.userName}</div>
                  <div className="text-sm">{m.message}</div>
                  <div className="text-[10px] opacity-75 mt-1">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          )}
          <div ref={messagesEnd} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Type a message..."
            disabled={!joined && !isGuest}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
