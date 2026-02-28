import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Waitlist() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [plazas, setPlazas] = useState([]);
  const [selectedPlaza, setSelectedPlaza] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/waitlist/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/reservations/plazas`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([wl, pl]) => {
      setEntries(wl);
      setPlazas(pl);
      setLoading(false);
    });
  }, [token]);

  async function handleJoinWaitlist() {
    if (!selectedPlaza || !selectedDate) {
      return setError('Selecteer een laadplein en datum.');
    }
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plaza_id: parseInt(selectedPlaza), desired_date: selectedDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      // Refresh entries
      const wl = await fetch(`${API}/api/waitlist/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      setEntries(wl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Wil je je van de wachtlijst verwijderen?')) return;

    try {
      const res = await fetch(`${API}/api/waitlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      const wl = await fetch(`${API}/api/waitlist/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      setEntries(wl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClaim(notificationToken) {
    try {
      const res = await fetch(`${API}/api/waitlist/claim/${notificationToken}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      const wl = await fetch(`${API}/api/waitlist/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      setEntries(wl);
    } catch (err) {
      setError(err.message);
    }
  }

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function getMaxDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  if (loading) return <div className="loading">Laden...</div>;

  const activeEntries = entries.filter(e => e.status === 'waiting' || e.status === 'notified');
  const pastEntries = entries.filter(e => e.status !== 'waiting' && e.status !== 'notified');

  return (
    <div className="page">
      <div className="container">
        <h1>Wachtlijst</h1>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <h2>Op de wachtlijst plaatsen</h2>
          <p>Als alle laadplekken bezet zijn op een bepaalde dag, kun je je op de wachtlijst plaatsen. Je krijgt een melding zodra er een plek vrijkomt.</p>

          <div className="form-row">
            <div className="form-group">
              <label>Laadplein</label>
              <select value={selectedPlaza} onChange={e => setSelectedPlaza(e.target.value)}>
                <option value="">Kies een laadplein</option>
                {plazas.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Datum</label>
              <input type="date" value={selectedDate} min={getToday()} max={getMaxDate()} onChange={e => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleJoinWaitlist}>Op wachtlijst plaatsen</button>
        </div>

        <div className="card">
          <h2>Mijn Wachtlijst</h2>
          {activeEntries.length === 0 ? (
            <p className="text-muted">Je staat niet op de wachtlijst.</p>
          ) : (
            <div className="reservation-list">
              {activeEntries.map(e => (
                <div key={e.id} className="reservation-detail">
                  <div className="reservation-header">
                    <h3>{e.plaza_name}</h3>
                    <span className={`badge badge-${e.status}`}>
                      {e.status === 'notified' ? 'Plek beschikbaar!' : `Positie ${e.position}`}
                    </span>
                  </div>
                  <div className="reservation-meta">
                    <span>Datum: {new Date(e.desired_date).toLocaleDateString('nl-NL', { dateStyle: 'full' })}</span>
                  </div>
                  <div className="reservation-actions">
                    {e.status === 'notified' && e.notification_token && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleClaim(e.notification_token)}>
                        Plek Claimen
                      </button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(e.id)}>
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pastEntries.length > 0 && (
          <div className="card">
            <h2>Geschiedenis</h2>
            <div className="reservation-list">
              {pastEntries.map(e => (
                <div key={e.id} className="reservation-detail past">
                  <div className="reservation-header">
                    <h3>{e.plaza_name}</h3>
                    <span className={`badge badge-${e.status}`}>{e.status}</span>
                  </div>
                  <div className="reservation-meta">
                    <span>{new Date(e.desired_date).toLocaleDateString('nl-NL')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
