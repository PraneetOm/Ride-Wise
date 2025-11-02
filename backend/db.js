// db.js
import mysql from "mysql2/promise";

const db = await mysql.createPool({
  host: "localhost",
  user: "root", // change if needed
  password: "", // your MySQL password
  database: "rideshare", // your database name
});

export default db;