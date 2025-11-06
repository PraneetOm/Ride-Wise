// server.js (ESM)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";
import db from "./db.js";

// Routes
import groupRoutes from "./routes/groupRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Create HTTP server and attach Socket.IO
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: "*" }, // For dev only — tighten for production
});

// ✅ SOCKET.IO CONNECTION HANDLER
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  // When a user joins a group room
  socket.on("join-group", ({ groupId, userName }) => {
    const room = `group_${groupId}`;
    socket.join(room);
    console.log(`👤 ${userName} joined ${room}`);

    // Notify others in the same room
    socket.to(room).emit("user-joined", { userName });
  });

  // Allow client to leave a group room
  // socket.on("leave-group", ({ groupId, userName }) => {
  //   socket.leave(groupId);
  //   socket.to(groupId).emit("user-left", { userName });
  // });
  socket.on("leave-group", ({ groupId, userName }) => {
    const room = `group_${groupId}`;
    socket.leave(room);
    console.log(`👤 ${userName} left ${room}`);

    // Notify others in the same room
    socket.to(room).emit("user-left", { userName });
  });

  // When a chat message is sent
  socket.on("chat-message", ({ groupId, message, userName, senderId, clientId, timestamp }) => {
    const payload = {
      message,
      userName,
      senderId: senderId ?? null,
      clientId: clientId ?? null,
      // normalize timestamp to number ms
      timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
    };
    io.to(`group_${groupId}`).emit("chat-message", payload);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ✅ Make io available to routes (for broadcasting joins etc.)
app.locals.io = io;

// ✅ ROUTES
app.use("/api/groups", groupRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/auth", authRoutes);

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);