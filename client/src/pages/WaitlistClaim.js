import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '';

export default function WaitlistClaim() {
  const { token: claimToken } = useParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    fetch(`${API}/api/waitlist/claim/${claimToken}`, {
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
  }, [claimToken]);

  if (loading) return <div className="auth-page"><div className="auth-card"><p>Claim verwerken...</p></div></div>;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-icon">⚡</span>
          <h1>Wachtlijst Claim</h1>
        </div>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <Link to="/reserveren" className="btn btn-primary btn-full" style={{ marginTop: 16 }}>Ga naar Reserveren</Link>
      </div>
    </div>
  );
}
