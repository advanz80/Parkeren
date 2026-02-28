import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '';

export default function Confirm() {
  const { token: confirmToken } = useParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    fetch(`${API}/api/reservations/confirm/${confirmToken}`, {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          setMessage(data.message);
        } else {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => { setError('Er is een fout opgetreden.'); setLoading(false); });
  }, [confirmToken]);

  if (loading) return <div className="auth-page"><div className="auth-card"><p>Bevestiging verwerken...</p></div></div>;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">⚡</span>
          <h1>Reservering Bevestigen</h1>
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <Link to="/" className="btn btn-primary btn-full" style={{ marginTop: 16 }}>Ga naar Dashboard</Link>
      </div>
    </div>
  );
}
