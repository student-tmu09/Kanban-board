import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../Api/authApi";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await registerUser(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create account</h1>
        {error && <div className="error">{error}</div>}
        <input placeholder="Name" value={form.name}
          onChange={e => setForm({...form, name:e.target.value})} required />
        <input placeholder="Email" type="email" value={form.email}
          onChange={e => setForm({...form, email:e.target.value})} required />
        <input placeholder="Password" type="password" value={form.password}
          onChange={e => setForm({...form, password:e.target.value})} required />
        <button className="primary">Register</button>
        <div className="auth-link">Already registered? <Link to="/login">Login</Link></div>
      </form>
    </div>
  );
}