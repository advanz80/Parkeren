import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
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
          <h2>Inloggen</h2>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Emailadres</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="je@email.nl" />
          </div>

          <div className="form-group">
            <label>Wachtwoord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••" />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>

        <p className="auth-footer">
          Nog geen account? <Link to="/register">Registreer hier</Link>
        </p>
      </div>
    </div>
  );
}
