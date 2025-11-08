import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const res = await axios.post("https://ride-wise.onrender.com/api/auth/login", {
          email: form.email,
          password: form.password,
        });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        alert("Login successful!");
        navigate("/groups");
      } else {
        await axios.post("https://ride-wise.onrender.com/api/auth/register", {
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        });
        alert("Registration successful! You can now log in.");
        setIsLogin(true);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Something went wrong!");
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>RideWise</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.75)" }}>
            {isLogin ? "Welcome back — login to continue" : "Create your RideWise account"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input className="field" placeholder="Full name" type="text" name="name" value={form.name} onChange={handleChange} />
          )}
          <input className="field" placeholder="Email" type="email" name="email" value={form.email} onChange={handleChange} />
          {!isLogin && (
            <input className="field" placeholder="Phone Number" type="number" name="phone" value={form.phone} onChange={handleChange} />
          )}
          <input className="field" placeholder="Password" type="password" name="password" value={form.password} onChange={handleChange} />

          <button className="btn" type="submit">
            {isLogin ? "Log in" : "Create account"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
                fontWeight: 600,
              }}
            >
              {isLogin ? "Create account" : "Have an account? Login"}
            </button>
            <Link
              to="/groups"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                padding: 0,
                fontSize: 13,
              }}
            >
              Continue as guest
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}