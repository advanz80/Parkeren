import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Register() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', license_plate: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Wachtwoorden komen niet overeen.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          license_plate: form.license_plate,
          password: form.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">⚡</span>
          <h1>Human Campus</h1>
          <p>EV Laden & Parkeren</p>
        </div>

        <form onSubmit={handleSubmit}>
          <h2>Account Aanmaken</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Voornaam</label>
              <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Jan" />
            </div>
            <div className="form-group">
              <label>Achternaam</label>
              <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Jansen" />
            </div>
          </div>

          <div className="form-group">
            <label>Emailadres</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="jan@email.nl" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telefoonnummer</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="0612345678" />
            </div>
            <div className="form-group">
              <label>Kenteken</label>
              <input type="text" name="license_plate" value={form.license_plate} onChange={handleChange} required placeholder="AB-123-CD" />
            </div>
          </div>

          <div className="form-group">
            <label>Wachtwoord</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength="6" placeholder="Minimaal 6 tekens" />
          </div>

          <div className="form-group">
            <label>Wachtwoord bevestigen</label>
            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Herhaal wachtwoord" />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Bezig...' : 'Registreren'}
          </button>
        </form>

        <p className="auth-footer">
          Heb je al een account? <Link to="/login">Log hier in</Link>
        </p>
      </div>
    </div>
  );
}
