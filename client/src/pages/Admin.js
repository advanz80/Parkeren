import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Admin() {
  const { token } = useAuth();
  const [plazas, setPlazas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New plaza form
  const [newPlaza, setNewPlaza] = useState({ name: '', location_description: '' });
  // Edit plaza
  const [editPlaza, setEditPlaza] = useState(null);
  // New spot form
  const [newSpot, setNewSpot] = useState({ plaza_id: '', spot_number: '', max_duration_hours: 4 });
  // Edit spot
  const [editSpot, setEditSpot] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  function fetchData() {
    Promise.all([
      fetch(`${API}/api/admin/plazas`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([pl, st]) => {
      setPlazas(pl);
      setStats(st);
      setLoading(false);
    });
  }

  async function handleCreatePlaza(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const res = await fetch(`${API}/api/admin/plazas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPlaza)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplein aangemaakt!');
      setNewPlaza({ name: '', location_description: '' });
      fetchData();
    } catch (err) { setError(err.message); }
  }

  async function handleUpdatePlaza(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const res = await fetch(`${API}/api/admin/plazas/${editPlaza.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editPlaza.name, location_description: editPlaza.location_description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplein bijgewerkt!');
      setEditPlaza(null);
      fetchData();
    } catch (err) { setError(err.message); }
  }

  async function handleDeletePlaza(id) {
    if (!window.confirm('Weet je zeker dat je dit laadplein wilt verwijderen? Alle plekken en reserveringen worden ook verwijderd.')) return;
    try {
      const res = await fetch(`${API}/api/admin/plazas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplein verwijderd.');
      fetchData();
    } catch (err) { setError(err.message); }
  }

  async function handleCreateSpot(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const res = await fetch(`${API}/api/admin/plazas/${newSpot.plaza_id}/spots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spot_number: newSpot.spot_number, max_duration_hours: parseFloat(newSpot.max_duration_hours) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplek aangemaakt!');
      setNewSpot({ plaza_id: newSpot.plaza_id, spot_number: '', max_duration_hours: 4 });
      fetchData();
    } catch (err) { setError(err.message); }
  }

  async function handleUpdateSpot(e) {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const res = await fetch(`${API}/api/admin/spots/${editSpot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          spot_number: editSpot.spot_number,
          max_duration_hours: parseFloat(editSpot.max_duration_hours),
          is_active: editSpot.is_active
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplek bijgewerkt!');
      setEditSpot(null);
      fetchData();
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteSpot(id) {
    if (!window.confirm('Weet je zeker dat je deze laadplek wilt verwijderen?')) return;
    try {
      const res = await fetch(`${API}/api/admin/spots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('Laadplek verwijderd.');
      fetchData();
    } catch (err) { setError(err.message); }
  }

  if (loading) return <div className="loading">Laden...</div>;

  return (
    <div className="page">
      <div className="container">
        <h1>Beheer</h1>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.totalUsers}</span>
              <span className="stat-label">Gebruikers</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.totalPlazas}</span>
              <span className="stat-label">Laadpleinen</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.totalSpots}</span>
              <span className="stat-label">Laadplekken</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.activeReservations}</span>
              <span className="stat-label">Actieve Reserveringen</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{stats.waitlistCount}</span>
              <span className="stat-label">Wachtlijst</span>
            </div>
          </div>
        )}

        {/* Create Plaza */}
        <div className="card">
          <h2>Nieuw Laadplein</h2>
          <form onSubmit={handleCreatePlaza}>
            <div className="form-row">
              <div className="form-group">
                <label>Naam</label>
                <input type="text" value={newPlaza.name} onChange={e => setNewPlaza({ ...newPlaza, name: e.target.value })} required placeholder="bijv. Laadplein Oost" />
              </div>
              <div className="form-group">
                <label>Locatiebeschrijving</label>
                <input type="text" value={newPlaza.location_description} onChange={e => setNewPlaza({ ...newPlaza, location_description: e.target.value })} placeholder="bijv. Bij gebouw D" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Laadplein Aanmaken</button>
          </form>
        </div>

        {/* Existing Plazas */}
        {plazas.map(plaza => (
          <div key={plaza.id} className="card">
            {editPlaza?.id === plaza.id ? (
              <form onSubmit={handleUpdatePlaza}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Naam</label>
                    <input type="text" value={editPlaza.name} onChange={e => setEditPlaza({ ...editPlaza, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Locatiebeschrijving</label>
                    <input type="text" value={editPlaza.location_description || ''} onChange={e => setEditPlaza({ ...editPlaza, location_description: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Opslaan</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditPlaza(null)}>Annuleren</button>
              </form>
            ) : (
              <div className="plaza-header">
                <div>
                  <h2>{plaza.name}</h2>
                  {plaza.location_description && <p className="text-muted">{plaza.location_description}</p>}
                </div>
                <div className="plaza-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditPlaza({ ...plaza })}>Bewerken</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlaza(plaza.id)}>Verwijderen</button>
                </div>
              </div>
            )}

            {/* Spots table */}
            <h3>Laadplekken ({plaza.spots.length})</h3>
            {plaza.spots.length > 0 && (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nummer</th>
                      <th>Max. Duur (uur)</th>
                      <th>Status</th>
                      <th>Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plaza.spots.map(spot => (
                      <tr key={spot.id}>
                        {editSpot?.id === spot.id ? (
                          <>
                            <td><input type="text" value={editSpot.spot_number} onChange={e => setEditSpot({ ...editSpot, spot_number: e.target.value })} /></td>
                            <td><input type="number" step="0.5" min="0.5" value={editSpot.max_duration_hours} onChange={e => setEditSpot({ ...editSpot, max_duration_hours: e.target.value })} /></td>
                            <td>
                              <select value={editSpot.is_active ? '1' : '0'} onChange={e => setEditSpot({ ...editSpot, is_active: e.target.value === '1' })}>
                                <option value="1">Actief</option>
                                <option value="0">Inactief</option>
                              </select>
                            </td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={handleUpdateSpot}>Opslaan</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditSpot(null)}>Annuleren</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{spot.spot_number}</td>
                            <td>{spot.max_duration_hours}</td>
                            <td><span className={`badge ${spot.is_active ? 'badge-confirmed' : 'badge-expired'}`}>{spot.is_active ? 'Actief' : 'Inactief'}</span></td>
                            <td>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditSpot({ ...spot })}>Bewerken</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSpot(spot.id)}>Verwijderen</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Spot */}
            <form onSubmit={handleCreateSpot} style={{ marginTop: 16 }}>
              <input type="hidden" value={plaza.id} />
              <div className="form-row">
                <div className="form-group">
                  <label>Nieuw pleknummer</label>
                  <input type="text" value={newSpot.plaza_id === plaza.id ? newSpot.spot_number : ''} onChange={e => setNewSpot({ plaza_id: plaza.id, spot_number: e.target.value, max_duration_hours: newSpot.max_duration_hours })} placeholder="bijv. N-7" required />
                </div>
                <div className="form-group">
                  <label>Max. duur (uur)</label>
                  <input type="number" step="0.5" min="0.5" value={newSpot.plaza_id === plaza.id ? newSpot.max_duration_hours : 4} onChange={e => setNewSpot({ plaza_id: plaza.id, spot_number: newSpot.spot_number, max_duration_hours: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-secondary btn-sm" onClick={() => { if (newSpot.plaza_id !== plaza.id) setNewSpot({ plaza_id: plaza.id, spot_number: '', max_duration_hours: 4 }); }}>
                Plek Toevoegen
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
