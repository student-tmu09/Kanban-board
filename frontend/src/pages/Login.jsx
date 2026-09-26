import React from "react"
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../Api/authApi";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await loginUser(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p>Login to your Kanban workspace.</p>
        {error && <div className="error">{error}</div>}
        <input placeholder="Email" type="email" value={form.email}
          onChange={e => setForm({...form, email:e.target.value})} required />
        <input placeholder="Password" type="password" value={form.password}
          onChange={e => setForm({...form, password:e.target.value})} required />
        <button className="primary">Login</button>
        <div className="auth-link">Don't have an account? <Link to="/register">Register</Link></div>
      </form>
    </div>
  );
}