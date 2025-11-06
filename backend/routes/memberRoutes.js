import express from "express";
import db from "../db.js";

const router = express.Router();

// ➕ Add a member to a group
router.post("/", async (req, res) => {
  try {
    const { group_id, user_id, member_name, member_email } = req.body;

    // ✅ Validate input
    if (!group_id || !member_name || !member_email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newMember = {
      id: Date.now(), // temporary unique ID
      group_id,
      user_id: user_id ?? null,
      member_name,
      member_email,
    };
    const insertMemberQuery = `
      INSERT INTO group_members (group_id, user_id, member_name, member_email)
      VALUES (?, ?, ?, ?)
    `;
    db.query(insertMemberQuery, [group_id, user_id ?? null, member_name, member_email], (err) => {
      if (err) return res.status(500).send("Error adding member");    
    });

    // Increment group member count
    const updateGroupQuery = `
      UPDATE ride_groups 
      SET number_of_members = number_of_members + 1 
      WHERE id = ?
    `;
    db.query(updateGroupQuery, [group_id], (err) => {
      if (err) return res.status(500).send("Error updating member count");
      console.log("✅ New member joined:", newMember);

      // 🔔 Broadcast realtime updates if io is available
      try {
        const io = req.app?.locals?.io;
        if (io) {
          io.to(`group_${group_id}`).emit("member-added", newMember);
          io.to(`group_${group_id}`).emit("group-count-updated", { group_id, change: 1 });
          // Also notify all clients (e.g., GroupList pages) to refresh
          io.emit("groups-refresh");
        }
      } catch {}
    });
    // ✅ Send response
    res.status(201).json({ member: newMember });
    
  } catch (err) {
    console.error("❌ Error joining group:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 📋 Get all members of a specific group
router.get("/group/:group_id", (req, res) => {
  const { group_id } = req.params;

  const query = "SELECT * FROM group_members WHERE group_id = ?";
  db.query(query, [group_id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching members:", err);
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(results);
    }
  });
});

// kachra 1 was were

router.post("/leave_user", (req, res) => {
  const { group_id, user_id } = req.body; // body, NOT params
  console.log("🔔 /leave_user called with:", { group_id, user_id });

  if (!group_id || !user_id) {
    console.log("❌ missing group_id or user_id");
    return res.status(400).json({ error: "Missing group_id or user_id" });
  }

  const deleteQuery = `
    DELETE FROM group_members
    WHERE group_id = ? AND user_id = ?
  `;

  db.query(deleteQuery, [group_id, user_id], (delErr, delResult) => {
    if (delErr) {
      console.error("❌ Error deleting member:", delErr);
      return res.status(500).json({ error: "Database error while deleting member" });
    }

    if (!delResult || delResult.affectedRows === 0) {
      console.log("⚠️ member not found to delete");
      return res.status(404).json({ message: "Member not found in this group" });
    }

    
    // Emit socket event if io is available
    try {
      const io = req.app?.locals?.io;
      if (io) {
        io.to(`group_${group_id}`).emit("member-removed", { group_id, user_id });
        io.to(`group_${group_id}`).emit("group-count-updated", { group_id, change: -1 });
        // Notify all clients (e.g., GroupList pages) to refresh counts
        io.emit("groups-refresh");
      }
    } catch (emitErr) {
      console.warn("⚠️ Could not emit socket event:", emitErr);
    }
    
    return res.status(200).json({ message: "Left group successfully" });
  });
  // decrement safely (no negative)
  const updateGroupQuery = `
    UPDATE ride_groups
    SET number_of_members = GREATEST(number_of_members - 1, 0)
    WHERE id = ?
  `;
  db.query(updateGroupQuery, [group_id], (updErr) => {
    if (updErr) {
      console.error("❌ Error updating group count:", updErr);
      // NOTE: we already deleted the member — we should still respond
      return res.status(500).json({ error: "Database error while updating member count" });
    }

    console.log(`✅ User ${user_id} removed from group ${group_id}`);
  });
});


export default router;