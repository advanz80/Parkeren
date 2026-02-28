import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/reservations/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/waitlist/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([res, wl]) => {
      setReservations(res);
      setWaitlist(wl);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const upcoming = reservations
    .filter(r => ['pending', 'active', 'confirmed'].includes(r.status) && new Date(r.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5);

  const activeWaitlist = waitlist.filter(w => w.status === 'waiting' || w.status === 'notified');

  if (loading) return <div className="loading">Laden...</div>;

  return (
    <div className="page">
      <div className="container">
        <div className="welcome-banner">
          <h1>Welkom, {user.first_name}!</h1>
          <p>Human Campus EV Laden & Parkeren</p>
        </div>

        <div className="dashboard-grid">
          <div className="card">
            <h2>Komende Reserveringen</h2>
            {upcoming.length === 0 ? (
              <p className="text-muted">Geen komende reserveringen.</p>
            ) : (
              <div className="reservation-list">
                {upcoming.map(r => (
                  <div key={r.id} className="reservation-item">
                    <div className="reservation-info">
                      <strong>{r.plaza_name} - Plek {r.spot_number}</strong>
                      <span>{formatDateTime(r.start_time)} - {formatTime(r.end_time)}</span>
                    </div>
                    <span className={`badge badge-${r.status}`}>{statusLabel(r.status)}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/mijn-reserveringen" className="btn btn-secondary btn-sm">Alle reserveringen</Link>
          </div>

          <div className="card">
            <h2>Snelle Acties</h2>
            <div className="quick-actions">
              <Link to="/reserveren" className="btn btn-primary">Nieuwe Reservering</Link>
              <Link to="/wachtlijst" className="btn btn-secondary">Wachtlijst bekijken</Link>
              <Link to="/profiel" className="btn btn-secondary">Profiel bewerken</Link>
            </div>

            {activeWaitlist.length > 0 && (
              <>
                <h3>Wachtlijst</h3>
                {activeWaitlist.map(w => (
                  <div key={w.id} className="waitlist-item">
                    <strong>{w.plaza_name}</strong> - {formatDate(w.desired_date)}
                    <span className={`badge badge-${w.status}`}>
                      {w.status === 'notified' ? 'Plek beschikbaar!' : `Positie ${w.position}`}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="card info-card">
          <h2>Auto Gegevens</h2>
          <p><strong>Kenteken:</strong> {user.license_plate}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Telefoon:</strong> {user.phone}</p>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

function statusLabel(status) {
  const labels = { pending: 'Wacht op bevestiging', active: 'Actief', confirmed: 'Bevestigd', cancelled: 'Geannuleerd', expired: 'Verlopen', completed: 'Afgerond' };
  return labels[status] || status;
}
