import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function MyReservations() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchReservations();
  }, [token]);

  function fetchReservations() {
    fetch(`${API}/api/reservations/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setReservations(data); setLoading(false); });
  }

  async function handleCancel(id) {
    if (!window.confirm('Weet je zeker dat je deze reservering wilt annuleren?')) return;

    try {
      const res = await fetch(`${API}/api/reservations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Reservering geannuleerd.');
      fetchReservations();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleConfirm(confirmToken) {
    try {
      const res = await fetch(`${API}/api/reservations/confirm/${confirmToken}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      fetchReservations();
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (loading) return <div className="loading">Laden...</div>;

  const upcoming = reservations.filter(r => ['pending', 'active', 'confirmed'].includes(r.status));
  const past = reservations.filter(r => ['completed', 'cancelled', 'expired'].includes(r.status));

  return (
    <div className="page">
      <div className="container">
        <h1>Mijn Reserveringen</h1>
        {message && <div className="alert alert-success">{message}</div>}

        <div className="card">
          <h2>Komende Reserveringen</h2>
          {upcoming.length === 0 ? (
            <p className="text-muted">Geen komende reserveringen.</p>
          ) : (
            <div className="reservation-list">
              {upcoming.map(r => (
                <div key={r.id} className="reservation-detail">
                  <div className="reservation-header">
                    <h3>{r.plaza_name} - Plek {r.spot_number}</h3>
                    <span className={`badge badge-${r.status}`}>{statusLabel(r.status)}</span>
                  </div>
                  <div className="reservation-meta">
                    <span>{formatDateTime(r.start_time)}</span>
                    <span> tot </span>
                    <span>{formatDateTime(r.end_time)}</span>
                  </div>
                  <div className="reservation-actions">
                    {(r.status === 'pending' || r.status === 'active') && !r.confirmed && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirm(r.confirmation_token)}>
                        Bevestigen
                      </button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'expired' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r.id)}>
                        Annuleren
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Geschiedenis</h2>
          {past.length === 0 ? (
            <p className="text-muted">Geen eerdere reserveringen.</p>
          ) : (
            <div className="reservation-list">
              {past.map(r => (
                <div key={r.id} className="reservation-detail past">
                  <div className="reservation-header">
                    <h3>{r.plaza_name} - Plek {r.spot_number}</h3>
                    <span className={`badge badge-${r.status}`}>{statusLabel(r.status)}</span>
                  </div>
                  <div className="reservation-meta">
                    <span>{formatDateTime(r.start_time)} - {formatDateTime(r.end_time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status) {
  const labels = { pending: 'Wacht op bevestiging', active: 'Actief', confirmed: 'Bevestigd', cancelled: 'Geannuleerd', expired: 'Verlopen', completed: 'Afgerond' };
  return labels[status] || status;
}
