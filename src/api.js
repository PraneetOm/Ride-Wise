import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "https://ride-wise.onrender.com";

export default axios.create({
  baseURL: API_BASE + "/api",
  headers: { "Content-Type": "application/json" }
});