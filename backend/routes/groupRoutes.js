import express from "express";
import db from "../db.js";

const router = express.Router();

// ➕ Create a new ride group
router.post("/", async (req, res) => {
  try {
    const { group_name, start_location, end_location, time_range_start, time_range_end, total_cost } = req.body;
    const [result] = await db.query(
      "INSERT INTO ride_groups (group_name, start_location, end_location, time_range_start, time_range_end, total_cost) VALUES (?, ?, ?, ?, ?, ?)",
      [group_name, start_location, end_location, time_range_start || null, time_range_end || null, total_cost || null]
    );

    res.status(201).json({ message: "Group created!", id: result.insertId });
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📋 Get all ride groups
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ride_groups");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching groups:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📋 Get group
router.get("/:group_id", async (req, res) => {
  try {
    const { group_id } = req.params;
    const [rows] = await db.query("SELECT * FROM ride_groups WHERE id = ?", [group_id]);
    console.log("groupdata:", { group_id, rows });
    res.json(rows[0] || {});
  } catch (err) {
    console.error("Error fetching group:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ❌ Delete a ride group
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("DELETE FROM ride_groups WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({ message: "Group deleted!" });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
