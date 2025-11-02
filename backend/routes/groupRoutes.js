import express from "express";
import db from "../db.js";

const router = express.Router();

// ➕ Create a new ride group
router.post("/", async (req, res) => {
  try {
    const { group_name, start_location, end_location } = req.body;
    const [result] = await db.query(
      "INSERT INTO ride_groups (group_name, start_location, end_location) VALUES (?, ?, ?)",
      [group_name, start_location, end_location]
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

// 📋 Get all ride groups
router.get("/get_curr_crowd", async (req, res) => {
  try {
    const { id } = req.body;
    const [ members ] = await db.query("SELECT number_of_members FROM ride_groups where id = ?", [id]);
    
    res.json(members);
  } catch (err) {
    console.error("Error fetching members:", err);
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
